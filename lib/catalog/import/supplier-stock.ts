import { extractBrand } from "./brand";
import { normalizeCondition, isSaleableCondition } from "../normalization/condition";
import { normalizeSku, normalizeProductName } from "../normalization/sku";
import { parseRadiatorSku } from "../normalization/radiator";
import type { SheetCell, SheetRow } from "./workbook";

export type SupplierStockColumnMapping = {
  manufacturer_sku: number;
  name_raw: number;
  condition_raw: number;
  stock_quantity: number;
  purchase_price?: number | null;
};

export type NormalizedSupplierStockRow = {
  manufacturerSkuRaw: string | null;
  nameRaw: string | null;
  conditionRaw: string | null;
  condition: ReturnType<typeof normalizeCondition>;
  stockQuantity: number | null;
  purchasePrice: number | null;
  brandRaw: string | null;
  normalizedName: string | null;
  supplierSku: string | null;
  isSaleable: boolean;
  radiator: ReturnType<typeof parseRadiatorSku>;
  validationErrors: string[];
};

function cellToString(cell: SheetCell | undefined): string | null {
  if (cell === null || cell === undefined) return null;
  const str = String(cell).trim();
  return str.length > 0 ? str : null;
}

function cellToNumber(cell: SheetCell | undefined): number | null {
  if (cell === null || cell === undefined || cell === "") return null;
  const num = typeof cell === "number" ? cell : Number(String(cell).replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

export function normalizeSupplierStockRow(
  row: SheetRow,
  mapping: SupplierStockColumnMapping,
): NormalizedSupplierStockRow {
  const manufacturerSkuRaw = cellToString(row[mapping.manufacturer_sku]);
  const nameRaw = cellToString(row[mapping.name_raw]);
  const conditionRaw = cellToString(row[mapping.condition_raw]);
  const stockQuantity = cellToNumber(row[mapping.stock_quantity]);
  const purchasePrice =
    mapping.purchase_price !== undefined && mapping.purchase_price !== null
      ? cellToNumber(row[mapping.purchase_price])
      : null;

  const validationErrors: string[] = [];
  if (!manufacturerSkuRaw && !nameRaw) {
    validationErrors.push("Отсутствуют и артикул, и наименование товара");
  }

  const condition = normalizeCondition(conditionRaw);

  return {
    manufacturerSkuRaw,
    nameRaw,
    conditionRaw,
    condition,
    stockQuantity,
    purchasePrice,
    brandRaw: extractBrand(nameRaw),
    normalizedName: normalizeProductName(nameRaw),
    supplierSku: normalizeSku(manufacturerSkuRaw),
    isSaleable: isSaleableCondition(condition),
    radiator: parseRadiatorSku(manufacturerSkuRaw, nameRaw),
    validationErrors,
  };
}

export type AggregatedSupplierStockGroup = {
  supplierSku: string | null;
  condition: NormalizedSupplierStockRow["condition"];
  stockQuantity: number | null;
  purchasePrice: number | null;
  representative: NormalizedSupplierStockRow;
};

// Real supplier/warehouse exports commonly list the same SKU+condition
// more than once (separate stock lots/batches -- confirmed against the
// pilot Термо sheet, e.g. "In-C2180.04.9016" appears twice under "Новый"
// with different quantities). Processing such rows one at a time in file
// order against a single storage slot makes every re-import of the same
// file oscillate between the two rows' values instead of converging --
// breaking idempotency. Aggregating by (supplierSku, condition) before
// persisting makes each import run produce one deterministic value.
export function aggregateSupplierStockRows(
  rows: NormalizedSupplierStockRow[],
): AggregatedSupplierStockGroup[] {
  const groups = new Map<string, NormalizedSupplierStockRow[]>();

  for (const row of rows) {
    const key = `${row.supplierSku ?? ""}::${row.condition}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  return Array.from(groups.values()).map((groupRows) => {
    const quantities = groupRows.map((r) => r.stockQuantity).filter((q): q is number => q !== null);
    const stockQuantity = quantities.length > 0 ? quantities.reduce((a, b) => a + b, 0) : null;

    // Last non-null purchase price wins, consistent with "most recent
    // value seen" semantics used elsewhere in the pipeline.
    let purchasePrice: number | null = null;
    for (const r of groupRows) {
      if (r.purchasePrice !== null) purchasePrice = r.purchasePrice;
    }

    return {
      supplierSku: groupRows[0].supplierSku,
      condition: groupRows[0].condition,
      stockQuantity,
      purchasePrice,
      representative: groupRows[groupRows.length - 1],
    };
  });
}
