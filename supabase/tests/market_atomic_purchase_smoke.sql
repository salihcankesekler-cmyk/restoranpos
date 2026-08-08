-- Market alis faturasi kayit, duzenleme, tekrar ve silme testi.
-- Tum test kayitlari ROLLBACK ile geri alinir.
begin;

do $$
declare
  v_restaurant_id bigint;
  v_auth_user_id uuid;
  v_grup_id uuid;
  v_urun_id uuid;
  v_cari_1 bigint;
  v_cari_2 bigint;
begin
  select r.id, r.auth_user_id into v_restaurant_id, v_auth_user_id
  from public.restaurants r
  where r.auth_user_id is not null
    and coalesce(r.parent_restaurant_id, r.id) = r.id
    and coalesce(r.rol, 'owner') = 'owner'
    and r.durum = 'Aktif'
  order by r.id limit 1;
  if v_restaurant_id is null then raise exception 'Market alis testi icin owner bulunamadi.'; end if;

  insert into public.gun_sonu_kilitleri (restaurant_id, tarih, kilitli, aciklama)
  values (v_restaurant_id, current_date, false, 'ROLLBACK market alis testi')
  on conflict (restaurant_id, tarih) do update set kilitli = false, aciklama = excluded.aciklama;

  insert into public.market_gruplari (restaurant_id, grup_adi, sira)
  values (v_restaurant_id, 'ROLLBACK Alis Grubu', 9997)
  returning id into v_grup_id;

  insert into public.market_urunleri (
    restaurant_id, barkod, urun_adi, grup_id, kategori, kdv_orani,
    alis_fiyati, satis_fiyati, stok_miktari, aktif
  ) values (
    v_restaurant_id, 'ROLLBACK-' || gen_random_uuid()::text,
    'ROLLBACK Alis Urunu', v_grup_id, 'Test', 20, 4, 10, 10, true
  ) returning id into v_urun_id;

  insert into public.cari_musteriler (restaurant_id, ad, bakiye, hareketler)
  values (v_restaurant_id, 'ROLLBACK Tedarikci Bir', 0, '[]'::jsonb)
  returning id into v_cari_1;
  insert into public.cari_musteriler (restaurant_id, ad, bakiye, hareketler)
  values (v_restaurant_id, 'ROLLBACK Tedarikci Iki', 0, '[]'::jsonb)
  returning id into v_cari_2;

  perform set_config('integra.test.restaurant_id', v_restaurant_id::text, true);
  perform set_config('integra.test.auth_user_id', v_auth_user_id::text, true);
  perform set_config('integra.test.urun_id', v_urun_id::text, true);
  perform set_config('integra.test.cari_1', v_cari_1::text, true);
  perform set_config('integra.test.cari_2', v_cari_2::text, true);
  perform set_config('integra.test.alis_key_1', gen_random_uuid()::text, true);
  perform set_config('integra.test.alis_key_2', gen_random_uuid()::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  v_restaurant_id bigint := current_setting('integra.test.restaurant_id')::bigint;
  v_urun_id uuid := current_setting('integra.test.urun_id')::uuid;
  v_cari_1 bigint := current_setting('integra.test.cari_1')::bigint;
  v_cari_2 bigint := current_setting('integra.test.cari_2')::bigint;
  v_key_1 uuid := current_setting('integra.test.alis_key_1')::uuid;
  v_key_2 uuid := current_setting('integra.test.alis_key_2')::uuid;
  v_sonuc jsonb;
  v_fatura_id uuid;
  v_stok numeric;
  v_maliyet numeric;
  v_bakiye_1 numeric;
  v_bakiye_2 numeric;
  v_fatura_sayisi integer;
  v_kalem_sayisi integer;
begin
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('integra.test.auth_user_id'),
    'role', 'authenticated',
    'email', 'market-purchase-test@invalid.local'
  )::text, true);

  v_sonuc := public.market_alis_faturasi_kaydet_atomik(
    v_restaurant_id, null, v_cari_1::text, null, 'ROLLBACK-001', current_date,
    jsonb_build_array(jsonb_build_object(
      'id', v_urun_id::text, 'miktar', 2, 'alis_fiyati', 6, 'kdv_orani', 20
    )),
    v_key_1
  );
  v_fatura_id := (v_sonuc ->> 'id')::uuid;

  select stok_miktari, alis_fiyati into v_stok, v_maliyet
  from public.market_urunleri where id = v_urun_id;
  select bakiye into v_bakiye_1 from public.cari_musteriler where id = v_cari_1;
  select count(*) into v_fatura_sayisi from public.market_alis_faturalari
  where restaurant_id = v_restaurant_id and id = v_fatura_id;
  select count(*) into v_kalem_sayisi from public.market_alis_fatura_kalemleri
  where restaurant_id = v_restaurant_id and fatura_id = v_fatura_id;
  if v_stok <> 12 or v_maliyet <> 6 or v_bakiye_1 <> -12
     or v_fatura_sayisi <> 1 or v_kalem_sayisi <> 1
     or (v_sonuc ->> 'genel_toplam')::numeric <> 12
     or (v_sonuc ->> 'kdv_toplam')::numeric <> 2 then
    raise exception 'Alis faturasi ilk kaydi yanlis. Stok: %, maliyet: %, bakiye: %', v_stok, v_maliyet, v_bakiye_1;
  end if;

  v_sonuc := public.market_alis_faturasi_kaydet_atomik(
    v_restaurant_id, null, v_cari_1::text, null, 'ROLLBACK-001', current_date,
    jsonb_build_array(jsonb_build_object(
      'id', v_urun_id::text, 'miktar', 2, 'alis_fiyati', 6, 'kdv_orani', 20
    )),
    v_key_1
  );
  select stok_miktari into v_stok from public.market_urunleri where id = v_urun_id;
  select bakiye into v_bakiye_1 from public.cari_musteriler where id = v_cari_1;
  if not coalesce((v_sonuc ->> 'tekrarlandi')::boolean, false) or v_stok <> 12 or v_bakiye_1 <> -12 then
    raise exception 'Tekrarlanan alis faturasi yeniden islendi.';
  end if;

  v_sonuc := public.market_alis_faturasi_kaydet_atomik(
    v_restaurant_id, v_fatura_id, v_cari_2::text, null, 'ROLLBACK-001-D', current_date,
    jsonb_build_array(jsonb_build_object(
      'id', v_urun_id::text, 'miktar', 3, 'alis_fiyati', 7, 'kdv_orani', 20
    )),
    v_key_2
  );

  select stok_miktari, alis_fiyati into v_stok, v_maliyet
  from public.market_urunleri where id = v_urun_id;
  select bakiye into v_bakiye_1 from public.cari_musteriler where id = v_cari_1;
  select bakiye into v_bakiye_2 from public.cari_musteriler where id = v_cari_2;
  select count(*) into v_kalem_sayisi from public.market_alis_fatura_kalemleri
  where restaurant_id = v_restaurant_id and fatura_id = v_fatura_id;
  if v_stok <> 13 or v_maliyet <> 7 or v_bakiye_1 <> 0 or v_bakiye_2 <> -21
     or v_kalem_sayisi <> 1 or (v_sonuc ->> 'genel_toplam')::numeric <> 21 then
    raise exception 'Alis faturasi duzenlemesi yanlis. Stok: %, maliyet: %, bakiyeler: %, %',
      v_stok, v_maliyet, v_bakiye_1, v_bakiye_2;
  end if;

  v_sonuc := public.market_alis_faturasi_kaydet_atomik(
    v_restaurant_id, v_fatura_id, v_cari_2::text, null, 'ROLLBACK-001-D', current_date,
    jsonb_build_array(jsonb_build_object(
      'id', v_urun_id::text, 'miktar', 3, 'alis_fiyati', 7, 'kdv_orani', 20
    )),
    v_key_2
  );
  select stok_miktari into v_stok from public.market_urunleri where id = v_urun_id;
  select bakiye into v_bakiye_2 from public.cari_musteriler where id = v_cari_2;
  if not coalesce((v_sonuc ->> 'tekrarlandi')::boolean, false) or v_stok <> 13 or v_bakiye_2 <> -21 then
    raise exception 'Tekrarlanan fatura duzenlemesi yeniden islendi.';
  end if;

  perform public.market_alis_faturasi_sil_v2_atomik(v_restaurant_id, v_fatura_id);
  select stok_miktari into v_stok from public.market_urunleri where id = v_urun_id;
  select bakiye into v_bakiye_2 from public.cari_musteriler where id = v_cari_2;
  select count(*) into v_fatura_sayisi from public.market_alis_faturalari
  where restaurant_id = v_restaurant_id and id = v_fatura_id;
  if v_stok <> 10 or v_bakiye_2 <> 0 or v_fatura_sayisi <> 0 then
    raise exception 'Alis faturasi silme geri alma sonucu yanlis. Stok: %, bakiye: %, fatura: %',
      v_stok, v_bakiye_2, v_fatura_sayisi;
  end if;
end;
$$;

reset role;
rollback;
