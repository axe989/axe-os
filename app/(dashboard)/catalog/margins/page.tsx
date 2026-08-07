import Link from "next/link";
import { getMarginReport } from "@/lib/catalog/queries/margins";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { value: "", label: "Все" },
  { value: "healthy", label: "В норме" },
  { value: "below_target", label: "Ниже целевой" },
  { value: "below_minimum", label: "Ниже минимальной" },
  { value: "negative", label: "Отрицательная" },
  { value: "review_high_margin", label: "Высокая маржа (на проверку)" },
];

function statusClassName(status: string) {
  if (status === "healthy") return "bg-emerald-50 text-emerald-700";
  if (status === "below_target") return "bg-amber-50 text-amber-700";
  if (status === "below_minimum" || status === "negative") return "bg-red-50 text-red-700";
  return "bg-blue-50 text-blue-700";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) + " ₸";
}

type PageProps = { searchParams: Promise<{ status?: string }> };

export default async function CatalogMarginsPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const report = await getMarginReport(status);

  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-slate-900">Маржа</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ожидаемая маржа по текущей закупочной и продажной цене
          </p>
        </div>

        {!report.hasActiveStrategy ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            Нет активной ценовой стратегии (pricing_strategies). Создайте её, чтобы рассчитывать маржу.
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {STATUS_FILTERS.map((f) => (
                <Link
                  key={f.value}
                  href={f.value ? `/catalog/margins?status=${f.value}` : "/catalog/margins"}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    (status ?? "") === f.value
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </Link>
              ))}
            </div>

            {report.rows.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">Товар</th>
                      <th className="px-3 py-2 font-medium">Бренд</th>
                      <th className="px-3 py-2 font-medium">Закупка</th>
                      <th className="px-3 py-2 font-medium">Продажа</th>
                      <th className="px-3 py-2 font-medium">Прибыль</th>
                      <th className="px-3 py-2 font-medium">Маржа</th>
                      <th className="px-3 py-2 font-medium">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.rows.map((row) => (
                      <tr key={row.productId}>
                        <td className="px-3 py-3">
                          <Link href={`/catalog/products/${row.productId}?tab=pricing`} className="font-medium text-blue-700 hover:underline">
                            {row.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{row.brandName ?? "—"}</td>
                        <td className="px-3 py-3 text-slate-600">{formatMoney(row.purchasePrice)}</td>
                        <td className="px-3 py-3 text-slate-600">{formatMoney(row.salePrice)}</td>
                        <td className="px-3 py-3 text-slate-600">{formatMoney(row.expectedProfit)}</td>
                        <td className="px-3 py-3 text-slate-900">{row.expectedMarginPercent.toFixed(1)}%</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName(row.marginStatus)}`}>
                            {row.marginStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                Нет товаров с одновременно известной закупочной и продажной ценой для выбранного фильтра.
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
