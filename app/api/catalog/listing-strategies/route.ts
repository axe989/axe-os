import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const purpose = formData.get("purpose");
    const isAbTest = formData.get("isAbTest") === "on";
    const expectedAudience = formData.get("expectedAudience");

    if (!name) {
      return NextResponse.json({ success: false, error: "Название обязательно" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("listing_strategies").insert({
      name,
      purpose: typeof purpose === "string" && purpose ? purpose : null,
      is_ab_test: isAbTest,
      expected_audience: typeof expectedAudience === "string" && expectedAudience ? expectedAudience : null,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.redirect(new URL("/catalog/listing-strategies", request.url), { status: 303 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
