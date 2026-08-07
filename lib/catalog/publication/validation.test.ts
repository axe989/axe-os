import { describe, expect, it } from "vitest";
import { canMarkReadyForExport, deriveWorkflowStatus, validatePublicationItem, type PublicationValidationInput } from "./validation";

function baseInput(overrides: Partial<PublicationValidationInput> = {}): PublicationValidationInput {
  return {
    commercialProductAssortmentStatus: "active",
    categoryId: "cat-radiators",
    title: "Royal Thermo Vittoria 500/1000",
    description: "Описание товара, достаточно длинное для прохождения проверки.",
    bundleComponents: [{ dictionary_value_id: "eq-radiator", quantity: 1 }],
    resolvedEquipment: [{ value_code: "radiator", display_label: "Радиатор", translated_value: "радиатор", quantity: 1 }],
    mediaResolved: true,
    mediaItemCount: 3,
    sellerSku: "AXE-RT-VC22-5001000-WH",
    hasActiveSalePrice: true,
    expectedMarginPercent: 25,
    minimumMarginPercent: 15,
    supplierAvailable: true,
    duplicateSkuExists: false,
    adapterRequiredFields: [{ key: "brand", label: "Бренд", present: true }],
    ...overrides,
  };
}

describe("validatePublicationItem", () => {
  it("returns no errors for a fully valid item, and it's export-ready", () => {
    const errors = validatePublicationItem(baseInput());
    expect(errors).toEqual([]);
    expect(canMarkReadyForExport(errors)).toBe(true);
  });

  it("flags a missing active sale price without describing amount/margin (Pricing Engine owns that)", () => {
    const errors = validatePublicationItem(baseInput({ hasActiveSalePrice: false }));
    expect(errors.map((e) => e.code)).toContain("missing_active_price");
  });

  it("flags margin below the minimum threshold", () => {
    const errors = validatePublicationItem(baseInput({ expectedMarginPercent: 5, minimumMarginPercent: 15 }));
    expect(errors.map((e) => e.code)).toContain("margin_below_minimum");
  });

  it("flags an empty bundle instead of silently exporting no equipment", () => {
    const errors = validatePublicationItem(baseInput({ bundleComponents: [], resolvedEquipment: [] }));
    expect(errors.map((e) => e.code)).toContain("empty_bundle");
  });

  it("flags an untranslated equipment component for the target channel", () => {
    const errors = validatePublicationItem(
      baseInput({
        resolvedEquipment: [{ value_code: "radiator", display_label: "Радиатор", translated_value: null, quantity: 1 }],
      }),
    );
    expect(errors.map((e) => e.code)).toContain("untranslated_equipment");
  });

  it("flags missing images", () => {
    const errors = validatePublicationItem(baseInput({ mediaResolved: false, mediaItemCount: 0 }));
    expect(errors.map((e) => e.code)).toContain("missing_images");
  });

  it("flags a missing adapter-required field by its own label", () => {
    const errors = validatePublicationItem(
      baseInput({ adapterRequiredFields: [{ key: "heated_area", label: "Отапливаемая площадь", present: false }] }),
    );
    const error = errors.find((e) => e.code === "missing_required_field");
    expect(error?.message).toContain("Отапливаемая площадь");
  });

  it("flags duplicate seller SKU risk", () => {
    const errors = validatePublicationItem(baseInput({ duplicateSkuExists: true }));
    expect(errors.map((e) => e.code)).toContain("duplicate_seller_sku");
  });

  it("flags an unresolvable seller SKU distinctly from a duplicate one", () => {
    const errors = validatePublicationItem(baseInput({ sellerSku: null, duplicateSkuExists: false }));
    expect(errors.map((e) => e.code)).toContain("missing_seller_sku");
    expect(errors.map((e) => e.code)).not.toContain("duplicate_seller_sku");
  });

  it("never marks an item with errors as export-ready", () => {
    const errors = validatePublicationItem(baseInput({ hasActiveSalePrice: false }));
    expect(canMarkReadyForExport(errors)).toBe(false);
  });
});

describe("export row filtering (invalid rows are excluded, never silently dropped without a reason)", () => {
  it("keeps only items with zero validation errors, and reports why the rest were skipped", () => {
    const items = [
      { id: "valid-1", input: baseInput() },
      { id: "invalid-price", input: baseInput({ hasActiveSalePrice: false }) },
      { id: "valid-2", input: baseInput({ sellerSku: "AXE-GREE-BORA07-BASE" }) },
      { id: "invalid-images", input: baseInput({ mediaResolved: false, mediaItemCount: 0 }) },
    ];

    const evaluated = items.map((item) => ({ id: item.id, errors: validatePublicationItem(item.input) }));
    const exported = evaluated.filter((item) => canMarkReadyForExport(item.errors));
    const skipped = evaluated.filter((item) => !canMarkReadyForExport(item.errors));

    expect(exported.map((i) => i.id)).toEqual(["valid-1", "valid-2"]);
    expect(skipped).toHaveLength(2);
    // Every skipped row carries its own error list -- nothing disappears
    // from the batch without an explanation attached.
    expect(skipped.every((item) => item.errors.length > 0)).toBe(true);
  });
});

describe("deriveWorkflowStatus", () => {
  it("is ready_for_export with no errors", () => {
    expect(deriveWorkflowStatus([])).toBe("ready_for_export");
  });

  it("is content_incomplete when every error is a content gap", () => {
    const errors = validatePublicationItem(baseInput({ title: null, mediaResolved: false, mediaItemCount: 0 }));
    expect(deriveWorkflowStatus(errors)).toBe("content_incomplete");
  });

  it("is needs_review when any error is a business-gating error, even mixed with content gaps", () => {
    const errors = validatePublicationItem(baseInput({ title: null, hasActiveSalePrice: false }));
    expect(deriveWorkflowStatus(errors)).toBe("needs_review");
  });
});
