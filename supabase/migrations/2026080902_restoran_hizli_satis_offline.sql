-- Restoran hızlı satışını, stok/cari/mutfak kayıtlarıyla birlikte tek transaction içinde kaydeder.
-- İşlem anahtarı sayesinde çevrimdışı kuyruk aynı satışı iki kez oluşturamaz.

begin;

create or replace function public.restoran_hizli_satis_kaydet_atomik(
  p_restaurant_id bigint,
  p_islem_anahtari uuid,
  p_satis_kayitlari jsonb,
  p_siparisler jsonb default '[]'::jsonb,
  p_mutfak_kayitlari jsonb default '[]'::jsonb,
  p_cari_musteri_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_mevcut_sonuc jsonb;
  v_sonuc jsonb;
  v_satislar jsonb := '[]'::jsonb;
  v_mutfak_fisleri jsonb := '[]'::jsonb;
  v_siparis jsonb;
  v_menu_urunu public.menu_urunleri%rowtype;
  v_recete public.urun_receteleri%rowtype;
  v_malzeme public.stok_malzemeleri%rowtype;
  v_cari public.cari_musteriler%rowtype;
  v_adet numeric(14,3);
  v_dusulecek numeric(14,3);
  v_yeni_stok numeric(14,3);
  v_toplam numeric(14,2);
  v_yeni_hareket jsonb;
begin
  if p_islem_anahtari is null then raise exception 'Hızlı satış işlem anahtarı zorunludur.'; end if;
  if jsonb_typeof(p_satis_kayitlari) <> 'array' or jsonb_array_length(p_satis_kayitlari) = 0 then
    raise exception 'Hızlı satış kalemleri zorunludur.';
  end if;
  if not private.integra_sekme_yetkisi_var(p_restaurant_id, 'hizli_satis,kasa,masalar') then
    raise exception 'Bu işletme için hızlı satış yetkiniz yok.';
  end if;
  if exists (select 1 from public.gun_sonu_kilitleri where restaurant_id = p_restaurant_id and tarih = current_date and kilitli = true) then
    raise exception 'Bugünün gün sonu kilidi aktiftir.';
  end if;

  select sonuc into v_mevcut_sonuc from public.restoran_islem_anahtarlari
  where restaurant_id = p_restaurant_id and islem_anahtari = p_islem_anahtari;
  if found and v_mevcut_sonuc is not null then return v_mevcut_sonuc || jsonb_build_object('tekrarlandi', true); end if;

  insert into public.restoran_islem_anahtarlari (restaurant_id, islem_anahtari, islem_tipi, created_by)
  values (p_restaurant_id, p_islem_anahtari, 'hizli_satis', auth.uid())
  on conflict (restaurant_id, islem_anahtari) do nothing;
  if not found then
    select sonuc into v_mevcut_sonuc from public.restoran_islem_anahtarlari
    where restaurant_id = p_restaurant_id and islem_anahtari = p_islem_anahtari;
    if v_mevcut_sonuc is not null then return v_mevcut_sonuc || jsonb_build_object('tekrarlandi', true); end if;
    raise exception 'Bu hızlı satış halen işleniyor.';
  end if;

  with eklenen as (
    insert into public.satis_gecmisi (
      restaurant_id, masa_id, masa_adi, musteri_adi, adisyon_id,
      ad, fiyat, adet, tarih, odeme_tipi, odemeler,
      adisyon_acilis_saati, adisyon_kapanis_saati, urun_notu,
      ekstra_ucret, normal_fiyat, liste_fiyati, satis_fiyati,
      indirim_yuzde, indirim_tutari, fiyat_degistirildi, ikram,
      menu_grubu, departman, kdv_orani, maliyet, toplam_maliyet,
      garson_adi, siparis_tipi, kaynak
    )
    select
      p_restaurant_id, null, 'Hızlı Satış', nullif(x ->> 'musteri_adi', ''),
      left(coalesce(x ->> 'adisyon_id', p_islem_anahtari::text), 150),
      left(coalesce(x ->> 'ad', 'Ürün'), 250),
      coalesce((x ->> 'fiyat')::numeric, 0), greatest(coalesce((x ->> 'adet')::integer, 1), 1),
      coalesce(nullif(x ->> 'tarih', '')::date, current_date),
      left(coalesce(x ->> 'odeme_tipi', 'Nakit'), 100), coalesce(x -> 'odemeler', '[]'::jsonb),
      coalesce(nullif(x ->> 'adisyon_acilis_saati', '')::timestamptz, now()),
      coalesce(nullif(x ->> 'adisyon_kapanis_saati', '')::timestamptz, now()),
      nullif(left(x ->> 'urun_notu', 1000), ''), coalesce((x ->> 'ekstra_ucret')::numeric, 0),
      coalesce((x ->> 'normal_fiyat')::numeric, 0), coalesce((x ->> 'liste_fiyati')::numeric, 0),
      coalesce((x ->> 'satis_fiyati')::numeric, (x ->> 'fiyat')::numeric, 0),
      coalesce((x ->> 'indirim_yuzde')::numeric, 0), coalesce((x ->> 'indirim_tutari')::numeric, 0),
      coalesce((x ->> 'fiyat_degistirildi')::boolean, false), coalesce((x ->> 'ikram')::boolean, false),
      left(coalesce(x ->> 'menu_grubu', 'Genel'), 150), left(coalesce(x ->> 'departman', 'Mutfak'), 100),
      coalesce((x ->> 'kdv_orani')::numeric, 0), coalesce((x ->> 'maliyet')::numeric, 0),
      coalesce((x ->> 'toplam_maliyet')::numeric, 0), left(coalesce(x ->> 'garson_adi', ''), 150),
      'Hızlı Satış', 'restoran_hizli_satis_atomik'
    from jsonb_array_elements(p_satis_kayitlari) as satis_satiri(x)
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(eklenen)), '[]'::jsonb) into v_satislar from eklenen;

  for v_siparis in select value from jsonb_array_elements(coalesce(p_siparisler, '[]'::jsonb)) loop
    v_adet := greatest(coalesce((v_siparis ->> 'adet')::numeric, 1), 0);
    select * into v_menu_urunu from public.menu_urunleri
    where restaurant_id = p_restaurant_id and (
      id = nullif(v_siparis ->> 'urunId', '')::bigint
      or lower(trim(ad)) = lower(trim(v_siparis ->> 'ad'))
    ) order by case when id = nullif(v_siparis ->> 'urunId', '')::bigint then 0 else 1 end
    limit 1 for update;
    if not found then continue; end if;

    if coalesce(v_menu_urunu.uretim_modu, 'manuel') = 'satisla_uretim'
       and exists (select 1 from public.urun_receteleri r where r.restaurant_id = p_restaurant_id and r.urun_id = v_menu_urunu.id) then
      for v_recete in select * from public.urun_receteleri
        where restaurant_id = p_restaurant_id and urun_id = v_menu_urunu.id order by id
      loop
        v_dusulecek := round(coalesce(v_recete.miktar, 0) * (1 + coalesce(v_recete.fire_yuzde, 0) / 100) * v_adet, 3);
        if v_dusulecek <= 0 then continue; end if;
        select * into v_malzeme from public.stok_malzemeleri
        where id = v_recete.malzeme_id and restaurant_id = p_restaurant_id for update;
        if not found then raise exception '% reçetesindeki hammadde bulunamadı.', v_menu_urunu.ad; end if;
        update public.stok_malzemeleri set stok_miktari = coalesce(stok_miktari, 0) - v_dusulecek, updated_at = now()
        where id = v_malzeme.id;
        insert into public.stok_hareketleri (restaurant_id, malzeme_id, urun_id, tip, miktar, aciklama)
        values (p_restaurant_id, v_malzeme.id, v_menu_urunu.id, 'Çıkış', v_dusulecek, v_menu_urunu.ad || ' hızlı satış stok düşümü');
      end loop;
    elsif coalesce(v_menu_urunu.stok_takip, false) then
      v_yeni_stok := greatest(coalesce(v_menu_urunu.stok_adedi, 0) - v_adet, 0);
      update public.menu_urunleri set stok_adedi = v_yeni_stok where id = v_menu_urunu.id;
      insert into public.stok_hareketleri (restaurant_id, urun_id, tip, miktar, aciklama)
      values (p_restaurant_id, v_menu_urunu.id, 'Çıkış', v_adet, v_menu_urunu.ad || ' hızlı satış stok düşümü');
    end if;
  end loop;

  if p_cari_musteri_id is not null then
    select * into v_cari from public.cari_musteriler
    where id = p_cari_musteri_id and restaurant_id = p_restaurant_id for update;
    if not found then raise exception 'Cari müşteri bulunamadı.'; end if;
    select round(coalesce(sum((x ->> 'fiyat')::numeric * (x ->> 'adet')::numeric), 0), 2)
    into v_toplam from jsonb_array_elements(p_satis_kayitlari) as satis(x);
    v_yeni_hareket := jsonb_build_object(
      'id', p_islem_anahtari, 'tip', 'Borç', 'tutar', v_toplam,
      'aciklama', 'Hızlı satış / Gel-Al cariye yazıldı', 'tarih', now(),
      'odeme_tipi', null, 'bakiye_etkisi', v_toplam,
      'kaynak_tipi', 'restoran_hizli_satis', 'kaynak_id', p_islem_anahtari
    );
    update public.cari_musteriler
    set bakiye = coalesce(bakiye, 0) + v_toplam,
        hareketler = jsonb_build_array(v_yeni_hareket) || coalesce(hareketler, '[]'::jsonb)
    where id = v_cari.id returning * into v_cari;
  end if;

  if jsonb_typeof(p_mutfak_kayitlari) = 'array' and jsonb_array_length(p_mutfak_kayitlari) > 0 then
    with eklenen as (
      insert into public.mutfak_fisleri (
        restaurant_id, masa_id, masa_adi, urun_adi, adet, not_metni,
        departman, garson_adi, durum, yazdirildi
      )
      select p_restaurant_id, null, 'Hızlı Satış / Gel-Al', left(coalesce(x ->> 'urun_adi', 'Ürün'), 250),
        greatest(coalesce((x ->> 'adet')::integer, 1), 1), nullif(left(x ->> 'not_metni', 1000), ''),
        left(coalesce(x ->> 'departman', 'Mutfak'), 100), left(coalesce(x ->> 'garson_adi', ''), 150),
        'Bekliyor', coalesce((x ->> 'yazdirildi')::boolean, false)
      from jsonb_array_elements(p_mutfak_kayitlari) as mutfak(x)
      returning *
    )
    select coalesce(jsonb_agg(to_jsonb(eklenen)), '[]'::jsonb) into v_mutfak_fisleri from eklenen;
  end if;

  v_sonuc := jsonb_build_object('satislar', v_satislar, 'mutfakFisleri', v_mutfak_fisleri, 'cari', case when v_cari.id is null then null else to_jsonb(v_cari) end);
  update public.restoran_islem_anahtarlari set sonuc = v_sonuc
  where restaurant_id = p_restaurant_id and islem_anahtari = p_islem_anahtari;
  return v_sonuc;
end;
$$;

revoke all on function public.restoran_hizli_satis_kaydet_atomik(bigint, uuid, jsonb, jsonb, jsonb, bigint) from public, anon;
grant execute on function public.restoran_hizli_satis_kaydet_atomik(bigint, uuid, jsonb, jsonb, jsonb, bigint) to authenticated;

notify pgrst, 'reload schema';
commit;
