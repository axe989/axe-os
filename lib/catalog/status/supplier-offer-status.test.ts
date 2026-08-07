import { describe, expect, it } from "vitest";
import { deriveSupplierOfferStatus } from "./supplier-offer-status";

function base(overrides: Partial<Parameters<typeof deriveSupplierOfferStatus>[0]> = {}) {
  return {
    matchStatus: null,
    hasBaseProduct: false,
    commercialOfferCount: 0,
    marketplaceListingCount: 0,
    ...overrides,
  };
}

describe("deriveSupplierOfferStatus", () => {
  it("returns excluded when the match was explicitly ignored, regardless of anything else", () => {
    expect(
      deriveSupplierOfferStatus(
        base({ matchStatus: "ignored", hasBaseProduct: true, commercialOfferCount: 3, marketplaceListingCount: 5 }),
      ),
    ).toBe("excluded");
  });

  it("returns needs_review for a probable match", () => {
    expect(deriveSupplierOfferStatus(base({ matchStatus: "probable" }))).toBe("needs_review");
  });

  it("returns needs_review for a conflicting match", () => {
    expect(deriveSupplierOfferStatus(base({ matchStatus: "conflict" }))).toBe("needs_review");
  });

  it("returns needs_base_product when nothing has been decided yet (match_status missing)", () => {
    expect(deriveSupplierOfferStatus(base({ matchStatus: "missing" }))).toBe("needs_base_product");
  });

  it("returns needs_base_product when there is no product_matches row at all yet", () => {
    expect(deriveSupplierOfferStatus(base({ matchStatus: null }))).toBe("needs_base_product");
  });

  it("returns needs_commercial_offer once a Base Product exists but has no Commercial Offers", () => {
    expect(
      deriveSupplierOfferStatus(
        base({ matchStatus: "matched", hasBaseProduct: true, commercialOfferCount: 0 }),
      ),
    ).toBe("needs_commercial_offer");
  });

  it("returns needs_marketplace_listing once Commercial Offers exist but none has a listing", () => {
    expect(
      deriveSupplierOfferStatus(
        base({
          matchStatus: "matched",
          hasBaseProduct: true,
          commercialOfferCount: 2,
          marketplaceListingCount: 0,
        }),
      ),
    ).toBe("needs_marketplace_listing");
  });

  it("returns linked once at least one Commercial Offer and one Marketplace Listing exist", () => {
    expect(
      deriveSupplierOfferStatus(
        base({
          matchStatus: "matched",
          hasBaseProduct: true,
          commercialOfferCount: 1,
          marketplaceListingCount: 1,
        }),
      ),
    ).toBe("linked");
  });
});
