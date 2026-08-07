// One offer/listing discovered in a Kaspi XML import, already parsed into
// a channel-agnostic shape the match engine can reason about.
export type DiscoveredKaspiListing = {
  sellerSku: string | null;
  externalListingId: string | null;
  name: string | null;
  price: number | null;
  available: boolean | null;
  rawPayload: Record<string, unknown>;
};
