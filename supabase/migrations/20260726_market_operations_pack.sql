-- Integra Market operasyon paketi
-- Atomik satış/iade, tarihsel maliyet, stok ve fiyat geçmişi, kasa vardiyası.
-- Supabase SQL Editor içinde bir kez çalıştırın. Tekrar çalıştırılması güvenlidir.

create extension if not exists pgcrypto;

alter table public.market_gruplari
  add column if not exists kdv_orani numeric not null default 20;

alter table public.market_urunleri
  add column if not exists son_kullanma_tarihi date,
  add column if not exists lot_no text;

alter table public.market_satislari
  add column if not exists durum text not null default 'Tamamlandı',
  add column if not exists iade_toplami numeric(14,2) not null default 0,
  add column if not exists islem_anahtari uuid,
  add column if not exists kasa_vardiya_id uuid,
  add column if not exists iptal_tarihi timestamptz;

alter table public.market_satis_kalemleri
  add column if not exists birim_maliyet numeric(14,2) not null default 0,
  add column if not exists iade_adedi numeric(14,3) not null default 0;

create unique index if not exists market_satislari_islem_anahtari_unique
  on public.market_satislari(restaurant_id, islem_anahtari)
  where islem_anahtari is not null;

create table if not exists public.market_stok_hareketleri (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  urun_id uuid not null references public.market_urunleri(id),
  hareket_tipi text not null,
  miktar numeric(14,3) not null,
  onceki_stok numeric(14,3) not null,
  sonraki_stok numeric(14,3) not null,
  kaynak_tipi text,
  kaynak_id text,
  aciklama text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists market_stok_hareketleri_urun_idx
  on public.market_stok_hareketleri(restaurant_id, urun_id, created_at desc);

create table if not exists public.market_fiyat_gecmisi (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  urun_id uuid not null references public.market_urunleri(id),
  eski_alis_fiyati numeric(14,2) not null default 0,
  yeni_alis_fiyati numeric(14,2) not null default 0,
  eski_satis_fiyati numeric(14,2) not null default 0,
  yeni_satis_fiyati numeric(14,2) not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists market_fiyat_gecmisi_urun_idx
  on public.market_fiyat_gecmisi(restaurant_id, urun_id, created_at desc);

create table if not exists public.market_kasa_vardiyalari (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  acilis_tutari numeric(14,2) not null default 0,
  beklenen_kapanis numeric(14,2),
  sayilan_kapanis numeric(14,2),
  fark_tutari numeric(14,2),
  durum text not null default 'Açık' check (durum in ('Açık', 'Kapalı')),
  not_metni text,
  acan_kullanici uuid default auth.uid(),
  kapatan_kullanici uuid,
  acilis_tarihi timestamptz not null default now(),
  kapanis_tarihi timestamptz
);

create unique index if not exists market_kasa_vardiyalari_tek_acik_idx
  on public.market_kasa_vardiyalari(restaurant_id)
  where durum = 'Açık';

create table if not exists public.market_kasa_hareketleri (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  vardiya_id uuid not null references public.market_kasa_vardiyalari(id) on delete cascade,
  hareket_tipi text not null check (hareket_tipi in ('Giriş', 'Çıkış')),
  tutar numeric(14,2) not null check (tutar > 0),
  aciklama text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.market_iadeleri (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  satis_id uuid not null references public.market_satislari(id),
  toplam_tutar numeric(14,2) not null default 0,
  aciklama text,
  tam_iptal boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.market_iade_kalemleri (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  iade_id uuid not null references public.market_iadeleri(id) on delete cascade,
  satis_kalem_id uuid not null references public.market_satis_kalemleri(id),
  urun_id uuid not null references public.market_urunleri(id),
  adet numeric(14,3) not null,
  birim_fiyat numeric(14,2) not null,
  toplam_tutar numeric(14,2) not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'market_satislari_kasa_vardiya_id_fkey'
      and conrelid = 'public.market_satislari'::regclass
  ) then
    alter table public.market_satislari
      add constraint market_satislari_kasa_vardiya_id_fkey
      foreign key (kasa_vardiya_id) references public.market_kasa_vardiyalari(id);
  end if;
end $$;

create or replace function public.market_fiyat_degisikligini_kaydet()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.alis_fiyati is distinct from new.alis_fiyati
     or old.satis_fiyati is distinct from new.satis_fiyati then
    insert into public.market_fiyat_gecmisi (
      restaurant_id, urun_id, eski_alis_fiyati, yeni_alis_fiyati,
      eski_satis_fiyati, yeni_satis_fiyati, created_by
    ) values (
      new.restaurant_id, new.id, old.alis_fiyati, new.alis_fiyati,
      old.satis_fiyati, new.satis_fiyati, auth.uid()
    );
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists market_urunleri_fiyat_gecmisi_trigger on public.market_urunleri;
create trigger market_urunleri_fiyat_gecmisi_trigger
  before update on public.market_urunleri
  for each row execute function public.market_fiyat_degisikligini_kaydet();

create or replace function public.market_satis_kaydet_atomik(
  p_restaurant_id bigint,
  p_kalemler jsonb,
  p_odeme_tipi text,
  p_cari_id text default null,
  p_islem_anahtari uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_satis public.market_satislari%rowtype;
  v_urun public.market_urunleri%rowtype;
  v_kalem jsonb;
  v_adet numeric(14,3);
  v_fiyat numeric(14,2);
  v_toplam numeric(14,2) := 0;
  v_cari_adi text;
  v_vardiya_id uuid;
  v_sonuc jsonb;
begin
  if p_restaurant_id is distinct from (select private.integra_restaurant_id()) then
    raise exception 'Bu işletme için işlem yetkiniz yok.';
  end if;
  if jsonb_typeof(p_kalemler) <> 'array' or jsonb_array_length(p_kalemler) = 0 then
    raise exception 'Satış için en az bir ürün gereklidir.';
  end if;

  p_islem_anahtari := coalesce(p_islem_anahtari, gen_random_uuid());
  perform pg_advisory_xact_lock(hashtextextended(p_islem_anahtari::text, 0));
  select * into v_satis
  from public.market_satislari
  where restaurant_id = p_restaurant_id and islem_anahtari = p_islem_anahtari;
  if found then
    select to_jsonb(v_satis) || jsonb_build_object(
      'market_satis_kalemleri',
      coalesce((select jsonb_agg(to_jsonb(k)) from public.market_satis_kalemleri k where k.satis_id = v_satis.id), '[]'::jsonb)
    ) into v_sonuc;
    return v_sonuc;
  end if;

  for v_kalem in select value from jsonb_array_elements(p_kalemler)
  loop
    v_adet := greatest(coalesce((v_kalem ->> 'adet')::numeric, 0), 0);
    v_fiyat := greatest(coalesce((v_kalem ->> 'satis_fiyati')::numeric, 0), 0);
    if v_adet <= 0 or v_fiyat <= 0 then
      raise exception 'Ürün adedi ve satış fiyatı sıfırdan büyük olmalıdır.';
    end if;
    perform 1 from public.market_urunleri
      where id = (v_kalem ->> 'id')::uuid and restaurant_id = p_restaurant_id
      for update;
    if not found then raise exception 'Satış ürünlerinden biri bulunamadı.'; end if;
    v_toplam := v_toplam + (v_adet * v_fiyat);
  end loop;

  if nullif(p_cari_id, '') is not null then
    select ad into v_cari_adi from public.cari_musteriler
      where restaurant_id = p_restaurant_id and id::text = p_cari_id;
    if v_cari_adi is null then raise exception 'Seçilen cari bulunamadı.'; end if;
  end if;

  select id into v_vardiya_id from public.market_kasa_vardiyalari
    where restaurant_id = p_restaurant_id and durum = 'Açık'
    order by acilis_tarihi desc limit 1;

  insert into public.market_satislari (
    restaurant_id, cari_id, cari_adi, odeme_tipi, toplam_tutar,
    durum, islem_anahtari, kasa_vardiya_id
  ) values (
    p_restaurant_id, nullif(p_cari_id, ''), v_cari_adi, p_odeme_tipi, v_toplam,
    'Tamamlandı', p_islem_anahtari, v_vardiya_id
  ) returning * into v_satis;

  for v_kalem in select value from jsonb_array_elements(p_kalemler)
  loop
    v_adet := (v_kalem ->> 'adet')::numeric;
    v_fiyat := (v_kalem ->> 'satis_fiyati')::numeric;
    select * into v_urun from public.market_urunleri
      where id = (v_kalem ->> 'id')::uuid and restaurant_id = p_restaurant_id
      for update;

    insert into public.market_satis_kalemleri (
      restaurant_id, satis_id, urun_id, barkod, urun_adi, adet,
      birim_fiyat, birim_maliyet, toplam_tutar
    ) values (
      p_restaurant_id, v_satis.id, v_urun.id, v_urun.barkod, v_urun.urun_adi, v_adet,
      v_fiyat, v_urun.alis_fiyati, v_adet * v_fiyat
    );

    update public.market_urunleri
      set stok_miktari = v_urun.stok_miktari - v_adet
      where id = v_urun.id and restaurant_id = p_restaurant_id;

    insert into public.market_stok_hareketleri (
      restaurant_id, urun_id, hareket_tipi, miktar, onceki_stok, sonraki_stok,
      kaynak_tipi, kaynak_id, aciklama
    ) values (
      p_restaurant_id, v_urun.id, 'Satış', -v_adet, v_urun.stok_miktari,
      v_urun.stok_miktari - v_adet, 'market_satisi', v_satis.id::text,
      'Barkodlu satış · ' || p_odeme_tipi
    );
  end loop;

  if nullif(p_cari_id, '') is not null and p_odeme_tipi = 'Cari / Veresiye' then
    update public.cari_musteriler
      set bakiye = coalesce(bakiye, 0) + v_toplam,
          hareketler = jsonb_build_array(jsonb_build_object(
            'id', extract(epoch from clock_timestamp()) * 1000,
            'tip', 'Borç',
            'tutar', v_toplam,
            'aciklama', 'Market satışı · Cari / Veresiye',
            'tarih', now(),
            'kaynak', 'market_satisi',
            'kaynak_id', v_satis.id,
            'bakiye_etkisi', v_toplam
          )) || coalesce(hareketler, '[]'::jsonb)
      where restaurant_id = p_restaurant_id and id::text = p_cari_id;
  end if;

  select to_jsonb(v_satis) || jsonb_build_object(
    'market_satis_kalemleri',
    coalesce((select jsonb_agg(to_jsonb(k)) from public.market_satis_kalemleri k where k.satis_id = v_satis.id), '[]'::jsonb)
  ) into v_sonuc;
  return v_sonuc;
end;
$$;

create or replace function public.market_satis_iade_atomik(
  p_restaurant_id bigint,
  p_satis_id uuid,
  p_kalemler jsonb default '[]'::jsonb,
  p_aciklama text default null,
  p_tam_iptal boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_satis public.market_satislari%rowtype;
  v_satir public.market_satis_kalemleri%rowtype;
  v_kalem jsonb;
  v_kalemler jsonb := p_kalemler;
  v_adet numeric(14,3);
  v_toplam numeric(14,2) := 0;
  v_iade_id uuid;
  v_onceki_stok numeric(14,3);
  v_yeni_iade_toplami numeric(14,2);
begin
  if p_restaurant_id is distinct from (select private.integra_restaurant_id()) then
    raise exception 'Bu işletme için işlem yetkiniz yok.';
  end if;
  select * into v_satis from public.market_satislari
    where id = p_satis_id and restaurant_id = p_restaurant_id for update;
  if not found then raise exception 'Satış bulunamadı.'; end if;
  if v_satis.durum = 'İptal' then raise exception 'Bu satış zaten tamamen iptal edilmiş.'; end if;

  if p_tam_iptal then
    select coalesce(jsonb_agg(jsonb_build_object(
      'satis_kalem_id', id,
      'adet', adet - coalesce(iade_adedi, 0)
    )), '[]'::jsonb) into v_kalemler
    from public.market_satis_kalemleri
    where satis_id = p_satis_id and adet > coalesce(iade_adedi, 0);
  end if;
  if jsonb_typeof(v_kalemler) <> 'array' or jsonb_array_length(v_kalemler) = 0 then
    raise exception 'İade edilecek ürün seçilmedi.';
  end if;

  for v_kalem in select value from jsonb_array_elements(v_kalemler)
  loop
    select * into v_satir from public.market_satis_kalemleri
      where id = (v_kalem ->> 'satis_kalem_id')::uuid
        and satis_id = p_satis_id and restaurant_id = p_restaurant_id
      for update;
    if not found then raise exception 'İade kalemi bulunamadı.'; end if;
    v_adet := coalesce((v_kalem ->> 'adet')::numeric, 0);
    if v_adet <= 0 or v_adet > (v_satir.adet - coalesce(v_satir.iade_adedi, 0)) then
      raise exception 'İade miktarı kalan satış miktarını aşıyor.';
    end if;
    perform 1 from public.market_urunleri where id = v_satir.urun_id for update;
    v_toplam := v_toplam + (v_adet * v_satir.birim_fiyat);
  end loop;

  insert into public.market_iadeleri (
    restaurant_id, satis_id, toplam_tutar, aciklama, tam_iptal
  ) values (
    p_restaurant_id, p_satis_id, v_toplam, nullif(trim(p_aciklama), ''), p_tam_iptal
  ) returning id into v_iade_id;

  for v_kalem in select value from jsonb_array_elements(v_kalemler)
  loop
    select * into v_satir from public.market_satis_kalemleri
      where id = (v_kalem ->> 'satis_kalem_id')::uuid for update;
    v_adet := (v_kalem ->> 'adet')::numeric;
    select stok_miktari into v_onceki_stok from public.market_urunleri
      where id = v_satir.urun_id for update;

    update public.market_satis_kalemleri
      set iade_adedi = coalesce(iade_adedi, 0) + v_adet
      where id = v_satir.id;
    update public.market_urunleri
      set stok_miktari = v_onceki_stok + v_adet
      where id = v_satir.urun_id;

    insert into public.market_iade_kalemleri (
      restaurant_id, iade_id, satis_kalem_id, urun_id, adet, birim_fiyat, toplam_tutar
    ) values (
      p_restaurant_id, v_iade_id, v_satir.id, v_satir.urun_id,
      v_adet, v_satir.birim_fiyat, v_adet * v_satir.birim_fiyat
    );
    insert into public.market_stok_hareketleri (
      restaurant_id, urun_id, hareket_tipi, miktar, onceki_stok, sonraki_stok,
      kaynak_tipi, kaynak_id, aciklama
    ) values (
      p_restaurant_id, v_satir.urun_id, 'İade', v_adet, v_onceki_stok,
      v_onceki_stok + v_adet, 'market_iadesi', v_iade_id::text,
      coalesce(nullif(trim(p_aciklama), ''), 'Satış iadesi')
    );
  end loop;

  v_yeni_iade_toplami := coalesce(v_satis.iade_toplami, 0) + v_toplam;
  update public.market_satislari set
    iade_toplami = v_yeni_iade_toplami,
    durum = case when v_yeni_iade_toplami >= toplam_tutar then 'İptal' else 'Kısmi İade' end,
    iptal_tarihi = case when v_yeni_iade_toplami >= toplam_tutar then now() else iptal_tarihi end
  where id = p_satis_id;

  if nullif(v_satis.cari_id, '') is not null and v_satis.odeme_tipi = 'Cari / Veresiye' then
    update public.cari_musteriler
      set bakiye = coalesce(bakiye, 0) - v_toplam,
          hareketler = jsonb_build_array(jsonb_build_object(
            'id', extract(epoch from clock_timestamp()) * 1000,
            'tip', 'Satış İadesi',
            'tutar', v_toplam,
            'aciklama', coalesce(nullif(trim(p_aciklama), ''), 'Market satış iadesi'),
            'tarih', now(),
            'kaynak', 'market_iadesi',
            'kaynak_id', v_iade_id,
            'bakiye_etkisi', -v_toplam
          )) || coalesce(hareketler, '[]'::jsonb)
      where restaurant_id = p_restaurant_id and id::text = v_satis.cari_id;
  end if;

  return jsonb_build_object('iade_id', v_iade_id, 'toplam_tutar', v_toplam);
end;
$$;

alter table public.market_stok_hareketleri enable row level security;
alter table public.market_fiyat_gecmisi enable row level security;
alter table public.market_kasa_vardiyalari enable row level security;
alter table public.market_kasa_hareketleri enable row level security;
alter table public.market_iadeleri enable row level security;
alter table public.market_iade_kalemleri enable row level security;

do $$
declare
  tablo text;
begin
  foreach tablo in array array[
    'market_stok_hareketleri',
    'market_fiyat_gecmisi',
    'market_kasa_vardiyalari',
    'market_kasa_hareketleri',
    'market_iadeleri',
    'market_iade_kalemleri'
  ] loop
    execute format('drop policy if exists %I on public.%I', tablo || '_email_restaurant_policy', tablo);
    execute format(
      'create policy %I on public.%I for all to authenticated using (restaurant_id = (select private.integra_restaurant_id())) with check (restaurant_id = (select private.integra_restaurant_id()))',
      tablo || '_email_restaurant_policy', tablo
    );
    execute format('grant select, insert, update, delete on table public.%I to authenticated', tablo);
  end loop;
end $$;

revoke all on function public.market_satis_kaydet_atomik(bigint, jsonb, text, text, uuid) from public, anon;
revoke all on function public.market_satis_iade_atomik(bigint, uuid, jsonb, text, boolean) from public, anon;
grant execute on function public.market_satis_kaydet_atomik(bigint, jsonb, text, text, uuid) to authenticated;
grant execute on function public.market_satis_iade_atomik(bigint, uuid, jsonb, text, boolean) to authenticated;
