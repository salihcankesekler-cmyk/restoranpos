import { supabase } from '../lib/supabase';

function marketHatasi(error) {
  if (!error) return null;
  const tabloEksik = error.code === '42P01' || error.code === '42703' || String(error.message || '').includes('schema cache');
  return new Error(tabloEksik
    ? 'Market ek tabloları eksik. Supabase SQL Editor içinde en güncel market SQL dosyasını çalıştırın.'
    : error.message || 'Market işlemi tamamlanamadı.');
}

const opsiyonelTabloEksikMi = error => Boolean(error) && (
  ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code)
  || String(error.message || '').includes('schema cache')
);

const miktarYuvarla = value => Math.round((Number(value || 0) + Number.EPSILON) * 1000) / 1000;

async function stokHareketiEkle(payload) {
  const { error } = await supabase.from('market_stok_hareketleri').insert([payload]);
  if (error && !opsiyonelTabloEksikMi(error)) throw marketHatasi(error);
}

async function marketOturumunuDogrula() {
  const { data } = await supabase.auth.getSession();
  if (!data?.session?.user) {
    throw new Error('Market için güvenli Supabase oturumu bulunamadı. Hesaptan çıkış yapıp tekrar giriş yapın.');
  }
  return data.session.user;
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
  const [urunler, gruplar, faturalar, sayimlar, cariler, cariGruplari, satislar, stokHareketleri, fiyatGecmisi, vardiyalar, kasaHareketleri, iadeler, bekleyenSepetler, etiketKuyrugu] = await Promise.all([
    supabase.from('market_urunleri').select('*').eq('restaurant_id', restaurantId).order('sira').order('urun_adi'),
    supabase.from('market_gruplari').select('*').eq('restaurant_id', restaurantId).order('sira').order('grup_adi'),
    supabase.from('market_alis_faturalari').select('*, market_alis_fatura_kalemleri(*)').eq('restaurant_id', restaurantId).order('fatura_tarihi', { ascending: false }).limit(1000),
    supabase.from('market_sayimlari').select('*, market_sayim_kalemleri(*)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(20),
    supabase.from('cari_musteriler').select('id, ad, telefon, bakiye, not_metni, hareketler, cari_grup_id, cari_tipi, vergi_no, vergi_dairesi, adres').eq('restaurant_id', restaurantId).order('ad'),
    supabase.from('cari_gruplari').select('id, grup_adi, grup_turu, sira').eq('restaurant_id', restaurantId).eq('aktif', true).order('sira').order('grup_adi'),
    supabase.from('market_satislari').select('*, market_satis_kalemleri(*)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(1000),
    supabase.from('market_stok_hareketleri').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(1000),
    supabase.from('market_fiyat_gecmisi').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(500),
    supabase.from('market_kasa_vardiyalari').select('*').eq('restaurant_id', restaurantId).order('acilis_tarihi', { ascending: false }).limit(100),
    supabase.from('market_kasa_hareketleri').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(500),
    supabase.from('market_iadeleri').select('*, market_iade_kalemleri(*)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(500),
    supabase.from('market_bekleyen_sepetler').select('*').eq('restaurant_id', restaurantId).order('updated_at', { ascending: false }).limit(100),
    supabase.from('market_etiket_kuyrugu').select('*').eq('restaurant_id', restaurantId).eq('durum', 'Bekliyor').order('created_at', { ascending: false }).limit(1000),
  ]);
  const error = urunler.error || gruplar.error || faturalar.error || sayimlar.error || cariler.error || cariGruplari.error || satislar.error;
  if (error) throw marketHatasi(error);
  return {
    urunler: (urunler.data || []).filter(urun => urun.aktif !== false),
    tumUrunler: urunler.data || [],
    gruplar: gruplar.data || [],
    faturalar: faturalar.data || [],
    sayimlar: sayimlar.data || [],
    cariler: cariler.data || [],
    cariGruplari: cariGruplari.data || [],
    satislar: satislar.data || [],
    stokHareketleri: opsiyonelTabloEksikMi(stokHareketleri.error) ? [] : stokHareketleri.data || [],
    fiyatGecmisi: opsiyonelTabloEksikMi(fiyatGecmisi.error) ? [] : fiyatGecmisi.data || [],
    vardiyalar: opsiyonelTabloEksikMi(vardiyalar.error) ? [] : vardiyalar.data || [],
    kasaHareketleri: opsiyonelTabloEksikMi(kasaHareketleri.error) ? [] : kasaHareketleri.data || [],
    iadeler: opsiyonelTabloEksikMi(iadeler.error) ? [] : iadeler.data || [],
    bekleyenSepetler: opsiyonelTabloEksikMi(bekleyenSepetler.error) ? [] : bekleyenSepetler.data || [],
    etiketKuyrugu: opsiyonelTabloEksikMi(etiketKuyrugu.error) ? [] : etiketKuyrugu.data || [],
  };
}

export async function marketBekleyenSepetiKaydet(restaurantId, sepet) {
  const authKullanici = await marketOturumunuDogrula();
  const kalemler = Array.isArray(sepet.kalemler) ? sepet.kalemler : [];
  if (!kalemler.length) throw new Error('Beklemeye alınacak sepet boş.');
  const varsayilanOlusturan = authKullanici.user_metadata?.full_name
    || authKullanici.user_metadata?.name
    || String(authKullanici.email || '').split('@')[0]
    || 'Personel';
  const { data, error } = await supabase.from('market_bekleyen_sepetler').insert([{
    restaurant_id: restaurantId,
    sepet_adi: String(sepet.sepetAdi || '').trim() || `Sepet ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`,
    cari_id: sepet.cariId ? String(sepet.cariId) : null,
    cari_adi: String(sepet.cariAdi || '').trim() || null,
    kalemler,
    genel_indirim: sepet.genelIndirim || {},
    kaynak: sepet.kaynak === 'personel_siparisi' ? 'personel_siparisi' : 'kasa',
    olusturan_adi: String(sepet.olusturanAdi || varsayilanOlusturan).trim().slice(0, 150) || 'Personel',
    siparis_notu: String(sepet.notMetni || '').trim().slice(0, 1000) || null,
  }]).select().single();
  if (error) throw marketHatasi(error);
  return data;
}

export async function marketBekleyenSepetleriGetir(restaurantId) {
  await marketOturumunuDogrula();
  const { data, error } = await supabase.from('market_bekleyen_sepetler')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) throw marketHatasi(error);
  return data || [];
}

export async function marketBekleyenSepetiSil(restaurantId, sepetId) {
  await marketOturumunuDogrula();
  const { error } = await supabase.from('market_bekleyen_sepetler')
    .delete()
    .eq('restaurant_id', restaurantId)
    .eq('id', sepetId);
  if (error) throw marketHatasi(error);
}

export async function marketEtiketKuyrugunuTamamla(restaurantId, kuyrukIds) {
  await marketOturumunuDogrula();
  const ids = [...new Set((kuyrukIds || []).filter(Boolean))];
  if (!ids.length) return [];
  const { data, error } = await supabase.from('market_etiket_kuyrugu')
    .update({ durum: 'Basildi', basim_tarihi: new Date().toISOString() })
    .eq('restaurant_id', restaurantId)
    .in('id', ids)
    .select();
  if (error) throw marketHatasi(error);
  return data || [];
}

export async function marketUrunleriniTopluKaydet(restaurantId, satirlar, mevcutGruplar = []) {
  await marketOturumunuDogrula();
  if (!Array.isArray(satirlar) || !satirlar.length) throw new Error('Aktarılacak geçerli ürün bulunamadı.');
  const grupHaritasi = new Map(mevcutGruplar.map(grup => [
    String(grup.grup_adi || '').trim().toLocaleLowerCase('tr-TR'),
    grup,
  ]));
  const eksikGrupAdlari = [...new Set(satirlar
    .map(satir => String(satir.grup || '').trim())
    .filter(grupAdi => grupAdi && !grupHaritasi.has(grupAdi.toLocaleLowerCase('tr-TR'))))];

  for (const grupAdi of eksikGrupAdlari) {
    const ornek = satirlar.find(satir => String(satir.grup || '').trim() === grupAdi);
    const yeniGrup = await marketGrubuKaydet(restaurantId, {
      grupAdi,
      kdvOrani: Number(ornek?.kdv ?? 20),
      satisEkranindaGoster: true,
      sira: mevcutGruplar.length + grupHaritasi.size,
    });
    grupHaritasi.set(grupAdi.toLocaleLowerCase('tr-TR'), yeniGrup);
  }

  const payload = satirlar.map(satir => {
    const grup = grupHaritasi.get(String(satir.grup || '').trim().toLocaleLowerCase('tr-TR'));
    if (!grup) throw new Error(`${satir.urunAdi || satir.barkod}: ürün grubu bulunamadı.`);
    return {
      restaurant_id: restaurantId,
      grup_id: grup.id,
      barkod: String(satir.barkod || '').trim(),
      urun_adi: String(satir.urunAdi || '').trim(),
      stok_kodu: String(satir.stokKodu || '').trim() || null,
      kategori: grup.grup_adi,
      marka: String(satir.marka || '').trim() || null,
      birim: String(satir.birim || '').trim() || 'Adet',
      kdv_orani: Number(satir.kdv ?? grup.kdv_orani ?? 20),
      alis_fiyati: Number(satir.alisFiyati || 0),
      satis_fiyati: Number(satir.satisFiyati || 0),
      stok_miktari: Number(satir.stokMiktari || 0),
      minimum_stok: Number(satir.minimumStok || 0),
      raf_konumu: String(satir.rafKonumu || '').trim() || null,
      son_kullanma_tarihi: satir.sonKullanmaTarihi || null,
      lot_no: String(satir.lotNo || '').trim() || null,
      aktif: true,
    };
  });
  const { data, error } = await supabase.from('market_urunleri')
    .upsert(payload, { onConflict: 'restaurant_id,barkod' })
    .select();
  if (error) throw marketHatasi(error);
  return data || [];
}

export async function marketGrubuKaydet(restaurantId, grup) {
  await marketOturumunuDogrula();
  const renk = (deger, varsayilan) => /^#[0-9a-f]{6}$/i.test(String(deger || ''))
    ? String(deger).toLowerCase()
    : varsayilan;
  const payload = {
    restaurant_id: restaurantId,
    grup_adi: String(grup.grupAdi || '').trim(),
    kdv_orani: Number(grup.kdvOrani ?? 20),
    satis_ekraninda_goster: Boolean(grup.satisEkranindaGoster),
    sira: Number(grup.sira || 0),
    grup_rengi: renk(grup.grupRengi, '#c2410c'),
    urun_rengi: renk(grup.urunRengi, '#0f172a'),
  };
  if (!payload.grup_adi) throw new Error('Grup adı zorunludur.');
  const sorgu = grup.id
    ? supabase.from('market_gruplari').update(payload).eq('id', grup.id).eq('restaurant_id', restaurantId)
    : supabase.from('market_gruplari').insert([payload]);
  const { data, error } = await sorgu.select().single();
  if (error) {
    const renkKolonuEksik = ['42703', 'PGRST204'].includes(error.code)
      && /grup_rengi|urun_rengi/i.test(`${error.message || ''} ${error.details || ''}`);
    if (renkKolonuEksik) throw new Error('Grup renkleri SQL’i eksik. Supabase SQL Editor içinde 20260726_market_group_colors.sql dosyasını çalıştırın.');
    throw marketHatasi(error);
  }
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

export async function marketSatisSirasiniKaydet(restaurantId, tur, kayitIds) {
  await marketOturumunuDogrula();
  const ids = [...new Set((kayitIds || []).map(String).filter(Boolean))];
  if (!['grup', 'urun'].includes(tur)) throw new Error('Geçersiz sıralama türü.');
  if (!ids.length) throw new Error('Sıralanacak kayıt bulunamadı.');
  const { data, error } = await supabase.rpc('market_satis_sirasi_kaydet', {
    p_restaurant_id: Number(restaurantId),
    p_tur: tur,
    p_ids: ids,
  });
  if (error) {
    if (['42883', 'PGRST202'].includes(error.code)) {
      throw new Error('Satış sıralaması SQL’i eksik. En güncel Supabase migration dosyasını çalıştırın.');
    }
    throw marketHatasi(error);
  }
  return data;
}

export async function marketCariKaydet(restaurantId, cari) {
  await marketOturumunuDogrula();
  const payload = {
    restaurant_id: restaurantId,
    ad: String(cari.ad || '').trim(),
    telefon: String(cari.telefon || '').trim() || null,
    cari_grup_id: cari.grupId ? Number(cari.grupId) : null,
    cari_tipi: ['musteri', 'tedarikci', 'karma'].includes(cari.cariTipi) ? cari.cariTipi : 'musteri',
    vergi_no: String(cari.vergiNo || '').trim() || null,
    vergi_dairesi: String(cari.vergiDairesi || '').trim() || null,
    adres: String(cari.adres || '').trim() || null,
    not_metni: String(cari.notMetni || '').trim() || null,
  };
  if (!payload.ad) throw new Error('Cari adı zorunludur.');
  if (!payload.cari_grup_id) throw new Error('Cari grubu seçimi zorunludur.');
  const sorgu = cari.id
    ? supabase.from('cari_musteriler').update(payload).eq('id', cari.id).eq('restaurant_id', restaurantId)
    : supabase.from('cari_musteriler').insert([{ ...payload, bakiye: 0, hareketler: [] }]);
  const { data, error } = await sorgu.select().single();
  if (error) throw marketHatasi(error);
  return data;
}

export async function marketCariGrubuKaydet(restaurantId, grup) {
  await marketOturumunuDogrula();
  const payload = {
    restaurant_id: restaurantId,
    grup_adi: String(grup.grupAdi || '').trim(),
    grup_turu: ['musteri', 'tedarikci', 'karma'].includes(grup.grupTuru) ? grup.grupTuru : 'musteri',
    sira: Number(grup.sira || 0),
    aktif: true,
  };
  if (!payload.grup_adi) throw new Error('Cari grup adı zorunludur.');
  const { data, error } = await supabase.from('cari_gruplari').insert([payload]).select().single();
  if (error?.code === '23505') throw new Error('Bu isimde bir cari grubu zaten var.');
  if (error) throw marketHatasi(error);
  return data;
}

export async function marketCariHareketiKaydet(restaurantId, hareket, islemAnahtari = '') {
  await marketOturumunuDogrula();
  const tutar = Number(hareket.tutar || 0);
  if (!hareket.cariId) throw new Error('Cari seçimi zorunludur.');
  if (!Number.isFinite(tutar) || tutar <= 0) throw new Error('Sıfırdan büyük bir tutar girin.');
  const guvenliIslemAnahtari = islemAnahtari || globalThis.crypto?.randomUUID?.()
    || `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`;
  const { data, error } = await supabase.rpc('market_cari_hareket_kaydet_atomik', {
    p_restaurant_id: Number(restaurantId),
    p_cari_id: String(hareket.cariId),
    p_islem_tipi: hareket.islemTipi,
    p_tutar: tutar,
    p_aciklama: String(hareket.aciklama || '').trim() || null,
    p_tarih: hareket.tarih || new Date().toISOString().slice(0, 10),
    p_islem_anahtari: guvenliIslemAnahtari,
  });
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
    son_kullanma_tarihi: urun.sonKullanmaTarihi || null,
    lot_no: String(urun.lotNo || '').trim() || null,
    resim_url: String(urun.resimUrl || '').trim() || null,
    aktif: true,
  };
  let sorgu;
  if (urun.id) {
    sorgu = supabase.from('market_urunleri').update(payload).eq('id', urun.id).eq('restaurant_id', restaurantId);
  } else {
    const { data: mevcut, error: mevcutError } = await supabase
      .from('market_urunleri')
      .select('id, aktif')
      .eq('restaurant_id', restaurantId)
      .eq('barkod', payload.barkod)
      .maybeSingle();
    if (mevcutError) throw marketHatasi(mevcutError);
    if (mevcut?.aktif) throw new Error('Bu barkodla kayıtlı aktif bir ürün zaten var.');
    sorgu = mevcut?.id
      ? supabase.from('market_urunleri').update(payload).eq('id', mevcut.id).eq('restaurant_id', restaurantId)
      : supabase.from('market_urunleri').insert([payload]);
  }
  const { data, error } = await sorgu.select().single();
  if (error) {
    if (error.code === '23505' && String(error.message || '').includes('market_urunleri_terazi_kodu_unique')) {
      throw new Error('Bu 5 haneli terazi ürün kodu başka bir üründe kullanılıyor. Yeni kod atayın.');
    }
    throw marketHatasi(error);
  }
  return data;
}

export async function marketUrunuSil(restaurantId, urunId) {
  await marketOturumunuDogrula();
  const { data, error } = await supabase
    .from('market_urunleri')
    .update({ aktif: false })
    .eq('restaurant_id', restaurantId)
    .eq('id', urunId)
    .select()
    .single();
  if (error) throw marketHatasi(error);
  return data;
}

export async function marketUrunStokFiyatGuncelle(restaurantId, urunId, degerler) {
  await marketOturumunuDogrula();
  const { data, error } = await supabase.rpc('market_urun_stok_fiyat_guncelle_atomik', {
    p_restaurant_id: Number(restaurantId),
    p_urun_id: urunId,
    p_stok_miktari: Number(degerler.stokMiktari || 0),
    p_alis_fiyati: Number(degerler.alisFiyati || 0),
    p_satis_fiyati: Number(degerler.satisFiyati || 0),
    p_aciklama: String(degerler.aciklama || '').trim() || null,
  });
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
      const stokFarki = Number(miktarFarklari.get(String(urun.id)) || 0);
      const yeniStok = Number(urun.stok_miktari || 0) + stokFarki;
      const payload = { stok_miktari: yeniStok };
      if (yeniKalem) payload.alis_fiyati = Number(yeniKalem.alisFiyati || 0);
      const { error } = await supabase.from('market_urunleri').update(payload).eq('id', urun.id).eq('restaurant_id', restaurantId);
      if (error) throw marketHatasi(error);
      if (stokFarki !== 0) {
        await stokHareketiEkle({
          restaurant_id: restaurantId,
          urun_id: urun.id,
          hareket_tipi: stokFarki > 0 ? 'Alış' : 'Alış Düzeltmesi',
          miktar: stokFarki,
          onceki_stok: Number(urun.stok_miktari || 0),
          sonraki_stok: yeniStok,
          kaynak_tipi: 'market_alis_faturasi',
          kaynak_id: baslik.id,
          aciklama: `${fatura.faturaNo || 'Numarasız'} alış faturası`,
        });
      }
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

export async function marketAlisFaturasiSil(restaurantId, faturaId) {
  await marketOturumunuDogrula();
  const { data, error } = await supabase.rpc('market_alis_faturasi_sil_v2_atomik', {
    p_restaurant_id: Number(restaurantId),
    p_fatura_id: faturaId,
  });
  if (error) {
    const fonksiyonEksik = ['42883', 'PGRST202'].includes(error.code)
      || String(error.message || '').includes('market_alis_faturasi_sil_v2_atomik');
    if (fonksiyonEksik) {
      throw new Error('Alış faturası silme SQL’i eksik. Supabase SQL Editor içinde 20260726_market_invoice_delete.sql dosyasını çalıştırın.');
    }
    throw marketHatasi(error);
  }
  return data;
}

export async function marketAlisFaturasiKaydetAtomik(restaurantId, fatura, islemAnahtari = '') {
  await marketOturumunuDogrula();
  const guvenliIslemAnahtari = islemAnahtari || globalThis.crypto?.randomUUID?.()
    || `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`;
  const { data, error } = await supabase.rpc('market_alis_faturasi_kaydet_atomik', {
    p_restaurant_id: Number(restaurantId),
    p_fatura_id: fatura.id || null,
    p_cari_id: fatura.cariId ? String(fatura.cariId) : null,
    p_tedarikci_adi: String(fatura.tedarikciAdi || '').trim() || null,
    p_fatura_no: String(fatura.faturaNo || '').trim() || null,
    p_fatura_tarihi: fatura.faturaTarihi,
    p_kalemler: fatura.kalemler.map(kalem => ({
      id: kalem.urunId,
      miktar: Number(kalem.miktar || 0),
      alis_fiyati: Number(kalem.alisFiyati || 0),
      kdv_orani: Number(kalem.kdvOrani || 0),
    })),
    p_islem_anahtari: guvenliIslemAnahtari,
  });
  if (error) {
    const rpcEksik = ['42883', 'PGRST202'].includes(error.code)
      || String(error.message || '').includes('market_alis_faturasi_kaydet_atomik');
    if (rpcEksik) throw new Error('Güvenli market alış faturası SQL’i eksik. Güncel Supabase migration dosyasını çalıştırın.');
    throw marketHatasi(error);
  }
  return data;
}

export async function marketSayimiKaydet(restaurantId, sayim, islemAnahtari = '') {
  await marketOturumunuDogrula();
  const guvenliIslemAnahtari = islemAnahtari || globalThis.crypto?.randomUUID?.()
    || `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`;
  const { data, error } = await supabase.rpc('market_sayim_kaydet_atomik', {
    p_restaurant_id: Number(restaurantId),
    p_sayim_adi: String(sayim.sayimAdi || '').trim(),
    p_kalemler: sayim.kalemler.map(kalem => ({
      id: kalem.id,
      sayilan_miktar: Number(kalem.sayilanMiktar || 0),
    })),
    p_islem_anahtari: guvenliIslemAnahtari,
  });
  if (error) {
    const rpcEksik = ['42883', 'PGRST202'].includes(error.code)
      || String(error.message || '').includes('market_sayim_kaydet_atomik');
    if (rpcEksik) throw new Error('Güvenli market sayım SQL’i eksik. Güncel Supabase migration dosyasını çalıştırın.');
    throw marketHatasi(error);
  }
  return data;
}

export async function marketSatisiKaydet(restaurantId, sepet, odemeTipi, cariId = '', islemAnahtari = '', indirim = {}, odemeler = []) {
  await marketOturumunuDogrula();
  const guvenliIslemAnahtari = islemAnahtari || globalThis.crypto?.randomUUID?.()
    || `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`;
  const yuvarlanmisSepet = sepet.map(kalem => ({ ...kalem, adet: miktarYuvarla(kalem.adet) }));
  const hamAraToplam = yuvarlanmisSepet.reduce((toplam, kalem) =>
    toplam + Number(kalem.adet || 0) * Number(kalem.satis_fiyati || 0), 0);
  const fiyatArtisiMi = indirim.yon === 'arttir';
  const fiyatAyarDegeri = Math.max(Number(indirim.deger || 0), 0);
  const genelArtisTutari = fiyatArtisiMi
    ? (indirim.tur === 'tutar'
      ? fiyatAyarDegeri
      : hamAraToplam * Math.min(fiyatAyarDegeri, 100) / 100)
    : 0;
  // Mevcut atomik satış fonksiyonu indirim kabul ediyor. Toplam artışını satırlara
  // oransal dağıtarak aynı atomik stok, cari ve mükerrer işlem korumasını sürdürüyoruz.
  const islemSepeti = genelArtisTutari > 0 && hamAraToplam > 0
    ? yuvarlanmisSepet.map(kalem => {
      const adet = Math.max(Number(kalem.adet || 0), 0.001);
      const satirToplami = adet * Number(kalem.satis_fiyati || 0);
      const artisPayi = genelArtisTutari * satirToplami / hamAraToplam;
      const yeniBirimFiyat = (satirToplami + artisPayi) / adet;
      return {
        ...kalem,
        satis_fiyati: yeniBirimFiyat,
        liste_fiyati: Math.max(Number(kalem.liste_fiyati ?? kalem.satis_fiyati ?? 0), yeniBirimFiyat),
      };
    })
    : yuvarlanmisSepet;
  const uygulanacakIndirim = fiyatArtisiMi ? { yon: 'azalt', tur: 'tutar', deger: 0 } : indirim;
  const { data, error } = await supabase.rpc('market_satis_kaydet_v2_atomik', {
    p_restaurant_id: Number(restaurantId),
    p_kalemler: islemSepeti.map(kalem => ({
      id: kalem.id,
      adet: Number(kalem.adet),
      liste_fiyati: Number(kalem.liste_fiyati ?? kalem.satis_fiyati),
      satis_fiyati: Number(kalem.satis_fiyati),
    })),
    p_cari_id: cariId ? String(cariId) : null,
    p_islem_anahtari: guvenliIslemAnahtari,
    p_indirim_turu: uygulanacakIndirim.tur || 'yuzde',
    p_indirim_degeri: Number(uygulanacakIndirim.deger || 0),
    p_odemeler: (odemeler || []).map(odeme => ({
      tip: odeme.tip,
      tutar: Number(odeme.tutar || 0),
    })),
  });
  if (error) {
    const rpcEksik = ['42883', 'PGRST202'].includes(error.code)
      || String(error.message || '').includes('market_satis_kaydet_v2_atomik');
    if (rpcEksik) {
      throw new Error('Güvenli market satış SQL’i eksik. Güncel Supabase migration dosyasını çalıştırın.');
    }
    throw marketHatasi(error);
  }
  return data;
}

export async function marketSatisFisiniKuyrugaEkle(restaurantId, satis, icerikText) {
  await marketOturumunuDogrula();
  const temizIcerik = String(icerikText || '').trim();
  if (!temizIcerik) throw new Error('Yazdırılacak satış fişi içeriği oluşturulamadı.');

  const { data, error } = await supabase.from('yazdirma_kuyrugu').insert([{
    restaurant_id: restaurantId,
    yazici_tipi: 'adisyon',
    fis_tipi: satis?.on_fis ? 'adisyon' : 'hesap',
    baslik: satis?.on_fis ? 'Market Ön Fiş' : 'Market Satış Fişi',
    icerik_text: temizIcerik,
    payload_json: {
      modul: 'market',
      on_fis: Boolean(satis?.on_fis),
      satis_id: satis?.id || null,
      odeme_tipi: satis?.odeme_tipi || null,
      toplam_tutar: Number(satis?.toplam_tutar || 0),
    },
    kaynak_tablo: 'market_satislari',
    kaynak_id: satis?.id ? String(satis.id) : null,
    durum: 'Bekliyor',
    yazdirildi: false,
  }]).select().single();

  if (error) {
    if (['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code)) {
      throw new Error('Doğrudan yazdırma kuyruğu hazır değil. Yazıcı ayarlarından Printer Agent kurulumunu tamamlayın.');
    }
    if (error.code === '42501') {
      throw new Error('Satış fişi yazdırma kuyruğuna erişim yetkisi bulunamadı.');
    }
    throw marketHatasi(error);
  }
  return data;
}

export async function marketEtiketleriniKuyrugaEkle(restaurantId, etiketler = []) {
  await marketOturumunuDogrula();
  const yazdirilacakEtiketler = (Array.isArray(etiketler) ? etiketler : []).filter(etiket => etiket?.urunId);
  if (!yazdirilacakEtiketler.length) throw new Error('Yazdırılacak etiket oluşturulamadı.');

  // Her fiziksel etiket ayrı bir kuyruk satırıdır. Printer Agent her satırı
  // Windows'a bağımsız bir yazdırma işi olarak gönderir; adet tek işte birleştirilmez.
  const kuyrukSatirlari = yazdirilacakEtiketler.map((etiket, index) => {
    const urunAdi = String(etiket.urunAdi || 'Ürün').replace(/\s+/g, ' ').trim();
    const isletmeAdi = String(etiket.isletmeAdi || 'Integra Market').replace(/\s+/g, ' ').trim();
    const barkod = String(etiket.barkod || '').trim();
    const fiyat = Number(etiket.satisFiyati || 0);
    const genislikMm = Number(etiket.genislikMm || 58);
    const yukseklikMm = Number(etiket.yukseklikMm || 40);
    const etiketPng = String(etiket.etiketPng || '').replace(/^data:image\/png;base64,/, '');
    const etiketIcerigi = etiketPng
      ? `INTEGRA_ETIKET_V1\n${genislikMm}\n${yukseklikMm}\n${etiketPng}`
      : [
        isletmeAdi,
        urunAdi,
        `${fiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`,
        barkod,
      ].filter(Boolean).join('\r\n');
    return {
      restaurant_id: restaurantId,
      yazici_tipi: 'etiket',
      fis_tipi: 'etiket',
      baslik: `${urunAdi} Etiketi`,
      icerik_text: etiketIcerigi,
      payload_json: {
        modul: 'market',
        belge_turu: 'raf_etiketi',
        tek_etiket: true,
        etiket_sira: index + 1,
        urun_id: String(etiket.urunId),
        urun_adi: urunAdi,
        barkod,
        satis_fiyati: fiyat,
        isletme_adi: isletmeAdi,
        genislik_mm: genislikMm,
        yukseklik_mm: yukseklikMm,
      },
      kaynak_tablo: 'market_urunleri',
      kaynak_id: String(etiket.urunId),
      durum: 'Bekliyor',
      yazdirildi: false,
    };
  });

  const { data, error } = await supabase
    .from('yazdirma_kuyrugu')
    .insert(kuyrukSatirlari)
    .select();

  if (error) {
    if (['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code)) {
      throw new Error('Etiket yazdırma kuyruğu hazır değil. Yazıcı ayarlarından Printer Agent kurulumunu tamamlayın.');
    }
    if (error.code === '42501') {
      throw new Error('Etiket yazdırma kuyruğuna erişim yetkisi bulunamadı.');
    }
    throw marketHatasi(error);
  }
  return data || [];
}

export async function marketSatisIadeEt(restaurantId, satisId, kalemler, aciklama = '', tamIptal = false, islemAnahtari = '') {
  await marketOturumunuDogrula();
  const guvenliIslemAnahtari = islemAnahtari || globalThis.crypto?.randomUUID?.()
    || `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`;
  const { data, error } = await supabase.rpc('market_satis_iade_v2_atomik', {
    p_restaurant_id: Number(restaurantId),
    p_satis_id: satisId,
    p_kalemler: kalemler.map(kalem => ({
      satis_kalem_id: kalem.satisKalemId,
      adet: Number(kalem.adet),
    })),
    p_aciklama: String(aciklama || '').trim() || null,
    p_tam_iptal: Boolean(tamIptal),
    p_islem_anahtari: guvenliIslemAnahtari,
  });
  if (error) {
    const rpcEksik = ['42883', 'PGRST202'].includes(error.code)
      || String(error.message || '').includes('market_satis_iade_v2_atomik');
    if (rpcEksik) throw new Error('Güvenli market iade SQL’i eksik. Güncel Supabase migration dosyasını çalıştırın.');
    throw marketHatasi(error);
  }
  return data;
}

export async function marketKasaVardiyasiAc(restaurantId, acilisTutari, notMetni = '') {
  await marketOturumunuDogrula();
  const { data, error } = await supabase.from('market_kasa_vardiyalari').insert([{
    restaurant_id: restaurantId,
    acilis_tutari: Number(acilisTutari || 0),
    not_metni: String(notMetni || '').trim() || null,
    durum: 'Açık',
  }]).select().single();
  if (error) throw marketHatasi(error);
  return data;
}

export async function marketKasaHareketiKaydet(restaurantId, vardiyaId, hareket) {
  await marketOturumunuDogrula();
  const tutar = Number(hareket.tutar || 0);
  if (!vardiyaId) throw new Error('Önce kasa vardiyası açın.');
  if (!Number.isFinite(tutar) || tutar <= 0) throw new Error('Sıfırdan büyük bir tutar girin.');
  const { data, error } = await supabase.from('market_kasa_hareketleri').insert([{
    restaurant_id: restaurantId,
    vardiya_id: vardiyaId,
    hareket_tipi: hareket.hareketTipi,
    tutar,
    aciklama: String(hareket.aciklama || '').trim() || null,
  }]).select().single();
  if (error) throw marketHatasi(error);
  return data;
}

export async function marketKasaVardiyasiKapat(restaurantId, vardiyaId, beklenenTutar, sayilanTutar, notMetni = '') {
  await marketOturumunuDogrula();
  const beklenen = Number(beklenenTutar || 0);
  const sayilan = Number(sayilanTutar || 0);
  const { data, error } = await supabase.from('market_kasa_vardiyalari')
    .update({
      beklenen_kapanis: beklenen,
      sayilan_kapanis: sayilan,
      fark_tutari: sayilan - beklenen,
      durum: 'Kapalı',
      not_metni: String(notMetni || '').trim() || null,
      kapatan_kullanici: (await supabase.auth.getUser()).data.user?.id || null,
      kapanis_tarihi: new Date().toISOString(),
    })
    .eq('id', vardiyaId)
    .eq('restaurant_id', restaurantId)
    .eq('durum', 'Açık')
    .select()
    .single();
  if (error) throw marketHatasi(error);
  return data;
}
