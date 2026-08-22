-- Market satışlarında KDV oranını satış anında kalıcı tutar.
-- Böylece ürün kartındaki oran sonradan değişse bile geçmiş KDV raporu değişmez.

begin;

alter table public.market_satis_kalemleri
  add column if not exists kdv_orani numeric(5,2);

-- Eski fişlerde satış anındaki oran bulunmadığı için mevcut ürün kartındaki oranla ilk değer oluşturulur.
update public.market_satis_kalemleri kalem
set kdv_orani = coalesce(urun.kdv_orani, 0)
from public.market_urunleri urun
where urun.id = kalem.urun_id
  and kalem.kdv_orani is null;

create or replace function public.market_satis_kalemi_kdv_orani_doldur()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.kdv_orani is null then
    select coalesce(kdv_orani, 0)
    into new.kdv_orani
    from public.market_urunleri
    where id = new.urun_id
      and restaurant_id = new.restaurant_id;
  end if;
  new.kdv_orani := coalesce(new.kdv_orani, 0);
  return new;
end;
$$;

drop trigger if exists market_satis_kalemi_kdv_orani_trigger on public.market_satis_kalemleri;
create trigger market_satis_kalemi_kdv_orani_trigger
before insert or update of urun_id, kdv_orani on public.market_satis_kalemleri
for each row execute function public.market_satis_kalemi_kdv_orani_doldur();

commit;
