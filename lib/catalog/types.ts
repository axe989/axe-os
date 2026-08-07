// Shared domain types for the Product Catalog Engine. Hand-declared to
// match the migrations under supabase/migrations/2026080613*, following
// this repo's existing convention of per-file row types (see
// lib/dashboard/queries.ts) rather than a generated database.types.ts.

export type ProductWorkflowStatus =
  | "discovered"
  | "needs_matching"
  | "draft"
  | "needs_technical_data"
  | "needs_content"
  | "needs_price"
  | "review"
  | "approved"
  | "ready_to_publish"
  | "published"
  | "needs_update"
  | "archived";

export type AssortmentStatus =
  | "active"
  | "order_only"
  | "candidate"
  | "excluded"
  | "archived";

export type ProductCondition =
  | "new"
  | "discounted"
  | "damaged"
  | "incomplete"
  | "shortage"
  | "unknown";

export type MatchStatus = "matched" | "probable" | "missing" | "conflict" | "ignored";

export type MatchMethod =
  | "exact_ean"
  | "exact_manufacturer_sku"
  | "exact_normalized_sku"
  | "brand_series_variant"
  | "probable_name_attributes"
  | "manual"
  | "none";

export type MarginStatus =
  | "healthy"
  | "below_target"
  | "below_minimum"
  | "negative"
  | "review_high_margin";

export type ImportType =
  | "supplier_stock"
  | "supplier_price"
  | "current_catalog"
  | "repricer"
  | "channel_listing";

export type ImportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "completed_with_errors"
  | "failed";

export type ImportRowStatus = "pending" | "imported" | "rejected" | "skipped_unchanged";

export type PriceType =
  | "regular"
  | "promotional"
  | "manual"
  | "repricer"
  | "recommended"
  | "minimum_allowed"
  | "maximum_allowed";

export type ListingStatus = "draft" | "active" | "inactive" | "archived";

export type ProductBrand = {
  id: string;
  name: string;
  normalized_name: string;
  created_at: string;
  updated_at: string;
};

export type ProductCategory = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  attribute_schema: Record<string, unknown>;
  required_attributes: string[];
  title_template: string | null;
  content_template: Record<string, unknown> | null;
  pricing_strategy_id: string | null;
  created_at: string;
  updated_at: string;
};

// Radiator-specific technical attributes extracted by
// lib/catalog/normalization/radiator.ts. Stored inside
// product_master.technical_attributes for the Royal Thermo pilot category;
// other categories will use different attribute shapes in the same jsonb
// column, so this type intentionally is not the column's exact type.
export type RadiatorAttributes = {
  connection_type: "C" | "VC" | null;
  radiator_type: "11" | "22" | "33" | null;
  height_mm: number | null;
  length_mm: number | null;
  depth_mm: number | null;
  color_ral: string | null;
  hygienic: boolean;
  panel_count: number | null;
};

export type ProductMaster = {
  id: string;
  internal_sku: string | null;
  manufacturer_sku: string | null;
  ean: string | null;
  name: string;
  normalized_name: string | null;
  brand_id: string | null;
  category_id: string | null;
  series: string | null;
  product_type: string | null;
  status: ProductWorkflowStatus;
  assortment_status: AssortmentStatus;
  technical_attributes: Record<string, unknown>;
  content_status: string;
  publication_readiness: string;
  unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SupplierOffer = {
  id: string;
  supplier_id: string;
  product_id: string | null;
  supplier_sku: string | null;
  supplier_name_raw: string | null;
  supplier_brand_raw: string | null;
  purchase_price: number | null;
  currency: string;
  stock_quantity: number | null;
  available_quantity: number | null;
  is_available: boolean;
  product_condition: ProductCondition;
  lead_time_days: number | null;
  is_order_only: boolean;
  source_import_id: string | null;
  raw_payload: Record<string, unknown> | null;
  source_updated_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogImport = {
  id: string;
  import_type: ImportType;
  source_name: string;
  supplier_id: string | null;
  file_name: string;
  file_hash: string;
  worksheet_name: string | null;
  status: ImportStatus;
  rows_total: number;
  rows_imported: number;
  rows_rejected: number;
  imported_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CatalogImportRow = {
  id: string;
  import_id: string;
  source_row_number: number;
  raw_payload: Record<string, unknown>;
  normalized_payload: Record<string, unknown> | null;
  import_status: ImportRowStatus;
  validation_errors: string[];
  created_at: string;
};

export type ProductMatch = {
  id: string;
  supplier_product_id: string;
  product_id: string | null;
  match_status: MatchStatus;
  confidence_score: number | null;
  match_method: MatchMethod;
  match_reasons: string[];
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ChannelListing = {
  id: string;
  product_id: string | null;
  sales_channel: string;
  external_listing_id: string | null;
  external_sku: string | null;
  title: string | null;
  listing_status: ListingStatus;
  current_sale_price: number | null;
  raw_payload: Record<string, unknown> | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PricingStrategy = {
  id: string;
  name: string;
  category_id: string | null;
  sales_channel: string | null;
  target_margin_percent: number;
  minimum_margin_percent: number;
  minimum_profit_amount: number | null;
  marketplace_commission_percent: number;
  default_logistics_cost: number;
  default_advertising_percent: number;
  other_variable_cost: number;
  rounding_rule: "none" | "nearest_10" | "nearest_100" | "nearest_1000" | "psychological_99";
  is_active: boolean;
  valid_from: string;
  valid_to: string | null;
};
