// Generic SKU/name normalization helpers shared by every import source and
// the matching engine. Deliberately conservative: only collapses
// formatting noise (case, whitespace, dash/slash variants), never strips
// characters that could be identity-critical (e.g. a RAL color suffix).

export function normalizeSku(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[‐-―]/g, "-"); // unicode dash variants -> ascii hyphen

  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeProductName(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }

  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"'.,]/g, "")
    .replace(/\s+/g, " ");

  return normalized.length > 0 ? normalized : null;
}

export function normalizeEan(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  const digitsOnly = String(raw).replace(/\D/g, "");
  return digitsOnly.length >= 8 ? digitsOnly : null;
}
