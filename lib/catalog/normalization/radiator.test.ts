import { describe, expect, it } from "vitest";
import { parseRadiatorSku } from "./radiator";

describe("parseRadiatorSku", () => {
  it("parses the canonical compact-code pattern from the spec", () => {
    const result = parseRadiatorSku(
      "C22-300-1000/9016",
      "Радиатор панельный Royal Thermo COMPACT C22-300-1000 RAL9016",
    );

    expect(result.attributes).toMatchObject({
      connection_type: "C",
      radiator_type: "22",
      height_mm: 300,
      length_mm: 1000,
      color_ral: "9016",
      hygienic: false,
    });
    expect(result.needsReview).toBe(false);
    expect(result.matchedPattern).toBe("compact_code");
  });

  it("parses Ventil Compact (VC) connection codes", () => {
    const result = parseRadiatorSku(
      "VC22-500-1600/9016",
      "Royal Thermo панельный VENTIL COMPACT VC22-500-1600 RAL9016 стальной, кол-во секций: 1",
    );

    expect(result.attributes.connection_type).toBe("VC");
    expect(result.attributes.radiator_type).toBe("22");
    expect(result.attributes.height_mm).toBe(500);
    expect(result.attributes.length_mm).toBe(1600);
    expect(result.attributes.panel_count).toBe(1);
  });

  it("extracts a non-RAL colour code without failing", () => {
    const result = parseRadiatorSku(
      "C21-500-1400/SS",
      "Радиатор панельный Royal Thermo COMPACT C21-500-1400 Silver Satin",
    );

    expect(result.attributes.color_ral).toBe("SS");
    expect(result.attributes.height_mm).toBe(500);
    expect(result.attributes.length_mm).toBe(1400);
  });

  it("flags unfamiliar radiator type codes for review instead of rejecting the row", () => {
    // Real observed data contains "C21", which is outside the spec's known
    // {11, 22, 33} set. It must still be parsed (dimensions extracted) but
    // marked uncertain rather than silently trusted or dropped.
    const result = parseRadiatorSku("C21-500-1400/SS", "some name");

    expect(result.attributes.radiator_type).toBeNull();
    expect(result.needsReview).toBe(true);
  });

  it("falls back to free-text dimension extraction when there is no compact code", () => {
    const result = parseRadiatorSku(
      null,
      "Royal Thermo трубчатый Insignia C2180 — 04 секц. RAL9016 стальной 202х1800 мм",
    );

    expect(result.matchedPattern).toBe("free_text");
    expect(result.attributes.height_mm).toBe(202);
    expect(result.attributes.length_mm).toBe(1800);
    expect(result.attributes.color_ral).toBe("9016");
    expect(result.needsReview).toBe(true);
  });

  it("detects hygienic execution from the name", () => {
    const result = parseRadiatorSku(
      "C22-300-1000/9016",
      "Радиатор панельный Royal Thermo COMPACT гигиенический C22-300-1000 RAL9016",
    );

    expect(result.attributes.hygienic).toBe(true);
  });

  it("marks completely unparsable rows for review without throwing", () => {
    const result = parseRadiatorSku("RTWX 100", "Бойлер косвенного нагрева Royal Thermo AQUATEC INOX RTWX 100");

    expect(result.matchedPattern).toBe("none");
    expect(result.needsReview).toBe(true);
    expect(result.attributes.height_mm).toBeNull();
  });
});
