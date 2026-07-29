import { supabase } from '../lib/supabase';

const hataKontrol = (error, varsayilanMesaj) => {
  if (!error) return;

  const mesaj = String(error.message || varsayilanMesaj || 'Depo işlemi tamamlanamadı.');
  if (mesaj.includes('Could not find the table') || mesaj.includes('schema cache')) {
    throw new Error('Depo tabloları henüz Supabase üzerinde kurulmamış. Depo SQL dosyasını SQL Editor içinde çalıştırın.');
  }

  throw new Error(mesaj);
};

export async function depoVerileriniGetir(restaurantId) {
  if (!restaurantId) throw new Error('Aktif işletme bulunamadı.');

  const [
    urunSonucu,
    alisSonucu,
    sevkSonucu,
    sevkKalemSonucu,
    baglantiSonucu,
    kodSonucu,
  ] = await Promise.all([
    supabase
      .from('depo_urunleri')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('aktif', true)
      .order('urun_adi'),
    supabase
      .from('depo_alislari')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('depo_sevkleri')
      .select('*')
      .or(`kaynak_restaurant_id.eq.${restaurantId},hedef_restaurant_id.eq.${restaurantId}`)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('depo_sevk_kalemleri')
      .select('*')
      .order('created_at', { ascending: true }),
    supabase
      .from('depo_isletme_baglantilari')
      .select('*')
      .or(`depo_restaurant_id.eq.${restaurantId},sube_restaurant_id.eq.${restaurantId}`)
      .eq('durum', 'Aktif')
      .order('created_at', { ascending: false }),
    supabase.rpc('depo_baglanti_kodum', { p_restaurant_id: restaurantId }),
  ]);

  hataKontrol(urunSonucu.error, 'Depo ürünleri alınamadı.');
  hataKontrol(alisSonucu.error, 'Depo alışları alınamadı.');
  hataKontrol(sevkSonucu.error, 'Sevkiyatlar alınamadı.');
  hataKontrol(sevkKalemSonucu.error, 'Sevkiyat kalemleri alınamadı.');
  hataKontrol(baglantiSonucu.error, 'Bağlı işletmeler alınamadı.');
  hataKontrol(kodSonucu.error, 'Depo bağlantı kodu alınamadı.');

  return {
    urunler: urunSonucu.data || [],
    alislar: alisSonucu.data || [],
    sevkler: sevkSonucu.data || [],
    sevkKalemleri: sevkKalemSonucu.data || [],
    baglantilar: baglantiSonucu.data || [],
    baglantiKodu: typeof kodSonucu.data === 'string'
      ? kodSonucu.data
      : kodSonucu.data?.baglanti_kodu || '',
  };
}

export async function depoUrunuKaydet(restaurantId, urun, urunId = null) {
  const { data, error } = await supabase.rpc('depo_urununu_kaydet', {
    p_restaurant_id: restaurantId,
    p_urun_id: urunId || null,
    p_barkod: String(urun.barkod || '').trim() || null,
    p_urun_adi: String(urun.urunAdi || '').trim(),
    p_stok_kodu: String(urun.stokKodu || '').trim() || null,
    p_kategori: String(urun.kategori || '').trim() || 'Genel',
    p_birim: urun.birim || 'Adet',
    p_alis_fiyati: Number(urun.alisFiyati || 0),
    p_minimum_stok: Number(urun.minimumStok || 0),
  });

  hataKontrol(error, 'Depo ürünü kaydedilemedi.');
  return data;
}

export async function depoAlisiKaydet(restaurantId, form, kalemler) {
  const { data, error } = await supabase.rpc('depo_alisi_kaydet', {
    p_restaurant_id: restaurantId,
    p_tedarikci_adi: String(form.tedarikciAdi || '').trim(),
    p_fatura_no: String(form.faturaNo || '').trim() || null,
    p_fatura_tarihi: form.faturaTarihi,
    p_not_metni: String(form.notMetni || '').trim() || null,
    p_kalemler: kalemler.map(kalem => ({
      urun_id: kalem.urunId,
      miktar: Number(kalem.miktar || 0),
      birim_fiyat: Number(kalem.birimFiyat || 0),
    })),
  });

  hataKontrol(error, 'Depo alışı kaydedilemedi.');
  return data;
}

export async function depoSevkiOlustur(restaurantId, form, kalemler) {
  const { data, error } = await supabase.rpc('depo_sevki_olustur', {
    p_restaurant_id: restaurantId,
    p_hedef_restaurant_id: Number(form.hedefRestaurantId),
    p_hedef_stok_tipi: form.hedefStokTipi,
    p_not_metni: String(form.notMetni || '').trim() || null,
    p_kalemler: kalemler.map(kalem => ({
      urun_id: kalem.urunId,
      miktar: Number(kalem.miktar || 0),
    })),
  });

  hataKontrol(error, 'Sevk kaydı oluşturulamadı.');
  return data;
}

export async function depoSevkDurumunuDegistir(islem, restaurantId, sevkId) {
  const rpcAdi = {
    gonder: 'depo_sevkini_gonder',
    teslim: 'depo_sevkini_teslim_al',
    iptal: 'depo_sevkini_iptal_et',
  }[islem];

  if (!rpcAdi) throw new Error('Geçersiz sevk işlemi.');

  const { data, error } = await supabase.rpc(rpcAdi, {
    p_restaurant_id: restaurantId,
    p_sevk_id: sevkId,
  });

  hataKontrol(error, 'Sevk işlemi tamamlanamadı.');
  return data;
}

export async function depoSubesiniBagla(restaurantId, baglantiKodu) {
  const { data, error } = await supabase.rpc('depo_subesini_bagla', {
    p_restaurant_id: restaurantId,
    p_baglanti_kodu: String(baglantiKodu || '').trim().toUpperCase(),
  });

  hataKontrol(error, 'İşletme bağlantısı kurulamadı.');
  return data;
}
