import { describe, expect, it } from "vitest";
import { matchListingToCommercialProduct } from "./engine";
import type { MatchCandidateProduct, MatchOfferInput } from "./engine";

// Level 3 -> Level 2 matching (Kaspi XML -> Marketplace Listing -> Matching
// Engine -> Commercial Product), per the four-level architecture review
// (2026-08-07). matchListingToCommercialProduct is an alias of
// matchSupplierOffer -- the priority-tier algorithm is identical, only the
// candidate pool changes (Commercial Product candidates carry their
// identity facts from the underlying Master Product, see
// fetchCommercialProductCandidates).

const GREE_BORA_STANDARD: MatchCandidateProduct = {
  id: "commercial-standard",
  ean: "4820022351111",
  manufacturerSku: "GWH07AGB-K6DNA1D",
  normalizedName: "кондиционер gree bora 07 без установки",
  brandId: "gree",
  series: null,
  radiatorAttributes: null,
};

// Same Master Product (same EAN/manufacturer SKU would be shared in
// reality via product_master), but a DIFFERENT commercial packaging --
// this is exactly the "one Master Product -> many Commercial Products"
// scenario. In candidate-fetching terms these two rows would come back
// with identical ean/manufacturerSku (both trace to the same
// product_master row) but distinct commercial product ids.
const GREE_BORA_WITH_INSTALLATION: MatchCandidateProduct = {
  id: "commercial-with-installation",
  ean: "4820022351111",
  manufacturerSku: "GWH07AGB-K6DNA1D",
  normalizedName: "кондиционер gree bora 07 со стандартной установкой",
  brandId: "gree",
  series: null,
  radiatorAttributes: null,
};

const UNRELATED_PRODUCT: MatchCandidateProduct = {
  id: "commercial-unrelated",
  ean: "1112223334445",
  manufacturerSku: "SOME-OTHER-SKU",
  normalizedName: "бойлер royal thermo aquatec",
  brandId: "royal-thermo",
  series: null,
  radiatorAttributes: null,
};

function baseListing(overrides: Partial<MatchOfferInput> = {}): MatchOfferInput {
  return {
    ean: null,
    manufacturerSkuRaw: null,
    nameRaw: "",
    brandId: null,
    series: null,
    radiatorAttributes: null,
    ...overrides,
  };
}

describe("matchListingToCommercialProduct: exact match", () => {
  it("matches a Kaspi listing to its Commercial Product by EAN", () => {
    const result = matchListingToCommercialProduct(
      baseListing({ ean: "482-002-2351111", nameRaw: "Кондиционер Gree Bora 07" }),
      [GREE_BORA_STANDARD, UNRELATED_PRODUCT],
    );

    expect(result.status).toBe("matched");
    expect(result.method).toBe("exact_ean");
    expect(result.productId).toBe("commercial-standard");
  });

  it("matches a Kaspi listing to its Commercial Product by manufacturer SKU", () => {
    const result = matchListingToCommercialProduct(
      baseListing({ manufacturerSkuRaw: "gwh07agb-k6dna1d", nameRaw: "Кондиционер Gree" }),
      [GREE_BORA_STANDARD, UNRELATED_PRODUCT],
    );

    expect(result.status).toBe("matched");
    expect(result.method).toBe("exact_manufacturer_sku");
    expect(result.productId).toBe("commercial-standard");
  });
});

describe("matchListingToCommercialProduct: one Commercial Product, many listings", () => {
  it("resolves several distinct Kaspi listings (different titles/SKUs) to the same Commercial Product", () => {
    const listingA = matchListingToCommercialProduct(
      baseListing({ ean: "4820022351111", nameRaw: "Инверторный кондиционер Gree" }),
      [GREE_BORA_STANDARD, UNRELATED_PRODUCT],
    );
    const listingB = matchListingToCommercialProduct(
      baseListing({ ean: "4820022351111", nameRaw: "Кондиционер до 25 м² Gree Bora" }),
      [GREE_BORA_STANDARD, UNRELATED_PRODUCT],
    );
    const listingC = matchListingToCommercialProduct(
      baseListing({ manufacturerSkuRaw: "GWH07AGB-K6DNA1D", nameRaw: "Gree Bora 07 официальная гарантия" }),
      [GREE_BORA_STANDARD, UNRELATED_PRODUCT],
    );

    expect(listingA.productId).toBe("commercial-standard");
    expect(listingB.productId).toBe("commercial-standard");
    expect(listingC.productId).toBe("commercial-standard");
    expect([listingA.status, listingB.status, listingC.status]).toEqual(["matched", "matched", "matched"]);
  });
});

describe("matchListingToCommercialProduct: ambiguous matches require review", () => {
  it("reports a conflict instead of guessing when a Master Product has multiple Commercial Products with identical identity facts", () => {
    // Both commercial packagings trace back to the same Master Product
    // (same EAN/manufacturer SKU) -- a listing that only carries those
    // Level-1 facts cannot tell which packaging (with/without
    // installation) it represents. The matching engine must not silently
    // pick one; it must surface a conflict for human review.
    const result = matchListingToCommercialProduct(
      baseListing({ ean: "4820022351111", manufacturerSkuRaw: "GWH07AGB-K6DNA1D" }),
      [GREE_BORA_STANDARD, GREE_BORA_WITH_INSTALLATION, UNRELATED_PRODUCT],
    );

    expect(result.status).toBe("conflict");
    expect(result.productId).toBeNull();
    expect(result.conflictingProductIds).toEqual(
      expect.arrayContaining(["commercial-standard", "commercial-with-installation"]),
    );
  });

  it("reports a conflict for near-equally-similar names with no exact identity match", () => {
    const closeVariantA: MatchCandidateProduct = {
      id: "commercial-a",
      ean: null,
      manufacturerSku: null,
      normalizedName: "водонагреватель ariston abs pro 80 литров",
      brandId: "ariston",
      series: null,
      radiatorAttributes: null,
    };
    const closeVariantB: MatchCandidateProduct = {
      id: "commercial-b",
      ean: null,
      manufacturerSku: null,
      normalizedName: "водонагреватель ariston abs pro 100 литров",
      brandId: "ariston",
      series: null,
      radiatorAttributes: null,
    };

    const result = matchListingToCommercialProduct(
      baseListing({ nameRaw: "Водонагреватель Ariston ABS PRO литров" }),
      [closeVariantA, closeVariantB],
    );

    expect(result.status).toBe("conflict");
    expect(result.productId).toBeNull();
  });

  it("never auto-confirms a probable listing match (status is only 'matched' via an exact tier)", () => {
    const result = matchListingToCommercialProduct(
      baseListing({ nameRaw: "Инверторный кондиционер Gree Bora 07 без установки" }),
      [GREE_BORA_STANDARD],
    );

    expect(result.status).toBe("probable");
    expect(result.method).toBe("probable_name_attributes");
  });
});
