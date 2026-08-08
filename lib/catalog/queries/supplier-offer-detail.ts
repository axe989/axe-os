import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { stageForStatus, STAGE_COLUMNS } from "../production/stages";
import type { ProductWorkflowStatus } from "../types";

export type SupplierOfferCommercialProduct = {
  id: string;
  commercialName: string;
  status: ProductWorkflowStatus;
  stageLabel: string;
  listingCount: number;
};

export type SupplierOfferDetail = {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierSku: string | null;
  nameRaw: string | null;
  brandRaw: string | null;
  purchasePrice: number | null;
  currency: string;
  isAvailable: boolean;
  stockQuantity: number | null;
  availableQuantity: number | null;
  lastSeenAt: string | null;
  sourceUpdatedAt: string | null;
  assortmentDecision: string;
  assortmentDecisionReason: string | null;
  assortmentDecisionBy: string | null;
  assortmentDecisionAt: string | null;
  importFileName: string | null;
  importWorksheetName: string | null;
  importCompletedAt: string | null;
  supplierTechnicalAttributes: Record<string, unknown>;
  masterProductId: string | null;
  masterProductName: string | null;
  manufacturerSku: string | null;
  brandName: string | null;
  categoryName: string | null;
  commercialProducts: SupplierOfferCommercialProduct[];
};

export async function getSupplierOfferDetail(id: string): Promise<SupplierOfferDetail> {
  const supabase = createSupabaseAdminClient();

  const { data: offer, error } = await supabase
    .from("supplier_offers")
    .select(
      "id, supplier_id, supplier_sku, supplier_name_raw, supplier_brand_raw, purchase_price, currency, is_available, stock_quantity, available_quantity, last_seen_at, source_updated_at, source_import_id, raw_payload, assortment_decision, assortment_decision_reason, assortment_decision_by, assortment_decision_at, product_id, suppliers ( id, name ), product_master ( id, name, manufacturer_sku, product_brands ( name ), product_categories ( name ) )",
    )
    .eq("id", id)
    .single();

  if (error || !offer) {
    throw new Error(`Предложение поставщика не найдено: ${error?.message}`);
  }

  const supplier = Array.isArray(offer.suppliers) ? offer.suppliers[0] : offer.suppliers;
  const master = Array.isArray(offer.product_master) ? offer.product_master[0] : offer.product_master;
  const brand = master ? (Array.isArray(master.product_brands) ? master.product_brands[0] : master.product_brands) : null;
  const category = master ? (Array.isArray(master.product_categories) ? master.product_categories[0] : master.product_categories) : null;
  const masterProductId = (master as { id: string } | null)?.id ?? null;

  let importRow: { file_name: string; worksheet_name: string | null; completed_at: string | null } | null = null;
  if (offer.source_import_id) {
    const { data } = await supabase
      .from("catalog_imports")
      .select("file_name, worksheet_name, completed_at")
      .eq("id", offer.source_import_id as string)
      .maybeSingle();
    importRow = data;
  }

  let commercialProducts: SupplierOfferCommercialProduct[] = [];
  if (masterProductId) {
    const { data: products } = await supabase
      .from("commercial_products")
      .select("id, commercial_name, status")
      .eq("master_product_id", masterProductId);

    const productIds = (products ?? []).map((p) => p.id as string);
    const { data: listings } =
      productIds.length > 0
        ? await supabase.from("marketplace_listings").select("commercial_product_id").in("commercial_product_id", productIds)
        : { data: [] as { commercial_product_id: string | null }[] };

    const listingCountByProduct = new Map<string, number>();
    for (const l of (listings ?? []) as { commercial_product_id: string | null }[]) {
      if (!l.commercial_product_id) continue;
      listingCountByProduct.set(l.commercial_product_id, (listingCountByProduct.get(l.commercial_product_id) ?? 0) + 1);
    }

    commercialProducts = (products ?? []).map((p) => {
      const status = p.status as ProductWorkflowStatus;
      const stage = STAGE_COLUMNS.find((c) => c.key === stageForStatus(status));
      return {
        id: p.id as string,
        commercialName: p.commercial_name as string,
        status,
        stageLabel: stage?.label ?? status,
        listingCount: listingCountByProduct.get(p.id as string) ?? 0,
      };
    });
  }

  const rawPayload = offer.raw_payload as { radiator?: { attributes?: Record<string, unknown> } } | null;

  return {
    id: offer.id as string,
    supplierId: (supplier as { id: string } | null)?.id ?? (offer.supplier_id as string),
    supplierName: (supplier as { name: string } | null)?.name ?? "—",
    supplierSku: offer.supplier_sku as string | null,
    nameRaw: offer.supplier_name_raw as string | null,
    brandRaw: offer.supplier_brand_raw as string | null,
    purchasePrice: offer.purchase_price as number | null,
    currency: offer.currency as string,
    isAvailable: Boolean(offer.is_available),
    stockQuantity: offer.stock_quantity as number | null,
    availableQuantity: offer.available_quantity as number | null,
    lastSeenAt: offer.last_seen_at as string | null,
    sourceUpdatedAt: offer.source_updated_at as string | null,
    assortmentDecision: offer.assortment_decision as string,
    assortmentDecisionReason: offer.assortment_decision_reason as string | null,
    assortmentDecisionBy: offer.assortment_decision_by as string | null,
    assortmentDecisionAt: offer.assortment_decision_at as string | null,
    importFileName: importRow?.file_name ?? null,
    importWorksheetName: importRow?.worksheet_name ?? null,
    importCompletedAt: importRow?.completed_at ?? null,
    supplierTechnicalAttributes: rawPayload?.radiator?.attributes ?? {},
    masterProductId,
    masterProductName: (master as { name: string } | null)?.name ?? null,
    manufacturerSku: (master as { manufacturer_sku: string | null } | null)?.manufacturer_sku ?? null,
    brandName: (brand as { name: string } | null)?.name ?? null,
    categoryName: (category as { name: string } | null)?.name ?? null,
    commercialProducts,
  };
}
