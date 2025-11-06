-- Royal palette and watermark settings
alter table if exists public.branding_settings
  add column if not exists royal_gold text default '#d4af37',
  add column if not exists royal_bg_tint text default '#fffaf0',
  add column if not exists watermark_enabled boolean not null default false,
  add column if not exists watermark_opacity numeric not null default 0.08,
  add column if not exists watermark_use_logo boolean not null default true,
  add column if not exists watermark_use_stamp boolean not null default false;

update public.branding_settings
set
  royal_gold = coalesce(royal_gold, '#d4af37'),
  royal_bg_tint = coalesce(royal_bg_tint, '#fffaf0'),
  watermark_enabled = coalesce(watermark_enabled, false),
  watermark_opacity = coalesce(watermark_opacity, 0.08),
  watermark_use_logo = coalesce(watermark_use_logo, true),
  watermark_use_stamp = coalesce(watermark_use_stamp, false)
where id = 1;
