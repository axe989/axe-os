// Small known-brand dictionary seeded from the two pilot source files
// (Термо stock sheet + товары-2 repricer export). Generic and additive --
// unrecognized brands simply return null and the row is left for manual
// review, per spec ("do not assume every row follows one exact pattern").
const KNOWN_BRANDS = [
  "Royal Thermo",
  "Midea",
  "OTEX",
  "Gree",
  "Ariston",
  "Shuft",
];

export function extractBrand(name: string | null | undefined): string | null {
  if (!name) {
    return null;
  }

  const lowerName = name.toLowerCase();
  const found = KNOWN_BRANDS.find((brand) => lowerName.includes(brand.toLowerCase()));
  return found ?? null;
}
