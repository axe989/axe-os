import { extractBrand } from "./brand";
import { normalizeProductName } from "../normalization/sku";
import { parseRadiatorSku } from "../normalization/radiator";
import type { SheetCell, SheetRow } from "./workbook";

export type ChannelCatalogColumnMapping = {
  title: number;
  external_sku: number;
  purchase_price?: number | null;
  min_price?: number | null;
  max_price?: number | null;
  damping_step?: number | null;
  damping_enabled?: number | null;
  sale_price: number;
};

export type NormalizedChannelCatalogRow = {
  titleRaw: string | null;
  normalizedName: string | null;
  externalSku: string | null;
  purchasePrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  dampingStep: number | null;
  dampingEnabled: boolean | null;
  currentSalePrice: number | null;
  brandRaw: string | null;
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

function cellAt(row: SheetRow, index: number | null | undefined): SheetCell | undefined {
  return index === undefined || index === null ? undefined : row[index];
}

export function normalizeChannelCatalogRow(
  row: SheetRow,
  mapping: ChannelCatalogColumnMapping,
): NormalizedChannelCatalogRow {
  const titleRaw = cellToString(row[mapping.title]);
  const externalSku = cellToString(row[mapping.external_sku]);
  const dampingRaw = cellToString(cellAt(row, mapping.damping_enabled));

  const validationErrors: string[] = [];
  if (!titleRaw) {
    validationErrors.push("Отсутствует название товара");
  }
  if (!externalSku) {
    validationErrors.push("Отсутствует артикул канала продаж");
  }

  return {
    titleRaw,
    normalizedName: normalizeProductName(titleRaw),
    externalSku,
    purchasePrice: cellToNumber(cellAt(row, mapping.purchase_price)),
    minPrice: cellToNumber(cellAt(row, mapping.min_price)),
    maxPrice: cellToNumber(cellAt(row, mapping.max_price)),
    dampingStep: cellToNumber(cellAt(row, mapping.damping_step)),
    dampingEnabled: dampingRaw === null ? null : dampingRaw.toLowerCase() === "включен",
    currentSalePrice: cellToNumber(row[mapping.sale_price]),
    brandRaw: extractBrand(titleRaw),
    radiator: parseRadiatorSku(null, titleRaw),
    validationErrors,
  };
}
