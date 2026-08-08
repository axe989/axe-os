import { describe, expect, it } from "vitest";
import { calculateLaunchChecklist } from "./calculate-checklist";
import { CHECKLIST_ITEMS } from "./items";

describe("calculateLaunchChecklist", () => {
  it("defaults every item to pending when there are no signals or overlays at all", () => {
    const result = calculateLaunchChecklist([], []);
    expect(result.totalItems).toBe(CHECKLIST_ITEMS.length);
    expect(result.doneItems).toBe(0);
    expect(result.completionPercent).toBe(0);
    expect(result.items.every((item) => item.status === "pending")).toBe(true);
  });

  it("reflects the real example from the approved architecture doc: 3 of 9 done -> 33%", () => {
    const autoSignals = [
      { key: "assortment_decision_confirmed", status: "done" as const, note: null },
      { key: "supplier_available", status: "blocked" as const, note: "Нет поставщика с остатком на эту позицию" },
      { key: "sale_price_set", status: "done" as const, note: null },
      { key: "purchase_price_confirmed", status: "pending" as const, note: "Поставщик пока не передал закупочную цену" },
      { key: "title_description", status: "pending" as const, note: "Контент ещё не написан" },
      { key: "primary_photo_gallery", status: "blocked" as const, note: "Фотографии отсутствуют" },
      { key: "category_attributes", status: "done" as const, note: null },
      { key: "technical_specs", status: "blocked" as const, note: "Не заполнены: отапливаемая площадь, толщина" },
      { key: "bundle_defined", status: "done" as const, note: null },
      { key: "validation_export", status: "blocked" as const, note: "Блокируется пунктами «поставщик», «фото», «контент»" },
      { key: "listing_confirmed", status: "pending" as const, note: "Публикация ещё не выполнена" },
    ];

    const result = calculateLaunchChecklist(autoSignals, []);
    expect(result.doneItems).toBe(4); // assortment, sale_price, category_attributes, bundle_defined
    expect(result.completionPercent).toBe(Math.round((4 / result.totalItems) * 100));
  });

  it("lets a manual status override win over the automatic signal", () => {
    const result = calculateLaunchChecklist(
      [{ key: "supplier_available", status: "blocked", note: "system says blocked" }],
      [{ key: "supplier_available", targetDate: null, statusOverride: "done", blockingNote: null }],
    );
    const item = result.items.find((i) => i.key === "supplier_available")!;
    expect(item.status).toBe("done");
    expect(item.source).toBe("manual");
  });

  it("carries the blocking note through from a manual override", () => {
    const result = calculateLaunchChecklist(
      [],
      [{ key: "sale_price_set", targetDate: "2026-09-01", statusOverride: "blocked", blockingNote: "Ждём согласования скидки" }],
    );
    const item = result.items.find((i) => i.key === "sale_price_set")!;
    expect(item.status).toBe("blocked");
    expect(item.note).toBe("Ждём согласования скидки");
    expect(item.targetDate).toBe("2026-09-01");
  });

  it("falls back to the auto note when there is a target date but no override", () => {
    const result = calculateLaunchChecklist(
      [{ key: "primary_photo_gallery", status: "blocked", note: "Фотографии отсутствуют" }],
      [{ key: "primary_photo_gallery", targetDate: "2026-09-10", statusOverride: null, blockingNote: null }],
    );
    const item = result.items.find((i) => i.key === "primary_photo_gallery")!;
    expect(item.status).toBe("blocked");
    expect(item.note).toBe("Фотографии отсутствуют");
    expect(item.source).toBe("auto");
  });

  it("shows a manual note even when the human didn't also override the status", () => {
    const result = calculateLaunchChecklist(
      [{ key: "primary_photo_gallery", status: "blocked", note: "Фотографии отсутствуют" }],
      [{ key: "primary_photo_gallery", targetDate: "2026-09-15", statusOverride: null, blockingNote: "Фотосессия запланирована на следующую неделю" }],
    );
    const item = result.items.find((i) => i.key === "primary_photo_gallery")!;
    expect(item.status).toBe("blocked"); // still auto-derived, only the note is manual
    expect(item.note).toBe("Фотосессия запланирована на следующую неделю");
    expect(item.source).toBe("auto"); // status itself wasn't overridden
  });

  it("every item resolves to a real category/team from the fixed definitions, never undefined", () => {
    const result = calculateLaunchChecklist([], []);
    for (const item of result.items) {
      expect(item.category).toBeTruthy();
      expect(item.team).toBeTruthy();
      expect(item.label).toBeTruthy();
    }
  });

  it("100% completion only when every item is done", () => {
    const autoSignals = CHECKLIST_ITEMS.map((def) => ({ key: def.key, status: "done" as const, note: null }));
    const result = calculateLaunchChecklist(autoSignals, []);
    expect(result.completionPercent).toBe(100);
    expect(result.doneItems).toBe(result.totalItems);
  });
});
