import { useEffect, useMemo, useRef, useState } from 'react';
import {
  marketAlisFaturasiKaydet,
  marketFiyatlariniGuncelle,
  marketSayimiKaydet,
  marketSatisiKaydet,
  marketUrunuKaydet,
  marketVerileriniGetir,
} from '../services/marketService';
import './market.css';

const bosUrun = {
  barkod: '', urunAdi: '', stokKodu: '', kategori: 'Genel', marka: '',
  birim: 'Adet', kdvOrani: 20, alisFiyati: '', satisFiyati: '',
  stokMiktari: '', minimumStok: '', rafKonumu: '',
};

const bosFatura = () => ({
  tedarikciAdi: '', faturaNo: '', faturaTarihi: new Date().toISOString().slice(0, 10),
  barkod: '', miktar: 1, alisFiyati: '', kalemler: [],
});

const para = value => new Intl.NumberFormat('tr-TR', {
  style: 'currency', currency: 'TRY', maximumFractionDigits: 2,
}).format(Number(value || 0));

export default function MarketApp({ restaurantId, restaurantName, notify }) {
  const [sekme, setSekme] = useState('ozet');
  const [urunler, setUrunler] = useState([]);
  const [faturalar, setFaturalar] = useState([]);
  const [sayimlar, setSayimlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [arama, setArama] = useState('');
  const [urunFormu, setUrunFormu] = useState(bosUrun);
  const [fatura, setFatura] = useState(bosFatura);
  const [satisBarkodu, setSatisBarkodu] = useState('');
  const [sepet, setSepet] = useState([]);
  const [sayim, setSayim] = useState({});
  const [sayimBarkodu, setSayimBarkodu] = useState('');
  const [zamOrani, setZamOrani] = useState('10');
  const [fiyatKategori, setFiyatKategori] = useState('Tümü');
  const [etiketUrunleri, setEtiketUrunleri] = useState([]);
  const barkodRef = useRef(null);

  const bildir = (mesaj, tip = 'info') => {
    if (typeof notify === 'function') notify(mesaj, tip);
  };

  const verileriYukle = async () => {
    if (!restaurantId || String(restaurantId) === 'super_admin') return;
    setYukleniyor(true);
    setHata('');
    try {
      const data = await marketVerileriniGetir(restaurantId);
      setUrunler(data.urunler);
      setFaturalar(data.faturalar);
      setSayimlar(data.sayimlar);
    } catch (error) {
      setHata(error.message);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    if (!restaurantId || String(restaurantId) === 'super_admin') return undefined;
    let aktif = true;
    marketVerileriniGetir(restaurantId)
      .then(data => {
        if (!aktif) return;
        setUrunler(data.urunler);
        setFaturalar(data.faturalar);
        setSayimlar(data.sayimlar);
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

  const filtreliUrunler = useMemo(() => {
    const metin = arama.trim().toLocaleLowerCase('tr-TR');
    if (!metin) return urunler;
    return urunler.filter(urun => [urun.urun_adi, urun.barkod, urun.stok_kodu, urun.kategori, urun.marka]
      .some(value => String(value || '').toLocaleLowerCase('tr-TR').includes(metin)));
  }, [arama, urunler]);

  const kategoriler = useMemo(
    () => Array.from(new Set(urunler.map(urun => urun.kategori || 'Genel'))).sort(),
    [urunler]
  );

  const ozet = useMemo(() => ({
    urunSayisi: urunler.length,
    stokDegeri: urunler.reduce((t, u) => t + Number(u.stok_miktari || 0) * Number(u.alis_fiyati || 0), 0),
    kritikStok: urunler.filter(u => Number(u.stok_miktari || 0) <= Number(u.minimum_stok || 0)).length,
    potansiyelCiro: urunler.reduce((t, u) => t + Number(u.stok_miktari || 0) * Number(u.satis_fiyati || 0), 0),
  }), [urunler]);

  const urunKaydet = async event => {
    event.preventDefault();
    if (!urunFormu.barkod.trim() || !urunFormu.urunAdi.trim()) return bildir('Barkod ve ürün adı zorunludur.', 'warning');
    try {
      await marketUrunuKaydet(restaurantId, urunFormu);
      setUrunFormu(bosUrun);
      await verileriYukle();
      bildir('Market ürünü kaydedildi.', 'success');
    } catch (error) { bildir(error.message, 'error'); }
  };

  const satisaEkle = event => {
    event.preventDefault();
    const urun = urunler.find(item => String(item.barkod) === satisBarkodu.trim());
    if (!urun) return bildir('Barkod ürün listesinde bulunamadı.', 'warning');
    const mevcut = sepet.find(k => String(k.id) === String(urun.id));
    const yeniAdet = Number(mevcut?.adet || 0) + 1;
    if (yeniAdet > Number(urun.stok_miktari || 0)) return bildir(`${urun.urun_adi} için yeterli stok yok.`, 'warning');
    setSepet(prev => mevcut
      ? prev.map(k => String(k.id) === String(urun.id) ? { ...k, adet: yeniAdet } : k)
      : [...prev, { ...urun, adet: 1 }]);
    setSatisBarkodu('');
  };

  const satisiTamamla = async odemeTipi => {
    if (!sepet.length) return bildir('Satış sepeti boş.', 'warning');
    try {
      await marketSatisiKaydet(restaurantId, sepet, odemeTipi);
      setSepet([]);
      await verileriYukle();
      bildir(`${odemeTipi} satış tamamlandı ve stok düşüldü.`, 'success');
      window.setTimeout(() => barkodRef.current?.focus(), 80);
    } catch (error) { bildir(error.message, 'error'); }
  };

  const faturayaEkle = event => {
    event.preventDefault();
    const urun = urunler.find(item => String(item.barkod) === String(fatura.barkod).trim());
    if (!urun) return bildir('Barkod bulunamadı. Önce ürün kartını oluşturun.', 'warning');
    const miktar = Math.max(Number(fatura.miktar || 1), 0.001);
    const alisFiyati = Number(fatura.alisFiyati || urun.alis_fiyati || 0);
    const mevcut = fatura.kalemler.find(k => String(k.urunId) === String(urun.id));
    const kalemler = mevcut
      ? fatura.kalemler.map(k => String(k.urunId) === String(urun.id)
        ? { ...k, miktar: Number(k.miktar) + miktar, alisFiyati, satirToplami: (Number(k.miktar) + miktar) * alisFiyati } : k)
      : [...fatura.kalemler, {
        urunId: urun.id, barkod: urun.barkod, urunAdi: urun.urun_adi,
        miktar, alisFiyati, kdvOrani: urun.kdv_orani, satirToplami: miktar * alisFiyati,
      }];
    setFatura(prev => ({ ...prev, barkod: '', miktar: 1, alisFiyati: '', kalemler }));
  };

  const faturaToplamlari = useMemo(() => {
    const genelToplam = fatura.kalemler.reduce((t, k) => t + Number(k.satirToplami || 0), 0);
    const kdvToplam = fatura.kalemler.reduce((t, k) => t + Number(k.satirToplami || 0) * Number(k.kdvOrani || 0) / (100 + Number(k.kdvOrani || 0)), 0);
    return { genelToplam, kdvToplam, araToplam: genelToplam - kdvToplam };
  }, [fatura.kalemler]);

  const faturaKaydet = async () => {
    if (!fatura.tedarikciAdi.trim() || fatura.kalemler.length === 0) return bildir('Tedarikçi ve en az bir kalem gereklidir.', 'warning');
    try {
      await marketAlisFaturasiKaydet(restaurantId, { ...fatura, ...faturaToplamlari, urunler });
      setFatura(bosFatura());
      await verileriYukle();
      bildir('Fatura kaydedildi ve stoklar artırıldı.', 'success');
    } catch (error) { bildir(error.message, 'error'); }
  };

  const sayimaEkle = event => {
    event.preventDefault();
    const urun = urunler.find(item => String(item.barkod) === sayimBarkodu.trim());
    if (!urun) return bildir('Barkod ürün listesinde bulunamadı.', 'warning');
    setSayim(prev => ({ ...prev, [urun.id]: Number(prev[urun.id] ?? 0) + 1 }));
    setSayimBarkodu('');
  };

  const sayimiTamamla = async () => {
    const kalemler = urunler.filter(u => Object.prototype.hasOwnProperty.call(sayim, u.id)).map(u => ({
      ...u, sayilanMiktar: Number(sayim[u.id] || 0), fark: Number(sayim[u.id] || 0) - Number(u.stok_miktari || 0),
    }));
    if (!kalemler.length) return bildir('Sayım için en az bir ürün okutun.', 'warning');
    try {
      await marketSayimiKaydet(restaurantId, { sayimAdi: `${new Date().toLocaleDateString('tr-TR')} Market Sayımı`, kalemler });
      setSayim({});
      await verileriYukle();
      bildir('Sayım tamamlandı ve stok farkları işlendi.', 'success');
    } catch (error) { bildir(error.message, 'error'); }
  };

  const fiyatlariUygula = async () => {
    const oran = Number(zamOrani || 0);
    const hedefler = urunler.filter(u => fiyatKategori === 'Tümü' || u.kategori === fiyatKategori)
      .map(u => ({ ...u, yeniFiyat: Math.round(Number(u.satis_fiyati || 0) * (1 + oran / 100) * 100) / 100 }));
    if (!hedefler.length || oran === 0) return bildir('Kategori ve sıfırdan farklı oran girin.', 'warning');
    try {
      await marketFiyatlariniGuncelle(restaurantId, hedefler);
      setEtiketUrunleri(hedefler.map(u => u.id));
      await verileriYukle();
      bildir(`${hedefler.length} fiyat güncellendi ve etiket kuyruğuna eklendi.`, 'success');
    } catch (error) { bildir(error.message, 'error'); }
  };

  const nav = [
    ['ozet', '📊 Genel Bakış'], ['satis', '▥ Barkodlu Satış'], ['urunler', '📦 Ürünler'], ['alis', '🧾 Alış Faturası'],
    ['sayim', '📋 Sayım'], ['fiyat', '💹 Fiyat Güncelle'], ['etiket', '🏷️ Etiket Basımı'],
  ];

  return (
    <section className="market-shell">
      <header className="market-hero">
        <div><span className="market-kicker">INTEGRA MARKET</span><h1>{restaurantName || 'Market'} Operasyon Merkezi</h1><p>Barkod, alış faturası, stok sayımı, fiyat ve raf etiketi tek ekranda.</p></div>
        <button type="button" className="market-refresh" onClick={verileriYukle}>↻ Verileri Yenile</button>
      </header>

      <nav className="market-tabs" aria-label="Market modülü">{nav.map(([key, label]) =>
        <button type="button" key={key} className={sekme === key ? 'active' : ''} onClick={() => setSekme(key)}>{label}</button>
      )}</nav>
      {hata && <div className="market-alert"><strong>Kurulum gerekiyor:</strong> {hata}</div>}
      {yukleniyor && <div className="market-loading">Market verileri hazırlanıyor…</div>}

      {!yukleniyor && sekme === 'ozet' && <>
        <div className="market-stats">
          <article><span>Toplam Ürün</span><strong>{ozet.urunSayisi}</strong><small>Barkodlu ürün kartı</small></article>
          <article><span>Alış Değerli Stok</span><strong>{para(ozet.stokDegeri)}</strong><small>Mevcut maliyet</small></article>
          <article className={ozet.kritikStok ? 'danger' : ''}><span>Kritik Stok</span><strong>{ozet.kritikStok}</strong><small>Minimum seviyede veya altında</small></article>
          <article><span>Potansiyel Ciro</span><strong>{para(ozet.potansiyelCiro)}</strong><small>Satış fiyatı üzerinden</small></article>
        </div>
        <div className="market-grid-two">
          <article className="market-card"><h2>Hızlı işlemler</h2><div className="market-actions">
            <button type="button" onClick={() => setSekme('alis')}>🧾 Fatura gir</button><button type="button" onClick={() => setSekme('sayim')}>📋 Sayım başlat</button>
            <button type="button" onClick={() => setSekme('etiket')}>🏷️ Etiket bas</button><button type="button" onClick={() => setSekme('urunler')}>＋ Ürün ekle</button>
          </div></article>
          <article className="market-card"><h2>Son alış faturaları</h2>{!faturalar.length ? <p className="market-empty">Henüz alış faturası yok.</p> :
            <div className="market-list">{faturalar.slice(0, 5).map(f => <div key={f.id}><span>{f.tedarikci_adi}<small>{f.fatura_tarihi} · {f.fatura_no || 'No yok'}</small></span><strong>{para(f.genel_toplam)}</strong></div>)}</div>}
          </article>
        </div>
      </>}

      {!yukleniyor && sekme === 'satis' && <div className="market-grid-two">
        <div className="market-card">
          <div className="market-heading"><div><span>HIZLI KASA</span><h2>Barkodlu satış</h2></div><strong>{para(sepet.reduce((t, k) => t + Number(k.adet) * Number(k.satis_fiyati), 0))}</strong></div>
          <form className="market-scan simple" onSubmit={satisaEkle}><label>Barkod<input ref={barkodRef} value={satisBarkodu} onChange={e => setSatisBarkodu(e.target.value)} placeholder="Barkodu okutun ve Enter'a basın" /></label><button className="market-primary" type="submit">Sepete Ekle</button></form>
          <div className="market-table"><table><thead><tr><th>Ürün</th><th>Adet</th><th>Fiyat</th><th>Toplam</th><th></th></tr></thead><tbody>
            {sepet.map(k => <tr key={k.id}><td><strong>{k.urun_adi}</strong><small>{k.barkod}</small></td><td><input aria-label={`${k.urun_adi} adedi`} type="number" min="1" max={k.stok_miktari} value={k.adet} onChange={e => setSepet(p => p.map(x => x.id === k.id ? { ...x, adet: Math.max(1, Math.min(Number(e.target.value), Number(x.stok_miktari))) } : x))} style={{ width: '70px', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '8px' }} /></td><td>{para(k.satis_fiyati)}</td><td><strong>{para(Number(k.adet) * Number(k.satis_fiyati))}</strong></td><td><button className="market-remove" type="button" onClick={() => setSepet(p => p.filter(x => x.id !== k.id))}>Sil</button></td></tr>)}
          </tbody></table></div>
        </div>
        <div className="market-card">
          <div className="market-heading"><div><span>ÖDEME</span><h2>Satışı tamamla</h2></div></div>
          <div className="market-stats" style={{ gridTemplateColumns: '1fr' }}><article><span>Ödenecek toplam</span><strong>{para(sepet.reduce((t, k) => t + Number(k.adet) * Number(k.satis_fiyati), 0))}</strong><small>{sepet.reduce((t, k) => t + Number(k.adet), 0)} ürün</small></article></div>
          <div className="market-actions" style={{ marginTop: '14px' }}><button type="button" onClick={() => satisiTamamla('Nakit')}>💵 Nakit</button><button type="button" onClick={() => satisiTamamla('Kredi Kartı')}>💳 Kredi Kartı</button></div>
          <p className="market-note">Ödeme tamamlandığında satış kaydı oluşur ve ürün stokları otomatik düşer.</p>
        </div>
      </div>}

      {!yukleniyor && sekme === 'urunler' && <div className="market-grid-form">
        <form className="market-card market-form" onSubmit={urunKaydet}>
          <div className="market-heading"><div><span>ÜRÜN KARTI</span><h2>Yeni barkodlu ürün</h2></div></div>
          <label>Barkod<input autoFocus value={urunFormu.barkod} onChange={e => setUrunFormu({ ...urunFormu, barkod: e.target.value })} placeholder="869…" /></label>
          <label>Ürün adı<input value={urunFormu.urunAdi} onChange={e => setUrunFormu({ ...urunFormu, urunAdi: e.target.value })} /></label>
          <div className="market-row"><label>Kategori<input value={urunFormu.kategori} onChange={e => setUrunFormu({ ...urunFormu, kategori: e.target.value })} /></label><label>Marka<input value={urunFormu.marka} onChange={e => setUrunFormu({ ...urunFormu, marka: e.target.value })} /></label></div>
          <div className="market-row"><label>Alış fiyatı<input type="number" step="0.01" value={urunFormu.alisFiyati} onChange={e => setUrunFormu({ ...urunFormu, alisFiyati: e.target.value })} /></label><label>Satış fiyatı<input type="number" step="0.01" value={urunFormu.satisFiyati} onChange={e => setUrunFormu({ ...urunFormu, satisFiyati: e.target.value })} /></label></div>
          <div className="market-row"><label>Başlangıç stoğu<input type="number" step="0.001" value={urunFormu.stokMiktari} onChange={e => setUrunFormu({ ...urunFormu, stokMiktari: e.target.value })} /></label><label>Minimum stok<input type="number" step="0.001" value={urunFormu.minimumStok} onChange={e => setUrunFormu({ ...urunFormu, minimumStok: e.target.value })} /></label></div>
          <div className="market-row"><label>KDV<select value={urunFormu.kdvOrani} onChange={e => setUrunFormu({ ...urunFormu, kdvOrani: e.target.value })}><option value="1">%1</option><option value="10">%10</option><option value="20">%20</option></select></label><label>Raf konumu<input value={urunFormu.rafKonumu} onChange={e => setUrunFormu({ ...urunFormu, rafKonumu: e.target.value })} placeholder="A-03" /></label></div>
          <button className="market-primary" type="submit">Ürünü Kaydet</button>
        </form>
        <div className="market-card">
          <div className="market-toolbar"><div><span>ÜRÜN LİSTESİ</span><h2>{filtreliUrunler.length} ürün</h2></div><input value={arama} onChange={e => setArama(e.target.value)} placeholder="Barkod, ürün veya kategori ara" /></div>
          <div className="market-table"><table><thead><tr><th>Barkod / Ürün</th><th>Kategori</th><th>Stok</th><th>Alış</th><th>Satış</th><th>Kâr</th></tr></thead><tbody>
            {filtreliUrunler.map(u => { const kar = Number(u.satis_fiyati) - Number(u.alis_fiyati); return <tr key={u.id}><td><strong>{u.urun_adi}</strong><small>{u.barkod}</small></td><td>{u.kategori}</td><td className={Number(u.stok_miktari) <= Number(u.minimum_stok) ? 'red' : ''}>{u.stok_miktari} {u.birim}</td><td>{para(u.alis_fiyati)}</td><td><strong>{para(u.satis_fiyati)}</strong></td><td className={kar < 0 ? 'red' : 'green'}>{para(kar)}</td></tr>; })}
          </tbody></table></div>
        </div>
      </div>}

      {!yukleniyor && sekme === 'alis' && <div className="market-card">
        <div className="market-heading"><div><span>STOK GİRİŞİ</span><h2>Yeni alış faturası</h2></div><strong>{para(faturaToplamlari.genelToplam)}</strong></div>
        <div className="market-row three"><label>Tedarikçi<input value={fatura.tedarikciAdi} onChange={e => setFatura({ ...fatura, tedarikciAdi: e.target.value })} /></label><label>Fatura no<input value={fatura.faturaNo} onChange={e => setFatura({ ...fatura, faturaNo: e.target.value })} /></label><label>Tarih<input type="date" value={fatura.faturaTarihi} onChange={e => setFatura({ ...fatura, faturaTarihi: e.target.value })} /></label></div>
        <form className="market-scan" onSubmit={faturayaEkle}><label>Barkod<input ref={barkodRef} value={fatura.barkod} onChange={e => setFatura({ ...fatura, barkod: e.target.value })} placeholder="Okutun ve Enter'a basın" /></label><label>Miktar<input type="number" min="0.001" step="0.001" value={fatura.miktar} onChange={e => setFatura({ ...fatura, miktar: e.target.value })} /></label><label>Alış fiyatı<input type="number" min="0" step="0.01" value={fatura.alisFiyati} onChange={e => setFatura({ ...fatura, alisFiyati: e.target.value })} placeholder="Kayıtlı fiyat" /></label><button className="market-primary" type="submit">Kalem Ekle</button></form>
        <div className="market-table"><table><thead><tr><th>Ürün</th><th>Miktar</th><th>Alış</th><th>KDV</th><th>Toplam</th><th></th></tr></thead><tbody>
          {fatura.kalemler.map(k => <tr key={k.urunId}><td><strong>{k.urunAdi}</strong><small>{k.barkod}</small></td><td>{k.miktar}</td><td>{para(k.alisFiyati)}</td><td>%{k.kdvOrani}</td><td>{para(k.satirToplami)}</td><td><button className="market-remove" type="button" onClick={() => setFatura(p => ({ ...p, kalemler: p.kalemler.filter(x => x.urunId !== k.urunId) }))}>Sil</button></td></tr>)}
        </tbody></table></div>
        <div className="market-total"><span>Matrah<strong>{para(faturaToplamlari.araToplam)}</strong></span><span>KDV<strong>{para(faturaToplamlari.kdvToplam)}</strong></span><span>Genel toplam<strong>{para(faturaToplamlari.genelToplam)}</strong></span><button className="market-primary" type="button" onClick={faturaKaydet}>Kaydet ve Stoğa İşle</button></div>
      </div>}

      {!yukleniyor && sekme === 'sayim' && <div className="market-grid-two">
        <div className="market-card"><div className="market-heading"><div><span>MOBİL / BARKOD</span><h2>Stok sayımı</h2></div><strong>{Object.keys(sayim).length} kalem</strong></div>
          <form className="market-scan simple" onSubmit={sayimaEkle}><label>Barkod<input ref={barkodRef} value={sayimBarkodu} onChange={e => setSayimBarkodu(e.target.value)} placeholder="Her adet için okutun" /></label><button className="market-primary" type="submit">Sayıma Ekle</button></form>
          <div className="market-list">{urunler.filter(u => Object.prototype.hasOwnProperty.call(sayim, u.id)).map(u => <div key={u.id}><span><strong>{u.urun_adi}</strong><small>Sistem: {u.stok_miktari}</small></span><label className="market-count">Sayılan<input type="number" min="0" step="0.001" value={sayim[u.id]} onChange={e => setSayim(p => ({ ...p, [u.id]: e.target.value }))} /></label></div>)}</div>
          <button className="market-primary market-full" type="button" onClick={sayimiTamamla}>Sayımı Tamamla ve Farkları İşle</button>
        </div>
        <div className="market-card"><h2>Son sayımlar</h2>{!sayimlar.length ? <p className="market-empty">Henüz tamamlanmış sayım yok.</p> : <div className="market-list">{sayimlar.map(s => <div key={s.id}><span>{s.sayim_adi}<small>{s.toplam_kalem} ürün</small></span><strong>{s.farkli_kalem} fark</strong></div>)}</div>}</div>
      </div>}

      {!yukleniyor && sekme === 'fiyat' && <div className="market-card">
        <div className="market-heading"><div><span>TOPLU İŞLEM</span><h2>Fiyat güncelleme merkezi</h2></div></div>
        <div className="market-price-controls"><label>Kategori<select value={fiyatKategori} onChange={e => setFiyatKategori(e.target.value)}><option>Tümü</option>{kategoriler.map(k => <option key={k}>{k}</option>)}</select></label><label>Değişim oranı (%)<input type="number" step="0.01" value={zamOrani} onChange={e => setZamOrani(e.target.value)} /></label><button className="market-primary" type="button" onClick={fiyatlariUygula}>Fiyatları Güncelle</button></div>
        <p className="market-note">Negatif oran indirim uygular. Güncellenen ürünler etiket kuyruğuna eklenir.</p>
        <div className="market-table"><table><thead><tr><th>Ürün</th><th>Mevcut</th><th>Yeni</th><th>Fark</th></tr></thead><tbody>
          {urunler.filter(u => fiyatKategori === 'Tümü' || u.kategori === fiyatKategori).map(u => { const yeni = Number(u.satis_fiyati) * (1 + Number(zamOrani || 0) / 100); return <tr key={u.id}><td><strong>{u.urun_adi}</strong><small>{u.barkod}</small></td><td>{para(u.satis_fiyati)}</td><td><strong>{para(yeni)}</strong></td><td className={yeni >= Number(u.satis_fiyati) ? 'green' : 'red'}>{para(yeni - Number(u.satis_fiyati))}</td></tr>; })}
        </tbody></table></div>
      </div>}

      {!yukleniyor && sekme === 'etiket' && <div className="market-card">
        <div className="market-heading"><div><span>RAF VE BARKOD</span><h2>Etiket basım kuyruğu</h2></div><button className="market-primary" type="button" onClick={() => etiketUrunleri.length ? window.print() : bildir('Önce ürün seçin.', 'warning')}>🖨️ Seçilenleri Yazdır</button></div>
        <div className="market-label-list">{urunler.map(u => <label key={u.id}><input type="checkbox" checked={etiketUrunleri.includes(u.id)} onChange={e => setEtiketUrunleri(p => e.target.checked ? [...p, u.id] : p.filter(id => id !== u.id))} /><span><strong>{u.urun_adi}</strong><small>{u.barkod}</small></span><b>{para(u.satis_fiyati)}</b></label>)}</div>
        <div className="market-print-labels" aria-hidden="true">{urunler.filter(u => etiketUrunleri.includes(u.id)).map(u => <article key={u.id}><div>{restaurantName}</div><strong>{u.urun_adi}</strong><b>{para(u.satis_fiyati)}</b><span>|||| ||| |||| | |||</span><small>{u.barkod}</small></article>)}</div>
      </div>}
    </section>
  );
}
