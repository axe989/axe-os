import type { ChecklistItemDefinition } from "./types";

// Fixed business policy, not user-editable configuration -- who owns a
// given checklist item is an organizational decision (see the approved
// Chapter 5 responsibility table), not something that varies per product.
// That's why this is a code constant and not a second database table.
export const CHECKLIST_ITEMS: ChecklistItemDefinition[] = [
  { key: "assortment_decision_confirmed", category: "assortment_decision", label: "Решение об ассортименте принято", team: "commercial_director", blocking: true },

  { key: "supplier_available", category: "supplier_data", label: "Поставщик с достаточным остатком подтверждён", team: "commercial_director", blocking: true },
  { key: "purchase_price_confirmed", category: "supplier_data", label: "Закупочная цена подтверждена поставщиком", team: "commercial_director", blocking: true },

  { key: "sale_price_set", category: "pricing", label: "Цена продажи установлена", team: "finance", blocking: true },

  { key: "technical_specs", category: "technical_specs", label: "Технические характеристики заполнены", team: "commercial_director", blocking: true },

  { key: "title_description", category: "content", label: "Название и описание товара", team: "content", blocking: true },

  { key: "primary_photo_gallery", category: "media", label: "Основное фото и галерея", team: "content", blocking: true },

  { key: "category_attributes", category: "marketplace_attributes", label: "Атрибуты категории (тип, материал, цвет и др.)", team: "marketplace", blocking: true },
  { key: "bundle_defined", category: "marketplace_attributes", label: "Комплектация определена", team: "commercial_director", blocking: false },

  { key: "validation_export", category: "publication", label: "Проверка обязательных полей и выгрузка на маркетплейс", team: "marketplace", blocking: true },

  { key: "listing_confirmed", category: "post_publication_verification", label: "Листинг подтверждён фактическим появлением на площадке", team: "marketplace", blocking: false },
];
