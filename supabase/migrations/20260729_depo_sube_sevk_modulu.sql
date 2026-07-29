-- Integra ortak depo ve şubeler arası sevkiyat modülü
-- Restoran, market ve karma işletmelerde ortak çalışır.
-- Akış: depoya alış -> sevk hazırla -> gönder -> hedef işletme teslim alsın.
-- Bu dosyayı Supabase SQL Editor içinde bir kez çalıştırın.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;

alter table public.restaurants
  add column if not exists depo_baglanti_kodu text;

update public.restaurants
set depo_baglanti_kodu = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
where nullif(trim(depo_baglanti_kodu), '') is null;

alter table public.restaurants
  alter column depo_baglanti_kodu
  set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

create unique index if not exists restaurants_depo_baglanti_kodu_unique
  on public.restaurants (upper(depo_baglanti_kodu))
  where nullif(trim(depo_baglanti_kodu), '') is not null;

create or replace function private.integra_depo_yetkisi_var(p_restaurant_id bigint)
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
      and coalesce(p.tab_yetkileri, '[]'::jsonb) @> '["depo"]'::jsonb
  )
$$;

revoke all on function private.integra_depo_yetkisi_var(bigint) from public, anon, authenticated;
grant execute on function private.integra_depo_yetkisi_var(bigint) to authenticated, service_role;

create table if not exists public.depo_urunleri (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  barkod text,
  urun_adi text not null,
  stok_kodu text,
  kategori text not null default 'Genel',
  birim text not null default 'Adet',
  alis_fiyati numeric(14,2) not null default 0 check (alis_fiyati >= 0),
  stok_miktari numeric(14,3) not null default 0,
  minimum_stok numeric(14,3) not null default 0 check (minimum_stok >= 0),
  aktif boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists depo_urunleri_barkod_unique
  on public.depo_urunleri (restaurant_id, barkod)
  where nullif(trim(barkod), '') is not null;

create index if not exists depo_urunleri_restaurant_idx
  on public.depo_urunleri (restaurant_id, urun_adi);

create table if not exists public.depo_alislari (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  tedarikci_adi text not null,
  fatura_no text,
  fatura_tarihi date not null default current_date,
  genel_toplam numeric(14,2) not null default 0,
  not_metni text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists depo_alislari_restaurant_idx
  on public.depo_alislari (restaurant_id, fatura_tarihi desc, created_at desc);

create table if not exists public.depo_alis_kalemleri (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  alis_id uuid not null references public.depo_alislari(id) on delete cascade,
  depo_urun_id uuid not null references public.depo_urunleri(id),
  urun_adi text not null,
  barkod text,
  birim text not null,
  miktar numeric(14,3) not null check (miktar > 0),
  birim_fiyat numeric(14,2) not null check (birim_fiyat >= 0),
  satir_toplami numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists depo_alis_kalemleri_alis_idx
  on public.depo_alis_kalemleri (alis_id);

create table if not exists public.depo_isletme_baglantilari (
  id uuid primary key default gen_random_uuid(),
  depo_restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  sube_restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  depo_adi text not null,
  sube_adi text not null,
  sube_isletme_tipi text not null default 'Restoran',
  durum text not null default 'Aktif' check (durum in ('Aktif', 'Pasif')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (depo_restaurant_id <> sube_restaurant_id),
  unique (depo_restaurant_id, sube_restaurant_id)
);

create index if not exists depo_isletme_baglantilari_sube_idx
  on public.depo_isletme_baglantilari (sube_restaurant_id, durum);

create table if not exists public.depo_sevkleri (
  id uuid primary key default gen_random_uuid(),
  sevk_no text not null unique,
  kaynak_restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  hedef_restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  kaynak_adi text not null,
  hedef_adi text not null,
  hedef_stok_tipi text not null check (hedef_stok_tipi in ('Restoran', 'Market')),
  durum text not null default 'Hazırlanıyor'
    check (durum in ('Hazırlanıyor', 'Yolda', 'Teslim Alındı', 'İptal')),
  toplam_maliyet numeric(14,2) not null default 0,
  not_metni text,
  created_by uuid default auth.uid(),
  gonderen_kullanici uuid,
  teslim_alan_kullanici uuid,
  created_at timestamptz not null default now(),
  gonderim_tarihi timestamptz,
  teslim_tarihi timestamptz,
  iptal_tarihi timestamptz,
  check (kaynak_restaurant_id <> hedef_restaurant_id)
);

create index if not exists depo_sevkleri_kaynak_idx
  on public.depo_sevkleri (kaynak_restaurant_id, created_at desc);

create index if not exists depo_sevkleri_hedef_idx
  on public.depo_sevkleri (hedef_restaurant_id, durum, created_at desc);

create table if not exists public.depo_sevk_kalemleri (
  id uuid primary key default gen_random_uuid(),
  sevk_id uuid not null references public.depo_sevkleri(id) on delete cascade,
  kaynak_restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  hedef_restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  depo_urun_id uuid not null references public.depo_urunleri(id),
  urun_adi text not null,
  barkod text,
  stok_kodu text,
  kategori text not null default 'Genel',
  birim text not null,
  miktar numeric(14,3) not null check (miktar > 0),
  birim_maliyet numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (sevk_id, depo_urun_id)
);

create index if not exists depo_sevk_kalemleri_sevk_idx
  on public.depo_sevk_kalemleri (sevk_id);

create table if not exists public.depo_stok_hareketleri (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  depo_urun_id uuid not null references public.depo_urunleri(id),
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

create index if not exists depo_stok_hareketleri_urun_idx
  on public.depo_stok_hareketleri (restaurant_id, depo_urun_id, created_at desc);

create or replace function public.depo_urunu_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists depo_urunleri_updated_at_trigger on public.depo_urunleri;
create trigger depo_urunleri_updated_at_trigger
before update on public.depo_urunleri
for each row execute function public.depo_urunu_updated_at();

create or replace function public.depo_baglanti_kodum(p_restaurant_id bigint)
returns text
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_kod text;
begin
  if not private.integra_depo_yetkisi_var(p_restaurant_id) then
    raise exception 'Bu işletmenin depo modülüne erişim yetkiniz yok.';
  end if;

  select depo_baglanti_kodu
  into v_kod
  from public.restaurants
  where id = p_restaurant_id
    and durum = 'Aktif';

  return v_kod;
end;
$$;

create or replace function public.depo_urununu_kaydet(
  p_restaurant_id bigint,
  p_urun_id uuid,
  p_barkod text,
  p_urun_adi text,
  p_stok_kodu text,
  p_kategori text,
  p_birim text,
  p_alis_fiyati numeric,
  p_minimum_stok numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_urun public.depo_urunleri%rowtype;
begin
  if not private.integra_depo_yetkisi_var(p_restaurant_id) then
    raise exception 'Bu işletme için depo kartı yönetme yetkiniz yok.';
  end if;

  if nullif(trim(p_urun_adi), '') is null then
    raise exception 'Ürün veya hammadde adı zorunludur.';
  end if;

  if coalesce(p_alis_fiyati, 0) < 0 or coalesce(p_minimum_stok, 0) < 0 then
    raise exception 'Alış fiyatı ve kritik stok negatif olamaz.';
  end if;

  if p_urun_id is null then
    insert into public.depo_urunleri (
      restaurant_id,
      barkod,
      urun_adi,
      stok_kodu,
      kategori,
      birim,
      alis_fiyati,
      minimum_stok,
      created_by
    ) values (
      p_restaurant_id,
      nullif(trim(p_barkod), ''),
      trim(p_urun_adi),
      nullif(trim(p_stok_kodu), ''),
      coalesce(nullif(trim(p_kategori), ''), 'Genel'),
      coalesce(nullif(trim(p_birim), ''), 'Adet'),
      coalesce(p_alis_fiyati, 0),
      coalesce(p_minimum_stok, 0),
      auth.uid()
    )
    returning * into v_urun;
  else
    update public.depo_urunleri
    set barkod = nullif(trim(p_barkod), ''),
        urun_adi = trim(p_urun_adi),
        stok_kodu = nullif(trim(p_stok_kodu), ''),
        kategori = coalesce(nullif(trim(p_kategori), ''), 'Genel'),
        birim = coalesce(nullif(trim(p_birim), ''), 'Adet'),
        alis_fiyati = coalesce(p_alis_fiyati, 0),
        minimum_stok = coalesce(p_minimum_stok, 0),
        updated_at = now()
    where id = p_urun_id
      and restaurant_id = p_restaurant_id
      and aktif = true
    returning * into v_urun;

    if not found then
      raise exception 'Güncellenecek depo kartı bulunamadı.';
    end if;
  end if;

  return to_jsonb(v_urun);
end;
$$;

create or replace function public.depo_subesini_bagla(
  p_restaurant_id bigint,
  p_baglanti_kodu text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_kaynak public.restaurants%rowtype;
  v_hedef public.restaurants%rowtype;
  v_baglanti public.depo_isletme_baglantilari%rowtype;
begin
  if not exists (
    select 1
    from public.restaurants r
    where r.id = p_restaurant_id
      and r.auth_user_id = (select auth.uid())
      and coalesce(r.rol, 'owner') = 'owner'
      and r.durum = 'Aktif'
  ) then
    raise exception 'Yeni şube bağlantısını yalnızca işletme sahibi kurabilir.';
  end if;

  select *
  into v_kaynak
  from public.restaurants
  where id = p_restaurant_id
    and durum = 'Aktif';

  select *
  into v_hedef
  from public.restaurants
  where upper(depo_baglanti_kodu) = upper(trim(p_baglanti_kodu))
    and id <> p_restaurant_id
    and coalesce(rol, 'owner') = 'owner'
    and durum = 'Aktif'
  limit 1;

  if not found then
    raise exception 'Bu kodla eşleşen aktif restoran veya market bulunamadı.';
  end if;

  insert into public.depo_isletme_baglantilari (
    depo_restaurant_id,
    sube_restaurant_id,
    depo_adi,
    sube_adi,
    sube_isletme_tipi,
    durum,
    created_by,
    updated_at
  ) values (
    p_restaurant_id,
    v_hedef.id,
    coalesce(v_kaynak.restaurant_name, v_kaynak.name, 'Merkez Depo'),
    coalesce(v_hedef.restaurant_name, v_hedef.name, 'Bağlı İşletme'),
    coalesce(v_hedef.isletme_tipi, 'Restoran'),
    'Aktif',
    auth.uid(),
    now()
  )
  on conflict (depo_restaurant_id, sube_restaurant_id)
  do update set
    depo_adi = excluded.depo_adi,
    sube_adi = excluded.sube_adi,
    sube_isletme_tipi = excluded.sube_isletme_tipi,
    durum = 'Aktif',
    updated_at = now()
  returning * into v_baglanti;

  return to_jsonb(v_baglanti);
end;
$$;

create or replace function public.depo_alisi_kaydet(
  p_restaurant_id bigint,
  p_tedarikci_adi text,
  p_fatura_no text,
  p_fatura_tarihi date,
  p_not_metni text,
  p_kalemler jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_alis_id uuid;
  v_kalem jsonb;
  v_urun public.depo_urunleri%rowtype;
  v_miktar numeric(14,3);
  v_fiyat numeric(14,2);
  v_toplam numeric(14,2) := 0;
  v_yeni_stok numeric(14,3);
  v_yeni_maliyet numeric(14,2);
begin
  if not private.integra_depo_yetkisi_var(p_restaurant_id) then
    raise exception 'Bu işletme için depo alış yetkiniz yok.';
  end if;

  if nullif(trim(p_tedarikci_adi), '') is null then
    raise exception 'Tedarikçi adı zorunludur.';
  end if;

  if jsonb_typeof(p_kalemler) <> 'array' or jsonb_array_length(p_kalemler) = 0 then
    raise exception 'Alış için en az bir ürün gereklidir.';
  end if;

  for v_kalem in select value from jsonb_array_elements(p_kalemler)
  loop
    v_miktar := coalesce((v_kalem ->> 'miktar')::numeric, 0);
    v_fiyat := coalesce((v_kalem ->> 'birim_fiyat')::numeric, 0);

    if v_miktar <= 0 or v_fiyat < 0 then
      raise exception 'Alış miktarı sıfırdan büyük, fiyat sıfır veya daha büyük olmalıdır.';
    end if;

    perform 1
    from public.depo_urunleri
    where id = (v_kalem ->> 'urun_id')::uuid
      and restaurant_id = p_restaurant_id
      and aktif = true;

    if not found then
      raise exception 'Alış kalemlerinden biri depo kartlarında bulunamadı.';
    end if;

    v_toplam := v_toplam + (v_miktar * v_fiyat);
  end loop;

  insert into public.depo_alislari (
    restaurant_id,
    tedarikci_adi,
    fatura_no,
    fatura_tarihi,
    genel_toplam,
    not_metni,
    created_by
  ) values (
    p_restaurant_id,
    trim(p_tedarikci_adi),
    nullif(trim(p_fatura_no), ''),
    coalesce(p_fatura_tarihi, current_date),
    round(v_toplam, 2),
    nullif(trim(p_not_metni), ''),
    auth.uid()
  )
  returning id into v_alis_id;

  for v_kalem in select value from jsonb_array_elements(p_kalemler)
  loop
    v_miktar := (v_kalem ->> 'miktar')::numeric;
    v_fiyat := (v_kalem ->> 'birim_fiyat')::numeric;

    select *
    into v_urun
    from public.depo_urunleri
    where id = (v_kalem ->> 'urun_id')::uuid
      and restaurant_id = p_restaurant_id
      and aktif = true
    for update;

    v_yeni_stok := coalesce(v_urun.stok_miktari, 0) + v_miktar;
    v_yeni_maliyet := case
      when v_yeni_stok > 0 then round(
        (
          greatest(coalesce(v_urun.stok_miktari, 0), 0) * coalesce(v_urun.alis_fiyati, 0)
          + v_miktar * v_fiyat
        ) / (greatest(coalesce(v_urun.stok_miktari, 0), 0) + v_miktar),
        2
      )
      else v_fiyat
    end;

    insert into public.depo_alis_kalemleri (
      restaurant_id,
      alis_id,
      depo_urun_id,
      urun_adi,
      barkod,
      birim,
      miktar,
      birim_fiyat,
      satir_toplami
    ) values (
      p_restaurant_id,
      v_alis_id,
      v_urun.id,
      v_urun.urun_adi,
      v_urun.barkod,
      v_urun.birim,
      v_miktar,
      v_fiyat,
      round(v_miktar * v_fiyat, 2)
    );

    update public.depo_urunleri
    set stok_miktari = v_yeni_stok,
        alis_fiyati = v_yeni_maliyet,
        updated_at = now()
    where id = v_urun.id;

    insert into public.depo_stok_hareketleri (
      restaurant_id,
      depo_urun_id,
      hareket_tipi,
      miktar,
      onceki_stok,
      sonraki_stok,
      kaynak_tipi,
      kaynak_id,
      aciklama,
      created_by
    ) values (
      p_restaurant_id,
      v_urun.id,
      'Alış Girişi',
      v_miktar,
      v_urun.stok_miktari,
      v_yeni_stok,
      'depo_alisi',
      v_alis_id::text,
      trim(p_tedarikci_adi) || coalesce(' · ' || nullif(trim(p_fatura_no), ''), ''),
      auth.uid()
    );
  end loop;

  return jsonb_build_object(
    'alis_id', v_alis_id,
    'genel_toplam', round(v_toplam, 2),
    'kalem_sayisi', jsonb_array_length(p_kalemler)
  );
end;
$$;

create or replace function public.depo_sevki_olustur(
  p_restaurant_id bigint,
  p_hedef_restaurant_id bigint,
  p_hedef_stok_tipi text,
  p_not_metni text,
  p_kalemler jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_sevk_id uuid;
  v_sevk_no text;
  v_kalem jsonb;
  v_urun public.depo_urunleri%rowtype;
  v_kaynak_adi text;
  v_hedef_adi text;
  v_miktar numeric(14,3);
  v_toplam numeric(14,2) := 0;
begin
  if not private.integra_depo_yetkisi_var(p_restaurant_id) then
    raise exception 'Bu işletme için sevk oluşturma yetkiniz yok.';
  end if;

  if p_restaurant_id = p_hedef_restaurant_id then
    raise exception 'Merkez depo kendi işletmesine sevk oluşturamaz.';
  end if;

  if p_hedef_stok_tipi not in ('Restoran', 'Market') then
    raise exception 'Hedef stok tipi Restoran veya Market olmalıdır.';
  end if;

  if not exists (
    select 1
    from public.depo_isletme_baglantilari b
    where b.depo_restaurant_id = p_restaurant_id
      and b.sube_restaurant_id = p_hedef_restaurant_id
      and b.durum = 'Aktif'
  ) then
    raise exception 'Hedef işletme bu merkez depoya bağlı değil.';
  end if;

  if jsonb_typeof(p_kalemler) <> 'array' or jsonb_array_length(p_kalemler) = 0 then
    raise exception 'Sevk için en az bir ürün gereklidir.';
  end if;

  select coalesce(restaurant_name, name, 'Merkez Depo')
  into v_kaynak_adi
  from public.restaurants
  where id = p_restaurant_id;

  select coalesce(restaurant_name, name, 'Hedef İşletme')
  into v_hedef_adi
  from public.restaurants
  where id = p_hedef_restaurant_id
    and durum = 'Aktif';

  if v_hedef_adi is null then
    raise exception 'Hedef işletme aktif değil veya bulunamadı.';
  end if;

  for v_kalem in select value from jsonb_array_elements(p_kalemler)
  loop
    v_miktar := coalesce((v_kalem ->> 'miktar')::numeric, 0);
    if v_miktar <= 0 then
      raise exception 'Sevk miktarı sıfırdan büyük olmalıdır.';
    end if;

    select *
    into v_urun
    from public.depo_urunleri
    where id = (v_kalem ->> 'urun_id')::uuid
      and restaurant_id = p_restaurant_id
      and aktif = true;

    if not found then
      raise exception 'Sevk kalemlerinden biri depo kartlarında bulunamadı.';
    end if;

    v_toplam := v_toplam + (v_miktar * coalesce(v_urun.alis_fiyati, 0));
  end loop;

  v_sevk_no := 'SVK-' || to_char(clock_timestamp(), 'YYMMDD-HH24MISS-')
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));

  insert into public.depo_sevkleri (
    sevk_no,
    kaynak_restaurant_id,
    hedef_restaurant_id,
    kaynak_adi,
    hedef_adi,
    hedef_stok_tipi,
    durum,
    toplam_maliyet,
    not_metni,
    created_by
  ) values (
    v_sevk_no,
    p_restaurant_id,
    p_hedef_restaurant_id,
    v_kaynak_adi,
    v_hedef_adi,
    p_hedef_stok_tipi,
    'Hazırlanıyor',
    round(v_toplam, 2),
    nullif(trim(p_not_metni), ''),
    auth.uid()
  )
  returning id into v_sevk_id;

  for v_kalem in select value from jsonb_array_elements(p_kalemler)
  loop
    v_miktar := (v_kalem ->> 'miktar')::numeric;

    select *
    into v_urun
    from public.depo_urunleri
    where id = (v_kalem ->> 'urun_id')::uuid
      and restaurant_id = p_restaurant_id;

    insert into public.depo_sevk_kalemleri (
      sevk_id,
      kaynak_restaurant_id,
      hedef_restaurant_id,
      depo_urun_id,
      urun_adi,
      barkod,
      stok_kodu,
      kategori,
      birim,
      miktar,
      birim_maliyet
    ) values (
      v_sevk_id,
      p_restaurant_id,
      p_hedef_restaurant_id,
      v_urun.id,
      v_urun.urun_adi,
      v_urun.barkod,
      v_urun.stok_kodu,
      v_urun.kategori,
      v_urun.birim,
      v_miktar,
      v_urun.alis_fiyati
    );
  end loop;

  return jsonb_build_object('sevk_id', v_sevk_id, 'sevk_no', v_sevk_no);
end;
$$;

create or replace function public.depo_sevkini_gonder(
  p_restaurant_id bigint,
  p_sevk_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_sevk public.depo_sevkleri%rowtype;
  v_kalem public.depo_sevk_kalemleri%rowtype;
  v_urun public.depo_urunleri%rowtype;
  v_yeni_stok numeric(14,3);
begin
  if not private.integra_depo_yetkisi_var(p_restaurant_id) then
    raise exception 'Bu işletme için sevk gönderme yetkiniz yok.';
  end if;

  select *
  into v_sevk
  from public.depo_sevkleri
  where id = p_sevk_id
    and kaynak_restaurant_id = p_restaurant_id
  for update;

  if not found then
    raise exception 'Sevk kaydı bulunamadı.';
  end if;

  if v_sevk.durum <> 'Hazırlanıyor' then
    raise exception 'Yalnızca hazırlanmakta olan sevk gönderilebilir.';
  end if;

  for v_kalem in
    select *
    from public.depo_sevk_kalemleri
    where sevk_id = p_sevk_id
    order by created_at
  loop
    select *
    into v_urun
    from public.depo_urunleri
    where id = v_kalem.depo_urun_id
      and restaurant_id = p_restaurant_id
      and aktif = true
    for update;

    if not found then
      raise exception '% depo kartı bulunamadı.', v_kalem.urun_adi;
    end if;

    if coalesce(v_urun.stok_miktari, 0) < v_kalem.miktar then
      raise exception '% için depo stoğu yetersiz. Mevcut: %, gereken: %.',
        v_kalem.urun_adi, v_urun.stok_miktari, v_kalem.miktar;
    end if;

    v_yeni_stok := v_urun.stok_miktari - v_kalem.miktar;

    update public.depo_urunleri
    set stok_miktari = v_yeni_stok,
        updated_at = now()
    where id = v_urun.id;

    insert into public.depo_stok_hareketleri (
      restaurant_id,
      depo_urun_id,
      hareket_tipi,
      miktar,
      onceki_stok,
      sonraki_stok,
      kaynak_tipi,
      kaynak_id,
      aciklama,
      created_by
    ) values (
      p_restaurant_id,
      v_urun.id,
      'Şubeye Sevk',
      -v_kalem.miktar,
      v_urun.stok_miktari,
      v_yeni_stok,
      'depo_sevki',
      p_sevk_id::text,
      v_sevk.sevk_no || ' · ' || v_sevk.hedef_adi,
      auth.uid()
    );
  end loop;

  update public.depo_sevkleri
  set durum = 'Yolda',
      gonderen_kullanici = auth.uid(),
      gonderim_tarihi = now()
  where id = p_sevk_id;

  return jsonb_build_object('sevk_id', p_sevk_id, 'durum', 'Yolda');
end;
$$;

create or replace function public.depo_sevkini_teslim_al(
  p_restaurant_id bigint,
  p_sevk_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_sevk public.depo_sevkleri%rowtype;
  v_kalem public.depo_sevk_kalemleri%rowtype;
  v_malzeme public.stok_malzemeleri%rowtype;
  v_market public.market_urunleri%rowtype;
  v_grup_id uuid;
  v_hedef_barkod text;
  v_onceki_stok numeric(14,3);
  v_yeni_stok numeric(14,3);
  v_yeni_maliyet numeric(14,2);
begin
  if not private.integra_depo_yetkisi_var(p_restaurant_id) then
    raise exception 'Bu işletme için sevk teslim alma yetkiniz yok.';
  end if;

  select *
  into v_sevk
  from public.depo_sevkleri
  where id = p_sevk_id
    and hedef_restaurant_id = p_restaurant_id
  for update;

  if not found then
    raise exception 'Bu işletmeye ait sevk kaydı bulunamadı.';
  end if;

  if v_sevk.durum <> 'Yolda' then
    raise exception 'Yalnızca yoldaki sevk teslim alınabilir.';
  end if;

  if v_sevk.hedef_stok_tipi = 'Market' then
    select id
    into v_grup_id
    from public.market_gruplari
    where restaurant_id = p_restaurant_id
      and lower(trim(grup_adi)) = lower('Depo Sevkleri')
    limit 1;

    if v_grup_id is null then
      begin
        insert into public.market_gruplari (
          restaurant_id,
          grup_adi,
          satis_ekraninda_goster,
          sira,
          kdv_orani
        ) values (
          p_restaurant_id,
          'Depo Sevkleri',
          false,
          999,
          20
        )
        returning id into v_grup_id;
      exception when unique_violation then
        select id
        into v_grup_id
        from public.market_gruplari
        where restaurant_id = p_restaurant_id
          and lower(trim(grup_adi)) = lower('Depo Sevkleri')
        limit 1;
      end;
    end if;
  end if;

  for v_kalem in
    select *
    from public.depo_sevk_kalemleri
    where sevk_id = p_sevk_id
    order by created_at
  loop
    if v_sevk.hedef_stok_tipi = 'Market' then
      v_hedef_barkod := coalesce(
        nullif(trim(v_kalem.barkod), ''),
        'DP' || upper(substr(replace(v_kalem.depo_urun_id::text, '-', ''), 1, 11))
      );

      select *
      into v_market
      from public.market_urunleri
      where restaurant_id = p_restaurant_id
        and (
          barkod = v_hedef_barkod
          or lower(trim(urun_adi)) = lower(trim(v_kalem.urun_adi))
        )
      order by case when barkod = v_hedef_barkod then 0 else 1 end
      limit 1
      for update;

      if found then
        v_onceki_stok := coalesce(v_market.stok_miktari, 0);
        v_yeni_stok := v_onceki_stok + v_kalem.miktar;
        v_yeni_maliyet := round(
          (
            greatest(v_onceki_stok, 0) * coalesce(v_market.alis_fiyati, 0)
            + v_kalem.miktar * coalesce(v_kalem.birim_maliyet, 0)
          ) / (greatest(v_onceki_stok, 0) + v_kalem.miktar),
          2
        );

        update public.market_urunleri
        set stok_miktari = v_yeni_stok,
            alis_fiyati = v_yeni_maliyet,
            updated_at = now()
        where id = v_market.id;
      else
        v_onceki_stok := 0;
        v_yeni_stok := v_kalem.miktar;
        v_yeni_maliyet := v_kalem.birim_maliyet;

        insert into public.market_urunleri (
          restaurant_id,
          barkod,
          urun_adi,
          stok_kodu,
          kategori,
          grup_id,
          marka,
          birim,
          kdv_orani,
          alis_fiyati,
          satis_fiyati,
          stok_miktari,
          minimum_stok,
          aktif
        ) values (
          p_restaurant_id,
          v_hedef_barkod,
          v_kalem.urun_adi,
          v_kalem.stok_kodu,
          'Depo Sevkleri',
          v_grup_id,
          null,
          v_kalem.birim,
          20,
          v_kalem.birim_maliyet,
          0,
          v_kalem.miktar,
          0,
          true
        )
        returning * into v_market;
      end if;

      insert into public.market_stok_hareketleri (
        restaurant_id,
        urun_id,
        hareket_tipi,
        miktar,
        onceki_stok,
        sonraki_stok,
        kaynak_tipi,
        kaynak_id,
        aciklama,
        created_by
      ) values (
        p_restaurant_id,
        v_market.id,
        'Depo Sevki',
        v_kalem.miktar,
        v_onceki_stok,
        v_yeni_stok,
        'depo_sevki',
        p_sevk_id::text,
        v_sevk.sevk_no || ' · ' || v_sevk.kaynak_adi,
        auth.uid()
      );
    else
      select *
      into v_malzeme
      from public.stok_malzemeleri
      where restaurant_id = p_restaurant_id
        and lower(trim(ad)) = lower(trim(v_kalem.urun_adi))
      limit 1
      for update;

      if found then
        v_onceki_stok := coalesce(v_malzeme.stok_miktari, 0);
        v_yeni_stok := v_onceki_stok + v_kalem.miktar;
        v_yeni_maliyet := round(
          (
            greatest(v_onceki_stok, 0) * coalesce(v_malzeme.birim_maliyet, 0)
            + v_kalem.miktar * coalesce(v_kalem.birim_maliyet, 0)
          ) / (greatest(v_onceki_stok, 0) + v_kalem.miktar),
          2
        );

        update public.stok_malzemeleri
        set stok_miktari = v_yeni_stok,
            birim_maliyet = v_yeni_maliyet
        where id = v_malzeme.id;
      else
        v_onceki_stok := 0;
        v_yeni_stok := v_kalem.miktar;
        v_yeni_maliyet := v_kalem.birim_maliyet;

        insert into public.stok_malzemeleri (
          restaurant_id,
          ad,
          birim,
          stok_miktari,
          kritik_miktar,
          birim_maliyet
        ) values (
          p_restaurant_id,
          v_kalem.urun_adi,
          lower(v_kalem.birim),
          v_kalem.miktar,
          0,
          v_kalem.birim_maliyet
        )
        returning * into v_malzeme;
      end if;

      insert into public.stok_hareketleri (
        restaurant_id,
        malzeme_id,
        tip,
        miktar,
        aciklama
      ) values (
        p_restaurant_id,
        v_malzeme.id,
        'Depo Sevki Giriş',
        v_kalem.miktar,
        v_sevk.sevk_no || ' · ' || v_sevk.kaynak_adi
      );
    end if;
  end loop;

  update public.depo_sevkleri
  set durum = 'Teslim Alındı',
      teslim_alan_kullanici = auth.uid(),
      teslim_tarihi = now()
  where id = p_sevk_id;

  return jsonb_build_object(
    'sevk_id', p_sevk_id,
    'durum', 'Teslim Alındı',
    'hedef_stok_tipi', v_sevk.hedef_stok_tipi
  );
end;
$$;

create or replace function public.depo_sevkini_iptal_et(
  p_restaurant_id bigint,
  p_sevk_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_sevk public.depo_sevkleri%rowtype;
  v_kalem public.depo_sevk_kalemleri%rowtype;
  v_urun public.depo_urunleri%rowtype;
  v_yeni_stok numeric(14,3);
begin
  if not private.integra_depo_yetkisi_var(p_restaurant_id) then
    raise exception 'Bu işletme için sevk iptal yetkiniz yok.';
  end if;

  select *
  into v_sevk
  from public.depo_sevkleri
  where id = p_sevk_id
    and kaynak_restaurant_id = p_restaurant_id
  for update;

  if not found then
    raise exception 'Sevk kaydı bulunamadı.';
  end if;

  if v_sevk.durum not in ('Hazırlanıyor', 'Yolda') then
    raise exception 'Teslim alınmış veya iptal edilmiş sevk değiştirilemez.';
  end if;

  if v_sevk.durum = 'Yolda' then
    for v_kalem in
      select *
      from public.depo_sevk_kalemleri
      where sevk_id = p_sevk_id
      order by created_at
    loop
      select *
      into v_urun
      from public.depo_urunleri
      where id = v_kalem.depo_urun_id
        and restaurant_id = p_restaurant_id
      for update;

      if found then
        v_yeni_stok := coalesce(v_urun.stok_miktari, 0) + v_kalem.miktar;

        update public.depo_urunleri
        set stok_miktari = v_yeni_stok,
            updated_at = now()
        where id = v_urun.id;

        insert into public.depo_stok_hareketleri (
          restaurant_id,
          depo_urun_id,
          hareket_tipi,
          miktar,
          onceki_stok,
          sonraki_stok,
          kaynak_tipi,
          kaynak_id,
          aciklama,
          created_by
        ) values (
          p_restaurant_id,
          v_urun.id,
          'Sevk İptal İadesi',
          v_kalem.miktar,
          v_urun.stok_miktari,
          v_yeni_stok,
          'depo_sevki',
          p_sevk_id::text,
          v_sevk.sevk_no || ' iptal edildi',
          auth.uid()
        );
      end if;
    end loop;
  end if;

  update public.depo_sevkleri
  set durum = 'İptal',
      iptal_tarihi = now()
  where id = p_sevk_id;

  return jsonb_build_object('sevk_id', p_sevk_id, 'durum', 'İptal');
end;
$$;

alter table public.depo_urunleri enable row level security;
alter table public.depo_alislari enable row level security;
alter table public.depo_alis_kalemleri enable row level security;
alter table public.depo_isletme_baglantilari enable row level security;
alter table public.depo_sevkleri enable row level security;
alter table public.depo_sevk_kalemleri enable row level security;
alter table public.depo_stok_hareketleri enable row level security;

drop policy if exists depo_urunleri_yetkili_policy on public.depo_urunleri;
create policy depo_urunleri_yetkili_policy
  on public.depo_urunleri
  for all
  to authenticated
  using (
    restaurant_id = (select private.integra_restaurant_id())
    and private.integra_depo_yetkisi_var(restaurant_id)
  )
  with check (
    restaurant_id = (select private.integra_restaurant_id())
    and private.integra_depo_yetkisi_var(restaurant_id)
  );

drop policy if exists depo_alislari_okuma_policy on public.depo_alislari;
create policy depo_alislari_okuma_policy
  on public.depo_alislari
  for select
  to authenticated
  using (
    restaurant_id = (select private.integra_restaurant_id())
    and private.integra_depo_yetkisi_var(restaurant_id)
  );

drop policy if exists depo_alis_kalemleri_okuma_policy on public.depo_alis_kalemleri;
create policy depo_alis_kalemleri_okuma_policy
  on public.depo_alis_kalemleri
  for select
  to authenticated
  using (
    restaurant_id = (select private.integra_restaurant_id())
    and private.integra_depo_yetkisi_var(restaurant_id)
  );

drop policy if exists depo_baglantilari_okuma_policy on public.depo_isletme_baglantilari;
create policy depo_baglantilari_okuma_policy
  on public.depo_isletme_baglantilari
  for select
  to authenticated
  using (
    (
      depo_restaurant_id = (select private.integra_restaurant_id())
      and private.integra_depo_yetkisi_var(depo_restaurant_id)
    )
    or
    (
      sube_restaurant_id = (select private.integra_restaurant_id())
      and private.integra_depo_yetkisi_var(sube_restaurant_id)
    )
  );

drop policy if exists depo_sevkleri_okuma_policy on public.depo_sevkleri;
create policy depo_sevkleri_okuma_policy
  on public.depo_sevkleri
  for select
  to authenticated
  using (
    (
      kaynak_restaurant_id = (select private.integra_restaurant_id())
      and private.integra_depo_yetkisi_var(kaynak_restaurant_id)
    )
    or
    (
      hedef_restaurant_id = (select private.integra_restaurant_id())
      and private.integra_depo_yetkisi_var(hedef_restaurant_id)
    )
  );

drop policy if exists depo_sevk_kalemleri_okuma_policy on public.depo_sevk_kalemleri;
create policy depo_sevk_kalemleri_okuma_policy
  on public.depo_sevk_kalemleri
  for select
  to authenticated
  using (
    (
      kaynak_restaurant_id = (select private.integra_restaurant_id())
      and private.integra_depo_yetkisi_var(kaynak_restaurant_id)
    )
    or
    (
      hedef_restaurant_id = (select private.integra_restaurant_id())
      and private.integra_depo_yetkisi_var(hedef_restaurant_id)
    )
  );

drop policy if exists depo_stok_hareketleri_okuma_policy on public.depo_stok_hareketleri;
create policy depo_stok_hareketleri_okuma_policy
  on public.depo_stok_hareketleri
  for select
  to authenticated
  using (
    restaurant_id = (select private.integra_restaurant_id())
    and private.integra_depo_yetkisi_var(restaurant_id)
  );

grant select on table public.depo_urunleri to authenticated;
grant select on table
  public.depo_alislari,
  public.depo_alis_kalemleri,
  public.depo_isletme_baglantilari,
  public.depo_sevkleri,
  public.depo_sevk_kalemleri,
  public.depo_stok_hareketleri
to authenticated;

revoke all on function public.depo_baglanti_kodum(bigint) from public, anon;
revoke all on function public.depo_urununu_kaydet(bigint, uuid, text, text, text, text, text, numeric, numeric) from public, anon;
revoke all on function public.depo_subesini_bagla(bigint, text) from public, anon;
revoke all on function public.depo_alisi_kaydet(bigint, text, text, date, text, jsonb) from public, anon;
revoke all on function public.depo_sevki_olustur(bigint, bigint, text, text, jsonb) from public, anon;
revoke all on function public.depo_sevkini_gonder(bigint, uuid) from public, anon;
revoke all on function public.depo_sevkini_teslim_al(bigint, uuid) from public, anon;
revoke all on function public.depo_sevkini_iptal_et(bigint, uuid) from public, anon;

grant execute on function public.depo_baglanti_kodum(bigint) to authenticated;
grant execute on function public.depo_urununu_kaydet(bigint, uuid, text, text, text, text, text, numeric, numeric) to authenticated;
grant execute on function public.depo_subesini_bagla(bigint, text) to authenticated;
grant execute on function public.depo_alisi_kaydet(bigint, text, text, date, text, jsonb) to authenticated;
grant execute on function public.depo_sevki_olustur(bigint, bigint, text, text, jsonb) to authenticated;
grant execute on function public.depo_sevkini_gonder(bigint, uuid) to authenticated;
grant execute on function public.depo_sevkini_teslim_al(bigint, uuid) to authenticated;
grant execute on function public.depo_sevkini_iptal_et(bigint, uuid) to authenticated;

-- Daha önce özel modül listesi kaydedilmiş işletmelerde Depo sekmesini açar.
-- Boş listeler paket şablonunu kullanmaya devam ettiği için değiştirilmez.
update public.restaurants
set aktif_sekmeler = aktif_sekmeler || '["depo"]'::jsonb
where coalesce(rol, 'owner') = 'owner'
  and case
    when jsonb_typeof(coalesce(aktif_sekmeler, '[]'::jsonb)) = 'array'
      then jsonb_array_length(coalesce(aktif_sekmeler, '[]'::jsonb)) > 0
    else false
  end
  and not coalesce(aktif_sekmeler, '[]'::jsonb) @> '["depo"]'::jsonb;

notify pgrst, 'reload schema';

commit;
