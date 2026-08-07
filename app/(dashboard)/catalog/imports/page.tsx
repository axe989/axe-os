import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const IMPORT_TYPE_LABELS: Record<string, string> = {
  supplier_stock: "Остатки поставщика",
  supplier_price: "Прайс поставщика",
  current_catalog: "Текущий каталог",
  repricer: "Репрайсер",
  channel_listing: "Позиции канала",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  processing: "Обрабатывается",
  completed: "Завершён",
  completed_with_errors: "Завершён с ошибками",
  failed: "Ошибка",
};

function statusClassName(status: string) {
  if (status === "completed") return "bg-emerald-50 text-emerald-700";
  if (status === "completed_with_errors") return "bg-amber-50 text-amber-700";
  if (status === "failed") return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-600";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Almaty",
  }).format(new Date(value));
}

export default async function CatalogImportsPage() {
  const supabase = createSupabaseAdminClient();
  const { data: imports, error } = await supabase
    .from("catalog_imports")
    .select(
      "id, import_type, source_name, file_name, worksheet_name, status, rows_total, rows_imported, rows_rejected, imported_by, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Импорты</h2>
            <p className="mt-1 text-sm text-slate-500">
              Остатки поставщиков, текущий каталог и цены репрайсера
            </p>
          </div>

          <Link
            href="/catalog/imports/new"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Новый импорт
          </Link>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Ошибка загрузки: {error.message}
          </div>
        ) : imports && imports.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-sm text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Источник</th>
                  <th className="px-4 py-3 font-medium">Тип</th>
                  <th className="px-4 py-3 font-medium">Файл / лист</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium">Строк</th>
                  <th className="px-4 py-3 font-medium">Пользователь</th>
                  <th className="px-4 py-3 font-medium">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {imports.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <Link href={`/catalog/imports/${row.id}`} className="font-semibold text-blue-700 hover:underline">
                        {row.source_name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {IMPORT_TYPE_LABELS[row.import_type] ?? row.import_type}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <div>{row.file_name}</div>
                      {row.worksheet_name ? (
                        <div className="text-xs text-slate-400">{row.worksheet_name}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${statusClassName(row.status)}`}
                      >
                        {STATUS_LABELS[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {row.rows_imported}/{row.rows_total}
                      {row.rows_rejected > 0 ? (
                        <span className="ml-2 text-red-600">−{row.rows_rejected}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{row.imported_by ?? "—"}</td>
                    <td className="px-4 py-4 text-slate-500">{formatDate(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Импортов пока не было.
          </div>
        )}
      </section>
    </div>
  );
}
