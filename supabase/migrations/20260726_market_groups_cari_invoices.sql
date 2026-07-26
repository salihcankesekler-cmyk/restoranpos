-- Market grup yönetimi, cari bağlantısı ve düzenlenebilir alış faturaları.
-- Mevcut ürün ve faturaları silmeden güvenle tekrar çalıştırılabilir.

create extension if not exists pgcrypto;

create table if not exists public.market_gruplari (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  grup_adi text not null,
  satis_ekraninda_goster boolean not null default true,
  sira integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists market_gruplari_restaurant_ad_unique
  on public.market_gruplari(restaurant_id, lower(trim(grup_adi)));

create index if not exists market_gruplari_restaurant_sira_idx
  on public.market_gruplari(restaurant_id, sira, grup_adi);

alter table public.market_urunleri
  add column if not exists grup_id uuid;

alter table public.market_alis_faturalari
  add column if not exists cari_id text;

alter table public.market_satislari
  add column if not exists cari_id text,
  add column if not exists cari_adi text;

insert into public.market_gruplari (restaurant_id, grup_adi, satis_ekraninda_goster, sira)
select kaynak.restaurant_id, kaynak.grup_adi, true, kaynak.sira
from (
  select distinct on (
    u.restaurant_id,
    lower(coalesce(nullif(trim(u.kategori), ''), 'Genel'))
  )
    u.restaurant_id,
    coalesce(nullif(trim(u.kategori), ''), 'Genel') as grup_adi,
    row_number() over (partition by u.restaurant_id order by coalesce(nullif(trim(u.kategori), ''), 'Genel'))::integer as sira
  from public.market_urunleri u
  order by
    u.restaurant_id,
    lower(coalesce(nullif(trim(u.kategori), ''), 'Genel')),
    coalesce(nullif(trim(u.kategori), ''), 'Genel')
) kaynak
where not exists (
  select 1
  from public.market_gruplari g
  where g.restaurant_id = kaynak.restaurant_id
    and lower(trim(g.grup_adi)) = lower(trim(kaynak.grup_adi))
);

update public.market_urunleri u
set grup_id = g.id,
    kategori = g.grup_adi
from public.market_gruplari g
where u.grup_id is null
  and g.restaurant_id = u.restaurant_id
  and lower(trim(g.grup_adi)) = lower(coalesce(nullif(trim(u.kategori), ''), 'Genel'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'market_urunleri_grup_id_fkey'
      and conrelid = 'public.market_urunleri'::regclass
  ) then
    alter table public.market_urunleri
      add constraint market_urunleri_grup_id_fkey
      foreign key (grup_id) references public.market_gruplari(id);
  end if;

  if not exists (select 1 from public.market_urunleri where grup_id is null) then
    alter table public.market_urunleri alter column grup_id set not null;
  end if;
end $$;

create index if not exists market_urunleri_grup_idx
  on public.market_urunleri(restaurant_id, grup_id);

alter table public.market_gruplari enable row level security;

grant select, insert, update, delete on table public.market_gruplari to authenticated;

drop policy if exists market_gruplari_restaurant_policy on public.market_gruplari;
drop policy if exists market_gruplari_auth_restaurant_policy on public.market_gruplari;
drop policy if exists market_gruplari_email_restaurant_policy on public.market_gruplari;

create policy market_gruplari_email_restaurant_policy
  on public.market_gruplari
  for all
  to authenticated
  using (restaurant_id = (select private.integra_restaurant_id()))
  with check (restaurant_id = (select private.integra_restaurant_id()));
