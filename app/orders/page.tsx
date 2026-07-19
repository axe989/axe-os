import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatMoney(value: number | string | null) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Almaty",
  }).format(new Date(value));
}

function statusLabel(status: string | null) {
  const labels: Record<string, string> = {
    ACCEPTED_BY_MERCHANT: "Принят",
    CANCELLED: "Отменён",
    COMPLETED: "Завершён",
    APPROVED_BY_BANK: "Подтверждён",
    KASPI_DELIVERY: "Kaspi Доставка",
    DELIVERY: "Доставка",
    PICKUP: "Самовывоз",
    NEW: "Новый",
  };

  return labels[status ?? ""] ?? status ?? "—";
}

export default async function OrdersPage() {
  const supabase = createSupabaseAdminClient();

  const { data: orders, error } = await supabase
    .from("sales_orders")
    .select(
      "id, external_code, external_status, order_date, customer_name, sale_amount, delivery_type",
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

  const totalOrders = orders?.length ?? 0;
  const totalSales =
    orders?.reduce(
      (sum, order) => sum + Number(order.sale_amount ?? 0),
      0,
    ) ?? 0;

  const cancelled =
    orders?.filter((order) => order.external_status === "CANCELLED")
      .length ?? 0;

  return (
    <main className="orders-page">
      <div className="orders-shell">
        <header className="orders-header">
          <div>
            <div className="brand">AXE ENGINEERING</div>
            <h1>Заказы Kaspi</h1>
            <p>Последние 100 заказов из Supabase</p>
          </div>

          <Link href="/" className="back-link">
            Поставщики
          </Link>
        </header>

        <section className="metrics">
          <article className="metric-card">
            <span>Заказы</span>
            <strong>{totalOrders}</strong>
          </article>

          <article className="metric-card">
            <span>Оборот</span>
            <strong>{formatMoney(totalSales)}</strong>
          </article>

          <article className="metric-card">
            <span>Отмены</span>
            <strong>{cancelled}</strong>
          </article>
        </section>

        <section className="table-card">
          <div className="table-heading">
            <div>
              <h2>Лента заказов</h2>
              <p>Данные загружены из таблицы sales_orders</p>
            </div>

            <a href="/api/orders" className="api-link">
              Открыть JSON
            </a>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Номер</th>
                  <th>Дата</th>
                  <th>Клиент</th>
                  <th>Статус</th>
                  <th>Доставка</th>
                  <th className="amount">Сумма</th>
                </tr>
              </thead>

              <tbody>
                {orders?.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.external_code ?? "—"}</strong>
                    </td>
                    <td>{formatDate(order.order_date)}</td>
                    <td>{order.customer_name ?? "—"}</td>
                    <td>
                      <span
                        className={
                          order.external_status === "CANCELLED"
                            ? "status status-cancelled"
                            : order.external_status === "COMPLETED"
                              ? "status status-completed"
                              : "status status-active"
                        }
                      >
                        {statusLabel(order.external_status)}
                      </span>
                    </td>
                    <td>{order.delivery_type ?? "—"}</td>
                    <td className="amount">
                      {formatMoney(order.sale_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
