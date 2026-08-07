import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Almaty",
  }).format(new Date(value));
}

type PageProps = { params: Promise<{ id: string }> };

export default async function CatalogImportDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const [{ data: importRow, error }, { data: rejectedRows }] = await Promise.all([
    supabase.from("catalog_imports").select("*").eq("id", id).single(),
    supabase
      .from("catalog_import_rows")
      .select("source_row_number, raw_payload, validation_errors")
      .eq("import_id", id)
      .eq("import_status", "rejected")
      .order("source_row_number")
      .limit(50),
  ]);

  if (error || !importRow) {
    return (
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Импорт не найден: {error?.message}
        </div>
      </div>
    );
  }

  const { count: importedCount } = await supabase
    .from("catalog_import_rows")
    .select("*", { count: "exact", head: true })
    .eq("import_id", id)
    .eq("import_status", "imported");

  const { count: skippedCount } = await supabase
    .from("catalog_import_rows")
    .select("*", { count: "exact", head: true })
    .eq("import_id", id)
    .eq("import_status", "skipped_unchanged");

  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <Link href="/catalog/imports" className="text-sm text-blue-700 hover:underline">
        ← Все импорты
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{importRow.source_name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {importRow.file_name}
          {importRow.worksheet_name ? ` · лист "${importRow.worksheet_name}"` : ""}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Всего строк</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{importRow.rows_total}</div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4">
            <div className="text-xs text-emerald-700">Изменения записаны</div>
            <div className="mt-1 text-lg font-semibold text-emerald-800">{importedCount ?? 0}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Без изменений</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{skippedCount ?? 0}</div>
          </div>
          <div className="rounded-xl bg-red-50 p-4">
            <div className="text-xs text-red-700">Отклонено</div>
            <div className="mt-1 text-lg font-semibold text-red-800">{importRow.rows_rejected}</div>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-slate-500">Статус</dt>
            <dd className="font-medium text-slate-900">{importRow.status}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Пользователь</dt>
            <dd className="font-medium text-slate-900">{importRow.imported_by ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Начат</dt>
            <dd className="font-medium text-slate-900">{formatDate(importRow.started_at)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Завершён</dt>
            <dd className="font-medium text-slate-900">{formatDate(importRow.completed_at)}</dd>
          </div>
        </dl>
      </section>

      {rejectedRows && rejectedRows.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            Отклонённые строки ({rejectedRows.length}
            {importRow.rows_rejected > rejectedRows.length ? "+" : ""})
          </h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Строка</th>
                  <th className="px-4 py-2 font-medium">Ошибки</th>
                  <th className="px-4 py-2 font-medium">Исходные данные</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rejectedRows.map((row) => (
                  <tr key={row.source_row_number}>
                    <td className="px-4 py-2 text-slate-500">{row.source_row_number}</td>
                    <td className="px-4 py-2 text-red-700">
                      {(row.validation_errors as string[]).join("; ")}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {JSON.stringify(row.raw_payload)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
