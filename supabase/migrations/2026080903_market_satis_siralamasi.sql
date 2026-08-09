-- Market satis ekraninda grup ve urunlerin kalici olarak siralanmasi.

begin;

alter table public.market_urunleri
  add column if not exists sira integer not null default 2147483647;

with sirali as (
  select
    id,
    row_number() over (
      partition by restaurant_id, grup_id
      order by urun_adi, id
    )::integer as yeni_sira
  from public.market_urunleri
)
update public.market_urunleri u
set sira = sirali.yeni_sira
from sirali
where u.id = sirali.id
  and u.sira = 2147483647;

create index if not exists market_urunleri_satis_sira_idx
  on public.market_urunleri(restaurant_id, grup_id, sira, urun_adi);

create or replace function public.market_satis_sirasi_kaydet(
  p_restaurant_id bigint,
  p_tur text,
  p_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_beklenen integer;
  v_bulunan integer;
begin
  if not private.integra_sekme_yetkisi_var(p_restaurant_id, 'market')
     or not private.integra_detay_yetkisi_var(p_restaurant_id, 'urun_yonet') then
    raise exception 'Satış ekranı sırasını değiştirmek için ürün yönetme yetkisi gerekir.';
  end if;

  v_beklenen := coalesce(cardinality(p_ids), 0);
  if v_beklenen = 0 then
    raise exception 'Sıralanacak kayıt bulunamadı.';
  end if;
  if (select count(distinct id) from unnest(p_ids) as ids(id)) <> v_beklenen then
    raise exception 'Sıralama listesinde tekrarlanan kayıt var.';
  end if;

  if p_tur = 'grup' then
    select count(*) into v_bulunan
    from public.market_gruplari
    where restaurant_id = p_restaurant_id and id = any(p_ids);
    if v_bulunan <> v_beklenen then
      raise exception 'Sıralanacak gruplardan biri bu işletmeye ait değil.';
    end if;

    update public.market_gruplari g
    set sira = sirali.sira::integer,
        updated_at = now()
    from unnest(p_ids) with ordinality as sirali(id, sira)
    where g.restaurant_id = p_restaurant_id and g.id = sirali.id;
  elsif p_tur = 'urun' then
    select count(*) into v_bulunan
    from public.market_urunleri
    where restaurant_id = p_restaurant_id and id = any(p_ids);
    if v_bulunan <> v_beklenen then
      raise exception 'Sıralanacak ürünlerden biri bu işletmeye ait değil.';
    end if;

    update public.market_urunleri u
    set sira = sirali.sira::integer,
        updated_at = now()
    from unnest(p_ids) with ordinality as sirali(id, sira)
    where u.restaurant_id = p_restaurant_id and u.id = sirali.id;
  else
    raise exception 'Geçersiz sıralama türü.';
  end if;

  return jsonb_build_object('tur', p_tur, 'kayit_sayisi', v_beklenen);
end;
$$;

revoke all on function public.market_satis_sirasi_kaydet(bigint, text, uuid[])
  from public, anon;
grant execute on function public.market_satis_sirasi_kaydet(bigint, text, uuid[])
  to authenticated, service_role;

commit;
