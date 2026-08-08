-- Restoran cari satış atomik işlem testi. Tüm kayıtlar ROLLBACK ile geri alınır.
begin;

do $$
declare
  v_restaurant_id bigint;
  v_auth_user_id uuid;
  v_urun_id bigint;
  v_masa_id bigint;
  v_cari_id bigint;
begin
  select r.id, r.auth_user_id into v_restaurant_id, v_auth_user_id
  from public.restaurants r
  where r.auth_user_id is not null
    and coalesce(r.parent_restaurant_id, r.id) = r.id
    and coalesce(r.rol, 'owner') = 'owner'
    and r.durum = 'Aktif'
  order by r.id limit 1;
  if v_restaurant_id is null then raise exception 'Cari satış testi için aktif Auth owner hesabı bulunamadı.'; end if;

  insert into public.gun_sonu_kilitleri (restaurant_id, tarih, kilitli, aciklama)
  values (v_restaurant_id, current_date, false, 'ROLLBACK cari satış testi')
  on conflict (restaurant_id, tarih) do update set kilitli = false, aciklama = excluded.aciklama;

  insert into public.menu_urunleri (
    restaurant_id, ad, fiyat, stok_takip, stok_adedi, maliyet, aktif, satista_aktif, uretim_modu
  ) values (
    v_restaurant_id, 'ROLLBACK Cari Satış Ürünü', 10, true, 10, 3, true, true, 'manuel'
  ) returning id into v_urun_id;

  insert into public.cari_musteriler (restaurant_id, ad, bakiye, hareketler)
  values (v_restaurant_id, 'ROLLBACK Cari Satış Müşterisi', 0, '[]'::jsonb)
  returning id into v_cari_id;

  insert into public.masalar (
    restaurant_id, ad, dolu, tutar, brut_tutar, siparisler, odemeler,
    adisyon_acilis_saati, bolum
  ) values (
    v_restaurant_id, 'ROLLBACK Cari Masa', true, 20, 20,
    jsonb_build_array(jsonb_build_object(
      'urunId', v_urun_id, 'ad', 'ROLLBACK Cari Satış Ürünü',
      'fiyat', 10, 'adet', 2, 'menuGrubu', 'Test'
    )),
    jsonb_build_array(jsonb_build_object('tip', 'Nakit', 'tutar', 5, 'tarih', now())),
    now(), 'Salon'
  ) returning id into v_masa_id;

  perform set_config('integra.test.restaurant_id', v_restaurant_id::text, true);
  perform set_config('integra.test.auth_user_id', v_auth_user_id::text, true);
  perform set_config('integra.test.urun_id', v_urun_id::text, true);
  perform set_config('integra.test.masa_id', v_masa_id::text, true);
  perform set_config('integra.test.cari_id', v_cari_id::text, true);
  perform set_config('integra.test.cari_key', gen_random_uuid()::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  v_restaurant_id bigint := current_setting('integra.test.restaurant_id')::bigint;
  v_urun_id bigint := current_setting('integra.test.urun_id')::bigint;
  v_masa_id bigint := current_setting('integra.test.masa_id')::bigint;
  v_cari_id bigint := current_setting('integra.test.cari_id')::bigint;
  v_key uuid := current_setting('integra.test.cari_key')::uuid;
  v_satislar jsonb;
  v_sonuc jsonb;
  v_stok numeric;
  v_bakiye numeric;
  v_satis_sayisi integer;
begin
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('integra.test.auth_user_id'),
    'role', 'authenticated',
    'email', 'cari-satis-test@invalid.local'
  )::text, true);

  v_satislar := jsonb_build_array(jsonb_build_object(
    'adisyon_id', v_key,
    'ad', 'ROLLBACK Cari Satış Ürünü',
    'fiyat', 10,
    'adet', 2,
    'tarih', current_date,
    'odeme_tipi', 'Parçalı',
    'menu_grubu', 'Test'
  ));

  v_sonuc := public.restoran_adisyon_cariye_atomik(
    v_restaurant_id, v_masa_id, v_key, v_cari_id, 15, v_satislar
  );
  if not coalesce((v_sonuc ->> 'kapandi')::boolean, false) then
    raise exception 'Cari satış masayı kapatmadı.';
  end if;

  select stok_adedi into v_stok from public.menu_urunleri where id = v_urun_id;
  select bakiye into v_bakiye from public.cari_musteriler where id = v_cari_id;
  select count(*) into v_satis_sayisi from public.satis_gecmisi
  where restaurant_id = v_restaurant_id and adisyon_id = v_key::text;
  if v_stok <> 8 or v_bakiye <> 15 or v_satis_sayisi <> 1 then
    raise exception 'Cari satış sonuçları yanlış. Stok: %, bakiye: %, satış: %', v_stok, v_bakiye, v_satis_sayisi;
  end if;

  v_sonuc := public.restoran_adisyon_cariye_atomik(
    v_restaurant_id, v_masa_id, v_key, v_cari_id, 15, v_satislar
  );
  select stok_adedi into v_stok from public.menu_urunleri where id = v_urun_id;
  select bakiye into v_bakiye from public.cari_musteriler where id = v_cari_id;
  select count(*) into v_satis_sayisi from public.satis_gecmisi
  where restaurant_id = v_restaurant_id and adisyon_id = v_key::text;
  if not coalesce((v_sonuc ->> 'tekrarlandi')::boolean, false)
     or v_stok <> 8 or v_bakiye <> 15 or v_satis_sayisi <> 1 then
    raise exception 'Tekrarlanan cari satış yeniden işlendi. Stok: %, bakiye: %, satış: %', v_stok, v_bakiye, v_satis_sayisi;
  end if;
end;
$$;

reset role;
rollback;
