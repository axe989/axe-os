import { describe, expect, it } from "vitest";
import { normalizeChannelCatalogRow, type ChannelCatalogColumnMapping } from "./channel-catalog";

const mapping: ChannelCatalogColumnMapping = {
  title: 0,
  external_sku: 1,
  purchase_price: 2,
  min_price: 3,
  max_price: 4,
  damping_step: 5,
  damping_enabled: 6,
  sale_price: 7,
};

describe("normalizeChannelCatalogRow", () => {
  it("normalizes a real товары-2-shaped row", () => {
    const row = [
      "Royal Thermo панельный COMPACT C22-500-700 RAL9016 стальной, кол-во секций: 1",
      "628368330",
      28594,
      41440,
      52000,
      1,
      "Включен",
      52000,
    ];

    const result = normalizeChannelCatalogRow(row, mapping);

    expect(result.externalSku).toBe("628368330");
    expect(result.purchasePrice).toBe(28594);
    expect(result.maxPrice).toBe(52000);
    expect(result.dampingEnabled).toBe(true);
    expect(result.brandRaw).toBe("Royal Thermo");
    // No compact SKU code and no "NxM мм" pattern in this title, so only
    // the RAL colour is recoverable via the free-text fallback.
    expect(result.radiator.attributes.height_mm).toBeNull();
    expect(result.radiator.attributes.color_ral).toBe("9016");
    expect(result.validationErrors).toHaveLength(0);
  });

  it("flags a row with no title as invalid", () => {
    const row = [null, "123", null, null, null, 1, "Отключен", null];
    const result = normalizeChannelCatalogRow(row, mapping);
    expect(result.validationErrors.length).toBeGreaterThan(0);
  });

  it("treats a missing purchase price as null rather than 0", () => {
    const row = ["Some product", "123", null, null, null, 1, "Отключен", 1000];
    const result = normalizeChannelCatalogRow(row, mapping);
    expect(result.purchasePrice).toBeNull();
  });
});
