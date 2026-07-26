import { supabase } from '../lib/supabase';

function marketHatasi(error) {
  if (!error) return null;
  const tabloEksik = error.code === '42P01' || error.code === '42703' || String(error.message || '').includes('schema cache');
  return new Error(tabloEksik
    ? 'Market geliştirme tabloları eksik. Supabase SQL Editor içinde 20260726_market_groups_cari_invoices.sql dosyasını çalıştırın.'
    : error.message || 'Market işlemi tamamlanamadı.');
}

async function marketOturumunuDogrula() {
  const { data } = await supabase.auth.getSession();
  if (!data?.session?.user) {
    throw new Error('Market için güvenli Supabase oturumu bulunamadı. Hesaptan çıkış yapıp tekrar giriş yapın.');
  }
}

async function cariHareketiniEsitle(restaurantId, cariId, hareket) {
  if (!cariId) return;
  const { data: cari, error } = await supabase
    .from('cari_musteriler')
    .select('id, bakiye, hareketler')
    .eq('restaurant_id', restaurantId)
    .eq('id', cariId)
    .single();
  if (error) throw marketHatasi(error);

  const hareketler = Array.isArray(cari.hareketler) ? cari.hareketler : [];
  const onceki = hareketler.find(item => item.kaynak === hareket.kaynak && String(item.kaynak_id) === String(hareket.kaynakId));
  const oncekiEtki = Number(onceki?.bakiye_etkisi || 0);
  const yeniEtki = Number(hareket.bakiyeEtkisi || 0);
  const yeniHareket = {
    id: onceki?.id || Date.now(),
    tip: hareket.tip,
    tutar: Number(hareket.tutar || 0),
    aciklama: hareket.aciklama,
    tarih: hareket.tarih || new Date().toISOString(),
    kaynak: hareket.kaynak,
    kaynak_id: hareket.kaynakId,
    bakiye_etkisi: yeniEtki,
  };
  const yeniHareketler = [yeniHareket, ...hareketler.filter(item => !(item.kaynak === hareket.kaynak && String(item.kaynak_id) === String(hareket.kaynakId)))];
  const { error: guncellemeError } = await supabase
    .from('cari_musteriler')
    .update({
      bakiye: Number(cari.bakiye || 0) - oncekiEtki + yeniEtki,
      hareketler: yeniHareketler,
    })
    .eq('restaurant_id', restaurantId)
    .eq('id', cariId);
  if (guncellemeError) throw marketHatasi(guncellemeError);
}

async function cariHareketiniKaldir(restaurantId, cariId, kaynak, kaynakId) {
  if (!cariId) return;
  const { data: cari, error } = await supabase
    .from('cari_musteriler')
    .select('id, bakiye, hareketler')
    .eq('restaurant_id', restaurantId)
    .eq('id', cariId)
    .single();
  if (error) throw marketHatasi(error);
  const hareketler = Array.isArray(cari.hareketler) ? cari.hareketler : [];
  const onceki = hareketler.find(item => item.kaynak === kaynak && String(item.kaynak_id) === String(kaynakId));
  if (!onceki) return;
  const { error: guncellemeError } = await supabase
    .from('cari_musteriler')
    .update({
      bakiye: Number(cari.bakiye || 0) - Number(onceki.bakiye_etkisi || 0),
      hareketler: hareketler.filter(item => !(item.kaynak === kaynak && String(item.kaynak_id) === String(kaynakId))),
    })
    .eq('restaurant_id', restaurantId)
    .eq('id', cariId);
  if (guncellemeError) throw marketHatasi(guncellemeError);
}

export async function marketVerileriniGetir(restaurantId) {
  const [urunler, gruplar, faturalar, sayimlar, cariler, satislar] = await Promise.all([
    supabase.from('market_urunleri').select('*').eq('restaurant_id', restaurantId).order('urun_adi'),
    supabase.from('market_gruplari').select('*').eq('restaurant_id', restaurantId).order('sira').order('grup_adi'),
    supabase.from('market_alis_faturalari').select('*, market_alis_fatura_kalemleri(*)').eq('restaurant_id', restaurantId).order('fatura_tarihi', { ascending: false }).limit(50),
    supabase.from('market_sayimlari').select('*, market_sayim_kalemleri(*)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(20),
    supabase.from('cari_musteriler').select('id, ad, telefon, bakiye, not_metni, hareketler').eq('restaurant_id', restaurantId).order('ad'),
    supabase.from('market_satislari').select('*, market_satis_kalemleri(*)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(1000),
  ]);
  const error = urunler.error || gruplar.error || faturalar.error || sayimlar.error || satislar.error;
  if (error) throw marketHatasi(error);
  return {
    urunler: urunler.data || [],
    gruplar: gruplar.data || [],
    faturalar: faturalar.data || [],
    sayimlar: sayimlar.data || [],
    cariler: cariler.data || [],
    satislar: satislar.data || [],
  };
}

export async function marketGrubuKaydet(restaurantId, grup) {
  await marketOturumunuDogrula();
  const payload = {
    restaurant_id: restaurantId,
    grup_adi: String(grup.grupAdi || '').trim(),
    satis_ekraninda_goster: Boolean(grup.satisEkranindaGoster),
    sira: Number(grup.sira || 0),
  };
  if (!payload.grup_adi) throw new Error('Grup adı zorunludur.');
  const sorgu = grup.id
    ? supabase.from('market_gruplari').update(payload).eq('id', grup.id).eq('restaurant_id', restaurantId)
    : supabase.from('market_gruplari').insert([payload]);
  const { data, error } = await sorgu.select().single();
  if (error) throw marketHatasi(error);
  if (grup.id) {
    const { error: urunError } = await supabase
      .from('market_urunleri')
      .update({ kategori: payload.grup_adi })
      .eq('restaurant_id', restaurantId)
      .eq('grup_id', grup.id);
    if (urunError) throw marketHatasi(urunError);
  }
  return data;
}

export async function marketCariKaydet(restaurantId, cari) {
  await marketOturumunuDogrula();
  const payload = {
    restaurant_id: restaurantId,
    ad: String(cari.ad || '').trim(),
    telefon: String(cari.telefon || '').trim() || null,
    not_metni: String(cari.notMetni || '').trim() || null,
    bakiye: 0,
    hareketler: [],
  };
  if (!payload.ad) throw new Error('Cari adı zorunludur.');
  const { data, error } = await supabase.from('cari_musteriler').insert([payload]).select().single();
  if (error) throw marketHatasi(error);
  return data;
}

export async function marketUrunuKaydet(restaurantId, urun) {
  await marketOturumunuDogrula();
  if (!urun.grupId) throw new Error('Ürün grubu seçimi zorunludur.');
  const payload = {
    restaurant_id: restaurantId,
    grup_id: urun.grupId,
    barkod: String(urun.barkod || '').trim(),
    urun_adi: String(urun.urunAdi || '').trim(),
    stok_kodu: String(urun.stokKodu || '').trim() || null,
    kategori: String(urun.kategori || '').trim(),
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
  const sorgu = urun.id
    ? supabase.from('market_urunleri').update(payload).eq('id', urun.id).eq('restaurant_id', restaurantId)
    : supabase.from('market_urunleri').insert([payload]);
  const { data, error } = await sorgu.select().single();
  if (error) throw marketHatasi(error);
  return data;
}

export async function marketUrunStokFiyatGuncelle(restaurantId, urunId, degerler) {
  await marketOturumunuDogrula();
  const { data, error } = await supabase
    .from('market_urunleri')
    .update({
      stok_miktari: Number(degerler.stokMiktari || 0),
      alis_fiyati: Number(degerler.alisFiyati || 0),
      satis_fiyati: Number(degerler.satisFiyati || 0),
    })
    .eq('id', urunId)
    .eq('restaurant_id', restaurantId)
    .select()
    .single();
  if (error) throw marketHatasi(error);
  return data;
}

export async function marketAlisFaturasiKaydet(restaurantId, fatura) {
  await marketOturumunuDogrula();
  const baslikPayload = {
    restaurant_id: restaurantId,
    cari_id: fatura.cariId ? String(fatura.cariId) : null,
    tedarikci_adi: String(fatura.tedarikciAdi || '').trim(),
    fatura_no: String(fatura.faturaNo || '').trim() || null,
    fatura_tarihi: fatura.faturaTarihi,
    ara_toplam: Number(fatura.araToplam || 0),
    kdv_toplam: Number(fatura.kdvToplam || 0),
    genel_toplam: Number(fatura.genelToplam || 0),
    durum: 'Kaydedildi',
  };

  let oncekiBaslik = null;
  let oncekiKalemler = [];
  let baslik;
  if (fatura.id) {
    const { data, error } = await supabase
      .from('market_alis_faturalari')
      .select('*, market_alis_fatura_kalemleri(*)')
      .eq('id', fatura.id)
      .eq('restaurant_id', restaurantId)
      .single();
    if (error) throw marketHatasi(error);
    oncekiBaslik = data;
    oncekiKalemler = data.market_alis_fatura_kalemleri || [];
    const { data: guncellenen, error: guncellemeError } = await supabase
      .from('market_alis_faturalari')
      .update(baslikPayload)
      .eq('id', fatura.id)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();
    if (guncellemeError) throw marketHatasi(guncellemeError);
    baslik = guncellenen;
    const { error: silmeError } = await supabase
      .from('market_alis_fatura_kalemleri')
      .delete()
      .eq('fatura_id', fatura.id)
      .eq('restaurant_id', restaurantId);
    if (silmeError) throw marketHatasi(silmeError);
  } else {
    const { data, error } = await supabase.from('market_alis_faturalari').insert([baslikPayload]).select().single();
    if (error) throw marketHatasi(error);
    baslik = data;
  }

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

  const miktarFarklari = new Map();
  oncekiKalemler.forEach(kalem => miktarFarklari.set(String(kalem.urun_id), (miktarFarklari.get(String(kalem.urun_id)) || 0) - Number(kalem.miktar || 0)));
  fatura.kalemler.forEach(kalem => miktarFarklari.set(String(kalem.urunId), (miktarFarklari.get(String(kalem.urunId)) || 0) + Number(kalem.miktar || 0)));
  const urunIdleri = Array.from(miktarFarklari.keys());
  if (urunIdleri.length) {
    const { data: guncelUrunler, error: urunGetirError } = await supabase
      .from('market_urunleri')
      .select('id, stok_miktari')
      .eq('restaurant_id', restaurantId)
      .in('id', urunIdleri);
    if (urunGetirError) throw marketHatasi(urunGetirError);
    for (const urun of guncelUrunler || []) {
      const yeniKalem = fatura.kalemler.find(kalem => String(kalem.urunId) === String(urun.id));
      const payload = { stok_miktari: Number(urun.stok_miktari || 0) + Number(miktarFarklari.get(String(urun.id)) || 0) };
      if (yeniKalem) payload.alis_fiyati = Number(yeniKalem.alisFiyati || 0);
      const { error } = await supabase.from('market_urunleri').update(payload).eq('id', urun.id).eq('restaurant_id', restaurantId);
      if (error) throw marketHatasi(error);
    }
  }

  const oncekiCariId = oncekiBaslik?.cari_id ? String(oncekiBaslik.cari_id) : '';
  const yeniCariId = fatura.cariId ? String(fatura.cariId) : '';
  if (oncekiCariId && oncekiCariId !== yeniCariId) {
    await cariHareketiniKaldir(restaurantId, oncekiCariId, 'market_alis_faturasi', baslik.id);
  }
  if (yeniCariId) {
    await cariHareketiniEsitle(restaurantId, yeniCariId, {
      kaynak: 'market_alis_faturasi',
      kaynakId: baslik.id,
      tip: 'Alış Faturası',
      tutar: Number(fatura.genelToplam || 0),
      bakiyeEtkisi: -Number(fatura.genelToplam || 0),
      aciklama: `${fatura.faturaNo || 'Numarasız'} alış faturası`,
      tarih: new Date(`${fatura.faturaTarihi}T12:00:00`).toISOString(),
    });
  }
  return baslik;
}

export async function marketSayimiKaydet(restaurantId, sayim) {
  await marketOturumunuDogrula();
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

export async function marketSatisiKaydet(restaurantId, sepet, odemeTipi, cariId = '') {
  await marketOturumunuDogrula();
  const toplam = sepet.reduce((t, k) => t + Number(k.adet) * Number(k.satis_fiyati), 0);
  const secilenCariId = cariId ? String(cariId) : null;
  const { data: secilenCari } = secilenCariId
    ? await supabase.from('cari_musteriler').select('id, ad').eq('restaurant_id', restaurantId).eq('id', secilenCariId).maybeSingle()
    : { data: null };
  const { data: satis, error: satisError } = await supabase.from('market_satislari').insert([{
    restaurant_id: restaurantId,
    cari_id: secilenCariId,
    cari_adi: secilenCari?.ad || null,
    odeme_tipi: odemeTipi,
    toplam_tutar: toplam,
  }]).select().single();
  if (satisError) throw marketHatasi(satisError);

  const { data: satisKalemleri, error: kalemError } = await supabase.from('market_satis_kalemleri').insert(sepet.map(k => ({
    restaurant_id: restaurantId,
    satis_id: satis.id,
    urun_id: k.id,
    barkod: k.barkod,
    urun_adi: k.urun_adi,
    adet: Number(k.adet),
    birim_fiyat: Number(k.satis_fiyati),
    toplam_tutar: Number(k.adet) * Number(k.satis_fiyati),
  }))).select();
  if (kalemError) throw marketHatasi(kalemError);
  await Promise.all(sepet.map(async kalem => {
    const yeniStok = Number(kalem.stok_miktari || 0) - Number(kalem.adet);
    const { error } = await supabase.from('market_urunleri')
      .update({ stok_miktari: yeniStok })
      .eq('id', kalem.id).eq('restaurant_id', restaurantId);
    if (error) throw marketHatasi(error);
  }));
  if (secilenCariId) {
    await cariHareketiniEsitle(restaurantId, secilenCariId, {
      kaynak: 'market_satisi',
      kaynakId: satis.id,
      tip: odemeTipi === 'Cari / Veresiye' ? 'Borç' : `Satış - ${odemeTipi}`,
      tutar: toplam,
      bakiyeEtkisi: odemeTipi === 'Cari / Veresiye' ? toplam : 0,
      aciklama: `Market satışı · ${odemeTipi}`,
    });
  }
  return { ...satis, market_satis_kalemleri: satisKalemleri || [] };
}
