import type { LaunchChecklist, ResolvedChecklistItem } from "./types";

// The checklist item's own `label` describes a *requirement*
// ("Закупочная цена подтверждена поставщиком") -- fine for the checklist
// table, but not an instruction. "Следующее действие" needs to tell the
// operator what to physically go do next, in the exact business phrasing
// from the approved architecture doc, so nobody is ever left asking
// "what do I do now?".
const NEXT_ACTION_LABELS: Record<string, string> = {
  assortment_decision_confirmed: "Принять решение об ассортименте",
  supplier_available: "Подтвердить наличие у поставщика",
  purchase_price_confirmed: "Уточнить закупочную цену",
  sale_price_set: "Рассчитать продажную цену",
  technical_specs: "Заполнить характеристики",
  title_description: "Подготовить описание",
  primary_photo_gallery: "Подготовить изображения",
  category_attributes: "Заполнить атрибуты категории",
  bundle_defined: "Определить комплектацию",
  validation_export: "Подготовить публикацию",
  listing_confirmed: "Проверить публикацию в Kaspi",
};

export function nextActionLabelFor(item: ResolvedChecklistItem): string {
  return NEXT_ACTION_LABELS[item.key] ?? item.label;
}

const isOpen = (item: ResolvedChecklistItem) => item.status !== "done" && item.status !== "not_applicable";

// Blocking items gate publication and always take priority; once every
// blocking item is done, a still-open non-blocking item (e.g. "определить
// комплектацию" on a product that isn't a bundle) is surfaced as a soft
// suggestion rather than as something standing between the product and
// launch. Only when nothing at all is open do we call it done.
export function pickNextAction(checklist: LaunchChecklist): ResolvedChecklistItem | null {
  const openBlocking = checklist.items.find((item) => item.blocking && isOpen(item));
  if (openBlocking) return openBlocking;
  return checklist.items.find(isOpen) ?? null;
}
