import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type Body = {
  commercialProductId: string;
  title: string;
  description: string;
};

// The one default (channel-agnostic) content variant per commercial
// product -- channel-specific variants (see marketplace_content_variants'
// sales_channel column) are a separate, later concern; this is the plain
// "название / описание" editor Section 5 asks for.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    if (!body.commercialProductId) {
      return NextResponse.json({ success: false, error: "Не указан товар" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: existing } = await supabase
      .from("marketplace_content_variants")
      .select("id")
      .eq("commercial_product_id", body.commercialProductId)
      .is("sales_channel", null)
      .eq("is_default", true)
      .maybeSingle();

    const nowIso = new Date().toISOString();

    if (existing) {
      const { error } = await supabase
        .from("marketplace_content_variants")
        .update({ title: body.title, description: body.description, updated_at: nowIso })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("marketplace_content_variants").insert({
        commercial_product_id: body.commercialProductId,
        sales_channel: null,
        title: body.title,
        description: body.description,
        is_default: true,
      });
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
