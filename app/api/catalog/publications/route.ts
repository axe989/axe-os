import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { resolvePublicationItem } from "@/lib/catalog/publication/resolve-item";
import { deriveWorkflowStatus } from "@/lib/catalog/publication/validation";
import type { PublicationMode } from "@/lib/catalog/types";

type CreatePublicationItemBody = {
  commercialProductId: string;
  contentVariantId: string;
  publicationMode: PublicationMode;
  salesChannel?: string;
  marketplaceListingId?: string | null;
};

const PUBLICATION_MODES: PublicationMode[] = ["create_new_listing", "join_existing_listing", "update_existing_listing"];

// Creates a publication item and immediately resolves+validates it once,
// so the list/detail screens never show a freshly-created item sitting
// at a stale "draft" with unknown validity.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreatePublicationItemBody;
    const supabase = createSupabaseAdminClient();

    if (!body.commercialProductId || !body.contentVariantId || !body.publicationMode) {
      return NextResponse.json(
        { success: false, error: "Не указан коммерческий товар, контент-вариант или режим публикации" },
        { status: 400 },
      );
    }

    if (!PUBLICATION_MODES.includes(body.publicationMode)) {
      return NextResponse.json({ success: false, error: "Недопустимый режим публикации" }, { status: 400 });
    }

    if (body.publicationMode !== "create_new_listing" && !body.marketplaceListingId) {
      return NextResponse.json(
        { success: false, error: "Для этого режима публикации нужно выбрать существующий листинг" },
        { status: 400 },
      );
    }

    const salesChannel = body.salesChannel || "kaspi";

    const { data: item, error } = await supabase
      .from("marketplace_publication_items")
      .insert({
        commercial_product_id: body.commercialProductId,
        content_variant_id: body.contentVariantId,
        publication_mode: body.publicationMode,
        marketplace_listing_id: body.marketplaceListingId || null,
        sales_channel: salesChannel,
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !item) {
      throw new Error(error?.message ?? "Не удалось создать позицию публикации");
    }

    const resolved = await resolvePublicationItem(supabase, {
      commercialProductId: body.commercialProductId,
      contentVariantId: body.contentVariantId,
      salesChannel,
      publicationItemIdToExclude: item.id as string,
    });

    const status = deriveWorkflowStatus(resolved.validationErrors);

    await supabase
      .from("marketplace_publication_items")
      .update({
        seller_sku: resolved.sellerSku,
        status,
        validation_errors: resolved.validationErrors,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    await supabase.from("marketplace_publication_events").insert({
      publication_item_id: item.id,
      event_type: "status_change",
      from_status: "draft",
      to_status: status,
      payload: { validation_error_count: resolved.validationErrors.length },
    });

    return NextResponse.json({ success: true, publicationItemId: item.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
