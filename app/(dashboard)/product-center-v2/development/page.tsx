import Link from "next/link";
import { listProductDevelopment } from "@/lib/catalog/queries/product-development";
import { STAGE_COLUMNS, stageForStatus } from "@/lib/catalog/production/stages";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeZone: "Asia/Almaty" }).format(new Date(value));
}

function readinessClassName(pct: number) {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

type PageProps = { searchParams: Promise<{ view?: string }> };

export default async function ProductDevelopmentPage({ searchParams }: PageProps) {
  const { view } = await searchParams;
  const isKanban = view === "kanban";
  const rows = await listProductDevelopment();

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Подготовка товаров</h2>
          <p className="mt-1 text-xs text-slate-500">{rows.length} товаров в работе</p>
        </div>
        <div className="flex rounded-lg border border-slate-300 p-0.5 text-xs font-medium">
          <Link
            href="/product-center-v2/development"
            className={`rounded-md px-3 py-1.5 ${!isKanban ? "bg-blue-600 text-white" : "text-slate-600"}`}
          >
            Список
          </Link>
          <Link
            href="/product-center-v2/development?view=kanban"
            className={`rounded-md px-3 py-1.5 ${isKanban ? "bg-blue-600 text-white" : "text-slate-600"}`}
          >
            Доска
          </Link>
        </div>
      </div>

      {isKanban ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGE_COLUMNS.map((column) => {
            const columnRows = rows.filter((row) => stageForStatus(row.status) === column.key);
            return (
              <div key={column.key} className="w-64 shrink-0 rounded-xl bg-slate-100 p-3">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-slate-600">{column.label}</span>
                  <span className="text-xs text-slate-400">{columnRows.length}</span>
                </div>
                <div className="space-y-2">
                  {columnRows.map((row) => (
                    <Link
                      key={row.commercialProductId}
                      href={`/product-center-v2/development/${row.commercialProductId}`}
                      className="block rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-blue-300"
                    >
                      <div className="text-sm font-medium text-slate-900 line-clamp-2">{row.commercialName}</div>
                      <div className="mt-1 text-xs text-slate-400">{row.brandName ?? row.masterProductName}</div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full ${readinessClassName(row.checklistCompletionPercent)}`} style={{ width: `${row.checklistCompletionPercent}%` }} />
                      </div>
                      {row.nextActionLabel ? (
                        <div className="mt-2 text-[11px] text-slate-500">
                          Дальше: {row.nextActionLabel} <span className="text-slate-400">· {row.nextActionTeam}</span>
                        </div>
                      ) : null}
                    </Link>
                  ))}
                  {columnRows.length === 0 ? <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-[11px] text-slate-300">пусто</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Товар</th>
                <th className="px-4 py-3">Стадия</th>
                <th className="px-4 py-3">Готовность чек-листа</th>
                <th className="px-4 py-3">Следующее действие</th>
                <th className="px-4 py-3">Ответственный</th>
                <th className="px-4 py-3">Целевая дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const stage = STAGE_COLUMNS.find((c) => c.key === stageForStatus(row.status));
                return (
                  <tr key={row.commercialProductId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/product-center-v2/development/${row.commercialProductId}`} className="font-medium text-blue-600 hover:underline">
                        {row.commercialName}
                      </Link>
                      <div className="text-xs text-slate-400">{row.brandName ?? row.masterProductName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{stage?.label ?? row.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full ${readinessClassName(row.checklistCompletionPercent)}`} style={{ width: `${row.checklistCompletionPercent}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{row.checklistCompletionPercent}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{row.nextActionLabel ?? <span className="text-emerald-600">Готово к запуску</span>}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.nextActionTeam ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(row.targetDate) ?? "не назначена"}</td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Пока нет товаров в производстве
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
