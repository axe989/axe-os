import { NextResponse } from "next/server";
import { createClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { parseKaspiListingsXml } from "@/lib/catalog/reconciliation/parse-kaspi-xml";
import { matchDiscoveredListing, type PublicationItemCandidate } from "@/lib/catalog/reconciliation/match-engine";

type ReconcileRequestBody = {
  xml: string;
  salesChannel?: string;
};

// Reconciles a Kaspi XML export against publication items that have
// already been exported/uploaded but not yet confirmed live. This never
// uploads anything to Kaspi and never creates/modifies a Kaspi listing --
// it only reads a human-supplied XML export and links AXE OS records to
// what Kaspi says already exists.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReconcileRequestBody;
    if (!body.xml?.trim()) {
      return NextResponse.json({ success: false, error: "Не передан XML-файл" }, { status: 400 });
    }

    const salesChannel = body.salesChannel || "kaspi";
    const supabase = createSupabaseAdminClient();

    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    const actor = user?.email ?? null;

    const discoveredListings = parseKaspiListingsXml(body.xml);

    const { data: pendingItems, error: pendingError } = await supabase
      .from("marketplace_publication_items")
      .select("id, seller_sku, commercial_product_id, marketplace_listing_id, sales_channel, status, commercial_products ( commercial_name )")
      .eq("sales_channel", salesChannel)
      .in("status", ["exported", "uploaded"]);

    if (pendingError) {
      throw new Error(pendingError.message);
    }

    const marketplaceListingIds = (pendingItems ?? [])
      .map((item) => item.marketplace_listing_id as string | null)
      .filter((id): id is string => id !== null);

    const { data: existingListings } =
      marketplaceListingIds.length > 0
        ? await supabase.from("marketplace_listings").select("id, external_listing_id").in("id", marketplaceListingIds)
        : { data: [] as { id: string; external_listing_id: string | null }[] };

    const externalIdByListingId = new Map(
      (existingListings ?? []).map((l) => [l.id as string, l.external_listing_id as string | null]),
    );

    const candidates: PublicationItemCandidate[] = (pendingItems ?? []).map((item) => {
      const commercialProduct = Array.isArray(item.commercial_products)
        ? item.commercial_products[0]
        : item.commercial_products;
      return {
        id: item.id as string,
        sellerSku: item.seller_sku as string | null,
        commercialProductId: item.commercial_product_id as string,
        commercialProductName: (commercialProduct as { commercial_name: string } | null)?.commercial_name ?? "",
        existingExternalListingId: item.marketplace_listing_id
          ? externalIdByListingId.get(item.marketplace_listing_id as string) ?? null
          : null,
      };
    });

    const summary = { matched: 0, ambiguous: 0, none: 0 };

    for (const discovered of discoveredListings) {
      const result = matchDiscoveredListing(discovered, candidates);
      const nowIso = new Date().toISOString();

      if (result.status === "matched" && result.candidateId) {
        const pendingItem = pendingItems!.find((item) => item.id === result.candidateId)!;

        const { data: listing, error: listingError } = await supabase
          .from("marketplace_listings")
          .upsert(
            {
              commercial_product_id: pendingItem.commercial_product_id,
              sales_channel: salesChannel,
              external_listing_id: discovered.externalListingId,
              external_sku: discovered.sellerSku,
              title: discovered.name,
              listing_status: "active",
              current_sale_price: discovered.price,
              raw_payload: discovered.rawPayload,
              last_synced_at: nowIso,
            },
            { onConflict: "sales_channel,external_sku" },
          )
          .select("id")
          .single();

        if (listingError || !listing) {
          throw new Error(listingError?.message ?? "Не удалось создать/обновить листинг маркетплейса");
        }

        await supabase
          .from("marketplace_publication_items")
          .update({ marketplace_listing_id: listing.id, status: "published", updated_at: nowIso })
          .eq("id", pendingItem.id);

        await supabase.from("marketplace_publication_events").insert({
          publication_item_id: pendingItem.id,
          event_type: "reconciliation_match",
          from_status: pendingItem.status,
          to_status: "published",
          payload: { method: result.method, confidence: result.confidence, reasons: result.reasons, marketplace_listing_id: listing.id },
          created_by: actor,
        });

        summary.matched += 1;
        continue;
      }

      if (result.status === "ambiguous") {
        for (const candidateId of result.candidateIds) {
          const pendingItem = pendingItems!.find((item) => item.id === candidateId)!;

          await supabase
            .from("marketplace_publication_items")
            .update({ status: "needs_review", updated_at: nowIso })
            .eq("id", candidateId);

          await supabase.from("marketplace_publication_events").insert({
            publication_item_id: candidateId,
            event_type: "reconciliation_ambiguous",
            from_status: pendingItem.status,
            to_status: "needs_review",
            payload: {
              method: result.method,
              reasons: result.reasons,
              discovered_seller_sku: discovered.sellerSku,
              discovered_external_id: discovered.externalListingId,
              discovered_name: discovered.name,
              other_candidate_ids: result.candidateIds.filter((id) => id !== candidateId),
            },
            created_by: actor,
          });
        }

        summary.ambiguous += 1;
        continue;
      }

      summary.none += 1;
    }

    return NextResponse.json({ success: true, discoveredCount: discoveredListings.length, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
