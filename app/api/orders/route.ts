import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error, count } = await supabase
      .from("sales_orders")
      .select(
        `
          id,
          external_code,
          external_status,
          order_date,
          customer_name,
          sale_amount,
          delivery_type,
          synced_at
        `,
        { count: "exact" },
      )
      .eq("sales_channel", "kaspi")
      .order("order_date", { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      count: count ?? data?.length ?? 0,
      orders: data ?? [],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
