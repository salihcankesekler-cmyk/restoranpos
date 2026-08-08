-- Market sayim basligi, tum kalemler, stoklar ve fark hareketleri tek transaction'da.

begin;

alter table public.market_sayimlari
  add column if not exists islem_anahtari uuid;

create unique index if not exists market_sayimlari_islem_anahtari_unique
  on public.market_sayimlari (restaurant_id, islem_anahtari)
  where islem_anahtari is not null;

create or replace function public.market_sayim_kaydet_atomik(
  p_restaurant_id bigint,
  p_sayim_adi text,
  p_kalemler jsonb,
  p_islem_anahtari uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_sayim public.market_sayimlari%rowtype;
  v_urun public.market_urunleri%rowtype;
  v_kalem jsonb;
  v_urun_id uuid;
  v_sayilan numeric(14,3);
  v_fark numeric(14,3);
  v_toplam_kalem integer := 0;
  v_farkli_kalem integer := 0;
  v_sonuc jsonb;
begin
  if not private.integra_sekme_yetkisi_var(p_restaurant_id, 'market')
     or not private.integra_detay_yetkisi_var(p_restaurant_id, 'urun_yonet') then
    raise exception 'Market sayımı tamamlamak için ürün yönetme yetkisi gerekir.';
  end if;
  if p_islem_anahtari is null then
    raise exception 'Güvenli sayım işlem anahtarı bulunamadı.';
  end if;
  if nullif(trim(p_sayim_adi), '') is null then
    raise exception 'Sayım adı zorunludur.';
  end if;
  if jsonb_typeof(p_kalemler) <> 'array' or jsonb_array_length(p_kalemler) = 0 then
    raise exception 'Sayım için en az bir ürün gereklidir.';
  end if;
  if jsonb_array_length(p_kalemler) > 5000 then
    raise exception 'Tek sayımda en fazla 5000 ürün işlenebilir.';
  end if;
  if exists (
    select 1 from public.gun_sonu_kilitleri g
    where g.restaurant_id = p_restaurant_id
      and g.tarih = (now() at time zone 'Europe/Istanbul')::date
      and g.kilitli = true
  ) then
    raise exception 'Bugünün gün sonu kilitli. Stok sayımı kaydedilemez.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_kalemler) x
    group by x ->> 'id'
    having count(*) > 1
  ) then
    raise exception 'Aynı ürün sayım listesinde birden fazla kez bulunamaz.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_restaurant_id::text || ':' || p_islem_anahtari::text, 0));
  select * into v_sayim from public.market_sayimlari
  where restaurant_id = p_restaurant_id and islem_anahtari = p_islem_anahtari;
  if found then
    select to_jsonb(v_sayim) || jsonb_build_object(
      'market_sayim_kalemleri',
      coalesce((select jsonb_agg(to_jsonb(k) order by k.created_at, k.id)
        from public.market_sayim_kalemleri k where k.sayim_id = v_sayim.id), '[]'::jsonb),
      'tekrarlandi', true
    ) into v_sonuc;
    return v_sonuc;
  end if;

  perform 1
  from public.market_urunleri u
  where u.restaurant_id = p_restaurant_id
    and u.id in (
      select (x ->> 'id')::uuid from jsonb_array_elements(p_kalemler) x
    )
  order by u.id
  for update;

  if (select count(*) from public.market_urunleri u
      where u.restaurant_id = p_restaurant_id
        and u.id in (select (x ->> 'id')::uuid from jsonb_array_elements(p_kalemler) x))
     <> jsonb_array_length(p_kalemler) then
    raise exception 'Sayım ürünlerinden biri bulunamadı.';
  end if;

  insert into public.market_sayimlari (
    restaurant_id, sayim_adi, durum, toplam_kalem, farkli_kalem,
    tamamlanma_tarihi, islem_anahtari
  ) values (
    p_restaurant_id, trim(p_sayim_adi), 'Tamamlandı', 0, 0,
    now(), p_islem_anahtari
  ) returning * into v_sayim;

  for v_kalem in select value from jsonb_array_elements(p_kalemler)
  loop
    v_urun_id := (v_kalem ->> 'id')::uuid;
    begin
      v_sayilan := round(coalesce((v_kalem ->> 'sayilan_miktar')::numeric, 0), 3);
    exception when others then
      raise exception 'Sayım miktarlarından biri geçersiz.';
    end;
    if v_sayilan < 0 then
      raise exception 'Sayım miktarı sıfırdan küçük olamaz.';
    end if;

    select * into v_urun from public.market_urunleri
    where id = v_urun_id and restaurant_id = p_restaurant_id
    for update;

    v_fark := v_sayilan - coalesce(v_urun.stok_miktari, 0);
    v_toplam_kalem := v_toplam_kalem + 1;
    if v_fark <> 0 then
      v_farkli_kalem := v_farkli_kalem + 1;
    end if;

    insert into public.market_sayim_kalemleri (
      restaurant_id, sayim_id, urun_id, sistem_miktari, sayilan_miktar, fark_miktari
    ) values (
      p_restaurant_id, v_sayim.id, v_urun.id,
      coalesce(v_urun.stok_miktari, 0), v_sayilan, v_fark
    );

    update public.market_urunleri
    set stok_miktari = v_sayilan, updated_at = now()
    where id = v_urun.id and restaurant_id = p_restaurant_id;

    if v_fark <> 0 then
      insert into public.market_stok_hareketleri (
        restaurant_id, urun_id, hareket_tipi, miktar, onceki_stok, sonraki_stok,
        kaynak_tipi, kaynak_id, aciklama
      ) values (
        p_restaurant_id, v_urun.id, 'Sayım Farkı', v_fark,
        coalesce(v_urun.stok_miktari, 0), v_sayilan,
        'market_sayimi', v_sayim.id::text, trim(p_sayim_adi)
      );
    end if;
  end loop;

  update public.market_sayimlari
  set toplam_kalem = v_toplam_kalem,
      farkli_kalem = v_farkli_kalem
  where id = v_sayim.id and restaurant_id = p_restaurant_id
  returning * into v_sayim;

  select to_jsonb(v_sayim) || jsonb_build_object(
    'market_sayim_kalemleri',
    coalesce((select jsonb_agg(to_jsonb(k) order by k.created_at, k.id)
      from public.market_sayim_kalemleri k where k.sayim_id = v_sayim.id), '[]'::jsonb),
    'tekrarlandi', false
  ) into v_sonuc;
  return v_sonuc;
end;
$$;

revoke all on function public.market_sayim_kaydet_atomik(bigint, text, jsonb, uuid)
  from public, anon;
grant execute on function public.market_sayim_kaydet_atomik(bigint, text, jsonb, uuid)
  to authenticated, service_role;

commit;
