import { describe, expect, it } from "vitest";
import { generateSellerSku } from "./generate-seller-sku";
import { resolveMediaSet } from "../media/resolve-media-set";

// These two spec requirements ("one Master Product -> many Commercial
// Products", "one Commercial Product -> many listings/content variants")
// aren't enforced by a single function -- they're a property of the schema
// (no unique constraint blocks the fan-out) plus the resolvers behaving
// independently per sibling. This test demonstrates that independence at
// the point where it would actually break: two siblings must never
// collide on seller_sku or silently share a media resolution they didn't
// opt into.
describe("Commercial Product / Content Variant fan-out", () => {
  it("one Master Product can produce multiple Commercial Products with distinct, non-colliding SKUs", () => {
    // Same Master Product (GREE Bora 07), two different bundle packagings.
    const base = generateSellerSku({ brandCode: "GREE", modelCode: "BORA07", variantSuffix: "BASE" });
    const withKit = generateSellerSku({ brandCode: "GREE", modelCode: "BORA07", variantSuffix: "KIT" });

    expect(base).toBe("AXE-GREE-BORA07-BASE");
    expect(withKit).toBe("AXE-GREE-BORA07-KIT");
    expect(base).not.toBe(withKit);
  });

  it("one Commercial Product can carry multiple Content Variants, each independently resolving media", () => {
    const masterProduct = { default_media_set_id: "master-default-set" };
    const commercialProduct = { media_set_id: null as string | null };

    const kaspiVariant = { media_set_id: "kaspi-specific-set" };
    const wbVariant = { media_set_id: "wb-specific-set" };
    const genericVariant = { media_set_id: null as string | null };

    expect(resolveMediaSet(kaspiVariant, commercialProduct, masterProduct)).toEqual({
      mediaSetId: "kaspi-specific-set",
      resolvedFrom: "content_variant",
    });
    expect(resolveMediaSet(wbVariant, commercialProduct, masterProduct)).toEqual({
      mediaSetId: "wb-specific-set",
      resolvedFrom: "content_variant",
    });
    // A variant with no override of its own still resolves independently
    // -- it inherits from the shared Commercial Product/Master Product
    // level rather than accidentally reusing a sibling variant's set.
    expect(resolveMediaSet(genericVariant, commercialProduct, masterProduct)).toEqual({
      mediaSetId: "master-default-set",
      resolvedFrom: "master_product",
    });
  });
});
