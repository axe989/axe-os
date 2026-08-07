import type {
  ProductReadiness,
  ReadinessDimensionResult,
  ReadinessDimensionStatus,
  ReadinessIssue,
} from "../types";
import { READINESS_DIMENSION_PRIORITY, READINESS_DIMENSION_TO_LABEL } from "./labels";

// Pure, on-the-fly readiness calculation -- deliberately never persisted
// (mirrors lib/catalog/status/supplier-offer-status.ts's derive*Status
// pattern: reads nothing, writes nothing, so it can never go stale the
// way a cached score column would). Reuses the same underlying facts the
// Kaspi validation engine already resolves (dictionary-backed attributes,
// bundle/equipment, media resolution, active price) but reorganizes them
// into independent business dimensions instead of one flat list of
// Kaspi-CSV-specific field codes -- this is the "layer built on top of"
// validation.ts, not a replacement for it.

export type ProductReadinessInput = {
  hasAnySupplierOffer: boolean;
  hasAvailableSupplierOffer: boolean;

  hasActiveSalePrice: boolean;
  expectedMarginPercent: number | null;
  minimumMarginPercent: number | null;

  hasMediaSetResolved: boolean;
  mediaItemCount: number;

  contentTitlePresent: boolean;
  contentDescriptionPresent: boolean;

  seoStrategyPresent: boolean;
  seoDescriptionIsStrong: boolean;

  marketplaceAttributesTotal: number;
  marketplaceAttributesPresent: number;
  missingMarketplaceAttributeLabels: string[];

  technicalSpecsTotal: number;
  technicalSpecsPresent: number;
  missingTechnicalSpecLabels: string[];

  bundleComponentCount: number;
  resolvedEquipmentCount: number;

  requiredDocumentTypeLabels: string[];
  fulfilledDocumentTypeLabels: string[];
};

function deriveStatus(score: number): ReadinessDimensionStatus {
  if (score >= 100) return "complete";
  if (score <= 0) return "missing";
  return "partial";
}

function ratioScore(present: number, total: number): number {
  return total > 0 ? Math.round((present / total) * 100) : 100;
}

export function calculateSupplierDimension(input: ProductReadinessInput): ReadinessDimensionResult {
  if (input.hasAvailableSupplierOffer) {
    return { dimension: "supplier", score: 100, status: "complete", issues: [] };
  }

  if (input.hasAnySupplierOffer) {
    const issues: ReadinessIssue[] = [
      { message: "Есть поставщик, но товар сейчас недоступен или закончился остаток", team: "procurement", severity: "blocking" },
    ];
    return { dimension: "supplier", score: 40, status: "partial", issues };
  }

  return {
    dimension: "supplier",
    score: 0,
    status: "missing",
    issues: [{ message: "Нет ни одного поставщика для этого товара", team: "procurement", severity: "blocking" }],
  };
}

export function calculatePricingDimension(input: ProductReadinessInput): ReadinessDimensionResult {
  if (!input.hasActiveSalePrice) {
    return {
      dimension: "pricing",
      score: 0,
      status: "missing",
      issues: [{ message: "Не установлена цена продажи", team: "pricing", severity: "blocking" }],
    };
  }

  if (
    input.expectedMarginPercent !== null &&
    input.minimumMarginPercent !== null &&
    input.expectedMarginPercent < input.minimumMarginPercent
  ) {
    return {
      dimension: "pricing",
      score: 60,
      status: "partial",
      issues: [
        {
          message: `Маржа ${input.expectedMarginPercent.toFixed(1)}% ниже минимально допустимой ${input.minimumMarginPercent.toFixed(1)}%`,
          team: "pricing",
          severity: "blocking",
        },
      ],
    };
  }

  return { dimension: "pricing", score: 100, status: "complete", issues: [] };
}

export function calculateMediaDimension(input: ProductReadinessInput): ReadinessDimensionResult {
  if (input.mediaItemCount > 0) {
    return { dimension: "media", score: 100, status: "complete", issues: [] };
  }

  if (input.hasMediaSetResolved) {
    return {
      dimension: "media",
      score: 30,
      status: "partial",
      issues: [{ message: "Набор изображений создан, но пуст", team: "photography", severity: "blocking" }],
    };
  }

  return {
    dimension: "media",
    score: 0,
    status: "missing",
    issues: [{ message: "Нет фотографий товара", team: "photography", severity: "blocking" }],
  };
}

export function calculateTechnicalSpecsDimension(input: ProductReadinessInput): ReadinessDimensionResult {
  const score = ratioScore(input.technicalSpecsPresent, input.technicalSpecsTotal);
  const issues: ReadinessIssue[] =
    input.missingTechnicalSpecLabels.length > 0
      ? [
          {
            message: `Не заполнены технические характеристики: ${input.missingTechnicalSpecLabels.join(", ")}`,
            team: "catalog",
            severity: "blocking",
          },
        ]
      : [];

  return { dimension: "technical_specs", score, status: deriveStatus(score), issues };
}

export function calculateContentDimension(input: ProductReadinessInput): ReadinessDimensionResult {
  const score = (input.contentTitlePresent ? 60 : 0) + (input.contentDescriptionPresent ? 40 : 0);
  const issues: ReadinessIssue[] = [];

  if (!input.contentTitlePresent) {
    issues.push({ message: "Не заполнен заголовок товара", team: "content", severity: "blocking" });
  }
  if (!input.contentDescriptionPresent) {
    issues.push({ message: "Не заполнено описание товара (минимум 100 символов)", team: "content", severity: "blocking" });
  }

  return { dimension: "content", score, status: deriveStatus(score), issues };
}

export function calculateMarketplaceAttributesDimension(input: ProductReadinessInput): ReadinessDimensionResult {
  const score = ratioScore(input.marketplaceAttributesPresent, input.marketplaceAttributesTotal);
  const issues: ReadinessIssue[] =
    input.missingMarketplaceAttributeLabels.length > 0
      ? [
          {
            message: `Не заполнены атрибуты маркетплейса: ${input.missingMarketplaceAttributeLabels.join(", ")}`,
            team: "catalog",
            severity: "blocking",
          },
        ]
      : [];

  return { dimension: "marketplace_attributes", score, status: deriveStatus(score), issues };
}

// SEO gaps are never blocking -- a product can legitimately publish
// without an SEO strategy, it just performs worse. Kept as its own
// dimension so it's visible without stalling the overall workflow.
export function calculateSeoDimension(input: ProductReadinessInput): ReadinessDimensionResult {
  const score = (input.seoStrategyPresent ? 50 : 0) + (input.seoDescriptionIsStrong ? 50 : 0);
  const issues: ReadinessIssue[] = [];

  if (!input.seoStrategyPresent) {
    issues.push({ message: "Не задана SEO-стратегия (позиционирование, ключевые слова)", team: "marketing", severity: "recommended" });
  }
  if (!input.seoDescriptionIsStrong) {
    issues.push({ message: "Описание короткое для SEO (рекомендуется от 300 символов)", team: "marketing", severity: "recommended" });
  }

  return { dimension: "seo", score, status: deriveStatus(score), issues };
}

export function calculateBundleDimension(input: ProductReadinessInput): ReadinessDimensionResult {
  if (input.bundleComponentCount === 0) {
    return {
      dimension: "bundle",
      score: 0,
      status: "missing",
      issues: [{ message: "Не определён состав комплектации", team: "merchandising", severity: "blocking" }],
    };
  }

  if (input.resolvedEquipmentCount < input.bundleComponentCount) {
    return {
      dimension: "bundle",
      score: Math.round((input.resolvedEquipmentCount / input.bundleComponentCount) * 100),
      status: "partial",
      issues: [
        { message: "Один или несколько компонентов комплектации не найдены в справочнике", team: "merchandising", severity: "blocking" },
      ],
    };
  }

  return { dimension: "bundle", score: 100, status: "complete", issues: [] };
}

export function calculateDocumentationDimension(input: ProductReadinessInput): ReadinessDimensionResult {
  if (input.requiredDocumentTypeLabels.length === 0) {
    return { dimension: "documentation", score: 100, status: "complete", issues: [] };
  }

  const missing = input.requiredDocumentTypeLabels.filter(
    (label) => !input.fulfilledDocumentTypeLabels.includes(label),
  );
  const score = ratioScore(input.requiredDocumentTypeLabels.length - missing.length, input.requiredDocumentTypeLabels.length);

  const issues: ReadinessIssue[] =
    missing.length > 0 ? [{ message: `Отсутствуют документы: ${missing.join(", ")}`, team: "compliance", severity: "blocking" }] : [];

  return { dimension: "documentation", score, status: deriveStatus(score), issues };
}

function deriveOverallLabel(overallScore: number, dimensions: ReadinessDimensionResult[]): ProductReadiness["label"] {
  if (overallScore >= 100) {
    return "ready_for_publication";
  }

  // Too little has been done anywhere to point at one specific gap.
  if (overallScore < 30) {
    return "draft";
  }

  const lowest = [...dimensions].sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return READINESS_DIMENSION_PRIORITY.indexOf(a.dimension) - READINESS_DIMENSION_PRIORITY.indexOf(b.dimension);
  })[0];

  return READINESS_DIMENSION_TO_LABEL[lowest.dimension];
}

export function calculateProductReadiness(input: ProductReadinessInput): ProductReadiness {
  const dimensions: ReadinessDimensionResult[] = [
    calculateSupplierDimension(input),
    calculatePricingDimension(input),
    calculateMediaDimension(input),
    calculateTechnicalSpecsDimension(input),
    calculateContentDimension(input),
    calculateMarketplaceAttributesDimension(input),
    calculateSeoDimension(input),
    calculateBundleDimension(input),
    calculateDocumentationDimension(input),
  ];

  const overallScore = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length);
  const blockingIssueCount = dimensions.reduce(
    (sum, d) => sum + d.issues.filter((issue) => issue.severity === "blocking").length,
    0,
  );

  return {
    overallScore,
    label: deriveOverallLabel(overallScore, dimensions),
    dimensions,
    blockingIssueCount,
  };
}
