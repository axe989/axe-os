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
  // Base Products (product_master) -- the canonical physical-item
  // identity, one row per real-world item regardless of how many
  // sellable packagings (Commercial Products) it produces.
  baseProductCount: number;
  // Commercial Products (commercial_products) -- sellable packagings.
  // Deliberately a different number from baseProductCount: one Base
  // Product can have several (e.g. single-unit vs. set-of-N bundle).
  commercialProductCount: number;
  activeProducts: number;
  archivedProducts: number;
  // Marketplace Listings (marketplace_listings, all channels) -- rows
  // observed FROM a channel, independent of catalog reconciliation. See
  // /product-center-v2/marketplace for the full breakdown; this is just
  // the topline total.
  marketplaceListingCount: number;
  kaspiCoveragePercent: number;
  websiteCoveragePercent: number;
  createdLastWindow: number;
  archivedLastWindow: number;
  publishedLastWindow: number;
  publishedProducts: number;
  awaitingLaunch: number;
  awaitingBusinessDecision: number;
  inPreparation: number;
  commercialOpportunities: number;
  readinessDistribution: { label: string; count: number }[];
  launchPipeline: { label: string; stage: StageKey; count: number }[];
};

// Real KPI queries against real tables -- deliberately not the mockup
// shown in the approved business architecture doc (that page explicitly
// avoided invented numbers). This is the actual implementation. See
// lib/catalog/metrics/dictionary.ts for the plain-language definition of
// every one of these fields.
export async function getExecutiveDashboard(): Promise<ExecutiveDashboard> {
  const supabase = createSupabaseAdminClient();
  const windowStart = new Date(Date.now() - CREATED_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: products, error },
    { data: archivedHistory },
    { data: publishedHistory },
    { data: pendingOffers },
    { data: kaspiListings },
    { data: websiteListings },
    { count: masterProductCount },
    { count: marketplaceListingCount },
  ] = await Promise.all([
    supabase.from("commercial_products").select("id, status, assortment_status, created_at"),
    supabase
      .from("product_status_history")
      .select("id")
      .eq("change_type", "assortment_status")
      .eq("new_value", "archived")
      .gte("created_at", windowStart),
    supabase
      .from("product_status_history")
      .select("id")
      .eq("change_type", "status")
      .eq("new_value", "published")
      .gte("created_at", windowStart),
    supabase.from("supplier_offers").select("id").eq("assortment_decision", "pending"),
    supabase.from("marketplace_listings").select("commercial_product_id").eq("sales_channel", "kaspi").not("commercial_product_id", "is", null),
    supabase.from("marketplace_listings").select("commercial_product_id").eq("sales_channel", "website").not("commercial_product_id", "is", null),
    supabase.from("product_master").select("id", { count: "exact", head: true }),
    supabase.from("marketplace_listings").select("id", { count: "exact", head: true }),
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
  const inPreparation = activeProducts.filter((p) => p.status !== "ready_to_publish" && p.status !== "published");

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
    baseProductCount: masterProductCount ?? 0,
    commercialProductCount: all.length,
    activeProducts: activeProducts.length,
    archivedProducts: archivedProducts.length,
    marketplaceListingCount: marketplaceListingCount ?? 0,
    kaspiCoveragePercent: activeProducts.length > 0 ? Math.round((kaspiCoveredIds.size / activeProducts.length) * 100) : 0,
    websiteCoveragePercent: activeProducts.length > 0 ? Math.round((websiteCoveredIds.size / activeProducts.length) * 100) : 0,
    createdLastWindow: createdLastWindow.length,
    archivedLastWindow: (archivedHistory ?? []).length,
    publishedLastWindow: (publishedHistory ?? []).length,
    publishedProducts: publishedProducts.length,
    awaitingLaunch: awaitingLaunch.length,
    awaitingBusinessDecision: (pendingOffers ?? []).length,
    inPreparation: inPreparation.length,
    commercialOpportunities: commercialOpportunities.length,
    readinessDistribution,
    launchPipeline: STAGE_COLUMNS.map((c) => ({ label: c.label, stage: c.key, count: pipelineCounts.get(c.key) ?? 0 })),
  };
}
