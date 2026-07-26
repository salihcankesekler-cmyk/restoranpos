-- Market cari kaydı için RLS düzeltmesi ve rapor sorgu indeksleri.
-- Güvenle tekrar çalıştırılabilir.

alter table public.cari_musteriler enable row level security;

grant select, insert, update, delete
  on table public.cari_musteriler
  to authenticated;

do $$
declare
  politika record;
begin
  for politika in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cari_musteriler'
  loop
    execute format(
      'drop policy if exists %I on public.cari_musteriler',
      politika.policyname
    );
  end loop;
end $$;

create policy cari_musteriler_email_restaurant_policy
  on public.cari_musteriler
  for all
  to authenticated
  using (restaurant_id = (select private.integra_restaurant_id()))
  with check (restaurant_id = (select private.integra_restaurant_id()));

create index if not exists market_satislari_rapor_idx
  on public.market_satislari(restaurant_id, created_at desc, odeme_tipi);

create index if not exists market_satis_kalemleri_rapor_idx
  on public.market_satis_kalemleri(restaurant_id, satis_id, urun_id);
