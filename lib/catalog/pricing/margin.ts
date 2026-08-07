import type { MarginStatus } from "../types";

export type CostInputs = {
  salePrice: number;
  purchasePrice: number;
  commissionPercent: number;
  logisticsCost: number;
  advertisingPercent: number;
  otherVariableCost: number;
};

// commission and advertising are modeled as a percentage of sale price
// (matching pricing_strategies.marketplace_commission_percent /
// default_advertising_percent); logistics and other costs are fixed
// absolute amounts per unit.
export function calculateExpectedProfit(inputs: CostInputs): number {
  const commissionAmount = inputs.salePrice * (inputs.commissionPercent / 100);
  const advertisingAmount = inputs.salePrice * (inputs.advertisingPercent / 100);

  return (
    inputs.salePrice -
    inputs.purchasePrice -
    commissionAmount -
    inputs.logisticsCost -
    advertisingAmount -
    inputs.otherVariableCost
  );
}

export function calculateExpectedMargin(profit: number, salePrice: number): number {
  return salePrice > 0 ? (profit / salePrice) * 100 : 0;
}

export type MinimumPriceInputs = {
  purchasePrice: number;
  commissionPercent: number;
  logisticsCost: number;
  advertisingPercent: number;
  otherVariableCost: number;
  minimumMarginPercent: number;
  minimumProfitAmount?: number | null;
};

// Solves for the sale price at which margin == minimumMarginPercent, given
// commission/advertising scale with sale price. When minimumProfitAmount
// is also set, returns the higher of the two prices so both floors hold
// simultaneously.
export function calculateMinimumSalePrice(inputs: MinimumPriceInputs): number {
  const fixedCosts = inputs.purchasePrice + inputs.logisticsCost + inputs.otherVariableCost;
  const variableRate = (inputs.commissionPercent + inputs.advertisingPercent) / 100;

  const priceForMinMargin =
    fixedCosts / (1 - variableRate - inputs.minimumMarginPercent / 100);

  if (inputs.minimumProfitAmount === undefined || inputs.minimumProfitAmount === null) {
    return priceForMinMargin;
  }

  const priceForMinProfit = (fixedCosts + inputs.minimumProfitAmount) / (1 - variableRate);

  return Math.max(priceForMinMargin, priceForMinProfit);
}

export type RecommendedPriceInputs = {
  purchasePrice: number;
  commissionPercent: number;
  logisticsCost: number;
  advertisingPercent: number;
  otherVariableCost: number;
  targetMarginPercent: number;
  roundingRule?: "none" | "nearest_10" | "nearest_100" | "nearest_1000" | "psychological_99";
};

export function calculateRecommendedSalePrice(inputs: RecommendedPriceInputs): number {
  const fixedCosts = inputs.purchasePrice + inputs.logisticsCost + inputs.otherVariableCost;
  const variableRate = (inputs.commissionPercent + inputs.advertisingPercent) / 100;
  const rawPrice = fixedCosts / (1 - variableRate - inputs.targetMarginPercent / 100);

  return applyRoundingRule(rawPrice, inputs.roundingRule ?? "none");
}

function applyRoundingRule(
  price: number,
  rule: "none" | "nearest_10" | "nearest_100" | "nearest_1000" | "psychological_99",
): number {
  switch (rule) {
    case "nearest_10":
      return Math.ceil(price / 10) * 10;
    case "nearest_100":
      return Math.ceil(price / 100) * 100;
    case "nearest_1000":
      return Math.ceil(price / 1000) * 1000;
    case "psychological_99":
      return Math.ceil(price / 100) * 100 - 1;
    case "none":
    default:
      return price;
  }
}

// A margin "materially exceeding target" is only a review signal, never a
// standalone claim that sales were lost (spec: "Do not claim lost sales
// without supporting market-price, traffic or conversion data"). Callers
// must supply corroborating stock/sales-trend signals; without them this
// classifies as healthy even when the margin itself is very high.
const HIGH_MARGIN_REVIEW_MULTIPLIER = 1.5;

export type MarginReviewSignals = {
  hasSaleableStock: boolean;
  salesTrend?: "rising" | "stable" | "falling" | "absent";
};

export function classifyMarginStatus(
  marginPercent: number,
  thresholds: { targetMarginPercent: number; minimumMarginPercent: number },
  signals?: MarginReviewSignals,
): MarginStatus {
  if (marginPercent < 0) {
    return "negative";
  }

  if (marginPercent < thresholds.minimumMarginPercent) {
    return "below_minimum";
  }

  if (marginPercent < thresholds.targetMarginPercent) {
    return "below_target";
  }

  const materiallyHigh = marginPercent >= thresholds.targetMarginPercent * HIGH_MARGIN_REVIEW_MULTIPLIER;
  const weakDemandSignal =
    signals?.hasSaleableStock === true &&
    (signals.salesTrend === "falling" || signals.salesTrend === "absent");

  if (materiallyHigh && weakDemandSignal) {
    return "review_high_margin";
  }

  return "healthy";
}
