import { describe, expect, it } from "vitest";
import { isOrderInTransit } from "./status";

describe("isOrderInTransit", () => {
  it("returns false for a brand new order", () => {
    expect(
      isOrderInTransit({
        kaspiState: "NEW",
        kaspiDisposition: "NEW",
        courierHandoverAt: null,
      }),
    ).toBe(false);
  });

  it("returns false once accepted by the merchant but not yet handed to a courier", () => {
    expect(
      isOrderInTransit({
        kaspiState: "KASPI_DELIVERY",
        kaspiDisposition: "ACCEPTED_BY_MERCHANT",
        courierHandoverAt: null,
      }),
    ).toBe(false);
  });

  it("returns false while only routed to Kaspi's delivery network but not assembled/shipped (real observed case: 7 orders)", () => {
    expect(
      isOrderInTransit({
        kaspiState: "KASPI_DELIVERY",
        kaspiDisposition: "ACCEPTED_BY_MERCHANT",
        courierHandoverAt: undefined,
      }),
    ).toBe(false);
  });

  it("returns false for an order pending purchase (purchased is unrelated to shipping)", () => {
    expect(
      isOrderInTransit({
        kaspiState: "NEW",
        kaspiDisposition: "ACCEPTED_BY_MERCHANT",
        courierHandoverAt: null,
      }),
    ).toBe(false);
  });

  it("returns true once actually handed to a courier (real observed case: 6 orders)", () => {
    expect(
      isOrderInTransit({
        kaspiState: "KASPI_DELIVERY",
        kaspiDisposition: "ACCEPTED_BY_MERCHANT",
        courierHandoverAt: "2026-07-23T06:02:14.000Z",
      }),
    ).toBe(true);
  });

  it("returns true while delivery is actively in progress via the seller's own courier", () => {
    expect(
      isOrderInTransit({
        kaspiState: "DELIVERY",
        kaspiDisposition: "ACCEPTED_BY_MERCHANT",
        courierHandoverAt: "2026-07-23T06:02:14.000Z",
      }),
    ).toBe(true);
  });

  it("returns false once the order is completed, even if it was handed to a courier", () => {
    expect(
      isOrderInTransit({
        kaspiState: "ARCHIVE",
        kaspiDisposition: "COMPLETED",
        courierHandoverAt: "2026-07-20T06:02:14.000Z",
      }),
    ).toBe(false);
  });

  it("returns false once the order is cancelled", () => {
    expect(
      isOrderInTransit({
        kaspiState: "ARCHIVE",
        kaspiDisposition: "CANCELLED",
        courierHandoverAt: null,
      }),
    ).toBe(false);
  });

  it("returns false while still in the Kaspi delivery pipeline state but being cancelled, even if already handed off (real observed edge case)", () => {
    expect(
      isOrderInTransit({
        kaspiState: "KASPI_DELIVERY",
        kaspiDisposition: "CANCELLING",
        courierHandoverAt: "2026-07-23T06:02:14.000Z",
      }),
    ).toBe(false);
  });

  it("returns false for a returned order even if it was handed to a courier", () => {
    expect(
      isOrderInTransit({
        kaspiState: "KASPI_DELIVERY",
        kaspiDisposition: "RETURNED",
        courierHandoverAt: "2026-07-20T06:02:14.000Z",
      }),
    ).toBe(false);
  });

  it("does not treat a future planned delivery date as evidence of handover", () => {
    // courierHandoverAt intentionally omitted/null even though a
    // plannedDeliveryDate exists upstream in Kaspi's payload - that
    // field is a schedule, not proof the parcel moved.
    expect(
      isOrderInTransit({
        kaspiState: "KASPI_DELIVERY",
        kaspiDisposition: "ACCEPTED_BY_MERCHANT",
        courierHandoverAt: null,
      }),
    ).toBe(false);
  });

  it("treats missing values as not in transit", () => {
    expect(
      isOrderInTransit({
        kaspiState: null,
        kaspiDisposition: null,
        courierHandoverAt: null,
      }),
    ).toBe(false);
  });
});
