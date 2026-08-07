import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { resolvePublicationItem, type ResolvedPublicationItem } from "../publication/resolve-item";
import type { PublicationMode, PublicationStatus } from "../types";

export type PublicationListRow = {
  id: string;
  commercialProductId: string;
  commercialProductName: string;
  contentVariantTitle: string | null;
  salesChannel: string;
  publicationMode: PublicationMode;
  sellerSku: string | null;
  status: PublicationStatus;
  validationErrorCount: number;
  approvedAt: string | null;
  createdAt: string;
};

export async function listPublicationItems(): Promise<PublicationListRow[]> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("marketplace_publication_items")
    .select(
      "id, commercial_product_id, sales_channel, publication_mode, seller_sku, status, validation_errors, approved_at, created_at, commercial_products ( commercial_name ), marketplace_content_variants ( title )",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(`Не удалось загрузить публикации: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const commercialProduct = Array.isArray(row.commercial_products) ? row.commercial_products[0] : row.commercial_products;
    const contentVariant = Array.isArray(row.marketplace_content_variants)
      ? row.marketplace_content_variants[0]
      : row.marketplace_content_variants;

    return {
      id: row.id as string,
      commercialProductId: row.commercial_product_id as string,
      commercialProductName: (commercialProduct as { commercial_name: string } | null)?.commercial_name ?? "—",
      contentVariantTitle: (contentVariant as { title: string } | null)?.title ?? null,
      salesChannel: row.sales_channel as string,
      publicationMode: row.publication_mode as PublicationMode,
      sellerSku: row.seller_sku as string | null,
      status: row.status as PublicationStatus,
      validationErrorCount: Array.isArray(row.validation_errors) ? row.validation_errors.length : 0,
      approvedAt: row.approved_at as string | null,
      createdAt: row.created_at as string,
    };
  });
}

export type PublicationItemDetail = {
  id: string;
  commercialProductId: string;
  commercialProductName: string;
  contentVariantId: string;
  contentVariantTitle: string;
  salesChannel: string;
  publicationMode: PublicationMode;
  status: PublicationStatus;
  sellerSkuStored: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  resolved: ResolvedPublicationItem;
};

export async function getPublicationItemDetail(id: string): Promise<PublicationItemDetail> {
  const supabase = createSupabaseAdminClient();

  const { data: item, error } = await supabase
    .from("marketplace_publication_items")
    .select(
      "id, commercial_product_id, content_variant_id, sales_channel, publication_mode, status, seller_sku, approved_by, approved_at, created_at, commercial_products ( commercial_name ), marketplace_content_variants ( title )",
    )
    .eq("id", id)
    .single();

  if (error || !item) {
    throw new Error(`Позиция публикации не найдена: ${error?.message}`);
  }

  const commercialProduct = Array.isArray(item.commercial_products) ? item.commercial_products[0] : item.commercial_products;
  const contentVariant = Array.isArray(item.marketplace_content_variants)
    ? item.marketplace_content_variants[0]
    : item.marketplace_content_variants;

  const resolved = await resolvePublicationItem(supabase, {
    commercialProductId: item.commercial_product_id as string,
    contentVariantId: item.content_variant_id as string,
    salesChannel: item.sales_channel as string,
    publicationItemIdToExclude: item.id as string,
  });

  return {
    id: item.id as string,
    commercialProductId: item.commercial_product_id as string,
    commercialProductName: (commercialProduct as { commercial_name: string } | null)?.commercial_name ?? "—",
    contentVariantId: item.content_variant_id as string,
    contentVariantTitle: (contentVariant as { title: string } | null)?.title ?? "—",
    salesChannel: item.sales_channel as string,
    publicationMode: item.publication_mode as PublicationMode,
    status: item.status as PublicationStatus,
    sellerSkuStored: item.seller_sku as string | null,
    approvedBy: item.approved_by as string | null,
    approvedAt: item.approved_at as string | null,
    createdAt: item.created_at as string,
    resolved,
  };
}

export type CommercialProductOption = {
  id: string;
  commercialName: string;
  masterProductName: string;
};

export async function listCommercialProductOptions(): Promise<CommercialProductOption[]> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("commercial_products")
    .select("id, commercial_name, product_master ( name )")
    .in("assortment_status", ["active", "order_only", "candidate"])
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(`Не удалось загрузить коммерческие товары: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const master = Array.isArray(row.product_master) ? row.product_master[0] : row.product_master;
    return {
      id: row.id as string,
      commercialName: row.commercial_name as string,
      masterProductName: (master as { name: string } | null)?.name ?? "—",
    };
  });
}

export type ContentVariantOption = {
  id: string;
  title: string;
  salesChannel: string | null;
  isDefault: boolean;
};

export async function listContentVariantsForCommercialProduct(
  commercialProductId: string,
): Promise<ContentVariantOption[]> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("marketplace_content_variants")
    .select("id, title, sales_channel, is_default")
    .eq("commercial_product_id", commercialProductId)
    .order("is_default", { ascending: false });

  if (error) {
    throw new Error(`Не удалось загрузить контент-варианты: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    salesChannel: row.sales_channel as string | null,
    isDefault: Boolean(row.is_default),
  }));
}
