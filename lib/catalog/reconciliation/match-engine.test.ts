import { describe, expect, it } from "vitest";
import { matchDiscoveredListing, type PublicationItemCandidate } from "./match-engine";
import type { DiscoveredKaspiListing } from "./types";

function discovered(overrides: Partial<DiscoveredKaspiListing> = {}): DiscoveredKaspiListing {
  return {
    sellerSku: "AXE-RT-VC22-5001000-WH",
    externalListingId: "100200300",
    name: "Royal Thermo Vittoria 500/1000",
    price: 45990,
    available: true,
    rawPayload: {},
    ...overrides,
  };
}

const candidateA: PublicationItemCandidate = {
  id: "item-a",
  sellerSku: "AXE-RT-VC22-5001000-WH",
  commercialProductId: "cp-a",
  commercialProductName: "Royal Thermo Vittoria 500/1000",
  existingExternalListingId: null,
};

const candidateB: PublicationItemCandidate = {
  id: "item-b",
  sellerSku: "AXE-GREE-BORA07-BASE",
  commercialProductId: "cp-b",
  commercialProductName: "Gree Bora 07",
  existingExternalListingId: "100200301",
};

describe("matchDiscoveredListing", () => {
  it("confidently matches on an exact, unique seller SKU", () => {
    const result = matchDiscoveredListing(discovered(), [candidateA, candidateB]);
    expect(result).toMatchObject({ status: "matched", method: "exact_seller_sku", candidateId: "item-a" });
  });

  it("is case/format tolerant on seller SKU via the shared normalizer", () => {
    const result = matchDiscoveredListing(discovered({ sellerSku: "axe-rt-vc22-5001000-wh" }), [candidateA]);
    expect(result.status).toBe("matched");
  });

  it("confidently matches on an exact external listing id when SKU doesn't match", () => {
    const result = matchDiscoveredListing(
      discovered({ sellerSku: "unrelated-sku", externalListingId: "100200301" }),
      [candidateA, candidateB],
    );
    expect(result).toMatchObject({ status: "matched", method: "exact_external_id", candidateId: "item-b" });
  });

  it("never confidently auto-matches on name alone -- always routes to manual review", () => {
    const result = matchDiscoveredListing(
      discovered({ sellerSku: "unrelated-sku", externalListingId: "unrelated-id" }),
      [candidateA],
    );
    expect(result.status).toBe("ambiguous");
    expect(result.method).toBe("normalized_identity");
    expect(result.candidateId).toBeNull();
  });

  it("flags ambiguity when the same SKU appears on more than one publication item", () => {
    const duplicate: PublicationItemCandidate = { ...candidateB, sellerSku: candidateA.sellerSku };
    const result = matchDiscoveredListing(discovered(), [candidateA, duplicate]);
    expect(result.status).toBe("ambiguous");
    expect(result.candidateIds).toEqual(["item-a", "item-b"]);
  });

  it("returns none when nothing lines up", () => {
    const result = matchDiscoveredListing(
      discovered({ sellerSku: "nope", externalListingId: "nope", name: "Совершенно другой товар" }),
      [candidateA, candidateB],
    );
    expect(result.status).toBe("none");
  });
});
