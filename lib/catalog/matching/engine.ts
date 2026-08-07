import type { RadiatorAttributes } from "../types";
import { normalizeEan, normalizeProductName, normalizeSku } from "../normalization/sku";

// Identity-critical radiator attributes: two offers/products that disagree
// on any of these are different commercial variants and must never be
// merged, no matter how similar their names look (spec: "Never merge
// variants that differ in identity-critical attributes").
const IDENTITY_CRITICAL_KEYS: (keyof RadiatorAttributes)[] = [
  "connection_type",
  "radiator_type",
  "height_mm",
  "length_mm",
  "color_ral",
  "hygienic",
];

export type MatchCandidateProduct = {
  id: string;
  ean: string | null;
  manufacturerSku: string | null;
  normalizedName: string | null;
  brandId: string | null;
  series: string | null;
  radiatorAttributes?: Partial<RadiatorAttributes> | null;
};

export type MatchOfferInput = {
  ean: string | null;
  manufacturerSkuRaw: string | null;
  nameRaw: string;
  brandId: string | null;
  series: string | null;
  radiatorAttributes?: Partial<RadiatorAttributes> | null;
};

export type MatchResult = {
  status: "matched" | "probable" | "missing" | "conflict";
  method: "exact_ean" | "exact_manufacturer_sku" | "exact_normalized_sku" | "brand_series_variant" | "probable_name_attributes" | "none";
  confidence: number;
  productId: string | null;
  reasons: string[];
  conflictingProductIds?: string[];
};

// True when both sides define at least one identity-critical attribute and
// they disagree on it. Missing/unknown attributes on either side are never
// treated as a disqualifying difference -- absence of data is not evidence
// of a different variant.
function hasIdentityConflict(
  a?: Partial<RadiatorAttributes> | null,
  b?: Partial<RadiatorAttributes> | null,
): boolean {
  if (!a || !b) {
    return false;
  }

  return IDENTITY_CRITICAL_KEYS.some((key) => {
    const valueA = a[key];
    const valueB = b[key];

    if (valueA === undefined || valueA === null || valueB === undefined || valueB === null) {
      return false;
    }

    return valueA !== valueB;
  });
}

function tokenize(text: string | null): Set<string> {
  if (!text) {
    return new Set();
  }

  return new Set(text.split(" ").filter((token) => token.length > 1));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }

  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const PROBABLE_MATCH_THRESHOLD = 0.6;
const AMBIGUITY_GAP = 0.15;

export function matchSupplierOffer(
  offer: MatchOfferInput,
  candidates: MatchCandidateProduct[],
): MatchResult {
  // Radiator identity guard applies to every tier below: never consider a
  // candidate whose identity-critical attributes conflict with the offer's.
  const eligibleCandidates = candidates.filter(
    (candidate) => !hasIdentityConflict(offer.radiatorAttributes, candidate.radiatorAttributes),
  );

  const normalizedEan = normalizeEan(offer.ean);
  if (normalizedEan) {
    const eanMatches = eligibleCandidates.filter((c) => c.ean && normalizeEan(c.ean) === normalizedEan);
    const result = resolveTier(eanMatches, "exact_ean", 1.0, [`EAN совпадает: ${normalizedEan}`]);
    if (result) return result;
  }

  const normalizedMfrSku = normalizeSku(offer.manufacturerSkuRaw);
  if (normalizedMfrSku) {
    const skuMatches = eligibleCandidates.filter(
      (c) => c.manufacturerSku && normalizeSku(c.manufacturerSku) === normalizedMfrSku,
    );
    const result = resolveTier(
      skuMatches,
      "exact_manufacturer_sku",
      0.95,
      [`Артикул производителя совпадает: ${normalizedMfrSku}`],
    );
    if (result) return result;

    // Tier 3 (normalized supplier SKU) collapses into the same normalized
    // comparison as tier 2 here because both sides only ever carry a
    // manufacturer-style SKU string in this pipeline; kept as a distinct
    // enum value for explainability/audit purposes.
  }

  if (offer.brandId && offer.series) {
    const variantMatches = eligibleCandidates.filter(
      (c) =>
        c.brandId === offer.brandId &&
        c.series === offer.series &&
        !hasIdentityConflict(offer.radiatorAttributes, c.radiatorAttributes),
    );
    const result = resolveTier(
      variantMatches,
      "brand_series_variant",
      0.85,
      [`Бренд и серия совпадают: ${offer.series}`],
    );
    if (result) return result;
  }

  const offerNameTokens = tokenize(normalizeProductName(offer.nameRaw));
  const scored = eligibleCandidates
    .map((candidate) => ({
      candidate,
      score: jaccardSimilarity(offerNameTokens, tokenize(candidate.normalizedName)),
    }))
    .filter((entry) => entry.score >= PROBABLE_MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    const [best, second] = scored;
    const isAmbiguous = second !== undefined && best.score - second.score < AMBIGUITY_GAP;

    if (isAmbiguous) {
      return {
        status: "conflict",
        method: "probable_name_attributes",
        confidence: best.score,
        productId: null,
        reasons: [
          `Несколько похожих товаров с близким сходством названия (${best.score.toFixed(2)} vs ${second.score.toFixed(2)})`,
        ],
        conflictingProductIds: scored
          .filter((entry) => best.score - entry.score < AMBIGUITY_GAP)
          .map((entry) => entry.candidate.id),
      };
    }

    return {
      status: "probable",
      method: "probable_name_attributes",
      confidence: best.score,
      productId: best.candidate.id,
      reasons: [`Похожее название (сходство ${best.score.toFixed(2)})`],
    };
  }

  return {
    status: "missing",
    method: "none",
    confidence: 0,
    productId: null,
    reasons: ["Совпадений не найдено — кандидат на создание нового товара"],
  };
}

function resolveTier(
  matches: MatchCandidateProduct[],
  method: MatchResult["method"],
  confidence: number,
  reasons: string[],
): MatchResult | null {
  if (matches.length === 0) {
    return null;
  }

  if (matches.length === 1) {
    return {
      status: "matched",
      method,
      confidence,
      productId: matches[0].id,
      reasons,
    };
  }

  return {
    status: "conflict",
    method,
    confidence,
    productId: null,
    reasons: [...reasons, `Найдено ${matches.length} совпадающих товаров — требуется ручной выбор`],
    conflictingProductIds: matches.map((m) => m.id),
  };
}
