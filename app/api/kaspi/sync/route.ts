import { NextResponse } from "next/server";
import { syncKaspiOrders } from "@/lib/integrations/kaspi/kaspi-orders-sync";

export async function POST() {
  try {
    const result = await syncKaspiOrders();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Kaspi sync failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown Kaspi synchronization error",
      },
      { status: 500 },
    );
  }
}
