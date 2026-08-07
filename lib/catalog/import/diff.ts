// Pure change-detection used by the import pipeline to decide whether an
// incoming row represents a real change worth an immutable history row, or
// is a no-op re-import of unchanged data (spec: "Do not create duplicate
// price-history records when the same file is uploaded again"). Kept
// separate from any DB I/O so it can be unit tested directly, since this
// repo has no test-database infrastructure to integration-test against.

export type SupplierOfferSnapshot = {
  purchase_price: number | null;
  stock_quantity: number | null;
  product_condition: string;
};

function numbersEqual(a: number | null, b: number | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return Math.abs(a - b) < 0.005;
}

export function hasSupplierOfferChanged(
  current: SupplierOfferSnapshot | null,
  incoming: SupplierOfferSnapshot,
): boolean {
  if (!current) {
    return true;
  }

  return (
    !numbersEqual(current.purchase_price, incoming.purchase_price) ||
    !numbersEqual(current.stock_quantity, incoming.stock_quantity) ||
    current.product_condition !== incoming.product_condition
  );
}

export function hasChannelPriceChanged(
  currentPrice: number | null,
  incomingPrice: number | null,
): boolean {
  return !numbersEqual(currentPrice, incomingPrice);
}
