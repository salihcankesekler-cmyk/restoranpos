-- Market ürün düzenleme ve hızlı satış kısayolları
-- Mevcut ürünleri ve stokları değiştirmeden güvenle tekrar çalıştırılabilir.

alter table public.market_urunleri
  add column if not exists hizli_satis boolean not null default false;

create index if not exists market_urunleri_hizli_satis_idx
  on public.market_urunleri(restaurant_id, hizli_satis)
  where hizli_satis = true;
