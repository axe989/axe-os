import { createSupabaseAdminClient } from "@/lib/supabase/server";

const NEW_WINDOW_DAYS = 14;
const CHANGE_WINDOW_DAYS = 14;

export type SupplierFeedRow = {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierSku: string | null;
  nameRaw: string | null;
  brandRaw: string | null;
  purchasePrice: number | null;
  isAvailable: boolean;
  stockQuantity: number | null;
  lastSeenAt: string | null;
  createdAt: string;
  isNew: boolean;
  priceChanged: boolean;
  stockChanged: boolean;
  statusInAxe: "not_matched" | "matched" | "accepted" | "rejected" | "postponed" | "ignored";
  masterProductId: string | null;
  masterProductName: string | null;
  manufacturerSku: string | null;
  series: string | null;
  categoryId: string | null;
  categoryName: string | null;
  sellerSkus: string[];
};

export type SupplierFeedFilters = {
  supplierId?: string;
  brand?: string;
  category?: string;
  availability?: "available" | "unavailable";
  statusInAxe?: SupplierFeedRow["statusInAxe"];
  onlyNew?: boolean;
  onlyRemoved?: boolean;
  onlyPriceChanged?: boolean;
  onlyStockChanged?: boolean;
  search?: string;
};

export type SupplierDirectoryEntry = { id: string; name: string };

// The real supplier directory -- Supplier Offers filters must let the
// operator pick an actual supplier, never rely on whatever free-text
// brand happens to be attached to an offer (see the "Собственный склад
// (Термо)" audit finding: the supplier name is now correct at the data
// layer, but the filter itself must still come from suppliers, not offers).
export async function listSupplierDirectory(): Promise<SupplierDirectoryEntry[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("suppliers").select("id, name").order("name", { ascending: true });
  return (data ?? []) as SupplierDirectoryEntry[];
}

export type CategoryDirectoryEntry = { id: string; name: string };

export async function listCategoryDirectory(): Promise<CategoryDirectoryEntry[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("product_categories").select("id, name").order("name", { ascending: true });
  return (data ?? []) as CategoryDirectoryEntry[];
}

export async function listSupplierFeed(filters: SupplierFeedFilters = {}): Promise<SupplierFeedRow[]> {
  const supabase = createSupabaseAdminClient();

  const { data: offers, error } = await supabase
    .from("supplier_offers")
    .select(
      "id, supplier_id, supplier_sku, supplier_name_raw, supplier_brand_raw, purchase_price, stock_quantity, is_available, created_at, last_seen_at, product_id, assortment_decision, suppliers ( id, name ), product_master ( id, name, manufacturer_sku, series, category_id, product_categories ( id, name ) )",
    )
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(2000);

  if (error) {
    throw new Error(`Не удалось загрузить предложения поставщиков: ${error.message}`);
  }

  const offerIds = (offers ?? []).map((o) => o.id as string);
  const changeWindowStart = new Date(Date.now() - CHANGE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  type HistoryRow = { supplier_product_id: string; purchase_price: number | null; stock_quantity: number | null; recorded_at: string };

  const { data: history } =
    offerIds.length > 0
      ? await supabase
          .from("supplier_offer_price_history")
          .select("supplier_product_id, purchase_price, stock_quantity, recorded_at")
          .in("supplier_product_id", offerIds)
          .gte("recorded_at", changeWindowStart)
          .order("recorded_at", { ascending: false })
      : { data: [] as HistoryRow[] };

  const historyByOffer = new Map<string, HistoryRow[]>();
  for (const row of (history ?? []) as HistoryRow[]) {
    const list = historyByOffer.get(row.supplier_product_id) ?? [];
    list.push(row);
    historyByOffer.set(row.supplier_product_id, list);
  }

  const newCutoff = Date.now() - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const masterProductIds = Array.from(
    new Set(
      (offers ?? [])
        .map((o) => {
          const master = Array.isArray(o.product_master) ? o.product_master[0] : o.product_master;
          return (master as { id: string } | null)?.id ?? null;
        })
        .filter((id): id is string => Boolean(id)),
    ),
  );

  // seller_sku (the deterministic AXE-{BRAND}-{MODEL}-{VARIANT} identifier)
  // lives on marketplace_publication_items, generated per publication
  // attempt -- not a standing column on commercial_products. Bridge
  // master_product_id -> commercial_products -> publication items.
  const { data: commercialProducts } =
    masterProductIds.length > 0
      ? await supabase.from("commercial_products").select("id, master_product_id").in("master_product_id", masterProductIds)
      : { data: [] as { id: string; master_product_id: string }[] };

  const masterByCommercialId = new Map(
    ((commercialProducts ?? []) as { id: string; master_product_id: string }[]).map((cp) => [cp.id, cp.master_product_id]),
  );
  const commercialProductIds = Array.from(masterByCommercialId.keys());

  const { data: publicationItems } =
    commercialProductIds.length > 0
      ? await supabase
          .from("marketplace_publication_items")
          .select("commercial_product_id, seller_sku")
          .in("commercial_product_id", commercialProductIds)
          .not("seller_sku", "is", null)
      : { data: [] as { commercial_product_id: string; seller_sku: string | null }[] };

  const sellerSkusByMaster = new Map<string, string[]>();
  for (const item of (publicationItems ?? []) as { commercial_product_id: string; seller_sku: string | null }[]) {
    const masterId = masterByCommercialId.get(item.commercial_product_id);
    if (!masterId || !item.seller_sku) continue;
    const list = sellerSkusByMaster.get(masterId) ?? [];
    list.push(item.seller_sku);
    sellerSkusByMaster.set(masterId, list);
  }

  const rows: SupplierFeedRow[] = (offers ?? []).map((offer) => {
    const supplier = Array.isArray(offer.suppliers) ? offer.suppliers[0] : offer.suppliers;
    const master = Array.isArray(offer.product_master) ? offer.product_master[0] : offer.product_master;
    const category = master ? (Array.isArray(master.product_categories) ? master.product_categories[0] : master.product_categories) : null;
    const recentHistory = historyByOffer.get(offer.id as string) ?? [];
    const [latest, previous] = recentHistory;

    const priceChanged = Boolean(latest && previous && latest.purchase_price !== previous.purchase_price);
    const stockChanged = Boolean(latest && previous && latest.stock_quantity !== previous.stock_quantity);

    const decision = offer.assortment_decision as SupplierFeedRow["statusInAxe"] | "pending";
    const statusInAxe: SupplierFeedRow["statusInAxe"] =
      decision !== "pending" ? decision : offer.product_id ? "matched" : "not_matched";
    const masterId = (master as { id: string } | null)?.id ?? null;

    return {
      id: offer.id as string,
      supplierId: (supplier as { id: string } | null)?.id ?? (offer.supplier_id as string),
      supplierName: (supplier as { name: string } | null)?.name ?? "—",
      supplierSku: offer.supplier_sku as string | null,
      nameRaw: offer.supplier_name_raw as string | null,
      brandRaw: offer.supplier_brand_raw as string | null,
      purchasePrice: offer.purchase_price as number | null,
      isAvailable: Boolean(offer.is_available),
      stockQuantity: offer.stock_quantity as number | null,
      lastSeenAt: offer.last_seen_at as string | null,
      createdAt: offer.created_at as string,
      isNew: new Date(offer.created_at as string).getTime() >= newCutoff,
      priceChanged,
      stockChanged,
      statusInAxe,
      masterProductId: (master as { id: string } | null)?.id ?? null,
      masterProductName: (master as { name: string } | null)?.name ?? null,
      manufacturerSku: (master as { manufacturer_sku: string | null } | null)?.manufacturer_sku ?? null,
      series: (master as { series: string | null } | null)?.series ?? null,
      categoryId: (category as { id: string } | null)?.id ?? null,
      categoryName: (category as { name: string } | null)?.name ?? null,
      sellerSkus: masterId ? (sellerSkusByMaster.get(masterId) ?? []) : [],
    };
  });

  const searchLower = filters.search?.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.supplierId && row.supplierId !== filters.supplierId) return false;
    if (filters.brand && row.brandRaw !== filters.brand) return false;
    if (filters.category && row.categoryId !== filters.category) return false;
    if (filters.availability === "available" && !row.isAvailable) return false;
    if (filters.availability === "unavailable" && row.isAvailable) return false;
    if (filters.statusInAxe && row.statusInAxe !== filters.statusInAxe) return false;
    if (filters.onlyNew && !row.isNew) return false;
    if (filters.onlyRemoved && row.isAvailable) return false;
    if (filters.onlyPriceChanged && !row.priceChanged) return false;
    if (filters.onlyStockChanged && !row.stockChanged) return false;
    if (searchLower) {
      const haystack = [row.nameRaw, row.supplierSku, row.manufacturerSku, row.brandRaw, row.series, row.masterProductName, ...row.sellerSkus]
        .filter((v): v is string => Boolean(v))
        .map((v) => v.toLowerCase());
      if (!haystack.some((v) => v.includes(searchLower))) return false;
    }
    return true;
  });
}
