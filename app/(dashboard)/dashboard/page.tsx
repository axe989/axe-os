import { DollarSign, Percent, ShoppingBag, TrendingUp } from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentOrders from "@/components/dashboard/RecentOrders";
import AttentionWidget from "@/components/dashboard/AttentionWidget";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Оборот за месяц"
          value="4 820 000 ₸"
          helper="+12% к прошлому месяцу"
          icon={DollarSign}
          tone="positive"
        />

        <KpiCard
          label="Заказы"
          value="128"
          helper="18 ожидают закупки"
          icon={ShoppingBag}
        />

        <KpiCard
          label="Прибыль"
          value="1 140 500 ₸"
          helper="Маржа 23.7%"
          icon={TrendingUp}
          tone="positive"
        />

        <KpiCard
          label="Средняя маржа"
          value="23.7%"
          helper="-1.2 п.п. за неделю"
          icon={Percent}
          tone="negative"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <QuickActions />
          <RecentOrders />
        </div>

        <AttentionWidget />
      </section>
    </div>
  );
}
