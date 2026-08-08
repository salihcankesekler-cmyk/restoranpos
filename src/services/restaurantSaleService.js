import { supabase } from '../lib/supabase';

const hataMesaji = (error) => {
  const mesaj = String(error?.message || 'Ödeme işlemi tamamlanamadı.');

  if (mesaj.includes('Could not find the function') || mesaj.includes('schema cache')) {
    return 'Güvenli ödeme servisi Supabase üzerinde hazır değil. Son veritabanı güncellemesini çalıştırın.';
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
