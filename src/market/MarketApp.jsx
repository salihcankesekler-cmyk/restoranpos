import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  marketAlisFaturasiKaydet,
  marketCariKaydet,
  marketCariHareketiKaydet,
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

const bosGrup = { grupAdi: '', kdvOrani: 20, satisEkranindaGoster: true, sira: 0 };
const bosCari = { ad: '', telefon: '', notMetni: '' };
const bosFinansHareketi = () => ({
  islemTipi: 'tahsilat',
  tutar: '',
  aciklama: '',
  tarih: new Date().toISOString().slice(0, 10),
});

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

const gunAnahtari = value => {
  const tarih = value instanceof Date ? value : new Date(value);
  const yil = tarih.getFullYear();
  const ay = String(tarih.getMonth() + 1).padStart(2, '0');
  const gun = String(tarih.getDate()).padStart(2, '0');
  return `${yil}-${ay}-${gun}`;
};

export default function MarketApp({ restaurantId, restaurantName, notify }) {
  const [sekme, setSekme] = useState('satis');
  const [urunler, setUrunler] = useState([]);
  const [gruplar, setGruplar] = useState([]);
  const [faturalar, setFaturalar] = useState([]);
  const [sayimlar, setSayimlar] = useState([]);
  const [cariler, setCariler] = useState([]);
  const [satislar, setSatislar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [arama, setArama] = useState('');
  const [urunFormu, setUrunFormu] = useState(bosUrun);
  const [grupFormu, setGrupFormu] = useState(bosGrup);
  const [hizliDuzenleme, setHizliDuzenleme] = useState(null);
  const [fatura, setFatura] = useState(bosFatura);
  const [acikFaturaId, setAcikFaturaId] = useState('');
  const [satisBarkodu, setSatisBarkodu] = useState('');
  const [satisAdedi, setSatisAdedi] = useState('1');
  const [satisArama, setSatisArama] = useState('');
  const [sepet, setSepet] = useState([]);
  const [satisGrubu, setSatisGrubu] = useState('');
  const [satisCariId, setSatisCariId] = useState('');
  const [fiyatBekleyenUrun, setFiyatBekleyenUrun] = useState(null);
  const [anlikSatisFiyati, setAnlikSatisFiyati] = useState('');
  const [cariFormu, setCariFormu] = useState(bosCari);
  const [cariFormYeri, setCariFormYeri] = useState('');
  const [finansCariId, setFinansCariId] = useState('');
  const [finansHareketi, setFinansHareketi] = useState(bosFinansHareketi);
  const [sayim, setSayim] = useState({});
  const [sayimBarkodu, setSayimBarkodu] = useState('');
  const [etiketUrunleri, setEtiketUrunleri] = useState([]);
  const [etiketArama, setEtiketArama] = useState('');
  const [raporAraligi, setRaporAraligi] = useState('bugun');
  const [raporSekmesi, setRaporSekmesi] = useState('gun_sonu');
  const [raporTarihi, setRaporTarihi] = useState(() => gunAnahtari(new Date()));
  const [acikSatisId, setAcikSatisId] = useState('');
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
    setSatislar(data.satislar || []);
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

  const satisUrunleri = useMemo(() => {
    const metin = satisArama.trim().toLocaleLowerCase('tr-TR');
    return urunler.filter(urun => {
      if (String(urun.grup_id) !== String(aktifSatisGrubu)) return false;
      if (!metin) return true;
      return [urun.urun_adi, urun.barkod, urun.marka]
        .some(value => String(value || '').toLocaleLowerCase('tr-TR').includes(metin));
    });
  }, [aktifSatisGrubu, satisArama, urunler]);

  const filtreliEtiketUrunleri = useMemo(() => {
    const metin = etiketArama.trim().toLocaleLowerCase('tr-TR');
    if (!metin) return urunler;
    return urunler.filter(urun => [urun.urun_adi, urun.barkod]
      .some(value => String(value || '').toLocaleLowerCase('tr-TR').includes(metin)));
  }, [etiketArama, urunler]);

  const rapor = useMemo(() => {
    const simdi = new Date();
    let baslangic = null;
    let bitis = null;
    if (raporSekmesi === 'gun_sonu') {
      baslangic = new Date(`${raporTarihi}T00:00:00`);
      bitis = new Date(baslangic);
      bitis.setDate(bitis.getDate() + 1);
    } else if (raporAraligi === 'bugun') {
      baslangic = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate());
    } else if (raporAraligi === '7gun') {
      baslangic = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate() - 6);
    } else if (raporAraligi === '30gun') {
      baslangic = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate() - 29);
    } else if (raporAraligi === 'ay') {
      baslangic = new Date(simdi.getFullYear(), simdi.getMonth(), 1);
    }
    const secilenSatislar = satislar.filter(satis => {
      const satisTarihi = new Date(satis.created_at);
      return (!baslangic || satisTarihi >= baslangic) && (!bitis || satisTarihi < bitis);
    });
    const odemeler = { Nakit: 0, 'Kredi Kartı': 0, 'Cari / Veresiye': 0 };
    const gunler = new Map();
    const saatler = new Map();
    const urunDagilimi = new Map();
    const maliyetler = new Map(urunler.map(urun => [String(urun.id), Number(urun.alis_fiyati || 0)]));
    let urunAdedi = 0;
    let tahminiMaliyet = 0;
    secilenSatislar.forEach(satis => {
      const toplam = Number(satis.toplam_tutar || 0);
      odemeler[satis.odeme_tipi] = Number(odemeler[satis.odeme_tipi] || 0) + toplam;
      const gun = gunAnahtari(satis.created_at);
      const saat = `${String(new Date(satis.created_at).getHours()).padStart(2, '0')}:00`;
      const gunKaydi = gunler.get(gun) || { gun, ciro: 0, satisAdedi: 0, urunAdedi: 0 };
      const saatKaydi = saatler.get(saat) || { saat, ciro: 0, satisAdedi: 0 };
      gunKaydi.ciro += toplam;
      gunKaydi.satisAdedi += 1;
      saatKaydi.ciro += toplam;
      saatKaydi.satisAdedi += 1;
      (satis.market_satis_kalemleri || []).forEach(kalem => {
        const adet = Number(kalem.adet || 0);
        urunAdedi += adet;
        gunKaydi.urunAdedi += adet;
        const kalemMaliyeti = Number(maliyetler.get(String(kalem.urun_id)) || 0) * adet;
        tahminiMaliyet += kalemMaliyeti;
        const urunAnahtari = String(kalem.urun_id || kalem.urun_adi);
        const urunKaydi = urunDagilimi.get(urunAnahtari) || { urunAdi: kalem.urun_adi, adet: 0, ciro: 0, maliyet: 0 };
        urunKaydi.adet += adet;
        urunKaydi.ciro += Number(kalem.toplam_tutar || 0);
        urunKaydi.maliyet += kalemMaliyeti;
        urunDagilimi.set(urunAnahtari, urunKaydi);
      });
      gunler.set(gun, gunKaydi);
      saatler.set(saat, saatKaydi);
    });
    const ciro = secilenSatislar.reduce((toplam, satis) => toplam + Number(satis.toplam_tutar || 0), 0);
    return {
      satislar: secilenSatislar,
      ciro,
      satisAdedi: secilenSatislar.length,
      urunAdedi,
      ortalamaSepet: secilenSatislar.length ? ciro / secilenSatislar.length : 0,
      tahminiMaliyet,
      tahminiKar: ciro - tahminiMaliyet,
      odemeler,
      gunler: Array.from(gunler.values()).sort((a, b) => b.gun.localeCompare(a.gun)),
      saatler: Array.from(saatler.values()).sort((a, b) => a.saat.localeCompare(b.saat)),
      urunler: Array.from(urunDagilimi.values())
        .map(urun => ({ ...urun, kar: urun.ciro - urun.maliyet }))
        .sort((a, b) => b.ciro - a.ciro),
    };
  }, [raporAraligi, raporSekmesi, raporTarihi, satislar, urunler]);

  const stokRaporu = useMemo(() => {
    const kalemler = urunler.map(urun => {
      const miktar = Number(urun.stok_miktari || 0);
      const alisDegeri = miktar * Number(urun.alis_fiyati || 0);
      const satisDegeri = miktar * Number(urun.satis_fiyati || 0);
      return { ...urun, miktar, alisDegeri, satisDegeri, potansiyelKar: satisDegeri - alisDegeri };
    });
    return {
      kalemler,
      toplamMiktar: kalemler.reduce((toplam, urun) => toplam + urun.miktar, 0),
      toplamAlis: kalemler.reduce((toplam, urun) => toplam + urun.alisDegeri, 0),
      toplamSatis: kalemler.reduce((toplam, urun) => toplam + urun.satisDegeri, 0),
      potansiyelKar: kalemler.reduce((toplam, urun) => toplam + urun.potansiyelKar, 0),
    };
  }, [urunler]);

  const sayimFarkRaporu = useMemo(() => {
    const urunHaritasi = new Map(urunler.map(urun => [String(urun.id), urun]));
    return sayimlar.flatMap(sayimKaydi =>
      (sayimKaydi.market_sayim_kalemleri || [])
        .filter(kalem => Number(kalem.fark_miktari || 0) !== 0)
        .map(kalem => {
          const urun = urunHaritasi.get(String(kalem.urun_id));
          return {
            id: kalem.id,
            sayimAdi: sayimKaydi.sayim_adi,
            tarih: sayimKaydi.tamamlanma_tarihi || sayimKaydi.created_at,
            urunAdi: urun?.urun_adi || 'Silinmiş / bulunamayan ürün',
            barkod: urun?.barkod || '',
            sistemMiktari: Number(kalem.sistem_miktari || 0),
            sayilanMiktar: Number(kalem.sayilan_miktar || 0),
            fark: Number(kalem.fark_miktari || 0),
          };
        })
    ).sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
  }, [sayimlar, urunler]);

  const seciliSatisCarisi = cariler.find(cari => String(cari.id) === String(satisCariId));
  const seciliAlisCarisi = cariler.find(cari => String(cari.id) === String(fatura.cariId));
  const seciliFinansCarisi = cariler.find(cari => String(cari.id) === String(finansCariId));
  const finansOzeti = useMemo(() => ({
    alacak: cariler.reduce((toplam, cari) => toplam + Math.max(Number(cari.bakiye || 0), 0), 0),
    borc: cariler.reduce((toplam, cari) => toplam + Math.abs(Math.min(Number(cari.bakiye || 0), 0)), 0),
    sifir: cariler.filter(cari => Number(cari.bakiye || 0) === 0).length,
  }), [cariler]);

  const grupKaydet = async event => {
    event.preventDefault();
    try {
      const kayit = await marketGrubuKaydet(restaurantId, grupFormu);
      setGrupFormu(bosGrup);
      await verileriYukle(true);
      if (!urunFormu.grupId) {
        setUrunFormu(prev => ({
          ...prev,
          grupId: kayit.id,
          kategori: kayit.grup_adi,
          kdvOrani: Number(kayit.kdv_orani ?? 20),
        }));
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
        kdvOrani: Number(grup.kdv_orani ?? 20),
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

  const sepetSatirAnahtari = kalem => String(kalem.satir_id || kalem.id);

  const urunuSepeteEkle = (urun, girilenAdet = 1, satirId = String(urun.id)) => {
    const eklenecekAdet = Math.max(Number(girilenAdet || 1), 0.001);
    const mevcut = sepet.find(kalem => sepetSatirAnahtari(kalem) === String(satirId));
    setSepet(prev => mevcut
      ? prev.map(kalem => sepetSatirAnahtari(kalem) === String(satirId) ? { ...kalem, adet: Number(kalem.adet) + eklenecekAdet } : kalem)
      : [...prev, { ...urun, adet: eklenecekAdet, satir_id: String(satirId) }]);
  };

  const sepetAdediniDegistir = (satirId, yeniAdet) => {
    const adet = Number(yeniAdet);
    setSepet(prev => adet <= 0
      ? prev.filter(kalem => sepetSatirAnahtari(kalem) !== String(satirId))
      : prev.map(kalem => sepetSatirAnahtari(kalem) === String(satirId) ? { ...kalem, adet } : kalem));
  };

  const urunuFiyatKontrolluEkle = (urun, adet) => {
    if (Number(urun.satis_fiyati || 0) <= 0) {
      setFiyatBekleyenUrun({ urun, adet: Math.max(Number(adet || 1), 0.001) });
      setAnlikSatisFiyati('');
      return;
    }
    urunuSepeteEkle(urun, adet);
  };

  const secilenUrunuSepeteEkle = urun => {
    urunuFiyatKontrolluEkle(urun, satisAdedi);
    setSatisAdedi('1');
  };

  const satisaEkle = event => {
    event.preventDefault();
    const urun = urunler.find(item => String(item.barkod) === satisBarkodu.trim());
    if (!urun) return bildir('Barkod ürün listesinde bulunamadı.', 'warning');
    urunuFiyatKontrolluEkle(urun, satisAdedi);
    setSatisBarkodu('');
    setSatisAdedi('1');
  };

  const anlikSatisFiyatiniUygula = event => {
    event.preventDefault();
    const fiyat = Number(anlikSatisFiyati);
    if (!Number.isFinite(fiyat) || fiyat <= 0) return bildir('Sıfırdan büyük bir satış fiyatı girin.', 'warning');
    const satirId = `${fiyatBekleyenUrun.urun.id}-fiyat-${fiyat.toFixed(2)}`;
    urunuSepeteEkle({ ...fiyatBekleyenUrun.urun, satis_fiyati: fiyat }, fiyatBekleyenUrun.adet, satirId);
    setFiyatBekleyenUrun(null);
    setAnlikSatisFiyati('');
    window.setTimeout(() => barkodRef.current?.focus(), 80);
  };

  const satisiTamamla = async odemeTipi => {
    if (!sepet.length) return bildir('Satış sepeti boş.', 'warning');
    if (odemeTipi === 'Cari / Veresiye' && !satisCariId) return bildir('Veresiye satış için cari seçin.', 'warning');
    try {
      const satilanKalemler = sepet.map(kalem => ({ ...kalem }));
      const toplam = satilanKalemler.reduce((tutar, kalem) => tutar + Number(kalem.adet) * Number(kalem.satis_fiyati), 0);
      const yeniSatis = await marketSatisiKaydet(restaurantId, satilanKalemler, odemeTipi, satisCariId);
      const satilanMiktarlar = satilanKalemler.reduce((toplamlar, kalem) => {
        const urunId = String(kalem.id);
        toplamlar.set(urunId, Number(toplamlar.get(urunId) || 0) + Number(kalem.adet || 0));
        return toplamlar;
      }, new Map());
      setSepet([]);
      setUrunler(prev => prev.map(urun => {
        const satilanMiktar = Number(satilanMiktarlar.get(String(urun.id)) || 0);
        return satilanMiktar ? { ...urun, stok_miktari: Number(urun.stok_miktari || 0) - satilanMiktar } : urun;
      }));
      setSatislar(prev => [yeniSatis, ...prev]);
      if (odemeTipi === 'Cari / Veresiye' && satisCariId) {
        setCariler(prev => prev.map(cari => String(cari.id) === String(satisCariId)
          ? { ...cari, bakiye: Number(cari.bakiye || 0) + toplam }
          : cari));
      }
      void verileriYukle(true);
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
      if (cariFormYeri === 'finans') setFinansCariId(String(yeniCari.id));
      setCariFormu(bosCari);
      setCariFormYeri('');
      await verileriYukle(true);
      bildir('Cari kaydedildi ve seçildi.', 'success');
    } catch (error) { bildir(error.message, 'error'); }
  };

  const finansHareketiKaydet = async event => {
    event.preventDefault();
    try {
      const guncellenenCari = await marketCariHareketiKaydet(restaurantId, {
        ...finansHareketi,
        cariId: finansCariId,
      });
      setCariler(prev => prev.map(cari => String(cari.id) === String(guncellenenCari.id) ? guncellenenCari : cari));
      setFinansHareketi(bosFinansHareketi());
      bildir(finansHareketi.islemTipi === 'tahsilat' ? 'Tahsilat cari hesabına işlendi.' : 'Ödeme cari hesabına işlendi.', 'success');
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
    ['satis', '▥ Barkodlu Satış'],
    ['gruplar', '▦ Gruplar'],
    ['urunler', '📦 Ürünler'],
    ['alis', '🧾 Alış Faturaları'],
    ['finans', '💰 Finans / Cari'],
    ['sayim', '📋 Sayım'],
    ['etiket', '🏷️ Etiket Basımı'],
    ['raporlar', '📈 Raporlar'],
  ];

  return (
    <section className="market-shell">
      <nav className="market-tabs" aria-label="Market modülü">{nav.map(([key, label]) =>
        <button type="button" key={key} className={sekme === key ? 'active' : ''} onClick={() => setSekme(key)}>{label}</button>
      )}<button type="button" className="market-tab-refresh" onClick={() => verileriYukle(false)} aria-label="Verileri yenile">↻</button></nav>
      {hata && <div className="market-alert"><strong>Kontrol gerekiyor:</strong> {hata}</div>}
      {yukleniyor && <div className="market-loading">Market verileri hazırlanıyor…</div>}

      {!yukleniyor && sekme === 'satis' && <div className="market-pos-layout">
        <div className="market-card market-catalog">
          <div className="market-heading"><div><span>ÜRÜN SEÇİMİ</span><h2>Hızlı satış</h2></div><small>{satisUrunleri.length} ürün</small></div>
          <form className="market-sale-scan" onSubmit={satisaEkle}>
            <label>Adet<input type="number" min="0.001" step="0.001" value={satisAdedi} onFocus={event => event.target.select()} onChange={event => setSatisAdedi(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); barkodRef.current?.focus(); } }} /></label>
            <label>Barkod<input ref={barkodRef} value={satisBarkodu} onChange={event => setSatisBarkodu(event.target.value)} placeholder="Adedi yazın, barkodu okutun" /></label>
            <button className="market-primary" type="submit">Sepete Ekle</button>
          </form>
          <input className="market-sale-search" value={satisArama} onChange={event => setSatisArama(event.target.value)} placeholder="Ürün adı veya barkod ile ara" />
          <div className="market-group-tabs">
            {gorunenGruplar.map(grup => <button type="button" key={grup.id} className={String(aktifSatisGrubu) === String(grup.id) ? 'active' : ''} onClick={() => setSatisGrubu(grup.id)}>{grup.grup_adi}</button>)}
          </div>
          {!gorunenGruplar.length && <p className="market-empty">Satış ekranında gösterilen grup yok. Gruplar bölümünden en az bir grubu görünür yapın.</p>}
          <div className="market-sale-products">
            {satisUrunleri.map(urun => <button type="button" key={urun.id} onClick={() => secilenUrunuSepeteEkle(urun)}>
              <span><strong>{urun.urun_adi}</strong><small>{urun.barkod} · Stok {urun.stok_miktari}</small></span>
              <b>{Number(urun.satis_fiyati || 0) > 0 ? para(urun.satis_fiyati) : 'Satışta fiyat gir'}</b>
              <i>＋</i>
            </button>)}
            {gorunenGruplar.length > 0 && !satisUrunleri.length && <p className="market-empty">Bu grupta aramaya uygun ürün bulunamadı.</p>}
          </div>
        </div>
        <div className="market-card market-checkout">
          <div className="market-heading"><div><span>SEPET VE ÖDEME</span><h2>{sepet.reduce((toplam, kalem) => toplam + Number(kalem.adet), 0)} ürün</h2></div><strong>{para(sepet.reduce((toplam, kalem) => toplam + Number(kalem.adet) * Number(kalem.satis_fiyati), 0))}</strong></div>
          {!sepet.length ? <div className="market-cart-empty">Sepet boş. Soldan ürüne dokunarak satışa ekleyin.</div> :
            <div className="market-table market-cart-table"><table><thead><tr><th>Ürün</th><th>Adet</th><th>Toplam</th><th></th></tr></thead><tbody>
              {sepet.map(kalem => {
                const satirId = sepetSatirAnahtari(kalem);
                return <tr key={satirId}><td><strong>{kalem.urun_adi}</strong><small>{para(kalem.satis_fiyati)}</small></td><td><div className="market-quantity-control"><button type="button" aria-label={`${kalem.urun_adi} azalt`} onClick={() => sepetAdediniDegistir(satirId, Number(kalem.adet) - 1)}>−</button><input aria-label={`${kalem.urun_adi} adedi`} type="number" min="0.001" step="0.001" value={kalem.adet} onFocus={event => event.target.select()} onChange={event => sepetAdediniDegistir(satirId, event.target.value)} /><button type="button" aria-label={`${kalem.urun_adi} artır`} onClick={() => sepetAdediniDegistir(satirId, Number(kalem.adet) + 1)}>＋</button></div></td><td><strong>{para(Number(kalem.adet) * Number(kalem.satis_fiyati))}</strong></td><td><button className="market-remove" type="button" onClick={() => setSepet(prev => prev.filter(item => sepetSatirAnahtari(item) !== satirId))}>×</button></td></tr>;
              })}
            </tbody></table></div>}
          <div className="market-checkout-cari">
            <label className="market-field">Cari (isteğe bağlı)<select value={satisCariId} onChange={event => setSatisCariId(event.target.value)}><option value="">Cari seçmeden satış</option>{cariler.map(cari => <option value={cari.id} key={cari.id}>{cari.ad} · {para(cari.bakiye)}</option>)}</select></label>
            {cariKayitAlani('satis')}
            {cariOzeti(seciliSatisCarisi)}
          </div>
          <div className="market-payment-buttons"><button type="button" onClick={() => satisiTamamla('Nakit')}>💵<span>Nakit</span></button><button type="button" onClick={() => satisiTamamla('Kredi Kartı')}>💳<span>Kart</span></button><button type="button" onClick={() => satisiTamamla('Cari / Veresiye')}>👤<span>Cari</span></button></div>
          <p className="market-note">Veresiye işlem için cari seçimi zorunludur. Nakit ve kart satışlarında cari seçimi isteğe bağlıdır.</p>
        </div>
        {fiyatBekleyenUrun && <div className="market-price-modal" role="dialog" aria-modal="true" aria-label="Satış fiyatı gir">
          <form onSubmit={anlikSatisFiyatiniUygula}>
            <span>SATIŞ FİYATI</span>
            <h2>{fiyatBekleyenUrun.urun.urun_adi}</h2>
            <p>Bu ürünün kayıtlı satış fiyatı yok. Yalnızca bu fişte kullanılacak fiyatı girin.</p>
            <label>Fiyat (TL)<input type="number" min="0.01" step="0.01" value={anlikSatisFiyati} onChange={event => setAnlikSatisFiyati(event.target.value)} autoFocus /></label>
            <small>{fiyatBekleyenUrun.adet} adet sepete eklenecek.</small>
            <div><button className="market-remove" type="button" onClick={() => setFiyatBekleyenUrun(null)}>Vazgeç</button><button className="market-primary" type="submit">Fiyatı Uygula</button></div>
          </form>
        </div>}
      </div>}

      {!yukleniyor && sekme === 'gruplar' && <div className="market-grid-form">
        <form className="market-card market-form" onSubmit={grupKaydet}>
          <div className="market-heading"><div><span>GRUP KARTI</span><h2>{grupFormu.id ? 'Grubu düzenle' : 'Yeni grup aç'}</h2></div>{grupFormu.id && <button className="market-remove" type="button" onClick={() => setGrupFormu(bosGrup)}>Vazgeç</button>}</div>
          <label>Grup adı<input value={grupFormu.grupAdi} onChange={event => setGrupFormu({ ...grupFormu, grupAdi: event.target.value })} placeholder="Örn. İçecekler" autoFocus /></label>
          <div className="market-row"><label>Varsayılan KDV<select value={grupFormu.kdvOrani} onChange={event => setGrupFormu({ ...grupFormu, kdvOrani: event.target.value })}><option value="0">%0</option><option value="1">%1</option><option value="10">%10</option><option value="20">%20</option></select></label><label>Sıra<input type="number" value={grupFormu.sira} onChange={event => setGrupFormu({ ...grupFormu, sira: event.target.value })} /></label></div>
          <label className="market-check"><input type="checkbox" checked={grupFormu.satisEkranindaGoster} onChange={event => setGrupFormu({ ...grupFormu, satisEkranindaGoster: event.target.checked })} /> Satış ekranında kısayol olarak göster</label>
          <button className="market-primary" type="submit">{grupFormu.id ? 'Grubu Güncelle' : 'Grubu Aç'}</button>
        </form>
        <div className="market-card">
          <div className="market-heading"><div><span>GRUPLAR</span><h2>{gruplar.length} grup</h2></div></div>
          <div className="market-group-list">{gruplar.map(grup => <div key={grup.id}>
            <span><strong>{grup.grup_adi}</strong><small>{urunler.filter(urun => String(urun.grup_id) === String(grup.id)).length} ürün · KDV %{Number(grup.kdv_orani ?? 20)} · Sıra {grup.sira}</small></span>
            <div className="market-inline-actions">
              <button type="button" className={grup.satis_ekraninda_goster ? 'active' : ''} onClick={() => grupGorunurlugunuDegistir(grup)}>{grup.satis_ekraninda_goster ? '👁 Görünüyor' : '⊘ Gizli'}</button>
              <button type="button" aria-label={`${grup.grup_adi} grubunu düzenle`} onClick={() => setGrupFormu({ id: grup.id, grupAdi: grup.grup_adi, kdvOrani: Number(grup.kdv_orani ?? 20), satisEkranindaGoster: grup.satis_ekraninda_goster, sira: grup.sira })}>✎ Düzenle</button>
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
            setUrunFormu({
              ...urunFormu,
              grupId: event.target.value,
              kategori: grup?.grup_adi || '',
              kdvOrani: Number(grup?.kdv_orani ?? 20),
            });
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

      {!yukleniyor && sekme === 'finans' && <div className="market-finance-layout">
        <div className="market-card">
          <div className="market-heading"><div><span>CARİ BAKİYELERİ</span><h2>Finans özeti</h2></div><strong>{cariler.length} cari</strong></div>
          <div className="market-finance-stats">
            <div><span>Toplam Alacak</span><strong>{para(finansOzeti.alacak)}</strong><small>Müşterilerden alınacak</small></div>
            <div><span>Toplam Borç</span><strong>{para(finansOzeti.borc)}</strong><small>Tedarikçilere ödenecek</small></div>
            <div><span>Bakiyesi Sıfır</span><strong>{finansOzeti.sifir}</strong><small>Kapanmış cari</small></div>
          </div>
          {cariKayitAlani('finans')}
          <div className="market-cari-balance-list">{cariler.map(cari => {
            const bakiye = Number(cari.bakiye || 0);
            return <button type="button" key={cari.id} className={String(finansCariId) === String(cari.id) ? 'active' : ''} onClick={() => setFinansCariId(String(cari.id))}>
              <span><strong>{cari.ad}</strong><small>{cari.telefon || 'Telefon yok'}</small></span>
              <b className={bakiye < 0 ? 'red' : 'green'}>{bakiye > 0 ? 'Alacak ' : bakiye < 0 ? 'Borç ' : ''}{para(Math.abs(bakiye))}</b>
            </button>;
          })}{!cariler.length && <p className="market-empty">Henüz cari kaydı yok.</p>}</div>
        </div>
        <div className="market-card">
          <div className="market-heading"><div><span>ÖDEME / TAHSİLAT</span><h2>Cari hareket gir</h2></div></div>
          <form className="market-finance-form" onSubmit={finansHareketiKaydet}>
            <label>Cari<select required value={finansCariId} onChange={event => setFinansCariId(event.target.value)}><option value="">Cari seçin</option>{cariler.map(cari => <option key={cari.id} value={cari.id}>{cari.ad}</option>)}</select></label>
            <div className="market-transaction-types">
              <button type="button" className={finansHareketi.islemTipi === 'tahsilat' ? 'active income' : ''} onClick={() => setFinansHareketi({ ...finansHareketi, islemTipi: 'tahsilat' })}>↓ Tahsilat Aldım</button>
              <button type="button" className={finansHareketi.islemTipi === 'odeme' ? 'active expense' : ''} onClick={() => setFinansHareketi({ ...finansHareketi, islemTipi: 'odeme' })}>↑ Ödeme Yaptım</button>
            </div>
            <div className="market-row"><label>Tutar (TL)<input type="number" min="0.01" step="0.01" value={finansHareketi.tutar} onChange={event => setFinansHareketi({ ...finansHareketi, tutar: event.target.value })} /></label><label>Tarih<input type="date" value={finansHareketi.tarih} onChange={event => setFinansHareketi({ ...finansHareketi, tarih: event.target.value })} /></label></div>
            <label>Açıklama<input value={finansHareketi.aciklama} onChange={event => setFinansHareketi({ ...finansHareketi, aciklama: event.target.value })} placeholder="Örn. Havale ile tahsilat" /></label>
            <button className="market-primary" type="submit">{finansHareketi.islemTipi === 'tahsilat' ? 'Tahsilatı Kaydet' : 'Ödemeyi Kaydet'}</button>
          </form>
          {seciliFinansCarisi ? <>
            {cariOzeti(seciliFinansCarisi)}
            <div className="market-heading"><div><span>HAREKETLER</span><h2>Hesap geçmişi</h2></div></div>
            <div className="market-finance-history">{(Array.isArray(seciliFinansCarisi.hareketler) ? seciliFinansCarisi.hareketler : []).map(hareket => <div key={hareket.id}>
              <span><strong>{hareket.tip}</strong><small>{hareket.aciklama || 'Açıklama yok'} · {new Date(hareket.tarih).toLocaleString('tr-TR')}</small></span>
              <b className={hareket.tip === 'Tahsilat' ? 'green' : hareket.tip === 'Ödeme' ? 'red' : ''}>{para(hareket.tutar)}</b>
            </div>)}{(!Array.isArray(seciliFinansCarisi.hareketler) || !seciliFinansCarisi.hareketler.length) && <p className="market-empty">Bu caride henüz hareket yok.</p>}</div>
          </> : <p className="market-empty">Bakiye ve hareketleri görmek için soldan bir cari seçin.</p>}
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
        <input className="market-label-search" value={etiketArama} onChange={event => setEtiketArama(event.target.value)} placeholder="Ürün adı veya barkoda göre ara" />
        <div className="market-label-columns"><span></span><span>Ürün / Barkod</span><span>Alış</span><span>Satış</span><span></span></div>
        <div className="market-label-list">{filtreliEtiketUrunleri.map(urun => {
          const acik = String(hizliDuzenleme?.id) === String(urun.id);
          return <div className="market-label-row" key={urun.id}>
            <input aria-label={`${urun.urun_adi} etiketini seç`} type="checkbox" checked={etiketUrunleri.includes(urun.id)} onChange={event => setEtiketUrunleri(prev => event.target.checked ? [...prev, urun.id] : prev.filter(id => id !== urun.id))} />
            <span><strong>{urun.urun_adi}</strong><small>{urun.barkod}</small></span>
            <b>{para(urun.alis_fiyati)}</b>
            <b>{para(urun.satis_fiyati)}</b>
            <button className="market-label-edit" type="button" aria-label={`${urun.urun_adi} fiyatlarını düzenle`} onClick={() => acik ? setHizliDuzenleme(null) : hizliDuzenlemeyiAc(urun)}>✎</button>
            {acik && <div className="market-label-price-edit">
              <label>Alış fiyatı<input type="number" min="0" step="0.01" value={hizliDuzenleme.alisFiyati} onChange={event => setHizliDuzenleme({ ...hizliDuzenleme, alisFiyati: event.target.value })} /></label>
              <label>Satış fiyatı<input type="number" min="0" step="0.01" value={hizliDuzenleme.satisFiyati} onChange={event => setHizliDuzenleme({ ...hizliDuzenleme, satisFiyati: event.target.value })} /></label>
              <button className="market-primary" type="button" onClick={hizliDuzenlemeyiKaydet}>Fiyatları Kaydet</button>
              <button className="market-remove" type="button" onClick={() => setHizliDuzenleme(null)}>Vazgeç</button>
            </div>}
          </div>;
        })}{!filtreliEtiketUrunleri.length && <p className="market-empty">Aramaya uygun ürün bulunamadı.</p>}</div>
        <div className="market-print-labels" aria-hidden="true">{urunler.filter(urun => etiketUrunleri.includes(urun.id)).map(urun => <article key={urun.id}><div>{restaurantName}</div><strong>{urun.urun_adi}</strong><b>{para(urun.satis_fiyati)}</b><span>|||| ||| |||| | |||</span><small>{urun.barkod}</small></article>)}</div>
      </div>}

      {!yukleniyor && sekme === 'raporlar' && <div className="market-stack">
        <div className="market-card">
          <div className="market-report-toolbar">
            <div><span>MARKET RAPORLARI</span><h2>Rapor merkezi</h2></div>
            {raporSekmesi === 'gun_sonu'
              ? <label>Gün seçin<input type="date" value={raporTarihi} onChange={event => setRaporTarihi(event.target.value)} /></label>
              : ['kar', 'fisler'].includes(raporSekmesi) && <label>Dönem<select value={raporAraligi} onChange={event => setRaporAraligi(event.target.value)}><option value="bugun">Bugün</option><option value="7gun">Son 7 gün</option><option value="30gun">Son 30 gün</option><option value="ay">Bu ay</option><option value="tumu">Tüm kayıtlar</option></select></label>}
          </div>
          <div className="market-report-subtabs">
            {[
              ['gun_sonu', 'Gün Sonu'],
              ['sayim', 'Sayım Raporları'],
              ['kar', 'Kâr Raporları'],
              ['stok', 'Eldeki Stok'],
              ['fisler', 'Satış Fişleri'],
            ].map(([key, label]) => <button type="button" key={key} className={raporSekmesi === key ? 'active' : ''} onClick={() => setRaporSekmesi(key)}>{label}</button>)}
          </div>
        </div>

        {raporSekmesi === 'gun_sonu' && <>
          <div className="market-card">
            <div className="market-heading"><div><span>GÜN SONU</span><h2>{tarihYaz(raporTarihi)} özeti</h2></div></div>
            <div className="market-report-stats">
              <article><span>Toplam Ciro</span><strong>{para(rapor.ciro)}</strong></article>
              <article><span>Satış Sayısı</span><strong>{rapor.satisAdedi}</strong></article>
              <article><span>Satılan Ürün</span><strong>{rapor.urunAdedi}</strong></article>
              <article><span>Ortalama Sepet</span><strong>{para(rapor.ortalamaSepet)}</strong></article>
            </div>
            <div className="market-payment-report">
              <div><span>Nakit</span><strong>{para(rapor.odemeler.Nakit)}</strong></div>
              <div><span>Kredi Kartı</span><strong>{para(rapor.odemeler['Kredi Kartı'])}</strong></div>
              <div><span>Cari / Veresiye</span><strong>{para(rapor.odemeler['Cari / Veresiye'])}</strong></div>
            </div>
          </div>
          <div className="market-grid-two">
            <div className="market-card">
              <div className="market-heading"><div><span>ÜRÜN PERFORMANSI</span><h2>Günün en çok satanları</h2></div></div>
              {!rapor.urunler.length ? <p className="market-empty">Seçilen günde ürün satışı bulunmuyor.</p> : <div className="market-table"><table><thead><tr><th>Ürün</th><th>Adet</th><th>Ciro</th></tr></thead><tbody>{rapor.urunler.slice(0, 25).map(urun => <tr key={urun.urunAdi}><td><strong>{urun.urunAdi}</strong></td><td>{urun.adet}</td><td>{para(urun.ciro)}</td></tr>)}</tbody></table></div>}
            </div>
            <div className="market-card">
              <div className="market-heading"><div><span>SAATLİK YOĞUNLUK</span><h2>Satış saatleri</h2></div></div>
              {!rapor.saatler.length ? <p className="market-empty">Seçilen günde saatlik veri bulunmuyor.</p> : <div className="market-hour-list">{rapor.saatler.map(saat => <div key={saat.saat}><span>{saat.saat}</span><div><i style={{ width: `${Math.max((saat.ciro / Math.max(...rapor.saatler.map(item => item.ciro), 1)) * 100, 3)}%` }} /></div><strong>{saat.satisAdedi} satış · {para(saat.ciro)}</strong></div>)}</div>}
            </div>
          </div>
        </>}

        {raporSekmesi === 'sayim' && <div className="market-card">
          <div className="market-heading"><div><span>SAYIM FARKI RAPORU</span><h2>Eski stok ve sayılan stok farkları</h2></div><strong>{sayimFarkRaporu.length} fark</strong></div>
          {!sayimFarkRaporu.length ? <p className="market-empty">Geçmiş sayımlarda stok farkı bulunmuyor.</p> : <div className="market-table"><table><thead><tr><th>Sayım / Tarih</th><th>Ürün</th><th>Sistem Stoğu</th><th>Sayılan</th><th>Fark</th></tr></thead><tbody>{sayimFarkRaporu.map(kayit => <tr key={kayit.id}><td><strong>{kayit.sayimAdi}</strong><small>{new Date(kayit.tarih).toLocaleString('tr-TR')}</small></td><td><strong>{kayit.urunAdi}</strong><small>{kayit.barkod}</small></td><td>{kayit.sistemMiktari}</td><td>{kayit.sayilanMiktar}</td><td className={kayit.fark < 0 ? 'red' : 'green'}>{kayit.fark > 0 ? '+' : ''}{kayit.fark}</td></tr>)}</tbody></table></div>}
        </div>}

        {raporSekmesi === 'kar' && <>
          <div className="market-card">
            <div className="market-report-stats">
              <article><span>Toplam Ciro</span><strong>{para(rapor.ciro)}</strong></article>
              <article><span>Tahmini Maliyet</span><strong>{para(rapor.tahminiMaliyet)}</strong></article>
              <article><span>Tahmini Brüt Kâr</span><strong>{para(rapor.tahminiKar)}</strong></article>
              <article><span>Brüt Kâr Oranı</span><strong>%{rapor.ciro ? ((rapor.tahminiKar / rapor.ciro) * 100).toFixed(1) : '0,0'}</strong></article>
            </div>
          </div>
          <div className="market-card">
            <div className="market-heading"><div><span>ÜRÜN KÂRLILIĞI</span><h2>Ürün bazında tahmini kâr</h2></div></div>
            {!rapor.urunler.length ? <p className="market-empty">Seçilen dönemde satış bulunmuyor.</p> : <div className="market-table"><table><thead><tr><th>Ürün</th><th>Adet</th><th>Ciro</th><th>Maliyet</th><th>Kâr</th></tr></thead><tbody>{rapor.urunler.map(urun => <tr key={urun.urunAdi}><td><strong>{urun.urunAdi}</strong></td><td>{urun.adet}</td><td>{para(urun.ciro)}</td><td>{para(urun.maliyet)}</td><td className={urun.kar < 0 ? 'red' : 'green'}>{para(urun.kar)}</td></tr>)}</tbody></table></div>}
            <p className="market-note">Maliyet ve brüt kâr, ürünlerin güncel alış fiyatları üzerinden tahmini olarak hesaplanır.</p>
          </div>
        </>}

        {raporSekmesi === 'stok' && <>
          <div className="market-card">
            <div className="market-heading"><div><span>ELDEKİ STOK</span><h2>Stok miktarı ve parasal değerleri</h2></div><strong>{stokRaporu.kalemler.length} ürün</strong></div>
            <div className="market-report-stats">
              <article><span>Toplam Stok Miktarı</span><strong>{stokRaporu.toplamMiktar}</strong></article>
              <article><span>Toplam Alış Değeri</span><strong>{para(stokRaporu.toplamAlis)}</strong></article>
              <article><span>Toplam Satış Değeri</span><strong>{para(stokRaporu.toplamSatis)}</strong></article>
              <article><span>Potansiyel Brüt Kâr</span><strong>{para(stokRaporu.potansiyelKar)}</strong></article>
            </div>
          </div>
          <div className="market-card">
            <div className="market-table"><table><thead><tr><th>Ürün / Barkod</th><th>Grup</th><th>Stok</th><th>Birim Alış</th><th>Toplam Alış</th><th>Birim Satış</th><th>Toplam Satış</th></tr></thead><tbody>{stokRaporu.kalemler.map(urun => <tr key={urun.id}><td><strong>{urun.urun_adi}</strong><small>{urun.barkod}</small></td><td>{urun.kategori || '-'}</td><td>{urun.miktar} {urun.birim}</td><td>{para(urun.alis_fiyati)}</td><td><strong>{para(urun.alisDegeri)}</strong></td><td>{para(urun.satis_fiyati)}</td><td><strong>{para(urun.satisDegeri)}</strong></td></tr>)}</tbody></table></div>
          </div>
        </>}

        {raporSekmesi === 'fisler' && <div className="market-card">
          <div className="market-heading"><div><span>İŞLEM GEÇMİŞİ</span><h2>Son satışlar</h2></div><strong>{rapor.satisAdedi} kayıt</strong></div>
          {!rapor.satislar.length ? <p className="market-empty">Seçilen dönemde satış bulunmuyor.</p> : <div className="market-table"><table><thead><tr><th>Tarih / Saat</th><th>Cari</th><th>Ödeme</th><th>Kalem</th><th>Toplam</th><th></th></tr></thead><tbody>{rapor.satislar.slice(0, 100).map(satis => <Fragment key={satis.id}>
            <tr><td>{new Date(satis.created_at).toLocaleString('tr-TR')}</td><td>{satis.cari_adi || 'Cari yok'}</td><td>{satis.odeme_tipi}</td><td>{(satis.market_satis_kalemleri || []).length}</td><td><strong>{para(satis.toplam_tutar)}</strong></td><td><button className="market-receipt-button" type="button" onClick={() => setAcikSatisId(acikSatisId === satis.id ? '' : satis.id)}>{acikSatisId === satis.id ? 'Kapat' : 'Fişi Aç'}</button></td></tr>
            {acikSatisId === satis.id && <tr className="market-receipt-row"><td colSpan="6"><div className="market-receipt">
              <div className="market-receipt-title"><span><strong>Satış fişi</strong><small>{new Date(satis.created_at).toLocaleString('tr-TR')} · {satis.odeme_tipi}</small></span><b>{para(satis.toplam_tutar)}</b></div>
              {(satis.market_satis_kalemleri || []).map(kalem => <div className="market-receipt-item" key={kalem.id}><span><strong>{kalem.urun_adi}</strong><small>{kalem.barkod}</small></span><span>{kalem.adet} × {para(kalem.birim_fiyat)}</span><b>{para(kalem.toplam_tutar)}</b></div>)}
              <div className="market-receipt-total"><span>Genel Toplam</span><strong>{para(satis.toplam_tutar)}</strong></div>
            </div></td></tr>}
          </Fragment>)}</tbody></table></div>}
        </div>}
      </div>}
    </section>
  );
}
