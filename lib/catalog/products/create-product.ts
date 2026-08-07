import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeProductName, normalizeSku } from "../normalization/sku";
import type { AssortmentStatus } from "../types";
import { fetchProductCandidates, resolveBrandId } from "../import/matching-service";
import { matchListingToCommercialProduct, type MatchOfferInput } from "../matching/engine";
import { parseRadiatorSku } from "../normalization/radiator";

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

// Every new Commercial Product needs a default packaging so it's
// immediately usable (assortment decision, content, pricing all attach
// here, never to product_master -- see architecture review, 2026-08-07).
async function createDefaultCommercialProduct(
  supabase: AnySupabase,
  params: {
    masterProductId: string;
    commercialName: string;
    assortmentStatus: AssortmentStatus;
    reason: string;
    changedBy: string | null;
  },
): Promise<string> {
  const { data: commercialProduct, error } = await supabase
    .from("commercial_products")
    .insert({
      master_product_id: params.masterProductId,
      commercial_name: params.commercialName,
      status: "draft",
      assortment_status: params.assortmentStatus,
      content_status: "missing",
      publication_readiness: "not_ready",
    })
    .select("id")
    .single();

  if (error || !commercialProduct) {
    throw new Error(`Не удалось создать коммерческий товар: ${error?.message}`);
  }

  const commercialProductId = commercialProduct.id as string;

  await supabase.from("product_status_history").insert({
    commercial_product_id: commercialProductId,
    change_type: "assortment_status",
    previous_value: null,
    new_value: params.assortmentStatus,
    reason: params.reason,
    changed_by: params.changedBy,
    created_at: new Date().toISOString(),
  });

  return commercialProductId;
}

export type CreateMasterProductFromSupplierOfferParams = {
  supplierOfferId: string;
  assortmentStatus: AssortmentStatus;
  reason: string;
  changedBy: string | null;
};

export type CreateMasterProductResult = {
  masterProductId: string;
  commercialProductId: string;
};

// Level 1 creation path: Supplier Price Lists -> Master Products. This is
// the ONLY path that creates product_master rows from an import source --
// per the new business model, Kaspi/marketplace data must never create a
// Master Product directly (see createCommercialProductFromListing below).
export async function createMasterProductFromSupplierOffer(
  supabase: AnySupabase,
  params: CreateMasterProductFromSupplierOfferParams,
): Promise<CreateMasterProductResult> {
  const { data: offer, error } = await supabase
    .from("supplier_offers")
    .select("id, supplier_sku, supplier_name_raw, supplier_brand_raw, raw_payload")
    .eq("id", params.supplierOfferId)
    .single();

  if (error || !offer) throw new Error(`Предложение поставщика не найдено: ${error?.message}`);

  const name = offer.supplier_name_raw as string | null;
  if (!name) throw new Error("Не удалось определить название товара");

  const manufacturerSku = offer.supplier_sku as string | null;
  const rawPayload = offer.raw_payload as { radiator?: { attributes?: Record<string, unknown> } } | null;
  const technicalAttributes = rawPayload?.radiator?.attributes ?? {};
  const brandId = await findOrCreateBrand(supabase, offer.supplier_brand_raw as string | null);

  const { data: product, error: insertError } = await supabase
    .from("product_master")
    .insert({
      name,
      normalized_name: normalizeProductName(name),
      manufacturer_sku: normalizeSku(manufacturerSku),
      brand_id: brandId,
      technical_attributes: technicalAttributes,
    })
    .select("id")
    .single();

  if (insertError || !product) {
    throw new Error(`Не удалось создать товар: ${insertError?.message}`);
  }

  const masterProductId = product.id as string;

  const commercialProductId = await createDefaultCommercialProduct(supabase, {
    masterProductId,
    commercialName: name,
    assortmentStatus: params.assortmentStatus,
    reason: params.reason,
    changedBy: params.changedBy,
  });

  await supabase.from("supplier_offers").update({ product_id: masterProductId }).eq("id", offer.id);
  await supabase.from("product_matches").upsert(
    {
      supplier_product_id: offer.id,
      product_id: masterProductId,
      match_status: "matched",
      match_method: "manual",
      confidence_score: 1,
      match_reasons: ["Товар создан вручную из очереди отсутствующих товаров"],
      reviewed_by: params.changedBy,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "supplier_product_id" },
  );

  return { masterProductId, commercialProductId };
}

export type CreateCommercialProductFromListingParams = {
  marketplaceListingId: string;
  assortmentStatus: AssortmentStatus;
  reason: string;
  changedBy: string | null;
};

export type CreateCommercialProductResult = {
  commercialProductId: string;
  masterProductId: string;
  masterProductCreated: boolean;
};

// Level 3 -> Level 2 (-> Level 1 only if truly needed) creation path:
// Kaspi XML -> Marketplace Listing -> Matching Engine -> Commercial
// Product -> Master Product. A listing NEVER creates a Master Product
// directly -- it first tries to match an EXISTING Master Product (the
// listing is presumably just a new packaging/listing of something
// suppliers already sell); only when no reasonable Master Product exists
// does this fall back to creating one, and even then the listing's own
// commercial_product_id links to a fresh Commercial Product, not to
// product_master.
export async function createCommercialProductFromListing(
  supabase: AnySupabase,
  params: CreateCommercialProductFromListingParams,
): Promise<CreateCommercialProductResult> {
  const { data: listing, error } = await supabase
    .from("marketplace_listings")
    .select("id, title, raw_payload")
    .eq("id", params.marketplaceListingId)
    .single();

  if (error || !listing) throw new Error(`Позиция маркетплейса не найдена: ${error?.message}`);

  const title = listing.title as string | null;
  if (!title) throw new Error("Не удалось определить название товара");

  const rawPayload = listing.raw_payload as {
    radiator?: { attributes?: Record<string, unknown> };
    brand_raw?: string | null;
  } | null;
  const technicalAttributes = rawPayload?.radiator?.attributes ?? {};
  const brandRaw = rawPayload?.brand_raw ?? null;
  const brandId = await resolveBrandId(supabase, brandRaw);

  // Try to find an existing Master Product this listing actually
  // represents before creating a new one.
  const radiator = parseRadiatorSku(null, title);
  const masterCandidates = await fetchProductCandidates(supabase);
  const offerInput: MatchOfferInput = {
    ean: null,
    manufacturerSkuRaw: null,
    nameRaw: title,
    brandId,
    series: null,
    radiatorAttributes: radiator.attributes,
  };
  const masterMatch = matchListingToCommercialProduct(offerInput, masterCandidates);

  let masterProductId: string;
  let masterProductCreated = false;

  if (masterMatch.status === "matched" && masterMatch.productId) {
    masterProductId = masterMatch.productId;
  } else {
    const brandIdForNewProduct = brandId ?? (await findOrCreateBrand(supabase, brandRaw));
    const { data: newMaster, error: masterError } = await supabase
      .from("product_master")
      .insert({
        name: title,
        normalized_name: normalizeProductName(title),
        brand_id: brandIdForNewProduct,
        technical_attributes: technicalAttributes,
      })
      .select("id")
      .single();

    if (masterError || !newMaster) {
      throw new Error(`Не удалось создать товар: ${masterError?.message}`);
    }

    masterProductId = newMaster.id as string;
    masterProductCreated = true;
  }

  const commercialProductId = await createDefaultCommercialProduct(supabase, {
    masterProductId,
    commercialName: title,
    assortmentStatus: params.assortmentStatus,
    reason: params.reason,
    changedBy: params.changedBy,
  });

  await supabase
    .from("marketplace_listings")
    .update({ commercial_product_id: commercialProductId })
    .eq("id", listing.id);

  await supabase.from("listing_matches").upsert(
    {
      marketplace_listing_id: listing.id,
      commercial_product_id: commercialProductId,
      match_status: "matched",
      match_method: "manual",
      confidence_score: 1,
      match_reasons: ["Коммерческий товар создан вручную из очереди отсутствующих листингов"],
      reviewed_by: params.changedBy,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "marketplace_listing_id" },
  );

  return { commercialProductId, masterProductId, masterProductCreated };
}
