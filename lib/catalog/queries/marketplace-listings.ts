import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type MarketplaceListingRow = {
  id: string;
  salesChannel: string;
  externalListingId: string | null;
  externalSku: string | null;
  title: string | null;
  listingStatus: string;
  currentSalePrice: number | null;
  lastSyncedAt: string | null;
  commercialProductId: string | null;
  commercialProductName: string | null;
};

export type MarketplaceListingFilters = {
  channel?: string;
  reconciled?: "matched" | "unmatched";
  listingStatus?: string;
  search?: string;
};

// The drill-down behind every clickable number on the Marketplace
// overview cards (Section 7 of the mandate): a Marketplace Listing here
// is a row observed FROM the channel (repricer snapshot, XML import,
// etc) -- it exists whether or not AXE OS has reconciled it to a
// Commercial Product yet. That reconciliation state is the single most
// important thing this table has to make obvious, since it's exactly
// what the old single "532" number hid.
export async function listMarketplaceListings(filters: MarketplaceListingFilters = {}): Promise<MarketplaceListingRow[]> {
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from("marketplace_listings")
    .select(
      "id, sales_channel, external_listing_id, external_sku, title, listing_status, current_sale_price, last_synced_at, commercial_product_id, commercial_products ( commercial_name )",
    )
    .order("last_synced_at", { ascending: false, nullsFirst: false })
    .limit(2000);

  if (filters.channel) query = query.eq("sales_channel", filters.channel);
  if (filters.listingStatus) query = query.eq("listing_status", filters.listingStatus);
  if (filters.reconciled === "matched") query = query.not("commercial_product_id", "is", null);
  if (filters.reconciled === "unmatched") query = query.is("commercial_product_id", null);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Не удалось загрузить листинги маркетплейса: ${error.message}`);
  }

  const searchLower = filters.search?.trim().toLowerCase();

  const rows: MarketplaceListingRow[] = (data ?? []).map((row) => {
    const commercialProduct = Array.isArray(row.commercial_products) ? row.commercial_products[0] : row.commercial_products;
    return {
      id: row.id as string,
      salesChannel: row.sales_channel as string,
      externalListingId: row.external_listing_id as string | null,
      externalSku: row.external_sku as string | null,
      title: row.title as string | null,
      listingStatus: row.listing_status as string,
      currentSalePrice: row.current_sale_price as number | null,
      lastSyncedAt: row.last_synced_at as string | null,
      commercialProductId: row.commercial_product_id as string | null,
      commercialProductName: (commercialProduct as { commercial_name: string } | null)?.commercial_name ?? null,
    };
  });

  if (!searchLower) return rows;
  return rows.filter((r) => [r.title, r.externalSku, r.externalListingId, r.commercialProductName].some((v) => v?.toLowerCase().includes(searchLower)));
}
