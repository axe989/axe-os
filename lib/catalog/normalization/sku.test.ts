import { describe, expect, it } from "vitest";
import { normalizeEan, normalizeProductName, normalizeSku } from "./sku";

describe("normalizeSku", () => {
  it("uppercases and collapses whitespace", () => {
    expect(normalizeSku("  c22-300-1000/9016  ")).toBe("C22-300-1000/9016");
    expect(normalizeSku("C22-300-1000 /  9016")).toBe("C22-300-1000 / 9016");
  });

  it("returns null for empty input", () => {
    expect(normalizeSku(null)).toBeNull();
    expect(normalizeSku("")).toBeNull();
    expect(normalizeSku("   ")).toBeNull();
  });
});

describe("normalizeProductName", () => {
  it("lowercases, normalizes ё, and strips punctuation", () => {
    expect(normalizeProductName("Радиатор панельный ROYAL THERMO, «COMPACT»")).toBe(
      "радиатор панельный royal thermo compact",
    );
  });

  it("returns null for empty input", () => {
    expect(normalizeProductName(undefined)).toBeNull();
  });
});

describe("normalizeEan", () => {
  it("keeps only digit strings of at least 8 characters", () => {
    expect(normalizeEan("4820022351234")).toBe("4820022351234");
    expect(normalizeEan("482-002-2351234")).toBe("4820022351234");
  });

  it("rejects short or empty values", () => {
    expect(normalizeEan("1234")).toBeNull();
    expect(normalizeEan(null)).toBeNull();
    expect(normalizeEan(undefined)).toBeNull();
  });
});
