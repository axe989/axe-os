import { describe, expect, it } from "vitest";
import {
  calculateExpectedMargin,
  calculateExpectedProfit,
  calculateMinimumSalePrice,
  calculateRecommendedSalePrice,
  classifyMarginStatus,
} from "./margin";

describe("calculateExpectedProfit / calculateExpectedMargin", () => {
  it("computes profit accounting for percent-of-price commission/advertising plus fixed costs", () => {
    const profit = calculateExpectedProfit({
      salePrice: 100000,
      purchasePrice: 60000,
      commissionPercent: 10,
      logisticsCost: 2000,
      advertisingPercent: 5,
      otherVariableCost: 1000,
    });

    // 100000 - 60000 - 10000(commission) - 2000 - 5000(advertising) - 1000
    expect(profit).toBe(22000);
    expect(calculateExpectedMargin(profit, 100000)).toBeCloseTo(22, 5);
  });

  it("returns 0 margin when sale price is 0", () => {
    expect(calculateExpectedMargin(0, 0)).toBe(0);
  });

  it("produces a negative profit when costs exceed sale price", () => {
    const profit = calculateExpectedProfit({
      salePrice: 50000,
      purchasePrice: 60000,
      commissionPercent: 10,
      logisticsCost: 2000,
      advertisingPercent: 5,
      otherVariableCost: 1000,
    });

    expect(profit).toBeLessThan(0);
  });
});

describe("calculateMinimumSalePrice", () => {
  it("solves for the price where margin equals the minimum margin percent", () => {
    const inputs = {
      purchasePrice: 60000,
      commissionPercent: 10,
      logisticsCost: 2000,
      advertisingPercent: 5,
      otherVariableCost: 1000,
      minimumMarginPercent: 15,
    };

    const price = calculateMinimumSalePrice(inputs);
    const profit = calculateExpectedProfit({ salePrice: price, ...inputs });
    const margin = calculateExpectedMargin(profit, price);

    expect(margin).toBeCloseTo(15, 5);
  });

  it("takes the higher of the margin floor and the fixed minimum-profit floor", () => {
    const base = {
      purchasePrice: 60000,
      commissionPercent: 10,
      logisticsCost: 2000,
      advertisingPercent: 5,
      otherVariableCost: 1000,
      minimumMarginPercent: 5, // low margin floor
    };

    const withoutProfitFloor = calculateMinimumSalePrice(base);
    const withHighProfitFloor = calculateMinimumSalePrice({
      ...base,
      minimumProfitAmount: 50000, // demanding fixed profit floor
    });

    expect(withHighProfitFloor).toBeGreaterThan(withoutProfitFloor);

    const profitAtFloor = calculateExpectedProfit({
      salePrice: withHighProfitFloor,
      ...base,
    });
    expect(profitAtFloor).toBeCloseTo(50000, 2);
  });
});

describe("calculateRecommendedSalePrice", () => {
  it("solves for the price where margin equals the target margin percent", () => {
    const inputs = {
      purchasePrice: 60000,
      commissionPercent: 10,
      logisticsCost: 2000,
      advertisingPercent: 5,
      otherVariableCost: 1000,
      targetMarginPercent: 25,
    };

    const price = calculateRecommendedSalePrice(inputs);
    const profit = calculateExpectedProfit({ salePrice: price, ...inputs });
    const margin = calculateExpectedMargin(profit, price);

    expect(margin).toBeCloseTo(25, 5);
  });

  it("applies the psychological_99 rounding rule", () => {
    const price = calculateRecommendedSalePrice({
      purchasePrice: 60000,
      commissionPercent: 10,
      logisticsCost: 2000,
      advertisingPercent: 5,
      otherVariableCost: 1000,
      targetMarginPercent: 25,
      roundingRule: "psychological_99",
    });

    expect(price % 100).toBe(99);
  });
});

describe("classifyMarginStatus", () => {
  const thresholds = { targetMarginPercent: 20, minimumMarginPercent: 10 };

  it("classifies negative margin", () => {
    expect(classifyMarginStatus(-5, thresholds)).toBe("negative");
  });

  it("classifies below_minimum", () => {
    expect(classifyMarginStatus(5, thresholds)).toBe("below_minimum");
  });

  it("classifies below_target", () => {
    expect(classifyMarginStatus(15, thresholds)).toBe("below_target");
  });

  it("classifies healthy margin at or above target", () => {
    expect(classifyMarginStatus(22, thresholds)).toBe("healthy");
  });

  it("does not flag review_high_margin from margin alone, without corroborating signals", () => {
    expect(classifyMarginStatus(45, thresholds)).toBe("healthy");
  });

  it("flags review_high_margin only when high margin is paired with stock + weak demand signals", () => {
    expect(
      classifyMarginStatus(45, thresholds, {
        hasSaleableStock: true,
        salesTrend: "falling",
      }),
    ).toBe("review_high_margin");

    expect(
      classifyMarginStatus(45, thresholds, {
        hasSaleableStock: true,
        salesTrend: "rising",
      }),
    ).toBe("healthy");

    expect(
      classifyMarginStatus(45, thresholds, {
        hasSaleableStock: false,
        salesTrend: "falling",
      }),
    ).toBe("healthy");
  });
});
