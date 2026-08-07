// Media inheritance: Master Product -> Commercial Product -> Content
// Variant. A lower level overrides the level above by setting its own
// media_set_id; leaving it null reuses (never duplicates) the media set
// resolved from higher up. See architecture proposal, "Media inheritance".

export type MediaResolutionSource = "content_variant" | "commercial_product" | "master_product";

export type MediaResolution = {
  mediaSetId: string;
  resolvedFrom: MediaResolutionSource;
};

export function resolveMediaSet(
  variant: { media_set_id: string | null },
  commercialProduct: { media_set_id: string | null },
  masterProduct: { default_media_set_id: string | null },
): MediaResolution | null {
  if (variant.media_set_id) {
    return { mediaSetId: variant.media_set_id, resolvedFrom: "content_variant" };
  }

  if (commercialProduct.media_set_id) {
    return { mediaSetId: commercialProduct.media_set_id, resolvedFrom: "commercial_product" };
  }

  if (masterProduct.default_media_set_id) {
    return { mediaSetId: masterProduct.default_media_set_id, resolvedFrom: "master_product" };
  }

  return null;
}
