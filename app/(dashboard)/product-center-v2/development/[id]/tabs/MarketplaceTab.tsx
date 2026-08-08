import type { ProductCardListing } from "@/lib/catalog/queries/product-card";

function formatMoney(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) + " ₸";
}

function formatDate(value: string | null) {
  if (!value) return "не синхронизировано";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Almaty" }).format(new Date(value));
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  active: "Активен",
  inactive: "Неактивен",
  archived: "Архивирован",
};

export default function MarketplaceTab({ listings }: { listings: ProductCardListing[] }) {
  if (listings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
        Этот коммерческий товар ещё не представлен ни на одном маркетплейсе
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((listing) => (
        <div key={listing.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold uppercase text-slate-700">{listing.salesChannel}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{STATUS_LABELS[listing.listingStatus] ?? listing.listingStatus}</span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-slate-400">ID листинга</dt><dd className="font-mono text-xs text-slate-700">{listing.externalListingId ?? "—"}</dd></div>
            <div><dt className="text-xs text-slate-400">Артикул продавца</dt><dd className="font-mono text-xs text-slate-700">{listing.externalSku ?? "—"}</dd></div>
            <div><dt className="text-xs text-slate-400">Цена на площадке</dt><dd className="font-medium text-slate-800">{formatMoney(listing.currentSalePrice)}</dd></div>
            <div><dt className="text-xs text-slate-400">Последняя синхронизация</dt><dd className="text-xs text-slate-600">{formatDate(listing.lastSyncedAt)}</dd></div>
          </dl>
          {listing.title ? <p className="mt-2 text-xs text-slate-500">{listing.title}</p> : null}
          {listing.kaspiUrl ? (
            <a href={listing.kaspiUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:underline">
              Открыть на Kaspi →
            </a>
          ) : null}
        </div>
      ))}
    </div>
  );
}
