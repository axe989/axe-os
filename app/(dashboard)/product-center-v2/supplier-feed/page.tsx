import Link from "next/link";
import { listSupplierFeed } from "@/lib/catalog/queries/supplier-feed";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  not_matched: "Не сопоставлен",
  matched: "Сопоставлен",
  accepted: "Принят",
  rejected: "Отклонён",
  postponed: "Отложен",
  ignored: "Проигнорирован",
};

function statusClassName(status: string) {
  switch (status) {
    case "accepted":
    case "matched":
      return "bg-emerald-50 text-emerald-700";
    case "rejected":
      return "bg-red-50 text-red-700";
    case "postponed":
      return "bg-amber-50 text-amber-700";
    case "ignored":
      return "bg-slate-100 text-slate-500";
    default:
      return "bg-blue-50 text-blue-700";
  }
}

function formatMoney(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) + " ₸";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeZone: "Asia/Almaty" }).format(new Date(value));
}

type PageProps = {
  searchParams: Promise<{
    brand?: string;
    availability?: string;
    new?: string;
    removed?: string;
    priceChanged?: string;
    stockChanged?: string;
    q?: string;
  }>;
};

export default async function SupplierFeedPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const rows = await listSupplierFeed({
    brand: params.brand || undefined,
    availability: params.availability === "available" || params.availability === "unavailable" ? params.availability : undefined,
    onlyNew: params.new === "1",
    onlyRemoved: params.removed === "1",
    onlyPriceChanged: params.priceChanged === "1",
    onlyStockChanged: params.stockChanged === "1",
    search: params.q,
  });

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { ...params, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }
    const qs = next.toString();
    return qs ? `/product-center-v2/supplier-feed?${qs}` : "/product-center-v2/supplier-feed";
  };

  const toggleHref = (key: "new" | "removed" | "priceChanged" | "stockChanged") =>
    buildHref({ [key]: params[key] === "1" ? undefined : "1" });

  const brands = Array.from(new Set(rows.map((r) => r.brandRaw).filter((b): b is string => Boolean(b)))).sort();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Фильтры</h3>

          <form method="get" className="mb-4">
            {params.brand ? <input type="hidden" name="brand" value={params.brand} /> : null}
            {params.availability ? <input type="hidden" name="availability" value={params.availability} /> : null}
            {params.new === "1" ? <input type="hidden" name="new" value="1" /> : null}
            {params.removed === "1" ? <input type="hidden" name="removed" value="1" /> : null}
            {params.priceChanged === "1" ? <input type="hidden" name="priceChanged" value="1" /> : null}
            {params.stockChanged === "1" ? <input type="hidden" name="stockChanged" value="1" /> : null}
            <input
              type="text"
              name="q"
              defaultValue={params.q}
              placeholder="Поиск: название, SKU"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </form>

          <div className="mb-4">
            <div className="mb-1.5 text-xs font-medium text-slate-500">Бренд ({brands.length})</div>
            <div className="flex flex-wrap gap-1">
              {brands.slice(0, 8).map((b) => (
                <Link
                  key={b}
                  href={buildHref({ brand: params.brand === b ? undefined : b })}
                  className={`rounded-full px-2 py-0.5 text-xs ${params.brand === b ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {b}
                </Link>
              ))}
            </div>
          </div>

          <div className="mb-4 space-y-1">
            <div className="mb-1.5 text-xs font-medium text-slate-500">Наличие</div>
            <Link href={buildHref({ availability: undefined })} className={`block rounded-lg px-2 py-1 text-sm ${!params.availability ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>Все</Link>
            <Link href={buildHref({ availability: "available" })} className={`block rounded-lg px-2 py-1 text-sm ${params.availability === "available" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>В наличии</Link>
            <Link href={buildHref({ availability: "unavailable" })} className={`block rounded-lg px-2 py-1 text-sm ${params.availability === "unavailable" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>Нет в наличии</Link>
          </div>

          <div className="space-y-1">
            <div className="mb-1.5 text-xs font-medium text-slate-500">Изменения</div>
            {(
              [
                ["new", "Новые (14 дней)"],
                ["removed", "Пропавшие со склада"],
                ["priceChanged", "Изменилась цена"],
                ["stockChanged", "Изменился остаток"],
              ] as const
            ).map(([key, label]) => (
              <Link
                key={key}
                href={toggleHref(key)}
                className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${params[key] === "1" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <span className={`h-3.5 w-3.5 rounded border ${params[key] === "1" ? "border-blue-600 bg-blue-600" : "border-slate-300"}`} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </aside>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Лента поставщиков</h2>
          <span className="text-xs text-slate-400">{rows.length} позиций</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Поставщик</th>
                <th className="px-4 py-3">SKU / товар</th>
                <th className="px-4 py-3">Закупочная цена</th>
                <th className="px-4 py-3">Наличие</th>
                <th className="px-4 py-3">Обновлено</th>
                <th className="px-4 py-3">Статус в AXE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{row.supplierName}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{row.nameRaw ?? "—"}</div>
                    <div className="font-mono text-xs text-slate-400">{row.supplierSku ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatMoney(row.purchasePrice)}
                    {row.priceChanged ? <span className="ml-1.5 text-xs font-semibold text-amber-600">изм.</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={row.isAvailable ? "text-emerald-700" : "text-red-600"}>
                      {row.isAvailable ? `В наличии${row.stockQuantity !== null ? ` · ${row.stockQuantity}` : ""}` : "Нет"}
                    </span>
                    {row.stockChanged ? <span className="ml-1.5 text-xs font-semibold text-amber-600">изм.</span> : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDate(row.lastSeenAt)}
                    {row.isNew ? <span className="ml-1.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">новый</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(row.statusInAxe)}`}>
                      {STATUS_LABELS[row.statusInAxe] ?? row.statusInAxe}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    По выбранным фильтрам ничего не найдено
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
