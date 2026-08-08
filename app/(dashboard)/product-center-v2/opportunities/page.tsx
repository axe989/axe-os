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
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-700">Очередь возможностей</h2>
        <p className="mt-1 text-xs text-slate-500">
          Предложения поставщиков, которые ещё не решено продавать. Ни один товар не попадает в
          ассортимент без явного решения здесь.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-slate-900">{row.nameRaw ?? "Без названия"}</div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>{row.supplierName}</span>
                {row.brandRaw ? <span>{row.brandRaw}</span> : null}
                <span>Закупка: {formatMoney(row.purchasePrice)}</span>
                <span>Ориентировочная цена продажи: {formatMoney(row.estimatedSalePrice)}</span>
                <span className={row.isAvailable ? "text-emerald-600" : "text-red-500"}>
                  {row.isAvailable ? "В наличии" : "Нет в наличии"}
                </span>
              </div>
            </div>
            <OpportunityActions supplierOfferId={row.id} />
          </div>
        ))}

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
            Очередь пуста — все предложения поставщиков уже получили решение.
          </div>
        ) : null}
      </div>
    </section>
  );
}
