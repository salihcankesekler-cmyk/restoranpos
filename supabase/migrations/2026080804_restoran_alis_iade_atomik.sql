-- Restoran alış fişini ve ürün iadesini stok/finans kayıtlarıyla birlikte
-- tek transaction içinde ve tekrar çağrılmaya dayanıklı biçimde işler.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.restoran_alis_fisleri (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  islem_anahtari uuid not null,
  cari_musteri_id bigint references public.cari_musteriler(id) on delete set null,
  tedarikci text not null,
  belge_no text,
  odeme_tipi text not null default 'Nakit',
  gider_kategorisi text not null default 'Malzeme',
  notu text,
  toplam numeric(14,2) not null default 0,
  gider_olarak_islendi boolean not null default true,
  gider_id bigint references public.giderler(id) on delete set null,
  tarih timestamptz not null default now(),
  durum text not null default 'Stoğa İşlendi',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (restaurant_id, islem_anahtari)
);

create table if not exists public.restoran_alis_fis_kalemleri (
  id uuid primary key default gen_random_uuid(),
  fis_id uuid not null references public.restoran_alis_fisleri(id) on delete cascade,
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  kalem_tipi text not null check (kalem_tipi in ('malzeme', 'urun')),
  malzeme_id bigint references public.stok_malzemeleri(id) on delete restrict,
  urun_id bigint references public.menu_urunleri(id) on delete restrict,
  kalem_adi text not null,
  birim text not null default 'adet',
  miktar numeric(14,3) not null check (miktar > 0),
  birim_fiyat numeric(14,2) not null default 0 check (birim_fiyat >= 0),
  toplam numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  check (
    (kalem_tipi = 'malzeme' and malzeme_id is not null and urun_id is null)
    or (kalem_tipi = 'urun' and urun_id is not null and malzeme_id is null)
  )
);

create index if not exists restoran_alis_fisleri_restaurant_tarih_idx
  on public.restoran_alis_fisleri (restaurant_id, tarih desc);
create index if not exists restoran_alis_fis_kalemleri_fis_idx
  on public.restoran_alis_fis_kalemleri (fis_id);

alter table public.restoran_alis_fisleri enable row level security;
alter table public.restoran_alis_fis_kalemleri enable row level security;

revoke all on table public.restoran_alis_fisleri from public, anon, authenticated;
revoke all on table public.restoran_alis_fis_kalemleri from public, anon, authenticated;
grant select on table public.restoran_alis_fisleri to authenticated;
grant select on table public.restoran_alis_fis_kalemleri to authenticated;
grant all on table public.restoran_alis_fisleri to service_role;
grant all on table public.restoran_alis_fis_kalemleri to service_role;

drop policy if exists restoran_alis_fisleri_select_tenant on public.restoran_alis_fisleri;
create policy restoran_alis_fisleri_select_tenant
on public.restoran_alis_fisleri for select to authenticated
using (
  restaurant_id = (select private.integra_restaurant_id())
  and private.integra_sekme_yetkisi_var(restaurant_id, 'receteler,stok,depo,raporlar,giderler')
);

drop policy if exists restoran_alis_fis_kalemleri_select_tenant on public.restoran_alis_fis_kalemleri;
create policy restoran_alis_fis_kalemleri_select_tenant
on public.restoran_alis_fis_kalemleri for select to authenticated
using (
  restaurant_id = (select private.integra_restaurant_id())
  and private.integra_sekme_yetkisi_var(restaurant_id, 'receteler,stok,depo,raporlar,giderler')
);

alter table public.iade_kayitlari
  add column if not exists islem_anahtari uuid,
  add column if not exists stoga_iade_edildi boolean not null default false;

revoke insert, update, delete on table public.iade_kayitlari from anon, authenticated;
grant select on table public.iade_kayitlari to authenticated;

create unique index if not exists iade_kayitlari_restaurant_islem_key
  on public.iade_kayitlari (restaurant_id, islem_anahtari)
  where islem_anahtari is not null;

create or replace function public.restoran_alis_fisi_atomik(
  p_restaurant_id bigint,
  p_islem_anahtari uuid,
  p_fis jsonb,
  p_kalemler jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_fis public.restoran_alis_fisleri%rowtype;
  v_kalem jsonb;
  v_kalem_tipi text;
  v_miktar numeric(14,3);
  v_birim_fiyat numeric(14,2);
  v_toplam numeric(14,2);
  v_hesaplanan_toplam numeric(14,2) := 0;
  v_malzeme public.stok_malzemeleri%rowtype;
  v_urun public.menu_urunleri%rowtype;
  v_yeni_stok numeric(14,3);
  v_yeni_maliyet numeric(14,2);
  v_cari public.cari_musteriler%rowtype;
  v_cari_id bigint;
  v_yeni_hareket jsonb;
  v_gider_id bigint;
  v_kalemler jsonb;
begin
  if p_islem_anahtari is null then raise exception 'Alış fişi işlem anahtarı zorunludur.'; end if;
  if not private.integra_sekme_yetkisi_var(p_restaurant_id, 'receteler,stok,depo') then
    raise exception 'Bu işletme için alış fişi kaydetme yetkiniz yok.';
  end if;
  if exists (
    select 1 from public.gun_sonu_kilitleri
    where restaurant_id = p_restaurant_id and tarih = current_date and kilitli = true
  ) then
    raise exception 'Bugünün gün sonu kilidi aktiftir.';
  end if;

  select * into v_fis from public.restoran_alis_fisleri
  where restaurant_id = p_restaurant_id and islem_anahtari = p_islem_anahtari;
  if found then
    select coalesce(jsonb_agg(to_jsonb(k) order by k.created_at), '[]'::jsonb)
    into v_kalemler from public.restoran_alis_fis_kalemleri k where k.fis_id = v_fis.id;
    return jsonb_build_object('fis', to_jsonb(v_fis), 'kalemler', v_kalemler, 'tekrarlandi', true);
  end if;

  if jsonb_typeof(p_kalemler) <> 'array' or jsonb_array_length(p_kalemler) = 0 then
    raise exception 'Alış fişine en az bir kalem eklenmelidir.';
  end if;

  v_cari_id := nullif(p_fis ->> 'cariMusteriId', '')::bigint;
  if v_cari_id is not null and not exists (
    select 1 from public.cari_musteriler
    where id = v_cari_id and restaurant_id = p_restaurant_id
  ) then
    raise exception 'Alış fişinde seçilen cari bu işletmeye ait değil.';
  end if;

  for v_kalem in select kalem.value from jsonb_array_elements(p_kalemler) as kalem(value)
  loop
    v_miktar := round(coalesce((v_kalem ->> 'miktar')::numeric, 0), 3);
    v_birim_fiyat := round(greatest(coalesce((v_kalem ->> 'birimFiyat')::numeric, 0), 0), 2);
    if v_miktar <= 0 then raise exception 'Alış fişi kalem miktarı sıfırdan büyük olmalıdır.'; end if;
    v_hesaplanan_toplam := v_hesaplanan_toplam + round(v_miktar * v_birim_fiyat, 2);
  end loop;
  v_hesaplanan_toplam := round(v_hesaplanan_toplam, 2);

  insert into public.restoran_alis_fisleri (
    restaurant_id, islem_anahtari, cari_musteri_id, tedarikci,
    belge_no, odeme_tipi, gider_kategorisi, notu, toplam,
    gider_olarak_islendi, tarih, durum, created_by
  ) values (
    p_restaurant_id,
    p_islem_anahtari,
    v_cari_id,
    left(coalesce(nullif(trim(p_fis ->> 'tedarikci'), ''), 'Tedarikçi belirtilmedi'), 250),
    nullif(left(trim(p_fis ->> 'belgeNo'), 150), ''),
    left(coalesce(nullif(trim(p_fis ->> 'odemeTipi'), ''), 'Nakit'), 100),
    left(coalesce(nullif(trim(p_fis ->> 'giderKategorisi'), ''), 'Malzeme'), 100),
    nullif(left(p_fis ->> 'notu', 1000), ''),
    v_hesaplanan_toplam,
    coalesce((p_fis ->> 'giderOlarakIslendi')::boolean, true),
    coalesce(nullif(p_fis ->> 'tarih', '')::timestamptz, now()),
    'Stoğa İşlendi',
    auth.uid()
  )
  on conflict (restaurant_id, islem_anahtari) do nothing
  returning * into v_fis;

  if not found then
    select * into v_fis from public.restoran_alis_fisleri
    where restaurant_id = p_restaurant_id and islem_anahtari = p_islem_anahtari;
    select coalesce(jsonb_agg(to_jsonb(k) order by k.created_at), '[]'::jsonb)
    into v_kalemler from public.restoran_alis_fis_kalemleri k where k.fis_id = v_fis.id;
    return jsonb_build_object('fis', to_jsonb(v_fis), 'kalemler', v_kalemler, 'tekrarlandi', true);
  end if;

  for v_kalem in select kalem.value from jsonb_array_elements(p_kalemler) as kalem(value)
  loop
    v_kalem_tipi := lower(coalesce(nullif(trim(v_kalem ->> 'kalemTipi'), ''), 'malzeme'));
    v_miktar := round(coalesce((v_kalem ->> 'miktar')::numeric, 0), 3);
    v_birim_fiyat := round(greatest(coalesce((v_kalem ->> 'birimFiyat')::numeric, 0), 0), 2);
    v_toplam := round(v_miktar * v_birim_fiyat, 2);

    if v_kalem_tipi = 'urun' then
      select * into v_urun from public.menu_urunleri
      where id = nullif(v_kalem ->> 'urunId', '')::bigint and restaurant_id = p_restaurant_id
      for update;
      if not found then raise exception '% satış ürünü bulunamadı.', coalesce(v_kalem ->> 'malzemeAdi', 'Seçilen'); end if;

      v_yeni_stok := round(coalesce(v_urun.stok_adedi, 0) + v_miktar, 3);
      v_yeni_maliyet := case when v_birim_fiyat > 0 and v_yeni_stok > 0 then
        round((greatest(coalesce(v_urun.stok_adedi, 0), 0) * coalesce(v_urun.maliyet, 0)
          + v_miktar * v_birim_fiyat) / (greatest(coalesce(v_urun.stok_adedi, 0), 0) + v_miktar), 2)
        else coalesce(v_urun.maliyet, 0) end;
      update public.menu_urunleri
      set stok_takip = true, stok_adedi = v_yeni_stok, maliyet = v_yeni_maliyet
      where id = v_urun.id;
      insert into public.stok_hareketleri (restaurant_id, urun_id, tip, miktar, aciklama)
      values (p_restaurant_id, v_urun.id, 'Alış Girişi', v_miktar,
        'Alış fişi ' || coalesce(nullif(p_fis ->> 'belgeNo', ''), v_fis.id::text) || ' - ' || v_fis.tedarikci);

      insert into public.restoran_alis_fis_kalemleri (
        fis_id, restaurant_id, kalem_tipi, urun_id, kalem_adi,
        birim, miktar, birim_fiyat, toplam
      ) values (
        v_fis.id, p_restaurant_id, 'urun', v_urun.id, v_urun.ad,
        coalesce(nullif(v_kalem ->> 'birim', ''), 'adet'), v_miktar, v_birim_fiyat, v_toplam
      );
    elsif v_kalem_tipi = 'malzeme' then
      select * into v_malzeme from public.stok_malzemeleri
      where id = nullif(v_kalem ->> 'malzemeId', '')::bigint and restaurant_id = p_restaurant_id
      for update;
      if not found then raise exception '% hammaddesi bulunamadı.', coalesce(v_kalem ->> 'malzemeAdi', 'Seçilen'); end if;

      v_yeni_stok := round(coalesce(v_malzeme.stok_miktari, 0) + v_miktar, 3);
      v_yeni_maliyet := case when v_birim_fiyat > 0 and v_yeni_stok > 0 then
        round((greatest(coalesce(v_malzeme.stok_miktari, 0), 0) * coalesce(v_malzeme.birim_maliyet, 0)
          + v_miktar * v_birim_fiyat) / (greatest(coalesce(v_malzeme.stok_miktari, 0), 0) + v_miktar), 2)
        else coalesce(v_malzeme.birim_maliyet, 0) end;
      update public.stok_malzemeleri
      set stok_miktari = v_yeni_stok, birim_maliyet = v_yeni_maliyet, updated_at = now()
      where id = v_malzeme.id;
      insert into public.stok_hareketleri (restaurant_id, malzeme_id, tip, miktar, aciklama)
      values (p_restaurant_id, v_malzeme.id, 'Alış Girişi', v_miktar,
        'Alış fişi ' || coalesce(nullif(p_fis ->> 'belgeNo', ''), v_fis.id::text) || ' - ' || v_fis.tedarikci);

      insert into public.restoran_alis_fis_kalemleri (
        fis_id, restaurant_id, kalem_tipi, malzeme_id, kalem_adi,
        birim, miktar, birim_fiyat, toplam
      ) values (
        v_fis.id, p_restaurant_id, 'malzeme', v_malzeme.id, v_malzeme.ad,
        coalesce(nullif(v_kalem ->> 'birim', ''), v_malzeme.birim), v_miktar, v_birim_fiyat, v_toplam
      );
    else
      raise exception 'Geçersiz alış fişi kalem tipi: %', v_kalem_tipi;
    end if;
  end loop;

  if v_fis.gider_olarak_islendi and v_fis.toplam > 0 then
    insert into public.giderler (restaurant_id, tarih, kategori, aciklama, tutar)
    values (
      p_restaurant_id, v_fis.tarih::date, v_fis.gider_kategorisi,
      'Alış fişi' || coalesce(' ' || nullif(v_fis.belge_no, ''), '') || ' - ' || v_fis.tedarikci,
      v_fis.toplam
    ) returning id into v_gider_id;
    update public.restoran_alis_fisleri set gider_id = v_gider_id where id = v_fis.id returning * into v_fis;
  end if;

  if v_fis.cari_musteri_id is not null and v_fis.odeme_tipi = 'Cari / Vadeli' and v_fis.toplam > 0 then
    select * into v_cari from public.cari_musteriler
    where id = v_fis.cari_musteri_id and restaurant_id = p_restaurant_id
    for update;
    if not found then raise exception 'Alış fişinde seçilen cari bulunamadı.'; end if;

    v_yeni_hareket := jsonb_build_object(
      'id', gen_random_uuid(),
      'tip', 'Alacak',
      'tutar', v_fis.toplam,
      'aciklama', 'Alış fişi' || coalesce(' ' || nullif(v_fis.belge_no, ''), '') || ' - ' || v_fis.tedarikci,
      'tarih', now(),
      'odeme_tipi', null,
      'bakiye_etkisi', -v_fis.toplam,
      'kaynak_tipi', 'restoran_alis_fisi',
      'kaynak_id', v_fis.id
    );
    update public.cari_musteriler
    set bakiye = coalesce(bakiye, 0) - v_fis.toplam,
        hareketler = jsonb_build_array(v_yeni_hareket) || coalesce(hareketler, '[]'::jsonb)
    where id = v_cari.id;
  end if;

  select coalesce(jsonb_agg(to_jsonb(k) order by k.created_at), '[]'::jsonb)
  into v_kalemler from public.restoran_alis_fis_kalemleri k where k.fis_id = v_fis.id;
  return jsonb_build_object('fis', to_jsonb(v_fis), 'kalemler', v_kalemler, 'tekrarlandi', false);
end;
$$;

create or replace function public.restoran_iade_kaydi_atomik(
  p_restaurant_id bigint,
  p_islem_anahtari uuid,
  p_urun_id bigint,
  p_tip text,
  p_sebep text,
  p_adet numeric,
  p_tutar numeric,
  p_kullanici_adi text,
  p_stoga_iade boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_kayit public.iade_kayitlari%rowtype;
  v_urun public.menu_urunleri%rowtype;
  v_adet numeric(14,3) := round(coalesce(p_adet, 0), 3);
  v_stoga_iade boolean := false;
begin
  if p_islem_anahtari is null then raise exception 'İade işlem anahtarı zorunludur.'; end if;
  if not private.integra_sekme_yetkisi_var(p_restaurant_id, 'iadeler,kasa,raporlar') then
    raise exception 'Bu işletme için iade/ikram kaydetme yetkiniz yok.';
  end if;
  if exists (
    select 1 from public.gun_sonu_kilitleri
    where restaurant_id = p_restaurant_id and tarih = current_date and kilitli = true
  ) then
    raise exception 'Bugünün gün sonu kilidi aktiftir.';
  end if;
  if v_adet <= 0 then raise exception 'İade/ikram adedi sıfırdan büyük olmalıdır.'; end if;

  select * into v_kayit from public.iade_kayitlari
  where restaurant_id = p_restaurant_id and islem_anahtari = p_islem_anahtari;
  if found then return jsonb_build_object('kayit', to_jsonb(v_kayit), 'tekrarlandi', true); end if;

  select * into v_urun from public.menu_urunleri
  where id = p_urun_id and restaurant_id = p_restaurant_id
  for update;
  if not found then raise exception 'İade/ikram ürünü bulunamadı.'; end if;

  v_stoga_iade := coalesce(p_stoga_iade, false)
    and lower(trim(coalesce(p_tip, ''))) = lower('İade')
    and coalesce(v_urun.stok_takip, false)
    and coalesce(v_urun.uretim_modu, 'manuel') <> 'satisla_uretim';

  insert into public.iade_kayitlari (
    restaurant_id, tarih, tip, sebep, urun_id, urun_adi,
    adet, tutar, kullanici_adi, islem_anahtari, stoga_iade_edildi
  ) values (
    p_restaurant_id, current_date,
    left(coalesce(nullif(trim(p_tip), ''), 'İade'), 100),
    nullif(left(p_sebep, 500), ''),
    v_urun.id, v_urun.ad, v_adet, round(greatest(coalesce(p_tutar, 0), 0), 2),
    nullif(left(p_kullanici_adi, 200), ''), p_islem_anahtari, v_stoga_iade
  )
  on conflict (restaurant_id, islem_anahtari) where islem_anahtari is not null do nothing
  returning * into v_kayit;

  if not found then
    select * into v_kayit from public.iade_kayitlari
    where restaurant_id = p_restaurant_id and islem_anahtari = p_islem_anahtari;
    return jsonb_build_object('kayit', to_jsonb(v_kayit), 'tekrarlandi', true);
  end if;

  if v_stoga_iade then
    update public.menu_urunleri
    set stok_adedi = round(coalesce(stok_adedi, 0) + v_adet, 3)
    where id = v_urun.id;
    insert into public.stok_hareketleri (restaurant_id, urun_id, tip, miktar, aciklama)
    values (p_restaurant_id, v_urun.id, 'İade Girişi', v_adet,
      v_urun.ad || ' müşteri iadesi stoğa geri alındı');
  end if;

  return jsonb_build_object(
    'kayit', to_jsonb(v_kayit),
    'stok', case when v_stoga_iade then coalesce(v_urun.stok_adedi, 0) + v_adet else v_urun.stok_adedi end,
    'tekrarlandi', false
  );
end;
$$;

revoke all on function public.restoran_alis_fisi_atomik(bigint, uuid, jsonb, jsonb)
  from public, anon;
revoke all on function public.restoran_iade_kaydi_atomik(bigint, uuid, bigint, text, text, numeric, numeric, text, boolean)
  from public, anon;
grant execute on function public.restoran_alis_fisi_atomik(bigint, uuid, jsonb, jsonb)
  to authenticated;
grant execute on function public.restoran_iade_kaydi_atomik(bigint, uuid, bigint, text, text, numeric, numeric, text, boolean)
  to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'restoran_alis_fisleri'
     ) then
    alter publication supabase_realtime add table public.restoran_alis_fisleri;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
