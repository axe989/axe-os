import { NextResponse } from "next/server";
import { createClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  createCommercialProductFromListing,
  createMasterProductFromSupplierOffer,
} from "@/lib/catalog/products/create-product";
import type { AssortmentStatus } from "@/lib/catalog/types";

type CreateProductBody = {
  sourceType: "supplier_offer" | "marketplace_listing";
  sourceId: string;
  assortmentStatus: AssortmentStatus;
  reason: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateProductBody;
    const supabase = createSupabaseAdminClient();

    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    const changedBy = user?.email ?? null;

    if (body.sourceType === "supplier_offer") {
      const result = await createMasterProductFromSupplierOffer(supabase, {
        supplierOfferId: body.sourceId,
        assortmentStatus: body.assortmentStatus,
        reason: body.reason,
        changedBy,
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (body.sourceType === "marketplace_listing") {
      const result = await createCommercialProductFromListing(supabase, {
        marketplaceListingId: body.sourceId,
        assortmentStatus: body.assortmentStatus,
        reason: body.reason,
        changedBy,
      });
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json(
      { success: false, error: `Неизвестный тип источника: ${String(body.sourceType)}` },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
