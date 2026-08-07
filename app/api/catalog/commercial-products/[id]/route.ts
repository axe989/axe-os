import { NextResponse } from "next/server";
import { createClient, createSupabaseAdminClient } from "@/lib/supabase/server";

type CommercialProductPatchPayload = {
  status?: string;
  assortmentStatus?: string;
  reason?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as CommercialProductPatchPayload;
    const supabase = createSupabaseAdminClient();

    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    const changedBy = user?.email ?? null;
    const nowIso = new Date().toISOString();

    const { data: current, error: readError } = await supabase
      .from("commercial_products")
      .select("id, status, assortment_status")
      .eq("id", id)
      .single();

    if (readError || !current) {
      return NextResponse.json(
        { success: false, error: readError?.message ?? "Коммерческий товар не найден" },
        { status: 404 },
      );
    }

    const updatePayload: Record<string, unknown> = { updated_at: nowIso };
    const historyRows: Record<string, unknown>[] = [];

    if (body.status && body.status !== current.status) {
      updatePayload.status = body.status;
      historyRows.push({
        commercial_product_id: id,
        change_type: "status",
        previous_value: current.status,
        new_value: body.status,
        reason: body.reason ?? null,
        changed_by: changedBy,
        created_at: nowIso,
      });
    }

    if (body.assortmentStatus && body.assortmentStatus !== current.assortment_status) {
      updatePayload.assortment_status = body.assortmentStatus;
      historyRows.push({
        commercial_product_id: id,
        change_type: "assortment_status",
        previous_value: current.assortment_status,
        new_value: body.assortmentStatus,
        reason: body.reason ?? null,
        changed_by: changedBy,
        created_at: nowIso,
      });
    }

    const { error: updateError } = await supabase
      .from("commercial_products")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (historyRows.length > 0) {
      await supabase.from("product_status_history").insert(historyRows);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
