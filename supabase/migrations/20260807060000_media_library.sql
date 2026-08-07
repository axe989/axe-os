-- Media Library: reusable image/video assets, independent of any single
-- product. Consumed via media_sets (ordered collections) rather than being
-- owned directly by product_master/commercial_products/content variants --
-- see 20260807060200_media_inheritance_and_brand_codes.sql for how those
-- three levels reference (never duplicate) a media_sets row.

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  media_type text not null default 'image' check (media_type in (
    'image', 'video', 'document'
  )),
  checksum text,
  alt_text text,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create index if not exists media_assets_checksum_idx
  on public.media_assets(checksum);

create table if not exists public.media_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Join table: one media asset can appear in many sets (reuse), one set
-- holds many assets in a defined role/order (primary image, gallery,
-- infographic -- matches Kaspi's image_code folder + ordered gallery
-- convention, generalizes to other channels' equivalents).
create table if not exists public.media_set_items (
  id uuid primary key default gen_random_uuid(),
  media_set_id uuid not null references public.media_sets(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id),
  role text not null default 'gallery' check (role in (
    'primary_image', 'gallery', 'infographic'
  )),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists media_set_items_media_set_id_idx
  on public.media_set_items(media_set_id, role, sort_order);

create index if not exists media_set_items_media_asset_id_idx
  on public.media_set_items(media_asset_id);

-- At most one primary image per set -- Kaspi and every other channel we
-- know of expect exactly one "main photo".
create unique index if not exists media_set_items_one_primary_per_set_uidx
  on public.media_set_items(media_set_id)
  where role = 'primary_image';
