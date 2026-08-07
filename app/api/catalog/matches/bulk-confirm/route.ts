import { NextResponse } from "next/server";
import { createClient, createSupabaseAdminClient } from "@/lib/supabase/server";

// Bulk-confirms only already-exact matches (match_status = 'matched',
// produced by exact_ean / exact_manufacturer_sku / exact_normalized_sku /
// brand_series_variant) that haven't been reviewed yet. Never touches
// 'probable' or 'conflict' rows (spec: "bulk confirm only exact safe
// matches"; "Do not auto-confirm probable or conflict matches").
const SAFE_METHODS = [
  "exact_ean",
  "exact_manufacturer_sku",
  "exact_normalized_sku",
  "brand_series_variant",
];

export async function POST() {
  try {
    const supabase = createSupabaseAdminClient();
    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    const { data: pending, error: fetchError } = await supabase
      .from("product_matches")
      .select("id")
      .eq("match_status", "matched")
      .in("match_method", SAFE_METHODS)
      .is("reviewed_at", null);

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    const ids = (pending ?? []).map((row) => row.id as string);
    if (ids.length === 0) {
      return NextResponse.json({ success: true, confirmedCount: 0 });
    }

    const { error: updateError } = await supabase
      .from("product_matches")
      .update({
        reviewed_by: user?.email ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ success: true, confirmedCount: ids.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
