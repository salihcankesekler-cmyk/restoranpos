-- Açık masa adisyonunu satış/stok kapanışıyla aynı transaction içinde cariye yazar.

begin;

create or replace function public.restoran_adisyon_cariye_atomik(
  p_restaurant_id bigint,
  p_masa_id bigint,
  p_islem_anahtari uuid,
  p_cari_musteri_id bigint,
  p_tutar numeric,
  p_satis_kayitlari jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cari public.cari_musteriler%rowtype;
  v_sonuc jsonb;
  v_mevcut_sonuc jsonb;
  v_yeni_hareket jsonb;
  v_tutar numeric(14,2) := round(coalesce(p_tutar, 0), 2);
begin
  if p_islem_anahtari is null then raise exception 'Cari satış işlem anahtarı zorunludur.'; end if;
  if v_tutar <= 0 then raise exception 'Cariye yazılacak tutar sıfırdan büyük olmalıdır.'; end if;
  if not private.integra_sekme_yetkisi_var(p_restaurant_id, 'cari,masalar,kasa') then
    raise exception 'Bu işletme için cari satış yetkiniz yok.';
  end if;

  select * into v_cari from public.cari_musteriler
  where id = p_cari_musteri_id and restaurant_id = p_restaurant_id
  for update;
  if not found then raise exception 'Cari satış müşterisi bulunamadı.'; end if;

  select sonuc into v_mevcut_sonuc
  from public.restoran_islem_anahtarlari
  where restaurant_id = p_restaurant_id and islem_anahtari = p_islem_anahtari;
  if found and v_mevcut_sonuc is not null then
    return v_mevcut_sonuc
      || jsonb_build_object('cari', to_jsonb(v_cari), 'tekrarlandi', true);
  end if;

  -- Satış raporunda müşteri adı da kalıcı olsun.
  update public.masalar
  set musteri_adi = v_cari.ad
  where id = p_masa_id and restaurant_id = p_restaurant_id;

  v_sonuc := public.restoran_adisyon_odeme_atomik(
    p_restaurant_id,
    p_masa_id,
    p_islem_anahtari,
    jsonb_build_object(
      'tip', 'Cari',
      'tutar', v_tutar,
      'alinanTutar', v_tutar,
      'paraUstu', 0,
      'tarih', now()
    ),
    p_satis_kayitlari
  );

  if coalesce((v_sonuc ->> 'tekrarlandi')::boolean, false) then
    return v_sonuc || jsonb_build_object('cari', to_jsonb(v_cari));
  end if;
  if not coalesce((v_sonuc ->> 'kapandi')::boolean, false) then
    raise exception 'Cari ödeme adisyonun kalan tutarını tamamen kapatmalıdır.';
  end if;

  v_yeni_hareket := jsonb_build_object(
    'id', gen_random_uuid(),
    'tip', 'Borç',
    'tutar', v_tutar,
    'aciklama', coalesce(v_sonuc -> 'masa' ->> 'ad', 'Masa') || ' adisyonu cariye yazıldı',
    'tarih', now(),
    'odeme_tipi', null,
    'bakiye_etkisi', v_tutar,
    'kaynak_tipi', 'restoran_cari_satis',
    'kaynak_id', p_islem_anahtari
  );

  update public.cari_musteriler
  set bakiye = coalesce(bakiye, 0) + v_tutar,
      hareketler = jsonb_build_array(v_yeni_hareket) || coalesce(hareketler, '[]'::jsonb)
  where id = v_cari.id
  returning * into v_cari;

  return v_sonuc || jsonb_build_object('cari', to_jsonb(v_cari));
end;
$$;

revoke all on function public.restoran_adisyon_cariye_atomik(bigint, bigint, uuid, bigint, numeric, jsonb)
  from public, anon;
grant execute on function public.restoran_adisyon_cariye_atomik(bigint, bigint, uuid, bigint, numeric, jsonb)
  to authenticated;

notify pgrst, 'reload schema';

commit;
