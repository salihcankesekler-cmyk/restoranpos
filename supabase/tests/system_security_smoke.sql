-- Canli projede guvenli biçimde calisir; tum deneme kayitlari ROLLBACK ile geri alinir.
begin;

do $$
declare
  v_auth_user_id uuid;
  v_restaurant_id bigint;
  v_other_restaurant_id bigint;
begin
  select r.auth_user_id, r.id
  into v_auth_user_id, v_restaurant_id
  from public.restaurants r
  where r.auth_user_id is not null
    and coalesce(r.rol, 'owner') = 'owner'
    and r.durum = 'Aktif'
  order by r.id
  limit 1;

  if v_auth_user_id is null or v_restaurant_id is null then
    raise exception 'Test icin aktif ve Auth bagli owner bulunamadi.';
  end if;

  select r.id
  into v_other_restaurant_id
  from public.restaurants r
  where r.id <> v_restaurant_id
    and coalesce(r.rol, 'owner') = 'owner'
  order by r.id
  limit 1;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_auth_user_id,
      'role', 'authenticated',
      'email', 'guvenlik-testi@invalid.local',
      'user_metadata', jsonb_build_object('integra_hesap_tipi', 'isletme_yetkilisi')
    )::text,
    true
  );
  perform set_config('integra.test.restaurant_id', v_restaurant_id::text, true);
  perform set_config('integra.test.other_restaurant_id', coalesce(v_other_restaurant_id::text, ''), true);
end;
$$;

set local role authenticated;

do $$
declare
  v_restaurant_id bigint := current_setting('integra.test.restaurant_id')::bigint;
  v_other_text text := current_setting('integra.test.other_restaurant_id');
  v_event_id uuid;
  v_log_id bigint;
  v_denied boolean := false;
begin
  v_event_id := public.sistem_olayi_kaydet(
    v_restaurant_id,
    'warning',
    'smoke_test',
    'rls',
    'Gecici sistem guvenlik testi',
    null,
    'sistem_durumu',
    '{"rollback":true}'::jsonb
  );

  v_log_id := public.sistem_islem_kaydi_ekle(
    v_restaurant_id,
    'Guvenlik Testi',
    'sistem_durumu',
    'sistem_olaylari',
    v_event_id::text,
    'Gecici islem kaydi',
    null,
    '{"rollback":true}'::jsonb
  );

  if v_event_id is null or v_log_id is null then
    raise exception 'Sistem kayit RPC testi basarisiz.';
  end if;

  if not public.sistem_olayini_coz(v_restaurant_id, v_event_id, 'Test tamamlandi') then
    raise exception 'Sistem olayi kapatma testi basarisiz.';
  end if;

  perform public.gun_sonu_kilidini_ayarla(
    v_restaurant_id,
    current_date,
    true,
    'Gecici guvenlik testi'
  );

  if nullif(v_other_text, '') is not null then
    begin
      perform public.sistem_olayi_kaydet(
        v_other_text::bigint,
        'error',
        'smoke_test',
        'cross_tenant',
        'Bu kayit reddedilmelidir.',
        null,
        'sistem_durumu',
        '{}'::jsonb
      );
    exception
      when others then
        v_denied := sqlerrm like '%isletme yetkisi bulunamadi%';
    end;

    if not v_denied then
      raise exception 'Isletmeler arasi sistem olayi engellenmedi.';
    end if;
  end if;
end;
$$;

rollback;
