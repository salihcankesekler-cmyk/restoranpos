-- Market personel yetkilerini kritik atomik işlemlerde birbirinden ayırır.

begin;

do $migration$
declare
  v_oid regprocedure;
  v_definition text;
  v_updated text;
begin
  v_oid := to_regprocedure('public.market_sayim_kaydet_atomik(bigint,text,jsonb,uuid)');
  if v_oid is null then
    raise exception 'market_sayim_kaydet_atomik fonksiyonu bulunamadı.';
  end if;
  v_definition := pg_get_functiondef(v_oid);
  if strpos(v_definition, '''stok_duzenle''') = 0 then
    v_updated := replace(
      v_definition,
      'private.integra_detay_yetkisi_var(p_restaurant_id, ''urun_yonet'')',
      'private.integra_detay_yetkisi_var(p_restaurant_id, ''stok_duzenle'')'
    );
    v_updated := replace(
      v_updated,
      'Market sayımı tamamlamak için ürün yönetme yetkisi gerekir.',
      'Market sayımı tamamlamak için stok düzenleme yetkisi gerekir.'
    );
    if v_updated = v_definition then
      raise exception 'Market sayım yetki kontrolü güncellenemedi.';
    end if;
    execute v_updated;
  end if;

  v_oid := to_regprocedure('public.market_alis_faturasi_kaydet_atomik(bigint,uuid,text,text,text,date,jsonb,uuid)');
  if v_oid is null then
    raise exception 'market_alis_faturasi_kaydet_atomik fonksiyonu bulunamadı.';
  end if;
  v_definition := pg_get_functiondef(v_oid);
  if strpos(v_definition, '''alis_yonet''') = 0 then
    v_updated := replace(
      v_definition,
      'private.integra_detay_yetkisi_var(p_restaurant_id, ''urun_yonet'')',
      'private.integra_detay_yetkisi_var(p_restaurant_id, ''alis_yonet'')'
    );
    v_updated := replace(
      v_updated,
      'Alış faturası kaydetmek için ürün yönetme yetkisi gerekir.',
      'Alış faturası kaydetmek için alış yönetme yetkisi gerekir.'
    );
    if v_updated = v_definition then
      raise exception 'Alış faturası kayıt yetkisi güncellenemedi.';
    end if;
    execute v_updated;
  end if;

  v_oid := to_regprocedure('public.market_alis_faturasi_sil_v2_atomik(bigint,uuid)');
  if v_oid is null then
    raise exception 'market_alis_faturasi_sil_v2_atomik fonksiyonu bulunamadı.';
  end if;
  v_definition := pg_get_functiondef(v_oid);
  if strpos(v_definition, '''silme_yap''') = 0 then
    v_updated := replace(
      v_definition,
      'private.integra_detay_yetkisi_var(p_restaurant_id, ''urun_yonet'')',
      'private.integra_detay_yetkisi_var(p_restaurant_id, ''silme_yap'')'
    );
    v_updated := replace(
      v_updated,
      'Alış faturası silmek için ürün yönetme yetkisi gerekir.',
      'Alış faturası silmek için silme yetkisi gerekir.'
    );
    if v_updated = v_definition then
      raise exception 'Alış faturası silme yetkisi güncellenemedi.';
    end if;
    execute v_updated;
  end if;

  v_oid := to_regprocedure('public.market_satis_iade_v2_atomik(bigint,uuid,jsonb,text,boolean,uuid)');
  if v_oid is null then
    raise exception 'market_satis_iade_v2_atomik fonksiyonu bulunamadı.';
  end if;
  v_definition := pg_get_functiondef(v_oid);
  if strpos(v_definition, '''iade_yap''') = 0 then
    v_updated := replace(
      v_definition,
      'private.integra_detay_yetkisi_var(p_restaurant_id, ''odeme_al'')',
      '(private.integra_detay_yetkisi_var(p_restaurant_id, ''iade_yap'') and private.integra_detay_yetkisi_var(p_restaurant_id, ''odeme_al''))'
    );
    v_updated := replace(
      v_updated,
      'Market satış iadesi için yetkiniz yok.',
      'Market satış iadesi için iade ve ödeme alma yetkileri gerekir.'
    );
    if v_updated = v_definition then
      raise exception 'Market satış iade yetkisi güncellenemedi.';
    end if;
    execute v_updated;
  end if;
end;
$migration$;

commit;
