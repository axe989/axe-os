"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Supplier = { id: string; name: string };

type ColumnPreview = {
  index: number;
  header: string | number | boolean | null;
  samples: (string | number | boolean | null)[];
};

type InspectResponse = {
  success: boolean;
  error?: string;
  fileName?: string;
  sheetNames?: string[];
  worksheetName?: string;
  headerRowIndex?: number;
  totalRows?: number;
  dataRowCount?: number;
  columnPreview?: ColumnPreview[];
};

type ImportSummary = {
  importId: string;
  status: string;
  rowsTotal: number;
  rowsImported: number;
  rowsSkippedUnchanged: number;
  rowsRejected: number;
  matchSummary: Record<string, number>;
};

type ImportType = "supplier_stock" | "repricer";

type FieldDef = { key: string; label: string; required: boolean };

const FIELD_DEFS: Record<ImportType, FieldDef[]> = {
  supplier_stock: [
    { key: "manufacturer_sku", label: "Артикул производителя", required: true },
    { key: "name_raw", label: "Наименование товара", required: true },
    { key: "condition_raw", label: "Характеристика / состояние", required: true },
    { key: "stock_quantity", label: "Остаток", required: true },
    { key: "purchase_price", label: "Цена закупки", required: false },
  ],
  repricer: [
    { key: "title", label: "Название товара", required: true },
    { key: "external_sku", label: "Артикул канала (Kaspi)", required: true },
    { key: "sale_price", label: "Цена на маркетплейсе", required: true },
    { key: "purchase_price", label: "Цена закупки", required: false },
    { key: "min_price", label: "Минимальная цена", required: false },
    { key: "max_price", label: "Максимальная цена", required: false },
    { key: "damping_step", label: "Шаг демпинга", required: false },
    { key: "damping_enabled", label: "Демпинг вкл/выкл", required: false },
  ],
};

function columnLabel(col: ColumnPreview) {
  const header = col.header !== null && col.header !== "" ? String(col.header) : "(без названия)";
  const samples = col.samples.map((s) => String(s)).join(", ");
  return `Колонка ${col.index + 1}: ${header}${samples ? ` — напр. ${samples}` : ""}`;
}

export default function ImportWizard({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [importType, setImportType] = useState<ImportType>("supplier_stock");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [salesChannel, setSalesChannel] = useState("kaspi");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [inspect, setInspect] = useState<InspectResponse | null>(null);
  const [worksheetName, setWorksheetName] = useState("");
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const fields = FIELD_DEFS[importType];

  async function runInspect(nextFile: File, sheet?: string, headerOverride?: number) {
    setBusy(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", nextFile);
      if (sheet) formData.append("worksheetName", sheet);
      if (headerOverride !== undefined) formData.append("headerRowIndex", String(headerOverride));

      const response = await fetch("/api/catalog/imports/inspect", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as InspectResponse;

      if (!result.success) {
        setErrorMessage(result.error ?? "Не удалось прочитать файл");
        return;
      }

      setInspect(result);
      setWorksheetName(result.worksheetName ?? "");
      setHeaderRowIndex(result.headerRowIndex ?? 0);
      setStep(2);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setBusy(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    if (selected) {
      void runInspect(selected);
    }
  }

  async function handleSheetChange(sheet: string) {
    if (!file) return;
    setWorksheetName(sheet);
    await runInspect(file, sheet);
  }

  async function handleHeaderRowChange(newIndex: number) {
    if (!file) return;
    setHeaderRowIndex(newIndex);
    await runInspect(file, worksheetName, newIndex);
  }

  function updateMapping(key: string, value: string) {
    setMapping((prev) => ({ ...prev, [key]: value }));
  }

  function mappingIsComplete() {
    return fields.filter((f) => f.required).every((f) => mapping[f.key] !== undefined && mapping[f.key] !== "");
  }

  function buildColumnMappingPayload() {
    const payload: Record<string, number | null> = {};
    for (const field of fields) {
      const value = mapping[field.key];
      payload[field.key] = value !== undefined && value !== "" ? Number(value) : null;
    }
    return payload;
  }

  async function runImport() {
    if (!file) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("importType", importType);
      formData.append("worksheetName", worksheetName);
      formData.append("headerRowIndex", String(headerRowIndex));
      formData.append("columnMapping", JSON.stringify(buildColumnMappingPayload()));
      if (importType === "supplier_stock") {
        formData.append("supplierId", supplierId);
      } else {
        formData.append("salesChannel", salesChannel);
      }

      const response = await fetch("/api/catalog/imports", { method: "POST", body: formData });
      const result = (await response.json()) as { success: boolean; error?: string; summary?: ImportSummary };

      if (!result.success || !result.summary) {
        setErrorMessage(result.error ?? "Импорт завершился с ошибкой");
        return;
      }

      setSummary(result.summary);
      setStep(4);
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Новый импорт</h1>
        <p className="mt-1 text-sm text-slate-500">
          Шаг {step} из 4:{" "}
          {step === 1
            ? "выбор файла и типа импорта"
            : step === 2
              ? "лист и заголовки"
              : step === 3
                ? "сопоставление столбцов"
                : "результат"}
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {step === 1 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Тип импорта</label>
              <select
                className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={importType}
                onChange={(e) => setImportType(e.target.value as ImportType)}
              >
                <option value="supplier_stock">Остатки поставщика / склада</option>
                <option value="repricer">Текущий каталог / репрайсер</option>
              </select>
            </div>

            {importType === "supplier_stock" ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Поставщик / склад</label>
                <select
                  className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Канал продаж</label>
                <select
                  className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={salesChannel}
                  onChange={(e) => setSalesChannel(e.target.value)}
                >
                  <option value="kaspi">Kaspi</option>
                  <option value="website">Сайт</option>
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Файл (.xlsx)</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full max-w-md text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />
              {busy ? <p className="mt-2 text-sm text-slate-500">Читаем файл…</p> : null}
            </div>
          </div>
        </section>
      ) : null}

      {step === 2 && inspect ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Лист</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={worksheetName}
                onChange={(e) => handleSheetChange(e.target.value)}
              >
                {(inspect.sheetNames ?? []).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Строка заголовка (индекс с 0)
              </label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={headerRowIndex}
                onChange={(e) => handleHeaderRowChange(Number(e.target.value))}
              />
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Всего строк: {inspect.totalRows} · строк данных: {inspect.dataRowCount}
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Заголовок</th>
                  <th className="px-3 py-2 font-medium">Пример значений</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(inspect.columnPreview ?? []).map((col) => (
                  <tr key={col.index}>
                    <td className="px-3 py-2 text-slate-500">{col.index + 1}</td>
                    <td className="px-3 py-2 text-slate-900">{String(col.header ?? "—")}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {col.samples.map((s) => String(s)).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Назад
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Далее: сопоставление столбцов
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 && inspect ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {field.label} {field.required ? <span className="text-red-500">*</span> : null}
                </label>
                <select
                  className="w-full max-w-xl rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={mapping[field.key] ?? ""}
                  onChange={(e) => updateMapping(field.key, e.target.value)}
                >
                  <option value="">— не выбрано —</option>
                  {(inspect.columnPreview ?? []).map((col) => (
                    <option key={col.index} value={col.index}>
                      {columnLabel(col)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Назад
            </button>
            <button
              type="button"
              disabled={!mappingIsComplete() || busy}
              onClick={runImport}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Импортируем…" : "Запустить импорт"}
            </button>
          </div>
        </section>
      ) : null}

      {step === 4 && summary ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Импорт завершён</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Всего строк</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{summary.rowsTotal}</div>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <div className="text-xs text-emerald-700">Изменения записаны</div>
              <div className="mt-1 text-lg font-semibold text-emerald-800">{summary.rowsImported}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Без изменений</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{summary.rowsSkippedUnchanged}</div>
            </div>
            <div className="rounded-xl bg-red-50 p-4">
              <div className="text-xs text-red-700">Отклонено</div>
              <div className="mt-1 text-lg font-semibold text-red-800">{summary.rowsRejected}</div>
            </div>
          </div>

          {Object.keys(summary.matchSummary).length > 0 ? (
            <div className="mt-4 text-sm text-slate-600">
              Результаты сопоставления:{" "}
              {Object.entries(summary.matchSummary)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")}
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <a
              href={`/catalog/imports/${summary.importId}`}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Открыть детали импорта
            </a>
            <a
              href="/catalog/missing"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Отсутствующие товары
            </a>
          </div>
        </section>
      ) : null}
    </div>
  );
}
