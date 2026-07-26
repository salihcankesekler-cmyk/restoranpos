import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import {
  marketAlisFaturasiKaydet,
  marketAlisFaturasiSil,
  marketBekleyenSepetiKaydet,
  marketBekleyenSepetiSil,
  marketCariKaydet,
  marketCariHareketiKaydet,
  marketEtiketKuyrugunuTamamla,
  marketGrubuKaydet,
  marketKasaHareketiKaydet,
  marketKasaVardiyasiAc,
  marketKasaVardiyasiKapat,
  marketSayimiKaydet,
  marketSatisIadeEt,
  marketSatisFisiniKuyrugaEkle,
  marketSatisiKaydet,
  marketUrunStokFiyatGuncelle,
  marketUrunleriniTopluKaydet,
  marketUrunuKaydet,
  marketUrunuSil,
  marketVerileriniGetir,
} from '../services/marketService';
import './market.css';

const bosUrun = {
  barkod: '', urunAdi: '', stokKodu: '', grupId: '', kategori: '', marka: '',
  birim: 'Adet', kdvOrani: 20, alisFiyati: '', satisFiyati: '',
  stokMiktari: '', minimumStok: '', rafKonumu: '', sonKullanmaTarihi: '', lotNo: '',
};

const bosGrup = {
  grupAdi: '', kdvOrani: 20, satisEkranindaGoster: true, sira: 0,
  grupRengi: '#c2410c', urunRengi: '#0f172a',
};
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

const miktarYaz = value => Number(value || 0).toLocaleString('tr-TR', {
  minimumFractionDigits: Number.isInteger(Number(value || 0)) ? 0 : 3,
  maximumFractionDigits: 3,
});

const miktarYuvarla = value => Math.round((Number(value || 0) + Number.EPSILON) * 1000) / 1000;

const kontrastYaziRengi = renk => {
  const temizRenk = String(renk || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(temizRenk)) return '#ffffff';
  const [kirmizi, yesil, mavi] = [0, 2, 4].map(index => Number.parseInt(temizRenk.slice(index, index + 2), 16));
  return (kirmizi * 299 + yesil * 587 + mavi * 114) / 1000 > 155 ? '#0f172a' : '#ffffff';
};

const fisParasi = value => `${Number(value || 0).toLocaleString('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})} TL`;

const TERMAL_FIS_GENISLIGI = 42;
const termalCizgi = karakter => karakter.repeat(TERMAL_FIS_GENISLIGI);
const termalOrtala = value => {
  const metin = String(value || '').trim().slice(0, TERMAL_FIS_GENISLIGI);
  return `${' '.repeat(Math.max(Math.floor((TERMAL_FIS_GENISLIGI - metin.length) / 2), 0))}${metin}`;
};
const termalSatir = (sol, sag) => {
  const solMetin = String(sol || '').trim();
  const sagMetin = String(sag || '').trim();
  const bosluk = TERMAL_FIS_GENISLIGI - solMetin.length - sagMetin.length;
  return bosluk > 0 ? `${solMetin}${' '.repeat(bosluk)}${sagMetin}` : `${solMetin}\r\n${sagMetin.padStart(TERMAL_FIS_GENISLIGI)}`;
};
const termalMetniBol = value => {
  const kelimeler = String(value || '').trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  const satirlar = [];
  kelimeler.forEach(kelime => {
    const sonSatir = satirlar.at(-1) || '';
    if (!sonSatir || `${sonSatir} ${kelime}`.length > TERMAL_FIS_GENISLIGI) satirlar.push(kelime.slice(0, TERMAL_FIS_GENISLIGI));
    else satirlar[satirlar.length - 1] = `${sonSatir} ${kelime}`;
  });
  return satirlar.length ? satirlar : ['Ürün'];
};

const satisFisiMetni = (satis, restaurantName) => {
  const kalemler = Array.isArray(satis?.market_satis_kalemleri) ? satis.market_satis_kalemleri : [];
  const brutToplam = Number(satis?.brut_toplam ?? satis?.toplam_tutar ?? 0);
  const indirimToplami = Number(satis?.indirim_toplami || 0);
  const netToplam = Number(satis?.toplam_tutar ?? (brutToplam - indirimToplami));
  const tarih = new Date(satis?.created_at || Date.now()).toLocaleString('tr-TR');
  const fisNo = String(satis?.id || '').slice(-10).toLocaleUpperCase('tr-TR') || '-';
  const urunSatirlari = kalemler.flatMap(kalem => [
    ...termalMetniBol(`${miktarYaz(kalem.adet)} x ${kalem.urun_adi || 'Ürün'}`),
    termalSatir(`Birim ${fisParasi(kalem.birim_fiyat)}`, fisParasi(kalem.toplam_tutar)),
    kalem.barkod ? `Barkod: ${kalem.barkod}` : '',
    termalCizgi('-'),
  ]).filter(Boolean);

  return [
    termalOrtala(restaurantName || 'Integra Market'),
    termalOrtala('MARKET SATIŞ FİŞİ'),
    termalCizgi('='),
    `Tarih: ${tarih}`,
    `Fiş No: ${fisNo}`,
    `Ödeme: ${satis?.odeme_tipi || '-'}`,
    satis?.cari_adi ? `Cari: ${satis.cari_adi}` : '',
    termalCizgi('-'),
    ...urunSatirlari,
    termalSatir('Brüt Toplam', fisParasi(brutToplam)),
    indirimToplami > 0 ? termalSatir('İndirim', `-${fisParasi(indirimToplami)}`) : '',
    termalCizgi('='),
    termalSatir('TOPLAM', fisParasi(netToplam)),
    termalCizgi('='),
    termalOrtala('Teşekkür ederiz.'),
    termalOrtala('Mali belge yerine geçmez.'),
  ].filter(Boolean).join('\r\n');
};

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

const kritikUrunMu = urun => {
  const kritikStok = Number(urun.stok_miktari || 0) <= Number(urun.minimum_stok || 0);
  if (!urun.son_kullanma_tarihi) return kritikStok;
  const kalanGun = Math.ceil((new Date(`${urun.son_kullanma_tarihi}T23:59:59`) - new Date()) / 86400000);
  return kritikStok || kalanGun <= 30;
};

const kilogramUrunuMu = urun =>
  ['kg', 'kilogram'].includes(String(urun?.birim || '').trim().toLocaleLowerCase('tr-TR'));

const varsayilanTeraziAyarlari = {
  aktif: false,
  onEk: '20',
  degerTuru: 'agirlik',
  bolen: 1000,
};

const csvBasliginiTemizle = value => String(value || '')
  .trim()
  .toLocaleLowerCase('tr-TR')
  .replaceAll(/[ç]/g, 'c').replaceAll(/[ğ]/g, 'g').replaceAll(/[ı]/g, 'i')
  .replaceAll(/[ö]/g, 'o').replaceAll(/[ş]/g, 's').replaceAll(/[ü]/g, 'u')
  .replaceAll(/[^a-z0-9]+/g, '_').replaceAll(/^_+|_+$/g, '');

const csvSatirlariniAyristir = metin => {
  const ilkSatir = String(metin || '').replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] || '';
  const adaylar = [';', ',', '\t'];
  const ayirici = adaylar.sort((a, b) => ilkSatir.split(b).length - ilkSatir.split(a).length)[0];
  const satirlar = [];
  let satir = [];
  let hucre = '';
  let tirnakta = false;
  const kaynak = String(metin || '').replace(/^\uFEFF/, '');
  for (let index = 0; index < kaynak.length; index += 1) {
    const karakter = kaynak[index];
    if (karakter === '"') {
      if (tirnakta && kaynak[index + 1] === '"') {
        hucre += '"';
        index += 1;
      } else tirnakta = !tirnakta;
    } else if (karakter === ayirici && !tirnakta) {
      satir.push(hucre.trim());
      hucre = '';
    } else if ((karakter === '\n' || karakter === '\r') && !tirnakta) {
      if (karakter === '\r' && kaynak[index + 1] === '\n') index += 1;
      satir.push(hucre.trim());
      if (satir.some(Boolean)) satirlar.push(satir);
      satir = [];
      hucre = '';
    } else hucre += karakter;
  }
  satir.push(hucre.trim());
  if (satir.some(Boolean)) satirlar.push(satir);
  return satirlar;
};

const csvSayisi = value => {
  const temiz = String(value ?? '').trim().replaceAll(' ', '');
  if (!temiz) return 0;
  const normalize = temiz.includes(',') && temiz.includes('.')
    ? temiz.replaceAll('.', '').replace(',', '.')
    : temiz.replace(',', '.');
  const sonuc = Number(normalize);
  return Number.isFinite(sonuc) ? sonuc : 0;
};

function BarkodSvg({ value }) {
  const svgRef = useRef(null);
  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, String(value), {
        format: 'CODE128',
        displayValue: false,
        height: 42,
        width: 1.5,
        margin: 0,
      });
    } catch {
      svgRef.current.replaceChildren();
    }
  }, [value]);
  return <svg ref={svgRef} className="market-barcode-svg" aria-label={`Barkod ${value}`} />;
}

export default function MarketApp({ restaurantId, restaurantName, notify, canPerform }) {
  const [sekme, setSekme] = useState('satis');
  const [urunler, setUrunler] = useState([]);
  const [tumUrunler, setTumUrunler] = useState([]);
  const [gruplar, setGruplar] = useState([]);
  const [faturalar, setFaturalar] = useState([]);
  const [sayimlar, setSayimlar] = useState([]);
  const [cariler, setCariler] = useState([]);
  const [satislar, setSatislar] = useState([]);
  const [stokHareketleri, setStokHareketleri] = useState([]);
  const [fiyatGecmisi, setFiyatGecmisi] = useState([]);
  const [vardiyalar, setVardiyalar] = useState([]);
  const [kasaHareketleri, setKasaHareketleri] = useState([]);
  const [iadeler, setIadeler] = useState([]);
  const [bekleyenSepetler, setBekleyenSepetler] = useState([]);
  const [etiketKuyrugu, setEtiketKuyrugu] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [arama, setArama] = useState('');
  const [urunFormu, setUrunFormu] = useState(bosUrun);
  const [grupFormu, setGrupFormu] = useState(bosGrup);
  const [hizliDuzenleme, setHizliDuzenleme] = useState(null);
  const [fatura, setFatura] = useState(bosFatura);
  const [acikFaturaId, setAcikFaturaId] = useState('');
  const [silinenFaturaId, setSilinenFaturaId] = useState('');
  const [satisBarkodu, setSatisBarkodu] = useState('');
  const [satisAdedi, setSatisAdedi] = useState('1');
  const [satisArama, setSatisArama] = useState('');
  const [sepet, setSepet] = useState([]);
  const [genelIndirim, setGenelIndirim] = useState({ yon: 'azalt', tur: 'yuzde', deger: '' });
  const [genelIndirimPenceresi, setGenelIndirimPenceresi] = useState(false);
  const [bekleyenSepetPenceresi, setBekleyenSepetPenceresi] = useState('');
  const [bekleyenSepetAdi, setBekleyenSepetAdi] = useState('');
  const [bekleyenSepetIsleniyor, setBekleyenSepetIsleniyor] = useState(false);
  const [urunIndirimFormu, setUrunIndirimFormu] = useState(null);
  const [satisGrubu, setSatisGrubu] = useState('');
  const [satisCariId, setSatisCariId] = useState('');
  const [satisCariPenceresi, setSatisCariPenceresi] = useState(false);
  const [satisCariArama, setSatisCariArama] = useState('');
  const [fisDavranisi, setFisDavranisi] = useState(() => {
    const kayitli = localStorage.getItem(`integra-market-fis-${restaurantId}`);
    return ['yazdir', 'yazdirma', 'sor'].includes(kayitli) ? kayitli : 'sor';
  });
  const [fiyatBekleyenUrun, setFiyatBekleyenUrun] = useState(null);
  const [anlikSatisFiyati, setAnlikSatisFiyati] = useState('');
  const [gramajBekleyenUrun, setGramajBekleyenUrun] = useState(null);
  const [satisGramaji, setSatisGramaji] = useState('');
  const [satisTeraziGirisTuru, setSatisTeraziGirisTuru] = useState('gram');
  const [cariFormu, setCariFormu] = useState(bosCari);
  const [cariFormYeri, setCariFormYeri] = useState('');
  const [finansCariId, setFinansCariId] = useState('');
  const [finansHareketi, setFinansHareketi] = useState(bosFinansHareketi);
  const [sayim, setSayim] = useState({});
  const [sayimBarkodu, setSayimBarkodu] = useState('');
  const [etiketUrunleri, setEtiketUrunleri] = useState([]);
  const [etiketArama, setEtiketArama] = useState('');
  const [etiketAdetleri, setEtiketAdetleri] = useState({});
  const [etiketBoyutu, setEtiketBoyutu] = useState('58x40');
  const [teraziAyarlari, setTeraziAyarlari] = useState(() => {
    try {
      return {
        ...varsayilanTeraziAyarlari,
        ...JSON.parse(localStorage.getItem(`integra-market-terazi-${restaurantId}`) || '{}'),
      };
    } catch {
      return varsayilanTeraziAyarlari;
    }
  });
  const [topluAktarim, setTopluAktarim] = useState({ dosyaAdi: '', satirlar: [], hatalar: [] });
  const [topluAktariliyor, setTopluAktariliyor] = useState(false);
  const [silinenUrunId, setSilinenUrunId] = useState('');
  const [raporAraligi, setRaporAraligi] = useState('bugun');
  const [raporSekmesi, setRaporSekmesi] = useState('gun_sonu');
  const [raporTarihi, setRaporTarihi] = useState(() => gunAnahtari(new Date()));
  const [acikSatisId, setAcikSatisId] = useState('');
  const [acikAlisRaporuId, setAcikAlisRaporuId] = useState('');
  const [yalnizKritik, setYalnizKritik] = useState(false);
  const [satisKaydediliyor, setSatisKaydediliyor] = useState(false);
  const [iadeAdetleri, setIadeAdetleri] = useState({});
  const [iadeAciklama, setIadeAciklama] = useState('');
  const [iadeIsleniyor, setIadeIsleniyor] = useState(false);
  const [kasaAcilis, setKasaAcilis] = useState({ tutar: '', notMetni: '' });
  const [kasaHareketi, setKasaHareketi] = useState({ hareketTipi: 'Giriş', tutar: '', aciklama: '' });
  const [kasaKapanis, setKasaKapanis] = useState({ sayilan: '', notMetni: '' });
  const [raporGrupId, setRaporGrupId] = useState('');
  const [raporUrunArama, setRaporUrunArama] = useState('');
  const [raporCariId, setRaporCariId] = useState('');
  const [raporOdeme, setRaporOdeme] = useState('');
  const barkodRef = useRef(null);
  const satisAdediTuslamaRef = useRef(false);
  const satisKaydiSuruyorRef = useRef(false);
  const satisIslemAnahtariRef = useRef({ anahtar: '', imza: '' });

  const bildir = (mesaj, tip = 'info') => {
    if (typeof notify === 'function') notify(mesaj, tip);
  };

  const yetkiVar = yetki => typeof canPerform !== 'function' || canPerform(yetki);

  const yetkiyiDogrula = (yetki, mesaj) => {
    if (yetkiVar(yetki)) return true;
    bildir(mesaj || 'Bu işlem için personel yetkiniz yok.', 'warning');
    return false;
  };

  const veriyiUygula = data => {
    setUrunler(data.urunler || []);
    setTumUrunler(data.tumUrunler || data.urunler || []);
    setGruplar(data.gruplar || []);
    setFaturalar(data.faturalar || []);
    setSayimlar(data.sayimlar || []);
    setCariler(data.cariler || []);
    setSatislar(data.satislar || []);
    setStokHareketleri(data.stokHareketleri || []);
    setFiyatGecmisi(data.fiyatGecmisi || []);
    setVardiyalar(data.vardiyalar || []);
    setKasaHareketleri(data.kasaHareketleri || []);
    setIadeler(data.iadeler || []);
    setBekleyenSepetler(data.bekleyenSepetler || []);
    setEtiketKuyrugu(data.etiketKuyrugu || []);
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

  useEffect(() => {
    localStorage.setItem(`integra-market-terazi-${restaurantId}`, JSON.stringify(teraziAyarlari));
  }, [restaurantId, teraziAyarlari]);

  useEffect(() => {
    localStorage.setItem(`integra-market-fis-${restaurantId}`, fisDavranisi);
  }, [fisDavranisi, restaurantId]);

  const gorunenGruplar = useMemo(
    () => gruplar.filter(grup => grup.satis_ekraninda_goster),
    [gruplar]
  );
  const aktifSatisGrubu = gorunenGruplar.some(grup => String(grup.id) === String(satisGrubu))
    ? satisGrubu
    : gorunenGruplar[0]?.id || '';
  const grupHaritasi = useMemo(
    () => new Map(gruplar.map(grup => [String(grup.id), grup])),
    [gruplar]
  );

  const filtreliUrunler = useMemo(() => {
    const metin = arama.trim().toLocaleLowerCase('tr-TR');
    return urunler.filter(urun => {
      if (yalnizKritik && !kritikUrunMu(urun)) return false;
      if (!metin) return true;
      return [urun.urun_adi, urun.barkod, urun.stok_kodu, urun.kategori, urun.marka]
        .some(value => String(value || '').toLocaleLowerCase('tr-TR').includes(metin));
    });
  }, [arama, urunler, yalnizKritik]);

  const satisUrunleri = useMemo(() => {
    const metin = satisArama.trim().toLocaleLowerCase('tr-TR');
    return urunler.filter(urun => {
      // Arama yapılırken kasiyer grupları tek tek gezmek zorunda kalmasın.
      if (!metin && String(urun.grup_id) !== String(aktifSatisGrubu)) return false;
      if (!metin) return true;
      return [urun.urun_adi, urun.barkod, urun.stok_kodu, urun.marka]
        .some(value => String(value || '').toLocaleLowerCase('tr-TR').includes(metin));
    });
  }, [aktifSatisGrubu, satisArama, urunler]);

  const sepetToplamlari = useMemo(() => {
    const brutToplam = sepet.reduce((toplam, kalem) =>
      toplam + Number(kalem.adet || 0) * Number(kalem.liste_fiyati ?? kalem.satis_fiyati ?? 0), 0);
    const araToplam = sepet.reduce((toplam, kalem) =>
      toplam + Number(kalem.adet || 0) * Number(kalem.satis_fiyati || 0), 0);
    const istenenAyar = Math.max(Number(genelIndirim.deger || 0), 0);
    const hesaplananAyar = genelIndirim.tur === 'yuzde'
      ? araToplam * Math.min(istenenAyar, 100) / 100
      : istenenAyar;
    const artisMi = genelIndirim.yon === 'arttir';
    const genelIndirimTutari = artisMi ? 0 : Math.min(hesaplananAyar, araToplam);
    const genelArtisTutari = artisMi ? hesaplananAyar : 0;
    return {
      brutToplam,
      urunIndirimTutari: Math.max(brutToplam - araToplam, 0),
      araToplam,
      genelIndirimTutari,
      genelArtisTutari,
      genelFiyatAyarTutari: artisMi ? genelArtisTutari : genelIndirimTutari,
      netToplam: Math.max(araToplam - genelIndirimTutari + genelArtisTutari, 0),
    };
  }, [genelIndirim, sepet]);

  const filtreliEtiketUrunleri = useMemo(() => {
    const metin = etiketArama.trim().toLocaleLowerCase('tr-TR');
    if (!metin) return urunler;
    return urunler.filter(urun => [urun.urun_adi, urun.barkod]
      .some(value => String(value || '').toLocaleLowerCase('tr-TR').includes(metin)));
  }, [etiketArama, urunler]);

  const bekleyenEtiketUrunIdleri = useMemo(
    () => [...new Set(etiketKuyrugu.map(kayit => String(kayit.urun_id)))],
    [etiketKuyrugu]
  );

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
    const urunMeta = new Map(tumUrunler.map(urun => [String(urun.id), urun]));
    const urunMetni = raporUrunArama.trim().toLocaleLowerCase('tr-TR');
    const kalemFiltresiAktif = Boolean(raporGrupId || urunMetni);
    const secilenSatislar = satislar.filter(satis => {
      const satisTarihi = new Date(satis.created_at);
      if ((!baslangic || satisTarihi >= baslangic) && (!bitis || satisTarihi < bitis)) {
        if (raporOdeme && !['marka', 'grup', 'alis'].includes(raporSekmesi) && satis.odeme_tipi !== raporOdeme) return false;
        if (raporCariId && String(satis.cari_id || '') !== String(raporCariId)) return false;
        return true;
      }
      return false;
    }).map(satis => {
      const raporKalemleri = (satis.market_satis_kalemleri || []).filter(kalem => {
        const urun = urunMeta.get(String(kalem.urun_id));
        if (raporGrupId && String(urun?.grup_id || '') !== String(raporGrupId)) return false;
        if (urunMetni && ![kalem.urun_adi, kalem.barkod]
          .some(value => String(value || '').toLocaleLowerCase('tr-TR').includes(urunMetni))) return false;
        return true;
      });
      const raporToplam = kalemFiltresiAktif
        ? raporKalemleri.reduce((toplam, kalem) => toplam + Math.max(Number(kalem.adet || 0) - Number(kalem.iade_adedi || 0), 0) * Number(kalem.birim_fiyat || 0), 0)
        : Math.max(Number(satis.toplam_tutar || 0) - Number(satis.iade_toplami || 0), 0);
      return { ...satis, raporKalemleri, raporToplam };
    }).filter(satis => !kalemFiltresiAktif || satis.raporKalemleri.length > 0);
    const odemeler = { Nakit: 0, 'Kredi Kartı': 0, 'Cari / Veresiye': 0 };
    const gunler = new Map();
    const saatler = new Map();
    const urunDagilimi = new Map();
    const maliyetler = new Map(tumUrunler.map(urun => [String(urun.id), Number(urun.alis_fiyati || 0)]));
    let urunAdedi = 0;
    let tahminiMaliyet = 0;
    secilenSatislar.forEach(satis => {
      const toplam = Number(satis.raporToplam || 0);
      odemeler[satis.odeme_tipi] = Number(odemeler[satis.odeme_tipi] || 0) + toplam;
      const gun = gunAnahtari(satis.created_at);
      const saat = `${String(new Date(satis.created_at).getHours()).padStart(2, '0')}:00`;
      const gunKaydi = gunler.get(gun) || { gun, ciro: 0, satisAdedi: 0, urunAdedi: 0 };
      const saatKaydi = saatler.get(saat) || { saat, ciro: 0, satisAdedi: 0 };
      gunKaydi.ciro += toplam;
      gunKaydi.satisAdedi += 1;
      saatKaydi.ciro += toplam;
      saatKaydi.satisAdedi += 1;
      (satis.raporKalemleri || []).forEach(kalem => {
        const adet = Math.max(Number(kalem.adet || 0) - Number(kalem.iade_adedi || 0), 0);
        urunAdedi += adet;
        gunKaydi.urunAdedi += adet;
        const kalemMaliyeti = Number(kalem.birim_maliyet || maliyetler.get(String(kalem.urun_id)) || 0) * adet;
        tahminiMaliyet += kalemMaliyeti;
        const urunAnahtari = String(kalem.urun_id || kalem.urun_adi);
        const urunKaydi = urunDagilimi.get(urunAnahtari) || { urunAdi: kalem.urun_adi, adet: 0, ciro: 0, maliyet: 0 };
        urunKaydi.adet += adet;
        urunKaydi.ciro += adet * Number(kalem.birim_fiyat || 0);
        urunKaydi.maliyet += kalemMaliyeti;
        urunDagilimi.set(urunAnahtari, urunKaydi);
      });
      gunler.set(gun, gunKaydi);
      saatler.set(saat, saatKaydi);
    });
    const ciro = secilenSatislar.reduce((toplam, satis) => toplam + Number(satis.raporToplam || 0), 0);
    return {
      satislar: secilenSatislar,
      ciro,
      satisAdedi: secilenSatislar.length,
      urunAdedi,
      ortalamaSepet: secilenSatislar.length ? ciro / secilenSatislar.length : 0,
      indirimToplami: secilenSatislar.reduce((toplam, satis) => toplam + Number(satis.indirim_toplami || 0), 0),
      iadeToplami: secilenSatislar.reduce((toplam, satis) => toplam + Number(satis.iade_toplami || 0), 0),
      iptalAdedi: secilenSatislar.filter(satis => satis.durum === 'İptal').length,
      tahminiMaliyet,
      tahminiKar: ciro - tahminiMaliyet,
      odemeler,
      gunler: Array.from(gunler.values()).sort((a, b) => b.gun.localeCompare(a.gun)),
      saatler: Array.from(saatler.values()).sort((a, b) => a.saat.localeCompare(b.saat)),
      urunler: Array.from(urunDagilimi.values())
        .map(urun => ({ ...urun, kar: urun.ciro - urun.maliyet }))
        .sort((a, b) => b.ciro - a.ciro),
    };
  }, [raporAraligi, raporCariId, raporGrupId, raporOdeme, raporSekmesi, raporTarihi, raporUrunArama, satislar, tumUrunler]);

  const ticariRapor = useMemo(() => {
    const simdi = new Date();
    let baslangic = null;
    if (raporAraligi === 'bugun') baslangic = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate());
    if (raporAraligi === '7gun') baslangic = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate() - 6);
    if (raporAraligi === '30gun') baslangic = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate() - 29);
    if (raporAraligi === 'ay') baslangic = new Date(simdi.getFullYear(), simdi.getMonth(), 1);

    const urunHaritasi = new Map(tumUrunler.map(urun => [String(urun.id), urun]));
    const grupHaritasi = new Map(gruplar.map(grup => [String(grup.id), grup.grup_adi]));
    const urunMetni = raporUrunArama.trim().toLocaleLowerCase('tr-TR');
    const markalar = new Map();
    const grupOzetleri = new Map();
    const ozetKaydi = (harita, anahtar) => {
      const temizAnahtar = String(anahtar || '').trim() || 'Belirtilmemiş';
      if (!harita.has(temizAnahtar)) {
        harita.set(temizAnahtar, {
          ad: temizAnahtar,
          satilanMiktar: 0,
          satisCiro: 0,
          alinanMiktar: 0,
          alisTutar: 0,
        });
      }
      return harita.get(temizAnahtar);
    };
    const dagilimaEkle = (urun, tur, miktar, tutar) => {
      const markaKaydi = ozetKaydi(markalar, urun?.marka || 'Markasız');
      const grupAdi = urun?.kategori || grupHaritasi.get(String(urun?.grup_id || '')) || 'Grupsuz';
      const grupKaydi = ozetKaydi(grupOzetleri, grupAdi);
      [markaKaydi, grupKaydi].forEach(kayit => {
        if (tur === 'satis') {
          kayit.satilanMiktar += miktar;
          kayit.satisCiro += tutar;
        } else {
          kayit.alinanMiktar += miktar;
          kayit.alisTutar += tutar;
        }
      });
    };

    rapor.satislar.forEach(satis => {
      (satis.raporKalemleri || []).forEach(kalem => {
        const urun = urunHaritasi.get(String(kalem.urun_id));
        const miktar = Math.max(Number(kalem.adet || 0) - Number(kalem.iade_adedi || 0), 0);
        dagilimaEkle(urun, 'satis', miktar, miktar * Number(kalem.birim_fiyat || 0));
      });
    });

    const kalemFiltresiAktif = Boolean(raporGrupId || urunMetni);
    const raporFaturalari = faturalar.filter(faturaKaydi => {
      const faturaTarihi = new Date(`${String(faturaKaydi.fatura_tarihi || faturaKaydi.created_at).slice(0, 10)}T12:00:00`);
      if (baslangic && faturaTarihi < baslangic) return false;
      if (raporCariId && String(faturaKaydi.cari_id || '') !== String(raporCariId)) return false;
      return true;
    }).map(faturaKaydi => {
      const kalemler = (faturaKaydi.market_alis_fatura_kalemleri || []).filter(kalem => {
        const urun = urunHaritasi.get(String(kalem.urun_id));
        if (raporGrupId && String(urun?.grup_id || '') !== String(raporGrupId)) return false;
        if (urunMetni && ![kalem.urun_adi, kalem.barkod]
          .some(value => String(value || '').toLocaleLowerCase('tr-TR').includes(urunMetni))) return false;
        return true;
      });
      const raporToplam = kalemler.reduce((toplam, kalem) =>
        toplam + Number(kalem.satir_toplami || Number(kalem.miktar || 0) * Number(kalem.birim_alis_fiyati || 0)), 0);
      kalemler.forEach(kalem => {
        const urun = urunHaritasi.get(String(kalem.urun_id));
        dagilimaEkle(urun, 'alis', Number(kalem.miktar || 0), Number(kalem.satir_toplami || Number(kalem.miktar || 0) * Number(kalem.birim_alis_fiyati || 0)));
      });
      return { ...faturaKaydi, raporKalemleri: kalemler, raporToplam };
    }).filter(faturaKaydi => !kalemFiltresiAktif || faturaKaydi.raporKalemleri.length > 0);

    const ozetleriHazirla = harita => Array.from(harita.values())
      .map(kayit => ({ ...kayit, fark: kayit.satisCiro - kayit.alisTutar }))
      .sort((a, b) => b.satisCiro + b.alisTutar - (a.satisCiro + a.alisTutar));

    return {
      markalar: ozetleriHazirla(markalar),
      gruplar: ozetleriHazirla(grupOzetleri),
      faturalar: raporFaturalari,
      alisToplami: raporFaturalari.reduce((toplam, faturaKaydi) => toplam + faturaKaydi.raporToplam, 0),
      alisKalemAdedi: raporFaturalari.reduce((toplam, faturaKaydi) => toplam + faturaKaydi.raporKalemleri.length, 0),
      alisMiktari: raporFaturalari.reduce((toplam, faturaKaydi) => toplam + faturaKaydi.raporKalemleri.reduce((araToplam, kalem) => araToplam + Number(kalem.miktar || 0), 0), 0),
    };
  }, [faturalar, gruplar, rapor.satislar, raporAraligi, raporCariId, raporGrupId, raporUrunArama, tumUrunler]);

  const stokRaporu = useMemo(() => {
    const urunMetni = raporUrunArama.trim().toLocaleLowerCase('tr-TR');
    const kalemler = urunler.filter(urun => {
      if (raporGrupId && String(urun.grup_id || '') !== String(raporGrupId)) return false;
      if (!urunMetni) return true;
      return [urun.urun_adi, urun.barkod]
        .some(value => String(value || '').toLocaleLowerCase('tr-TR').includes(urunMetni));
    }).map(urun => {
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
  }, [raporGrupId, raporUrunArama, urunler]);

  const sayimFarkRaporu = useMemo(() => {
    const urunHaritasi = new Map(tumUrunler.map(urun => [String(urun.id), urun]));
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
  }, [sayimlar, tumUrunler]);
  const sayimFarkGruplari = useMemo(() => {
    const urunHaritasi = new Map(tumUrunler.map(urun => [String(urun.id), urun]));
    return sayimlar.map(sayimKaydi => {
      const farklar = (sayimKaydi.market_sayim_kalemleri || [])
        .filter(kalem => Number(kalem.fark_miktari || 0) !== 0)
        .map(kalem => {
          const urun = urunHaritasi.get(String(kalem.urun_id));
          return {
            id: kalem.id,
            urunAdi: urun?.urun_adi || 'Silinmiş / bulunamayan ürün',
            barkod: urun?.barkod || '',
            sistemMiktari: Number(kalem.sistem_miktari || 0),
            sayilanMiktar: Number(kalem.sayilan_miktar || 0),
            fark: Number(kalem.fark_miktari || 0),
          };
        });
      return {
        id: sayimKaydi.id,
        sayimAdi: sayimKaydi.sayim_adi,
        tarih: sayimKaydi.tamamlanma_tarihi || sayimKaydi.created_at,
        toplamKalem: Number(sayimKaydi.toplam_kalem || 0),
        farklar,
      };
    }).filter(sayimKaydi => sayimKaydi.farklar.length);
  }, [sayimlar, tumUrunler]);
  const sayimAramaMetni = sayimBarkodu.trim().toLocaleLowerCase('tr-TR');
  const sayimAramaSonuclari = sayimAramaMetni
    ? urunler.filter(urun => [urun.urun_adi, urun.barkod, urun.stok_kodu]
      .some(value => String(value || '').toLocaleLowerCase('tr-TR').includes(sayimAramaMetni)))
      .slice(0, 20)
    : [];

  const seciliSatisCarisi = cariler.find(cari => String(cari.id) === String(satisCariId));
  const satisCariAramaMetni = satisCariArama.trim().toLocaleLowerCase('tr-TR');
  const filtreliSatisCarileri = cariler.filter(cari => {
    if (!satisCariAramaMetni) return true;
    return [cari.ad, cari.telefon, cari.not_metni]
      .some(value => String(value || '').toLocaleLowerCase('tr-TR').includes(satisCariAramaMetni));
  });
  const seciliAlisCarisi = cariler.find(cari => String(cari.id) === String(fatura.cariId));
  const seciliFinansCarisi = cariler.find(cari => String(cari.id) === String(finansCariId));
  const finansOzeti = useMemo(() => ({
    alacak: cariler.reduce((toplam, cari) => toplam + Math.max(Number(cari.bakiye || 0), 0), 0),
    borc: cariler.reduce((toplam, cari) => toplam + Math.abs(Math.min(Number(cari.bakiye || 0), 0)), 0),
    sifir: cariler.filter(cari => Number(cari.bakiye || 0) === 0).length,
  }), [cariler]);
  const acikVardiya = vardiyalar.find(vardiya => vardiya.durum === 'Açık');
  const kasaOzeti = useMemo(() => {
    if (!acikVardiya) return { nakitSatis: 0, nakitIade: 0, giris: 0, cikis: 0, beklenen: 0 };
    const acilis = new Date(acikVardiya.acilis_tarihi);
    const nakitSatis = satislar
      .filter(satis => satis.odeme_tipi === 'Nakit' && new Date(satis.created_at) >= acilis)
      .reduce((toplam, satis) => toplam + Number(satis.toplam_tutar || 0), 0);
    const nakitIade = iadeler
      .filter(iade => {
        const satis = satislar.find(kayit => String(kayit.id) === String(iade.satis_id));
        return satis?.odeme_tipi === 'Nakit' && new Date(iade.created_at) >= acilis;
      })
      .reduce((toplam, iade) => toplam + Number(iade.toplam_tutar || 0), 0);
    const vardiyaHareketleri = kasaHareketleri.filter(hareket => String(hareket.vardiya_id) === String(acikVardiya.id));
    const giris = vardiyaHareketleri.filter(hareket => hareket.hareket_tipi === 'Giriş')
      .reduce((toplam, hareket) => toplam + Number(hareket.tutar || 0), 0);
    const cikis = vardiyaHareketleri.filter(hareket => hareket.hareket_tipi === 'Çıkış')
      .reduce((toplam, hareket) => toplam + Number(hareket.tutar || 0), 0);
    return {
      nakitSatis,
      nakitIade,
      giris,
      cikis,
      beklenen: Number(acikVardiya.acilis_tutari || 0) + nakitSatis - nakitIade + giris - cikis,
    };
  }, [acikVardiya, iadeler, kasaHareketleri, satislar]);
  const kritikUrunler = useMemo(() => urunler.filter(kritikUrunMu), [urunler]);

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
        grupRengi: grup.grup_rengi || '#c2410c',
        urunRengi: grup.urun_rengi || '#0f172a',
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
      sonKullanmaTarihi: urun.son_kullanma_tarihi || '',
      lotNo: urun.lot_no || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const urunuSil = async urun => {
    if (!yetkiyiDogrula('urun_yonet', 'Bu personelin ürün silme yetkisi yok.')) return;
    const stokUyarisi = Number(urun.stok_miktari || 0) > 0 ? ` Ürünün mevcut stoğu ${urun.stok_miktari} ${urun.birim || ''}.` : '';
    if (!window.confirm(`${urun.urun_adi} aktif ürünlerden kaldırılacak.${stokUyarisi} Geçmiş satış ve alış kayıtları korunacak. Devam edilsin mi?`)) return;
    setSilinenUrunId(String(urun.id));
    try {
      await marketUrunuSil(restaurantId, urun.id);
      setUrunler(prev => prev.filter(item => String(item.id) !== String(urun.id)));
      setTumUrunler(prev => prev.map(item => String(item.id) === String(urun.id) ? { ...item, aktif: false } : item));
      setSepet(prev => prev.filter(kalem => String(kalem.id) !== String(urun.id)));
      setEtiketUrunleri(prev => prev.filter(id => String(id) !== String(urun.id)));
      setEtiketKuyrugu(prev => prev.filter(kayit => String(kayit.urun_id) !== String(urun.id)));
      setFatura(prev => ({ ...prev, kalemler: prev.kalemler.filter(kalem => String(kalem.urunId) !== String(urun.id)) }));
      setSayim(prev => {
        const yeniSayim = { ...prev };
        delete yeniSayim[urun.id];
        return yeniSayim;
      });
      if (String(hizliDuzenleme?.id) === String(urun.id)) setHizliDuzenleme(null);
      if (String(urunFormu.id) === String(urun.id)) setUrunFormu(bosUrun);
      if (String(fiyatBekleyenUrun?.urun?.id) === String(urun.id)) setFiyatBekleyenUrun(null);
      if (String(gramajBekleyenUrun?.id) === String(urun.id)) setGramajBekleyenUrun(null);
      bildir('Ürün aktif listeden kaldırıldı. Geçmiş işlemler korundu.', 'success');
    } catch (error) {
      bildir(error.message, 'error');
    } finally {
      setSilinenUrunId('');
    }
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
    const eklenecekAdet = miktarYuvarla(Math.max(Number(girilenAdet || 1), 0.001));
    const mevcut = sepet.find(kalem => sepetSatirAnahtari(kalem) === String(satirId));
    setSepet(prev => mevcut
      ? prev.map(kalem => sepetSatirAnahtari(kalem) === String(satirId) ? { ...kalem, adet: miktarYuvarla(Number(kalem.adet) + eklenecekAdet) } : kalem)
      : [...prev, {
        ...urun,
        adet: eklenecekAdet,
        satir_id: String(satirId),
        liste_fiyati: Number(urun.liste_fiyati ?? urun.satis_fiyati ?? 0),
        orijinal_liste_fiyati: Number(urun.orijinal_liste_fiyati ?? urun.liste_fiyati ?? urun.satis_fiyati ?? 0),
        indirim_turu: '',
        indirim_degeri: 0,
      }]);
  };

  const sepetAdediniDegistir = (satirId, yeniAdet) => {
    const adet = miktarYuvarla(Number(yeniAdet));
    setSepet(prev => adet <= 0
      ? prev.filter(kalem => sepetSatirAnahtari(kalem) !== String(satirId))
      : prev.map(kalem => sepetSatirAnahtari(kalem) === String(satirId) ? { ...kalem, adet } : kalem));
  };

  const sepetSatiriniSil = satirId => {
    const yeniSepet = sepet.filter(kalem => sepetSatirAnahtari(kalem) !== String(satirId));
    setSepet(yeniSepet);
    setUrunIndirimFormu(null);
    if (!yeniSepet.length) {
      setGenelIndirim({ yon: 'azalt', tur: 'yuzde', deger: '' });
      setGenelIndirimPenceresi(false);
    }
  };

  const satisSepetiniTemizle = () => {
    if (!sepet.length) return;
    if (!window.confirm('Satış sepetindeki tüm ürünler silinsin mi?')) return;
    setSepet([]);
    setUrunIndirimFormu(null);
    setGenelIndirim({ yon: 'azalt', tur: 'yuzde', deger: '' });
    setGenelIndirimPenceresi(false);
  };

  const urunFiyatiniUygula = fiyatDegeri => {
    if (!urunIndirimFormu) return;
    const yeniFiyat = Math.max(Number(fiyatDegeri ?? urunIndirimFormu.fiyat ?? 0), 0);
    if (yeniFiyat < Number(urunIndirimFormu.listeFiyati || 0)
      && !yetkiyiDogrula('indirim_yap', 'Bu personelin indirim veya ikram yapma yetkisi yok.')) return;
    if (yeniFiyat > Number(urunIndirimFormu.listeFiyati || 0)
      && !yetkiyiDogrula('fiyat_degistir', 'Bu personelin ürün fiyatını artırma yetkisi yok.')) return;
    setSepet(prev => prev.map(kalem => {
      if (sepetSatirAnahtari(kalem) !== String(urunIndirimFormu.satirId)) return kalem;
      const orijinalListeFiyati = Number(kalem.orijinal_liste_fiyati ?? kalem.liste_fiyati ?? kalem.satis_fiyati ?? 0);
      const kayitListeFiyati = Math.max(orijinalListeFiyati, yeniFiyat);
      return {
        ...kalem,
        satis_fiyati: yeniFiyat,
        liste_fiyati: kayitListeFiyati,
        indirim_turu: yeniFiyat === 0 ? 'ikram' : yeniFiyat < orijinalListeFiyati ? 'fiyat' : yeniFiyat > orijinalListeFiyati ? 'fiyat_artisi' : '',
        indirim_degeri: Math.max(orijinalListeFiyati - yeniFiyat, 0),
      };
    }));
    setUrunIndirimFormu(null);
  };

  const urunIndiriminiKaldir = satirId => {
    setSepet(prev => prev.map(kalem => sepetSatirAnahtari(kalem) === String(satirId)
      ? {
        ...kalem,
        liste_fiyati: Number(kalem.orijinal_liste_fiyati ?? kalem.liste_fiyati ?? 0),
        satis_fiyati: Number(kalem.orijinal_liste_fiyati ?? kalem.liste_fiyati ?? 0),
        indirim_turu: '',
        indirim_degeri: 0,
      }
      : kalem));
    setUrunIndirimFormu(null);
  };

  const urunFiyatiPenceresiniAc = (kalem, satirId) => {
    if (!yetkiVar('indirim_yap') && !yetkiVar('fiyat_degistir')) {
      return bildir('Bu personelin ürün fiyatı değiştirme veya ikram yetkisi yok.', 'warning');
    }
    setUrunIndirimFormu({
      satirId,
      urunAdi: kalem.urun_adi,
      fiyat: kalem.satis_fiyati,
      listeFiyati: Number(kalem.orijinal_liste_fiyati ?? kalem.liste_fiyati),
    });
  };

  const urunuFiyatKontrolluEkle = (urun, adet) => {
    if (Number(urun.satis_fiyati || 0) <= 0) {
      setFiyatBekleyenUrun({ urun, adet: Math.max(Number(adet || 1), 0.001) });
      setAnlikSatisFiyati('');
      return;
    }
    urunuSepeteEkle(urun, adet);
  };

  const satisAdediRakaminiGir = rakam => {
    setSatisAdedi(onceki => {
      if (!satisAdediTuslamaRef.current) {
        satisAdediTuslamaRef.current = true;
        return String(rakam);
      }
      const mevcut = String(onceki || '').replace(/[^\d]/g, '');
      const yeniDeger = mevcut === '0' ? String(rakam) : `${mevcut}${rakam}`;
      return yeniDeger.slice(0, 5);
    });
    window.setTimeout(() => barkodRef.current?.focus(), 0);
  };

  const satisAdediTusunuSil = () => {
    satisAdediTuslamaRef.current = true;
    setSatisAdedi(onceki => String(onceki || '').slice(0, -1));
    window.setTimeout(() => barkodRef.current?.focus(), 0);
  };

  const satisAdediTuslariniTemizle = () => {
    satisAdediTuslamaRef.current = false;
    setSatisAdedi('');
    window.setTimeout(() => barkodRef.current?.focus(), 0);
  };

  const secilenUrunuSepeteEkle = urun => {
    if (kilogramUrunuMu(urun)) {
      setGramajBekleyenUrun(urun);
      setSatisGramaji('');
      setSatisTeraziGirisTuru('gram');
      return;
    }
    urunuFiyatKontrolluEkle(urun, satisAdedi);
    setSatisAdedi('1');
    satisAdediTuslamaRef.current = false;
  };

  const odemeKisayolTusunuCalistir = event => {
    if (sekme !== 'satis' || satisKaydediliyor || bekleyenSepetIsleniyor || fiyatBekleyenUrun || gramajBekleyenUrun
      || urunIndirimFormu || genelIndirimPenceresi || bekleyenSepetPenceresi || satisCariPenceresi) return;
    const odemeTipi = { F1: 'Nakit', F2: 'Kredi Kartı', F3: 'Cari / Veresiye' }[event.key];
    if (odemeTipi) {
      event.preventDefault();
      satisiTamamla(odemeTipi);
      return;
    }
    if (event.key === 'F4') {
      event.preventDefault();
      if (!sepet.length) return bildir('Fiyat ayarı uygulanacak sepet boş.', 'warning');
      if (yetkiVar('indirim_yap') || yetkiVar('fiyat_degistir')) setGenelIndirimPenceresi(true);
      else bildir('Bu personelin indirim veya fiyat değiştirme yetkisi yok.', 'warning');
      return;
    }
    if (event.key !== 'F5') return;
    event.preventDefault();
    if (!sepet.length) return bildir('Beklemeye alınacak sepet boş.', 'warning');
    void sepetiBeklemeyeAl(undefined, '');
  };

  const gramajliUrunuSepeteEkle = event => {
    event.preventDefault();
    const girilenDeger = Number(satisGramaji);
    if (!Number.isFinite(girilenDeger) || girilenDeger <= 0) {
      return bildir(satisTeraziGirisTuru === 'tutar' ? 'Sıfırdan büyük bir TL tutarı girin.' : 'Sıfırdan büyük bir gramaj girin.', 'warning');
    }
    const kilogramFiyati = Number(gramajBekleyenUrun?.satis_fiyati || 0);
    if (satisTeraziGirisTuru === 'tutar' && kilogramFiyati <= 0) {
      return bildir('TL tutarından gramaj hesaplamak için ürünün kilogram satış fiyatı tanımlı olmalıdır.', 'warning');
    }
    const adet = Math.max(miktarYuvarla(satisTeraziGirisTuru === 'tutar'
      ? girilenDeger / kilogramFiyati
      : girilenDeger / 1000), 0.001);
    urunuFiyatKontrolluEkle(gramajBekleyenUrun, adet);
    setGramajBekleyenUrun(null);
    setSatisGramaji('');
    window.setTimeout(() => barkodRef.current?.focus(), 80);
  };

  const satisTeraziTusunaBas = tus => {
    setSatisGramaji(onceki => {
      const mevcut = String(onceki || '');
      if (tus === 'C') return '';
      if (tus === 'sil') return mevcut.slice(0, -1);
      if (tus === '.' && mevcut.includes('.')) return mevcut;
      if (tus === '.') return mevcut ? `${mevcut}.` : '0.';
      const yeniDeger = mevcut === '0' ? String(tus) : `${mevcut}${tus}`;
      return yeniDeger.slice(0, 9);
    });
  };

  const teraziBarkodunuCoz = barkod => {
    const kod = String(barkod || '').trim();
    if (!teraziAyarlari.aktif || !/^\d{13}$/.test(kod)) return null;
    const onEkler = String(teraziAyarlari.onEk || '').split(',').map(item => item.trim()).filter(Boolean);
    if (!onEkler.includes(kod.slice(0, 2))) return null;
    const urunKodu = kod.slice(2, 7);
    const urun = urunler.find(item => {
      const adaylar = [item.stok_kodu, item.barkod].map(value => String(value || '').trim());
      return adaylar.some(aday => aday === urunKodu || aday.padStart(5, '0') === urunKodu);
    });
    if (!urun) return { hata: `Terazi ürün kodu ${urunKodu} ürün listesinde bulunamadı.` };
    const hamDeger = Number(kod.slice(7, 12));
    const bolen = Math.max(Number(teraziAyarlari.bolen || 1000), 1);
    if (teraziAyarlari.degerTuru === 'tutar') {
      const toplamTutar = hamDeger / bolen;
      const birimFiyat = Number(urun.satis_fiyati || 0);
      if (birimFiyat <= 0) return { hata: 'Tutar kodlu terazi ürününün kayıtlı satış fiyatı olmalıdır.' };
      return { urun, adet: toplamTutar / birimFiyat, bilgi: `${para(toplamTutar)} terazi tutarı` };
    }
    return { urun, adet: hamDeger / bolen, bilgi: `${hamDeger / bolen} ${urun.birim || 'kg'}` };
  };

  const satisaEkle = event => {
    event.preventDefault();
    const okunanBarkod = satisBarkodu.trim();
    const urun = urunler.find(item => String(item.barkod) === okunanBarkod);
    const teraziSonucu = urun ? null : teraziBarkodunuCoz(okunanBarkod);
    if (!urun && !teraziSonucu) return bildir('Barkod ürün listesinde bulunamadı.', 'warning');
    if (teraziSonucu?.hata) return bildir(teraziSonucu.hata, 'warning');
    urunuFiyatKontrolluEkle(urun || teraziSonucu.urun, urun ? satisAdedi : teraziSonucu.adet);
    setSatisBarkodu('');
    setSatisAdedi('1');
    satisAdediTuslamaRef.current = false;
  };

  const sepetiBeklemeyeAl = async (event, sepetAdi = bekleyenSepetAdi) => {
    event?.preventDefault();
    if (!sepet.length) return bildir('Beklemeye alınacak sepet boş.', 'warning');
    setBekleyenSepetIsleniyor(true);
    try {
      const seciliCari = cariler.find(cari => String(cari.id) === String(satisCariId));
      const kayit = await marketBekleyenSepetiKaydet(restaurantId, {
        sepetAdi,
        cariId: satisCariId,
        cariAdi: seciliCari?.ad,
        kalemler: sepet,
        genelIndirim,
      });
      setBekleyenSepetler(prev => [kayit, ...prev]);
      setSepet([]);
      setSatisCariId('');
      setGenelIndirim({ yon: 'azalt', tur: 'yuzde', deger: '' });
      setGenelIndirimPenceresi(false);
      setUrunIndirimFormu(null);
      setBekleyenSepetAdi('');
      setBekleyenSepetPenceresi('');
      bildir('Sepet beklemeye alındı.', 'success');
    } catch (error) {
      bildir(error.message, 'error');
    } finally {
      setBekleyenSepetIsleniyor(false);
    }
  };

  const bekleyenSepetiAc = async kayit => {
    if (sepet.length) return bildir('Önce açık sepeti tamamlayın veya beklemeye alın.', 'warning');
    setBekleyenSepetIsleniyor(true);
    try {
      const aktifUrunIdleri = new Set(urunler.map(urun => String(urun.id)));
      const tumKalemler = Array.isArray(kayit.kalemler) ? kayit.kalemler : [];
      const acilacakKalemler = tumKalemler.filter(kalem => aktifUrunIdleri.has(String(kalem.id)));
      await marketBekleyenSepetiSil(restaurantId, kayit.id);
      setSepet(acilacakKalemler);
      setSatisCariId(kayit.cari_id || '');
      setGenelIndirim(kayit.genel_indirim?.tur
        ? { yon: kayit.genel_indirim.yon || 'azalt', ...kayit.genel_indirim }
        : { yon: 'azalt', tur: 'yuzde', deger: '' });
      setBekleyenSepetler(prev => prev.filter(item => String(item.id) !== String(kayit.id)));
      setBekleyenSepetPenceresi('');
      bildir(tumKalemler.length === acilacakKalemler.length
        ? 'Bekleyen sepet satış ekranına alındı.'
        : 'Bekleyen sepet açıldı; silinmiş ürünler sepetten çıkarıldı.', tumKalemler.length === acilacakKalemler.length ? 'success' : 'warning');
    } catch (error) {
      bildir(error.message, 'error');
    } finally {
      setBekleyenSepetIsleniyor(false);
    }
  };

  const bekleyenSepetiSil = async kayit => {
    setBekleyenSepetIsleniyor(true);
    try {
      await marketBekleyenSepetiSil(restaurantId, kayit.id);
      setBekleyenSepetler(prev => prev.filter(item => String(item.id) !== String(kayit.id)));
      bildir('Bekleyen sepet silindi.', 'success');
    } catch (error) {
      bildir(error.message, 'error');
    } finally {
      setBekleyenSepetIsleniyor(false);
    }
  };

  const anlikSatisFiyatiniUygula = event => {
    event.preventDefault();
    const fiyat = Number(anlikSatisFiyati);
    if (!Number.isFinite(fiyat) || fiyat <= 0) return bildir('Sıfırdan büyük bir satış fiyatı girin.', 'warning');
    const satirId = `${fiyatBekleyenUrun.urun.id}-fiyat-${fiyat.toFixed(2)}-${Date.now()}`;
    urunuSepeteEkle({ ...fiyatBekleyenUrun.urun, satis_fiyati: fiyat }, fiyatBekleyenUrun.adet, satirId);
    setFiyatBekleyenUrun(null);
    setAnlikSatisFiyati('');
    window.setTimeout(() => barkodRef.current?.focus(), 80);
  };

  const satisFisiniYazdir = async (satis, sessiz = false) => {
    if (!yetkiyiDogrula('fis_yazdir', 'Bu personelin satış fişi yazdırma yetkisi yok.')) return;
    try {
      await marketSatisFisiniKuyrugaEkle(restaurantId, satis, satisFisiMetni(satis, restaurantName));
      if (!sessiz) bildir('Fiş Windows varsayılan yazıcısına gönderildi.', 'success');
    } catch (error) {
      bildir(error.message, 'warning');
    }
  };

  const satisFisiKarariniUygula = async satis => {
    if (fisDavranisi === 'yazdirma' || !yetkiVar('fis_yazdir')) return;
    if (fisDavranisi === 'sor' && !window.confirm('Satış tamamlandı. Fiş yazdırılsın mı?')) return;
    await satisFisiniYazdir(satis, true);
  };

  const satisiTamamla = async odemeTipi => {
    if (satisKaydiSuruyorRef.current) return;
    if (!sepet.length) return bildir('Satış sepeti boş.', 'warning');
    if ((sepetToplamlari.urunIndirimTutari > 0 || sepetToplamlari.genelIndirimTutari > 0)
      && !yetkiyiDogrula('indirim_yap', 'Bu indirimli satışı tamamlamak için indirim yetkisi gerekir.')) return;
    if (sepetToplamlari.genelArtisTutari > 0
      && !yetkiyiDogrula('fiyat_degistir', 'Toplam tutarı artırılmış bu satışı tamamlamak için fiyat değiştirme yetkisi gerekir.')) return;
    if (odemeTipi === 'Cari / Veresiye' && !satisCariId) return bildir('Veresiye satış için cari seçin.', 'warning');
    satisKaydiSuruyorRef.current = true;
    setSatisKaydediliyor(true);
    try {
      const satilanKalemler = sepet.map(kalem => ({ ...kalem }));
      const islemImzasi = JSON.stringify({
        odemeTipi,
        satisCariId,
        genelIndirim,
        kalemler: satilanKalemler.map(kalem => [kalem.id, kalem.adet, kalem.liste_fiyati, kalem.satis_fiyati]),
      });
      if (satisIslemAnahtariRef.current.imza !== islemImzasi) {
        satisIslemAnahtariRef.current = {
          anahtar: globalThis.crypto?.randomUUID?.() || `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`,
          imza: islemImzasi,
        };
      }
      const beklenenToplam = sepetToplamlari.netToplam;
      const yeniSatis = await marketSatisiKaydet(
        restaurantId,
        satilanKalemler,
        odemeTipi,
        satisCariId,
        satisIslemAnahtariRef.current.anahtar,
        genelIndirim
      );
      const toplam = Number(yeniSatis.toplam_tutar ?? beklenenToplam);
      const satilanMiktarlar = satilanKalemler.reduce((toplamlar, kalem) => {
        const urunId = String(kalem.id);
        toplamlar.set(urunId, Number(toplamlar.get(urunId) || 0) + Number(kalem.adet || 0));
        return toplamlar;
      }, new Map());
      setSepet([]);
      setGenelIndirim({ yon: 'azalt', tur: 'yuzde', deger: '' });
      setGenelIndirimPenceresi(false);
      setUrunIndirimFormu(null);
      satisIslemAnahtariRef.current = { anahtar: '', imza: '' };
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
      void satisFisiKarariniUygula({
        ...yeniSatis,
        created_at: yeniSatis.created_at || new Date().toISOString(),
        odeme_tipi: yeniSatis.odeme_tipi || odemeTipi,
        cari_adi: yeniSatis.cari_adi || seciliSatisCarisi?.ad || '',
        brut_toplam: yeniSatis.brut_toplam ?? sepetToplamlari.brutToplam,
        indirim_toplami: yeniSatis.indirim_toplami ?? (sepetToplamlari.urunIndirimTutari + sepetToplamlari.genelIndirimTutari),
        toplam_tutar: yeniSatis.toplam_tutar ?? beklenenToplam,
      });
      void verileriYukle(true);
      window.setTimeout(() => barkodRef.current?.focus(), 80);
    } catch (error) {
      bildir(`${error.message} Sepet korundu; tekrar deneyebilirsiniz.`, 'error');
    } finally {
      satisKaydiSuruyorRef.current = false;
      setSatisKaydediliyor(false);
    }
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

  const faturayiSil = async kayit => {
    if (!yetkiyiDogrula('urun_yonet', 'Bu personelin alış faturası silme yetkisi yok.')) return;
    const kalemSayisi = (kayit.market_alis_fatura_kalemleri || kayit.raporKalemleri || []).length;
    const faturaTanimi = kayit.fatura_no ? `${kayit.fatura_no} numaralı alış faturası` : 'Bu alış faturası';
    const onaylandi = window.confirm(
      `${faturaTanimi} silinecek. ${kalemSayisi} kalemin stok girişi ve bağlı cari hareketi geri alınacak. Devam edilsin mi?`,
    );
    if (!onaylandi) return;

    setSilinenFaturaId(String(kayit.id));
    try {
      await marketAlisFaturasiSil(restaurantId, kayit.id);
      if (String(fatura.id || '') === String(kayit.id)) setFatura(bosFatura());
      setAcikFaturaId('');
      setAcikAlisRaporuId('');
      await verileriYukle(true);
      bildir('Alış faturası silindi; stok ve cari etkisi geri alındı.', 'success');
    } catch (error) {
      bildir(error.message, 'error');
    } finally {
      setSilinenFaturaId('');
    }
  };

  const sayimaUrunSec = (urun, barkodOkutuldu = false) => {
    if (!urun) return;
    setSayim(prev => ({
      ...prev,
      [urun.id]: barkodOkutuldu
        ? miktarYuvarla(Number(prev[urun.id] ?? 0) + 1)
        : (Object.prototype.hasOwnProperty.call(prev, urun.id) ? prev[urun.id] : 0),
    }));
    setSayimBarkodu('');
    window.setTimeout(() => barkodRef.current?.focus(), 30);
  };

  const sayimaEkle = event => {
    event.preventDefault();
    const aranan = sayimBarkodu.trim();
    if (!aranan) return;
    const barkodluUrun = urunler.find(item => item.barkod && String(item.barkod) === aranan);
    if (barkodluUrun) return sayimaUrunSec(barkodluUrun, true);
    const tamAdliUrun = urunler.find(item => String(item.urun_adi || '').toLocaleLowerCase('tr-TR') === aranan.toLocaleLowerCase('tr-TR'));
    if (tamAdliUrun) return sayimaUrunSec(tamAdliUrun);
    if (sayimAramaSonuclari.length === 1) return sayimaUrunSec(sayimAramaSonuclari[0]);
    if (sayimAramaSonuclari.length > 1) return bildir('Birden fazla ürün bulundu. Aşağıdaki listeden doğru ürünü seçin.', 'warning');
    bildir('Ürün adı veya barkod ürün listesinde bulunamadı.', 'warning');
  };

  const sayimdanUrunCikar = urun => {
    setSayim(prev => {
      const sonraki = { ...prev };
      delete sonraki[urun.id];
      return sonraki;
    });
    bildir(`${urun.urun_adi} sayımdan çıkarıldı.`, 'info');
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

  const satisIadesiniKaydet = async (satis, tamIptal = false) => {
    if (iadeIsleniyor) return;
    const kalemler = tamIptal ? [] : (satis.market_satis_kalemleri || [])
      .map(kalem => ({
        satisKalemId: kalem.id,
        adet: Number(iadeAdetleri[kalem.id] || 0),
      }))
      .filter(kalem => kalem.adet > 0);
    if (!tamIptal && !kalemler.length) return bildir('İade edilecek ürün miktarını girin.', 'warning');
    if (tamIptal && !window.confirm('Bu satışın kalan tüm ürünleri iptal edilip stoğa geri alınacak. Devam edilsin mi?')) return;
    setIadeIsleniyor(true);
    try {
      await marketSatisIadeEt(restaurantId, satis.id, kalemler, iadeAciklama, tamIptal);
      setIadeAdetleri({});
      setIadeAciklama('');
      await verileriYukle(true);
      bildir(tamIptal ? 'Satış iptal edildi; stok ve cari geri işlendi.' : 'Ürün iadesi tamamlandı.', 'success');
    } catch (error) {
      bildir(error.message, 'error');
    } finally {
      setIadeIsleniyor(false);
    }
  };

  const kasaVardiyasiAc = async event => {
    event.preventDefault();
    try {
      await marketKasaVardiyasiAc(restaurantId, kasaAcilis.tutar, kasaAcilis.notMetni);
      setKasaAcilis({ tutar: '', notMetni: '' });
      await verileriYukle(true);
      bildir('Kasa vardiyası açıldı.', 'success');
    } catch (error) { bildir(error.message, 'error'); }
  };

  const kasaHareketiniKaydet = async event => {
    event.preventDefault();
    try {
      await marketKasaHareketiKaydet(restaurantId, acikVardiya?.id, kasaHareketi);
      setKasaHareketi({ hareketTipi: 'Giriş', tutar: '', aciklama: '' });
      await verileriYukle(true);
      bildir('Kasa hareketi kaydedildi.', 'success');
    } catch (error) { bildir(error.message, 'error'); }
  };

  const kasaVardiyasiniKapat = async event => {
    event.preventDefault();
    if (!acikVardiya) return;
    try {
      await marketKasaVardiyasiKapat(
        restaurantId,
        acikVardiya.id,
        kasaOzeti.beklenen,
        kasaKapanis.sayilan,
        kasaKapanis.notMetni
      );
      setKasaKapanis({ sayilan: '', notMetni: '' });
      await verileriYukle(true);
      bildir('Kasa vardiyası kapatıldı ve fark kaydedildi.', 'success');
    } catch (error) { bildir(error.message, 'error'); }
  };

  const raporSatirlariniHazirla = () => {
    if (raporSekmesi === 'sayim') return {
      baslik: 'Sayım Farkları',
      kolonlar: ['Tarih', 'Sayım', 'Ürün', 'Barkod', 'Sistem', 'Sayılan', 'Fark'],
      satirlar: sayimFarkRaporu.map(kayit => [
        new Date(kayit.tarih).toLocaleString('tr-TR'), kayit.sayimAdi, kayit.urunAdi,
        kayit.barkod, kayit.sistemMiktari, kayit.sayilanMiktar, kayit.fark,
      ]),
    };
    if (raporSekmesi === 'stok') return {
      baslik: 'Eldeki Stok',
      kolonlar: ['Ürün', 'Barkod', 'Grup', 'Miktar', 'Alış Değeri', 'Satış Değeri', 'Potansiyel Kâr'],
      satirlar: stokRaporu.kalemler.map(urun => [
        urun.urun_adi, urun.barkod, urun.kategori, urun.miktar,
        urun.alisDegeri.toFixed(2), urun.satisDegeri.toFixed(2), urun.potansiyelKar.toFixed(2),
      ]),
    };
    if (raporSekmesi === 'marka' || raporSekmesi === 'grup') {
      const kayitlar = raporSekmesi === 'marka' ? ticariRapor.markalar : ticariRapor.gruplar;
      return {
        baslik: raporSekmesi === 'marka' ? 'Marka Alış ve Satış Raporu' : 'Grup Alış ve Satış Raporu',
        kolonlar: [raporSekmesi === 'marka' ? 'Marka' : 'Grup', 'Satılan Miktar', 'Satış Cirosu', 'Alınan Miktar', 'Alış Tutarı', 'Satış - Alış Farkı'],
        satirlar: kayitlar.map(kayit => [
          kayit.ad, kayit.satilanMiktar, kayit.satisCiro.toFixed(2),
          kayit.alinanMiktar, kayit.alisTutar.toFixed(2), kayit.fark.toFixed(2),
        ]),
      };
    }
    if (raporSekmesi === 'alis') return {
      baslik: 'Alış Faturaları Raporu',
      kolonlar: ['Tarih', 'Tedarikçi', 'Fatura No', 'Ürün', 'Barkod', 'Miktar', 'Birim Alış', 'Satır Toplamı'],
      satirlar: ticariRapor.faturalar.flatMap(faturaKaydi =>
        faturaKaydi.raporKalemleri.map(kalem => [
          tarihYaz(faturaKaydi.fatura_tarihi), faturaKaydi.tedarikci_adi || '',
          faturaKaydi.fatura_no || '', kalem.urun_adi, kalem.barkod,
          kalem.miktar, Number(kalem.birim_alis_fiyati || 0).toFixed(2),
          Number(kalem.satir_toplami || 0).toFixed(2),
        ])
      ),
    };
    if (raporSekmesi === 'kar') return {
      baslik: 'Kâr Raporu',
      kolonlar: ['Ürün', 'Adet', 'Ciro', 'Maliyet', 'Kâr'],
      satirlar: rapor.urunler.map(urun => [
        urun.urunAdi, urun.adet, urun.ciro.toFixed(2), urun.maliyet.toFixed(2), urun.kar.toFixed(2),
      ]),
    };
    return {
      baslik: raporSekmesi === 'gun_sonu' ? `Gün Sonu ${raporTarihi}` : 'Satış Fişleri',
      kolonlar: ['Tarih', 'Cari', 'Ödeme', 'Durum', 'Brüt', 'İndirim', 'Satış Net', 'İade', 'Kalan Net'],
      satirlar: rapor.satislar.map(satis => [
        new Date(satis.created_at).toLocaleString('tr-TR'), satis.cari_adi || '',
        satis.odeme_tipi, satis.durum || 'Tamamlandı', Number(satis.brut_toplam || satis.toplam_tutar || 0).toFixed(2),
        Number(satis.indirim_toplami || 0).toFixed(2), Number(satis.toplam_tutar || 0).toFixed(2),
        Number(satis.iade_toplami || 0).toFixed(2), Number(satis.raporToplam || 0).toFixed(2),
      ]),
    };
  };

  const raporuCsvIndir = () => {
    const veri = raporSatirlariniHazirla();
    const csvHucre = deger => `"${String(deger ?? '').replaceAll('"', '""')}"`;
    const icerik = [veri.kolonlar, ...veri.satirlar].map(satir => satir.map(csvHucre).join(';')).join('\r\n');
    const baglanti = document.createElement('a');
    baglanti.href = URL.createObjectURL(new Blob([`\uFEFF${icerik}`], { type: 'text/csv;charset=utf-8' }));
    baglanti.download = `${veri.baslik.toLocaleLowerCase('tr-TR').replaceAll(/[^a-z0-9çğıöşü]+/gi, '-')}.csv`;
    baglanti.click();
    URL.revokeObjectURL(baglanti.href);
  };

  const raporuPdfIndir = async () => {
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      const veri = raporSatirlariniHazirla();
      const pdfMetni = deger => String(deger ?? '')
        .replaceAll('ı', 'i').replaceAll('İ', 'I').replaceAll('ş', 's').replaceAll('Ş', 'S')
        .replaceAll('ğ', 'g').replaceAll('Ğ', 'G').replaceAll('ü', 'u').replaceAll('Ü', 'U')
        .replaceAll('ö', 'o').replaceAll('Ö', 'O').replaceAll('ç', 'c').replaceAll('Ç', 'C');
      const belge = new jsPDF({ orientation: veri.kolonlar.length > 5 ? 'landscape' : 'portrait' });
      belge.setFontSize(15);
      belge.text(pdfMetni(veri.baslik), 14, 16);
      autoTable(belge, {
        startY: 22,
        head: [veri.kolonlar.map(pdfMetni)],
        body: veri.satirlar.map(satir => satir.map(pdfMetni)),
        styles: { fontSize: 8 },
      });
      belge.save(`${pdfMetni(veri.baslik).toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}.pdf`);
    } catch (error) {
      bildir(`PDF hazırlanamadı: ${error.message}`, 'error');
    }
  };

  const urunSablonunuIndir = () => {
    const basliklar = [
      'barkod', 'urun_adi', 'grup', 'stok_kodu', 'marka', 'birim', 'kdv',
      'alis_fiyati', 'satis_fiyati', 'stok', 'minimum_stok', 'raf',
      'son_kullanma_tarihi', 'lot_no',
    ];
    const ornek = ['8690000000001', 'Örnek Ürün', 'İçecekler', '00001', 'Marka', 'Adet', '20', '10,50', '15,00', '25', '5', 'A-01', '', ''];
    const icerik = [basliklar, ornek].map(satir => satir.map(deger => `"${String(deger).replaceAll('"', '""')}"`).join(';')).join('\r\n');
    const baglanti = document.createElement('a');
    baglanti.href = URL.createObjectURL(new Blob([`\uFEFF${icerik}`], { type: 'text/csv;charset=utf-8' }));
    baglanti.download = 'integra-market-urun-aktarim-sablonu.csv';
    baglanti.click();
    URL.revokeObjectURL(baglanti.href);
  };

  const topluUrunDosyasiniOku = async event => {
    const dosya = event.target.files?.[0];
    event.target.value = '';
    if (!dosya) return;
    try {
      const csvSatirlari = csvSatirlariniAyristir(await dosya.text());
      if (csvSatirlari.length < 2) throw new Error('Dosyada başlık ve en az bir ürün satırı olmalıdır.');
      const basliklar = csvSatirlari[0].map(csvBasliginiTemizle);
      const deger = (satir, ...adlar) => {
        const index = adlar.map(csvBasliginiTemizle).map(ad => basliklar.indexOf(ad)).find(sira => sira >= 0);
        return index >= 0 ? satir[index] : '';
      };
      const hatalar = [];
      const satirlar = csvSatirlari.slice(1).map((satir, index) => {
        const urun = {
          satirNo: index + 2,
          barkod: deger(satir, 'barkod', 'barcode'),
          urunAdi: deger(satir, 'urun_adi', 'ürün adı', 'urun'),
          grup: deger(satir, 'grup', 'kategori'),
          stokKodu: deger(satir, 'stok_kodu', 'ürün kodu', 'terazi_kodu'),
          marka: deger(satir, 'marka'),
          birim: deger(satir, 'birim') || 'Adet',
          kdv: deger(satir, 'kdv', 'kdv_orani') === '' ? null : csvSayisi(deger(satir, 'kdv', 'kdv_orani')),
          alisFiyati: csvSayisi(deger(satir, 'alis_fiyati', 'alış fiyatı', 'alis')),
          satisFiyati: csvSayisi(deger(satir, 'satis_fiyati', 'satış fiyatı', 'satis')),
          stokMiktari: csvSayisi(deger(satir, 'stok', 'stok_miktari')),
          minimumStok: csvSayisi(deger(satir, 'minimum_stok', 'min_stok')),
          rafKonumu: deger(satir, 'raf', 'raf_konumu'),
          sonKullanmaTarihi: deger(satir, 'son_kullanma_tarihi', 'skt'),
          lotNo: deger(satir, 'lot_no', 'lot'),
        };
        if (!String(urun.barkod).trim()) hatalar.push(`Satır ${urun.satirNo}: barkod boş.`);
        if (!String(urun.urunAdi).trim()) hatalar.push(`Satır ${urun.satirNo}: ürün adı boş.`);
        if (!String(urun.grup).trim()) hatalar.push(`Satır ${urun.satirNo}: grup boş.`);
        return urun;
      });
      const gecersizSatirlar = new Set(hatalar.map(hataMetni => Number(hataMetni.match(/\d+/)?.[0])));
      setTopluAktarim({
        dosyaAdi: dosya.name,
        satirlar: satirlar.filter(satir => !gecersizSatirlar.has(satir.satirNo)),
        hatalar,
      });
    } catch (error) {
      setTopluAktarim({ dosyaAdi: dosya.name, satirlar: [], hatalar: [error.message] });
    }
  };

  const topluUrunleriAktar = async () => {
    if (!topluAktarim.satirlar.length) return bildir('Aktarılacak geçerli ürün bulunamadı.', 'warning');
    setTopluAktariliyor(true);
    try {
      const kayitlar = await marketUrunleriniTopluKaydet(restaurantId, topluAktarim.satirlar, gruplar);
      setTopluAktarim({ dosyaAdi: '', satirlar: [], hatalar: [] });
      await verileriYukle(true);
      bildir(`${kayitlar.length} ürün başarıyla aktarıldı veya güncellendi.`, 'success');
    } catch (error) {
      bildir(error.message, 'error');
    } finally {
      setTopluAktariliyor(false);
    }
  };

  const fiyatDegisenleriSec = () => {
    const kuyruktakiUrunler = urunler.filter(urun => bekleyenEtiketUrunIdleri.includes(String(urun.id))).map(urun => urun.id);
    setEtiketUrunleri(prev => [...new Set([...prev, ...kuyruktakiUrunler])]);
    if (!kuyruktakiUrunler.length) bildir('Bekleyen fiyat etiketi bulunmuyor.', 'info');
  };

  const etiketleriYazdir = async () => {
    if (!etiketUrunleri.length) return bildir('Önce ürün seçin.', 'warning');
    window.print();
    const seciliIdler = new Set(etiketUrunleri.map(String));
    const tamamlanacaklar = etiketKuyrugu.filter(kayit => seciliIdler.has(String(kayit.urun_id))).map(kayit => kayit.id);
    if (!tamamlanacaklar.length) return;
    try {
      await marketEtiketKuyrugunuTamamla(restaurantId, tamamlanacaklar);
      setEtiketKuyrugu(prev => prev.filter(kayit => !tamamlanacaklar.includes(kayit.id)));
    } catch (error) {
      bildir(`Etiket basıldı ancak kuyruk güncellenemedi: ${error.message}`, 'warning');
    }
  };

  const nav = [
    ['satis', '▥ Barkodlu Satış'],
    ['gruplar', '▦ Gruplar'],
    ['urunler', '📦 Ürünler'],
    ['alis', '🧾 Alış Faturaları'],
    ['finans', '💰 Finans / Cari'],
    ['kasa', '💵 Kasa / Vardiya'],
    ['sayim', '📋 Sayım'],
    ['hareketler', '↕ Stok Hareketleri'],
    ['etiket', '🏷️ Etiket Basımı'],
    ['raporlar', '📈 Raporlar'],
  ];

  return (
    <section className="market-shell" onKeyDown={odemeKisayolTusunuCalistir}>
      <nav className="market-tabs" aria-label="Market modülü">{nav.map(([key, label]) =>
        <button type="button" key={key} className={sekme === key ? 'active' : ''} onClick={() => setSekme(key)}>{label}</button>
      )}<button type="button" className="market-tab-refresh" onClick={() => verileriYukle(false)} aria-label="Verileri yenile">↻</button></nav>
      {hata && <div className="market-alert"><strong>Kontrol gerekiyor:</strong> {hata}</div>}
      {yukleniyor && <div className="market-loading">Market verileri hazırlanıyor…</div>}

      {!yukleniyor && sekme === 'satis' && <div className="market-pos-layout market-pos-practical">
        <div className="market-card market-catalog">
          <div className="market-group-tabs">
            {gorunenGruplar.map(grup => <button
              type="button"
              key={grup.id}
              className={String(aktifSatisGrubu) === String(grup.id) ? 'active' : ''}
              style={{ '--market-group-color': grup.grup_rengi || '#c2410c', '--market-group-text': kontrastYaziRengi(grup.grup_rengi || '#c2410c') }}
              onClick={() => setSatisGrubu(grup.id)}
            >{grup.grup_adi}</button>)}
          </div>
          <div className="market-pos-product-panel">
            <div className="market-pos-entrybar">
              <form className="market-pos-barcode-entry" onSubmit={satisaEkle}>
                <input ref={barkodRef} value={satisBarkodu} onChange={event => setSatisBarkodu(event.target.value)} placeholder="Barkodu okutun veya yazın" aria-label="Satış barkodu" />
                <button type="submit" aria-label="Barkodu sepete ekle">＋</button>
              </form>
              <div className="market-sale-searchbox">
                <span aria-hidden="true">⌕</span>
                <input className="market-sale-search" value={satisArama} onChange={event => setSatisArama(event.target.value)} placeholder="Ürün bul" />
                {satisArama && <button type="button" onClick={() => setSatisArama('')} aria-label="Aramayı temizle">×</button>}
              </div>
            </div>
            {!gorunenGruplar.length && !satisArama.trim() && <p className="market-empty">Satış ekranında gösterilen grup yok. Gruplar bölümünden en az bir grubu görünür yapın veya ürün arayın.</p>}
            <div className="market-sale-products">
              {satisUrunleri.map(urun => {
                const urunGrubu = grupHaritasi.get(String(urun.grup_id));
                const urunRengi = urunGrubu?.urun_rengi || '#0f172a';
                return <button
                  type="button"
                  key={urun.id}
                  className={kritikUrunMu(urun) ? 'is-critical' : ''}
                  style={{ '--market-product-color': urunRengi, '--market-product-text': kontrastYaziRengi(urunRengi) }}
                  onClick={() => secilenUrunuSepeteEkle(urun)}
                >
                  <span><strong>{urun.urun_adi}</strong><small>{urun.barkod || 'Barkodsuz'} · Stok {miktarYaz(urun.stok_miktari)}</small></span>
                  <b>{Number(urun.satis_fiyati || 0) > 0 ? `${para(urun.satis_fiyati)}${kilogramUrunuMu(urun) ? ' / kg' : ''}` : 'Satışta fiyat gir'}</b>
                  <i>＋</i>
                </button>;
              })}
              {!satisUrunleri.length && <p className="market-empty">{satisArama.trim() ? 'Tüm ürünlerde aramaya uygun kayıt bulunamadı.' : 'Bu grupta ürün bulunamadı.'}</p>}
            </div>
          </div>
          <aside className="market-pos-number-rail" aria-label="Dokunmatik adet tuş takımı">
            <label><span>Adet</span><input type="number" min="0.001" step="0.001" value={satisAdedi} onFocus={event => event.target.select()} onChange={event => { satisAdediTuslamaRef.current = true; setSatisAdedi(event.target.value); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); barkodRef.current?.focus(); } }} /></label>
            {[1, 2, 3, 4, 5, 6].map(rakam => <button type="button" key={rakam} onClick={() => satisAdediRakaminiGir(rakam)}>{rakam}</button>)}
            <button type="button" className="accent" onClick={satisAdediTusunuSil} aria-label="Son rakamı sil">⌫</button>
            <button type="button" className="clear" onClick={satisAdediTuslariniTemizle} aria-label="Adedi temizle">CL</button>
            {[7, 8, 9, 0].map(rakam => <button type="button" key={rakam} onClick={() => satisAdediRakaminiGir(rakam)}>{rakam}</button>)}
          </aside>
        </div>
        <div className="market-card market-checkout">
          <div className="market-heading market-checkout-heading"><div><span>AKTİF SATIŞ</span><h2>{sepet.length} kalem · {miktarYaz(sepet.reduce((toplam, kalem) => toplam + Number(kalem.adet), 0))} ürün</h2></div><strong>{para(sepetToplamlari.netToplam)}</strong></div>
          <div className="market-park-toolbar">
            <button type="button" disabled={!sepet.length || bekleyenSepetIsleniyor} onClick={() => setBekleyenSepetPenceresi('kaydet')}><kbd>F5</kbd> ⏸ Sepeti Beklet</button>
            <button type="button" className={bekleyenSepetler.length ? 'active' : ''} disabled={bekleyenSepetIsleniyor} onClick={() => setBekleyenSepetPenceresi('liste')}>▶ Bekleyenler ({bekleyenSepetler.length})</button>
            <button type="button" className="market-clear-cart" disabled={!sepet.length || bekleyenSepetIsleniyor} onClick={satisSepetiniTemizle}>Sepeti Temizle</button>
          </div>
          <aside className="market-pos-action-rail" aria-label="Hızlı satış işlemleri">
            <button type="button" className={satisCariId ? 'active' : ''} onClick={() => { setSatisCariArama(''); setSatisCariPenceresi(true); }}><span>👤</span><b>Cari</b><small>{seciliSatisCarisi?.ad || 'Seçilmedi'}</small></button>
            <button type="button" onClick={() => { setSekme('raporlar'); setRaporSekmesi('fisler'); }}><span>🧾</span><b>Fiş Listesi</b></button>
            <button type="button" disabled={!sepet.length} onClick={() => {
              if (yetkiVar('indirim_yap') || yetkiVar('fiyat_degistir')) setGenelIndirimPenceresi(true);
              else bildir('Bu personelin indirim veya fiyat değiştirme yetkisi yok.', 'warning');
            }}><span>±</span><b>Fiyat / İndirim</b><small>F4</small></button>
            <button type="button" disabled={!sepet.length || bekleyenSepetIsleniyor} onClick={() => setBekleyenSepetPenceresi('kaydet')}><span>⏸</span><b>Beklet</b><small>F5</small></button>
            <button type="button" className={bekleyenSepetler.length ? 'active' : ''} disabled={bekleyenSepetIsleniyor} onClick={() => setBekleyenSepetPenceresi('liste')}><span>▶</span><b>Bekleyen</b><small>{bekleyenSepetler.length} fiş</small></button>
            <button type="button" className="danger" disabled={!sepet.length || bekleyenSepetIsleniyor} onClick={satisSepetiniTemizle}><span>×</span><b>Fiş İptal</b></button>
          </aside>
          {!sepet.length ? <div className="market-cart-empty"><strong>Satışa hazır</strong><span>Barkodu okutun veya ürün listesinden seçim yapın.</span></div> :
            <div className="market-table market-cart-table"><table><thead><tr><th>Ürün</th><th>Adet</th><th>Toplam</th><th></th></tr></thead><tbody>
              {sepet.map(kalem => {
                const satirId = sepetSatirAnahtari(kalem);
                const indirimli = Number(kalem.liste_fiyati ?? kalem.satis_fiyati) > Number(kalem.satis_fiyati);
                return <tr key={satirId}><td><strong>{kalem.urun_adi}</strong><small>{kilogramUrunuMu(kalem) && <span className="market-cart-weight">{Math.round(Number(kalem.adet) * 1000)} g · </span>}{indirimli && <del>{para(kalem.liste_fiyati)}</del>}<button className={Number(kalem.satis_fiyati) === 0 ? 'market-cart-price complimentary' : 'market-cart-price'} type="button" onClick={() => urunFiyatiPenceresiniAc(kalem, satirId)}>{Number(kalem.satis_fiyati) === 0 ? 'İKRAM' : `${para(kalem.satis_fiyati)}${kilogramUrunuMu(kalem) ? ' / kg' : ''}`}</button></small></td><td><div className="market-quantity-control"><button type="button" aria-label={`${kalem.urun_adi} azalt`} onClick={() => sepetAdediniDegistir(satirId, Number(kalem.adet) - (kilogramUrunuMu(kalem) ? 0.1 : 1))}>−</button><input aria-label={`${kalem.urun_adi} adedi`} type="number" min="0.001" step={kilogramUrunuMu(kalem) ? '0.001' : '1'} value={kalem.adet} onFocus={event => event.target.select()} onChange={event => sepetAdediniDegistir(satirId, event.target.value)} /><button type="button" aria-label={`${kalem.urun_adi} artır`} onClick={() => sepetAdediniDegistir(satirId, Number(kalem.adet) + (kilogramUrunuMu(kalem) ? 0.1 : 1))}>＋</button></div></td><td><strong>{para(Number(kalem.adet) * Number(kalem.satis_fiyati))}</strong></td><td><button className="market-remove" type="button" onClick={() => sepetSatiriniSil(satirId)}>×</button></td></tr>;
              })}
            </tbody></table></div>}
          <div className="market-cart-discount market-cart-totals-only">
            <div className="market-cart-summary"><span>Brüt<strong>{para(sepetToplamlari.brutToplam)}</strong></span>{sepetToplamlari.urunIndirimTutari > 0 && <span>Ürün / ikram<strong>−{para(sepetToplamlari.urunIndirimTutari)}</strong></span>}{sepetToplamlari.genelIndirimTutari > 0 && <span>İndirim<strong>−{para(sepetToplamlari.genelIndirimTutari)}</strong></span>}{sepetToplamlari.genelArtisTutari > 0 && <span className="increase">Fiyat artışı<strong>+{para(sepetToplamlari.genelArtisTutari)}</strong></span>}<span className="total">Ödenecek<strong>{para(sepetToplamlari.netToplam)}</strong></span></div>
          </div>
          <div className="market-payment-buttons"><button type="button" disabled={satisKaydediliyor} onClick={() => satisiTamamla('Nakit')}><kbd>F1</kbd>💵<span>{satisKaydediliyor ? 'Kaydediliyor…' : 'Nakit'}</span></button><button type="button" disabled={satisKaydediliyor} onClick={() => satisiTamamla('Kredi Kartı')}><kbd>F2</kbd>💳<span>{satisKaydediliyor ? 'Bekleyin' : 'Kart'}</span></button><button type="button" disabled={satisKaydediliyor} onClick={() => satisiTamamla('Cari / Veresiye')}><kbd>F3</kbd>👤<span>{satisKaydediliyor ? 'Bekleyin' : 'Cari'}</span></button></div>
          <p className="market-note">Veresiye işlem için cari seçimi zorunludur. Nakit ve kart satışlarında cari seçimi isteğe bağlıdır.</p>
        </div>
        {satisCariPenceresi && <div className="market-price-modal" role="dialog" aria-modal="true" aria-label="Satış carisi seç">
          <div className="market-customer-modal">
            <span>CARİ SEÇİMİ</span>
            <h2>Müşteri / cari seçin</h2>
            <input className="market-customer-search" value={satisCariArama} onChange={event => setSatisCariArama(event.target.value)} placeholder="İsim veya telefon ile ara" autoFocus />
            {seciliSatisCarisi && cariOzeti(seciliSatisCarisi)}
            <button className={!satisCariId ? 'market-customer-none active' : 'market-customer-none'} type="button" onClick={() => { setSatisCariId(''); setSatisCariPenceresi(false); }}>Cari seçmeden satış</button>
            <div className="market-customer-list">
              {filtreliSatisCarileri.map(cari => <button type="button" key={cari.id} className={String(satisCariId) === String(cari.id) ? 'active' : ''} onClick={() => { setSatisCariId(String(cari.id)); setSatisCariPenceresi(false); }}>
                <span><strong>{cari.ad}</strong><small>{cari.telefon || 'Telefon yok'}</small></span>
                <b className={Number(cari.bakiye || 0) < 0 ? 'red' : 'green'}>{para(cari.bakiye)}</b>
              </button>)}
              {!filtreliSatisCarileri.length && <p className="market-empty">Aramaya uygun cari bulunamadı.</p>}
            </div>
            {cariKayitAlani('satis')}
            <div className="market-customer-modal-footer"><button className="market-remove" type="button" onClick={() => { setSatisCariPenceresi(false); setCariFormYeri(''); }}>Kapat</button></div>
          </div>
        </div>}
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
        {gramajBekleyenUrun && <div className="market-price-modal" role="dialog" aria-modal="true" aria-label="Terazili ürün miktarını gir">
          <form className="market-scale-sale-modal" onSubmit={gramajliUrunuSepeteEkle}>
            <span>TERAZİLİ ÜRÜN</span>
            <h2>{gramajBekleyenUrun.urun_adi}</h2>
            <div className="market-scale-sale-modes">
              <button type="button" className={satisTeraziGirisTuru === 'gram' ? 'active' : ''} onClick={() => { setSatisTeraziGirisTuru('gram'); setSatisGramaji(''); }}>Gramaj → TL</button>
              <button type="button" className={satisTeraziGirisTuru === 'tutar' ? 'active' : ''} onClick={() => { setSatisTeraziGirisTuru('tutar'); setSatisGramaji(''); }}>TL → Gramaj</button>
            </div>
            <label>{satisTeraziGirisTuru === 'tutar' ? 'Satış tutarı (TL)' : 'Gramaj (gram)'}<input type="number" min={satisTeraziGirisTuru === 'tutar' ? '0.01' : '1'} step={satisTeraziGirisTuru === 'tutar' ? '0.01' : '1'} value={satisGramaji} onChange={event => setSatisGramaji(event.target.value)} placeholder={satisTeraziGirisTuru === 'tutar' ? 'Örn. 100' : 'Örn. 1450'} autoFocus /></label>
            <div className="market-scale-keypad">
              {[7, 8, 9].map(rakam => <button type="button" key={rakam} onClick={() => satisTeraziTusunaBas(rakam)}>{rakam}</button>)}<button type="button" className="control" onClick={() => satisTeraziTusunaBas('sil')}>⌫</button>
              {[4, 5, 6].map(rakam => <button type="button" key={rakam} onClick={() => satisTeraziTusunaBas(rakam)}>{rakam}</button>)}<button type="button" className="control" onClick={() => satisTeraziTusunaBas('C')}>C</button>
              {[1, 2, 3, 0].map(rakam => <button type="button" key={rakam} onClick={() => satisTeraziTusunaBas(rakam)}>{rakam}</button>)}
              <button type="button" className="wide" onClick={() => satisTeraziTusunaBas('00')}>00</button><button type="button" className="wide" onClick={() => satisTeraziTusunaBas('.')}>Virgül</button>
            </div>
            <div className="market-weight-preview">
              <span>Kilogram fiyatı<strong>{para(gramajBekleyenUrun.satis_fiyati)}</strong></span>
              {satisTeraziGirisTuru === 'tutar'
                ? <span>Hesaplanan gramaj<strong>{miktarYaz(Number(gramajBekleyenUrun.satis_fiyati || 0) > 0 ? Number(satisGramaji || 0) / Number(gramajBekleyenUrun.satis_fiyati) : 0)} kg</strong></span>
                : <span>Hesaplanan tutar<strong>{para(Number(satisGramaji || 0) / 1000 * Number(gramajBekleyenUrun.satis_fiyati || 0))}</strong></span>}
            </div>
            <div><button className="market-remove" type="button" onClick={() => { setGramajBekleyenUrun(null); setSatisGramaji(''); }}>Vazgeç</button><button className="market-primary" type="submit">{satisTeraziGirisTuru === 'tutar' ? 'Gramajı Hesapla ve Ekle' : 'Tutarı Hesapla ve Ekle'}</button></div>
          </form>
        </div>}
        {urunIndirimFormu && <div className="market-price-modal" role="dialog" aria-modal="true" aria-label="Ürün fiyatını değiştir">
          <form onSubmit={event => { event.preventDefault(); urunFiyatiniUygula(); }}>
            <span>ÜRÜN FİYATI</span>
            <h2>{urunIndirimFormu.urunAdi}</h2>
            <p>Bu fişte kullanılacak birim fiyatı yazın veya ürünü ikram olarak işaretleyin.</p>
            <label>Yeni fiyat (TL)<input type="number" min="0" step="0.01" value={urunIndirimFormu.fiyat} onChange={event => setUrunIndirimFormu({ ...urunIndirimFormu, fiyat: event.target.value })} autoFocus /></label>
            <small>Liste fiyatı: {para(urunIndirimFormu.listeFiyati)}</small>
            <div className="market-price-modal-actions"><button className="market-primary market-apply-price" type="button" onClick={() => urunFiyatiniUygula(urunIndirimFormu.fiyat)}>Yazdığım Fiyatı Uygula</button><button className="market-complimentary-button" type="button" onClick={() => urunFiyatiniUygula(0)}>🎁 İkram</button><button type="button" onClick={() => urunIndiriminiKaldir(urunIndirimFormu.satirId)}>Liste Fiyatı</button><button className="market-remove" type="button" onClick={() => setUrunIndirimFormu(null)}>Vazgeç</button></div>
          </form>
        </div>}
        {genelIndirimPenceresi && <div className="market-price-modal" role="dialog" aria-modal="true" aria-label="Sepet toplam fiyat ayarı">
          <form className="market-total-adjust-modal" onSubmit={event => {
            event.preventDefault();
            const yetkili = genelIndirim.yon === 'arttir'
              ? yetkiyiDogrula('fiyat_degistir', 'Toplam tutarı artırmak için fiyat değiştirme yetkisi gerekir.')
              : yetkiyiDogrula('indirim_yap', 'Toplam tutarı azaltmak için indirim yetkisi gerekir.');
            if (yetkili) setGenelIndirimPenceresi(false);
          }}>
            <span>TOPLAM FİYAT AYARI</span>
            <h2>Tutarı azalt veya artır</h2>
            <div className="market-adjust-direction">
              <button type="button" className={genelIndirim.yon !== 'arttir' ? 'active decrease' : ''} onClick={() => setGenelIndirim({ ...genelIndirim, yon: 'azalt' })}>− Azalt</button>
              <button type="button" className={genelIndirim.yon === 'arttir' ? 'active increase' : ''} onClick={() => setGenelIndirim({ ...genelIndirim, yon: 'arttir' })}>＋ Artır</button>
            </div>
            <div className="market-standard-percentages">
              {[5, 10, 15, 20].map(yuzde => <button type="button" key={yuzde} className={genelIndirim.tur === 'yuzde' && Number(genelIndirim.deger) === yuzde ? 'active' : ''} onClick={() => setGenelIndirim({ ...genelIndirim, tur: 'yuzde', deger: String(yuzde) })}>%{yuzde}</button>)}
            </div>
            <div className="market-modal-discount-fields"><label>Tür<select value={genelIndirim.tur} onChange={event => setGenelIndirim({ ...genelIndirim, tur: event.target.value })}><option value="yuzde">Yüzde (%)</option><option value="tutar">Toplam TL</option></select></label><label>Değer<input type="number" min="0" max={genelIndirim.tur === 'yuzde' ? 100 : genelIndirim.yon === 'arttir' ? undefined : sepetToplamlari.araToplam} step="0.01" value={genelIndirim.deger} onChange={event => setGenelIndirim({ ...genelIndirim, deger: event.target.value })} autoFocus /></label></div>
            <div className={genelIndirim.yon === 'arttir' ? 'market-adjust-preview increase' : 'market-adjust-preview decrease'}><span>{genelIndirim.yon === 'arttir' ? 'Artış' : 'İndirim'}<strong>{genelIndirim.yon === 'arttir' ? '+' : '−'}{para(sepetToplamlari.genelFiyatAyarTutari)}</strong></span><span>Ödenecek<strong>{para(sepetToplamlari.netToplam)}</strong></span></div>
            <div><button className="market-remove" type="button" onClick={() => { setGenelIndirim({ yon: 'azalt', tur: 'yuzde', deger: '' }); setGenelIndirimPenceresi(false); }}>Ayarı Kaldır</button><button className="market-primary" type="submit">Uygula</button></div>
          </form>
        </div>}
        {bekleyenSepetPenceresi === 'kaydet' && <div className="market-price-modal" role="dialog" aria-modal="true" aria-label="Sepeti beklemeye al">
          <form onSubmit={sepetiBeklemeyeAl}>
            <span>BEKLEYEN SEPET</span>
            <h2>Sepeti beklemeye al</h2>
            <p>Müşteri geri geldiğinde bu sepeti kaldığı yerden açabilirsiniz.</p>
            <label>Sepet adı<input value={bekleyenSepetAdi} onChange={event => setBekleyenSepetAdi(event.target.value)} placeholder={`Sepet ${bekleyenSepetler.length + 1}`} autoFocus /></label>
            <small>{sepet.length} kalem · {para(sepetToplamlari.netToplam)}</small>
            <div><button className="market-remove" type="button" onClick={() => setBekleyenSepetPenceresi('')}>Vazgeç</button><button className="market-primary" type="submit" disabled={bekleyenSepetIsleniyor}>{bekleyenSepetIsleniyor ? 'Kaydediliyor…' : 'Beklemeye Al'}</button></div>
          </form>
        </div>}
        {bekleyenSepetPenceresi === 'liste' && <div className="market-price-modal" role="dialog" aria-modal="true" aria-label="Bekleyen sepetler">
          <div className="market-park-modal">
            <span>BEKLEYEN SEPETLER</span>
            <h2>{bekleyenSepetler.length} kayıt</h2>
            <div className="market-park-list">{bekleyenSepetler.map(kayit => {
              const kalemler = Array.isArray(kayit.kalemler) ? kayit.kalemler : [];
              const toplam = kalemler.reduce((tutar, kalem) => tutar + Number(kalem.adet || 0) * Number(kalem.satis_fiyati || 0), 0);
              return <div key={kayit.id}><span><strong>{kayit.sepet_adi}</strong><small>{kayit.cari_adi || 'Cari yok'} · {kalemler.length} kalem · {new Date(kayit.updated_at).toLocaleString('tr-TR')}</small></span><b>{para(toplam)}</b><button type="button" disabled={bekleyenSepetIsleniyor} onClick={() => bekleyenSepetiAc(kayit)}>Aç</button><button className="market-remove" type="button" disabled={bekleyenSepetIsleniyor} onClick={() => bekleyenSepetiSil(kayit)}>Sil</button></div>;
            })}{!bekleyenSepetler.length && <p className="market-empty">Bekleyen sepet bulunmuyor.</p>}</div>
            <div className="market-park-modal-footer"><button className="market-remove" type="button" onClick={() => setBekleyenSepetPenceresi('')}>Kapat</button></div>
          </div>
        </div>}
      </div>}

      {!yukleniyor && sekme === 'gruplar' && <div className="market-grid-form">
        <form className="market-card market-form" onSubmit={grupKaydet}>
          <div className="market-heading"><div><span>GRUP KARTI</span><h2>{grupFormu.id ? 'Grubu düzenle' : 'Yeni grup aç'}</h2></div>{grupFormu.id && <button className="market-remove" type="button" onClick={() => setGrupFormu(bosGrup)}>Vazgeç</button>}</div>
          <label>Grup adı<input value={grupFormu.grupAdi} onChange={event => setGrupFormu({ ...grupFormu, grupAdi: event.target.value })} placeholder="Örn. İçecekler" autoFocus /></label>
          <div className="market-row"><label>Varsayılan KDV<select value={grupFormu.kdvOrani} onChange={event => setGrupFormu({ ...grupFormu, kdvOrani: event.target.value })}><option value="0">%0</option><option value="1">%1</option><option value="10">%10</option><option value="20">%20</option></select></label><label>Sıra<input type="number" value={grupFormu.sira} onChange={event => setGrupFormu({ ...grupFormu, sira: event.target.value })} /></label></div>
          <div className="market-group-color-fields">
            <label>Grup düğmesi rengi<span><input type="color" value={/^#[0-9a-f]{6}$/i.test(grupFormu.grupRengi) ? grupFormu.grupRengi : '#c2410c'} onChange={event => setGrupFormu({ ...grupFormu, grupRengi: event.target.value })} /><input value={grupFormu.grupRengi} onChange={event => setGrupFormu({ ...grupFormu, grupRengi: event.target.value })} maxLength="7" /></span></label>
            <label>Ürün kutusu rengi<span><input type="color" value={/^#[0-9a-f]{6}$/i.test(grupFormu.urunRengi) ? grupFormu.urunRengi : '#0f172a'} onChange={event => setGrupFormu({ ...grupFormu, urunRengi: event.target.value })} /><input value={grupFormu.urunRengi} onChange={event => setGrupFormu({ ...grupFormu, urunRengi: event.target.value })} maxLength="7" /></span></label>
            <div className="market-group-color-preview"><span style={{ backgroundColor: grupFormu.grupRengi, color: kontrastYaziRengi(grupFormu.grupRengi) }}>Grup</span><strong style={{ backgroundColor: grupFormu.urunRengi, color: kontrastYaziRengi(grupFormu.urunRengi) }}>Örnek Ürün<br /><small>{para(25)}</small></strong></div>
          </div>
          <label className="market-check"><input type="checkbox" checked={grupFormu.satisEkranindaGoster} onChange={event => setGrupFormu({ ...grupFormu, satisEkranindaGoster: event.target.checked })} /> Satış ekranında kısayol olarak göster</label>
          <button className="market-primary" type="submit">{grupFormu.id ? 'Grubu Güncelle' : 'Grubu Aç'}</button>
        </form>
        <div className="market-card">
          <div className="market-heading"><div><span>GRUPLAR</span><h2>{gruplar.length} grup</h2></div></div>
          <div className="market-group-list">{gruplar.map(grup => <div key={grup.id}>
            <i className="market-group-color-chip" style={{ background: `linear-gradient(90deg, ${grup.grup_rengi || '#c2410c'} 0 50%, ${grup.urun_rengi || '#0f172a'} 50%)` }} />
            <span><strong>{grup.grup_adi}</strong><small>{urunler.filter(urun => String(urun.grup_id) === String(grup.id)).length} ürün · KDV %{Number(grup.kdv_orani ?? 20)} · Sıra {grup.sira}</small></span>
            <div className="market-inline-actions">
              <button type="button" className={grup.satis_ekraninda_goster ? 'active' : ''} onClick={() => grupGorunurlugunuDegistir(grup)}>{grup.satis_ekraninda_goster ? '👁 Görünüyor' : '⊘ Gizli'}</button>
              <button type="button" aria-label={`${grup.grup_adi} grubunu düzenle`} onClick={() => setGrupFormu({ id: grup.id, grupAdi: grup.grup_adi, kdvOrani: Number(grup.kdv_orani ?? 20), satisEkranindaGoster: grup.satis_ekraninda_goster, sira: grup.sira, grupRengi: grup.grup_rengi || '#c2410c', urunRengi: grup.urun_rengi || '#0f172a' })}>✎ Düzenle</button>
            </div>
          </div>)}</div>
        </div>
      </div>}

      {!yukleniyor && sekme === 'urunler' && <div className="market-grid-form">
        <form className="market-card market-form market-product-form" onSubmit={urunKaydet}>
          <div className="market-heading market-product-form-heading"><div><span>ÜRÜN KARTI</span><h2>{urunFormu.id ? 'Ürünü düzenle' : 'Yeni barkodlu ürün'}</h2></div><div className="market-product-form-actions">{urunFormu.id && <button className="market-remove" type="button" onClick={() => setUrunFormu(bosUrun)}>Vazgeç</button>}<button className="market-primary" type="submit">{urunFormu.id ? 'Kaydet' : 'Ürünü Kaydet'}</button></div></div>
          <div className="market-row"><label>Barkod<input autoFocus value={urunFormu.barkod} onChange={event => setUrunFormu({ ...urunFormu, barkod: event.target.value })} placeholder="869…" /></label><label>Ürün adı<input value={urunFormu.urunAdi} onChange={event => setUrunFormu({ ...urunFormu, urunAdi: event.target.value })} /></label></div>
          <div className="market-row"><label>Stok / terazi ürün kodu<input value={urunFormu.stokKodu} onChange={event => setUrunFormu({ ...urunFormu, stokKodu: event.target.value })} placeholder="5 haneli kod" /></label><label>Ürün grubu *<select required value={urunFormu.grupId} onChange={event => {
              const grup = gruplar.find(item => String(item.id) === String(event.target.value));
              setUrunFormu({
                ...urunFormu,
                grupId: event.target.value,
                kategori: grup?.grup_adi || '',
                kdvOrani: Number(grup?.kdv_orani ?? 20),
              });
            }}><option value="">Grup seçin</option>{gruplar.map(grup => <option key={grup.id} value={grup.id}>{grup.grup_adi}</option>)}</select></label></div>
          {!gruplar.length && <button className="market-link-button" type="button" onClick={() => setSekme('gruplar')}>Önce grup açın</button>}
          <div className="market-row"><label>Marka<input value={urunFormu.marka} onChange={event => setUrunFormu({ ...urunFormu, marka: event.target.value })} /></label><label>Satış birimi<select value={urunFormu.birim} onChange={event => setUrunFormu({ ...urunFormu, birim: event.target.value })}><option value="Adet">Adet</option><option value="Kg">Kg (terazili)</option><option value="Litre">Litre</option><option value="Paket">Paket</option><option value="Koli">Koli</option></select></label></div>
          <div className="market-row"><label>Alış fiyatı<input type="number" min="0" step="0.01" value={urunFormu.alisFiyati} onChange={event => setUrunFormu({ ...urunFormu, alisFiyati: event.target.value })} /></label><label>Satış fiyatı<input type="number" min="0" step="0.01" value={urunFormu.satisFiyati} onChange={event => setUrunFormu({ ...urunFormu, satisFiyati: event.target.value })} /></label></div>
          <div className="market-row"><label>Stok<input type="number" step="0.001" value={urunFormu.stokMiktari} onChange={event => setUrunFormu({ ...urunFormu, stokMiktari: event.target.value })} /></label><label>Minimum stok<input type="number" step="0.001" value={urunFormu.minimumStok} onChange={event => setUrunFormu({ ...urunFormu, minimumStok: event.target.value })} /></label></div>
          <div className="market-row"><label>KDV<select value={urunFormu.kdvOrani} onChange={event => setUrunFormu({ ...urunFormu, kdvOrani: event.target.value })}><option value="0">%0</option><option value="1">%1</option><option value="10">%10</option><option value="20">%20</option></select></label><label>Raf konumu<input value={urunFormu.rafKonumu} onChange={event => setUrunFormu({ ...urunFormu, rafKonumu: event.target.value })} placeholder="A-03" /></label></div>
          <div className="market-row"><label>Son kullanma tarihi<input type="date" value={urunFormu.sonKullanmaTarihi} onChange={event => setUrunFormu({ ...urunFormu, sonKullanmaTarihi: event.target.value })} /></label><label>Parti / Lot No<input value={urunFormu.lotNo} onChange={event => setUrunFormu({ ...urunFormu, lotNo: event.target.value })} /></label></div>
        </form>
        <div className="market-card">
          <div className="market-product-sales-settings">
            <div><span>SATIŞ AYARI</span><strong>Satış sonrası fiş</strong><small>Bu seçim barkodlu satışların tamamında uygulanır.</small></div>
            <div role="group" aria-label="Satış sonrası fiş davranışı">
              {[
                ['yazdir', 'Yazdır'],
                ['yazdirma', 'Yazdırma'],
                ['sor', 'Sor'],
              ].map(([deger, etiket]) => <button type="button" key={deger} className={fisDavranisi === deger ? 'active' : ''} disabled={deger !== 'yazdirma' && !yetkiVar('fis_yazdir')} title={deger !== 'yazdirma' && !yetkiVar('fis_yazdir') ? 'Fiş yazdırma yetkisi gerekli' : ''} onClick={() => setFisDavranisi(deger)}>{etiket}</button>)}
            </div>
            <a href="/integra-printer-agent-kurulum.zip" download>Yazıcı kurulumu</a>
          </div>
          <div className="market-bulk-import">
            <div><span>TOPLU ÜRÜN AKTARIMI</span><strong>Excel uyumlu CSV</strong><small>Yeni gruplar otomatik açılır; aynı barkodlu ürünler güncellenir.</small></div>
            <div className="market-bulk-actions"><button type="button" onClick={urunSablonunuIndir}>Şablon İndir</button><label>CSV Seç<input type="file" accept=".csv,.txt,text/csv" onChange={topluUrunDosyasiniOku} /></label></div>
            {topluAktarim.dosyaAdi && <div className="market-bulk-preview">
              <span><strong>{topluAktarim.dosyaAdi}</strong><small>{topluAktarim.satirlar.length} geçerli ürün · {topluAktarim.hatalar.length} hata</small></span>
              <button className="market-primary" type="button" disabled={!topluAktarim.satirlar.length || topluAktariliyor} onClick={topluUrunleriAktar}>{topluAktariliyor ? 'Aktarılıyor…' : 'Ürünleri Aktar'}</button>
              {topluAktarim.hatalar.length > 0 && <details><summary>Hataları göster</summary>{topluAktarim.hatalar.slice(0, 20).map(hataMetni => <small key={hataMetni}>{hataMetni}</small>)}</details>}
            </div>}
          </div>
          <details className="market-scale-details">
            <summary>⚖️ Terazi barkodu ayarları</summary>
            <div className="market-scale-settings">
              <div><strong>EAN-13 terazili ürün</strong><small>Önek + 5 haneli ürün kodu + 5 haneli değer</small></div>
              <label className="market-check"><input type="checkbox" checked={teraziAyarlari.aktif} onChange={event => setTeraziAyarlari({ ...teraziAyarlari, aktif: event.target.checked })} /> Terazi barkodlarını satışta tanı</label>
              {teraziAyarlari.aktif && <div className="market-row">
                <label>Önekler<input value={teraziAyarlari.onEk} onChange={event => setTeraziAyarlari({ ...teraziAyarlari, onEk: event.target.value })} placeholder="20,21" /></label>
                <label>Değer türü<select value={teraziAyarlari.degerTuru} onChange={event => setTeraziAyarlari({ ...teraziAyarlari, degerTuru: event.target.value })}><option value="agirlik">Ağırlık / miktar</option><option value="tutar">Toplam tutar</option></select></label>
                <label>Bölen<input type="number" min="1" value={teraziAyarlari.bolen} onChange={event => setTeraziAyarlari({ ...teraziAyarlari, bolen: Math.max(Number(event.target.value || 1), 1) })} /></label>
              </div>}
            </div>
          </details>
          <div className="market-toolbar"><div><span>ÜRÜN LİSTESİ</span><h2>{filtreliUrunler.length} ürün</h2><small>{kritikUrunler.length} kritik / SKT yakın</small></div><label className="market-compact-check"><input type="checkbox" checked={yalnizKritik} onChange={event => setYalnizKritik(event.target.checked)} /> Yalnızca kritikler</label><input value={arama} onChange={event => setArama(event.target.value)} placeholder="Barkod, ürün veya grup ara" /></div>
          <div className="market-table"><table><thead><tr><th>Barkod / Ürün</th><th>Grup</th><th>Stok</th><th>Alış</th><th>Satış</th><th>Kâr</th><th></th></tr></thead><tbody>
            {filtreliUrunler.map(urun => {
              const kar = Number(urun.satis_fiyati) - Number(urun.alis_fiyati);
              const acik = String(hizliDuzenleme?.id) === String(urun.id);
              return <Fragment key={urun.id}>
                <tr><td><strong>{urun.urun_adi}</strong><small>{urun.barkod}{urun.son_kullanma_tarihi ? ` · SKT ${tarihYaz(urun.son_kullanma_tarihi)}` : ''}{urun.lot_no ? ` · Lot ${urun.lot_no}` : ''}</small></td><td>{urun.kategori}</td><td className={kritikUrunMu(urun) ? 'red' : ''}>{urun.stok_miktari} {urun.birim}</td><td>{para(urun.alis_fiyati)}</td><td><strong>{para(urun.satis_fiyati)}</strong></td><td className={kar < 0 ? 'red' : 'green'}>{para(kar)}</td><td><div className="market-inline-actions"><button type="button" title="Stok ve fiyatı düzenle" aria-label={`${urun.urun_adi} stok ve fiyatını düzenle`} onClick={() => acik ? setHizliDuzenleme(null) : hizliDuzenlemeyiAc(urun)}>✎</button><button type="button" onClick={() => urunuDuzenle(urun)}>Detay</button><button className="market-product-delete" type="button" disabled={String(silinenUrunId) === String(urun.id)} onClick={() => urunuSil(urun)}>{String(silinenUrunId) === String(urun.id) ? 'Siliniyor…' : 'Sil'}</button></div></td></tr>
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
              <div className="market-invoice-actions">
                <button className="market-primary" type="button" onClick={() => faturayiDuzenle(kayit)}>✎ Faturayı Düzenle</button>
                <button className="market-danger-button" type="button" disabled={silinenFaturaId === String(kayit.id)} onClick={() => faturayiSil(kayit)}>
                  {silinenFaturaId === String(kayit.id) ? 'Siliniyor…' : 'Faturayı Sil'}
                </button>
              </div>
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

      {!yukleniyor && sekme === 'kasa' && <div className="market-stack">
        {!acikVardiya ? <form className="market-card market-cash-open" onSubmit={kasaVardiyasiAc}>
          <div className="market-heading"><div><span>KASA AÇILIŞI</span><h2>Yeni vardiya aç</h2></div></div>
          <div className="market-row"><label>Açılış nakdi<input type="number" min="0" step="0.01" value={kasaAcilis.tutar} onChange={event => setKasaAcilis({ ...kasaAcilis, tutar: event.target.value })} /></label><label>Not<input value={kasaAcilis.notMetni} onChange={event => setKasaAcilis({ ...kasaAcilis, notMetni: event.target.value })} placeholder="İsteğe bağlı" /></label></div>
          <button className="market-primary" type="submit">Vardiyayı Aç</button>
        </form> : <>
          <div className="market-card">
            <div className="market-heading"><div><span>AÇIK VARDİYA</span><h2>{new Date(acikVardiya.acilis_tarihi).toLocaleString('tr-TR')}</h2></div><strong>{para(kasaOzeti.beklenen)}</strong></div>
            <div className="market-report-stats">
              <article><span>Açılış</span><strong>{para(acikVardiya.acilis_tutari)}</strong></article>
              <article><span>Nakit Satış</span><strong>{para(kasaOzeti.nakitSatis)}</strong></article>
              <article><span>Nakit İade</span><strong>{para(kasaOzeti.nakitIade)}</strong></article>
              <article><span>Nakit Giriş</span><strong>{para(kasaOzeti.giris)}</strong></article>
              <article><span>Nakit Çıkış</span><strong>{para(kasaOzeti.cikis)}</strong></article>
              <article><span>Beklenen Kasa</span><strong>{para(kasaOzeti.beklenen)}</strong></article>
            </div>
          </div>
          <div className="market-grid-two">
            <form className="market-card market-form" onSubmit={kasaHareketiniKaydet}>
              <div className="market-heading"><div><span>NAKİT HAREKETİ</span><h2>Giriş / çıkış kaydet</h2></div></div>
              <label>İşlem<select value={kasaHareketi.hareketTipi} onChange={event => setKasaHareketi({ ...kasaHareketi, hareketTipi: event.target.value })}><option value="Giriş">Nakit Giriş</option><option value="Çıkış">Nakit Çıkış</option></select></label>
              <label>Tutar<input required type="number" min="0.01" step="0.01" value={kasaHareketi.tutar} onChange={event => setKasaHareketi({ ...kasaHareketi, tutar: event.target.value })} /></label>
              <label>Açıklama<input value={kasaHareketi.aciklama} onChange={event => setKasaHareketi({ ...kasaHareketi, aciklama: event.target.value })} /></label>
              <button className="market-primary" type="submit">Hareketi Kaydet</button>
            </form>
            <form className="market-card market-form" onSubmit={kasaVardiyasiniKapat}>
              <div className="market-heading"><div><span>GÜN SONU KASA</span><h2>Vardiyayı kapat</h2></div></div>
              <label>Sayılan nakit<input required type="number" min="0" step="0.01" value={kasaKapanis.sayilan} onChange={event => setKasaKapanis({ ...kasaKapanis, sayilan: event.target.value })} /></label>
              <div className="market-cash-difference"><span>Beklenen {para(kasaOzeti.beklenen)}</span><strong className={Number(kasaKapanis.sayilan || 0) - kasaOzeti.beklenen < 0 ? 'red' : 'green'}>Fark {para(Number(kasaKapanis.sayilan || 0) - kasaOzeti.beklenen)}</strong></div>
              <label>Kapanış notu<input value={kasaKapanis.notMetni} onChange={event => setKasaKapanis({ ...kasaKapanis, notMetni: event.target.value })} /></label>
              <button className="market-danger-button" type="submit">Vardiyayı Kapat</button>
            </form>
          </div>
        </>}
        <div className="market-card">
          <div className="market-heading"><div><span>VARDİYA GEÇMİŞİ</span><h2>Son kasa kapanışları</h2></div></div>
          <div className="market-table"><table><thead><tr><th>Açılış</th><th>Kapanış</th><th>Durum</th><th>Beklenen</th><th>Sayılan</th><th>Fark</th></tr></thead><tbody>{vardiyalar.map(vardiya => <tr key={vardiya.id}><td>{new Date(vardiya.acilis_tarihi).toLocaleString('tr-TR')}</td><td>{vardiya.kapanis_tarihi ? new Date(vardiya.kapanis_tarihi).toLocaleString('tr-TR') : '-'}</td><td>{vardiya.durum}</td><td>{para(vardiya.beklenen_kapanis)}</td><td>{para(vardiya.sayilan_kapanis)}</td><td className={Number(vardiya.fark_tutari || 0) < 0 ? 'red' : 'green'}>{para(vardiya.fark_tutari)}</td></tr>)}</tbody></table></div>
        </div>
      </div>}

      {!yukleniyor && sekme === 'sayim' && <div className="market-grid-two">
        <div className="market-card"><div className="market-heading"><div><span>BARKOD / ÜRÜN ARAMA</span><h2>Stok sayımı</h2></div><strong>{Object.keys(sayim).length} kalem</strong></div>
          <form className="market-scan simple market-count-search" onSubmit={sayimaEkle}><label>Ürün adı veya barkod<input ref={barkodRef} value={sayimBarkodu} onChange={event => setSayimBarkodu(event.target.value)} placeholder="Ekmek yazın veya barkod okutun" /></label><button className="market-primary" type="submit">Bul / Ekle</button></form>
          {!!sayimAramaMetni && <div className="market-count-search-results">
            {sayimAramaSonuclari.map(urun => {
              const secili = Object.prototype.hasOwnProperty.call(sayim, urun.id);
              return <button className={secili ? 'selected' : ''} type="button" key={urun.id} onClick={() => sayimaUrunSec(urun)}>
                <span><strong>{urun.urun_adi}</strong><small>{urun.barkod || 'Barkodsuz ürün'} · Sistem: {miktarYaz(urun.stok_miktari)}</small></span>
                <b>{secili ? 'Sayımda' : 'Seç'}</b>
              </button>;
            })}
            {!sayimAramaSonuclari.length && <p className="market-empty">Bu ad veya barkodla ürün bulunamadı.</p>}
          </div>}
          <div className="market-list market-count-list">{urunler.filter(urun => Object.prototype.hasOwnProperty.call(sayim, urun.id)).map(urun => <div key={urun.id}><span><strong>{urun.urun_adi}</strong><small>{urun.barkod || 'Barkodsuz ürün'} · Sistem: {miktarYaz(urun.stok_miktari)}</small></span><label className="market-count">Sayılan<input type="number" min="0" step="0.001" value={sayim[urun.id]} onChange={event => setSayim(prev => ({ ...prev, [urun.id]: event.target.value }))} /></label><button className="market-count-remove" type="button" onClick={() => sayimdanUrunCikar(urun)} aria-label={`${urun.urun_adi} ürününü sayımdan çıkar`}>× İptal</button></div>)}</div>
          <button className="market-primary market-full" type="button" onClick={sayimiTamamla}>Sayımı Tamamla ve Farkları İşle</button>
        </div>
        <div className="market-card"><h2>Son sayımlar</h2>{!sayimlar.length ? <p className="market-empty">Henüz tamamlanmış sayım yok.</p> : <div className="market-list">{sayimlar.map(kayit => <div key={kayit.id}><span>{kayit.sayim_adi}<small>{kayit.toplam_kalem} ürün</small></span><strong>{kayit.farkli_kalem} fark</strong></div>)}</div>}</div>
      </div>}

      {!yukleniyor && sekme === 'hareketler' && <div className="market-grid-two">
        <div className="market-card">
          <div className="market-heading"><div><span>STOK HAREKETLERİ</span><h2>Ürün giriş ve çıkışları</h2></div><strong>{stokHareketleri.length} kayıt</strong></div>
          {!stokHareketleri.length ? <p className="market-empty">Operasyon SQL’i çalıştırıldıktan sonraki stok hareketleri burada görünecek.</p> : <div className="market-movement-list">{stokHareketleri.map(hareket => {
            const urun = urunler.find(item => String(item.id) === String(hareket.urun_id));
            return <div key={hareket.id}><span><strong>{urun?.urun_adi || 'Ürün'}</strong><small>{hareket.hareket_tipi} · {new Date(hareket.created_at).toLocaleString('tr-TR')} · {hareket.aciklama || ''}</small></span><b className={Number(hareket.miktar) < 0 ? 'red' : 'green'}>{Number(hareket.miktar) > 0 ? '+' : ''}{hareket.miktar}<small>{hareket.onceki_stok} → {hareket.sonraki_stok}</small></b></div>;
          })}</div>}
        </div>
        <div className="market-card">
          <div className="market-heading"><div><span>FİYAT GEÇMİŞİ</span><h2>Alış ve satış değişiklikleri</h2></div><strong>{fiyatGecmisi.length} kayıt</strong></div>
          {!fiyatGecmisi.length ? <p className="market-empty">Fiyat değişikliği kaydı bulunmuyor.</p> : <div className="market-movement-list">{fiyatGecmisi.map(hareket => {
            const urun = urunler.find(item => String(item.id) === String(hareket.urun_id));
            return <div key={hareket.id}><span><strong>{urun?.urun_adi || 'Ürün'}</strong><small>{new Date(hareket.created_at).toLocaleString('tr-TR')}</small></span><b><small>Alış: {para(hareket.eski_alis_fiyati)} → {para(hareket.yeni_alis_fiyati)}</small><small>Satış: {para(hareket.eski_satis_fiyati)} → {para(hareket.yeni_satis_fiyati)}</small></b></div>;
          })}</div>}
        </div>
      </div>}

      {!yukleniyor && sekme === 'etiket' && <div className="market-card">
        <div className="market-heading"><div><span>RAF VE BARKOD</span><h2>Etiket basım kuyruğu</h2></div><div className="market-label-actions"><button className={etiketKuyrugu.length ? 'market-queue-button active' : 'market-queue-button'} type="button" onClick={fiyatDegisenleriSec}>↻ Fiyatı Değişenler ({etiketKuyrugu.length})</button><label>Etiket ölçüsü<select value={etiketBoyutu} onChange={event => setEtiketBoyutu(event.target.value)}><option value="58x40">58 × 40 mm</option><option value="50x30">50 × 30 mm</option><option value="40x30">40 × 30 mm</option></select></label><button className="market-primary" type="button" onClick={etiketleriYazdir}>🖨️ Seçilenleri Yazdır</button></div></div>
        <input className="market-label-search" value={etiketArama} onChange={event => setEtiketArama(event.target.value)} placeholder="Ürün adı veya barkoda göre ara" />
        <div className="market-label-columns"><span>Seç</span><span>Ürün / Barkod</span><span>Adet</span><span>Alış</span><span>Satış</span><span></span></div>
        <div className="market-label-list">{filtreliEtiketUrunleri.map(urun => {
          const acik = String(hizliDuzenleme?.id) === String(urun.id);
          return <div className="market-label-row" key={urun.id}>
            <input aria-label={`${urun.urun_adi} etiketini seç`} type="checkbox" checked={etiketUrunleri.includes(urun.id)} onChange={event => setEtiketUrunleri(prev => event.target.checked ? [...prev, urun.id] : prev.filter(id => id !== urun.id))} />
            <span><strong>{urun.urun_adi}{bekleyenEtiketUrunIdleri.includes(String(urun.id)) && <em className="market-queue-badge">Yeni fiyat</em>}</strong><small>{urun.barkod}</small></span>
            <input className="market-label-count" aria-label={`${urun.urun_adi} etiket adedi`} type="number" min="1" max="100" value={etiketAdetleri[urun.id] || 1} onChange={event => setEtiketAdetleri(prev => ({ ...prev, [urun.id]: Math.max(Number(event.target.value || 1), 1) }))} />
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
        <div className={`market-print-labels size-${etiketBoyutu}`} aria-hidden="true">{urunler.filter(urun => etiketUrunleri.includes(urun.id)).flatMap(urun => Array.from({ length: Number(etiketAdetleri[urun.id] || 1) }, (_, index) => <article key={`${urun.id}-${index}`}><div>{restaurantName}</div><strong>{urun.urun_adi}</strong><b>{para(urun.satis_fiyati)}</b><BarkodSvg value={urun.barkod} /><small>{urun.barkod}</small></article>))}</div>
      </div>}

      {!yukleniyor && sekme === 'raporlar' && <div className="market-stack">
        <div className="market-card">
          <div className="market-report-toolbar">
            <div><span>MARKET RAPORLARI</span><h2>Rapor merkezi</h2></div>
            {raporSekmesi === 'gun_sonu'
              ? <label>Gün seçin<input type="date" value={raporTarihi} onChange={event => setRaporTarihi(event.target.value)} /></label>
              : ['kar', 'fisler', 'marka', 'grup', 'alis'].includes(raporSekmesi) && <label>Dönem<select value={raporAraligi} onChange={event => setRaporAraligi(event.target.value)}><option value="bugun">Bugün</option><option value="7gun">Son 7 gün</option><option value="30gun">Son 30 gün</option><option value="ay">Bu ay</option><option value="tumu">Tüm kayıtlar</option></select></label>}
          </div>
          <div className="market-report-subtabs">
            {[
              ['gun_sonu', 'Gün Sonu'],
              ['sayim', 'Sayım Raporları'],
              ['kar', 'Kâr Raporları'],
              ['marka', 'Marka Raporu'],
              ['grup', 'Grup Raporu'],
              ['alis', 'Alış Raporu'],
              ['stok', 'Eldeki Stok'],
              ['fisler', 'Satış Fişleri'],
            ].map(([key, label]) => <button type="button" key={key} className={raporSekmesi === key ? 'active' : ''} onClick={() => setRaporSekmesi(key)}>{label}</button>)}
          </div>
          {raporSekmesi !== 'sayim' && <div className="market-report-filters">
            <label>Grup<select value={raporGrupId} onChange={event => setRaporGrupId(event.target.value)}><option value="">Tüm gruplar</option>{gruplar.map(grup => <option key={grup.id} value={grup.id}>{grup.grup_adi}</option>)}</select></label>
            <label>Ürün / Barkod<input value={raporUrunArama} onChange={event => setRaporUrunArama(event.target.value)} placeholder="Tümü" /></label>
            {raporSekmesi !== 'stok' && <label>Cari<select value={raporCariId} onChange={event => setRaporCariId(event.target.value)}><option value="">Tüm cariler</option>{cariler.map(cari => <option key={cari.id} value={cari.id}>{cari.ad}</option>)}</select></label>}
            {!['stok', 'marka', 'grup', 'alis'].includes(raporSekmesi) && <label>Ödeme<select value={raporOdeme} onChange={event => setRaporOdeme(event.target.value)}><option value="">Tüm ödemeler</option><option value="Nakit">Nakit</option><option value="Kredi Kartı">Kredi Kartı</option><option value="Cari / Veresiye">Cari / Veresiye</option></select></label>}
          </div>}
          <div className="market-report-export"><button type="button" onClick={raporuCsvIndir}>Excel / CSV İndir</button><button type="button" onClick={raporuPdfIndir}>PDF İndir</button></div>
        </div>

        {raporSekmesi === 'gun_sonu' && <>
          <div className="market-card">
            <div className="market-heading"><div><span>GÜN SONU</span><h2>{tarihYaz(raporTarihi)} özeti</h2></div></div>
            <div className="market-report-stats">
              <article><span>Toplam Ciro</span><strong>{para(rapor.ciro)}</strong></article>
              <article><span>Satış Sayısı</span><strong>{rapor.satisAdedi}</strong></article>
              <article><span>Satılan Ürün</span><strong>{rapor.urunAdedi}</strong></article>
              <article><span>Ortalama Sepet</span><strong>{para(rapor.ortalamaSepet)}</strong></article>
              <article><span>Toplam İndirim</span><strong>{para(rapor.indirimToplami)}</strong></article>
              <article><span>İade Toplamı</span><strong>{para(rapor.iadeToplami)}</strong></article>
              <article><span>İptal Edilen Fiş</span><strong>{rapor.iptalAdedi}</strong></article>
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
              {!rapor.urunler.length ? <p className="market-empty">Seçilen günde ürün satışı bulunmuyor.</p> : <div className="market-table"><table><thead><tr><th>Ürün</th><th>Adet</th><th>Ciro</th></tr></thead><tbody>{rapor.urunler.slice(0, 25).map(urun => <tr key={urun.urunAdi}><td><strong>{urun.urunAdi}</strong></td><td>{miktarYaz(urun.adet)}</td><td>{para(urun.ciro)}</td></tr>)}</tbody></table></div>}
            </div>
            <div className="market-card">
              <div className="market-heading"><div><span>SAATLİK YOĞUNLUK</span><h2>Satış saatleri</h2></div></div>
              {!rapor.saatler.length ? <p className="market-empty">Seçilen günde saatlik veri bulunmuyor.</p> : <div className="market-hour-list">{rapor.saatler.map(saat => <div key={saat.saat}><span>{saat.saat}</span><div><i style={{ width: `${Math.max((saat.ciro / Math.max(...rapor.saatler.map(item => item.ciro), 1)) * 100, 3)}%` }} /></div><strong>{saat.satisAdedi} satış · {para(saat.ciro)}</strong></div>)}</div>}
            </div>
          </div>
        </>}

        {raporSekmesi === 'sayim' && <div className="market-card">
          <div className="market-heading"><div><span>SAYIM RAPORLARI</span><h2>Her sayım ve içerisindeki farklar</h2></div><strong>{sayimFarkGruplari.length} sayım</strong></div>
          {!sayimFarkGruplari.length ? <p className="market-empty">Geçmiş sayımlarda stok farkı bulunmuyor.</p> : <div className="market-count-report-list">{sayimFarkGruplari.map((sayimKaydi, index) => <details key={sayimKaydi.id} open={index === 0}>
            <summary><span><strong>{sayimKaydi.sayimAdi}</strong><small>{new Date(sayimKaydi.tarih).toLocaleString('tr-TR')} · {sayimKaydi.toplamKalem} ürün sayıldı</small></span><b>{sayimKaydi.farklar.length} fark</b></summary>
            <div className="market-table"><table><thead><tr><th>Ürün</th><th>Sistem Stoğu</th><th>Sayılan</th><th>Fark</th></tr></thead><tbody>{sayimKaydi.farklar.map(kayit => <tr key={kayit.id}><td><strong>{kayit.urunAdi}</strong><small>{kayit.barkod || 'Barkodsuz ürün'}</small></td><td>{miktarYaz(kayit.sistemMiktari)}</td><td>{miktarYaz(kayit.sayilanMiktar)}</td><td className={kayit.fark < 0 ? 'red' : 'green'}>{kayit.fark > 0 ? '+' : ''}{miktarYaz(kayit.fark)}</td></tr>)}</tbody></table></div>
          </details>)}</div>}
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
            {!rapor.urunler.length ? <p className="market-empty">Seçilen dönemde satış bulunmuyor.</p> : <div className="market-table"><table><thead><tr><th>Ürün</th><th>Adet</th><th>Ciro</th><th>Maliyet</th><th>Kâr</th></tr></thead><tbody>{rapor.urunler.map(urun => <tr key={urun.urunAdi}><td><strong>{urun.urunAdi}</strong></td><td>{miktarYaz(urun.adet)}</td><td>{para(urun.ciro)}</td><td>{para(urun.maliyet)}</td><td className={urun.kar < 0 ? 'red' : 'green'}>{para(urun.kar)}</td></tr>)}</tbody></table></div>}
            <p className="market-note">Yeni satışlarda maliyet satış anındaki alış fiyatından alınır. Eski satışlarda tarihsel maliyet yoksa güncel alış fiyatı kullanılır.</p>
          </div>
        </>}

        {['marka', 'grup'].includes(raporSekmesi) && <div className="market-card">
          {(() => {
            const kayitlar = raporSekmesi === 'marka' ? ticariRapor.markalar : ticariRapor.gruplar;
            const baslik = raporSekmesi === 'marka' ? 'Marka bazında alış ve satış' : 'Grup bazında alış ve satış';
            const etiket = raporSekmesi === 'marka' ? 'MARKA RAPORU' : 'GRUP RAPORU';
            const satisToplami = kayitlar.reduce((toplam, kayit) => toplam + kayit.satisCiro, 0);
            const alisToplami = kayitlar.reduce((toplam, kayit) => toplam + kayit.alisTutar, 0);
            return <>
              <div className="market-heading"><div><span>{etiket}</span><h2>{baslik}</h2></div><strong>{kayitlar.length} kayıt</strong></div>
              <div className="market-report-stats">
                <article><span>Satış Cirosu</span><strong>{para(satisToplami)}</strong></article>
                <article><span>Alış Tutarı</span><strong>{para(alisToplami)}</strong></article>
                <article><span>Satış - Alış Farkı</span><strong>{para(satisToplami - alisToplami)}</strong></article>
                <article><span>Hareketli {raporSekmesi === 'marka' ? 'Marka' : 'Grup'}</span><strong>{kayitlar.length}</strong></article>
              </div>
              {!kayitlar.length ? <p className="market-empty">Seçilen dönemde alış veya satış hareketi bulunmuyor.</p> : <div className="market-table"><table><thead><tr><th>{raporSekmesi === 'marka' ? 'Marka' : 'Grup'}</th><th>Satılan Miktar</th><th>Satış Cirosu</th><th>Alınan Miktar</th><th>Alış Tutarı</th><th>Satış - Alış Farkı</th></tr></thead><tbody>{kayitlar.map(kayit => <tr key={kayit.ad}><td><strong>{kayit.ad}</strong></td><td>{miktarYaz(kayit.satilanMiktar)}</td><td>{para(kayit.satisCiro)}</td><td>{miktarYaz(kayit.alinanMiktar)}</td><td>{para(kayit.alisTutar)}</td><td className={kayit.fark < 0 ? 'red' : 'green'}>{para(kayit.fark)}</td></tr>)}</tbody></table></div>}
              <p className="market-note">Satış - alış farkı dönem içindeki satış cirosu ile alış faturası tutarının farkıdır; muhasebesel net kâr değildir.</p>
            </>;
          })()}
        </div>}

        {raporSekmesi === 'alis' && <>
          <div className="market-card">
            <div className="market-heading"><div><span>ALIŞ RAPORU</span><h2>Alış faturaları ve ürün girişleri</h2></div><strong>{ticariRapor.faturalar.length} fatura</strong></div>
            <div className="market-report-stats">
              <article><span>Fatura Sayısı</span><strong>{ticariRapor.faturalar.length}</strong></article>
              <article><span>Ürün Kalemi</span><strong>{ticariRapor.alisKalemAdedi}</strong></article>
              <article><span>Alınan Miktar</span><strong>{miktarYaz(ticariRapor.alisMiktari)}</strong></article>
              <article><span>Toplam Alış</span><strong>{para(ticariRapor.alisToplami)}</strong></article>
            </div>
          </div>
          <div className="market-card">
            {!ticariRapor.faturalar.length ? <p className="market-empty">Seçilen dönemde alış faturası bulunmuyor.</p> : <div className="market-table"><table><thead><tr><th>Tarih</th><th>Tedarikçi / Cari</th><th>Fatura No</th><th>Kalem</th><th>Durum</th><th>Toplam</th><th></th></tr></thead><tbody>{ticariRapor.faturalar.map(faturaKaydi => <Fragment key={faturaKaydi.id}>
              <tr><td>{tarihYaz(faturaKaydi.fatura_tarihi)}</td><td><strong>{faturaKaydi.tedarikci_adi || 'Tedarikçi yok'}</strong></td><td>{faturaKaydi.fatura_no || '-'}</td><td>{faturaKaydi.raporKalemleri.length}</td><td>{faturaKaydi.durum || 'Kaydedildi'}</td><td><strong>{para(faturaKaydi.raporToplam)}</strong></td><td><div className="market-inline-actions"><button className="market-receipt-button" type="button" onClick={() => setAcikAlisRaporuId(acikAlisRaporuId === faturaKaydi.id ? '' : faturaKaydi.id)}>{acikAlisRaporuId === faturaKaydi.id ? 'Kapat' : 'İçeriği Aç'}</button><button className="market-product-delete" type="button" disabled={silinenFaturaId === String(faturaKaydi.id)} onClick={() => faturayiSil(faturaKaydi)}>{silinenFaturaId === String(faturaKaydi.id) ? 'Siliniyor…' : 'Sil'}</button></div></td></tr>
              {acikAlisRaporuId === faturaKaydi.id && <tr className="market-receipt-row"><td colSpan="7"><div className="market-report-purchase-items">{faturaKaydi.raporKalemleri.map(kalem => <div key={kalem.id}><span><strong>{kalem.urun_adi}</strong><small>{kalem.barkod}</small></span><span>{kalem.miktar} × {para(kalem.birim_alis_fiyati)}</span><b>{para(kalem.satir_toplami)}</b></div>)}</div></td></tr>}
            </Fragment>)}</tbody></table></div>}
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
          <div className="market-heading"><div><span>İŞLEM GEÇMİŞİ</span><h2>Son satışlar</h2></div><strong>{rapor.satisAdedi} satış · {iadeler.length} iade</strong></div>
          {!rapor.satislar.length ? <p className="market-empty">Seçilen dönemde satış bulunmuyor.</p> : <div className="market-table"><table><thead><tr><th>Tarih / Saat</th><th>Cari</th><th>Ödeme</th><th>Durum</th><th>Brüt</th><th>İndirim</th><th>Net</th><th></th></tr></thead><tbody>{rapor.satislar.slice(0, 100).map(satis => <Fragment key={satis.id}>
            <tr><td>{new Date(satis.created_at).toLocaleString('tr-TR')}</td><td>{satis.cari_adi || 'Cari yok'}</td><td>{satis.odeme_tipi}</td><td>{satis.durum || 'Tamamlandı'}</td><td>{para(satis.brut_toplam || satis.toplam_tutar)}</td><td>{para(satis.indirim_toplami)}</td><td><strong>{para(satis.raporToplam)}</strong></td><td><button className="market-receipt-button" type="button" onClick={() => {
              setAcikSatisId(acikSatisId === satis.id ? '' : satis.id);
              setIadeAdetleri({});
              setIadeAciklama('');
            }}>{acikSatisId === satis.id ? 'Kapat' : 'Fişi Aç'}</button></td></tr>
            {acikSatisId === satis.id && <tr className="market-receipt-row"><td colSpan="8"><div className="market-receipt">
              <div className="market-receipt-title"><span><strong>Satış fişi</strong><small>{new Date(satis.created_at).toLocaleString('tr-TR')} · {satis.odeme_tipi} · {satis.durum || 'Tamamlandı'}</small></span><b>{para(satis.toplam_tutar)}</b></div>
              {(satis.market_satis_kalemleri || []).map(kalem => {
                const kalanAdet = Math.max(Number(kalem.adet || 0) - Number(kalem.iade_adedi || 0), 0);
                const listeFiyati = Number(kalem.liste_fiyati || kalem.birim_fiyat || 0);
                const indirimli = listeFiyati > Number(kalem.birim_fiyat || 0);
                return <div className="market-receipt-item" key={kalem.id}><span><strong>{kalem.urun_adi}</strong><small>{kalem.barkod}{Number(kalem.iade_adedi || 0) > 0 ? ` · ${miktarYaz(kalem.iade_adedi)} iade` : ''}{indirimli ? ` · Liste ${para(listeFiyati)}` : ''}</small></span><span>{miktarYaz(kalem.adet)} × {para(kalem.birim_fiyat)}</span><b>{para(kalem.toplam_tutar)}</b>{kalanAdet > 0 && <label className="market-return-qty">İade<input type="number" min="0" max={kalanAdet} step="0.001" value={iadeAdetleri[kalem.id] || ''} onChange={event => setIadeAdetleri(prev => ({ ...prev, [kalem.id]: event.target.value }))} /></label>}</div>;
              })}
              {Number(satis.indirim_toplami || 0) > 0 && <div className="market-receipt-discount-summary"><span>Brüt toplam</span><b>{para(satis.brut_toplam)}</b><span>Ürün indirimleri</span><b>−{para(satis.urun_indirim_toplami)}</b><span>Sepet indirimi</span><b>−{para(satis.genel_indirim_toplami)}</b></div>}
              <div className="market-receipt-total"><span>Net Toplam<small>{Number(satis.iade_toplami || 0) > 0 ? `${para(satis.iade_toplami)} iade edildi` : ''}</small></span><strong>{para(satis.raporToplam)}</strong></div>
              {yetkiVar('fis_yazdir') && <div className="market-receipt-print-actions"><button className="market-receipt-button" type="button" onClick={() => satisFisiniYazdir(satis)}>🖨 Fişi Yazdır</button></div>}
              {satis.durum !== 'İptal' && <div className="market-return-actions"><input value={iadeAciklama} onChange={event => setIadeAciklama(event.target.value)} placeholder="İade / iptal açıklaması" /><button type="button" disabled={iadeIsleniyor} onClick={() => satisIadesiniKaydet(satis, false)}>Seçilenleri İade Et</button><button className="danger" type="button" disabled={iadeIsleniyor} onClick={() => satisIadesiniKaydet(satis, true)}>Satışı İptal Et</button></div>}
            </div></td></tr>}
          </Fragment>)}</tbody></table></div>}
        </div>}
      </div>}
    </section>
  );
}
