import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  deriveSupplierOfferStatus,
  type SupplierOfferSimpleStatus,
} from "../status/supplier-offer-status";
import type { MatchStatus } from "../types";

export type SupplierOfferRow = {
  id: string;
  matchId: string | null;
  supplierSku: string | null;
  nameRaw: string | null;
  brandRaw: string | null;
  purchasePrice: number | null;
  stockQuantity: number | null;
  productCondition: string;
  isAvailable: boolean;
  createdAt: string;
  supplierName: string | null;
  masterProductId: string | null;
  status: SupplierOfferSimpleStatus;
};

const NEW_WINDOW_DAYS = 14;

// Everything the Product Center home and the Supplier Offers table need is
// the same underlying rollup (offer -> match -> Base Product's Commercial
// Offers -> their Marketplace Listings), so it's computed once here and
// both the KPI counts and the filtered list read from it -- same
// aggregate-in-JS pattern already used in lib/catalog/queries/dashboard.ts.
async function fetchAllSupplierOffersWithStatus(): Promise<SupplierOfferRow[]> {
  const supabase = createSupabaseAdminClient();

  const { data: offers, error } = await supabase
    .from("supplier_offers")
    .select(
      "id, supplier_sku, supplier_name_raw, supplier_brand_raw, purchase_price, stock_quantity, product_condition, is_available, created_at, product_id, suppliers ( name )",
    )
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    throw new Error(`Не удалось загрузить предложения поставщиков: ${error.message}`);
  }

  const offerIds = (offers ?? []).map((o) => o.id as string);
  const masterProductIds = Array.from(
    new Set((offers ?? []).map((o) => o.product_id as string | null).filter((id): id is string => !!id)),
  );

  const [{ data: matches }, { data: commercialProducts }] = await Promise.all([
    offerIds.length > 0
      ? supabase
          .from("product_matches")
          .select("id, supplier_product_id, match_status")
          .in("supplier_product_id", offerIds)
      : Promise.resolve({ data: [] as { id: string; supplier_product_id: string; match_status: string }[] }),
    masterProductIds.length > 0
      ? supabase.from("commercial_products").select("id, master_product_id").in("master_product_id", masterProductIds)
      : Promise.resolve({ data: [] as { id: string; master_product_id: string }[] }),
  ]);

  const matchStatusByOfferId = new Map<string, MatchStatus>(
    (matches ?? []).map((m) => [m.supplier_product_id as string, m.match_status as MatchStatus]),
  );
  const matchIdByOfferId = new Map<string, string>(
    (matches ?? []).map((m) => [m.supplier_product_id as string, m.id as string]),
  );

  const commercialProductIdsByMaster = new Map<string, string[]>();
  for (const cp of commercialProducts ?? []) {
    const masterId = cp.master_product_id as string;
    const list = commercialProductIdsByMaster.get(masterId) ?? [];
    list.push(cp.id as string);
    commercialProductIdsByMaster.set(masterId, list);
  }

  const allCommercialProductIds = (commercialProducts ?? []).map((cp) => cp.id as string);
  const { data: listings } =
    allCommercialProductIds.length > 0
      ? await supabase
          .from("marketplace_listings")
          .select("commercial_product_id")
          .in("commercial_product_id", allCommercialProductIds)
      : { data: [] as { commercial_product_id: string }[] };

  const listingCountByCommercialProduct = new Map<string, number>();
  for (const l of listings ?? []) {
    const cpId = l.commercial_product_id as string | null;
    if (!cpId) continue;
    listingCountByCommercialProduct.set(cpId, (listingCountByCommercialProduct.get(cpId) ?? 0) + 1);
  }

  return (offers ?? []).map((offer) => {
    const supplier = Array.isArray(offer.suppliers) ? offer.suppliers[0] : offer.suppliers;
    const masterProductId = offer.product_id as string | null;
    const commercialOfferIds = masterProductId ? commercialProductIdsByMaster.get(masterProductId) ?? [] : [];
    const marketplaceListingCount = commercialOfferIds.reduce(
      (sum, cpId) => sum + (listingCountByCommercialProduct.get(cpId) ?? 0),
      0,
    );

    const status = deriveSupplierOfferStatus({
      matchStatus: matchStatusByOfferId.get(offer.id as string) ?? null,
      hasBaseProduct: masterProductId !== null,
      commercialOfferCount: commercialOfferIds.length,
      marketplaceListingCount,
    });

    return {
      id: offer.id as string,
      matchId: matchIdByOfferId.get(offer.id as string) ?? null,
      supplierSku: offer.supplier_sku as string | null,
      nameRaw: offer.supplier_name_raw as string | null,
      brandRaw: offer.supplier_brand_raw as string | null,
      purchasePrice: offer.purchase_price as number | null,
      stockQuantity: offer.stock_quantity as number | null,
      productCondition: offer.product_condition as string,
      isAvailable: Boolean(offer.is_available),
      createdAt: offer.created_at as string,
      supplierName: (supplier as { name: string } | null)?.name ?? null,
      masterProductId,
      status,
    };
  });
}

export type SupplierOfferHomeCounts = {
  total: number;
  availableNow: number;
  newCount: number;
  needsBaseProduct: number;
  hasBaseProduct: number;
  linked: number;
  needsMarketplaceListing: number;
  needsCommercialOffer: number;
  needsReview: number;
  excluded: number;
};

export async function getSupplierOfferHomeCounts(): Promise<SupplierOfferHomeCounts> {
  const offers = await fetchAllSupplierOffersWithStatus();
  const newCutoff = Date.now() - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const counts: SupplierOfferHomeCounts = {
    total: offers.length,
    availableNow: 0,
    newCount: 0,
    needsBaseProduct: 0,
    hasBaseProduct: 0,
    linked: 0,
    needsMarketplaceListing: 0,
    needsCommercialOffer: 0,
    needsReview: 0,
    excluded: 0,
  };

  for (const offer of offers) {
    if (offer.isAvailable) counts.availableNow += 1;
    if (new Date(offer.createdAt).getTime() >= newCutoff) counts.newCount += 1;
    if (offer.masterProductId) counts.hasBaseProduct += 1;

    switch (offer.status) {
      case "needs_base_product":
        counts.needsBaseProduct += 1;
        break;
      case "needs_review":
        counts.needsReview += 1;
        break;
      case "needs_commercial_offer":
        counts.needsCommercialOffer += 1;
        break;
      case "needs_marketplace_listing":
        counts.needsMarketplaceListing += 1;
        break;
      case "linked":
        counts.linked += 1;
        break;
      case "excluded":
        counts.excluded += 1;
        break;
    }
  }

  return counts;
}

export type SupplierOfferListFilters = {
  status?: SupplierOfferSimpleStatus;
  onlyNew?: boolean;
  search?: string;
};

export async function listSupplierOffers(filters: SupplierOfferListFilters = {}): Promise<SupplierOfferRow[]> {
  const offers = await fetchAllSupplierOffersWithStatus();
  const newCutoff = Date.now() - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const searchLower = filters.search?.trim().toLowerCase();

  return offers.filter((offer) => {
    if (filters.status && offer.status !== filters.status) return false;
    if (filters.onlyNew && new Date(offer.createdAt).getTime() < newCutoff) return false;
    if (
      searchLower &&
      !offer.nameRaw?.toLowerCase().includes(searchLower) &&
      !offer.supplierSku?.toLowerCase().includes(searchLower)
    ) {
      return false;
    }
    return true;
  });
}
