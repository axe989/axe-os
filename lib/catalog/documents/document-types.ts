// Fixed document-type vocabulary for the Product Detail "Документы" tab
// (Section 5 of the approved architecture). Which of these are mandatory
// for a given product is decided per-category by
// product_categories.required_document_types (currently unseeded for
// every pilot category -- a real, unfilled business setting, not
// something to invent a default for); all five stay offered as upload
// slots regardless, so there is always a way to attach something.
export const DOCUMENT_TYPES = ["passport", "certificate", "manual", "warranty", "other"] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  passport: "Паспорт товара",
  certificate: "Сертификат",
  manual: "Инструкция",
  warranty: "Гарантия",
  other: "Прочее",
};
