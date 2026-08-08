-- Depo v2 uçtan uca testi. Tüm geçici kayıtlar ROLLBACK ile geri alınır.
begin;

do $$
declare
  v_depo_id bigint;
  v_depo_auth uuid;
  v_sube_id bigint;
  v_sube_auth uuid;
  v_urun_id uuid;
begin
  select r.id, r.auth_user_id into v_depo_id, v_depo_auth
  from public.restaurants r
  where r.auth_user_id is not null
    and coalesce(r.rol, 'owner') = 'owner'
    and r.durum = 'Aktif'
  order by r.id limit 1;

  select r.id, r.auth_user_id into v_sube_id, v_sube_auth
  from public.restaurants r
  where r.auth_user_id is not null
    and coalesce(r.rol, 'owner') = 'owner'
    and r.durum = 'Aktif'
    and r.id <> v_depo_id
  order by r.id limit 1;

  if v_depo_id is null or v_sube_id is null then
    raise exception 'Depo v2 testi için iki aktif Auth owner hesabı gerekir.';
  end if;

  insert into public.depo_isletme_baglantilari (
    depo_restaurant_id, sube_restaurant_id, depo_adi, sube_adi,
    sube_isletme_tipi, durum
  ) values (
    v_depo_id, v_sube_id, 'Geçici Test Deposu', 'Geçici Test Şubesi',
    'Restoran', 'Aktif'
  ) on conflict (depo_restaurant_id, sube_restaurant_id)
  do update set durum = 'Aktif';

  insert into public.depo_urunleri (
    restaurant_id, urun_adi, kategori, birim, alis_fiyati,
    stok_miktari, minimum_stok, aktif
  ) values (
    v_depo_id, 'ROLLBACK Depo Test Ürünü', 'Test', 'Adet', 10, 10, 0, true
  ) returning id into v_urun_id;

  perform set_config('integra.test.depo_id', v_depo_id::text, true);
  perform set_config('integra.test.depo_auth', v_depo_auth::text, true);
  perform set_config('integra.test.sube_id', v_sube_id::text, true);
  perform set_config('integra.test.sube_auth', v_sube_auth::text, true);
  perform set_config('integra.test.urun_id', v_urun_id::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  v_sube_id bigint := current_setting('integra.test.sube_id')::bigint;
  v_depo_id bigint := current_setting('integra.test.depo_id')::bigint;
  v_sonuc jsonb;
begin
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('integra.test.sube_auth'),
    'role', 'authenticated',
    'email', 'sube-test@invalid.local'
  )::text, true);

  v_sonuc := public.depo_sevk_talebi_olustur(
    v_sube_id,
    v_depo_id,
    'Restoran',
    'ROLLBACK kısmi teslim testi',
    jsonb_build_array(jsonb_build_object(
      'urun_id', current_setting('integra.test.urun_id'),
      'miktar', 4
    ))
  );
  perform set_config('integra.test.talep_id', v_sonuc ->> 'talep_id', true);

  if not exists (
    select 1 from public.depo_urunleri
    where id = current_setting('integra.test.urun_id')::uuid
  ) then
    raise exception 'Bağlı şube merkez depo ürününü RLS üzerinden göremedi.';
  end if;
end;
$$;

do $$
declare
  v_depo_id bigint := current_setting('integra.test.depo_id')::bigint;
  v_sonuc jsonb;
begin
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('integra.test.depo_auth'),
    'role', 'authenticated',
    'email', 'depo-test@invalid.local'
  )::text, true);

  v_sonuc := public.depo_talebini_sevke_donustur(
    v_depo_id,
    current_setting('integra.test.talep_id')::uuid
  );
  perform set_config('integra.test.sevk_id', v_sonuc ->> 'sevk_id', true);
  perform public.depo_sevkini_gonder(v_depo_id, (v_sonuc ->> 'sevk_id')::uuid);
end;
$$;

do $$
declare
  v_sube_id bigint := current_setting('integra.test.sube_id')::bigint;
  v_sevk_id uuid := current_setting('integra.test.sevk_id')::uuid;
  v_kalemler jsonb;
  v_sonuc jsonb;
  v_son_stok numeric;
begin
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('integra.test.sube_auth'),
    'role', 'authenticated',
    'email', 'sube-test@invalid.local'
  )::text, true);

  select jsonb_agg(jsonb_build_object(
    'kalem_id', k.id,
    'teslim_alinan_miktar', 2,
    'hasarli_miktar', 1,
    'hedef_urun_id', null,
    'teslim_notu', '1 adet hasarlı, 1 adet eksik'
  )) into v_kalemler
  from public.depo_sevk_kalemleri k where k.sevk_id = v_sevk_id;

  v_sonuc := public.depo_sevkini_kismi_teslim_al(v_sube_id, v_sevk_id, v_kalemler);
  if v_sonuc ->> 'durum' <> 'Kısmi Teslim' then
    raise exception 'Kısmi teslim durumu oluşmadı.';
  end if;

  if not exists (
    select 1 from public.depo_teslimat_farklari
    where sevk_id = v_sevk_id and hasarli_miktar = 1 and eksik_miktar = 1
  ) then
    raise exception 'Teslimat fark kaydı oluşmadı.';
  end if;

  select stok_miktari into v_son_stok
  from public.stok_malzemeleri
  where restaurant_id = v_sube_id
    and ad = 'ROLLBACK Depo Test Ürünü';
  if v_son_stok <> 2 then
    raise exception 'Hedef stoğa yalnız sağlam miktar eklenmedi. Stok: %', v_son_stok;
  end if;

  -- Aynı teslim çağrısı stoğu ikinci kez artırmamalıdır.
  perform public.depo_sevkini_kismi_teslim_al(v_sube_id, v_sevk_id, v_kalemler);
  select stok_miktari into v_son_stok
  from public.stok_malzemeleri
  where restaurant_id = v_sube_id and ad = 'ROLLBACK Depo Test Ürünü';
  if v_son_stok <> 2 then
    raise exception 'Tekrarlanan teslim stoğu ikinci kez artırdı.';
  end if;
end;
$$;

rollback;
