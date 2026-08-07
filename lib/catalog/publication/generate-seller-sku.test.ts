import { describe, expect, it } from "vitest";
import { buildRadiatorModelCode, generateSellerSku } from "./generate-seller-sku";

describe("generateSellerSku", () => {
  it("matches the approved example: AXE-GREE-BORA07-BASE", () => {
    expect(generateSellerSku({ brandCode: "GREE", modelCode: "BORA07", variantSuffix: "BASE" })).toBe(
      "AXE-GREE-BORA07-BASE",
    );
  });

  it("matches the approved example: AXE-RT-VC22-5001000-WH", () => {
    expect(generateSellerSku({ brandCode: "RT", modelCode: "VC22-5001000", variantSuffix: "WH" })).toBe(
      "AXE-RT-VC22-5001000-WH",
    );
  });

  it("is deterministic -- same inputs always produce the same SKU", () => {
    const parts = { brandCode: "RT", modelCode: "VC22-5001000", variantSuffix: "WH" };
    expect(generateSellerSku(parts)).toBe(generateSellerSku(parts));
  });

  it("omits the variant segment when there is no differentiator", () => {
    expect(generateSellerSku({ brandCode: "GREE", modelCode: "BORA07" })).toBe("AXE-GREE-BORA07");
  });

  it("normalizes case and strips disallowed characters", () => {
    expect(generateSellerSku({ brandCode: " gree ", modelCode: "bora 07!", variantSuffix: "base" })).toBe(
      "AXE-GREE-BORA07-BASE",
    );
  });

  it("returns null instead of a partial SKU when brand or model is missing", () => {
    expect(generateSellerSku({ brandCode: null, modelCode: "BORA07" })).toBeNull();
    expect(generateSellerSku({ brandCode: "GREE", modelCode: null })).toBeNull();
  });
});

describe("buildRadiatorModelCode", () => {
  it("builds the model segment from connection/type/dimensions", () => {
    expect(
      buildRadiatorModelCode({ connection_type: "VC", radiator_type: "22", height_mm: 500, length_mm: 1000 }),
    ).toBe("VC22-5001000");
  });

  it("returns null when identity-critical dimensions are missing", () => {
    expect(
      buildRadiatorModelCode({ connection_type: "VC", radiator_type: "22", height_mm: null, length_mm: 1000 }),
    ).toBeNull();
  });
});
