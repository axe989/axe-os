import { describe, expect, it } from "vitest";
import { hasChannelPriceChanged, hasSupplierOfferChanged } from "./diff";

describe("hasSupplierOfferChanged", () => {
  it("is always a change when there is no current row (first import)", () => {
    expect(
      hasSupplierOfferChanged(null, {
        purchase_price: 1000,
        stock_quantity: 5,
        product_condition: "new",
      }),
    ).toBe(true);
  });

  it("is not a change when all tracked fields are identical", () => {
    const snapshot = { purchase_price: 1000, stock_quantity: 5, product_condition: "new" };
    expect(hasSupplierOfferChanged(snapshot, { ...snapshot })).toBe(false);
  });

  it("tolerates float rounding noise in price/quantity", () => {
    expect(
      hasSupplierOfferChanged(
        { purchase_price: 1000, stock_quantity: 5, product_condition: "new" },
        { purchase_price: 1000.001, stock_quantity: 5, product_condition: "new" },
      ),
    ).toBe(false);
  });

  it("is a change when stock quantity differs", () => {
    expect(
      hasSupplierOfferChanged(
        { purchase_price: 1000, stock_quantity: 5, product_condition: "new" },
        { purchase_price: 1000, stock_quantity: 6, product_condition: "new" },
      ),
    ).toBe(true);
  });

  it("is a change when condition differs, even with identical price/qty", () => {
    expect(
      hasSupplierOfferChanged(
        { purchase_price: null, stock_quantity: 1, product_condition: "new" },
        { purchase_price: null, stock_quantity: 1, product_condition: "damaged" },
      ),
    ).toBe(true);
  });

  it("is a change when purchase price becomes known (null -> value)", () => {
    expect(
      hasSupplierOfferChanged(
        { purchase_price: null, stock_quantity: 1, product_condition: "new" },
        { purchase_price: 1000, stock_quantity: 1, product_condition: "new" },
      ),
    ).toBe(true);
  });
});

describe("hasChannelPriceChanged", () => {
  it("detects an unchanged price as no change", () => {
    expect(hasChannelPriceChanged(52000, 52000)).toBe(false);
  });

  it("detects a real price change", () => {
    expect(hasChannelPriceChanged(52000, 55000)).toBe(true);
  });

  it("treats both-null as unchanged", () => {
    expect(hasChannelPriceChanged(null, null)).toBe(false);
  });
});
