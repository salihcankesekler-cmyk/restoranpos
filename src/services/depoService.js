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
    menuUrunSonucu,
    stokMalzemeSonucu,
    marketUrunSonucu,
    talepSonucu,
    talepKalemSonucu,
    talepUrunSonucu,
    lotSonucu,
    farkSonucu,
    eslesmeSonucu,
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
    supabase
      .from('menu_urunleri')
      .select('id, ad, kategori, maliyet, stok_adedi, kritik_stok, aktif')
      .eq('restaurant_id', restaurantId)
      .order('ad'),
    supabase
      .from('stok_malzemeleri')
      .select('id, ad, birim, stok_miktari, kritik_miktar, birim_maliyet')
      .eq('restaurant_id', restaurantId)
      .order('ad'),
    supabase
      .from('market_urunleri')
      .select('id, barkod, urun_adi, stok_kodu, kategori, birim, alis_fiyati, stok_miktari, minimum_stok, aktif')
      .eq('restaurant_id', restaurantId)
      .eq('aktif', true)
      .order('urun_adi'),
    supabase
      .from('depo_sevk_talepleri')
      .select('*')
      .or(`depo_restaurant_id.eq.${restaurantId},talep_eden_restaurant_id.eq.${restaurantId}`)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('depo_sevk_talep_kalemleri')
      .select('*')
      .order('created_at', { ascending: true }),
    supabase
      .from('depo_urunleri')
      .select('*')
      .neq('restaurant_id', restaurantId)
      .eq('aktif', true)
      .order('urun_adi'),
    supabase
      .from('depo_lotlari')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gt('kalan_miktar', 0)
      .order('son_kullanma_tarihi', { ascending: true, nullsFirst: false })
      .limit(500),
    supabase
      .from('depo_teslimat_farklari')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(300),
    supabase
      .from('depo_urun_eslesmeleri')
      .select('*')
      .eq('hedef_restaurant_id', restaurantId),
  ]);

  hataKontrol(urunSonucu.error, 'Depo ürünleri alınamadı.');
  hataKontrol(alisSonucu.error, 'Depo alışları alınamadı.');
  hataKontrol(sevkSonucu.error, 'Sevkiyatlar alınamadı.');
  hataKontrol(sevkKalemSonucu.error, 'Sevkiyat kalemleri alınamadı.');
  hataKontrol(baglantiSonucu.error, 'Bağlı işletmeler alınamadı.');
  hataKontrol(kodSonucu.error, 'Depo bağlantı kodu alınamadı.');
  hataKontrol(talepSonucu.error, 'Depo talepleri alınamadı.');
  hataKontrol(talepKalemSonucu.error, 'Depo talep kalemleri alınamadı.');
  hataKontrol(talepUrunSonucu.error, 'Bağlı depo ürünleri alınamadı.');
  hataKontrol(lotSonucu.error, 'Depo lotları alınamadı.');
  hataKontrol(farkSonucu.error, 'Teslimat farkları alınamadı.');
  hataKontrol(eslesmeSonucu.error, 'Depo ürün eşleşmeleri alınamadı.');

  const kaynakUrunHatalari = [
    ['Restoran ürünleri', menuUrunSonucu.error],
    ['Stok malzemeleri', stokMalzemeSonucu.error],
    ['Market ürünleri', marketUrunSonucu.error],
  ]
    .filter(([, error]) => Boolean(error))
    .map(([baslik, error]) => `${baslik}: ${error.message}`);

  kaynakUrunHatalari.forEach(mesaj => console.warn(`Depo kaynak kartı yüklenemedi: ${mesaj}`));

  const kaynakUrunler = [
    ...(menuUrunSonucu.data || [])
      .filter(urun => urun.aktif !== false)
      .map(urun => ({
        secimId: `menu:${urun.id}`,
        kaynakTipi: 'menu',
        kaynakBasligi: 'Restoran ürünü',
        kaynakId: String(urun.id),
        urunAdi: urun.ad || 'İsimsiz ürün',
        barkod: '',
        stokKodu: '',
        kategori: urun.kategori || 'Menü',
        birim: 'Adet',
        alisFiyati: Number(urun.maliyet || 0),
        mevcutStok: Number(urun.stok_adedi || 0),
        minimumStok: Number(urun.kritik_stok || 0),
      })),
    ...(stokMalzemeSonucu.data || []).map(malzeme => ({
      secimId: `stok:${malzeme.id}`,
      kaynakTipi: 'stok',
      kaynakBasligi: 'Hammadde / stok',
      kaynakId: String(malzeme.id),
      urunAdi: malzeme.ad || 'İsimsiz malzeme',
      barkod: '',
      stokKodu: '',
      kategori: 'Hammadde',
      birim: malzeme.birim || 'Adet',
      alisFiyati: Number(malzeme.birim_maliyet || 0),
      mevcutStok: Number(malzeme.stok_miktari || 0),
      minimumStok: Number(malzeme.kritik_miktar || 0),
    })),
    ...(marketUrunSonucu.data || []).map(urun => ({
      secimId: `market:${urun.id}`,
      kaynakTipi: 'market',
      kaynakBasligi: 'Market ürünü',
      kaynakId: String(urun.id),
      urunAdi: urun.urun_adi || 'İsimsiz ürün',
      barkod: urun.barkod || '',
      stokKodu: urun.stok_kodu || '',
      kategori: urun.kategori || 'Market',
      birim: urun.birim || 'Adet',
      alisFiyati: Number(urun.alis_fiyati || 0),
      mevcutStok: Number(urun.stok_miktari || 0),
      minimumStok: Number(urun.minimum_stok || 0),
    })),
  ].sort((a, b) => a.urunAdi.localeCompare(b.urunAdi, 'tr'));

  return {
    urunler: urunSonucu.data || [],
    alislar: alisSonucu.data || [],
    sevkler: sevkSonucu.data || [],
    sevkKalemleri: sevkKalemSonucu.data || [],
    baglantilar: baglantiSonucu.data || [],
    talepler: talepSonucu.data || [],
    talepKalemleri: talepKalemSonucu.data || [],
    talepUrunleri: talepUrunSonucu.data || [],
    lotlar: lotSonucu.data || [],
    teslimatFarklari: farkSonucu.data || [],
    eslesmeler: eslesmeSonucu.data || [],
    kaynakUrunler,
    kaynakUrunHatalari,
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
      lot_no: String(kalem.lotNo || '').trim() || null,
      son_kullanma_tarihi: kalem.sonKullanmaTarihi || null,
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

export async function depoSevkTalebiOlustur(restaurantId, form, kalemler) {
  const { data, error } = await supabase.rpc('depo_sevk_talebi_olustur', {
    p_restaurant_id: restaurantId,
    p_depo_restaurant_id: Number(form.depoRestaurantId),
    p_hedef_stok_tipi: form.hedefStokTipi,
    p_not_metni: String(form.notMetni || '').trim() || null,
    p_kalemler: kalemler.map(kalem => ({
      urun_id: kalem.urunId,
      miktar: Number(kalem.miktar || 0),
    })),
  });
  hataKontrol(error, 'Depo sevk talebi oluşturulamadı.');
  return data;
}

export async function depoTalebiniSevkeDonustur(restaurantId, talepId) {
  const { data, error } = await supabase.rpc('depo_talebini_sevke_donustur', {
    p_restaurant_id: restaurantId,
    p_talep_id: talepId,
  });
  hataKontrol(error, 'Depo talebi sevke dönüştürülemedi.');
  return data;
}

export async function depoSevkTalebiniKapat(restaurantId, talepId, durum, cevapNotu = '') {
  const { data, error } = await supabase.rpc('depo_sevk_talebi_kapat', {
    p_restaurant_id: restaurantId,
    p_talep_id: talepId,
    p_durum: durum,
    p_cevap_notu: String(cevapNotu || '').trim() || null,
  });
  hataKontrol(error, 'Depo talebi kapatılamadı.');
  return data;
}

export async function depoSevkiniKismiTeslimAl(restaurantId, sevkId, kalemler) {
  const { data, error } = await supabase.rpc('depo_sevkini_kismi_teslim_al', {
    p_restaurant_id: restaurantId,
    p_sevk_id: sevkId,
    p_kalemler: kalemler.map(kalem => ({
      kalem_id: kalem.kalemId,
      teslim_alinan_miktar: Number(kalem.teslimAlinanMiktar || 0),
      hasarli_miktar: Number(kalem.hasarliMiktar || 0),
      hedef_urun_id: kalem.hedefUrunId || null,
      teslim_notu: String(kalem.teslimNotu || '').trim() || null,
    })),
  });
  hataKontrol(error, 'Sevk teslimi tamamlanamadı.');
  return data;
}
