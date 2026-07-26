-- Integra süper admin hesabını frontend kodundaki sabit bilgilerden ayırır.
-- Yetki listesi private şemasındadır; anon/authenticated kullanıcılar tabloyu okuyamaz.

create schema if not exists private;

create table if not exists private.integra_super_admins (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

revoke all on schema private from public;
revoke all on table private.integra_super_admins from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function public.integra_super_admin_mi()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.integra_super_admins sa
    where sa.auth_user_id = (select auth.uid())
  )
$$;

revoke all on function public.integra_super_admin_mi() from public;
grant execute on function public.integra_super_admin_mi() to authenticated;

comment on function public.integra_super_admin_mi()
  is 'Geçerli Supabase Auth kullanıcısının Integra süper admin yetkisini güvenli biçimde doğrular.';

-- Bir defaya mahsus kurulum:
-- 1. Supabase > Authentication > Users bölümünde süper admin Auth kullanıcısını oluşturun.
-- 2. Kullanıcının UUID değerini kopyalayın.
-- 3. SQL Editor içinde aşağıdaki komutu gerçek UUID ile AYRI olarak çalıştırın:
-- insert into private.integra_super_admins (auth_user_id) values ('AUTH-KULLANICI-UUID');
