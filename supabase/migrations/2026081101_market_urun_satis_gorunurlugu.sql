-- Market ürünlerinin dokunmatik satış ekranında ürün bazında gösterilip gizlenmesi.

begin;

alter table public.market_urunleri
  add column if not exists satis_ekraninda_goster boolean not null default true;

comment on column public.market_urunleri.satis_ekraninda_goster is
  'False olduğunda ürün dokunmatik satış kutularında görünmez; barkodla satışa devam eder.';

create index if not exists market_urunleri_satis_gorunurluk_idx
  on public.market_urunleri (restaurant_id, grup_id, satis_ekraninda_goster, sira)
  where aktif = true;

commit;
