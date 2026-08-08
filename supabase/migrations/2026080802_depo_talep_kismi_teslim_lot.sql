-- Depo v2: şube talebi, kısmi teslim/fark, kalıcı ürün eşleşmesi ve lot-SKT.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;

alter table public.depo_alis_kalemleri
  add column if not exists lot_no text,
  add column if not exists son_kullanma_tarihi date;

alter table public.depo_sevk_kalemleri
  add column if not exists teslim_alinan_miktar numeric(14,3),
  add column if not exists hasarli_miktar numeric(14,3) not null default 0,
  add column if not exists eksik_miktar numeric(14,3) not null default 0,
  add column if not exists teslim_notu text;

alter table public.depo_sevkleri
  drop constraint if exists depo_sevkleri_durum_check;

alter table public.depo_sevkleri
  add constraint depo_sevkleri_durum_check
  check (durum in ('Hazırlanıyor', 'Yolda', 'Teslim Alındı', 'Kısmi Teslim', 'İptal'));

create table if not exists public.depo_lotlari (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  depo_urun_id uuid not null references public.depo_urunleri(id) on delete cascade,
  alis_id uuid references public.depo_alislari(id) on delete set null,
  lot_no text,
  son_kullanma_tarihi date,
  ilk_miktar numeric(14,3) not null check (ilk_miktar > 0),
  kalan_miktar numeric(14,3) not null check (kalan_miktar >= 0),
  birim_maliyet numeric(14,2) not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists depo_lotlari_skt_idx
  on public.depo_lotlari (restaurant_id, son_kullanma_tarihi, kalan_miktar)
  where kalan_miktar > 0;

create table if not exists public.depo_urun_eslesmeleri (
  id uuid primary key default gen_random_uuid(),
  kaynak_depo_urun_id uuid not null references public.depo_urunleri(id) on delete cascade,
  hedef_restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  hedef_stok_tipi text not null check (hedef_stok_tipi in ('Restoran', 'Restoran Ürünü', 'Market')),
  hedef_urun_id text not null,
  hedef_urun_adi text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kaynak_depo_urun_id, hedef_restaurant_id, hedef_stok_tipi)
);

create table if not exists public.depo_teslimat_farklari (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  sevk_id uuid not null references public.depo_sevkleri(id) on delete cascade,
  sevk_kalem_id uuid not null references public.depo_sevk_kalemleri(id) on delete cascade,
  depo_urun_id uuid not null references public.depo_urunleri(id),
  urun_adi text not null,
  gonderilen_miktar numeric(14,3) not null,
  teslim_alinan_miktar numeric(14,3) not null,
  hasarli_miktar numeric(14,3) not null default 0,
  eksik_miktar numeric(14,3) not null default 0,
  aciklama text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (sevk_kalem_id)
);

create index if not exists depo_teslimat_farklari_restaurant_idx
  on public.depo_teslimat_farklari (restaurant_id, created_at desc);

create table if not exists public.depo_sevk_talepleri (
  id uuid primary key default gen_random_uuid(),
  talep_no text not null unique,
  depo_restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  talep_eden_restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  depo_adi text not null,
  talep_eden_adi text not null,
  hedef_stok_tipi text not null check (hedef_stok_tipi in ('Restoran', 'Restoran Ürünü', 'Market')),
  durum text not null default 'Bekliyor'
    check (durum in ('Bekliyor', 'Sevke Dönüştü', 'Reddedildi', 'İptal')),
  not_metni text,
  cevap_notu text,
  sevk_id uuid references public.depo_sevkleri(id) on delete set null,
  created_by uuid default auth.uid(),
  cevaplayan_kullanici uuid,
  created_at timestamptz not null default now(),
  cevap_tarihi timestamptz,
  updated_at timestamptz not null default now(),
  check (depo_restaurant_id <> talep_eden_restaurant_id)
);

create index if not exists depo_sevk_talepleri_depo_idx
  on public.depo_sevk_talepleri (depo_restaurant_id, durum, created_at desc);

create index if not exists depo_sevk_talepleri_sube_idx
  on public.depo_sevk_talepleri (talep_eden_restaurant_id, created_at desc);

create table if not exists public.depo_sevk_talep_kalemleri (
  id uuid primary key default gen_random_uuid(),
  talep_id uuid not null references public.depo_sevk_talepleri(id) on delete cascade,
  depo_urun_id uuid not null references public.depo_urunleri(id),
  urun_adi text not null,
  birim text not null,
  talep_miktari numeric(14,3) not null check (talep_miktari > 0),
  created_at timestamptz not null default now(),
  unique (talep_id, depo_urun_id)
);

create index if not exists depo_sevk_talep_kalemleri_talep_idx
  on public.depo_sevk_talep_kalemleri (talep_id);

alter table public.depo_lotlari enable row level security;
alter table public.depo_urun_eslesmeleri enable row level security;
alter table public.depo_teslimat_farklari enable row level security;
alter table public.depo_sevk_talepleri enable row level security;
alter table public.depo_sevk_talep_kalemleri enable row level security;

revoke all on table public.depo_lotlari from public, anon, authenticated;
revoke all on table public.depo_urun_eslesmeleri from public, anon, authenticated;
revoke all on table public.depo_teslimat_farklari from public, anon, authenticated;
revoke all on table public.depo_sevk_talepleri from public, anon, authenticated;
revoke all on table public.depo_sevk_talep_kalemleri from public, anon, authenticated;

grant select on table public.depo_lotlari to authenticated;
grant select on table public.depo_urun_eslesmeleri to authenticated;
grant select on table public.depo_teslimat_farklari to authenticated;
grant select on table public.depo_sevk_talepleri to authenticated;
grant select on table public.depo_sevk_talep_kalemleri to authenticated;
grant all on table public.depo_lotlari, public.depo_urun_eslesmeleri,
  public.depo_teslimat_farklari, public.depo_sevk_talepleri,
  public.depo_sevk_talep_kalemleri to service_role;

drop policy if exists depo_lotlari_okuma_policy on public.depo_lotlari;
create policy depo_lotlari_okuma_policy on public.depo_lotlari
for select to authenticated
using (
  restaurant_id = (select private.integra_restaurant_id())
  and private.integra_depo_yetkisi_var(restaurant_id)
);

drop policy if exists depo_eslesmeleri_okuma_policy on public.depo_urun_eslesmeleri;
create policy depo_eslesmeleri_okuma_policy on public.depo_urun_eslesmeleri
for select to authenticated
using (
  hedef_restaurant_id = (select private.integra_restaurant_id())
  and private.integra_depo_yetkisi_var(hedef_restaurant_id)
);

drop policy if exists depo_teslimat_farklari_okuma_policy on public.depo_teslimat_farklari;
create policy depo_teslimat_farklari_okuma_policy on public.depo_teslimat_farklari
for select to authenticated
using (
  restaurant_id = (select private.integra_restaurant_id())
  and private.integra_depo_yetkisi_var(restaurant_id)
);

drop policy if exists depo_sevk_talepleri_okuma_policy on public.depo_sevk_talepleri;
create policy depo_sevk_talepleri_okuma_policy on public.depo_sevk_talepleri
for select to authenticated
using (
  (
    depo_restaurant_id = (select private.integra_restaurant_id())
    and private.integra_depo_yetkisi_var(depo_restaurant_id)
  )
  or
  (
    talep_eden_restaurant_id = (select private.integra_restaurant_id())
    and private.integra_depo_yetkisi_var(talep_eden_restaurant_id)
  )
);

drop policy if exists depo_sevk_talep_kalemleri_okuma_policy on public.depo_sevk_talep_kalemleri;
create policy depo_sevk_talep_kalemleri_okuma_policy on public.depo_sevk_talep_kalemleri
for select to authenticated
using (
  exists (
    select 1
    from public.depo_sevk_talepleri t
    where t.id = talep_id
      and (
        t.depo_restaurant_id = (select private.integra_restaurant_id())
        or t.talep_eden_restaurant_id = (select private.integra_restaurant_id())
      )
  )
);

-- Bağlı şube, yalnızca bağlandığı merkezin aktif depo kartlarını talep ekranında okuyabilir.
drop policy if exists depo_urunleri_bagli_sube_select on public.depo_urunleri;
create policy depo_urunleri_bagli_sube_select on public.depo_urunleri
for select to authenticated
using (
  aktif = true
  and exists (
    select 1
    from public.depo_isletme_baglantilari b
    where b.depo_restaurant_id = depo_urunleri.restaurant_id
      and b.sube_restaurant_id = (select private.integra_restaurant_id())
      and b.durum = 'Aktif'
      and private.integra_depo_yetkisi_var(b.sube_restaurant_id)
  )
);

create or replace function public.depo_sevk_talebi_olustur(
  p_restaurant_id bigint,
  p_depo_restaurant_id bigint,
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
  v_talep_id uuid;
  v_talep_no text;
  v_depo_adi text;
  v_sube_adi text;
  v_kalem jsonb;
  v_urun public.depo_urunleri%rowtype;
  v_miktar numeric(14,3);
begin
  if not private.integra_depo_yetkisi_var(p_restaurant_id) then
    raise exception 'Bu işletme için depo talebi oluşturma yetkiniz yok.';
  end if;

  select b.depo_adi, b.sube_adi
  into v_depo_adi, v_sube_adi
  from public.depo_isletme_baglantilari b
  where b.depo_restaurant_id = p_depo_restaurant_id
    and b.sube_restaurant_id = p_restaurant_id
    and b.durum = 'Aktif';

  if not found then
    raise exception 'Seçilen merkez depo ile aktif işletme bağlantısı bulunamadı.';
  end if;

  if p_hedef_stok_tipi not in ('Restoran', 'Restoran Ürünü', 'Market') then
    raise exception 'Hedef stok tipi geçersiz.';
  end if;

  if jsonb_typeof(p_kalemler) <> 'array' or jsonb_array_length(p_kalemler) = 0 then
    raise exception 'Talep için en az bir ürün gereklidir.';
  end if;

  v_talep_no := 'TLP-' || to_char(clock_timestamp(), 'YYMMDD-HH24MISS-')
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));

  insert into public.depo_sevk_talepleri (
    talep_no, depo_restaurant_id, talep_eden_restaurant_id,
    depo_adi, talep_eden_adi, hedef_stok_tipi, not_metni, created_by
  ) values (
    v_talep_no, p_depo_restaurant_id, p_restaurant_id,
    v_depo_adi, v_sube_adi, p_hedef_stok_tipi,
    nullif(trim(p_not_metni), ''), auth.uid()
  ) returning id into v_talep_id;

  for v_kalem in select value from jsonb_array_elements(p_kalemler)
  loop
    v_miktar := coalesce((v_kalem ->> 'miktar')::numeric, 0);
    if v_miktar <= 0 then
      raise exception 'Talep miktarı sıfırdan büyük olmalıdır.';
    end if;

    select * into v_urun
    from public.depo_urunleri
    where id = (v_kalem ->> 'urun_id')::uuid
      and restaurant_id = p_depo_restaurant_id
      and aktif = true;
    if not found then
      raise exception 'Talep ürünlerinden biri merkez depoda bulunamadı.';
    end if;

    insert into public.depo_sevk_talep_kalemleri (
      talep_id, depo_urun_id, urun_adi, birim, talep_miktari
    ) values (
      v_talep_id, v_urun.id, v_urun.urun_adi, v_urun.birim, v_miktar
    );
  end loop;

  return jsonb_build_object('talep_id', v_talep_id, 'talep_no', v_talep_no, 'durum', 'Bekliyor');
end;
$$;

create or replace function public.depo_talebini_sevke_donustur(
  p_restaurant_id bigint,
  p_talep_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_talep public.depo_sevk_talepleri%rowtype;
  v_sonuc jsonb;
  v_kalemler jsonb;
begin
  if not private.integra_depo_yetkisi_var(p_restaurant_id) then
    raise exception 'Bu işletme için talebi sevke çevirme yetkiniz yok.';
  end if;

  select * into v_talep
  from public.depo_sevk_talepleri
  where id = p_talep_id
    and depo_restaurant_id = p_restaurant_id
  for update;

  if not found then raise exception 'Depo talebi bulunamadı.'; end if;
  if v_talep.durum = 'Sevke Dönüştü' and v_talep.sevk_id is not null then
    return jsonb_build_object('talep_id', v_talep.id, 'sevk_id', v_talep.sevk_id, 'durum', v_talep.durum);
  end if;
  if v_talep.durum <> 'Bekliyor' then
    raise exception 'Yalnızca bekleyen talep sevke dönüştürülebilir.';
  end if;

  select jsonb_agg(jsonb_build_object('urun_id', k.depo_urun_id, 'miktar', k.talep_miktari))
  into v_kalemler
  from public.depo_sevk_talep_kalemleri k
  where k.talep_id = v_talep.id;

  v_sonuc := public.depo_sevki_olustur(
    p_restaurant_id,
    v_talep.talep_eden_restaurant_id,
    v_talep.hedef_stok_tipi,
    concat(v_talep.talep_no, coalesce(' · ' || nullif(v_talep.not_metni, ''), '')),
    v_kalemler
  );

  update public.depo_sevk_talepleri
  set durum = 'Sevke Dönüştü',
      sevk_id = (v_sonuc ->> 'sevk_id')::uuid,
      cevaplayan_kullanici = auth.uid(),
      cevap_tarihi = now(),
      updated_at = now()
  where id = v_talep.id;

  return v_sonuc || jsonb_build_object('talep_id', v_talep.id, 'talep_no', v_talep.talep_no);
end;
$$;

create or replace function public.depo_sevk_talebi_kapat(
  p_restaurant_id bigint,
  p_talep_id uuid,
  p_durum text,
  p_cevap_notu text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_talep public.depo_sevk_talepleri%rowtype;
  v_yeni_durum text;
begin
  if not private.integra_depo_yetkisi_var(p_restaurant_id) then
    raise exception 'Bu işletme için talep kapatma yetkiniz yok.';
  end if;

  select * into v_talep
  from public.depo_sevk_talepleri
  where id = p_talep_id
    and (depo_restaurant_id = p_restaurant_id or talep_eden_restaurant_id = p_restaurant_id)
  for update;
  if not found then raise exception 'Depo talebi bulunamadı.'; end if;
  if v_talep.durum <> 'Bekliyor' then raise exception 'Yalnızca bekleyen talep kapatılabilir.'; end if;

  if p_restaurant_id = v_talep.depo_restaurant_id and p_durum = 'Reddedildi' then
    v_yeni_durum := 'Reddedildi';
  elsif p_restaurant_id = v_talep.talep_eden_restaurant_id and p_durum = 'İptal' then
    v_yeni_durum := 'İptal';
  else
    raise exception 'Bu talep durumu için yetkiniz yok.';
  end if;

  update public.depo_sevk_talepleri
  set durum = v_yeni_durum,
      cevap_notu = nullif(left(trim(p_cevap_notu), 1000), ''),
      cevaplayan_kullanici = auth.uid(),
      cevap_tarihi = now(),
      updated_at = now()
  where id = v_talep.id
  returning * into v_talep;

  return to_jsonb(v_talep);
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
  v_lot_no text;
  v_skt date;
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
    perform 1 from public.depo_urunleri
    where id = (v_kalem ->> 'urun_id')::uuid
      and restaurant_id = p_restaurant_id
      and aktif = true;
    if not found then raise exception 'Alış kalemlerinden biri depo kartlarında bulunamadı.'; end if;
    v_toplam := v_toplam + (v_miktar * v_fiyat);
  end loop;

  insert into public.depo_alislari (
    restaurant_id, tedarikci_adi, fatura_no, fatura_tarihi,
    genel_toplam, not_metni, created_by
  ) values (
    p_restaurant_id, trim(p_tedarikci_adi), nullif(trim(p_fatura_no), ''),
    coalesce(p_fatura_tarihi, current_date), round(v_toplam, 2),
    nullif(trim(p_not_metni), ''), auth.uid()
  ) returning id into v_alis_id;

  for v_kalem in select value from jsonb_array_elements(p_kalemler)
  loop
    v_miktar := (v_kalem ->> 'miktar')::numeric;
    v_fiyat := (v_kalem ->> 'birim_fiyat')::numeric;
    v_lot_no := nullif(left(trim(v_kalem ->> 'lot_no'), 120), '');
    v_skt := nullif(v_kalem ->> 'son_kullanma_tarihi', '')::date;

    select * into v_urun from public.depo_urunleri
    where id = (v_kalem ->> 'urun_id')::uuid
      and restaurant_id = p_restaurant_id
      and aktif = true
    for update;

    v_yeni_stok := coalesce(v_urun.stok_miktari, 0) + v_miktar;
    v_yeni_maliyet := case when v_yeni_stok > 0 then round(
      (
        greatest(coalesce(v_urun.stok_miktari, 0), 0) * coalesce(v_urun.alis_fiyati, 0)
        + v_miktar * v_fiyat
      ) / (greatest(coalesce(v_urun.stok_miktari, 0), 0) + v_miktar), 2
    ) else v_fiyat end;

    insert into public.depo_alis_kalemleri (
      restaurant_id, alis_id, depo_urun_id, urun_adi, barkod, birim,
      miktar, birim_fiyat, satir_toplami, lot_no, son_kullanma_tarihi
    ) values (
      p_restaurant_id, v_alis_id, v_urun.id, v_urun.urun_adi,
      v_urun.barkod, v_urun.birim, v_miktar, v_fiyat,
      round(v_miktar * v_fiyat, 2), v_lot_no, v_skt
    );

    if v_lot_no is not null or v_skt is not null then
      insert into public.depo_lotlari (
        restaurant_id, depo_urun_id, alis_id, lot_no, son_kullanma_tarihi,
        ilk_miktar, kalan_miktar, birim_maliyet, created_by
      ) values (
        p_restaurant_id, v_urun.id, v_alis_id, v_lot_no, v_skt,
        v_miktar, v_miktar, v_fiyat, auth.uid()
      );
    end if;

    update public.depo_urunleri
    set stok_miktari = v_yeni_stok,
        alis_fiyati = v_yeni_maliyet,
        updated_at = now()
    where id = v_urun.id;

    insert into public.depo_stok_hareketleri (
      restaurant_id, depo_urun_id, hareket_tipi, miktar, onceki_stok,
      sonraki_stok, kaynak_tipi, kaynak_id, aciklama, created_by
    ) values (
      p_restaurant_id, v_urun.id, 'Alış Girişi', v_miktar,
      v_urun.stok_miktari, v_yeni_stok, 'depo_alisi', v_alis_id::text,
      trim(p_tedarikci_adi) || coalesce(' · ' || nullif(trim(p_fatura_no), ''), '')
        || coalesce(' · Lot ' || v_lot_no, ''),
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

create or replace function public.depo_lot_stok_hareketi_isle()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_kalan numeric(14,3);
  v_dusulecek numeric(14,3);
  v_lot public.depo_lotlari%rowtype;
  v_maliyet numeric(14,2);
begin
  if new.hareket_tipi = 'Şubeye Sevk' and new.miktar < 0 then
    v_kalan := abs(new.miktar);
    for v_lot in
      select * from public.depo_lotlari
      where restaurant_id = new.restaurant_id
        and depo_urun_id = new.depo_urun_id
        and kalan_miktar > 0
      order by son_kullanma_tarihi asc nulls last, created_at asc
      for update
    loop
      exit when v_kalan <= 0;
      v_dusulecek := least(v_lot.kalan_miktar, v_kalan);
      update public.depo_lotlari
      set kalan_miktar = kalan_miktar - v_dusulecek, updated_at = now()
      where id = v_lot.id;
      v_kalan := v_kalan - v_dusulecek;
    end loop;
  elsif new.hareket_tipi = 'Sevk İptal İadesi' and new.miktar > 0 then
    select alis_fiyati into v_maliyet
    from public.depo_urunleri where id = new.depo_urun_id;
    insert into public.depo_lotlari (
      restaurant_id, depo_urun_id, lot_no, ilk_miktar, kalan_miktar,
      birim_maliyet, created_by
    ) values (
      new.restaurant_id, new.depo_urun_id,
      'IADE-' || upper(substr(replace(coalesce(new.kaynak_id, gen_random_uuid()::text), '-', ''), 1, 10)),
      new.miktar, new.miktar, coalesce(v_maliyet, 0), new.created_by
    );
  end if;
  return new;
end;
$$;

drop trigger if exists depo_stok_hareketi_lot_trigger on public.depo_stok_hareketleri;
create trigger depo_stok_hareketi_lot_trigger
after insert on public.depo_stok_hareketleri
for each row execute function public.depo_lot_stok_hareketi_isle();

create or replace function private.depo_hedef_stoga_isle(
  p_restaurant_id bigint,
  p_hedef_stok_tipi text,
  p_sevk_kalem_id uuid,
  p_miktar numeric,
  p_hedef_urun_id text,
  p_sevk_id uuid,
  p_sevk_no text,
  p_kaynak_adi text
)
returns text
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_kalem public.depo_sevk_kalemleri%rowtype;
  v_eslesme public.depo_urun_eslesmeleri%rowtype;
  v_market public.market_urunleri%rowtype;
  v_menu public.menu_urunleri%rowtype;
  v_malzeme public.stok_malzemeleri%rowtype;
  v_grup_id uuid;
  v_hedef_id text := nullif(trim(p_hedef_urun_id), '');
  v_hedef_barkod text;
  v_onceki numeric(14,3);
  v_sonraki numeric(14,3);
  v_maliyet numeric(14,2);
  v_hedef_adi text;
begin
  if coalesce(p_miktar, 0) <= 0 then return null; end if;

  select * into v_kalem
  from public.depo_sevk_kalemleri
  where id = p_sevk_kalem_id
    and hedef_restaurant_id = p_restaurant_id;
  if not found then raise exception 'Teslim alınacak sevk kalemi bulunamadı.'; end if;

  if v_hedef_id is null then
    select * into v_eslesme
    from public.depo_urun_eslesmeleri
    where kaynak_depo_urun_id = v_kalem.depo_urun_id
      and hedef_restaurant_id = p_restaurant_id
      and hedef_stok_tipi = p_hedef_stok_tipi;
    if found then v_hedef_id := v_eslesme.hedef_urun_id; end if;
  end if;

  if p_hedef_stok_tipi = 'Market' then
    if v_hedef_id is not null then
      select * into v_market from public.market_urunleri
      where id = v_hedef_id::uuid and restaurant_id = p_restaurant_id
      for update;
    end if;

    if not found then
      v_hedef_barkod := coalesce(nullif(trim(v_kalem.barkod), ''), 'DP' || upper(substr(replace(v_kalem.depo_urun_id::text, '-', ''), 1, 11)));
      select * into v_market from public.market_urunleri
      where restaurant_id = p_restaurant_id
        and (barkod = v_hedef_barkod or lower(trim(urun_adi)) = lower(trim(v_kalem.urun_adi)))
      order by case when barkod = v_hedef_barkod then 0 else 1 end
      limit 1 for update;
    end if;

    if not found then
      select id into v_grup_id from public.market_gruplari
      where restaurant_id = p_restaurant_id and lower(trim(grup_adi)) = lower('Depo Sevkleri') limit 1;
      if v_grup_id is null then
        begin
          insert into public.market_gruplari (restaurant_id, grup_adi, satis_ekraninda_goster, sira, kdv_orani)
          values (p_restaurant_id, 'Depo Sevkleri', false, 999, 20)
          returning id into v_grup_id;
        exception when unique_violation then
          select id into v_grup_id from public.market_gruplari
          where restaurant_id = p_restaurant_id and lower(trim(grup_adi)) = lower('Depo Sevkleri') limit 1;
        end;
      end if;

      insert into public.market_urunleri (
        restaurant_id, barkod, urun_adi, stok_kodu, kategori, grup_id,
        birim, kdv_orani, alis_fiyati, satis_fiyati, stok_miktari,
        minimum_stok, aktif
      ) values (
        p_restaurant_id, v_hedef_barkod, v_kalem.urun_adi, v_kalem.stok_kodu,
        'Depo Sevkleri', v_grup_id, v_kalem.birim, 20,
        v_kalem.birim_maliyet, 0, 0, 0, true
      ) returning * into v_market;
    end if;

    v_onceki := coalesce(v_market.stok_miktari, 0);
    v_sonraki := v_onceki + p_miktar;
    v_maliyet := round((greatest(v_onceki, 0) * coalesce(v_market.alis_fiyati, 0)
      + p_miktar * coalesce(v_kalem.birim_maliyet, 0)) / (greatest(v_onceki, 0) + p_miktar), 2);
    update public.market_urunleri set stok_miktari = v_sonraki, alis_fiyati = v_maliyet, updated_at = now()
    where id = v_market.id;
    insert into public.market_stok_hareketleri (
      restaurant_id, urun_id, hareket_tipi, miktar, onceki_stok, sonraki_stok,
      kaynak_tipi, kaynak_id, aciklama, created_by
    ) values (
      p_restaurant_id, v_market.id, 'Depo Sevki', p_miktar, v_onceki, v_sonraki,
      'depo_sevki', p_sevk_id::text, p_sevk_no || ' · ' || p_kaynak_adi, auth.uid()
    );
    v_hedef_id := v_market.id::text;
    v_hedef_adi := v_market.urun_adi;

  elsif p_hedef_stok_tipi = 'Restoran Ürünü' then
    if v_hedef_id is not null then
      select * into v_menu from public.menu_urunleri
      where id = v_hedef_id::bigint and restaurant_id = p_restaurant_id
      for update;
    end if;
    if not found then
      select * into v_menu from public.menu_urunleri
      where restaurant_id = p_restaurant_id and lower(trim(ad)) = lower(trim(v_kalem.urun_adi))
      limit 1 for update;
    end if;
    if not found then
      raise exception '% için hedef restoran satış ürünü seçilmelidir.', v_kalem.urun_adi;
    end if;

    v_onceki := coalesce(v_menu.stok_adedi, 0);
    v_sonraki := v_onceki + p_miktar;
    v_maliyet := round((greatest(v_onceki, 0) * coalesce(v_menu.maliyet, 0)
      + p_miktar * coalesce(v_kalem.birim_maliyet, 0)) / (greatest(v_onceki, 0) + p_miktar), 2);
    update public.menu_urunleri
    set stok_adedi = v_sonraki, stok_takip = true, maliyet = v_maliyet
    where id = v_menu.id;
    insert into public.stok_hareketleri (restaurant_id, urun_id, tip, miktar, aciklama)
    values (p_restaurant_id, v_menu.id, 'Depo Sevki Ürün Giriş', p_miktar, p_sevk_no || ' · ' || p_kaynak_adi);
    v_hedef_id := v_menu.id::text;
    v_hedef_adi := v_menu.ad;

  else
    if v_hedef_id is not null then
      select * into v_malzeme from public.stok_malzemeleri
      where id = v_hedef_id::bigint and restaurant_id = p_restaurant_id
      for update;
    end if;
    if not found then
      select * into v_malzeme from public.stok_malzemeleri
      where restaurant_id = p_restaurant_id and lower(trim(ad)) = lower(trim(v_kalem.urun_adi))
      limit 1 for update;
    end if;
    if found then
      v_onceki := coalesce(v_malzeme.stok_miktari, 0);
      v_sonraki := v_onceki + p_miktar;
      v_maliyet := round((greatest(v_onceki, 0) * coalesce(v_malzeme.birim_maliyet, 0)
        + p_miktar * coalesce(v_kalem.birim_maliyet, 0)) / (greatest(v_onceki, 0) + p_miktar), 2);
      update public.stok_malzemeleri
      set stok_miktari = v_sonraki, birim_maliyet = v_maliyet, updated_at = now()
      where id = v_malzeme.id;
    else
      v_onceki := 0;
      v_sonraki := p_miktar;
      insert into public.stok_malzemeleri (
        restaurant_id, ad, birim, stok_miktari, kritik_miktar, birim_maliyet
      ) values (
        p_restaurant_id, v_kalem.urun_adi, lower(v_kalem.birim), p_miktar, 0, v_kalem.birim_maliyet
      ) returning * into v_malzeme;
    end if;
    insert into public.stok_hareketleri (restaurant_id, malzeme_id, tip, miktar, aciklama)
    values (p_restaurant_id, v_malzeme.id, 'Depo Sevki Giriş', p_miktar, p_sevk_no || ' · ' || p_kaynak_adi);
    v_hedef_id := v_malzeme.id::text;
    v_hedef_adi := v_malzeme.ad;
  end if;

  insert into public.depo_urun_eslesmeleri (
    kaynak_depo_urun_id, hedef_restaurant_id, hedef_stok_tipi,
    hedef_urun_id, hedef_urun_adi, created_by, updated_at
  ) values (
    v_kalem.depo_urun_id, p_restaurant_id, p_hedef_stok_tipi,
    v_hedef_id, v_hedef_adi, auth.uid(), now()
  ) on conflict (kaynak_depo_urun_id, hedef_restaurant_id, hedef_stok_tipi)
  do update set hedef_urun_id = excluded.hedef_urun_id,
    hedef_urun_adi = excluded.hedef_urun_adi, updated_at = now();

  return v_hedef_id;
end;
$$;

create or replace function public.depo_sevkini_kismi_teslim_al(
  p_restaurant_id bigint,
  p_sevk_id uuid,
  p_kalemler jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_sevk public.depo_sevkleri%rowtype;
  v_kalem public.depo_sevk_kalemleri%rowtype;
  v_giris jsonb;
  v_teslim numeric(14,3);
  v_hasarli numeric(14,3);
  v_eksik numeric(14,3);
  v_hedef_urun_id text;
  v_tam_teslim boolean := true;
  v_fark_sayisi integer := 0;
begin
  if not private.integra_depo_yetkisi_var(p_restaurant_id) then
    raise exception 'Bu işletme için sevk teslim alma yetkiniz yok.';
  end if;

  select * into v_sevk
  from public.depo_sevkleri
  where id = p_sevk_id and hedef_restaurant_id = p_restaurant_id
  for update;
  if not found then raise exception 'Bu işletmeye ait sevk kaydı bulunamadı.'; end if;

  if v_sevk.durum in ('Teslim Alındı', 'Kısmi Teslim') then
    return jsonb_build_object(
      'sevk_id', v_sevk.id,
      'durum', v_sevk.durum,
      'hedef_stok_tipi', v_sevk.hedef_stok_tipi,
      'tekrarlandi', true
    );
  end if;
  if v_sevk.durum <> 'Yolda' then raise exception 'Yalnızca yoldaki sevk teslim alınabilir.'; end if;
  if jsonb_typeof(p_kalemler) <> 'array' then raise exception 'Teslim kalemleri geçersiz.'; end if;

  for v_kalem in
    select * from public.depo_sevk_kalemleri
    where sevk_id = p_sevk_id order by created_at
  loop
    select value into v_giris
    from jsonb_array_elements(p_kalemler)
    where value ->> 'kalem_id' = v_kalem.id::text
    limit 1;
    if v_giris is null then raise exception '% için teslim miktarı girilmedi.', v_kalem.urun_adi; end if;

    v_teslim := coalesce((v_giris ->> 'teslim_alinan_miktar')::numeric, 0);
    v_hasarli := coalesce((v_giris ->> 'hasarli_miktar')::numeric, 0);
    v_hedef_urun_id := nullif(trim(v_giris ->> 'hedef_urun_id'), '');
    if v_teslim < 0 or v_hasarli < 0 or v_teslim + v_hasarli > v_kalem.miktar then
      raise exception '% için teslim/hasarlı miktar gönderilen miktarı aşamaz.', v_kalem.urun_adi;
    end if;
    v_eksik := v_kalem.miktar - v_teslim - v_hasarli;

    if v_teslim > 0 then
      perform private.depo_hedef_stoga_isle(
        p_restaurant_id, v_sevk.hedef_stok_tipi, v_kalem.id, v_teslim,
        v_hedef_urun_id, v_sevk.id, v_sevk.sevk_no, v_sevk.kaynak_adi
      );
    end if;

    update public.depo_sevk_kalemleri
    set teslim_alinan_miktar = v_teslim,
        hasarli_miktar = v_hasarli,
        eksik_miktar = v_eksik,
        teslim_notu = nullif(left(trim(v_giris ->> 'teslim_notu'), 500), '')
    where id = v_kalem.id;

    if v_hasarli > 0 or v_eksik > 0 then
      v_tam_teslim := false;
      v_fark_sayisi := v_fark_sayisi + 1;
      insert into public.depo_teslimat_farklari (
        restaurant_id, sevk_id, sevk_kalem_id, depo_urun_id, urun_adi,
        gonderilen_miktar, teslim_alinan_miktar, hasarli_miktar,
        eksik_miktar, aciklama, created_by
      ) values (
        p_restaurant_id, v_sevk.id, v_kalem.id, v_kalem.depo_urun_id,
        v_kalem.urun_adi, v_kalem.miktar, v_teslim, v_hasarli,
        v_eksik, nullif(left(trim(v_giris ->> 'teslim_notu'), 500), ''), auth.uid()
      ) on conflict (sevk_kalem_id)
      do update set teslim_alinan_miktar = excluded.teslim_alinan_miktar,
        hasarli_miktar = excluded.hasarli_miktar,
        eksik_miktar = excluded.eksik_miktar,
        aciklama = excluded.aciklama;
    end if;
  end loop;

  update public.depo_sevkleri
  set durum = case when v_tam_teslim then 'Teslim Alındı' else 'Kısmi Teslim' end,
      teslim_alan_kullanici = auth.uid(),
      teslim_tarihi = now()
  where id = v_sevk.id;

  return jsonb_build_object(
    'sevk_id', v_sevk.id,
    'durum', case when v_tam_teslim then 'Teslim Alındı' else 'Kısmi Teslim' end,
    'hedef_stok_tipi', v_sevk.hedef_stok_tipi,
    'fark_sayisi', v_fark_sayisi
  );
end;
$$;

-- Eski istemciler tam teslim RPC'sini kullanmaya devam edebilir.
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
  v_kalemler jsonb;
begin
  select jsonb_agg(jsonb_build_object(
    'kalem_id', k.id,
    'teslim_alinan_miktar', k.miktar,
    'hasarli_miktar', 0,
    'hedef_urun_id', null,
    'teslim_notu', null
  )) into v_kalemler
  from public.depo_sevk_kalemleri k
  join public.depo_sevkleri s on s.id = k.sevk_id
  where k.sevk_id = p_sevk_id
    and s.hedef_restaurant_id = p_restaurant_id;

  return public.depo_sevkini_kismi_teslim_al(p_restaurant_id, p_sevk_id, coalesce(v_kalemler, '[]'::jsonb));
end;
$$;

revoke all on function public.depo_sevk_talebi_olustur(bigint, bigint, text, text, jsonb) from public, anon;
revoke all on function public.depo_talebini_sevke_donustur(bigint, uuid) from public, anon;
revoke all on function public.depo_sevk_talebi_kapat(bigint, uuid, text, text) from public, anon;
revoke all on function public.depo_sevkini_kismi_teslim_al(bigint, uuid, jsonb) from public, anon;
revoke all on function public.depo_sevkini_teslim_al(bigint, uuid) from public, anon;
revoke all on function private.depo_hedef_stoga_isle(bigint, text, uuid, numeric, text, uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.depo_sevk_talebi_olustur(bigint, bigint, text, text, jsonb) to authenticated;
grant execute on function public.depo_talebini_sevke_donustur(bigint, uuid) to authenticated;
grant execute on function public.depo_sevk_talebi_kapat(bigint, uuid, text, text) to authenticated;
grant execute on function public.depo_sevkini_kismi_teslim_al(bigint, uuid, jsonb) to authenticated;
grant execute on function public.depo_sevkini_teslim_al(bigint, uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
