import Link from "next/link";
import { listOpportunities } from "@/lib/catalog/queries/opportunity-queue";
import OpportunityActions from "./OpportunityActions";

export const dynamic = "force-dynamic";

function formatMoney(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) + " ₸";
}

export default async function OpportunityQueuePage() {
  const rows = await listOpportunities();

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-700">Товары на рассмотрении</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Хотим ли мы это продавать? Предложения поставщиков, по которым ещё не принято решение об ассортименте.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Товар</th>
              <th className="px-4 py-3">Поставщик</th>
              <th className="px-4 py-3">Бренд</th>
              <th className="px-4 py-3">Категория</th>
              <th className="px-4 py-3">Закупка</th>
              <th className="px-4 py-3">Наличие</th>
              <th className="px-4 py-3">Представлен в AXE?</th>
              <th className="px-4 py-3">Представлен на Marketplace?</th>
              <th className="px-4 py-3">Решение</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/product-center-v2/supplier-feed/${row.id}`} className="font-medium text-blue-700 hover:underline">
                    {row.nameRaw ?? "Без названия"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{row.supplierName}</td>
                <td className="px-4 py-3 text-slate-600">{row.brandRaw ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{row.categoryName ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {formatMoney(row.purchasePrice)}
                  {row.purchasePrice === null && row.estimatedSalePrice === null ? null : (
                    <div className="text-xs text-slate-400">ориент. продажа: {formatMoney(row.estimatedSalePrice)}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={row.isAvailable ? "text-emerald-700" : "text-red-600"}>{row.isAvailable ? "В наличии" : "Нет"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.representedInAxe ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-400"}`}>
                    {row.representedInAxe ? "Да" : "Нет"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.representedOnMarketplace ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-400"}`}>
                    {row.representedOnMarketplace ? "Да" : "Нет"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <OpportunityActions supplierOfferId={row.id} />
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                  Все предложения поставщиков уже получили решение
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
