import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveMediaSet } from "../media/resolve-media-set";
import { resolveAttributeTranslation } from "../attributes/resolve-translation";
import { resolveEquipmentFromBundle } from "../publication/resolve-equipment";
import { calculateProductReadiness, type ProductReadinessInput } from "./calculate-readiness";
import type { AttributeChannelTranslation, AttributeDictionaryValue, BundleComponent, ProductReadiness } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

type RadiatorTechnicalAttributes = {
  radiator_category?: string;
  construction?: string;
  connection?: string;
  material?: string[];
  color?: string[];
  section_number?: string;
  heated_area_sqm?: number;
  height_mm?: number;
  length_mm?: number;
  depth_mm?: number;
};

// The eight Kaspi-dropdown-driven attributes (see KASPI_COLUMNS in
// lib/catalog/publication/adapters/kaspi-csv.ts) that make up the
// "Marketplace Attributes" dimension. Kept as the reference set here
// because Kaspi is the only channel with real translations seeded so
// far -- this dimension currently reads as "ready for Kaspi specifically",
// which is an honest, visible scope, not a hidden assumption.
const MARKETPLACE_ATTRIBUTE_FIELDS: Array<{
  key: keyof RadiatorTechnicalAttributes;
  label: string;
  multi: boolean;
}> = [
  { key: "radiator_category", label: "Тип", multi: false },
  { key: "construction", label: "Конструкция", multi: false },
  { key: "connection", label: "Подключение", multi: false },
  { key: "material", label: "Материал", multi: true },
  { key: "color", label: "Цвет", multi: true },
  { key: "section_number", label: "Число секций/панелей", multi: false },
];

const TECHNICAL_SPEC_FIELDS: Array<{ key: keyof RadiatorTechnicalAttributes; label: string }> = [
  { key: "heated_area_sqm", label: "Отапливаемая площадь" },
  { key: "height_mm", label: "Высота" },
  { key: "length_mm", label: "Ширина" },
  { key: "depth_mm", label: "Толщина" },
];

const SEO_STRONG_DESCRIPTION_LENGTH = 300;
const CONTENT_MIN_DESCRIPTION_LENGTH = 100;

export async function resolveProductReadiness(
  supabase: AnySupabase,
  params: { commercialProductId: string; salesChannel?: string },
): Promise<ProductReadiness> {
  const salesChannel = params.salesChannel ?? "kaspi";

  const { data: commercialProduct, error: cpError } = await supabase
    .from("commercial_products")
    .select("id, master_product_id, bundle_components, media_set_id, pricing_strategy_id")
    .eq("id", params.commercialProductId)
    .single();
  if (cpError || !commercialProduct) {
    throw new Error(`Коммерческий товар не найден: ${cpError?.message}`);
  }

  const { data: masterProduct, error: mpError } = await supabase
    .from("product_master")
    .select("id, brand_id, category_id, technical_attributes, default_media_set_id")
    .eq("id", commercialProduct.master_product_id)
    .single();
  if (mpError || !masterProduct) {
    throw new Error(`Базовый товар не найден: ${mpError?.message}`);
  }

  // Prefer the default content variant; fall back to any variant; a
  // product with none yet simply reads as missing content, not an error.
  const { data: variants } = await supabase
    .from("marketplace_content_variants")
    .select("title, description, seo_strategy, media_set_id")
    .eq("commercial_product_id", params.commercialProductId)
    .order("is_default", { ascending: false })
    .limit(1);
  const contentVariant = variants?.[0] ?? null;

  const categoryId = masterProduct.category_id as string | null;
  const { data: category } = categoryId
    ? await supabase.from("product_categories").select("required_document_types").eq("id", categoryId).maybeSingle()
    : { data: null as { required_document_types: string[] } | null };

  const { data: dictionaryValues } = await supabase
    .from("attribute_dictionary_values")
    .select("id, dictionary_code, value_code, display_label, created_at");
  const { data: translations } = await supabase
    .from("attribute_channel_translations")
    .select("id, attribute_dictionary_value_id, sales_channel, category_id, translated_value, translated_label, created_at, updated_at")
    .eq("sales_channel", salesChannel);

  const dictionaryValueRows = (dictionaryValues ?? []) as AttributeDictionaryValue[];
  const translationRows = (translations ?? []) as AttributeChannelTranslation[];

  const technicalAttributes = (masterProduct.technical_attributes ?? {}) as RadiatorTechnicalAttributes;
  const brandFilled = Boolean(masterProduct.brand_id);

  // Marketplace attributes: brand is a direct fact, the rest are
  // dictionary-backed canonical codes resolved through the same
  // translation table the Kaspi adapter uses. (model/manufacturer_sku is
  // not scored here -- it always has a fallback at export time, so it's
  // not an independent gap signal.)
  let marketplaceAttributesPresent = brandFilled ? 1 : 0;
  const missingMarketplaceAttributeLabels: string[] = brandFilled ? [] : ["Бренд"];

  for (const field of MARKETPLACE_ATTRIBUTE_FIELDS) {
    const value = technicalAttributes[field.key];
    const codes = field.multi ? (Array.isArray(value) ? (value as string[]) : []) : value ? [value as string] : [];

    const resolved = codes
      .map((code) => resolveAttributeTranslation(code, salesChannel, categoryId, dictionaryValueRows, translationRows))
      .filter((r): r is NonNullable<typeof r> => r !== null && r.translation !== null);

    if (resolved.length > 0) {
      marketplaceAttributesPresent += 1;
    } else {
      missingMarketplaceAttributeLabels.push(field.label);
    }
  }

  // technical_attributes is jsonb: a key can be present with an explicit
  // null (e.g. depth_mm before it's been measured) -- treat that the same
  // as the key being absent entirely, not as "filled in".
  const isSpecFilled = (key: keyof RadiatorTechnicalAttributes) =>
    technicalAttributes[key] !== undefined && technicalAttributes[key] !== null;

  const technicalSpecsPresent = TECHNICAL_SPEC_FIELDS.filter((f) => isSpecFilled(f.key)).length;
  const missingTechnicalSpecLabels = TECHNICAL_SPEC_FIELDS.filter((f) => !isSpecFilled(f.key)).map((f) => f.label);

  const mediaResolution = resolveMediaSet(
    { media_set_id: (contentVariant?.media_set_id as string | null) ?? null },
    { media_set_id: commercialProduct.media_set_id as string | null },
    { default_media_set_id: masterProduct.default_media_set_id as string | null },
  );
  let mediaItemCount = 0;
  if (mediaResolution) {
    const { data: mediaItems } = await supabase
      .from("media_set_items")
      .select("id")
      .eq("media_set_id", mediaResolution.mediaSetId);
    mediaItemCount = mediaItems?.length ?? 0;
  }

  const bundleComponents = Array.isArray(commercialProduct.bundle_components)
    ? (commercialProduct.bundle_components as BundleComponent[])
    : [];
  const resolvedEquipment = resolveEquipmentFromBundle(
    bundleComponents,
    salesChannel,
    categoryId,
    dictionaryValueRows,
    translationRows,
  ).filter((line) => line.translated_value !== null);

  const { data: supplierOffers } = await supabase
    .from("supplier_offers")
    .select("id, is_available")
    .eq("product_id", masterProduct.id);
  const hasAnySupplierOffer = (supplierOffers ?? []).length > 0;
  const hasAvailableSupplierOffer = (supplierOffers ?? []).some((o) => o.is_available);

  const { data: priceHistory } = await supabase
    .from("channel_price_history")
    .select("id")
    .eq("product_id", masterProduct.id)
    .eq("sales_channel", salesChannel)
    .is("valid_to", null)
    .limit(1);
  const hasActiveSalePrice = (priceHistory ?? []).length > 0;

  const { data: costSnapshot } = await supabase
    .from("product_cost_snapshots")
    .select("expected_margin_percent")
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

  const { data: documents } = await supabase
    .from("product_documents")
    .select("document_type, status")
    .eq("commercial_product_id", params.commercialProductId);
  const requiredDocumentTypeLabels = (category?.required_document_types ?? []) as string[];
  const fulfilledDocumentTypeLabels = (documents ?? [])
    .filter((d) => d.status === "uploaded" || d.status === "verified" || d.status === "not_applicable")
    .map((d) => d.document_type as string);

  const description = (contentVariant?.description as string | null) ?? null;
  const seoStrategy = (contentVariant?.seo_strategy as Record<string, unknown> | null) ?? null;

  const input: ProductReadinessInput = {
    hasAnySupplierOffer,
    hasAvailableSupplierOffer,
    hasActiveSalePrice,
    expectedMarginPercent,
    minimumMarginPercent,
    hasMediaSetResolved: mediaResolution !== null,
    mediaItemCount,
    contentTitlePresent: Boolean(contentVariant?.title),
    contentDescriptionPresent: (description?.length ?? 0) >= CONTENT_MIN_DESCRIPTION_LENGTH,
    seoStrategyPresent: seoStrategy !== null && Object.keys(seoStrategy).length > 0,
    seoDescriptionIsStrong: (description?.length ?? 0) >= SEO_STRONG_DESCRIPTION_LENGTH,
    marketplaceAttributesTotal: MARKETPLACE_ATTRIBUTE_FIELDS.length + 1, // +1 for brand
    marketplaceAttributesPresent,
    missingMarketplaceAttributeLabels,
    technicalSpecsTotal: TECHNICAL_SPEC_FIELDS.length,
    technicalSpecsPresent,
    missingTechnicalSpecLabels,
    bundleComponentCount: bundleComponents.length,
    resolvedEquipmentCount: resolvedEquipment.length,
    requiredDocumentTypeLabels,
    fulfilledDocumentTypeLabels,
  };

  return calculateProductReadiness(input);
}
