import { supabase } from '../lib/supabase';

function marketHatasi(error) {
  if (!error) return null;
  const tabloEksik = error.code === '42P01' || String(error.message || '').includes('schema cache');
  return new Error(tabloEksik
    ? 'Market tabloları henüz kurulmamış. supabase/migrations/20260725_market_module.sql dosyasını uygulayın.'
    : error.message || 'Market işlemi tamamlanamadı.');
}

export async function marketVerileriniGetir(restaurantId) {
  const [urunler, faturalar, sayimlar] = await Promise.all([
    supabase.from('market_urunleri').select('*').eq('restaurant_id', restaurantId).order('urun_adi'),
    supabase.from('market_alis_faturalari').select('*, market_alis_fatura_kalemleri(*)').eq('restaurant_id', restaurantId).order('fatura_tarihi', { ascending: false }).limit(50),
    supabase.from('market_sayimlari').select('*, market_sayim_kalemleri(*)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(20),
  ]);

  const error = urunler.error || faturalar.error || sayimlar.error;
  if (error) throw marketHatasi(error);
  return { urunler: urunler.data || [], faturalar: faturalar.data || [], sayimlar: sayimlar.data || [] };
}

export async function marketUrunuKaydet(restaurantId, urun) {
  const payload = {
    restaurant_id: restaurantId,
    barkod: String(urun.barkod || '').trim(),
    urun_adi: String(urun.urunAdi || '').trim(),
    stok_kodu: String(urun.stokKodu || '').trim() || null,
    kategori: String(urun.kategori || 'Genel').trim(),
    marka: String(urun.marka || '').trim() || null,
    birim: urun.birim || 'Adet',
    kdv_orani: Number(urun.kdvOrani || 0),
    alis_fiyati: Number(urun.alisFiyati || 0),
    satis_fiyati: Number(urun.satisFiyati || 0),
    stok_miktari: Number(urun.stokMiktari || 0),
    minimum_stok: Number(urun.minimumStok || 0),
    raf_konumu: String(urun.rafKonumu || '').trim() || null,
    aktif: true,
  };
  const { data, error } = await supabase.from('market_urunleri').insert([payload]).select().single();
  if (error) throw marketHatasi(error);
  return data;
}

export async function marketAlisFaturasiKaydet(restaurantId, fatura) {
  const { data: baslik, error: baslikError } = await supabase
    .from('market_alis_faturalari')
    .insert([{
      restaurant_id: restaurantId,
      tedarikci_adi: fatura.tedarikciAdi.trim(),
      fatura_no: fatura.faturaNo.trim() || null,
      fatura_tarihi: fatura.faturaTarihi,
      ara_toplam: fatura.araToplam,
      kdv_toplam: fatura.kdvToplam,
      genel_toplam: fatura.genelToplam,
      durum: 'Kaydedildi',
    }])
    .select().single();
  if (baslikError) throw marketHatasi(baslikError);

  const kalemler = fatura.kalemler.map(kalem => ({
    restaurant_id: restaurantId,
    fatura_id: baslik.id,
    urun_id: kalem.urunId,
    barkod: kalem.barkod,
    urun_adi: kalem.urunAdi,
    miktar: Number(kalem.miktar),
    birim_alis_fiyati: Number(kalem.alisFiyati),
    kdv_orani: Number(kalem.kdvOrani),
    satir_toplami: Number(kalem.satirToplami),
  }));
  const { error: kalemError } = await supabase.from('market_alis_fatura_kalemleri').insert(kalemler);
  if (kalemError) throw marketHatasi(kalemError);

  for (const kalem of fatura.kalemler) {
    const urun = fatura.urunler.find(item => String(item.id) === String(kalem.urunId));
    const { error } = await supabase.from('market_urunleri').update({
      stok_miktari: Number(urun?.stok_miktari || 0) + Number(kalem.miktar),
      alis_fiyati: Number(kalem.alisFiyati),
    }).eq('id', kalem.urunId).eq('restaurant_id', restaurantId);
    if (error) throw marketHatasi(error);
  }
  return baslik;
}

export async function marketSayimiKaydet(restaurantId, sayim) {
  const { data: baslik, error: baslikError } = await supabase.from('market_sayimlari').insert([{
    restaurant_id: restaurantId,
    sayim_adi: sayim.sayimAdi,
    durum: 'Tamamlandı',
    toplam_kalem: sayim.kalemler.length,
    farkli_kalem: sayim.kalemler.filter(k => Number(k.fark) !== 0).length,
    tamamlanma_tarihi: new Date().toISOString(),
  }]).select().single();
  if (baslikError) throw marketHatasi(baslikError);

  const { error: kalemError } = await supabase.from('market_sayim_kalemleri').insert(sayim.kalemler.map(kalem => ({
    restaurant_id: restaurantId,
    sayim_id: baslik.id,
    urun_id: kalem.id,
    sistem_miktari: Number(kalem.stok_miktari),
    sayilan_miktar: Number(kalem.sayilanMiktar),
    fark_miktari: Number(kalem.fark),
  })));
  if (kalemError) throw marketHatasi(kalemError);

  for (const kalem of sayim.kalemler) {
    const { error } = await supabase.from('market_urunleri')
      .update({ stok_miktari: Number(kalem.sayilanMiktar) })
      .eq('id', kalem.id).eq('restaurant_id', restaurantId);
    if (error) throw marketHatasi(error);
  }
  return baslik;
}

export async function marketFiyatlariniGuncelle(restaurantId, urunler) {
  for (const urun of urunler) {
    const { error } = await supabase.from('market_urunleri')
      .update({ satis_fiyati: Number(urun.yeniFiyat) })
      .eq('id', urun.id).eq('restaurant_id', restaurantId);
    if (error) throw marketHatasi(error);
  }
}

export async function marketSatisiKaydet(restaurantId, sepet, odemeTipi) {
  const yetersiz = sepet.find(k => Number(k.adet) > Number(k.stok_miktari || 0));
  if (yetersiz) throw new Error(`${yetersiz.urun_adi} için yeterli stok yok.`);
  const toplam = sepet.reduce((t, k) => t + Number(k.adet) * Number(k.satis_fiyati), 0);
  const { data: satis, error: satisError } = await supabase.from('market_satislari').insert([{
    restaurant_id: restaurantId,
    odeme_tipi: odemeTipi,
    toplam_tutar: toplam,
  }]).select().single();
  if (satisError) throw marketHatasi(satisError);

  const { error: kalemError } = await supabase.from('market_satis_kalemleri').insert(sepet.map(k => ({
    restaurant_id: restaurantId,
    satis_id: satis.id,
    urun_id: k.id,
    barkod: k.barkod,
    urun_adi: k.urun_adi,
    adet: Number(k.adet),
    birim_fiyat: Number(k.satis_fiyati),
    toplam_tutar: Number(k.adet) * Number(k.satis_fiyati),
  })));
  if (kalemError) throw marketHatasi(kalemError);

  for (const kalem of sepet) {
    const yeniStok = Number(kalem.stok_miktari || 0) - Number(kalem.adet);
    if (yeniStok < 0) throw new Error(`${kalem.urun_adi} için yeterli stok yok.`);
    const { error } = await supabase.from('market_urunleri')
      .update({ stok_miktari: yeniStok })
      .eq('id', kalem.id).eq('restaurant_id', restaurantId);
    if (error) throw marketHatasi(error);
  }
  return satis;
}
