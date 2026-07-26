begin;

alter table public.market_gruplari
  add column if not exists grup_rengi text not null default '#c2410c',
  add column if not exists urun_rengi text not null default '#0f172a';

update public.market_gruplari
set grup_rengi = '#c2410c'
where grup_rengi is null
   or grup_rengi !~ '^#[0-9A-Fa-f]{6}$';

update public.market_gruplari
set urun_rengi = '#0f172a'
where urun_rengi is null
   or urun_rengi !~ '^#[0-9A-Fa-f]{6}$';

notify pgrst, 'reload schema';

commit;
