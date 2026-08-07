import { describe, expect, it } from "vitest";
import { matchSupplierOffer, type MatchCandidateProduct, type MatchOfferInput } from "./engine";

const RADIATOR_C22_300_1000: MatchCandidateProduct = {
  id: "prod-1",
  ean: "4820022351234",
  manufacturerSku: "C22-300-1000/9016",
  normalizedName: "радиатор панельный royal thermo compact c22-300-1000 ral9016",
  brandId: "royal-thermo",
  series: "COMPACT",
  radiatorAttributes: {
    connection_type: "C",
    radiator_type: "22",
    height_mm: 300,
    length_mm: 1000,
    color_ral: "9016",
    hygienic: false,
  },
};

// Same series/dimensions but a different height -- must never be treated
// as interchangeable with the product above.
const RADIATOR_C22_500_1000: MatchCandidateProduct = {
  id: "prod-2",
  ean: null,
  manufacturerSku: "C22-500-1000/9016",
  normalizedName: "радиатор панельный royal thermo compact c22-500-1000 ral9016",
  brandId: "royal-thermo",
  series: "COMPACT",
  radiatorAttributes: {
    connection_type: "C",
    radiator_type: "22",
    height_mm: 500,
    length_mm: 1000,
    color_ral: "9016",
    hygienic: false,
  },
};

function baseOffer(overrides: Partial<MatchOfferInput> = {}): MatchOfferInput {
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

describe("matchSupplierOffer priority order", () => {
  it("matches on exact EAN first", () => {
    const result = matchSupplierOffer(
      baseOffer({ ean: "482-002-2351234", manufacturerSkuRaw: "SOMETHING-ELSE" }),
      [RADIATOR_C22_300_1000, RADIATOR_C22_500_1000],
    );

    expect(result.status).toBe("matched");
    expect(result.method).toBe("exact_ean");
    expect(result.productId).toBe("prod-1");
  });

  it("matches on exact manufacturer SKU when EAN is absent", () => {
    const result = matchSupplierOffer(
      baseOffer({ manufacturerSkuRaw: "c22-300-1000/9016" }),
      [RADIATOR_C22_300_1000, RADIATOR_C22_500_1000],
    );

    expect(result.status).toBe("matched");
    expect(result.method).toBe("exact_manufacturer_sku");
    expect(result.productId).toBe("prod-1");
  });

  it("matches on brand+series+identity-critical attributes when no SKU/EAN given", () => {
    const result = matchSupplierOffer(
      baseOffer({
        brandId: "royal-thermo",
        series: "COMPACT",
        radiatorAttributes: {
          connection_type: "C",
          radiator_type: "22",
          height_mm: 300,
          length_mm: 1000,
          color_ral: "9016",
          hygienic: false,
        },
      }),
      [RADIATOR_C22_300_1000, RADIATOR_C22_500_1000],
    );

    expect(result.status).toBe("matched");
    expect(result.method).toBe("brand_series_variant");
    expect(result.productId).toBe("prod-1");
  });

  it("falls back to probable name matching", () => {
    const result = matchSupplierOffer(
      baseOffer({
        nameRaw: "Радиатор панельный Royal Thermo COMPACT C22-300-1000 RAL9016 стальной",
      }),
      [RADIATOR_C22_300_1000, RADIATOR_C22_500_1000],
    );

    expect(result.status).toBe("probable");
    expect(result.method).toBe("probable_name_attributes");
    expect(result.productId).toBe("prod-1");
  });

  it("returns missing when nothing matches", () => {
    const result = matchSupplierOffer(
      baseOffer({ nameRaw: "Совершенно другой товар без аналогов" }),
      [RADIATOR_C22_300_1000, RADIATOR_C22_500_1000],
    );

    expect(result.status).toBe("missing");
    expect(result.productId).toBeNull();
  });
});

describe("matchSupplierOffer identity-critical guard", () => {
  it("never returns a candidate whose height differs, even via brand+series tier", () => {
    const result = matchSupplierOffer(
      baseOffer({
        brandId: "royal-thermo",
        series: "COMPACT",
        radiatorAttributes: {
          connection_type: "C",
          radiator_type: "22",
          height_mm: 500, // matches prod-2, conflicts with prod-1
          length_mm: 1000,
          color_ral: "9016",
          hygienic: false,
        },
      }),
      [RADIATOR_C22_300_1000, RADIATOR_C22_500_1000],
    );

    expect(result.status).toBe("matched");
    expect(result.productId).toBe("prod-2");
  });

  it("excludes conflicting-height candidates from probable name matching too", () => {
    const result = matchSupplierOffer(
      baseOffer({
        nameRaw: "Радиатор панельный Royal Thermo COMPACT C22-300-1000 RAL9016 стальной",
        radiatorAttributes: { height_mm: 500 }, // explicitly conflicts with prod-1's 300mm
      }),
      [RADIATOR_C22_300_1000],
    );

    expect(result.status).toBe("missing");
  });
});

describe("matchSupplierOffer conflict handling", () => {
  it("reports a conflict when multiple products share the same manufacturer SKU", () => {
    const duplicate: MatchCandidateProduct = { ...RADIATOR_C22_300_1000, id: "prod-1-dup" };

    const result = matchSupplierOffer(
      baseOffer({ manufacturerSkuRaw: "C22-300-1000/9016" }),
      [RADIATOR_C22_300_1000, duplicate],
    );

    expect(result.status).toBe("conflict");
    expect(result.productId).toBeNull();
    expect(result.conflictingProductIds).toEqual(
      expect.arrayContaining(["prod-1", "prod-1-dup"]),
    );
  });

  it("reports a conflict when two candidates are near-equally similar by name", () => {
    const nearDuplicateName: MatchCandidateProduct = {
      id: "prod-3",
      ean: null,
      manufacturerSku: null,
      normalizedName: "радиатор панельный royal thermo compact c22-300-1000 ral9016 стальной",
      brandId: "royal-thermo",
      series: "COMPACT",
      radiatorAttributes: null,
    };

    const result = matchSupplierOffer(
      baseOffer({
        nameRaw: "Радиатор панельный Royal Thermo COMPACT C22-300-1000 RAL9016",
      }),
      [{ ...RADIATOR_C22_300_1000, radiatorAttributes: null }, nearDuplicateName],
    );

    expect(result.status).toBe("conflict");
  });

  it("never auto-confirms a probable or conflict match (status is never 'matched' without an exact tier)", () => {
    const result = matchSupplierOffer(
      baseOffer({
        nameRaw: "Радиатор панельный Royal Thermo COMPACT C22-300-1000 RAL9016 стальной",
      }),
      [{ ...RADIATOR_C22_300_1000, radiatorAttributes: null }],
    );

    expect(result.status).toBe("probable");
  });
});
