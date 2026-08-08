-- Market cari tahsilat/odeme ve hizli stok-fiyat duzeltmesini eszamanli kullanima hazirlar.

begin;

create or replace function public.market_cari_hareket_kaydet_atomik(
  p_restaurant_id bigint,
  p_cari_id text,
  p_islem_tipi text,
  p_tutar numeric,
  p_aciklama text,
  p_tarih date,
  p_islem_anahtari uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cari public.cari_musteriler%rowtype;
  v_tutar numeric(14,2);
  v_etki numeric(14,2);
  v_hareketler jsonb;
  v_hareket jsonb;
begin
  if not private.integra_sekme_yetkisi_var(p_restaurant_id, 'market')
     or not private.integra_detay_yetkisi_var(p_restaurant_id, 'kasa_gor') then
    raise exception 'Cari ödeme/tahsilat kaydetmek için kasa yetkisi gerekir.';
  end if;
  if p_islem_tipi not in ('tahsilat', 'odeme') then
    raise exception 'Cari işlem tipi geçersiz.';
  end if;
  v_tutar := round(coalesce(p_tutar, 0), 2);
  if v_tutar <= 0 then raise exception 'Tutar sıfırdan büyük olmalıdır.'; end if;
  if p_tarih is null then raise exception 'İşlem tarihi zorunludur.'; end if;
  if p_islem_anahtari is null then raise exception 'Güvenli cari işlem anahtarı bulunamadı.'; end if;
  if exists (
    select 1 from public.gun_sonu_kilitleri g
    where g.restaurant_id = p_restaurant_id and g.tarih = p_tarih and g.kilitli = true
  ) then
    raise exception 'İşlem tarihinin gün sonu kilitli. Cari hareket kaydedilemez.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_restaurant_id::text || ':' || p_islem_anahtari::text, 0));
  select * into v_cari from public.cari_musteriler
  where restaurant_id = p_restaurant_id and id::text = p_cari_id
  for update;
  if not found then raise exception 'Seçilen cari bulunamadı.'; end if;

  v_hareketler := coalesce(to_jsonb(v_cari.hareketler), '[]'::jsonb);
  if exists (
    select 1 from jsonb_array_elements(v_hareketler) h
    where h ->> 'kaynak' = 'market_harici_hareket'
      and h ->> 'kaynak_id' = p_islem_anahtari::text
  ) then
    return to_jsonb(v_cari) || jsonb_build_object('tekrarlandi', true);
  end if;

  v_etki := case when p_islem_tipi = 'tahsilat' then -v_tutar else v_tutar end;
  v_hareket := jsonb_build_object(
    'id', p_islem_anahtari::text,
    'tip', case when p_islem_tipi = 'tahsilat' then 'Tahsilat' else 'Ödeme' end,
    'tutar', v_tutar,
    'aciklama', coalesce(nullif(trim(p_aciklama), ''),
      case when p_islem_tipi = 'tahsilat' then 'Dışarıdan tahsilat alındı' else 'Dışarı ödeme yapıldı' end),
    'tarih', (p_tarih::timestamp + time '12:00') at time zone 'Europe/Istanbul',
    'kaynak', 'market_harici_hareket',
    'kaynak_id', p_islem_anahtari::text,
    'bakiye_etkisi', v_etki
  );

  update public.cari_musteriler
  set bakiye = coalesce(bakiye, 0) + v_etki,
      hareketler = jsonb_build_array(v_hareket) || v_hareketler
  where restaurant_id = p_restaurant_id and id::text = p_cari_id
  returning * into v_cari;

  return to_jsonb(v_cari) || jsonb_build_object('tekrarlandi', false);
end;
$$;

revoke all on function public.market_cari_hareket_kaydet_atomik(
  bigint, text, text, numeric, text, date, uuid
) from public, anon;
grant execute on function public.market_cari_hareket_kaydet_atomik(
  bigint, text, text, numeric, text, date, uuid
) to authenticated, service_role;

create or replace function public.market_urun_stok_fiyat_guncelle_atomik(
  p_restaurant_id bigint,
  p_urun_id uuid,
  p_stok_miktari numeric,
  p_alis_fiyati numeric,
  p_satis_fiyati numeric,
  p_aciklama text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_urun public.market_urunleri%rowtype;
  v_onceki_stok numeric(14,3);
  v_yeni_stok numeric(14,3);
  v_stok_farki numeric(14,3);
begin
  if not private.integra_sekme_yetkisi_var(p_restaurant_id, 'market')
     or not private.integra_detay_yetkisi_var(p_restaurant_id, 'urun_yonet') then
    raise exception 'Stok ve ürün fiyatı düzenlemek için ürün yönetme yetkisi gerekir.';
  end if;
  if exists (
    select 1 from public.gun_sonu_kilitleri g
    where g.restaurant_id = p_restaurant_id
      and g.tarih = (now() at time zone 'Europe/Istanbul')::date
      and g.kilitli = true
  ) then
    raise exception 'Bugünün gün sonu kilitli. Stok/fiyat düzeltmesi yapılamaz.';
  end if;

  v_yeni_stok := round(coalesce(p_stok_miktari, 0), 3);
  if v_yeni_stok < 0 or coalesce(p_alis_fiyati, 0) < 0 or coalesce(p_satis_fiyati, 0) < 0 then
    raise exception 'Stok ve fiyat değerleri sıfırdan küçük olamaz.';
  end if;

  select * into v_urun from public.market_urunleri
  where id = p_urun_id and restaurant_id = p_restaurant_id
  for update;
  if not found then raise exception 'Güncellenecek ürün bulunamadı.'; end if;

  v_onceki_stok := coalesce(v_urun.stok_miktari, 0);
  v_stok_farki := v_yeni_stok - v_onceki_stok;

  update public.market_urunleri
  set stok_miktari = v_yeni_stok,
      alis_fiyati = round(coalesce(p_alis_fiyati, 0), 4),
      satis_fiyati = round(coalesce(p_satis_fiyati, 0), 4),
      updated_at = now()
  where id = p_urun_id and restaurant_id = p_restaurant_id
  returning * into v_urun;

  if v_stok_farki <> 0 then
    insert into public.market_stok_hareketleri (
      restaurant_id, urun_id, hareket_tipi, miktar, onceki_stok, sonraki_stok,
      kaynak_tipi, kaynak_id, aciklama
    ) values (
      p_restaurant_id, p_urun_id, 'Manuel Düzeltme', v_stok_farki,
      v_onceki_stok, v_yeni_stok, 'manuel_duzeltme', p_urun_id::text,
      coalesce(nullif(trim(p_aciklama), ''), 'Ürün kartından stok düzeltmesi')
    );
  end if;

  return to_jsonb(v_urun);
end;
$$;

revoke all on function public.market_urun_stok_fiyat_guncelle_atomik(
  bigint, uuid, numeric, numeric, numeric, text
) from public, anon;
grant execute on function public.market_urun_stok_fiyat_guncelle_atomik(
  bigint, uuid, numeric, numeric, numeric, text
) to authenticated, service_role;

commit;
