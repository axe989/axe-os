import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  GitCompare,
  HelpCircle,
  Layers,
  PackageSearch,
  ShieldAlert,
  Store,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import { getCatalogDashboardData } from "@/lib/catalog/queries/dashboard";

export const dynamic = "force-dynamic";

export default async function CatalogDashboardPage() {
  const data = await getCatalogDashboardData();

  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Каталог</h1>
          <p className="mt-1 text-sm text-slate-500">
            Пилот: панельные радиаторы Royal Thermo
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
            href="/catalog/missing"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Отсутствующие товары
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Master Product"
          value={String(data.productMasterCount)}
          icon={Boxes}
          href="/catalog/products"
        />
        <KpiCard
          label="Commercial Product"
          value={String(data.commercialProductCount)}
          icon={Layers}
          href="/catalog/products"
        />
        <KpiCard
          label="Листингов маркетплейсов"
          value={String(data.marketplaceListingCount)}
          icon={Store}
          href="/catalog/imports"
        />
        <KpiCard
          label="Позиций от поставщиков"
          value={String(data.supplierOfferCount)}
          icon={PackageSearch}
          href="/catalog/imports"
        />
        <KpiCard
          label="Поставщики сопоставлены"
          value={String(data.matchedCount)}
          icon={GitCompare}
          tone="positive"
          href="/catalog/matching?status=matched"
        />
        <KpiCard
          label="Вероятные совпадения (поставщики)"
          value={String(data.probableCount)}
          icon={HelpCircle}
          tone="warning"
          href="/catalog/matching?status=probable&entity=supplier"
        />
        <KpiCard
          label="Отсутствуют Master Product"
          value={String(data.missingCount)}
          icon={AlertTriangle}
          tone="warning"
          href="/catalog/missing"
        />
        <KpiCard
          label="Конфликты (поставщики)"
          value={String(data.conflictCount)}
          icon={ShieldAlert}
          tone="negative"
          href="/catalog/matching?status=conflict&entity=supplier"
        />
        <KpiCard
          label="Требуют проверки (поставщики)"
          value={String(data.reviewCount)}
          icon={HelpCircle}
          tone="warning"
          href="/catalog/matching"
        />
        <KpiCard
          label="Kaspi листинги сопоставлены"
          value={String(data.listingMatchedCount)}
          icon={GitCompare}
          tone="positive"
          href="/catalog/matching?entity=listing&status=matched"
        />
        <KpiCard
          label="Kaspi листинги без Commercial Product"
          value={String(data.listingMissingCount)}
          icon={AlertTriangle}
          tone="warning"
          href="/catalog/missing"
        />
        <KpiCard
          label="Ниже целевой маржи"
          value={String(data.belowTargetMarginCount)}
          icon={TrendingDown}
          tone="warning"
          href="/catalog/margins"
        />
        <KpiCard
          label="Отрицательная маржа"
          value={String(data.negativeMarginCount)}
          icon={TrendingDown}
          tone="negative"
          href="/catalog/margins?status=negative"
        />
        <KpiCard
          label="Цена не обновлена после смены закупки"
          value={String(data.stalePriceCount)}
          icon={TrendingUp}
          tone="warning"
          href="/catalog/margins"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          href="/catalog/products"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-300"
        >
          <h2 className="text-base font-semibold text-slate-900">Мастер-каталог</h2>
          <p className="mt-1 text-sm text-slate-500">
            Товары, характеристики, статусы ассортимента и публикации
          </p>
        </Link>
        <Link
          href="/catalog/imports"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-300"
        >
          <h2 className="text-base font-semibold text-slate-900">Импорты</h2>
          <p className="mt-1 text-sm text-slate-500">
            Остатки поставщиков, текущий каталог и цены репрайсера
          </p>
        </Link>
        <Link
          href="/catalog/matching"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-300"
        >
          <h2 className="text-base font-semibold text-slate-900">Сопоставление</h2>
          <p className="mt-1 text-sm text-slate-500">
            Проверка и подтверждение связей поставщик → товар
          </p>
        </Link>
        <Link
          href="/catalog/margins"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-300"
        >
          <h2 className="text-base font-semibold text-slate-900">Маржа</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ожидаемая и фактическая маржа по товарам и каналам
          </p>
        </Link>
        <Link
          href="/catalog/listing-strategies"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-300"
        >
          <h2 className="text-base font-semibold text-slate-900">Стратегии листингов</h2>
          <p className="mt-1 text-sm text-slate-500">
            Группировка листингов по назначению: основной, сезонный, A/B-тест
          </p>
        </Link>
      </section>
    </div>
  );
}
