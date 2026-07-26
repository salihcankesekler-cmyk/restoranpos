-- Market gruplarına varsayılan KDV oranı ekler.
-- Supabase SQL Editor içinde bir kez çalıştırılabilir; tekrar çalıştırılması güvenlidir.

alter table public.market_gruplari
  add column if not exists kdv_orani numeric not null default 20;

alter table public.market_gruplari
  drop constraint if exists market_gruplari_kdv_orani_check;

alter table public.market_gruplari
  add constraint market_gruplari_kdv_orani_check
  check (kdv_orani in (0, 1, 10, 20));

comment on column public.market_gruplari.kdv_orani is
  'Bu grupta açılan yeni ürünlere otomatik aktarılan varsayılan KDV oranı.';
