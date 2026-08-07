// Deterministic, human-readable seller SKU: "AXE-{BRAND}-{MODEL}-{VARIANT}",
// e.g. AXE-GREE-BORA07-BASE or AXE-RT-VC22-5001000-WH. Never random --
// the same inputs must always produce the same SKU so re-deriving it for
// preview never disagrees with what was already exported. Once a
// marketplace_publication_items row has been exported, its seller_sku is
// frozen (the DB doesn't enforce this at the column level, but callers
// must never regenerate/overwrite a seller_sku after export_snapshot is set).

function normalizeSkuSegment(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export type SellerSkuParts = {
  brandCode: string | null;
  modelCode: string | null;
  variantSuffix?: string | null;
};

// Returns null (never a partial/garbage SKU) when a required part is
// missing -- the validation engine surfaces that as a blocking error
// rather than exporting an unidentifiable row.
export function generateSellerSku(parts: SellerSkuParts): string | null {
  const brand = parts.brandCode ? normalizeSkuSegment(parts.brandCode) : "";
  const model = parts.modelCode ? normalizeSkuSegment(parts.modelCode) : "";

  if (!brand || !model) {
    return null;
  }

  const variant = parts.variantSuffix ? normalizeSkuSegment(parts.variantSuffix) : "";

  const segments = ["AXE", brand, model, ...(variant ? [variant] : [])];
  return segments.join("-");
}

// Category-specific helper: builds the "MODEL" segment for a steel panel
// radiator from its parsed technical attributes (see
// lib/catalog/normalization/radiator.ts), e.g. connection_type="VC",
// radiator_type="22", height_mm=500, length_mm=1000 -> "VC22-5001000".
// Returns null when the identity-critical dimensions are missing.
export function buildRadiatorModelCode(attributes: {
  connection_type: string | null;
  radiator_type: string | null;
  height_mm: number | null;
  length_mm: number | null;
}): string | null {
  if (attributes.height_mm === null || attributes.length_mm === null) {
    return null;
  }

  const typePrefix = [attributes.connection_type, attributes.radiator_type].filter(Boolean).join("");
  const dimensions = `${attributes.height_mm}${attributes.length_mm}`;

  return typePrefix ? `${typePrefix}-${dimensions}` : dimensions;
}
