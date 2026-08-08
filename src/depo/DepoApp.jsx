import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  depoAlisiKaydet,
  depoSevkDurumunuDegistir,
  depoSevkiniKismiTeslimAl,
  depoSevkTalebiOlustur,
  depoSevkTalebiniKapat,
  depoSevkiOlustur,
  depoSubesiniBagla,
  depoTalebiniSevkeDonustur,
  depoUrunuKaydet,
  depoVerileriniGetir,
} from '../services/depoService';
import './depo.css';

const bugun = () => new Date().toISOString().slice(0, 10);
const sayi = deger => Number(deger || 0);
const para = deger => sayi(deger).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tarihSaat = deger => deger ? new Date(deger).toLocaleString('tr-TR') : '-';
const birimiDuzenle = deger => {
  const birim = String(deger || '').trim().toLocaleLowerCase('tr-TR');
  if (['kg', 'kilogram'].includes(birim)) return 'Kg';
  if (['gr', 'gram'].includes(birim)) return 'Gram';
  if (['lt', 'l', 'litre'].includes(birim)) return 'Litre';
  if (birim === 'paket') return 'Paket';
  if (birim === 'koli') return 'Koli';
  return 'Adet';
};

const bosUrun = {
  barkod: '',
  urunAdi: '',
  stokKodu: '',
  kategori: 'Genel',
  birim: 'Adet',
  alisFiyati: '',
  minimumStok: '',
};

const bosAlis = {
  tedarikciAdi: '',
  faturaNo: '',
  faturaTarihi: bugun(),
  notMetni: '',
};

const bosSevk = {
  hedefRestaurantId: '',
  hedefStokTipi: 'Restoran',
  notMetni: '',
};

export default function DepoApp({ restaurantId, restaurantName, notify, userRole }) {
  const [bugununTarihi] = useState(bugun);
  const [otuzGunSonra] = useState(() => {
    const tarih = new Date();
    tarih.setDate(tarih.getDate() + 30);
    return tarih.toISOString().slice(0, 10);
  });
  const [aktifSekme, setAktifSekme] = useState('ozet');
  const [veriler, setVeriler] = useState({
    urunler: [],
    alislar: [],
    sevkler: [],
    sevkKalemleri: [],
    baglantilar: [],
    talepler: [],
    talepKalemleri: [],
    talepUrunleri: [],
    lotlar: [],
    teslimatFarklari: [],
    eslesmeler: [],
    kaynakUrunler: [],
    kaynakUrunHatalari: [],
    baglantiKodu: '',
  });
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islemYukleniyor, setIslemYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [arama, setArama] = useState('');
  const [kaynakArama, setKaynakArama] = useState('');
  const [urunFormu, setUrunFormu] = useState(bosUrun);
  const [duzenlenenUrunId, setDuzenlenenUrunId] = useState(null);
  const [alisFormu, setAlisFormu] = useState(bosAlis);
  const [alisKalemleri, setAlisKalemleri] = useState([]);
  const [alisSatiri, setAlisSatiri] = useState({ urunId: '', miktar: '', birimFiyat: '', lotNo: '', sonKullanmaTarihi: '' });
  const [sevkFormu, setSevkFormu] = useState(bosSevk);
  const [sevkKalemleri, setSevkKalemleri] = useState([]);
  const [sevkSatiri, setSevkSatiri] = useState({ urunId: '', miktar: '' });
  const [baglantiKodu, setBaglantiKodu] = useState('');
  const [talepFormu, setTalepFormu] = useState({ depoRestaurantId: '', hedefStokTipi: 'Restoran', notMetni: '' });
  const [talepSatiri, setTalepSatiri] = useState({ urunId: '', miktar: '' });
  const [talepKalemleri, setTalepKalemleri] = useState([]);
  const [acikTeslimSevkId, setAcikTeslimSevkId] = useState(null);
  const [teslimFormlari, setTeslimFormlari] = useState({});

  const mesajGoster = useCallback((mesaj, tip = 'info') => {
    if (typeof notify === 'function') notify(mesaj, tip);
  }, [notify]);

  const yenile = useCallback(async ({ sessiz = false } = {}) => {
    if (!restaurantId) return;
    if (!sessiz) setYukleniyor(true);
    setHata('');

    try {
      const sonuc = await depoVerileriniGetir(restaurantId);
      setVeriler(sonuc);
    } catch (error) {
      setHata(error?.message || 'Depo verileri yüklenemedi.');
    } finally {
      if (!sessiz) setYukleniyor(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    const zamanlayici = window.setTimeout(() => {
      yenile();
    }, 0);

    return () => window.clearTimeout(zamanlayici);
  }, [yenile]);

  const bagliSubeler = useMemo(() => {
    return veriler.baglantilar
      .filter(b => String(b.depo_restaurant_id) === String(restaurantId))
      .map(b => ({
        ...b,
        id: b.sube_restaurant_id,
        ad: b.sube_adi,
        isletmeTipi: b.sube_isletme_tipi || 'Restoran',
      }));
  }, [veriler.baglantilar, restaurantId]);

  const bagliDepolar = useMemo(() => {
    return veriler.baglantilar
      .filter(b => String(b.sube_restaurant_id) === String(restaurantId))
      .map(b => ({
        ...b,
        id: b.depo_restaurant_id,
        ad: b.depo_adi,
      }));
  }, [veriler.baglantilar, restaurantId]);

  const seciliTalepDeposuUrunleri = useMemo(
    () => veriler.talepUrunleri.filter(u => String(u.restaurant_id) === String(talepFormu.depoRestaurantId)),
    [talepFormu.depoRestaurantId, veriler.talepUrunleri]
  );

  const gelenTalepler = useMemo(
    () => veriler.talepler.filter(t => String(t.depo_restaurant_id) === String(restaurantId)),
    [restaurantId, veriler.talepler]
  );

  const gidenTalepler = useMemo(
    () => veriler.talepler.filter(t => String(t.talep_eden_restaurant_id) === String(restaurantId)),
    [restaurantId, veriler.talepler]
  );

  const talepKalemleriniBul = talepId => veriler.talepKalemleri.filter(k => String(k.talep_id) === String(talepId));

  const filtreliUrunler = useMemo(() => {
    const metin = String(arama || '').trim().toLocaleLowerCase('tr-TR');
    if (!metin) return veriler.urunler;
    return veriler.urunler.filter(urun =>
      `${urun.urun_adi || ''} ${urun.barkod || ''} ${urun.stok_kodu || ''} ${urun.kategori || ''}`
        .toLocaleLowerCase('tr-TR')
        .includes(metin)
    );
  }, [arama, veriler.urunler]);

  const filtreliKaynakUrunler = useMemo(() => {
    const metin = String(kaynakArama || '').trim().toLocaleLowerCase('tr-TR');
    return veriler.kaynakUrunler
      .map(urun => {
        const depoKarti = veriler.urunler.find(depoUrunu => {
          const ayniBarkod = urun.barkod && depoUrunu.barkod && String(urun.barkod) === String(depoUrunu.barkod);
          const ayniAd = String(urun.urunAdi || '').trim().toLocaleLowerCase('tr-TR')
            === String(depoUrunu.urun_adi || '').trim().toLocaleLowerCase('tr-TR');
          return ayniBarkod || ayniAd;
        });
        return { ...urun, depoKarti };
      })
      .filter(urun => !metin || `${urun.urunAdi} ${urun.barkod} ${urun.stokKodu} ${urun.kategori} ${urun.kaynakBasligi}`
        .toLocaleLowerCase('tr-TR')
        .includes(metin))
      .slice(0, 18);
  }, [kaynakArama, veriler.kaynakUrunler, veriler.urunler]);

  const gidenSevkler = useMemo(
    () => veriler.sevkler.filter(s => String(s.kaynak_restaurant_id) === String(restaurantId)),
    [veriler.sevkler, restaurantId]
  );

  const gelenSevkler = useMemo(
    () => veriler.sevkler.filter(s => String(s.hedef_restaurant_id) === String(restaurantId)),
    [veriler.sevkler, restaurantId]
  );

  const kritikUrunSayisi = veriler.urunler.filter(u => sayi(u.stok_miktari) <= sayi(u.minimum_stok)).length;
  const stokDegeri = veriler.urunler.reduce((toplam, urun) => toplam + sayi(urun.stok_miktari) * sayi(urun.alis_fiyati), 0);
  const yoldakiGelen = gelenSevkler.filter(s => s.durum === 'Yolda').length;
  const hazirlananGiden = gidenSevkler.filter(s => s.durum === 'Hazırlanıyor').length;
  const bekleyenTalepSayisi = gelenTalepler.filter(t => t.durum === 'Bekliyor').length;
  const sktYaklasanLotlar = veriler.lotlar.filter(lot => lot.son_kullanma_tarihi && lot.son_kullanma_tarihi <= otuzGunSonra);

  const kalemleriBul = sevkId => veriler.sevkKalemleri.filter(k => String(k.sevk_id) === String(sevkId));

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

  const urunKaydet = async event => {
    event.preventDefault();
    if (!String(urunFormu.urunAdi || '').trim()) {
      mesajGoster('Ürün veya hammadde adını girin.', 'warning');
      return;
    }

    const basarili = await islemCalistir(
      () => depoUrunuKaydet(restaurantId, urunFormu, duzenlenenUrunId),
      duzenlenenUrunId ? 'Depo kartı güncellendi.' : 'Depo kartı oluşturuldu.'
    );
    if (basarili) {
      setUrunFormu(bosUrun);
      setDuzenlenenUrunId(null);
    }
  };

  const urunuDuzenle = urun => {
    setUrunFormu({
      barkod: urun.barkod || '',
      urunAdi: urun.urun_adi || '',
      stokKodu: urun.stok_kodu || '',
      kategori: urun.kategori || 'Genel',
      birim: urun.birim || 'Adet',
      alisFiyati: String(urun.alis_fiyati ?? ''),
      minimumStok: String(urun.minimum_stok ?? ''),
    });
    setDuzenlenenUrunId(urun.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const kaynakUrunuFormaAktar = kaynakUrun => {
    if (kaynakUrun.depoKarti) {
      urunuDuzenle(kaynakUrun.depoKarti);
      mesajGoster('Bu ürünün depo kartı zaten var; mevcut kart düzenlemeye açıldı.', 'info');
      return;
    }

    setDuzenlenenUrunId(null);
    setUrunFormu({
      barkod: kaynakUrun.barkod || '',
      urunAdi: kaynakUrun.urunAdi || '',
      stokKodu: kaynakUrun.stokKodu || '',
      kategori: kaynakUrun.kategori || 'Genel',
      birim: birimiDuzenle(kaynakUrun.birim),
      alisFiyati: String(kaynakUrun.alisFiyati ?? ''),
      minimumStok: String(kaynakUrun.minimumStok ?? ''),
    });
    mesajGoster(`${kaynakUrun.urunAdi} depo kartına hazırlandı. Bilgileri kontrol edip Kartı Kaydet'e basın.`, 'info');
  };

  const alisSatiriEkle = () => {
    const urun = veriler.urunler.find(u => String(u.id) === String(alisSatiri.urunId));
    const miktar = sayi(alisSatiri.miktar);
    const birimFiyat = sayi(alisSatiri.birimFiyat);
    if (!urun || miktar <= 0 || birimFiyat < 0) {
      mesajGoster('Alış kalemi için ürün, miktar ve alış fiyatını kontrol edin.', 'warning');
      return;
    }

    setAlisKalemleri(prev => {
      const lotNo = String(alisSatiri.lotNo || '').trim();
      const sonKullanmaTarihi = alisSatiri.sonKullanmaTarihi || '';
      const mevcut = prev.find(k => String(k.urunId) === String(urun.id)
        && String(k.lotNo || '') === lotNo
        && String(k.sonKullanmaTarihi || '') === sonKullanmaTarihi);
      if (mevcut) {
        return prev.map(k => k.satirAnahtari === mevcut.satirAnahtari
          ? { ...k, miktar: sayi(k.miktar) + miktar, birimFiyat }
          : k);
      }
      return [...prev, {
        satirAnahtari: `${urun.id}-${lotNo}-${sonKullanmaTarihi}-${Date.now()}`,
        urunId: urun.id,
        urunAdi: urun.urun_adi,
        birim: urun.birim,
        miktar,
        birimFiyat,
        lotNo,
        sonKullanmaTarihi,
      }];
    });
    setAlisSatiri({ urunId: '', miktar: '', birimFiyat: '', lotNo: '', sonKullanmaTarihi: '' });
  };

  const alisiKaydet = async () => {
    if (!String(alisFormu.tedarikciAdi || '').trim() || alisKalemleri.length === 0) {
      mesajGoster('Tedarikçi ve en az bir alış kalemi girin.', 'warning');
      return;
    }

    const basarili = await islemCalistir(
      () => depoAlisiKaydet(restaurantId, alisFormu, alisKalemleri),
      'Alış depoya işlendi ve merkez stok arttı.'
    );
    if (basarili) {
      setAlisFormu(bosAlis);
      setAlisKalemleri([]);
    }
  };

  const sevkSatiriEkle = () => {
    const urun = veriler.urunler.find(u => String(u.id) === String(sevkSatiri.urunId));
    const miktar = sayi(sevkSatiri.miktar);
    if (!urun || miktar <= 0) {
      mesajGoster('Sevk ürünü ve miktarını kontrol edin.', 'warning');
      return;
    }
    const mevcutToplam = sevkKalemleri
      .filter(k => String(k.urunId) === String(urun.id))
      .reduce((toplam, k) => toplam + sayi(k.miktar), 0);
    if (mevcutToplam + miktar > sayi(urun.stok_miktari)) {
      mesajGoster(`${urun.urun_adi} için depo stoğu yetersiz.`, 'warning');
      return;
    }

    setSevkKalemleri(prev => {
      const mevcut = prev.find(k => String(k.urunId) === String(urun.id));
      if (mevcut) {
        return prev.map(k => String(k.urunId) === String(urun.id)
          ? { ...k, miktar: sayi(k.miktar) + miktar }
          : k);
      }
      return [...prev, {
        urunId: urun.id,
        urunAdi: urun.urun_adi,
        birim: urun.birim,
        miktar,
      }];
    });
    setSevkSatiri({ urunId: '', miktar: '' });
  };

  const sevkiOlustur = async () => {
    if (!sevkFormu.hedefRestaurantId || sevkKalemleri.length === 0) {
      mesajGoster('Hedef işletme ve en az bir sevk kalemi seçin.', 'warning');
      return;
    }

    const basarili = await islemCalistir(
      () => depoSevkiOlustur(restaurantId, sevkFormu, sevkKalemleri),
      'Sevk hazırlama listesine alındı.'
    );
    if (basarili) {
      setSevkFormu(bosSevk);
      setSevkKalemleri([]);
      setAktifSekme('giden');
    }
  };

  const sevkIslemi = async (islem, sevk) => {
    const mesajlar = {
      gonder: 'Sevk yola çıkarıldı; miktarlar merkez depodan düşüldü.',
      teslim: `Sevk teslim alındı; ürünler ${sevk.hedef_stok_tipi === 'Market' ? 'market' : sevk.hedef_stok_tipi === 'Restoran Ürünü' ? 'restoran satış ürünü' : 'restoran hammadde'} stoğuna eklendi.`,
      iptal: 'Sevk iptal edildi; yola çıkmışsa ürünler depo stoğuna geri alındı.',
    };
    await islemCalistir(
      () => depoSevkDurumunuDegistir(islem, restaurantId, sevk.id),
      mesajlar[islem]
    );
  };

  const talepSatiriEkle = () => {
    const urun = seciliTalepDeposuUrunleri.find(u => String(u.id) === String(talepSatiri.urunId));
    const miktar = sayi(talepSatiri.miktar);
    if (!urun || miktar <= 0) {
      mesajGoster('Talep ürünü ve miktarını kontrol edin.', 'warning');
      return;
    }
    setTalepKalemleri(prev => {
      const mevcut = prev.find(k => String(k.urunId) === String(urun.id));
      if (mevcut) return prev.map(k => String(k.urunId) === String(urun.id) ? { ...k, miktar: sayi(k.miktar) + miktar } : k);
      return [...prev, { urunId: urun.id, urunAdi: urun.urun_adi, birim: urun.birim, miktar }];
    });
    setTalepSatiri({ urunId: '', miktar: '' });
  };

  const talepOlustur = async () => {
    if (!talepFormu.depoRestaurantId || talepKalemleri.length === 0) {
      mesajGoster('Merkez depo ve en az bir talep kalemi seçin.', 'warning');
      return;
    }
    const basarili = await islemCalistir(
      () => depoSevkTalebiOlustur(restaurantId, talepFormu, talepKalemleri),
      'Depo talebi merkeze gönderildi.'
    );
    if (basarili) {
      setTalepFormu({ depoRestaurantId: '', hedefStokTipi: 'Restoran', notMetni: '' });
      setTalepKalemleri([]);
    }
  };

  const talepIslemi = async (islem, talep) => {
    const basarili = await islemCalistir(
      () => islem === 'sevke_donustur'
        ? depoTalebiniSevkeDonustur(restaurantId, talep.id)
        : depoSevkTalebiniKapat(restaurantId, talep.id, islem === 'reddet' ? 'Reddedildi' : 'İptal'),
      islem === 'sevke_donustur'
        ? 'Talep sevk hazırlama listesine dönüştürüldü.'
        : islem === 'reddet' ? 'Talep reddedildi.' : 'Talep iptal edildi.'
    );
    if (basarili && islem === 'sevke_donustur') setAktifSekme('giden');
  };

  const hedefUrunSecenekleri = (hedefStokTipi) => {
    const kaynakTipi = hedefStokTipi === 'Market' ? 'market' : hedefStokTipi === 'Restoran Ürünü' ? 'menu' : 'stok';
    return veriler.kaynakUrunler.filter(urun => urun.kaynakTipi === kaynakTipi);
  };

  const teslimFormunuAc = sevk => {
    const satirlar = kalemleriBul(sevk.id).map(kalem => {
      const eslesme = veriler.eslesmeler.find(e => String(e.kaynak_depo_urun_id) === String(kalem.depo_urun_id)
        && e.hedef_stok_tipi === sevk.hedef_stok_tipi);
      return {
        kalemId: kalem.id,
        urunAdi: kalem.urun_adi,
        birim: kalem.birim,
        gonderilenMiktar: sayi(kalem.miktar),
        teslimAlinanMiktar: String(kalem.miktar),
        hasarliMiktar: '0',
        hedefUrunId: eslesme?.hedef_urun_id || '',
        teslimNotu: '',
      };
    });
    setTeslimFormlari(prev => ({ ...prev, [String(sevk.id)]: satirlar }));
    setAcikTeslimSevkId(sevk.id);
  };

  const teslimSatiriniGuncelle = (sevkId, kalemId, alan, deger) => {
    setTeslimFormlari(prev => ({
      ...prev,
      [String(sevkId)]: (prev[String(sevkId)] || []).map(kalem => String(kalem.kalemId) === String(kalemId) ? { ...kalem, [alan]: deger } : kalem),
    }));
  };

  const sevkiKismiTeslimAl = async sevk => {
    const satirlar = teslimFormlari[String(sevk.id)] || [];
    const gecersiz = satirlar.find(satir => {
      const teslim = sayi(satir.teslimAlinanMiktar);
      const hasarli = sayi(satir.hasarliMiktar);
      return teslim < 0 || hasarli < 0 || teslim + hasarli > sayi(satir.gonderilenMiktar);
    });
    if (gecersiz) {
      mesajGoster(`${gecersiz.urunAdi} için sağlam + hasarlı miktar gönderileni aşamaz.`, 'warning');
      return;
    }

    const basarili = await islemCalistir(
      () => depoSevkiniKismiTeslimAl(restaurantId, sevk.id, satirlar),
      'Teslim miktarları hedef stoğa işlendi; varsa fark kaydı oluşturuldu.'
    );
    if (basarili) {
      setAcikTeslimSevkId(null);
      setTeslimFormlari(prev => ({ ...prev, [String(sevk.id)]: [] }));
    }
  };

  const subeBagla = async () => {
    if (!String(baglantiKodu || '').trim()) {
      mesajGoster('Bağlanacak işletmenin depo kodunu girin.', 'warning');
      return;
    }
    const basarili = await islemCalistir(
      () => depoSubesiniBagla(restaurantId, baglantiKodu),
      'İşletme sevk listesine bağlandı.'
    );
    if (basarili) setBaglantiKodu('');
  };

  const hedefDegisti = hedefId => {
    const hedef = bagliSubeler.find(s => String(s.id) === String(hedefId));
    setSevkFormu(prev => ({
      ...prev,
      hedefRestaurantId: hedefId,
      hedefStokTipi: hedef?.isletmeTipi === 'Market' ? 'Market' : 'Restoran',
    }));
  };

  if (yukleniyor) {
    return <div className="depo-loading">Depo ve sevkiyat verileri hazırlanıyor…</div>;
  }

  return (
    <div className="depo-app">
      <header className="depo-header">
        <div>
          <span className="depo-eyebrow">ORTAK STOK VE LOJİSTİK</span>
          <h1>Depo & Şube Sevk</h1>
          <p>{restaurantName || 'İşletme'} merkez deposu, alış girişleri ve restoran/market teslimleri.</p>
        </div>
        <button type="button" className="depo-refresh" onClick={() => yenile()} disabled={islemYukleniyor}>
          ↻ Yenile
        </button>
      </header>

      {hata && (
        <div className="depo-alert">
          <strong>Kontrol gerekiyor</strong>
          <span>{hata}</span>
        </div>
      )}

      <nav className="depo-tabs">
        {[
          ['ozet', 'Özet'],
          ['urunler', 'Depo Stoku'],
          ['alis', 'Alış Girişi'],
          ['talepler', `Talepler ${bekleyenTalepSayisi ? `(${bekleyenTalepSayisi})` : ''}`],
          ['sevk', 'Yeni Sevk'],
          ['giden', `Giden ${hazirlananGiden ? `(${hazirlananGiden})` : ''}`],
          ['gelen', `Gelen ${yoldakiGelen ? `(${yoldakiGelen})` : ''}`],
          ['baglantilar', 'Şubeler'],
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={aktifSekme === key ? 'active' : ''}
            onClick={() => setAktifSekme(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {aktifSekme === 'ozet' && (
        <>
          <section className="depo-stats">
            <article><span>Depo kartı</span><strong>{veriler.urunler.length}</strong><small>aktif ürün / hammadde</small></article>
            <article><span>Stok maliyeti</span><strong>{para(stokDegeri)} TL</strong><small>mevcut alış maliyetiyle</small></article>
            <article className={kritikUrunSayisi ? 'warning' : ''}><span>Kritik stok</span><strong>{kritikUrunSayisi}</strong><small>tamamlanması gereken kart</small></article>
            <article className={yoldakiGelen ? 'accent' : ''}><span>Onay bekleyen</span><strong>{yoldakiGelen}</strong><small>şubeye gelen sevk</small></article>
            <article className={sktYaklasanLotlar.length ? 'warning' : ''}><span>SKT yaklaşan</span><strong>{sktYaklasanLotlar.length}</strong><small>30 gün içinde / geçmiş lot</small></article>
          </section>
          <section className="depo-grid-two">
            <div className="depo-card">
              <div className="depo-card-title">
                <div><h2>İşlem akışı</h2><p>Stok iki ayrı aşamada güvenli biçimde hareket eder.</p></div>
              </div>
              <ol className="depo-flow">
                <li><b>1</b><div><strong>Depoya alış</strong><span>Fatura girildiğinde merkez depo stoğu artar.</span></div></li>
                <li><b>2</b><div><strong>Şube talep etsin</strong><span>Bağlı işletme ihtiyaç listesini merkeze gönderir.</span></div></li>
                <li><b>3</b><div><strong>Sevk hazırla ve gönder</strong><span>Gönderildiğinde miktar merkez depodan düşer.</span></div></li>
                <li><b>4</b><div><strong>Şube kontrollü teslim alsın</strong><span>Sağlam, hasarlı ve eksik ayrı girilir; yalnız sağlam miktar stoğa eklenir.</span></div></li>
                <li><b>5</b><div><strong>Satışta otomatik düşsün</strong><span>Market satışları üründen, restoran satışları reçete hammaddesinden düşmeye devam eder.</span></div></li>
              </ol>
            </div>
            <div className="depo-card">
              <div className="depo-card-title">
                <div><h2>Son hareketler</h2><p>Alış ve sevkiyatların kısa özeti.</p></div>
              </div>
              <div className="depo-activity">
                {veriler.sevkler.slice(0, 5).map(sevk => (
                  <div key={sevk.id}>
                    <span className={`depo-status ${String(sevk.durum).toLocaleLowerCase('tr-TR').replaceAll(' ', '-')}`}>{sevk.durum}</span>
                    <div><strong>{sevk.sevk_no}</strong><small>{sevk.kaynak_adi} → {sevk.hedef_adi}</small></div>
                    <time>{tarihSaat(sevk.created_at)}</time>
                  </div>
                ))}
                {veriler.sevkler.length === 0 && <div className="depo-empty">Henüz sevkiyat kaydı yok.</div>}
              </div>
            </div>
          </section>
        </>
      )}

      {aktifSekme === 'urunler' && (
        <section className="depo-card">
          <div className="depo-card-title">
            <div><h2>Depo ürün ve hammadde kartları</h2><p>Market ürünü veya restoran hammaddesi aynı merkez listede tutulabilir.</p></div>
          </div>
          <div className="depo-source-picker">
            <div className="depo-source-heading">
              <div>
                <strong>Kayıtlı karttan seç</strong>
                <span>Restoran ürünü, hammadde veya market kartını arayıp depo formuna aktarın.</span>
              </div>
              <b>{veriler.kaynakUrunler.length} kaynak kart</b>
            </div>
            <div className="depo-search source-search">
              <span>⌕</span>
              <input
                value={kaynakArama}
                onChange={e => setKaynakArama(e.target.value)}
                placeholder="Ürün adı, barkod, stok kodu veya kategori ara…"
              />
            </div>
            <div className="depo-source-results">
              {filtreliKaynakUrunler.map(urun => (
                <button type="button" key={urun.secimId} onClick={() => kaynakUrunuFormaAktar(urun)}>
                  <span>
                    <strong>{urun.urunAdi}</strong>
                    <small>{urun.kaynakBasligi} · {urun.kategori} · {urun.mevcutStok.toLocaleString('tr-TR')} {urun.birim}</small>
                  </span>
                  <b className={urun.depoKarti ? 'saved' : ''}>{urun.depoKarti ? 'Depoda kayıtlı' : 'Forma aktar'}</b>
                </button>
              ))}
              {filtreliKaynakUrunler.length === 0 && (
                <div className="depo-empty">Aramaya uygun restoran, stok veya market kartı bulunamadı.</div>
              )}
            </div>
            {veriler.kaynakUrunHatalari.length > 0 && (
              <small className="depo-source-warning">Bazı kaynak listeleri alınamadı: {veriler.kaynakUrunHatalari.join(' · ')}</small>
            )}
          </div>
          <form className="depo-form-grid" onSubmit={urunKaydet}>
            <input value={urunFormu.barkod} onChange={e => setUrunFormu(p => ({ ...p, barkod: e.target.value }))} placeholder="Barkod (isteğe bağlı)" />
            <input value={urunFormu.urunAdi} onChange={e => setUrunFormu(p => ({ ...p, urunAdi: e.target.value }))} placeholder="Ürün / hammadde adı *" />
            <input value={urunFormu.stokKodu} onChange={e => setUrunFormu(p => ({ ...p, stokKodu: e.target.value }))} placeholder="Stok kodu" />
            <input value={urunFormu.kategori} onChange={e => setUrunFormu(p => ({ ...p, kategori: e.target.value }))} placeholder="Kategori" />
            <select value={urunFormu.birim} onChange={e => setUrunFormu(p => ({ ...p, birim: e.target.value }))}>
              {['Adet', 'Kg', 'Gram', 'Litre', 'Paket', 'Koli'].map(birim => <option key={birim}>{birim}</option>)}
            </select>
            <input type="number" min="0" step="0.01" value={urunFormu.alisFiyati} onChange={e => setUrunFormu(p => ({ ...p, alisFiyati: e.target.value }))} placeholder="Alış fiyatı" />
            <input type="number" min="0" step="0.001" value={urunFormu.minimumStok} onChange={e => setUrunFormu(p => ({ ...p, minimumStok: e.target.value }))} placeholder="Kritik stok" />
            <div className="depo-form-actions">
              <button className="primary" type="submit" disabled={islemYukleniyor}>{duzenlenenUrunId ? 'Güncelle' : 'Kartı Kaydet'}</button>
              {duzenlenenUrunId && <button type="button" onClick={() => { setDuzenlenenUrunId(null); setUrunFormu(bosUrun); }}>Vazgeç</button>}
            </div>
          </form>

          <div className="depo-search">
            <span>⌕</span>
            <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Ürün, barkod, stok kodu veya kategori ara…" />
          </div>
          <div className="depo-table-wrap">
            <table className="depo-table">
              <thead><tr><th>Ürün</th><th>Barkod / Kod</th><th>Birim</th><th>Alış</th><th>Stok</th><th>Kritik</th><th></th></tr></thead>
              <tbody>
                {filtreliUrunler.map(urun => (
                  <tr key={urun.id} className={sayi(urun.stok_miktari) <= sayi(urun.minimum_stok) ? 'critical' : ''}>
                    <td><strong>{urun.urun_adi}</strong><small>{urun.kategori || 'Genel'}</small></td>
                    <td>{urun.barkod || '-'}<small>{urun.stok_kodu || ''}</small></td>
                    <td>{urun.birim}</td>
                    <td>{para(urun.alis_fiyati)} TL</td>
                    <td><b>{sayi(urun.stok_miktari).toLocaleString('tr-TR')} {urun.birim}</b></td>
                    <td>{sayi(urun.minimum_stok).toLocaleString('tr-TR')}</td>
                    <td><button type="button" className="table-action" onClick={() => urunuDuzenle(urun)}>Düzenle</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtreliUrunler.length === 0 && <div className="depo-empty">Aramaya uygun depo kartı bulunamadı.</div>}
          </div>
        </section>
      )}

      {aktifSekme === 'alis' && (
        <section className="depo-grid-two purchase-layout">
          <div className="depo-card">
            <div className="depo-card-title"><div><h2>Depoya alış girişi</h2><p>Kaydedilen miktarlar merkez stoğa eklenir.</p></div></div>
            <div className="depo-form-grid compact">
              <input value={alisFormu.tedarikciAdi} onChange={e => setAlisFormu(p => ({ ...p, tedarikciAdi: e.target.value }))} placeholder="Tedarikçi *" />
              <input value={alisFormu.faturaNo} onChange={e => setAlisFormu(p => ({ ...p, faturaNo: e.target.value }))} placeholder="Fatura / irsaliye no" />
              <input type="date" value={alisFormu.faturaTarihi} onChange={e => setAlisFormu(p => ({ ...p, faturaTarihi: e.target.value }))} />
              <input value={alisFormu.notMetni} onChange={e => setAlisFormu(p => ({ ...p, notMetni: e.target.value }))} placeholder="Açıklama" />
            </div>
            {veriler.urunler.length === 0 && (
              <div className="depo-empty action-empty">
                Alış kalemi seçebilmek için önce <button type="button" onClick={() => setAktifSekme('urunler')}>Depo Stoku</button> bölümünden kayıtlı bir ürün veya hammaddeyi depo kartına aktarın.
              </div>
            )}
            <div className="depo-line-entry">
              <select value={alisSatiri.urunId} onChange={e => {
                const urun = veriler.urunler.find(u => String(u.id) === String(e.target.value));
                setAlisSatiri({ urunId: e.target.value, miktar: '', birimFiyat: String(urun?.alis_fiyati ?? ''), lotNo: '', sonKullanmaTarihi: '' });
              }}>
                <option value="">Depo kartı seçin</option>
                {veriler.urunler.map(urun => <option key={urun.id} value={urun.id}>{urun.urun_adi} · {sayi(urun.stok_miktari)} {urun.birim}</option>)}
              </select>
              <input type="number" min="0.001" step="0.001" value={alisSatiri.miktar} onChange={e => setAlisSatiri(p => ({ ...p, miktar: e.target.value }))} placeholder="Miktar" />
              <input type="number" min="0" step="0.01" value={alisSatiri.birimFiyat} onChange={e => setAlisSatiri(p => ({ ...p, birimFiyat: e.target.value }))} placeholder="Birim alış" />
              <input value={alisSatiri.lotNo} onChange={e => setAlisSatiri(p => ({ ...p, lotNo: e.target.value }))} placeholder="Lot no (isteğe bağlı)" />
              <input type="date" value={alisSatiri.sonKullanmaTarihi} onChange={e => setAlisSatiri(p => ({ ...p, sonKullanmaTarihi: e.target.value }))} title="Son kullanma tarihi" />
              <button type="button" onClick={alisSatiriEkle}>+ Kalem</button>
            </div>
            <div className="depo-lines">
              {alisKalemleri.map((kalem, index) => (
                <div key={kalem.satirAnahtari || `${kalem.urunId}-${index}`}><span><strong>{kalem.urunAdi}</strong><small>{kalem.miktar} {kalem.birim} × {para(kalem.birimFiyat)} TL{kalem.lotNo ? ` · Lot ${kalem.lotNo}` : ''}{kalem.sonKullanmaTarihi ? ` · SKT ${kalem.sonKullanmaTarihi}` : ''}</small></span><b>{para(kalem.miktar * kalem.birimFiyat)} TL</b><button type="button" onClick={() => setAlisKalemleri(p => p.filter((_, i) => i !== index))}>×</button></div>
              ))}
            </div>
            <div className="depo-total"><span>Alış toplamı</span><strong>{para(alisKalemleri.reduce((t, k) => t + k.miktar * k.birimFiyat, 0))} TL</strong></div>
            <button type="button" className="depo-wide primary" disabled={islemYukleniyor || alisKalemleri.length === 0} onClick={alisiKaydet}>Alışı Kaydet ve Depoya İşle</button>
          </div>
          <div className="depo-card">
            <div className="depo-card-title"><div><h2>Son alışlar</h2><p>Depoya işlenen fatura ve irsaliyeler.</p></div></div>
            <div className="depo-history">
              {veriler.alislar.map(alis => <div key={alis.id}><span><strong>{alis.tedarikci_adi}</strong><small>{alis.fatura_no || 'Belge no yok'} · {alis.fatura_tarihi}</small></span><b>{para(alis.genel_toplam)} TL</b></div>)}
              {veriler.alislar.length === 0 && <div className="depo-empty">Henüz depo alışı girilmedi.</div>}
            </div>
            <div className="depo-card-title lot-heading"><div><h2>Lot / SKT takibi</h2><p>Son kullanma tarihi yaklaşan mevcut depo partileri.</p></div></div>
            <div className="depo-history depo-lot-list">
              {sktYaklasanLotlar.slice(0, 20).map(lot => {
                const urun = veriler.urunler.find(u => String(u.id) === String(lot.depo_urun_id));
                const gecmis = lot.son_kullanma_tarihi < bugununTarihi;
                return <div key={lot.id} className={gecmis ? 'expired' : ''}><span><strong>{urun?.urun_adi || 'Depo ürünü'}</strong><small>{lot.lot_no || 'Lot no yok'} · SKT {lot.son_kullanma_tarihi}</small></span><b>{sayi(lot.kalan_miktar)} {urun?.birim || ''}</b></div>;
              })}
              {sktYaklasanLotlar.length === 0 && <div className="depo-empty">30 gün içinde son kullanma tarihi yaklaşan lot yok.</div>}
            </div>
          </div>
        </section>
      )}

      {aktifSekme === 'talepler' && (
        <section className="depo-request-layout">
          <div className="depo-card">
            <div className="depo-card-title"><div><h2>Merkez depodan ürün iste</h2><p>Şube ihtiyaç listesini hazırlar; merkez onayladığında sevk oluşur.</p></div></div>
            {bagliDepolar.length === 0 ? (
              <div className="depo-empty action-empty">Talep gönderebilmek için merkez deponun sizi <button type="button" onClick={() => setAktifSekme('baglantilar')}>Şubeler</button> bölümünden bağlaması gerekir.</div>
            ) : (
              <>
                <div className="depo-form-grid compact">
                  <select value={talepFormu.depoRestaurantId} onChange={e => { setTalepFormu(p => ({ ...p, depoRestaurantId: e.target.value })); setTalepKalemleri([]); setTalepSatiri({ urunId: '', miktar: '' }); }}>
                    <option value="">Merkez depo seçin</option>
                    {bagliDepolar.map(depo => <option key={depo.id} value={depo.id}>{depo.ad}</option>)}
                  </select>
                  <select value={talepFormu.hedefStokTipi} onChange={e => setTalepFormu(p => ({ ...p, hedefStokTipi: e.target.value }))}>
                    <option value="Restoran">Restoran hammaddesi stoğu</option>
                    <option value="Restoran Ürünü">Restoran satış ürünü stoğu</option>
                    <option value="Market">Market ürün stoğu</option>
                  </select>
                  <input value={talepFormu.notMetni} onChange={e => setTalepFormu(p => ({ ...p, notMetni: e.target.value }))} placeholder="Talep notu / ihtiyaç tarihi" />
                </div>
                <div className="depo-line-entry shipment">
                  <select value={talepSatiri.urunId} onChange={e => setTalepSatiri(p => ({ ...p, urunId: e.target.value }))} disabled={!talepFormu.depoRestaurantId}>
                    <option value="">Merkez depo ürünü seçin</option>
                    {seciliTalepDeposuUrunleri.map(urun => <option key={urun.id} value={urun.id}>{urun.urun_adi} · Depoda {sayi(urun.stok_miktari)} {urun.birim}</option>)}
                  </select>
                  <input type="number" min="0.001" step="0.001" value={talepSatiri.miktar} onChange={e => setTalepSatiri(p => ({ ...p, miktar: e.target.value }))} placeholder="İstenen miktar" />
                  <button type="button" onClick={talepSatiriEkle}>+ Talebe Ekle</button>
                </div>
                <div className="depo-lines">
                  {talepKalemleri.map((kalem, index) => <div key={kalem.urunId}><span><strong>{kalem.urunAdi}</strong><small>{kalem.miktar} {kalem.birim}</small></span><button type="button" onClick={() => setTalepKalemleri(p => p.filter((_, i) => i !== index))}>×</button></div>)}
                </div>
                <button type="button" className="depo-wide primary" disabled={islemYukleniyor || talepKalemleri.length === 0} onClick={talepOlustur}>Talebi Merkez Depoya Gönder</button>
              </>
            )}
          </div>

          <div className="depo-grid-two">
            <div className="depo-card">
              <div className="depo-card-title"><div><h2>Depoma gelen talepler</h2><p>Bağlı şubelerin bekleyen ihtiyaç listeleri.</p></div></div>
              <div className="depo-shipments single-column">
                {gelenTalepler.map(talep => <article key={talep.id} className={talep.durum === 'Bekliyor' ? 'incoming' : ''}>
                  <header><div><strong>{talep.talep_no}</strong><span>{talep.talep_eden_adi}</span></div><span className="depo-status">{talep.durum}</span></header>
                  <div className="depo-shipment-meta"><span>Hedef: <b>{talep.hedef_stok_tipi}</b></span><span>{tarihSaat(talep.created_at)}</span></div>
                  <div className="depo-shipment-lines">{talepKalemleriniBul(talep.id).map(k => <span key={k.id}>{k.urun_adi} <b>{sayi(k.talep_miktari)} {k.birim}</b></span>)}</div>
                  {talep.not_metni && <p>{talep.not_metni}</p>}
                  {talep.durum === 'Bekliyor' && <footer><button type="button" className="primary" disabled={islemYukleniyor} onClick={() => talepIslemi('sevke_donustur', talep)}>Sevke Dönüştür</button><button type="button" className="danger" disabled={islemYukleniyor} onClick={() => talepIslemi('reddet', talep)}>Reddet</button></footer>}
                </article>)}
                {gelenTalepler.length === 0 && <div className="depo-empty">Merkez depoya gelen talep yok.</div>}
              </div>
            </div>

            <div className="depo-card">
              <div className="depo-card-title"><div><h2>Gönderdiğim talepler</h2><p>Merkezin yanıtını ve oluşan sevki izleyin.</p></div></div>
              <div className="depo-shipments single-column">
                {gidenTalepler.map(talep => <article key={talep.id}>
                  <header><div><strong>{talep.talep_no}</strong><span>{talep.depo_adi}</span></div><span className="depo-status">{talep.durum}</span></header>
                  <div className="depo-shipment-meta"><span>Hedef: <b>{talep.hedef_stok_tipi}</b></span><span>{tarihSaat(talep.created_at)}</span></div>
                  <div className="depo-shipment-lines">{talepKalemleriniBul(talep.id).map(k => <span key={k.id}>{k.urun_adi} <b>{sayi(k.talep_miktari)} {k.birim}</b></span>)}</div>
                  {talep.sevk_id && <p>Sevk kaydı hazırlandı: {String(talep.sevk_id).slice(0, 8)}</p>}
                  {talep.cevap_notu && <p>{talep.cevap_notu}</p>}
                  {talep.durum === 'Bekliyor' && <footer><button type="button" className="danger" disabled={islemYukleniyor} onClick={() => talepIslemi('iptal', talep)}>Talebi İptal Et</button></footer>}
                </article>)}
                {gidenTalepler.length === 0 && <div className="depo-empty">Henüz merkeze gönderilmiş talep yok.</div>}
              </div>
            </div>
          </div>
        </section>
      )}

      {aktifSekme === 'sevk' && (
        <section className="depo-card">
          <div className="depo-card-title">
            <div><h2>Şubeye sevk hazırla</h2><p>Önce kayıt oluşur; “Gönder” denildiğinde merkez stoktan düşer.</p></div>
          </div>
          {bagliSubeler.length === 0 ? (
            <div className="depo-empty action-empty">
              Sevk yapabilmek için önce <button type="button" onClick={() => setAktifSekme('baglantilar')}>Şubeler</button> bölümünden hedef işletmenin kodunu bağlayın.
            </div>
          ) : (
            <>
              <div className="depo-form-grid compact">
                <select value={sevkFormu.hedefRestaurantId} onChange={e => hedefDegisti(e.target.value)}>
                  <option value="">Hedef restoran / market seçin</option>
                  {bagliSubeler.map(sube => <option key={sube.id} value={sube.id}>{sube.ad} · {sube.isletmeTipi}</option>)}
                </select>
                <select value={sevkFormu.hedefStokTipi} onChange={e => setSevkFormu(p => ({ ...p, hedefStokTipi: e.target.value }))}>
                  <option value="Restoran">Restoran hammaddesi stoğu</option>
                  <option value="Restoran Ürünü">Restoran satış ürünü stoğu</option>
                  <option value="Market">Market ürün stoğu</option>
                </select>
                <input value={sevkFormu.notMetni} onChange={e => setSevkFormu(p => ({ ...p, notMetni: e.target.value }))} placeholder="Sevk notu / araç / teslim edecek kişi" />
              </div>
              <div className="depo-line-entry shipment">
                <select value={sevkSatiri.urunId} onChange={e => setSevkSatiri(p => ({ ...p, urunId: e.target.value }))}>
                  <option value="">Depodan sevk edilecek kart</option>
                  {veriler.urunler.filter(u => sayi(u.stok_miktari) > 0).map(urun => <option key={urun.id} value={urun.id}>{urun.urun_adi} · Depoda {sayi(urun.stok_miktari)} {urun.birim}</option>)}
                </select>
                <input type="number" min="0.001" step="0.001" value={sevkSatiri.miktar} onChange={e => setSevkSatiri(p => ({ ...p, miktar: e.target.value }))} placeholder="Sevk miktarı" />
                <button type="button" onClick={sevkSatiriEkle}>+ Sevke Ekle</button>
              </div>
              <div className="depo-lines">
                {sevkKalemleri.map((kalem, index) => (
                  <div key={kalem.urunId}><span><strong>{kalem.urunAdi}</strong><small>{kalem.miktar} {kalem.birim}</small></span><button type="button" onClick={() => setSevkKalemleri(p => p.filter((_, i) => i !== index))}>×</button></div>
                ))}
              </div>
              <button type="button" className="depo-wide primary" disabled={islemYukleniyor || sevkKalemleri.length === 0} onClick={sevkiOlustur}>Sevk Listesini Oluştur</button>
            </>
          )}
        </section>
      )}

      {aktifSekme === 'giden' && (
        <section className="depo-card">
          <div className="depo-card-title"><div><h2>Giden sevkiyatlar</h2><p>Hazırlanan sevki gönderin veya hareket geçmişini inceleyin.</p></div></div>
          <div className="depo-shipments">
            {gidenSevkler.map(sevk => (
              <article key={sevk.id}>
                <header><div><strong>{sevk.sevk_no}</strong><span>{sevk.hedef_adi}</span></div><span className={`depo-status ${String(sevk.durum).toLocaleLowerCase('tr-TR').replaceAll(' ', '-')}`}>{sevk.durum}</span></header>
                <div className="depo-shipment-meta"><span>Hedef: <b>{sevk.hedef_stok_tipi} stoğu</b></span><span>Oluşturma: <b>{tarihSaat(sevk.created_at)}</b></span>{sevk.gonderim_tarihi && <span>Gönderim: <b>{tarihSaat(sevk.gonderim_tarihi)}</b></span>}</div>
                <div className="depo-shipment-lines">{kalemleriBul(sevk.id).map(k => <span key={k.id}>{k.urun_adi} <b>{sayi(k.miktar)} {k.birim}</b></span>)}</div>
                {sevk.not_metni && <p>{sevk.not_metni}</p>}
                <footer>
                  {sevk.durum === 'Hazırlanıyor' && <button type="button" className="primary" disabled={islemYukleniyor} onClick={() => sevkIslemi('gonder', sevk)}>Sevki Gönder</button>}
                  {['Hazırlanıyor', 'Yolda'].includes(sevk.durum) && <button type="button" className="danger" disabled={islemYukleniyor} onClick={() => sevkIslemi('iptal', sevk)}>İptal Et</button>}
                </footer>
              </article>
            ))}
            {gidenSevkler.length === 0 && <div className="depo-empty">Giden sevkiyat bulunmuyor.</div>}
          </div>
        </section>
      )}

      {aktifSekme === 'gelen' && (
        <section className="depo-card">
          <div className="depo-card-title"><div><h2>Gelen sevkiyatlar</h2><p>Fiziksel teslimden sonra onaylayın; hedef stok ancak bu anda artar.</p></div></div>
          <div className="depo-shipments">
            {gelenSevkler.map(sevk => (
              <article key={sevk.id} className={sevk.durum === 'Yolda' ? 'incoming' : ''}>
                <header><div><strong>{sevk.sevk_no}</strong><span>{sevk.kaynak_adi}</span></div><span className={`depo-status ${String(sevk.durum).toLocaleLowerCase('tr-TR').replaceAll(' ', '-')}`}>{sevk.durum}</span></header>
                <div className="depo-shipment-meta"><span>İşlenecek yer: <b>{sevk.hedef_stok_tipi} stoğu</b></span><span>Gönderim: <b>{tarihSaat(sevk.gonderim_tarihi)}</b></span></div>
                <div className="depo-shipment-lines">{kalemleriBul(sevk.id).map(k => <span key={k.id}>{k.urun_adi} <b>{sayi(k.miktar)} {k.birim}</b>{k.teslim_alinan_miktar != null && <small> · sağlam {sayi(k.teslim_alinan_miktar)} · hasarlı {sayi(k.hasarli_miktar)} · eksik {sayi(k.eksik_miktar)}</small>}</span>)}</div>
                {sevk.durum === 'Yolda' && String(acikTeslimSevkId) !== String(sevk.id) && <footer><button type="button" className="success" disabled={islemYukleniyor} onClick={() => teslimFormunuAc(sevk)}>Teslimatı Kontrol Et</button></footer>}
                {sevk.durum === 'Yolda' && String(acikTeslimSevkId) === String(sevk.id) && (
                  <div className="depo-receive-form">
                    <div className="depo-receive-head"><strong>Fiili teslim miktarları</strong><span>Sağlam miktar stoğa girer; eksik otomatik hesaplanır.</span></div>
                    {(teslimFormlari[String(sevk.id)] || []).map(satir => {
                      const eksik = Math.max(sayi(satir.gonderilenMiktar) - sayi(satir.teslimAlinanMiktar) - sayi(satir.hasarliMiktar), 0);
                      return <div className="depo-receive-line" key={satir.kalemId}>
                        <div className="depo-receive-product"><strong>{satir.urunAdi}</strong><small>Gönderilen: {satir.gonderilenMiktar} {satir.birim}</small></div>
                        <label>Sağlam<input type="number" min="0" max={satir.gonderilenMiktar} step="0.001" value={satir.teslimAlinanMiktar} onChange={e => teslimSatiriniGuncelle(sevk.id, satir.kalemId, 'teslimAlinanMiktar', e.target.value)} /></label>
                        <label>Hasarlı<input type="number" min="0" max={satir.gonderilenMiktar} step="0.001" value={satir.hasarliMiktar} onChange={e => teslimSatiriniGuncelle(sevk.id, satir.kalemId, 'hasarliMiktar', e.target.value)} /></label>
                        <label>Eksik<input value={eksik} readOnly /></label>
                        <label className="target-product">Hedef stok kartı<select value={satir.hedefUrunId} onChange={e => teslimSatiriniGuncelle(sevk.id, satir.kalemId, 'hedefUrunId', e.target.value)}><option value="">Otomatik eşleştir / oluştur</option>{hedefUrunSecenekleri(sevk.hedef_stok_tipi).map(urun => <option key={urun.secimId} value={urun.kaynakId}>{urun.urunAdi} · {urun.kaynakBasligi}</option>)}</select></label>
                        <label className="receive-note">Teslim notu<input value={satir.teslimNotu} onChange={e => teslimSatiriniGuncelle(sevk.id, satir.kalemId, 'teslimNotu', e.target.value)} placeholder="Hasar / eksik açıklaması" /></label>
                      </div>;
                    })}
                    <footer><button type="button" onClick={() => setAcikTeslimSevkId(null)}>Vazgeç</button><button type="button" className="success" disabled={islemYukleniyor} onClick={() => sevkiKismiTeslimAl(sevk)}>Teslimi Onayla ve Stoğa İşle</button></footer>
                  </div>
                )}
              </article>
            ))}
            {gelenSevkler.length === 0 && <div className="depo-empty">Bu işletmeye gelen sevkiyat bulunmuyor.</div>}
          </div>
          <div className="depo-card-title difference-heading"><div><h2>Teslimat fark raporu</h2><p>Eksik veya hasarlı gelen kalemler tek listede tutulur.</p></div></div>
          <div className="depo-table-wrap">
            <table className="depo-table difference-table">
              <thead><tr><th>Tarih</th><th>Ürün</th><th>Gönderilen</th><th>Sağlam</th><th>Hasarlı</th><th>Eksik</th><th>Açıklama</th></tr></thead>
              <tbody>{veriler.teslimatFarklari.map(fark => <tr key={fark.id}><td>{tarihSaat(fark.created_at)}</td><td><strong>{fark.urun_adi}</strong></td><td>{sayi(fark.gonderilen_miktar)}</td><td>{sayi(fark.teslim_alinan_miktar)}</td><td>{sayi(fark.hasarli_miktar)}</td><td><b>{sayi(fark.eksik_miktar)}</b></td><td>{fark.aciklama || '-'}</td></tr>)}</tbody>
            </table>
            {veriler.teslimatFarklari.length === 0 && <div className="depo-empty">Kayıtlı eksik veya hasarlı teslimat yok.</div>}
          </div>
        </section>
      )}

      {aktifSekme === 'baglantilar' && (
        <section className="depo-grid-two">
          <div className="depo-card">
            <div className="depo-card-title"><div><h2>İşletme kodunuz</h2><p>Merkez depo sizi bağlayacaksa bu kodu paylaşın.</p></div></div>
            <div className="depo-code">
              <strong>{veriler.baglantiKodu || 'Kod hazırlanamadı'}</strong>
              <button type="button" onClick={() => navigator.clipboard?.writeText(veriler.baglantiKodu || '')}>Kopyala</button>
            </div>
            <small className="depo-note">Kod yalnızca işletmeler arası stok sevki bağlantısı kurar; kullanıcı adı veya parola içermez.</small>
          </div>
          <div className="depo-card">
            <div className="depo-card-title"><div><h2>Restoran / market bağla</h2><p>Hedef işletmeden aldığı kodu merkez depo burada girer.</p></div></div>
            {userRole === 'owner' ? (
              <div className="depo-connect">
                <input value={baglantiKodu} onChange={e => setBaglantiKodu(e.target.value.toUpperCase())} placeholder="Örn. A1B2C3D4E5" maxLength={10} />
                <button type="button" className="primary" disabled={islemYukleniyor} onClick={subeBagla}>İşletmeyi Bağla</button>
              </div>
            ) : (
              <div className="depo-empty">Yeni işletme bağlantısını işletme sahibi kurabilir.</div>
            )}
          </div>
          <div className="depo-card depo-span-two">
            <div className="depo-card-title"><div><h2>Bağlı işletmeler</h2><p>Bu merkez depodan sevk yapılabilecek şubeler.</p></div></div>
            <div className="depo-branches">
              {bagliSubeler.map(sube => <div key={sube.id}><span>🏢</span><div><strong>{sube.ad}</strong><small>{sube.isletmeTipi} · İşletme #{sube.id}</small></div><b>Aktif</b></div>)}
              {bagliSubeler.length === 0 && <div className="depo-empty">Henüz bağlı restoran veya market yok.</div>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
