import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const BUCKET = "product-media";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const commercialProductId = String(formData.get("commercialProductId") ?? "");
    const documentType = String(formData.get("documentType") ?? "");

    if (!(file instanceof File) || !commercialProductId || !documentType) {
      return NextResponse.json({ success: false, error: "Не указан файл, товар или тип документа" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const storagePath = `documents/${commercialProductId}/${crypto.randomUUID()}-${file.name}`;
    const buffer = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ success: false, error: `Не удалось загрузить файл: ${uploadError.message}` }, { status: 500 });
    }

    const nowIso = new Date().toISOString();

    // A "required" placeholder row may already exist for this document
    // type (see product-card.ts, which synthesizes one from the
    // category's required_document_types even before anything is
    // uploaded) -- fill it in rather than creating a duplicate.
    const { data: existing } = await supabase
      .from("product_documents")
      .select("id")
      .eq("commercial_product_id", commercialProductId)
      .eq("document_type", documentType)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("product_documents")
        .update({ status: "uploaded", file_reference: storagePath, uploaded_at: nowIso, updated_at: nowIso })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("product_documents").insert({
        commercial_product_id: commercialProductId,
        document_type: documentType,
        status: "uploaded",
        file_reference: storagePath,
        uploaded_at: nowIso,
      });
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ success: true, storagePath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
