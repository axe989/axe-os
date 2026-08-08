import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { resolveLaunchChecklist } from "../checklist/resolve-checklist";
import { LAUNCH_TEAM_LABELS } from "../checklist/labels";
import { pickNextAction, nextActionLabelFor } from "../checklist/next-action";
import type { ProductWorkflowStatus } from "../types";

export type ProductDevelopmentRow = {
  commercialProductId: string;
  commercialName: string;
  masterProductName: string;
  brandName: string | null;
  status: ProductWorkflowStatus;
  purchasePrice: number | null;
  salePrice: number | null;
  marginPercent: number | null;
  checklistCompletionPercent: number;
  nextActionLabel: string | null;
  nextActionTeam: string | null;
  targetDate: string | null;
  listingCount: number;
};

// One resolveLaunchChecklist call per row -- real, correct, and fine at
// pilot scale (verified against the real dataset: a handful of
// commercial products). Fetching hundreds of thousands of rows this way
// would need pagination/caching first; that's Year 2+ scale per the
// approved business architecture, not Phase 1.
export async function listProductDevelopment(): Promise<ProductDevelopmentRow[]> {
  const supabase = createSupabaseAdminClient();

  const { data: products, error } = await supabase
    .from("commercial_products")
    .select(
      "id, commercial_name, status, master_product_id, product_master ( name, brand_id, product_brands ( name ) )",
    )
    .not("status", "eq", "archived")
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(`Не удалось загрузить подготовку товаров: ${error.message}`);
  }

  const rows = await Promise.all(
    (products ?? []).map(async (product) => {
      const master = Array.isArray(product.product_master) ? product.product_master[0] : product.product_master;
      const brand = master ? (Array.isArray(master.product_brands) ? master.product_brands[0] : master.product_brands) : null;
      const masterProductId = product.master_product_id as string;
      const commercialProductId = product.id as string;

      const [checklist, { data: supplierOffers }, { data: priceHistory }, { data: costSnapshot }, { data: listings }] = await Promise.all([
        resolveLaunchChecklist(supabase, { commercialProductId }),
        supabase.from("supplier_offers").select("purchase_price").eq("product_id", masterProductId).order("last_seen_at", { ascending: false }).limit(1),
        supabase.from("channel_price_history").select("sale_price").eq("product_id", masterProductId).is("valid_to", null).order("recorded_at", { ascending: false }).limit(1),
        supabase.from("product_cost_snapshots").select("expected_margin_percent").eq("product_id", masterProductId).order("calculated_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("marketplace_listings").select("id").eq("commercial_product_id", commercialProductId),
      ]);

      const nextItem = pickNextAction(checklist);

      return {
        commercialProductId,
        commercialName: product.commercial_name as string,
        masterProductName: (master as { name: string } | null)?.name ?? "—",
        brandName: (brand as { name: string } | null)?.name ?? null,
        status: product.status as ProductWorkflowStatus,
        purchasePrice: (supplierOffers?.[0]?.purchase_price as number | null) ?? null,
        salePrice: (priceHistory?.[0]?.sale_price as number | null) ?? null,
        marginPercent: (costSnapshot?.expected_margin_percent as number | null) ?? null,
        checklistCompletionPercent: checklist.completionPercent,
        nextActionLabel: nextItem ? nextActionLabelFor(nextItem) : null,
        nextActionTeam: nextItem ? LAUNCH_TEAM_LABELS[nextItem.team] : null,
        targetDate: nextItem?.targetDate ?? null,
        listingCount: (listings ?? []).length,
      };
    }),
  );

  return rows;
}
