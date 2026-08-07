import { describe, expect, it } from "vitest";
import {
  aggregateSupplierStockRows,
  normalizeSupplierStockRow,
  type SupplierStockColumnMapping,
} from "./supplier-stock";

const mapping: SupplierStockColumnMapping = {
  manufacturer_sku: 1,
  name_raw: 2,
  condition_raw: 3,
  stock_quantity: 4,
  purchase_price: null,
};

describe("normalizeSupplierStockRow", () => {
  it("normalizes a real Термо-sheet-shaped row", () => {
    const row = [
      "НС-1189793",
      "C22-300-1000/9016",
      "Радиатор панельный Royal Thermo COMPACT C22-300-1000 RAL9016",
      "Новый",
      89,
    ];

    const result = normalizeSupplierStockRow(row, mapping);

    expect(result.condition).toBe("new");
    expect(result.isSaleable).toBe(true);
    expect(result.stockQuantity).toBe(89);
    expect(result.brandRaw).toBe("Royal Thermo");
    expect(result.supplierSku).toBe("C22-300-1000/9016");
    expect(result.radiator.attributes.height_mm).toBe(300);
    expect(result.validationErrors).toHaveLength(0);
  });

  it("normalizes a damaged-condition row as not saleable", () => {
    const row = [
      "НС-1189793",
      "C22-300-1000/9016",
      "Радиатор панельный Royal Thermo COMPACT C22-300-1000 RAL9016",
      "Потертости и царапины на корпусе",
      1,
    ];

    const result = normalizeSupplierStockRow(row, mapping);

    expect(result.condition).toBe("damaged");
    expect(result.isSaleable).toBe(false);
  });

  it("flags a row with neither SKU nor name as invalid", () => {
    const row = [null, null, null, "Новый", 5];
    const result = normalizeSupplierStockRow(row, mapping);
    expect(result.validationErrors.length).toBeGreaterThan(0);
  });

  it("coerces a comma-decimal quantity", () => {
    const row = ["x", "SKU-1", "Товар", "Новый", "1,5"];
    const result = normalizeSupplierStockRow(row, mapping);
    expect(result.stockQuantity).toBe(1.5);
  });
});

describe("aggregateSupplierStockRows", () => {
  it("sums quantities for the same SKU+condition appearing on multiple lines (real observed case: In-C2180.04.9016)", () => {
    const rows = [
      normalizeSupplierStockRow(
        ["НС-1631202", "In-C2180.04.9016", "Дизайн-радиатор Insignia C2180 - 04 секц. RAL9016", "Новый", 2],
        mapping,
      ),
      normalizeSupplierStockRow(
        ["НС-1631202", "In-C2180.04.9016", "Дизайн-радиатор Insignia C2180 - 04 секц. RAL9016", "Новый", 8],
        mapping,
      ),
    ];

    const groups = aggregateSupplierStockRows(rows);

    expect(groups).toHaveLength(1);
    expect(groups[0].stockQuantity).toBe(10);
  });

  it("keeps different conditions of the same SKU as separate groups", () => {
    const rows = [
      normalizeSupplierStockRow(["x", "SKU-1", "Товар", "Новый", 5], mapping),
      normalizeSupplierStockRow(["x", "SKU-1", "Товар", "Царапины", 1], mapping),
    ];

    const groups = aggregateSupplierStockRows(rows);

    expect(groups).toHaveLength(2);
  });

  it("produces a stable aggregate regardless of intra-file row order (idempotency root cause fix)", () => {
    const rowA = normalizeSupplierStockRow(["x", "SKU-1", "Товар", "Новый", 2], mapping);
    const rowB = normalizeSupplierStockRow(["x", "SKU-1", "Товар", "Новый", 8], mapping);

    const forward = aggregateSupplierStockRows([rowA, rowB]);
    const reversed = aggregateSupplierStockRows([rowB, rowA]);

    expect(forward[0].stockQuantity).toBe(reversed[0].stockQuantity);
  });

  it("takes the last non-null purchase price when lots differ", () => {
    const withPriceMapping: SupplierStockColumnMapping = { ...mapping, purchase_price: 5 };
    const rows = [
      normalizeSupplierStockRow(["x", "SKU-1", "Товар", "Новый", 2, 1000], withPriceMapping),
      normalizeSupplierStockRow(["x", "SKU-1", "Товар", "Новый", 8, 1200], withPriceMapping),
    ];

    const groups = aggregateSupplierStockRows(rows);

    expect(groups[0].purchasePrice).toBe(1200);
  });
});
