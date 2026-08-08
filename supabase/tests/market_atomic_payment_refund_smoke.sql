-- Market parcali odeme, cari, stok, iade ve gun sonu kilidi testi.
-- Tum test kayitlari ROLLBACK ile geri alinir.
begin;

do $$
declare
  v_restaurant_id bigint;
  v_auth_user_id uuid;
  v_grup_id uuid;
  v_urun_id uuid;
  v_cari_id bigint;
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
    raise exception 'Market testi icin aktif Auth owner hesabi bulunamadi.';
  end if;

  insert into public.gun_sonu_kilitleri (restaurant_id, tarih, kilitli, aciklama)
  values (v_restaurant_id, (now() at time zone 'Europe/Istanbul')::date, false, 'ROLLBACK market testi')
  on conflict (restaurant_id, tarih) do update
  set kilitli = false, aciklama = excluded.aciklama;

  insert into public.market_gruplari (restaurant_id, grup_adi, kdv_orani, sira)
  values (v_restaurant_id, 'ROLLBACK Market Grubu', 20, 9999)
  returning id into v_grup_id;

  insert into public.market_urunleri (
    restaurant_id, barkod, urun_adi, grup_id, kategori, birim, kdv_orani,
    alis_fiyati, satis_fiyati, stok_miktari, aktif
  ) values (
    v_restaurant_id, 'ROLLBACK-' || gen_random_uuid()::text,
    'ROLLBACK Market Urunu', v_grup_id, 'Test', 'Adet', 20,
    4, 10, 10, true
  ) returning id into v_urun_id;

  insert into public.cari_musteriler (restaurant_id, ad, bakiye, hareketler)
  values (v_restaurant_id, 'ROLLBACK Market Carisi', 0, '[]'::jsonb)
  returning id into v_cari_id;

  perform set_config('integra.test.restaurant_id', v_restaurant_id::text, true);
  perform set_config('integra.test.auth_user_id', v_auth_user_id::text, true);
  perform set_config('integra.test.urun_id', v_urun_id::text, true);
  perform set_config('integra.test.cari_id', v_cari_id::text, true);
  perform set_config('integra.test.satis_key', gen_random_uuid()::text, true);
  perform set_config('integra.test.iade_key', gen_random_uuid()::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  v_restaurant_id bigint := current_setting('integra.test.restaurant_id')::bigint;
  v_urun_id uuid := current_setting('integra.test.urun_id')::uuid;
  v_cari_id bigint := current_setting('integra.test.cari_id')::bigint;
  v_satis_key uuid := current_setting('integra.test.satis_key')::uuid;
  v_iade_key uuid := current_setting('integra.test.iade_key')::uuid;
  v_sonuc jsonb;
  v_satis_id uuid;
  v_satis_kalem_id uuid;
  v_stok numeric;
  v_bakiye numeric;
  v_satis_sayisi integer;
  v_iade_sayisi integer;
  v_hata_yakalandi boolean := false;
begin
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('integra.test.auth_user_id'),
    'role', 'authenticated',
    'email', 'market-atomic-test@invalid.local'
  )::text, true);

  v_sonuc := public.market_satis_kaydet_v2_atomik(
    v_restaurant_id,
    jsonb_build_array(jsonb_build_object(
      'id', v_urun_id::text,
      'adet', 2,
      'liste_fiyati', 10,
      'satis_fiyati', 10
    )),
    v_cari_id::text,
    v_satis_key,
    'tutar',
    0,
    jsonb_build_array(
      jsonb_build_object('tip', 'Nakit', 'tutar', 5),
      jsonb_build_object('tip', 'Cari / Veresiye', 'tutar', 15)
    )
  );
  v_satis_id := (v_sonuc ->> 'id')::uuid;
  v_satis_kalem_id := (v_sonuc -> 'market_satis_kalemleri' -> 0 ->> 'id')::uuid;

  select stok_miktari into v_stok from public.market_urunleri where id = v_urun_id;
  select bakiye into v_bakiye from public.cari_musteriler where id = v_cari_id;
  select count(*) into v_satis_sayisi from public.market_satislari
  where restaurant_id = v_restaurant_id and islem_anahtari = v_satis_key;

  if v_stok <> 8 or v_bakiye <> 15 or v_satis_sayisi <> 1
     or jsonb_array_length(v_sonuc -> 'odeme_dagilimi') <> 2 then
    raise exception 'Parcali satis sonucu yanlis. Stok: %, bakiye: %, satis: %', v_stok, v_bakiye, v_satis_sayisi;
  end if;

  perform public.market_satis_kaydet_v2_atomik(
    v_restaurant_id,
    jsonb_build_array(jsonb_build_object(
      'id', v_urun_id::text, 'adet', 2, 'liste_fiyati', 10, 'satis_fiyati', 10
    )),
    v_cari_id::text,
    v_satis_key,
    'tutar',
    0,
    jsonb_build_array(
      jsonb_build_object('tip', 'Nakit', 'tutar', 5),
      jsonb_build_object('tip', 'Cari / Veresiye', 'tutar', 15)
    )
  );

  select stok_miktari into v_stok from public.market_urunleri where id = v_urun_id;
  select bakiye into v_bakiye from public.cari_musteriler where id = v_cari_id;
  select count(*) into v_satis_sayisi from public.market_satislari
  where restaurant_id = v_restaurant_id and islem_anahtari = v_satis_key;
  if v_stok <> 8 or v_bakiye <> 15 or v_satis_sayisi <> 1 then
    raise exception 'Tekrarlanan satis yeniden islendi. Stok: %, bakiye: %, satis: %', v_stok, v_bakiye, v_satis_sayisi;
  end if;

  v_sonuc := public.market_satis_iade_v2_atomik(
    v_restaurant_id,
    v_satis_id,
    jsonb_build_array(jsonb_build_object('satis_kalem_id', v_satis_kalem_id, 'adet', 1)),
    'ROLLBACK parcali odeme iadesi',
    false,
    v_iade_key
  );

  select stok_miktari into v_stok from public.market_urunleri where id = v_urun_id;
  select bakiye into v_bakiye from public.cari_musteriler where id = v_cari_id;
  if v_stok <> 9 or v_bakiye <> 7.5 then
    raise exception 'Parcali odeme iadesi stok/cari sonucu yanlis. Stok: %, bakiye: %', v_stok, v_bakiye;
  end if;

  v_sonuc := public.market_satis_iade_v2_atomik(
    v_restaurant_id,
    v_satis_id,
    jsonb_build_array(jsonb_build_object('satis_kalem_id', v_satis_kalem_id, 'adet', 1)),
    'ROLLBACK parcali odeme iadesi',
    false,
    v_iade_key
  );

  select stok_miktari into v_stok from public.market_urunleri where id = v_urun_id;
  select bakiye into v_bakiye from public.cari_musteriler where id = v_cari_id;
  select count(*) into v_iade_sayisi from public.market_iadeleri
  where restaurant_id = v_restaurant_id and islem_anahtari = v_iade_key;
  if not coalesce((v_sonuc ->> 'tekrarlandi')::boolean, false)
     or v_stok <> 9 or v_bakiye <> 7.5 or v_iade_sayisi <> 1 then
    raise exception 'Tekrarlanan iade yeniden islendi. Stok: %, bakiye: %, iade: %', v_stok, v_bakiye, v_iade_sayisi;
  end if;

end;
$$;

reset role;

update public.gun_sonu_kilitleri
set kilitli = true
where restaurant_id = current_setting('integra.test.restaurant_id')::bigint
  and tarih = (now() at time zone 'Europe/Istanbul')::date;

set local role authenticated;

do $$
declare
  v_restaurant_id bigint := current_setting('integra.test.restaurant_id')::bigint;
  v_urun_id uuid := current_setting('integra.test.urun_id')::uuid;
  v_hata_yakalandi boolean := false;
begin
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('integra.test.auth_user_id'),
    'role', 'authenticated',
    'email', 'market-atomic-test@invalid.local'
  )::text, true);

  begin
    perform public.market_satis_kaydet_v2_atomik(
      v_restaurant_id,
      jsonb_build_array(jsonb_build_object(
        'id', v_urun_id::text, 'adet', 1, 'liste_fiyati', 10, 'satis_fiyati', 10
      )),
      null,
      gen_random_uuid(),
      'tutar',
      0,
      jsonb_build_array(jsonb_build_object('tip', 'Nakit', 'tutar', 10))
    );
  exception when others then
    if sqlerrm not like '%gün sonu kilitli%' then
      raise;
    end if;
    v_hata_yakalandi := true;
  end;

  if not v_hata_yakalandi then
    raise exception 'Gun sonu kilitliyken market satisi engellenmedi.';
  end if;
end;
$$;

reset role;
rollback;
