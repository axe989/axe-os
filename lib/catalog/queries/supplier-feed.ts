import { createSupabaseAdminClient } from "@/lib/supabase/server";

const NEW_WINDOW_DAYS = 14;
const CHANGE_WINDOW_DAYS = 14;

export type SupplierFeedRow = {
  id: string;
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
};

export type SupplierFeedFilters = {
  supplierId?: string;
  brand?: string;
  availability?: "available" | "unavailable";
  onlyNew?: boolean;
  onlyRemoved?: boolean;
  onlyPriceChanged?: boolean;
  onlyStockChanged?: boolean;
  search?: string;
};

export async function listSupplierFeed(filters: SupplierFeedFilters = {}): Promise<SupplierFeedRow[]> {
  const supabase = createSupabaseAdminClient();

  const { data: offers, error } = await supabase
    .from("supplier_offers")
    .select(
      "id, supplier_sku, supplier_name_raw, supplier_brand_raw, purchase_price, stock_quantity, is_available, created_at, last_seen_at, product_id, assortment_decision, suppliers ( id, name )",
    )
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(2000);

  if (error) {
    throw new Error(`Не удалось загрузить ленту поставщиков: ${error.message}`);
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

  const rows: SupplierFeedRow[] = (offers ?? []).map((offer) => {
    const supplier = Array.isArray(offer.suppliers) ? offer.suppliers[0] : offer.suppliers;
    const recentHistory = historyByOffer.get(offer.id as string) ?? [];
    const [latest, previous] = recentHistory;

    const priceChanged = Boolean(latest && previous && latest.purchase_price !== previous.purchase_price);
    const stockChanged = Boolean(latest && previous && latest.stock_quantity !== previous.stock_quantity);

    const decision = offer.assortment_decision as SupplierFeedRow["statusInAxe"] | "pending";
    const statusInAxe: SupplierFeedRow["statusInAxe"] =
      decision !== "pending" ? decision : offer.product_id ? "matched" : "not_matched";

    return {
      id: offer.id as string,
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
    };
  });

  const searchLower = filters.search?.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.brand && row.brandRaw !== filters.brand) return false;
    if (filters.availability === "available" && !row.isAvailable) return false;
    if (filters.availability === "unavailable" && row.isAvailable) return false;
    if (filters.onlyNew && !row.isNew) return false;
    if (filters.onlyRemoved && row.isAvailable) return false;
    if (filters.onlyPriceChanged && !row.priceChanged) return false;
    if (filters.onlyStockChanged && !row.stockChanged) return false;
    if (
      searchLower &&
      !row.nameRaw?.toLowerCase().includes(searchLower) &&
      !row.supplierSku?.toLowerCase().includes(searchLower)
    ) {
      return false;
    }
    return true;
  });
}
