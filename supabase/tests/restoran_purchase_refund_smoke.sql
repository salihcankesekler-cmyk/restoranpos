-- Restoran alış fişi ve iade atomik işlem testi.
-- Oluşturulan tüm kayıtlar en sonda ROLLBACK ile geri alınır.
begin;

do $$
declare
  v_restaurant_id bigint;
  v_auth_user_id uuid;
  v_urun_id bigint;
  v_malzeme_id bigint;
  v_cari_id bigint;
begin
  select r.id, r.auth_user_id
  into v_restaurant_id, v_auth_user_id
  from public.restaurants r
  where r.auth_user_id is not null
    and coalesce(r.parent_restaurant_id, r.id) = r.id
    and coalesce(r.rol, 'owner') = 'owner'
    and r.durum = 'Aktif'
  order by r.id limit 1;

  if v_restaurant_id is null then
    raise exception 'Alış/iade testi için aktif Auth owner hesabı bulunamadı.';
  end if;

  insert into public.gun_sonu_kilitleri (restaurant_id, tarih, kilitli, aciklama)
  values (v_restaurant_id, current_date, false, 'ROLLBACK alış/iade testi')
  on conflict (restaurant_id, tarih)
  do update set kilitli = false, aciklama = excluded.aciklama;

  insert into public.menu_urunleri (
    restaurant_id, ad, fiyat, kategori, menu_grubu,
    stok_takip, stok_adedi, maliyet, aktif, satista_aktif, uretim_modu
  ) values (
    v_restaurant_id, 'ROLLBACK Alış İade Ürünü', 10, 'Test', 'Test',
    true, 10, 2, true, true, 'manuel'
  ) returning id into v_urun_id;

  insert into public.stok_malzemeleri (
    restaurant_id, ad, birim, stok_miktari, kritik_miktar, birim_maliyet
  ) values (
    v_restaurant_id, 'ROLLBACK Alış Hammaddesi', 'adet', 5, 0, 4
  ) returning id into v_malzeme_id;

  insert into public.cari_musteriler (restaurant_id, ad, bakiye, hareketler)
  values (v_restaurant_id, 'ROLLBACK Test Tedarikçisi', 100, '[]'::jsonb)
  returning id into v_cari_id;

  perform set_config('integra.test.restaurant_id', v_restaurant_id::text, true);
  perform set_config('integra.test.auth_user_id', v_auth_user_id::text, true);
  perform set_config('integra.test.urun_id', v_urun_id::text, true);
  perform set_config('integra.test.malzeme_id', v_malzeme_id::text, true);
  perform set_config('integra.test.cari_id', v_cari_id::text, true);
  perform set_config('integra.test.alis_key', gen_random_uuid()::text, true);
  perform set_config('integra.test.iade_key', gen_random_uuid()::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  v_restaurant_id bigint := current_setting('integra.test.restaurant_id')::bigint;
  v_urun_id bigint := current_setting('integra.test.urun_id')::bigint;
  v_malzeme_id bigint := current_setting('integra.test.malzeme_id')::bigint;
  v_cari_id bigint := current_setting('integra.test.cari_id')::bigint;
  v_alis_key uuid := current_setting('integra.test.alis_key')::uuid;
  v_sonuc jsonb;
  v_fis_id uuid;
  v_urun_stok numeric;
  v_malzeme_stok numeric;
  v_urun_maliyet numeric;
  v_malzeme_maliyet numeric;
  v_cari_bakiye numeric;
  v_kalem_sayisi integer;
  v_gider_sayisi integer;
begin
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('integra.test.auth_user_id'),
    'role', 'authenticated',
    'email', 'alis-iade-test@invalid.local'
  )::text, true);

  v_sonuc := public.restoran_alis_fisi_atomik(
    v_restaurant_id,
    v_alis_key,
    jsonb_build_object(
      'cariMusteriId', v_cari_id,
      'tedarikci', 'ROLLBACK Test Tedarikçisi',
      'belgeNo', 'ROLLBACK-001',
      'odemeTipi', 'Cari / Vadeli',
      'giderKategorisi', 'Malzeme',
      'giderOlarakIslendi', true,
      'tarih', now()
    ),
    jsonb_build_array(
      jsonb_build_object(
        'kalemTipi', 'urun', 'urunId', v_urun_id,
        'malzemeAdi', 'ROLLBACK Alış İade Ürünü', 'birim', 'adet',
        'miktar', 2, 'birimFiyat', 4
      ),
      jsonb_build_object(
        'kalemTipi', 'malzeme', 'malzemeId', v_malzeme_id,
        'malzemeAdi', 'ROLLBACK Alış Hammaddesi', 'birim', 'adet',
        'miktar', 3, 'birimFiyat', 6
      )
    )
  );
  v_fis_id := (v_sonuc -> 'fis' ->> 'id')::uuid;

  select stok_adedi, maliyet into v_urun_stok, v_urun_maliyet
  from public.menu_urunleri where id = v_urun_id;
  select stok_miktari, birim_maliyet into v_malzeme_stok, v_malzeme_maliyet
  from public.stok_malzemeleri where id = v_malzeme_id;
  select bakiye into v_cari_bakiye from public.cari_musteriler where id = v_cari_id;
  select count(*) into v_kalem_sayisi from public.restoran_alis_fis_kalemleri where fis_id = v_fis_id;
  select count(*) into v_gider_sayisi from public.giderler
  where id = (v_sonuc -> 'fis' ->> 'gider_id')::bigint;

  if v_urun_stok <> 12 or v_malzeme_stok <> 8 then
    raise exception 'Alış stokları yanlış. Ürün: %, hammadde: %', v_urun_stok, v_malzeme_stok;
  end if;
  if v_urun_maliyet <> 2.33 or v_malzeme_maliyet <> 4.75 then
    raise exception 'Ağırlıklı maliyet yanlış. Ürün: %, hammadde: %', v_urun_maliyet, v_malzeme_maliyet;
  end if;
  if v_cari_bakiye <> 74 then
    raise exception 'Vadeli alış cari bakiyesi yanlış: %', v_cari_bakiye;
  end if;
  if v_kalem_sayisi <> 2 or v_gider_sayisi <> 1 then
    raise exception 'Alış fişi kalem/gider kaydı eksik. Kalem: %, gider: %', v_kalem_sayisi, v_gider_sayisi;
  end if;

  -- Aynı alış fişi tekrar çağrılırsa stok, cari ve gider ikinci kez işlenmemeli.
  v_sonuc := public.restoran_alis_fisi_atomik(
    v_restaurant_id,
    v_alis_key,
    jsonb_build_object('tedarikci', 'Tekrar', 'odemeTipi', 'Nakit'),
    jsonb_build_array(jsonb_build_object(
      'kalemTipi', 'urun', 'urunId', v_urun_id, 'miktar', 99, 'birimFiyat', 99
    ))
  );
  if not coalesce((v_sonuc ->> 'tekrarlandi')::boolean, false) then
    raise exception 'Tekrarlanan alış fişi idempotent yanıt vermedi.';
  end if;
  select stok_adedi into v_urun_stok from public.menu_urunleri where id = v_urun_id;
  select stok_miktari into v_malzeme_stok from public.stok_malzemeleri where id = v_malzeme_id;
  select bakiye into v_cari_bakiye from public.cari_musteriler where id = v_cari_id;
  if v_urun_stok <> 12 or v_malzeme_stok <> 8 or v_cari_bakiye <> 74 then
    raise exception 'Tekrarlanan alış fişi kayıtları yeniden işledi.';
  end if;
end;
$$;

do $$
declare
  v_restaurant_id bigint := current_setting('integra.test.restaurant_id')::bigint;
  v_urun_id bigint := current_setting('integra.test.urun_id')::bigint;
  v_iade_key uuid := current_setting('integra.test.iade_key')::uuid;
  v_sonuc jsonb;
  v_stok numeric;
  v_iade_sayisi integer;
begin
  v_sonuc := public.restoran_iade_kaydi_atomik(
    v_restaurant_id, v_iade_key, v_urun_id,
    'İade', 'ROLLBACK müşteri iadesi', 1, 10,
    'Test Kullanıcısı', true
  );
  if not coalesce((v_sonuc -> 'kayit' ->> 'stoga_iade_edildi')::boolean, false) then
    raise exception 'Stok iadeli kayıt stok işareti oluşturmadı.';
  end if;

  select stok_adedi into v_stok from public.menu_urunleri where id = v_urun_id;
  if v_stok <> 13 then raise exception 'İade ürünü stoğa geri eklemedi. Stok: %', v_stok; end if;

  perform public.restoran_iade_kaydi_atomik(
    v_restaurant_id, v_iade_key, v_urun_id,
    'İade', 'Tekrar', 1, 10, 'Test Kullanıcısı', true
  );
  select stok_adedi into v_stok from public.menu_urunleri where id = v_urun_id;
  select count(*) into v_iade_sayisi from public.iade_kayitlari
  where restaurant_id = v_restaurant_id and islem_anahtari = v_iade_key;
  if v_stok <> 13 or v_iade_sayisi <> 1 then
    raise exception 'Tekrarlanan iade stok veya kaydı yeniden işledi. Stok: %, kayıt: %', v_stok, v_iade_sayisi;
  end if;
end;
$$;

reset role;
rollback;
