import { NextResponse } from "next/server";
import { createClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { recordAssortmentDecision } from "@/lib/catalog/assortment/decide";
import type { AssortmentDecision } from "@/lib/catalog/types";

type Body = {
  supplierOfferId: string;
  decision: Exclude<AssortmentDecision, "pending">;
  reason?: string;
};

const VALID_DECISIONS: AssortmentDecision[] = ["accepted", "rejected", "ignored", "postponed"];

const DEFAULT_REASONS: Record<string, string> = {
  accepted: "Добавлено в ассортимент через Товары на рассмотрении",
  rejected: "Не добавлено в ассортимент через Товары на рассмотрении",
  ignored: "Проигнорировано через Товары на рассмотрении",
  postponed: "Отложено на рассмотрение через Товары на рассмотрении",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    if (!body.supplierOfferId || !VALID_DECISIONS.includes(body.decision)) {
      return NextResponse.json({ success: false, error: "Не указано предложение или недопустимое решение" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    const result = await recordAssortmentDecision(supabase, {
      supplierOfferId: body.supplierOfferId,
      decision: body.decision,
      reason: body.reason?.trim() || DEFAULT_REASONS[body.decision],
      decidedBy: user?.email ?? null,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
