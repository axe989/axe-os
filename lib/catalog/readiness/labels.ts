import type { ReadinessDimensionKey, ReadinessLabel, ResponsibleTeam } from "../types";

export const READINESS_DIMENSION_LABELS: Record<ReadinessDimensionKey, string> = {
  supplier: "Поставщик",
  pricing: "Цена",
  media: "Изображения",
  technical_specs: "Технические характеристики",
  content: "Контент",
  marketplace_attributes: "Атрибуты маркетплейса",
  seo: "SEO",
  bundle: "Комплектация",
  documentation: "Документы",
};

export const READINESS_LABEL_TEXT: Record<ReadinessLabel, string> = {
  ready_for_publication: "Готов к публикации",
  needs_content: "Нужен контент",
  needs_images: "Нужны фотографии",
  needs_technical_data: "Нужны технические данные",
  needs_pricing: "Нужна цена",
  needs_supplier: "Нужен поставщик",
  needs_marketplace_attributes: "Нужны атрибуты маркетплейса",
  needs_seo: "Нужен SEO",
  needs_bundle: "Нужна комплектация",
  needs_documentation: "Нужны документы",
  draft: "Черновик",
};

export const RESPONSIBLE_TEAM_LABELS: Record<ResponsibleTeam, string> = {
  procurement: "Закупки",
  pricing: "Ценообразование",
  photography: "Фотостудия",
  catalog: "Каталог",
  content: "Контент-менеджеры",
  marketing: "Маркетинг",
  merchandising: "Мерчендайзинг",
  compliance: "Комплаенс",
};

// Deterministic tie-break order when several dimensions share the lowest
// score -- surfaces the most launch-blocking gap first (a missing price
// or missing photos should never be masked by a lower-stakes SEO gap
// that happens to score the same).
export const READINESS_DIMENSION_PRIORITY: ReadinessDimensionKey[] = [
  "pricing",
  "media",
  "supplier",
  "marketplace_attributes",
  "technical_specs",
  "content",
  "bundle",
  "documentation",
  "seo",
];

export const READINESS_DIMENSION_TO_LABEL: Record<ReadinessDimensionKey, ReadinessLabel> = {
  supplier: "needs_supplier",
  pricing: "needs_pricing",
  media: "needs_images",
  technical_specs: "needs_technical_data",
  content: "needs_content",
  marketplace_attributes: "needs_marketplace_attributes",
  seo: "needs_seo",
  bundle: "needs_bundle",
  documentation: "needs_documentation",
};
