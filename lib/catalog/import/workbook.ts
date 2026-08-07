import ExcelJS from "exceljs";

// Using exceljs rather than the popular `xlsx`/SheetJS package: the npm
// build of `xlsx` has unpatched high-severity prototype-pollution and
// ReDoS advisories (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9) with "no fix
// available", and this module's entire job is parsing user-uploaded files
// -- exactly the attack surface those advisories are in.

export type SheetCell = string | number | boolean | null;
export type SheetRow = SheetCell[];

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

export async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Файл превышает допустимый размер ${MAX_UPLOAD_BYTES / (1024 * 1024)} МБ`,
    );
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
}

export function listSheetNames(workbook: ExcelJS.Workbook): string[] {
  return workbook.worksheets.map((sheet) => sheet.name);
}

function cellToValue(cell: ExcelJS.CellValue): SheetCell {
  if (cell === null || cell === undefined) {
    return null;
  }

  if (typeof cell === "object") {
    // Rich text / formula / hyperlink cells.
    if ("richText" in cell && Array.isArray((cell as { richText: { text: string }[] }).richText)) {
      return (cell as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
    }
    if ("result" in cell) {
      return cellToValue((cell as { result: ExcelJS.CellValue }).result);
    }
    if ("text" in cell) {
      return String((cell as { text: unknown }).text);
    }
    if (cell instanceof Date) {
      return cell.toISOString();
    }
    return null;
  }

  return cell as SheetCell;
}

// Returns 0-indexed rows (exceljs is 1-indexed internally and pads
// row.values[0] with undefined).
export function sheetToRows(workbook: ExcelJS.Workbook, sheetName: string): SheetRow[] {
  const worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) {
    throw new Error(`Лист "${sheetName}" не найден в файле`);
  }

  const rows: SheetRow[] = [];
  const columnCount = worksheet.columnCount;

  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values: SheetRow = [];
    for (let col = 1; col <= columnCount; col += 1) {
      values.push(cellToValue(row.getCell(col).value));
    }
    rows.push(values);
  });

  return rows;
}

export function isBlankRow(row: SheetRow): boolean {
  return row.every((cell) => cell === null || cell === "");
}

export type ColumnPreview = {
  index: number;
  header: SheetCell;
  samples: SheetCell[];
};

// Header detection is a best-effort heuristic (most non-empty cells among
// the first `maxScan` rows) -- the import wizard's column-mapping step is
// where a human confirms/corrects it using per-column sample values,
// which is what actually resolves ambiguity for messy real-world exports
// (e.g. 1C reports with a title block and split multi-row headers).
export function detectHeaderRowIndex(rows: SheetRow[], maxScan = 20): number {
  let bestIndex = 0;
  let bestScore = -1;

  const scanLimit = Math.min(rows.length, maxScan);
  for (let i = 0; i < scanLimit; i += 1) {
    const nonEmpty = rows[i].filter((cell) => cell !== null && cell !== "").length;
    if (nonEmpty > bestScore) {
      bestScore = nonEmpty;
      bestIndex = i;
    }
  }

  return bestIndex;
}

export function buildColumnPreview(
  rows: SheetRow[],
  headerRowIndex: number,
  sampleCount = 3,
): ColumnPreview[] {
  const headerRow = rows[headerRowIndex] ?? [];
  const dataRows = rows.slice(headerRowIndex + 1);
  const columnCount = Math.max(headerRow.length, ...dataRows.map((r) => r.length), 0);

  const previews: ColumnPreview[] = [];
  for (let col = 0; col < columnCount; col += 1) {
    const samples: SheetCell[] = [];
    for (const row of dataRows) {
      const value = row[col];
      if (value !== null && value !== "" && samples.length < sampleCount) {
        samples.push(value);
      }
      if (samples.length >= sampleCount) break;
    }

    previews.push({ index: col, header: headerRow[col] ?? null, samples });
  }

  return previews;
}
