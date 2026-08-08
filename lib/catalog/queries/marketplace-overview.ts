import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type MarketplaceChannelOverview = {
  channel: string;
  label: string;
  connected: boolean;
  listingCount: number;
  activeListingCount: number;
  publishedItemCount: number;
  blockedItemCount: number;
};

// Channels the Publication Engine actually has an adapter for today.
// Others show as "not connected" -- a real, honest state, not a fake
// number (see approved architecture: WB/Ozon ship as placeholders in
// Phase 1, per the open question in the technical proposal).
const CONNECTED_CHANNELS = new Set(["kaspi"]);

const CHANNEL_LABELS: Record<string, string> = {
  kaspi: "Kaspi",
  wb: "Wildberries",
  ozon: "Ozon",
  website: "Собственный сайт",
};

export async function listMarketplaceOverview(): Promise<MarketplaceChannelOverview[]> {
  const supabase = createSupabaseAdminClient();

  const channels = Object.keys(CHANNEL_LABELS);

  const [{ data: listings }, { data: items }] = await Promise.all([
    supabase.from("marketplace_listings").select("sales_channel, listing_status"),
    supabase.from("marketplace_publication_items").select("sales_channel, status"),
  ]);

  return channels.map((channel) => {
    const channelListings = (listings ?? []).filter((l) => l.sales_channel === channel);
    const channelItems = (items ?? []).filter((i) => i.sales_channel === channel);

    return {
      channel,
      label: CHANNEL_LABELS[channel],
      connected: CONNECTED_CHANNELS.has(channel),
      listingCount: channelListings.length,
      activeListingCount: channelListings.filter((l) => l.listing_status === "active").length,
      publishedItemCount: channelItems.filter((i) => i.status === "published").length,
      blockedItemCount: channelItems.filter((i) => ["publication_error", "needs_review", "content_incomplete"].includes(i.status as string)).length,
    };
  });
}
