import type { AttributeChannelTranslation, AttributeDictionaryValue } from "../types";

// Canonical code format used everywhere technical_attributes/bundle_components
// store a dictionary value: "${dictionary_code}.${value_code}", e.g.
// "connection.bottom". Kept as a single string on the row so it round-trips
// through jsonb without needing a join to be meaningful on its own.
export function canonicalCode(dictionaryCode: string, valueCode: string): string {
  return `${dictionaryCode}.${valueCode}`;
}

export function parseCanonicalCode(code: string): { dictionaryCode: string; valueCode: string } | null {
  const separatorIndex = code.indexOf(".");
  if (separatorIndex <= 0 || separatorIndex === code.length - 1) {
    return null;
  }

  return {
    dictionaryCode: code.slice(0, separatorIndex),
    valueCode: code.slice(separatorIndex + 1),
  };
}

export type ResolvedAttributeTranslation = {
  dictionaryValue: AttributeDictionaryValue;
  translation: AttributeChannelTranslation | null;
};

// Best available translation for an already-resolved dictionary value: an
// exact (channel, category) match first, falling back to a channel-wide
// (category_id null) translation. Returns null (never a fabricated string)
// when no row exists for this channel at all.
export function resolveChannelTranslation(
  dictionaryValueId: string,
  salesChannel: string,
  categoryId: string | null,
  translations: AttributeChannelTranslation[],
): AttributeChannelTranslation | null {
  const candidates = translations.filter(
    (translation) =>
      translation.attribute_dictionary_value_id === dictionaryValueId &&
      translation.sales_channel === salesChannel,
  );

  const categoryMatch = categoryId ? candidates.find((t) => t.category_id === categoryId) : undefined;
  const channelWideMatch = candidates.find((t) => t.category_id === null);

  return categoryMatch ?? channelWideMatch ?? null;
}

// Resolves a canonical code ("connection.bottom") to its display label
// plus the best available channel translation. The caller (validation
// engine / adapter) decides whether a missing translation is fatal.
export function resolveAttributeTranslation(
  code: string,
  salesChannel: string,
  categoryId: string | null,
  dictionaryValues: AttributeDictionaryValue[],
  translations: AttributeChannelTranslation[],
): ResolvedAttributeTranslation | null {
  const parsed = parseCanonicalCode(code);
  if (!parsed) {
    return null;
  }

  const dictionaryValue = dictionaryValues.find(
    (value) => value.dictionary_code === parsed.dictionaryCode && value.value_code === parsed.valueCode,
  );
  if (!dictionaryValue) {
    return null;
  }

  return {
    dictionaryValue,
    translation: resolveChannelTranslation(dictionaryValue.id, salesChannel, categoryId, translations),
  };
}
