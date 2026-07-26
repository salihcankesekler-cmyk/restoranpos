-- Integra Market alış faturası güvenli silme
-- Faturayı silerken stok ve cari etkisini tek işlem içinde geri alır.
-- Supabase SQL Editor içinde bir kez çalıştırın. Tekrar çalıştırılması güvenlidir.

create or replace function public.market_alis_faturasi_sil_atomik(
  p_restaurant_id bigint,
  p_fatura_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_fatura record;
  v_satir record;
  v_onceki_stok numeric;
  v_cari record;
  v_cari_etkisi numeric := 0;
  v_yeni_hareketler jsonb := '[]'::jsonb;
begin
  if p_restaurant_id is distinct from (select private.integra_restaurant_id()) then
    raise exception 'Bu işletme için işlem yetkiniz yok.';
  end if;

  select *
    into v_fatura
    from public.market_alis_faturalari
   where id = p_fatura_id
     and restaurant_id = p_restaurant_id
   for update;

  if not found then
    raise exception 'Silinecek alış faturası bulunamadı.';
  end if;

  for v_satir in
    select urun_id, sum(miktar)::numeric as miktar
      from public.market_alis_fatura_kalemleri
     where fatura_id = p_fatura_id
       and restaurant_id = p_restaurant_id
     group by urun_id
     order by urun_id
  loop
    select stok_miktari
      into v_onceki_stok
      from public.market_urunleri
     where id = v_satir.urun_id
       and restaurant_id = p_restaurant_id
     for update;

    if found then
      update public.market_urunleri
         set stok_miktari = coalesce(stok_miktari, 0) - v_satir.miktar
       where id = v_satir.urun_id
         and restaurant_id = p_restaurant_id;

      insert into public.market_stok_hareketleri (
        restaurant_id, urun_id, hareket_tipi, miktar,
        onceki_stok, sonraki_stok, kaynak_tipi, kaynak_id, aciklama
      ) values (
        p_restaurant_id, v_satir.urun_id, 'Alış Faturası Silme', -v_satir.miktar,
        coalesce(v_onceki_stok, 0), coalesce(v_onceki_stok, 0) - v_satir.miktar,
        'market_alis_faturasi_silme', p_fatura_id::text,
        coalesce(v_fatura.fatura_no, 'Numarasız') || ' alış faturası silindi'
      );
    end if;
  end loop;

  if nullif(v_fatura.cari_id, '') is not null then
    select id, bakiye, hareketler
      into v_cari
      from public.cari_musteriler
     where restaurant_id = p_restaurant_id
       and id::text = v_fatura.cari_id
     for update;

    if found then
      select coalesce(sum(coalesce(nullif(hareket ->> 'bakiye_etkisi', '')::numeric, 0)), 0)
        into v_cari_etkisi
        from jsonb_array_elements(coalesce(nullif(v_cari.hareketler, 'null'::jsonb), '[]'::jsonb)) as h(hareket)
       where hareket ->> 'kaynak' = 'market_alis_faturasi'
         and hareket ->> 'kaynak_id' = p_fatura_id::text;

      select coalesce(jsonb_agg(hareket), '[]'::jsonb)
        into v_yeni_hareketler
        from jsonb_array_elements(coalesce(nullif(v_cari.hareketler, 'null'::jsonb), '[]'::jsonb)) as h(hareket)
       where not (
         hareket ->> 'kaynak' = 'market_alis_faturasi'
         and hareket ->> 'kaynak_id' = p_fatura_id::text
       );

      update public.cari_musteriler
         set bakiye = coalesce(bakiye, 0) - v_cari_etkisi,
             hareketler = v_yeni_hareketler
       where id = v_cari.id
         and restaurant_id = p_restaurant_id;
    end if;
  end if;

  delete from public.market_alis_faturalari
   where id = p_fatura_id
     and restaurant_id = p_restaurant_id;

  return jsonb_build_object(
    'id', p_fatura_id,
    'cari_id', v_fatura.cari_id,
    'genel_toplam', v_fatura.genel_toplam,
    'silindi', true
  );
end;
$$;

revoke all on function public.market_alis_faturasi_sil_atomik(bigint, uuid) from public, anon;
grant execute on function public.market_alis_faturasi_sil_atomik(bigint, uuid) to authenticated;

notify pgrst, 'reload schema';
