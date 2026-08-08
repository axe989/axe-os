import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { resolveLaunchChecklist } from "../checklist/resolve-checklist";
import { LAUNCH_TEAM_LABELS } from "../checklist/labels";
import type { ProductWorkflowStatus } from "../types";

export type ProductDevelopmentRow = {
  commercialProductId: string;
  commercialName: string;
  masterProductName: string;
  brandName: string | null;
  status: ProductWorkflowStatus;
  checklistCompletionPercent: number;
  nextActionLabel: string | null;
  nextActionTeam: string | null;
  targetDate: string | null;
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
    throw new Error(`Не удалось загрузить производство товара: ${error.message}`);
  }

  const rows = await Promise.all(
    (products ?? []).map(async (product) => {
      const master = Array.isArray(product.product_master) ? product.product_master[0] : product.product_master;
      const brand = master ? (Array.isArray(master.product_brands) ? master.product_brands[0] : master.product_brands) : null;

      const checklist = await resolveLaunchChecklist(supabase, { commercialProductId: product.id as string });
      const nextItem = checklist.items.find((item) => item.status !== "done" && item.status !== "not_applicable") ?? null;

      return {
        commercialProductId: product.id as string,
        commercialName: product.commercial_name as string,
        masterProductName: (master as { name: string } | null)?.name ?? "—",
        brandName: (brand as { name: string } | null)?.name ?? null,
        status: product.status as ProductWorkflowStatus,
        checklistCompletionPercent: checklist.completionPercent,
        nextActionLabel: nextItem?.label ?? null,
        nextActionTeam: nextItem ? LAUNCH_TEAM_LABELS[nextItem.team] : null,
        targetDate: nextItem?.targetDate ?? null,
      };
    }),
  );

  return rows;
}
