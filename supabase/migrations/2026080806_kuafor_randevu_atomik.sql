-- Kuafor randevusu ile kullanilan urunleri tek veritabani islemi icinde kaydeder.
-- Boylece urun dogrulamasi veya baglanti hatasi olursa yarim randevu kaydi kalmaz.

create or replace function public.kuafor_randevu_kaydet_atomik(
  p_restaurant_id bigint,
  p_randevu_id uuid,
  p_musteri_id uuid,
  p_musteri_adi text,
  p_telefon text,
  p_personel_id uuid,
  p_hizmet_id uuid,
  p_baslangic_zamani timestamptz,
  p_sure_dakika integer,
  p_ucret numeric,
  p_kapora numeric,
  p_kullanilan_malzemeler text,
  p_not_metni text,
  p_hizmet_idleri uuid[] default null,
  p_urunler jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_randevu jsonb;
  v_randevu_id uuid;
begin
  if not private.integra_kuafor_yetkisi_var(p_restaurant_id) then
    raise exception 'Bu işletmenin kuaför randevu modülüne erişim yetkiniz yok.';
  end if;

  v_randevu := public.kuafor_randevu_kaydet(
    p_restaurant_id,
    p_randevu_id,
    p_musteri_id,
    p_musteri_adi,
    p_telefon,
    p_personel_id,
    p_hizmet_id,
    p_baslangic_zamani,
    p_sure_dakika,
    p_ucret,
    p_kapora,
    p_kullanilan_malzemeler,
    p_not_metni,
    p_hizmet_idleri
  );

  v_randevu_id := (v_randevu ->> 'id')::uuid;

  return public.kuafor_randevu_urunleri_kaydet(
    p_restaurant_id,
    v_randevu_id,
    coalesce(p_urunler, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.kuafor_randevu_kaydet_atomik(
  bigint, uuid, uuid, text, text, uuid, uuid, timestamptz, integer,
  numeric, numeric, text, text, uuid[], jsonb
) from public, anon;

grant execute on function public.kuafor_randevu_kaydet_atomik(
  bigint, uuid, uuid, text, text, uuid, uuid, timestamptz, integer,
  numeric, numeric, text, text, uuid[], jsonb
) to authenticated, service_role;

comment on function public.kuafor_randevu_kaydet_atomik(
  bigint, uuid, uuid, text, text, uuid, uuid, timestamptz, integer,
  numeric, numeric, text, text, uuid[], jsonb
) is 'Randevu ve kullanilan urun listesini tek transaction icinde dogrular ve kaydeder.';
