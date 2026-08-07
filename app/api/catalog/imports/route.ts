import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runChannelCatalogImport, runSupplierStockImport } from "@/lib/catalog/import/pipeline";
import type { ChannelCatalogColumnMapping } from "@/lib/catalog/import/channel-catalog";
import type { SupplierStockColumnMapping } from "@/lib/catalog/import/supplier-stock";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const importType = formData.get("importType");
    const worksheetName = formData.get("worksheetName");
    const headerRowIndexRaw = formData.get("headerRowIndex");
    const columnMappingRaw = formData.get("columnMapping");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Файл не найден" }, { status: 400 });
    }
    if (typeof worksheetName !== "string" || typeof columnMappingRaw !== "string") {
      return NextResponse.json(
        { success: false, error: "Не указан лист или сопоставление столбцов" },
        { status: 400 },
      );
    }

    const headerRowIndex = Number(headerRowIndexRaw ?? 0);
    const columnMapping = JSON.parse(columnMappingRaw);
    const buffer = Buffer.from(await file.arrayBuffer());

    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (importType === "supplier_stock") {
      const supplierId = formData.get("supplierId");
      if (typeof supplierId !== "string") {
        return NextResponse.json(
          { success: false, error: "Не указан поставщик" },
          { status: 400 },
        );
      }

      const summary = await runSupplierStockImport({
        fileBuffer: buffer,
        fileName: file.name,
        worksheetName,
        supplierId,
        headerRowIndex,
        columnMapping: columnMapping as SupplierStockColumnMapping,
        importedBy: user?.email ?? null,
      });

      return NextResponse.json({ success: true, summary });
    }

    if (importType === "repricer" || importType === "current_catalog") {
      const salesChannel = formData.get("salesChannel");
      if (typeof salesChannel !== "string") {
        return NextResponse.json(
          { success: false, error: "Не указан канал продаж" },
          { status: 400 },
        );
      }

      const summary = await runChannelCatalogImport({
        fileBuffer: buffer,
        fileName: file.name,
        worksheetName,
        salesChannel,
        headerRowIndex,
        columnMapping: columnMapping as ChannelCatalogColumnMapping,
        importedBy: user?.email ?? null,
      });

      return NextResponse.json({ success: true, summary });
    }

    return NextResponse.json(
      { success: false, error: `Неизвестный тип импорта: ${String(importType)}` },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
