import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { resolvePublicationItem } from "@/lib/catalog/publication/resolve-item";
import { buildExportSnapshot } from "@/lib/catalog/publication/build-export-snapshot";
import { canMarkReadyForExport, deriveWorkflowStatus } from "@/lib/catalog/publication/validation";
import { KaspiCsvAdapter, KASPI_TEMPLATE_VERSION } from "@/lib/catalog/publication/adapters/kaspi-csv";

type ExportRequestBody = {
  salesChannel?: string;
  publicationItemIds?: string[];
};

// Exports only approved, currently-valid items. Every candidate is
// re-resolved and re-validated right before export (state may have
// drifted since approval) -- an item that no longer validates is EXCLUDED
// from the CSV and its own status flips to publication_error, but it is
// always reported back to the caller, never silently dropped from the
// batch. See spec: "never silently drop invalid rows."
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExportRequestBody;
    const salesChannel = body.salesChannel || "kaspi";
    const supabase = createSupabaseAdminClient();

    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    const actor = user?.email ?? null;

    let candidatesQuery = supabase
      .from("marketplace_publication_items")
      .select("id, commercial_product_id, content_variant_id, sales_channel, status, approved_at")
      .eq("sales_channel", salesChannel)
      .eq("status", "ready_for_export")
      .not("approved_at", "is", null)
      .is("batch_id", null);

    if (body.publicationItemIds && body.publicationItemIds.length > 0) {
      candidatesQuery = candidatesQuery.in("id", body.publicationItemIds);
    }

    const { data: candidates, error: candidatesError } = await candidatesQuery;
    if (candidatesError) {
      throw new Error(candidatesError.message);
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { success: false, error: "Нет утверждённых позиций, готовых к экспорту" },
        { status: 400 },
      );
    }

    const exportedRows: Array<Record<string, string>> = [];
    const exportedItemIds: string[] = [];
    const skipped: Array<{ id: string; errors: { code: string; message: string }[] }> = [];
    const resolvedById = new Map<string, Awaited<ReturnType<typeof resolvePublicationItem>>>();

    for (const item of candidates) {
      const resolved = await resolvePublicationItem(supabase, {
        commercialProductId: item.commercial_product_id as string,
        contentVariantId: item.content_variant_id as string,
        salesChannel: item.sales_channel as string,
        publicationItemIdToExclude: item.id as string,
      });

      if (!canMarkReadyForExport(resolved.validationErrors)) {
        const newStatus = deriveWorkflowStatus(resolved.validationErrors);
        await supabase
          .from("marketplace_publication_items")
          .update({
            status: "publication_error",
            validation_errors: resolved.validationErrors,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        await supabase.from("marketplace_publication_events").insert({
          publication_item_id: item.id,
          event_type: "validation_failed",
          from_status: item.status,
          to_status: "publication_error",
          payload: { attempted_status: newStatus, validation_errors: resolved.validationErrors },
          created_by: actor,
        });

        skipped.push({ id: item.id as string, errors: resolved.validationErrors });
        continue;
      }

      resolvedById.set(item.id as string, resolved);
      exportedRows.push(resolved.row);
      exportedItemIds.push(item.id as string);
    }

    if (exportedItemIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Все позиции провалили повторную проверку", skipped },
        { status: 422 },
      );
    }

    const { content, fileExtension, mimeType } = KaspiCsvAdapter.serialize(exportedRows);
    const fileHash = createHash("sha256").update(content, "utf-8").digest("hex");
    const nowIso = new Date().toISOString();
    const fileName = `kaspi_${salesChannel}_${nowIso.replace(/[:.]/g, "-")}.${fileExtension}`;

    const { data: batch, error: batchError } = await supabase
      .from("marketplace_publication_batches")
      .insert({
        sales_channel: salesChannel,
        adapter: KaspiCsvAdapter.adapterId,
        template_version: KASPI_TEMPLATE_VERSION,
        file_name: fileName,
        file_hash: fileHash,
        row_count: exportedRows.length,
        exported_by: actor,
        exported_at: nowIso,
      })
      .select("id")
      .single();

    if (batchError || !batch) {
      throw new Error(batchError?.message ?? "Не удалось создать пакет экспорта");
    }

    for (const item of candidates) {
      const resolved = resolvedById.get(item.id as string);
      if (!resolved) continue;

      const { data: commercialProduct } = await supabase
        .from("commercial_products")
        .select("id, commercial_name, bundle_code")
        .eq("id", item.commercial_product_id)
        .single();
      const { data: contentVariant } = await supabase
        .from("marketplace_content_variants")
        .select("id, sales_channel, title, description")
        .eq("id", item.content_variant_id)
        .single();

      const snapshot = await buildExportSnapshot(supabase, {
        resolved,
        commercialProduct: commercialProduct as { id: string; commercial_name: string; bundle_code: string | null },
        contentVariant: contentVariant as { id: string; sales_channel: string | null; title: string; description: string | null },
      });

      await supabase
        .from("marketplace_publication_items")
        .update({
          batch_id: batch.id,
          seller_sku: resolved.sellerSku,
          status: "exported",
          validation_errors: [],
          export_snapshot: snapshot,
          updated_at: nowIso,
        })
        .eq("id", item.id);

      await supabase.from("marketplace_publication_events").insert({
        publication_item_id: item.id,
        event_type: "export",
        from_status: "ready_for_export",
        to_status: "exported",
        payload: { batch_id: batch.id, file_hash: fileHash },
        created_by: actor,
      });
    }

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      exportedCount: exportedItemIds.length,
      skipped,
      mimeType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
