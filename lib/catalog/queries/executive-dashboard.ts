import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { resolveLaunchChecklist } from "../checklist/resolve-checklist";
import { STAGE_COLUMNS, stageForStatus, type StageKey } from "../production/stages";
import type { ProductWorkflowStatus } from "../types";

const CREATED_WINDOW_DAYS = 30;
const READINESS_BUCKETS = [
  { key: "0-25", label: "0–25%", min: 0, max: 25 },
  { key: "25-50", label: "25–50%", min: 25, max: 50 },
  { key: "50-75", label: "50–75%", min: 50, max: 75 },
  { key: "75-99", label: "75–99%", min: 75, max: 99 },
  { key: "100", label: "100%", min: 100, max: 100 },
] as const;

export type ExecutiveDashboard = {
  totalProducts: number;
  activeProducts: number;
  archivedProducts: number;
  kaspiCoveragePercent: number;
  websiteCoveragePercent: number;
  createdLastWindow: number;
  archivedLastWindow: number;
  publishedProducts: number;
  awaitingLaunch: number;
  awaitingBusinessDecision: number;
  commercialOpportunities: number;
  readinessDistribution: { label: string; count: number }[];
  launchPipeline: { label: string; count: number }[];
};

// Real KPI queries against real tables -- deliberately not the mockup
// shown in the approved business architecture doc (that page explicitly
// avoided invented numbers). This is the actual implementation.
export async function getExecutiveDashboard(): Promise<ExecutiveDashboard> {
  const supabase = createSupabaseAdminClient();
  const windowStart = new Date(Date.now() - CREATED_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: products, error }, { data: archivedHistory }, { data: pendingOffers }, { data: kaspiListings }, { data: websiteListings }] =
    await Promise.all([
      supabase.from("commercial_products").select("id, status, assortment_status, created_at"),
      supabase
        .from("product_status_history")
        .select("id")
        .eq("change_type", "assortment_status")
        .eq("new_value", "archived")
        .gte("created_at", windowStart),
      supabase.from("supplier_offers").select("id").eq("assortment_decision", "pending"),
      supabase.from("marketplace_listings").select("commercial_product_id").eq("sales_channel", "kaspi").not("commercial_product_id", "is", null),
      supabase.from("marketplace_listings").select("commercial_product_id").eq("sales_channel", "website").not("commercial_product_id", "is", null),
    ]);

  if (error) {
    throw new Error(`Не удалось загрузить панель руководителя: ${error.message}`);
  }

  const all = products ?? [];
  const activeProducts = all.filter((p) => p.assortment_status !== "archived" && p.status !== "archived");
  const archivedProducts = all.filter((p) => p.assortment_status === "archived" || p.status === "archived");
  const publishedProducts = all.filter((p) => p.status === "published");
  const awaitingLaunch = all.filter((p) => p.status === "ready_to_publish");
  const commercialOpportunities = all.filter((p) => p.assortment_status === "candidate");
  const createdLastWindow = all.filter((p) => new Date(p.created_at as string).getTime() >= new Date(windowStart).getTime());

  const kaspiCoveredIds = new Set((kaspiListings ?? []).map((l) => l.commercial_product_id as string));
  const websiteCoveredIds = new Set((websiteListings ?? []).map((l) => l.commercial_product_id as string));

  const pipelineCounts = new Map<StageKey, number>(STAGE_COLUMNS.map((c) => [c.key, 0]));
  for (const product of activeProducts) {
    const stage = stageForStatus(product.status as ProductWorkflowStatus);
    pipelineCounts.set(stage, (pipelineCounts.get(stage) ?? 0) + 1);
  }

  const readinessResults = await Promise.all(
    activeProducts.map((p) => resolveLaunchChecklist(supabase, { commercialProductId: p.id as string })),
  );
  const readinessDistribution = READINESS_BUCKETS.map((bucket) => ({
    label: bucket.label,
    count: readinessResults.filter((r) => r.completionPercent >= bucket.min && r.completionPercent <= bucket.max).length,
  }));

  return {
    totalProducts: all.length,
    activeProducts: activeProducts.length,
    archivedProducts: archivedProducts.length,
    kaspiCoveragePercent: activeProducts.length > 0 ? Math.round((kaspiCoveredIds.size / activeProducts.length) * 100) : 0,
    websiteCoveragePercent: activeProducts.length > 0 ? Math.round((websiteCoveredIds.size / activeProducts.length) * 100) : 0,
    createdLastWindow: createdLastWindow.length,
    archivedLastWindow: (archivedHistory ?? []).length,
    publishedProducts: publishedProducts.length,
    awaitingLaunch: awaitingLaunch.length,
    awaitingBusinessDecision: (pendingOffers ?? []).length,
    commercialOpportunities: commercialOpportunities.length,
    readinessDistribution,
    launchPipeline: STAGE_COLUMNS.map((c) => ({ label: c.label, count: pipelineCounts.get(c.key) ?? 0 })),
  };
}
