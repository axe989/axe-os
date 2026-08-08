import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { calculateRecommendedSalePrice } from "../pricing/margin";

export type OpportunityRow = {
  id: string;
  supplierName: string;
  nameRaw: string | null;
  brandRaw: string | null;
  purchasePrice: number | null;
  isAvailable: boolean;
  estimatedSalePrice: number | null;
  createdAt: string;
};

export async function listOpportunities(): Promise<OpportunityRow[]> {
  const supabase = createSupabaseAdminClient();

  const [{ data: offers, error }, { data: strategy }] = await Promise.all([
    supabase
      .from("supplier_offers")
      .select("id, supplier_name_raw, supplier_brand_raw, purchase_price, is_available, created_at, suppliers ( name )")
      .eq("assortment_decision", "pending")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("pricing_strategies").select("*").eq("is_active", true).order("created_at", { ascending: true }).limit(1).maybeSingle(),
  ]);

  if (error) {
    throw new Error(`Не удалось загрузить очередь возможностей: ${error.message}`);
  }

  return (offers ?? []).map((offer) => {
    const supplier = Array.isArray(offer.suppliers) ? offer.suppliers[0] : offer.suppliers;
    const purchasePrice = offer.purchase_price as number | null;

    const estimatedSalePrice =
      strategy && purchasePrice !== null
        ? calculateRecommendedSalePrice({
            purchasePrice,
            commissionPercent: strategy.marketplace_commission_percent,
            logisticsCost: strategy.default_logistics_cost,
            advertisingPercent: strategy.default_advertising_percent,
            otherVariableCost: strategy.other_variable_cost,
            targetMarginPercent: strategy.target_margin_percent,
            roundingRule: strategy.rounding_rule,
          })
        : null;

    return {
      id: offer.id as string,
      supplierName: (supplier as { name: string } | null)?.name ?? "—",
      nameRaw: offer.supplier_name_raw as string | null,
      brandRaw: offer.supplier_brand_raw as string | null,
      purchasePrice,
      isAvailable: Boolean(offer.is_available),
      estimatedSalePrice,
      createdAt: offer.created_at as string,
    };
  });
}
