import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveMediaSet, type MediaResolution } from "../media/resolve-media-set";
import { resolveAttributeTranslation } from "../attributes/resolve-translation";
import { resolveEquipmentFromBundle } from "./resolve-equipment";
import { generateSellerSku } from "./generate-seller-sku";
import {
  validatePublicationItem,
  type AdapterRequiredFieldCheck,
  type PublicationValidationError,
} from "./validation";
import { buildKaspiRow, kaspiRequiredFields, type KaspiRowContext } from "./adapters/kaspi-csv";
import type {
  AttributeChannelTranslation,
  AttributeDictionaryValue,
  BundleComponent,
} from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

// Everything technical_attributes may carry for the Heating Radiators
// pilot category. Dictionary-backed dimensions store a canonical code
// (or array of codes for multi-select); everything else is a plain
// number/string/boolean filled in during content work. Fields not yet
// captured anywhere in AXE OS (see the approved gap analysis) are simply
// absent and surface as validation errors, never fabricated.
type RadiatorTechnicalAttributes = {
  radiator_category?: string;
  construction?: string;
  connection?: string;
  material?: string[];
  color?: string[];
  section_number?: string;
  max_power_w?: number;
  heat_transfer_w?: number;
  max_temperature_c?: number;
  max_pressure_bar?: number;
  pressure_testing_bar?: number;
  overall_volume_l?: number;
  section_water_volume_l?: number;
  removable_panels?: boolean;
  heated_area_sqm?: number;
  center_distance_mm?: number;
  height_mm?: number;
  length_mm?: number;
  depth_mm?: number;
  weight_kg?: number;
  additional?: string;
};

export type ResolvePublicationItemParams = {
  commercialProductId: string;
  contentVariantId: string;
  salesChannel: string;
  publicationItemIdToExclude?: string;
};

export type ResolvedPublicationItem = {
  sellerSku: string | null;
  context: KaspiRowContext;
  row: Record<string, string>;
  requiredFields: AdapterRequiredFieldCheck[];
  validationErrors: PublicationValidationError[];
  mediaResolution: MediaResolution | null;
  categoryId: string | null;
};

function attrValue(
  code: string | undefined,
  salesChannel: string,
  categoryId: string | null,
  dictionaryValues: AttributeDictionaryValue[],
  translations: AttributeChannelTranslation[],
): { valueCode: string; displayLabel: string; translatedValue: string | null } | null {
  if (!code) return null;
  const resolved = resolveAttributeTranslation(code, salesChannel, categoryId, dictionaryValues, translations);
  if (!resolved) return null;
  return {
    valueCode: resolved.dictionaryValue.value_code,
    displayLabel: resolved.dictionaryValue.display_label,
    translatedValue: resolved.translation?.translated_value ?? null,
  };
}

function attrValues(
  codes: string[] | undefined,
  salesChannel: string,
  categoryId: string | null,
  dictionaryValues: AttributeDictionaryValue[],
  translations: AttributeChannelTranslation[],
) {
  return (codes ?? [])
    .map((code) => attrValue(code, salesChannel, categoryId, dictionaryValues, translations))
    .filter((v): v is NonNullable<typeof v> => v !== null);
}

// Central resolution used by both the Publication Preview screen and the
// CSV export route, so the two can never disagree about what "the
// resolved item" looks like.
export async function resolvePublicationItem(
  supabase: AnySupabase,
  params: ResolvePublicationItemParams,
): Promise<ResolvedPublicationItem> {
  const { commercialProductId, contentVariantId, salesChannel } = params;

  const { data: commercialProduct, error: cpError } = await supabase
    .from("commercial_products")
    .select(
      "id, master_product_id, commercial_name, bundle_code, bundle_components, media_set_id, assortment_status, preferred_supplier_id, pricing_strategy_id",
    )
    .eq("id", commercialProductId)
    .single();
  if (cpError || !commercialProduct) {
    throw new Error(`Коммерческий товар не найден: ${cpError?.message}`);
  }

  const { data: masterProduct, error: mpError } = await supabase
    .from("product_master")
    .select("id, manufacturer_sku, brand_id, category_id, technical_attributes, default_media_set_id")
    .eq("id", commercialProduct.master_product_id)
    .single();
  if (mpError || !masterProduct) {
    throw new Error(`Базовый товар не найден: ${mpError?.message}`);
  }

  const { data: contentVariant, error: cvError } = await supabase
    .from("marketplace_content_variants")
    .select("id, title, description, media_set_id")
    .eq("id", contentVariantId)
    .single();
  if (cvError || !contentVariant) {
    throw new Error(`Контент-вариант не найден: ${cvError?.message}`);
  }

  const brandName = masterProduct.brand_id
    ? ((await supabase.from("product_brands").select("name").eq("id", masterProduct.brand_id).maybeSingle()).data
        ?.name as string | undefined) ?? null
    : null;

  const { data: dictionaryValues } = await supabase
    .from("attribute_dictionary_values")
    .select("id, dictionary_code, value_code, display_label, created_at");

  const { data: translations } = await supabase
    .from("attribute_channel_translations")
    .select("id, attribute_dictionary_value_id, sales_channel, category_id, translated_value, translated_label, created_at, updated_at")
    .eq("sales_channel", salesChannel);

  const dictionaryValueRows = (dictionaryValues ?? []) as AttributeDictionaryValue[];
  const translationRows = (translations ?? []) as AttributeChannelTranslation[];
  const categoryId = masterProduct.category_id as string | null;

  const technicalAttributes = (masterProduct.technical_attributes ?? {}) as RadiatorTechnicalAttributes;

  const mediaResolution = resolveMediaSet(
    { media_set_id: contentVariant.media_set_id as string | null },
    { media_set_id: commercialProduct.media_set_id as string | null },
    { default_media_set_id: masterProduct.default_media_set_id as string | null },
  );

  let mediaItemCount = 0;
  let imageCode: string | null = null;
  if (mediaResolution) {
    const { data: mediaItems } = await supabase
      .from("media_set_items")
      .select("id, role")
      .eq("media_set_id", mediaResolution.mediaSetId);
    mediaItemCount = mediaItems?.length ?? 0;
    imageCode = mediaResolution.mediaSetId;
  }

  const bundleComponents = (commercialProduct.bundle_components ?? []) as BundleComponent[];
  const resolvedEquipment = resolveEquipmentFromBundle(
    bundleComponents,
    salesChannel,
    categoryId,
    dictionaryValueRows,
    translationRows,
  );

  // Supplier availability: any available offer feeding this Master Product.
  const { data: supplierOffers } = await supabase
    .from("supplier_offers")
    .select("id, is_available")
    .eq("product_id", masterProduct.id)
    .eq("is_available", true)
    .limit(1);
  const supplierAvailable = (supplierOffers ?? []).length > 0;

  // Active sale price / expected margin: existence-only boundary check
  // against the Pricing Engine's own tables -- publication never stores
  // or computes a price itself.
  const { data: priceHistory } = await supabase
    .from("channel_price_history")
    .select("id, sale_price, valid_to")
    .eq("product_id", masterProduct.id)
    .eq("sales_channel", salesChannel)
    .is("valid_to", null)
    .limit(1);
  const hasActiveSalePrice = (priceHistory ?? []).length > 0;

  const { data: costSnapshot } = await supabase
    .from("product_cost_snapshots")
    .select("expected_margin_percent, calculated_at")
    .eq("product_id", masterProduct.id)
    .eq("sales_channel", salesChannel)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const expectedMarginPercent = (costSnapshot?.expected_margin_percent as number | null) ?? null;

  let minimumMarginPercent: number | null = null;
  if (commercialProduct.pricing_strategy_id) {
    const { data: strategy } = await supabase
      .from("pricing_strategies")
      .select("minimum_margin_percent")
      .eq("id", commercialProduct.pricing_strategy_id)
      .maybeSingle();
    minimumMarginPercent = (strategy?.minimum_margin_percent as number | null) ?? null;
  }

  const { data: brandRow } = masterProduct.brand_id
    ? await supabase.from("product_brands").select("short_code").eq("id", masterProduct.brand_id).maybeSingle()
    : { data: null as { short_code: string | null } | null };

  const modelCode =
    (masterProduct.manufacturer_sku as string | null) ??
    (commercialProduct.bundle_code as string | null) ??
    null;

  const sellerSku = generateSellerSku({
    brandCode: brandRow?.short_code ?? null,
    modelCode,
    variantSuffix: commercialProduct.bundle_code as string | null,
  });

  let duplicateSkuExists = false;
  if (sellerSku) {
    let query = supabase
      .from("marketplace_publication_items")
      .select("id")
      .eq("sales_channel", salesChannel)
      .eq("seller_sku", sellerSku);
    if (params.publicationItemIdToExclude) {
      query = query.neq("id", params.publicationItemIdToExclude);
    }
    const { data: duplicates } = await query.limit(1);
    duplicateSkuExists = (duplicates ?? []).length > 0;
  }

  const context: KaspiRowContext = {
    sellerSku,
    title: (contentVariant.title as string | null) ?? commercialProduct.commercial_name,
    brand: brandName,
    imageCode,
    youtubeId: null,
    imageUrls: null,
    description: (contentVariant.description as string | null) ?? null,
    logisticsWeightRaw:
      technicalAttributes.weight_kg !== undefined ? String(technicalAttributes.weight_kg) : null,
    familyId: null,
    type: attrValue(technicalAttributes.radiator_category, salesChannel, categoryId, dictionaryValueRows, translationRows),
    construction: attrValue(technicalAttributes.construction, salesChannel, categoryId, dictionaryValueRows, translationRows),
    connection: attrValue(technicalAttributes.connection, salesChannel, categoryId, dictionaryValueRows, translationRows),
    material: attrValues(technicalAttributes.material, salesChannel, categoryId, dictionaryValueRows, translationRows),
    color: attrValues(technicalAttributes.color, salesChannel, categoryId, dictionaryValueRows, translationRows),
    sectionNumber: attrValue(technicalAttributes.section_number, salesChannel, categoryId, dictionaryValueRows, translationRows),
    model: modelCode,
    additional: technicalAttributes.additional ?? null,
    removablePanels: technicalAttributes.removable_panels ?? null,
    equipment: resolvedEquipment.map((line) => ({
      valueCode: line.value_code,
      displayLabel: line.display_label,
      translatedValue: line.translated_value,
    })),
    maximumPowerW: technicalAttributes.max_power_w ?? null,
    heatTransferW: technicalAttributes.heat_transfer_w ?? null,
    maximumTemperatureC: technicalAttributes.max_temperature_c ?? null,
    maximumPressureBar: technicalAttributes.max_pressure_bar ?? null,
    pressureTestingBar: technicalAttributes.pressure_testing_bar ?? null,
    overallVolumeL: technicalAttributes.overall_volume_l ?? null,
    sectionWaterVolumeL: technicalAttributes.section_water_volume_l ?? null,
    heatedAreaSqm: technicalAttributes.heated_area_sqm ?? null,
    centerDistanceMm: technicalAttributes.center_distance_mm ?? null,
    heightMm: technicalAttributes.height_mm ?? null,
    widthMm: technicalAttributes.length_mm ?? null,
    thicknessMm: technicalAttributes.depth_mm ?? null,
    weightKg: technicalAttributes.weight_kg ?? null,
  };

  const row = buildKaspiRow(context);
  const requiredFields = kaspiRequiredFields(context);

  const validationErrors = validatePublicationItem({
    commercialProductAssortmentStatus: commercialProduct.assortment_status,
    categoryId,
    title: context.title,
    description: context.description,
    bundleComponents,
    resolvedEquipment,
    mediaResolved: mediaResolution !== null,
    mediaItemCount,
    sellerSku,
    hasActiveSalePrice,
    expectedMarginPercent,
    minimumMarginPercent,
    supplierAvailable,
    duplicateSkuExists,
    adapterRequiredFields: requiredFields,
  });

  return { sellerSku, context, row, requiredFields, validationErrors, mediaResolution, categoryId };
}
