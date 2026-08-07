export function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Almaty",
  }).format(new Date(value));
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  ACCEPTED_BY_MERCHANT: "Принят",
  CANCELLED: "Отменён",
  COMPLETED: "Завершён",
  APPROVED_BY_BANK: "Подтверждён",
  KASPI_DELIVERY: "Kaspi Доставка",
  DELIVERY: "Доставка",
  PICKUP: "Самовывоз",
  NEW: "Новый",
  SIGN_REQUIRED: "Требуется подпись",
  ARCHIVE: "Архив",
  RETURNED: "Возврат",
  CANCELLING: "Отменяется",
};

export function orderStatusLabel(status: string | null | undefined) {
  return ORDER_STATUS_LABELS[status ?? ""] ?? status ?? "—";
}

export type OrderItemEntry = {
  name?: string;
  productName?: string;
  quantity?: number;
  count?: number;
};

export function parseOrderItems(value: unknown): OrderItemEntry[] {
  return Array.isArray(value) ? (value as OrderItemEntry[]) : [];
}
