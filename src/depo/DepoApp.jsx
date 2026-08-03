import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  depoAlisiKaydet,
  depoSevkDurumunuDegistir,
  depoSevkiOlustur,
  depoSubesiniBagla,
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
  const [aktifSekme, setAktifSekme] = useState('ozet');
  const [veriler, setVeriler] = useState({
    urunler: [],
    alislar: [],
    sevkler: [],
    sevkKalemleri: [],
    baglantilar: [],
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
  const [alisSatiri, setAlisSatiri] = useState({ urunId: '', miktar: '', birimFiyat: '' });
  const [sevkFormu, setSevkFormu] = useState(bosSevk);
  const [sevkKalemleri, setSevkKalemleri] = useState([]);
  const [sevkSatiri, setSevkSatiri] = useState({ urunId: '', miktar: '' });
  const [baglantiKodu, setBaglantiKodu] = useState('');

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
      const mevcut = prev.find(k => String(k.urunId) === String(urun.id));
      if (mevcut) {
        return prev.map(k => String(k.urunId) === String(urun.id)
          ? { ...k, miktar: sayi(k.miktar) + miktar, birimFiyat }
          : k);
      }
      return [...prev, {
        urunId: urun.id,
        urunAdi: urun.urun_adi,
        birim: urun.birim,
        miktar,
        birimFiyat,
      }];
    });
    setAlisSatiri({ urunId: '', miktar: '', birimFiyat: '' });
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
          </section>
          <section className="depo-grid-two">
            <div className="depo-card">
              <div className="depo-card-title">
                <div><h2>İşlem akışı</h2><p>Stok iki ayrı aşamada güvenli biçimde hareket eder.</p></div>
              </div>
              <ol className="depo-flow">
                <li><b>1</b><div><strong>Depoya alış</strong><span>Fatura girildiğinde merkez depo stoğu artar.</span></div></li>
                <li><b>2</b><div><strong>Sevk hazırla ve gönder</strong><span>Gönderildiğinde miktar merkez depodan düşer.</span></div></li>
                <li><b>3</b><div><strong>Şube teslim alsın</strong><span>Onaydan sonra hedef restoran veya market stoğu artar.</span></div></li>
                <li><b>4</b><div><strong>Satışta otomatik düşsün</strong><span>Market satışları üründen, restoran satışları reçete hammaddesinden düşmeye devam eder.</span></div></li>
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
                setAlisSatiri({ urunId: e.target.value, miktar: '', birimFiyat: String(urun?.alis_fiyati ?? '') });
              }}>
                <option value="">Depo kartı seçin</option>
                {veriler.urunler.map(urun => <option key={urun.id} value={urun.id}>{urun.urun_adi} · {sayi(urun.stok_miktari)} {urun.birim}</option>)}
              </select>
              <input type="number" min="0.001" step="0.001" value={alisSatiri.miktar} onChange={e => setAlisSatiri(p => ({ ...p, miktar: e.target.value }))} placeholder="Miktar" />
              <input type="number" min="0" step="0.01" value={alisSatiri.birimFiyat} onChange={e => setAlisSatiri(p => ({ ...p, birimFiyat: e.target.value }))} placeholder="Birim alış" />
              <button type="button" onClick={alisSatiriEkle}>+ Kalem</button>
            </div>
            <div className="depo-lines">
              {alisKalemleri.map((kalem, index) => (
                <div key={kalem.urunId}><span><strong>{kalem.urunAdi}</strong><small>{kalem.miktar} {kalem.birim} × {para(kalem.birimFiyat)} TL</small></span><b>{para(kalem.miktar * kalem.birimFiyat)} TL</b><button type="button" onClick={() => setAlisKalemleri(p => p.filter((_, i) => i !== index))}>×</button></div>
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
                <div className="depo-shipment-lines">{kalemleriBul(sevk.id).map(k => <span key={k.id}>{k.urun_adi} <b>{sayi(k.miktar)} {k.birim}</b></span>)}</div>
                {sevk.durum === 'Yolda' && <footer><button type="button" className="success" disabled={islemYukleniyor} onClick={() => sevkIslemi('teslim', sevk)}>Teslim Al ve Stoğa İşle</button></footer>}
              </article>
            ))}
            {gelenSevkler.length === 0 && <div className="depo-empty">Bu işletmeye gelen sevkiyat bulunmuyor.</div>}
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
