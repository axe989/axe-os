import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveProductReadiness } from "../readiness/resolve-readiness";
import { calculateLaunchChecklist, type AutoSignal, type ManualOverlay } from "./calculate-checklist";
import type { LaunchChecklist } from "./types";
import type { ReadinessDimensionResult } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

function fromDimension(
  dimension: ReadinessDimensionResult | undefined,
  key: string,
  whenMissing: "blocked" | "pending",
): AutoSignal {
  if (!dimension) {
    return { key, status: whenMissing, note: null };
  }
  const status = dimension.status === "complete" ? "done" : dimension.status === "partial" ? "blocked" : whenMissing;
  return { key, status, note: dimension.issues[0]?.message ?? null };
}

// Combines the Readiness Engine's existing signals (supplier/pricing/
// media/content/marketplace_attributes/technical_specs/bundle -- see
// lib/catalog/readiness/) with the two signals only the publication
// pipeline knows about (has a validated export happened, has a listing
// been confirmed live via XML reconciliation), plus the manual
// operational overlay (target dates, blocking notes, manual overrides)
// stored in commercial_product_launch_tasks.
export async function resolveLaunchChecklist(
  supabase: AnySupabase,
  params: { commercialProductId: string; salesChannel?: string },
): Promise<LaunchChecklist> {
  const salesChannel = params.salesChannel ?? "kaspi";

  const readiness = await resolveProductReadiness(supabase, {
    commercialProductId: params.commercialProductId,
    salesChannel,
  });
  const dimensionByKey = new Map(readiness.dimensions.map((d) => [d.dimension, d]));

  const { data: commercialProduct } = await supabase
    .from("commercial_products")
    .select("assortment_status, master_product_id")
    .eq("id", params.commercialProductId)
    .single();

  const { data: linkedSupplierOffers } = commercialProduct
    ? await supabase
        .from("supplier_offers")
        .select("purchase_price, assortment_decision")
        .eq("product_id", commercialProduct.master_product_id)
    : { data: [] as { purchase_price: number | null; assortment_decision: string }[] };

  const { data: publicationItems } = await supabase
    .from("marketplace_publication_items")
    .select("status, validation_errors, created_at")
    .eq("commercial_product_id", params.commercialProductId)
    .eq("sales_channel", salesChannel)
    .order("created_at", { ascending: false })
    .limit(1);
  const latestPublicationItem = publicationItems?.[0] ?? null;

  // The real decision record lives on the supplier offer(s) that fed this
  // product (see lib/catalog/assortment/decide.ts), not on
  // commercial_products.assortment_status -- that column defaults to
  // "candidate" for every newly created product regardless of whether a
  // decision was ever made, so it can't answer "was this accepted".
  const assortmentStatus = (commercialProduct?.assortment_status as string | undefined) ?? "candidate";
  const hasAcceptedOffer = (linkedSupplierOffers ?? []).some((o) => o.assortment_decision === "accepted");

  const assortmentDecisionSignal: AutoSignal =
    assortmentStatus === "excluded" || assortmentStatus === "archived"
      ? { key: "assortment_decision_confirmed", status: "blocked", note: "Коммерческий товар исключён из ассортимента" }
      : hasAcceptedOffer
        ? { key: "assortment_decision_confirmed", status: "done", note: null }
        : { key: "assortment_decision_confirmed", status: "pending", note: "Решение об ассортименте ещё не принято" };

  const purchasePriceSignal: AutoSignal =
    (linkedSupplierOffers ?? []).some((o) => o.purchase_price !== null)
      ? { key: "purchase_price_confirmed", status: "done", note: null }
      : { key: "purchase_price_confirmed", status: "pending", note: "Поставщик пока не передал закупочную цену" };

  let validationExportSignal: AutoSignal;
  let listingConfirmedSignal: AutoSignal;

  if (!latestPublicationItem) {
    validationExportSignal = { key: "validation_export", status: "pending", note: "Позиция публикации ещё не создана" };
    listingConfirmedSignal = { key: "listing_confirmed", status: "pending", note: "Публикация ещё не выполнена" };
  } else {
    const status = latestPublicationItem.status as string;
    if (["exported", "uploaded", "published", "ready_for_export"].includes(status)) {
      validationExportSignal = { key: "validation_export", status: "done", note: null };
    } else if (status === "archived") {
      validationExportSignal = { key: "validation_export", status: "pending", note: "Публикация архивирована" };
    } else {
      const errors = (latestPublicationItem.validation_errors as { message: string }[] | null) ?? [];
      validationExportSignal = {
        key: "validation_export",
        status: "blocked",
        note: errors[0]?.message ?? "Есть ошибки валидации",
      };
    }

    if (status === "published") {
      listingConfirmedSignal = { key: "listing_confirmed", status: "done", note: null };
    } else if (status === "exported" || status === "uploaded") {
      listingConfirmedSignal = { key: "listing_confirmed", status: "pending", note: "Ожидает подтверждения через импорт XML Kaspi" };
    } else {
      listingConfirmedSignal = { key: "listing_confirmed", status: "pending", note: "Публикация ещё не выполнена" };
    }
  }

  const autoSignals: AutoSignal[] = [
    assortmentDecisionSignal,
    fromDimension(dimensionByKey.get("supplier"), "supplier_available", "blocked"),
    fromDimension(dimensionByKey.get("pricing"), "sale_price_set", "pending"),
    purchasePriceSignal,
    fromDimension(dimensionByKey.get("content"), "title_description", "pending"),
    fromDimension(dimensionByKey.get("media"), "primary_photo_gallery", "blocked"),
    fromDimension(dimensionByKey.get("marketplace_attributes"), "category_attributes", "blocked"),
    fromDimension(dimensionByKey.get("technical_specs"), "technical_specs", "blocked"),
    fromDimension(dimensionByKey.get("bundle"), "bundle_defined", "blocked"),
    validationExportSignal,
    listingConfirmedSignal,
  ];

  const { data: overlayRows } = await supabase
    .from("commercial_product_launch_tasks")
    .select("item_key, target_date, status_override, blocking_note, completed_at")
    .eq("commercial_product_id", params.commercialProductId);

  const overlays: ManualOverlay[] = (overlayRows ?? []).map((row) => ({
    key: row.item_key as string,
    targetDate: row.target_date as string | null,
    statusOverride: row.status_override as ManualOverlay["statusOverride"],
    blockingNote: row.blocking_note as string | null,
    completedAt: row.completed_at as string | null,
  }));

  return calculateLaunchChecklist(autoSignals, overlays);
}
