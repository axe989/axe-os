import type { ChecklistItemDefinition } from "./types";

// Fixed business policy, not user-editable configuration -- who owns a
// given checklist item is an organizational decision (see the approved
// Chapter 5 responsibility table), not something that varies per product.
// That's why this is a code constant and not a second database table.
export const CHECKLIST_ITEMS: ChecklistItemDefinition[] = [
  { key: "assortment_decision_confirmed", category: "business", label: "Решение об ассортименте принято", team: "commercial_director" },
  { key: "supplier_available", category: "business", label: "Поставщик с достаточным остатком подтверждён", team: "commercial_director" },

  { key: "sale_price_set", category: "pricing", label: "Цена продажи установлена", team: "finance" },
  { key: "purchase_price_confirmed", category: "pricing", label: "Закупочная цена подтверждена поставщиком", team: "finance" },

  { key: "title_description", category: "content", label: "Название и описание товара", team: "content" },

  { key: "primary_photo_gallery", category: "media", label: "Основное фото и галерея", team: "content" },

  { key: "category_attributes", category: "marketplace_attributes", label: "Атрибуты категории (тип, материал, цвет и др.)", team: "commercial_director" },
  { key: "technical_specs", category: "marketplace_attributes", label: "Технические характеристики", team: "commercial_director" },
  { key: "bundle_defined", category: "marketplace_attributes", label: "Комплектация определена", team: "commercial_director" },

  { key: "validation_export", category: "publication", label: "Проверка обязательных полей и выгрузка на маркетплейс", team: "marketplace" },

  { key: "listing_confirmed", category: "post_publication_verification", label: "Листинг подтверждён фактическим появлением на площадке", team: "marketplace" },
];
