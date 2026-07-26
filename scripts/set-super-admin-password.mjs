import { createClient } from '@supabase/supabase-js';

async function main() {
  const stdinParcalar = [];

  for await (const parca of process.stdin) {
    stdinParcalar.push(parca);
  }

  const girdi = JSON.parse(Buffer.concat(stdinParcalar).toString('utf8'));
  const supabaseUrl = String(girdi.supabaseUrl || '').trim();
  const supabaseSecretKey = String(girdi.supabaseSecretKey || '').trim();
  const authUserId = String(girdi.authUserId || '').trim();
  const yeniSifre = String(girdi.yeniSifre || '');

  if (!supabaseUrl || !supabaseSecretKey || !authUserId || !yeniSifre) {
    throw new Error('Supabase bağlantısı, Secret Key, kullanıcı UUID ve yeni şifre zorunludur.');
  }

  if (supabaseSecretKey.startsWith('sb_publishable_')) {
    throw new Error('Publishable Key kullanılamaz. Supabase Secret Key veya legacy service_role anahtarı gerekir.');
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    password: yeniSifre,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Supabase şifre güncelleme hatası: ${error.message}`);
  }

  if (String(data?.user?.id || '') !== authUserId) {
    throw new Error('Supabase farklı bir kullanıcı kaydı döndürdü; işlem doğrulanamadı.');
  }

  process.stdout.write('Süper admin şifresi değiştirildi ve e-posta hesabı onaylandı.');
}

main().catch(error => {
  process.stderr.write(`HATA: ${error?.message || 'Şifre güncellenemedi.'}`);
  process.exitCode = 1;
});
