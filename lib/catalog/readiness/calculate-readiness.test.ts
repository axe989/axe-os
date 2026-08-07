import { describe, expect, it } from "vitest";
import { calculateProductReadiness, type ProductReadinessInput } from "./calculate-readiness";

function fullyReadyInput(overrides: Partial<ProductReadinessInput> = {}): ProductReadinessInput {
  return {
    hasAnySupplierOffer: true,
    hasAvailableSupplierOffer: true,
    hasActiveSalePrice: true,
    expectedMarginPercent: 25,
    minimumMarginPercent: 10,
    hasMediaSetResolved: true,
    mediaItemCount: 5,
    contentTitlePresent: true,
    contentDescriptionPresent: true,
    seoStrategyPresent: true,
    seoDescriptionIsStrong: true,
    marketplaceAttributesTotal: 8,
    marketplaceAttributesPresent: 8,
    missingMarketplaceAttributeLabels: [],
    technicalSpecsTotal: 4,
    technicalSpecsPresent: 4,
    missingTechnicalSpecLabels: [],
    bundleComponentCount: 1,
    resolvedEquipmentCount: 1,
    requiredDocumentTypeLabels: [],
    fulfilledDocumentTypeLabels: [],
    ...overrides,
  };
}

describe("calculateProductReadiness", () => {
  it("scores a fully complete product at 100% and labels it ready for publication", () => {
    const result = calculateProductReadiness(fullyReadyInput());
    expect(result.overallScore).toBe(100);
    expect(result.label).toBe("ready_for_publication");
    expect(result.blockingIssueCount).toBe(0);
    expect(result.dimensions.every((d) => d.status === "complete")).toBe(true);
  });

  it("labels a product with only a content gap as needs_content", () => {
    const result = calculateProductReadiness(
      fullyReadyInput({ contentTitlePresent: false, contentDescriptionPresent: false }),
    );
    expect(result.label).toBe("needs_content");
    expect(result.overallScore).toBeLessThan(100);
    expect(result.overallScore).toBeGreaterThan(50);
  });

  it("labels a product with only a media gap as needs_images", () => {
    const result = calculateProductReadiness(fullyReadyInput({ mediaItemCount: 0, hasMediaSetResolved: false }));
    expect(result.label).toBe("needs_images");
  });

  it("labels a product with only a technical-specs gap as needs_technical_data", () => {
    const result = calculateProductReadiness(
      fullyReadyInput({
        technicalSpecsPresent: 1,
        missingTechnicalSpecLabels: ["Отапливаемая площадь", "Высота", "Толщина"],
      }),
    );
    expect(result.label).toBe("needs_technical_data");
  });

  it("labels a nearly-empty product as draft, not as a specific single gap", () => {
    const result = calculateProductReadiness(
      fullyReadyInput({
        hasAnySupplierOffer: false,
        hasAvailableSupplierOffer: false,
        hasActiveSalePrice: false,
        expectedMarginPercent: null,
        minimumMarginPercent: null,
        hasMediaSetResolved: false,
        mediaItemCount: 0,
        contentTitlePresent: false,
        contentDescriptionPresent: false,
        seoStrategyPresent: false,
        seoDescriptionIsStrong: false,
        marketplaceAttributesPresent: 0,
        missingMarketplaceAttributeLabels: ["Тип", "Конструкция", "Подключение", "Материал", "Цвет", "Модель", "Число секций", "Бренд"],
        technicalSpecsPresent: 0,
        missingTechnicalSpecLabels: ["Отапливаемая площадь", "Высота", "Ширина", "Толщина"],
        bundleComponentCount: 0,
        resolvedEquipmentCount: 0,
      }),
    );
    expect(result.label).toBe("draft");
    expect(result.overallScore).toBeLessThan(30);
  });

  it("never lets a missing SEO strategy alone block readiness (recommended, not blocking)", () => {
    const result = calculateProductReadiness(fullyReadyInput({ seoStrategyPresent: false, seoDescriptionIsStrong: false }));
    expect(result.blockingIssueCount).toBe(0);
    const seoDimension = result.dimensions.find((d) => d.dimension === "seo")!;
    expect(seoDimension.issues.every((issue) => issue.severity === "recommended")).toBe(true);
  });

  it("documentation with no configured requirement scores complete (not applicable, not missing)", () => {
    const result = calculateProductReadiness(fullyReadyInput({ requiredDocumentTypeLabels: [] }));
    const docs = result.dimensions.find((d) => d.dimension === "documentation")!;
    expect(docs.score).toBe(100);
    expect(docs.status).toBe("complete");
  });

  it("documentation with an unmet real requirement is blocking and names the missing document", () => {
    const result = calculateProductReadiness(
      fullyReadyInput({
        requiredDocumentTypeLabels: ["Сертификат соответствия"],
        fulfilledDocumentTypeLabels: [],
      }),
    );
    const docs = result.dimensions.find((d) => d.dimension === "documentation")!;
    expect(docs.score).toBe(0);
    expect(docs.issues[0].message).toContain("Сертификат соответствия");
    expect(docs.issues[0].severity).toBe("blocking");
  });

  it("routes every issue to a named responsible team, never an internal code", () => {
    const result = calculateProductReadiness(
      fullyReadyInput({ hasAnySupplierOffer: false, hasAvailableSupplierOffer: false, hasActiveSalePrice: false }),
    );
    const allIssues = result.dimensions.flatMap((d) => d.issues);
    expect(allIssues.length).toBeGreaterThan(0);
    for (const issue of allIssues) {
      expect(issue.team).toBeTruthy();
      expect(issue.message).not.toMatch(/^[a-z_]+$/); // not a raw validation code like "missing_active_price"
    }
  });

  it("tie-breaks equally-low dimensions deterministically toward the more launch-blocking one (pricing over content)", () => {
    const result = calculateProductReadiness(
      fullyReadyInput({
        hasActiveSalePrice: false, // pricing -> 0
        contentTitlePresent: false,
        contentDescriptionPresent: false, // content -> 0
      }),
    );
    expect(result.label).toBe("needs_pricing");
  });

  it("partial supplier availability (offer exists but out of stock) scores below full but above zero", () => {
    const result = calculateProductReadiness(fullyReadyInput({ hasAnySupplierOffer: true, hasAvailableSupplierOffer: false }));
    const supplier = result.dimensions.find((d) => d.dimension === "supplier")!;
    expect(supplier.score).toBeGreaterThan(0);
    expect(supplier.score).toBeLessThan(100);
    expect(supplier.status).toBe("partial");
  });
});
