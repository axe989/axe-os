import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { calculateExpectedMargin, calculateExpectedProfit, classifyMarginStatus } from "../pricing/margin";

export type CatalogDashboardData = {
  productMasterCount: number;
  commercialProductCount: number;
  supplierOfferCount: number;
  marketplaceListingCount: number;
  matchedCount: number;
  probableCount: number;
  missingCount: number;
  conflictCount: number;
  reviewCount: number;
  listingMatchedCount: number;
  listingMissingCount: number;
  belowTargetMarginCount: number;
  negativeMarginCount: number;
  stalePriceCount: number;
};

export async function getCatalogDashboardData(): Promise<CatalogDashboardData> {
  const supabase = createSupabaseAdminClient();

  const [
    { count: productMasterCount },
    { count: commercialProductCount },
    { count: supplierOfferCount },
    { count: marketplaceListingCount },
    { data: matchStatusRows },
    { data: listingMatchStatusRows },
    { data: defaultStrategy },
  ] = await Promise.all([
    supabase.from("product_master").select("*", { count: "exact", head: true }),
    supabase.from("commercial_products").select("*", { count: "exact", head: true }),
    supabase.from("supplier_offers").select("*", { count: "exact", head: true }),
    supabase.from("marketplace_listings").select("*", { count: "exact", head: true }),
    supabase.from("product_matches").select("match_status"),
    supabase.from("listing_matches").select("match_status"),
    supabase
      .from("pricing_strategies")
      .select(
        "target_margin_percent, minimum_margin_percent, marketplace_commission_percent, default_logistics_cost, default_advertising_percent, other_variable_cost",
      )
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const statusCounts = { matched: 0, probable: 0, missing: 0, conflict: 0, ignored: 0 };
  for (const row of matchStatusRows ?? []) {
    const status = row.match_status as keyof typeof statusCounts;
    if (status in statusCounts) statusCounts[status] += 1;
  }

  const listingStatusCounts = { matched: 0, probable: 0, missing: 0, conflict: 0, ignored: 0 };
  for (const row of listingMatchStatusRows ?? []) {
    const status = row.match_status as keyof typeof listingStatusCounts;
    if (status in listingStatusCounts) listingStatusCounts[status] += 1;
  }

  let belowTargetMarginCount = 0;
  let negativeMarginCount = 0;
  let stalePriceCount = 0;

  if (defaultStrategy) {
    const { data: commercialProducts } = await supabase
      .from("commercial_products")
      .select("id, master_product_id")
      .neq("status", "archived")
      .limit(2000);

    const products = commercialProducts ?? [];

    if (products.length > 0) {
      const masterProductIds = Array.from(new Set(products.map((p) => p.master_product_id as string)));
      const commercialProductIds = products.map((p) => p.id as string);

      const [{ data: offers }, { data: listings }, { data: costHistory }] = await Promise.all([
        supabase
          .from("supplier_offers")
          .select("id, product_id, purchase_price, product_condition")
          .in("product_id", masterProductIds)
          .eq("product_condition", "new"),
        supabase
          .from("marketplace_listings")
          .select("id, commercial_product_id, current_sale_price")
          .in("commercial_product_id", commercialProductIds),
        supabase
          .from("supplier_offer_price_history")
          .select("supplier_product_id, recorded_at")
          .order("recorded_at", { ascending: false })
          .limit(2000),
      ]);

      // Purchase price traces Commercial Product -> Master Product ->
      // Supplier Offer (unchanged sourcing path; bundle costs aren't
      // factored in here yet -- see architecture review §7).
      const purchasePriceByMasterProduct = new Map<string, number>();
      const offerIdByMasterProduct = new Map<string, string>();
      for (const offer of offers ?? []) {
        const masterId = offer.product_id as string | null;
        if (masterId && offer.purchase_price !== null) {
          purchasePriceByMasterProduct.set(masterId, offer.purchase_price as number);
          offerIdByMasterProduct.set(masterId, offer.id as string);
        }
      }

      const salePriceByCommercialProduct = new Map<string, number>();
      const listingIdsByCommercialProduct = new Map<string, string[]>();
      for (const listing of listings ?? []) {
        const commercialProductId = listing.commercial_product_id as string | null;
        if (!commercialProductId) continue;
        if (listing.current_sale_price !== null) {
          salePriceByCommercialProduct.set(commercialProductId, listing.current_sale_price as number);
        }
        const existingIds = listingIdsByCommercialProduct.get(commercialProductId) ?? [];
        existingIds.push(listing.id as string);
        listingIdsByCommercialProduct.set(commercialProductId, existingIds);
      }

      const listingIds = (listings ?? []).map((l) => l.id as string);
      const { data: priceHistory } =
        listingIds.length > 0
          ? await supabase
              .from("channel_price_history")
              .select("channel_listing_id, recorded_at")
              .in("channel_listing_id", listingIds)
              .order("recorded_at", { ascending: false })
              .limit(2000)
          : { data: [] as { channel_listing_id: string; recorded_at: string }[] };

      const latestPriceChangeByListing = new Map<string, string>();
      for (const row of priceHistory ?? []) {
        const listingId = row.channel_listing_id as string;
        if (!latestPriceChangeByListing.has(listingId)) {
          latestPriceChangeByListing.set(listingId, row.recorded_at as string);
        }
      }

      const latestCostChangeByOffer = new Map<string, string>();
      for (const row of costHistory ?? []) {
        const offerId = row.supplier_product_id as string;
        if (!latestCostChangeByOffer.has(offerId)) {
          latestCostChangeByOffer.set(offerId, row.recorded_at as string);
        }
      }

      for (const product of products) {
        const commercialProductId = product.id as string;
        const masterProductId = product.master_product_id as string;
        const purchasePrice = purchasePriceByMasterProduct.get(masterProductId);
        const salePrice = salePriceByCommercialProduct.get(commercialProductId);

        if (purchasePrice !== undefined && salePrice !== undefined) {
          const profit = calculateExpectedProfit({
            salePrice,
            purchasePrice,
            commissionPercent: defaultStrategy.marketplace_commission_percent,
            logisticsCost: defaultStrategy.default_logistics_cost,
            advertisingPercent: defaultStrategy.default_advertising_percent,
            otherVariableCost: defaultStrategy.other_variable_cost,
          });
          const margin = calculateExpectedMargin(profit, salePrice);
          const status = classifyMarginStatus(margin, {
            targetMarginPercent: defaultStrategy.target_margin_percent,
            minimumMarginPercent: defaultStrategy.minimum_margin_percent,
          });

          if (status === "below_target" || status === "below_minimum") belowTargetMarginCount += 1;
          if (status === "negative") negativeMarginCount += 1;
        }

        // Cost moved after the listing price was last touched -- a signal
        // the sale price may no longer reflect current purchase cost.
        const offerId = offerIdByMasterProduct.get(masterProductId);
        const costChangedAt = offerId ? latestCostChangeByOffer.get(offerId) : undefined;
        if (!costChangedAt) continue;

        const listingIdsForProduct = listingIdsByCommercialProduct.get(commercialProductId) ?? [];
        const hasStaleListing = listingIdsForProduct.some((listingId) => {
          const priceChangedAt = latestPriceChangeByListing.get(listingId);
          return !priceChangedAt || costChangedAt > priceChangedAt;
        });
        if (listingIdsForProduct.length > 0 && hasStaleListing) {
          stalePriceCount += 1;
        }
      }
    }
  }

  return {
    productMasterCount: productMasterCount ?? 0,
    commercialProductCount: commercialProductCount ?? 0,
    supplierOfferCount: supplierOfferCount ?? 0,
    marketplaceListingCount: marketplaceListingCount ?? 0,
    matchedCount: statusCounts.matched,
    probableCount: statusCounts.probable,
    missingCount: statusCounts.missing,
    conflictCount: statusCounts.conflict,
    reviewCount: statusCounts.probable + statusCounts.conflict,
    listingMatchedCount: listingStatusCounts.matched,
    listingMissingCount: listingStatusCounts.missing,
    belowTargetMarginCount,
    negativeMarginCount,
    stalePriceCount,
  };
}
