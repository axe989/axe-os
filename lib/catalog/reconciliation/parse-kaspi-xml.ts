import type { DiscoveredKaspiListing } from "./types";

// Best-effort parser for Kaspi's merchant offer-feed XML shape
// (<offer sku="..."><model>/<name>...</price>...<availabilities>...),
// matching Kaspi's publicly documented merchant XML price/stock feed
// format. UNLIKE docs/kaspi-template.xlsm, this was not verified against
// an actual Kaspi XML export supplied for this task -- confirm the exact
// tag/attribute names against a real export before relying on this in
// production, and adjust the regexes below if they differ.
//
// Dependency-free by design (regex-scoped to <offer>...</offer> blocks)
// rather than pulling in a full XML parser for a single, well-known,
// flat feed shape -- swap for a real parser if Kaspi's feed turns out to
// need nested/attribute-heavy handling this can't express.
export function parseKaspiListingsXml(xml: string): DiscoveredKaspiListing[] {
  const offerBlocks = xml.match(/<offer\b[^>]*>[\s\S]*?<\/offer>/g) ?? [];

  return offerBlocks.map((block): DiscoveredKaspiListing => {
    const skuMatch = block.match(/<offer\b[^>]*\bsku="([^"]*)"/);
    const idMatch = block.match(/<offer\b[^>]*\bid="([^"]*)"/);
    const modelMatch = block.match(/<model>([\s\S]*?)<\/model>/);
    const nameMatch = block.match(/<name>([\s\S]*?)<\/name>/);
    const priceMatch = block.match(/<price>([\s\S]*?)<\/price>/);
    const availableMatch = block.match(/\bavailable="(yes|no|true|false)"/);

    return {
      sellerSku: skuMatch?.[1]?.trim() || null,
      externalListingId: idMatch?.[1]?.trim() || null,
      name: decodeXmlEntities((modelMatch ?? nameMatch)?.[1]?.trim() ?? "") || null,
      price: priceMatch?.[1] ? numberOrNull(priceMatch[1].trim()) : null,
      available: availableMatch ? ["yes", "true"].includes(availableMatch[1]) : null,
      rawPayload: { xml: block },
    };
  });
}

function numberOrNull(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
