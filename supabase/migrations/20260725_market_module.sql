-- Integra Market veri modeli
-- Politikalar Supabase Auth JWT içindeki app_metadata.restaurant_id değerini kullanır.

create extension if not exists pgcrypto;

alter table public.restaurants
  add column if not exists isletme_tipi text not null default 'Restoran'
  check (isletme_tipi in ('Restoran', 'Market', 'Karma'));

create table if not exists public.market_urunleri (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  barkod text not null,
  urun_adi text not null,
  stok_kodu text,
  kategori text not null default 'Genel',
  marka text,
  birim text not null default 'Adet',
  kdv_orani numeric(5,2) not null default 20,
  alis_fiyati numeric(14,2) not null default 0,
  satis_fiyati numeric(14,2) not null default 0,
  stok_miktari numeric(14,3) not null default 0,
  minimum_stok numeric(14,3) not null default 0,
  raf_konumu text,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, barkod)
);

create table if not exists public.market_alis_faturalari (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  tedarikci_adi text not null,
  fatura_no text,
  fatura_tarihi date not null default current_date,
  ara_toplam numeric(14,2) not null default 0,
  kdv_toplam numeric(14,2) not null default 0,
  genel_toplam numeric(14,2) not null default 0,
  durum text not null default 'Kaydedildi',
  created_at timestamptz not null default now()
);

create table if not exists public.market_alis_fatura_kalemleri (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  fatura_id uuid not null references public.market_alis_faturalari(id) on delete cascade,
  urun_id uuid not null references public.market_urunleri(id),
  barkod text not null,
  urun_adi text not null,
  miktar numeric(14,3) not null,
  birim_alis_fiyati numeric(14,2) not null,
  kdv_orani numeric(5,2) not null default 20,
  satir_toplami numeric(14,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.market_sayimlari (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  sayim_adi text not null,
  durum text not null default 'Açık',
  toplam_kalem integer not null default 0,
  farkli_kalem integer not null default 0,
  tamamlanma_tarihi timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.market_sayim_kalemleri (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  sayim_id uuid not null references public.market_sayimlari(id) on delete cascade,
  urun_id uuid not null references public.market_urunleri(id),
  sistem_miktari numeric(14,3) not null,
  sayilan_miktar numeric(14,3) not null,
  fark_miktari numeric(14,3) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.market_satislari (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  odeme_tipi text not null,
  toplam_tutar numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.market_satis_kalemleri (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  satis_id uuid not null references public.market_satislari(id) on delete cascade,
  urun_id uuid not null references public.market_urunleri(id),
  barkod text not null,
  urun_adi text not null,
  adet numeric(14,3) not null,
  birim_fiyat numeric(14,2) not null,
  toplam_tutar numeric(14,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists market_urunleri_restaurant_idx on public.market_urunleri(restaurant_id);
create index if not exists market_urunleri_barkod_idx on public.market_urunleri(restaurant_id, barkod);
create index if not exists market_faturalari_restaurant_idx on public.market_alis_faturalari(restaurant_id, fatura_tarihi desc);
create index if not exists market_sayimlari_restaurant_idx on public.market_sayimlari(restaurant_id, created_at desc);
create index if not exists market_satislari_restaurant_idx on public.market_satislari(restaurant_id, created_at desc);

alter table public.market_urunleri enable row level security;
alter table public.market_alis_faturalari enable row level security;
alter table public.market_alis_fatura_kalemleri enable row level security;
alter table public.market_sayimlari enable row level security;
alter table public.market_sayim_kalemleri enable row level security;
alter table public.market_satislari enable row level security;
alter table public.market_satis_kalemleri enable row level security;

do $$
declare tablo text;
begin
  foreach tablo in array array[
    'market_urunleri',
    'market_alis_faturalari',
    'market_alis_fatura_kalemleri',
    'market_sayimlari',
    'market_sayim_kalemleri',
    'market_satislari',
    'market_satis_kalemleri'
  ] loop
    begin
      execute format(
        'create policy %I on public.%I for all to authenticated using (restaurant_id::text = (auth.jwt() -> ''app_metadata'' ->> ''restaurant_id'')) with check (restaurant_id::text = (auth.jwt() -> ''app_metadata'' ->> ''restaurant_id''))',
        tablo || '_restaurant_policy', tablo
      );
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
