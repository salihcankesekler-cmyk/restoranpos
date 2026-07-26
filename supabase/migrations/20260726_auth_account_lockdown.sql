-- Bu migration yalnızca yeni Auth tabanlı uygulama ve isletme-hesaplari
-- Edge Function yayına alındıktan sonra çalıştırılmalıdır.

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'restaurants'
  loop
    execute format('drop policy if exists %I on public.restaurants', p.policyname);
  end loop;

  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'personeller'
  loop
    execute format('drop policy if exists %I on public.personeller', p.policyname);
  end loop;

  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
  loop
    execute format('drop policy if exists %I on public.users', p.policyname);
  end loop;
end
$$;

alter table public.restaurants enable row level security;
alter table public.personeller enable row level security;
alter table public.users enable row level security;

revoke all on table public.restaurants from public, anon, authenticated;
revoke all on table public.personeller from public, anon, authenticated;
revoke all on table public.users from public, anon, authenticated;

grant select, update on table public.restaurants to authenticated;

create policy restaurants_select_authenticated
on public.restaurants
for select
to authenticated
using (
  public.integra_super_admin_mi()
  or (
    coalesce(rol, 'owner') = 'owner'
    and auth_user_id = (select auth.uid())
  )
  or id = private.integra_restaurant_id()
);

create policy restaurants_update_owner_or_super_admin
on public.restaurants
for update
to authenticated
using (
  public.integra_super_admin_mi()
  or (
    coalesce(rol, 'owner') = 'owner'
    and auth_user_id = (select auth.uid())
  )
)
with check (
  public.integra_super_admin_mi()
  or (
    coalesce(rol, 'owner') = 'owner'
    and auth_user_id = (select auth.uid())
  )
);

-- Personel listesi ve değişiklikleri yalnızca güvenli Edge Function üzerinden
-- yürütülür. Böylece aynı işletmedeki kullanıcılar dahi şifre/geçiş alanlarını
-- doğrudan okuyamaz.

-- Eski ve kullanılmayan public.users tablosu yalnızca service_role erişimine kalır.

grant all on table public.restaurants to service_role;
grant all on table public.personeller to service_role;
grant all on table public.users to service_role;

comment on table public.personeller
  is 'Integra personel profilleri. İstemci erişimi kapalıdır; güvenli Edge Function üzerinden yönetilir.';
