import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type OrderStatus = "Новый" | "Принят" | "Завершён" | "Отменён";

type RecentOrder = {
  code: string;
  customer: string;
  date: string;
  status: OrderStatus;
  amount: string;
};

const RECENT_ORDERS: RecentOrder[] = [
  {
    code: "80234561",
    customer: "Айгерим Сатова",
    date: "24 июл, 18:42",
    status: "Новый",
    amount: "184 500 ₸",
  },
  {
    code: "80234498",
    customer: "Ержан Абенов",
    date: "24 июл, 15:10",
    status: "Принят",
    amount: "92 300 ₸",
  },
  {
    code: "80234321",
    customer: "Дана Куатова",
    date: "23 июл, 21:05",
    status: "Завершён",
    amount: "310 000 ₸",
  },
  {
    code: "80234287",
    customer: "Клиент не указан",
    date: "23 июл, 12:37",
    status: "Отменён",
    amount: "45 900 ₸",
  },
  {
    code: "80234190",
    customer: "Марат Жумабеков",
    date: "22 июл, 09:14",
    status: "Завершён",
    amount: "128 750 ₸",
  },
];

const STATUS_STYLES: Record<OrderStatus, string> = {
  Новый: "bg-blue-50 text-blue-700",
  Принят: "bg-amber-50 text-amber-700",
  Завершён: "bg-emerald-50 text-emerald-700",
  Отменён: "bg-red-50 text-red-700",
};

export default function RecentOrders() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">
          Последние заказы
        </h2>

        <Link
          href="/orders"
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Все заказы
          <ArrowUpRight size={16} />
        </Link>
      </div>

      <div className="divide-y divide-slate-100">
        {RECENT_ORDERS.map((order) => (
          <div
            key={order.code}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                № {order.code}
              </p>
              <p className="truncate text-xs text-slate-500">
                {order.customer} · {order.date}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[order.status]}`}
              >
                {order.status}
              </span>

              <span className="w-24 text-right text-sm font-semibold text-slate-900">
                {order.amount}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
