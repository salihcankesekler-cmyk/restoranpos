-- Kuaför randevusunda kayıtlı ürün/hammadde seçimi ve tamamlamada otomatik stok düşümü

begin;

alter table public.kuafor_randevulari
  add column if not exists kullanilan_urunler jsonb not null default '[]'::jsonb,
  add column if not exists stok_dusuldu boolean not null default false;

create or replace function public.kuafor_randevu_urunleri_kaydet(
  p_restaurant_id bigint,
  p_randevu_id uuid,
  p_urunler jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_randevu public.kuafor_randevulari%rowtype;
  v_urun jsonb;
  v_temiz_urunler jsonb := '[]'::jsonb;
  v_kaynak_tipi text;
  v_kaynak_id bigint;
  v_miktar numeric;
  v_menu public.menu_urunleri%rowtype;
  v_malzeme public.stok_malzemeleri%rowtype;
begin
  if not private.integra_kuafor_yetkisi_var(p_restaurant_id) then
    raise exception 'Bu işletmenin kuaför randevu ürünlerini düzenleme yetkiniz yok.';
  end if;

  select *
  into v_randevu
  from public.kuafor_randevulari
  where id = p_randevu_id
    and restaurant_id = p_restaurant_id
  for update;

  if not found then
    raise exception 'Kullanılan ürünlerin bağlanacağı randevu bulunamadı.';
  end if;

  if v_randevu.durum = 'Tamamlandı' then
    raise exception 'Tamamlanan randevunun kullanılan ürünleri değiştirilemez.';
  end if;

  if p_urunler is null then
    p_urunler := '[]'::jsonb;
  end if;

  if jsonb_typeof(p_urunler) <> 'array' then
    raise exception 'Kullanılan ürün listesi geçersiz.';
  end if;

  if jsonb_array_length(p_urunler) > 100 then
    raise exception 'Bir randevuya en fazla 100 ürün eklenebilir.';
  end if;

  for v_urun in select value from jsonb_array_elements(p_urunler)
  loop
    v_kaynak_tipi := nullif(trim(v_urun ->> 'kaynak_tipi'), '');
    if v_kaynak_tipi not in ('menu_urunu', 'stok_malzemesi') then
      raise exception 'Kullanılan ürün kaynak tipi geçersiz.';
    end if;

    if coalesce(v_urun ->> 'id', '') !~ '^[0-9]+$' then
      raise exception 'Kullanılan ürün kimliği geçersiz.';
    end if;

    v_kaynak_id := (v_urun ->> 'id')::bigint;
    v_miktar := round(coalesce((v_urun ->> 'miktar')::numeric, 0), 3);
    if v_miktar <= 0 then
      raise exception 'Kullanılan ürün miktarı sıfırdan büyük olmalıdır.';
    end if;

    if v_kaynak_tipi = 'menu_urunu' then
      select *
      into v_menu
      from public.menu_urunleri
      where id = v_kaynak_id
        and restaurant_id = p_restaurant_id;

      if not found then
        raise exception 'Seçilen ürün kartı bulunamadı.';
      end if;

      v_temiz_urunler := v_temiz_urunler || jsonb_build_array(jsonb_build_object(
        'kaynak_tipi', v_kaynak_tipi,
        'id', v_menu.id::text,
        'ad', v_menu.ad,
        'birim', 'adet',
        'miktar', v_miktar
      ));
    else
      select *
      into v_malzeme
      from public.stok_malzemeleri
      where id = v_kaynak_id
        and restaurant_id = p_restaurant_id;

      if not found then
        raise exception 'Seçilen hammadde/stok kartı bulunamadı.';
      end if;

      v_temiz_urunler := v_temiz_urunler || jsonb_build_array(jsonb_build_object(
        'kaynak_tipi', v_kaynak_tipi,
        'id', v_malzeme.id::text,
        'ad', v_malzeme.ad,
        'birim', coalesce(nullif(trim(v_malzeme.birim), ''), 'adet'),
        'miktar', v_miktar
      ));
    end if;
  end loop;

  update public.kuafor_randevulari
  set kullanilan_urunler = v_temiz_urunler,
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_randevu_id
    and restaurant_id = p_restaurant_id
  returning * into v_randevu;

  return to_jsonb(v_randevu);
end;
$$;

create or replace function public.kuafor_kullanilan_urun_stok_dusur()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_urun jsonb;
  v_kaynak_tipi text;
  v_kaynak_id bigint;
  v_miktar numeric;
  v_urun_adi text;
begin
  if new.durum <> 'Tamamlandı'
     or old.durum = 'Tamamlandı'
     or coalesce(old.stok_dusuldu, false) then
    return new;
  end if;

  for v_urun in
    select value
    from jsonb_array_elements(coalesce(new.kullanilan_urunler, '[]'::jsonb))
  loop
    v_kaynak_tipi := v_urun ->> 'kaynak_tipi';
    v_kaynak_id := (v_urun ->> 'id')::bigint;
    v_miktar := round(coalesce((v_urun ->> 'miktar')::numeric, 0), 3);
    v_urun_adi := coalesce(nullif(trim(v_urun ->> 'ad'), ''), 'Kuaför ürünü');

    if v_miktar <= 0 then
      continue;
    end if;

    if v_kaynak_tipi = 'menu_urunu' then
      update public.menu_urunleri
      set stok_adedi = coalesce(stok_adedi, 0) - v_miktar,
          stok_takip = true
      where id = v_kaynak_id
        and restaurant_id = new.restaurant_id;

      if not found then
        raise exception '% adlı ürün kartı stok düşümü sırasında bulunamadı.', v_urun_adi;
      end if;

      insert into public.stok_hareketleri (
        restaurant_id,
        urun_id,
        tip,
        miktar,
        aciklama
      ) values (
        new.restaurant_id,
        v_kaynak_id,
        'Kuaför Kullanım Çıkış',
        v_miktar,
        new.musteri_adi || ' · ' || new.hizmet_adi || ' · Randevu ' || new.id::text
      );
    elsif v_kaynak_tipi = 'stok_malzemesi' then
      update public.stok_malzemeleri
      set stok_miktari = coalesce(stok_miktari, 0) - v_miktar
      where id = v_kaynak_id
        and restaurant_id = new.restaurant_id;

      if not found then
        raise exception '% adlı stok malzemesi kullanım sırasında bulunamadı.', v_urun_adi;
      end if;

      insert into public.stok_hareketleri (
        restaurant_id,
        malzeme_id,
        tip,
        miktar,
        aciklama
      ) values (
        new.restaurant_id,
        v_kaynak_id,
        'Kuaför Kullanım Çıkış',
        v_miktar,
        new.musteri_adi || ' · ' || new.hizmet_adi || ' · Randevu ' || new.id::text
      );
    end if;
  end loop;

  new.stok_dusuldu := true;
  return new;
end;
$$;

drop trigger if exists kuafor_kullanilan_urun_stok_dusur_trigger on public.kuafor_randevulari;
create trigger kuafor_kullanilan_urun_stok_dusur_trigger
before update of durum on public.kuafor_randevulari
for each row
execute function public.kuafor_kullanilan_urun_stok_dusur();

revoke all on function public.kuafor_randevu_urunleri_kaydet(bigint, uuid, jsonb) from public, anon;
grant execute on function public.kuafor_randevu_urunleri_kaydet(bigint, uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;
