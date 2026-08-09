import { supabase } from '../lib/supabase';

const hataMesaji = (error) => {
  const mesaj = String(error?.message || 'Ödeme işlemi tamamlanamadı.');

  if (mesaj.includes('Could not find the function') || mesaj.includes('schema cache')) {
    return 'Güvenli restoran işlem servisi Supabase üzerinde hazır değil. Son veritabanı güncellemesini çalıştırın.';
  }

  return mesaj;
};

export async function restoranAdisyonOdemeAtomik({
  restaurantId,
  masaId,
  islemAnahtari,
  odeme,
  satisKayitlari = [],
}) {
  if (!restaurantId || !masaId) {
    throw new Error('Ödeme için aktif işletme ve masa bilgisi zorunludur.');
  }

  if (!islemAnahtari) {
    throw new Error('Ödeme işlem anahtarı oluşturulamadı.');
  }

  const { data, error } = await supabase.rpc('restoran_adisyon_odeme_atomik', {
    p_restaurant_id: Number(restaurantId),
    p_masa_id: Number(masaId),
    p_islem_anahtari: islemAnahtari,
    p_odeme: odeme,
    p_satis_kayitlari: satisKayitlari,
  });

  if (error) {
    throw new Error(hataMesaji(error));
  }

  if (!data?.masa) {
    throw new Error('Ödeme tamamlandı ancak güncel masa bilgisi alınamadı.');
  }

  return data;
}

export async function restoranHizliSatisKaydetAtomik({
  restaurantId,
  islemAnahtari,
  satisKayitlari,
  siparisler,
  mutfakKayitlari = [],
  cariMusteriId = null,
}) {
  const { data, error } = await supabase.rpc('restoran_hizli_satis_kaydet_atomik', {
    p_restaurant_id: Number(restaurantId),
    p_islem_anahtari: islemAnahtari,
    p_satis_kayitlari: satisKayitlari,
    p_siparisler: siparisler,
    p_mutfak_kayitlari: mutfakKayitlari,
    p_cari_musteri_id: cariMusteriId ? Number(cariMusteriId) : null,
  });
  if (error) throw new Error(hataMesaji(error));
  if (!data?.satislar) throw new Error('Hızlı satış tamamlandı ancak satış bilgisi alınamadı.');
  return data;
}

export async function restoranAlisFisleriniGetir(restaurantId, limit = 100) {
  if (!restaurantId) return [];

  const { data, error } = await supabase
    .from('restoran_alis_fisleri')
    .select('*, restoran_alis_fis_kalemleri(*)')
    .eq('restaurant_id', Number(restaurantId))
    .order('tarih', { ascending: false })
    .limit(limit);

  if (error) throw new Error(hataMesaji(error));
  return Array.isArray(data) ? data : [];
}

export async function restoranAlisFisiAtomik({
  restaurantId,
  islemAnahtari,
  fis,
  kalemler,
}) {
  const { data, error } = await supabase.rpc('restoran_alis_fisi_atomik', {
    p_restaurant_id: Number(restaurantId),
    p_islem_anahtari: islemAnahtari,
    p_fis: fis,
    p_kalemler: kalemler,
  });

  if (error) throw new Error(hataMesaji(error));
  if (!data?.fis) throw new Error('Alış fişi kaydedildi ancak fiş bilgisi alınamadı.');
  return data;
}

export async function restoranIadeKaydiAtomik({
  restaurantId,
  islemAnahtari,
  urunId,
  tip,
  sebep,
  adet,
  tutar,
  kullaniciAdi,
  stogaIade = false,
}) {
  const { data, error } = await supabase.rpc('restoran_iade_kaydi_atomik', {
    p_restaurant_id: Number(restaurantId),
    p_islem_anahtari: islemAnahtari,
    p_urun_id: Number(urunId),
    p_tip: tip,
    p_sebep: sebep,
    p_adet: Number(adet),
    p_tutar: Number(tutar),
    p_kullanici_adi: kullaniciAdi,
    p_stoga_iade: Boolean(stogaIade),
  });

  if (error) throw new Error(hataMesaji(error));
  if (!data?.kayit) throw new Error('İade/ikram kaydı tamamlandı ancak kayıt bilgisi alınamadı.');
  return data;
}

export async function restoranAdisyonCariyeAtomik({
  restaurantId,
  masaId,
  islemAnahtari,
  cariMusteriId,
  tutar,
  satisKayitlari,
}) {
  const { data, error } = await supabase.rpc('restoran_adisyon_cariye_atomik', {
    p_restaurant_id: Number(restaurantId),
    p_masa_id: Number(masaId),
    p_islem_anahtari: islemAnahtari,
    p_cari_musteri_id: Number(cariMusteriId),
    p_tutar: Number(tutar),
    p_satis_kayitlari: satisKayitlari,
  });

  if (error) throw new Error(hataMesaji(error));
  if (!data?.masa || !data?.cari) {
    throw new Error('Cari satış tamamlandı ancak güncel masa/cari bilgisi alınamadı.');
  }
  return data;
}
