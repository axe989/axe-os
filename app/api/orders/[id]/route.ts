import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type UpdateOrderPayload = {
  purchased?: boolean;
  supplier?: string | null;
  purchase_price?: number | null;
  logistics_cost?: number | null;
  advertising_cost?: number | null;
  manager?: string | null;
  note?: string | null;
};

function normalizeMoney(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw new Error(
      "Финансовые значения должны быть неотрицательными числами",
    );
  }

  return number;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateOrderPayload;
    const supabase = createSupabaseAdminClient();

    const { data: currentOrder, error: readError } = await supabase
      .from("sales_orders")
      .select(
        "id, sale_amount, purchased, purchased_at, supplier, purchase_price, logistics_cost, advertising_cost, manager, note",
      )
      .eq("id", id)
      .single();

    if (readError || !currentOrder) {
      return NextResponse.json(
        {
          success: false,
          error: readError?.message ?? "Заказ не найден",
        },
        { status: 404 },
      );
    }

    const purchasePrice =
      body.purchase_price !== undefined
        ? normalizeMoney(body.purchase_price)
        : normalizeMoney(currentOrder.purchase_price);

    const logisticsCost =
      body.logistics_cost !== undefined
        ? normalizeMoney(body.logistics_cost)
        : normalizeMoney(currentOrder.logistics_cost);

    const advertisingCost =
      body.advertising_cost !== undefined
        ? normalizeMoney(body.advertising_cost)
        : normalizeMoney(currentOrder.advertising_cost);

    const saleAmount = normalizeMoney(currentOrder.sale_amount);
    const profit =
      saleAmount - purchasePrice - logisticsCost - advertisingCost;
    const margin = saleAmount > 0 ? (profit / saleAmount) * 100 : 0;

    const purchased =
      body.purchased !== undefined
        ? body.purchased
        : Boolean(currentOrder.purchased);

    const updateData = {
      purchased,
      purchased_at:
        body.purchased === true
          ? new Date().toISOString()
          : body.purchased === false
            ? null
            : currentOrder.purchased_at,
      supplier:
        body.supplier !== undefined
          ? body.supplier?.trim() || null
          : currentOrder.supplier,
      purchase_price: purchasePrice,
      logistics_cost: logisticsCost,
      advertising_cost: advertisingCost,
      manager:
        body.manager !== undefined
          ? body.manager?.trim() || null
          : currentOrder.manager,
      note:
        body.note !== undefined
          ? body.note?.trim() || null
          : currentOrder.note,
      profit,
      margin,
    };

    const { data, error } = await supabase
      .from("sales_orders")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      order: data,
    });
  } catch (error) {
    console.error("Order update failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Не удалось обновить заказ",
      },
      { status: 500 },
    );
  }
}
