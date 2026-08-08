-- Market ürün kartı görseli; satış ekranındaki dokunmatik ürün vitrini için kullanılır.
alter table public.market_urunleri
  add column if not exists resim_url text;

comment on column public.market_urunleri.resim_url is
  'Küçültülmüş ürün görseli veri adresi veya HTTPS görsel bağlantısı';
