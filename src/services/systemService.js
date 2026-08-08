import { supabase } from '../lib/supabase';

const GIZLI_ALAN = /pass(word)?|sifre|token|secret|authorization|apikey|api_key|cookie|session|otp/i;

const hataMesaji = (error, varsayilan = 'Sistem işlemi tamamlanamadı.') => {
  if (!error) return varsayilan;
  return String(error.message || error.details || varsayilan);
};

export const guvenliSistemDetayi = (deger, derinlik = 0) => {
  if (derinlik > 4) return '[sinirlandi]';
  if (deger == null || ['string', 'number', 'boolean'].includes(typeof deger)) {
    return typeof deger === 'string' ? deger.slice(0, 2000) : deger;
  }
  if (Array.isArray(deger)) {
    return deger.slice(0, 30).map(item => guvenliSistemDetayi(item, derinlik + 1));
  }
  if (typeof deger === 'object') {
    return Object.fromEntries(Object.entries(deger).slice(0, 50).map(([key, value]) => [
      key,
      GIZLI_ALAN.test(key) ? '[gizlendi]' : guvenliSistemDetayi(value, derinlik + 1),
    ]));
  }
  return String(deger).slice(0, 500);
};

export async function sistemOlayiKaydet({
  restaurantId = null,
  seviye = 'error',
  kaynak = 'uygulama',
  islem = '',
  mesaj,
  hataKodu = '',
  ekran = '',
  detay = {},
} = {}) {
  const temizMesaj = String(mesaj?.message || mesaj || '').trim();
  if (!temizMesaj) return null;

  try {
    const { data, error } = await supabase.rpc('sistem_olayi_kaydet', {
      p_restaurant_id: restaurantId ? Number(restaurantId) : null,
      p_seviye: seviye,
      p_kaynak: kaynak,
      p_islem: String(islem || '').trim() || null,
      p_mesaj: temizMesaj,
      p_hata_kodu: String(hataKodu || '').trim() || null,
      p_ekran: String(ekran || '').trim() || null,
      p_detay: guvenliSistemDetayi(detay) || {},
    });
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function sistemIslemKaydiEkle({
  restaurantId,
  islemTipi,
  ekran = '',
  hedefTablo = '',
  hedefId = '',
  aciklama = '',
  oncekiVeri = null,
  yeniVeri = null,
} = {}) {
  if (!restaurantId || !String(islemTipi || '').trim()) return null;

  try {
    const { data, error } = await supabase.rpc('sistem_islem_kaydi_ekle', {
      p_restaurant_id: Number(restaurantId),
      p_islem_tipi: String(islemTipi).trim(),
      p_ekran: String(ekran || '').trim() || null,
      p_hedef_tablo: String(hedefTablo || '').trim() || null,
      p_hedef_id: String(hedefId || '').trim() || null,
      p_aciklama: String(aciklama || '').trim() || null,
      p_onceki_veri: oncekiVeri == null ? null : guvenliSistemDetayi(oncekiVeri),
      p_yeni_veri: yeniVeri == null ? null : guvenliSistemDetayi(yeniVeri),
    });
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function sistemMerkeziVerileriniGetir(restaurantId) {
  if (!restaurantId) throw new Error('Aktif işletme bulunamadı.');

  const [olaylar, islemler, kilitler] = await Promise.all([
    supabase
      .from('sistem_olaylari')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(150),
    supabase
      .from('islem_loglari')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(150),
    supabase
      .from('gun_sonu_kilitleri')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('tarih', { ascending: false })
      .limit(90),
  ]);

  const hata = olaylar.error || islemler.error || kilitler.error;
  if (hata) throw new Error(hataMesaji(hata, 'Sistem merkezi verileri alınamadı.'));

  return {
    olaylar: olaylar.data || [],
    islemler: islemler.data || [],
    kilitler: kilitler.data || [],
  };
}

export async function sistemOlayiniCoz(restaurantId, olayId, notMetni = '') {
  const { data, error } = await supabase.rpc('sistem_olayini_coz', {
    p_restaurant_id: Number(restaurantId),
    p_olay_id: olayId,
    p_not: String(notMetni || '').trim() || null,
  });
  if (error) throw new Error(hataMesaji(error, 'Sistem olayı kapatılamadı.'));
  return Boolean(data);
}

export async function gunSonuKilidiniAyarla(restaurantId, tarih, kilitli, aciklama = '') {
  const { data, error } = await supabase.rpc('gun_sonu_kilidini_ayarla', {
    p_restaurant_id: Number(restaurantId),
    p_tarih: tarih,
    p_kilitli: Boolean(kilitli),
    p_aciklama: String(aciklama || '').trim() || null,
  });
  if (error) throw new Error(hataMesaji(error, 'Gün sonu kilidi güncellenemedi.'));
  return data;
}

export async function gunSonuKilitleriniGetir(restaurantId) {
  if (!restaurantId) return [];
  const { data, error } = await supabase
    .from('gun_sonu_kilitleri')
    .select('id, restaurant_id, tarih, kilitli, aciklama, updated_at')
    .eq('restaurant_id', restaurantId)
    .order('tarih', { ascending: false })
    .limit(370);
  if (error) throw new Error(hataMesaji(error, 'Gün sonu kilitleri alınamadı.'));
  return data || [];
}

export async function sistemTeshisiYap(restaurantId) {
  const kontroller = [
    ['İşletme oturumu', supabase.from('restaurants').select('id', { count: 'exact', head: true }).eq('id', restaurantId)],
    ['Menü grupları', supabase.from('menu_gruplari').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId)],
    ['Menü ürünleri', supabase.from('menu_urunleri').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId)],
    ['Masalar', supabase.from('masalar').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId)],
    ['Cari hesaplar', supabase.from('cari_musteriler').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId)],
    ['Depo kartları', supabase.from('depo_urunleri').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId)],
  ];

  const sonuclar = await Promise.all(kontroller.map(async ([baslik, sorgu]) => {
    try {
      const { count, error } = await sorgu;
      return {
        baslik,
        durum: error ? 'Hata' : 'Aktif',
        adet: error ? null : Number(count || 0),
        mesaj: error ? hataMesaji(error) : 'Bağlantı ve yetki kontrolü başarılı.',
      };
    } catch (error) {
      return { baslik, durum: 'Hata', adet: null, mesaj: hataMesaji(error) };
    }
  }));

  return sonuclar;
}
