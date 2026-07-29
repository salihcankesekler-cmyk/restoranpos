-- Kuaför personel kartını gerçek giriş hesabına bağlar.
-- İşletme sahibi tüm gün planını, personel ise yalnızca kendi randevularını görür.

begin;

alter table public.kuafor_personelleri
  add column if not exists sistem_personel_id bigint
    references public.personeller(id) on delete set null;

-- Mevcut kayıtları, yalnızca tek ve güvenli bir ad/telefon eşleşmesi varsa otomatik bağla.
with adaylar as (
  select
    kp.id as kuafor_personel_id,
    p.id as sistem_personel_id,
    count(*) over (partition by kp.id) as aday_sayisi,
    row_number() over (
      partition by kp.id
      order by
        case
          when nullif(trim(kp.telefon), '') is not null
           and nullif(trim(kp.telefon), '') = nullif(trim(p.telefon), '') then 0
          else 1
        end,
        p.id
    ) as sira
  from public.kuafor_personelleri kp
  join public.personeller p
    on p.restaurant_id = kp.restaurant_id
   and p.durum = 'Aktif'
   and p.auth_user_id is not null
   and coalesce(p.tab_yetkileri, '[]'::jsonb) @> '["kuafor"]'::jsonb
   and (
     (
       nullif(trim(kp.telefon), '') is not null
       and nullif(trim(kp.telefon), '') = nullif(trim(p.telefon), '')
     )
     or lower(trim(kp.ad)) = lower(trim(p.ad))
   )
  where kp.sistem_personel_id is null
)
update public.kuafor_personelleri kp
set sistem_personel_id = aday.sistem_personel_id,
    updated_at = now()
from adaylar aday
where kp.id = aday.kuafor_personel_id
  and aday.aday_sayisi = 1
  and aday.sira = 1
  and not exists (
    select 1
    from public.kuafor_personelleri diger
    where diger.restaurant_id = kp.restaurant_id
      and diger.id <> kp.id
      and diger.sistem_personel_id = aday.sistem_personel_id
  );

-- Aynı giriş hesabı yanlışlıkla birden fazla karta bağlandıysa ilkini koru.
with tekrarlar as (
  select
    id,
    row_number() over (
      partition by restaurant_id, sistem_personel_id
      order by created_at, id
    ) as sira
  from public.kuafor_personelleri
  where sistem_personel_id is not null
)
update public.kuafor_personelleri kp
set sistem_personel_id = null,
    updated_at = now()
from tekrarlar tekrar
where kp.id = tekrar.id
  and tekrar.sira > 1;

create unique index if not exists kuafor_personelleri_sistem_hesabi_unique
  on public.kuafor_personelleri (restaurant_id, sistem_personel_id)
  where sistem_personel_id is not null and aktif = true;

create or replace function private.integra_kuafor_sahibi_mi(p_restaurant_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.restaurants r
    where r.id = p_restaurant_id
      and r.auth_user_id = (select auth.uid())
      and coalesce(r.rol, 'owner') = 'owner'
      and r.durum = 'Aktif'
  )
$$;

create or replace function private.integra_kuafor_personel_eslesmesi_var(
  p_restaurant_id bigint,
  p_kuafor_personel_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.integra_kuafor_sahibi_mi(p_restaurant_id)
    or exists (
      select 1
      from public.kuafor_personelleri kp
      join public.personeller p
        on p.id = kp.sistem_personel_id
       and p.restaurant_id = kp.restaurant_id
      where kp.id = p_kuafor_personel_id
        and kp.restaurant_id = p_restaurant_id
        and kp.aktif = true
        and p.auth_user_id = (select auth.uid())
        and p.durum = 'Aktif'
        and coalesce(p.tab_yetkileri, '[]'::jsonb) @> '["kuafor"]'::jsonb
    )
$$;

create or replace function private.integra_kuafor_randevu_personel_kontrol()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if session_user in ('postgres', 'supabase_admin')
     or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' then
    return new;
  end if;

  if not private.integra_kuafor_personel_eslesmesi_var(new.restaurant_id, new.personel_id) then
    raise exception 'Bu randevu yalnızca hesabınıza bağlı kendi gün planınızda oluşturulabilir veya değiştirilebilir.';
  end if;

  return new;
end;
$$;

drop trigger if exists kuafor_randevu_personel_gizlilik_trigger on public.kuafor_randevulari;
create trigger kuafor_randevu_personel_gizlilik_trigger
before insert or update on public.kuafor_randevulari
for each row
execute function private.integra_kuafor_randevu_personel_kontrol();

drop policy if exists kuafor_personelleri_yetkili_policy on public.kuafor_personelleri;
drop policy if exists kuafor_personelleri_kisisel_select_policy on public.kuafor_personelleri;
drop policy if exists kuafor_personelleri_sahip_insert_policy on public.kuafor_personelleri;
drop policy if exists kuafor_personelleri_sahip_update_policy on public.kuafor_personelleri;
drop policy if exists kuafor_personelleri_sahip_delete_policy on public.kuafor_personelleri;

create policy kuafor_personelleri_kisisel_select_policy
on public.kuafor_personelleri
for select
to authenticated
using (
  restaurant_id = (select private.integra_restaurant_id())
  and private.integra_kuafor_personel_eslesmesi_var(restaurant_id, id)
);

create policy kuafor_personelleri_sahip_insert_policy
on public.kuafor_personelleri
for insert
to authenticated
with check (
  restaurant_id = (select private.integra_restaurant_id())
  and private.integra_kuafor_sahibi_mi(restaurant_id)
);

create policy kuafor_personelleri_sahip_update_policy
on public.kuafor_personelleri
for update
to authenticated
using (
  restaurant_id = (select private.integra_restaurant_id())
  and private.integra_kuafor_sahibi_mi(restaurant_id)
)
with check (
  restaurant_id = (select private.integra_restaurant_id())
  and private.integra_kuafor_sahibi_mi(restaurant_id)
);

create policy kuafor_personelleri_sahip_delete_policy
on public.kuafor_personelleri
for delete
to authenticated
using (
  restaurant_id = (select private.integra_restaurant_id())
  and private.integra_kuafor_sahibi_mi(restaurant_id)
);

drop policy if exists kuafor_randevulari_yetkili_policy on public.kuafor_randevulari;
drop policy if exists kuafor_randevulari_kisisel_select_policy on public.kuafor_randevulari;
drop policy if exists kuafor_randevulari_kisisel_insert_policy on public.kuafor_randevulari;
drop policy if exists kuafor_randevulari_kisisel_update_policy on public.kuafor_randevulari;
drop policy if exists kuafor_randevulari_kisisel_delete_policy on public.kuafor_randevulari;

create policy kuafor_randevulari_kisisel_select_policy
on public.kuafor_randevulari
for select
to authenticated
using (
  restaurant_id = (select private.integra_restaurant_id())
  and private.integra_kuafor_personel_eslesmesi_var(restaurant_id, personel_id)
);

create policy kuafor_randevulari_kisisel_insert_policy
on public.kuafor_randevulari
for insert
to authenticated
with check (
  restaurant_id = (select private.integra_restaurant_id())
  and private.integra_kuafor_personel_eslesmesi_var(restaurant_id, personel_id)
);

create policy kuafor_randevulari_kisisel_update_policy
on public.kuafor_randevulari
for update
to authenticated
using (
  restaurant_id = (select private.integra_restaurant_id())
  and private.integra_kuafor_personel_eslesmesi_var(restaurant_id, personel_id)
)
with check (
  restaurant_id = (select private.integra_restaurant_id())
  and private.integra_kuafor_personel_eslesmesi_var(restaurant_id, personel_id)
);

create policy kuafor_randevulari_kisisel_delete_policy
on public.kuafor_randevulari
for delete
to authenticated
using (
  restaurant_id = (select private.integra_restaurant_id())
  and private.integra_kuafor_personel_eslesmesi_var(restaurant_id, personel_id)
);

revoke all on function private.integra_kuafor_sahibi_mi(bigint) from public, anon, authenticated;
revoke all on function private.integra_kuafor_personel_eslesmesi_var(bigint, uuid) from public, anon, authenticated;
grant execute on function private.integra_kuafor_sahibi_mi(bigint) to authenticated, service_role;
grant execute on function private.integra_kuafor_personel_eslesmesi_var(bigint, uuid) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
