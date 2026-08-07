import type { SupabaseClient } from "@supabase/supabase-js";
import { matchSupplierOffer, type MatchCandidateProduct, type MatchOfferInput, type MatchResult } from "../matching/engine";
import { normalizeProductName } from "../normalization/sku";
import { parseRadiatorSku } from "../normalization/radiator";
import type { RadiatorAttributes } from "../types";

type TechnicalAttributesRow = Partial<RadiatorAttributes> & Record<string, unknown>;

// product_master rows deleted/archived are excluded from candidate pools --
// matching should never resurrect a link to something no longer part of
// the live assortment.
export async function fetchProductCandidates(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
): Promise<MatchCandidateProduct[]> {
  const { data, error } = await supabase
    .from("product_master")
    .select("id, ean, manufacturer_sku, normalized_name, brand_id, series, technical_attributes")
    .neq("status", "archived")
    .limit(5000);

  if (error) {
    throw new Error(`Не удалось загрузить каталог для сопоставления: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const attrs = (row.technical_attributes ?? {}) as TechnicalAttributesRow;
    return {
      id: row.id as string,
      ean: (row.ean as string | null) ?? null,
      manufacturerSku: (row.manufacturer_sku as string | null) ?? null,
      normalizedName: (row.normalized_name as string | null) ?? null,
      brandId: (row.brand_id as string | null) ?? null,
      series: (row.series as string | null) ?? null,
      radiatorAttributes: {
        connection_type: (attrs.connection_type as RadiatorAttributes["connection_type"]) ?? null,
        radiator_type: (attrs.radiator_type as RadiatorAttributes["radiator_type"]) ?? null,
        height_mm: (attrs.height_mm as number | null) ?? null,
        length_mm: (attrs.length_mm as number | null) ?? null,
        color_ral: (attrs.color_ral as string | null) ?? null,
        hygienic: Boolean(attrs.hygienic),
      },
    };
  });
}

export async function resolveBrandId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  brandRaw: string | null,
): Promise<string | null> {
  if (!brandRaw) return null;

  const normalized = brandRaw.trim().toLowerCase();
  const { data } = await supabase
    .from("product_brands")
    .select("id")
    .eq("normalized_name", normalized)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
}

async function persistMatch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  supplierProductId: string,
  result: MatchResult,
): Promise<void> {
  const { error } = await supabase.from("product_matches").upsert(
    {
      supplier_product_id: supplierProductId,
      product_id: result.productId,
      match_status: result.status,
      confidence_score: result.confidence,
      match_method: result.method,
      match_reasons: result.reasons,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "supplier_product_id" },
  );

  if (error) {
    throw new Error(`Не удалось сохранить результат сопоставления: ${error.message}`);
  }

  // Only exact tiers (matched) auto-link product_id on the offer itself.
  // Probable/conflict matches require human review before linking (spec:
  // "Do not auto-confirm probable or conflict matches").
  if (result.status === "matched") {
    await supabase
      .from("supplier_offers")
      .update({ product_id: result.productId })
      .eq("id", supplierProductId);
  }
}

export async function matchAndPersistSupplierOffer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  supplierOfferId: string,
  candidates: MatchCandidateProduct[],
): Promise<MatchResult> {
  const { data: offer, error } = await supabase
    .from("supplier_offers")
    .select("id, supplier_sku, supplier_name_raw, supplier_brand_raw")
    .eq("id", supplierOfferId)
    .single();

  if (error || !offer) {
    throw new Error(`Не удалось загрузить предложение поставщика: ${error?.message}`);
  }

  const brandId = await resolveBrandId(supabase, offer.supplier_brand_raw as string | null);
  const radiator = parseRadiatorSku(
    offer.supplier_sku as string | null,
    offer.supplier_name_raw as string | null,
  );

  const offerInput: MatchOfferInput = {
    ean: null,
    manufacturerSkuRaw: offer.supplier_sku as string | null,
    nameRaw: (offer.supplier_name_raw as string | null) ?? "",
    brandId,
    series: null,
    radiatorAttributes: radiator.attributes,
  };

  const result = matchSupplierOffer(offerInput, candidates);
  await persistMatch(supabase, supplierOfferId, result);
  return result;
}

export function normalizedNameForCandidateSeed(name: string | null): string | null {
  return normalizeProductName(name);
}
