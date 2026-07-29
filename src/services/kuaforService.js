import { supabase } from '../lib/supabase';

const hataKontrol = (error, varsayilanMesaj) => {
  if (!error) return;
  const mesaj = String(error.message || varsayilanMesaj || 'Kuaför işlemi tamamlanamadı.');

  if (mesaj.includes('Could not find the table') || mesaj.includes('schema cache')) {
    throw new Error('Kuaför tabloları henüz Supabase üzerinde kurulmamış. Kuaför SQL dosyasını SQL Editor içinde çalıştırın.');
  }

  throw new Error(mesaj);
};

export async function kuaforVerileriniGetir(restaurantId) {
  if (!restaurantId) throw new Error('Aktif işletme bulunamadı.');

  const baslangic = new Date();
  baslangic.setDate(baslangic.getDate() - 120);
  const bitis = new Date();
  bitis.setDate(bitis.getDate() + 240);

  const [personelSonucu, hizmetSonucu, musteriSonucu, randevuSonucu, cariSonucu] = await Promise.all([
    supabase
      .from('kuafor_personelleri')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('aktif', true)
      .order('sira')
      .order('ad'),
    supabase
      .from('kuafor_hizmetleri')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('aktif', true)
      .order('kategori')
      .order('hizmet_adi'),
    supabase
      .from('kuafor_musterileri')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('ad')
      .limit(1000),
    supabase
      .from('kuafor_randevulari')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('baslangic_zamani', baslangic.toISOString())
      .lte('baslangic_zamani', bitis.toISOString())
      .order('baslangic_zamani'),
    supabase
      .from('cari_musteriler')
      .select('id, ad, telefon, bakiye, not_metni, hareketler')
      .eq('restaurant_id', restaurantId)
      .order('ad'),
  ]);

  hataKontrol(personelSonucu.error, 'Kuaför personelleri alınamadı.');
  hataKontrol(hizmetSonucu.error, 'Kuaför işlemleri alınamadı.');
  hataKontrol(musteriSonucu.error, 'Müşteri kayıtları alınamadı.');
  hataKontrol(randevuSonucu.error, 'Randevular alınamadı.');
  hataKontrol(cariSonucu.error, 'Cari hesaplar alınamadı.');

  return {
    personeller: personelSonucu.data || [],
    hizmetler: hizmetSonucu.data || [],
    musteriler: musteriSonucu.data || [],
    randevular: randevuSonucu.data || [],
    cariler: cariSonucu.data || [],
  };
}

export async function kuaforPersoneliKaydet(restaurantId, form, personelId = null) {
  const payload = {
    restaurant_id: restaurantId,
    ad: String(form.ad || '').trim(),
    telefon: String(form.telefon || '').trim() || null,
    uzmanlik: String(form.uzmanlik || '').trim() || null,
    renk: form.renk || '#7c3aed',
    sira: Number(form.sira || 0),
    aktif: true,
  };

  const sorgu = personelId
    ? supabase.from('kuafor_personelleri').update(payload).eq('id', personelId).eq('restaurant_id', restaurantId)
    : supabase.from('kuafor_personelleri').insert([payload]);

  const { data, error } = await sorgu.select().single();
  hataKontrol(error, 'Personel kaydedilemedi.');
  return data;
}

export async function kuaforHizmetiKaydet(restaurantId, form, hizmetId = null) {
  const payload = {
    restaurant_id: restaurantId,
    hizmet_adi: String(form.hizmetAdi || '').trim(),
    kategori: String(form.kategori || '').trim() || 'Genel',
    sure_dakika: Number(form.sureDakika || 30),
    fiyat: Number(form.fiyat || 0),
    renk: form.renk || '#f97316',
    aktif: true,
  };

  const sorgu = hizmetId
    ? supabase.from('kuafor_hizmetleri').update(payload).eq('id', hizmetId).eq('restaurant_id', restaurantId)
    : supabase.from('kuafor_hizmetleri').insert([payload]);

  const { data, error } = await sorgu.select().single();
  hataKontrol(error, 'İşlem/hizmet kaydedilemedi.');
  return data;
}

export async function kuaforMusterisiKaydet(restaurantId, form, musteriId = null) {
  const payload = {
    restaurant_id: restaurantId,
    ad: String(form.ad || '').trim(),
    telefon: String(form.telefon || '').trim() || null,
    email: String(form.email || '').trim() || null,
    dogum_tarihi: form.dogumTarihi || null,
    not_metni: String(form.notMetni || '').trim() || null,
  };

  const sorgu = musteriId
    ? supabase.from('kuafor_musterileri').update(payload).eq('id', musteriId).eq('restaurant_id', restaurantId)
    : supabase.from('kuafor_musterileri').insert([payload]);

  const { data, error } = await sorgu.select().single();
  hataKontrol(error, 'Müşteri kaydedilemedi.');
  return data;
}

export async function kuaforRandevusuKaydet(restaurantId, form, randevuId = null) {
  const { data, error } = await supabase.rpc('kuafor_randevu_kaydet', {
    p_restaurant_id: restaurantId,
    p_randevu_id: randevuId || null,
    p_musteri_id: form.musteriId,
    p_musteri_adi: String(form.musteriAdi || '').trim(),
    p_telefon: String(form.telefon || '').trim() || null,
    p_personel_id: form.personelId,
    p_hizmet_id: form.hizmetIdleri[0],
    p_baslangic_zamani: form.baslangicZamani,
    p_sure_dakika: Number(form.sureDakika || 30),
    p_ucret: Number(form.ucret || 0),
    p_kapora: Number(form.kapora || 0),
    p_kullanilan_malzemeler: String(form.kullanilanMalzemeler || '').trim() || null,
    p_not_metni: String(form.notMetni || '').trim() || null,
    p_hizmet_idleri: form.hizmetIdleri,
  });

  hataKontrol(error, 'Randevu kaydedilemedi.');
  return data;
}

export async function kuaforRandevuDurumunuGuncelle(restaurantId, randevuId, durum, odeme = {}) {
  const { data, error } = await supabase.rpc('kuafor_randevu_durum_guncelle', {
    p_restaurant_id: restaurantId,
    p_randevu_id: randevuId,
    p_durum: durum,
    p_odeme_tipi: durum === 'Tamamlandı' ? String(odeme.odemeTipi || '').trim() : null,
    p_odenen_tutar: durum === 'Tamamlandı' ? Number(odeme.odenenTutar || 0) : null,
  });

  hataKontrol(error, 'Randevu durumu güncellenemedi.');
  return data;
}

export async function kuaforCariTahsilatiKaydet(restaurantId, form) {
  const { data, error } = await supabase.rpc('kuafor_cari_tahsilat_kaydet', {
    p_restaurant_id: restaurantId,
    p_kuafor_musteri_id: form.musteriId,
    p_tutar: Number(form.tutar || 0),
    p_odeme_tipi: String(form.odemeTipi || 'Nakit').trim(),
    p_aciklama: String(form.aciklama || '').trim() || null,
  });

  hataKontrol(error, 'Cari tahsilat kaydedilemedi.');
  return data;
}
