import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { listContentVariantsForCommercialProduct } from "@/lib/catalog/queries/publications";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const commercialProductId = url.searchParams.get("commercialProductId");

  if (!commercialProductId) {
    return NextResponse.json({ success: false, error: "Не указан коммерческий товар" }, { status: 400 });
  }

  try {
    const variants = await listContentVariantsForCommercialProduct(commercialProductId);
    return NextResponse.json({ success: true, variants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

type CreateContentVariantBody = {
  commercialProductId: string;
  title: string;
  description?: string | null;
  salesChannel?: string | null;
  isDefault?: boolean;
};

// A Marketplace Content Variant may differ in title/description/media/SEO
// while referencing the same Commercial Product -- see architecture
// proposal. sales_channel is nullable: a channel-agnostic variant is
// reused by any channel that doesn't need its own override.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateContentVariantBody;
    const supabase = createSupabaseAdminClient();

    if (!body.commercialProductId || !body.title?.trim()) {
      return NextResponse.json(
        { success: false, error: "Не указан коммерческий товар или заголовок" },
        { status: 400 },
      );
    }

    const { data: variant, error } = await supabase
      .from("marketplace_content_variants")
      .insert({
        commercial_product_id: body.commercialProductId,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        sales_channel: body.salesChannel || null,
        is_default: body.isDefault ?? false,
      })
      .select("id")
      .single();

    if (error || !variant) {
      throw new Error(error?.message ?? "Не удалось создать контент-вариант");
    }

    return NextResponse.json({ success: true, contentVariantId: variant.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
