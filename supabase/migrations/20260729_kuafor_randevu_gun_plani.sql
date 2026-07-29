-- Integra Kuaför randevu, müşteri kaydı ve günlük plan modülü
-- Bu dosyayı Supabase SQL Editor içinde bir kez çalıştırın.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;

alter table public.restaurants
  add column if not exists isletme_tipi text not null default 'Restoran';

alter table public.restaurants
  drop constraint if exists restaurants_isletme_tipi_check;

alter table public.restaurants
  add constraint restaurants_isletme_tipi_check
  check (isletme_tipi in (
    'Restoran',
    'Market',
    'Karma',
    'Kuaför',
    'Güzellik / Bakım',
    'Servis / Atölye',
    'Hizmet',
    'Diğer'
  ));

create or replace function private.integra_kuafor_yetkisi_var(p_restaurant_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.restaurants r
    where r.id = p_restaurant_id
      and r.auth_user_id = (select auth.uid())
      and coalesce(r.rol, 'owner') = 'owner'
      and r.durum = 'Aktif'

    union all

    select 1
    from public.personeller p
    join public.restaurants r
      on r.id = p.restaurant_id
     and coalesce(r.rol, 'owner') = 'owner'
     and r.durum = 'Aktif'
    where p.restaurant_id = p_restaurant_id
      and p.auth_user_id = (select auth.uid())
      and p.durum = 'Aktif'
      and coalesce(p.tab_yetkileri, '[]'::jsonb) @> '["kuafor"]'::jsonb
  )
$$;

revoke all on function private.integra_kuafor_yetkisi_var(bigint) from public, anon, authenticated;
grant execute on function private.integra_kuafor_yetkisi_var(bigint) to authenticated, service_role;

create table if not exists public.kuafor_personelleri (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  ad text not null,
  telefon text,
  uzmanlik text,
  renk text not null default '#7c3aed',
  sira integer not null default 0,
  aktif boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (renk ~ '^#[0-9A-Fa-f]{6}$')
);

create index if not exists kuafor_personelleri_restaurant_idx
  on public.kuafor_personelleri (restaurant_id, aktif, sira, ad);

create table if not exists public.kuafor_hizmetleri (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  hizmet_adi text not null,
  kategori text not null default 'Genel',
  sure_dakika integer not null default 30 check (sure_dakika between 5 and 720),
  fiyat numeric(14,2) not null default 0 check (fiyat >= 0),
  renk text not null default '#f97316',
  aktif boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (renk ~ '^#[0-9A-Fa-f]{6}$')
);

create unique index if not exists kuafor_hizmetleri_ad_unique
  on public.kuafor_hizmetleri (restaurant_id, lower(trim(hizmet_adi)))
  where aktif = true;

create table if not exists public.kuafor_musterileri (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  ad text not null,
  telefon text,
  email text,
  dogum_tarihi date,
  not_metni text,
  toplam_ziyaret integer not null default 0,
  son_ziyaret_tarihi timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists kuafor_musterileri_telefon_unique
  on public.kuafor_musterileri (restaurant_id, telefon)
  where nullif(trim(telefon), '') is not null;

create index if not exists kuafor_musterileri_restaurant_ad_idx
  on public.kuafor_musterileri (restaurant_id, ad);

create table if not exists public.kuafor_randevulari (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  musteri_id uuid not null references public.kuafor_musterileri(id),
  personel_id uuid not null references public.kuafor_personelleri(id),
  hizmet_id uuid not null references public.kuafor_hizmetleri(id),
  musteri_adi text not null,
  telefon text,
  personel_adi text not null,
  hizmet_adi text not null,
  hizmet_rengi text not null default '#f97316',
  baslangic_zamani timestamptz not null,
  bitis_zamani timestamptz not null,
  sure_dakika integer not null check (sure_dakika between 5 and 720),
  ucret numeric(14,2) not null default 0 check (ucret >= 0),
  kapora numeric(14,2) not null default 0 check (kapora >= 0),
  kullanilan_malzemeler text,
  not_metni text,
  durum text not null default 'Bekliyor'
    check (durum in ('Bekliyor', 'Onaylandı', 'Geldi', 'Tamamlandı', 'Gelmedi', 'İptal')),
  created_by uuid default auth.uid(),
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (bitis_zamani > baslangic_zamani),
  check (kapora <= ucret or ucret = 0)
);

alter table public.kuafor_randevulari
  add column if not exists odeme_tipi text,
  add column if not exists odenen_tutar numeric(14,2),
  add column if not exists tamamlanma_zamani timestamptz,
  add column if not exists gun_sonuna_aktarildi boolean not null default false,
  add column if not exists hizmet_detaylari jsonb not null default '[]'::jsonb;

alter table public.satis_gecmisi
  add column if not exists kuafor_randevu_id uuid;

create unique index if not exists satis_gecmisi_kuafor_randevu_unique
  on public.satis_gecmisi (kuafor_randevu_id)
  where kuafor_randevu_id is not null;

create index if not exists kuafor_randevulari_gun_idx
  on public.kuafor_randevulari (restaurant_id, baslangic_zamani);

create index if not exists kuafor_randevulari_personel_idx
  on public.kuafor_randevulari (restaurant_id, personel_id, baslangic_zamani);

create index if not exists kuafor_randevulari_musteri_idx
  on public.kuafor_randevulari (restaurant_id, musteri_id, baslangic_zamani desc);

create or replace function public.kuafor_katalog_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists kuafor_personelleri_updated_at_trigger on public.kuafor_personelleri;
create trigger kuafor_personelleri_updated_at_trigger
before update on public.kuafor_personelleri
for each row execute function public.kuafor_katalog_updated_at();

drop trigger if exists kuafor_hizmetleri_updated_at_trigger on public.kuafor_hizmetleri;
create trigger kuafor_hizmetleri_updated_at_trigger
before update on public.kuafor_hizmetleri
for each row execute function public.kuafor_katalog_updated_at();

drop trigger if exists kuafor_musterileri_updated_at_trigger on public.kuafor_musterileri;
create trigger kuafor_musterileri_updated_at_trigger
before update on public.kuafor_musterileri
for each row execute function public.kuafor_katalog_updated_at();

create or replace function public.kuafor_randevu_cakisma_kontrol()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();

  if new.durum not in ('İptal', 'Gelmedi') then
    perform pg_advisory_xact_lock(
      hashtextextended(
        new.restaurant_id::text || ':' || new.personel_id::text || ':' || new.baslangic_zamani::date::text,
        0
      )
    );

    if exists (
      select 1
      from public.kuafor_randevulari r
      where r.restaurant_id = new.restaurant_id
        and r.personel_id = new.personel_id
        and r.id <> new.id
        and r.durum not in ('İptal', 'Gelmedi')
        and r.baslangic_zamani < new.bitis_zamani
        and r.bitis_zamani > new.baslangic_zamani
    ) then
      raise exception 'Seçilen personelin bu saat aralığında başka bir randevusu var.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists kuafor_randevu_cakisma_trigger on public.kuafor_randevulari;
create trigger kuafor_randevu_cakisma_trigger
before insert or update on public.kuafor_randevulari
for each row execute function public.kuafor_randevu_cakisma_kontrol();

drop function if exists public.kuafor_randevu_kaydet(
  bigint, uuid, uuid, text, text, uuid, uuid, timestamptz, integer, numeric, numeric, text, text
);

create or replace function public.kuafor_randevu_kaydet(
  p_restaurant_id bigint,
  p_randevu_id uuid,
  p_musteri_id uuid,
  p_musteri_adi text,
  p_telefon text,
  p_personel_id uuid,
  p_hizmet_id uuid,
  p_baslangic_zamani timestamptz,
  p_sure_dakika integer,
  p_ucret numeric,
  p_kapora numeric,
  p_kullanilan_malzemeler text,
  p_not_metni text,
  p_hizmet_idleri uuid[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_musteri public.kuafor_musterileri%rowtype;
  v_personel public.kuafor_personelleri%rowtype;
  v_hizmet public.kuafor_hizmetleri%rowtype;
  v_randevu public.kuafor_randevulari%rowtype;
  v_sure integer;
  v_ucret numeric(14,2);
  v_kapora numeric(14,2);
  v_bitis timestamptz;
  v_hizmet_idleri uuid[];
  v_hizmet_detaylari jsonb;
  v_hizmet_adlari text;
  v_toplam_sure integer;
  v_toplam_ucret numeric(14,2);
begin
  if not private.integra_kuafor_yetkisi_var(p_restaurant_id) then
    raise exception 'Bu işletmenin kuaför randevu modülüne erişim yetkiniz yok.';
  end if;

  if p_musteri_id is null then
    raise exception 'Önce müşteri kartı açın ve randevuda kayıtlı müşteriyi seçin.';
  end if;

  select *
  into v_personel
  from public.kuafor_personelleri
  where id = p_personel_id
    and restaurant_id = p_restaurant_id
    and aktif = true;

  if not found then
    raise exception 'Seçilen kuaför personeli bulunamadı.';
  end if;

  v_hizmet_idleri := coalesce(p_hizmet_idleri, array[p_hizmet_id]);

  if coalesce(cardinality(v_hizmet_idleri), 0) = 0 then
    raise exception 'Randevuya en az bir işlem/hizmet ekleyin.';
  end if;

  if exists (
    select 1
    from unnest(v_hizmet_idleri) secili_hizmet_id
    where not exists (
      select 1
      from public.kuafor_hizmetleri h
      where h.id = secili_hizmet_id
        and h.restaurant_id = p_restaurant_id
        and h.aktif = true
    )
  ) then
    raise exception 'Seçilen işlemlerden biri bulunamadı veya aktif değil.';
  end if;

  select *
  into v_hizmet
  from public.kuafor_hizmetleri
  where id = v_hizmet_idleri[1]
    and restaurant_id = p_restaurant_id
    and aktif = true;

  if not found then
    raise exception 'Seçilen işlem/hizmet bulunamadı.';
  end if;

  select
    jsonb_agg(
      jsonb_build_object(
        'id', h.id,
        'ad', h.hizmet_adi,
        'sure_dakika', h.sure_dakika,
        'fiyat', h.fiyat,
        'renk', h.renk
      )
      order by array_position(v_hizmet_idleri, h.id)
    ),
    string_agg(h.hizmet_adi, ' + ' order by array_position(v_hizmet_idleri, h.id)),
    sum(h.sure_dakika)::integer,
    sum(h.fiyat)::numeric(14,2)
  into v_hizmet_detaylari, v_hizmet_adlari, v_toplam_sure, v_toplam_ucret
  from public.kuafor_hizmetleri h
  where h.id = any(v_hizmet_idleri)
    and h.restaurant_id = p_restaurant_id
    and h.aktif = true;

  v_sure := coalesce(nullif(p_sure_dakika, 0), v_toplam_sure, v_hizmet.sure_dakika);
  if v_sure < 5 or v_sure > 720 then
    raise exception 'Randevu süresi 5 ile 720 dakika arasında olmalıdır.';
  end if;

  v_ucret := greatest(coalesce(p_ucret, v_toplam_ucret, v_hizmet.fiyat, 0), 0);
  v_kapora := greatest(coalesce(p_kapora, 0), 0);
  if v_ucret > 0 and v_kapora > v_ucret then
    raise exception 'Kapora işlem ücretinden büyük olamaz.';
  end if;
  v_bitis := p_baslangic_zamani + make_interval(mins => v_sure);

  select *
  into v_musteri
  from public.kuafor_musterileri
  where id = p_musteri_id
    and restaurant_id = p_restaurant_id;

  if not found then
    raise exception 'Seçilen kayıtlı müşteri bulunamadı.';
  end if;

  if p_randevu_id is null then
    insert into public.kuafor_randevulari (
      restaurant_id,
      musteri_id,
      personel_id,
      hizmet_id,
      musteri_adi,
      telefon,
      personel_adi,
      hizmet_adi,
      hizmet_rengi,
      hizmet_detaylari,
      baslangic_zamani,
      bitis_zamani,
      sure_dakika,
      ucret,
      kapora,
      kullanilan_malzemeler,
      not_metni,
      durum,
      created_by,
      updated_by
    ) values (
      p_restaurant_id,
      v_musteri.id,
      v_personel.id,
      v_hizmet.id,
      v_musteri.ad,
      v_musteri.telefon,
      v_personel.ad,
      v_hizmet_adlari,
      v_hizmet.renk,
      v_hizmet_detaylari,
      p_baslangic_zamani,
      v_bitis,
      v_sure,
      v_ucret,
      v_kapora,
      nullif(trim(p_kullanilan_malzemeler), ''),
      nullif(trim(p_not_metni), ''),
      'Bekliyor',
      auth.uid(),
      auth.uid()
    )
    returning * into v_randevu;
  else
    update public.kuafor_randevulari
    set musteri_id = v_musteri.id,
        personel_id = v_personel.id,
        hizmet_id = v_hizmet.id,
        musteri_adi = v_musteri.ad,
        telefon = v_musteri.telefon,
        personel_adi = v_personel.ad,
        hizmet_adi = v_hizmet_adlari,
        hizmet_rengi = v_hizmet.renk,
        hizmet_detaylari = v_hizmet_detaylari,
        baslangic_zamani = p_baslangic_zamani,
        bitis_zamani = v_bitis,
        sure_dakika = v_sure,
        ucret = v_ucret,
        kapora = v_kapora,
        kullanilan_malzemeler = nullif(trim(p_kullanilan_malzemeler), ''),
        not_metni = nullif(trim(p_not_metni), ''),
        updated_by = auth.uid(),
        updated_at = now()
    where id = p_randevu_id
      and restaurant_id = p_restaurant_id
    returning * into v_randevu;

    if not found then
      raise exception 'Güncellenecek randevu bulunamadı.';
    end if;
  end if;

  return to_jsonb(v_randevu);
end;
$$;

drop function if exists public.kuafor_randevu_durum_guncelle(bigint, uuid, text);

create or replace function public.kuafor_randevu_durum_guncelle(
  p_restaurant_id bigint,
  p_randevu_id uuid,
  p_durum text,
  p_odeme_tipi text default null,
  p_odenen_tutar numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_randevu public.kuafor_randevulari%rowtype;
  v_onceki_durum text;
  v_satis_tutari numeric(14,2);
begin
  if not private.integra_kuafor_yetkisi_var(p_restaurant_id) then
    raise exception 'Bu işletmenin kuaför randevu modülüne erişim yetkiniz yok.';
  end if;

  if p_durum not in ('Bekliyor', 'Onaylandı', 'Geldi', 'Tamamlandı', 'Gelmedi', 'İptal') then
    raise exception 'Geçersiz randevu durumu.';
  end if;

  select *
  into v_randevu
  from public.kuafor_randevulari
  where id = p_randevu_id
    and restaurant_id = p_restaurant_id
  for update;

  if not found then
    raise exception 'Randevu bulunamadı.';
  end if;

  v_onceki_durum := v_randevu.durum;

  if v_onceki_durum = 'Tamamlandı' and p_durum <> 'Tamamlandı' then
    raise exception 'Gün sonuna aktarılan tamamlanmış işlem yeniden açılamaz.';
  end if;

  if p_durum = 'Tamamlandı' and nullif(trim(p_odeme_tipi), '') is null then
    raise exception 'İşlemi tamamlamak için ödeme tipi seçin.';
  end if;

  v_satis_tutari := greatest(coalesce(p_odenen_tutar, v_randevu.ucret, 0), 0);

  update public.kuafor_randevulari
  set durum = p_durum,
      odeme_tipi = case when p_durum = 'Tamamlandı' then trim(p_odeme_tipi) else odeme_tipi end,
      odenen_tutar = case when p_durum = 'Tamamlandı' then v_satis_tutari else odenen_tutar end,
      tamamlanma_zamani = case
        when p_durum = 'Tamamlandı' then coalesce(tamamlanma_zamani, now())
        else tamamlanma_zamani
      end,
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_randevu_id
  returning * into v_randevu;

  if p_durum = 'Tamamlandı' and v_onceki_durum <> 'Tamamlandı' then
    update public.kuafor_musterileri
    set toplam_ziyaret = coalesce(toplam_ziyaret, 0) + 1,
        son_ziyaret_tarihi = v_randevu.bitis_zamani,
        updated_at = now()
    where id = v_randevu.musteri_id
      and restaurant_id = p_restaurant_id;
  end if;

  if p_durum = 'Tamamlandı' then
    insert into public.satis_gecmisi (
      restaurant_id,
      masa_adi,
      musteri_adi,
      ad,
      fiyat,
      adet,
      tarih,
      odeme_tipi,
      odemeler,
      normal_fiyat,
      liste_fiyati,
      satis_fiyati,
      fiyat_degistirildi,
      menu_grubu,
      departman,
      kdv_orani,
      maliyet,
      toplam_maliyet,
      garson_adi,
      kuafor_randevu_id
    ) values (
      p_restaurant_id,
      'Kuaför',
      v_randevu.musteri_adi,
      v_randevu.hizmet_adi,
      v_satis_tutari,
      1,
      (now() at time zone 'Europe/Istanbul')::date,
      trim(p_odeme_tipi),
      jsonb_build_array(jsonb_build_object(
        'tip', trim(p_odeme_tipi),
        'tutar', v_satis_tutari,
        'tarih', now()
      )),
      v_randevu.ucret,
      v_randevu.ucret,
      v_satis_tutari,
      v_satis_tutari <> v_randevu.ucret,
      'Kuaför Hizmetleri',
      'Kuaför',
      0,
      0,
      0,
      v_randevu.personel_adi,
      v_randevu.id
    )
    on conflict (kuafor_randevu_id) where kuafor_randevu_id is not null
    do nothing;

    update public.kuafor_randevulari
    set gun_sonuna_aktarildi = true,
        updated_at = now()
    where id = p_randevu_id
      and restaurant_id = p_restaurant_id
    returning * into v_randevu;
  end if;

  return to_jsonb(v_randevu);
end;
$$;

alter table public.kuafor_personelleri enable row level security;
alter table public.kuafor_hizmetleri enable row level security;
alter table public.kuafor_musterileri enable row level security;
alter table public.kuafor_randevulari enable row level security;

do $$
declare
  tablo text;
  politika text;
begin
  foreach tablo in array array[
    'kuafor_personelleri',
    'kuafor_hizmetleri',
    'kuafor_musterileri',
    'kuafor_randevulari'
  ] loop
    politika := tablo || '_yetkili_policy';
    execute format('drop policy if exists %I on public.%I', politika, tablo);
    execute format(
      'create policy %I on public.%I for all to authenticated using (
        restaurant_id = (select private.integra_restaurant_id())
        and private.integra_kuafor_yetkisi_var(restaurant_id)
      ) with check (
        restaurant_id = (select private.integra_restaurant_id())
        and private.integra_kuafor_yetkisi_var(restaurant_id)
      )',
      politika,
      tablo
    );
  end loop;
end $$;

grant select, insert, update, delete on table
  public.kuafor_personelleri,
  public.kuafor_hizmetleri,
  public.kuafor_musterileri,
  public.kuafor_randevulari
to authenticated;

revoke all on function public.kuafor_randevu_kaydet(
  bigint, uuid, uuid, text, text, uuid, uuid, timestamptz, integer, numeric, numeric, text, text, uuid[]
) from public, anon;
revoke all on function public.kuafor_randevu_durum_guncelle(bigint, uuid, text, text, numeric) from public, anon;

grant execute on function public.kuafor_randevu_kaydet(
  bigint, uuid, uuid, text, text, uuid, uuid, timestamptz, integer, numeric, numeric, text, text, uuid[]
) to authenticated;
grant execute on function public.kuafor_randevu_durum_guncelle(bigint, uuid, text, text, numeric) to authenticated;

update public.restaurants
set isletme_tipi = 'Kuaför'
where lower(coalesce(paket_adi, '')) in ('kuaför', 'kuafor')
   or lower(coalesce(modul_paketi, '')) in ('kuaför', 'kuafor');

notify pgrst, 'reload schema';

commit;
