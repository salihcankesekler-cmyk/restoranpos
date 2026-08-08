-- Market cari hareketi ve manuel stok/fiyat duzeltmesi testi.
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
  select r.id, r.auth_user_id into v_restaurant_id, v_auth_user_id
  from public.restaurants r
  where r.auth_user_id is not null
    and coalesce(r.parent_restaurant_id, r.id) = r.id
    and coalesce(r.rol, 'owner') = 'owner'
    and r.durum = 'Aktif'
  order by r.id limit 1;
  if v_restaurant_id is null then raise exception 'Market finans testi icin owner bulunamadi.'; end if;

  insert into public.gun_sonu_kilitleri (restaurant_id, tarih, kilitli, aciklama)
  values (v_restaurant_id, current_date, false, 'ROLLBACK market finans testi')
  on conflict (restaurant_id, tarih) do update set kilitli = false, aciklama = excluded.aciklama;

  insert into public.market_gruplari (restaurant_id, grup_adi, sira)
  values (v_restaurant_id, 'ROLLBACK Finans Grubu', 9996)
  returning id into v_grup_id;
  insert into public.market_urunleri (
    restaurant_id, barkod, urun_adi, grup_id, kategori,
    alis_fiyati, satis_fiyati, stok_miktari, aktif
  ) values (
    v_restaurant_id, 'ROLLBACK-' || gen_random_uuid()::text,
    'ROLLBACK Finans Urunu', v_grup_id, 'Test', 4, 10, 10, true
  ) returning id into v_urun_id;
  insert into public.cari_musteriler (restaurant_id, ad, bakiye, hareketler)
  values (v_restaurant_id, 'ROLLBACK Finans Carisi', 10, '[]'::jsonb)
  returning id into v_cari_id;

  perform set_config('integra.test.restaurant_id', v_restaurant_id::text, true);
  perform set_config('integra.test.auth_user_id', v_auth_user_id::text, true);
  perform set_config('integra.test.urun_id', v_urun_id::text, true);
  perform set_config('integra.test.cari_id', v_cari_id::text, true);
  perform set_config('integra.test.tahsilat_key', gen_random_uuid()::text, true);
  perform set_config('integra.test.odeme_key', gen_random_uuid()::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  v_restaurant_id bigint := current_setting('integra.test.restaurant_id')::bigint;
  v_urun_id uuid := current_setting('integra.test.urun_id')::uuid;
  v_cari_id bigint := current_setting('integra.test.cari_id')::bigint;
  v_tahsilat_key uuid := current_setting('integra.test.tahsilat_key')::uuid;
  v_odeme_key uuid := current_setting('integra.test.odeme_key')::uuid;
  v_sonuc jsonb;
  v_bakiye numeric;
  v_stok numeric;
  v_alis numeric;
  v_satis numeric;
  v_hareket_sayisi integer;
begin
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('integra.test.auth_user_id'),
    'role', 'authenticated',
    'email', 'market-finance-test@invalid.local'
  )::text, true);

  v_sonuc := public.market_cari_hareket_kaydet_atomik(
    v_restaurant_id, v_cari_id::text, 'tahsilat', 3,
    'ROLLBACK tahsilat', current_date, v_tahsilat_key
  );
  if (v_sonuc ->> 'bakiye')::numeric <> 7 then raise exception 'Tahsilat bakiyesi yanlis.'; end if;

  v_sonuc := public.market_cari_hareket_kaydet_atomik(
    v_restaurant_id, v_cari_id::text, 'tahsilat', 3,
    'ROLLBACK tahsilat', current_date, v_tahsilat_key
  );
  if not coalesce((v_sonuc ->> 'tekrarlandi')::boolean, false)
     or (v_sonuc ->> 'bakiye')::numeric <> 7 then
    raise exception 'Tekrarlanan tahsilat yeniden islendi.';
  end if;

  v_sonuc := public.market_cari_hareket_kaydet_atomik(
    v_restaurant_id, v_cari_id::text, 'odeme', 2,
    'ROLLBACK odeme', current_date, v_odeme_key
  );
  if (v_sonuc ->> 'bakiye')::numeric <> 9 then raise exception 'Disari odeme bakiyesi yanlis.'; end if;

  v_sonuc := public.market_urun_stok_fiyat_guncelle_atomik(
    v_restaurant_id, v_urun_id, 8, 5, 12, 'ROLLBACK hizli duzeltme'
  );
  select stok_miktari, alis_fiyati, satis_fiyati into v_stok, v_alis, v_satis
  from public.market_urunleri where id = v_urun_id;
  select count(*) into v_hareket_sayisi from public.market_stok_hareketleri
  where restaurant_id = v_restaurant_id and urun_id = v_urun_id
    and kaynak_tipi = 'manuel_duzeltme';
  if v_stok <> 8 or v_alis <> 5 or v_satis <> 12 or v_hareket_sayisi <> 1 then
    raise exception 'Stok/fiyat duzeltmesi yanlis. Stok: %, alis: %, satis: %, hareket: %',
      v_stok, v_alis, v_satis, v_hareket_sayisi;
  end if;

  perform public.market_urun_stok_fiyat_guncelle_atomik(
    v_restaurant_id, v_urun_id, 8, 5, 12, 'ROLLBACK hizli duzeltme'
  );
  select count(*) into v_hareket_sayisi from public.market_stok_hareketleri
  where restaurant_id = v_restaurant_id and urun_id = v_urun_id
    and kaynak_tipi = 'manuel_duzeltme';
  if v_hareket_sayisi <> 1 then raise exception 'Ayni stok degeri yeniden hareket olusturdu.'; end if;
end;
$$;

reset role;
rollback;
