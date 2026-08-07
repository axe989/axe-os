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

describe("historical pricing stays immutable across re-matching (Commercial Product layer)", () => {
  // Per the four-level architecture, a Marketplace Listing's
  // commercial_product_id link can change (re-matched to a different
  // Commercial Product, or unlinked/relinked after human review) without
  // its price ever changing. hasChannelPriceChanged only ever looks at
  // the price value -- it has no awareness of commercial_product_id or
  // any other identity/link field -- so re-matching alone can never
  // trigger a new price_history row, and no existing history row is ever
  // rewritten by a re-match. This is what "never overwrite historical
  // purchase or sale prices" reduces to at the pure-function level.
  it("reports no change when only the matched Commercial Product would differ, price held constant", () => {
    // Simulates: listing was linked to commercial-product-A at 52000,
    // gets re-matched to commercial-product-B, price on the listing is
    // untouched by the re-match.
    const priceBeforeRematch = 52000;
    const priceAfterRematch = 52000;

    expect(hasChannelPriceChanged(priceBeforeRematch, priceAfterRematch)).toBe(false);
  });

  it("a real price change is still detected independently of any re-matching", () => {
    const priceBeforeRematch = 52000;
    const priceAfterRematchAndRepriced = 48000;

    expect(hasChannelPriceChanged(priceBeforeRematch, priceAfterRematchAndRepriced)).toBe(true);
  });
});
