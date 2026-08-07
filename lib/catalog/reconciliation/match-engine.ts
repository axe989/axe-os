import { normalizeProductName, normalizeSku } from "../normalization/sku";
import type { DiscoveredKaspiListing } from "./types";

export type PublicationItemCandidate = {
  id: string;
  sellerSku: string | null;
  commercialProductId: string;
  commercialProductName: string;
  existingExternalListingId: string | null;
};

export type ReconciliationMatchStatus = "matched" | "ambiguous" | "none";

export type ReconciliationMatchMethod =
  | "exact_seller_sku"
  | "exact_external_id"
  | "normalized_identity"
  | "none";

export type ReconciliationMatchResult = {
  status: ReconciliationMatchStatus;
  method: ReconciliationMatchMethod;
  confidence: number;
  candidateId: string | null;
  candidateIds: string[];
  reasons: string[];
};

// Reconciles one discovered Kaspi listing against the publication items
// still waiting to be confirmed live (exported/uploaded). Only an exact,
// UNIQUE match on seller SKU or Kaspi's own external listing id counts as
// confident enough to auto-transition a publication item to `published`;
// normalized-name identity is a supporting signal only and always routes
// to manual review, per spec: "Ambiguous matches must require manual
// review." Publication timestamp proximity and commercial-product
// consistency are used by the caller as tie-breakers among ambiguous
// candidates, not decided here (this function only sees the identity
// signals, not timing -- the caller has the full candidate rows).
export function matchDiscoveredListing(
  discovered: DiscoveredKaspiListing,
  candidates: PublicationItemCandidate[],
): ReconciliationMatchResult {
  if (discovered.sellerSku) {
    const normalizedDiscoveredSku = normalizeSku(discovered.sellerSku);
    const skuMatches = candidates.filter(
      (candidate) => candidate.sellerSku && normalizeSku(candidate.sellerSku) === normalizedDiscoveredSku,
    );

    if (skuMatches.length === 1) {
      return {
        status: "matched",
        method: "exact_seller_sku",
        confidence: 1,
        candidateId: skuMatches[0].id,
        candidateIds: [skuMatches[0].id],
        reasons: ["Точное совпадение по артикулу продавца (merchant SKU)"],
      };
    }

    if (skuMatches.length > 1) {
      return {
        status: "ambiguous",
        method: "exact_seller_sku",
        confidence: 0.5,
        candidateId: null,
        candidateIds: skuMatches.map((c) => c.id),
        reasons: ["Несколько позиций публикации имеют одинаковый артикул продавца"],
      };
    }
  }

  if (discovered.externalListingId) {
    const idMatches = candidates.filter(
      (candidate) => candidate.existingExternalListingId === discovered.externalListingId,
    );

    if (idMatches.length === 1) {
      return {
        status: "matched",
        method: "exact_external_id",
        confidence: 1,
        candidateId: idMatches[0].id,
        candidateIds: [idMatches[0].id],
        reasons: ["Точное совпадение по внешнему ID листинга Kaspi"],
      };
    }

    if (idMatches.length > 1) {
      return {
        status: "ambiguous",
        method: "exact_external_id",
        confidence: 0.5,
        candidateId: null,
        candidateIds: idMatches.map((c) => c.id),
        reasons: ["Несколько позиций публикации ссылаются на один и тот же внешний ID"],
      };
    }
  }

  if (discovered.name) {
    const normalizedDiscoveredName = normalizeProductName(discovered.name);
    const nameMatches = candidates.filter(
      (candidate) => normalizeProductName(candidate.commercialProductName) === normalizedDiscoveredName,
    );

    if (nameMatches.length >= 1) {
      return {
        status: "ambiguous",
        method: "normalized_identity",
        confidence: 0.6,
        candidateId: null,
        candidateIds: nameMatches.map((c) => c.id),
        reasons: ["Совпадение по нормализованному названию товара -- требуется подтверждение вручную"],
      };
    }
  }

  return { status: "none", method: "none", confidence: 0, candidateId: null, candidateIds: [], reasons: ["Совпадений не найдено"] };
}
