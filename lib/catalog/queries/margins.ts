import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { calculateExpectedMargin, calculateExpectedProfit, classifyMarginStatus } from "../pricing/margin";
import type { MarginStatus } from "../types";

export type MarginReportRow = {
  productId: string;
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

// Current-moment expected margin per product, computed live from the
// latest known purchase price (new-condition supplier offer) and current
// channel sale price. Day-count historical metrics from the spec (days
// below target/minimum, expected-vs-actual delta) require periodic
// product_cost_snapshots writes, which aren't automated yet -- see
// known limitations in the final report.
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
    .from("product_master")
    .select("id, name, product_brands ( name )")
    .neq("status", "archived")
    .limit(2000);

  if (!products || products.length === 0) {
    return { hasActiveStrategy: true, rows: [] };
  }

  const productIds = products.map((p) => p.id as string);

  const [{ data: offers }, { data: listings }] = await Promise.all([
    supabase
      .from("supplier_offers")
      .select("product_id, purchase_price, last_seen_at")
      .in("product_id", productIds)
      .eq("product_condition", "new")
      .order("last_seen_at", { ascending: false }),
    supabase.from("channel_listings").select("product_id, current_sale_price").in("product_id", productIds),
  ]);

  const purchasePriceByProduct = new Map<string, number>();
  for (const offer of offers ?? []) {
    const productId = offer.product_id as string | null;
    if (productId && offer.purchase_price !== null && !purchasePriceByProduct.has(productId)) {
      purchasePriceByProduct.set(productId, offer.purchase_price as number);
    }
  }

  const salePriceByProduct = new Map<string, number>();
  for (const listing of listings ?? []) {
    const productId = listing.product_id as string | null;
    if (productId && listing.current_sale_price !== null) {
      salePriceByProduct.set(productId, listing.current_sale_price as number);
    }
  }

  const rows: MarginReportRow[] = [];
  for (const product of products) {
    const purchasePrice = purchasePriceByProduct.get(product.id as string);
    const salePrice = salePriceByProduct.get(product.id as string);
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

    const brand = Array.isArray(product.product_brands) ? product.product_brands[0] : product.product_brands;

    rows.push({
      productId: product.id as string,
      name: product.name as string,
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
