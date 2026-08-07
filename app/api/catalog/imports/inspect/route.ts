import { NextResponse } from "next/server";
import {
  buildColumnPreview,
  detectHeaderRowIndex,
  listSheetNames,
  loadWorkbook,
  sheetToRows,
} from "@/lib/catalog/import/workbook";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const requestedSheet = formData.get("worksheetName");
    const headerRowOverride = formData.get("headerRowIndex");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Файл не найден в запросе" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = await loadWorkbook(buffer);
    const sheetNames = listSheetNames(workbook);

    const worksheetName =
      typeof requestedSheet === "string" && sheetNames.includes(requestedSheet)
        ? requestedSheet
        : sheetNames[0];

    if (!worksheetName) {
      return NextResponse.json(
        { success: false, error: "В файле нет листов" },
        { status: 400 },
      );
    }

    const rows = sheetToRows(workbook, worksheetName);
    const headerRowIndex =
      typeof headerRowOverride === "string" && headerRowOverride !== ""
        ? Number(headerRowOverride)
        : detectHeaderRowIndex(rows);
    const columnPreview = buildColumnPreview(rows, headerRowIndex);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      sheetNames,
      worksheetName,
      headerRowIndex,
      totalRows: rows.length,
      dataRowCount: Math.max(rows.length - headerRowIndex - 1, 0),
      columnPreview,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
