import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
};

const temizEmail = (value: unknown) => String(value || '').trim().toLowerCase();
const emailGecerli = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const authKullanicilariniGetir = async (adminClient: ReturnType<typeof createClient>) => {
  const kullanicilar = [];

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });

    if (error) throw error;

    const sayfa = Array.isArray(data?.users) ? data.users : [];
    kullanicilar.push(...sayfa);

    if (sayfa.length < 1000) break;
  }

  return kullanicilar;
};

const hesapPasifMi = (bannedUntil: string | null | undefined) => {
  if (!bannedUntil) return false;
  const zaman = new Date(bannedUntil).getTime();
  return Number.isFinite(zaman) && zaman > Date.now();
};

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Yalnızca POST isteği desteklenir.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey =
      Deno.env.get('SUPABASE_ANON_KEY') ||
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ||
      '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const authorization = req.headers.get('Authorization') || '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ error: 'Supabase Edge Function ortam değişkenleri eksik.' }, 500);
    }

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

    const { data: superAdminMi, error: superAdminError } = await callerClient.rpc(
      'integra_super_admin_mi'
    );

    if (superAdminError || superAdminMi !== true) {
      return jsonResponse({ error: 'Bu işlem yalnızca doğrulanmış süper admin tarafından yapılabilir.' }, 403);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || 'list_owners');

    if (action === 'list_owners') {
      const { data: owners, error: ownersError } = await adminClient
        .from('restaurants')
        .select('id, restaurant_name, name, email, yetkili_adi, firma_telefon, durum, rol, auth_user_id, created_at')
        .eq('rol', 'owner')
        .order('id', { ascending: true });

      if (ownersError) throw ownersError;

      const authUsers = await authKullanicilariniGetir(adminClient);
      const authUserMap = new Map(authUsers.map(authUser => [String(authUser.id), authUser]));

      const kayitlar = (Array.isArray(owners) ? owners : []).map(owner => {
        const authUser = owner.auth_user_id
          ? authUserMap.get(String(owner.auth_user_id))
          : null;

        return {
          restaurantId: owner.id,
          isletmeAdi: owner.restaurant_name || owner.name || 'İsimsiz İşletme',
          yetkiliAdi: owner.yetkili_adi || '',
          telefon: owner.firma_telefon || '',
          durum: owner.durum || 'Onay Bekliyor',
          email: authUser?.email || owner.email || '',
          kayitEmaili: owner.email || '',
          authBagli: Boolean(authUser),
          authUserId: authUser?.id || owner.auth_user_id || null,
          emailOnayli: Boolean(authUser?.email_confirmed_at),
          sonGiris: authUser?.last_sign_in_at || null,
          authPasif: authUser ? hesapPasifMi(authUser.banned_until) : false,
          createdAt: owner.created_at || null,
        };
      });

      return jsonResponse({ ok: true, owners: kayitlar });
    }

    if (action === 'upsert_owner_auth') {
      const restaurantId = body?.restaurantId;
      const email = temizEmail(body?.email);
      const password = String(body?.password || '');

      if (!restaurantId) {
        return jsonResponse({ error: 'İşletme seçimi zorunludur.' }, 400);
      }

      if (!emailGecerli(email)) {
        return jsonResponse({ error: 'Geçerli bir işletme yetkilisi e-postası girin.' }, 400);
      }

      const { data: owner, error: ownerError } = await adminClient
        .from('restaurants')
        .select('id, restaurant_name, name, email, rol, auth_user_id')
        .eq('id', restaurantId)
        .eq('rol', 'owner')
        .maybeSingle();

      if (ownerError) throw ownerError;
      if (!owner) {
        return jsonResponse({ error: 'İşletme sahibi hesabı bulunamadı.' }, 404);
      }

      if (!owner.auth_user_id && password.length < 8) {
        return jsonResponse({ error: 'İlk Auth bağlantısında en az 8 karakterli yeni şifre zorunludur.' }, 400);
      }

      if (password && password.length < 8) {
        return jsonResponse({ error: 'Yeni şifre en az 8 karakter olmalıdır.' }, 400);
      }

      let authUser = null;

      if (owner.auth_user_id) {
        const { data: authData, error: authError } = await adminClient.auth.admin.getUserById(
          owner.auth_user_id
        );

        if (authError) throw authError;
        authUser = authData?.user || null;
      } else {
        const authUsers = await authKullanicilariniGetir(adminClient);
        authUser = authUsers.find(user => temizEmail(user.email) === email) || null;

        if (authUser) {
          const { data: authUserSuperAdminMi, error: authUserSuperAdminError } =
            await adminClient.rpc('integra_super_admin_kullanici_mi', {
              p_auth_user_id: authUser.id,
            });

          if (authUserSuperAdminError) throw authUserSuperAdminError;

          if (authUserSuperAdminMi === true) {
            return jsonResponse(
              { error: 'Süper admin Auth kullanıcısı işletme hesabına bağlanamaz.' },
              409
            );
          }

          const { data: baskaIsletme, error: baskaIsletmeError } = await adminClient
            .from('restaurants')
            .select('id')
            .eq('auth_user_id', authUser.id)
            .neq('id', owner.id)
            .maybeSingle();

          if (baskaIsletmeError) throw baskaIsletmeError;

          if (baskaIsletme) {
            return jsonResponse(
              { error: 'Bu Auth kullanıcısı başka bir işletmeye bağlı.' },
              409
            );
          }
        }
      }

      if (!authUser) {
        const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            integra_hesap_tipi: 'isletme_yetkilisi',
            restaurant_id: owner.id,
          },
        });

        if (createError) throw createError;
        authUser = createData?.user || null;
      } else {
        const authUpdate = {
          email,
          email_confirm: true,
          user_metadata: {
            ...(authUser.user_metadata || {}),
            integra_hesap_tipi: 'isletme_yetkilisi',
            restaurant_id: owner.id,
          },
        };

        if (password) {
          Object.assign(authUpdate, { password });
        }

        const { data: updateData, error: updateError } =
          await adminClient.auth.admin.updateUserById(authUser.id, authUpdate);

        if (updateError) throw updateError;
        authUser = updateData?.user || authUser;
      }

      if (!authUser?.id) {
        throw new Error('Supabase Auth kullanıcısı oluşturulamadı.');
      }

      const { error: ownerUpdateError } = await adminClient
        .from('restaurants')
        .update({
          auth_user_id: authUser.id,
          email,
          // Eski owner parolasını kullanılmaz rastgele değerle değiştirir.
          // Gerçek parola yalnızca Supabase Auth içinde hash olarak tutulur.
          password: `AUTH_ONLY_${crypto.randomUUID()}`,
        })
        .eq('id', owner.id)
        .eq('rol', 'owner');

      if (ownerUpdateError) throw ownerUpdateError;

      return jsonResponse({
        ok: true,
        message: 'İşletme yetkilisi Supabase Auth hesabı güncellendi.',
        owner: {
          restaurantId: owner.id,
          authUserId: authUser.id,
          email: authUser.email || email,
          emailOnayli: Boolean(authUser.email_confirmed_at),
        },
      });
    }

    if (action === 'set_owner_active') {
      const restaurantId = body?.restaurantId;
      const aktif = body?.aktif === true;

      if (!restaurantId) {
        return jsonResponse({ error: 'İşletme seçimi zorunludur.' }, 400);
      }

      const { data: owner, error: ownerError } = await adminClient
        .from('restaurants')
        .select('id, rol, auth_user_id')
        .eq('id', restaurantId)
        .eq('rol', 'owner')
        .maybeSingle();

      if (ownerError) throw ownerError;
      if (!owner) {
        return jsonResponse({ error: 'İşletme sahibi hesabı bulunamadı.' }, 404);
      }

      if (owner.auth_user_id) {
        const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
          owner.auth_user_id,
          { ban_duration: aktif ? 'none' : '876000h' }
        );

        if (authUpdateError) throw authUpdateError;
      }

      const { error: ownerUpdateError } = await adminClient
        .from('restaurants')
        .update({
          durum: aktif ? 'Aktif' : 'Donduruldu',
          lisans_durumu: aktif ? 'Aktif' : 'Donduruldu',
        })
        .eq('id', owner.id)
        .eq('rol', 'owner');

      if (ownerUpdateError) throw ownerUpdateError;

      return jsonResponse({
        ok: true,
        message: aktif ? 'İşletme yetkilisi aktifleştirildi.' : 'İşletme yetkilisi pasifleştirildi.',
      });
    }

    return jsonResponse({ error: 'Desteklenmeyen kullanıcı yönetimi işlemi.' }, 400);
  } catch (error) {
    console.error('admin-isletme-kullanicilari:', error);
    return jsonResponse({ error: error?.message || 'İşletme kullanıcısı işlemi başarısız oldu.' }, 500);
  }
});
