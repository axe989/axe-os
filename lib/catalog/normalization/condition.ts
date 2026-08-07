import type { ProductCondition } from "../types";

// Classifies the free-text "Характеристика" column found in supplier/
// warehouse stock exports into the six condition buckets the business
// actually cares about. Built from ~45 distinct real strings observed in
// the Термо sheet of a sample stock export (single-word statuses,
// multi-symptom damage descriptions, and one-off notes that embed a
// discounted price inline, e.g. "...согл.уценка 30% цена 15 895,39 KZT").
//
// Only "new" stock is saleable at full value; everything else must stay
// visible but separate (spec: "Do not combine all supplier rows into
// saleable stock").

const SHORTAGE_KEYWORDS = ["недостач"];
const DISCOUNTED_KEYWORDS = ["уценк", "скидк"];
const INCOMPLETE_KEYWORDS = [
  "без упаков",
  "нет упаков",
  "нет заводской упаков",
  "некомплект",
  "не хватает",
  "неполный комплект",
];
const DAMAGED_KEYWORDS = [
  "царапин",
  "потертост",
  "потёртост",
  "скол",
  "трещин",
  "вмятин",
  "залом",
  "разлом",
  "брак",
  "замятие",
  "повреждени",
  "разрушен",
];

function containsAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function normalizeCondition(raw: string | null | undefined): ProductCondition {
  if (!raw) {
    return "unknown";
  }

  const text = raw.trim().toLowerCase();

  if (text === "" || text === "-") {
    return "unknown";
  }

  if (text === "новый") {
    return "new";
  }

  if (containsAny(text, SHORTAGE_KEYWORDS)) {
    return "shortage";
  }

  if (containsAny(text, DISCOUNTED_KEYWORDS)) {
    return "discounted";
  }

  if (containsAny(text, INCOMPLETE_KEYWORDS)) {
    return "incomplete";
  }

  if (containsAny(text, DAMAGED_KEYWORDS)) {
    return "damaged";
  }

  return "unknown";
}

export function isSaleableCondition(condition: ProductCondition): boolean {
  return condition === "new";
}
