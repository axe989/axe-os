import { getAllKaspiOrdersByState } from "@/lib/integrations/kaspi/orders";
import type {
  KaspiOrder,
  KaspiOrderState,
} from "@/lib/integrations/kaspi/types";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const KASPI_STATES: KaspiOrderState[] = [
  "NEW",
  "SIGN_REQUIRED",
  "PICKUP",
  "DELIVERY",
  "KASPI_DELIVERY",
  "ARCHIVE",
];

function getPersonName(person?: {
  firstName?: string;
  lastName?: string;
}) {
  return [person?.firstName, person?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function mapKaspiOrder(order: KaspiOrder) {
  const attributes = order.attributes;
  const recipient = attributes.recipient ?? attributes.customer;

  const customerName =
    getPersonName(recipient) ||
    getPersonName(attributes.customer) ||
    null;

  return {
    sales_channel: "kaspi",
    external_id: order.id,
    external_order_id: order.id,
    external_code: attributes.code,
    external_status: attributes.status ?? attributes.state,
    status: attributes.state,
    sale_amount: attributes.totalPrice ?? 0,
    delivery_type: attributes.deliveryMode ?? null,
    delivery_cost:
      attributes.deliveryCostForSeller ??
      attributes.deliveryCost ??
      0,
    payment_mode: attributes.paymentMode ?? null,
    customer_phone:
      recipient?.cellPhone ??
      attributes.customer?.cellPhone ??
      null,
    recipient_name: customerName,
    customer_name: customerName,
    order_date: new Date(attributes.creationDate).toISOString(),
    synced_at: new Date().toISOString(),
    source_payload: order,
  };
}

export async function syncKaspiOrders() {
  const supabase = createSupabaseAdminClient();

  const dateTo = new Date();
  const dateFrom = new Date();

  dateFrom.setDate(dateFrom.getDate() - 14);

  let received = 0;
  let saved = 0;

  for (const state of KASPI_STATES) {
    const orders = await getAllKaspiOrdersByState(
      state,
      dateFrom,
      dateTo,
    );

    received += orders.length;

    if (orders.length === 0) {
      continue;
    }

    const rows = orders.map(mapKaspiOrder);

    const { data, error } = await supabase
      .from("sales_orders")
      .upsert(rows, {
        onConflict: "sales_channel,external_id",
      })
      .select("id");

    if (error) {
      throw new Error(
        `Ошибка сохранения заказов ${state}: ${error.message}`,
      );
    }

    saved += data?.length ?? 0;
  }

  return {
    received,
    saved,
    syncedAt: new Date().toISOString(),
  };
}
