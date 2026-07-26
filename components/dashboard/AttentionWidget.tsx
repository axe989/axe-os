import Link from "next/link";
import { AlertTriangle, CheckCircle2, PackageX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AttentionGroup, DashboardOrder } from "@/lib/dashboard/queries";
import { formatMoney, parseOrderItems } from "@/lib/orders/format";

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

type RenderGroup = {
  key: string;
  title: string;
  icon: LucideIcon;
  tone: "warning" | "danger";
  totalCount: number;
  items: DashboardOrder[];
  metric: (order: DashboardOrder) => string;
  /** Link to see the full list elsewhere, when the display cap truncates it. */
  showAllHref?: string;
};

type AttentionWidgetProps = {
  notPurchased: AttentionGroup;
  negativeMargin: AttentionGroup;
};

export default function AttentionWidget({
  notPurchased,
  negativeMargin,
}: AttentionWidgetProps) {
  const groups: RenderGroup[] = [
    {
      key: "not-purchased",
      title: "Не закуплено",
      icon: PackageX,
      tone: "warning",
      totalCount: notPurchased.totalCount,
      items: notPurchased.items,
      metric: (order) => formatMoney(order.sale_amount),
      showAllHref: "/orders?filter=not_purchased",
    },
    {
      key: "negative-margin",
      title: "Отрицательная прибыль",
      icon: AlertTriangle,
      tone: "danger",
      totalCount: negativeMargin.totalCount,
      items: negativeMargin.items,
      metric: (order) => formatMoney(order.profit),
    },
  ];

  const totalIssues = groups.reduce(
    (sum, group) => sum + group.totalCount,
    0,
  );

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-900">
        Требует внимания
      </h2>

      {totalIssues === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400">
          <CheckCircle2 size={28} className="text-emerald-500" />
          <p className="text-sm">Нет проблемных заказов за выбранный период</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups
            .filter((group) => group.totalCount > 0)
            .map((group) => (
              <div key={group.key}>
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                      group.tone === "warning"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    <group.icon size={14} />
                  </span>
                  {group.title}
                  <span className="text-xs font-normal text-slate-400">
                    {group.totalCount}
                  </span>
                </p>

                <ul className="space-y-2">
                  {group.items.map((order) => (
                    <li
                      key={`${group.key}-${order.id}`}
                      className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">
                          № {order.external_code ?? "—"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {itemsSummary(order)}
                        </p>
                      </div>

                      <span className="shrink-0 text-xs font-semibold text-slate-700">
                        {group.metric(order)}
                      </span>
                    </li>
                  ))}
                </ul>

                {group.totalCount > group.items.length ? (
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>
                      Показано {group.items.length} из {group.totalCount}
                    </span>

                    {group.showAllHref ? (
                      <Link
                        href={group.showAllHref}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        Показать все
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
