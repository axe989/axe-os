import { NextResponse } from "next/server";
import { createClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { createProductFromSource, type CreateProductParams } from "@/lib/catalog/products/create-product";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Omit<CreateProductParams, "changedBy">;
    const supabase = createSupabaseAdminClient();

    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    const result = await createProductFromSource(supabase, {
      ...body,
      changedBy: user?.email ?? null,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
