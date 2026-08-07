import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { calculateExpectedMargin, calculateExpectedProfit, classifyMarginStatus } from "../pricing/margin";
import type { MarginStatus } from "../types";

export type MarginReportRow = {
  commercialProductId: string;
  masterProductId: string;
  name: string;
  brandName: string | null;
  purchasePrice: number;
  salePrice: number;
  expectedProfit: number;
  expectedMarginPercent: number;
  marginStatus: MarginStatus;
};

export type MarginReport = {
  hasActiveStrategy: boolean;
  rows: MarginReportRow[];
};

// Current-moment expected margin per Commercial Product, computed live
// from the latest known purchase price (new-condition supplier offer on
// its underlying Master Product) and current marketplace listing sale
// price. Margin is a Commercial Product concept, not a Master Product
// one -- see architecture review §7 (bundle costs aren't yet factored in;
// that's the next refinement once bundle_components pricing is defined).
// Day-count historical metrics from the spec (days below target/minimum,
// expected-vs-actual delta) require periodic product_cost_snapshots
// writes, which aren't automated yet -- see known limitations.
export async function getMarginReport(statusFilter?: string): Promise<MarginReport> {
  const supabase = createSupabaseAdminClient();

  const { data: strategy } = await supabase
    .from("pricing_strategies")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!strategy) {
    return { hasActiveStrategy: false, rows: [] };
  }

  const { data: products } = await supabase
    .from("commercial_products")
    .select("id, commercial_name, master_product_id, product_master ( brand_id, product_brands ( name ) )")
    .neq("status", "archived")
    .limit(2000);

  if (!products || products.length === 0) {
    return { hasActiveStrategy: true, rows: [] };
  }

  const masterProductIds = Array.from(new Set(products.map((p) => p.master_product_id as string)));
  const commercialProductIds = products.map((p) => p.id as string);

  const [{ data: offers }, { data: listings }] = await Promise.all([
    supabase
      .from("supplier_offers")
      .select("product_id, purchase_price, last_seen_at")
      .in("product_id", masterProductIds)
      .eq("product_condition", "new")
      .order("last_seen_at", { ascending: false }),
    supabase
      .from("marketplace_listings")
      .select("commercial_product_id, current_sale_price")
      .in("commercial_product_id", commercialProductIds),
  ]);

  const purchasePriceByMasterProduct = new Map<string, number>();
  for (const offer of offers ?? []) {
    const masterId = offer.product_id as string | null;
    if (masterId && offer.purchase_price !== null && !purchasePriceByMasterProduct.has(masterId)) {
      purchasePriceByMasterProduct.set(masterId, offer.purchase_price as number);
    }
  }

  const salePriceByCommercialProduct = new Map<string, number>();
  for (const listing of listings ?? []) {
    const commercialProductId = listing.commercial_product_id as string | null;
    if (commercialProductId && listing.current_sale_price !== null) {
      salePriceByCommercialProduct.set(commercialProductId, listing.current_sale_price as number);
    }
  }

  const rows: MarginReportRow[] = [];
  for (const product of products) {
    const commercialProductId = product.id as string;
    const masterProductId = product.master_product_id as string;
    const purchasePrice = purchasePriceByMasterProduct.get(masterProductId);
    const salePrice = salePriceByCommercialProduct.get(commercialProductId);
    if (purchasePrice === undefined || salePrice === undefined) continue;

    const profit = calculateExpectedProfit({
      salePrice,
      purchasePrice,
      commissionPercent: strategy.marketplace_commission_percent,
      logisticsCost: strategy.default_logistics_cost,
      advertisingPercent: strategy.default_advertising_percent,
      otherVariableCost: strategy.other_variable_cost,
    });
    const margin = calculateExpectedMargin(profit, salePrice);
    const status = classifyMarginStatus(margin, {
      targetMarginPercent: strategy.target_margin_percent,
      minimumMarginPercent: strategy.minimum_margin_percent,
    });

    const master = Array.isArray(product.product_master) ? product.product_master[0] : product.product_master;
    const brand = master ? (Array.isArray(master.product_brands) ? master.product_brands[0] : master.product_brands) : null;

    rows.push({
      commercialProductId,
      masterProductId,
      name: product.commercial_name as string,
      brandName: (brand as { name: string } | null)?.name ?? null,
      purchasePrice,
      salePrice,
      expectedProfit: profit,
      expectedMarginPercent: margin,
      marginStatus: status,
    });
  }

  const filtered = statusFilter ? rows.filter((r) => r.marginStatus === statusFilter) : rows;
  filtered.sort((a, b) => a.expectedMarginPercent - b.expectedMarginPercent);

  return { hasActiveStrategy: true, rows: filtered };
}
