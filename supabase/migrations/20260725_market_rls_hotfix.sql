-- Integra Market RLS hotfix
-- Önceki iki market migration'ı çalışmış olsa da olmasa da tekrar uygulanabilir.
-- Auth kullanıcısını önce auth_user_id, yoksa doğrulanmış JWT e-postasıyla işletmeye bağlar.

alter table public.restaurants
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists restaurants_auth_user_id_unique
  on public.restaurants(auth_user_id)
  where auth_user_id is not null;

create schema if not exists private;

create or replace function private.integra_restaurant_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(r.parent_restaurant_id, r.id)
  from public.restaurants r
  where r.durum = 'Aktif'
    and (
      r.auth_user_id = (select auth.uid())
      or (
        nullif((select auth.jwt() ->> 'email'), '') is not null
        and lower(trim(r.email)) = lower(trim((select auth.jwt() ->> 'email')))
      )
    )
  order by case when r.auth_user_id = (select auth.uid()) then 0 else 1 end
  limit 1
$$;

revoke all on function private.integra_restaurant_id() from public;
grant usage on schema private to authenticated;
grant execute on function private.integra_restaurant_id() to authenticated;

grant select, insert, update, delete on table
  public.market_urunleri,
  public.market_alis_faturalari,
  public.market_alis_fatura_kalemleri,
  public.market_sayimlari,
  public.market_sayim_kalemleri,
  public.market_satislari,
  public.market_satis_kalemleri
to authenticated;

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
    execute format('drop policy if exists %I on public.%I', tablo || '_restaurant_policy', tablo);
    execute format('drop policy if exists %I on public.%I', tablo || '_auth_restaurant_policy', tablo);
    execute format('drop policy if exists %I on public.%I', tablo || '_email_restaurant_policy', tablo);
    execute format(
      'create policy %I on public.%I for all to authenticated using (restaurant_id = (select private.integra_restaurant_id())) with check (restaurant_id = (select private.integra_restaurant_id()))',
      tablo || '_email_restaurant_policy',
      tablo
    );
  end loop;
end $$;
