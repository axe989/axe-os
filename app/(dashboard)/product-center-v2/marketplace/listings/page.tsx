import Link from "next/link";
import { listMarketplaceListings } from "@/lib/catalog/queries/marketplace-listings";

export const dynamic = "force-dynamic";

const CHANNEL_LABELS: Record<string, string> = {
  kaspi: "Kaspi",
  wb: "Wildberries",
  ozon: "Ozon",
  website: "Собственный сайт",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  active: "Активен",
  inactive: "Неактивен",
  archived: "Архивирован",
};

function formatMoney(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) + " ₸";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeZone: "Asia/Almaty" }).format(new Date(value));
}

type PageProps = {
  searchParams: Promise<{ channel?: string; reconciled?: string; status?: string; q?: string }>;
};

export default async function MarketplaceListingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const reconciled = params.reconciled === "matched" || params.reconciled === "unmatched" ? params.reconciled : undefined;

  const rows = await listMarketplaceListings({
    channel: params.channel || undefined,
    reconciled,
    listingStatus: params.status || undefined,
    search: params.q,
  });

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { ...params, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }
    const qs = next.toString();
    return qs ? `/product-center-v2/marketplace/listings?${qs}` : "/product-center-v2/marketplace/listings";
  };

  return (
    <section>
      <Link href="/product-center-v2/marketplace" className="text-sm text-blue-600 hover:underline">
        ← Маркетплейсы
      </Link>

      <div className="mt-2 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Листинги маркетплейса</h2>
          <p className="mt-1 text-xs text-slate-500">
            Реальные позиции, наблюдаемые на площадке — независимо от того, сопоставлены ли они с нашим каталогом.
          </p>
        </div>
        <span className="text-xs text-slate-400">{rows.length} позиций</span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={buildHref({ reconciled: undefined })} className={`rounded-full px-3 py-1 text-xs font-medium ${!params.reconciled ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
          Все
        </Link>
        <Link href={buildHref({ reconciled: "matched" })} className={`rounded-full px-3 py-1 text-xs font-medium ${params.reconciled === "matched" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
          Сопоставлены с каталогом
        </Link>
        <Link href={buildHref({ reconciled: "unmatched" })} className={`rounded-full px-3 py-1 text-xs font-medium ${params.reconciled === "unmatched" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
          Не сопоставлены
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Название на площадке</th>
                <th className="px-4 py-3">Канал</th>
                <th className="px-4 py-3">Артикул</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Цена</th>
                <th className="px-4 py-3">Синхронизация</th>
                <th className="px-4 py-3">Товар в каталоге AXE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-800">{row.title ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{CHANNEL_LABELS[row.salesChannel] ?? row.salesChannel}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.externalSku ?? row.externalListingId ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{STATUS_LABELS[row.listingStatus] ?? row.listingStatus}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatMoney(row.currentSalePrice)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(row.lastSyncedAt)}</td>
                  <td className="px-4 py-3">
                    {row.commercialProductId ? (
                      <Link href={`/product-center-v2/development/${row.commercialProductId}`} className="text-xs font-medium text-blue-600 hover:underline">
                        {row.commercialProductName ?? "Открыть товар"}
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">не сопоставлен</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    По выбранным фильтрам ничего не найдено
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
