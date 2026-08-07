import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicationExportSnapshot, MediaRole } from "../types";
import type { ResolvedPublicationItem } from "./resolve-item";
import { KASPI_TEMPLATE_VERSION } from "./adapters/kaspi-csv";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

const ATTRIBUTE_FIELD_DICTIONARIES: Array<{
  field: "type" | "construction" | "connection" | "sectionNumber";
  dictionaryCode: string;
}> = [
  { field: "type", dictionaryCode: "radiator_category" },
  { field: "construction", dictionaryCode: "construction" },
  { field: "connection", dictionaryCode: "connection" },
  { field: "sectionNumber", dictionaryCode: "section_number" },
];

// Builds the immutable snapshot written exactly once to
// marketplace_publication_items.export_snapshot. Everything it needs
// (resolved attributes, equipment, generated SKU, the exact CSV row) is
// already computed by resolvePublicationItem -- this only adds the
// commercial product / content variant identity fields and the full
// media item list, which preview doesn't need but a historical export
// does (see architecture decision: "reproducible even if Product,
// Commercial Product, pricing, content or media changes later").
export async function buildExportSnapshot(
  supabase: AnySupabase,
  params: {
    resolved: ResolvedPublicationItem;
    commercialProduct: { id: string; commercial_name: string; bundle_code: string | null };
    contentVariant: { id: string; sales_channel: string | null; title: string; description: string | null };
  },
): Promise<PublicationExportSnapshot> {
  const { resolved, commercialProduct, contentVariant } = params;

  const attributes: PublicationExportSnapshot["attributes"] = [];
  for (const { field, dictionaryCode } of ATTRIBUTE_FIELD_DICTIONARIES) {
    const value = resolved.context[field];
    if (value) {
      attributes.push({
        dictionary_code: dictionaryCode,
        value_code: value.valueCode,
        display_label: value.displayLabel,
        translated_value: value.translatedValue ?? "",
      });
    }
  }
  for (const [dictionaryCode, values] of [
    ["material", resolved.context.material],
    ["color", resolved.context.color],
  ] as const) {
    for (const value of values) {
      attributes.push({
        dictionary_code: dictionaryCode,
        value_code: value.valueCode,
        display_label: value.displayLabel,
        translated_value: value.translatedValue ?? "",
      });
    }
  }

  const equipment: PublicationExportSnapshot["equipment"] = resolved.context.equipment.map((line) => ({
    value_code: line.valueCode,
    display_label: line.displayLabel,
    translated_value: line.translatedValue ?? "",
    quantity: 1,
  }));

  let media: PublicationExportSnapshot["media"] = null;
  if (resolved.mediaResolution) {
    const { data: items } = await supabase
      .from("media_set_items")
      .select("media_asset_id, role, sort_order, media_assets ( storage_path, checksum )")
      .eq("media_set_id", resolved.mediaResolution.mediaSetId)
      .order("sort_order", { ascending: true });

    media = {
      resolved_from: resolved.mediaResolution.resolvedFrom,
      media_set_id: resolved.mediaResolution.mediaSetId,
      items: (items ?? []).map((row) => {
        const asset = Array.isArray(row.media_assets) ? row.media_assets[0] : row.media_assets;
        return {
          media_asset_id: row.media_asset_id as string,
          role: row.role as MediaRole,
          sort_order: row.sort_order as number,
          storage_path: (asset as { storage_path: string } | null)?.storage_path ?? "",
          checksum: (asset as { checksum: string | null } | null)?.checksum ?? null,
        };
      }),
    };
  }

  return {
    schema_version: 1,
    captured_at: new Date().toISOString(),
    commercial_product: {
      id: commercialProduct.id,
      commercial_name: commercialProduct.commercial_name,
      bundle_code: commercialProduct.bundle_code,
    },
    content_variant: {
      id: contentVariant.id,
      sales_channel: contentVariant.sales_channel,
      title: contentVariant.title,
      description: contentVariant.description,
    },
    merchant_sku: resolved.sellerSku ?? "",
    attributes,
    equipment,
    media,
    adapter: "kaspi_csv_v1",
    template_version: KASPI_TEMPLATE_VERSION,
    exported_row: resolved.row,
  };
}
