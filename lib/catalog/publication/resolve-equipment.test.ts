import { describe, expect, it } from "vitest";
import { resolveEquipmentFromBundle } from "./resolve-equipment";
import type { AttributeChannelTranslation, AttributeDictionaryValue } from "../types";

const dictionaryValues: AttributeDictionaryValue[] = [
  { id: "eq-radiator", dictionary_code: "equipment", value_code: "radiator", display_label: "Радиатор", created_at: "2026-01-01T00:00:00Z" },
  { id: "eq-brackets", dictionary_code: "equipment", value_code: "bracket_kit", display_label: "Комплект кронштейнов", created_at: "2026-01-01T00:00:00Z" },
  { id: "not-equipment", dictionary_code: "material", value_code: "steel", display_label: "Стальной", created_at: "2026-01-01T00:00:00Z" },
];

const translations: AttributeChannelTranslation[] = [
  {
    id: "t1",
    attribute_dictionary_value_id: "eq-radiator",
    sales_channel: "kaspi",
    category_id: null,
    translated_value: "радиатор",
    translated_label: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "t2",
    attribute_dictionary_value_id: "eq-brackets",
    sales_channel: "kaspi",
    category_id: null,
    translated_value: "комплект кронштейнов",
    translated_label: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("resolveEquipmentFromBundle", () => {
  it("derives equipment lines from bundle components, base + brackets", () => {
    const result = resolveEquipmentFromBundle(
      [
        { dictionary_value_id: "eq-radiator", quantity: 1 },
        { dictionary_value_id: "eq-brackets", quantity: 1 },
      ],
      "kaspi",
      null,
      dictionaryValues,
      translations,
    );

    expect(result).toEqual([
      { value_code: "radiator", display_label: "Радиатор", translated_value: "радиатор", quantity: 1 },
      { value_code: "bracket_kit", display_label: "Комплект кронштейнов", translated_value: "комплект кронштейнов", quantity: 1 },
    ]);
  });

  it("drops a bundle line whose dictionary_value_id isn't in the equipment dictionary", () => {
    const result = resolveEquipmentFromBundle(
      [{ dictionary_value_id: "not-equipment", quantity: 1 }],
      "kaspi",
      null,
      dictionaryValues,
      translations,
    );

    expect(result).toEqual([]);
  });

  it("returns translated_value: null instead of fabricating a string for an untranslated channel", () => {
    const result = resolveEquipmentFromBundle(
      [{ dictionary_value_id: "eq-radiator", quantity: 1 }],
      "wb",
      null,
      dictionaryValues,
      translations,
    );

    expect(result).toEqual([{ value_code: "radiator", display_label: "Радиатор", translated_value: null, quantity: 1 }]);
  });

  it("an empty bundle produces no equipment lines", () => {
    expect(resolveEquipmentFromBundle([], "kaspi", null, dictionaryValues, translations)).toEqual([]);
  });
});
