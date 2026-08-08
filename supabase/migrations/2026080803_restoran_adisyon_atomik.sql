-- Restoran masa ödemesini, satış kaydını, stok düşümünü ve masa kapanışını
-- tek transaction içinde ve tekrar çağrılmaya dayanıklı biçimde tamamlar.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.restoran_islem_anahtarlari (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint not null references public.restaurants(id) on delete cascade,
  islem_anahtari uuid not null,
  islem_tipi text not null,
  sonuc jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (restaurant_id, islem_anahtari)
);

alter table public.restoran_islem_anahtarlari enable row level security;
revoke all on table public.restoran_islem_anahtarlari from public, anon, authenticated;
grant all on table public.restoran_islem_anahtarlari to service_role;

create or replace function public.restoran_adisyon_odeme_atomik(
  p_restaurant_id bigint,
  p_masa_id bigint,
  p_islem_anahtari uuid,
  p_odeme jsonb,
  p_satis_kayitlari jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_mevcut_sonuc jsonb;
  v_masa public.masalar%rowtype;
  v_odeme_tutari numeric(14,2);
  v_odeme_tipi text;
  v_alinan_tutar numeric(14,2);
  v_para_ustu numeric(14,2);
  v_yeni_odeme jsonb;
  v_yeni_odemeler jsonb;
  v_toplam_odenen numeric(14,2);
  v_kalan numeric(14,2);
  v_sonuc jsonb;
  v_satislar jsonb := '[]'::jsonb;
  v_satis_toplami numeric(14,2);
  v_siparis jsonb;
  v_menu_urunu public.menu_urunleri%rowtype;
  v_recete public.urun_receteleri%rowtype;
  v_malzeme public.stok_malzemeleri%rowtype;
  v_adet numeric(14,3);
  v_dusulecek numeric(14,3);
  v_yeni_stok numeric(14,3);
begin
  if p_islem_anahtari is null then raise exception 'Ödeme işlem anahtarı zorunludur.'; end if;
  if not private.integra_sekme_yetkisi_var(p_restaurant_id, 'masalar,kasa,hizli_satis') then
    raise exception 'Bu işletme için ödeme alma yetkiniz yok.';
  end if;
  if exists (
    select 1 from public.gun_sonu_kilitleri
    where restaurant_id = p_restaurant_id and tarih = current_date and kilitli = true
  ) then
    raise exception 'Bugünün gün sonu kilidi aktiftir.';
  end if;

  select sonuc into v_mevcut_sonuc
  from public.restoran_islem_anahtarlari
  where restaurant_id = p_restaurant_id and islem_anahtari = p_islem_anahtari;
  if found and v_mevcut_sonuc is not null then return v_mevcut_sonuc || jsonb_build_object('tekrarlandi', true); end if;

  insert into public.restoran_islem_anahtarlari (
    restaurant_id, islem_anahtari, islem_tipi, created_by
  ) values (
    p_restaurant_id, p_islem_anahtari, 'adisyon_odeme', auth.uid()
  ) on conflict (restaurant_id, islem_anahtari) do nothing;

  if not found then
    select sonuc into v_mevcut_sonuc
    from public.restoran_islem_anahtarlari
    where restaurant_id = p_restaurant_id and islem_anahtari = p_islem_anahtari;
    if v_mevcut_sonuc is not null then return v_mevcut_sonuc || jsonb_build_object('tekrarlandi', true); end if;
    raise exception 'Bu ödeme işlemi halen işleniyor.';
  end if;

  select * into v_masa
  from public.masalar
  where id = p_masa_id and restaurant_id = p_restaurant_id
  for update;
  if not found then raise exception 'Ödeme alınacak masa bulunamadı.'; end if;
  if not v_masa.dolu or jsonb_typeof(coalesce(v_masa.siparisler, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(v_masa.siparisler, '[]'::jsonb)) = 0 then
    raise exception 'Masada açık adisyon bulunamadı.';
  end if;

  v_odeme_tutari := round(coalesce((p_odeme ->> 'tutar')::numeric, 0), 2);
  v_odeme_tipi := left(coalesce(nullif(trim(p_odeme ->> 'tip'), ''), 'Ödeme'), 100);
  v_alinan_tutar := round(coalesce((p_odeme ->> 'alinanTutar')::numeric, v_odeme_tutari), 2);
  v_para_ustu := round(coalesce((p_odeme ->> 'paraUstu')::numeric, 0), 2);
  if v_odeme_tutari <= 0 then raise exception 'Ödeme tutarı sıfırdan büyük olmalıdır.'; end if;

  select coalesce(sum(coalesce((value ->> 'tutar')::numeric, 0)), 0)
  into v_toplam_odenen
  from jsonb_array_elements(coalesce(v_masa.odemeler, '[]'::jsonb)) as mevcut_odeme(value);
  v_kalan := greatest(round(coalesce(v_masa.tutar, 0) - v_toplam_odenen, 2), 0);
  if v_kalan <= 0 then raise exception 'Bu adisyonun ödemesi tamamlanmış.'; end if;
  if v_odeme_tutari > v_kalan + 0.01 then raise exception 'Ödeme tutarı kalan tutardan fazla olamaz.'; end if;

  v_yeni_odeme := jsonb_build_object(
    'tip', v_odeme_tipi,
    'tutar', v_odeme_tutari,
    'alinanTutar', greatest(v_alinan_tutar, v_odeme_tutari),
    'paraUstu', greatest(v_para_ustu, 0),
    'tarih', coalesce(nullif(p_odeme ->> 'tarih', ''), now()::text),
    'islemAnahtari', p_islem_anahtari
  );
  v_yeni_odemeler := coalesce(v_masa.odemeler, '[]'::jsonb) || jsonb_build_array(v_yeni_odeme);
  v_toplam_odenen := v_toplam_odenen + v_odeme_tutari;
  v_kalan := greatest(round(coalesce(v_masa.tutar, 0) - v_toplam_odenen, 2), 0);

  if v_kalan > 0.01 then
    update public.masalar set odemeler = v_yeni_odemeler where id = v_masa.id returning * into v_masa;
    v_sonuc := jsonb_build_object('kapandi', false, 'kalan', v_kalan, 'masa', to_jsonb(v_masa));
    update public.restoran_islem_anahtarlari set sonuc = v_sonuc
    where restaurant_id = p_restaurant_id and islem_anahtari = p_islem_anahtari;
    return v_sonuc;
  end if;

  if jsonb_typeof(p_satis_kayitlari) <> 'array'
     or jsonb_array_length(p_satis_kayitlari) = 0 then
    raise exception 'Adisyon kapanışı için satış kalemleri zorunludur.';
  end if;

  select round(coalesce(sum(coalesce((value ->> 'fiyat')::numeric, 0) * coalesce((value ->> 'adet')::numeric, 1)), 0), 2)
  into v_satis_toplami
  from jsonb_array_elements(p_satis_kayitlari) as satis_satiri(value);
  if abs(v_satis_toplami - coalesce(v_masa.tutar, 0)) > 0.05 then
    raise exception 'Satış kalemleri toplamı ile adisyon toplamı uyuşmuyor.';
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
      p_restaurant_id,
      v_masa.id,
      v_masa.ad,
      nullif(v_masa.musteri_adi, ''),
      left(coalesce(x ->> 'adisyon_id', p_islem_anahtari::text), 150),
      left(coalesce(x ->> 'ad', 'Ürün'), 250),
      coalesce((x ->> 'fiyat')::numeric, 0),
      greatest(coalesce((x ->> 'adet')::integer, 1), 1),
      coalesce(nullif(x ->> 'tarih', '')::date, current_date),
      left(coalesce(x ->> 'odeme_tipi', v_odeme_tipi), 100),
      v_yeni_odemeler,
      v_masa.adisyon_acilis_saati,
      coalesce(nullif(x ->> 'adisyon_kapanis_saati', '')::timestamptz, now()),
      nullif(left(x ->> 'urun_notu', 1000), ''),
      coalesce((x ->> 'ekstra_ucret')::numeric, 0),
      coalesce((x ->> 'normal_fiyat')::numeric, 0),
      coalesce((x ->> 'liste_fiyati')::numeric, 0),
      coalesce((x ->> 'satis_fiyati')::numeric, (x ->> 'fiyat')::numeric, 0),
      coalesce((x ->> 'indirim_yuzde')::numeric, 0),
      coalesce((x ->> 'indirim_tutari')::numeric, 0),
      coalesce((x ->> 'fiyat_degistirildi')::boolean, false),
      coalesce((x ->> 'ikram')::boolean, false),
      left(coalesce(x ->> 'menu_grubu', 'Genel'), 150),
      left(coalesce(x ->> 'departman', 'Mutfak'), 100),
      coalesce((x ->> 'kdv_orani')::numeric, 0),
      coalesce((x ->> 'maliyet')::numeric, 0),
      coalesce((x ->> 'toplam_maliyet')::numeric, 0),
      left(coalesce(x ->> 'garson_adi', v_masa.adisyon_garson_adi, ''), 150),
      coalesce(nullif(left(x ->> 'siparis_tipi', 100), ''), 'Masa Satışı'),
      'restoran_adisyon_atomik'
    from jsonb_array_elements(p_satis_kayitlari) as satis_satiri(x)
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(eklenen)), '[]'::jsonb) into v_satislar from eklenen;

  for v_siparis in
    select siparis.value
    from jsonb_array_elements(v_masa.siparisler) as siparis(value)
  loop
    v_adet := greatest(coalesce((v_siparis ->> 'adet')::numeric, 1), 0);
    select * into v_menu_urunu
    from public.menu_urunleri
    where restaurant_id = p_restaurant_id
      and (
        id = nullif(v_siparis ->> 'urunId', '')::bigint
        or lower(trim(ad)) = lower(trim(v_siparis ->> 'ad'))
      )
    order by case when id = nullif(v_siparis ->> 'urunId', '')::bigint then 0 else 1 end
    limit 1 for update;
    if not found then continue; end if;

    if coalesce(v_menu_urunu.uretim_modu, 'manuel') = 'satisla_uretim'
       and exists (select 1 from public.urun_receteleri r where r.restaurant_id = p_restaurant_id and r.urun_id = v_menu_urunu.id) then
      for v_recete in
        select * from public.urun_receteleri
        where restaurant_id = p_restaurant_id and urun_id = v_menu_urunu.id
        order by id
      loop
        v_dusulecek := round(coalesce(v_recete.miktar, 0) * (1 + coalesce(v_recete.fire_yuzde, 0) / 100) * v_adet, 3);
        if v_dusulecek <= 0 then continue; end if;
        select * into v_malzeme from public.stok_malzemeleri
        where id = v_recete.malzeme_id and restaurant_id = p_restaurant_id
        for update;
        if not found then raise exception '% reçetesindeki hammadde bulunamadı.', v_menu_urunu.ad; end if;
        v_yeni_stok := coalesce(v_malzeme.stok_miktari, 0) - v_dusulecek;
        update public.stok_malzemeleri set stok_miktari = v_yeni_stok, updated_at = now() where id = v_malzeme.id;
        insert into public.stok_hareketleri (restaurant_id, malzeme_id, urun_id, tip, miktar, aciklama)
        values (p_restaurant_id, v_malzeme.id, v_menu_urunu.id, 'Çıkış', v_dusulecek,
          v_menu_urunu.ad || ' satışı atomik hammadde düşümü');
      end loop;
    elsif coalesce(v_menu_urunu.stok_takip, false) then
      v_yeni_stok := greatest(coalesce(v_menu_urunu.stok_adedi, 0) - v_adet, 0);
      update public.menu_urunleri set stok_adedi = v_yeni_stok where id = v_menu_urunu.id;
      insert into public.stok_hareketleri (restaurant_id, urun_id, tip, miktar, aciklama)
      values (p_restaurant_id, v_menu_urunu.id, 'Çıkış', v_adet, v_menu_urunu.ad || ' masa satışı atomik stok düşümü');
    end if;
  end loop;

  update public.masalar
  set dolu = false, tutar = 0, brut_tutar = 0,
      adisyon_indirim_yuzde = 0, adisyon_indirim_tutari = 0,
      siparisler = '[]'::jsonb, odemeler = '[]'::jsonb,
      adisyon_acilis_saati = null, adisyon_garson_adi = null,
      musteri_adi = null
  where id = v_masa.id
  returning * into v_masa;

  v_sonuc := jsonb_build_object(
    'kapandi', true,
    'kalan', 0,
    'masa', to_jsonb(v_masa),
    'satislar', v_satislar
  );
  update public.restoran_islem_anahtarlari set sonuc = v_sonuc
  where restaurant_id = p_restaurant_id and islem_anahtari = p_islem_anahtari;
  return v_sonuc;
end;
$$;

revoke all on function public.restoran_adisyon_odeme_atomik(bigint, bigint, uuid, jsonb, jsonb)
  from public, anon;
grant execute on function public.restoran_adisyon_odeme_atomik(bigint, bigint, uuid, jsonb, jsonb)
  to authenticated;

notify pgrst, 'reload schema';

commit;
