-- Market alis faturasi kayit/duzenleme, stok ve cari etkisini tek transaction'da tutar.

begin;

alter table public.market_alis_faturalari
  add column if not exists islem_anahtari uuid;

create unique index if not exists market_alis_faturalari_islem_anahtari_unique
  on public.market_alis_faturalari (restaurant_id, islem_anahtari)
  where islem_anahtari is not null;

create or replace function public.market_alis_faturasi_kaydet_atomik(
  p_restaurant_id bigint,
  p_fatura_id uuid,
  p_cari_id text,
  p_tedarikci_adi text,
  p_fatura_no text,
  p_fatura_tarihi date,
  p_kalemler jsonb,
  p_islem_anahtari uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_fatura public.market_alis_faturalari%rowtype;
  v_onceki_fatura public.market_alis_faturalari%rowtype;
  v_urun public.market_urunleri%rowtype;
  v_cari public.cari_musteriler%rowtype;
  v_kalem jsonb;
  v_fark record;
  v_urun_id uuid;
  v_miktar numeric(14,3);
  v_alis_fiyati numeric(14,4);
  v_kdv_orani numeric(7,2);
  v_satir_toplami numeric(14,2);
  v_ara_toplam numeric(14,2) := 0;
  v_kdv_toplam numeric(14,2) := 0;
  v_genel_toplam numeric(14,2) := 0;
  v_tedarikci_adi text;
  v_hareketler jsonb;
  v_yeni_hareketler jsonb;
  v_onceki_etki numeric(14,2);
  v_hareket jsonb;
  v_sonuc jsonb;
begin
  if not private.integra_sekme_yetkisi_var(p_restaurant_id, 'market')
     or not private.integra_detay_yetkisi_var(p_restaurant_id, 'urun_yonet') then
    raise exception 'Alış faturası kaydetmek için ürün yönetme yetkisi gerekir.';
  end if;
  if p_islem_anahtari is null then
    raise exception 'Güvenli alış faturası işlem anahtarı bulunamadı.';
  end if;
  if p_fatura_tarihi is null then
    raise exception 'Fatura tarihi zorunludur.';
  end if;
  if jsonb_typeof(p_kalemler) <> 'array' or jsonb_array_length(p_kalemler) = 0 then
    raise exception 'Alış faturası için en az bir ürün gereklidir.';
  end if;
  if jsonb_array_length(p_kalemler) > 2000 then
    raise exception 'Bir alış faturasında en fazla 2000 ürün işlenebilir.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_kalemler) x
    group by x ->> 'id'
    having count(*) > 1
  ) then
    raise exception 'Aynı ürün alış faturasında birden fazla satırda bulunamaz.';
  end if;
  if exists (
    select 1 from public.gun_sonu_kilitleri g
    where g.restaurant_id = p_restaurant_id
      and g.tarih = p_fatura_tarihi
      and g.kilitli = true
  ) then
    raise exception 'Fatura tarihinin gün sonu kilitli. Alış faturası değiştirilemez.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_restaurant_id::text || ':' || p_islem_anahtari::text, 0));
  select * into v_fatura from public.market_alis_faturalari
  where restaurant_id = p_restaurant_id and islem_anahtari = p_islem_anahtari;
  if found then
    select to_jsonb(v_fatura) || jsonb_build_object(
      'market_alis_fatura_kalemleri',
      coalesce((select jsonb_agg(to_jsonb(k) order by k.created_at, k.id)
        from public.market_alis_fatura_kalemleri k where k.fatura_id = v_fatura.id), '[]'::jsonb),
      'tekrarlandi', true
    ) into v_sonuc;
    return v_sonuc;
  end if;

  if p_fatura_id is not null then
    select * into v_onceki_fatura from public.market_alis_faturalari
    where id = p_fatura_id and restaurant_id = p_restaurant_id
    for update;
    if not found then
      raise exception 'Güncellenecek alış faturası bulunamadı.';
    end if;
    if exists (
      select 1 from public.gun_sonu_kilitleri g
      where g.restaurant_id = p_restaurant_id
        and g.tarih = v_onceki_fatura.fatura_tarihi
        and g.kilitli = true
    ) then
      raise exception 'Mevcut faturanın gün sonu kilitli. Alış faturası değiştirilemez.';
    end if;
  end if;

  perform 1
  from public.market_urunleri u
  where u.restaurant_id = p_restaurant_id
    and (
      u.id in (select (x ->> 'id')::uuid from jsonb_array_elements(p_kalemler) x)
      or (p_fatura_id is not null and u.id in (
        select k.urun_id from public.market_alis_fatura_kalemleri k
        where k.restaurant_id = p_restaurant_id and k.fatura_id = p_fatura_id
      ))
    )
  order by u.id
  for update;

  if (select count(*) from public.market_urunleri u
      where u.restaurant_id = p_restaurant_id
        and u.id in (select (x ->> 'id')::uuid from jsonb_array_elements(p_kalemler) x))
     <> jsonb_array_length(p_kalemler) then
    raise exception 'Alış faturası ürünlerinden biri bulunamadı.';
  end if;

  if p_fatura_id is not null and nullif(v_onceki_fatura.cari_id, '') is not null then
    perform 1 from public.cari_musteriler c
    where c.restaurant_id = p_restaurant_id
      and c.id::text in (v_onceki_fatura.cari_id, coalesce(nullif(trim(p_cari_id), ''), v_onceki_fatura.cari_id))
    order by c.id
    for update;
  elsif nullif(trim(p_cari_id), '') is not null then
    perform 1 from public.cari_musteriler c
    where c.restaurant_id = p_restaurant_id and c.id::text = trim(p_cari_id)
    for update;
  end if;

  if nullif(trim(p_cari_id), '') is not null then
    select * into v_cari from public.cari_musteriler
    where restaurant_id = p_restaurant_id and id::text = trim(p_cari_id)
    for update;
    if not found then raise exception 'Seçilen tedarikçi carisi bulunamadı.'; end if;
    v_tedarikci_adi := v_cari.ad;
  else
    v_tedarikci_adi := nullif(trim(p_tedarikci_adi), '');
    if v_tedarikci_adi is null then raise exception 'Tedarikçi adı veya cari seçimi zorunludur.'; end if;
  end if;

  for v_kalem in select value from jsonb_array_elements(p_kalemler)
  loop
    begin
      v_miktar := round(coalesce((v_kalem ->> 'miktar')::numeric, 0), 3);
      v_alis_fiyati := round(coalesce((v_kalem ->> 'alis_fiyati')::numeric, 0), 4);
      v_kdv_orani := round(coalesce((v_kalem ->> 'kdv_orani')::numeric, 0), 2);
    exception when others then
      raise exception 'Alış faturası kalemlerinden birinin miktar veya fiyatı geçersiz.';
    end;
    if v_miktar <= 0 or v_alis_fiyati < 0 or v_kdv_orani < 0 or v_kdv_orani > 100 then
      raise exception 'Alış miktarı pozitif; fiyat ve KDV geçerli aralıkta olmalıdır.';
    end if;
    v_satir_toplami := round(v_miktar * v_alis_fiyati, 2);
    v_genel_toplam := v_genel_toplam + v_satir_toplami;
    v_kdv_toplam := v_kdv_toplam + round(
      case when v_kdv_orani > 0 then v_satir_toplami * v_kdv_orani / (100 + v_kdv_orani) else 0 end,
      2
    );
  end loop;
  v_genel_toplam := round(v_genel_toplam, 2);
  v_kdv_toplam := round(v_kdv_toplam, 2);
  v_ara_toplam := v_genel_toplam - v_kdv_toplam;

  if p_fatura_id is null then
    insert into public.market_alis_faturalari (
      restaurant_id, cari_id, tedarikci_adi, fatura_no, fatura_tarihi,
      ara_toplam, kdv_toplam, genel_toplam, durum, islem_anahtari
    ) values (
      p_restaurant_id, nullif(trim(p_cari_id), ''), v_tedarikci_adi,
      nullif(trim(p_fatura_no), ''), p_fatura_tarihi,
      v_ara_toplam, v_kdv_toplam, v_genel_toplam, 'Kaydedildi', p_islem_anahtari
    ) returning * into v_fatura;
  else
    update public.market_alis_faturalari
    set cari_id = nullif(trim(p_cari_id), ''),
        tedarikci_adi = v_tedarikci_adi,
        fatura_no = nullif(trim(p_fatura_no), ''),
        fatura_tarihi = p_fatura_tarihi,
        ara_toplam = v_ara_toplam,
        kdv_toplam = v_kdv_toplam,
        genel_toplam = v_genel_toplam,
        durum = 'Kaydedildi',
        islem_anahtari = p_islem_anahtari
    where id = p_fatura_id and restaurant_id = p_restaurant_id
    returning * into v_fatura;
  end if;

  for v_fark in
    with eski as (
      select k.urun_id, sum(k.miktar)::numeric as miktar
      from public.market_alis_fatura_kalemleri k
      where p_fatura_id is not null
        and k.restaurant_id = p_restaurant_id
        and k.fatura_id = p_fatura_id
      group by k.urun_id
    ), yeni as (
      select (x ->> 'id')::uuid as urun_id,
             sum((x ->> 'miktar')::numeric)::numeric as miktar,
             max((x ->> 'alis_fiyati')::numeric)::numeric as alis_fiyati
      from jsonb_array_elements(p_kalemler) x
      group by (x ->> 'id')::uuid
    )
    select coalesce(eski.urun_id, yeni.urun_id) as urun_id,
           coalesce(eski.miktar, 0) as eski_miktar,
           coalesce(yeni.miktar, 0) as yeni_miktar,
           yeni.alis_fiyati
    from eski full join yeni using (urun_id)
    order by coalesce(eski.urun_id, yeni.urun_id)
  loop
    select * into v_urun from public.market_urunleri
    where id = v_fark.urun_id and restaurant_id = p_restaurant_id
    for update;
    v_miktar := round(v_fark.yeni_miktar - v_fark.eski_miktar, 3);

    update public.market_urunleri
    set stok_miktari = coalesce(stok_miktari, 0) + v_miktar,
        alis_fiyati = coalesce(v_fark.alis_fiyati, alis_fiyati),
        updated_at = now()
    where id = v_urun.id and restaurant_id = p_restaurant_id;

    if v_miktar <> 0 then
      insert into public.market_stok_hareketleri (
        restaurant_id, urun_id, hareket_tipi, miktar, onceki_stok, sonraki_stok,
        kaynak_tipi, kaynak_id, aciklama
      ) values (
        p_restaurant_id, v_urun.id,
        case when p_fatura_id is null then 'Alış' else 'Alış Düzeltmesi' end,
        v_miktar, coalesce(v_urun.stok_miktari, 0), coalesce(v_urun.stok_miktari, 0) + v_miktar,
        'market_alis_faturasi', v_fatura.id::text,
        coalesce(nullif(trim(p_fatura_no), ''), 'Numarasız') || ' alış faturası'
      );
    end if;
  end loop;

  delete from public.market_alis_fatura_kalemleri
  where fatura_id = v_fatura.id and restaurant_id = p_restaurant_id;

  for v_kalem in select value from jsonb_array_elements(p_kalemler)
  loop
    v_urun_id := (v_kalem ->> 'id')::uuid;
    v_miktar := round((v_kalem ->> 'miktar')::numeric, 3);
    v_alis_fiyati := round((v_kalem ->> 'alis_fiyati')::numeric, 4);
    v_kdv_orani := round(coalesce((v_kalem ->> 'kdv_orani')::numeric, 0), 2);
    v_satir_toplami := round(v_miktar * v_alis_fiyati, 2);
    select * into v_urun from public.market_urunleri
    where id = v_urun_id and restaurant_id = p_restaurant_id;

    insert into public.market_alis_fatura_kalemleri (
      restaurant_id, fatura_id, urun_id, barkod, urun_adi, miktar,
      birim_alis_fiyati, kdv_orani, satir_toplami
    ) values (
      p_restaurant_id, v_fatura.id, v_urun.id, v_urun.barkod, v_urun.urun_adi,
      v_miktar, v_alis_fiyati, v_kdv_orani, v_satir_toplami
    );
  end loop;

  if p_fatura_id is not null and nullif(v_onceki_fatura.cari_id, '') is not null then
    select * into v_cari from public.cari_musteriler
    where restaurant_id = p_restaurant_id and id::text = v_onceki_fatura.cari_id
    for update;
    if found then
      v_hareketler := coalesce(to_jsonb(v_cari.hareketler), '[]'::jsonb);
      select coalesce(sum(coalesce(nullif(h ->> 'bakiye_etkisi', '')::numeric, 0)), 0)
      into v_onceki_etki
      from jsonb_array_elements(v_hareketler) h
      where h ->> 'kaynak' = 'market_alis_faturasi'
        and h ->> 'kaynak_id' = v_fatura.id::text;
      select coalesce(jsonb_agg(h), '[]'::jsonb) into v_yeni_hareketler
      from jsonb_array_elements(v_hareketler) h
      where not (h ->> 'kaynak' = 'market_alis_faturasi'
        and h ->> 'kaynak_id' = v_fatura.id::text);
      update public.cari_musteriler
      set bakiye = coalesce(bakiye, 0) - v_onceki_etki,
          hareketler = v_yeni_hareketler
      where id::text = v_onceki_fatura.cari_id and restaurant_id = p_restaurant_id;
    end if;
  end if;

  if nullif(trim(p_cari_id), '') is not null then
    select * into v_cari from public.cari_musteriler
    where restaurant_id = p_restaurant_id and id::text = trim(p_cari_id)
    for update;
    v_hareketler := coalesce(to_jsonb(v_cari.hareketler), '[]'::jsonb);
    v_hareket := jsonb_build_object(
      'id', v_fatura.id::text,
      'tip', 'Alış Faturası',
      'tutar', v_genel_toplam,
      'aciklama', coalesce(nullif(trim(p_fatura_no), ''), 'Numarasız') || ' alış faturası',
      'tarih', (p_fatura_tarihi::timestamp + time '12:00') at time zone 'Europe/Istanbul',
      'kaynak', 'market_alis_faturasi',
      'kaynak_id', v_fatura.id::text,
      'bakiye_etkisi', -v_genel_toplam
    );
    update public.cari_musteriler
    set bakiye = coalesce(bakiye, 0) - v_genel_toplam,
        hareketler = jsonb_build_array(v_hareket) || v_hareketler
    where id::text = trim(p_cari_id) and restaurant_id = p_restaurant_id;
  end if;

  select to_jsonb(v_fatura) || jsonb_build_object(
    'market_alis_fatura_kalemleri',
    coalesce((select jsonb_agg(to_jsonb(k) order by k.created_at, k.id)
      from public.market_alis_fatura_kalemleri k where k.fatura_id = v_fatura.id), '[]'::jsonb),
    'tekrarlandi', false
  ) into v_sonuc;
  return v_sonuc;
end;
$$;

revoke all on function public.market_alis_faturasi_kaydet_atomik(
  bigint, uuid, text, text, text, date, jsonb, uuid
) from public, anon;
grant execute on function public.market_alis_faturasi_kaydet_atomik(
  bigint, uuid, text, text, text, date, jsonb, uuid
) to authenticated, service_role;

create or replace function public.market_alis_faturasi_sil_v2_atomik(
  p_restaurant_id bigint,
  p_fatura_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_tarih date;
begin
  if not private.integra_sekme_yetkisi_var(p_restaurant_id, 'market')
     or not private.integra_detay_yetkisi_var(p_restaurant_id, 'urun_yonet') then
    raise exception 'Alış faturası silmek için ürün yönetme yetkisi gerekir.';
  end if;
  select fatura_tarihi into v_tarih from public.market_alis_faturalari
  where id = p_fatura_id and restaurant_id = p_restaurant_id;
  if not found then raise exception 'Silinecek alış faturası bulunamadı.'; end if;
  if exists (
    select 1 from public.gun_sonu_kilitleri g
    where g.restaurant_id = p_restaurant_id and g.tarih = v_tarih and g.kilitli = true
  ) then
    raise exception 'Fatura tarihinin gün sonu kilitli. Alış faturası silinemez.';
  end if;
  return public.market_alis_faturasi_sil_atomik(p_restaurant_id, p_fatura_id);
end;
$$;

revoke all on function public.market_alis_faturasi_sil_atomik(bigint, uuid)
  from public, anon, authenticated;
grant execute on function public.market_alis_faturasi_sil_atomik(bigint, uuid)
  to service_role;
revoke all on function public.market_alis_faturasi_sil_v2_atomik(bigint, uuid)
  from public, anon;
grant execute on function public.market_alis_faturasi_sil_v2_atomik(bigint, uuid)
  to authenticated, service_role;

commit;
