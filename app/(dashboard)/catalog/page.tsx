import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Layers,
  PackagePlus,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingDown,
} from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import { getCatalogDashboardData } from "@/lib/catalog/queries/dashboard";
import { getSupplierOfferHomeCounts, listSupplierOffers } from "@/lib/catalog/queries/supplier-offers";
import { SUPPLIER_OFFER_STATUS_LABELS } from "@/lib/catalog/status/supplier-offer-status";

export const dynamic = "force-dynamic";

function formatMoney(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) + " ₸";
}

export default async function ProductCenterHomePage() {
  const [funnel, reference, needsAttention] = await Promise.all([
    getSupplierOfferHomeCounts(),
    getCatalogDashboardData(),
    listSupplierOffers(),
  ]);

  const attentionPreview = needsAttention
    .filter((o) => o.status !== "linked" && o.status !== "excluded")
    .slice(0, 8);

  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Товарный центр</h1>
          <p className="mt-1 text-sm text-slate-500">
            Что предлагают поставщики и что с этим нужно сделать дальше
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/catalog/imports/new"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Новый импорт
          </Link>
          <Link
            href="/catalog/supplier-offers"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Все предложения поставщиков
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Всего предложений поставщиков"
          value={String(funnel.total)}
          icon={ShoppingBag}
          href="/catalog/supplier-offers"
        />
        <KpiCard
          label="Новые (14 дней)"
          value={String(funnel.newCount)}
          icon={Sparkles}
          href="/catalog/supplier-offers?new=1"
        />
        <KpiCard
          label={SUPPLIER_OFFER_STATUS_LABELS.needs_base_product}
          value={String(funnel.needsBaseProduct)}
          icon={AlertTriangle}
          tone="warning"
          href="/catalog/supplier-offers?status=needs_base_product"
        />
        <KpiCard
          label="Уже есть базовый товар"
          value={String(funnel.hasBaseProduct)}
          icon={CheckCircle2}
          tone="positive"
          href="/catalog/supplier-offers"
        />
        <KpiCard
          label="Уже на маркетплейсах"
          value={String(funnel.linked)}
          icon={Store}
          tone="positive"
          href="/catalog/supplier-offers?status=linked"
        />
        <KpiCard
          label={SUPPLIER_OFFER_STATUS_LABELS.needs_marketplace_listing}
          value={String(funnel.needsMarketplaceListing)}
          icon={PackagePlus}
          tone="warning"
          href="/catalog/supplier-offers?status=needs_marketplace_listing"
        />
        <KpiCard
          label={SUPPLIER_OFFER_STATUS_LABELS.needs_commercial_offer}
          value={String(funnel.needsCommercialOffer)}
          icon={Layers}
          tone="warning"
          href="/catalog/supplier-offers?status=needs_commercial_offer"
        />
        <KpiCard
          label={SUPPLIER_OFFER_STATUS_LABELS.needs_review}
          value={String(funnel.needsReview)}
          icon={ClipboardList}
          tone="warning"
          href="/catalog/supplier-offers?status=needs_review"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Требуют внимания</h2>
          <Link href="/catalog/supplier-offers" className="text-sm font-medium text-blue-700 hover:underline">
            Смотреть все →
          </Link>
        </div>

        {attentionPreview.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Наименование</th>
                  <th className="px-3 py-2 font-medium">Поставщик</th>
                  <th className="px-3 py-2 font-medium">Закупка</th>
                  <th className="px-3 py-2 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {attentionPreview.map((offer) => (
                  <tr key={offer.id}>
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
                    <td className="px-3 py-3 text-slate-600">{SUPPLIER_OFFER_STATUS_LABELS[offer.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Всё разобрано — нет предложений, требующих внимания.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Маржа</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label="Ниже целевой маржи"
            value={String(reference.belowTargetMarginCount)}
            icon={TrendingDown}
            tone="warning"
            href="/catalog/margins"
          />
          <KpiCard
            label="Отрицательная маржа"
            value={String(reference.negativeMarginCount)}
            icon={TrendingDown}
            tone="negative"
            href="/catalog/margins?status=negative"
          />
          <KpiCard
            label="Цена не обновлена после смены закупки"
            value={String(reference.stalePriceCount)}
            icon={AlertTriangle}
            tone="warning"
            href="/catalog/margins"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Справочники</h2>
          <span className="text-xs text-slate-400">внутренние данные, не требуют регулярных действий</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/catalog/products"
            className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-blue-300"
          >
            <div className="flex items-center gap-2 text-slate-500">
              <Boxes size={16} />
              <span className="text-xs">Базовые товары</span>
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{reference.productMasterCount}</div>
          </Link>
          <Link
            href="/catalog/imports"
            className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-blue-300"
          >
            <div className="flex items-center gap-2 text-slate-500">
              <Layers size={16} />
              <span className="text-xs">Коммерческие предложения</span>
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{reference.commercialProductCount}</div>
          </Link>
          <Link
            href="/catalog/imports"
            className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-blue-300"
          >
            <div className="flex items-center gap-2 text-slate-500">
              <Store size={16} />
              <span className="text-xs">Листинги маркетплейсов</span>
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{reference.marketplaceListingCount}</div>
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Link
            href="/catalog/imports"
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Импорты
          </Link>
          <Link
            href="/catalog/margins"
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Маржа
          </Link>
          <Link
            href="/catalog/listing-strategies"
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Стратегии листингов
          </Link>
          <Link
            href="/catalog/categories"
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Категории
          </Link>
          <Link
            href="/catalog/brands"
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Бренды
          </Link>
        </div>
      </section>
    </div>
  );
}
