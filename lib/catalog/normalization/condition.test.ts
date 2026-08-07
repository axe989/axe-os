import { describe, expect, it } from "vitest";
import { isSaleableCondition, normalizeCondition } from "./condition";

describe("normalizeCondition", () => {
  it("classifies new stock", () => {
    expect(normalizeCondition("Новый")).toBe("new");
  });

  it("classifies shortage variants", () => {
    expect(normalizeCondition("Недостача")).toBe("shortage");
    expect(normalizeCondition("Недостача, не вернули с выставки")).toBe("shortage");
    expect(normalizeCondition("Недостача,не поступил с РФ")).toBe("shortage");
  });

  it("classifies discounted stock that embeds a markdown price", () => {
    expect(
      normalizeCondition(
        "Потертости и царапины согл.уценка 30% цена за 1 шт 35 019,68  KZ",
      ),
    ).toBe("discounted");
  });

  it("classifies scratched/damaged variants", () => {
    expect(normalizeCondition("Царапины и потертости.")).toBe("damaged");
    expect(normalizeCondition("Потертости и царапины на корпусе")).toBe("damaged");
    expect(normalizeCondition("Разлом секции")).toBe("damaged");
    expect(normalizeCondition("Скол секции")).toBe("damaged");
    expect(normalizeCondition("Вмятина на решетке")).toBe("damaged");
    expect(normalizeCondition("Замятие узла подключения")).toBe("damaged");
    expect(normalizeCondition("скол секции (заводской брак)")).toBe("damaged");
  });

  it("classifies missing-packaging notes as incomplete", () => {
    expect(
      normalizeCondition("Нет заводской упаковки, все остальное в порядке"),
    ).toBe("incomplete");
  });

  it("falls back to unknown for empty or unrecognized text", () => {
    expect(normalizeCondition(null)).toBe("unknown");
    expect(normalizeCondition("")).toBe("unknown");
    expect(normalizeCondition("-")).toBe("unknown");
    expect(normalizeCondition("странный статус без ключевых слов")).toBe("unknown");
  });
});

describe("isSaleableCondition", () => {
  it("only treats new as saleable", () => {
    expect(isSaleableCondition("new")).toBe(true);
    expect(isSaleableCondition("discounted")).toBe(false);
    expect(isSaleableCondition("damaged")).toBe(false);
    expect(isSaleableCondition("shortage")).toBe(false);
    expect(isSaleableCondition("incomplete")).toBe(false);
    expect(isSaleableCondition("unknown")).toBe(false);
  });
});
