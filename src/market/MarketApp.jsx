import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  marketAlisFaturasiKaydet,
  marketCariKaydet,
  marketGrubuKaydet,
  marketSayimiKaydet,
  marketSatisiKaydet,
  marketUrunStokFiyatGuncelle,
  marketUrunuKaydet,
  marketVerileriniGetir,
} from '../services/marketService';
import './market.css';

const bosUrun = {
  barkod: '', urunAdi: '', stokKodu: '', grupId: '', kategori: '', marka: '',
  birim: 'Adet', kdvOrani: 20, alisFiyati: '', satisFiyati: '',
  stokMiktari: '', minimumStok: '', rafKonumu: '',
};

const bosGrup = { grupAdi: '', satisEkranindaGoster: true, sira: 0 };
const bosCari = { ad: '', telefon: '', notMetni: '' };

const bosFatura = () => ({
  id: '', cariId: '', tedarikciAdi: '', faturaNo: '',
  faturaTarihi: new Date().toISOString().slice(0, 10),
  barkod: '', miktar: 1, alisFiyati: '', kalemler: [],
});

const para = value => new Intl.NumberFormat('tr-TR', {
  style: 'currency', currency: 'TRY', maximumFractionDigits: 2,
}).format(Number(value || 0));

const tarihYaz = value => {
  if (!value) return '-';
  return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('tr-TR');
};

export default function MarketApp({ restaurantId, restaurantName, notify }) {
  const [sekme, setSekme] = useState('ozet');
  const [urunler, setUrunler] = useState([]);
  const [gruplar, setGruplar] = useState([]);
  const [faturalar, setFaturalar] = useState([]);
  const [sayimlar, setSayimlar] = useState([]);
  const [cariler, setCariler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [arama, setArama] = useState('');
  const [urunFormu, setUrunFormu] = useState(bosUrun);
  const [grupFormu, setGrupFormu] = useState(bosGrup);
  const [hizliDuzenleme, setHizliDuzenleme] = useState(null);
  const [fatura, setFatura] = useState(bosFatura);
  const [acikFaturaId, setAcikFaturaId] = useState('');
  const [satisBarkodu, setSatisBarkodu] = useState('');
  const [sepet, setSepet] = useState([]);
  const [satisGrubu, setSatisGrubu] = useState('');
  const [satisCariId, setSatisCariId] = useState('');
  const [cariFormu, setCariFormu] = useState(bosCari);
  const [cariFormYeri, setCariFormYeri] = useState('');
  const [sayim, setSayim] = useState({});
  const [sayimBarkodu, setSayimBarkodu] = useState('');
  const [etiketUrunleri, setEtiketUrunleri] = useState([]);
  const barkodRef = useRef(null);

  const bildir = (mesaj, tip = 'info') => {
    if (typeof notify === 'function') notify(mesaj, tip);
  };

  const veriyiUygula = data => {
    setUrunler(data.urunler || []);
    setGruplar(data.gruplar || []);
    setFaturalar(data.faturalar || []);
    setSayimlar(data.sayimlar || []);
    setCariler(data.cariler || []);
  };

  const verileriYukle = async (sessiz = false) => {
    if (!restaurantId || String(restaurantId) === 'super_admin') return;
    if (!sessiz) setYukleniyor(true);
    setHata('');
    try {
      const data = await marketVerileriniGetir(restaurantId);
      veriyiUygula(data);
    } catch (error) {
      setHata(error.message);
    } finally {
      if (!sessiz) setYukleniyor(false);
    }
  };

  useEffect(() => {
    if (!restaurantId || String(restaurantId) === 'super_admin') return undefined;
    let aktif = true;
    marketVerileriniGetir(restaurantId)
      .then(data => {
        if (!aktif) return;
        veriyiUygula(data);
        setHata('');
      })
      .catch(error => {
        if (aktif) setHata(error.message);
      })
      .finally(() => {
        if (aktif) setYukleniyor(false);
      });
    return () => { aktif = false; };
  }, [restaurantId]);

  useEffect(() => {
    if (['satis', 'alis', 'sayim'].includes(sekme)) window.setTimeout(() => barkodRef.current?.focus(), 80);
  }, [sekme]);

  const gorunenGruplar = useMemo(
    () => gruplar.filter(grup => grup.satis_ekraninda_goster),
    [gruplar]
  );
  const aktifSatisGrubu = gorunenGruplar.some(grup => String(grup.id) === String(satisGrubu))
    ? satisGrubu
    : gorunenGruplar[0]?.id || '';

  const filtreliUrunler = useMemo(() => {
    const metin = arama.trim().toLocaleLowerCase('tr-TR');
    if (!metin) return urunler;
    return urunler.filter(urun => [urun.urun_adi, urun.barkod, urun.stok_kodu, urun.kategori, urun.marka]
      .some(value => String(value || '').toLocaleLowerCase('tr-TR').includes(metin)));
  }, [arama, urunler]);

  const ozet = useMemo(() => ({
    urunSayisi: urunler.length,
    stokDegeri: urunler.reduce((t, u) => t + Number(u.stok_miktari || 0) * Number(u.alis_fiyati || 0), 0),
    kritikStok: urunler.filter(u => Number(u.stok_miktari || 0) <= Number(u.minimum_stok || 0)).length,
    potansiyelCiro: urunler.reduce((t, u) => t + Number(u.stok_miktari || 0) * Number(u.satis_fiyati || 0), 0),
  }), [urunler]);

  const seciliSatisCarisi = cariler.find(cari => String(cari.id) === String(satisCariId));
  const seciliAlisCarisi = cariler.find(cari => String(cari.id) === String(fatura.cariId));

  const grupKaydet = async event => {
    event.preventDefault();
    try {
      const kayit = await marketGrubuKaydet(restaurantId, grupFormu);
      setGrupFormu(bosGrup);
      await verileriYukle(true);
      if (!urunFormu.grupId) {
        setUrunFormu(prev => ({ ...prev, grupId: kayit.id, kategori: kayit.grup_adi }));
      }
      bildir(grupFormu.id ? 'Grup güncellendi.' : 'Yeni grup açıldı.', 'success');
    } catch (error) { bildir(error.message, 'error'); }
  };

  const grupGorunurlugunuDegistir = async grup => {
    try {
      await marketGrubuKaydet(restaurantId, {
        id: grup.id,
        grupAdi: grup.grup_adi,
        satisEkranindaGoster: !grup.satis_ekraninda_goster,
        sira: grup.sira,
      });
      setGruplar(prev => prev.map(item => String(item.id) === String(grup.id)
        ? { ...item, satis_ekraninda_goster: !item.satis_ekraninda_goster }
        : item));
      bildir(!grup.satis_ekraninda_goster ? 'Grup satış ekranında gösterilecek.' : 'Grup satış ekranından gizlendi.', 'success');
    } catch (error) { bildir(error.message, 'error'); }
  };

  const urunKaydet = async event => {
    event.preventDefault();
    if (!urunFormu.barkod.trim() || !urunFormu.urunAdi.trim()) return bildir('Barkod ve ürün adı zorunludur.', 'warning');
    if (!urunFormu.grupId) return bildir('Ürün grubu seçimi zorunludur.', 'warning');
    try {
      await marketUrunuKaydet(restaurantId, urunFormu);
      const duzenlemeMi = Boolean(urunFormu.id);
      setUrunFormu(bosUrun);
      await verileriYukle(true);
      bildir(duzenlemeMi ? 'Market ürünü güncellendi.' : 'Market ürünü kaydedildi.', 'success');
    } catch (error) { bildir(error.message, 'error'); }
  };

  const urunuDuzenle = urun => {
    setUrunFormu({
      id: urun.id,
      barkod: urun.barkod || '',
      urunAdi: urun.urun_adi || '',
      stokKodu: urun.stok_kodu || '',
      grupId: urun.grup_id || '',
      kategori: urun.kategori || '',
      marka: urun.marka || '',
      birim: urun.birim || 'Adet',
      kdvOrani: Number(urun.kdv_orani || 0),
      alisFiyati: urun.alis_fiyati ?? '',
      satisFiyati: urun.satis_fiyati ?? '',
      stokMiktari: urun.stok_miktari ?? '',
      minimumStok: urun.minimum_stok ?? '',
      rafKonumu: urun.raf_konumu || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hizliDuzenlemeyiAc = urun => {
    setHizliDuzenleme({
      id: urun.id,
      stokMiktari: urun.stok_miktari ?? 0,
      alisFiyati: urun.alis_fiyati ?? 0,
      satisFiyati: urun.satis_fiyati ?? 0,
    });
  };

  const hizliDuzenlemeyiKaydet = async () => {
    try {
      const guncellenen = await marketUrunStokFiyatGuncelle(restaurantId, hizliDuzenleme.id, hizliDuzenleme);
      setUrunler(prev => prev.map(urun => String(urun.id) === String(guncellenen.id) ? guncellenen : urun));
      setHizliDuzenleme(null);
      bildir('Stok ve fiyatlar güncellendi.', 'success');
    } catch (error) { bildir(error.message, 'error'); }
  };

  const urunuSepeteEkle = urun => {
    const mevcut = sepet.find(kalem => String(kalem.id) === String(urun.id));
    setSepet(prev => mevcut
      ? prev.map(kalem => String(kalem.id) === String(urun.id) ? { ...kalem, adet: Number(kalem.adet) + 1 } : kalem)
      : [...prev, { ...urun, adet: 1 }]);
  };

  const satisaEkle = event => {
    event.preventDefault();
    const urun = urunler.find(item => String(item.barkod) === satisBarkodu.trim());
    if (!urun) return bildir('Barkod ürün listesinde bulunamadı.', 'warning');
    urunuSepeteEkle(urun);
    setSatisBarkodu('');
  };

  const satisiTamamla = async odemeTipi => {
    if (!sepet.length) return bildir('Satış sepeti boş.', 'warning');
    if (odemeTipi === 'Cari / Veresiye' && !satisCariId) return bildir('Veresiye satış için cari seçin.', 'warning');
    try {
      await marketSatisiKaydet(restaurantId, sepet, odemeTipi, satisCariId);
      setSepet([]);
      await verileriYukle(true);
      bildir(`${odemeTipi} satış tamamlandı ve stok düşüldü.`, 'success');
      window.setTimeout(() => barkodRef.current?.focus(), 80);
    } catch (error) { bildir(error.message, 'error'); }
  };

  const cariKaydet = async event => {
    event.preventDefault();
    try {
      const yeniCari = await marketCariKaydet(restaurantId, cariFormu);
      if (cariFormYeri === 'satis') setSatisCariId(String(yeniCari.id));
      if (cariFormYeri === 'alis') {
        setFatura(prev => ({ ...prev, cariId: String(yeniCari.id), tedarikciAdi: yeniCari.ad }));
      }
      setCariFormu(bosCari);
      setCariFormYeri('');
      await verileriYukle(true);
      bildir('Cari kaydedildi ve seçildi.', 'success');
    } catch (error) { bildir(error.message, 'error'); }
  };

  const cariKayitAlani = yer => (
    <>
      <button type="button" className="market-link-button" onClick={() => {
        setCariFormYeri(cariFormYeri === yer ? '' : yer);
        setCariFormu(bosCari);
      }}>＋ Yeni cari kaydet</button>
      {cariFormYeri === yer && <form className="market-cari-form" onSubmit={cariKaydet}>
        <input value={cariFormu.ad} onChange={event => setCariFormu({ ...cariFormu, ad: event.target.value })} placeholder="Cari adı *" autoFocus />
        <input value={cariFormu.telefon} onChange={event => setCariFormu({ ...cariFormu, telefon: event.target.value })} placeholder="Telefon" />
        <input value={cariFormu.notMetni} onChange={event => setCariFormu({ ...cariFormu, notMetni: event.target.value })} placeholder="Not" />
        <button className="market-primary" type="submit">Cariyi Kaydet</button>
      </form>}
    </>
  );

  const cariOzeti = cari => {
    if (!cari) return null;
    const bakiye = Number(cari.bakiye || 0);
    const bakiyeBasligi = bakiye > 0 ? 'Alacağınız' : bakiye < 0 ? 'Borcunuz' : 'Bakiye';
    return <div className="market-cari-summary">
      <span><strong>{cari.ad}</strong><small>{cari.telefon || 'Telefon yok'}</small></span>
      <b className={bakiye < 0 ? 'red' : 'green'}>{bakiyeBasligi}: {para(Math.abs(bakiye))}</b>
      {Array.isArray(cari.hareketler) && cari.hareketler.length > 0 &&
        <small>Son hareket: {cari.hareketler[0].tip} · {para(cari.hareketler[0].tutar)}</small>}
    </div>;
  };

  const faturayaEkle = event => {
    event.preventDefault();
    const urun = urunler.find(item => String(item.barkod) === String(fatura.barkod).trim());
    if (!urun) return bildir('Barkod bulunamadı. Önce ürün kartını oluşturun.', 'warning');
    const miktar = Math.max(Number(fatura.miktar || 1), 0.001);
    const alisFiyati = Number(fatura.alisFiyati || urun.alis_fiyati || 0);
    const mevcut = fatura.kalemler.find(kalem => String(kalem.urunId) === String(urun.id));
    const kalemler = mevcut
      ? fatura.kalemler.map(kalem => String(kalem.urunId) === String(urun.id)
        ? { ...kalem, miktar: Number(kalem.miktar) + miktar, alisFiyati, satirToplami: (Number(kalem.miktar) + miktar) * alisFiyati }
        : kalem)
      : [...fatura.kalemler, {
        urunId: urun.id,
        barkod: urun.barkod,
        urunAdi: urun.urun_adi,
        miktar,
        alisFiyati,
        kdvOrani: urun.kdv_orani,
        satirToplami: miktar * alisFiyati,
      }];
    setFatura(prev => ({ ...prev, barkod: '', miktar: 1, alisFiyati: '', kalemler }));
  };

  const faturaKalemiGuncelle = (urunId, alan, deger) => {
    setFatura(prev => ({
      ...prev,
      kalemler: prev.kalemler.map(kalem => {
        if (String(kalem.urunId) !== String(urunId)) return kalem;
        const guncel = { ...kalem, [alan]: deger };
        return { ...guncel, satirToplami: Number(guncel.miktar || 0) * Number(guncel.alisFiyati || 0) };
      }),
    }));
  };

  const faturaToplamlari = useMemo(() => {
    const genelToplam = fatura.kalemler.reduce((toplam, kalem) => toplam + Number(kalem.satirToplami || 0), 0);
    const kdvToplam = fatura.kalemler.reduce((toplam, kalem) => toplam + Number(kalem.satirToplami || 0) * Number(kalem.kdvOrani || 0) / (100 + Number(kalem.kdvOrani || 0)), 0);
    return { genelToplam, kdvToplam, araToplam: genelToplam - kdvToplam };
  }, [fatura.kalemler]);

  const faturaKaydet = async () => {
    if (!fatura.tedarikciAdi.trim() || fatura.kalemler.length === 0) return bildir('Tedarikçi ve en az bir kalem gereklidir.', 'warning');
    try {
      const duzenlemeMi = Boolean(fatura.id);
      await marketAlisFaturasiKaydet(restaurantId, { ...fatura, ...faturaToplamlari });
      setFatura(bosFatura());
      await verileriYukle(true);
      bildir(duzenlemeMi ? 'Fatura ve stok farkları güncellendi.' : 'Fatura kaydedildi ve stoklar artırıldı.', 'success');
    } catch (error) { bildir(error.message, 'error'); }
  };

  const faturayiDuzenle = kayit => {
    const kalemler = (kayit.market_alis_fatura_kalemleri || []).map(kalem => ({
      urunId: kalem.urun_id,
      barkod: kalem.barkod,
      urunAdi: kalem.urun_adi,
      miktar: Number(kalem.miktar),
      alisFiyati: Number(kalem.birim_alis_fiyati),
      kdvOrani: Number(kalem.kdv_orani),
      satirToplami: Number(kalem.satir_toplami),
    }));
    setFatura({
      ...bosFatura(),
      id: kayit.id,
      cariId: kayit.cari_id || '',
      tedarikciAdi: kayit.tedarikci_adi || '',
      faturaNo: kayit.fatura_no || '',
      faturaTarihi: String(kayit.fatura_tarihi || '').slice(0, 10),
      kalemler,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sayimaEkle = event => {
    event.preventDefault();
    const urun = urunler.find(item => String(item.barkod) === sayimBarkodu.trim());
    if (!urun) return bildir('Barkod ürün listesinde bulunamadı.', 'warning');
    setSayim(prev => ({ ...prev, [urun.id]: Number(prev[urun.id] ?? 0) + 1 }));
    setSayimBarkodu('');
  };

  const sayimiTamamla = async () => {
    const kalemler = urunler.filter(urun => Object.prototype.hasOwnProperty.call(sayim, urun.id)).map(urun => ({
      ...urun,
      sayilanMiktar: Number(sayim[urun.id] || 0),
      fark: Number(sayim[urun.id] || 0) - Number(urun.stok_miktari || 0),
    }));
    if (!kalemler.length) return bildir('Sayım için en az bir ürün okutun.', 'warning');
    try {
      await marketSayimiKaydet(restaurantId, { sayimAdi: `${new Date().toLocaleDateString('tr-TR')} Market Sayımı`, kalemler });
      setSayim({});
      await verileriYukle(true);
      bildir('Sayım tamamlandı ve stok farkları işlendi.', 'success');
    } catch (error) { bildir(error.message, 'error'); }
  };

  const nav = [
    ['ozet', '📊 Genel Bakış'],
    ['satis', '▥ Barkodlu Satış'],
    ['gruplar', '▦ Gruplar'],
    ['urunler', '📦 Ürünler'],
    ['alis', '🧾 Alış Faturaları'],
    ['sayim', '📋 Sayım'],
    ['etiket', '🏷️ Etiket Basımı'],
  ];

  return (
    <section className="market-shell">
      <header className="market-hero">
        <div><span className="market-kicker">INTEGRA MARKET</span><h1>{restaurantName || 'Market'} Yönetimi</h1><p>Barkodlu satış, gruplar, cari, alış faturası, sayım ve etiket yönetimi.</p></div>
        <button type="button" className="market-refresh" onClick={() => verileriYukle(false)}>↻ Verileri Yenile</button>
      </header>

      <nav className="market-tabs" aria-label="Market modülü">{nav.map(([key, label]) =>
        <button type="button" key={key} className={sekme === key ? 'active' : ''} onClick={() => setSekme(key)}>{label}</button>
      )}</nav>
      {hata && <div className="market-alert"><strong>Kontrol gerekiyor:</strong> {hata}</div>}
      {yukleniyor && <div className="market-loading">Market verileri hazırlanıyor…</div>}

      {!yukleniyor && sekme === 'ozet' && <>
        <div className="market-stats">
          <article><span>Toplam Ürün</span><strong>{ozet.urunSayisi}</strong><small>{gruplar.length} ürün grubu</small></article>
          <article><span>Alış Değerli Stok</span><strong>{para(ozet.stokDegeri)}</strong><small>Mevcut maliyet</small></article>
          <article className={ozet.kritikStok ? 'danger' : ''}><span>Kritik Stok</span><strong>{ozet.kritikStok}</strong><small>Minimum seviyede veya altında</small></article>
          <article><span>Potansiyel Ciro</span><strong>{para(ozet.potansiyelCiro)}</strong><small>Satış fiyatı üzerinden</small></article>
        </div>
        <div className="market-grid-two">
          <article className="market-card"><h2>Hızlı işlemler</h2><div className="market-actions">
            <button type="button" onClick={() => setSekme('satis')}>▥ Satış aç</button>
            <button type="button" onClick={() => setSekme('alis')}>🧾 Fatura gir</button>
            <button type="button" onClick={() => setSekme('gruplar')}>▦ Grup aç</button>
            <button type="button" onClick={() => setSekme('urunler')}>＋ Ürün ekle</button>
          </div></article>
          <article className="market-card"><h2>Son alış faturaları</h2>{!faturalar.length ? <p className="market-empty">Henüz alış faturası yok.</p> :
            <div className="market-list">{faturalar.slice(0, 5).map(kayit => <div key={kayit.id}><span>{kayit.tedarikci_adi}<small>{tarihYaz(kayit.fatura_tarihi)} · {kayit.fatura_no || 'No yok'}</small></span><strong>{para(kayit.genel_toplam)}</strong></div>)}</div>}
          </article>
        </div>
      </>}

      {!yukleniyor && sekme === 'satis' && <div className="market-grid-two">
        <div className="market-card">
          <div className="market-heading"><div><span>HIZLI KASA</span><h2>Barkodlu satış</h2></div><strong>{para(sepet.reduce((toplam, kalem) => toplam + Number(kalem.adet) * Number(kalem.satis_fiyati), 0))}</strong></div>
          <form className="market-scan simple" onSubmit={satisaEkle}><label>Barkod<input ref={barkodRef} value={satisBarkodu} onChange={event => setSatisBarkodu(event.target.value)} placeholder="Barkodu okutun ve Enter'a basın" /></label><button className="market-primary" type="submit">Sepete Ekle</button></form>
          <div className="market-group-tabs">
            {gorunenGruplar.map(grup => <button type="button" key={grup.id} className={String(aktifSatisGrubu) === String(grup.id) ? 'active' : ''} onClick={() => setSatisGrubu(grup.id)}>{grup.grup_adi}</button>)}
          </div>
          {!gorunenGruplar.length && <p className="market-empty">Satış ekranında gösterilen grup yok. Gruplar bölümünden en az bir grubu görünür yapın.</p>}
          <div className="market-product-grid">
            {urunler.filter(urun => String(urun.grup_id) === String(aktifSatisGrubu)).map(urun =>
              <button type="button" key={urun.id} onClick={() => urunuSepeteEkle(urun)}><strong>{urun.urun_adi}</strong><b>{para(urun.satis_fiyati)}</b><small>Stok: {urun.stok_miktari}</small></button>
            )}
          </div>
          <div className="market-table"><table><thead><tr><th>Ürün</th><th>Adet</th><th>Fiyat</th><th>Toplam</th><th></th></tr></thead><tbody>
            {sepet.map(kalem => <tr key={kalem.id}><td><strong>{kalem.urun_adi}</strong><small>{kalem.barkod}</small></td><td><input className="market-table-input compact" aria-label={`${kalem.urun_adi} adedi`} type="number" min="1" value={kalem.adet} onChange={event => setSepet(prev => prev.map(item => item.id === kalem.id ? { ...item, adet: Math.max(1, Number(event.target.value) || 1) } : item))} /></td><td>{para(kalem.satis_fiyati)}</td><td><strong>{para(Number(kalem.adet) * Number(kalem.satis_fiyati))}</strong></td><td><button className="market-remove" type="button" onClick={() => setSepet(prev => prev.filter(item => item.id !== kalem.id))}>Sil</button></td></tr>)}
          </tbody></table></div>
        </div>
        <div className="market-card">
          <div className="market-heading"><div><span>ÖDEME VE CARİ</span><h2>Satışı tamamla</h2></div></div>
          <label className="market-field">Cari seçimi (isteğe bağlı)<select value={satisCariId} onChange={event => setSatisCariId(event.target.value)}><option value="">Cari seçmeden satış</option>{cariler.map(cari => <option value={cari.id} key={cari.id}>{cari.ad} · {para(cari.bakiye)}</option>)}</select></label>
          {cariKayitAlani('satis')}
          {cariOzeti(seciliSatisCarisi)}
          <div className="market-total-card"><span>Ödenecek toplam</span><strong>{para(sepet.reduce((toplam, kalem) => toplam + Number(kalem.adet) * Number(kalem.satis_fiyati), 0))}</strong><small>{sepet.reduce((toplam, kalem) => toplam + Number(kalem.adet), 0)} ürün</small></div>
          <div className="market-actions market-actions-three"><button type="button" onClick={() => satisiTamamla('Nakit')}>💵 Nakit</button><button type="button" onClick={() => satisiTamamla('Kredi Kartı')}>💳 Kart</button><button type="button" onClick={() => satisiTamamla('Cari / Veresiye')}>👤 Cari / Veresiye</button></div>
          <p className="market-note">Cari seçilmiş nakit ve kart satışları cari geçmişinde görünür; yalnızca veresiye satış bakiyeyi artırır.</p>
        </div>
      </div>}

      {!yukleniyor && sekme === 'gruplar' && <div className="market-grid-form">
        <form className="market-card market-form" onSubmit={grupKaydet}>
          <div className="market-heading"><div><span>GRUP KARTI</span><h2>{grupFormu.id ? 'Grubu düzenle' : 'Yeni grup aç'}</h2></div>{grupFormu.id && <button className="market-remove" type="button" onClick={() => setGrupFormu(bosGrup)}>Vazgeç</button>}</div>
          <label>Grup adı<input value={grupFormu.grupAdi} onChange={event => setGrupFormu({ ...grupFormu, grupAdi: event.target.value })} placeholder="Örn. İçecekler" autoFocus /></label>
          <label>Sıra<input type="number" value={grupFormu.sira} onChange={event => setGrupFormu({ ...grupFormu, sira: event.target.value })} /></label>
          <label className="market-check"><input type="checkbox" checked={grupFormu.satisEkranindaGoster} onChange={event => setGrupFormu({ ...grupFormu, satisEkranindaGoster: event.target.checked })} /> Satış ekranında kısayol olarak göster</label>
          <button className="market-primary" type="submit">{grupFormu.id ? 'Grubu Güncelle' : 'Grubu Aç'}</button>
        </form>
        <div className="market-card">
          <div className="market-heading"><div><span>GRUPLAR</span><h2>{gruplar.length} grup</h2></div></div>
          <div className="market-group-list">{gruplar.map(grup => <div key={grup.id}>
            <span><strong>{grup.grup_adi}</strong><small>{urunler.filter(urun => String(urun.grup_id) === String(grup.id)).length} ürün · Sıra {grup.sira}</small></span>
            <div className="market-inline-actions">
              <button type="button" className={grup.satis_ekraninda_goster ? 'active' : ''} onClick={() => grupGorunurlugunuDegistir(grup)}>{grup.satis_ekraninda_goster ? '👁 Görünüyor' : '⊘ Gizli'}</button>
              <button type="button" aria-label={`${grup.grup_adi} grubunu düzenle`} onClick={() => setGrupFormu({ id: grup.id, grupAdi: grup.grup_adi, satisEkranindaGoster: grup.satis_ekraninda_goster, sira: grup.sira })}>✎ Düzenle</button>
            </div>
          </div>)}</div>
        </div>
      </div>}

      {!yukleniyor && sekme === 'urunler' && <div className="market-grid-form">
        <form className="market-card market-form" onSubmit={urunKaydet}>
          <div className="market-heading"><div><span>ÜRÜN KARTI</span><h2>{urunFormu.id ? 'Ürünü düzenle' : 'Yeni barkodlu ürün'}</h2></div>{urunFormu.id && <button className="market-remove" type="button" onClick={() => setUrunFormu(bosUrun)}>Vazgeç</button>}</div>
          <label>Barkod<input autoFocus value={urunFormu.barkod} onChange={event => setUrunFormu({ ...urunFormu, barkod: event.target.value })} placeholder="869…" /></label>
          <label>Ürün adı<input value={urunFormu.urunAdi} onChange={event => setUrunFormu({ ...urunFormu, urunAdi: event.target.value })} /></label>
          <label>Ürün grubu *<select required value={urunFormu.grupId} onChange={event => {
            const grup = gruplar.find(item => String(item.id) === String(event.target.value));
            setUrunFormu({ ...urunFormu, grupId: event.target.value, kategori: grup?.grup_adi || '' });
          }}><option value="">Grup seçin</option>{gruplar.map(grup => <option key={grup.id} value={grup.id}>{grup.grup_adi}</option>)}</select></label>
          {!gruplar.length && <button className="market-link-button" type="button" onClick={() => setSekme('gruplar')}>Önce grup açın</button>}
          <label>Marka<input value={urunFormu.marka} onChange={event => setUrunFormu({ ...urunFormu, marka: event.target.value })} /></label>
          <div className="market-row"><label>Alış fiyatı<input type="number" min="0" step="0.01" value={urunFormu.alisFiyati} onChange={event => setUrunFormu({ ...urunFormu, alisFiyati: event.target.value })} /></label><label>Satış fiyatı<input type="number" min="0" step="0.01" value={urunFormu.satisFiyati} onChange={event => setUrunFormu({ ...urunFormu, satisFiyati: event.target.value })} /></label></div>
          <div className="market-row"><label>Stok<input type="number" step="0.001" value={urunFormu.stokMiktari} onChange={event => setUrunFormu({ ...urunFormu, stokMiktari: event.target.value })} /></label><label>Minimum stok<input type="number" step="0.001" value={urunFormu.minimumStok} onChange={event => setUrunFormu({ ...urunFormu, minimumStok: event.target.value })} /></label></div>
          <div className="market-row"><label>KDV<select value={urunFormu.kdvOrani} onChange={event => setUrunFormu({ ...urunFormu, kdvOrani: event.target.value })}><option value="0">%0</option><option value="1">%1</option><option value="10">%10</option><option value="20">%20</option></select></label><label>Raf konumu<input value={urunFormu.rafKonumu} onChange={event => setUrunFormu({ ...urunFormu, rafKonumu: event.target.value })} placeholder="A-03" /></label></div>
          <button className="market-primary" type="submit">{urunFormu.id ? 'Ürünü Kaydet' : 'Ürünü Oluştur'}</button>
        </form>
        <div className="market-card">
          <div className="market-toolbar"><div><span>ÜRÜN LİSTESİ</span><h2>{filtreliUrunler.length} ürün</h2></div><input value={arama} onChange={event => setArama(event.target.value)} placeholder="Barkod, ürün veya grup ara" /></div>
          <div className="market-table"><table><thead><tr><th>Barkod / Ürün</th><th>Grup</th><th>Stok</th><th>Alış</th><th>Satış</th><th>Kâr</th><th></th></tr></thead><tbody>
            {filtreliUrunler.map(urun => {
              const kar = Number(urun.satis_fiyati) - Number(urun.alis_fiyati);
              const acik = String(hizliDuzenleme?.id) === String(urun.id);
              return <Fragment key={urun.id}>
                <tr><td><strong>{urun.urun_adi}</strong><small>{urun.barkod}</small></td><td>{urun.kategori}</td><td className={Number(urun.stok_miktari) <= Number(urun.minimum_stok) ? 'red' : ''}>{urun.stok_miktari} {urun.birim}</td><td>{para(urun.alis_fiyati)}</td><td><strong>{para(urun.satis_fiyati)}</strong></td><td className={kar < 0 ? 'red' : 'green'}>{para(kar)}</td><td><div className="market-inline-actions"><button type="button" title="Stok ve fiyatı düzenle" aria-label={`${urun.urun_adi} stok ve fiyatını düzenle`} onClick={() => acik ? setHizliDuzenleme(null) : hizliDuzenlemeyiAc(urun)}>✎</button><button type="button" onClick={() => urunuDuzenle(urun)}>Detay</button></div></td></tr>
                {acik && <tr className="market-inline-edit-row"><td colSpan="7"><div className="market-inline-edit">
                  <label>Stok<input type="number" step="0.001" value={hizliDuzenleme.stokMiktari} onChange={event => setHizliDuzenleme({ ...hizliDuzenleme, stokMiktari: event.target.value })} /></label>
                  <label>Alış fiyatı<input type="number" min="0" step="0.01" value={hizliDuzenleme.alisFiyati} onChange={event => setHizliDuzenleme({ ...hizliDuzenleme, alisFiyati: event.target.value })} /></label>
                  <label>Satış fiyatı<input type="number" min="0" step="0.01" value={hizliDuzenleme.satisFiyati} onChange={event => setHizliDuzenleme({ ...hizliDuzenleme, satisFiyati: event.target.value })} /></label>
                  <button className="market-primary" type="button" onClick={hizliDuzenlemeyiKaydet}>Kaydet</button>
                  <button className="market-remove" type="button" onClick={() => setHizliDuzenleme(null)}>Vazgeç</button>
                </div></td></tr>}
              </Fragment>;
            })}
          </tbody></table></div>
        </div>
      </div>}

      {!yukleniyor && sekme === 'alis' && <div className="market-stack">
        <div className="market-card">
          <div className="market-heading"><div><span>STOK GİRİŞİ</span><h2>{fatura.id ? 'Alış faturasını düzenle' : 'Yeni alış faturası'}</h2></div><strong>{para(faturaToplamlari.genelToplam)}</strong></div>
          {fatura.id && <button type="button" className="market-link-button" onClick={() => setFatura(bosFatura())}>＋ Yeni faturaya geç</button>}
          <div className="market-row three">
            <label>Tedarikçi / Cari<select value={fatura.cariId} onChange={event => {
              const secilen = cariler.find(cari => String(cari.id) === String(event.target.value));
              setFatura({ ...fatura, cariId: event.target.value, tedarikciAdi: secilen?.ad || '' });
            }}><option value="">Manuel tedarikçi adı</option>{cariler.map(cari => <option value={cari.id} key={cari.id}>{cari.ad} · {para(cari.bakiye)}</option>)}</select>{!fatura.cariId && <input value={fatura.tedarikciAdi} onChange={event => setFatura({ ...fatura, tedarikciAdi: event.target.value })} placeholder="Tedarikçi adı" />}</label>
            <label>Fatura no<input value={fatura.faturaNo} onChange={event => setFatura({ ...fatura, faturaNo: event.target.value })} /></label>
            <label>Tarih<input type="date" value={fatura.faturaTarihi} onChange={event => setFatura({ ...fatura, faturaTarihi: event.target.value })} /></label>
          </div>
          {cariKayitAlani('alis')}
          {cariOzeti(seciliAlisCarisi)}
          <form className="market-scan" onSubmit={faturayaEkle}><label>Barkod<input ref={barkodRef} value={fatura.barkod} onChange={event => setFatura({ ...fatura, barkod: event.target.value })} placeholder="Okutun ve Enter'a basın" /></label><label>Miktar<input type="number" min="0.001" step="0.001" value={fatura.miktar} onChange={event => setFatura({ ...fatura, miktar: event.target.value })} /></label><label>Alış fiyatı<input type="number" min="0" step="0.01" value={fatura.alisFiyati} onChange={event => setFatura({ ...fatura, alisFiyati: event.target.value })} placeholder="Kayıtlı fiyat" /></label><button className="market-primary" type="submit">Kalem Ekle</button></form>
          <div className="market-table"><table><thead><tr><th>Ürün</th><th>Miktar</th><th>Alış</th><th>KDV</th><th>Toplam</th><th></th></tr></thead><tbody>
            {fatura.kalemler.map(kalem => <tr key={kalem.urunId}><td><strong>{kalem.urunAdi}</strong><small>{kalem.barkod}</small></td><td><input className="market-table-input" type="number" min="0.001" step="0.001" value={kalem.miktar} onChange={event => faturaKalemiGuncelle(kalem.urunId, 'miktar', event.target.value)} /></td><td><input className="market-table-input" type="number" min="0" step="0.01" value={kalem.alisFiyati} onChange={event => faturaKalemiGuncelle(kalem.urunId, 'alisFiyati', event.target.value)} /></td><td>%{kalem.kdvOrani}</td><td>{para(kalem.satirToplami)}</td><td><button className="market-remove" type="button" onClick={() => setFatura(prev => ({ ...prev, kalemler: prev.kalemler.filter(item => item.urunId !== kalem.urunId) }))}>Sil</button></td></tr>)}
          </tbody></table></div>
          <div className="market-total"><span>Matrah<strong>{para(faturaToplamlari.araToplam)}</strong></span><span>KDV<strong>{para(faturaToplamlari.kdvToplam)}</strong></span><span>Genel toplam<strong>{para(faturaToplamlari.genelToplam)}</strong></span><button className="market-primary" type="button" onClick={faturaKaydet}>{fatura.id ? 'Faturayı Güncelle' : 'Kaydet ve Stoğa İşle'}</button></div>
        </div>
        <div className="market-card">
          <div className="market-heading"><div><span>KAYITLI FATURALAR</span><h2>{faturalar.length} alış faturası</h2></div></div>
          {!faturalar.length ? <p className="market-empty">Henüz alış faturası yok.</p> : <div className="market-invoice-list">{faturalar.map(kayit => <article key={kayit.id}>
            <button type="button" className="market-invoice-head" onClick={() => setAcikFaturaId(acikFaturaId === kayit.id ? '' : kayit.id)}>
              <span><strong>{kayit.tedarikci_adi}</strong><small>{tarihYaz(kayit.fatura_tarihi)} · {kayit.fatura_no || 'Fatura no yok'}</small></span>
              <b>{para(kayit.genel_toplam)}</b>
            </button>
            {acikFaturaId === kayit.id && <div className="market-invoice-detail">
              {(kayit.market_alis_fatura_kalemleri || []).map(kalem => <div key={kalem.id}><span>{kalem.urun_adi}<small>{kalem.miktar} × {para(kalem.birim_alis_fiyati)}</small></span><strong>{para(kalem.satir_toplami)}</strong></div>)}
              <button className="market-primary" type="button" onClick={() => faturayiDuzenle(kayit)}>✎ Faturayı Düzenle</button>
            </div>}
          </article>)}</div>}
        </div>
      </div>}

      {!yukleniyor && sekme === 'sayim' && <div className="market-grid-two">
        <div className="market-card"><div className="market-heading"><div><span>MOBİL / BARKOD</span><h2>Stok sayımı</h2></div><strong>{Object.keys(sayim).length} kalem</strong></div>
          <form className="market-scan simple" onSubmit={sayimaEkle}><label>Barkod<input ref={barkodRef} value={sayimBarkodu} onChange={event => setSayimBarkodu(event.target.value)} placeholder="Her adet için okutun" /></label><button className="market-primary" type="submit">Sayıma Ekle</button></form>
          <div className="market-list">{urunler.filter(urun => Object.prototype.hasOwnProperty.call(sayim, urun.id)).map(urun => <div key={urun.id}><span><strong>{urun.urun_adi}</strong><small>Sistem: {urun.stok_miktari}</small></span><label className="market-count">Sayılan<input type="number" min="0" step="0.001" value={sayim[urun.id]} onChange={event => setSayim(prev => ({ ...prev, [urun.id]: event.target.value }))} /></label></div>)}</div>
          <button className="market-primary market-full" type="button" onClick={sayimiTamamla}>Sayımı Tamamla ve Farkları İşle</button>
        </div>
        <div className="market-card"><h2>Son sayımlar</h2>{!sayimlar.length ? <p className="market-empty">Henüz tamamlanmış sayım yok.</p> : <div className="market-list">{sayimlar.map(kayit => <div key={kayit.id}><span>{kayit.sayim_adi}<small>{kayit.toplam_kalem} ürün</small></span><strong>{kayit.farkli_kalem} fark</strong></div>)}</div>}</div>
      </div>}

      {!yukleniyor && sekme === 'etiket' && <div className="market-card">
        <div className="market-heading"><div><span>RAF VE BARKOD</span><h2>Etiket basım kuyruğu</h2></div><button className="market-primary" type="button" onClick={() => etiketUrunleri.length ? window.print() : bildir('Önce ürün seçin.', 'warning')}>🖨️ Seçilenleri Yazdır</button></div>
        <div className="market-label-list">{urunler.map(urun => <label key={urun.id}><input type="checkbox" checked={etiketUrunleri.includes(urun.id)} onChange={event => setEtiketUrunleri(prev => event.target.checked ? [...prev, urun.id] : prev.filter(id => id !== urun.id))} /><span><strong>{urun.urun_adi}</strong><small>{urun.barkod}</small></span><b>{para(urun.satis_fiyati)}</b></label>)}</div>
        <div className="market-print-labels" aria-hidden="true">{urunler.filter(urun => etiketUrunleri.includes(urun.id)).map(urun => <article key={urun.id}><div>{restaurantName}</div><strong>{urun.urun_adi}</strong><b>{para(urun.satis_fiyati)}</b><span>|||| ||| |||| | |||</span><small>{urun.barkod}</small></article>)}</div>
      </div>}
    </section>
  );
}
