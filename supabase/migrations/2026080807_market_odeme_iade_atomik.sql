-- Market satisinda parcali odeme, cari bakiye, stok ve iadeyi tek transaction'da tutar.

begin;

alter table public.market_satislari
  add column if not exists odeme_dagilimi jsonb not null default '[]'::jsonb;

alter table public.market_iadeleri
  add column if not exists islem_anahtari uuid;

create unique index if not exists market_iadeleri_islem_anahtari_unique
  on public.market_iadeleri (restaurant_id, islem_anahtari)
  where islem_anahtari is not null;

create or replace function private.integra_detay_yetkisi_var(
  p_restaurant_id bigint,
  p_yetki text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_restaurant_id = private.integra_restaurant_id()
    and (
      exists (
        select 1
        from public.restaurants r
        where coalesce(r.parent_restaurant_id, r.id) = p_restaurant_id
          and r.auth_user_id = (select auth.uid())
          and coalesce(r.rol, 'owner') = 'owner'
          and r.durum = 'Aktif'
      )
      or exists (
        select 1
        from public.personeller p
        where p.restaurant_id = p_restaurant_id
          and p.auth_user_id = (select auth.uid())
          and p.durum = 'Aktif'
          and (
            (coalesce(p.detay_yetkileri_ayarlandi, false) and coalesce(p.detay_yetkileri, '[]'::jsonb) ? p_yetki)
            or (
              not coalesce(p.detay_yetkileri_ayarlandi, false)
              and (
                p.gorev ilike '%müdür%'
                or p.gorev ilike '%mudur%'
                or (p.gorev ilike '%kasiyer%' and p_yetki = any(array[
                  'odeme_al', 'fis_yazdir', 'adisyon_duzenle', 'rapor_gor', 'kasa_gor'
                ]))
                or (p.gorev ilike '%mutfak%' and p_yetki = 'rapor_gor')
                or (p.gorev ilike '%kurye%' and p_yetki = 'adisyon_duzenle')
                or (
                  p.gorev not ilike '%kasiyer%'
                  and p.gorev not ilike '%müdür%'
                  and p.gorev not ilike '%mudur%'
                  and p.gorev not ilike '%mutfak%'
                  and p.gorev not ilike '%kurye%'
                  and p_yetki = any(array['adisyon_duzenle', 'masa_yonet'])
                )
              )
            )
          )
      )
    )
$$;

revoke all on function private.integra_detay_yetkisi_var(bigint, text) from public, anon;
grant execute on function private.integra_detay_yetkisi_var(bigint, text) to authenticated, service_role;

create or replace function public.market_satis_kaydet_v2_atomik(
  p_restaurant_id bigint,
  p_kalemler jsonb,
  p_cari_id text default null,
  p_islem_anahtari uuid default null,
  p_indirim_turu text default 'yuzde',
  p_indirim_degeri numeric default 0,
  p_odemeler jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_odeme jsonb;
  v_tip text;
  v_tutar numeric(14,2);
  v_nakit numeric(14,2) := 0;
  v_kart numeric(14,2) := 0;
  v_cari_tutari numeric(14,2) := 0;
  v_odeme_toplami numeric(14,2);
  v_odeme_sayisi integer;
  v_odeme_tipi text;
  v_normal_odemeler jsonb := '[]'::jsonb;
  v_kalem jsonb;
  v_urun public.market_urunleri%rowtype;
  v_liste_fiyati numeric;
  v_satis_fiyati numeric;
  v_indirim_gerekli boolean := false;
  v_fiyat_yetkisi_gerekli boolean := false;
  v_sonuc jsonb;
  v_satis public.market_satislari%rowtype;
  v_cari public.cari_musteriler%rowtype;
  v_hareketler jsonb;
  v_hareket jsonb;
begin
  if not private.integra_sekme_yetkisi_var(p_restaurant_id, 'market') then
    raise exception 'Bu işletmenin market satış ekranına erişim yetkiniz yok.';
  end if;
  if not private.integra_detay_yetkisi_var(p_restaurant_id, 'odeme_al') then
    raise exception 'Bu satışı tamamlamak için ödeme alma yetkisi gerekir.';
  end if;
  if p_islem_anahtari is null then
    raise exception 'Güvenli satış işlem anahtarı bulunamadı.';
  end if;
  if exists (
    select 1 from public.gun_sonu_kilitleri g
    where g.restaurant_id = p_restaurant_id
      and g.tarih = (now() at time zone 'Europe/Istanbul')::date
      and g.kilitli = true
  ) then
    raise exception 'Bugünün gün sonu kilitli. Yeni satış kaydedilemez.';
  end if;
  if jsonb_typeof(p_odemeler) <> 'array' or jsonb_array_length(p_odemeler) = 0 then
    raise exception 'Satış için ödeme dağılımı gereklidir.';
  end if;
  if jsonb_array_length(p_odemeler) > 30 then
    raise exception 'Bir satışa en fazla 30 ödeme parçası girilebilir.';
  end if;

  for v_odeme in select value from jsonb_array_elements(p_odemeler)
  loop
    v_tip := nullif(trim(v_odeme ->> 'tip'), '');
    begin
      v_tutar := round(coalesce((v_odeme ->> 'tutar')::numeric, 0), 2);
    exception when others then
      raise exception 'Ödeme tutarlarından biri geçersiz.';
    end;
    if v_tip not in ('Nakit', 'Kredi Kartı', 'Cari / Veresiye') or v_tutar <= 0 then
      raise exception 'Ödeme tipi veya tutarı geçersiz.';
    end if;
    case v_tip
      when 'Nakit' then v_nakit := v_nakit + v_tutar;
      when 'Kredi Kartı' then v_kart := v_kart + v_tutar;
      when 'Cari / Veresiye' then v_cari_tutari := v_cari_tutari + v_tutar;
    end case;
  end loop;

  v_nakit := round(v_nakit, 2);
  v_kart := round(v_kart, 2);
  v_cari_tutari := round(v_cari_tutari, 2);
  v_odeme_toplami := v_nakit + v_kart + v_cari_tutari;
  v_odeme_sayisi := (case when v_nakit > 0 then 1 else 0 end)
    + (case when v_kart > 0 then 1 else 0 end)
    + (case when v_cari_tutari > 0 then 1 else 0 end);

  if v_nakit > 0 then
    v_normal_odemeler := v_normal_odemeler || jsonb_build_array(jsonb_build_object('tip', 'Nakit', 'tutar', v_nakit));
  end if;
  if v_kart > 0 then
    v_normal_odemeler := v_normal_odemeler || jsonb_build_array(jsonb_build_object('tip', 'Kredi Kartı', 'tutar', v_kart));
  end if;
  if v_cari_tutari > 0 then
    v_normal_odemeler := v_normal_odemeler || jsonb_build_array(jsonb_build_object('tip', 'Cari / Veresiye', 'tutar', v_cari_tutari));
  end if;

  if v_cari_tutari > 0 and nullif(trim(p_cari_id), '') is null then
    raise exception 'Cari / Veresiye ödeme için cari seçin.';
  end if;

  if v_odeme_sayisi = 1 then
    v_odeme_tipi := case
      when v_nakit > 0 then 'Nakit'
      when v_kart > 0 then 'Kredi Kartı'
      else 'Cari / Veresiye'
    end;
  else
    v_odeme_tipi := concat_ws(' + ',
      case when v_nakit > 0 then 'Nakit ' || v_nakit::text end,
      case when v_kart > 0 then 'Kredi Kartı ' || v_kart::text end,
      case when v_cari_tutari > 0 then 'Cari / Veresiye ' || v_cari_tutari::text end
    );
  end if;

  if jsonb_typeof(p_kalemler) <> 'array' or jsonb_array_length(p_kalemler) = 0 then
    raise exception 'Satış için en az bir ürün gereklidir.';
  end if;

  for v_kalem in select value from jsonb_array_elements(p_kalemler)
  loop
    select * into v_urun
    from public.market_urunleri
    where id = (v_kalem ->> 'id')::uuid
      and restaurant_id = p_restaurant_id
      and aktif = true
    for update;
    if not found then
      raise exception 'Satış ürünlerinden biri bulunamadı veya pasif.';
    end if;

    v_liste_fiyati := coalesce((v_kalem ->> 'liste_fiyati')::numeric, 0);
    v_satis_fiyati := coalesce((v_kalem ->> 'satis_fiyati')::numeric, 0);
    if v_satis_fiyati < v_liste_fiyati - 0.009 then
      v_indirim_gerekli := true;
    end if;
    if v_urun.satis_fiyati > 0
       and (abs(v_liste_fiyati - v_urun.satis_fiyati) > 0.009
         or v_satis_fiyati > v_urun.satis_fiyati + 0.009) then
      v_fiyat_yetkisi_gerekli := true;
    end if;
  end loop;

  if greatest(coalesce(p_indirim_degeri, 0), 0) > 0 then
    v_indirim_gerekli := true;
  end if;
  if v_indirim_gerekli and not private.integra_detay_yetkisi_var(p_restaurant_id, 'indirim_yap') then
    raise exception 'Bu indirimli satışı tamamlamak için indirim yetkisi gerekir.';
  end if;
  if v_fiyat_yetkisi_gerekli and not private.integra_detay_yetkisi_var(p_restaurant_id, 'fiyat_degistir') then
    raise exception 'Değiştirilmiş ürün fiyatıyla satış için fiyat değiştirme yetkisi gerekir.';
  end if;

  v_sonuc := public.market_satis_kaydet_indirimli_atomik(
    p_restaurant_id,
    p_kalemler,
    v_odeme_tipi,
    nullif(trim(p_cari_id), ''),
    p_islem_anahtari,
    p_indirim_turu,
    p_indirim_degeri
  );

  if abs(round(coalesce((v_sonuc ->> 'toplam_tutar')::numeric, 0), 2) - v_odeme_toplami) > 0.009 then
    raise exception 'Ödeme toplamı satış toplamıyla eşleşmiyor.';
  end if;

  select * into v_satis
  from public.market_satislari
  where restaurant_id = p_restaurant_id
    and id = (v_sonuc ->> 'id')::uuid
  for update;

  if jsonb_array_length(coalesce(v_satis.odeme_dagilimi, '[]'::jsonb)) > 0
     and v_satis.odeme_dagilimi is distinct from v_normal_odemeler then
    raise exception 'Aynı satış anahtarı farklı bir ödeme dağılımıyla tekrar gönderildi.';
  end if;

  update public.market_satislari
  set odeme_tipi = v_odeme_tipi,
      odeme_dagilimi = v_normal_odemeler
  where id = v_satis.id
    and restaurant_id = p_restaurant_id
  returning * into v_satis;

  if v_cari_tutari > 0 and v_odeme_tipi <> 'Cari / Veresiye' then
    select * into v_cari
    from public.cari_musteriler
    where restaurant_id = p_restaurant_id
      and id::text = p_cari_id
    for update;
    if not found then
      raise exception 'Seçilen cari bulunamadı.';
    end if;

    v_hareketler := coalesce(to_jsonb(v_cari.hareketler), '[]'::jsonb);
    if not exists (
      select 1 from jsonb_array_elements(v_hareketler) h
      where h ->> 'kaynak' = 'market_satisi'
        and h ->> 'kaynak_id' = v_satis.id::text
    ) then
      v_hareket := jsonb_build_object(
        'id', v_satis.id::text,
        'tip', 'Borç - Parçalı Satış',
        'tutar', v_cari_tutari,
        'aciklama', 'Market parçalı satışı · ' || v_odeme_tipi,
        'tarih', now(),
        'kaynak', 'market_satisi',
        'kaynak_id', v_satis.id::text,
        'bakiye_etkisi', v_cari_tutari
      );
      update public.cari_musteriler
      set bakiye = coalesce(bakiye, 0) + v_cari_tutari,
          hareketler = jsonb_build_array(v_hareket) || v_hareketler
      where id::text = v_cari.id::text
        and restaurant_id = p_restaurant_id;
    end if;
  end if;

  select to_jsonb(s) || jsonb_build_object(
    'market_satis_kalemleri',
    coalesce((select jsonb_agg(to_jsonb(k) order by k.created_at, k.id)
      from public.market_satis_kalemleri k where k.satis_id = s.id), '[]'::jsonb)
  ) into v_sonuc
  from public.market_satislari s
  where s.id = v_satis.id and s.restaurant_id = p_restaurant_id;

  return v_sonuc;
end;
$$;

revoke all on function public.market_satis_kaydet_v2_atomik(
  bigint, jsonb, text, uuid, text, numeric, jsonb
) from public, anon;
grant execute on function public.market_satis_kaydet_v2_atomik(
  bigint, jsonb, text, uuid, text, numeric, jsonb
) to authenticated, service_role;

create or replace function public.market_parcali_iade_cari_isle()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_satis public.market_satislari%rowtype;
  v_cari public.cari_musteriler%rowtype;
  v_cari_tutari numeric(14,2);
  v_onceki_cari_iade numeric(14,2);
  v_yeni_cari_iade numeric(14,2);
  v_bakiye_etkisi numeric(14,2);
  v_hareket jsonb;
begin
  select * into v_satis from public.market_satislari
  where id = new.satis_id and restaurant_id = new.restaurant_id
  for update;

  if not found or v_satis.odeme_tipi = 'Cari / Veresiye'
     or jsonb_array_length(coalesce(v_satis.odeme_dagilimi, '[]'::jsonb)) = 0 then
    return new;
  end if;

  select round(coalesce(sum((odeme ->> 'tutar')::numeric), 0), 2)
  into v_cari_tutari
  from jsonb_array_elements(v_satis.odeme_dagilimi) odeme
  where odeme ->> 'tip' = 'Cari / Veresiye';

  if v_cari_tutari <= 0 or v_satis.toplam_tutar <= 0 or nullif(v_satis.cari_id, '') is null then
    return new;
  end if;

  v_onceki_cari_iade := round(least(
    v_cari_tutari,
    coalesce(v_satis.iade_toplami, 0) * v_cari_tutari / v_satis.toplam_tutar
  ), 2);
  v_yeni_cari_iade := round(least(
    v_cari_tutari,
    (coalesce(v_satis.iade_toplami, 0) + new.toplam_tutar) * v_cari_tutari / v_satis.toplam_tutar
  ), 2);
  v_bakiye_etkisi := greatest(v_yeni_cari_iade - v_onceki_cari_iade, 0);

  if v_bakiye_etkisi <= 0 then
    return new;
  end if;

  select * into v_cari from public.cari_musteriler
  where restaurant_id = new.restaurant_id and id::text = v_satis.cari_id
  for update;
  if not found then
    raise exception 'İade için satışa bağlı cari hesap bulunamadı.';
  end if;

  v_hareket := jsonb_build_object(
    'id', new.id::text,
    'tip', 'Satış İadesi',
    'tutar', v_bakiye_etkisi,
    'aciklama', coalesce(nullif(trim(new.aciklama), ''), 'Market parçalı satış iadesi'),
    'tarih', now(),
    'kaynak', 'market_iadesi',
    'kaynak_id', new.id::text,
    'satis_id', v_satis.id::text,
    'bakiye_etkisi', -v_bakiye_etkisi
  );

  update public.cari_musteriler
  set bakiye = coalesce(bakiye, 0) - v_bakiye_etkisi,
      hareketler = jsonb_build_array(v_hareket) || coalesce(to_jsonb(hareketler), '[]'::jsonb)
  where restaurant_id = new.restaurant_id and id::text = v_cari.id::text;

  return new;
end;
$$;

drop trigger if exists market_parcali_iade_cari_trigger on public.market_iadeleri;
create trigger market_parcali_iade_cari_trigger
after insert on public.market_iadeleri
for each row execute function public.market_parcali_iade_cari_isle();

create or replace function public.market_satis_iade_v2_atomik(
  p_restaurant_id bigint,
  p_satis_id uuid,
  p_kalemler jsonb default '[]'::jsonb,
  p_aciklama text default null,
  p_tam_iptal boolean default false,
  p_islem_anahtari uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_iade public.market_iadeleri%rowtype;
  v_sonuc jsonb;
begin
  if not private.integra_sekme_yetkisi_var(p_restaurant_id, 'market')
     or not private.integra_detay_yetkisi_var(p_restaurant_id, 'odeme_al') then
    raise exception 'Market satış iadesi için yetkiniz yok.';
  end if;
  if p_islem_anahtari is null then
    raise exception 'Güvenli iade işlem anahtarı bulunamadı.';
  end if;
  if exists (
    select 1 from public.gun_sonu_kilitleri g
    where g.restaurant_id = p_restaurant_id
      and g.tarih = (now() at time zone 'Europe/Istanbul')::date
      and g.kilitli = true
  ) then
    raise exception 'Bugünün gün sonu kilitli. Satış iadesi kaydedilemez.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_restaurant_id::text || ':' || p_islem_anahtari::text, 0));
  select * into v_iade from public.market_iadeleri
  where restaurant_id = p_restaurant_id and islem_anahtari = p_islem_anahtari;
  if found then
    return jsonb_build_object(
      'iade_id', v_iade.id,
      'toplam_tutar', v_iade.toplam_tutar,
      'tekrarlandi', true
    );
  end if;

  v_sonuc := public.market_satis_iade_atomik(
    p_restaurant_id, p_satis_id, p_kalemler, p_aciklama, p_tam_iptal
  );

  update public.market_iadeleri
  set islem_anahtari = p_islem_anahtari
  where id = (v_sonuc ->> 'iade_id')::uuid
    and restaurant_id = p_restaurant_id;

  return v_sonuc || jsonb_build_object('tekrarlandi', false);
end;
$$;

revoke all on function public.market_satis_iade_v2_atomik(
  bigint, uuid, jsonb, text, boolean, uuid
) from public, anon;
grant execute on function public.market_satis_iade_v2_atomik(
  bigint, uuid, jsonb, text, boolean, uuid
) to authenticated, service_role;

commit;
