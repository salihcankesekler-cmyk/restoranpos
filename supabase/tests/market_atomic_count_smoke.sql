-- Market sayiminin tek baslikta ve tekrar guvenli calisma testi.
-- Tum test kayitlari ROLLBACK ile geri alinir.
begin;

do $$
declare
  v_restaurant_id bigint;
  v_auth_user_id uuid;
  v_grup_id uuid;
  v_urun_1 uuid;
  v_urun_2 uuid;
begin
  select r.id, r.auth_user_id into v_restaurant_id, v_auth_user_id
  from public.restaurants r
  where r.auth_user_id is not null
    and coalesce(r.parent_restaurant_id, r.id) = r.id
    and coalesce(r.rol, 'owner') = 'owner'
    and r.durum = 'Aktif'
  order by r.id limit 1;
  if v_restaurant_id is null then raise exception 'Market sayim testi icin owner bulunamadi.'; end if;

  insert into public.gun_sonu_kilitleri (restaurant_id, tarih, kilitli, aciklama)
  values (v_restaurant_id, (now() at time zone 'Europe/Istanbul')::date, false, 'ROLLBACK sayim testi')
  on conflict (restaurant_id, tarih) do update set kilitli = false, aciklama = excluded.aciklama;

  insert into public.market_gruplari (restaurant_id, grup_adi, sira)
  values (v_restaurant_id, 'ROLLBACK Sayim Grubu', 9998)
  returning id into v_grup_id;

  insert into public.market_urunleri (
    restaurant_id, barkod, urun_adi, grup_id, kategori, satis_fiyati, stok_miktari, aktif
  ) values (
    v_restaurant_id, 'ROLLBACK-' || gen_random_uuid()::text,
    'ROLLBACK Barkodlu Sayim Urunu', v_grup_id, 'Test', 10, 10, true
  ) returning id into v_urun_1;

  insert into public.market_urunleri (
    restaurant_id, barkod, urun_adi, grup_id, kategori, satis_fiyati, stok_miktari, aktif
  ) values (
    v_restaurant_id, 'MANUEL-' || gen_random_uuid()::text,
    'ROLLBACK Barkodsuz Sayim Urunu', v_grup_id, 'Test', 5, 4, true
  ) returning id into v_urun_2;

  perform set_config('integra.test.restaurant_id', v_restaurant_id::text, true);
  perform set_config('integra.test.auth_user_id', v_auth_user_id::text, true);
  perform set_config('integra.test.urun_1', v_urun_1::text, true);
  perform set_config('integra.test.urun_2', v_urun_2::text, true);
  perform set_config('integra.test.sayim_key', gen_random_uuid()::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  v_restaurant_id bigint := current_setting('integra.test.restaurant_id')::bigint;
  v_urun_1 uuid := current_setting('integra.test.urun_1')::uuid;
  v_urun_2 uuid := current_setting('integra.test.urun_2')::uuid;
  v_key uuid := current_setting('integra.test.sayim_key')::uuid;
  v_sonuc jsonb;
  v_stok_1 numeric;
  v_stok_2 numeric;
  v_sayim_sayisi integer;
  v_hareket_sayisi integer;
begin
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('integra.test.auth_user_id'),
    'role', 'authenticated',
    'email', 'market-count-test@invalid.local'
  )::text, true);

  v_sonuc := public.market_sayim_kaydet_atomik(
    v_restaurant_id,
    'ROLLBACK Tek Sayim',
    jsonb_build_array(
      jsonb_build_object('id', v_urun_1::text, 'sayilan_miktar', 7),
      jsonb_build_object('id', v_urun_2::text, 'sayilan_miktar', 6)
    ),
    v_key
  );

  select stok_miktari into v_stok_1 from public.market_urunleri where id = v_urun_1;
  select stok_miktari into v_stok_2 from public.market_urunleri where id = v_urun_2;
  select count(*) into v_sayim_sayisi from public.market_sayimlari
  where restaurant_id = v_restaurant_id and islem_anahtari = v_key;
  select count(*) into v_hareket_sayisi from public.market_stok_hareketleri
  where restaurant_id = v_restaurant_id and kaynak_id = (v_sonuc ->> 'id');

  if v_stok_1 <> 7 or v_stok_2 <> 6 or v_sayim_sayisi <> 1
     or v_hareket_sayisi <> 2
     or (v_sonuc ->> 'toplam_kalem')::integer <> 2
     or (v_sonuc ->> 'farkli_kalem')::integer <> 2
     or jsonb_array_length(v_sonuc -> 'market_sayim_kalemleri') <> 2 then
    raise exception 'Sayim tek kayitta dogru islenmedi. Stoklar: %, %, sayim: %, hareket: %',
      v_stok_1, v_stok_2, v_sayim_sayisi, v_hareket_sayisi;
  end if;

  v_sonuc := public.market_sayim_kaydet_atomik(
    v_restaurant_id,
    'ROLLBACK Tek Sayim',
    jsonb_build_array(
      jsonb_build_object('id', v_urun_1::text, 'sayilan_miktar', 7),
      jsonb_build_object('id', v_urun_2::text, 'sayilan_miktar', 6)
    ),
    v_key
  );

  select count(*) into v_sayim_sayisi from public.market_sayimlari
  where restaurant_id = v_restaurant_id and islem_anahtari = v_key;
  select count(*) into v_hareket_sayisi from public.market_stok_hareketleri
  where restaurant_id = v_restaurant_id and kaynak_id = (v_sonuc ->> 'id');
  if not coalesce((v_sonuc ->> 'tekrarlandi')::boolean, false)
     or v_sayim_sayisi <> 1 or v_hareket_sayisi <> 2 then
    raise exception 'Tekrarlanan sayim yeniden islendi.';
  end if;
end;
$$;

reset role;
rollback;
