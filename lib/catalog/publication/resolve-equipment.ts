import type { AttributeChannelTranslation, AttributeDictionaryValue, BundleComponent } from "../types";
import { resolveChannelTranslation } from "../attributes/resolve-translation";

export type ResolvedEquipmentLine = {
  value_code: string;
  display_label: string;
  translated_value: string | null;
  quantity: number;
};

// Kaspi's "equipment" (Комплектация) field must never be hand-typed --
// it is always derived from the Commercial Product's bundle definition.
// One dictionary_value_id can appear more than once in bundle_components
// (e.g. two different connection kits); quantities are NOT summed across
// distinct dictionary values, only reported per line, since Kaspi expects
// a set of equipment items, not a merged count.
export function resolveEquipmentFromBundle(
  bundleComponents: BundleComponent[],
  salesChannel: string,
  categoryId: string | null,
  dictionaryValues: AttributeDictionaryValue[],
  translations: AttributeChannelTranslation[],
): ResolvedEquipmentLine[] {
  return bundleComponents
    .map((component): ResolvedEquipmentLine | null => {
      const dictionaryValue = dictionaryValues.find(
        (value) => value.id === component.dictionary_value_id && value.dictionary_code === "equipment",
      );
      if (!dictionaryValue) {
        return null;
      }

      const translation = resolveChannelTranslation(dictionaryValue.id, salesChannel, categoryId, translations);

      return {
        value_code: dictionaryValue.value_code,
        display_label: dictionaryValue.display_label,
        translated_value: translation?.translated_value ?? null,
        quantity: component.quantity,
      };
    })
    .filter((line): line is ResolvedEquipmentLine => line !== null);
}
