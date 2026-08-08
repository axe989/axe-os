import { NextResponse } from "next/server";
import { createClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { CHECKLIST_ITEMS } from "@/lib/catalog/checklist/items";

type Body = {
  commercialProductId: string;
  itemKey: string;
  targetDate?: string | null;
  statusOverride?: "done" | "blocked" | "not_applicable" | null;
  blockingNote?: string | null;
};

// The only operational, human-entered layer of the Launch Checklist --
// everything else on a checklist item is computed automatically (see
// lib/catalog/checklist/resolve-checklist.ts). One row per (product,
// item), upserted, so editing a target date never clobbers an existing
// blocking note or vice versa.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    if (!body.commercialProductId || !CHECKLIST_ITEMS.some((item) => item.key === body.itemKey)) {
      return NextResponse.json({ success: false, error: "Не указан товар или недопустимый пункт чек-листа" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    const { error } = await supabase
      .from("commercial_product_launch_tasks")
      .upsert(
        {
          commercial_product_id: body.commercialProductId,
          item_key: body.itemKey,
          target_date: body.targetDate || null,
          status_override: body.statusOverride || null,
          blocking_note: body.blockingNote || null,
          updated_by: user?.email ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "commercial_product_id,item_key" },
      );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
