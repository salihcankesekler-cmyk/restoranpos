-- Integra Market sade iskonto ve ikram desteği
-- Önce operations_pack ve discount_pack SQL dosyaları çalıştırılmış olmalıdır.
-- Bu dosya mevcut atomik fonksiyonları veri kaybetmeden ikram (0 TL) destekleyecek şekilde günceller.

do $$
declare
  v_satis_fonksiyonu regprocedure;
  v_indirim_fonksiyonu regprocedure;
  v_tanim text;
begin
  v_satis_fonksiyonu := to_regprocedure(
    'public.market_satis_kaydet_atomik(bigint,jsonb,text,text,uuid)'
  );
  v_indirim_fonksiyonu := to_regprocedure(
    'public.market_satis_kaydet_indirimli_atomik(bigint,jsonb,text,text,uuid,text,numeric)'
  );

  if v_satis_fonksiyonu is null or v_indirim_fonksiyonu is null then
    raise exception 'Önce 20260726_market_operations_pack.sql ve 20260726_market_discount_pack.sql dosyalarını çalıştırın.';
  end if;

  v_tanim := pg_get_functiondef(v_satis_fonksiyonu);
  v_tanim := replace(
    v_tanim,
    'greatest(coalesce((v_kalem ->> ''satis_fiyati'')::numeric, 0), 0)',
    'coalesce((v_kalem ->> ''satis_fiyati'')::numeric, 0)'
  );
  v_tanim := replace(v_tanim, 'v_fiyat <= 0', 'v_fiyat < 0');
  execute v_tanim;

  v_tanim := pg_get_functiondef(v_indirim_fonksiyonu);
  v_tanim := replace(v_tanim, 'v_urun_net_fiyati <= 0', 'v_urun_net_fiyati < 0');
  v_tanim := replace(v_tanim, '99.99', '100');
  v_tanim := replace(
    v_tanim,
    'v_minimum_net_toplam := v_minimum_net_toplam + (v_adet * 0.01);',
    'v_minimum_net_toplam := v_minimum_net_toplam + 0;'
  );
  v_tanim := replace(
    v_tanim,
    'greatest((v_satir_tutari - v_indirim_payi) / v_adet, 0.01)',
    'greatest((v_satir_tutari - v_indirim_payi) / v_adet, 0)'
  );
  execute v_tanim;
end $$;

revoke all on function public.market_satis_kaydet_atomik(bigint, jsonb, text, text, uuid) from public, anon;
revoke all on function public.market_satis_kaydet_indirimli_atomik(bigint, jsonb, text, text, uuid, text, numeric) from public, anon;
grant execute on function public.market_satis_kaydet_atomik(bigint, jsonb, text, text, uuid) to authenticated;
grant execute on function public.market_satis_kaydet_indirimli_atomik(bigint, jsonb, text, text, uuid, text, numeric) to authenticated;
