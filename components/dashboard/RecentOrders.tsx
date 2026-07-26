import Link from "next/link";
import { ArrowUpRight, PackageSearch } from "lucide-react";
import type { DashboardOrder } from "@/lib/dashboard/queries";
import {
  formatMoney,
  formatOrderDate,
  orderStatusLabel,
  parseOrderItems,
} from "@/lib/orders/format";

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700",
  SIGN_REQUIRED: "bg-blue-50 text-blue-700",
  ACCEPTED_BY_MERCHANT: "bg-amber-50 text-amber-700",
  PICKUP: "bg-amber-50 text-amber-700",
  DELIVERY: "bg-amber-50 text-amber-700",
  KASPI_DELIVERY: "bg-amber-50 text-amber-700",
  APPROVED_BY_BANK: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  ARCHIVE: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-red-50 text-red-700",
  RETURNED: "bg-red-50 text-red-700",
  CANCELLING: "bg-red-50 text-red-700",
};

function statusStyle(status: string | null) {
  return STATUS_STYLES[status ?? ""] ?? "bg-slate-100 text-slate-600";
}

function itemsSummary(order: DashboardOrder, maxVisible = 2) {
  const items = parseOrderItems(order.items);

  if (items.length === 0) {
    return "Состав заказа не загружен";
  }

  const visible = items
    .slice(0, maxVisible)
    .map((item) => {
      const name = item.name ?? item.productName ?? "Товар";
      const quantity = item.quantity ?? item.count ?? 1;
      return `${name} × ${quantity}`;
    })
    .join(", ");

  const rest = items.length - maxVisible;

  return rest > 0 ? `${visible} и ещё ${rest}` : visible;
}

type RecentOrdersProps = {
  orders: DashboardOrder[];
};

export default function RecentOrders({ orders }: RecentOrdersProps) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400">
          <PackageSearch size={28} />
          <p className="text-sm">Нет заказов за выбранный период</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  № {order.external_code ?? "—"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {order.customer_name ?? "Клиент не указан"} ·{" "}
                  {formatOrderDate(order.order_date)}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {itemsSummary(order)}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(order.external_status)}`}
                >
                  {orderStatusLabel(order.external_status)}
                </span>

                <span className="text-sm font-semibold text-slate-900">
                  {formatMoney(order.sale_amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
