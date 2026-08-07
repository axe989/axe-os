import { describe, expect, it } from "vitest";
import { parseKaspiListingsXml } from "./parse-kaspi-xml";

const SAMPLE_XML = `<?xml version="1.0" encoding="utf-8"?>
<kaspi_catalog date="2026-08-07 12:00:00">
  <offers>
    <offer sku="AXE-RT-VC22-5001000-WH" id="100200300">
      <model>Royal Thermo Vittoria 500/1000 White &amp; Silver</model>
      <price>45990</price>
      <availabilities>
        <availability available="yes" storeId="ALM01"/>
      </availabilities>
    </offer>
    <offer sku="AXE-GREE-BORA07-BASE" id="100200301">
      <name>Gree Bora 07</name>
      <price>189990</price>
      <availabilities>
        <availability available="no" storeId="ALM01"/>
      </availabilities>
    </offer>
  </offers>
</kaspi_catalog>`;

describe("parseKaspiListingsXml", () => {
  it("extracts sku, external id, name, price and availability per offer", () => {
    const offers = parseKaspiListingsXml(SAMPLE_XML);
    expect(offers).toHaveLength(2);

    expect(offers[0]).toMatchObject({
      sellerSku: "AXE-RT-VC22-5001000-WH",
      externalListingId: "100200300",
      name: "Royal Thermo Vittoria 500/1000 White & Silver",
      price: 45990,
      available: true,
    });

    expect(offers[1]).toMatchObject({
      sellerSku: "AXE-GREE-BORA07-BASE",
      externalListingId: "100200301",
      name: "Gree Bora 07",
      price: 189990,
      available: false,
    });
  });

  it("falls back to <name> when <model> is absent", () => {
    const offers = parseKaspiListingsXml(SAMPLE_XML);
    expect(offers[1].name).toBe("Gree Bora 07");
  });

  it("returns an empty array for XML with no offers", () => {
    expect(parseKaspiListingsXml("<kaspi_catalog><offers></offers></kaspi_catalog>")).toEqual([]);
  });

  it("keeps the raw offer block for audit/debugging", () => {
    const offers = parseKaspiListingsXml(SAMPLE_XML);
    expect(offers[0].rawPayload.xml).toContain("AXE-RT-VC22-5001000-WH");
  });
});
