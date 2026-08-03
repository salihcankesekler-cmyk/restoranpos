-- Auth gecisinden sonra yalnizca eski anon politikalari kalan restoran
-- tablolarini tekrar calisir hale getirir. Kullanici/personel hesap tablolari
-- bu kapsamda degildir ve istemciye acilmaz.

begin;

create schema if not exists private;

create or replace function private.integra_sekme_yetkisi_var(
  p_restaurant_id bigint,
  p_sekmeler_csv text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_restaurant_id = private.integra_restaurant_id()
    and exists (
      select 1
      from public.restaurants r
      where coalesce(r.parent_restaurant_id, r.id) = p_restaurant_id
        and r.auth_user_id = (select auth.uid())
        and coalesce(r.rol, 'owner') = 'owner'
        and r.durum = 'Aktif'

      union all

      select 1
      from public.personeller p
      join public.restaurants r
        on r.id = p.restaurant_id
       and coalesce(r.rol, 'owner') = 'owner'
       and r.durum = 'Aktif'
      where p.restaurant_id = p_restaurant_id
        and p.auth_user_id = (select auth.uid())
        and p.durum = 'Aktif'
        and coalesce(p.tab_yetkileri, '[]'::jsonb)
          ?| regexp_split_to_array(coalesce(p_sekmeler_csv, ''), '\s*,\s*')
    )
$$;

revoke all on function private.integra_sekme_yetkisi_var(bigint, text)
  from public, anon, authenticated;
grant execute on function private.integra_sekme_yetkisi_var(bigint, text)
  to authenticated, service_role;

do $$
declare
  v_kayit record;
  v_select_policy text;
  v_insert_policy text;
  v_update_policy text;
  v_delete_policy text;
begin
  for v_kayit in
    select *
    from (values
      ('menu_gruplari',
        'menu,masalar,hizli_satis,paket,kiosk,qr_menu,kurulum',
        'menu,ayarlar'),
      ('masa_bolumleri',
        'masalar,rezervasyonlar,kurulum',
        'masalar,ayarlar'),
      ('giderler',
        'giderler,kasa,raporlar,market,stok,depo',
        'giderler,kasa,market,stok,depo'),
      ('iade_kayitlari',
        'iadeler,raporlar,kasa',
        'iadeler'),
      ('kasa_hareketleri',
        'kasa,raporlar',
        'kasa'),
      ('paket_musterileri',
        'paket,entegrasyonlar',
        'paket,entegrasyonlar'),
      ('paket_siparisleri',
        'paket,entegrasyonlar,mutfak,raporlar',
        'paket,entegrasyonlar,mutfak'),
      ('rezervasyonlar',
        'rezervasyonlar,masalar,cari',
        'rezervasyonlar,masalar'),
      ('z_raporlari',
        'raporlar,kasa',
        'raporlar,kasa'),
      ('fis_sablonlari',
        'ayarlar,isletme_profili,kurulum,masalar,paket,hizli_satis,market,kiosk,kuafor',
        'ayarlar,isletme_profili'),
      ('fis_yazici_ayarlari',
        'ayarlar,isletme_profili,kurulum,masalar,paket,hizli_satis,market,kiosk,kuafor',
        'ayarlar,isletme_profili'),
      ('yazici_ayarlari',
        'ayarlar,isletme_profili,kurulum,masalar,paket,hizli_satis,market,kiosk,kuafor',
        'ayarlar,isletme_profili'),
      ('kiosk_siparisleri',
        'kiosk,mutfak,raporlar',
        'kiosk,mutfak'),
      ('qr_menu_ayarlari',
        'qr_menu,isletme_profili,kurulum',
        'qr_menu,isletme_profili,ayarlar'),
      ('sadakat_hareketleri',
        'sadakat,cari,raporlar',
        'sadakat,cari'),
      ('platform_baglantilari',
        'entegrasyonlar',
        'entegrasyonlar')
    ) as politikalar(tablo_adi, okuma_sekmeleri, yazma_sekmeleri)
  loop
    v_select_policy := v_kayit.tablo_adi || '_authenticated_select';
    v_insert_policy := v_kayit.tablo_adi || '_authenticated_insert';
    v_update_policy := v_kayit.tablo_adi || '_authenticated_update';
    v_delete_policy := v_kayit.tablo_adi || '_authenticated_delete';

    execute format('drop policy if exists %I on public.%I', v_select_policy, v_kayit.tablo_adi);
    execute format('drop policy if exists %I on public.%I', v_insert_policy, v_kayit.tablo_adi);
    execute format('drop policy if exists %I on public.%I', v_update_policy, v_kayit.tablo_adi);
    execute format('drop policy if exists %I on public.%I', v_delete_policy, v_kayit.tablo_adi);

    execute format(
      'create policy %I on public.%I for select to authenticated using (
        restaurant_id = (select private.integra_restaurant_id())
        and private.integra_sekme_yetkisi_var(restaurant_id, %L)
      )',
      v_select_policy,
      v_kayit.tablo_adi,
      v_kayit.okuma_sekmeleri
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (
        restaurant_id = (select private.integra_restaurant_id())
        and private.integra_sekme_yetkisi_var(restaurant_id, %L)
      )',
      v_insert_policy,
      v_kayit.tablo_adi,
      v_kayit.yazma_sekmeleri
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (
        restaurant_id = (select private.integra_restaurant_id())
        and private.integra_sekme_yetkisi_var(restaurant_id, %L)
      ) with check (
        restaurant_id = (select private.integra_restaurant_id())
        and private.integra_sekme_yetkisi_var(restaurant_id, %L)
      )',
      v_update_policy,
      v_kayit.tablo_adi,
      v_kayit.yazma_sekmeleri,
      v_kayit.yazma_sekmeleri
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (
        restaurant_id = (select private.integra_restaurant_id())
        and private.integra_sekme_yetkisi_var(restaurant_id, %L)
      )',
      v_delete_policy,
      v_kayit.tablo_adi,
      v_kayit.yazma_sekmeleri
    );
  end loop;
end
$$;

notify pgrst, 'reload schema';

commit;
