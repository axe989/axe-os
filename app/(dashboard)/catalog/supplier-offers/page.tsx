import Link from "next/link";
import { listSupplierOffers } from "@/lib/catalog/queries/supplier-offers";
import { SUPPLIER_OFFER_STATUS_LABELS, type SupplierOfferSimpleStatus } from "@/lib/catalog/status/supplier-offer-status";
import AssortmentDecisionActions from "./AssortmentDecisionActions";
import ReviewActions from "./ReviewActions";

export const dynamic = "force-dynamic";

const STATUS_FILTERS: { value: SupplierOfferSimpleStatus | ""; label: string }[] = [
  { value: "", label: "Все" },
  { value: "needs_base_product", label: SUPPLIER_OFFER_STATUS_LABELS.needs_base_product },
  { value: "needs_review", label: SUPPLIER_OFFER_STATUS_LABELS.needs_review },
  { value: "needs_commercial_offer", label: SUPPLIER_OFFER_STATUS_LABELS.needs_commercial_offer },
  { value: "needs_marketplace_listing", label: SUPPLIER_OFFER_STATUS_LABELS.needs_marketplace_listing },
  { value: "linked", label: SUPPLIER_OFFER_STATUS_LABELS.linked },
  { value: "excluded", label: SUPPLIER_OFFER_STATUS_LABELS.excluded },
];

function statusClassName(status: SupplierOfferSimpleStatus) {
  switch (status) {
    case "linked":
      return "bg-emerald-50 text-emerald-700";
    case "needs_review":
      return "bg-amber-50 text-amber-700";
    case "needs_base_product":
      return "bg-blue-50 text-blue-700";
    case "needs_commercial_offer":
    case "needs_marketplace_listing":
      return "bg-purple-50 text-purple-700";
    case "excluded":
      return "bg-slate-100 text-slate-500";
  }
}

function formatMoney(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) + " ₸";
}

type PageProps = {
  searchParams: Promise<{ status?: string; new?: string; q?: string }>;
};

export default async function SupplierOffersPage({ searchParams }: PageProps) {
  const { status: rawStatus, new: onlyNewParam, q } = await searchParams;
  const status = STATUS_FILTERS.some((f) => f.value === rawStatus)
    ? (rawStatus as SupplierOfferSimpleStatus | undefined)
    : undefined;
  const onlyNew = onlyNewParam === "1";

  const offers = await listSupplierOffers({ status, onlyNew, search: q });

  const buildHref = (nextStatus?: string) => {
    const params = new URLSearchParams();
    if (nextStatus) params.set("status", nextStatus);
    if (onlyNew) params.set("new", "1");
    if (q) params.set("q", q);
    const qs = params.toString();
    return qs ? `/catalog/supplier-offers?${qs}` : "/catalog/supplier-offers";
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Предложения поставщиков</h2>
            <p className="mt-1 text-sm text-slate-500">
              Что сейчас предлагают поставщики и что с этим нужно сделать дальше
            </p>
          </div>
          <form action="/catalog/supplier-offers" className="flex gap-2">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            {onlyNew ? <input type="hidden" name="new" value="1" /> : null}
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Поиск по названию или артикулу…"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Найти
            </button>
          </form>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={buildHref(f.value || undefined)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                (status ?? "") === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </Link>
          ))}
          <Link
            href={onlyNew ? buildHref(status) : `${buildHref(status)}${status ? "&" : "?"}new=1`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              onlyNew ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Только новые (14 дней)
          </Link>
        </div>

        {offers.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Артикул</th>
                  <th className="px-3 py-2 font-medium">Наименование</th>
                  <th className="px-3 py-2 font-medium">Поставщик</th>
                  <th className="px-3 py-2 font-medium">Закупка</th>
                  <th className="px-3 py-2 font-medium">Остаток</th>
                  <th className="px-3 py-2 font-medium">Статус</th>
                  <th className="px-3 py-2 font-medium">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {offers.map((offer) => (
                  <tr key={offer.id}>
                    <td className="px-3 py-3 font-mono text-xs text-slate-700">{offer.supplierSku}</td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/catalog/supplier-offers/${offer.id}`}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {offer.nameRaw}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{offer.supplierName ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-600">{formatMoney(offer.purchasePrice)}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {offer.stockQuantity ?? "—"} · {offer.productCondition}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName(offer.status)}`}>
                        {SUPPLIER_OFFER_STATUS_LABELS[offer.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {offer.status === "needs_base_product" ? (
                        <AssortmentDecisionActions matchId={offer.matchId} supplierOfferId={offer.id} />
                      ) : offer.status === "needs_review" && offer.matchId ? (
                        <ReviewActions matchId={offer.matchId} />
                      ) : (
                        <Link
                          href={`/catalog/supplier-offers/${offer.id}`}
                          className="text-xs font-medium text-blue-700 hover:underline"
                        >
                          Открыть
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Нет предложений для выбранного фильтра.
          </div>
        )}

        <div className="mt-4 text-right">
          <Link href="/catalog/matching" className="text-xs text-slate-400 hover:text-slate-600 hover:underline">
            Расширенный режим: движок сопоставления →
          </Link>
        </div>
      </section>
    </div>
  );
}
