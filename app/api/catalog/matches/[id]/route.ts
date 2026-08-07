import { NextResponse } from "next/server";
import { createClient, createSupabaseAdminClient } from "@/lib/supabase/server";

type MatchAction =
  | { action: "confirm" }
  | { action: "set_product"; productId: string }
  | { action: "ignore" }
  | { action: "mark_conflict" };

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as MatchAction;
    const supabase = createSupabaseAdminClient();

    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    const reviewedBy = user?.email ?? null;
    const reviewedAt = new Date().toISOString();

    const { data: match, error: matchError } = await supabase
      .from("product_matches")
      .select("id, supplier_product_id, product_id")
      .eq("id", id)
      .single();

    if (matchError || !match) {
      return NextResponse.json(
        { success: false, error: matchError?.message ?? "Сопоставление не найдено" },
        { status: 404 },
      );
    }

    let updatePayload: Record<string, unknown>;
    let linkProductId: string | null = null;

    switch (body.action) {
      case "confirm": {
        updatePayload = {
          match_status: "matched",
          match_method: "manual",
          reviewed_by: reviewedBy,
          reviewed_at: reviewedAt,
          updated_at: reviewedAt,
        };
        linkProductId = match.product_id as string | null;
        break;
      }
      case "set_product": {
        updatePayload = {
          match_status: "matched",
          match_method: "manual",
          product_id: body.productId,
          reviewed_by: reviewedBy,
          reviewed_at: reviewedAt,
          updated_at: reviewedAt,
        };
        linkProductId = body.productId;
        break;
      }
      case "ignore": {
        updatePayload = {
          match_status: "ignored",
          reviewed_by: reviewedBy,
          reviewed_at: reviewedAt,
          updated_at: reviewedAt,
        };
        break;
      }
      case "mark_conflict": {
        updatePayload = {
          match_status: "conflict",
          reviewed_by: reviewedBy,
          reviewed_at: reviewedAt,
          updated_at: reviewedAt,
        };
        break;
      }
      default:
        return NextResponse.json(
          { success: false, error: "Неизвестное действие" },
          { status: 400 },
        );
    }

    const { error: updateError } = await supabase
      .from("product_matches")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (linkProductId) {
      await supabase
        .from("supplier_offers")
        .update({ product_id: linkProductId })
        .eq("id", match.supplier_product_id);
    } else if (body.action === "ignore") {
      // Do not silently keep a stale link if a reviewer explicitly ignores
      // a previously-matched offer.
      await supabase
        .from("supplier_offers")
        .update({ product_id: null })
        .eq("id", match.supplier_product_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
