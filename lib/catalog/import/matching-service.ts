import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchCandidateProduct } from "../matching/engine";
import type { RadiatorAttributes } from "../types";

type TechnicalAttributesRow = Partial<RadiatorAttributes> & Record<string, unknown>;

function toRadiatorAttributes(technicalAttributes: unknown): MatchCandidateProduct["radiatorAttributes"] {
  const attrs = (technicalAttributes ?? {}) as TechnicalAttributesRow;
  return {
    connection_type: (attrs.connection_type as RadiatorAttributes["connection_type"]) ?? null,
    radiator_type: (attrs.radiator_type as RadiatorAttributes["radiator_type"]) ?? null,
    height_mm: (attrs.height_mm as number | null) ?? null,
    length_mm: (attrs.length_mm as number | null) ?? null,
    color_ral: (attrs.color_ral as string | null) ?? null,
    hygienic: Boolean(attrs.hygienic),
  };
}

// product_master rows still in the live assortment -- Level 1 -> Level 1
// candidate pool (Supplier Price Lists -> Master Products), unchanged by
// the four-level model.
export async function fetchProductCandidates(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
): Promise<MatchCandidateProduct[]> {
  const { data, error } = await supabase
    .from("product_master")
    .select("id, ean, manufacturer_sku, normalized_name, brand_id, series, technical_attributes")
    .limit(5000);

  if (error) {
    throw new Error(`Не удалось загрузить каталог для сопоставления: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    ean: (row.ean as string | null) ?? null,
    manufacturerSku: (row.manufacturer_sku as string | null) ?? null,
    normalizedName: (row.normalized_name as string | null) ?? null,
    brandId: (row.brand_id as string | null) ?? null,
    series: (row.series as string | null) ?? null,
    radiatorAttributes: toRadiatorAttributes(row.technical_attributes),
  }));
}

// Commercial Products still in the live assortment -- Level 3 -> Level 2
// candidate pool (Kaspi listings -> Commercial Products). Identity signals
// (EAN/manufacturer SKU/technical attributes) live on the Commercial
// Product's underlying Master Product, not on the Commercial Product
// itself, so this candidate is built from the joined product_master row
// while keeping the *commercial product's* id as the match target.
export async function fetchCommercialProductCandidates(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
): Promise<MatchCandidateProduct[]> {
  const { data, error } = await supabase
    .from("commercial_products")
    .select(
      "id, commercial_name, product_master ( ean, manufacturer_sku, normalized_name, brand_id, series, technical_attributes )",
    )
    .neq("status", "archived")
    .limit(5000);

  if (error) {
    throw new Error(`Не удалось загрузить коммерческие товары для сопоставления: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const master = Array.isArray(row.product_master) ? row.product_master[0] : row.product_master;
    return {
      id: row.id as string,
      ean: (master?.ean as string | null) ?? null,
      manufacturerSku: (master?.manufacturer_sku as string | null) ?? null,
      normalizedName: (master?.normalized_name as string | null) ?? null,
      brandId: (master?.brand_id as string | null) ?? null,
      series: (master?.series as string | null) ?? null,
      radiatorAttributes: toRadiatorAttributes(master?.technical_attributes),
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
