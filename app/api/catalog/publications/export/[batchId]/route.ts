import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { KaspiCsvAdapter } from "@/lib/catalog/publication/adapters/kaspi-csv";
import type { PublicationExportSnapshot } from "@/lib/catalog/types";

// Reconstructs the CSV file from the items' immutable export_snapshot
// rows rather than re-resolving current product state -- a re-download
// six months later must produce byte-identical output to what was
// actually hashed at export time, even if the product/pricing/content
// has since changed.
export async function GET(request: Request, context: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await context.params;
  const supabase = createSupabaseAdminClient();

  const { data: batch, error: batchError } = await supabase
    .from("marketplace_publication_batches")
    .select("id, file_name, file_hash")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    return NextResponse.json({ success: false, error: "Пакет экспорта не найден" }, { status: 404 });
  }

  const { data: items, error: itemsError } = await supabase
    .from("marketplace_publication_items")
    .select("id, export_snapshot, created_at")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });

  if (itemsError) {
    return NextResponse.json({ success: false, error: itemsError.message }, { status: 500 });
  }

  const rows = (items ?? [])
    .map((item) => (item.export_snapshot as PublicationExportSnapshot | null)?.exported_row)
    .filter((row): row is Record<string, string> => row !== undefined);

  const { content, mimeType } = KaspiCsvAdapter.serialize(rows);

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": `${mimeType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${batch.file_name ?? `${batchId}.csv`}"`,
      "X-File-Hash": batch.file_hash ?? "",
    },
  });
}
