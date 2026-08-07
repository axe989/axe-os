import type { MatchStatus } from "../types";

// Business-facing status replacing the raw Matching Engine internals
// (match_status/match_method/confidence_score) with plain language, per
// the Supplier-Offer-centric Product Center redesign (2026-08-07). This
// is a priority cascade over EXISTING data -- it reads product_matches /
// commercial_products / marketplace_listings, it never writes to them and
// requires no schema change.
export type SupplierOfferSimpleStatus =
  | "needs_review"
  | "needs_base_product"
  | "needs_commercial_offer"
  | "needs_marketplace_listing"
  | "linked"
  | "excluded";

export type SupplierOfferStatusInput = {
  // null when no product_matches row exists yet for this offer (e.g.
  // matching hasn't run) -- treated the same as "missing".
  matchStatus: MatchStatus | null;
  hasBaseProduct: boolean;
  commercialOfferCount: number;
  marketplaceListingCount: number;
};

export function deriveSupplierOfferStatus(
  input: SupplierOfferStatusInput,
): SupplierOfferSimpleStatus {
  if (input.matchStatus === "ignored") {
    return "excluded";
  }

  if (input.matchStatus === "probable" || input.matchStatus === "conflict") {
    return "needs_review";
  }

  if (!input.hasBaseProduct) {
    return "needs_base_product";
  }

  if (input.commercialOfferCount === 0) {
    return "needs_commercial_offer";
  }

  if (input.marketplaceListingCount === 0) {
    return "needs_marketplace_listing";
  }

  return "linked";
}

export const SUPPLIER_OFFER_STATUS_LABELS: Record<SupplierOfferSimpleStatus, string> = {
  needs_review: "Требует проверки",
  needs_base_product: "Нужно решение по ассортименту",
  needs_commercial_offer: "Нужно коммерческое предложение",
  needs_marketplace_listing: "Нужен листинг на маркетплейсе",
  linked: "Связан",
  excluded: "Исключён",
};
