import type { AssortmentStatus, BundleComponent, PublicationStatus } from "../types";
import type { ResolvedEquipmentLine } from "./resolve-equipment";

// Publication validation engine. Channel-agnostic: an adapter (Kaspi CSV,
// later WB/Ozon) contributes its own required-field checks via
// `adapterRequiredFields`; this module owns the business-level checks that
// apply no matter which channel is being published to.
//
// Sale price is deliberately shallow here (existence only) -- pricing and
// margin *values* belong to the separate Pricing Engine / Repricing
// module, never to the publication template (see architecture decision:
// "Sale price must NOT belong to the publication template architecture").

export type PublicationValidationError = {
  code: string;
  message: string;
  field?: string;
};

export type AdapterRequiredFieldCheck = {
  key: string;
  label: string;
  present: boolean;
};

export type PublicationValidationInput = {
  commercialProductAssortmentStatus: AssortmentStatus;
  categoryId: string | null;
  title: string | null;
  description: string | null;
  bundleComponents: BundleComponent[];
  resolvedEquipment: ResolvedEquipmentLine[];
  mediaResolved: boolean;
  mediaItemCount: number;
  sellerSku: string | null;
  hasActiveSalePrice: boolean;
  expectedMarginPercent: number | null;
  minimumMarginPercent: number | null;
  supplierAvailable: boolean;
  duplicateSkuExists: boolean;
  adapterRequiredFields: AdapterRequiredFieldCheck[];
};

export function validatePublicationItem(input: PublicationValidationInput): PublicationValidationError[] {
  const errors: PublicationValidationError[] = [];

  // Commercial Product identity
  if (input.commercialProductAssortmentStatus === "excluded" || input.commercialProductAssortmentStatus === "archived") {
    errors.push({
      code: "commercial_product_not_sellable",
      message: "Коммерческий товар исключён из ассортимента или архивирован",
      field: "commercial_product",
    });
  }

  // Marketplace category
  if (!input.categoryId) {
    errors.push({ code: "missing_category", message: "Не определена категория маркетплейса", field: "category" });
  }

  // Title
  if (!input.title || input.title.trim().length === 0) {
    errors.push({ code: "missing_title", message: "Не заполнен заголовок товара", field: "title" });
  }

  // Bundle composition -> equipment
  if (input.bundleComponents.length === 0) {
    errors.push({
      code: "empty_bundle",
      message: "У коммерческого товара не задан состав комплектации (bundle_components)",
      field: "bundle_components",
    });
  } else if (input.resolvedEquipment.length !== input.bundleComponents.length) {
    errors.push({
      code: "unresolved_bundle_component",
      message: "Один или несколько компонентов комплектации не найдены в словаре equipment",
      field: "bundle_components",
    });
  } else if (input.resolvedEquipment.some((line) => line.translated_value === null)) {
    errors.push({
      code: "untranslated_equipment",
      message: "Для канала не задан перевод одного или нескольких компонентов комплектации",
      field: "bundle_components",
    });
  }

  // Sale price (existence only)
  if (!input.hasActiveSalePrice) {
    errors.push({
      code: "missing_active_price",
      message: "У коммерческого товара нет активной цены продажи (см. Pricing Engine)",
      field: "sale_price",
    });
  }

  // Expected margin
  if (input.expectedMarginPercent !== null && input.minimumMarginPercent !== null) {
    if (input.expectedMarginPercent < input.minimumMarginPercent) {
      errors.push({
        code: "margin_below_minimum",
        message: `Ожидаемая маржа (${input.expectedMarginPercent.toFixed(1)}%) ниже минимально допустимой (${input.minimumMarginPercent.toFixed(1)}%)`,
        field: "margin",
      });
    }
  }

  // Supplier availability
  if (!input.supplierAvailable) {
    errors.push({
      code: "supplier_unavailable",
      message: "Нет доступного поставщика с достаточным остатком",
      field: "supplier_availability",
    });
  }

  // Images
  if (!input.mediaResolved || input.mediaItemCount === 0) {
    errors.push({ code: "missing_images", message: "Не найдены изображения товара", field: "media" });
  }

  // Required template fields (adapter-supplied)
  for (const check of input.adapterRequiredFields) {
    if (!check.present) {
      errors.push({
        code: "missing_required_field",
        message: `Не заполнено обязательное поле шаблона: ${check.label}`,
        field: check.key,
      });
    }
  }

  // Duplicate external/SKU risk
  if (!input.sellerSku) {
    errors.push({ code: "missing_seller_sku", message: "Не удалось сформировать артикул продавца", field: "seller_sku" });
  } else if (input.duplicateSkuExists) {
    errors.push({
      code: "duplicate_seller_sku",
      message: `Артикул продавца "${input.sellerSku}" уже используется другой позицией публикации`,
      field: "seller_sku",
    });
  }

  return errors;
}

// A publication item may only reach ready_for_export with zero validation
// errors -- see architecture spec: "A publication cannot become
// ready_for_export unless required Kaspi fields are valid."
export function canMarkReadyForExport(errors: PublicationValidationError[]): boolean {
  return errors.length === 0;
}

// Content-shaped gaps (title/images/bundle/required fields) route to
// content_incomplete; everything else that still blocks export (pricing,
// supplier, category, duplicate SKU) routes to needs_review, since fixing
// those isn't purely a content-authoring task. Only used to derive the
// pre-export states -- exported/uploaded/published/publication_error/
// archived are set by the export route and the reconciliation pipeline,
// never by revalidation.
const CONTENT_ERROR_CODES = new Set([
  "missing_title",
  "missing_images",
  "empty_bundle",
  "unresolved_bundle_component",
  "untranslated_equipment",
  "missing_required_field",
  "missing_seller_sku",
]);

export function deriveWorkflowStatus(errors: PublicationValidationError[]): Extract<
  PublicationStatus,
  "content_incomplete" | "needs_review" | "ready_for_export"
> {
  if (errors.length === 0) {
    return "ready_for_export";
  }

  const onlyContentGaps = errors.every((error) => CONTENT_ERROR_CODES.has(error.code));
  return onlyContentGaps ? "content_incomplete" : "needs_review";
}
