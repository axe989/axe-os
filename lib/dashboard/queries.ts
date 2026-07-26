import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { DateRange } from "./date-range";

export type DashboardOrder = {
  id: string;
  external_code: string | null;
  external_status: string | null;
  order_date: string;
  customer_name: string | null;
  sale_amount: number | string | null;
  delivery_type: string | null;
  items: unknown;
  purchased: boolean | null;
  profit: number | string | null;
  margin: number | string | null;
};

// "В пути" — order has left the seller and is being transported to the
// customer or a pickup point, but has not been finalized yet.
const IN_TRANSIT_STATUSES = ["DELIVERY", "KASPI_DELIVERY", "PICKUP"];

// "Поступившие" — order fully fulfilled and settled. Used to keep the
// average check from being skewed by orders still in transit or cancelled.
const RECEIVED_STATUS = "COMPLETED";

const CANCELLED_STATUS = "CANCELLED";

const RECENT_ORDERS_LIMIT = 8;
const ATTENTION_LIMIT = 5;
const ORDERS_QUERY_LIMIT = 1000;

export type DashboardData = {
  revenue: number;
  orderCount: number;
  profit: number;
  margin: number;
  pendingPurchaseCount: number;
  transitCount: number;
  transitAmount: number;
  receivedCount: number;
  averageReceivedCheck: number;
  recentOrders: DashboardOrder[];
  attention: {
    notPurchased: DashboardOrder[];
    negativeMargin: DashboardOrder[];
  };
};

export type DashboardResult =
  | { data: DashboardData; error?: undefined }
  | { data?: undefined; error: string };

export async function getDashboardData(
  range: DateRange,
): Promise<DashboardResult> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("sales_orders")
    .select(
      "id, external_code, external_status, order_date, customer_name, sale_amount, delivery_type, items, purchased, profit, margin",
    )
    .eq("sales_channel", "kaspi")
    .gte("order_date", range.from.toISOString())
    .lte("order_date", range.to.toISOString())
    .order("order_date", { ascending: false })
    .limit(ORDERS_QUERY_LIMIT);

  if (error) {
    return { error: error.message };
  }

  const orders = (data ?? []) as unknown as DashboardOrder[];

  const activeOrders = orders.filter(
    (order) => order.external_status !== CANCELLED_STATUS,
  );

  const revenue = activeOrders.reduce(
    (sum, order) => sum + Number(order.sale_amount ?? 0),
    0,
  );

  const profit = activeOrders.reduce(
    (sum, order) => sum + Number(order.profit ?? 0),
    0,
  );

  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const pendingPurchaseOrders = activeOrders.filter(
    (order) => !order.purchased,
  );

  const transitOrders = activeOrders.filter((order) =>
    IN_TRANSIT_STATUSES.includes(order.external_status ?? ""),
  );

  const transitAmount = transitOrders.reduce(
    (sum, order) => sum + Number(order.sale_amount ?? 0),
    0,
  );

  const receivedOrders = orders.filter(
    (order) => order.external_status === RECEIVED_STATUS,
  );

  const receivedRevenue = receivedOrders.reduce(
    (sum, order) => sum + Number(order.sale_amount ?? 0),
    0,
  );

  const averageReceivedCheck =
    receivedOrders.length > 0 ? receivedRevenue / receivedOrders.length : 0;

  const negativeMarginOrders = activeOrders.filter(
    (order) => Number(order.profit ?? 0) < 0,
  );

  return {
    data: {
      revenue,
      orderCount: orders.length,
      profit,
      margin,
      pendingPurchaseCount: pendingPurchaseOrders.length,
      transitCount: transitOrders.length,
      transitAmount,
      receivedCount: receivedOrders.length,
      averageReceivedCheck,
      recentOrders: orders.slice(0, RECENT_ORDERS_LIMIT),
      attention: {
        notPurchased: pendingPurchaseOrders.slice(0, ATTENTION_LIMIT),
        negativeMargin: negativeMarginOrders.slice(0, ATTENTION_LIMIT),
      },
    },
  };
}
