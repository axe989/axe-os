import { NextResponse } from "next/server";
import { createClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import type { AssortmentStatus } from "@/lib/catalog/types";

type CreateCommercialProductBody = {
  masterProductId: string;
  commercialName: string;
  assortmentStatus: AssortmentStatus;
  reason: string;
};

// Manual creation path for an ADDITIONAL Commercial Product under an
// existing Master Product (spec example: Gree Bora 07 -> "without
// installation" / "with WiFi module" / "with brackets" ...). One Master
// Product can produce many Commercial Products.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateCommercialProductBody;
    const supabase = createSupabaseAdminClient();

    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    const changedBy = user?.email ?? null;
    const nowIso = new Date().toISOString();

    if (!body.masterProductId || !body.commercialName) {
      return NextResponse.json(
        { success: false, error: "Не указан товар или коммерческое название" },
        { status: 400 },
      );
    }

    const { data: commercialProduct, error } = await supabase
      .from("commercial_products")
      .insert({
        master_product_id: body.masterProductId,
        commercial_name: body.commercialName,
        status: "draft",
        assortment_status: body.assortmentStatus,
        content_status: "missing",
        publication_readiness: "not_ready",
      })
      .select("id")
      .single();

    if (error || !commercialProduct) {
      throw new Error(error?.message ?? "Не удалось создать коммерческий товар");
    }

    await supabase.from("product_status_history").insert({
      commercial_product_id: commercialProduct.id,
      change_type: "assortment_status",
      previous_value: null,
      new_value: body.assortmentStatus,
      reason: body.reason,
      changed_by: changedBy,
      created_at: nowIso,
    });

    return NextResponse.json({ success: true, commercialProductId: commercialProduct.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
