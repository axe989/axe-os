// Metric Dictionary for Product Center v2's Executive Dashboard and
// Marketplace overview (mandate Section 8: "no metric may be displayed
// without deterministic semantics"). Single source of truth for what
// each number means, where it comes from, and where clicking it should
// take you -- the dashboard page renders its KPI tiles FROM this list
// rather than hardcoding labels next to numbers, so the definition and
// the display can never drift apart.
//
// Historical context for why this file exists: before this rework, the
// Marketplace screen showed "532 активных листингов" (a raw count of
// Kaspi marketplace_listings rows from a repricer-tool snapshot import)
// right next to the Executive Dashboard's "20% Kaspi coverage" (a
// completely different ratio: distinct commercial products with at
// least one matched Kaspi listing / active commercial products) with no
// indication they used different denominators. Both numbers were
// individually correct; the confusion was purely a labeling gap.

export type MetricDefinition = {
  key: string;
  name: string;
  definition: string;
  dbSource: string;
  numerator: string;
  denominator: string | null;
  drillDownHref: string;
};

export const METRIC_DICTIONARY: MetricDefinition[] = [
  {
    key: "baseProductCount",
    name: "Всего товаров (Base Products)",
    definition: "Количество уникальных физических товаров, которые AXE знает по имени производителя — независимо от решения по ассортименту.",
    dbSource: "product_master",
    numerator: "count(product_master)",
    denominator: null,
    drillDownHref: "/product-center-v2/supplier-feed",
  },
  {
    key: "commercialProductCount",
    name: "Commercial Products",
    definition: "Количество коммерческих упаковок товара — то, что реально может продаваться. Один Base Product может иметь несколько Commercial Products (например, поштучно и набором).",
    dbSource: "commercial_products",
    numerator: "count(commercial_products)",
    denominator: null,
    drillDownHref: "/product-center-v2/development",
  },
  {
    key: "activeProducts",
    name: "Активные товары",
    definition: "Commercial Products, не архивированные и не исключённые из ассортимента.",
    dbSource: "commercial_products",
    numerator: "count(status != archived and assortment_status != archived)",
    denominator: null,
    drillDownHref: "/product-center-v2/development",
  },
  {
    key: "archivedProducts",
    name: "Архивные товары",
    definition: "Commercial Products, снятые с продажи или исключённые из ассортимента.",
    dbSource: "commercial_products",
    numerator: "count(status = archived or assortment_status = archived)",
    denominator: null,
    drillDownHref: "/product-center-v2/development?status=archived",
  },
  {
    key: "marketplaceListingCount",
    name: "Marketplace Listings",
    definition: "Реальные позиции, зафиксированные на площадках (все каналы) — независимо от того, сопоставлены ли они с нашим каталогом.",
    dbSource: "marketplace_listings",
    numerator: "count(marketplace_listings)",
    denominator: null,
    drillDownHref: "/product-center-v2/marketplace/listings",
  },
  {
    key: "publishedProducts",
    name: "Опубликованных товаров",
    definition: "Commercial Products, дошедшие до статуса «Опубликован» в нашем собственном воркфлоу подготовки.",
    dbSource: "commercial_products.status",
    numerator: "count(status = published)",
    denominator: null,
    drillDownHref: "/product-center-v2/development?status=published",
  },
  {
    key: "kaspiCoveragePercent",
    name: "Покрытие Kaspi",
    definition: "Доля активных Commercial Products, у которых есть хотя бы один сопоставленный листинг на Kaspi.",
    dbSource: "marketplace_listings, commercial_products",
    numerator: "distinct commercial_product_id среди листингов Kaspi",
    denominator: "активные Commercial Products",
    drillDownHref: "/product-center-v2/marketplace/listings?channel=kaspi&reconciled=matched",
  },
  {
    key: "websiteCoveragePercent",
    name: "Покрытие сайта",
    definition: "Доля активных Commercial Products, представленных на собственном сайте.",
    dbSource: "marketplace_listings, commercial_products",
    numerator: "distinct commercial_product_id среди листингов сайта",
    denominator: "активные Commercial Products",
    drillDownHref: "/product-center-v2/marketplace/listings?channel=website&reconciled=matched",
  },
  {
    key: "createdLastWindow",
    name: "Новых карточек за 30 дней",
    definition: "Commercial Products, созданные за последние 30 дней.",
    dbSource: "commercial_products.created_at",
    numerator: "count(created_at >= now() - 30d)",
    denominator: null,
    drillDownHref: "/product-center-v2/development",
  },
  {
    key: "archivedLastWindow",
    name: "Снято с продажи за 30 дней",
    definition: "Товары, переведённые в архивный статус ассортимента за последние 30 дней.",
    dbSource: "product_status_history",
    numerator: "count(change_type = assortment_status, new_value = archived, created_at >= now() - 30d)",
    denominator: null,
    drillDownHref: "/product-center-v2/development?status=archived",
  },
  {
    key: "publishedLastWindow",
    name: "Опубликованы за 30 дней",
    definition: "Товары, переведённые в статус «Опубликован» за последние 30 дней.",
    dbSource: "product_status_history",
    numerator: "count(change_type = status, new_value = published, created_at >= now() - 30d)",
    denominator: null,
    drillDownHref: "/product-center-v2/development?status=published",
  },
  {
    key: "awaitingBusinessDecision",
    name: "Ожидают ассортиментного решения",
    definition: "Предложения поставщиков, по которым ещё не принято решение — принимать ли товар в ассортимент.",
    dbSource: "supplier_offers.assortment_decision",
    numerator: "count(assortment_decision = pending)",
    denominator: null,
    drillDownHref: "/product-center-v2/opportunities",
  },
  {
    key: "inPreparation",
    name: "В подготовке",
    definition: "Активные Commercial Products, ещё не готовые к публикации и не опубликованные.",
    dbSource: "commercial_products.status",
    numerator: "count(status not in (ready_to_publish, published), активные)",
    denominator: null,
    drillDownHref: "/product-center-v2/development",
  },
  {
    key: "awaitingLaunch",
    name: "Готовы к публикации",
    definition: "Commercial Products, прошедшие чек-лист запуска и ожидающие подготовки публикации.",
    dbSource: "commercial_products.status",
    numerator: "count(status = ready_to_publish)",
    denominator: null,
    drillDownHref: "/product-center-v2/development?status=ready_to_publish",
  },
  {
    key: "commercialOpportunities",
    name: "Коммерческие возможности",
    definition: "Commercial Products со статусом ассортимента «кандидат» — приняты, но ещё не подтверждены как активная позиция.",
    dbSource: "commercial_products.assortment_status",
    numerator: "count(assortment_status = candidate)",
    denominator: null,
    drillDownHref: "/product-center-v2/development",
  },
];

export function metricByKey(key: string): MetricDefinition {
  const found = METRIC_DICTIONARY.find((m) => m.key === key);
  if (!found) throw new Error(`Неизвестная метрика в словаре: ${key}`);
  return found;
}
