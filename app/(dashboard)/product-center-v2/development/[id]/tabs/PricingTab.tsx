import type { PricePoint } from "@/lib/catalog/queries/product-card";

function formatMoney(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) + " ₸";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeZone: "Asia/Almaty" }).format(new Date(value));
}

function HistoryList({ points, emptyLabel }: { points: PricePoint[]; emptyLabel: string }) {
  if (points.length === 0) {
    return <p className="text-xs text-slate-400">{emptyLabel}</p>;
  }
  const reversed = [...points].reverse();
  return (
    <ul className="max-h-56 space-y-1 overflow-y-auto text-xs">
      {reversed.map((p, i) => (
        <li key={`${p.recordedAt}-${i}`} className="flex items-center justify-between border-b border-slate-100 py-1 last:border-0">
          <span className="text-slate-400">{formatDate(p.recordedAt)}</span>
          <span className="font-medium text-slate-700">{formatMoney(p.price)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PricingTab({
  purchasePrice,
  salePrice,
  minAllowedPrice,
  expectedMarginPercent,
  purchasePriceHistory,
  salePriceHistory,
}: {
  purchasePrice: number | null;
  salePrice: number | null;
  minAllowedPrice: number | null;
  expectedMarginPercent: number | null;
  purchasePriceHistory: PricePoint[];
  salePriceHistory: PricePoint[];
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Цена и маржа</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-slate-400">Закупочная цена</dt><dd className="font-medium text-slate-800">{formatMoney(purchasePrice)}</dd></div>
          <div><dt className="text-xs text-slate-400">Продажная цена</dt><dd className="font-medium text-slate-800">{formatMoney(salePrice)}</dd></div>
          <div><dt className="text-xs text-slate-400">Рекомендуемая цена</dt><dd className="font-medium text-slate-800">{formatMoney(minAllowedPrice)}</dd></div>
          <div><dt className="text-xs text-slate-400">Ожидаемая маржа</dt><dd className="font-medium text-slate-800">{expectedMarginPercent !== null ? `${expectedMarginPercent.toFixed(1)}%` : "—"}</dd></div>
        </dl>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">История закупочной цены</h3>
          <HistoryList points={purchasePriceHistory} emptyLabel="Поставщик ни разу не передавал закупочную цену" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">История продажной цены</h3>
          <HistoryList points={salePriceHistory} emptyLabel="Продажная цена ещё не устанавливалась" />
        </div>
      </div>
    </div>
  );
}
