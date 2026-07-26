-- Edge Function'ın mevcut bir Auth kullanıcısını işletmeye bağlamadan önce
-- gizli süper admin listesinde olup olmadığını kontrol etmesini sağlar.
-- Fonksiyon yalnızca service_role tarafından çağrılabilir.

create or replace function public.integra_super_admin_kullanici_mi(p_auth_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.integra_super_admins sa
    where sa.auth_user_id = p_auth_user_id
  )
$$;

revoke all on function public.integra_super_admin_kullanici_mi(uuid) from public, anon, authenticated;
grant execute on function public.integra_super_admin_kullanici_mi(uuid) to service_role;

comment on function public.integra_super_admin_kullanici_mi(uuid)
  is 'Service role için hedef Auth kullanıcısının Integra süper admin olup olmadığını doğrular.';
