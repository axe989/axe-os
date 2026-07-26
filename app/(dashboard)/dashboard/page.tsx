import { Suspense } from "react";
import {
  AlertCircle,
  DollarSign,
  PackageX,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Truck,
} from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentOrders from "@/components/dashboard/RecentOrders";
import AttentionWidget from "@/components/dashboard/AttentionWidget";
import DateRangeFilter from "@/components/dashboard/DateRangeFilter";
import { resolveDateRange } from "@/lib/dashboard/date-range";
import { getDashboardData } from "@/lib/dashboard/queries";
import { formatMoney, formatPercent } from "@/lib/orders/format";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    preset?: string;
  }>;
};

function DateRangeBar() {
  return (
    <Suspense
      fallback={
        <div className="h-[60px] rounded-2xl border border-slate-200 bg-white" />
      }
    >
      <DateRangeFilter />
    </Suspense>
  );
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const range = resolveDateRange(params);
  const result = await getDashboardData(range);

  if ("error" in result) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <DateRangeBar />

        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-sm">
            Не удалось загрузить данные дашборда: {result.error}
          </p>
        </div>
      </div>
    );
  }

  const data = result.data;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <DateRangeBar />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Оборот"
          value={formatMoney(data.revenue)}
          helper="Без учёта отменённых заказов"
          icon={DollarSign}
          tone="positive"
        />

        <KpiCard
          label="Заказы"
          value={String(data.orderCount)}
          helper={`${data.pendingPurchaseCount} ожидают закупки`}
          icon={ShoppingBag}
        />

        <KpiCard
          label="Прибыль"
          value={formatMoney(data.profit)}
          helper={`Маржа ${formatPercent(data.margin)}%`}
          icon={TrendingUp}
          tone={data.profit < 0 ? "negative" : "positive"}
        />

        <KpiCard
          label="Заказы в пути"
          value={String(data.transitCount)}
          helper={`На сумму ${formatMoney(data.transitAmount)}`}
          icon={Truck}
        />

        <KpiCard
          label="Средний чек"
          value={
            data.receivedCount > 0
              ? formatMoney(data.averageReceivedCheck)
              : "—"
          }
          helper={`${data.receivedCount} поступивших заказов`}
          icon={Receipt}
        />

        <KpiCard
          label="Не закуплено"
          value={String(data.pendingPurchaseCount)}
          helper="Требуется поставщик и закупочная цена"
          icon={PackageX}
          tone={data.pendingPurchaseCount > 0 ? "warning" : "positive"}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <QuickActions />
          <RecentOrders orders={data.recentOrders} />
        </div>

        <AttentionWidget
          notPurchased={data.attention.notPurchased}
          negativeMargin={data.attention.negativeMargin}
        />
      </section>
    </div>
  );
}
