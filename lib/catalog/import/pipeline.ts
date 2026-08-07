import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { computeFileHash } from "./hash";
import { isBlankRow, loadWorkbook, sheetToRows } from "./workbook";
import {
  aggregateSupplierStockRows,
  normalizeSupplierStockRow,
  type AggregatedSupplierStockGroup,
  type SupplierStockColumnMapping,
} from "./supplier-stock";
import { normalizeChannelCatalogRow, type ChannelCatalogColumnMapping } from "./channel-catalog";
import { hasChannelPriceChanged, hasSupplierOfferChanged } from "./diff";
import { fetchProductCandidates } from "./matching-service";
import { matchSupplierOffer, type MatchOfferInput } from "../matching/engine";

export type ImportSummary = {
  importId: string;
  status: "completed" | "completed_with_errors" | "failed";
  rowsTotal: number;
  rowsImported: number;
  rowsSkippedUnchanged: number;
  rowsRejected: number;
  matchSummary: Record<string, number>;
};

// Everything below is batched into a handful of bulk requests rather than
// one round-trip per row. An earlier row-by-row version made ~4-6
// sequential Supabase requests per row, which against a hosted project
// (~250ms RTT) turned a 799-row file into a 20+ minute run and, in
// practice, occasionally hung or failed outright on a stalled connection
// partway through. Batching cuts a ~800-row import to roughly a dozen
// requests total.
const CHUNK_SIZE = 400;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function guardAgainstInFlightDuplicate(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  fileHash: string,
  worksheetName: string | null,
) {
  const query = supabase
    .from("catalog_imports")
    .select("id, status")
    .eq("file_hash", fileHash)
    .in("status", ["pending", "processing"]);

  const { data } = worksheetName
    ? await query.eq("worksheet_name", worksheetName)
    : await query;

  if (data && data.length > 0) {
    throw new Error(
      "Этот файл уже обрабатывается (импорт в процессе). Дождитесь завершения перед повторной загрузкой.",
    );
  }
}

async function markImportFailed(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  importId: string,
) {
  await supabase
    .from("catalog_imports")
    .update({ status: "failed", completed_at: new Date().toISOString() })
    .eq("id", importId);
}

export async function runSupplierStockImport(params: {
  fileBuffer: Buffer;
  fileName: string;
  worksheetName: string;
  supplierId: string;
  headerRowIndex: number;
  columnMapping: SupplierStockColumnMapping;
  importedBy?: string | null;
}): Promise<ImportSummary> {
  const supabase = createSupabaseAdminClient();
  const fileHash = computeFileHash(params.fileBuffer);

  await guardAgainstInFlightDuplicate(supabase, fileHash, params.worksheetName);

  const workbook = await loadWorkbook(params.fileBuffer);
  const rows = sheetToRows(workbook, params.worksheetName);
  // Real exports often have trailing blank rows within the sheet's used
  // range (e.g. Excel's tracked dimensions outlive the actual data) --
  // skip them entirely rather than recording and rejecting each one.
  const dataRows = rows
    .slice(params.headerRowIndex + 1)
    .map((row, i) => ({ row, sourceRowNumber: params.headerRowIndex + 2 + i }))
    .filter(({ row }) => !isBlankRow(row));

  const { data: importRow, error: importError } = await supabase
    .from("catalog_imports")
    .insert({
      import_type: "supplier_stock",
      source_name: params.fileName,
      supplier_id: params.supplierId,
      file_name: params.fileName,
      file_hash: fileHash,
      worksheet_name: params.worksheetName,
      status: "processing",
      rows_total: dataRows.length,
      imported_by: params.importedBy ?? null,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (importError || !importRow) {
    throw new Error(`Не удалось создать запись импорта: ${importError?.message}`);
  }

  const importId = importRow.id as string;

  try {
    // Pass 1: normalize + validate every raw row (pure, in-memory).
    type ValidEntry = {
      row: (typeof dataRows)[number]["row"];
      sourceRowNumber: number;
      normalized: ReturnType<typeof normalizeSupplierStockRow>;
    };
    const validEntries: ValidEntry[] = [];
    const catalogImportRowsToInsert: Record<string, unknown>[] = [];

    let rowsRejected = 0;

    for (const { row, sourceRowNumber } of dataRows) {
      const normalized = normalizeSupplierStockRow(row, params.columnMapping);

      if (normalized.validationErrors.length > 0) {
        rowsRejected += 1;
        catalogImportRowsToInsert.push({
          import_id: importId,
          source_row_number: sourceRowNumber,
          raw_payload: { row },
          normalized_payload: normalized,
          import_status: "rejected",
          validation_errors: normalized.validationErrors,
        });
        continue;
      }

      validEntries.push({ row, sourceRowNumber, normalized });
    }

    // Pass 2: group by (supplier_sku, condition) -- multiple stock lots of
    // the same SKU+condition must converge to one deterministic value per
    // run (see aggregateSupplierStockRows for the real-data case this
    // fixes: idempotency breaks otherwise).
    const entryGroups = new Map<string, ValidEntry[]>();
    for (const entry of validEntries) {
      const key = `${entry.normalized.supplierSku ?? ""}::${entry.normalized.condition}`;
      const group = entryGroups.get(key);
      if (group) group.push(entry);
      else entryGroups.set(key, [entry]);
    }

    type GroupWithAggregate = {
      key: string;
      group: ValidEntry[];
      aggregate: AggregatedSupplierStockGroup;
    };
    const groupsWithAggregate: GroupWithAggregate[] = Array.from(entryGroups.entries()).map(
      ([key, group]) => {
        const [aggregate] = aggregateSupplierStockRows(group.map((e) => e.normalized)) as [
          AggregatedSupplierStockGroup,
        ];
        return { key, group, aggregate };
      },
    );

    // One bulk fetch of everything this supplier already has, instead of
    // one SELECT per group.
    const { data: existingOffers } = await supabase
      .from("supplier_offers")
      .select("id, supplier_sku, product_condition, purchase_price, stock_quantity")
      .eq("supplier_id", params.supplierId);

    const existingByKey = new Map(
      (existingOffers ?? []).map((o) => [`${o.supplier_sku ?? ""}::${o.product_condition}`, o]),
    );

    const nowIso = new Date().toISOString();
    let rowsImported = 0;
    let rowsSkippedUnchanged = 0;

    const offerUpsertPayload = groupsWithAggregate.map(({ key, aggregate, group }) => {
      const { representative } = aggregate;
      const isSaleable = representative.isSaleable;
      const changed = hasSupplierOfferChanged(existingByKey.get(key) ?? null, {
        purchase_price: aggregate.purchasePrice,
        stock_quantity: aggregate.stockQuantity,
        product_condition: aggregate.condition,
      });

      if (changed) rowsImported += group.length;
      else rowsSkippedUnchanged += group.length;

      return {
        key,
        changed,
        payload: {
          supplier_id: params.supplierId,
          supplier_sku: aggregate.supplierSku,
          supplier_name_raw: representative.nameRaw,
          supplier_brand_raw: representative.brandRaw,
          purchase_price: aggregate.purchasePrice,
          currency: "KZT",
          stock_quantity: aggregate.stockQuantity,
          available_quantity: isSaleable ? aggregate.stockQuantity : 0,
          is_available: isSaleable && (aggregate.stockQuantity ?? 0) > 0,
          product_condition: aggregate.condition,
          source_import_id: importId,
          raw_payload: {
            rows: group.map((e) => e.row),
            lotCount: group.length,
            radiator: representative.radiator,
          },
          source_updated_at: nowIso,
          last_seen_at: nowIso,
          updated_at: nowIso,
        },
      };
    });

    // Upsert never includes product_id -- an existing row's match link
    // (including a human-reviewed one) must never be silently overwritten
    // by a stock/price refresh (spec: "Do not silently overwrite
    // human-reviewed matches").
    const offerIdByKey = new Map<string, string>();
    for (const batch of chunk(offerUpsertPayload, CHUNK_SIZE)) {
      const { data: upserted, error: upsertError } = await supabase
        .from("supplier_offers")
        .upsert(
          batch.map((b) => b.payload),
          { onConflict: "supplier_id,supplier_sku,product_condition" },
        )
        .select("id, supplier_sku, product_condition");

      if (upsertError) {
        throw new Error(`Не удалось сохранить предложения поставщика: ${upsertError.message}`);
      }

      for (const row of upserted ?? []) {
        offerIdByKey.set(`${row.supplier_sku ?? ""}::${row.product_condition}`, row.id as string);
      }
    }

    const priceHistoryRows = offerUpsertPayload
      .filter((b) => b.changed)
      .map((b) => {
        const offerId = offerIdByKey.get(b.key);
        return offerId
          ? {
              supplier_product_id: offerId,
              purchase_price: b.payload.purchase_price,
              currency: "KZT",
              stock_quantity: b.payload.stock_quantity,
              product_condition: b.payload.product_condition,
              source_import_id: importId,
            }
          : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    for (const batch of chunk(priceHistoryRows, CHUNK_SIZE)) {
      if (batch.length === 0) continue;
      const { error } = await supabase.from("supplier_offer_price_history").insert(batch);
      if (error) throw new Error(`Не удалось сохранить историю цен: ${error.message}`);
    }

    for (const { key, changed, group: entries } of groupsWithAggregate.map((g, idx) => ({
      ...g,
      changed: offerUpsertPayload[idx].changed,
    }))) {
      for (const entry of entries) {
        catalogImportRowsToInsert.push({
          import_id: importId,
          source_row_number: entry.sourceRowNumber,
          raw_payload: { row: entry.row },
          normalized_payload: entry.normalized,
          import_status: changed ? "imported" : "skipped_unchanged",
          validation_errors: [],
        });
      }
      void key;
    }

    for (const batch of chunk(catalogImportRowsToInsert, CHUNK_SIZE)) {
      if (batch.length === 0) continue;
      const { error } = await supabase.from("catalog_import_rows").insert(batch);
      if (error) throw new Error(`Не удалось сохранить строки импорта: ${error.message}`);
    }

    // --- Matching: computed in memory (pure function), only the results
    // are written to the DB, and only for offers not already
    // human-reviewed. ---
    const touchedOfferIds = Array.from(offerIdByKey.values());
    const matchSummary: Record<string, number> = {};

    const [{ data: brands }, candidates, lockedMatches] = await Promise.all([
      supabase.from("product_brands").select("id, normalized_name"),
      fetchProductCandidates(supabase),
      touchedOfferIds.length > 0
        ? supabase
            .from("product_matches")
            .select("supplier_product_id")
            .in("supplier_product_id", touchedOfferIds)
            .not("reviewed_by", "is", null)
        : Promise.resolve({ data: [] as { supplier_product_id: string }[] }),
    ]);

    const brandIdByName = new Map((brands ?? []).map((b) => [b.normalized_name, b.id as string]));
    const lockedOfferIds = new Set(
      (lockedMatches.data ?? []).map((m) => m.supplier_product_id as string),
    );

    const matchRowsToUpsert: Record<string, unknown>[] = [];
    const productIdUpdates: { offerId: string; productId: string }[] = [];

    for (const { aggregate, key } of groupsWithAggregate) {
      const offerId = offerIdByKey.get(key);
      if (!offerId || lockedOfferIds.has(offerId)) continue;

      const { representative } = aggregate;
      const offerInput: MatchOfferInput = {
        ean: null,
        manufacturerSkuRaw: aggregate.supplierSku,
        nameRaw: representative.nameRaw ?? "",
        brandId: representative.brandRaw
          ? (brandIdByName.get(representative.brandRaw.trim().toLowerCase()) ?? null)
          : null,
        series: null,
        radiatorAttributes: representative.radiator.attributes,
      };

      const result = matchSupplierOffer(offerInput, candidates);
      matchSummary[result.status] = (matchSummary[result.status] ?? 0) + 1;

      matchRowsToUpsert.push({
        supplier_product_id: offerId,
        product_id: result.productId,
        match_status: result.status,
        confidence_score: result.confidence,
        match_method: result.method,
        match_reasons: result.reasons,
        updated_at: nowIso,
      });

      if (result.status === "matched" && result.productId) {
        productIdUpdates.push({ offerId, productId: result.productId });
      }
    }

    for (const batch of chunk(matchRowsToUpsert, CHUNK_SIZE)) {
      if (batch.length === 0) continue;
      const { error } = await supabase
        .from("product_matches")
        .upsert(batch, { onConflict: "supplier_product_id" });
      if (error) throw new Error(`Не удалось сохранить результаты сопоставления: ${error.message}`);
    }

    // Individual updates for the (typically small) set of offers that
    // just became an exact match -- a plain UPDATE per row, not an
    // upsert, since upserting a partial {id, product_id} payload would
    // fail supplier_offers' NOT NULL columns that have no default.
    for (const { offerId, productId } of productIdUpdates) {
      await supabase.from("supplier_offers").update({ product_id: productId }).eq("id", offerId);
    }

    const status = rowsRejected > 0 ? "completed_with_errors" : "completed";

    await supabase
      .from("catalog_imports")
      .update({
        status,
        rows_imported: rowsImported + rowsSkippedUnchanged,
        rows_rejected: rowsRejected,
        completed_at: new Date().toISOString(),
      })
      .eq("id", importId);

    return {
      importId,
      status,
      rowsTotal: dataRows.length,
      rowsImported,
      rowsSkippedUnchanged,
      rowsRejected,
      matchSummary,
    };
  } catch (err) {
    await markImportFailed(supabase, importId);
    throw err;
  }
}

export async function runChannelCatalogImport(params: {
  fileBuffer: Buffer;
  fileName: string;
  worksheetName: string;
  salesChannel: string;
  headerRowIndex: number;
  columnMapping: ChannelCatalogColumnMapping;
  importedBy?: string | null;
}): Promise<ImportSummary> {
  const supabase = createSupabaseAdminClient();
  const fileHash = computeFileHash(params.fileBuffer);

  await guardAgainstInFlightDuplicate(supabase, fileHash, params.worksheetName);

  const workbook = await loadWorkbook(params.fileBuffer);
  const rows = sheetToRows(workbook, params.worksheetName);
  const dataRows = rows
    .slice(params.headerRowIndex + 1)
    .map((row, i) => ({ row, sourceRowNumber: params.headerRowIndex + 2 + i }))
    .filter(({ row }) => !isBlankRow(row));

  const { data: importRow, error: importError } = await supabase
    .from("catalog_imports")
    .insert({
      import_type: "repricer",
      source_name: params.fileName,
      file_name: params.fileName,
      file_hash: fileHash,
      worksheet_name: params.worksheetName,
      status: "processing",
      rows_total: dataRows.length,
      imported_by: params.importedBy ?? null,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (importError || !importRow) {
    throw new Error(`Не удалось создать запись импорта: ${importError?.message}`);
  }

  const importId = importRow.id as string;

  try {
    type ValidEntry = {
      row: (typeof dataRows)[number]["row"];
      sourceRowNumber: number;
      normalized: ReturnType<typeof normalizeChannelCatalogRow>;
    };
    const validEntries: ValidEntry[] = [];
    const catalogImportRowsToInsert: Record<string, unknown>[] = [];
    let rowsRejected = 0;

    for (const { row, sourceRowNumber } of dataRows) {
      const normalized = normalizeChannelCatalogRow(row, params.columnMapping);

      if (normalized.validationErrors.length > 0) {
        rowsRejected += 1;
        catalogImportRowsToInsert.push({
          import_id: importId,
          source_row_number: sourceRowNumber,
          raw_payload: { row },
          normalized_payload: normalized,
          import_status: "rejected",
          validation_errors: normalized.validationErrors,
        });
        continue;
      }

      validEntries.push({ row, sourceRowNumber, normalized });
    }

    // Same-file duplicate external_sku (rare, but possible) -- keep the
    // last occurrence, same "converge to one deterministic value" rule as
    // the stock import.
    const byExternalSku = new Map<string, ValidEntry[]>();
    for (const entry of validEntries) {
      const key = entry.normalized.externalSku ?? "";
      const group = byExternalSku.get(key);
      if (group) group.push(entry);
      else byExternalSku.set(key, [entry]);
    }

    const skus = Array.from(byExternalSku.keys()).filter((s) => s.length > 0);
    const existingByExternalSku = new Map<string, { id: string; current_sale_price: number | null }>();

    for (const batch of chunk(skus, CHUNK_SIZE)) {
      if (batch.length === 0) continue;
      const { data } = await supabase
        .from("channel_listings")
        .select("id, external_sku, current_sale_price")
        .eq("sales_channel", params.salesChannel)
        .in("external_sku", batch);
      for (const row of data ?? []) {
        existingByExternalSku.set(row.external_sku as string, {
          id: row.id as string,
          current_sale_price: row.current_sale_price as number | null,
        });
      }
    }

    const nowIso = new Date().toISOString();
    let rowsImported = 0;
    let rowsSkippedUnchanged = 0;

    const listingUpsertPayload = Array.from(byExternalSku.entries()).map(([sku, entries]) => {
      const representative = entries[entries.length - 1].normalized;
      const existing = existingByExternalSku.get(sku);
      const changed = hasChannelPriceChanged(
        existing?.current_sale_price ?? null,
        representative.currentSalePrice,
      );

      if (changed) rowsImported += entries.length;
      else rowsSkippedUnchanged += entries.length;

      return {
        sku,
        entries,
        changed,
        previousPrice: existing?.current_sale_price ?? null,
        payload: {
          sales_channel: params.salesChannel,
          external_sku: sku,
          title: representative.titleRaw,
          listing_status: "active",
          current_sale_price: representative.currentSalePrice,
          raw_payload: {
            row: entries[entries.length - 1].row,
            purchase_price: representative.purchasePrice,
            min_price: representative.minPrice,
            max_price: representative.maxPrice,
            damping_step: representative.dampingStep,
            damping_enabled: representative.dampingEnabled,
            radiator: representative.radiator,
            brand_raw: representative.brandRaw,
          },
          last_synced_at: nowIso,
          updated_at: nowIso,
        },
      };
    });

    const listingIdBySku = new Map<string, string>();
    for (const batch of chunk(listingUpsertPayload, CHUNK_SIZE)) {
      if (batch.length === 0) continue;
      const { data: upserted, error } = await supabase
        .from("channel_listings")
        .upsert(
          batch.map((b) => b.payload),
          { onConflict: "sales_channel,external_sku" },
        )
        .select("id, external_sku");

      if (error) throw new Error(`Не удалось сохранить позиции канала: ${error.message}`);

      for (const row of upserted ?? []) {
        listingIdBySku.set(row.external_sku as string, row.id as string);
      }
    }

    const priceHistoryRows = listingUpsertPayload
      .filter((b) => b.changed && b.payload.current_sale_price !== null)
      .map((b) => {
        const listingId = listingIdBySku.get(b.sku);
        return listingId
          ? {
              product_id: null,
              channel_listing_id: listingId,
              sales_channel: params.salesChannel,
              sale_price: b.payload.current_sale_price,
              previous_price: b.previousPrice,
              price_type: "repricer",
              source: "import",
              source_import_id: importId,
            }
          : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    for (const batch of chunk(priceHistoryRows, CHUNK_SIZE)) {
      if (batch.length === 0) continue;
      const { error } = await supabase.from("channel_price_history").insert(batch);
      if (error) throw new Error(`Не удалось сохранить историю цен канала: ${error.message}`);
    }

    for (const { changed, entries } of listingUpsertPayload) {
      for (const entry of entries) {
        catalogImportRowsToInsert.push({
          import_id: importId,
          source_row_number: entry.sourceRowNumber,
          raw_payload: { row: entry.row },
          normalized_payload: entry.normalized,
          import_status: changed ? "imported" : "skipped_unchanged",
          validation_errors: [],
        });
      }
    }

    for (const batch of chunk(catalogImportRowsToInsert, CHUNK_SIZE)) {
      if (batch.length === 0) continue;
      const { error } = await supabase.from("catalog_import_rows").insert(batch);
      if (error) throw new Error(`Не удалось сохранить строки импорта: ${error.message}`);
    }

    const status = rowsRejected > 0 ? "completed_with_errors" : "completed";

    await supabase
      .from("catalog_imports")
      .update({
        status,
        rows_imported: rowsImported + rowsSkippedUnchanged,
        rows_rejected: rowsRejected,
        completed_at: new Date().toISOString(),
      })
      .eq("id", importId);

    return {
      importId,
      status,
      rowsTotal: dataRows.length,
      rowsImported,
      rowsSkippedUnchanged,
      rowsRejected,
      matchSummary: {},
    };
  } catch (err) {
    await markImportFailed(supabase, importId);
    throw err;
  }
}
