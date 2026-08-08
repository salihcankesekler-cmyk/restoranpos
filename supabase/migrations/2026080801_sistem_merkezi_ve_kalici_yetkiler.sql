-- Integra sistem merkezi, kalici personel detay yetkileri ve gun sonu kilitleri.
-- Tarayici localStorage verisini tek kaynak olmaktan cikarir.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;

alter table public.personeller
  add column if not exists detay_yetkileri jsonb not null default '[]'::jsonb,
  add column if not exists detay_yetkileri_ayarlandi boolean not null default false;

update public.personeller
set detay_yetkileri = '[]'::jsonb
where detay_yetkileri is null
   or jsonb_typeof(detay_yetkileri) <> 'array';

create or replace function public.integra_oturum_profili()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sonuc jsonb;
begin
  select (to_jsonb(r) - 'password') || jsonb_build_object(
    'hesap_tipi', 'owner'
  )
  into v_sonuc
  from public.restaurants r
  where r.auth_user_id = (select auth.uid())
    and coalesce(r.rol, 'owner') = 'owner'
  limit 1;

  if v_sonuc is not null then
    return v_sonuc;
  end if;

  select jsonb_build_object(
    'id', p.id,
    'email', p.email,
    'name', p.ad,
    'restaurant_name', coalesce(r.restaurant_name, r.name),
    'waiter_name', p.ad,
    'durum', case
      when p.durum = 'Aktif' and r.durum = 'Aktif' then 'Aktif'
      else coalesce(nullif(p.durum, 'Aktif'), r.durum, 'Pasif')
    end,
    'rol', 'waiter',
    'role', 'waiter',
    'parent_restaurant_id', r.id,
    'personel_id', p.id,
    'personel_gorev', coalesce(p.gorev, 'Garson'),
    'gorev', coalesce(p.gorev, 'Garson'),
    'tab_yetkileri', coalesce(p.tab_yetkileri, '[]'::jsonb),
    'detay_yetkileri', coalesce(p.detay_yetkileri, '[]'::jsonb),
    'detay_yetkileri_ayarlandi', coalesce(p.detay_yetkileri_ayarlandi, false),
    'aktif_sekmeler', coalesce(r.aktif_sekmeler, '[]'::jsonb),
    'modul_paketi', coalesce(r.modul_paketi, r.paket_adi, r.basvuru_paketi, 'Premium'),
    'paket_adi', coalesce(r.paket_adi, r.basvuru_paketi, 'Premium'),
    'basvuru_paketi', coalesce(r.basvuru_paketi, r.paket_adi, 'Premium'),
    'kullanici_limiti', coalesce(r.kullanici_limiti, 3),
    'hesap_tipi', 'personel'
  )
  into v_sonuc
  from public.personeller p
  join public.restaurants r
    on r.id = p.restaurant_id
   and coalesce(r.rol, 'owner') = 'owner'
  where p.auth_user_id = (select auth.uid())
  limit 1;

  return v_sonuc;
end;
$$;

revoke all on function public.integra_oturum_profili() from public, anon;
grant execute on function public.integra_oturum_profili() to authenticated, service_role;

create table if not exists public.sistem_olaylari (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  seviye text not null default 'error'
    check (seviye in ('info', 'warning', 'error', 'critical')),
  kaynak text not null default 'uygulama',
  islem text,
  mesaj text not null,
  hata_kodu text,
  ekran text,
  detay jsonb not null default '{}'::jsonb,
  kullanici_id uuid default auth.uid(),
  kullanici_email text,
  cozuldu boolean not null default false,
  cozulme_notu text,
  cozen_kullanici uuid,
  cozulme_tarihi timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sistem_olaylari_restaurant_idx
  on public.sistem_olaylari (restaurant_id, cozuldu, created_at desc);

create table if not exists public.gun_sonu_kilitleri (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  tarih date not null,
  kilitli boolean not null default true,
  kilitleyen_kullanici uuid default auth.uid(),
  kilitlenme_tarihi timestamptz,
  kilit_acilma_tarihi timestamptz,
  aciklama text,
  updated_at timestamptz not null default now(),
  unique (restaurant_id, tarih)
);

create index if not exists gun_sonu_kilitleri_restaurant_idx
  on public.gun_sonu_kilitleri (restaurant_id, tarih desc);

alter table public.sistem_olaylari enable row level security;
alter table public.gun_sonu_kilitleri enable row level security;
alter table public.islem_loglari enable row level security;

revoke all on table public.sistem_olaylari from public, anon, authenticated;
revoke all on table public.gun_sonu_kilitleri from public, anon, authenticated;
revoke all on table public.islem_loglari from public, anon, authenticated;

grant select on table public.sistem_olaylari to authenticated;
grant select on table public.gun_sonu_kilitleri to authenticated;
grant select on table public.islem_loglari to authenticated;
grant all on table public.sistem_olaylari to service_role;
grant all on table public.gun_sonu_kilitleri to service_role;
grant all on table public.islem_loglari to service_role;

drop policy if exists sistem_olaylari_select_authenticated on public.sistem_olaylari;
create policy sistem_olaylari_select_authenticated
on public.sistem_olaylari
for select
to authenticated
using (
  restaurant_id = (select private.integra_restaurant_id())
  and private.integra_sekme_yetkisi_var(
    restaurant_id,
    'sistem_durumu,guclendirme,ayarlar,raporlar'
  )
);

drop policy if exists gun_sonu_kilitleri_select_authenticated on public.gun_sonu_kilitleri;
create policy gun_sonu_kilitleri_select_authenticated
on public.gun_sonu_kilitleri
for select
to authenticated
using (
  restaurant_id = (select private.integra_restaurant_id())
);

drop policy if exists islem_loglari_select_authenticated on public.islem_loglari;
create policy islem_loglari_select_authenticated
on public.islem_loglari
for select
to authenticated
using (
  restaurant_id = (select private.integra_restaurant_id())
  and private.integra_sekme_yetkisi_var(
    restaurant_id,
    'sistem_durumu,guclendirme,ayarlar,raporlar'
  )
);

-- Eski audit/log tablolarindaki tum isletmeleri gosteren politikalari kapatir.
drop policy if exists app_audit_logs_insert_public on public.app_audit_logs;
drop policy if exists app_audit_logs_select_authenticated on public.app_audit_logs;
alter table public.app_audit_logs enable row level security;
revoke all on table public.app_audit_logs from public, anon, authenticated;
grant select on table public.app_audit_logs to authenticated;
grant all on table public.app_audit_logs to service_role;

drop policy if exists app_audit_logs_select_tenant on public.app_audit_logs;
create policy app_audit_logs_select_tenant
on public.app_audit_logs
for select
to authenticated
using (
  restaurant_id = (select private.integra_restaurant_id())
  and private.integra_sekme_yetkisi_var(
    restaurant_id,
    'sistem_durumu,guclendirme,ayarlar,raporlar'
  )
);

drop policy if exists uygulama_loglari_insert_anon on public.uygulama_loglari;
drop policy if exists uygulama_loglari_select_anon on public.uygulama_loglari;
alter table public.uygulama_loglari enable row level security;
revoke all on table public.uygulama_loglari from public, anon, authenticated;
grant all on table public.uygulama_loglari to service_role;

create or replace function public.sistem_olayi_kaydet(
  p_restaurant_id bigint,
  p_seviye text,
  p_kaynak text,
  p_islem text,
  p_mesaj text,
  p_hata_kodu text default null,
  p_ekran text default null,
  p_detay jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_restaurant_id bigint := coalesce(p_restaurant_id, private.integra_restaurant_id());
  v_id uuid;
  v_seviye text := lower(coalesce(nullif(trim(p_seviye), ''), 'error'));
begin
  if v_restaurant_id is null
     or v_restaurant_id <> private.integra_restaurant_id() then
    raise exception 'Sistem olayi icin isletme yetkisi bulunamadi.';
  end if;

  if v_seviye not in ('info', 'warning', 'error', 'critical') then
    v_seviye := 'error';
  end if;

  if nullif(trim(p_mesaj), '') is null then
    raise exception 'Sistem olayi mesaji zorunludur.';
  end if;

  insert into public.sistem_olaylari (
    restaurant_id,
    seviye,
    kaynak,
    islem,
    mesaj,
    hata_kodu,
    ekran,
    detay,
    kullanici_id,
    kullanici_email
  ) values (
    v_restaurant_id,
    v_seviye,
    left(coalesce(nullif(trim(p_kaynak), ''), 'uygulama'), 100),
    nullif(left(trim(p_islem), 150), ''),
    left(trim(p_mesaj), 2000),
    nullif(left(trim(p_hata_kodu), 100), ''),
    nullif(left(trim(p_ekran), 100), ''),
    coalesce(p_detay, '{}'::jsonb),
    auth.uid(),
    nullif(left(coalesce(auth.jwt() ->> 'email', ''), 250), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.sistem_islem_kaydi_ekle(
  p_restaurant_id bigint,
  p_islem_tipi text,
  p_ekran text,
  p_hedef_tablo text,
  p_hedef_id text,
  p_aciklama text,
  p_onceki_veri jsonb default null,
  p_yeni_veri jsonb default null
)
returns bigint
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_restaurant_id bigint := coalesce(p_restaurant_id, private.integra_restaurant_id());
  v_id bigint;
begin
  if v_restaurant_id is null
     or v_restaurant_id <> private.integra_restaurant_id() then
    raise exception 'Islem kaydi icin isletme yetkisi bulunamadi.';
  end if;

  if nullif(trim(p_islem_tipi), '') is null then
    raise exception 'Islem tipi zorunludur.';
  end if;

  insert into public.islem_loglari (
    restaurant_id,
    user_id,
    user_name,
    user_role,
    islem_tipi,
    ekran,
    hedef_tablo,
    hedef_id,
    aciklama,
    onceki_veri,
    yeni_veri,
    created_at
  ) values (
    v_restaurant_id,
    auth.uid()::text,
    coalesce(auth.jwt() ->> 'email', 'Kullanici'),
    coalesce(auth.jwt() -> 'user_metadata' ->> 'integra_hesap_tipi', 'authenticated'),
    left(trim(p_islem_tipi), 150),
    nullif(left(trim(p_ekran), 100), ''),
    nullif(left(trim(p_hedef_tablo), 100), ''),
    nullif(left(trim(p_hedef_id), 150), ''),
    nullif(left(trim(p_aciklama), 2000), ''),
    p_onceki_veri,
    p_yeni_veri,
    now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.sistem_olayini_coz(
  p_restaurant_id bigint,
  p_olay_id uuid,
  p_not text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not private.integra_sekme_yetkisi_var(
    p_restaurant_id,
    'sistem_durumu,guclendirme,ayarlar'
  ) then
    raise exception 'Sistem olayini kapatma yetkiniz yok.';
  end if;

  update public.sistem_olaylari
  set cozuldu = true,
      cozulme_notu = nullif(left(trim(p_not), 1000), ''),
      cozen_kullanici = auth.uid(),
      cozulme_tarihi = now()
  where id = p_olay_id
    and restaurant_id = p_restaurant_id;

  return found;
end;
$$;

create or replace function public.gun_sonu_kilidini_ayarla(
  p_restaurant_id bigint,
  p_tarih date,
  p_kilitli boolean,
  p_aciklama text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_kayit public.gun_sonu_kilitleri%rowtype;
begin
  if not private.integra_sekme_yetkisi_var(
    p_restaurant_id,
    'kasa,raporlar,guclendirme'
  ) then
    raise exception 'Gun sonu kilidi yonetme yetkiniz yok.';
  end if;

  insert into public.gun_sonu_kilitleri (
    restaurant_id,
    tarih,
    kilitli,
    kilitleyen_kullanici,
    kilitlenme_tarihi,
    kilit_acilma_tarihi,
    aciklama,
    updated_at
  ) values (
    p_restaurant_id,
    coalesce(p_tarih, current_date),
    coalesce(p_kilitli, true),
    auth.uid(),
    case when coalesce(p_kilitli, true) then now() else null end,
    case when coalesce(p_kilitli, true) then null else now() end,
    nullif(left(trim(p_aciklama), 1000), ''),
    now()
  )
  on conflict (restaurant_id, tarih)
  do update set
    kilitli = excluded.kilitli,
    kilitleyen_kullanici = auth.uid(),
    kilitlenme_tarihi = case when excluded.kilitli then now() else public.gun_sonu_kilitleri.kilitlenme_tarihi end,
    kilit_acilma_tarihi = case when excluded.kilitli then null else now() end,
    aciklama = excluded.aciklama,
    updated_at = now()
  returning * into v_kayit;

  return to_jsonb(v_kayit);
end;
$$;

revoke all on function public.sistem_olayi_kaydet(bigint, text, text, text, text, text, text, jsonb)
  from public, anon;
revoke all on function public.sistem_islem_kaydi_ekle(bigint, text, text, text, text, text, jsonb, jsonb)
  from public, anon;
revoke all on function public.sistem_olayini_coz(bigint, uuid, text)
  from public, anon;
revoke all on function public.gun_sonu_kilidini_ayarla(bigint, date, boolean, text)
  from public, anon;

grant execute on function public.sistem_olayi_kaydet(bigint, text, text, text, text, text, text, jsonb)
  to authenticated;
grant execute on function public.sistem_islem_kaydi_ekle(bigint, text, text, text, text, text, jsonb, jsonb)
  to authenticated;
grant execute on function public.sistem_olayini_coz(bigint, uuid, text)
  to authenticated;
grant execute on function public.gun_sonu_kilidini_ayarla(bigint, date, boolean, text)
  to authenticated;

notify pgrst, 'reload schema';

commit;
