import type { RadiatorAttributes } from "../types";

// Royal Thermo steel panel radiator SKU/name parser, e.g.:
//   C22-300-1000/9016        -> connection C, type 22, 300x1000mm, RAL9016
//   VC22-500-1600/9016       -> connection VC (Ventil Compact), ...
//   C21-500-1400/SS          -> non-numeric colour code (Silver Satin)
//
// Per spec: "Do not assume every row follows one exact pattern. Store
// unparsed raw values and mark uncertain rows for review." Known
// identity-critical radiator types are 11/22/33; other 2-digit codes seen
// in real data (e.g. "21") are still extracted but flagged with
// needsReview so a human confirms them rather than silently trusting an
// unfamiliar type code.

const KNOWN_RADIATOR_TYPES = new Set(["11", "22", "33"]);

const CODE_PATTERN = /^(C|VC)(\d{2})-(\d{3,4})-(\d{3,4})(?:\/([A-Za-z0-9]+))?/i;

// Fallback for free-text titles (e.g. repricer export) that don't carry
// the compact code, e.g. "...202х1800 мм" or "RAL9016".
const DIMENSION_PATTERN = /(\d{2,4})\s*[xхХX]\s*(\d{3,4})\s*мм/;
const RAL_PATTERN = /RAL\s?(\d{3,4})/i;
const HYGIENIC_KEYWORDS = ["гигиен"];
const PANEL_COUNT_PATTERN = /кол-во секций:\s*(\d+)/i;

export type RadiatorParseResult = {
  attributes: RadiatorAttributes;
  needsReview: boolean;
  matchedPattern: "compact_code" | "free_text" | "none";
};

export function parseRadiatorSku(
  manufacturerSku: string | null | undefined,
  fullName: string | null | undefined,
): RadiatorParseResult {
  const sku = (manufacturerSku ?? "").trim();
  const name = fullName ?? "";
  const hygienic = HYGIENIC_KEYWORDS.some((keyword) => name.toLowerCase().includes(keyword));
  const panelCountMatch = name.match(PANEL_COUNT_PATTERN);
  const panelCount = panelCountMatch ? Number(panelCountMatch[1]) : null;

  const codeMatch = sku.match(CODE_PATTERN);

  if (codeMatch) {
    const [, connection, radiatorType, height, length, color] = codeMatch;
    const knownType = KNOWN_RADIATOR_TYPES.has(radiatorType);

    return {
      attributes: {
        connection_type: connection.toUpperCase() === "VC" ? "VC" : "C",
        radiator_type: knownType ? (radiatorType as "11" | "22" | "33") : null,
        height_mm: Number(height),
        length_mm: Number(length),
        depth_mm: null,
        color_ral: color ?? null,
        hygienic,
        panel_count: panelCount,
      },
      needsReview: !knownType,
      matchedPattern: "compact_code",
    };
  }

  const dimensionMatch = name.match(DIMENSION_PATTERN);
  const ralMatch = name.match(RAL_PATTERN);

  if (dimensionMatch || ralMatch) {
    const connection = /ventil compact|\bvc\b/i.test(name)
      ? "VC"
      : /боковое подключение|\bc\d{2}\b/i.test(name)
        ? "C"
        : null;

    return {
      attributes: {
        connection_type: connection,
        radiator_type: null,
        height_mm: dimensionMatch ? Number(dimensionMatch[1]) : null,
        length_mm: dimensionMatch ? Number(dimensionMatch[2]) : null,
        depth_mm: null,
        color_ral: ralMatch ? ralMatch[1] : null,
        hygienic,
        panel_count: panelCount,
      },
      needsReview: true,
      matchedPattern: "free_text",
    };
  }

  return {
    attributes: {
      connection_type: null,
      radiator_type: null,
      height_mm: null,
      length_mm: null,
      depth_mm: null,
      color_ral: null,
      hygienic,
      panel_count: panelCount,
    },
    needsReview: true,
    matchedPattern: "none",
  };
}

export function isSteelPanelRadiatorName(name: string | null | undefined): boolean {
  if (!name) {
    return false;
  }

  const text = name.toLowerCase();
  return text.includes("радиатор панельный") || text.includes("панельный") && text.includes("royal thermo");
}
