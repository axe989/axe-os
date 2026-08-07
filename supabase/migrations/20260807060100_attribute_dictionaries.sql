-- Attribute dictionaries: separate canonical internal code, human-readable
-- display label, and per-channel translated value. Replaces hardcoded
-- enums for controlled dimensions (material, connection, color, ...) so
-- adding a new marketplace (WB, Ozon) is a data change, not a code change.
--
-- Example (see architecture proposal):
--   dictionary: connection
--   value:      connection.bottom  ("Нижнее подключение")
--   kaspi translation: "нижнее"
--
-- product_master.technical_attributes / commercial_products.bundle_components
-- store the canonical code (dictionary_code + "." + value_code) only.
-- Translation to a specific channel's expected string happens at
-- publish/preview time via attribute_channel_translations.

create table if not exists public.attribute_dictionaries (
  dictionary_code text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.attribute_dictionary_values (
  id uuid primary key default gen_random_uuid(),
  dictionary_code text not null references public.attribute_dictionaries(dictionary_code),
  value_code text not null,
  display_label text not null,
  created_at timestamptz not null default now(),
  unique (dictionary_code, value_code)
);

create index if not exists attribute_dictionary_values_dictionary_code_idx
  on public.attribute_dictionary_values(dictionary_code);

-- category_id is nullable: most translations are channel-wide (a color
-- name means the same thing regardless of category), but some attributes
-- (e.g. "type" for heating radiators) are category-specific Kaspi
-- vocabulary and need a category-scoped override.
create table if not exists public.attribute_channel_translations (
  id uuid primary key default gen_random_uuid(),
  attribute_dictionary_value_id uuid not null references public.attribute_dictionary_values(id) on delete cascade,
  sales_channel text not null,
  category_id uuid references public.product_categories(id),
  translated_value text not null,
  translated_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists attribute_channel_translations_value_channel_category_uidx
  on public.attribute_channel_translations(
    attribute_dictionary_value_id, sales_channel, coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists attribute_channel_translations_sales_channel_idx
  on public.attribute_channel_translations(sales_channel);
