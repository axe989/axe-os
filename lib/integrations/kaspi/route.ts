import { NextResponse } from "next/server";

import { getKaspiOrders } from "@/lib/integrations/kaspi/orders";

export async function GET() {
  try {
    const dateTo = new Date();
    const dateFrom = new Date();

    dateFrom.setDate(dateFrom.getDate() - 14);

    const orders = await getKaspiOrders({
      page: 0,
      pageSize: 20,
      state: "NEW",
      dateFrom,
      dateTo,
    });

    return NextResponse.json(orders);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Неизвестная ошибка синхронизации Kaspi";

    console.error("Kaspi orders error:", error);

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}