-- Otomatik barkod/terazi kodu ve personelden kasaya bekleyen siparis akisi.

begin;

alter table public.market_bekleyen_sepetler
  add column if not exists kaynak text not null default 'kasa',
  add column if not exists olusturan_adi text,
  add column if not exists siparis_notu text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'market_bekleyen_sepetler_kaynak_check'
      and conrelid = 'public.market_bekleyen_sepetler'::regclass
  ) then
    alter table public.market_bekleyen_sepetler
      add constraint market_bekleyen_sepetler_kaynak_check
      check (kaynak in ('kasa', 'personel_siparisi'));
  end if;
end $$;

create index if not exists market_bekleyen_sepetler_kaynak_idx
  on public.market_bekleyen_sepetler(restaurant_id, kaynak, updated_at desc);

create unique index if not exists market_urunleri_terazi_kodu_unique
  on public.market_urunleri(restaurant_id, lpad(trim(stok_kodu), 5, '0'))
  where nullif(trim(stok_kodu), '') is not null
    and trim(stok_kodu) ~ '^[0-9]{1,5}$';

comment on column public.market_bekleyen_sepetler.kaynak is
  'kasa: kasada bekletilen sepet, personel_siparisi: personelin kasaya gonderdigi siparis';
comment on column public.market_bekleyen_sepetler.olusturan_adi is
  'Siparisi veya bekleyen sepeti olusturan kullanicinin gorunen adi';
comment on column public.market_bekleyen_sepetler.siparis_notu is
  'Personelin kasaya ilettigi siparis notu';

notify pgrst, 'reload schema';
commit;
