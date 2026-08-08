-- Kuafor randevu, cakisma, stok ve satis atomik islem testi.
-- Tum test kayitlari ROLLBACK ile geri alinir.
begin;

do $$
declare
  v_restaurant_id bigint;
  v_auth_user_id uuid;
  v_musteri_id uuid;
  v_personel_id uuid;
  v_hizmet_id uuid;
  v_urun_id bigint;
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
    raise exception 'Kuafor testi icin aktif Auth owner hesabi bulunamadi.';
  end if;

  insert into public.kuafor_musterileri (restaurant_id, ad, telefon)
  values (v_restaurant_id, 'ROLLBACK Kuafor Musterisi', '0000000000')
  returning id into v_musteri_id;

  insert into public.kuafor_personelleri (restaurant_id, ad, renk, sira, aktif)
  values (v_restaurant_id, 'ROLLBACK Kuafor Personeli', '#7c3aed', 9999, true)
  returning id into v_personel_id;

  insert into public.kuafor_hizmetleri (
    restaurant_id, hizmet_adi, kategori, sure_dakika, fiyat, renk, aktif
  ) values (
    v_restaurant_id, 'ROLLBACK Kuafor Hizmeti', 'Test', 30, 100, '#f97316', true
  ) returning id into v_hizmet_id;

  insert into public.menu_urunleri (
    restaurant_id, ad, fiyat, stok_takip, stok_adedi, maliyet, aktif, satista_aktif, uretim_modu
  ) values (
    v_restaurant_id, 'ROLLBACK Kuafor Urunu', 20, true, 10, 5, true, true, 'manuel'
  ) returning id into v_urun_id;

  perform set_config('integra.test.restaurant_id', v_restaurant_id::text, true);
  perform set_config('integra.test.auth_user_id', v_auth_user_id::text, true);
  perform set_config('integra.test.musteri_id', v_musteri_id::text, true);
  perform set_config('integra.test.personel_id', v_personel_id::text, true);
  perform set_config('integra.test.hizmet_id', v_hizmet_id::text, true);
  perform set_config('integra.test.urun_id', v_urun_id::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  v_restaurant_id bigint := current_setting('integra.test.restaurant_id')::bigint;
  v_musteri_id uuid := current_setting('integra.test.musteri_id')::uuid;
  v_personel_id uuid := current_setting('integra.test.personel_id')::uuid;
  v_hizmet_id uuid := current_setting('integra.test.hizmet_id')::uuid;
  v_urun_id bigint := current_setting('integra.test.urun_id')::bigint;
  v_baslangic timestamptz := '2099-08-08 09:00:00+03'::timestamptz;
  v_randevu jsonb;
  v_randevu_id uuid;
  v_stok numeric;
  v_satis_sayisi integer;
  v_hata_yakalandi boolean := false;
begin
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('integra.test.auth_user_id'),
    'role', 'authenticated',
    'email', 'kuafor-atomic-test@invalid.local'
  )::text, true);

  v_randevu := public.kuafor_randevu_kaydet_atomik(
    v_restaurant_id,
    null,
    v_musteri_id,
    'Istemciden gelen ad kullanilmamali',
    '1111111111',
    v_personel_id,
    v_hizmet_id,
    v_baslangic,
    30,
    100,
    0,
    null,
    'ROLLBACK atomik kuafor testi',
    array[v_hizmet_id],
    jsonb_build_array(jsonb_build_object(
      'kaynak_tipi', 'menu_urunu',
      'id', v_urun_id::text,
      'miktar', 2
    ))
  );
  v_randevu_id := (v_randevu ->> 'id')::uuid;

  if jsonb_array_length(v_randevu -> 'kullanilan_urunler') <> 1
     or v_randevu ->> 'musteri_adi' <> 'ROLLBACK Kuafor Musterisi' then
    raise exception 'Randevu ve urunler birlikte kaydedilmedi veya musteri sunucudan dogrulanmadi.';
  end if;

  begin
    perform public.kuafor_randevu_kaydet_atomik(
      v_restaurant_id, null, v_musteri_id, null, null,
      v_personel_id, v_hizmet_id, v_baslangic + interval '15 minutes',
      30, 100, 0, null, 'ROLLBACK cakisma testi', array[v_hizmet_id], '[]'::jsonb
    );
  exception when others then
    if sqlerrm not like '%başka bir randevusu var%' then
      raise;
    end if;
    v_hata_yakalandi := true;
  end;

  if not v_hata_yakalandi then
    raise exception 'Ayni personel icin cakisan randevu engellenmedi.';
  end if;

  v_hata_yakalandi := false;
  begin
    perform public.kuafor_randevu_kaydet_atomik(
      v_restaurant_id, null, v_musteri_id, null, null,
      v_personel_id, v_hizmet_id, v_baslangic + interval '2 hours',
      30, 100, 0, null, 'ROLLBACK hatali urun testi', array[v_hizmet_id],
      jsonb_build_array(jsonb_build_object('kaynak_tipi', 'menu_urunu', 'id', '999999999999', 'miktar', 1))
    );
  exception when others then
    if sqlerrm not like '%ürün kartı bulunamadı%' then
      raise;
    end if;
    v_hata_yakalandi := true;
  end;

  if not v_hata_yakalandi or exists (
    select 1 from public.kuafor_randevulari
    where restaurant_id = v_restaurant_id and not_metni = 'ROLLBACK hatali urun testi'
  ) then
    raise exception 'Hatali urun sonrasinda yarim randevu kaydi kaldi.';
  end if;

  perform public.kuafor_randevu_durum_guncelle(
    v_restaurant_id, v_randevu_id, 'Tamamlandı', 'Nakit', 100
  );

  select stok_adedi into v_stok from public.menu_urunleri where id = v_urun_id;
  select count(*) into v_satis_sayisi from public.satis_gecmisi
  where restaurant_id = v_restaurant_id and kuafor_randevu_id = v_randevu_id;

  if v_stok <> 8 or v_satis_sayisi <> 1 then
    raise exception 'Kuafor tamamlama sonucu yanlis. Stok: %, satis: %', v_stok, v_satis_sayisi;
  end if;

  perform public.kuafor_randevu_durum_guncelle(
    v_restaurant_id, v_randevu_id, 'Tamamlandı', 'Nakit', 100
  );

  select stok_adedi into v_stok from public.menu_urunleri where id = v_urun_id;
  select count(*) into v_satis_sayisi from public.satis_gecmisi
  where restaurant_id = v_restaurant_id and kuafor_randevu_id = v_randevu_id;

  if v_stok <> 8 or v_satis_sayisi <> 1 then
    raise exception 'Tekrarlanan tamamlama stok veya satisi yeniden isledi. Stok: %, satis: %', v_stok, v_satis_sayisi;
  end if;
end;
$$;

reset role;
rollback;
