import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { calculateRecommendedSalePrice } from "../pricing/margin";

export type OpportunityRow = {
  id: string;
  supplierName: string;
  nameRaw: string | null;
  brandRaw: string | null;
  categoryName: string | null;
  purchasePrice: number | null;
  isAvailable: boolean;
  estimatedSalePrice: number | null;
  createdAt: string;
  // "Представлен в AXE?" -- has a Base Product already been matched to
  // this offer (the matching engine can do this before a human decision
  // is made; see product_matches), independent of the decision itself.
  representedInAxe: boolean;
  // "Представлен на Marketplace?" -- does that matched product already
  // have at least one marketplace listing.
  representedOnMarketplace: boolean;
};

export async function listOpportunities(): Promise<OpportunityRow[]> {
  const supabase = createSupabaseAdminClient();

  const [{ data: offers, error }, { data: strategy }] = await Promise.all([
    supabase
      .from("supplier_offers")
      .select(
        "id, supplier_name_raw, supplier_brand_raw, purchase_price, is_available, created_at, product_id, suppliers ( name ), product_master ( id, category_id, product_categories ( name ) )",
      )
      .eq("assortment_decision", "pending")
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase.from("pricing_strategies").select("*").eq("is_active", true).order("created_at", { ascending: true }).limit(1).maybeSingle(),
  ]);

  if (error) {
    throw new Error(`Не удалось загрузить товары на рассмотрении: ${error.message}`);
  }

  const masterProductIds = Array.from(
    new Set(
      (offers ?? [])
        .map((o) => o.product_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const { data: listings } =
    masterProductIds.length > 0
      ? await supabase
          .from("commercial_products")
          .select("master_product_id, marketplace_listings ( id )")
          .in("master_product_id", masterProductIds)
      : { data: [] as { master_product_id: string; marketplace_listings: { id: string }[] }[] };

  const hasListingByMaster = new Set<string>();
  for (const cp of (listings ?? []) as { master_product_id: string; marketplace_listings: { id: string }[] | null }[]) {
    if (cp.marketplace_listings && cp.marketplace_listings.length > 0) {
      hasListingByMaster.add(cp.master_product_id);
    }
  }

  return (offers ?? []).map((offer) => {
    const supplier = Array.isArray(offer.suppliers) ? offer.suppliers[0] : offer.suppliers;
    const master = Array.isArray(offer.product_master) ? offer.product_master[0] : offer.product_master;
    const category = master ? (Array.isArray(master.product_categories) ? master.product_categories[0] : master.product_categories) : null;
    const purchasePrice = offer.purchase_price as number | null;
    const masterProductId = offer.product_id as string | null;

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
      categoryName: (category as { name: string } | null)?.name ?? null,
      purchasePrice,
      isAvailable: Boolean(offer.is_available),
      estimatedSalePrice,
      createdAt: offer.created_at as string,
      representedInAxe: Boolean(masterProductId),
      representedOnMarketplace: masterProductId ? hasListingByMaster.has(masterProductId) : false,
    };
  });
}
