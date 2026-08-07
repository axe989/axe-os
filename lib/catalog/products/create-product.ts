import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeProductName, normalizeSku } from "../normalization/sku";
import type { AssortmentStatus } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

async function findOrCreateBrand(supabase: AnySupabase, brandName: string | null): Promise<string | null> {
  if (!brandName) return null;

  const normalized = brandName.trim().toLowerCase();
  const { data: existing } = await supabase
    .from("product_brands")
    .select("id")
    .eq("normalized_name", normalized)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from("product_brands")
    .insert({ name: brandName, normalized_name: normalized })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`Не удалось создать бренд: ${error?.message}`);
  }

  return created.id as string;
}

export type CreateProductParams = {
  sourceType: "supplier_offer" | "channel_listing" | "manual";
  sourceId?: string;
  name?: string;
  assortmentStatus: AssortmentStatus;
  reason: string;
  changedBy: string | null;
};

export type CreateProductResult = {
  productId: string;
};

export async function createProductFromSource(
  supabase: AnySupabase,
  params: CreateProductParams,
): Promise<CreateProductResult> {
  let name = params.name ?? null;
  let manufacturerSku: string | null = null;
  let brandRaw: string | null = null;
  let technicalAttributes: Record<string, unknown> = {};
  let supplierOfferId: string | null = null;
  let channelListingId: string | null = null;

  if (params.sourceType === "supplier_offer") {
    if (!params.sourceId) throw new Error("sourceId обязателен для supplier_offer");
    const { data: offer, error } = await supabase
      .from("supplier_offers")
      .select("id, supplier_sku, supplier_name_raw, supplier_brand_raw, raw_payload")
      .eq("id", params.sourceId)
      .single();

    if (error || !offer) throw new Error(`Предложение поставщика не найдено: ${error?.message}`);

    supplierOfferId = offer.id as string;
    name = name ?? (offer.supplier_name_raw as string | null);
    manufacturerSku = offer.supplier_sku as string | null;
    brandRaw = offer.supplier_brand_raw as string | null;
    const rawPayload = offer.raw_payload as { radiator?: { attributes?: Record<string, unknown> } } | null;
    technicalAttributes = rawPayload?.radiator?.attributes ?? {};
  } else if (params.sourceType === "channel_listing") {
    if (!params.sourceId) throw new Error("sourceId обязателен для channel_listing");
    const { data: listing, error } = await supabase
      .from("channel_listings")
      .select("id, title, raw_payload")
      .eq("id", params.sourceId)
      .single();

    if (error || !listing) throw new Error(`Позиция канала не найдена: ${error?.message}`);

    channelListingId = listing.id as string;
    name = name ?? (listing.title as string | null);
    const rawPayload = listing.raw_payload as {
      radiator?: { attributes?: Record<string, unknown> };
      brand_raw?: string | null;
    } | null;
    technicalAttributes = rawPayload?.radiator?.attributes ?? {};
    brandRaw = rawPayload?.brand_raw ?? null;
  }

  if (!name) {
    throw new Error("Не удалось определить название товара");
  }

  const brandId = await findOrCreateBrand(supabase, brandRaw);

  const { data: product, error: insertError } = await supabase
    .from("product_master")
    .insert({
      name,
      normalized_name: normalizeProductName(name),
      manufacturer_sku: normalizeSku(manufacturerSku),
      brand_id: brandId,
      status: "draft",
      assortment_status: params.assortmentStatus,
      technical_attributes: technicalAttributes,
      content_status: "missing",
      publication_readiness: "not_ready",
    })
    .select("id")
    .single();

  if (insertError || !product) {
    throw new Error(`Не удалось создать товар: ${insertError?.message}`);
  }

  const productId = product.id as string;
  const nowIso = new Date().toISOString();

  await supabase.from("product_status_history").insert({
    product_id: productId,
    change_type: "assortment_status",
    previous_value: null,
    new_value: params.assortmentStatus,
    reason: params.reason,
    changed_by: params.changedBy,
    created_at: nowIso,
  });

  if (supplierOfferId) {
    await supabase.from("supplier_offers").update({ product_id: productId }).eq("id", supplierOfferId);
    await supabase.from("product_matches").upsert(
      {
        supplier_product_id: supplierOfferId,
        product_id: productId,
        match_status: "matched",
        match_method: "manual",
        confidence_score: 1,
        match_reasons: ["Товар создан вручную из очереди отсутствующих товаров"],
        reviewed_by: params.changedBy,
        reviewed_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "supplier_product_id" },
    );
  }

  if (channelListingId) {
    await supabase.from("channel_listings").update({ product_id: productId }).eq("id", channelListingId);
  }

  return { productId };
}
