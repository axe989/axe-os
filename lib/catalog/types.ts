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
  | "needs_images"
  | "needs_price"
  | "review"
  | "approved"
  | "ready_to_publish"
  | "published"
  | "needs_update"
  | "optimization"
  | "archived";

export type AssortmentStatus =
  | "active"
  | "order_only"
  | "candidate"
  | "excluded"
  | "archived";

// Product Center v2.0 Opportunity Queue: the explicit decision recorded
// on a supplier_offers row before (or instead of) a Base Product ever
// gets created. Distinct from AssortmentStatus, which describes a
// Commercial Product that already exists -- this describes whether one
// should exist at all yet.
export type AssortmentDecision = "pending" | "accepted" | "rejected" | "ignored" | "postponed";

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

export type PublicationMode =
  | "create_new_listing"
  | "join_existing_listing"
  | "update_existing_listing";

export type PublicationStatus =
  | "draft"
  | "content_incomplete"
  | "needs_review"
  | "ready_for_export"
  | "exported"
  | "uploaded"
  | "published"
  | "publication_error"
  | "archived";

export type PublicationEventType =
  | "status_change"
  | "export"
  | "upload_confirmed"
  | "reconciliation_match"
  | "reconciliation_ambiguous"
  | "validation_failed";

export type MediaRole = "primary_image" | "gallery" | "infographic";

export type ProductBrand = {
  id: string;
  name: string;
  normalized_name: string;
  short_code: string | null;
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
  required_document_types: string[];
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

// Objective manufacturer facts only. status/assortment_status/
// content_status/publication_readiness used to live here but moved to
// CommercialProduct (see architecture review, 2026-08-07) -- a Master
// Product describes what the item IS, never whether/how AXE sells it.
// The DB columns still physically exist (deprecated, not dropped) but
// this type intentionally omits them so new code can't read/write them.
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
  technical_attributes: Record<string, unknown>;
  default_media_set_id: string | null;
  unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// Level 2: what AXE actually sells -- one Master Product may produce many
// Commercial Products (e.g. "without installation" / "with WiFi module").
export type CommercialProduct = {
  id: string;
  master_product_id: string;
  commercial_name: string;
  bundle_code: string | null;
  bundle_components: BundleComponent[];
  status: ProductWorkflowStatus;
  assortment_status: AssortmentStatus;
  content_status: string;
  publication_readiness: string;
  pricing_strategy_id: string | null;
  preferred_supplier_id: string | null;
  media_set_id: string | null;
  created_at: string;
  updated_at: string;
};

// One line of a Commercial Product's bundle definition. dictionary_value_id
// points into attribute_dictionary_values for dictionary_code='equipment'
// (base radiator / bracket kit / connection kit / air vent valve / ...).
// Equipment is never hand-typed on a publication item -- it is always
// derived from this list at preview/export time (see
// lib/catalog/publication/resolve-equipment.ts).
export type BundleComponent = {
  dictionary_value_id: string;
  quantity: number;
  source_supplier_offer_id?: string | null;
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
  assortment_decision: AssortmentDecision;
  assortment_decision_reason: string | null;
  assortment_decision_by: string | null;
  assortment_decision_at: string | null;
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

// Level 1 -> Level 1 matching: supplier_offers -> product_master.
// Supplier price lists remain the source of truth for Master Products;
// this is unchanged by the four-level model.
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

// Level 3: how a Commercial Product is presented on a given marketplace.
// Many listings may reference the same Commercial Product (different
// title/photos/SEO/price/publication status per listing). Renamed from
// ChannelListing (table renamed channel_listings -> marketplace_listings,
// 2026-08-07) now that Kaspi XML is understood to be a listing source,
// never a master-catalog source.
export type MarketplaceListing = {
  id: string;
  commercial_product_id: string | null;
  listing_strategy_id: string | null;
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

// Level 3 -> Level 2 matching: marketplace_listings -> commercial_products
// (Kaspi XML -> Marketplace Listing -> Matching Engine -> Commercial
// Product -> Master Product). Structurally identical to ProductMatch,
// kept as a separate table/type since the candidate pools differ.
export type ListingMatch = {
  id: string;
  marketplace_listing_id: string;
  commercial_product_id: string | null;
  match_status: MatchStatus;
  confidence_score: number | null;
  match_method: MatchMethod;
  match_reasons: string[];
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

// Level 4: a grouping of marketplace listings by purpose (primary/
// alternative/premium/seasonal/experiment/...). `purpose` is free text
// with suggested values rather than a hard enum -- the business invents
// new experiment types faster than migrations can track them.
export type ListingStrategy = {
  id: string;
  name: string;
  purpose: string | null;
  priority: number | null;
  is_ab_test: boolean;
  expected_audience: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// Performance is a measured fact over time, not configuration -- an
// append-only snapshot, same rationale as price/cost history elsewhere.
export type ListingStrategyPerformanceSnapshot = {
  id: string;
  listing_strategy_id: string;
  snapshot_date: string;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  orders_count: number | null;
  revenue: number | null;
  conversion_rate: number | null;
  recorded_at: string;
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

// --- Media Library -----------------------------------------------------
// Reusable image/video assets, independent of any single product. Never
// owned directly by product_master/commercial_products/content variants --
// those reference a media_sets row (or inherit one, see MediaResolution
// below), never duplicate the underlying asset.

export type MediaAsset = {
  id: string;
  storage_path: string;
  media_type: "image" | "video" | "document";
  checksum: string | null;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

export type MediaSet = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type MediaSetItem = {
  id: string;
  media_set_id: string;
  media_asset_id: string;
  role: MediaRole;
  sort_order: number;
  created_at: string;
};

// --- Attribute dictionaries ---------------------------------------------
// Canonical internal code + human-readable display label, kept separate
// from any channel's translated value. product_master.technical_attributes
// and CommercialProduct.bundle_components store only the canonical code
// (`${dictionary_code}.${value_code}`); translation happens per-channel
// at publish/preview time.

export type AttributeDictionary = {
  dictionary_code: string;
  name: string;
  created_at: string;
};

export type AttributeDictionaryValue = {
  id: string;
  dictionary_code: string;
  value_code: string;
  display_label: string;
  created_at: string;
};

export type AttributeChannelTranslation = {
  id: string;
  attribute_dictionary_value_id: string;
  sales_channel: string;
  category_id: string | null;
  translated_value: string;
  translated_label: string | null;
  created_at: string;
  updated_at: string;
};

// --- Kaspi Publication Pipeline -----------------------------------------

// Level: how a Commercial Product is presented to a channel/positioning
// angle. Many variants may reference the same Commercial Product;
// sales_channel is nullable (a channel-agnostic variant is reused by any
// channel that doesn't need its own override).
export type MarketplaceContentVariant = {
  id: string;
  commercial_product_id: string;
  sales_channel: string | null;
  title: string;
  description: string | null;
  media_set_id: string | null;
  seo_strategy: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketplacePublicationBatch = {
  id: string;
  sales_channel: string;
  adapter: string;
  template_version: string | null;
  file_name: string | null;
  file_hash: string | null;
  row_count: number;
  exported_by: string | null;
  exported_at: string | null;
  created_at: string;
};

// Immutable, written exactly once at export time -- see
// lib/catalog/publication/build-export-snapshot.ts. Historical exports
// stay reproducible even after the product/pricing/content/media change.
export type PublicationExportSnapshot = {
  schema_version: 1;
  captured_at: string;
  commercial_product: { id: string; commercial_name: string; bundle_code: string | null };
  content_variant: { id: string; sales_channel: string | null; title: string; description: string | null };
  merchant_sku: string;
  attributes: Array<{
    dictionary_code: string;
    value_code: string;
    display_label: string;
    translated_value: string;
  }>;
  equipment: Array<{
    value_code: string;
    display_label: string;
    translated_value: string;
    quantity: number;
  }>;
  media: {
    resolved_from: "content_variant" | "commercial_product" | "master_product";
    media_set_id: string;
    items: Array<{
      media_asset_id: string;
      role: MediaRole;
      sort_order: number;
      storage_path: string;
      checksum: string | null;
    }>;
  } | null;
  adapter: string;
  template_version: string | null;
  exported_row: Record<string, string>;
};

export type MarketplacePublicationItem = {
  id: string;
  batch_id: string | null;
  commercial_product_id: string;
  content_variant_id: string;
  marketplace_listing_id: string | null;
  sales_channel: string;
  publication_mode: PublicationMode;
  seller_sku: string | null;
  status: PublicationStatus;
  validation_errors: string[];
  export_snapshot: PublicationExportSnapshot | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MarketplacePublicationEvent = {
  id: string;
  publication_item_id: string;
  event_type: PublicationEventType;
  from_status: string | null;
  to_status: string | null;
  payload: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

// --- Product Readiness Engine --------------------------------------------
// Channel-agnostic "how close is this Commercial Product to being
// publishable anywhere" view, computed on demand (never persisted) on top
// of the same dictionaries/media-inheritance/bundle logic the Kaspi
// validation engine uses -- see lib/catalog/readiness/. Supersedes the
// dead commercial_products.content_status/publication_readiness columns,
// which were never actually computed by any code path.

export type ProductDocument = {
  id: string;
  commercial_product_id: string;
  document_type: string;
  status: "required" | "uploaded" | "verified" | "not_applicable";
  file_reference: string | null;
  uploaded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ReadinessDimensionKey =
  | "supplier"
  | "pricing"
  | "media"
  | "technical_specs"
  | "content"
  | "marketplace_attributes"
  | "seo"
  | "bundle"
  | "documentation";

// Which internal team actually owns closing this gap -- the whole point
// is that a business user reading this never sees a validation code, they
// see who to go ask.
export type ResponsibleTeam =
  | "procurement"
  | "pricing"
  | "photography"
  | "catalog"
  | "content"
  | "marketing"
  | "merchandising"
  | "compliance";

export type ReadinessIssue = {
  message: string;
  team: ResponsibleTeam;
  severity: "blocking" | "recommended";
};

export type ReadinessDimensionStatus = "complete" | "partial" | "missing";

export type ReadinessDimensionResult = {
  dimension: ReadinessDimensionKey;
  score: number;
  status: ReadinessDimensionStatus;
  issues: ReadinessIssue[];
};

export type ReadinessLabel =
  | "ready_for_publication"
  | "needs_content"
  | "needs_images"
  | "needs_technical_data"
  | "needs_pricing"
  | "needs_supplier"
  | "needs_marketplace_attributes"
  | "needs_seo"
  | "needs_bundle"
  | "needs_documentation"
  | "draft";

export type ProductReadiness = {
  overallScore: number;
  label: ReadinessLabel;
  dimensions: ReadinessDimensionResult[];
  blockingIssueCount: number;
};
