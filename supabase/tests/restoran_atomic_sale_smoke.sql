-- Restoran masa ödemesi atomik işlem testi.
-- Oluşturulan tüm kayıtlar en sonda ROLLBACK ile geri alınır.
begin;

do $$
declare
  v_restaurant_id bigint;
  v_auth_user_id uuid;
  v_urun_id bigint;
  v_masa_id bigint;
begin
  select r.id, r.auth_user_id
  into v_restaurant_id, v_auth_user_id
  from public.restaurants r
  where r.auth_user_id is not null
    and coalesce(r.parent_restaurant_id, r.id) = r.id
    and coalesce(r.rol, 'owner') = 'owner'
    and r.durum = 'Aktif'
  order by r.id
  limit 1;

  if v_restaurant_id is null then
    raise exception 'Atomik satış testi için aktif Auth owner hesabı bulunamadı.';
  end if;

  insert into public.gun_sonu_kilitleri (restaurant_id, tarih, kilitli, aciklama)
  values (v_restaurant_id, current_date, false, 'ROLLBACK atomik satış testi')
  on conflict (restaurant_id, tarih)
  do update set kilitli = false, aciklama = excluded.aciklama;

  insert into public.menu_urunleri (
    restaurant_id, ad, fiyat, kategori, menu_grubu,
    stok_takip, stok_adedi, aktif, satista_aktif, uretim_modu
  ) values (
    v_restaurant_id, 'ROLLBACK Atomik Satış Ürünü', 10, 'Test', 'Test',
    true, 10, true, true, 'manuel'
  ) returning id into v_urun_id;

  insert into public.masalar (
    restaurant_id, ad, dolu, tutar, brut_tutar, siparisler,
    odemeler, adisyon_acilis_saati, bolum
  ) values (
    v_restaurant_id, 'ROLLBACK Atomik Masa', true, 20, 20,
    jsonb_build_array(jsonb_build_object(
      'urunId', v_urun_id,
      'ad', 'ROLLBACK Atomik Satış Ürünü',
      'fiyat', 10,
      'adet', 2,
      'menuGrubu', 'Test'
    )),
    '[]'::jsonb, now(), 'Salon'
  ) returning id into v_masa_id;

  perform set_config('integra.test.restaurant_id', v_restaurant_id::text, true);
  perform set_config('integra.test.auth_user_id', v_auth_user_id::text, true);
  perform set_config('integra.test.urun_id', v_urun_id::text, true);
  perform set_config('integra.test.masa_id', v_masa_id::text, true);
  perform set_config('integra.test.kismi_key', gen_random_uuid()::text, true);
  perform set_config('integra.test.kapanis_key', gen_random_uuid()::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  v_restaurant_id bigint := current_setting('integra.test.restaurant_id')::bigint;
  v_masa_id bigint := current_setting('integra.test.masa_id')::bigint;
  v_sonuc jsonb;
  v_odeme_sayisi integer;
begin
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('integra.test.auth_user_id'),
    'role', 'authenticated',
    'email', 'atomik-satis-test@invalid.local'
  )::text, true);

  v_sonuc := public.restoran_adisyon_odeme_atomik(
    v_restaurant_id,
    v_masa_id,
    current_setting('integra.test.kismi_key')::uuid,
    jsonb_build_object('tip', 'Nakit', 'tutar', 5, 'alinanTutar', 5, 'paraUstu', 0),
    '[]'::jsonb
  );

  if coalesce((v_sonuc ->> 'kapandi')::boolean, true) then
    raise exception 'Kısmi ödeme adisyonu yanlışlıkla kapattı.';
  end if;
  if (v_sonuc ->> 'kalan')::numeric <> 15 then
    raise exception 'Kısmi ödeme sonrası kalan tutar 15 değil: %', v_sonuc ->> 'kalan';
  end if;

  -- Aynı anahtar tekrar kullanılırsa ikinci ödeme satırı eklenmemeli.
  perform public.restoran_adisyon_odeme_atomik(
    v_restaurant_id,
    v_masa_id,
    current_setting('integra.test.kismi_key')::uuid,
    jsonb_build_object('tip', 'Nakit', 'tutar', 5),
    '[]'::jsonb
  );

  select jsonb_array_length(coalesce(odemeler, '[]'::jsonb))
  into v_odeme_sayisi
  from public.masalar
  where id = v_masa_id;

  if v_odeme_sayisi <> 1 then
    raise exception 'Tekrarlanan kısmi ödeme iki kez işlendi. Ödeme sayısı: %', v_odeme_sayisi;
  end if;
end;
$$;

do $$
declare
  v_restaurant_id bigint := current_setting('integra.test.restaurant_id')::bigint;
  v_masa_id bigint := current_setting('integra.test.masa_id')::bigint;
  v_urun_id bigint := current_setting('integra.test.urun_id')::bigint;
  v_kapanis_key uuid := current_setting('integra.test.kapanis_key')::uuid;
  v_sonuc jsonb;
  v_satislar jsonb;
  v_stok numeric;
  v_satis_sayisi integer;
begin
  v_satislar := jsonb_build_array(jsonb_build_object(
    'adisyon_id', v_kapanis_key::text,
    'ad', 'ROLLBACK Atomik Satış Ürünü',
    'fiyat', 10,
    'adet', 2,
    'tarih', current_date,
    'odeme_tipi', 'Parçalı',
    'menu_grubu', 'Test',
    'departman', 'Mutfak',
    'kdv_orani', 10
  ));

  v_sonuc := public.restoran_adisyon_odeme_atomik(
    v_restaurant_id,
    v_masa_id,
    v_kapanis_key,
    jsonb_build_object('tip', 'Kredi Kartı', 'tutar', 15, 'alinanTutar', 15, 'paraUstu', 0),
    v_satislar
  );

  if not coalesce((v_sonuc ->> 'kapandi')::boolean, false) then
    raise exception 'Tam ödeme adisyonu kapatmadı.';
  end if;

  select stok_adedi into v_stok from public.menu_urunleri where id = v_urun_id;
  if v_stok <> 8 then
    raise exception 'İlk kapanışta stok 8 olmadı. Stok: %', v_stok;
  end if;

  select count(*) into v_satis_sayisi
  from public.satis_gecmisi
  where restaurant_id = v_restaurant_id and adisyon_id = v_kapanis_key::text;
  if v_satis_sayisi <> 1 then
    raise exception 'İlk kapanışta tek satış satırı oluşmadı. Satır: %', v_satis_sayisi;
  end if;

  -- Ağ tekrarı aynı sonucu döndürmeli; stok ve satış ikinci kez işlenmemeli.
  v_sonuc := public.restoran_adisyon_odeme_atomik(
    v_restaurant_id,
    v_masa_id,
    v_kapanis_key,
    jsonb_build_object('tip', 'Kredi Kartı', 'tutar', 15),
    v_satislar
  );
  if not coalesce((v_sonuc ->> 'tekrarlandi')::boolean, false) then
    raise exception 'Tekrarlanan kapanış idempotent yanıt vermedi.';
  end if;

  select stok_adedi into v_stok from public.menu_urunleri where id = v_urun_id;
  select count(*) into v_satis_sayisi
  from public.satis_gecmisi
  where restaurant_id = v_restaurant_id and adisyon_id = v_kapanis_key::text;
  if v_stok <> 8 or v_satis_sayisi <> 1 then
    raise exception 'Tekrarlanan kapanış stok veya satışı yeniden işledi. Stok: %, satış: %', v_stok, v_satis_sayisi;
  end if;
end;
$$;

reset role;
rollback;
