import {
  getAllKaspiOrdersByState,
  getKaspiOrderEntries,
  getKaspiOrderEntryProduct,
} from "@/lib/integrations/kaspi/orders";
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

const ENTRY_SYNC_CONCURRENCY = 4;

function getPersonName(person?: {
  firstName?: string;
  lastName?: string;
}) {
  return [person?.firstName, person?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

async function mapWithConcurrency<Item, Result>(
  items: Item[],
  limit: number,
  fn: (item: Item) => Promise<Result>,
): Promise<Result[]> {
  const results: Result[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );

  return results;
}

async function getOrderItems(
  orderId: string,
  productNameCache: Map<string, string>,
) {
  try {
    const entries = await getKaspiOrderEntries(orderId);

    return await Promise.all(
      entries.data.map(async (entry) => {
        const productId = entry.relationships?.product?.data?.id;
        let name = "Товар";

        if (productId) {
          const cached = productNameCache.get(productId);

          if (cached) {
            name = cached;
          } else {
            const product = await getKaspiOrderEntryProduct(entry.id);

            name = product.data.attributes.name;
            productNameCache.set(productId, name);
          }
        }

        return {
          name,
          quantity: entry.attributes.quantity,
          totalPrice: entry.attributes.totalPrice,
        };
      }),
    );
  } catch (error) {
    console.error(
      `Не удалось загрузить состав заказа ${orderId}:`,
      error,
    );

    return [];
  }
}

async function mapKaspiOrder(
  order: KaspiOrder,
  productNameCache: Map<string, string>,
) {
  const attributes = order.attributes;
  const recipient = attributes.recipient ?? attributes.customer;

  const customerName =
    getPersonName(recipient) ||
    getPersonName(attributes.customer) ||
    null;

  const items = await getOrderItems(order.id, productNameCache);

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
    items,
  };
}

export async function syncKaspiOrders() {
  const supabase = createSupabaseAdminClient();

  const dateTo = new Date();
  const dateFrom = new Date();

  dateFrom.setDate(dateFrom.getDate() - 14);

  const productNameCache = new Map<string, string>();

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

    const rows = await mapWithConcurrency(
      orders,
      ENTRY_SYNC_CONCURRENCY,
      (order) => mapKaspiOrder(order, productNameCache),
    );

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
