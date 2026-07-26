-- Integra Market: bekleyen sepet ve fiyat değişikliği etiket kuyruğu
-- Supabase SQL Editor içinde önceki market SQL dosyalarından sonra bir kez çalıştırın.
-- Dosya tekrar çalıştırılabilir.

create extension if not exists pgcrypto;

create table if not exists public.market_bekleyen_sepetler (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  sepet_adi text not null,
  cari_id text,
  cari_adi text,
  kalemler jsonb not null default '[]'::jsonb,
  genel_indirim jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists market_bekleyen_sepetler_restaurant_idx
  on public.market_bekleyen_sepetler(restaurant_id, updated_at desc);

create table if not exists public.market_etiket_kuyrugu (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  urun_id uuid not null references public.market_urunleri(id) on delete cascade,
  eski_fiyat numeric(14,2) not null default 0,
  yeni_fiyat numeric(14,2) not null default 0,
  durum text not null default 'Bekliyor' check (durum in ('Bekliyor', 'Basildi')),
  kaynak_fiyat_gecmisi_id uuid references public.market_fiyat_gecmisi(id) on delete set null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  basim_tarihi timestamptz
);

create index if not exists market_etiket_kuyrugu_bekleyen_idx
  on public.market_etiket_kuyrugu(restaurant_id, durum, created_at desc);

create unique index if not exists market_etiket_kuyrugu_kaynak_unique
  on public.market_etiket_kuyrugu(kaynak_fiyat_gecmisi_id)
  where kaynak_fiyat_gecmisi_id is not null;

create or replace function public.market_bekleyen_sepet_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists market_bekleyen_sepet_updated_at_trigger on public.market_bekleyen_sepetler;
create trigger market_bekleyen_sepet_updated_at_trigger
before update on public.market_bekleyen_sepetler
for each row execute function public.market_bekleyen_sepet_updated_at();

create or replace function public.market_fiyat_gecmisinden_etiket_kuyrugu()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.eski_satis_fiyati is distinct from new.yeni_satis_fiyati then
    insert into public.market_etiket_kuyrugu (
      restaurant_id, urun_id, eski_fiyat, yeni_fiyat,
      kaynak_fiyat_gecmisi_id, created_by
    ) values (
      new.restaurant_id, new.urun_id, new.eski_satis_fiyati, new.yeni_satis_fiyati,
      new.id, new.created_by
    )
    on conflict (kaynak_fiyat_gecmisi_id) where kaynak_fiyat_gecmisi_id is not null do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists market_fiyat_gecmisinden_etiket_kuyrugu_trigger on public.market_fiyat_gecmisi;
create trigger market_fiyat_gecmisinden_etiket_kuyrugu_trigger
after insert on public.market_fiyat_gecmisi
for each row execute function public.market_fiyat_gecmisinden_etiket_kuyrugu();

alter table public.market_bekleyen_sepetler enable row level security;
alter table public.market_etiket_kuyrugu enable row level security;

drop policy if exists market_bekleyen_sepetler_restaurant_policy on public.market_bekleyen_sepetler;
drop policy if exists market_bekleyen_sepetler_email_restaurant_policy on public.market_bekleyen_sepetler;
create policy market_bekleyen_sepetler_email_restaurant_policy
  on public.market_bekleyen_sepetler
  for all
  to authenticated
  using (restaurant_id = (select private.integra_restaurant_id()))
  with check (restaurant_id = (select private.integra_restaurant_id()));

drop policy if exists market_etiket_kuyrugu_restaurant_policy on public.market_etiket_kuyrugu;
drop policy if exists market_etiket_kuyrugu_email_restaurant_policy on public.market_etiket_kuyrugu;
create policy market_etiket_kuyrugu_email_restaurant_policy
  on public.market_etiket_kuyrugu
  for all
  to authenticated
  using (restaurant_id = (select private.integra_restaurant_id()))
  with check (restaurant_id = (select private.integra_restaurant_id()));

grant select, insert, update, delete on table public.market_bekleyen_sepetler to authenticated;
grant select, insert, update, delete on table public.market_etiket_kuyrugu to authenticated;

