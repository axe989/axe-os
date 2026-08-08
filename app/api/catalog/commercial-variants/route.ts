import { NextResponse } from "next/server";
import { createClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { createCommercialVariant } from "@/lib/catalog/products/create-product";

type Body = {
  masterProductId: string;
  commercialName: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    if (!body.masterProductId || !body.commercialName?.trim()) {
      return NextResponse.json({ success: false, error: "Не указан товар или название варианта" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    const result = await createCommercialVariant(supabase, {
      masterProductId: body.masterProductId,
      commercialName: body.commercialName.trim(),
      reason: "Создан вручную как дополнительный коммерческий вариант",
      changedBy: user?.email ?? null,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
