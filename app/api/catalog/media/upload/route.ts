import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const BUCKET = "product-media";
const ALLOWED_ROLES = ["primary_image", "gallery", "infographic"];

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type === "image/png" ? "png" : "jpg";
}

// Real upload, not a placeholder: writes the file into the product-media
// Storage bucket, records it in media_assets, and attaches it to the
// commercial product's media set (creating one on first upload -- see
// resolve-media-set.ts for how a Commercial Product's own set overrides
// whatever the Master Product's default set would otherwise resolve to).
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const commercialProductId = String(formData.get("commercialProductId") ?? "");
    const role = String(formData.get("role") ?? "gallery");

    if (!(file instanceof File) || !commercialProductId || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ success: false, error: "Не указан файл, товар или недопустимая роль изображения" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: product, error: productError } = await supabase
      .from("commercial_products")
      .select("id, media_set_id")
      .eq("id", commercialProductId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ success: false, error: "Коммерческий товар не найден" }, { status: 404 });
    }

    let mediaSetId = product.media_set_id as string | null;
    if (!mediaSetId) {
      const { data: newSet, error: setError } = await supabase
        .from("media_sets")
        .insert({ name: `Медиа для товара ${commercialProductId}` })
        .select("id")
        .single();
      if (setError || !newSet) {
        return NextResponse.json({ success: false, error: `Не удалось создать набор медиа: ${setError?.message}` }, { status: 500 });
      }
      mediaSetId = newSet.id as string;
      await supabase.from("commercial_products").update({ media_set_id: mediaSetId }).eq("id", commercialProductId);
    }

    const storagePath = `products/${commercialProductId}/${crypto.randomUUID()}.${extensionFor(file)}`;
    const buffer = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ success: false, error: `Не удалось загрузить файл: ${uploadError.message}` }, { status: 500 });
    }

    const { data: asset, error: assetError } = await supabase
      .from("media_assets")
      .insert({ storage_path: storagePath, media_type: "image" })
      .select("id")
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ success: false, error: `Не удалось сохранить изображение: ${assetError?.message}` }, { status: 500 });
    }

    if (role === "primary_image") {
      await supabase.from("media_set_items").delete().eq("media_set_id", mediaSetId).eq("role", "primary_image");
    }

    const { data: existingItems } = await supabase
      .from("media_set_items")
      .select("sort_order")
      .eq("media_set_id", mediaSetId)
      .order("sort_order", { ascending: false })
      .limit(1);
    const nextSortOrder = ((existingItems?.[0]?.sort_order as number | undefined) ?? -1) + 1;

    const { error: itemError } = await supabase.from("media_set_items").insert({
      media_set_id: mediaSetId,
      media_asset_id: asset.id,
      role,
      sort_order: nextSortOrder,
    });

    if (itemError) {
      return NextResponse.json({ success: false, error: `Не удалось прикрепить изображение: ${itemError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, storagePath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
