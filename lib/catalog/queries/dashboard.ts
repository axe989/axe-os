import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { calculateExpectedMargin, calculateExpectedProfit, classifyMarginStatus } from "../pricing/margin";

export type CatalogDashboardData = {
  productMasterCount: number;
  supplierOfferCount: number;
  matchedCount: number;
  probableCount: number;
  missingCount: number;
  conflictCount: number;
  reviewCount: number;
  belowTargetMarginCount: number;
  negativeMarginCount: number;
  stalePriceCount: number;
};

export async function getCatalogDashboardData(): Promise<CatalogDashboardData> {
  const supabase = createSupabaseAdminClient();

  const [
    { count: productMasterCount },
    { count: supplierOfferCount },
    { data: matchStatusRows },
    { data: defaultStrategy },
  ] = await Promise.all([
    supabase.from("product_master").select("*", { count: "exact", head: true }),
    supabase.from("supplier_offers").select("*", { count: "exact", head: true }),
    supabase.from("product_matches").select("match_status"),
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

  let belowTargetMarginCount = 0;
  let negativeMarginCount = 0;
  let stalePriceCount = 0;

  if (defaultStrategy) {
    const { data: products } = await supabase
      .from("product_master")
      .select("id")
      .neq("status", "archived")
      .limit(2000);

    const productIds = (products ?? []).map((p) => p.id as string);

    if (productIds.length > 0) {
      const [{ data: offers }, { data: listings }, { data: costHistory }, { data: priceHistory }] =
        await Promise.all([
          supabase
            .from("supplier_offers")
            .select("product_id, purchase_price, product_condition, last_seen_at")
            .in("product_id", productIds)
            .eq("product_condition", "new"),
          supabase
            .from("channel_listings")
            .select("product_id, current_sale_price")
            .in("product_id", productIds),
          supabase
            .from("supplier_offer_price_history")
            .select("supplier_product_id, recorded_at")
            .order("recorded_at", { ascending: false })
            .limit(2000),
          supabase
            .from("channel_price_history")
            .select("product_id, recorded_at")
            .in("product_id", productIds)
            .order("recorded_at", { ascending: false })
            .limit(2000),
        ]);

      const latestSalePriceByProduct = new Map<string, number>();
      for (const listing of listings ?? []) {
        const productId = listing.product_id as string | null;
        if (productId && listing.current_sale_price !== null) {
          latestSalePriceByProduct.set(productId, listing.current_sale_price as number);
        }
      }

      const purchasePriceByProduct = new Map<string, number>();
      for (const offer of offers ?? []) {
        const productId = offer.product_id as string | null;
        if (productId && offer.purchase_price !== null) {
          purchasePriceByProduct.set(productId, offer.purchase_price as number);
        }
      }

      const latestChannelPriceChangeByProduct = new Map<string, string>();
      for (const row of priceHistory ?? []) {
        const productId = row.product_id as string | null;
        if (productId && !latestChannelPriceChangeByProduct.has(productId)) {
          latestChannelPriceChangeByProduct.set(productId, row.recorded_at as string);
        }
      }

      for (const productId of productIds) {
        const purchasePrice = purchasePriceByProduct.get(productId);
        const salePrice = latestSalePriceByProduct.get(productId);
        if (purchasePrice === undefined || salePrice === undefined) continue;

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

      // Cost moved after the channel price was last touched -- a signal
      // the sale price may no longer reflect current purchase cost.
      const latestCostChangeByOffer = new Map<string, string>();
      for (const row of costHistory ?? []) {
        const offerId = row.supplier_product_id as string;
        if (!latestCostChangeByOffer.has(offerId)) {
          latestCostChangeByOffer.set(offerId, row.recorded_at as string);
        }
      }

      const offerIdByProduct = new Map<string, string>();
      // We only have product_id on offers here, not offer id -- recompute
      // via a lighter follow-up query restricted to matched offers.
      const { data: matchedOffers } = await supabase
        .from("supplier_offers")
        .select("id, product_id")
        .in("product_id", productIds)
        .eq("product_condition", "new");

      for (const row of matchedOffers ?? []) {
        const productId = row.product_id as string | null;
        if (productId) offerIdByProduct.set(productId, row.id as string);
      }

      for (const productId of productIds) {
        const offerId = offerIdByProduct.get(productId);
        if (!offerId) continue;
        const costChangedAt = latestCostChangeByOffer.get(offerId);
        const priceChangedAt = latestChannelPriceChangeByProduct.get(productId);
        if (costChangedAt && (!priceChangedAt || costChangedAt > priceChangedAt)) {
          stalePriceCount += 1;
        }
      }
    }
  }

  return {
    productMasterCount: productMasterCount ?? 0,
    supplierOfferCount: supplierOfferCount ?? 0,
    matchedCount: statusCounts.matched,
    probableCount: statusCounts.probable,
    missingCount: statusCounts.missing,
    conflictCount: statusCounts.conflict,
    reviewCount: statusCounts.probable + statusCounts.conflict,
    belowTargetMarginCount,
    negativeMarginCount,
    stalePriceCount,
  };
}
