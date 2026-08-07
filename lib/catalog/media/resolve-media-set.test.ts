import { describe, expect, it } from "vitest";
import { resolveMediaSet } from "./resolve-media-set";

describe("resolveMediaSet", () => {
  it("prefers the content variant's own media set", () => {
    const result = resolveMediaSet(
      { media_set_id: "variant-set" },
      { media_set_id: "commercial-set" },
      { default_media_set_id: "master-set" },
    );

    expect(result).toEqual({ mediaSetId: "variant-set", resolvedFrom: "content_variant" });
  });

  it("falls back to the commercial product's media set when the variant has none", () => {
    const result = resolveMediaSet(
      { media_set_id: null },
      { media_set_id: "commercial-set" },
      { default_media_set_id: "master-set" },
    );

    expect(result).toEqual({ mediaSetId: "commercial-set", resolvedFrom: "commercial_product" });
  });

  it("falls back to the master product's default media set as a last resort", () => {
    const result = resolveMediaSet(
      { media_set_id: null },
      { media_set_id: null },
      { default_media_set_id: "master-set" },
    );

    expect(result).toEqual({ mediaSetId: "master-set", resolvedFrom: "master_product" });
  });

  it("returns null instead of silently fabricating a media set", () => {
    const result = resolveMediaSet(
      { media_set_id: null },
      { media_set_id: null },
      { default_media_set_id: null },
    );

    expect(result).toBeNull();
  });
});
