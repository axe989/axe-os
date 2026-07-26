import Link from "next/link";
import SyncKaspiButton from "./SyncKaspiButton";
import OrderFinanceEditor from "./OrderFinanceEditor";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isOrderInTransit } from "@/lib/orders/status";
import {
  formatMoney,
  formatOrderDate,
  formatPercent,
  orderStatusLabel,
  parseOrderItems,
} from "@/lib/orders/format";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  external_code: string | null;
  external_status: string | null;
  status: string | null;
  courier_handover_at: string | null;
  order_date: string;
  customer_name: string | null;
  sale_amount: number | string | null;
  delivery_type: string | null;
  items: unknown;
  purchased: boolean | null;
  supplier: string | null;
  purchase_price: number | string | null;
  logistics_cost: number | string | null;
  advertising_cost: number | string | null;
  profit: number | string | null;
  margin: number | string | null;
};

type OrdersPageProps = {
  searchParams: Promise<{ filter?: string }>;
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const { filter } = await searchParams;
  const isTransitFilter = filter === "transit";
  const isNotPurchasedFilter = filter === "not_purchased";

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("sales_orders")
    .select(
      "id, external_code, external_status, status, courier_handover_at, order_date, customer_name, sale_amount, delivery_type, items, purchased, supplier, purchase_price, logistics_cost, advertising_cost, profit, margin",
    )
    .eq("sales_channel", "kaspi")
    .order("order_date", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <main style={{ padding: 40, fontFamily: "Arial, sans-serif" }}>
        <h1>Ошибка загрузки заказов</h1>
        <p>{error.message}</p>
      </main>
    );
  }

  const allOrders = (data ?? []) as unknown as OrderRow[];

  const orders = isTransitFilter
    ? allOrders.filter((order) =>
        isOrderInTransit({
          kaspiState: order.status,
          kaspiDisposition: order.external_status,
          courierHandoverAt: order.courier_handover_at,
        }),
      )
    : isNotPurchasedFilter
      ? allOrders.filter(
          (order) =>
            !order.purchased && order.external_status !== "CANCELLED",
        )
      : allOrders;

  const activeOrders = orders.filter(
    (order) => order.external_status !== "CANCELLED",
  );

  const totalOrders = orders.length;

  const totalSales = activeOrders.reduce(
    (sum, order) => sum + Number(order.sale_amount ?? 0),
    0,
  );

  const totalProfit = activeOrders.reduce(
    (sum, order) => sum + Number(order.profit ?? 0),
    0,
  );

  const pendingPurchase = activeOrders.filter(
    (order) => !order.purchased,
  ).length;

  const cancelled = orders.filter(
    (order) => order.external_status === "CANCELLED",
  ).length;

  return (
    <main className="orders-page">
      <div className="orders-shell">
        <section className="metrics orders-metrics">
          <article className="metric-card">
            <span>Заказы</span>
            <strong>{totalOrders}</strong>
          </article>

          <article className="metric-card">
            <span>Оборот без отмен</span>
            <strong>{formatMoney(totalSales)}</strong>
          </article>

          <article className="metric-card">
            <span>Расчётная прибыль</span>
            <strong>{formatMoney(totalProfit)}</strong>
          </article>

          <article className="metric-card">
            <span>Нужно закупить</span>
            <strong>{pendingPurchase}</strong>
          </article>

          <article className="metric-card">
            <span>Отмены</span>
            <strong>{cancelled}</strong>
          </article>
        </section>

        <section className="table-card">
          <div className="table-heading">
            <div>
              <h2>
                {isTransitFilter
                  ? "Заказы в пути"
                  : isNotPurchasedFilter
                    ? "Не закуплено"
                    : "Лента заказов"}
              </h2>
              <p>
                {isTransitFilter
                  ? "Переданы курьеру или в процессе доставки, не отменены и не завершены"
                  : isNotPurchasedFilter
                    ? "Требуется поставщик и закупочная цена, отменённые заказы исключены"
                    : "Финансовые показатели сохраняются в sales_orders"}
              </p>
            </div>

            <div className="table-actions">
              <SyncKaspiButton />

              {isTransitFilter || isNotPurchasedFilter ? (
                <Link href="/orders" className="api-link">
                  Сбросить фильтр
                </Link>
              ) : null}

              <Link href="/api/orders" className="api-link">
                Открыть JSON
              </Link>
            </div>
          </div>

          <div className="orders-list">
            {orders.map((order) => {
              const items = parseOrderItems(order.items);
              const profit = Number(order.profit ?? 0);
              const isCancelled =
                order.external_status === "CANCELLED";

              return (
                <article
                  key={order.id}
                  className={
                    isCancelled
                      ? "order-card order-card-cancelled"
                      : "order-card"
                  }
                >
                  <div className="order-summary">
                    <div className="order-main">
                      <div className="order-number-row">
                        <strong className="order-number">
                          № {order.external_code ?? "—"}
                        </strong>

                        <span
                          className={
                            isCancelled
                              ? "status status-cancelled"
                              : order.external_status === "COMPLETED"
                                ? "status status-completed"
                                : "status status-active"
                          }
                        >
                          {orderStatusLabel(order.external_status)}
                        </span>
                      </div>

                      <div className="order-meta">
                        <span>{formatOrderDate(order.order_date)}</span>

                        <span>
                          {order.customer_name ??
                            "Клиент не указан"}
                        </span>

                        <span>
                          {order.delivery_type ??
                            "Тип доставки не указан"}
                        </span>
                      </div>

                      {items.length > 0 ? (
                        <div className="order-items">
                          {items.map((item, index) => (
                            <div key={`${order.id}-${index}`}>
                              {item.name ??
                                item.productName ??
                                "Товар"}
                              {" × "}
                              {item.quantity ?? item.count ?? 1}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="order-items-empty">
                          Состав заказа пока не загружен из Kaspi
                        </div>
                      )}
                    </div>

                    <div className="order-financial-summary">
                      <div>
                        <span>Продажа</span>
                        <strong>
                          {formatMoney(order.sale_amount)}
                        </strong>
                      </div>

                      <div>
                        <span>Прибыль</span>
                        <strong
                          className={
                            profit < 0
                              ? "profit-negative"
                              : "profit-positive"
                          }
                        >
                          {formatMoney(profit)}
                        </strong>
                      </div>

                      <div>
                        <span>Маржа</span>
                        <strong>
                          {formatPercent(order.margin)}%
                        </strong>
                      </div>
                    </div>
                  </div>

                  {!isCancelled ? (
                    <OrderFinanceEditor
                      orderId={order.id}
                      purchased={Boolean(order.purchased)}
                      supplier={order.supplier}
                      purchasePrice={order.purchase_price}
                      logisticsCost={order.logistics_cost}
                      advertisingCost={order.advertising_cost}
                    />
                  ) : (
                    <div className="cancelled-note">
                      Финансовое редактирование отменённого заказа
                      отключено
                    </div>
                  )}
                </article>
              );
            })}

            {orders.length === 0 ? (
              <div className="empty-orders">
                Заказы пока не загружены
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}