import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(
  JSON.stringify(body),
  {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  },
);

const temizEmail = (value: unknown) => String(value || '').trim().toLowerCase();
const temizMetin = (value: unknown, max = 250) => String(value || '').trim().slice(0, max);
const emailGecerli = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const kullanilamazSifre = () => `AUTH_ONLY_${crypto.randomUUID()}`;
const aktifDurum = (value: unknown) => String(value || '') === 'Aktif';

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

const sabitSifreKarsilastir = async (kayitli: unknown, girilen: unknown) => {
  const [kayitliHash, girilenHash] = await Promise.all([
    sha256(String(kayitli || '')),
    sha256(String(girilen || '')),
  ]);
  return kayitliHash === girilenHash;
};

const istemciIpAdresi = (req: Request) => {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  return forwarded.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')
    || req.headers.get('x-real-ip')
    || 'unknown';
};

const authKullanicisiniEmailIleBul = async (adminClient: any, email: string) => {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const kullanicilar = Array.isArray(data?.users) ? data.users : [];
    const bulunan = kullanicilar.find((user: any) => temizEmail(user?.email) === email);
    if (bulunan) return bulunan;
    if (kullanicilar.length < 1000) break;
  }

  return null;
};

const superAdminAuthKullanicisiMi = async (adminClient: any, authUserId: string) => {
  const { data, error } = await adminClient.rpc('integra_super_admin_kullanici_mi', {
    p_auth_user_id: authUserId,
  });
  if (error) throw error;
  return data === true;
};

const authBaglantisiBaskaHesaptaMi = async (
  adminClient: any,
  authUserId: string,
  { ownerId = null, personelId = null }: { ownerId?: unknown; personelId?: unknown } = {},
) => {
  let ownerSorgusu = adminClient
    .from('restaurants')
    .select('id')
    .eq('auth_user_id', authUserId);
  if (ownerId) ownerSorgusu = ownerSorgusu.neq('id', ownerId);

  let personelSorgusu = adminClient
    .from('personeller')
    .select('id')
    .eq('auth_user_id', authUserId);
  if (personelId) personelSorgusu = personelSorgusu.neq('id', personelId);

  const [ownerSonucu, personelSonucu] = await Promise.all([
    ownerSorgusu.limit(1),
    personelSorgusu.limit(1),
  ]);

  if (ownerSonucu.error) throw ownerSonucu.error;
  if (personelSonucu.error) throw personelSonucu.error;

  return Boolean(ownerSonucu.data?.length || personelSonucu.data?.length);
};

const authKullanicisiniHazirla = async (
  adminClient: any,
  {
    mevcutAuthUserId,
    email,
    password,
    metadata,
    ownerId = null,
    personelId = null,
    mevcutAuthKullanicisiniBagla = false,
  }: {
    mevcutAuthUserId?: string | null;
    email: string;
    password: string;
    metadata: Record<string, unknown>;
    ownerId?: unknown;
    personelId?: unknown;
    mevcutAuthKullanicisiniBagla?: boolean;
  },
) => {
  let authUser = null;
  let yeniOlusturuldu = false;

  if (mevcutAuthUserId) {
    const { data, error } = await adminClient.auth.admin.getUserById(mevcutAuthUserId);
    if (error) throw error;
    authUser = data?.user || null;
  } else {
    authUser = await authKullanicisiniEmailIleBul(adminClient, email);
  }

  if (authUser) {
    if (!mevcutAuthUserId && !mevcutAuthKullanicisiniBagla) {
      throw new Error('Bu e-posta Supabase Auth üzerinde zaten kullanılıyor.');
    }

    if (await superAdminAuthKullanicisiMi(adminClient, authUser.id)) {
      throw new Error('Bu e-posta güvenlik nedeniyle işletme hesabında kullanılamaz.');
    }

    if (
      await authBaglantisiBaskaHesaptaMi(adminClient, authUser.id, {
        ownerId,
        personelId,
      })
    ) {
      throw new Error('Bu e-posta başka bir Integra hesabına bağlı.');
    }

    const guncelleme: Record<string, unknown> = {
      email,
      email_confirm: true,
      user_metadata: {
        ...(authUser.user_metadata || {}),
        ...metadata,
      },
    };
    if (password) guncelleme.password = password;

    const { data, error } = await adminClient.auth.admin.updateUserById(
      authUser.id,
      guncelleme,
    );
    if (error) throw error;
    authUser = data?.user || authUser;
  } else {
    if (!password || password.length < 8) {
      throw new Error('İlk güvenli giriş bağlantısında en az 8 karakterli şifre zorunludur.');
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    authUser = data?.user || null;
    yeniOlusturuldu = true;
  }

  if (!authUser?.id) throw new Error('Supabase Auth kullanıcısı hazırlanamadı.');
  return { authUser, yeniOlusturuldu };
};

const guvenliPersonel = (personel: any) => ({
  id: personel.id,
  restaurantId: personel.restaurant_id,
  ad: personel.ad || '',
  gorev: personel.gorev || 'Garson',
  telefon: personel.telefon || '',
  email: personel.email || '',
  durum: personel.durum || 'Aktif',
  tabYetkileri: Array.isArray(personel.tab_yetkileri) ? personel.tab_yetkileri : [],
  authBagli: Boolean(personel.auth_user_id),
  createdAt: personel.created_at || null,
});

serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Yalnızca POST isteği desteklenir.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey =
      Deno.env.get('SUPABASE_ANON_KEY')
      || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
      || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ error: 'Supabase Edge Function ortam değişkenleri eksik.' }, 500);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');
    const email = temizEmail(body?.email);
    const ipHash = await sha256(istemciIpAdresi(req));

    const denemeSayisi = async (emailHash: string, basariliDahil = false) => {
      const onBesDakikaOnce = new Date(Date.now() - (15 * 60 * 1000)).toISOString();
      let sorgu = adminClient
        .from('integra_auth_deneme_loglari')
        .select('id', { count: 'exact', head: true })
        .eq('email_hash', emailHash)
        .eq('ip_hash', ipHash)
        .gte('created_at', onBesDakikaOnce);
      if (!basariliDahil) sorgu = sorgu.eq('basarili', false);
      const { count, error } = await sorgu;
      if (error) throw error;
      return Number(count || 0);
    };

    const denemeKaydet = async (emailHash: string, basarili: boolean) => {
      const { error } = await adminClient
        .from('integra_auth_deneme_loglari')
        .insert({ email_hash: emailHash, ip_hash: ipHash, basarili });
      if (error) console.warn('Auth deneme kaydı oluşturulamadı:', error.message);
    };

    if (action === 'register_owner') {
      const emailHash = await sha256(`register:${email}`);
      if (await denemeSayisi(emailHash, true) >= 3) {
        return jsonResponse({ error: 'Çok fazla kayıt denemesi yapıldı. 15 dakika sonra tekrar deneyin.' }, 429);
      }

      const restaurantName = temizMetin(body?.restaurantName, 150);
      const yetkiliAdi = temizMetin(body?.yetkiliAdi, 120);
      const telefon = temizMetin(body?.telefon, 30);
      const adres = temizMetin(body?.adres, 500);
      const notMetni = temizMetin(body?.notMetni, 1000);
      const password = String(body?.password || '');
      const izinliPaketler = new Set(['Profesyonel', 'Market', 'Kuaför', 'Başlangıç', 'Baslangic', 'Paket Servis', 'QR Plus', 'Kurumsal']);
      const paket = izinliPaketler.has(String(body?.paket || ''))
        ? String(body.paket)
        : 'Profesyonel';
      const izinliIsletmeTipleri = new Set(['Restoran', 'Market', 'Karma', 'Kuaför', 'Güzellik / Bakım', 'Servis / Atölye', 'Hizmet', 'Diğer']);
      const isletmeTipi = izinliIsletmeTipleri.has(String(body?.isletmeTipi || ''))
        ? String(body.isletmeTipi)
        : paket === 'Market'
          ? 'Market'
          : paket === 'Kuaför'
            ? 'Kuaför'
            : 'Restoran';

      if (!restaurantName || !yetkiliAdi || !telefon || !emailGecerli(email)) {
        await denemeKaydet(emailHash, false);
        return jsonResponse({ error: 'İşletme, yetkili, telefon ve geçerli e-posta zorunludur.' }, 400);
      }
      if (password.length < 8) {
        await denemeKaydet(emailHash, false);
        return jsonResponse({ error: 'Şifre en az 8 karakter olmalıdır.' }, 400);
      }

      const { data: mevcutIsletme, error: mevcutIsletmeError } = await adminClient
        .from('restaurants')
        .select('id')
        .ilike('email', email)
        .limit(1);
      if (mevcutIsletmeError) throw mevcutIsletmeError;

      const mevcutAuth = await authKullanicisiniEmailIleBul(adminClient, email);
      if (mevcutIsletme?.length || mevcutAuth) {
        await denemeKaydet(emailHash, false);
        return jsonResponse({ error: 'Bu e-posta yeni kayıt için kullanılamıyor.' }, 409);
      }

      const { data: authData, error: authError } = await anonClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            integra_hesap_tipi: 'isletme_yetkilisi',
            isletme_adi: restaurantName,
          },
        },
      });
      if (authError || !authData?.user?.id) {
        await denemeKaydet(emailHash, false);
        return jsonResponse(
          { error: authError?.message || 'Güvenli işletme hesabı oluşturulamadı.' },
          400,
        );
      }

      const authUserId = authData.user.id;
      let restaurantId: number | null = null;

      try {
        const { data: yeniRestoran, error: restoranError } = await adminClient
          .from('restaurants')
          .insert({
            name: restaurantName,
            restaurant_name: restaurantName,
            email,
            password: kullanilamazSifre(),
            auth_user_id: authUserId,
            yetkili_adi: yetkiliAdi,
            firma_telefon: telefon,
            firma_adres: adres,
            kayit_notu: notMetni,
            basvuru_paketi: paket,
            paket_adi: paket,
            isletme_tipi: isletmeTipi,
            aylik_ucret: 0,
            lisans_durumu: 'Onay Bekliyor',
            kullanici_limiti: ['Profesyonel', 'Market', 'Kuaför'].includes(paket) ? 3 : 0,
            durum: 'Onay Bekliyor',
            rol: 'owner',
          })
          .select('id')
          .single();
        if (restoranError) throw restoranError;

        restaurantId = yeniRestoran.id;
        const { error: masaError } = await adminClient.from('masalar').insert(
          [1, 2, 3].map(no => ({
            restaurant_id: restaurantId,
            ad: `Masa ${no}`,
            dolu: false,
            tutar: 0,
            siparisler: [],
            odemeler: [],
          })),
        );
        if (masaError) throw masaError;

        await adminClient.from('admin_bildirimleri').insert({
          tip: 'Yeni Kayıt',
          baslik: 'Yeni restoran başvurusu var',
          mesaj: `Yeni kayıt başvurusu: ${restaurantName} / Yetkili: ${yetkiliAdi} / Telefon: ${telefon} / Paket: ${paket}`,
          restaurant_id: restaurantId,
          metadata: {
            restaurantName,
            yetkiliAdi,
            telefon,
            adres,
            email,
            paket,
            not: notMetni,
          },
        });
      } catch (error) {
        if (restaurantId) {
          await adminClient.from('masalar').delete().eq('restaurant_id', restaurantId);
          await adminClient.from('restaurants').delete().eq('id', restaurantId);
        }
        await adminClient.auth.admin.deleteUser(authUserId).catch(() => undefined);
        throw error;
      }

      await denemeKaydet(emailHash, true);
      return jsonResponse({
        ok: true,
        restaurantId,
        emailDogrulamaGerekli: !authData.session,
        message: 'Başvurunuz güvenli biçimde oluşturuldu.',
      });
    }

    if (action === 'migrate_legacy_login') {
      const emailHash = await sha256(`legacy:${email}`);
      if (!emailGecerli(email) || await denemeSayisi(emailHash) >= 5) {
        return jsonResponse({ error: 'E-posta veya şifre hatalı.' }, 401);
      }

      const password = String(body?.password || '');
      if (!password) return jsonResponse({ error: 'E-posta veya şifre hatalı.' }, 401);

      const { data: owner, error: ownerError } = await adminClient
        .from('restaurants')
        .select('*')
        .ilike('email', email)
        .eq('rol', 'owner')
        .maybeSingle();
      if (ownerError) throw ownerError;

      const ownerLegacySifre = String(owner?.password || '');
      const ownerEslesiyor = Boolean(
        owner
        && !owner.auth_user_id
        && !ownerLegacySifre.startsWith('AUTH_ONLY_')
        && await sabitSifreKarsilastir(ownerLegacySifre, password),
      );

      if (ownerEslesiyor) {
        if (!aktifDurum(owner.durum)) {
          await denemeKaydet(emailHash, false);
          return jsonResponse({ error: 'Hesap aktif değil.' }, 403);
        }

        const { authUser } = await authKullanicisiniHazirla(adminClient, {
          email,
          password,
          metadata: {
            integra_hesap_tipi: 'isletme_yetkilisi',
            restaurant_id: owner.id,
          },
          ownerId: owner.id,
          mevcutAuthKullanicisiniBagla: true,
        });

        const { error } = await adminClient
          .from('restaurants')
          .update({
            auth_user_id: authUser.id,
            password: kullanilamazSifre(),
            email,
          })
          .eq('id', owner.id)
          .eq('rol', 'owner');
        if (error) throw error;

        await denemeKaydet(emailHash, true);
        return jsonResponse({ ok: true, migrated: true });
      }

      const { data: personel, error: personelError } = await adminClient
        .from('personeller')
        .select('*')
        .ilike('email', email)
        .maybeSingle();
      if (personelError) throw personelError;

      let hedefPersonel = personel;
      let personelEslesiyor = Boolean(
        personel
        && !personel.auth_user_id
        && !String(personel.sifre || '').startsWith('AUTH_ONLY_')
        && await sabitSifreKarsilastir(personel.sifre, password),
      );

      const { data: legacyWaiter, error: waiterError } = await adminClient
        .from('restaurants')
        .select('*')
        .ilike('email', email)
        .eq('rol', 'waiter')
        .maybeSingle();
      if (waiterError) throw waiterError;

      if (!personelEslesiyor && legacyWaiter && !legacyWaiter.auth_user_id) {
        const legacyWaiterSifre = String(legacyWaiter.password || '');
        personelEslesiyor = Boolean(
          !legacyWaiterSifre.startsWith('AUTH_ONLY_')
          && await sabitSifreKarsilastir(legacyWaiterSifre, password),
        );
      }

      if (personelEslesiyor && !hedefPersonel && legacyWaiter?.parent_restaurant_id) {
        const { data: olusanPersonel, error: personelOlusturmaError } = await adminClient
          .from('personeller')
          .insert({
            restaurant_id: legacyWaiter.parent_restaurant_id,
            ad: legacyWaiter.waiter_name || legacyWaiter.name || 'Personel',
            gorev: legacyWaiter.personel_gorev || 'Garson',
            email,
            sifre: password,
            durum: legacyWaiter.durum || 'Aktif',
            tab_yetkileri: legacyWaiter.tab_yetkileri || [],
          })
          .select('*')
          .single();
        if (personelOlusturmaError) throw personelOlusturmaError;
        hedefPersonel = olusanPersonel;
      }

      if (personelEslesiyor && hedefPersonel) {
        const { data: isletme, error: isletmeError } = await adminClient
          .from('restaurants')
          .select('id, durum')
          .eq('id', hedefPersonel.restaurant_id)
          .eq('rol', 'owner')
          .maybeSingle();
        if (isletmeError) throw isletmeError;

        if (!aktifDurum(hedefPersonel.durum) || !aktifDurum(isletme?.durum)) {
          await denemeKaydet(emailHash, false);
          return jsonResponse({ error: 'Hesap aktif değil.' }, 403);
        }

        const { authUser } = await authKullanicisiniHazirla(adminClient, {
          email,
          password,
          metadata: {
            integra_hesap_tipi: 'personel',
            restaurant_id: hedefPersonel.restaurant_id,
            personel_id: hedefPersonel.id,
          },
          personelId: hedefPersonel.id,
          mevcutAuthKullanicisiniBagla: true,
        });

        const { error: personelGuncellemeError } = await adminClient
          .from('personeller')
          .update({
            auth_user_id: authUser.id,
            email,
            sifre: kullanilamazSifre(),
          })
          .eq('id', hedefPersonel.id)
          .eq('restaurant_id', hedefPersonel.restaurant_id);
        if (personelGuncellemeError) throw personelGuncellemeError;

        await adminClient
          .from('restaurants')
          .update({ password: kullanilamazSifre() })
          .eq('rol', 'waiter')
          .eq('parent_restaurant_id', hedefPersonel.restaurant_id)
          .ilike('email', email);

        await denemeKaydet(emailHash, true);
        return jsonResponse({ ok: true, migrated: true });
      }

      await denemeKaydet(emailHash, false);
      return jsonResponse({ error: 'E-posta veya şifre hatalı.' }, 401);
    }

    if (action === 'request_password_help') {
      const emailHash = await sha256(`help:${email}`);
      if (emailGecerli(email) && await denemeSayisi(emailHash, true) < 3) {
        const { data: owner } = await adminClient
          .from('restaurants')
          .select('id, restaurant_name, name')
          .ilike('email', email)
          .eq('rol', 'owner')
          .maybeSingle();

        if (owner) {
          await adminClient.from('admin_bildirimleri').insert({
            tip: 'Şifre Yardımı',
            baslik: 'İşletme yetkilisi şifre yardımı istiyor',
            mesaj: `${owner.restaurant_name || owner.name || 'İşletme'} hesabı için güvenli şifre yardımı talebi oluşturuldu.`,
            restaurant_id: owner.id,
            metadata: { email },
          });
        }
        await denemeKaydet(emailHash, true);
      }

      return jsonResponse({
        ok: true,
        message: 'Hesap uygunsa şifre yardımı talebi iletildi. Personelseniz işletme sahibinizle iletişime geçin.',
      });
    }

    const authorization = req.headers.get('Authorization') || '';
    if (!authorization.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Geçerli Supabase oturumu bulunamadı.' }, 401);
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData?.user) {
      return jsonResponse({ error: 'Supabase oturumu doğrulanamadı.' }, 401);
    }

    const authUserId = callerData.user.id;
    const [{ data: owner, error: ownerError }, { data: callerPersonel, error: callerPersonelError }] =
      await Promise.all([
        adminClient
          .from('restaurants')
          .select('*')
          .eq('auth_user_id', authUserId)
          .eq('rol', 'owner')
          .maybeSingle(),
        adminClient
          .from('personeller')
          .select('*')
          .eq('auth_user_id', authUserId)
          .maybeSingle(),
      ]);
    if (ownerError) throw ownerError;
    if (callerPersonelError) throw callerPersonelError;

    const restaurantId = owner?.id || callerPersonel?.restaurant_id || null;
    if (!restaurantId) return jsonResponse({ error: 'Integra hesap eşleştirmesi bulunamadı.' }, 403);

    const ownerZorunlu = () => {
      if (!owner || !aktifDurum(owner.durum)) {
        throw new Error('Bu işlem yalnızca aktif işletme sahibi tarafından yapılabilir.');
      }
    };

    if (action === 'list_personnel') {
      const { data, error } = await adminClient
        .from('personeller')
        .select('id, restaurant_id, ad, gorev, telefon, email, durum, tab_yetkileri, auth_user_id, created_at')
        .eq('restaurant_id', restaurantId)
        .order('id', { ascending: true });
      if (error) throw error;

      return jsonResponse({
        ok: true,
        personnel: (Array.isArray(data) ? data : []).map(guvenliPersonel),
      });
    }

    if (action === 'create_personnel') {
      ownerZorunlu();

      const ad = temizMetin(body?.ad, 120);
      const gorev = temizMetin(body?.gorev || 'Garson', 60);
      const telefon = temizMetin(body?.telefon, 30);
      const personelEmail = temizEmail(body?.email);
      const password = String(body?.password || '');
      const tabYetkileri = Array.isArray(body?.tabYetkileri) ? body.tabYetkileri.slice(0, 50) : [];

      if (!ad) return jsonResponse({ error: 'Personel adı zorunludur.' }, 400);
      if ((personelEmail && !emailGecerli(personelEmail)) || Boolean(personelEmail) !== Boolean(password)) {
        return jsonResponse({ error: 'Giriş hesabı için geçerli e-posta ve şifre birlikte girilmelidir.' }, 400);
      }
      if (password && password.length < 8) {
        return jsonResponse({ error: 'Personel şifresi en az 8 karakter olmalıdır.' }, 400);
      }

      const { count, error: countError } = await adminClient
        .from('personeller')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .neq('durum', 'Pasif');
      if (countError) throw countError;

      const limit = Number(owner.kullanici_limiti || 3);
      if (limit > 0 && Number(count || 0) >= limit) {
        return jsonResponse({ error: `Bu işletmede en fazla ${limit} aktif personel tanımlanabilir.` }, 409);
      }

      let authUser = null;
      let yeniAuthOlusturuldu = false;
      if (personelEmail) {
        const authSonucu = await authKullanicisiniHazirla(adminClient, {
          email: personelEmail,
          password,
          metadata: {
            integra_hesap_tipi: 'personel',
            restaurant_id: restaurantId,
          },
        });
        authUser = authSonucu.authUser;
        yeniAuthOlusturuldu = authSonucu.yeniOlusturuldu;
      }

      const { data: personel, error } = await adminClient
        .from('personeller')
        .insert({
          restaurant_id: restaurantId,
          ad,
          gorev,
          telefon,
          email: personelEmail || null,
          sifre: personelEmail ? kullanilamazSifre() : null,
          auth_user_id: authUser?.id || null,
          durum: 'Aktif',
          tab_yetkileri: tabYetkileri,
        })
        .select('id, restaurant_id, ad, gorev, telefon, email, durum, tab_yetkileri, auth_user_id, created_at')
        .single();

      if (error) {
        if (yeniAuthOlusturuldu && authUser?.id) {
          await adminClient.auth.admin.deleteUser(authUser.id).catch(() => undefined);
        }
        throw error;
      }

      if (authUser?.id) {
        await adminClient.auth.admin.updateUserById(authUser.id, {
          user_metadata: {
            ...(authUser.user_metadata || {}),
            integra_hesap_tipi: 'personel',
            restaurant_id: restaurantId,
            personel_id: personel.id,
          },
        });
      }

      return jsonResponse({
        ok: true,
        personnel: guvenliPersonel(personel),
        message: 'Personel güvenli biçimde eklendi.',
      });
    }

    if (action === 'update_personnel_permissions') {
      ownerZorunlu();
      const personelId = body?.personelId;
      const tabYetkileri = Array.isArray(body?.tabYetkileri) ? body.tabYetkileri.slice(0, 50) : [];
      if (!personelId || tabYetkileri.length === 0) {
        return jsonResponse({ error: 'Personel ve en az bir ekran yetkisi zorunludur.' }, 400);
      }

      const { data: personel, error } = await adminClient
        .from('personeller')
        .update({ tab_yetkileri: tabYetkileri })
        .eq('id', personelId)
        .eq('restaurant_id', restaurantId)
        .select('id, restaurant_id, ad, gorev, telefon, email, durum, tab_yetkileri, auth_user_id, created_at')
        .single();
      if (error) throw error;

      await adminClient
        .from('restaurants')
        .update({ tab_yetkileri: tabYetkileri, personel_gorev: personel.gorev || 'Personel' })
        .eq('rol', 'waiter')
        .eq('parent_restaurant_id', restaurantId)
        .eq('personel_id', personel.id);

      return jsonResponse({ ok: true, personnel: guvenliPersonel(personel) });
    }

    if (action === 'upsert_personnel_auth') {
      ownerZorunlu();
      const personelId = body?.personelId;
      const personelEmail = temizEmail(body?.email);
      const password = String(body?.password || '');
      if (!personelId || !emailGecerli(personelEmail)) {
        return jsonResponse({ error: 'Personel ve geçerli e-posta zorunludur.' }, 400);
      }
      if (password && password.length < 8) {
        return jsonResponse({ error: 'Yeni şifre en az 8 karakter olmalıdır.' }, 400);
      }

      const { data: personel, error: personelError } = await adminClient
        .from('personeller')
        .select('*')
        .eq('id', personelId)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();
      if (personelError) throw personelError;
      if (!personel) return jsonResponse({ error: 'Personel bulunamadı.' }, 404);
      if (!personel.auth_user_id && !password) {
        return jsonResponse({ error: 'İlk Auth bağlantısında yeni şifre zorunludur.' }, 400);
      }

      const { authUser } = await authKullanicisiniHazirla(adminClient, {
        mevcutAuthUserId: personel.auth_user_id,
        email: personelEmail,
        password,
        metadata: {
          integra_hesap_tipi: 'personel',
          restaurant_id: restaurantId,
          personel_id: personel.id,
        },
        personelId: personel.id,
      });

      const { data: guncelPersonel, error: updateError } = await adminClient
        .from('personeller')
        .update({
          email: personelEmail,
          auth_user_id: authUser.id,
          sifre: kullanilamazSifre(),
        })
        .eq('id', personel.id)
        .eq('restaurant_id', restaurantId)
        .select('id, restaurant_id, ad, gorev, telefon, email, durum, tab_yetkileri, auth_user_id, created_at')
        .single();
      if (updateError) throw updateError;

      await adminClient
        .from('restaurants')
        .update({ email: personelEmail, password: kullanilamazSifre() })
        .eq('rol', 'waiter')
        .eq('parent_restaurant_id', restaurantId)
        .eq('personel_id', personel.id);

      return jsonResponse({
        ok: true,
        personnel: guvenliPersonel(guncelPersonel),
        message: 'Personel giriş bilgileri Supabase Auth üzerinde güncellendi.',
      });
    }

    if (action === 'set_personnel_active') {
      ownerZorunlu();
      const personelId = body?.personelId;
      const aktif = body?.aktif === true;

      const { data: personel, error: personelError } = await adminClient
        .from('personeller')
        .select('*')
        .eq('id', personelId)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();
      if (personelError) throw personelError;
      if (!personel) return jsonResponse({ error: 'Personel bulunamadı.' }, 404);

      if (personel.auth_user_id) {
        const { error } = await adminClient.auth.admin.updateUserById(
          personel.auth_user_id,
          { ban_duration: aktif ? 'none' : '876000h' },
        );
        if (error) throw error;
      }

      const { data: guncelPersonel, error: updateError } = await adminClient
        .from('personeller')
        .update({ durum: aktif ? 'Aktif' : 'Pasif' })
        .eq('id', personel.id)
        .eq('restaurant_id', restaurantId)
        .select('id, restaurant_id, ad, gorev, telefon, email, durum, tab_yetkileri, auth_user_id, created_at')
        .single();
      if (updateError) throw updateError;

      await adminClient
        .from('restaurants')
        .update({ durum: aktif ? 'Aktif' : 'Pasif' })
        .eq('rol', 'waiter')
        .eq('parent_restaurant_id', restaurantId)
        .eq('personel_id', personel.id);

      return jsonResponse({
        ok: true,
        personnel: guvenliPersonel(guncelPersonel),
        message: aktif ? 'Personel aktifleştirildi.' : 'Personel pasifleştirildi.',
      });
    }

    return jsonResponse({ error: 'Desteklenmeyen hesap işlemi.' }, 400);
  } catch (error) {
    console.error('isletme-hesaplari:', error);
    return jsonResponse({ error: error?.message || 'Hesap işlemi başarısız oldu.' }, 500);
  }
});
