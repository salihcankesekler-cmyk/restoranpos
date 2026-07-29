import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  kuaforCariTahsilatiKaydet,
  kuaforHizmetiKaydet,
  kuaforMusterisiKaydet,
  kuaforPersoneliKaydet,
  kuaforRandevuDurumunuGuncelle,
  kuaforRandevusuKaydet,
  kuaforVerileriniGetir,
} from '../services/kuaforService';
import './kuafor.css';

const GUN_BASLANGIC_DAKIKA = 8 * 60;
const GUN_BITIS_DAKIKA = 21 * 60;
const DAKIKA_PIKSEL = 1.05;

const ikiHane = deger => String(deger).padStart(2, '0');
const bugunYerel = () => {
  const tarih = new Date();
  return `${tarih.getFullYear()}-${ikiHane(tarih.getMonth() + 1)}-${ikiHane(tarih.getDate())}`;
};
const yerelTarih = deger => {
  const tarih = new Date(deger);
  return `${tarih.getFullYear()}-${ikiHane(tarih.getMonth() + 1)}-${ikiHane(tarih.getDate())}`;
};
const yerelSaat = deger => {
  const tarih = new Date(deger);
  return `${ikiHane(tarih.getHours())}:${ikiHane(tarih.getMinutes())}`;
};
const para = deger => Number(deger || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tarihBasligi = tarih => new Date(`${tarih}T12:00:00`).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const durumSinifi = durum => String(durum || '').toLocaleLowerCase('tr-TR').replaceAll(' ', '-').replaceAll('ı', 'i').replaceAll('ş', 's').replaceAll('ç', 'c').replaceAll('ğ', 'g').replaceAll('ü', 'u').replaceAll('ö', 'o');
const randevuUrunOzeti = randevu => (Array.isArray(randevu?.kullanilan_urunler) ? randevu.kullanilan_urunler : [])
  .map(urun => `${urun.ad || 'Ürün'} ${Number(urun.miktar || 0).toLocaleString('tr-TR')} ${urun.birim || 'adet'}`)
  .join(', ');

const bosRandevu = tarih => ({
  musteriId: '',
  musteriAdi: '',
  telefon: '',
  personelId: '',
  hizmetIdleri: [],
  tarih,
  saat: '09:00',
  sureDakika: '30',
  ucret: '',
  kapora: '',
  kullanilanUrunler: [],
  kullanilanMalzemeler: '',
  notMetni: '',
});

const bosMusteri = { ad: '', telefon: '', email: '', dogumTarihi: '', notMetni: '' };
const bosPersonel = { ad: '', telefon: '', uzmanlik: '', renk: '#7c3aed', sira: '' };
const bosHizmet = { hizmetAdi: '', kategori: 'Saç', sureDakika: '30', fiyat: '', renk: '#f97316' };
const bosOdeme = { odemeTipi: 'Nakit', odenenTutar: '' };
const bosTahsilat = { musteriId: '', tutar: '', odemeTipi: 'Nakit', aciklama: '' };

export default function KuaforApp({ restaurantId, restaurantName, notify, onSalesChanged }) {
  const [aktifSekme, setAktifSekme] = useState('plan');
  const [seciliTarih, setSeciliTarih] = useState(bugunYerel());
  const [seciliPersonelFiltresi, setSeciliPersonelFiltresi] = useState('tumu');
  const [veriler, setVeriler] = useState({ personeller: [], hizmetler: [], musteriler: [], randevular: [], cariler: [], urunler: [] });
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islemYukleniyor, setIslemYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [randevuFormu, setRandevuFormu] = useState(() => bosRandevu(bugunYerel()));
  const [duzenlenenRandevuId, setDuzenlenenRandevuId] = useState(null);
  const [seciliRandevuId, setSeciliRandevuId] = useState(null);
  const [musteriArama, setMusteriArama] = useState('');
  const [acikMusteriId, setAcikMusteriId] = useState(null);
  const [musteriFormu, setMusteriFormu] = useState(bosMusteri);
  const [personelFormu, setPersonelFormu] = useState(bosPersonel);
  const [hizmetFormu, setHizmetFormu] = useState(bosHizmet);
  const [duzenlenenMusteriId, setDuzenlenenMusteriId] = useState(null);
  const [duzenlenenPersonelId, setDuzenlenenPersonelId] = useState(null);
  const [duzenlenenHizmetId, setDuzenlenenHizmetId] = useState(null);
  const [odemeRandevuId, setOdemeRandevuId] = useState(null);
  const [odemeFormu, setOdemeFormu] = useState(bosOdeme);
  const [tahsilatFormu, setTahsilatFormu] = useState(bosTahsilat);
  const [cariArama, setCariArama] = useState('');
  const [urunArama, setUrunArama] = useState('');

  const mesajGoster = useCallback((mesaj, tip = 'info') => {
    if (typeof notify === 'function') notify(mesaj, tip);
  }, [notify]);

  const yenile = useCallback(async ({ sessiz = false } = {}) => {
    if (!restaurantId) return;
    if (!sessiz) setYukleniyor(true);
    setHata('');

    try {
      const sonuc = await kuaforVerileriniGetir(restaurantId);
      setVeriler(sonuc);
    } catch (error) {
      setHata(error?.message || 'Kuaför verileri yüklenemedi.');
    } finally {
      if (!sessiz) setYukleniyor(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    const zamanlayici = window.setTimeout(() => yenile(), 0);
    return () => window.clearTimeout(zamanlayici);
  }, [yenile]);

  const islemCalistir = async (calistir, basariMesaji) => {
    setIslemYukleniyor(true);
    setHata('');
    try {
      await calistir();
      mesajGoster(basariMesaji, 'success');
      await yenile({ sessiz: true });
      return true;
    } catch (error) {
      const mesaj = error?.message || 'İşlem tamamlanamadı.';
      setHata(mesaj);
      mesajGoster(mesaj, 'error');
      return false;
    } finally {
      setIslemYukleniyor(false);
    }
  };

  const gunRandevulari = useMemo(() => {
    return veriler.randevular
      .filter(randevu => yerelTarih(randevu.baslangic_zamani) === seciliTarih)
      .filter(randevu => seciliPersonelFiltresi === 'tumu' || String(randevu.personel_id) === String(seciliPersonelFiltresi))
      .sort((a, b) => new Date(a.baslangic_zamani) - new Date(b.baslangic_zamani));
  }, [veriler.randevular, seciliTarih, seciliPersonelFiltresi]);

  const gorunenPersoneller = useMemo(() => {
    if (seciliPersonelFiltresi === 'tumu') return veriler.personeller;
    return veriler.personeller.filter(p => String(p.id) === String(seciliPersonelFiltresi));
  }, [veriler.personeller, seciliPersonelFiltresi]);

  const filtreliMusteriler = useMemo(() => {
    const metin = String(musteriArama || '').trim().toLocaleLowerCase('tr-TR');
    return veriler.musteriler.filter(musteri =>
      !metin || `${musteri.ad || ''} ${musteri.telefon || ''} ${musteri.email || ''}`.toLocaleLowerCase('tr-TR').includes(metin)
    );
  }, [veriler.musteriler, musteriArama]);

  const seciliRandevu = veriler.randevular.find(r => String(r.id) === String(seciliRandevuId));
  const tamamlananSayisi = gunRandevulari.filter(r => r.durum === 'Tamamlandı').length;
  const iptalHaricGun = gunRandevulari.filter(r => r.durum !== 'İptal');
  const gunCirosu = gunRandevulari.filter(r => r.durum === 'Tamamlandı').reduce((toplam, r) => toplam + Number(r.odenen_tutar ?? r.ucret ?? 0), 0);
  const planlananCiro = iptalHaricGun.reduce((toplam, r) => toplam + Number(r.ucret || 0), 0);
  const gunSonuKayitlari = useMemo(() => veriler.randevular
    .filter(randevu => yerelTarih(randevu.baslangic_zamani) === seciliTarih)
    .filter(randevu => randevu.durum === 'Tamamlandı')
    .sort((a, b) => new Date(b.tamamlanma_zamani || b.updated_at) - new Date(a.tamamlanma_zamani || a.updated_at)), [veriler.randevular, seciliTarih]);
  const gunSonuToplami = gunSonuKayitlari.reduce((toplam, randevu) => toplam + Number(randevu.odenen_tutar ?? randevu.ucret ?? 0), 0);
  const odemeDagilimi = useMemo(() => gunSonuKayitlari.reduce((sonuc, randevu) => {
    const tip = randevu.odeme_tipi || 'Belirtilmedi';
    sonuc[tip] = Number(sonuc[tip] || 0) + Number(randevu.odenen_tutar ?? randevu.ucret ?? 0);
    return sonuc;
  }, {}), [gunSonuKayitlari]);
  const tumKuaforCariKayitlari = useMemo(() => {
    return veriler.musteriler
      .map(musteri => {
        const cari = veriler.cariler.find(kayit => String(kayit.id) === String(musteri.cari_musteri_id))
          || veriler.cariler.find(kayit => musteri.telefon && String(kayit.telefon || '') === String(musteri.telefon));
        return cari ? { musteri, cari } : null;
      })
      .filter(Boolean)
      .sort((a, b) => Number(b.cari.bakiye || 0) - Number(a.cari.bakiye || 0));
  }, [veriler.musteriler, veriler.cariler]);
  const kuaforCariKayitlari = useMemo(() => {
    const arama = String(cariArama || '').trim().toLocaleLowerCase('tr-TR');
    return tumKuaforCariKayitlari.filter(kayit =>
      !arama || `${kayit.musteri.ad || ''} ${kayit.musteri.telefon || ''}`.toLocaleLowerCase('tr-TR').includes(arama)
    );
  }, [tumKuaforCariKayitlari, cariArama]);
  const toplamCariBakiye = tumKuaforCariKayitlari.reduce((toplam, kayit) => toplam + Number(kayit.cari.bakiye || 0), 0);
  const filtreliUrunler = useMemo(() => {
    const arama = String(urunArama || '').trim().toLocaleLowerCase('tr-TR');
    return (veriler.urunler || []).filter(urun => {
      const seciliMi = randevuFormu.kullanilanUrunler.some(secili =>
        secili.kaynakTipi === urun.kaynakTipi && String(secili.id) === String(urun.id)
      );
      return !seciliMi && (!arama || `${urun.ad} ${urun.kaynakBasligi} ${urun.birim}`.toLocaleLowerCase('tr-TR').includes(arama));
    }).slice(0, 60);
  }, [veriler.urunler, randevuFormu.kullanilanUrunler, urunArama]);
  const gunCariTahsilatlari = useMemo(() => {
    return (veriler.cariler || []).flatMap(cari =>
      (Array.isArray(cari.hareketler) ? cari.hareketler : [])
        .filter(hareket => hareket.kaynak === 'kuafor_tahsilati')
        .filter(hareket => hareket.tarih && yerelTarih(hareket.tarih) === seciliTarih)
        .map(hareket => ({ ...hareket, cariAdi: cari.ad || 'İsimsiz müşteri', cariTelefon: cari.telefon || '' }))
    ).sort((a, b) => String(b.tarih || '').localeCompare(String(a.tarih || '')));
  }, [veriler.cariler, seciliTarih]);
  const gunCariTahsilatToplami = gunCariTahsilatlari.reduce((toplam, hareket) => toplam + Number(hareket.tutar || 0), 0);

  const tarihDegistir = gunFarki => {
    const tarih = new Date(`${seciliTarih}T12:00:00`);
    tarih.setDate(tarih.getDate() + gunFarki);
    setSeciliTarih(`${tarih.getFullYear()}-${ikiHane(tarih.getMonth() + 1)}-${ikiHane(tarih.getDate())}`);
    setSeciliRandevuId(null);
  };

  const randevuFormunuAc = ({ personelId = '', saat = '09:00', tarih = seciliTarih } = {}) => {
    setDuzenlenenRandevuId(null);
    setRandevuFormu({
      ...bosRandevu(tarih),
      personelId: personelId || veriler.personeller[0]?.id || '',
      hizmetIdleri: veriler.hizmetler[0]?.id ? [veriler.hizmetler[0].id] : [],
      saat,
      sureDakika: String(veriler.hizmetler[0]?.sure_dakika || 30),
      ucret: String(veriler.hizmetler[0]?.fiyat ?? ''),
    });
    setAktifSekme('kayit');
  };

  const kullanilanUrunEkle = secimAnahtari => {
    const [kaynakTipi, id] = String(secimAnahtari || '').split(':');
    const urun = (veriler.urunler || []).find(kayit => kayit.kaynakTipi === kaynakTipi && String(kayit.id) === id);
    if (!urun) return;

    setRandevuFormu(prev => ({
      ...prev,
      kullanilanUrunler: [...prev.kullanilanUrunler, { ...urun, miktar: '1' }],
    }));
    setUrunArama('');
  };

  const kullanilanUrunMiktariDegistir = (kaynakTipi, id, miktar) => {
    setRandevuFormu(prev => ({
      ...prev,
      kullanilanUrunler: prev.kullanilanUrunler.map(urun =>
        urun.kaynakTipi === kaynakTipi && String(urun.id) === String(id) ? { ...urun, miktar } : urun
      ),
    }));
  };

  const kullanilanUrunuSil = (kaynakTipi, id) => {
    setRandevuFormu(prev => ({
      ...prev,
      kullanilanUrunler: prev.kullanilanUrunler.filter(urun =>
        !(urun.kaynakTipi === kaynakTipi && String(urun.id) === String(id))
      ),
    }));
  };

  const planBoslugunaTikla = (event, personelId) => {
    if (event.target.closest('.kuafor-appointment')) return;
    const sinir = event.currentTarget.getBoundingClientRect();
    const dakika = Math.round((GUN_BASLANGIC_DAKIKA + (event.clientY - sinir.top) / DAKIKA_PIKSEL) / 15) * 15;
    const guvenliDakika = Math.max(GUN_BASLANGIC_DAKIKA, Math.min(dakika, GUN_BITIS_DAKIKA - 15));
    randevuFormunuAc({
      personelId,
      saat: `${ikiHane(Math.floor(guvenliDakika / 60))}:${ikiHane(guvenliDakika % 60)}`,
    });
  };

  const musteriSec = musteriId => {
    const musteri = veriler.musteriler.find(m => String(m.id) === String(musteriId));
    setRandevuFormu(prev => ({
      ...prev,
      musteriId,
      musteriAdi: musteri?.ad || '',
      telefon: musteri?.telefon || '',
    }));
  };

  const hizmetleriHesapla = hizmetIdleri => {
    const secilenler = hizmetIdleri
      .map(hizmetId => veriler.hizmetler.find(hizmet => String(hizmet.id) === String(hizmetId)))
      .filter(Boolean);
    return {
      sureDakika: String(secilenler.reduce((toplam, hizmet) => toplam + Number(hizmet.sure_dakika || 0), 0) || 30),
      ucret: String(secilenler.reduce((toplam, hizmet) => toplam + Number(hizmet.fiyat || 0), 0)),
    };
  };

  const hizmetEkle = hizmetId => {
    if (!hizmetId) return;
    setRandevuFormu(prev => {
      const hizmetIdleri = prev.hizmetIdleri.some(id => String(id) === String(hizmetId))
        ? prev.hizmetIdleri
        : [...prev.hizmetIdleri, hizmetId];
      return { ...prev, hizmetIdleri, ...hizmetleriHesapla(hizmetIdleri) };
    });
  };

  const hizmetKaldir = hizmetId => {
    setRandevuFormu(prev => {
      const hizmetIdleri = prev.hizmetIdleri.filter(id => String(id) !== String(hizmetId));
      return { ...prev, hizmetIdleri, ...hizmetleriHesapla(hizmetIdleri) };
    });
  };

  const randevuyuKaydet = async event => {
    event.preventDefault();
    if (!randevuFormu.musteriId || !randevuFormu.personelId || randevuFormu.hizmetIdleri.length === 0 || !randevuFormu.tarih || !randevuFormu.saat) {
      mesajGoster('Kayıtlı müşteri, kayıtlı personel, işlem, tarih ve saat seçimi zorunludur.', 'warning');
      return;
    }
    if (randevuFormu.kullanilanUrunler.some(urun => Number(urun.miktar || 0) <= 0)) {
      mesajGoster('Kullanılan ürün miktarları sıfırdan büyük olmalıdır.', 'warning');
      return;
    }

    const baslangic = new Date(`${randevuFormu.tarih}T${randevuFormu.saat}:00`);
    const basarili = await islemCalistir(
      () => kuaforRandevusuKaydet(restaurantId, {
        ...randevuFormu,
        baslangicZamani: baslangic.toISOString(),
      }, duzenlenenRandevuId),
      duzenlenenRandevuId ? 'Randevu güncellendi.' : 'Randevu gün planına kaydedildi.'
    );

    if (basarili) {
      setSeciliTarih(randevuFormu.tarih);
      setRandevuFormu(bosRandevu(randevuFormu.tarih));
      setDuzenlenenRandevuId(null);
      setAktifSekme('plan');
    }
  };

  const randevuyuDuzenle = randevu => {
    setRandevuFormu({
      musteriId: randevu.musteri_id || '',
      musteriAdi: randevu.musteri_adi || '',
      telefon: randevu.telefon || '',
      personelId: randevu.personel_id || '',
      hizmetIdleri: Array.isArray(randevu.hizmet_detaylari) && randevu.hizmet_detaylari.length > 0
        ? randevu.hizmet_detaylari.map(hizmet => hizmet.id)
        : (randevu.hizmet_id ? [randevu.hizmet_id] : []),
      tarih: yerelTarih(randevu.baslangic_zamani),
      saat: yerelSaat(randevu.baslangic_zamani),
      sureDakika: String(randevu.sure_dakika || 30),
      ucret: String(randevu.ucret ?? ''),
      kapora: String(randevu.kapora ?? ''),
      kullanilanUrunler: (Array.isArray(randevu.kullanilan_urunler) ? randevu.kullanilan_urunler : []).map(urun => ({
        id: String(urun.id),
        kaynakTipi: urun.kaynak_tipi,
        ad: urun.ad || '',
        birim: urun.birim || 'adet',
        stok: Number(urun.stok ?? 0),
        miktar: String(urun.miktar ?? 1),
        kaynakBasligi: urun.kaynak_tipi === 'stok_malzemesi' ? 'Hammadde / stok' : 'Ürün kartı',
      })),
      kullanilanMalzemeler: randevu.kullanilan_malzemeler || '',
      notMetni: randevu.not_metni || '',
    });
    setDuzenlenenRandevuId(randevu.id);
    setAktifSekme('kayit');
  };

  const randevuDurumuDegistir = async (randevu, durum) => {
    const basarili = await islemCalistir(
      () => kuaforRandevuDurumunuGuncelle(restaurantId, randevu.id, durum),
      `Randevu durumu “${durum}” olarak güncellendi.`
    );
    if (basarili) setSeciliRandevuId(randevu.id);
  };

  const odemePaneliniAc = randevu => {
    setOdemeRandevuId(randevu.id);
    setOdemeFormu({
      odemeTipi: randevu.odeme_tipi || 'Nakit',
      odenenTutar: String(randevu.odenen_tutar ?? randevu.ucret ?? ''),
    });
  };

  const randevuyuOdemeIleTamamla = async event => {
    event.preventDefault();
    const randevu = veriler.randevular.find(kayit => String(kayit.id) === String(odemeRandevuId));
    if (!randevu || !odemeFormu.odemeTipi || odemeFormu.odenenTutar === '' || Number(odemeFormu.odenenTutar) < 0) {
      mesajGoster('Ödeme tipi ve geçerli işlem tutarını girin.', 'warning');
      return;
    }

    const basarili = await islemCalistir(
      () => kuaforRandevuDurumunuGuncelle(restaurantId, randevu.id, 'Tamamlandı', odemeFormu),
      'İşlem tamamlandı; ödeme kuaför gün sonuna ve satış raporuna aktarıldı.'
    );
    if (basarili) {
      setSeciliRandevuId(randevu.id);
      setOdemeRandevuId(null);
      setOdemeFormu(bosOdeme);
      if (typeof onSalesChanged === 'function') {
        try {
          await onSalesChanged();
        } catch {
          // Kuaför kaydı tamamlandı; ana rapor ekranı bir sonraki açılışta yeniden yüklenir.
        }
      }
    }
  };

  const tahsilatPaneliniAc = kayit => {
    setTahsilatFormu({
      musteriId: kayit.musteri.id,
      tutar: '',
      odemeTipi: 'Nakit',
      aciklama: '',
    });
  };

  const cariTahsilatiKaydet = async event => {
    event.preventDefault();
    if (!tahsilatFormu.musteriId || Number(tahsilatFormu.tutar || 0) <= 0) {
      mesajGoster('Sıfırdan büyük bir tahsilat tutarı girin.', 'warning');
      return;
    }
    const basarili = await islemCalistir(
      () => kuaforCariTahsilatiKaydet(restaurantId, tahsilatFormu),
      'Tahsilat kaydedildi ve müşterinin cari bakiyesinden düşüldü.'
    );
    if (basarili) {
      setTahsilatFormu(bosTahsilat);
      if (typeof onSalesChanged === 'function') {
        try {
          await onSalesChanged();
        } catch {
          // Tahsilat kuaför ekranında güncellendi; ana rapor bir sonraki yenilemede tekrar yüklenir.
        }
      }
    }
  };

  const musteriKaydet = async event => {
    event.preventDefault();
    if (!musteriFormu.ad.trim()) {
      mesajGoster('Müşteri adını girin.', 'warning');
      return;
    }
    const basarili = await islemCalistir(
      () => kuaforMusterisiKaydet(restaurantId, musteriFormu, duzenlenenMusteriId),
      duzenlenenMusteriId ? 'Müşteri kartı güncellendi.' : 'Müşteri kartı kaydedildi.'
    );
    if (basarili) {
      setMusteriFormu(bosMusteri);
      setDuzenlenenMusteriId(null);
    }
  };

  const personelKaydet = async event => {
    event.preventDefault();
    if (!personelFormu.ad.trim()) {
      mesajGoster('Personel adını girin.', 'warning');
      return;
    }
    const basarili = await islemCalistir(
      () => kuaforPersoneliKaydet(restaurantId, personelFormu, duzenlenenPersonelId),
      duzenlenenPersonelId ? 'Personel kaydı güncellendi.' : 'Kuaför personeli kaydedildi.'
    );
    if (basarili) {
      setPersonelFormu(bosPersonel);
      setDuzenlenenPersonelId(null);
    }
  };

  const hizmetKaydet = async event => {
    event.preventDefault();
    if (!hizmetFormu.hizmetAdi.trim() || Number(hizmetFormu.sureDakika) <= 0) {
      mesajGoster('İşlem adı ve geçerli süre girin.', 'warning');
      return;
    }
    const basarili = await islemCalistir(
      () => kuaforHizmetiKaydet(restaurantId, hizmetFormu, duzenlenenHizmetId),
      duzenlenenHizmetId ? 'İşlem bilgisi güncellendi.' : 'İşlem ve süre bilgisi kaydedildi.'
    );
    if (basarili) {
      setHizmetFormu(bosHizmet);
      setDuzenlenenHizmetId(null);
    }
  };

  const saatCizgileri = [];
  for (let dakika = GUN_BASLANGIC_DAKIKA; dakika <= GUN_BITIS_DAKIKA; dakika += 60) {
    saatCizgileri.push({
      dakika,
      label: `${ikiHane(Math.floor(dakika / 60))}:00`,
      top: (dakika - GUN_BASLANGIC_DAKIKA) * DAKIKA_PIKSEL,
    });
  }

  if (yukleniyor) return <div className="kuafor-loading">Kuaför gün planı hazırlanıyor…</div>;

  return (
    <div className="kuafor-app">
      <header className="kuafor-header">
        <div>
          <span className="kuafor-eyebrow">{restaurantName || 'İŞLETME'}</span>
          <h1>Kuaför Yönetimi</h1>
          <p>Randevu, müşteri, stok kullanımı, cari ve gün sonu tek ekranda.</p>
        </div>
        <div className="kuafor-quick-actions">
          <button type="button" onClick={() => setAktifSekme('musteriler')}>＋ Müşteri</button>
          <button type="button" onClick={() => setAktifSekme('cariler')}>₺ Tahsilat</button>
          <button type="button" className="kuafor-new-button" onClick={() => randevuFormunuAc()}>＋ Yeni Randevu</button>
        </div>
      </header>

      {hata && <div className="kuafor-alert"><strong>Kontrol gerekiyor</strong><span>{hata}</span></div>}

      <nav className="kuafor-tabs">
        {[
          ['plan', '📅 Gün Planı'],
          ['kayit', duzenlenenRandevuId ? '✏️ Randevuyu Düzenle' : '＋ Randevu Kaydı'],
          ['musteriler', '👥 Müşteriler'],
          ['cariler', '₺ Cari / Tahsilat'],
          ['gun_sonu', '📊 Gün Sonu'],
          ['ayarlar', '⚙️ Personel & İşlemler'],
        ].map(([key, label]) => (
          <button type="button" key={key} className={aktifSekme === key ? 'active' : ''} onClick={() => setAktifSekme(key)}>{label}</button>
        ))}
      </nav>

      {aktifSekme === 'plan' && (
        <>
          <section className="kuafor-datebar">
            <div className="kuafor-date-nav">
              <button type="button" onClick={() => tarihDegistir(-1)}>‹</button>
              <button type="button" onClick={() => setSeciliTarih(bugunYerel())}>Bugün</button>
              <button type="button" onClick={() => tarihDegistir(1)}>›</button>
              <input type="date" value={seciliTarih} onChange={e => setSeciliTarih(e.target.value)} />
            </div>
            <div>
              <strong>{tarihBasligi(seciliTarih)}</strong>
              <span>{gunRandevulari.length} kayıtlı randevu</span>
            </div>
            <select value={seciliPersonelFiltresi} onChange={e => setSeciliPersonelFiltresi(e.target.value)}>
              <option value="tumu">Tüm personeller</option>
              {veriler.personeller.map(personel => <option key={personel.id} value={personel.id}>{personel.ad}</option>)}
            </select>
          </section>

          <section className="kuafor-stats">
            <article><span>Randevu</span><strong>{gunRandevulari.length}</strong><small>seçili gün</small></article>
            <article><span>Tamamlanan</span><strong>{tamamlananSayisi}</strong><small>işlemi biten</small></article>
            <article><span>Planlanan tutar</span><strong>{para(planlananCiro)} TL</strong><small>iptaller hariç</small></article>
            <article><span>Tamamlanan ciro</span><strong>{para(gunCirosu)} TL</strong><small>işlem sonucu</small></article>
          </section>

          {veriler.personeller.length === 0 ? (
            <div className="kuafor-empty setup-empty">
              Gün planını kullanmak için önce <button type="button" onClick={() => setAktifSekme('ayarlar')}>Personel & İşlemler</button> bölümünden personel ve hizmet tanımlayın.
            </div>
          ) : (
            <section className="kuafor-plan-card">
              <div className="kuafor-plan-scroll">
                <div className="kuafor-plan" style={{ '--lane-count': Math.max(gorunenPersoneller.length, 1) }}>
                  <div className="kuafor-time-head">Saat</div>
                  {gorunenPersoneller.map(personel => (
                    <div key={personel.id} className="kuafor-person-head" style={{ '--staff-color': personel.renk || '#7c3aed' }}>
                      <i />
                      <strong>{personel.ad}</strong>
                      <span>{personel.uzmanlik || 'Kuaför personeli'}</span>
                    </div>
                  ))}

                  <div className="kuafor-time-axis" style={{ height: (GUN_BITIS_DAKIKA - GUN_BASLANGIC_DAKIKA) * DAKIKA_PIKSEL }}>
                    {saatCizgileri.map(saat => <span key={saat.dakika} style={{ top: saat.top }}>{saat.label}</span>)}
                  </div>

                  {gorunenPersoneller.map(personel => (
                    <div
                      key={`lane-${personel.id}`}
                      className="kuafor-staff-lane"
                      style={{ height: (GUN_BITIS_DAKIKA - GUN_BASLANGIC_DAKIKA) * DAKIKA_PIKSEL }}
                      onClick={event => planBoslugunaTikla(event, personel.id)}
                    >
                      {gunRandevulari
                        .filter(randevu => String(randevu.personel_id) === String(personel.id))
                        .map(randevu => {
                          const baslangic = new Date(randevu.baslangic_zamani);
                          const baslangicDakika = baslangic.getHours() * 60 + baslangic.getMinutes();
                          const top = Math.max(0, (baslangicDakika - GUN_BASLANGIC_DAKIKA) * DAKIKA_PIKSEL);
                          const yukseklik = Math.max(38, Number(randevu.sure_dakika || 30) * DAKIKA_PIKSEL);
                          return (
                            <button
                              type="button"
                              key={randevu.id}
                              className={`kuafor-appointment ${durumSinifi(randevu.durum)}`}
                              style={{ top, height: yukseklik, '--service-color': randevu.hizmet_rengi || personel.renk || '#7c3aed' }}
                              onClick={event => { event.stopPropagation(); setSeciliRandevuId(randevu.id); }}
                            >
                              <b>{yerelSaat(randevu.baslangic_zamani)} · {randevu.musteri_adi}</b>
                              <span>{randevu.hizmet_adi}</span>
                              {yukseklik > 50 && <small>{randevu.durum}</small>}
                            </button>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="kuafor-plan-hint">Boş bir saate dokunarak o personel için hızlı randevu açabilirsiniz.</div>
            </section>
          )}

          {seciliRandevu && (
            <section className="kuafor-selected">
              <div>
                <span className={`kuafor-status ${durumSinifi(seciliRandevu.durum)}`}>{seciliRandevu.durum}</span>
                <h2>{seciliRandevu.musteri_adi}</h2>
                <p>{yerelSaat(seciliRandevu.baslangic_zamani)}–{yerelSaat(seciliRandevu.bitis_zamani)} · {seciliRandevu.hizmet_adi} · {seciliRandevu.personel_adi}</p>
                <small>{seciliRandevu.telefon || 'Telefon yok'}{randevuUrunOzeti(seciliRandevu) ? ` · Ürün: ${randevuUrunOzeti(seciliRandevu)}` : ''}{seciliRandevu.kullanilan_malzemeler ? ` · Ek malzeme: ${seciliRandevu.kullanilan_malzemeler}` : ''}{seciliRandevu.not_metni ? ` · ${seciliRandevu.not_metni}` : ''}</small>
              </div>
              <div className="kuafor-selected-price"><span>İşlem</span><strong>{para(seciliRandevu.ucret)} TL</strong><small>Kapora: {para(seciliRandevu.kapora)} TL</small></div>
              <div className="kuafor-status-actions">
                {seciliRandevu.durum !== 'Tamamlandı' ? <>
                  <button type="button" onClick={() => randevuDurumuDegistir(seciliRandevu, 'Onaylandı')}>Onayla</button>
                  <button type="button" onClick={() => randevuDurumuDegistir(seciliRandevu, 'Geldi')}>Geldi</button>
                  <button type="button" className="success" onClick={() => odemePaneliniAc(seciliRandevu)}>Ödeme Al & Tamamla</button>
                  <button type="button" className="danger" onClick={() => randevuDurumuDegistir(seciliRandevu, 'Gelmedi')}>Gelmedi</button>
                  <button type="button" className="danger" onClick={() => randevuDurumuDegistir(seciliRandevu, 'İptal')}>İptal</button>
                  <button type="button" onClick={() => randevuyuDuzenle(seciliRandevu)}>Düzenle</button>
                </> : <button type="button" onClick={() => setAktifSekme('gun_sonu')}>Gün Sonunda Gör</button>}
              </div>
            </section>
          )}

          {seciliRandevu && String(odemeRandevuId) === String(seciliRandevu.id) && (
            <section className="kuafor-payment-panel">
              <div>
                <span>ÖDEME İLE İŞLEMİ KAPAT</span>
                <h3>{seciliRandevu.musteri_adi} · {seciliRandevu.hizmet_adi}</h3>
                <p>Ödeme kaydedildiğinde randevu tamamlanır ve tutar gün sonu satışlarına yalnızca bir kez aktarılır.</p>
              </div>
              <form onSubmit={randevuyuOdemeIleTamamla}>
                <label><span>Ödeme tipi</span><select value={odemeFormu.odemeTipi} onChange={e => setOdemeFormu(p => ({ ...p, odemeTipi: e.target.value }))}>
                  {['Nakit', 'Kredi Kartı', 'Havale / EFT', 'Cari / Veresiye', 'Diğer'].map(tip => <option key={tip}>{tip}</option>)}
                </select></label>
                <label><span>{odemeFormu.odemeTipi === 'Cari / Veresiye' ? 'Cariye yazılacak borç' : 'Satış / tahsilat tutarı'}</span><input type="number" min="0" step="0.01" required value={odemeFormu.odenenTutar} onChange={e => setOdemeFormu(p => ({ ...p, odenenTutar: e.target.value }))} /></label>
                <button type="submit" className="success" disabled={islemYukleniyor}>Ödemeyi Kaydet ve Tamamla</button>
                <button type="button" onClick={() => setOdemeRandevuId(null)}>Vazgeç</button>
                {odemeFormu.odemeTipi === 'Cari / Veresiye' && <small className="kuafor-credit-note">Bu tutar müşterinin cari bakiyesine borç yazılır; daha sonra Cari / Veresiye panelinden tahsilat girilir.</small>}
              </form>
            </section>
          )}

          <section className="kuafor-card">
            <div className="kuafor-card-title"><div><h2>Günün randevu listesi</h2><p>Saat sırasına göre tüm kayıtlar.</p></div></div>
            <div className="kuafor-day-list">
              {gunRandevulari.map(randevu => (
                <button type="button" key={randevu.id} onClick={() => setSeciliRandevuId(randevu.id)}>
                  <time>{yerelSaat(randevu.baslangic_zamani)}</time>
                  <i style={{ background: randevu.hizmet_rengi || '#7c3aed' }} />
                  <span><strong>{randevu.musteri_adi}</strong><small>{randevu.hizmet_adi} · {randevu.personel_adi}</small></span>
                  <b>{para(randevu.ucret)} TL</b>
                  <em className={durumSinifi(randevu.durum)}>{randevu.durum}</em>
                </button>
              ))}
              {gunRandevulari.length === 0 && <div className="kuafor-empty">Bu gün için randevu bulunmuyor.</div>}
            </div>
          </section>
        </>
      )}

      {aktifSekme === 'kayit' && (
        <section className="kuafor-card appointment-form-card">
          <div className="kuafor-card-title">
            <div><h2>{duzenlenenRandevuId ? 'Randevuyu düzenle' : 'Yeni randevu kaydı'}</h2><p>Randevu yalnızca kayıtlı müşteri, kayıtlı personel ve kayıtlı işlem seçilerek oluşturulur.</p></div>
          </div>
          {veriler.musteriler.length === 0 || veriler.personeller.length === 0 || veriler.hizmetler.length === 0 ? (
            <div className="kuafor-empty setup-empty">
              Randevu açmak için önce müşteri kartı, personel ve işlem kaydı oluşturun.
              {veriler.musteriler.length === 0 && <button type="button" onClick={() => setAktifSekme('musteriler')}>Müşteri Kartı Aç</button>}
              {(veriler.personeller.length === 0 || veriler.hizmetler.length === 0) && <button type="button" onClick={() => setAktifSekme('ayarlar')}>Personel / İşlem Tanımla</button>}
            </div>
          ) : (
            <form className="kuafor-randevu-form" onSubmit={randevuyuKaydet}>
              <label className="wide"><span>Kayıtlı müşteri *</span><select value={randevuFormu.musteriId} onChange={e => musteriSec(e.target.value)}><option value="">Müşteri seçin</option>{veriler.musteriler.map(m => <option key={m.id} value={m.id}>{m.ad}{m.telefon ? ` · ${m.telefon}` : ''}</option>)}</select></label>
              <div className="kuafor-customer-preview wide">
                {randevuFormu.musteriId
                  ? <><strong>{randevuFormu.musteriAdi}</strong><span>{randevuFormu.telefon || 'Telefon kaydı yok'}</span></>
                  : <span>Önce kayıtlı müşteri seçin.</span>}
                <button type="button" onClick={() => setAktifSekme('musteriler')}>＋ Yeni Müşteri Kartı</button>
              </div>
              <label><span>Personel *</span><select value={randevuFormu.personelId} onChange={e => setRandevuFormu(p => ({ ...p, personelId: e.target.value }))}><option value="">Personel seçin</option>{veriler.personeller.map(p => <option key={p.id} value={p.id}>{p.ad}</option>)}</select></label>
              <label className="wide"><span>İşlem / hizmet ekle *</span><select value="" onChange={e => hizmetEkle(e.target.value)}><option value="">Listeden işlem ekleyin</option>{veriler.hizmetler.filter(hizmet => !randevuFormu.hizmetIdleri.some(id => String(id) === String(hizmet.id))).map(h => <option key={h.id} value={h.id}>{h.hizmet_adi} · {h.sure_dakika} dk · {para(h.fiyat)} TL</option>)}</select></label>
              <div className="kuafor-service-selection wide">
                {randevuFormu.hizmetIdleri.map(hizmetId => {
                  const hizmet = veriler.hizmetler.find(kayit => String(kayit.id) === String(hizmetId));
                  if (!hizmet) return null;
                  return <button type="button" key={hizmet.id} onClick={() => hizmetKaldir(hizmet.id)} title="İşlemi randevudan çıkar">
                    <i style={{ background: hizmet.renk }} /><span><strong>{hizmet.hizmet_adi}</strong><small>{hizmet.sure_dakika} dk · {para(hizmet.fiyat)} TL</small></span><b>×</b>
                  </button>;
                })}
                {randevuFormu.hizmetIdleri.length === 0 && <span>Henüz işlem eklenmedi.</span>}
              </div>
              <label><span>Tarih *</span><input type="date" value={randevuFormu.tarih} onChange={e => setRandevuFormu(p => ({ ...p, tarih: e.target.value }))} /></label>
              <label><span>Başlangıç *</span><input type="time" step="900" value={randevuFormu.saat} onChange={e => setRandevuFormu(p => ({ ...p, saat: e.target.value }))} /></label>
              <label><span>Süre (dakika)</span><input type="number" min="5" step="5" value={randevuFormu.sureDakika} onChange={e => setRandevuFormu(p => ({ ...p, sureDakika: e.target.value }))} /></label>
              <label><span>İşlem ücreti</span><input type="number" min="0" step="0.01" value={randevuFormu.ucret} onChange={e => setRandevuFormu(p => ({ ...p, ucret: e.target.value }))} /></label>
              <label><span>Kapora</span><input type="number" min="0" step="0.01" value={randevuFormu.kapora} onChange={e => setRandevuFormu(p => ({ ...p, kapora: e.target.value }))} /></label>
              <div className="kuafor-product-picker wide">
                <div className="kuafor-product-picker-head">
                  <div><strong>Kullanılan ürünler</strong><span>Ürün veya hammadde kartından seçin; işlem tamamlanınca stok otomatik düşer.</span></div>
                  <small>{randevuFormu.kullanilanUrunler.length} ürün seçildi</small>
                </div>
                <div className="kuafor-product-picker-controls">
                  <input value={urunArama} onChange={e => setUrunArama(e.target.value)} placeholder="Ürün ya da malzeme ara…" />
                  <select value="" onChange={e => kullanilanUrunEkle(e.target.value)}>
                    <option value="">Listeden ürünü ekleyin</option>
                    {filtreliUrunler.map(urun => (
                      <option key={`${urun.kaynakTipi}-${urun.id}`} value={`${urun.kaynakTipi}:${urun.id}`}>
                        {urun.ad} · Stok {para(urun.stok)} {urun.birim} · {urun.kaynakBasligi}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="kuafor-used-products">
                  {randevuFormu.kullanilanUrunler.map(urun => {
                    const guncelUrun = (veriler.urunler || []).find(kayit => kayit.kaynakTipi === urun.kaynakTipi && String(kayit.id) === String(urun.id));
                    const stok = Number(guncelUrun?.stok ?? urun.stok ?? 0);
                    const birim = guncelUrun?.birim || urun.birim || 'adet';
                    return (
                      <div key={`${urun.kaynakTipi}-${urun.id}`}>
                        <span><strong>{guncelUrun?.ad || urun.ad}</strong><small>{guncelUrun?.kaynakBasligi || urun.kaynakBasligi} · Mevcut stok: {para(stok)} {birim}</small></span>
                        <label><span>Kullanım</span><input type="number" min="0.001" step="0.001" value={urun.miktar} onChange={e => kullanilanUrunMiktariDegistir(urun.kaynakTipi, urun.id, e.target.value)} /></label>
                        <b>{birim}</b>
                        <button type="button" className="danger" onClick={() => kullanilanUrunuSil(urun.kaynakTipi, urun.id)}>Sil</button>
                      </div>
                    );
                  })}
                  {randevuFormu.kullanilanUrunler.length === 0 && <p>Bu randevuya henüz stoktan kullanılacak ürün eklenmedi.</p>}
                </div>
              </div>
              <label className="wide"><span>Ek malzeme notu</span><textarea value={randevuFormu.kullanilanMalzemeler} onChange={e => setRandevuFormu(p => ({ ...p, kullanilanMalzemeler: e.target.value }))} placeholder="Kartlarda olmayan özel boya kodu, karışım veya kullanım notu…" /></label>
              <label className="wide"><span>Not</span><textarea value={randevuFormu.notMetni} onChange={e => setRandevuFormu(p => ({ ...p, notMetni: e.target.value }))} placeholder="Boya kodu, tercih, alerji veya hatırlatma notu…" /></label>
              <div className="kuafor-form-summary">
                <span>Planlanan bitiş</span>
                <strong>{(() => {
                  const [saat, dakika] = String(randevuFormu.saat || '00:00').split(':').map(Number);
                  const toplam = saat * 60 + dakika + Number(randevuFormu.sureDakika || 0);
                  return `${ikiHane(Math.floor(toplam / 60) % 24)}:${ikiHane(toplam % 60)}`;
                })()}</strong>
                <small>Aynı personelde çakışan randevu varsa sistem kaydı engeller.</small>
              </div>
              <div className="kuafor-form-actions wide">
                <button type="submit" className="primary" disabled={islemYukleniyor}>{duzenlenenRandevuId ? 'Randevuyu Güncelle' : 'Randevuyu Gün Planına Kaydet'}</button>
                {duzenlenenRandevuId && <button type="button" onClick={() => { setDuzenlenenRandevuId(null); setRandevuFormu(bosRandevu(seciliTarih)); }}>Yeni Kayıda Dön</button>}
              </div>
            </form>
          )}
        </section>
      )}

      {aktifSekme === 'musteriler' && (
        <section className="kuafor-grid-two">
          <div className="kuafor-card">
            <div className="kuafor-card-title"><div><h2>{duzenlenenMusteriId ? 'Müşteri kartını düzenle' : 'Müşteri kartı aç'}</h2><p>Müşteriyi bir kez kaydedin; sonraki randevularda listeden seçin.</p></div></div>
            <form className="kuafor-stack-form" onSubmit={musteriKaydet}>
              <input value={musteriFormu.ad} onChange={e => setMusteriFormu(p => ({ ...p, ad: e.target.value }))} placeholder="Ad Soyad *" />
              <input value={musteriFormu.telefon} onChange={e => setMusteriFormu(p => ({ ...p, telefon: e.target.value }))} placeholder="Telefon" />
              <input type="email" value={musteriFormu.email} onChange={e => setMusteriFormu(p => ({ ...p, email: e.target.value }))} placeholder="E-posta" />
              <label><span>Doğum tarihi</span><input type="date" value={musteriFormu.dogumTarihi} onChange={e => setMusteriFormu(p => ({ ...p, dogumTarihi: e.target.value }))} /></label>
              <textarea value={musteriFormu.notMetni} onChange={e => setMusteriFormu(p => ({ ...p, notMetni: e.target.value }))} placeholder="Saç tipi, boya kodu, alerji veya tercih notu…" />
              <button type="submit" className="primary" disabled={islemYukleniyor}>{duzenlenenMusteriId ? 'Müşteriyi Güncelle' : 'Müşteriyi Kaydet'}</button>
              {duzenlenenMusteriId && <button type="button" onClick={() => { setDuzenlenenMusteriId(null); setMusteriFormu(bosMusteri); }}>Vazgeç</button>}
            </form>
          </div>
          <div className="kuafor-card">
            <div className="kuafor-card-title"><div><h2>Müşteri kayıtları</h2><p>{veriler.musteriler.length} kayıtlı müşteri.</p></div></div>
            <div className="kuafor-search"><span>⌕</span><input value={musteriArama} onChange={e => setMusteriArama(e.target.value)} placeholder="Ad, telefon veya e-posta ara…" /></div>
            <div className="kuafor-customer-list">
              {filtreliMusteriler.map(musteri => (
                <article key={musteri.id}>
                  <div className="kuafor-avatar">{String(musteri.ad || '?').slice(0, 1).toLocaleUpperCase('tr-TR')}</div>
                  <div><strong>{musteri.ad}</strong><span>{musteri.telefon || 'Telefon yok'}{musteri.email ? ` · ${musteri.email}` : ''}</span><small>{musteri.not_metni || 'Müşteri notu yok'}</small></div>
                  <b>{Number(musteri.toplam_ziyaret || 0)}<small>ziyaret</small></b>
                  <div className="kuafor-customer-actions">
                    <button type="button" onClick={() => {
                      setDuzenlenenMusteriId(musteri.id);
                      setMusteriFormu({ ad: musteri.ad || '', telefon: musteri.telefon || '', email: musteri.email || '', dogumTarihi: musteri.dogum_tarihi || '', notMetni: musteri.not_metni || '' });
                    }}>Düzenle</button>
                    <button type="button" onClick={() => setAcikMusteriId(prev => String(prev) === String(musteri.id) ? null : musteri.id)}>Geçmiş</button>
                    <button type="button" onClick={() => {
                      setRandevuFormu({ ...bosRandevu(seciliTarih), musteriId: musteri.id, musteriAdi: musteri.ad, telefon: musteri.telefon || '', personelId: veriler.personeller[0]?.id || '', hizmetIdleri: veriler.hizmetler[0]?.id ? [veriler.hizmetler[0].id] : [], sureDakika: String(veriler.hizmetler[0]?.sure_dakika || 30), ucret: String(veriler.hizmetler[0]?.fiyat ?? '') });
                      setAktifSekme('kayit');
                    }}>Randevu</button>
                  </div>
                  {String(acikMusteriId) === String(musteri.id) && (
                    <div className="kuafor-customer-history">
                      {veriler.randevular
                        .filter(randevu => String(randevu.musteri_id) === String(musteri.id))
                        .sort((a, b) => new Date(b.baslangic_zamani) - new Date(a.baslangic_zamani))
                        .slice(0, 12)
                        .map(randevu => (
                          <div key={randevu.id}>
                            <time>{new Date(randevu.baslangic_zamani).toLocaleDateString('tr-TR')}</time>
                            <span><strong>{randevu.hizmet_adi}</strong><small>{randevu.personel_adi} · {randevu.durum}</small></span>
                            <p>{randevuUrunOzeti(randevu) ? `Ürün: ${randevuUrunOzeti(randevu)}` : 'Stoktan kullanılan ürün kaydı yok.'}{randevu.kullanilan_malzemeler ? ` · Ek not: ${randevu.kullanilan_malzemeler}` : ''}</p>
                          </div>
                        ))}
                      {!veriler.randevular.some(randevu => String(randevu.musteri_id) === String(musteri.id)) && <div className="kuafor-empty">Bu müşterinin henüz işlem geçmişi yok.</div>}
                    </div>
                  )}
                </article>
              ))}
              {filtreliMusteriler.length === 0 && <div className="kuafor-empty">Müşteri bulunamadı.</div>}
            </div>
          </div>
        </section>
      )}

      {aktifSekme === 'ayarlar' && (
        <section className="kuafor-grid-two">
          <div className="kuafor-card">
            <div className="kuafor-card-title"><div><h2>{duzenlenenPersonelId ? 'Personeli düzenle' : 'Kayıtlı personel'}</h2><p>Bir kez kaydedilir; randevularda listeden seçilir ve gün planında ayrı sütun olur.</p></div></div>
            <form className="kuafor-catalog-form" onSubmit={personelKaydet}>
              <input value={personelFormu.ad} onChange={e => setPersonelFormu(p => ({ ...p, ad: e.target.value }))} placeholder="Personel adı *" />
              <input value={personelFormu.telefon} onChange={e => setPersonelFormu(p => ({ ...p, telefon: e.target.value }))} placeholder="Telefon" />
              <input value={personelFormu.uzmanlik} onChange={e => setPersonelFormu(p => ({ ...p, uzmanlik: e.target.value }))} placeholder="Uzmanlık (Boya, kesim…)" />
              <label className="color-label"><span>Plan rengi</span><input type="color" value={personelFormu.renk} onChange={e => setPersonelFormu(p => ({ ...p, renk: e.target.value }))} /></label>
              <button type="submit" className="primary" disabled={islemYukleniyor}>{duzenlenenPersonelId ? 'Personeli Güncelle' : 'Personeli Kaydet'}</button>
              {duzenlenenPersonelId && <button type="button" onClick={() => { setDuzenlenenPersonelId(null); setPersonelFormu(bosPersonel); }}>Vazgeç</button>}
            </form>
            <div className="kuafor-catalog-list">
              {veriler.personeller.map(personel => <div key={personel.id}><i style={{ background: personel.renk }} /><span><strong>{personel.ad}</strong><small>{personel.uzmanlik || 'Uzmanlık belirtilmedi'}</small></span><button type="button" onClick={() => {
                setDuzenlenenPersonelId(personel.id);
                setPersonelFormu({ ad: personel.ad || '', telefon: personel.telefon || '', uzmanlik: personel.uzmanlik || '', renk: personel.renk || '#7c3aed', sira: String(personel.sira || '') });
              }}>Düzenle</button></div>)}
            </div>
          </div>
          <div className="kuafor-card">
            <div className="kuafor-card-title"><div><h2>{duzenlenenHizmetId ? 'İşlemi düzenle' : 'Kayıtlı işlem ve hizmetler'}</h2><p>Fiyat ve süre bir kez kaydedilir, randevuya otomatik gelir.</p></div></div>
            <form className="kuafor-catalog-form" onSubmit={hizmetKaydet}>
              <input value={hizmetFormu.hizmetAdi} onChange={e => setHizmetFormu(p => ({ ...p, hizmetAdi: e.target.value }))} placeholder="İşlem adı *" />
              <input value={hizmetFormu.kategori} onChange={e => setHizmetFormu(p => ({ ...p, kategori: e.target.value }))} placeholder="Kategori" />
              <input type="number" min="5" step="5" value={hizmetFormu.sureDakika} onChange={e => setHizmetFormu(p => ({ ...p, sureDakika: e.target.value }))} placeholder="Süre (dk)" />
              <input type="number" min="0" step="0.01" value={hizmetFormu.fiyat} onChange={e => setHizmetFormu(p => ({ ...p, fiyat: e.target.value }))} placeholder="Fiyat" />
              <label className="color-label"><span>İşlem rengi</span><input type="color" value={hizmetFormu.renk} onChange={e => setHizmetFormu(p => ({ ...p, renk: e.target.value }))} /></label>
              <button type="submit" className="primary" disabled={islemYukleniyor}>{duzenlenenHizmetId ? 'İşlemi Güncelle' : 'İşlemi Kaydet'}</button>
              {duzenlenenHizmetId && <button type="button" onClick={() => { setDuzenlenenHizmetId(null); setHizmetFormu(bosHizmet); }}>Vazgeç</button>}
            </form>
            <div className="kuafor-catalog-list">
              {veriler.hizmetler.map(hizmet => <div key={hizmet.id}><i style={{ background: hizmet.renk }} /><span><strong>{hizmet.hizmet_adi}</strong><small>{hizmet.kategori} · {hizmet.sure_dakika} dakika</small></span><b>{para(hizmet.fiyat)} TL</b><button type="button" onClick={() => {
                setDuzenlenenHizmetId(hizmet.id);
                setHizmetFormu({ hizmetAdi: hizmet.hizmet_adi || '', kategori: hizmet.kategori || 'Genel', sureDakika: String(hizmet.sure_dakika || 30), fiyat: String(hizmet.fiyat ?? ''), renk: hizmet.renk || '#f97316' });
              }}>Düzenle</button></div>)}
            </div>
          </div>
        </section>
      )}

      {aktifSekme === 'cariler' && (
        <>
          <section className="kuafor-cari-summary">
            <article><span>Cari müşterisi</span><strong>{kuaforCariKayitlari.length}</strong><small>veresiye hesabı açılan</small></article>
            <article><span>Toplam alacak</span><strong>{para(toplamCariBakiye)} TL</strong><small>müşterilerden alınacak</small></article>
            <div>
              <strong>Cari hesap nasıl oluşur?</strong>
              <p>Randevuyu “Cari / Veresiye” ile tamamladığınızda müşteri adına cari hesap otomatik açılır ve işlem tutarı borç yazılır.</p>
            </div>
          </section>

          <section className="kuafor-card">
            <div className="kuafor-card-title"><div><h2>Cari müşteri bakiyeleri</h2><p>Müşterinin borcunu, sonradan getirdiği parayı ve tüm hareket geçmişini buradan takip edin.</p></div></div>
            <div className="kuafor-search"><span>⌕</span><input value={cariArama} onChange={e => setCariArama(e.target.value)} placeholder="Müşteri adı veya telefon ara…" /></div>

            {tahsilatFormu.musteriId && (
              <form className="kuafor-collection-form" onSubmit={cariTahsilatiKaydet}>
                <div>
                  <span>TAHSİLAT GİRİŞİ</span>
                  <strong>{veriler.musteriler.find(musteri => String(musteri.id) === String(tahsilatFormu.musteriId))?.ad}</strong>
                </div>
                <label><span>Getirdiği tutar</span><input type="number" min="0.01" step="0.01" required value={tahsilatFormu.tutar} onChange={e => setTahsilatFormu(p => ({ ...p, tutar: e.target.value }))} /></label>
                <label><span>Ödeme tipi</span><select value={tahsilatFormu.odemeTipi} onChange={e => setTahsilatFormu(p => ({ ...p, odemeTipi: e.target.value }))}>{['Nakit', 'Kredi Kartı', 'Havale / EFT', 'Diğer'].map(tip => <option key={tip}>{tip}</option>)}</select></label>
                <label><span>Açıklama</span><input value={tahsilatFormu.aciklama} onChange={e => setTahsilatFormu(p => ({ ...p, aciklama: e.target.value }))} placeholder="Örn. 15 Ağustos tahsilatı" /></label>
                <button type="submit" className="success" disabled={islemYukleniyor}>Tahsilatı Kaydet</button>
                <button type="button" onClick={() => setTahsilatFormu(bosTahsilat)}>Vazgeç</button>
              </form>
            )}

            <div className="kuafor-cari-list">
              {kuaforCariKayitlari.map(kayit => (
                <article key={kayit.musteri.id}>
                  <div className="kuafor-avatar">{String(kayit.musteri.ad || '?').slice(0, 1).toLocaleUpperCase('tr-TR')}</div>
                  <div><strong>{kayit.musteri.ad}</strong><span>{kayit.musteri.telefon || 'Telefon yok'}</span></div>
                  <div className={Number(kayit.cari.bakiye || 0) > 0 ? 'debt' : 'clear'}><span>Güncel bakiye</span><strong>{para(kayit.cari.bakiye)} TL</strong></div>
                  <button type="button" className="success" disabled={Number(kayit.cari.bakiye || 0) <= 0} onClick={() => tahsilatPaneliniAc(kayit)}>Tahsilat Gir</button>
                  <details>
                    <summary>Ekstre / Hareket Geçmişi</summary>
                    <div>
                      {(Array.isArray(kayit.cari.hareketler) ? kayit.cari.hareketler : []).slice(0, 30).map(hareket => (
                        <p key={hareket.id || `${hareket.tarih}-${hareket.tutar}`}>
                          <time>{hareket.tarih ? new Date(hareket.tarih).toLocaleString('tr-TR') : '-'}</time>
                          <span><strong>{hareket.tip || 'Hareket'}</strong><small>{hareket.aciklama || 'Açıklama yok'}{hareket.odeme_tipi ? ` · ${hareket.odeme_tipi}` : ''}</small></span>
                          <b className={Number(hareket.bakiye_etkisi ?? (hareket.tip === 'Borç' ? hareket.tutar : -hareket.tutar)) > 0 ? 'debt' : 'clear'}>
                            {Number(hareket.bakiye_etkisi ?? (hareket.tip === 'Borç' ? hareket.tutar : -hareket.tutar)) > 0 ? '+' : '-'}{para(Math.abs(Number(hareket.tutar || 0)))} TL
                          </b>
                        </p>
                      ))}
                      {(!Array.isArray(kayit.cari.hareketler) || kayit.cari.hareketler.length === 0) && <div className="kuafor-empty">Henüz cari hareket yok.</div>}
                    </div>
                  </details>
                </article>
              ))}
              {kuaforCariKayitlari.length === 0 && <div className="kuafor-empty">Henüz veresiye işlemi bulunan kuaför müşterisi yok. İlk “Cari / Veresiye” işleminde hesap otomatik oluşur.</div>}
            </div>
          </section>
        </>
      )}

      {aktifSekme === 'gun_sonu' && (
        <>
          <section className="kuafor-datebar">
            <div className="kuafor-date-nav">
              <button type="button" onClick={() => tarihDegistir(-1)}>‹</button>
              <button type="button" onClick={() => setSeciliTarih(bugunYerel())}>Bugün</button>
              <button type="button" onClick={() => tarihDegistir(1)}>›</button>
              <input type="date" value={seciliTarih} onChange={e => setSeciliTarih(e.target.value)} />
            </div>
            <div><strong>{tarihBasligi(seciliTarih)}</strong><span>Ödemesi alınarak tamamlanan işlemler</span></div>
          </section>
          <section className="kuafor-day-end-summary">
            <article><span>İşlem adedi</span><strong>{gunSonuKayitlari.length}</strong></article>
            <article><span>Gün sonu toplamı</span><strong>{para(gunSonuToplami)} TL</strong></article>
            {Object.entries(odemeDagilimi).map(([tip, tutar]) => (
              <article key={tip}>
                <span>{String(tip).toLocaleLowerCase('tr-TR').includes('cari') || String(tip).toLocaleLowerCase('tr-TR').includes('veresiye') ? 'Cari satış (ilk işlem)' : tip}</span>
                <strong>{para(tutar)} TL</strong>
              </article>
            ))}
            <article className="collection"><span>Cari tahsilat (sonradan alınan)</span><strong>{para(gunCariTahsilatToplami)} TL</strong></article>
            <article className="balance"><span>Şu an açık cari bakiye</span><strong>{para(toplamCariBakiye)} TL</strong></article>
          </section>
          <section className="kuafor-card">
            <div className="kuafor-card-title"><div><h2>Kuaför gün sonu hareketleri</h2><p>“Ödeme Al & Tamamla” ile kapatılan her işlem ana satış raporuna da aktarılır.</p></div></div>
            <div className="kuafor-day-end-list">
              {gunSonuKayitlari.map(randevu => (
                <article key={randevu.id}>
                  <time>{yerelSaat(randevu.tamamlanma_zamani || randevu.bitis_zamani)}</time>
                  <span><strong>{randevu.musteri_adi}</strong><small>{randevu.hizmet_adi} · {randevu.personel_adi}</small></span>
                  <em>{randevu.odeme_tipi || 'Belirtilmedi'}</em>
                  <b>{para(randevu.odenen_tutar ?? randevu.ucret)} TL</b>
                  <i>{randevu.gun_sonuna_aktarildi ? 'Satışa aktarıldı' : 'Aktarım bekliyor'}</i>
                </article>
              ))}
              {gunSonuKayitlari.length === 0 && <div className="kuafor-empty">Bu tarih için tamamlanan ve ödemesi alınan işlem yok.</div>}
            </div>
          </section>
          <section className="kuafor-card">
            <div className="kuafor-card-title">
              <div><h2>Cari tahsilatlar</h2><p>Veresiye satıştan sonra müşterinin getirdiği ödemeler burada ayrı görünür; geçmişteki cari satış kaydı değişmez.</p></div>
              <strong className="kuafor-collection-total">{para(gunCariTahsilatToplami)} TL</strong>
            </div>
            <div className="kuafor-day-end-list kuafor-collection-list">
              {gunCariTahsilatlari.map(hareket => (
                <article key={hareket.id || `${hareket.cariAdi}-${hareket.tarih}`}>
                  <time>{hareket.tarih ? yerelSaat(hareket.tarih) : '-'}</time>
                  <span><strong>{hareket.cariAdi}</strong><small>{hareket.cariTelefon || hareket.aciklama || 'Telefon yok'}</small></span>
                  <em>{hareket.odeme_tipi || 'Belirtilmedi'}</em>
                  <b>{para(hareket.tutar)} TL</b>
                  <i>Tahsil edildi</i>
                </article>
              ))}
              {gunCariTahsilatlari.length === 0 && <div className="kuafor-empty">Bu tarih için sonradan alınmış cari tahsilat bulunmuyor.</div>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
