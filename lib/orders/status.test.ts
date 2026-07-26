import { describe, expect, it } from "vitest";
import { isOrderInTransit } from "./status";

describe("isOrderInTransit", () => {
  it("returns true when handed to Kaspi's own courier network", () => {
    expect(
      isOrderInTransit({
        kaspiState: "KASPI_DELIVERY",
        kaspiDisposition: "ACCEPTED_BY_MERCHANT",
      }),
    ).toBe(true);
  });

  it("returns true when delivery is in progress via the seller's own courier", () => {
    expect(
      isOrderInTransit({
        kaspiState: "DELIVERY",
        kaspiDisposition: "ACCEPTED_BY_MERCHANT",
      }),
    ).toBe(true);
  });

  it("returns true when the order is waiting at a pickup point", () => {
    expect(
      isOrderInTransit({
        kaspiState: "PICKUP",
        kaspiDisposition: "ACCEPTED_BY_MERCHANT",
      }),
    ).toBe(true);
  });

  it("returns false once the order is completed", () => {
    expect(
      isOrderInTransit({
        kaspiState: "ARCHIVE",
        kaspiDisposition: "COMPLETED",
      }),
    ).toBe(false);
  });

  it("returns false once the order is cancelled", () => {
    expect(
      isOrderInTransit({
        kaspiState: "ARCHIVE",
        kaspiDisposition: "CANCELLED",
      }),
    ).toBe(false);
  });

  it("returns false for a new order that hasn't shipped yet", () => {
    expect(
      isOrderInTransit({
        kaspiState: "NEW",
        kaspiDisposition: "ACCEPTED_BY_MERCHANT",
      }),
    ).toBe(false);
  });

  it("returns false while still in the Kaspi delivery pipeline state but being cancelled (real observed edge case)", () => {
    expect(
      isOrderInTransit({
        kaspiState: "KASPI_DELIVERY",
        kaspiDisposition: "CANCELLING",
      }),
    ).toBe(false);
  });

  it("returns false for a returned order even if the pipeline state lags", () => {
    expect(
      isOrderInTransit({
        kaspiState: "KASPI_DELIVERY",
        kaspiDisposition: "RETURNED",
      }),
    ).toBe(false);
  });

  it("treats missing values as not in transit", () => {
    expect(
      isOrderInTransit({ kaspiState: null, kaspiDisposition: null }),
    ).toBe(false);
  });
});
