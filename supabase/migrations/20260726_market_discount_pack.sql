-- Integra Market indirim paketi
-- Sepet geneli yüzde/TL ve ürün bazlı indirimleri fişe kaydeder.
-- Önce 20260726_market_operations_pack.sql, ardından bu dosya çalıştırılmalıdır.

alter table public.market_satislari
  add column if not exists brut_toplam numeric(14,2) not null default 0,
  add column if not exists urun_indirim_toplami numeric(14,2) not null default 0,
  add column if not exists genel_indirim_toplami numeric(14,2) not null default 0,
  add column if not exists indirim_toplami numeric(14,2) not null default 0;

alter table public.market_satis_kalemleri
  add column if not exists liste_fiyati numeric(14,2) not null default 0,
  add column if not exists urun_indirim_tutari numeric(14,2) not null default 0,
  add column if not exists genel_indirim_payi numeric(14,2) not null default 0;

update public.market_satislari
set brut_toplam = toplam_tutar
where brut_toplam = 0 and toplam_tutar <> 0;

update public.market_satis_kalemleri
set liste_fiyati = birim_fiyat
where liste_fiyati = 0 and birim_fiyat <> 0;

create or replace function public.market_satis_kaydet_indirimli_atomik(
  p_restaurant_id bigint,
  p_kalemler jsonb,
  p_odeme_tipi text,
  p_cari_id text default null,
  p_islem_anahtari uuid default gen_random_uuid(),
  p_indirim_turu text default 'yuzde',
  p_indirim_degeri numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_kalem jsonb;
  v_duzeltilmis_kalemler jsonb := '[]'::jsonb;
  v_adet numeric;
  v_liste_fiyati numeric;
  v_urun_net_fiyati numeric;
  v_satir_tutari numeric;
  v_genel_indirim numeric := 0;
  v_indirim_payi numeric;
  v_dagitilan_indirim numeric := 0;
  v_brut_toplam numeric := 0;
  v_ara_toplam numeric := 0;
  v_minimum_net_toplam numeric := 0;
  v_kalem_sayisi integer;
  v_sira integer := 0;
  v_sonuc jsonb;
  v_satis_id uuid;
  v_satir_id uuid;
  v_kayitli_satir_toplami numeric;
  v_toplam_brut numeric;
  v_toplam_urun_indirimi numeric;
  v_toplam_genel_indirim numeric;
begin
  if p_restaurant_id is distinct from (select private.integra_restaurant_id()) then
    raise exception 'Bu işletme için işlem yetkiniz yok.';
  end if;
  if jsonb_typeof(p_kalemler) <> 'array' or jsonb_array_length(p_kalemler) = 0 then
    raise exception 'Satış için en az bir ürün gereklidir.';
  end if;

  v_kalem_sayisi := jsonb_array_length(p_kalemler);
  for v_kalem in select value from jsonb_array_elements(p_kalemler)
  loop
    v_adet := coalesce((v_kalem ->> 'adet')::numeric, 0);
    v_liste_fiyati := coalesce((v_kalem ->> 'liste_fiyati')::numeric, 0);
    v_urun_net_fiyati := coalesce((v_kalem ->> 'satis_fiyati')::numeric, 0);
    if v_adet <= 0 or v_liste_fiyati <= 0 then
      raise exception 'Ürün adedi ve liste fiyatı sıfırdan büyük olmalıdır.';
    end if;
    if v_urun_net_fiyati <= 0 or v_urun_net_fiyati > v_liste_fiyati then
      raise exception 'İndirim sonrası ürün fiyatı sıfırdan büyük ve liste fiyatını aşmayacak şekilde olmalıdır.';
    end if;
    v_brut_toplam := v_brut_toplam + (v_adet * v_liste_fiyati);
    v_ara_toplam := v_ara_toplam + (v_adet * v_urun_net_fiyati);
    v_minimum_net_toplam := v_minimum_net_toplam + (v_adet * 0.01);
  end loop;

  if p_indirim_turu = 'tutar' then
    v_genel_indirim := least(greatest(coalesce(p_indirim_degeri, 0), 0), greatest(v_ara_toplam - v_minimum_net_toplam, 0));
  else
    v_genel_indirim := least(
      v_ara_toplam * least(greatest(coalesce(p_indirim_degeri, 0), 0), 99.99) / 100,
      greatest(v_ara_toplam - v_minimum_net_toplam, 0)
    );
  end if;

  for v_kalem in select value from jsonb_array_elements(p_kalemler)
  loop
    v_sira := v_sira + 1;
    v_adet := (v_kalem ->> 'adet')::numeric;
    v_urun_net_fiyati := (v_kalem ->> 'satis_fiyati')::numeric;
    v_satir_tutari := v_adet * v_urun_net_fiyati;
    if v_sira = v_kalem_sayisi then
      v_indirim_payi := v_genel_indirim - v_dagitilan_indirim;
    else
      v_indirim_payi := case when v_ara_toplam > 0
        then round(v_genel_indirim * v_satir_tutari / v_ara_toplam, 2)
        else 0 end;
      v_dagitilan_indirim := v_dagitilan_indirim + v_indirim_payi;
    end if;
    v_duzeltilmis_kalemler := v_duzeltilmis_kalemler || jsonb_build_array(jsonb_build_object(
      'id', v_kalem ->> 'id',
      'adet', v_adet,
      'satis_fiyati', greatest((v_satir_tutari - v_indirim_payi) / v_adet, 0.01)
    ));
  end loop;

  v_sonuc := public.market_satis_kaydet_atomik(
    p_restaurant_id,
    v_duzeltilmis_kalemler,
    p_odeme_tipi,
    p_cari_id,
    p_islem_anahtari
  );
  v_satis_id := (v_sonuc ->> 'id')::uuid;

  v_sira := 0;
  v_dagitilan_indirim := 0;
  for v_kalem in select value from jsonb_array_elements(p_kalemler)
  loop
    v_sira := v_sira + 1;
    v_adet := (v_kalem ->> 'adet')::numeric;
    v_liste_fiyati := (v_kalem ->> 'liste_fiyati')::numeric;
    v_urun_net_fiyati := (v_kalem ->> 'satis_fiyati')::numeric;
    v_satir_tutari := v_adet * v_urun_net_fiyati;

    select id, toplam_tutar into v_satir_id, v_kayitli_satir_toplami
    from public.market_satis_kalemleri
    where satis_id = v_satis_id
      and urun_id = (v_kalem ->> 'id')::uuid
      and liste_fiyati = 0
    order by created_at, id
    limit 1
    for update;

    if v_satir_id is not null then
      update public.market_satis_kalemleri set
        liste_fiyati = v_liste_fiyati,
        urun_indirim_tutari = greatest((v_liste_fiyati - v_urun_net_fiyati) * v_adet, 0),
        genel_indirim_payi = greatest(v_satir_tutari - v_kayitli_satir_toplami, 0)
      where id = v_satir_id;
    end if;
    v_satir_id := null;
  end loop;

  select
    coalesce(sum(liste_fiyati * adet), 0),
    coalesce(sum(urun_indirim_tutari), 0),
    coalesce(sum(genel_indirim_payi), 0)
  into v_toplam_brut, v_toplam_urun_indirimi, v_toplam_genel_indirim
  from public.market_satis_kalemleri
  where satis_id = v_satis_id;

  update public.market_satislari set
    brut_toplam = v_toplam_brut,
    urun_indirim_toplami = v_toplam_urun_indirimi,
    genel_indirim_toplami = v_toplam_genel_indirim,
    indirim_toplami = v_toplam_urun_indirimi + v_toplam_genel_indirim
  where id = v_satis_id and restaurant_id = p_restaurant_id;

  select to_jsonb(s) || jsonb_build_object(
    'market_satis_kalemleri',
    coalesce((select jsonb_agg(to_jsonb(k)) from public.market_satis_kalemleri k where k.satis_id = s.id), '[]'::jsonb)
  ) into v_sonuc
  from public.market_satislari s
  where s.id = v_satis_id;

  return v_sonuc;
end;
$$;

revoke all on function public.market_satis_kaydet_indirimli_atomik(bigint, jsonb, text, text, uuid, text, numeric) from public, anon;
grant execute on function public.market_satis_kaydet_indirimli_atomik(bigint, jsonb, text, text, uuid, text, numeric) to authenticated;
