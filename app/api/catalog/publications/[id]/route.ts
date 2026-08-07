import { NextResponse } from "next/server";
import { createClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { resolvePublicationItem } from "@/lib/catalog/publication/resolve-item";
import { canMarkReadyForExport, deriveWorkflowStatus } from "@/lib/catalog/publication/validation";

type PatchBody = {
  action: "revalidate" | "approve" | "archive" | "mark_uploaded";
};

// Statuses beyond this point are owned by the export route / XML
// reconciliation pipeline -- revalidation and approval must never touch
// (or overwrite seller_sku/export_snapshot for) an item that has already
// been exported.
const LOCKED_AFTER_EXPORT: string[] = ["exported", "uploaded", "published", "archived"];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as PatchBody;
    const supabase = createSupabaseAdminClient();

    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    const actor = user?.email ?? null;

    const { data: item, error } = await supabase
      .from("marketplace_publication_items")
      .select("id, commercial_product_id, content_variant_id, sales_channel, status")
      .eq("id", id)
      .single();

    if (error || !item) {
      return NextResponse.json({ success: false, error: "Позиция публикации не найдена" }, { status: 404 });
    }

    if (body.action === "archive") {
      await supabase.from("marketplace_publication_items").update({ status: "archived" }).eq("id", id);
      await supabase.from("marketplace_publication_events").insert({
        publication_item_id: id,
        event_type: "status_change",
        from_status: item.status,
        to_status: "archived",
        created_by: actor,
      });
      return NextResponse.json({ success: true, status: "archived" });
    }

    if (body.action === "mark_uploaded") {
      if (item.status !== "exported") {
        return NextResponse.json(
          { success: false, error: "Отметить загрузку можно только для экспортированной позиции" },
          { status: 409 },
        );
      }

      await supabase.from("marketplace_publication_items").update({ status: "uploaded" }).eq("id", id);
      await supabase.from("marketplace_publication_events").insert({
        publication_item_id: id,
        event_type: "upload_confirmed",
        from_status: "exported",
        to_status: "uploaded",
        created_by: actor,
      });
      return NextResponse.json({ success: true, status: "uploaded" });
    }

    if (LOCKED_AFTER_EXPORT.includes(item.status as string)) {
      return NextResponse.json(
        { success: false, error: "Позиция уже экспортирована/архивирована -- изменение недоступно" },
        { status: 409 },
      );
    }

    const resolved = await resolvePublicationItem(supabase, {
      commercialProductId: item.commercial_product_id as string,
      contentVariantId: item.content_variant_id as string,
      salesChannel: item.sales_channel as string,
      publicationItemIdToExclude: id,
    });

    const newStatus = deriveWorkflowStatus(resolved.validationErrors);

    if (body.action === "approve") {
      if (!canMarkReadyForExport(resolved.validationErrors)) {
        return NextResponse.json(
          { success: false, error: "Нельзя утвердить позицию, пока есть ошибки валидации", validationErrors: resolved.validationErrors },
          { status: 422 },
        );
      }

      const nowIso = new Date().toISOString();
      await supabase
        .from("marketplace_publication_items")
        .update({
          seller_sku: resolved.sellerSku,
          status: newStatus,
          validation_errors: resolved.validationErrors,
          approved_by: actor,
          approved_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", id);

      await supabase.from("marketplace_publication_events").insert({
        publication_item_id: id,
        event_type: "status_change",
        from_status: item.status,
        to_status: newStatus,
        payload: { approved_by: actor },
        created_by: actor,
      });

      return NextResponse.json({ success: true, status: newStatus, approved: true });
    }

    // revalidate
    await supabase
      .from("marketplace_publication_items")
      .update({
        seller_sku: resolved.sellerSku,
        status: newStatus,
        validation_errors: resolved.validationErrors,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (newStatus !== item.status) {
      await supabase.from("marketplace_publication_events").insert({
        publication_item_id: id,
        event_type: "status_change",
        from_status: item.status,
        to_status: newStatus,
        payload: { validation_error_count: resolved.validationErrors.length },
        created_by: actor,
      });
    }

    return NextResponse.json({ success: true, status: newStatus, validationErrors: resolved.validationErrors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
