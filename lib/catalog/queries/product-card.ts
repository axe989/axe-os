import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { resolveMediaSet } from "../media/resolve-media-set";
import { resolveLaunchChecklist } from "../checklist/resolve-checklist";
import { LAUNCH_TEAM_LABELS } from "../checklist/labels";
import { parseCanonicalCode } from "../attributes/resolve-translation";
import type { LaunchChecklist } from "../checklist/types";
import type { AttributeDictionaryValue, BundleComponent, ProductWorkflowStatus } from "../types";

// technical_attributes stores dictionary-backed dimensions as canonical
// codes ("connection.side"), never their display label -- that's correct
// for storage (see architecture: canonical/label/channel-translation are
// three separate things), but showing the raw code on the Product Card
// is a bug, not the intended UI. Swap each recognizable canonical code
// for its real display_label; anything that isn't a dictionary code
// (measurements, booleans, raw manufacturer text) passes through as-is.
function resolveDisplayAttributes(
  technicalAttributes: Record<string, unknown>,
  dictionaryValues: AttributeDictionaryValue[],
): Record<string, unknown> {
  const labelByCode = new Map(
    dictionaryValues.map((v) => [`${v.dictionary_code}.${v.value_code}`, v.display_label]),
  );

  const resolveOne = (value: unknown): unknown => {
    if (typeof value !== "string") return value;
    if (!parseCanonicalCode(value)) return value;
    return labelByCode.get(value) ?? value;
  };

  return Object.fromEntries(
    Object.entries(technicalAttributes).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.map(resolveOne) : resolveOne(value),
    ]),
  );
}

export type ProductCardMediaItem = {
  role: string;
  sortOrder: number;
  storagePath: string;
};

export type ProductCardListing = {
  id: string;
  salesChannel: string;
  externalSku: string | null;
  title: string | null;
  listingStatus: string;
  currentSalePrice: number | null;
};

export type ProductCardDocument = {
  id: string;
  documentType: string;
  status: string;
};

export type ProductCardData = {
  commercialProductId: string;
  masterProductId: string;
  commercialName: string;
  masterProductName: string;
  manufacturerSku: string | null;
  brandName: string | null;
  categoryName: string | null;
  technicalAttributes: Record<string, unknown>;
  status: ProductWorkflowStatus;
  bundleComponents: BundleComponent[];
  contentTitle: string | null;
  contentDescription: string | null;
  media: ProductCardMediaItem[];
  documents: ProductCardDocument[];
  supplierName: string | null;
  purchasePrice: number | null;
  supplierAvailable: boolean;
  salePrice: number | null;
  expectedMarginPercent: number | null;
  listings: ProductCardListing[];
  checklist: LaunchChecklist;
  nextActionLabel: string | null;
  nextActionTeam: string | null;
  targetDate: string | null;
};

export async function getProductCard(commercialProductId: string): Promise<ProductCardData> {
  const supabase = createSupabaseAdminClient();

  const { data: product, error } = await supabase
    .from("commercial_products")
    .select(
      "id, commercial_name, status, bundle_components, media_set_id, master_product_id, product_master ( id, name, manufacturer_sku, category_id, technical_attributes, default_media_set_id, brand_id, product_brands ( name ), product_categories ( name ) )",
    )
    .eq("id", commercialProductId)
    .single();

  if (error || !product) {
    throw new Error(`Коммерческий товар не найден: ${error?.message}`);
  }

  const master = Array.isArray(product.product_master) ? product.product_master[0] : product.product_master;
  const brand = master ? (Array.isArray(master.product_brands) ? master.product_brands[0] : master.product_brands) : null;
  const category = master ? (Array.isArray(master.product_categories) ? master.product_categories[0] : master.product_categories) : null;
  const masterProductId = (master as { id: string } | null)?.id ?? (product.master_product_id as string);

  const { data: variants } = await supabase
    .from("marketplace_content_variants")
    .select("title, description, media_set_id")
    .eq("commercial_product_id", commercialProductId)
    .order("is_default", { ascending: false })
    .limit(1);
  const contentVariant = variants?.[0] ?? null;

  const mediaResolution = resolveMediaSet(
    { media_set_id: (contentVariant?.media_set_id as string | null) ?? null },
    { media_set_id: product.media_set_id as string | null },
    { default_media_set_id: (master as { default_media_set_id: string | null } | null)?.default_media_set_id ?? null },
  );

  let media: ProductCardMediaItem[] = [];
  if (mediaResolution) {
    const { data: mediaItems } = await supabase
      .from("media_set_items")
      .select("role, sort_order, media_assets ( storage_path )")
      .eq("media_set_id", mediaResolution.mediaSetId)
      .order("sort_order", { ascending: true });

    media = (mediaItems ?? []).map((item) => {
      const asset = Array.isArray(item.media_assets) ? item.media_assets[0] : item.media_assets;
      return {
        role: item.role as string,
        sortOrder: item.sort_order as number,
        storagePath: (asset as { storage_path: string } | null)?.storage_path ?? "",
      };
    });
  }

  const { data: documents } = await supabase
    .from("product_documents")
    .select("id, document_type, status")
    .eq("commercial_product_id", commercialProductId);

  const { data: supplierOffers } = await supabase
    .from("supplier_offers")
    .select("purchase_price, is_available, suppliers ( name )")
    .eq("product_id", masterProductId)
    .order("last_seen_at", { ascending: false })
    .limit(1);
  const supplierOffer = supplierOffers?.[0] ?? null;
  const supplier = supplierOffer ? (Array.isArray(supplierOffer.suppliers) ? supplierOffer.suppliers[0] : supplierOffer.suppliers) : null;

  const { data: priceHistory } = await supabase
    .from("channel_price_history")
    .select("sale_price")
    .eq("product_id", masterProductId)
    .is("valid_to", null)
    .order("recorded_at", { ascending: false })
    .limit(1);

  const { data: costSnapshot } = await supabase
    .from("product_cost_snapshots")
    .select("expected_margin_percent")
    .eq("product_id", masterProductId)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: listings } = await supabase
    .from("marketplace_listings")
    .select("id, sales_channel, external_sku, title, listing_status, current_sale_price")
    .eq("commercial_product_id", commercialProductId);

  const rawTechnicalAttributes = ((master as { technical_attributes: Record<string, unknown> } | null)?.technical_attributes ?? {}) as Record<string, unknown>;
  const { data: dictionaryValues } = await supabase
    .from("attribute_dictionary_values")
    .select("id, dictionary_code, value_code, display_label, created_at");
  const technicalAttributes = resolveDisplayAttributes(rawTechnicalAttributes, (dictionaryValues ?? []) as AttributeDictionaryValue[]);

  const checklist = await resolveLaunchChecklist(supabase, { commercialProductId });
  const nextItem = checklist.items.find((item) => item.status !== "done" && item.status !== "not_applicable") ?? null;

  return {
    commercialProductId,
    masterProductId,
    commercialName: product.commercial_name as string,
    masterProductName: (master as { name: string } | null)?.name ?? "—",
    manufacturerSku: (master as { manufacturer_sku: string | null } | null)?.manufacturer_sku ?? null,
    brandName: (brand as { name: string } | null)?.name ?? null,
    categoryName: (category as { name: string } | null)?.name ?? null,
    technicalAttributes,
    status: product.status as ProductWorkflowStatus,
    bundleComponents: Array.isArray(product.bundle_components) ? (product.bundle_components as BundleComponent[]) : [],
    contentTitle: (contentVariant?.title as string | null) ?? null,
    contentDescription: (contentVariant?.description as string | null) ?? null,
    media,
    documents: (documents ?? []).map((d) => ({ id: d.id as string, documentType: d.document_type as string, status: d.status as string })),
    supplierName: (supplier as { name: string } | null)?.name ?? null,
    purchasePrice: (supplierOffer?.purchase_price as number | null) ?? null,
    supplierAvailable: Boolean(supplierOffer?.is_available),
    salePrice: (priceHistory?.[0]?.sale_price as number | null) ?? null,
    expectedMarginPercent: (costSnapshot?.expected_margin_percent as number | null) ?? null,
    listings: (listings ?? []).map((l) => ({
      id: l.id as string,
      salesChannel: l.sales_channel as string,
      externalSku: l.external_sku as string | null,
      title: l.title as string | null,
      listingStatus: l.listing_status as string,
      currentSalePrice: l.current_sale_price as number | null,
    })),
    checklist,
    nextActionLabel: nextItem?.label ?? null,
    nextActionTeam: nextItem ? LAUNCH_TEAM_LABELS[nextItem.team] : null,
    targetDate: nextItem?.targetDate ?? null,
  };
}
