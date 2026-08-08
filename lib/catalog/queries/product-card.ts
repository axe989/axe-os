import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { resolveMediaSet } from "../media/resolve-media-set";
import { resolveLaunchChecklist } from "../checklist/resolve-checklist";
import { LAUNCH_TEAM_LABELS } from "../checklist/labels";
import { pickNextAction, nextActionLabelFor } from "../checklist/next-action";
import { parseCanonicalCode } from "../attributes/resolve-translation";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, type DocumentType } from "../documents/document-types";
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
  id: string;
  role: string;
  sortOrder: number;
  storagePath: string;
};

export type ProductCardListing = {
  id: string;
  salesChannel: string;
  externalListingId: string | null;
  externalSku: string | null;
  title: string | null;
  listingStatus: string;
  currentSalePrice: number | null;
  lastSyncedAt: string | null;
  kaspiUrl: string | null;
};

export type ProductCardDocumentSlot = {
  documentType: DocumentType;
  label: string;
  required: boolean;
  status: "required" | "uploaded" | "verified" | "not_applicable";
  fileReference: string | null;
  uploadedAt: string | null;
};

export type PricePoint = { recordedAt: string; price: number };

export type ProductHistoryEvent = {
  type: string;
  label: string;
  at: string;
  by: string | null;
  detail: string | null;
};

export type ProductCardData = {
  commercialProductId: string;
  masterProductId: string;
  commercialName: string;
  masterProductName: string;
  manufacturerSku: string | null;
  sellerSku: string | null;
  brandName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  technicalAttributes: Record<string, unknown>;
  status: ProductWorkflowStatus;
  bundleComponents: BundleComponent[];
  contentTitle: string | null;
  contentDescription: string | null;
  media: ProductCardMediaItem[];
  documents: ProductCardDocumentSlot[];
  supplierName: string | null;
  purchasePrice: number | null;
  supplierAvailable: boolean;
  salePrice: number | null;
  minAllowedPrice: number | null;
  expectedMarginPercent: number | null;
  purchasePriceHistory: PricePoint[];
  salePriceHistory: PricePoint[];
  listings: ProductCardListing[];
  history: ProductHistoryEvent[];
  checklist: Awaited<ReturnType<typeof resolveLaunchChecklist>>;
  nextActionLabel: string | null;
  nextActionTeam: string | null;
  targetDate: string | null;
};

export async function getProductCard(commercialProductId: string): Promise<ProductCardData> {
  const supabase = createSupabaseAdminClient();

  const { data: product, error } = await supabase
    .from("commercial_products")
    .select(
      "id, commercial_name, status, bundle_components, media_set_id, master_product_id, created_at, product_master ( id, name, manufacturer_sku, category_id, technical_attributes, default_media_set_id, brand_id, product_brands ( name ), product_categories ( id, name, required_document_types ) )",
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
  const requiredDocumentTypes = ((category as { required_document_types: string[] } | null)?.required_document_types ?? []) as string[];

  const { data: variants } = await supabase
    .from("marketplace_content_variants")
    .select("title, description, media_set_id")
    .eq("commercial_product_id", commercialProductId)
    .order("is_default", { ascending: false })
    .limit(1);
  const contentVariant = variants?.[0] ?? null;

  // seller_sku (the deterministic AXE-{BRAND}-{MODEL}-{VARIANT} identifier)
  // is generated per publication attempt on marketplace_publication_items,
  // not stored as a standing field on commercial_products -- a product
  // only has one once it's actually been prepared for a channel.
  const { data: publicationForSku } = await supabase
    .from("marketplace_publication_items")
    .select("seller_sku")
    .eq("commercial_product_id", commercialProductId)
    .not("seller_sku", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sellerSku = (publicationForSku?.seller_sku as string | null) ?? null;

  const mediaResolution = resolveMediaSet(
    { media_set_id: (contentVariant?.media_set_id as string | null) ?? null },
    { media_set_id: product.media_set_id as string | null },
    { default_media_set_id: (master as { default_media_set_id: string | null } | null)?.default_media_set_id ?? null },
  );

  let media: ProductCardMediaItem[] = [];
  if (mediaResolution) {
    const { data: mediaItems } = await supabase
      .from("media_set_items")
      .select("id, role, sort_order, media_assets ( storage_path )")
      .eq("media_set_id", mediaResolution.mediaSetId)
      .order("sort_order", { ascending: true });

    media = (mediaItems ?? []).map((item) => {
      const asset = Array.isArray(item.media_assets) ? item.media_assets[0] : item.media_assets;
      return {
        id: item.id as string,
        role: item.role as string,
        sortOrder: item.sort_order as number,
        storagePath: (asset as { storage_path: string } | null)?.storage_path ?? "",
      };
    });
  }

  const { data: documentRows } = await supabase
    .from("product_documents")
    .select("id, document_type, status, file_reference, uploaded_at")
    .eq("commercial_product_id", commercialProductId);

  const documentByType = new Map((documentRows ?? []).map((d) => [d.document_type as string, d]));
  const documents: ProductCardDocumentSlot[] = DOCUMENT_TYPES.map((type) => {
    const row = documentByType.get(type);
    const required = requiredDocumentTypes.includes(type);
    return {
      documentType: type,
      label: DOCUMENT_TYPE_LABELS[type],
      required,
      status: (row?.status as ProductCardDocumentSlot["status"]) ?? (required ? "required" : "not_applicable"),
      fileReference: (row?.file_reference as string | null) ?? null,
      uploadedAt: (row?.uploaded_at as string | null) ?? null,
    };
  });

  const { data: supplierOffers } = await supabase
    .from("supplier_offers")
    .select("id, purchase_price, is_available, suppliers ( name )")
    .eq("product_id", masterProductId)
    .order("last_seen_at", { ascending: false })
    .limit(1);
  const supplierOffer = supplierOffers?.[0] ?? null;
  const supplier = supplierOffer ? (Array.isArray(supplierOffer.suppliers) ? supplierOffer.suppliers[0] : supplierOffer.suppliers) : null;

  const { data: allSupplierOfferIds } = await supabase
    .from("supplier_offers")
    .select("id")
    .eq("product_id", masterProductId);
  const offerIds = (allSupplierOfferIds ?? []).map((o) => o.id as string);

  const { data: purchaseHistoryRows } =
    offerIds.length > 0
      ? await supabase
          .from("supplier_offer_price_history")
          .select("recorded_at, purchase_price")
          .in("supplier_product_id", offerIds)
          .order("recorded_at", { ascending: true })
      : { data: [] as { recorded_at: string; purchase_price: number | null }[] };

  const purchasePriceHistory: PricePoint[] = (purchaseHistoryRows ?? [])
    .filter((r) => r.purchase_price !== null)
    .map((r) => ({ recordedAt: r.recorded_at as string, price: r.purchase_price as number }));

  const { data: allPriceHistory } = await supabase
    .from("channel_price_history")
    .select("recorded_at, sale_price, valid_to")
    .eq("product_id", masterProductId)
    .order("recorded_at", { ascending: true });

  const salePriceHistory: PricePoint[] = (allPriceHistory ?? []).map((r) => ({
    recordedAt: r.recorded_at as string,
    price: r.sale_price as number,
  }));
  const currentPrice = (allPriceHistory ?? []).find((r) => r.valid_to === null) ?? null;

  const { data: costSnapshot } = await supabase
    .from("product_cost_snapshots")
    .select("expected_margin_percent, recommended_sale_price")
    .eq("product_id", masterProductId)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: listingRows } = await supabase
    .from("marketplace_listings")
    .select("id, sales_channel, external_listing_id, external_sku, title, listing_status, current_sale_price, last_synced_at")
    .eq("commercial_product_id", commercialProductId);

  const listings: ProductCardListing[] = (listingRows ?? []).map((l) => {
    const externalListingId = l.external_listing_id as string | null;
    return {
      id: l.id as string,
      salesChannel: l.sales_channel as string,
      externalListingId,
      externalSku: l.external_sku as string | null,
      title: l.title as string | null,
      listingStatus: l.listing_status as string,
      currentSalePrice: l.current_sale_price as number | null,
      lastSyncedAt: l.last_synced_at as string | null,
      kaspiUrl: l.sales_channel === "kaspi" && externalListingId ? `https://kaspi.kz/shop/p/-${externalListingId}/` : null,
    };
  });

  const rawTechnicalAttributes = ((master as { technical_attributes: Record<string, unknown> } | null)?.technical_attributes ?? {}) as Record<string, unknown>;
  const { data: dictionaryValues } = await supabase
    .from("attribute_dictionary_values")
    .select("id, dictionary_code, value_code, display_label, created_at");
  const technicalAttributes = resolveDisplayAttributes(rawTechnicalAttributes, (dictionaryValues ?? []) as AttributeDictionaryValue[]);

  const checklist = await resolveLaunchChecklist(supabase, { commercialProductId });
  const nextItem = pickNextAction(checklist);

  // History timeline: assembled read-only from every event-shaped table
  // that already exists (status changes, assortment decision, price
  // moves, publication attempts, listing matches) -- deliberately not a
  // new unified log table, per "reuse what exists, don't build a
  // parallel system".
  const history: ProductHistoryEvent[] = [];

  history.push({ type: "created", label: "Коммерческий товар создан", at: product.created_at as string, by: null, detail: null });

  const { data: statusHistory } = await supabase
    .from("product_status_history")
    .select("change_type, previous_value, new_value, reason, changed_by, created_at")
    .eq("commercial_product_id", commercialProductId)
    .order("created_at", { ascending: true });
  for (const row of statusHistory ?? []) {
    history.push({
      type: row.change_type as string,
      label: row.change_type === "assortment_status" ? "Изменение статуса ассортимента" : "Изменение статуса товара",
      at: row.created_at as string,
      by: row.changed_by as string | null,
      detail: `${row.previous_value ?? "—"} → ${row.new_value}${row.reason ? ` (${row.reason})` : ""}`,
    });
  }

  if (supplierOffer && (supplierOffer as { assortment_decision?: string }).assortment_decision) {
    const { data: decidedOffers } = await supabase
      .from("supplier_offers")
      .select("assortment_decision, assortment_decision_reason, assortment_decision_by, assortment_decision_at")
      .eq("product_id", masterProductId)
      .not("assortment_decision_at", "is", null);
    for (const row of decidedOffers ?? []) {
      history.push({
        type: "assortment_decision",
        label: "Решение об ассортименте",
        at: row.assortment_decision_at as string,
        by: row.assortment_decision_by as string | null,
        detail: `${row.assortment_decision}${row.assortment_decision_reason ? `: ${row.assortment_decision_reason}` : ""}`,
      });
    }
  }

  const { data: publicationItems } = await supabase
    .from("marketplace_publication_items")
    .select("sales_channel, status, created_at")
    .eq("commercial_product_id", commercialProductId)
    .order("created_at", { ascending: true });
  for (const row of publicationItems ?? []) {
    history.push({
      type: "publication",
      label: `Публикация (${row.sales_channel})`,
      at: row.created_at as string,
      by: null,
      detail: row.status as string,
    });
  }

  for (const point of salePriceHistory) {
    history.push({ type: "price", label: "Изменение цены продажи", at: point.recordedAt, by: null, detail: `${point.price} ₸` });
  }

  history.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return {
    commercialProductId,
    masterProductId,
    commercialName: product.commercial_name as string,
    masterProductName: (master as { name: string } | null)?.name ?? "—",
    manufacturerSku: (master as { manufacturer_sku: string | null } | null)?.manufacturer_sku ?? null,
    sellerSku,
    brandName: (brand as { name: string } | null)?.name ?? null,
    categoryId: (category as { id: string } | null)?.id ?? null,
    categoryName: (category as { name: string } | null)?.name ?? null,
    technicalAttributes,
    status: product.status as ProductWorkflowStatus,
    bundleComponents: Array.isArray(product.bundle_components) ? (product.bundle_components as BundleComponent[]) : [],
    contentTitle: (contentVariant?.title as string | null) ?? null,
    contentDescription: (contentVariant?.description as string | null) ?? null,
    media,
    documents,
    supplierName: (supplier as { name: string } | null)?.name ?? null,
    purchasePrice: (supplierOffer?.purchase_price as number | null) ?? null,
    supplierAvailable: Boolean(supplierOffer?.is_available),
    salePrice: (currentPrice?.sale_price as number | null) ?? null,
    minAllowedPrice: (costSnapshot?.recommended_sale_price as number | null) ?? null,
    expectedMarginPercent: (costSnapshot?.expected_margin_percent as number | null) ?? null,
    purchasePriceHistory,
    salePriceHistory,
    listings,
    history,
    checklist,
    nextActionLabel: nextItem ? nextActionLabelFor(nextItem) : null,
    nextActionTeam: nextItem ? LAUNCH_TEAM_LABELS[nextItem.team] : null,
    targetDate: nextItem?.targetDate ?? null,
  };
}
