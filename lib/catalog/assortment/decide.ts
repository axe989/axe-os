import type { SupabaseClient } from "@supabase/supabase-js";
import { createMasterProductFromSupplierOffer } from "../products/create-product";
import type { AssortmentDecision } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

export type RecordAssortmentDecisionParams = {
  supplierOfferId: string;
  decision: Exclude<AssortmentDecision, "pending">;
  reason: string;
  decidedBy: string | null;
};

export type RecordAssortmentDecisionResult = {
  masterProductId: string | null;
  commercialProductId: string | null;
};

// The four Opportunity Queue actions from the approved business
// architecture (Accept / Reject / Postpone / Ignore), all as one explicit,
// recorded decision on the supplier offer itself -- "accept" used to only
// exist implicitly (a Base Product got created and nothing else was
// tracked); the other three had no representation at all.
export async function recordAssortmentDecision(
  supabase: AnySupabase,
  params: RecordAssortmentDecisionParams,
): Promise<RecordAssortmentDecisionResult> {
  const { data: offer, error } = await supabase
    .from("supplier_offers")
    .select("id, product_id")
    .eq("id", params.supplierOfferId)
    .single();

  if (error || !offer) {
    throw new Error(`Предложение поставщика не найдено: ${error?.message}`);
  }

  const nowIso = new Date().toISOString();
  let masterProductId: string | null = (offer.product_id as string | null) ?? null;
  let commercialProductId: string | null = null;

  if (params.decision === "accepted" && !masterProductId) {
    const created = await createMasterProductFromSupplierOffer(supabase, {
      supplierOfferId: params.supplierOfferId,
      assortmentStatus: "candidate",
      reason: params.reason,
      changedBy: params.decidedBy,
    });
    masterProductId = created.masterProductId;
    commercialProductId = created.commercialProductId;
  }

  const { error: updateError } = await supabase
    .from("supplier_offers")
    .update({
      assortment_decision: params.decision,
      assortment_decision_reason: params.reason,
      assortment_decision_by: params.decidedBy,
      assortment_decision_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", params.supplierOfferId);

  if (updateError) {
    throw new Error(`Не удалось сохранить решение: ${updateError.message}`);
  }

  return { masterProductId, commercialProductId };
}
