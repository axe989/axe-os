import { NextResponse } from "next/server";
import { createClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { recordAssortmentDecision } from "@/lib/catalog/assortment/decide";
import type { AssortmentDecision } from "@/lib/catalog/types";

type Body = {
  supplierOfferId: string;
  decision: Exclude<AssortmentDecision, "pending">;
  reason?: string;
};

// "ignored" is intentionally not offered here -- audited against every
// place AssortmentDecision drives behavior (filters, checklist signals,
// dashboard metrics) and found to carry no business meaning distinct
// from "rejected" ("Не добавлять"). The DB column and check constraint
// still accept it so historical rows made before this audit keep
// displaying correctly (see labels in the Supplier Offers screens).
const VALID_DECISIONS: AssortmentDecision[] = ["accepted", "rejected", "postponed"];

const DEFAULT_REASONS: Record<string, string> = {
  accepted: "Добавлено в ассортимент через Товары на рассмотрении",
  rejected: "Не добавлено в ассортимент через Товары на рассмотрении",
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
