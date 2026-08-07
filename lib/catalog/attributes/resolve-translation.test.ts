import { describe, expect, it } from "vitest";
import { canonicalCode, parseCanonicalCode, resolveAttributeTranslation } from "./resolve-translation";
import type { AttributeChannelTranslation, AttributeDictionaryValue } from "../types";

const dictionaryValues: AttributeDictionaryValue[] = [
  {
    id: "dv-bottom",
    dictionary_code: "connection",
    value_code: "bottom",
    display_label: "Нижнее подключение",
    created_at: "2026-01-01T00:00:00Z",
  },
];

function translation(overrides: Partial<AttributeChannelTranslation>): AttributeChannelTranslation {
  return {
    id: "t1",
    attribute_dictionary_value_id: "dv-bottom",
    sales_channel: "kaspi",
    category_id: null,
    translated_value: "нижнее",
    translated_label: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("canonicalCode / parseCanonicalCode", () => {
  it("round-trips dictionary_code + value_code", () => {
    expect(canonicalCode("connection", "bottom")).toBe("connection.bottom");
    expect(parseCanonicalCode("connection.bottom")).toEqual({
      dictionaryCode: "connection",
      valueCode: "bottom",
    });
  });

  it("rejects malformed codes instead of guessing", () => {
    expect(parseCanonicalCode("connection")).toBeNull();
    expect(parseCanonicalCode(".bottom")).toBeNull();
    expect(parseCanonicalCode("connection.")).toBeNull();
  });
});

describe("resolveAttributeTranslation", () => {
  it("resolves the canonical example: connection.bottom -> Kaspi 'нижнее'", () => {
    const result = resolveAttributeTranslation(
      "connection.bottom",
      "kaspi",
      null,
      dictionaryValues,
      [translation({})],
    );

    expect(result?.dictionaryValue.display_label).toBe("Нижнее подключение");
    expect(result?.translation?.translated_value).toBe("нижнее");
  });

  it("prefers a category-specific translation over a channel-wide one", () => {
    const result = resolveAttributeTranslation(
      "connection.bottom",
      "kaspi",
      "cat-radiators",
      dictionaryValues,
      [translation({ category_id: null, translated_value: "generic" }), translation({ category_id: "cat-radiators", translated_value: "нижнее" })],
    );

    expect(result?.translation?.translated_value).toBe("нижнее");
  });

  it("returns translation: null rather than fabricating a value for an unknown channel", () => {
    const result = resolveAttributeTranslation("connection.bottom", "wb", null, dictionaryValues, [translation({})]);

    expect(result?.dictionaryValue).toBeDefined();
    expect(result?.translation).toBeNull();
  });

  it("returns null outright for a code with no matching dictionary value", () => {
    const result = resolveAttributeTranslation("material.steel", "kaspi", null, dictionaryValues, []);

    expect(result).toBeNull();
  });
});
