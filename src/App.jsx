import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Beklenmeyen bir hata oluştu.' };
  }

  componentDidCatch(error, info) {
    console.error('Uygulama hata yakalayıcı:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '24px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ maxWidth: '520px', width: '100%', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '24px', boxShadow: '0 20px 45px -28px rgba(15,23,42,0.25)' }}>
            <div style={{ fontSize: '34px', marginBottom: '10px' }}>⚠️</div>
            <h2 style={{ margin: '0 0 8px', color: '#1e293b' }}>Uygulama geçici olarak durdu</h2>
            <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '14px' }}>Sayfayı yenileyerek tekrar deneyin. Sorun devam ederse destek ekibine bu hata mesajını iletin.</p>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', color: '#334155', fontSize: '12px', marginBottom: '14px', wordBreak: 'break-word' }}>
              {this.state.errorMessage}
            </div>
            <button type="button" onClick={() => window.location.reload()} style={{ border: 'none', backgroundColor: '#ff6b35', color: '#fff', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800' }}>Sayfayı Yenile</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <IntegraApp />
    </AppErrorBoundary>
  );
}


function IntegraApp() {
  const kayitliUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('integra_user') || 'null');
    } catch {
      return null;
    }
  })();

  const kayitliActiveTab = localStorage.getItem('integra_activeTab');
  const kayitliScreen = localStorage.getItem('integra_screen');

  const izinliScreens = ['landing', 'login', 'register', 'dashboard'];

  const baslangicScreen =
    kayitliScreen === 'dashboard' && kayitliUser
      ? 'dashboard'
      : izinliScreens.includes(kayitliScreen) && kayitliScreen !== 'dashboard'
        ? kayitliScreen
        : 'landing';

  const baslangicTab =
    kayitliUser?.role === 'waiter'
      ? 'masalar'
      : kayitliUser?.role === 'super_admin'
        ? 'super_admin'
        : kayitliActiveTab || 'raporlar';

  const [screen, setScreen] = useState(baslangicScreen);
  const [activeTab, setActiveTab] = useState(baslangicTab);
  const [reportType, setReportType] = useState('gunluk');

  // auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [user, setUser] = useState(kayitliUser);
  const [yeniGarsonAdi, setYeniGarsonAdi] = useState('');
  const [yeniGarsonEmail, setYeniGarsonEmail] = useState('');
  const [yeniGarsonSifre, setYeniGarsonSifre] = useState('');
  const [garsonlar, setGarsonlar] = useState([]);

  // personel listesi için kullanılan kod
  const [personeller, setPersoneller] = useState([]);
  const [yeniPersonelGorevi, setYeniPersonelGorevi] = useState('Garson');
  const [yeniPersonelTelefon, setYeniPersonelTelefon] = useState('');

  // yeni personel için seçili ekran yetkilerini tutan kod
  const [yeniPersonelYetkileri, setYeniPersonelYetkileri] = useState(['masalar', 'menu']);
  // mutfak ekranında gösterilecek sipariş fişlerini tutan kod
  const [mutfakFisleri, setMutfakFisleri] = useState([]);

  // form states
  const [yeniMasaAdi, setYeniMasaAdi] = useState('');
  const [yeniUrunAdi, setYeniUrunAdi] = useState('');
  const [yeniUrunFiyati, setYeniUrunFiyati] = useState('');

  // menü ürün gruplarını tutan kod
  const [menuGruplari, setMenuGruplari] = useState([
    { id: 'demo-grup-1', restaurantId: 1, ad: 'Ana Yemekler', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true },
    { id: 'demo-grup-2', restaurantId: 1, ad: 'İçecekler', departman: 'Bar', kdvOrani: 20, mutfagaGitsin: false },
    { id: 'demo-grup-3', restaurantId: 1, ad: 'Tatlılar', departman: 'Tatlı', kdvOrani: 10, mutfagaGitsin: true },
  ]);

  // menü yönetiminde aktif seçili ürün grubunu tutan kod
  const [aktifMenuGrubu, setAktifMenuGrubu] = useState('Ana Yemekler');

  // adisyon ekranında aktif seçili ürün grubunu tutan kod
  const [aktifAdisyonMenuGrubu, setAktifAdisyonMenuGrubu] = useState('Ana Yemekler');

  // adisyon ekranında ürün arama metnini tutan kod
  const [adisyonUrunArama, setAdisyonUrunArama] = useState('');

  // yeni menü grubu oluşturma alanlarını tutan kod
  const [yeniMenuGrupAdi, setYeniMenuGrupAdi] = useState('');
  const [yeniMenuGrupDepartmani, setYeniMenuGrupDepartmani] = useState('Mutfak');
  const [yeniMenuGrupKdvOrani, setYeniMenuGrupKdvOrani] = useState('10');
  const [yeniMenuGrupMutfagaGitsin, setYeniMenuGrupMutfagaGitsin] = useState(true);

  // menü grubu düzenleme alanlarını tutan kod
  const [duzenlenenMenuGrupId, setDuzenlenenMenuGrupId] = useState(null);
  const [duzenlenenMenuGrupAdi, setDuzenlenenMenuGrupAdi] = useState('');
  const [duzenlenenMenuGrupDepartmani, setDuzenlenenMenuGrupDepartmani] = useState('');
  const [duzenlenenMenuGrupKdvOrani, setDuzenlenenMenuGrupKdvOrani] = useState('');
  const [duzenlenenMenuGrupMutfagaGitsin, setDuzenlenenMenuGrupMutfagaGitsin] = useState(true);

  const [seciliUrunId, setSeciliUrunId] = useState('');
  const [seciliUrunAdet, setSeciliUrunAdet] = useState(1);
  // masaya ürün eklerken seçilen hazır ürün notunu tutan kod
  const [seciliUrunHazirNotId, setSeciliUrunHazirNotId] = useState('');

  // ürünlere hazır not/seçenek tanımlamak için kullanılan kod
  const [notAyarlananUrunId, setNotAyarlananUrunId] = useState(null);
  const [yeniMenuNotuAdi, setYeniMenuNotuAdi] = useState('');
  const [yeniMenuNotuFiyati, setYeniMenuNotuFiyati] = useState('');
  // masaya ürün eklerken yazılan ürün notunu tutan kod
  const [seciliUrunNotu, setSeciliUrunNotu] = useState('');

  // masaya ürün eklerken girilen ekstra fiyatı tutan kod
  const [seciliUrunEkstraFiyat, setSeciliUrunEkstraFiyat] = useState('');

  // masaya ürün eklerken anlık satış fiyatı değiştirme alanını tutan kod
  const [seciliUrunSatisFiyati, setSeciliUrunSatisFiyati] = useState('');

  // masaya ürün eklerken yüzde indirim alanını tutan kod
  const [seciliUrunIndirimYuzde, setSeciliUrunIndirimYuzde] = useState('');

  // masaya ürün eklerken tutar indirim alanını tutan kod
  const [seciliUrunIndirimTutari, setSeciliUrunIndirimTutari] = useState('');
  // fiş yazdırma tercih ayarını tutan kod
  const [fisYazdirmaModu, setFisYazdirmaModu] = useState(
    localStorage.getItem('integra_fis_yazdirma_modu') || 'sor'
  );
  // ödeme sonrası fiş yazdırma sorusunu ekranda modal olarak göstermek için kullanılan kod
  const [fisSorModal, setFisSorModal] = useState(null);
  // son kapatılan adisyonun fiş bilgisini tutan kod
  const [sonFisBilgisi, setSonFisBilgisi] = useState(null);
  // ödeme alırken girilen tutarı tutan kod
  const [odemeTutariInput, setOdemeTutariInput] = useState('');

  // masaya müşteri adı yazmak için kullanılan kod
  const [musteriAdiInput, setMusteriAdiInput] = useState('');

  // raporlama tarih filtrelerini tutan kod
  const bugunRaporTarihi = new Date().toISOString().split('T')[0];
  const [raporTarihi, setRaporTarihi] = useState(bugunRaporTarihi);
  const [raporBaslangicTarihi, setRaporBaslangicTarihi] = useState(bugunRaporTarihi);
  const [raporBitisTarihi, setRaporBitisTarihi] = useState(bugunRaporTarihi);

  // rapor ekranında satış raporu / kapalı adisyonlar sekmesini tutan kod
  const [raporSekmesi, setRaporSekmesi] = useState('satis');


  // paket servis siparişlerini tutan kod
  const [paketSiparisleri, setPaketSiparisleri] = useState([]);
  const [paketMusteriAdi, setPaketMusteriAdi] = useState('');
  const [paketTelefon, setPaketTelefon] = useState('');
  const [paketAdres, setPaketAdres] = useState('');
  const [paketNotu, setPaketNotu] = useState('');
  const [paketOdemeTipi, setPaketOdemeTipi] = useState('Nakit');
  const [paketDurumu, setPaketDurumu] = useState('Hazırlanıyor');
  const [paketUrunler, setPaketUrunler] = useState([]);
  const [paketSeciliUrunId, setPaketSeciliUrunId] = useState('');
  const [paketSeciliAdet, setPaketSeciliAdet] = useState(1);

  // paket serviste seçilen ürüne özel notu tutan kod
  const [paketSeciliUrunNotu, setPaketSeciliUrunNotu] = useState('');

  // paket servis siparişinde seçilen kurye/personel bilgisini tutan kod
  const [paketSeciliKuryePersonelId, setPaketSeciliKuryePersonelId] = useState('');
  // paket servis siparişlerinde ödeme kapatma için girilen tutarları tutan kod
  const [paketOdemeTutarInputs, setPaketOdemeTutarInputs] = useState({});
  // paket servis ekranında aktif seçili ürün grubunu tutan kod
  const [aktifPaketMenuGrubu, setAktifPaketMenuGrubu] = useState('Ana Yemekler');
  // paket servis ekranında ürün arama metnini tutan kod
  const [paketUrunArama, setPaketUrunArama] = useState('');

  // paket servis kayıtlı müşterilerini tutan kod
  const [paketMusterileri, setPaketMusterileri] = useState([]);

  // paket servis ekranında seçilen kayıtlı müşteriyi tutan kod
  const [seciliPaketMusteriId, setSeciliPaketMusteriId] = useState('');

  // paket servis siparişi oluştururken müşteri bilgilerini kaydetme ayarını tutan kod
  const [paketMusteriKaydedilsin, setPaketMusteriKaydedilsin] = useState(true);

  // cari/veresiye müşteri hesaplarını tutan kod
  const [cariMusteriler, setCariMusteriler] = useState([]);
  const [yeniCariAdi, setYeniCariAdi] = useState('');
  const [yeniCariTelefon, setYeniCariTelefon] = useState('');
  const [yeniCariNotu, setYeniCariNotu] = useState('');
  const [cariTahsilatTutari, setCariTahsilatTutari] = useState('');
  const [cariAdisyonMusteriId, setCariAdisyonMusteriId] = useState('');
  // cariye yazarken klavyeden müşteri aramak için kullanılan kod
  const [cariAdisyonArama, setCariAdisyonArama] = useState('');

  // cari ekranında klavyeden müşteri aramak için kullanılan kod
  const [cariListeArama, setCariListeArama] = useState('');

  // paket servis ekranında kayıtlı müşteriyi klavyeden aramak için kullanılan kod
  const [paketMusteriArama, setPaketMusteriArama] = useState('');

  // kasa açılış/kapanış hareketlerini tutan kod
  const [kasaHareketleri, setKasaHareketleri] = useState([]);
  const [kasaAcilisTutari, setKasaAcilisTutari] = useState('');
  const [kasaHareketTutari, setKasaHareketTutari] = useState('');
  const [kasaHareketAciklama, setKasaHareketAciklama] = useState('');

  // masa birleştirme ve adisyon bölme alanlarını tutan kod
  const [birlestirilecekMasaId, setBirlestirilecekMasaId] = useState('');
  const [bolunecekSiparisIndexleri, setBolunecekSiparisIndexleri] = useState([]);

  // stok düzenleme alanlarını tutan kod
  const [stokDuzenlemeUrunId, setStokDuzenlemeUrunId] = useState(null);
  const [stokDuzenlemeAdedi, setStokDuzenlemeAdedi] = useState('');
  const [stokDuzenlemeKritik, setStokDuzenlemeKritik] = useState('');


  // hızlı satış / gel-al ekranı için kullanılan kod
  const [hizliSatisUrunler, setHizliSatisUrunler] = useState([]);
  const [aktifHizliSatisMenuGrubu, setAktifHizliSatisMenuGrubu] = useState('Ana Yemekler');
  const [hizliSatisUrunArama, setHizliSatisUrunArama] = useState('');
  const [hizliSatisOdemeTipi, setHizliSatisOdemeTipi] = useState('Nakit');
  const [hizliSatisAlinanTutar, setHizliSatisAlinanTutar] = useState('');
  const [hizliSatisIndirimYuzde, setHizliSatisIndirimYuzde] = useState('');
  const [hizliSatisIndirimTutari, setHizliSatisIndirimTutari] = useState('');

  // gider takibi için kullanılan kod
  const [giderler, setGiderler] = useState([]);
  const [yeniGiderKategori, setYeniGiderKategori] = useState('Malzeme');
  const [yeniGiderAciklama, setYeniGiderAciklama] = useState('');
  const [yeniGiderTutari, setYeniGiderTutari] = useState('');

  // iade / iptal / ikram / zayi / personel yemeği kayıtlarını tutan kod
  const [iadeKayitlari, setIadeKayitlari] = useState([]);
  const [iadeTipi, setIadeTipi] = useState('İade');
  const [iadeSebebi, setIadeSebebi] = useState('Müşteri vazgeçti');
  const [iadeUrunId, setIadeUrunId] = useState('');
  const [iadeAdet, setIadeAdet] = useState(1);
  const [iadeTutar, setIadeTutar] = useState('');

  // rezervasyon ekranı için kullanılan kod
  const [rezervasyonlar, setRezervasyonlar] = useState([]);
  const [rezervasyonAdi, setRezervasyonAdi] = useState('');
  const [rezervasyonTelefon, setRezervasyonTelefon] = useState('');
  const [rezervasyonKisiSayisi, setRezervasyonKisiSayisi] = useState('');
  const [rezervasyonTarihSaat, setRezervasyonTarihSaat] = useState('');
  const [rezervasyonBitisTarihSaat, setRezervasyonBitisTarihSaat] = useState('');
  const [rezervasyonMasaId, setRezervasyonMasaId] = useState('');
  const [rezervasyonNotu, setRezervasyonNotu] = useState('');
  // rezervasyonda kayıtlı cari müşteriyi seçmek için kullanılan kod
  const [rezervasyonCariMusteriId, setRezervasyonCariMusteriId] = useState('');
  const [rezervasyonCariArama, setRezervasyonCariArama] = useState('');

  // ürün maliyeti ve kasa gün sonu için kullanılan kod
  const [yeniUrunMaliyeti, setYeniUrunMaliyeti] = useState('');
  const [duzenlenenUrunMaliyeti, setDuzenlenenUrunMaliyeti] = useState('');
  const [kasaGercekTutar, setKasaGercekTutar] = useState('');

  // gün sonu kapatıldıktan sonra kasa bölümünde saklanacak Z raporlarını tutan kod
  const [zRaporlari, setZRaporlari] = useState([]);
  const [kuryeAdiInputs, setKuryeAdiInputs] = useState({});

  const [selectedMasaId, setSelectedMasaId] = useState(null);
  // masa aktarma modunu açıp kapatan kod
  const [masaAktarmaModu, setMasaAktarmaModu] = useState(false);

  // aktarılacak kaynak masa id bilgisini tutan kod
  const [aktarilanKaynakMasaId, setAktarilanKaynakMasaId] = useState(null);

  // açılır kapanır masa bölümlerini tutan kod
  const [acikBolumler, setAcikBolumler] = useState(['Salon']);

  // masa aktarma bilgilendirme mesajını tutan kod
  const [aktarimMesaji, setAktarimMesaji] = useState('');
  // masa bölümlerini tutan kod
  const [masaBolumleri, setMasaBolumleri] = useState(['Salon']);

  // aktif seçili masa bölümünü tutan kod
  const [aktifMasaBolumu, setAktifMasaBolumu] = useState('Salon');

  // yeni masa bölümü ekleme inputunu tutan kod
  const [yeniBolumAdi, setYeniBolumAdi] = useState('');

  const [duzenlenenUrunId, setDuzenlenenUrunId] = useState(null);
  const [duzenlenenUrunAdi, setDuzenlenenUrunAdi] = useState('');
  const [duzenlenenUrunFiyati, setDuzenlenenUrunFiyati] = useState('');
  const [duzenlenenMasaId, setDuzenlenenMasaId] = useState(null);
  const [duzenlenenMasaAdi, setDuzenlenenMasaAdi] = useState('');

  // demo data
  const [restoranlar, setRestoranlar] = useState([
    { id: 1, ad: 'Gaziantep Lahmacun & Kebap', email: 'sahip@integra.com', sifre: '123456', durum: 'Aktif', rol: 'owner' },
    { id: 2, ad: 'Gaziantep Lahmacun (Garson)', email: 'garson@integra.com', sifre: '123456', durum: 'Aktif', rol: 'waiter', parentRestaurantId: 1 },
    { id: 3, ad: 'Nişantaşı Brasserie & Cafe', email: 'cafe@integra.com', sifre: '123456', durum: 'Onay Bekliyor', rol: 'owner' },
  ]);

  const [masalar, setMasalar] = useState([
    { id: 101, restaurantId: 1, ad: 'Masa 1', dolu: true, tutar: 400, siparisler: [{ ad: 'Adana Kebap', fiyat: 280, adet: 1 }, { ad: 'Künefe', fiyat: 120, adet: 1 }], odemeler: [] },
    { id: 102, restaurantId: 1, ad: 'Masa 2', dolu: false, tutar: 0, siparisler: [], odemeler: [] },
    { id: 103, restaurantId: 1, ad: 'Masa 3', dolu: true, tutar: 130, siparisler: [{ ad: 'Mercimek Çorbası', fiyat: 90, adet: 1 }, { ad: 'Ayran', fiyat: 40, adet: 1 }], odemeler: [] },
    { id: 104, restaurantId: 3, ad: 'Teras 1', dolu: false, tutar: 0, siparisler: [], odemeler: [] },
  ]);

  const [menuUrunleri, setMenuUrunleri] = useState([
    { id: 1, restaurantId: 1, ad: 'Adana Kebap', fiyat: 280, kategori: 'Ana Yemekler', menuGrubu: 'Ana Yemekler', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true, menuNotlari: [] },
    { id: 2, restaurantId: 1, ad: 'Ayran', fiyat: 40, kategori: 'İçecekler', menuGrubu: 'İçecekler', departman: 'Bar', kdvOrani: 20, mutfagaGitsin: false, menuNotlari: [] },
    { id: 3, restaurantId: 1, ad: 'Künefe', fiyat: 120, kategori: 'Tatlılar', menuGrubu: 'Tatlılar', departman: 'Tatlı', kdvOrani: 10, mutfagaGitsin: true, menuNotlari: [] },
    { id: 4, restaurantId: 1, ad: 'Mercimek Çorbası', fiyat: 90, kategori: 'Ana Yemekler', menuGrubu: 'Ana Yemekler', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true, menuNotlari: [] },
    { id: 5, restaurantId: 3, ad: 'Filtre Kahve', fiyat: 110, kategori: 'İçecekler', menuGrubu: 'İçecekler', departman: 'Bar', kdvOrani: 20, mutfagaGitsin: false, menuNotlari: [] },
  ]);

  const [satisGecmisi, setSatisGecmisi] = useState([
    { id: 501, restaurantId: 1, ad: 'Adana Kebap', fiyat: 280, adet: 4, tarih: '2026-06-19' },
    { id: 502, restaurantId: 1, ad: 'Ayran', fiyat: 40, adet: 6, tarih: '2026-06-19' },
    { id: 503, restaurantId: 1, ad: 'Künefe', fiyat: 120, adet: 12, tarih: '2026-06-05' },
    { id: 504, restaurantId: 1, ad: 'Adana Kebap', fiyat: 280, adet: 8, tarih: '2026-05-20' },
  ]);

  const mevcutRestaurantId = user?.role === 'waiter' ? user?.parentRestaurantId : user?.restaurantId;

  // giriş yapan restorana ait tüm masaları bulan kod
  const tumRestoranMasalari = masalar.filter(m => m.restaurantId === mevcutRestaurantId);

  // restoranın masa bölümlerini listeleyen kod
  const masaBolumleriListesi = Array.from(
    new Set([
      ...(Array.isArray(masaBolumleri) && masaBolumleri.length > 0 ? masaBolumleri : ['Salon']),
      ...tumRestoranMasalari.map(m => m.bolum || 'Salon'),
    ])
  );

  // aktif seçili bölüme göre masaları filtreleyen kod
  const aktifMasalar = tumRestoranMasalari.filter(m => {
    return (m.bolum || 'Salon') === aktifMasaBolumu;
  });

  const aktifMenu = menuUrunleri.filter(u => u.restaurantId === mevcutRestaurantId);

  // para ve yüzde inputlarını güvenli sayıya çeviren yardımcı kod
  const sayiyaCevir = (deger) => {
    const sayi = Number(String(deger || '').replace(',', '.'));
    return Number.isFinite(sayi) ? sayi : 0;
  };

  // ürün ekleme alanındaki fiyat, indirim ve son birim fiyatı hesaplayan kod
  const urunFiyatHesapla = (urun, hazirNotId, manuelNotFiyat, satisFiyati, indirimYuzdeDegeri, indirimTutariDegeri) => {
    if (!urun) {
      return {
        normalFiyat: 0,
        ekstraFiyat: 0,
        listeFiyati: 0,
        satisFiyati: 0,
        indirimYuzde: 0,
        indirimTutari: 0,
        birimFiyat: 0,
        fiyatDegistirildi: false,
      };
    }

    const hazirNotlar = Array.isArray(urun.menuNotlari) ? urun.menuNotlari : [];
    const seciliHazirNot = hazirNotlar.find(n => String(n.id) === String(hazirNotId));
    const normalFiyat = Number(urun.fiyat || 0);
    const manuelEkstraFiyat = sayiyaCevir(manuelNotFiyat);
    const ekstraFiyat = seciliHazirNot ? Number(seciliHazirNot.fiyat || 0) : manuelEkstraFiyat;
    const listeFiyati = Math.max(normalFiyat + ekstraFiyat, 0);
    const girilenSatisFiyati = String(satisFiyati || '').trim() === '' ? null : sayiyaCevir(satisFiyati);
    const satisFiyatiNet = girilenSatisFiyati === null ? listeFiyati : Math.max(girilenSatisFiyati, 0);
    const indirimYuzde = Math.min(Math.max(sayiyaCevir(indirimYuzdeDegeri), 0), 100);
    const yuzdeIndirimi = satisFiyatiNet * indirimYuzde / 100;
    const tutarIndirimi = Math.max(sayiyaCevir(indirimTutariDegeri), 0);
    const indirimTutari = Math.min(yuzdeIndirimi + tutarIndirimi, satisFiyatiNet);
    const birimFiyat = Math.max(satisFiyatiNet - indirimTutari, 0);
    const fiyatDegistirildi = girilenSatisFiyati !== null && Math.abs(satisFiyatiNet - listeFiyati) > 0.001;

    return {
      normalFiyat,
      ekstraFiyat,
      listeFiyati,
      satisFiyati: satisFiyatiNet,
      indirimYuzde,
      indirimTutari,
      birimFiyat,
      fiyatDegistirildi,
    };
  };

  // giriş yapan restorana ait menü gruplarını ve ürünlerin bağlı olduğu grupları birleştiren kod
  const aktifMenuGruplari = Array.from(
    new Map(
      [
        ...(Array.isArray(menuGruplari) ? menuGruplari.filter(g => String(g.restaurantId) === String(mevcutRestaurantId)) : []),
        ...aktifMenu.map(u => ({
          id: `urun-grup-${u.menuGrubu || u.kategori || 'Genel'}`,
          restaurantId: mevcutRestaurantId,
          ad: u.menuGrubu || u.kategori || 'Genel',
          departman: u.departman || 'Mutfak',
          kdvOrani: Number(u.kdvOrani || 10),
          mutfagaGitsin: u.mutfagaGitsin !== false,
        })),
      ].map(g => [g.ad, g])
    ).values()
  );

  // aktif menü grubunu bulan kod
  const aktifGrup =
    aktifMenuGruplari.find(g => g.ad === aktifMenuGrubu) ||
    aktifMenuGruplari[0] ||
    { ad: 'Genel', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true };

  // aktif seçili menü grubundaki ürünleri filtreleyen kod
  const aktifMenuGrubuUrunleri = aktifMenu.filter(u => {
    return (u.menuGrubu || u.kategori || 'Genel') === (aktifGrup.ad || aktifMenuGrubu || 'Genel');
  });

  // adisyon ekranında aktif seçili ürün grubunu bulan kod
  const aktifAdisyonGrup =
    aktifMenuGruplari.find(g => g.ad === aktifAdisyonMenuGrubu) ||
    aktifMenuGruplari[0] ||
    { ad: 'Genel', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true };

  // adisyon ekranında seçili grup ve aramaya göre ürünleri listeleyen kod
  const adisyonUrunAramaMetni = String(adisyonUrunArama || '').toLocaleLowerCase('tr-TR').trim();
  const aktifAdisyonGrubuUrunleri = aktifMenu
    .filter(u => {
      const urunGrubu = u.menuGrubu || u.kategori || 'Genel';
      const urunAdi = String(u.ad || '').toLocaleLowerCase('tr-TR');
      const grupUyuyor = urunGrubu === (aktifAdisyonGrup.ad || aktifAdisyonMenuGrubu || 'Genel');
      const aramaUyuyor = !adisyonUrunAramaMetni || urunAdi.includes(adisyonUrunAramaMetni);

      return grupUyuyor && aramaUyuyor;
    })
    .sort((a, b) => Number(Boolean(b.favori)) - Number(Boolean(a.favori)));

  // paket servis ekranında aktif seçili ürün grubunu bulan kod
  const aktifPaketGrup =
    aktifMenuGruplari.find(g => g.ad === aktifPaketMenuGrubu) ||
    aktifMenuGruplari[0] ||
    { ad: 'Genel', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true };

  // paket servis ekranında seçili grup ve aramaya göre ürünleri listeleyen kod
  const paketUrunAramaMetni = String(paketUrunArama || '').toLocaleLowerCase('tr-TR').trim();
  const aktifPaketGrubuUrunleri = aktifMenu
    .filter(u => {
      const urunGrubu = u.menuGrubu || u.kategori || 'Genel';
      const urunAdi = String(u.ad || '').toLocaleLowerCase('tr-TR');
      const grupUyuyor = urunGrubu === (aktifPaketGrup.ad || aktifPaketMenuGrubu || 'Genel');
      const aramaUyuyor = !paketUrunAramaMetni || urunAdi.includes(paketUrunAramaMetni);

      return grupUyuyor && aramaUyuyor;
    })
    .sort((a, b) => Number(Boolean(b.favori)) - Number(Boolean(a.favori)));

  // paket servis kayıtlı müşterilerini arama metnine göre filtreleyen kod
  const paketMusteriAramaMetni = String(paketMusteriArama || '').toLocaleLowerCase('tr-TR').trim();
  const filtreliPaketMusterileri = paketMusterileri
    .filter(m => {
      const arananAlan = `${m.ad || ''} ${m.telefon || ''} ${m.adres || ''}`.toLocaleLowerCase('tr-TR');
      return !paketMusteriAramaMetni || arananAlan.includes(paketMusteriAramaMetni);
    })
    .slice(0, 8);

  // aktif personel ve paket servis kurye/personel listesini hazırlayan kod
  const aktifPersoneller = (Array.isArray(personeller) ? personeller : []).filter(p => {
    return String(p.restaurantId) === String(mevcutRestaurantId) && String(p.durum || 'Aktif') !== 'Pasif';
  });

  const paketKuryePersonelleri = aktifPersoneller.filter(p => {
    const gorev = String(p.gorev || '').toLocaleLowerCase('tr-TR');
    return gorev.includes('kurye') || gorev.includes('garson') || gorev.includes('müdür') || gorev.includes('mudur') || gorev.includes('kasiyer');
  });

  // personel ekran yetkilerinde kullanılacak sekme seçeneklerini tutan kod
  const personelSekmeSecenekleri = [
    { key: 'masalar', label: '🪑 Masalar' },
    { key: 'mutfak', label: '👨‍🍳 Mutfak' },
    { key: 'paket', label: '🛵 Paket Servis' },
    { key: 'hizli_satis', label: '⚡ Hızlı Satış' },
    { key: 'menu', label: '🍔 Menü & Ayarlar' },
    { key: 'raporlar', label: '📊 Raporlar' },
    { key: 'cari', label: '📒 Cari / Veresiye' },
    { key: 'stok', label: '📦 Stok' },
    { key: 'kasa', label: '💰 Kasa' },
    { key: 'giderler', label: '🧾 Giderler' },
    { key: 'iadeler', label: '↩️ İade / İkram' },
    { key: 'rezervasyonlar', label: '📅 Rezervasyon' },
    { key: 'garsonlar', label: '👥 Personel Listesi' },
  ];

  // göreve göre varsayılan personel ekran yetkilerini oluşturan kod
  const goreveGoreVarsayilanYetkiler = (gorev) => {
    const gorevMetni = String(gorev || '').toLocaleLowerCase('tr-TR');

    if (gorevMetni.includes('müdür') || gorevMetni.includes('mudur')) {
      return ['raporlar', 'masalar', 'mutfak', 'paket', 'cari', 'stok', 'kasa', 'hizli_satis', 'giderler', 'iadeler', 'rezervasyonlar', 'garsonlar', 'menu'];
    }

    if (gorevMetni.includes('mutfak')) {
      return ['mutfak'];
    }

    if (gorevMetni.includes('kurye')) {
      return ['paket'];
    }

    if (gorevMetni.includes('kasiyer')) {
      return ['masalar', 'paket', 'hizli_satis', 'cari'];
    }

    return ['masalar', 'menu'];
  };

  // personel yetki listesini güvenli diziye çeviren kod
  const yetkiListesiniHazirla = (yetkiler, gorev = 'Garson') => {
    const izinliSekmeler = personelSekmeSecenekleri.map(s => s.key);
    const kaynak = Array.isArray(yetkiler) && yetkiler.length > 0 ? yetkiler : goreveGoreVarsayilanYetkiler(gorev);
    const temizListe = Array.from(new Set(kaynak.filter(y => izinliSekmeler.includes(y))));
    return temizListe.length > 0 ? temizListe : ['masalar'];
  };

  // giriş yapan kullanıcının görebileceği sekmeleri hazırlayan kod
  const kullaniciSekmeleri = (() => {
    if (user?.role === 'super_admin') {
      return ['super_admin'];
    }

    if (user?.role === 'owner') {
      return personelSekmeSecenekleri.map(s => s.key);
    }

    return yetkiListesiniHazirla(user?.tabYetkileri, user?.personelGorev || 'Garson');
  })();

  // sekmenin kullanıcı için görünür olup olmadığını kontrol eden kod
  const tabGorunur = (tabKey) => {
    return kullaniciSekmeleri.includes(tabKey);
  };

  // giriş sonrası açılacak ilk sekmeyi seçen kod
  const ilkGirisSekmesi = (rol, yetkiler, gorev = 'Garson') => {
    if (rol === 'super_admin') return 'super_admin';
    if (rol === 'owner') return 'raporlar';
    return yetkiListesiniHazirla(yetkiler, gorev)[0] || 'masalar';
  };

  // yetki listesini ekranda okunabilir hale getiren kod
  const yetkiEtiketleriYaz = (yetkiler = []) => {
    const liste = yetkiListesiniHazirla(yetkiler);
    return liste
      .map(y => personelSekmeSecenekleri.find(s => s.key === y)?.label || y)
      .join(' / ');
  };

  // cariye yazma alanında müşterileri arama metnine göre filtreleyen kod
  const cariAdisyonAramaMetni = String(cariAdisyonArama || '').toLocaleLowerCase('tr-TR').trim();
  const filtreliCariAdisyonMusterileri = cariMusteriler
    .filter(c => {
      const arananAlan = `${c.ad || ''} ${c.telefon || ''} ${c.notMetni || ''}`.toLocaleLowerCase('tr-TR');
      return !cariAdisyonAramaMetni || arananAlan.includes(cariAdisyonAramaMetni);
    })
    .slice(0, 8);

  // cari ekranındaki listeyi arama metnine göre filtreleyen kod
  const cariListeAramaMetni = String(cariListeArama || '').toLocaleLowerCase('tr-TR').trim();
  const filtreliCariMusteriler = cariMusteriler.filter(c => {
    const arananAlan = `${c.ad || ''} ${c.telefon || ''} ${c.notMetni || ''}`.toLocaleLowerCase('tr-TR');
    return !cariListeAramaMetni || arananAlan.includes(cariListeAramaMetni);
  });


  // hızlı satış ekranında seçili grup ve aramaya göre ürünleri listeleyen kod
  const aktifHizliSatisGrup =
    aktifMenuGruplari.find(g => g.ad === aktifHizliSatisMenuGrubu) ||
    aktifMenuGruplari[0] ||
    { ad: 'Genel', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true };

  const hizliSatisUrunAramaMetni = String(hizliSatisUrunArama || '').toLocaleLowerCase('tr-TR').trim();
  const aktifHizliSatisGrubuUrunleri = aktifMenu
    .filter(u => {
      const urunGrubu = u.menuGrubu || u.kategori || 'Genel';
      const urunAdi = String(u.ad || '').toLocaleLowerCase('tr-TR');
      const grupUyuyor = urunGrubu === (aktifHizliSatisGrup.ad || aktifHizliSatisMenuGrubu || 'Genel');
      const aramaUyuyor = !hizliSatisUrunAramaMetni || urunAdi.includes(hizliSatisUrunAramaMetni);
      return grupUyuyor && aramaUyuyor;
    })
    .sort((a, b) => Number(Boolean(b.favori)) - Number(Boolean(a.favori)));

  const hizliSatisAraToplam = hizliSatisUrunler.reduce((toplam, u) => {
    return toplam + Number(u.fiyat || 0) * Number(u.adet || 1);
  }, 0);

  const hizliSatisIndirimYuzdeSayi = Math.max(sayiyaCevir(hizliSatisIndirimYuzde || 0), 0);
  const hizliSatisIndirimTutariSayi = Math.max(sayiyaCevir(hizliSatisIndirimTutari || 0), 0);
  const hizliSatisYuzdeIndirimTutari = hizliSatisAraToplam * Math.min(hizliSatisIndirimYuzdeSayi, 100) / 100;
  const hizliSatisToplamIndirim = Math.min(hizliSatisAraToplam, hizliSatisYuzdeIndirimTutari + hizliSatisIndirimTutariSayi);
  const hizliSatisToplam = Math.max(hizliSatisAraToplam - hizliSatisToplamIndirim, 0);

  const bugunStrGenel = new Date().toISOString().split('T')[0];
  const bugunkuSatislar = satisGecmisi.filter(s => {
    return s.restaurantId === mevcutRestaurantId && String(s.tarih || '') === bugunStrGenel && !s.gunSonuKapandi;
  });

  const bugunkuCiro = bugunkuSatislar.reduce((toplam, s) => {
    return toplam + Number(s.fiyat || 0) * Number(s.adet || 1);
  }, 0);

  const bugunkuMaliyet = bugunkuSatislar.reduce((toplam, s) => {
    const menuUrunu = menuUrunleri.find(u => {
      return u.restaurantId === mevcutRestaurantId && String(u.ad || '') === String(s.ad || '');
    });
    return toplam + Number(menuUrunu?.maliyet || 0) * Number(s.adet || 1);
  }, 0);

  const bugunkuGiderToplami = giderler.reduce((toplam, g) => {
    return toplam + (!g.gunSonuKapandi ? Number(g.tutar || 0) : 0);
  }, 0);

  const bugunkuIadeIkramZayiToplami = iadeKayitlari.reduce((toplam, i) => {
    return toplam + (!i.gunSonuKapandi ? Number(i.tutar || 0) : 0);
  }, 0);

  const bugunkuTahminiKar = bugunkuCiro - bugunkuMaliyet - bugunkuGiderToplami - bugunkuIadeIkramZayiToplami;

  const aktifPaketSiparisleri = paketSiparisleri.filter(p => !p.gunSonuKapandi);

  const paketMusteriGecmisiOzetleri = paketMusterileri.map(m => {
    const siparisler = paketSiparisleri.filter(p => {
      const ayniId = m.id && p.paketMusteriId && String(p.paketMusteriId) === String(m.id);
      const ayniTelefon = m.telefon && p.telefon && String(p.telefon) === String(m.telefon);
      return ayniId || ayniTelefon;
    });

    return {
      ...m,
      siparisSayisi: siparisler.length,
      toplamHarcama: siparisler.reduce((t, p) => t + Number(p.tutar || 0), 0),
      sonSiparis: siparisler[0]?.createdAt || null,
    };
  });

  const rezervasyonCariAramaMetni = String(rezervasyonCariArama || '').toLocaleLowerCase('tr-TR').trim();
  const filtreliRezervasyonCariMusterileri = cariMusteriler.filter(c => {
    const arananAlan = `${c.ad || ''} ${c.telefon || ''} ${c.notMetni || ''}`.toLocaleLowerCase('tr-TR');
    return !rezervasyonCariAramaMetni || arananAlan.includes(rezervasyonCariAramaMetni);
  });
  // canlı masa ekranında aktif rezervasyonu bulan kod
  const aktifRezervasyonBul = (masaId, kontrolTarihi = new Date()) => {
    const kontrol = new Date(kontrolTarihi).getTime();

    return rezervasyonlar.find(r => {
      if (String(r.restaurantId) !== String(mevcutRestaurantId)) return false;
      if (String(r.masaId || '') !== String(masaId || '')) return false;
      if (['İptal', 'Tamamlandı'].includes(r.durum)) return false;

      const baslangic = r.rezervasyonZamani ? new Date(r.rezervasyonZamani).getTime() : 0;
      const bitis = r.rezervasyonBitisZamani
        ? new Date(r.rezervasyonBitisZamani).getTime()
        : baslangic + 2 * 60 * 60 * 1000;

      return kontrol >= baslangic && kontrol <= bitis;
    });
  };

  // rezervasyon eklerken saat aralığı çakışan masaları gizleyen kod
  const rezervasyonMasaMusaitMi = (masa) => {
    if (!masa || !rezervasyonTarihSaat || !rezervasyonBitisTarihSaat) return true;

    const yeniBaslangic = new Date(rezervasyonTarihSaat).getTime();
    const yeniBitis = new Date(rezervasyonBitisTarihSaat).getTime();

    return !rezervasyonlar.some(r => {
      if (String(r.restaurantId) !== String(mevcutRestaurantId)) return false;
      if (String(r.masaId || '') !== String(masa.id || '')) return false;
      if (['İptal', 'Tamamlandı'].includes(r.durum)) return false;

      const mevcutBaslangic = r.rezervasyonZamani ? new Date(r.rezervasyonZamani).getTime() : 0;
      const mevcutBitis = r.rezervasyonBitisZamani
        ? new Date(r.rezervasyonBitisZamani).getTime()
        : mevcutBaslangic + 2 * 60 * 60 * 1000;

      return yeniBaslangic < mevcutBitis && yeniBitis > mevcutBaslangic;
    });
  };

  // datetime-local input değerini saat kaymadan Supabase'e gönderilecek ISO formata çeviren kod
  const yerelTarihSaatIsoYap = (deger) => {
    if (!deger) return null;
    const tarih = new Date(deger);
    if (Number.isNaN(tarih.getTime())) return null;
    return tarih.toISOString();
  };

  // sadece saat ve dakika bilgisini ekranda gösteren kod
  const saatYaz = (tarihSaat) => {
    if (!tarihSaat) return '-';

    return new Date(tarihSaat).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // tarih ve saati ekranda okunabilir hale getiren kod
  const tarihSaatYaz = (tarihSaat) => {
    if (!tarihSaat) return '-';

    return new Date(tarihSaat).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  // süper admin için restoran listesini Supabase'den çeken kod
  const restoranlariSupabasedenCek = async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Restoranlar çekilemedi:', error);
      alert('Restoranlar çekilemedi: ' + error.message);
      return;
    }

    const temizListe = data.map(r => ({
      id: r.id,
      ad: r.restaurant_name || r.name,
      email: r.email,
      durum: r.durum || 'Onay Bekliyor',
      rol: r.rol || 'owner',
      paketAdi: r.paket_adi || 'Starter',
      aylikUcret: Number(r.aylik_ucret || 0),
      sonOdemeTarihi: r.son_odeme_tarihi || '',
      lisansDurumu: r.lisans_durumu || r.durum || 'Aktif',
      kullaniciLimiti: Number(r.kullanici_limiti || 3),
    }));

    setRestoranlar(temizListe);
  };

  // restoran sahibine bağlı garson hesaplarını Supabase'den çeken kod
  const garsonlariSupabasedenCek = async (restaurantId) => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('parent_restaurant_id', restaurantId)
      .eq('rol', 'waiter')
      .order('id', { ascending: true });

    if (error) {
      console.error('Garsonlar çekilemedi:', error);
      return;
    }

    const temizGarsonlar = data.map(g => ({
      id: g.id,
      ad: g.waiter_name || g.name || g.restaurant_name,
      email: g.email,
      durum: g.durum || 'Aktif',
      rol: g.rol,
      parentRestaurantId: g.parent_restaurant_id,
    }));

    setGarsonlar(temizGarsonlar);
  };


  // restoran personel listesini Supabase'den çeken kod
  const personelleriSupabasedenCek = async (restaurantId) => {
    const { data, error } = await supabase
      .from('personeller')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('id', { ascending: true });

    if (error) {
      console.error('Personeller çekilemedi:', error);
      setPersoneller([]);
      return;
    }

    const temizPersoneller = (Array.isArray(data) ? data : []).map(p => ({
      id: p.id,
      restaurantId: p.restaurant_id,
      ad: p.ad || '',
      gorev: p.gorev || 'Garson',
      telefon: p.telefon || '',
      email: p.email || '',
      sifre: p.sifre || p.password || '',
      durum: p.durum || 'Aktif',
      tabYetkileri: yetkiListesiniHazirla(p.tab_yetkileri, p.gorev || 'Garson'),
      createdAt: p.created_at,
    }));

    setPersoneller(temizPersoneller);
  };

// giriş yapan restoranın masalarını Supabase'den çeken kod
  const masalariSupabasedenCek = async (restaurantId) => {
    const { data, error } = await supabase
      .from('masalar')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('id', { ascending: true });

    if (error) {
      console.error('Masalar çekilemedi:', error);
      alert('Masalar çekilemedi: ' + error.message);
      return;
    }

    const temizMasalar = data.map(m => ({
      id: m.id,
      restaurantId: m.restaurant_id,
      ad: m.ad,
      dolu: m.dolu || false,
      tutar: Number(m.tutar || 0),
      siparisler: Array.isArray(m.siparisler) ? m.siparisler : [],
      odemeler: Array.isArray(m.odemeler) ? m.odemeler : [],
      adisyonAcilisSaati: m.adisyon_acilis_saati || null,
      adisyonGarsonAdi: m.adisyon_garson_adi || '',
      musteriAdi: m.musteri_adi || '',
      bolum: m.bolum || 'Salon',
    }));

    setMasalar(temizMasalar);

    if (temizMasalar.length > 0 && !selectedMasaId) {
      setSelectedMasaId(temizMasalar[0].id);
    }
  };

  // masa bölümlerini Supabase'den çeken kod
  const masaBolumleriniSupabasedenCek = async (restaurantId) => {
    const { data, error } = await supabase
      .from('masa_bolumleri')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('id', { ascending: true });

    if (error) {
      console.error('Masa bölümleri çekilemedi:', error);
      setMasaBolumleri(['Salon']);
      return;
    }

    const gelenBolumler = (Array.isArray(data) ? data : []).map(b => b.ad);
    const temizBolumler = Array.from(new Set(['Salon', ...gelenBolumler]));

    setMasaBolumleri(temizBolumler);

    if (!temizBolumler.includes(aktifMasaBolumu)) {
      setAktifMasaBolumu(temizBolumler[0] || 'Salon');
    }
  };

  // giriş yapan restoranın menü ürünlerini Supabase'den çeken kod
  const menuUrunleriniSupabasedenCek = async (restaurantId) => {
    const { data, error } = await supabase
      .from('menu_urunleri')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('id', { ascending: true });

    if (error) {
      console.error('Menü ürünleri çekilemedi:', error);
      alert('Menü ürünleri çekilemedi: ' + error.message);
      return;
    }

    // menü ürünlerini uygulamanın anlayacağı formata çeviren kod
    const temizMenu = data.map(u => ({
      id: u.id,
      restaurantId: u.restaurant_id,
      ad: u.ad,
      fiyat: Number(u.fiyat || 0),
      maliyet: Number(u.maliyet || 0),
      kategori: u.menu_grubu || u.kategori || 'Genel',
      menuGrubu: u.menu_grubu || u.kategori || 'Genel',
      departman: u.departman || 'Mutfak',
      kdvOrani: Number(u.kdv_orani || 10),
      menuNotlari: Array.isArray(u.menu_notlari) ? u.menu_notlari : [],
      mutfagaGitsin: u.mutfaga_gitsin !== false,
      stokTakip: Boolean(u.stok_takip),
      stokAdedi: Number(u.stok_adedi || 0),
      kritikStok: Number(u.kritik_stok || 0),
      favori: Boolean(u.favori),
    }));

    setMenuUrunleri(temizMenu);
  };

  // menü gruplarını Supabase'den çeken kod
  const menuGruplariniSupabasedenCek = async (restaurantId) => {
    const { data, error } = await supabase
      .from('menu_gruplari')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('id', { ascending: true });

    if (error) {
      console.error('Menü grupları çekilemedi:', error);
      setMenuGruplari(prev => {
        const mevcutGruplar = Array.isArray(prev) ? prev.filter(g => String(g.restaurantId) === String(restaurantId)) : [];
        return mevcutGruplar.length > 0
          ? prev
          : [
              { id: 'varsayilan-ana-yemekler', restaurantId, ad: 'Ana Yemekler', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true },
              { id: 'varsayilan-icecekler', restaurantId, ad: 'İçecekler', departman: 'Bar', kdvOrani: 20, mutfagaGitsin: false },
              { id: 'varsayilan-tatlilar', restaurantId, ad: 'Tatlılar', departman: 'Tatlı', kdvOrani: 10, mutfagaGitsin: true },
            ];
      });
      return;
    }

    const temizGruplar = (Array.isArray(data) ? data : []).map(g => ({
      id: g.id,
      restaurantId: g.restaurant_id,
      ad: g.ad,
      departman: g.departman || 'Mutfak',
      kdvOrani: Number(g.kdv_orani || 10),
      mutfagaGitsin: g.mutfaga_gitsin !== false,
    }));

    const gruplar = temizGruplar.length > 0
      ? temizGruplar
      : [
          { id: 'varsayilan-ana-yemekler', restaurantId, ad: 'Ana Yemekler', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true },
          { id: 'varsayilan-icecekler', restaurantId, ad: 'İçecekler', departman: 'Bar', kdvOrani: 20, mutfagaGitsin: false },
          { id: 'varsayilan-tatlilar', restaurantId, ad: 'Tatlılar', departman: 'Tatlı', kdvOrani: 10, mutfagaGitsin: true },
        ];

    setMenuGruplari(gruplar);

    if (!gruplar.some(g => g.ad === aktifMenuGrubu)) {
      setAktifMenuGrubu(gruplar[0]?.ad || 'Genel');
    }
  };

    // login
  // kullanıcı, garson ve süper admin giriş işlemini yöneten kod
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert('Lütfen e-posta ve şifre girin.');
      return;
    }

    // Super admin demo girişi
    if (email === 'admin@integra.com' && password === 'admin123') {
      setUser({
        id: 'super_admin',
        email: 'admin@integra.com',
        restaurant: 'Integra Admin',
        restaurantId: 'super_admin',
        role: 'super_admin',
        durum: 'Aktif',
      });

      setScreen('dashboard');
      setActiveTab('super_admin');

      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data) {
        const temizListe = data.map(r => ({
          id: r.id,
          ad: r.restaurant_name || r.name,
          email: r.email,
          durum: r.durum || 'Onay Bekliyor',
          rol: r.rol || 'owner',
          paketAdi: r.paket_adi || 'Starter',
          aylikUcret: Number(r.aylik_ucret || 0),
          sonOdemeTarihi: r.son_odeme_tarihi || '',
          lisansDurumu: r.lisans_durumu || r.durum || 'Aktif',
          kullaniciLimiti: Number(r.kullanici_limiti || 3),
        }));

        setRestoranlar(temizListe);
      } else {
        console.error('Admin restoran listesi çekilemedi:', error);
      }

      return;
    }

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !data) {
      console.error('Giriş hatası:', error);
      alert('E-posta veya şifre hatalı.');
      return;
    }

    if (data.durum !== 'Aktif') {
      alert('Hesabınız henüz aktif değil. Lütfen admin onayını bekleyin.');
      return;
    }

    // giriş yapan kullanıcı bilgisini uygulama formatına çeviren kod
    const girenKullanici = {
      id: data.id,
      email: data.email,
      restaurant: data.restaurant_name || data.name,
      restaurantId: data.id,
      parentRestaurantId: data.parentRestaurantId || data.parent_restaurant_id || data.id,
      role: data.rol,
      durum: data.durum,
      waiterName: data.waiter_name || data.name || data.restaurant_name || data.email,
      personelId: data.personel_id || null,
      personelGorev: data.personel_gorev || data.gorev || (data.rol === 'owner' ? 'İşletme Sahibi' : 'Garson'),
      tabYetkileri: yetkiListesiniHazirla(data.tab_yetkileri, data.personel_gorev || 'Garson'),
      kullaniciLimiti: Number(data.kullanici_limiti || 3),
    };

    localStorage.setItem('integra_user', JSON.stringify(girenKullanici));
    localStorage.setItem('integra_screen', 'dashboard');

    const girisTab = ilkGirisSekmesi(data.rol, data.tab_yetkileri, data.personel_gorev || 'Garson');
    localStorage.setItem('integra_activeTab', girisTab);

    setUser(girenKullanici);
    setScreen('dashboard');
    setActiveTab(girisTab);

    try {
      const aktifRestaurantId =
        data.rol === 'waiter'
          ? data.parent_restaurant_id || data.parentRestaurantId || data.id
          : data.id;

      await masaBolumleriniSupabasedenCek(aktifRestaurantId);
      await masalariSupabasedenCek(aktifRestaurantId);
      await menuGruplariniSupabasedenCek(aktifRestaurantId);
      await menuUrunleriniSupabasedenCek(aktifRestaurantId);

      if (typeof paketSiparisleriniSupabasedenCek === 'function') {
        await paketSiparisleriniSupabasedenCek(aktifRestaurantId);
      }

      if (typeof paketMusterileriniSupabasedenCek === 'function') {
        await paketMusterileriniSupabasedenCek(aktifRestaurantId);
      }

      if (typeof cariMusterileriSupabasedenCek === 'function') {
        await cariMusterileriSupabasedenCek(aktifRestaurantId);
      }

      if (typeof kasaHareketleriniSupabasedenCek === 'function') {
        await kasaHareketleriniSupabasedenCek(aktifRestaurantId);
      }

      if (typeof personelleriSupabasedenCek === 'function') {
        await personelleriSupabasedenCek(aktifRestaurantId);
      }

      if (data.rol === 'owner') {
        await garsonlariSupabasedenCek(data.id);
      }

      if (typeof satisGecmisiniSupabasedenCek === 'function') {
        await satisGecmisiniSupabasedenCek(aktifRestaurantId);
      }
    } catch (err) {
      console.error('Giriş sonrası veri çekme hatası:', err);
    }
  };
  // mutfak fişlerini Supabase'den çeken kod
  const mutfakFisleriniSupabasedenCek = async (restaurantId) => {
    const { data, error } = await supabase
      .from('mutfak_fisleri')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('durum', 'Bekliyor')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Mutfak fişleri çekilemedi:', error);
      return;
    }

    const temizFisler = (Array.isArray(data) ? data : []).map(f => ({
      id: f.id,
      restaurantId: f.restaurant_id,
      masaId: f.masa_id,
      masaAdi: f.masa_adi,
      urunAdi: f.urun_adi,
      adet: Number(f.adet || 1),
      notMetni: f.not_metni || '',
      departman: f.departman || 'Mutfak',
      garsonAdi: f.garson_adi || '-',
      durum: f.durum || 'Bekliyor',
      createdAt: f.created_at,
    }));

    setMutfakFisleri(temizFisler);
  };

  // satış geçmişini Supabase'den çekip raporlara aktaran kod
  const satisGecmisiniSupabasedenCek = async (restaurantId) => {
    const { data, error } = await supabase
      .from('satis_gecmisi')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .or('gun_sonu_kapatildi.is.null,gun_sonu_kapatildi.eq.false')
      .or('gunsonu_kapandi.is.null,gunsonu_kapandi.eq.false')
      .order('id', { ascending: false });

    if (error) {
      console.error('Satış geçmişi çekilemedi:', error);
      alert('Satış geçmişi çekilemedi: ' + error.message);
      return;
    }

    const temizSatislar = data.map(s => ({
      id: s.id,
      restaurantId: s.restaurant_id,
      masaId: s.masa_id,
      masaAdi: s.masa_adi || null,
      musteriAdi: s.musteri_adi || '',
      ad: s.ad,
      fiyat: Number(s.fiyat || 0),
      adet: Number(s.adet || 1),
      tarih: s.tarih || String(s.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0],
      not: s.urun_notu || '',
      ekstraUcret: Number(s.ekstra_ucret || 0),
      normalFiyat: Number(s.normal_fiyat || s.fiyat || 0),
      listeFiyati: Number(s.liste_fiyati || s.normal_fiyat || s.fiyat || 0),
      satisFiyati: Number(s.satis_fiyati || s.fiyat || 0),
      indirimYuzde: Number(s.indirim_yuzde || 0),
      indirimTutari: Number(s.indirim_tutari || 0),
      fiyatDegistirildi: Boolean(s.fiyat_degistirildi),
      ikram: Boolean(s.ikram),
      menuGrubu: s.menu_grubu || 'Genel',
      departman: s.departman || 'Mutfak',
      kdvOrani: Number(s.kdv_orani || 10),
      garsonAdi: s.garson_adi || '',
      siparisTipi: s.siparis_tipi || 'Masa',
      paketSiparisId: s.paket_siparis_id || null,
      gunSonuKapandi: Boolean(s.gun_sonu_kapatildi || s.gunsonu_kapandi),
      gunSonuRaporId: s.gun_sonu_rapor_id || s.gunsonu_rapor_id || null,

      // ödeme bilgilerini sayfa yenilenince koruyan kod
      odemeTipi: s.odeme_tipi || 'Belirtilmedi',
      odemeler: Array.isArray(s.odemeler) ? s.odemeler : [],

      // kapalı adisyon geçmişi için gerekli kod
      adisyonId: s.adisyon_id || null,
      adisyonAcilisSaati: s.adisyon_acilis_saati || null,
      adisyonKapanisSaati: s.adisyon_kapanis_saati || null,
    }));

    setSatisGecmisi(temizSatislar);
  };

  // paket servis siparişlerini Supabase'den çeken kod
  const paketSiparisleriniSupabasedenCek = async (restaurantId) => {
    const { data, error } = await supabase
      .from('paket_siparisleri')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .or('gun_sonu_kapatildi.is.null,gun_sonu_kapatildi.eq.false')
      .or('gunsonu_kapandi.is.null,gunsonu_kapandi.eq.false')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Paket siparişleri çekilemedi:', error);
      setPaketSiparisleri([]);
      return;
    }

    const temizListe = (Array.isArray(data) ? data : []).map(p => ({
      id: p.id,
      restaurantId: p.restaurant_id,
      paketMusteriId: p.paket_musteri_id || null,
      musteriAdi: p.musteri_adi || '',
      telefon: p.telefon || '',
      adres: p.adres || '',
      notMetni: p.not_metni || '',
      durum: p.durum || 'Hazırlanıyor',
      odemeTipi: p.odeme_tipi || 'Bekliyor',
      tutar: Number(p.tutar || 0),
      urunler: Array.isArray(p.urunler) ? p.urunler : [],
      odendi: Boolean(p.odendi),
      alinanTutar: Number(p.alinan_tutar || 0),
      paraUstu: Number(p.para_ustu || 0),
      kapanisSaati: p.kapanis_saati || null,
      kuryeAdi: p.kurye_adi || '',
      kuryePersonelId: p.kurye_personel_id || null,
      yolaCikisSaati: p.yola_cikis_saati || null,
      teslimSaati: p.teslim_saati || null,
      gunSonuKapandi: Boolean(p.gun_sonu_kapatildi || p.gunsonu_kapandi),
      gunSonuRaporId: p.gun_sonu_rapor_id || p.gunsonu_rapor_id || null,
      gunSonuKapanisSaati: p.gun_sonu_kapanis_saati || null,
      createdAt: p.created_at,
    }));

    setPaketSiparisleri(temizListe);
  };

  // paket servis kayıtlı müşterilerini Supabase'den çeken kod
  const paketMusterileriniSupabasedenCek = async (restaurantId) => {
    const { data, error } = await supabase
      .from('paket_musterileri')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('id', { ascending: false });

    if (error) {
      console.error('Paket servis müşterileri çekilemedi:', error);
      setPaketMusterileri([]);
      return;
    }

    const temizListe = (Array.isArray(data) ? data : []).map(m => ({
      id: m.id,
      restaurantId: m.restaurant_id,
      ad: m.ad || '',
      telefon: m.telefon || '',
      adres: m.adres || '',
      notMetni: m.not_metni || '',
      createdAt: m.created_at,
    }));

    setPaketMusterileri(temizListe);
  };

  // paket servis kayıtlı müşteri seçilince bilgileri forma dolduran kod
  const paketMusterisiSec = (musteriId) => {
    setSeciliPaketMusteriId(musteriId);

    if (!musteriId) {
      setPaketMusteriAdi('');
      setPaketTelefon('');
      setPaketAdres('');
      setPaketNotu('');
      setPaketMusteriArama('');
      return;
    }

    const musteri = paketMusterileri.find(m => String(m.id) === String(musteriId));

    if (!musteri) {
      return;
    }

    setPaketMusteriAdi(musteri.ad || '');
    setPaketTelefon(musteri.telefon || '');
    setPaketAdres(musteri.adres || '');
    setPaketNotu(musteri.notMetni || '');
    setPaketMusteriArama(`${musteri.ad || ''}${musteri.telefon ? ` - ${musteri.telefon}` : ''}`);
  };

  // cariye yazarken müşteri seçimini klavyeden aramaya uygun yapan kod
  const cariAdisyonMusterisiSec = (musteriId) => {
    setCariAdisyonMusteriId(musteriId);

    if (!musteriId) {
      setCariAdisyonArama('');
      return;
    }

    const cari = cariMusteriler.find(c => String(c.id) === String(musteriId));

    if (!cari) {
      return;
    }

    setCariAdisyonArama(`${cari.ad || ''}${cari.telefon ? ` - ${cari.telefon}` : ''}`);
  };

  // paket servis müşterisini kaydeden veya mevcut kaydı güncelleyen kod
  const paketMusterisiniKaydetVeyaGuncelle = async () => {
    if (!paketMusteriKaydedilsin) {
      return null;
    }

    const ad = String(paketMusteriAdi || '').trim();
    const telefon = String(paketTelefon || '').trim();
    const adres = String(paketAdres || '').trim();
    const notMetni = String(paketNotu || '').trim();

    if (!ad || !telefon) {
      return null;
    }

    const seciliMusteri = seciliPaketMusteriId
      ? paketMusterileri.find(m => String(m.id) === String(seciliPaketMusteriId))
      : null;

    const telefonlaBulunan = paketMusterileri.find(m => {
      return String(m.telefon || '').trim() === telefon;
    });

    const guncellenecekMusteri = seciliMusteri || telefonlaBulunan || null;

    if (guncellenecekMusteri) {
      const { data, error } = await supabase
        .from('paket_musterileri')
        .update({
          ad,
          telefon,
          adres,
          not_metni: notMetni,
        })
        .eq('id', guncellenecekMusteri.id)
        .eq('restaurant_id', mevcutRestaurantId)
        .select()
        .single();

      if (error) {
        console.error('Paket servis müşterisi güncellenemedi:', error);
        alert('Paket müşterisi güncellenemedi: ' + error.message);
        return null;
      }

      const guncelMusteri = {
        id: data.id,
        restaurantId: data.restaurant_id,
        ad: data.ad || '',
        telefon: data.telefon || '',
        adres: data.adres || '',
        notMetni: data.not_metni || '',
        createdAt: data.created_at,
      };

      setPaketMusterileri(prev => {
        const liste = Array.isArray(prev) ? prev : [];
        return liste.map(m => String(m.id) === String(guncelMusteri.id) ? guncelMusteri : m);
      });

      return guncelMusteri.id;
    }

    const { data, error } = await supabase
      .from('paket_musterileri')
      .insert([
        {
          restaurant_id: mevcutRestaurantId,
          ad,
          telefon,
          adres,
          not_metni: notMetni,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Paket servis müşterisi kaydedilemedi:', error);
      alert('Paket müşterisi kaydedilemedi: ' + error.message);
      return null;
    }

    const yeniMusteri = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad || '',
      telefon: data.telefon || '',
      adres: data.adres || '',
      notMetni: data.not_metni || '',
      createdAt: data.created_at,
    };

    setPaketMusterileri(prev => [
      yeniMusteri,
      ...(Array.isArray(prev) ? prev : []),
    ]);

    return yeniMusteri.id;
  };

  // cari/veresiye müşterilerini Supabase'den çeken kod
  const cariMusterileriSupabasedenCek = async (restaurantId) => {
    const { data, error } = await supabase
      .from('cari_musteriler')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('id', { ascending: false });

    if (error) {
      console.error('Cari müşteriler çekilemedi:', error);
      setCariMusteriler([]);
      return;
    }

    const temizListe = (Array.isArray(data) ? data : []).map(c => ({
      id: c.id,
      restaurantId: c.restaurant_id,
      ad: c.ad || '',
      telefon: c.telefon || '',
      bakiye: Number(c.bakiye || 0),
      notMetni: c.not_metni || '',
      hareketler: Array.isArray(c.hareketler) ? c.hareketler : [],
      createdAt: c.created_at,
    }));

    setCariMusteriler(temizListe);
  };

  // kasa hareketlerini Supabase'den çeken kod
  const kasaHareketleriniSupabasedenCek = async (restaurantId) => {
    const bugun = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('kasa_hareketleri')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('tarih', bugun)
      .or('gun_sonu_kapatildi.is.null,gun_sonu_kapatildi.eq.false')
      .or('gunsonu_kapandi.is.null,gunsonu_kapandi.eq.false')
      .order('id', { ascending: false });

    if (error) {
      console.error('Kasa hareketleri çekilemedi:', error);
      setKasaHareketleri([]);
      return;
    }

    const temizListe = (Array.isArray(data) ? data : []).map(k => ({
      id: k.id,
      restaurantId: k.restaurant_id,
      tarih: k.tarih,
      tip: k.tip,
      aciklama: k.aciklama || '',
      tutar: Number(k.tutar || 0),
      createdAt: k.created_at,
    }));

    setKasaHareketleri(temizListe);
  };


  // gün sonu Z raporlarını Supabase'den çeken kod
  const zRaporlariniSupabasedenCek = async (restaurantId) => {
    const { data, error } = await supabase
      .from('z_raporlari')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Z raporları çekilemedi:', error);
      setZRaporlari([]);
      return;
    }

    const temizListe = (Array.isArray(data) ? data : []).map(z => ({
      id: z.id,
      restaurantId: z.restaurant_id,
      tarih: z.tarih,
      toplamCiro: Number(z.toplam_ciro || 0),
      nakitSatis: Number(z.nakit_satis || 0),
      kartSatis: Number(z.kart_satis || 0),
      giderToplam: Number(z.gider_toplam || 0),
      maliyetToplam: Number(z.maliyet_toplam || 0),
      tahminiKar: Number(z.tahmini_kar || 0),
      beklenenKasa: Number(z.beklenen_kasa || 0),
      gercekKasa: Number(z.gercek_kasa || 0),
      kasaFarki: Number(z.kasa_farki || 0),
      detaylar: z.detaylar || {},
      createdAt: z.created_at,
    }));

    setZRaporlari(temizListe);
  };

  // giderleri Supabase'den çeken kod
  const giderleriSupabasedenCek = async (restaurantId) => {
    const bugun = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('giderler')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('tarih', bugun)
      .or('gun_sonu_kapatildi.is.null,gun_sonu_kapatildi.eq.false')
      .or('gunsonu_kapandi.is.null,gunsonu_kapandi.eq.false')
      .order('id', { ascending: false });

    if (error) {
      console.error('Giderler çekilemedi:', error);
      setGiderler([]);
      return;
    }

    setGiderler((Array.isArray(data) ? data : []).map(g => ({
      id: g.id,
      restaurantId: g.restaurant_id,
      tarih: g.tarih,
      kategori: g.kategori || 'Diğer',
      aciklama: g.aciklama || '',
      tutar: Number(g.tutar || 0),
      createdAt: g.created_at,
      gunSonuKapandi: Boolean(g.gun_sonu_kapatildi || g.gunsonu_kapandi),
      gunSonuRaporId: g.gun_sonu_rapor_id || g.gunsonu_rapor_id || null,
    })));
  };

  // iade / ikram kayıtlarını Supabase'den çeken kod
  const iadeKayitlariniSupabasedenCek = async (restaurantId) => {
    const bugun = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('iade_kayitlari')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('tarih', bugun)
      .or('gun_sonu_kapatildi.is.null,gun_sonu_kapatildi.eq.false')
      .or('gunsonu_kapandi.is.null,gunsonu_kapandi.eq.false')
      .order('id', { ascending: false });

    if (error) {
      console.error('İade/ikram kayıtları çekilemedi:', error);
      setIadeKayitlari([]);
      return;
    }

    setIadeKayitlari((Array.isArray(data) ? data : []).map(i => ({
      id: i.id,
      restaurantId: i.restaurant_id,
      tarih: i.tarih,
      tip: i.tip || 'İade',
      sebep: i.sebep || '',
      urunId: i.urun_id,
      urunAdi: i.urun_adi || '',
      adet: Number(i.adet || 1),
      tutar: Number(i.tutar || 0),
      kullaniciAdi: i.kullanici_adi || '',
      createdAt: i.created_at,
      gunSonuKapandi: Boolean(i.gun_sonu_kapatildi || i.gunsonu_kapandi),
      gunSonuRaporId: i.gun_sonu_rapor_id || i.gunsonu_rapor_id || null,
    })));
  };

  // rezervasyonları Supabase'den çeken kod
  const rezervasyonlariSupabasedenCek = async (restaurantId) => {
    const { data, error } = await supabase
      .from('rezervasyonlar')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('rezervasyon_zamani', { ascending: true });

    if (error) {
      console.error('Rezervasyonlar çekilemedi:', error);
      setRezervasyonlar([]);
      return;
    }

    setRezervasyonlar((Array.isArray(data) ? data : []).map(r => ({
      id: r.id,
      restaurantId: r.restaurant_id,
      musteriAdi: r.musteri_adi || '',
      telefon: r.telefon || '',
      cariMusteriId: r.cari_musteri_id || null,
      kisiSayisi: Number(r.kisi_sayisi || 0),
      rezervasyonZamani: r.rezervasyon_zamani,
      rezervasyonBitisZamani: r.rezervasyon_bitis_zamani || null,
      masaId: r.masa_id,
      masaAdi: r.masa_adi || '',
      notMetni: r.not_metni || '',
      durum: r.durum || 'Bekliyor',
      createdAt: r.created_at,
    })));
  };

  // register
  // yeni restoran başvurusu oluşturan ve varsayılan masaları ekleyen kod
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!restaurantName || !email || !password) {
      alert('Lütfen restoran adı, e-posta ve şifre girin.');
      return;
    }

    const { data: existingUser } = await supabase
      .from('restaurants')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      alert('Bu e-posta ile zaten kayıt yapılmış.');
      return;
    }

    const { data: yeniRestoran, error } = await supabase
      .from('restaurants')
      .insert([
        {
          name: restaurantName,
          restaurant_name: restaurantName,
          email: email,
          password: password,
          durum: 'Onay Bekliyor',
          rol: 'owner',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Kayıt hatası:', error);
      alert('Kayıt oluşturulamadı: ' + error.message);
      return;
    }

    console.log('Yeni restoran:', yeniRestoran);

    const { data: olusanMasalar, error: masaError } = await supabase
      .from('masalar')
      .insert([
        {
          restaurant_id: yeniRestoran.id,
          ad: 'Masa 1',
          dolu: false,
          tutar: 0,
          siparisler: [],
          odemeler: [],
        },
        {
          restaurant_id: yeniRestoran.id,
          ad: 'Masa 2',
          dolu: false,
          tutar: 0,
          siparisler: [],
          odemeler: [],
        },
        {
          restaurant_id: yeniRestoran.id,
          ad: 'Masa 3',
          dolu: false,
          tutar: 0,
          siparisler: [],
          odemeler: [],
        },
      ])
      .select();

    if (masaError) {
      console.error('Masa oluşturma hatası:', masaError);
      alert('Restoran kaydı oluşturuldu ama masalar eklenemedi: ' + masaError.message);
      return;
    }

    console.log('Oluşan masalar:', olusanMasalar);

    alert('Kayıt başarılı. Varsayılan masalar oluşturuldu. Admin onayından sonra giriş yapabilirsiniz.');

    setRestaurantName('');
    setEmail('');
    setPassword('');
    setScreen('login');
  };

  // süper adminin restoran durumunu aktif veya kapalı yapmasını sağlayan kod
  const restoranDurumDegistir = async (id, yeniDurum) => {
    const { data, error } = await supabase
      .from('restaurants')
      .update({ durum: yeniDurum })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Durum güncelleme hatası:', error);
      alert('Durum güncellenemedi: ' + error.message);
      return;
    }

    setRestoranlar(restoranlar.map(r => {
      if (r.id === id) {
        return {
          ...r,
          durum: data.durum,
        };
      }
      return r;
    }));

    alert('Restoran durumu kalıcı olarak güncellendi: ' + data.durum);
  };

  // seçilen ürünü aktif masaya adet, hazır not, manuel not ve ekstra fiyat ile ekleyen kod
  const masayaSeciliUrunuEkle = async () => {
    if (!seciliUrunId) {
      alert('Lütfen menüden bir ürün seçin!');
      return;
    }

    const adet = Number(seciliUrunAdet || 1);

    if (!adet || adet <= 0) {
      alert('Lütfen geçerli bir adet girin.');
      return;
    }

    const urun = aktifMenu.find(u => String(u.id) === String(seciliUrunId));

    if (!urun) {
      alert('Ürün bulunamadı.');
      return;
    }

    const masa = activeMasa;

    if (!masa) {
      alert('Lütfen bir masa seçin.');
      return;
    }

    const hazirNotlar = Array.isArray(urun.menuNotlari) ? urun.menuNotlari : [];

    const seciliHazirNot = hazirNotlar.find(n => {
      return String(n.id) === String(seciliUrunHazirNotId);
    });

    const fiyatBilgisi = urunFiyatHesapla(
      urun,
      seciliUrunHazirNotId,
      seciliUrunEkstraFiyat,
      seciliUrunSatisFiyati,
      seciliUrunIndirimYuzde,
      seciliUrunIndirimTutari
    );

    const ekstraFiyat = fiyatBilgisi.ekstraFiyat;

    if (ekstraFiyat < 0) {
      alert('Ekstra fiyat negatif olamaz.');
      return;
    }

    const notMetni = seciliHazirNot
      ? seciliHazirNot.ad
      : String(seciliUrunNotu || '').trim();

    const normalFiyat = fiyatBilgisi.normalFiyat;
    const listeFiyati = fiyatBilgisi.listeFiyati;
    const satisFiyati = fiyatBilgisi.satisFiyati;
    const indirimYuzde = fiyatBilgisi.indirimYuzde;
    const indirimTutari = fiyatBilgisi.indirimTutari;
    const birimFiyat = fiyatBilgisi.birimFiyat;
    const fiyatDegistirildi = fiyatBilgisi.fiyatDegistirildi;

    const mevcutSiparisler = Array.isArray(masa.siparisler)
      ? masa.siparisler
      : [];

    const mevcutSiparisIndex = mevcutSiparisler.findIndex(s => {
      return (
        s.ad === urun.ad &&
        String(s.not || '') === String(notMetni || '') &&
        Number(s.ekstraUcret || 0) === Number(ekstraFiyat || 0) &&
        Number(s.satisFiyati || s.fiyat || 0) === Number(satisFiyati || 0) &&
        Number(s.indirimYuzde || 0) === Number(indirimYuzde || 0) &&
        Number(s.indirimTutari || 0) === Number(indirimTutari || 0)
      );
    });

    let yeniSiparisler = [...mevcutSiparisler];

    if (mevcutSiparisIndex > -1) {
      yeniSiparisler[mevcutSiparisIndex] = {
        ...yeniSiparisler[mevcutSiparisIndex],
        adet: Number(yeniSiparisler[mevcutSiparisIndex].adet || 0) + adet,
      };
    } else {
      yeniSiparisler.push({
        urunId: urun.id,
        ad: urun.ad,
        fiyat: birimFiyat,
        normalFiyat: normalFiyat,
        listeFiyati: listeFiyati,
        satisFiyati: satisFiyati,
        ekstraUcret: ekstraFiyat,
        indirimYuzde: indirimYuzde,
        indirimTutari: indirimTutari,
        fiyatDegistirildi: fiyatDegistirildi,
        not: notMetni,
        adet: adet,
        menuGrubu: urun.menuGrubu || urun.kategori || 'Genel',
        departman: urun.departman || 'Mutfak',
        kdvOrani: Number(urun.kdvOrani || 10),
        mutfagaGitsin: urun.mutfagaGitsin !== false,
      });
    }

    const yeniTutar = Number(masa.tutar || 0) + birimFiyat * adet;

    // masa ilk kez doluyorsa adisyon açılış saatini belirleyen kod
    const adisyonAcilisSaati =
      masa.adisyonAcilisSaati || new Date().toISOString();
    // masayı açan garson adını belirleyen kod
    const adisyonGarsonAdi =
      masa.adisyonGarsonAdi ||
      (user?.role === 'waiter'
        ? user?.waiterName || user?.restaurant || user?.email
        : 'İşletme Sahibi');

    const { data, error } = await supabase
      .from('masalar')
      .update({
        dolu: true,
        tutar: yeniTutar,
        siparisler: yeniSiparisler,
        adisyon_acilis_saati: adisyonAcilisSaati,
        adisyon_garson_adi: adisyonGarsonAdi,
      })
      .eq('id', masa.id)
      .select()
      .single();

    if (error) {
      console.error('Adisyon güncelleme hatası:', error);
      alert('Ürün masaya eklenemedi: ' + error.message);
      return;
    }

    const guncelMasa = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      dolu: data.dolu || false,
      tutar: Number(data.tutar || 0),
      siparisler: Array.isArray(data.siparisler) ? data.siparisler : [],
      odemeler: Array.isArray(data.odemeler) ? data.odemeler : [],
      adisyonAcilisSaati: data.adisyon_acilis_saati || null,
      adisyonGarsonAdi: data.adisyon_garson_adi || adisyonGarsonAdi || '',
      musteriAdi: data.musteri_adi || masa.musteriAdi || '',

      // masanın bölüm bilgisini koruyan kod
      bolum: data.bolum || masa.bolum || aktifMasaBolumu || 'Salon',
    };

    setMasalar(masalar.map(m => {
      if (m.id === guncelMasa.id) {
        return guncelMasa;
      }

      return m;
    }));

    // ürün mutfağa gönderilecek olarak işaretlendiyse mutfak fişi oluşturan kod
    if (urun.mutfagaGitsin !== false) {
      const garsonAdi =
        user?.role === 'waiter'
          ? user?.waiterName || user?.restaurant || user?.email
          : 'İşletme Sahibi';

      const { data: mutfakData, error: mutfakError } = await supabase
        .from('mutfak_fisleri')
        .insert([
          {
            restaurant_id: mevcutRestaurantId,
            masa_id: masa.id,
            masa_adi: masa.ad,
            urun_adi: urun.ad,
            adet: adet,
            not_metni: notMetni || '',
            departman: urun.departman || 'Mutfak',
            garson_adi: garsonAdi,
            durum: 'Bekliyor',
          },
        ])
        .select()
        .single();

      if (mutfakError) {
        console.error('Mutfak fişi oluşturulamadı:', mutfakError);
        alert('Mutfak fişi oluşturulamadı: ' + mutfakError.message);
      } else {
        const yeniMutfakFisi = {
          id: mutfakData.id,
          restaurantId: mutfakData.restaurant_id,
          masaId: mutfakData.masa_id,
          masaAdi: mutfakData.masa_adi,
          urunAdi: mutfakData.urun_adi,
          adet: Number(mutfakData.adet || 1),
          notMetni: mutfakData.not_metni || '',
          departman: mutfakData.departman || urun.departman || 'Mutfak',
          garsonAdi: mutfakData.garson_adi || '-',
          durum: mutfakData.durum || 'Bekliyor',
          createdAt: mutfakData.created_at,
        };

        setMutfakFisleri(prev => [
          yeniMutfakFisi,
          ...(Array.isArray(prev) ? prev : []),
        ]);

        if (typeof mutfakFisleriniSupabasedenCek === 'function') {
          await mutfakFisleriniSupabasedenCek(mevcutRestaurantId);
        }
      }
    }

    setSeciliUrunId('');
    setSeciliUrunAdet(1);
    setSeciliUrunHazirNotId('');
    setSeciliUrunNotu('');
    setSeciliUrunEkstraFiyat('');
    setSeciliUrunSatisFiyati('');
    setSeciliUrunIndirimYuzde('');
    setSeciliUrunIndirimTutari('');
  };
  // adisyondaki seçilen sipariş satırından bir adet eksilten ve Supabase'i güncelleyen kod
  const adisyondanUrunEksilt = async (siparisIndex) => {
    const masa = activeMasa;

    if (!masa) {
      alert('Masa bulunamadı.');
      return;
    }

    const hedefSiparis = masa.siparisler[siparisIndex];

    if (!hedefSiparis) {
      return;
    }

    const yeniSiparisler = masa.siparisler
      .map((s, index) => {
        if (index === siparisIndex) {
          return {
            ...s,
            adet: Number(s.adet || 1) - 1,
          };
        }

        return s;
      })
      .filter(s => Number(s.adet || 0) > 0);

    const yeniTutar = Math.max(
      Number(masa.tutar || 0) - Number(hedefSiparis.fiyat || 0),
      0
    );

    const { data, error } = await supabase
      .from('masalar')
      .update({
        dolu: yeniSiparisler.length > 0,
        tutar: yeniTutar,
        siparisler: yeniSiparisler,
        adisyon_acilis_saati: yeniSiparisler.length > 0 ? masa.adisyonAcilisSaati : null,
        adisyon_garson_adi: yeniSiparisler.length > 0 ? masa.adisyonGarsonAdi : null,
      })
      .eq('id', masa.id)
      .select()
      .single();

    if (error) {
      console.error('Ürün eksiltme hatası:', error);
      alert('Ürün eksiltilemedi: ' + error.message);
      return;
    }

    const guncelMasa = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      dolu: data.dolu || false,
      tutar: Number(data.tutar || 0),
      siparisler: Array.isArray(data.siparisler) ? data.siparisler : [],
      odemeler: Array.isArray(data.odemeler) ? data.odemeler : [],
      adisyonAcilisSaati: data.adisyon_acilis_saati || null,
      adisyonGarsonAdi: data.adisyon_garson_adi || masa.adisyonGarsonAdi || '',
      musteriAdi: data.musteri_adi || masa.musteriAdi || '',

      // masanın bölüm bilgisini koruyan kod
      bolum: data.bolum || masa.bolum || aktifMasaBolumu || 'Salon',
    };

    setMasalar(masalar.map(m => {
      if (m.id === guncelMasa.id) {
        return guncelMasa;
      }

      return m;
    }));
  };

  // adisyonda seçili satırdan 1 ürünü ikram eden kod
  const adisyondaBirUrunIkramEt = async (siparisIndex) => {
    const masa = activeMasa;

    if (!masa || !Array.isArray(masa.siparisler)) {
      alert('Masa veya sipariş bulunamadı.');
      return;
    }

    const hedefSiparis = masa.siparisler[siparisIndex];

    if (!hedefSiparis) {
      return;
    }

    if (hedefSiparis.ikram || Number(hedefSiparis.fiyat || 0) <= 0) {
      alert('Bu satır zaten ikram.');
      return;
    }

    const birimFiyat = Number(hedefSiparis.fiyat || 0);
    const yeniSiparisler = Array.isArray(masa.siparisler) ? [...masa.siparisler] : [];

    const kalanAdet = Number(hedefSiparis.adet || 1) - 1;

    if (kalanAdet > 0) {
      yeniSiparisler[siparisIndex] = {
        ...hedefSiparis,
        adet: kalanAdet,
      };
    } else {
      yeniSiparisler.splice(siparisIndex, 1);
    }

    const ikramNotu = hedefSiparis.not ? `${hedefSiparis.not} / İkram` : 'İkram';
    const mevcutIkramIndex = yeniSiparisler.findIndex(s => {
      return s.ikram && s.ad === hedefSiparis.ad && String(s.not || '') === String(ikramNotu || '');
    });

    if (mevcutIkramIndex > -1) {
      yeniSiparisler[mevcutIkramIndex] = {
        ...yeniSiparisler[mevcutIkramIndex],
        adet: Number(yeniSiparisler[mevcutIkramIndex].adet || 0) + 1,
      };
    } else {
      yeniSiparisler.push({
        ...hedefSiparis,
        fiyat: 0,
        satisFiyati: 0,
        indirimTutari: Number(hedefSiparis.listeFiyati || hedefSiparis.normalFiyat || birimFiyat),
        indirimYuzde: 100,
        fiyatDegistirildi: true,
        adet: 1,
        ikram: true,
        not: ikramNotu,
      });
    }

    const yeniTutar = Math.max(Number(masa.tutar || 0) - birimFiyat, 0);

    const { data, error } = await supabase
      .from('masalar')
      .update({
        dolu: yeniSiparisler.length > 0,
        tutar: yeniTutar,
        siparisler: yeniSiparisler,
        adisyon_acilis_saati: yeniSiparisler.length > 0 ? masa.adisyonAcilisSaati : null,
        adisyon_garson_adi: yeniSiparisler.length > 0 ? masa.adisyonGarsonAdi : null,
      })
      .eq('id', masa.id)
      .select()
      .single();

    if (error) {
      console.error('İkram işlemi yapılamadı:', error);
      alert('İkram işlemi yapılamadı: ' + error.message);
      return;
    }

    const guncelMasa = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      dolu: data.dolu || false,
      tutar: Number(data.tutar || 0),
      siparisler: Array.isArray(data.siparisler) ? data.siparisler : [],
      odemeler: Array.isArray(data.odemeler) ? data.odemeler : [],
      adisyonAcilisSaati: data.adisyon_acilis_saati || null,
      adisyonGarsonAdi: data.adisyon_garson_adi || masa.adisyonGarsonAdi || '',
      musteriAdi: data.musteri_adi || masa.musteriAdi || '',
      bolum: data.bolum || masa.bolum || aktifMasaBolumu || 'Salon',
    };

    setMasalar(masalar.map(m => m.id === guncelMasa.id ? guncelMasa : m));
  };
  // HTML içeriğini termal fiş penceresine gönderip yazdıran yardımcı kod
  const yazdirHtml = (html, pencereBasligi = 'Fiş') => {
    const printWindow = window.open('', '_blank', 'width=420,height=720');

    if (!printWindow) {
      alert('Yazdırma penceresi açılamadı. Tarayıcı pop-up iznini kontrol edin.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.document.title = pencereBasligi;
  };

  // masa siparişlerini termal fiş satırlarına çeviren kod
  const fisUrunSatirlariHazirla = (siparisler = []) => {
    return siparisler.map(s => {
      const adet = Number(s.adet || 1);
      const fiyat = Number(s.fiyat || 0);
      const satirToplam = adet * fiyat;
      const notSatiri = s.not ? `<div class="muted">Not: ${s.not}</div>` : '';
      const ekstraSatiri = Number(s.ekstraUcret || 0) > 0 ? `<div class="muted">Ekstra: +${Number(s.ekstraUcret || 0)} TL</div>` : '';
      const fiyatDegistiSatiri = s.fiyatDegistirildi ? `<div class="muted">Satış fiyatı: ${Number(s.satisFiyati || s.fiyat || 0)} TL</div>` : '';
      const indirimSatiri = Number(s.indirimTutari || 0) > 0
        ? `<div class="muted">İndirim: ${Number(s.indirimTutari || 0)} TL${Number(s.indirimYuzde || 0) > 0 ? ` / %${Number(s.indirimYuzde || 0)}` : ''}</div>`
        : '';
      const ikramSatiri = s.ikram ? `<div class="muted"><strong>İkram</strong></div>` : '';

      return `
        <div class="item">
          <div>
            <strong>${s.ad}</strong>
            <div class="muted">${adet} x ${fiyat} TL</div>
            ${notSatiri}
            ${ekstraSatiri}
            ${fiyatDegistiSatiri}
            ${indirimSatiri}
            ${ikramSatiri}
          </div>
          <strong>${satirToplam} TL</strong>
        </div>
      `;
    }).join('');
  };

  // kapatılan adisyon için termal fiş yazdırma penceresi oluşturan kod
  const fisYazdir = (masa, odemeler = []) => {
    if (!masa || !masa.siparisler || masa.siparisler.length === 0) {
      return;
    }

    const toplamTutar = Number(masa.tutar || 0);

    const odemeSatirlari = odemeler.length > 0
      ? odemeler.map(o => `
        <div class="row">
          <span>${o.tip}</span>
          <strong>${Number(o.tutar || 0)} TL</strong>
        </div>
        ${Number(o.alinanTutar || 0) > Number(o.tutar || 0) ? `
          <div class="row">
            <span>Alınan</span>
            <strong>${Number(o.alinanTutar || 0)} TL</strong>
          </div>
          <div class="row">
            <span>Para Üstü</span>
            <strong>${Number(o.paraUstu || 0)} TL</strong>
          </div>
        ` : ''}
      `).join('')
      : `
      <div class="row">
        <span>Ödeme</span>
        <strong>${toplamTutar} TL</strong>
      </div>
    `;

    const urunSatirlari = fisUrunSatirlariHazirla(masa.siparisler || []);
    const tarihSaat = new Date().toLocaleString('tr-TR');

    const fisHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Fiş</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #000; background: #fff; }
          .receipt { width: 72mm; font-size: 12px; }
          .center { text-align: center; }
          .title { font-size: 18px; font-weight: 900; margin-bottom: 4px; }
          .subtitle { font-size: 11px; margin-bottom: 8px; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .row, .item { display: flex; justify-content: space-between; gap: 8px; margin: 5px 0; }
          .item { align-items: flex-start; }
          .muted { font-size: 10px; color: #333; margin-top: 2px; }
          .total { font-size: 16px; font-weight: 900; }
          .thanks { margin-top: 12px; font-size: 11px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="center">
            <div class="title">${user?.restaurant || 'Integra POS'}</div>
            <div class="subtitle">Adisyon Fişi</div>
          </div>
          <div class="line"></div>
          <div class="row"><span>Masa</span><strong>${masa.ad}</strong></div>
          ${masa.musteriAdi ? `<div class="row"><span>Müşteri</span><strong>${masa.musteriAdi}</strong></div>` : ''}
          <div class="row"><span>Tarih</span><strong>${tarihSaat}</strong></div>
          <div class="line"></div>
          ${urunSatirlari}
          <div class="line"></div>
          <div class="row total"><span>Toplam</span><strong>${toplamTutar} TL</strong></div>
          <div class="line"></div>
          ${odemeSatirlari}
          <div class="line"></div>
          <div class="thanks">Bizi tercih ettiğiniz için teşekkür ederiz.</div>
        </div>
        <script>
          window.onload = function () {
            window.print();
            setTimeout(function () { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

    yazdirHtml(fisHtml, 'Fiş');
  };

  // hesap alınmadan önce açık adisyon fişi yazdıran kod
  const adisyonFisiYazdir = (masa) => {
    if (!masa || !Array.isArray(masa.siparisler) || masa.siparisler.length === 0) {
      alert('Yazdırılacak açık adisyon yok.');
      return;
    }

    const toplamTutar = Number(masa.tutar || 0);
    const odenen = odemeToplami(masa);
    const kalan = kalanTutar(masa);
    const urunSatirlari = fisUrunSatirlariHazirla(masa.siparisler || []);
    const tarihSaat = new Date().toLocaleString('tr-TR');

    const adisyonHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Hesap Öncesi Adisyon</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #000; background: #fff; }
            .receipt { width: 72mm; font-size: 12px; }
            .center { text-align: center; }
            .title { font-size: 18px; font-weight: 900; margin-bottom: 4px; }
            .subtitle { font-size: 11px; margin-bottom: 8px; }
            .line { border-top: 1px dashed #000; margin: 8px 0; }
            .row, .item { display: flex; justify-content: space-between; gap: 8px; margin: 5px 0; }
            .item { align-items: flex-start; }
            .muted { font-size: 10px; color: #333; margin-top: 2px; }
            .total { font-size: 16px; font-weight: 900; }
            .note { text-align: center; font-size: 10px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="center">
              <div class="title">${user?.restaurant || 'Integra POS'}</div>
              <div class="subtitle">Hesap Öncesi Adisyon</div>
            </div>
            <div class="line"></div>
            <div class="row"><span>Masa</span><strong>${masa.ad}</strong></div>
            ${masa.musteriAdi ? `<div class="row"><span>Müşteri</span><strong>${masa.musteriAdi}</strong></div>` : ''}
            <div class="row"><span>Açılış</span><strong>${saatYaz(masa.adisyonAcilisSaati)}</strong></div>
            <div class="row"><span>Tarih</span><strong>${tarihSaat}</strong></div>
            <div class="line"></div>
            ${urunSatirlari}
            <div class="line"></div>
            <div class="row total"><span>Toplam</span><strong>${toplamTutar} TL</strong></div>
            <div class="row"><span>Ödenen</span><strong>${odenen} TL</strong></div>
            <div class="row"><span>Kalan</span><strong>${kalan} TL</strong></div>
            <div class="line"></div>
            <div class="note">Bu belge hesap kapatma fişi değildir.</div>
          </div>
          <script>
            window.onload = function () {
              window.print();
              setTimeout(function () { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    yazdirHtml(adisyonHtml, 'Hesap Öncesi Adisyon');
  };

  // seçili rapor periyodu için gün sonu / rapor çıktısı oluşturan kod
  const gunSonuRaporuYazdir = () => {
    const urunSatirlari = (raporData.liste || []).map(item => `
      <tr>
        <td>${item.ad}${item.not ? ` / ${item.not}` : ''}</td>
        <td>${item.adet}</td>
        <td>${Number(item.indirimTutari || 0)} TL</td>
        <td>${item.ciro} TL</td>
      </tr>
    `).join('');

    const adisyonSatirlari = (adisyonGecmisiData || []).map(a => `
      <tr>
        <td>${a.masaAdi || a.masaId || '-'}</td>
        <td>${a.musteriAdi || '-'}</td>
        <td>${Number(a.toplamIndirim || 0)} TL</td>
        <td>${a.toplam} TL</td>
      </tr>
    `).join('');

    const raporHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Gün Sonu Raporu</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #000; background: #fff; }
            .receipt { width: 72mm; font-size: 11px; }
            .center { text-align: center; }
            .title { font-size: 16px; font-weight: 900; margin-bottom: 4px; }
            .subtitle { font-size: 11px; margin-bottom: 8px; }
            .line { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; gap: 8px; margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            th, td { border-bottom: 1px dashed #999; padding: 4px 2px; text-align: left; font-size: 10px; }
            th:last-child, td:last-child { text-align: right; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="center">
              <div class="title">${user?.restaurant || 'Integra POS'}</div>
              <div class="subtitle">Gün Sonu / Rapor Çıktısı</div>
              <div class="subtitle">${raporBasligi()}</div>
            </div>
            <div class="line"></div>
            <div class="row"><span>Toplam Ciro</span><strong>${raporData.toplamCiro} TL</strong></div>
            <div class="row"><span>Toplam İndirim</span><strong>${raporData.toplamIndirim} TL</strong></div>
            <div class="row"><span>Nakit</span><strong>${raporData.nakitToplam} TL</strong></div>
            <div class="row"><span>Kredi Kartı</span><strong>${raporData.kartToplam} TL</strong></div>
            <div class="row"><span>Diğer</span><strong>${raporData.digerOdemeToplam} TL</strong></div>
            <div class="line"></div>
            <strong>Ürün Satışları</strong>
            <table>
              <thead><tr><th>Ürün</th><th>Adet</th><th>İnd.</th><th>Ciro</th></tr></thead>
              <tbody>${urunSatirlari || '<tr><td colspan="4">Satış yok</td></tr>'}</tbody>
            </table>
            <div class="line"></div>
            <strong>Kapalı Adisyonlar</strong>
            <table>
              <thead><tr><th>Masa</th><th>Müşteri</th><th>İnd.</th><th>Tutar</th></tr></thead>
              <tbody>${adisyonSatirlari || '<tr><td colspan="4">Adisyon yok</td></tr>'}</tbody>
            </table>
          </div>
          <script>
            window.onload = function () {
              window.print();
              setTimeout(function () { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    yazdirHtml(raporHtml, 'Gün Sonu Raporu');
  };

  // paket servis sipariş fişi yazdıran kod
  const paketFisiYazdir = (paket) => {
    if (!paket || !Array.isArray(paket.urunler) || paket.urunler.length === 0) {
      alert('Yazdırılacak paket sipariş bulunamadı.');
      return;
    }

    const toplamTutar = Number(
      paket.tutar || paket.urunler.reduce((toplam, urun) => {
        return toplam + Number(urun.fiyat || 0) * Number(urun.adet || 1);
      }, 0)
    );

    const urunSatirlari = paket.urunler.map(u => `
      <div class="item">
        <div>
          <strong>${u.ad}</strong>${u.not ? `<div class="muted">Not: ${u.not}</div>` : ''}
          <div class="muted">${u.adet} x ${u.fiyat} TL</div>
        </div>
        <strong>${Number(u.adet || 1) * Number(u.fiyat || 0)} TL</strong>
      </div>
    `).join('');

    const tarihSaat = paket.createdAt
      ? new Date(paket.createdAt).toLocaleString('tr-TR')
      : new Date().toLocaleString('tr-TR');

    const fisHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Paket Servis Fişi</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #000; background: #fff; }
            .receipt { width: 72mm; font-size: 12px; }
            .center { text-align: center; }
            .title { font-size: 18px; font-weight: 900; margin-bottom: 4px; }
            .subtitle { font-size: 11px; margin-bottom: 8px; }
            .line { border-top: 1px dashed #000; margin: 8px 0; }
            .row, .item { display: flex; justify-content: space-between; gap: 8px; margin: 5px 0; }
            .item { align-items: flex-start; }
            .muted { font-size: 10px; color: #333; margin-top: 2px; }
            .total { font-size: 16px; font-weight: 900; }
            .note { margin-top: 6px; font-size: 11px; }
            .thanks { margin-top: 12px; font-size: 11px; text-align: center; }
          </style>
        </head>

        <body>
          <div class="receipt">
            <div class="center">
              <div class="title">${user?.restaurant || 'Integra POS'}</div>
              <div class="subtitle">Paket Servis Fişi</div>
            </div>

            <div class="line"></div>

            <div class="row"><span>Müşteri</span><strong>${paket.musteriAdi || '-'}</strong></div>
            <div class="row"><span>Telefon</span><strong>${paket.telefon || '-'}</strong></div>
            <div class="row"><span>Durum</span><strong>${paket.durum || '-'}</strong></div>
            <div class="row"><span>Ödeme</span><strong>${paket.odemeTipi || 'Bekliyor'}</strong></div>
            ${paket.odendi ? `<div class="row"><span>Alınan</span><strong>${Number(paket.alinanTutar || paket.tutar || 0)} TL</strong></div>` : ''}
            ${Number(paket.paraUstu || 0) > 0 ? `<div class="row"><span>Para Üstü</span><strong>${Number(paket.paraUstu || 0)} TL</strong></div>` : ''}
            <div class="row"><span>Tarih</span><strong>${tarihSaat}</strong></div>

            ${paket.adres ? `<div class="note"><strong>Adres:</strong> ${paket.adres}</div>` : ''}
            ${paket.notMetni ? `<div class="note"><strong>Not:</strong> ${paket.notMetni}</div>` : ''}

            <div class="line"></div>
            ${urunSatirlari}
            <div class="line"></div>

            <div class="row total"><span>Toplam</span><strong>${toplamTutar} TL</strong></div>

            <div class="line"></div>
            <div class="thanks">Afiyet olsun.</div>
          </div>

          <script>
            window.onload = function () {
              window.print();
              setTimeout(function () { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=700');

    if (!printWindow) {
      alert('Paket fişi penceresi açılamadı. Tarayıcı pop-up iznini kontrol edin.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(fisHtml);
    printWindow.document.close();
  };

  // ödeme toplamını hesaplayan yardımcı fonksiyon
  const odemeToplami = (masa) => {
    return (masa?.odemeler || []).reduce((toplam, odeme) => {
      return toplam + Number(odeme.tutar || 0);
    }, 0);
  };

  // masada kalan ödeme tutarını hesaplayan yardımcı fonksiyon
  const kalanTutar = (masa) => {
    return Math.max(Number(masa?.tutar || 0) - odemeToplami(masa), 0);
  };

  // nakit veya kredi kartı ile parçalı ödeme alan ve ödeme tamamlanınca hesabı kapatan fonksiyon
  const odemeAl = async (odemeTipi) => {
    const masa = activeMasa;

    if (!masa || !masa.siparisler || masa.siparisler.length === 0) {
      alert('Bu masada ödeme alınacak adisyon yok.');
      return;
    }

    const kalan = kalanTutar(masa);

    if (kalan <= 0) {
      alert('Bu adisyonun ödemesi tamamlanmış.');
      return;
    }

    const girilenOdemeTutari = sayiyaCevir(odemeTutariInput || kalan);

    if (!girilenOdemeTutari || girilenOdemeTutari <= 0) {
      alert('Geçerli bir ödeme tutarı girin.');
      return;
    }

    const nakitMi = String(odemeTipi || '').toLowerCase().includes('nakit');

    if (!nakitMi && girilenOdemeTutari > kalan) {
      alert('Kart ödeme tutarı kalan tutardan fazla olamaz.');
      return;
    }

    const odemeTutari = nakitMi ? Math.min(girilenOdemeTutari, kalan) : girilenOdemeTutari;
    const paraUstu = nakitMi ? Math.max(girilenOdemeTutari - kalan, 0) : 0;

    const yeniOdeme = {
      tip: odemeTipi,
      tutar: odemeTutari,
      alinanTutar: girilenOdemeTutari,
      paraUstu: paraUstu,
      tarih: new Date().toISOString(),
    };

    const yeniOdemeler = [...(masa.odemeler || []), yeniOdeme];

    const toplamOdenen = yeniOdemeler.reduce((toplam, odeme) => {
      return toplam + Number(odeme.tutar || 0);
    }, 0);

    const yeniKalan = Math.max(Number(masa.tutar || 0) - toplamOdenen, 0);

    if (yeniKalan > 0) {
      const { data, error } = await supabase
        .from('masalar')
        .update({
          odemeler: yeniOdemeler,
        })
        .eq('id', masa.id)
        .select()
        .single();

      if (error) {
        console.error('Ödeme kaydı hatası:', error);
        alert('Ödeme kaydedilemedi: ' + error.message);
        setOdemeTutariInput('');
        return;
      }

      const guncelMasa = {
        id: data.id,
        restaurantId: data.restaurant_id,
        ad: data.ad,
        dolu: data.dolu || false,
        tutar: Number(data.tutar || 0),
        siparisler: Array.isArray(data.siparisler) ? data.siparisler : [],
        odemeler: Array.isArray(data.odemeler) ? data.odemeler : [],
        adisyonAcilisSaati: data.adisyon_acilis_saati || null,
        adisyonGarsonAdi: data.adisyon_garson_adi || masa.adisyonGarsonAdi || '',
        // masanın bölüm bilgisini koruyan kod
        bolum: data.bolum || masa.bolum || aktifMasaBolumu || 'Salon',
      };

      setMasalar(masalar.map(m => {
        if (m.id === guncelMasa.id) {
          return guncelMasa;
        }
        return m;
      }));
      setOdemeTutariInput('');

      return;
    }

    const bugun = new Date().toISOString().split('T')[0];
    // ödeme tamamlanınca adisyon kapanış saatini belirleyen kod
    const adisyonKapanisSaati = new Date().toISOString();
    // kapanan adisyonu raporda tek işlem olarak takip etmek için benzersiz id oluşturan kod
    const adisyonId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${masa.id}`;

    const odemeOzeti =
      yeniOdemeler.length > 1
        ? 'Parçalı'
        : yeniOdemeler[0]?.tip || odemeTipi;

    // kapanan masadaki ürünleri satış geçmişine ödeme bilgisiyle kaydeden kod
    const satisKayitlari = masa.siparisler.map(s => ({
      restaurant_id: mevcutRestaurantId,
      masa_id: masa.id,
      masa_adi: masa.ad,
      musteri_adi: masa.musteriAdi || null,
      adisyon_id: adisyonId,
      ad: s.ad,
      fiyat: Number(s.fiyat || 0),
      adet: Number(s.adet || 1),
      tarih: bugun,
      odeme_tipi: odemeOzeti,
      odemeler: yeniOdemeler,
      adisyon_acilis_saati: masa.adisyonAcilisSaati || null,
      adisyon_kapanis_saati: adisyonKapanisSaati,
      urun_notu: s.not || null,
      ekstra_ucret: Number(s.ekstraUcret || 0),
      normal_fiyat: Number(s.normalFiyat || s.fiyat || 0),
      liste_fiyati: Number(s.listeFiyati || s.normalFiyat || s.fiyat || 0),
      satis_fiyati: Number(s.satisFiyati || s.fiyat || 0),
      indirim_yuzde: Number(s.indirimYuzde || 0),
      indirim_tutari: Number(s.indirimTutari || 0),
      fiyat_degistirildi: Boolean(s.fiyatDegistirildi),
      ikram: Boolean(s.ikram),
      menu_grubu: s.menuGrubu || 'Genel',
      departman: s.departman || 'Mutfak',
      kdv_orani: Number(s.kdvOrani || 10),
      garson_adi: masa.adisyonGarsonAdi || '',
    }));
    const { error: satisError } = await supabase
      .from('satis_gecmisi')
      .insert(satisKayitlari);

    if (satisError) {
      console.error('Satış kaydı hatası:', satisError);
      alert('Satış rapora işlenemedi: ' + satisError.message);
      return;
    }

    await stokDusur(masa.siparisler);

    const { data, error: masaError } = await supabase
      .from('masalar')
      .update({
        dolu: false,
        tutar: 0,
        siparisler: [],
        odemeler: [],
        adisyon_acilis_saati: null,
        adisyon_garson_adi: null,
        musteri_adi: null,
      })
      .eq('id', masa.id)
      .select()
      .single();

    if (masaError) {
      console.error('Masa sıfırlama hatası:', masaError);
      alert('Satış kaydedildi ama masa sıfırlanamadı: ' + masaError.message);
      return;
    }

    // ödeme tamamlanınca fiş bilgisini saklayan ve yazdırma tercihine göre işlem yapan kod
    const sonFis = {
      masa: {
        ...masa,
        siparisler: [...masa.siparisler],
      },
      odemeler: yeniOdemeler,
    };

    setSonFisBilgisi(sonFis);

    if (fisYazdirmaModu === 'yazdir') {
      fisYazdir(sonFis.masa, sonFis.odemeler);
    }

    if (fisYazdirmaModu === 'sor') {
      setFisSorModal(sonFis);
    }

    // ekranı yenilemeden rapora anlık satış ekleyen kod
    const yeniRaporKayitlari = masa.siparisler.map(s => ({
      id: Date.now() + Math.random(),
      restaurantId: mevcutRestaurantId,
      masaId: masa.id,
      masaAdi: masa.ad,
      musteriAdi: masa.musteriAdi || '',
      adisyonId: adisyonId,
      ad: s.ad,
      fiyat: Number(s.fiyat || 0),
      adet: Number(s.adet || 1),
      tarih: bugun,
      odemeTipi: odemeOzeti,
      odemeler: yeniOdemeler,
      adisyonAcilisSaati: masa.adisyonAcilisSaati || null,
      adisyonKapanisSaati: adisyonKapanisSaati,
      not: s.not || '',
      ekstraUcret: Number(s.ekstraUcret || 0),
      normalFiyat: Number(s.normalFiyat || s.fiyat || 0),
      listeFiyati: Number(s.listeFiyati || s.normalFiyat || s.fiyat || 0),
      satisFiyati: Number(s.satisFiyati || s.fiyat || 0),
      indirimYuzde: Number(s.indirimYuzde || 0),
      indirimTutari: Number(s.indirimTutari || 0),
      fiyatDegistirildi: Boolean(s.fiyatDegistirildi),
      ikram: Boolean(s.ikram),
      menuGrubu: s.menuGrubu || 'Genel',
      departman: s.departman || 'Mutfak',
      kdvOrani: Number(s.kdvOrani || 10),
      garsonAdi: masa.adisyonGarsonAdi || '',
    }));

    setSatisGecmisi([...satisGecmisi, ...yeniRaporKayitlari]);

    const guncelMasa = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      dolu: data.dolu || false,
      tutar: Number(data.tutar || 0),
      siparisler: Array.isArray(data.siparisler) ? data.siparisler : [],
      odemeler: Array.isArray(data.odemeler) ? data.odemeler : [],
      adisyonAcilisSaati: data.adisyon_acilis_saati || null,
      adisyonGarsonAdi: data.adisyon_garson_adi || '',
      musteriAdi: data.musteri_adi || '',
      bolum: data.bolum || masa?.bolum || aktifMasaBolumu || 'Salon',
    };

    setMasalar(masalar.map(m => {
      if (m.id === guncelMasa.id) {
        return guncelMasa;
      }
      return m;
    }));

  };

  // seçili masaya müşteri adı kaydeden kod
  const masaMusteriAdiKaydet = async () => {
    const masa = activeMasa;

    if (!masa) {
      alert('Lütfen bir masa seçin.');
      return;
    }

    const temizMusteriAdi = musteriAdiInput.trim();

    const { data, error } = await supabase
      .from('masalar')
      .update({
        musteri_adi: temizMusteriAdi || null,
      })
      .eq('id', masa.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Müşteri adı kaydedilemedi:', error);
      alert('Müşteri adı kaydedilemedi: ' + error.message);
      return;
    }

    const guncelMasa = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      dolu: data.dolu || false,
      tutar: Number(data.tutar || 0),
      siparisler: Array.isArray(data.siparisler) ? data.siparisler : [],
      odemeler: Array.isArray(data.odemeler) ? data.odemeler : [],
      adisyonAcilisSaati: data.adisyon_acilis_saati || null,
      adisyonGarsonAdi: data.adisyon_garson_adi || masa.adisyonGarsonAdi || '',
      musteriAdi: data.musteri_adi || '',
      bolum: data.bolum || masa.bolum || aktifMasaBolumu || 'Salon',
    };

    setMasalar(masalar.map(m => {
      if (m.id === guncelMasa.id) {
        return guncelMasa;
      }

      return m;
    }));
  };


  // stok takibi açık ürünlerin satış sonrası stoktan düşmesini sağlayan kod
  const stokDusur = async (siparisler = []) => {
    const stokGuncellenecekler = (Array.isArray(siparisler) ? siparisler : [])
      .map(s => {
        const urun = menuUrunleri.find(u => String(u.id) === String(s.urunId));
        return { siparis: s, urun };
      })
      .filter(x => x.urun && x.urun.stokTakip);

    if (stokGuncellenecekler.length === 0) return;

    const yeniMenu = [...menuUrunleri];

    for (const { siparis, urun } of stokGuncellenecekler) {
      const mevcutStok = Number(urun.stokAdedi || 0);
      const yeniStok = mevcutStok - Number(siparis.adet || 1);

      const { error } = await supabase
        .from('menu_urunleri')
        .update({ stok_adedi: yeniStok })
        .eq('id', urun.id)
        .eq('restaurant_id', mevcutRestaurantId);

      if (error) {
        console.error('Stok düşme hatası:', error);
      }

      const index = yeniMenu.findIndex(u => String(u.id) === String(urun.id));
      if (index > -1) {
        yeniMenu[index] = {
          ...yeniMenu[index],
          stokAdedi: yeniStok,
        };
      }
    }

    setMenuUrunleri(yeniMenu);
  };

  // paket servise ürün notuyla ürün ekleyen kod
  const paketUrunEkle = () => {
    if (!paketSeciliUrunId) {
      alert('Lütfen paket sipariş için ürün seçin.');
      return;
    }

    const urun = aktifMenu.find(u => String(u.id) === String(paketSeciliUrunId));

    if (!urun) {
      alert('Ürün bulunamadı.');
      return;
    }

    const adet = Number(paketSeciliAdet || 1);

    if (!adet || adet <= 0) {
      alert('Geçerli adet girin.');
      return;
    }

    const urunNotu = String(paketSeciliUrunNotu || '').trim();
    const mevcutIndex = paketUrunler.findIndex(u => {
      return String(u.urunId) === String(urun.id) && String(u.not || '') === String(urunNotu || '');
    });
    const yeniListe = [...paketUrunler];

    if (mevcutIndex > -1) {
      yeniListe[mevcutIndex] = {
        ...yeniListe[mevcutIndex],
        adet: Number(yeniListe[mevcutIndex].adet || 0) + adet,
      };
    } else {
      yeniListe.push({
        urunId: urun.id,
        ad: urun.ad,
        fiyat: Number(urun.fiyat || 0),
        maliyet: Number(urun.maliyet || 0),
        adet,
        not: urunNotu,
        menuGrubu: urun.menuGrubu || urun.kategori || 'Genel',
        departman: urun.departman || 'Mutfak',
        kdvOrani: Number(urun.kdvOrani || 10),
        mutfagaGitsin: urun.mutfagaGitsin !== false,
      });
    }

    setPaketUrunler(yeniListe);
    setPaketSeciliUrunId('');
    setPaketSeciliAdet(1);
    setPaketSeciliUrunNotu('');
  };

  // paket servis ürününü listeden çıkaran kod
  const paketUrunSil = (index) => {
    setPaketUrunler(paketUrunler.filter((_, i) => i !== index));
  };

  // paket servis toplamını hesaplayan kod
  const paketToplam = paketUrunler.reduce((toplam, urun) => {
    return toplam + Number(urun.fiyat || 0) * Number(urun.adet || 1);
  }, 0);

  // paket servis siparişi oluşturan kod
  const paketSiparisOlustur = async (e) => {
    e.preventDefault();

    if (!paketMusteriAdi || !paketTelefon) {
      alert('Paket sipariş için müşteri adı ve telefon girin.');
      return;
    }

    if (paketUrunler.length === 0) {
      alert('Paket siparişe ürün ekleyin.');
      return;
    }

    const kayitliPaketMusteriId = await paketMusterisiniKaydetVeyaGuncelle();
    const seciliKurye = paketKuryePersonelleri.find(p => String(p.id) === String(paketSeciliKuryePersonelId));

    const { data, error } = await supabase
      .from('paket_siparisleri')
      .insert([
        {
          restaurant_id: mevcutRestaurantId,
          paket_musteri_id: kayitliPaketMusteriId,
          musteri_adi: paketMusteriAdi,
          telefon: paketTelefon,
          adres: paketAdres,
          not_metni: paketNotu,
          durum: 'Hazırlanıyor',
          odeme_tipi: 'Bekliyor',
          tutar: paketToplam,
          urunler: paketUrunler,
          odendi: false,
          alinan_tutar: 0,
          para_ustu: 0,
          kapanis_saati: null,
          kurye_adi: seciliKurye?.ad || '',
          kurye_personel_id: seciliKurye?.id || null,
          yola_cikis_saati: null,
          teslim_saati: null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Paket sipariş oluşturulamadı:', error);
      alert('Paket sipariş oluşturulamadı: ' + error.message);
      return;
    }

    const yeniPaket = {
      id: data.id,
      restaurantId: data.restaurant_id,
      paketMusteriId: data.paket_musteri_id || kayitliPaketMusteriId || null,
      musteriAdi: data.musteri_adi,
      telefon: data.telefon,
      adres: data.adres,
      notMetni: data.not_metni || '',
      durum: data.durum || 'Hazırlanıyor',
      odemeTipi: data.odeme_tipi || 'Bekliyor',
      tutar: Number(data.tutar || 0),
      urunler: Array.isArray(data.urunler) ? data.urunler : paketUrunler,
      odendi: Boolean(data.odendi),
      alinanTutar: Number(data.alinan_tutar || 0),
      paraUstu: Number(data.para_ustu || 0),
      kapanisSaati: data.kapanis_saati || null,
      kuryeAdi: data.kurye_adi || seciliKurye?.ad || '',
      kuryePersonelId: data.kurye_personel_id || seciliKurye?.id || null,
      yolaCikisSaati: data.yola_cikis_saati || null,
      teslimSaati: data.teslim_saati || null,
      createdAt: data.created_at,
    };

    // paket servis siparişi oluşturulunca mutfağa gidecek ürünleri mutfak ekranına düşüren kod
    const paketMutfakKayitlari = paketUrunler
      .filter(paketUrun => {
        const menuUrunu = aktifMenu.find(u => String(u.id) === String(paketUrun.urunId));
        return paketUrun.mutfagaGitsin !== false && menuUrunu?.mutfagaGitsin !== false;
      })
      .map(paketUrun => {
        const menuUrunu = aktifMenu.find(u => String(u.id) === String(paketUrun.urunId));
        const paketNotBilgisi = [
          paketUrun.not ? `Ürün Notu: ${paketUrun.not}` : '',
          paketNotu ? `Paket Notu: ${paketNotu}` : '',
          paketMusteriAdi ? `Müşteri: ${paketMusteriAdi}` : '',
          paketTelefon ? `Tel: ${paketTelefon}` : '',
          paketAdres ? `Adres: ${paketAdres}` : '',
        ].filter(Boolean).join(' | ');

        return {
          restaurant_id: mevcutRestaurantId,
          masa_id: null,
          masa_adi: `Paket Servis - ${paketMusteriAdi}`,
          urun_adi: paketUrun.ad,
          adet: Number(paketUrun.adet || 1),
          not_metni: paketNotBilgisi,
          departman: paketUrun.departman || menuUrunu?.departman || 'Mutfak',
          garson_adi: seciliKurye?.ad || 'Paket Servis',
          durum: 'Bekliyor',
        };
      });

    if (paketMutfakKayitlari.length > 0) {
      const { data: mutfakData, error: mutfakError } = await supabase
        .from('mutfak_fisleri')
        .insert(paketMutfakKayitlari)
        .select();

      if (mutfakError) {
        console.error('Paket servis mutfak fişi oluşturulamadı:', mutfakError);
        alert('Paket sipariş oluşturuldu ama mutfak fişi oluşturulamadı: ' + mutfakError.message);
      } else {
        const yeniMutfakFisleri = (Array.isArray(mutfakData) ? mutfakData : []).map(f => ({
          id: f.id,
          restaurantId: f.restaurant_id,
          masaId: f.masa_id,
          masaAdi: f.masa_adi,
          urunAdi: f.urun_adi,
          adet: Number(f.adet || 1),
          notMetni: f.not_metni || '',
          departman: f.departman || 'Mutfak',
          garsonAdi: f.garson_adi || seciliKurye?.ad || 'Paket Servis',
          durum: f.durum || 'Bekliyor',
          createdAt: f.created_at,
        }));

        setMutfakFisleri(prev => [
          ...yeniMutfakFisleri,
          ...(Array.isArray(prev) ? prev : []),
        ]);
      }
    }

    setPaketSiparisleri([yeniPaket, ...paketSiparisleri]);

    setSeciliPaketMusteriId('');
    setPaketMusteriAdi('');
    setPaketTelefon('');
    setPaketAdres('');
    setPaketNotu('');
    setPaketOdemeTipi('Nakit');
    setPaketDurumu('Hazırlanıyor');
    setPaketUrunler([]);
    setPaketSeciliUrunId('');
    setPaketSeciliAdet(1);
    setPaketSeciliUrunNotu('');
    setPaketSeciliKuryePersonelId('');
    setPaketUrunArama('');
  };

  // paket sipariş durumunu değiştiren kod
  const paketDurumGuncelle = async (paket, yeniDurum) => {
    if (paket?.odendi) {
      alert('Kapatılmış paket siparişin durumu değiştirilemez.');
      return;
    }

    const seciliKurye = paketKuryePersonelleri.find(personel => {
      return String(personel.id) === String(paket.kuryePersonelId);
    });

    const guncelKuryeAdi =
      seciliKurye?.ad ||
      kuryeAdiInputs[paket.id] ||
      paket.kuryeAdi ||
      '';

    const { data, error } = await supabase
      .from('paket_siparisleri')
      .update({
        durum: yeniDurum,
        kurye_adi: guncelKuryeAdi,
        kurye_personel_id: paket.kuryePersonelId || seciliKurye?.id || null,
        yola_cikis_saati: yeniDurum === 'Yolda' ? new Date().toISOString() : paket.yolaCikisSaati || null,
      })
      .eq('id', paket.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Paket durum güncellenemedi:', error);
      alert('Paket durum güncellenemedi: ' + error.message);
      return;
    }

    setPaketSiparisleri(paketSiparisleri.map(p => {
      if (p.id === paket.id) {
        return { ...p, durum: data.durum, kuryeAdi: data.kurye_adi || p.kuryeAdi || '', kuryePersonelId: data.kurye_personel_id || p.kuryePersonelId || null, yolaCikisSaati: data.yola_cikis_saati || p.yolaCikisSaati || null };
      }
      return p;
    }));
  };


  // paket servis siparişini nakit veya kart ile kapatıp satış raporuna işleyen kod
  const paketSiparisiKapat = async (paket, odemeTipi) => {
    if (!paket || !paket.id) {
      alert('Paket sipariş bulunamadı.');
      return;
    }

    if (paket.odendi || paket.durum === 'Teslim Edildi') {
      alert('Bu paket sipariş zaten kapatılmış.');
      return;
    }

    const tutar = Number(paket.tutar || 0);

    if (tutar <= 0 || !Array.isArray(paket.urunler) || paket.urunler.length === 0) {
      alert('Kapatılacak paket siparişte ürün bulunamadı.');
      return;
    }

    const girilenTutar = sayiyaCevir(paketOdemeTutarInputs[paket.id] || tutar);

    if (!girilenTutar || girilenTutar <= 0) {
      alert('Geçerli ödeme tutarı girin.');
      return;
    }

    if (odemeTipi === 'Kredi Kartı' && girilenTutar !== tutar) {
      alert('Kart ödemesinde tutar sipariş toplamına eşit olmalıdır.');
      return;
    }

    if (odemeTipi === 'Nakit' && girilenTutar < tutar) {
      alert('Nakit alınan tutar sipariş toplamından az olamaz.');
      return;
    }

    const paraUstu = odemeTipi === 'Nakit' ? Math.max(girilenTutar - tutar, 0) : 0;
    const kapanisSaati = new Date().toISOString();
    const bugun = new Date().toISOString().split('T')[0];
    const adisyonId = `paket-${paket.id}-${Date.now()}`;

    const odemeler = [
      {
        tip: odemeTipi,
        tutar,
        alinanTutar: girilenTutar,
        paraUstu,
        tarih: kapanisSaati,
      },
    ];

    const satisKayitlari = paket.urunler.map(u => ({
      restaurant_id: mevcutRestaurantId,
      masa_id: null,
      masa_adi: 'Paket Servis',
      musteri_adi: paket.musteriAdi || '',
      adisyon_id: adisyonId,
      ad: u.ad,
      fiyat: Number(u.fiyat || 0),
      adet: Number(u.adet || 1),
      tarih: bugun,
      odeme_tipi: odemeTipi,
      odemeler,
      adisyon_acilis_saati: paket.createdAt || kapanisSaati,
      adisyon_kapanis_saati: kapanisSaati,
      urun_notu: u.not || paket.notMetni || null,
      ekstra_ucret: 0,
      normal_fiyat: Number(u.normalFiyat || u.fiyat || 0),
      maliyet: Number(u.maliyet || 0),
      toplam_maliyet: Number(u.maliyet || 0) * Number(u.adet || 1),
      liste_fiyati: Number(u.listeFiyati || u.normalFiyat || u.fiyat || 0),
      satis_fiyati: Number(u.fiyat || 0),
      indirim_yuzde: 0,
      indirim_tutari: 0,
      fiyat_degistirildi: false,
      menu_grubu: u.menuGrubu || 'Genel',
      departman: u.departman || 'Paket Servis',
      kdv_orani: Number(u.kdvOrani || 10),
      garson_adi: paket.kuryeAdi || 'Paket Servis',
      siparis_tipi: 'Paket Servis',
      paket_siparis_id: paket.id,
    }));

    const { error: satisError } = await supabase
      .from('satis_gecmisi')
      .insert(satisKayitlari);

    if (satisError) {
      console.error('Paket satış rapora işlenemedi:', satisError);
      alert('Paket satış rapora işlenemedi: ' + satisError.message);
      return;
    }

    const { data, error } = await supabase
      .from('paket_siparisleri')
      .update({
        durum: 'Teslim Edildi',
        odeme_tipi: odemeTipi,
        odendi: true,
        alinan_tutar: girilenTutar,
        para_ustu: paraUstu,
        kapanis_saati: kapanisSaati,
        teslim_saati: kapanisSaati,
        kurye_adi: paket.kuryeAdi || kuryeAdiInputs[paket.id] || '',
        kurye_personel_id: paket.kuryePersonelId || null,
      })
      .eq('id', paket.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Paket sipariş kapatılamadı:', error);
      alert('Paket sipariş kapatılamadı: ' + error.message);
      return;
    }

    await stokDusur(paket.urunler);

    const guncelPaket = {
      ...paket,
      durum: data.durum || 'Teslim Edildi',
      odemeTipi: data.odeme_tipi || odemeTipi,
      odendi: Boolean(data.odendi),
      alinanTutar: Number(data.alinan_tutar || girilenTutar),
      paraUstu: Number(data.para_ustu || paraUstu),
      kapanisSaati: data.kapanis_saati || kapanisSaati,
      teslimSaati: data.teslim_saati || kapanisSaati,
      kuryeAdi: data.kurye_adi || paket.kuryeAdi || kuryeAdiInputs[paket.id] || '',
      kuryePersonelId: data.kurye_personel_id || paket.kuryePersonelId || null,
    };

    setPaketSiparisleri(paketSiparisleri.map(p => {
      if (p.id === paket.id) {
        return guncelPaket;
      }

      return p;
    }));

    const yeniRaporKayitlari = paket.urunler.map(u => ({
      id: Date.now() + Math.random(),
      restaurantId: mevcutRestaurantId,
      masaId: null,
      masaAdi: 'Paket Servis',
      musteriAdi: paket.musteriAdi || '',
      adisyonId,
      ad: u.ad,
      fiyat: Number(u.fiyat || 0),
      adet: Number(u.adet || 1),
      tarih: bugun,
      odemeTipi,
      odemeler,
      adisyonAcilisSaati: paket.createdAt || kapanisSaati,
      adisyonKapanisSaati: kapanisSaati,
      not: u.not || paket.notMetni || '',
      ekstraUcret: 0,
      normalFiyat: Number(u.normalFiyat || u.fiyat || 0),
      maliyet: Number(u.maliyet || 0),
      toplamMaliyet: Number(u.maliyet || 0) * Number(u.adet || 1),
      listeFiyati: Number(u.listeFiyati || u.normalFiyat || u.fiyat || 0),
      satisFiyati: Number(u.fiyat || 0),
      indirimYuzde: 0,
      indirimTutari: 0,
      fiyatDegistirildi: false,
      menuGrubu: u.menuGrubu || 'Genel',
      departman: u.departman || 'Paket Servis',
      kdvOrani: Number(u.kdvOrani || 10),
      garsonAdi: paket.kuryeAdi || 'Paket Servis',
      siparisTipi: 'Paket Servis',
      paketSiparisId: paket.id,
    }));

    setSatisGecmisi([...satisGecmisi, ...yeniRaporKayitlari]);

    setPaketOdemeTutarInputs(prev => {
      const yeni = { ...(prev || {}) };
      delete yeni[paket.id];
      return yeni;
    });
  };

  // cari müşteri ekleyen kod
  const cariMusteriEkle = async (e) => {
    e.preventDefault();

    if (!yeniCariAdi) {
      alert('Cari müşteri adı girin.');
      return;
    }

    const { data, error } = await supabase
      .from('cari_musteriler')
      .insert([
        {
          restaurant_id: mevcutRestaurantId,
          ad: yeniCariAdi,
          telefon: yeniCariTelefon,
          not_metni: yeniCariNotu,
          bakiye: 0,
          hareketler: [],
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Cari müşteri eklenemedi:', error);
      alert('Cari müşteri eklenemedi: ' + error.message);
      return;
    }

    setCariMusteriler([
      {
        id: data.id,
        restaurantId: data.restaurant_id,
        ad: data.ad,
        telefon: data.telefon || '',
        bakiye: Number(data.bakiye || 0),
        notMetni: data.not_metni || '',
        hareketler: Array.isArray(data.hareketler) ? data.hareketler : [],
        createdAt: data.created_at,
      },
      ...cariMusteriler,
    ]);

    setYeniCariAdi('');
    setYeniCariTelefon('');
    setYeniCariNotu('');
  };

  // cari müşteri hareketi kaydeden kod
  const cariHareketEkle = async (cari, tip, tutar, aciklama) => {
    const tutarSayi = sayiyaCevir(tutar);

    if (!cari || !tutarSayi || tutarSayi <= 0) {
      alert('Geçerli cari işlem tutarı girin.');
      return false;
    }

    const oncekiHareketler = Array.isArray(cari.hareketler) ? cari.hareketler : [];
    const yeniHareket = {
      id: Date.now(),
      tip,
      tutar: tutarSayi,
      aciklama,
      tarih: new Date().toISOString(),
    };

    const yeniBakiye = tip === 'Borç'
      ? Number(cari.bakiye || 0) + tutarSayi
      : Number(cari.bakiye || 0) - tutarSayi;

    const yeniHareketler = [yeniHareket, ...oncekiHareketler];

    const { data, error } = await supabase
      .from('cari_musteriler')
      .update({
        bakiye: yeniBakiye,
        hareketler: yeniHareketler,
      })
      .eq('id', cari.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Cari hareket kaydedilemedi:', error);
      alert('Cari hareket kaydedilemedi: ' + error.message);
      return false;
    }

    setCariMusteriler(cariMusteriler.map(c => {
      if (c.id === cari.id) {
        return {
          ...c,
          bakiye: Number(data.bakiye || 0),
          hareketler: Array.isArray(data.hareketler) ? data.hareketler : yeniHareketler,
        };
      }

      return c;
    }));

    return true;
  };

  // açık masadaki adisyonu cariye yazıp masayı kapatan kod
  const aktifAdisyonuCariyeYaz = async () => {
    const masa = activeMasa;

    if (!masa || !masa.dolu || !masa.siparisler || masa.siparisler.length === 0) {
      alert('Cari hesaba yazılacak açık adisyon yok.');
      return;
    }

    if (!cariAdisyonMusteriId) {
      alert('Cari müşteri seçin.');
      return;
    }

    const cari = cariMusteriler.find(c => String(c.id) === String(cariAdisyonMusteriId));

    if (!cari) {
      alert('Cari müşteri bulunamadı.');
      return;
    }

    const tutar = Number(masa.tutar || 0);
    const islemKaydedildi = await cariHareketEkle(cari, 'Borç', tutar, `${masa.ad} adisyonu cariye yazıldı`);

    if (!islemKaydedildi) return;

    const bugun = new Date().toISOString().split('T')[0];
    const adisyonKapanisSaati = new Date().toISOString();
    const adisyonId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${masa.id}-cari`;

    const satisKayitlari = masa.siparisler.map(s => ({
      restaurant_id: mevcutRestaurantId,
      masa_id: masa.id,
      masa_adi: masa.ad,
      musteri_adi: cari.ad,
      adisyon_id: adisyonId,
      ad: s.ad,
      fiyat: Number(s.fiyat || 0),
      adet: Number(s.adet || 1),
      tarih: bugun,
      odeme_tipi: 'Cari',
      odemeler: [{ tip: 'Cari', tutar, tarih: new Date().toISOString() }],
      adisyon_acilis_saati: masa.adisyonAcilisSaati || null,
      adisyon_kapanis_saati: adisyonKapanisSaati,
      urun_notu: s.not || null,
      ekstra_ucret: Number(s.ekstraUcret || 0),
      normal_fiyat: Number(s.normalFiyat || s.fiyat || 0),
      liste_fiyati: Number(s.listeFiyati || s.normalFiyat || s.fiyat || 0),
      satis_fiyati: Number(s.satisFiyati || s.fiyat || 0),
      indirim_yuzde: Number(s.indirimYuzde || 0),
      indirim_tutari: Number(s.indirimTutari || 0),
      fiyat_degistirildi: Boolean(s.fiyatDegistirildi),
      menu_grubu: s.menuGrubu || 'Genel',
      departman: s.departman || 'Mutfak',
      kdv_orani: Number(s.kdvOrani || 10),
      garson_adi: masa.adisyonGarsonAdi || '',
    }));

    const { error: satisError } = await supabase
      .from('satis_gecmisi')
      .insert(satisKayitlari);

    if (satisError) {
      console.error('Cari satış kaydı hatası:', satisError);
      alert('Cari satış rapora işlenemedi: ' + satisError.message);
      return;
    }

    await stokDusur(masa.siparisler);

    const { data, error } = await supabase
      .from('masalar')
      .update({
        dolu: false,
        tutar: 0,
        siparisler: [],
        odemeler: [],
        adisyon_acilis_saati: null,
        adisyon_garson_adi: null,
        musteri_adi: null,
      })
      .eq('id', masa.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Masa cari sonrası kapatılamadı:', error);
      alert('Cari kaydedildi ama masa kapatılamadı: ' + error.message);
      return;
    }

    const guncelMasa = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      dolu: data.dolu || false,
      tutar: Number(data.tutar || 0),
      siparisler: Array.isArray(data.siparisler) ? data.siparisler : [],
      odemeler: Array.isArray(data.odemeler) ? data.odemeler : [],
      adisyonAcilisSaati: data.adisyon_acilis_saati || null,
      adisyonGarsonAdi: data.adisyon_garson_adi || '',
      musteriAdi: data.musteri_adi || '',
      bolum: data.bolum || masa.bolum || aktifMasaBolumu || 'Salon',
    };

    setMasalar(masalar.map(m => m.id === guncelMasa.id ? guncelMasa : m));
    setCariAdisyonMusteriId('');
  };

  // cari tahsilat alan kod
  const cariTahsilatAl = async (cari) => {
    const sonuc = await cariHareketEkle(cari, 'Tahsilat', cariTahsilatTutari, 'Cari tahsilat');

    if (sonuc) {
      setCariTahsilatTutari('');
    }
  };

  // kasa hareketi kaydeden kod
  const kasaHareketiEkle = async (tip, tutar, aciklama) => {
    const tutarSayi = sayiyaCevir(tutar);

    if (!tutarSayi || tutarSayi <= 0) {
      alert('Kasa için geçerli tutar girin.');
      return;
    }

    const bugun = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('kasa_hareketleri')
      .insert([
        {
          restaurant_id: mevcutRestaurantId,
          tarih: bugun,
          tip,
          tutar: tutarSayi,
          aciklama,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Kasa hareketi kaydedilemedi:', error);
      alert('Kasa hareketi kaydedilemedi: ' + error.message);
      return;
    }

    setKasaHareketleri([
      {
        id: data.id,
        restaurantId: data.restaurant_id,
        tarih: data.tarih,
        tip: data.tip,
        tutar: Number(data.tutar || 0),
        aciklama: data.aciklama || '',
        createdAt: data.created_at,
      },
      ...kasaHareketleri,
    ]);

    setKasaAcilisTutari('');
    setKasaHareketTutari('');
    setKasaHareketAciklama('');
  };

  // masa birleştirme işlemini yapan kod
  const masaBirlestir = async () => {
    const kaynakMasa = activeMasa;

    if (!kaynakMasa || !kaynakMasa.dolu || !kaynakMasa.siparisler || kaynakMasa.siparisler.length === 0) {
      alert('Birleştirilecek dolu bir kaynak masa seçin.');
      return;
    }

    if (!birlestirilecekMasaId) {
      alert('Birleştirilecek hedef masayı seçin.');
      return;
    }

    const hedefMasa = tumRestoranMasalari.find(m => String(m.id) === String(birlestirilecekMasaId));

    if (!hedefMasa || String(hedefMasa.id) === String(kaynakMasa.id)) {
      alert('Geçerli hedef masa seçin.');
      return;
    }

    if (!hedefMasa.dolu || !hedefMasa.siparisler || hedefMasa.siparisler.length === 0) {
      alert('Masa birleştirme için hedef masa dolu olmalı. Boş masaya aktarma için Masa Aktar kullanın.');
      return;
    }

    const yeniSiparisler = [...(hedefMasa.siparisler || []), ...(kaynakMasa.siparisler || [])];
    const yeniOdemeler = [...(hedefMasa.odemeler || []), ...(kaynakMasa.odemeler || [])];
    const yeniTutar = Number(hedefMasa.tutar || 0) + Number(kaynakMasa.tutar || 0);

    const { data: hedefData, error: hedefError } = await supabase
      .from('masalar')
      .update({
        dolu: true,
        tutar: yeniTutar,
        siparisler: yeniSiparisler,
        odemeler: yeniOdemeler,
        adisyon_acilis_saati: hedefMasa.adisyonAcilisSaati || kaynakMasa.adisyonAcilisSaati || new Date().toISOString(),
        adisyon_garson_adi: hedefMasa.adisyonGarsonAdi || kaynakMasa.adisyonGarsonAdi || '',
        musteri_adi: hedefMasa.musteriAdi || kaynakMasa.musteriAdi || '',
      })
      .eq('id', hedefMasa.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (hedefError) {
      console.error('Masa birleştirme hedef hatası:', hedefError);
      alert('Masa birleştirilemedi: ' + hedefError.message);
      return;
    }

    const { data: kaynakData, error: kaynakError } = await supabase
      .from('masalar')
      .update({
        dolu: false,
        tutar: 0,
        siparisler: [],
        odemeler: [],
        adisyon_acilis_saati: null,
        adisyon_garson_adi: null,
        musteri_adi: null,
      })
      .eq('id', kaynakMasa.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (kaynakError) {
      console.error('Masa birleştirme kaynak hatası:', kaynakError);
      alert('Hedef masa birleşti ama kaynak masa boşaltılamadı: ' + kaynakError.message);
      return;
    }

    const guncelHedef = {
      id: hedefData.id,
      restaurantId: hedefData.restaurant_id,
      ad: hedefData.ad,
      dolu: hedefData.dolu || false,
      tutar: Number(hedefData.tutar || 0),
      siparisler: Array.isArray(hedefData.siparisler) ? hedefData.siparisler : [],
      odemeler: Array.isArray(hedefData.odemeler) ? hedefData.odemeler : [],
      adisyonAcilisSaati: hedefData.adisyon_acilis_saati || null,
      adisyonGarsonAdi: hedefData.adisyon_garson_adi || '',
      musteriAdi: hedefData.musteri_adi || '',
      bolum: hedefData.bolum || hedefMasa.bolum || 'Salon',
    };

    const guncelKaynak = {
      id: kaynakData.id,
      restaurantId: kaynakData.restaurant_id,
      ad: kaynakData.ad,
      dolu: kaynakData.dolu || false,
      tutar: Number(kaynakData.tutar || 0),
      siparisler: [],
      odemeler: [],
      adisyonAcilisSaati: null,
      adisyonGarsonAdi: '',
      musteriAdi: '',
      bolum: kaynakData.bolum || kaynakMasa.bolum || 'Salon',
    };

    setMasalar(masalar.map(m => {
      if (m.id === guncelHedef.id) return guncelHedef;
      if (m.id === guncelKaynak.id) return guncelKaynak;
      return m;
    }));

    setSelectedMasaId(guncelHedef.id);
    setAktifMasaBolumu(guncelHedef.bolum || 'Salon');
    setBirlestirilecekMasaId('');
  };

  // bölünecek ürün seçimini açıp kapatan kod
  const bolunecekUrunSec = (index) => {
    setBolunecekSiparisIndexleri(prev => {
      const liste = Array.isArray(prev) ? prev : [];
      if (liste.includes(index)) {
        return liste.filter(i => i !== index);
      }
      return [...liste, index];
    });
  };

  // bölünmüş adisyon toplamını hesaplayan kod
  const bolunenAdisyonToplamiGetir = () => {
    const masa = activeMasa;

    if (!masa || !Array.isArray(masa.siparisler)) {
      return 0;
    }

    return masa.siparisler.reduce((toplam, s, index) => {
      if (!bolunecekSiparisIndexleri.includes(index)) return toplam;
      return toplam + Number(s.fiyat || 0) * Number(s.adet || 1);
    }, 0);
  };

  // seçilen ürünleri ayrı adisyon olarak kapatan kod
  const bolunmusAdisyonOdemeAl = async (odemeTipi) => {
    const masa = activeMasa;

    if (!masa || !Array.isArray(masa.siparisler) || masa.siparisler.length === 0) {
      alert('Bölünecek adisyon yok.');
      return;
    }

    if (bolunecekSiparisIndexleri.length === 0) {
      alert('Bölünecek ürünleri seçin.');
      return;
    }

    const secilenSiparisler = masa.siparisler.filter((_, index) => bolunecekSiparisIndexleri.includes(index));
    const kalanSiparisler = masa.siparisler.filter((_, index) => !bolunecekSiparisIndexleri.includes(index));
    const bolunenToplam = secilenSiparisler.reduce((toplam, s) => toplam + Number(s.fiyat || 0) * Number(s.adet || 1), 0);
    const kalanToplam = kalanSiparisler.reduce((toplam, s) => toplam + Number(s.fiyat || 0) * Number(s.adet || 1), 0);
    const bugun = new Date().toISOString().split('T')[0];
    const adisyonKapanisSaati = new Date().toISOString();
    const adisyonId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${masa.id}-bolme`;
    const odemeler = [{ tip: odemeTipi, tutar: bolunenToplam, tarih: new Date().toISOString() }];

    const satisKayitlari = secilenSiparisler.map(s => ({
      restaurant_id: mevcutRestaurantId,
      masa_id: masa.id,
      masa_adi: masa.ad,
      musteri_adi: masa.musteriAdi || null,
      adisyon_id: adisyonId,
      ad: s.ad,
      fiyat: Number(s.fiyat || 0),
      adet: Number(s.adet || 1),
      tarih: bugun,
      odeme_tipi: `Bölünmüş / ${odemeTipi}`,
      odemeler,
      adisyon_acilis_saati: masa.adisyonAcilisSaati || null,
      adisyon_kapanis_saati: adisyonKapanisSaati,
      urun_notu: s.not || null,
      ekstra_ucret: Number(s.ekstraUcret || 0),
      normal_fiyat: Number(s.normalFiyat || s.fiyat || 0),
      liste_fiyati: Number(s.listeFiyati || s.normalFiyat || s.fiyat || 0),
      satis_fiyati: Number(s.satisFiyati || s.fiyat || 0),
      indirim_yuzde: Number(s.indirimYuzde || 0),
      indirim_tutari: Number(s.indirimTutari || 0),
      fiyat_degistirildi: Boolean(s.fiyatDegistirildi),
      menu_grubu: s.menuGrubu || 'Genel',
      departman: s.departman || 'Mutfak',
      kdv_orani: Number(s.kdvOrani || 10),
      garson_adi: masa.adisyonGarsonAdi || '',
    }));

    const { error: satisError } = await supabase
      .from('satis_gecmisi')
      .insert(satisKayitlari);

    if (satisError) {
      console.error('Bölünmüş adisyon satış hatası:', satisError);
      alert('Bölünmüş adisyon rapora işlenemedi: ' + satisError.message);
      return;
    }

    await stokDusur(secilenSiparisler);

    const { data, error } = await supabase
      .from('masalar')
      .update({
        dolu: kalanSiparisler.length > 0,
        tutar: kalanToplam,
        siparisler: kalanSiparisler,
        odemeler: masa.odemeler || [],
        adisyon_acilis_saati: kalanSiparisler.length > 0 ? masa.adisyonAcilisSaati : null,
        adisyon_garson_adi: kalanSiparisler.length > 0 ? masa.adisyonGarsonAdi : null,
        musteri_adi: kalanSiparisler.length > 0 ? masa.musteriAdi : null,
      })
      .eq('id', masa.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Bölünmüş adisyon sonrası masa güncellenemedi:', error);
      alert('Satış işlendi ama masa güncellenemedi: ' + error.message);
      return;
    }

    const guncelMasa = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      dolu: data.dolu || false,
      tutar: Number(data.tutar || 0),
      siparisler: Array.isArray(data.siparisler) ? data.siparisler : [],
      odemeler: Array.isArray(data.odemeler) ? data.odemeler : [],
      adisyonAcilisSaati: data.adisyon_acilis_saati || null,
      adisyonGarsonAdi: data.adisyon_garson_adi || '',
      musteriAdi: data.musteri_adi || '',
      bolum: data.bolum || masa.bolum || aktifMasaBolumu || 'Salon',
    };

    setMasalar(masalar.map(m => m.id === guncelMasa.id ? guncelMasa : m));
    setBolunecekSiparisIndexleri([]);
  };

  // ürün stok ayarını güncelleyen kod
  const urunStokGuncelle = async (urun) => {
    const stokAdedi = sayiyaCevir(stokDuzenlemeAdedi);
    const kritikStok = sayiyaCevir(stokDuzenlemeKritik);

    const { data, error } = await supabase
      .from('menu_urunleri')
      .update({
        stok_takip: true,
        stok_adedi: stokAdedi,
        kritik_stok: kritikStok,
      })
      .eq('id', urun.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Stok güncellenemedi:', error);
      alert('Stok güncellenemedi: ' + error.message);
      return;
    }

    setMenuUrunleri(menuUrunleri.map(u => {
      if (u.id === urun.id) {
        return {
          ...u,
          stokTakip: Boolean(data.stok_takip),
          stokAdedi: Number(data.stok_adedi || 0),
          kritikStok: Number(data.kritik_stok || 0),
        };
      }

      return u;
    }));

    setStokDuzenlemeUrunId(null);
    setStokDuzenlemeAdedi('');
    setStokDuzenlemeKritik('');
  };

  // ürün stoğuna giriş ekleyen ve eksi stoğu kapatan kod
  const urunStokEkle = async (urun) => {
    const eklenecekStok = sayiyaCevir(stokDuzenlemeAdedi);
    const kritikStok = sayiyaCevir(stokDuzenlemeKritik || urun.kritikStok || 0);

    if (!eklenecekStok) {
      alert('Eklenecek stok miktarı girin.');
      return;
    }

    const yeniStok = Number(urun.stokAdedi || 0) + eklenecekStok;

    const { data, error } = await supabase
      .from('menu_urunleri')
      .update({
        stok_takip: true,
        stok_adedi: yeniStok,
        kritik_stok: kritikStok,
      })
      .eq('id', urun.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Stok girişi eklenemedi:', error);
      alert('Stok girişi eklenemedi: ' + error.message);
      return;
    }

    setMenuUrunleri(menuUrunleri.map(u => {
      if (u.id === urun.id) {
        return {
          ...u,
          stokTakip: Boolean(data.stok_takip),
          stokAdedi: Number(data.stok_adedi || 0),
          kritikStok: Number(data.kritik_stok || 0),
        };
      }

      return u;
    }));

    setStokDuzenlemeUrunId(null);
    setStokDuzenlemeAdedi('');
    setStokDuzenlemeKritik('');
  };

  // ürün favori durumunu değiştiren kod
  const urunFavoriDegistir = async (urun) => {
    const yeniDurum = !urun.favori;

    const { data, error } = await supabase
      .from('menu_urunleri')
      .update({ favori: yeniDurum })
      .eq('id', urun.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Favori güncellenemedi:', error);
      alert('Favori güncellenemedi: ' + error.message);
      return;
    }

    setMenuUrunleri(menuUrunleri.map(u => {
      if (u.id === urun.id) {
        return { ...u, favori: Boolean(data.favori) };
      }

      return u;
    }));
  };


  // hızlı satış ürününü sepete ekleyen kod
  const hizliSatisUrunEkle = (urun) => {
    if (!urun) return;

    setHizliSatisUrunler(prev => {
      const liste = Array.isArray(prev) ? [...prev] : [];
      const index = liste.findIndex(x => String(x.urunId) === String(urun.id) && !x.ikram && !x.not);

      if (index > -1) {
        liste[index] = {
          ...liste[index],
          adet: Number(liste[index].adet || 0) + 1,
        };
      } else {
        liste.push({
          urunId: urun.id,
          ad: urun.ad,
          fiyat: Number(urun.fiyat || 0),
          normalFiyat: Number(urun.fiyat || 0),
          ekstraUcret: 0,
          hazirNotId: '',
          maliyet: Number(urun.maliyet || 0),
          adet: 1,
          not: '',
          ikram: false,
          menuGrubu: urun.menuGrubu || urun.kategori || 'Genel',
          departman: urun.departman || 'Hızlı Satış',
          kdvOrani: Number(urun.kdvOrani || 10),
          mutfagaGitsin: urun.mutfagaGitsin !== false,
          menuNotlari: Array.isArray(urun.menuNotlari) ? urun.menuNotlari : [],
        });
      }

      return liste;
    });
  };

  // hızlı satış ürün adedini değiştiren kod
  const hizliSatisAdetDegistir = (index, degisim) => {
    setHizliSatisUrunler(prev => {
      const liste = Array.isArray(prev) ? [...prev] : [];
      if (!liste[index]) return liste;
      const yeniAdet = Number(liste[index].adet || 1) + degisim;
      if (yeniAdet <= 0) return liste.filter((_, i) => i !== index);
      liste[index] = { ...liste[index], adet: yeniAdet };
      return liste;
    });
  };

  // hızlı satış ürün notunu değiştiren kod
  const hizliSatisUrunNotuDegistir = (index, notMetni) => {
    setHizliSatisUrunler(prev => {
      const liste = Array.isArray(prev) ? [...prev] : [];
      if (!liste[index]) return liste;

      // Manuel not yazılırsa hazır not seçimi korunmasın ama fiyatı da bozulmasın diye ekstra aynı kalır.
      liste[index] = {
        ...liste[index],
        not: notMetni,
        hazirNotId: '',
      };

      return liste;
    });
  };

  // hızlı satışta ürünün kayıtlı hazır notunu seçince ekstra ücreti fiyata yansıtan kod
  const hizliSatisHazirNotSec = (index, hazirNotId) => {
    setHizliSatisUrunler(prev => {
      const liste = Array.isArray(prev) ? [...prev] : [];
      const urun = liste[index];
      if (!urun) return liste;

      const notlar = Array.isArray(urun.menuNotlari) ? urun.menuNotlari : [];
      const seciliNot = notlar.find(n => String(n.id || n.ad) === String(hazirNotId));
      const normalFiyat = Number(urun.normalFiyat ?? urun.fiyat ?? 0);
      const ekstraUcret = seciliNot ? Number(seciliNot.fiyat || 0) : 0;

      liste[index] = {
        ...urun,
        hazirNotId: hazirNotId || '',
        not: seciliNot ? seciliNot.ad : '',
        ekstraUcret,
        fiyat: normalFiyat + ekstraUcret,
      };

      return liste;
    });
  };

  // hızlı satışta seçili satırdan 1 ürünü ikram eden kod
  const hizliSatisBirUrunIkramEt = (index) => {
    setHizliSatisUrunler(prev => {
      const liste = Array.isArray(prev) ? [...prev] : [];
      const hedef = liste[index];
      if (!hedef || hedef.ikram || Number(hedef.fiyat || 0) <= 0) return liste;

      const kalanAdet = Number(hedef.adet || 1) - 1;
      if (kalanAdet > 0) {
        liste[index] = { ...hedef, adet: kalanAdet };
      } else {
        liste.splice(index, 1);
      }

      const ikramNotu = hedef.not ? `${hedef.not} / İkram` : 'İkram';
      const ikramIndex = liste.findIndex(x => x.ikram && String(x.urunId) === String(hedef.urunId) && String(x.not || '') === String(ikramNotu));

      if (ikramIndex > -1) {
        liste[ikramIndex] = { ...liste[ikramIndex], adet: Number(liste[ikramIndex].adet || 0) + 1 };
      } else {
        liste.push({
          ...hedef,
          fiyat: 0,
          adet: 1,
          ikram: true,
          not: ikramNotu,
        });
      }

      return liste;
    });
  };

  // hızlı satışı kapatıp raporlara işleyen kod
  const hizliSatisKapat = async () => {
    if (!Array.isArray(hizliSatisUrunler) || hizliSatisUrunler.length === 0) {
      alert('Hızlı satış için ürün seçin.');
      return;
    }

    const tutar = Number(hizliSatisToplam || 0);
    const alinanTutar = sayiyaCevir(hizliSatisAlinanTutar || tutar);
    const toplamIndirim = Number(hizliSatisToplamIndirim || 0);

    if (hizliSatisOdemeTipi === 'Kredi Kartı' && alinanTutar !== tutar) {
      alert('Kart ödemesinde alınan tutar toplamla aynı olmalı.');
      return;
    }

    if (hizliSatisOdemeTipi === 'Nakit' && alinanTutar < tutar) {
      alert('Nakit alınan tutar toplamdan az olamaz.');
      return;
    }

    const paraUstu = hizliSatisOdemeTipi === 'Nakit' ? Math.max(alinanTutar - tutar, 0) : 0;
    const bugun = new Date().toISOString().split('T')[0];
    const kapanisSaati = new Date().toISOString();
    const adisyonId = `hizli-${Date.now()}`;
    const odemeler = [{ tip: hizliSatisOdemeTipi, tutar, alinanTutar, paraUstu, indirimTutari: toplamIndirim, tarih: kapanisSaati }];

    const hizliSatisSatirHesapla = (u) => {
      const satirBrut = Number(u.fiyat || 0) * Number(u.adet || 1);
      const satirPayi = hizliSatisAraToplam > 0 ? satirBrut / hizliSatisAraToplam : 0;
      const satirIndirim = Math.min(satirBrut, toplamIndirim * satirPayi);
      const satirNetToplam = Math.max(satirBrut - satirIndirim, 0);
      const netBirimFiyat = Number(u.adet || 1) > 0 ? satirNetToplam / Number(u.adet || 1) : 0;
      return { satirBrut, satirIndirim, satirNetToplam, netBirimFiyat };
    };

    const satisKayitlari = hizliSatisUrunler.map(u => {
      const satir = hizliSatisSatirHesapla(u);
      return ({
      restaurant_id: mevcutRestaurantId,
      masa_id: null,
      masa_adi: 'Hızlı Satış',
      musteri_adi: 'Gel-Al',
      adisyon_id: adisyonId,
      ad: u.ad,
      fiyat: Number(u.fiyat || 0),
      adet: Number(u.adet || 1),
      tarih: bugun,
      odeme_tipi: hizliSatisOdemeTipi,
      odemeler,
      adisyon_acilis_saati: kapanisSaati,
      adisyon_kapanis_saati: kapanisSaati,
      urun_notu: u.not || null,
      ekstra_ucret: Number(u.ekstraUcret || 0),
      normal_fiyat: Number(u.normalFiyat || u.fiyat || 0),
      liste_fiyati: Number(u.fiyat || 0),
      satis_fiyati: Number(satir.netBirimFiyat || 0),
      indirim_yuzde: hizliSatisIndirimYuzdeSayi,
      indirim_tutari: Number(satir.satirIndirim || 0),
      fiyat_degistirildi: Number(satir.satirIndirim || 0) > 0 || Boolean(u.ikram),
      ikram: Boolean(u.ikram),
      menu_grubu: u.menuGrubu || 'Genel',
      departman: u.departman || 'Hızlı Satış',
      kdv_orani: Number(u.kdvOrani || 10),
      garson_adi: user?.waiterName || user?.restaurant || 'Kasiyer',
      siparis_tipi: 'Hızlı Satış',
      maliyet: Number(u.maliyet || 0),
      toplam_maliyet: Number(u.maliyet || 0) * Number(u.adet || 1),
    });
    });

    const { error } = await supabase
      .from('satis_gecmisi')
      .insert(satisKayitlari);

    if (error) {
      console.error('Hızlı satış kaydedilemedi:', error);
      alert('Hızlı satış kaydedilemedi: ' + error.message);
      return;
    }

    await stokDusur(hizliSatisUrunler);

    // hızlı satıştan girilen mutfağa gidecek ürünleri mutfak ekranına düşüren kod
    const hizliSatisMutfakKayitlari = hizliSatisUrunler
      .filter(hizliUrun => {
        const menuUrunu = aktifMenu.find(u => String(u.id) === String(hizliUrun.urunId));
        return hizliUrun.mutfagaGitsin !== false && menuUrunu?.mutfagaGitsin !== false;
      })
      .map(hizliUrun => {
        const menuUrunu = aktifMenu.find(u => String(u.id) === String(hizliUrun.urunId));
        const notBilgisi = [
          hizliUrun.not ? `Ürün Notu: ${hizliUrun.not}` : '',
          hizliUrun.ikram ? 'İkram ürün' : '',
          'Hızlı Satış / Gel-Al',
        ].filter(Boolean).join(' | ');

        return {
          restaurant_id: mevcutRestaurantId,
          masa_id: null,
          masa_adi: 'Hızlı Satış / Gel-Al',
          urun_adi: hizliUrun.ad,
          adet: Number(hizliUrun.adet || 1),
          not_metni: notBilgisi,
          departman: hizliUrun.departman || menuUrunu?.departman || 'Mutfak',
          garson_adi: user?.waiterName || user?.restaurant || user?.email || 'Kasiyer',
          durum: 'Bekliyor',
        };
      });

    if (hizliSatisMutfakKayitlari.length > 0) {
      const { data: mutfakData, error: mutfakError } = await supabase
        .from('mutfak_fisleri')
        .insert(hizliSatisMutfakKayitlari)
        .select();

      if (mutfakError) {
        console.error('Hızlı satış mutfak fişi oluşturulamadı:', mutfakError);
        alert('Satış kaydedildi ama mutfak fişi oluşturulamadı: ' + mutfakError.message);
      } else if (Array.isArray(mutfakData) && mutfakData.length > 0) {
        const yeniMutfakFisleri = mutfakData.map(f => ({
          id: f.id,
          restaurantId: f.restaurant_id,
          masaId: f.masa_id,
          masaAdi: f.masa_adi,
          urunAdi: f.urun_adi,
          adet: Number(f.adet || 1),
          notMetni: f.not_metni || '',
          departman: f.departman || 'Mutfak',
          garsonAdi: f.garson_adi || '-',
          durum: f.durum || 'Bekliyor',
          createdAt: f.created_at,
        }));

        setMutfakFisleri(prev => [
          ...yeniMutfakFisleri,
          ...(Array.isArray(prev) ? prev : []),
        ]);
      }
    }

    setSatisGecmisi([
      ...satisGecmisi,
      ...hizliSatisUrunler.map(u => {
        const satir = hizliSatisSatirHesapla(u);
        return ({
        id: Date.now() + Math.random(),
        restaurantId: mevcutRestaurantId,
        masaId: null,
        masaAdi: 'Hızlı Satış',
        musteriAdi: 'Gel-Al',
        adisyonId,
        ad: u.ad,
        fiyat: Number(u.fiyat || 0),
        adet: Number(u.adet || 1),
        tarih: bugun,
        odemeTipi: hizliSatisOdemeTipi,
        odemeler,
        siparisTipi: 'Hızlı Satış',
        adisyonAcilisSaati: kapanisSaati,
        adisyonKapanisSaati: kapanisSaati,
        menuGrubu: u.menuGrubu || 'Genel',
        departman: u.departman || 'Hızlı Satış',
        kdvOrani: Number(u.kdvOrani || 10),
        garsonAdi: user?.waiterName || user?.restaurant || 'Kasiyer',
        not: u.not || '',
        indirimYuzde: hizliSatisIndirimYuzdeSayi,
        indirimTutari: Number(satir.satirIndirim || 0),
        ikram: Boolean(u.ikram),
      });
      }),
    ]);

    setSonFisBilgisi({
      masa: { ad: 'Hızlı Satış', tutar, siparisler: hizliSatisUrunler },
      odemeler,
    });

    if (fisYazdirmaModu === 'yazdir') {
      fisYazdir({ ad: 'Hızlı Satış', tutar, siparisler: hizliSatisUrunler }, odemeler);
    } else if (fisYazdirmaModu === 'sor') {
      setFisSorModal({ masa: { ad: 'Hızlı Satış', tutar, siparisler: hizliSatisUrunler }, odemeler });
    }

    setHizliSatisUrunler([]);
    setHizliSatisAlinanTutar('');
    setHizliSatisIndirimYuzde('');
    setHizliSatisIndirimTutari('');
  };

  // gider kaydı ekleyen kod
  const giderEkle = async (e) => {
    e.preventDefault();
    const tutar = sayiyaCevir(yeniGiderTutari);

    if (!tutar || tutar <= 0) {
      alert('Geçerli gider tutarı girin.');
      return;
    }

    const bugun = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('giderler')
      .insert([{ restaurant_id: mevcutRestaurantId, tarih: bugun, kategori: yeniGiderKategori, aciklama: yeniGiderAciklama, tutar }])
      .select()
      .single();

    if (error) {
      console.error('Gider eklenemedi:', error);
      alert('Gider eklenemedi: ' + error.message);
      return;
    }

    setGiderler([{ id: data.id, restaurantId: data.restaurant_id, tarih: data.tarih, kategori: data.kategori, aciklama: data.aciklama || '', tutar: Number(data.tutar || 0), createdAt: data.created_at, gunSonuKapandi: false, gunSonuRaporId: null }, ...giderler]);
    setYeniGiderAciklama('');
    setYeniGiderTutari('');
  };

  // iade / ikram / zayi kaydı ekleyen kod
  const iadeKaydiEkle = async (e) => {
    e.preventDefault();
    const urun = aktifMenu.find(u => String(u.id) === String(iadeUrunId));
    const adet = Number(iadeAdet || 1);
    const tutar = sayiyaCevir(iadeTutar || (Number(urun?.fiyat || 0) * adet));

    if (!urun) {
      alert('Ürün seçin.');
      return;
    }

    const bugun = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('iade_kayitlari')
      .insert([{
        restaurant_id: mevcutRestaurantId,
        tarih: bugun,
        tip: iadeTipi,
        sebep: iadeSebebi,
        urun_id: urun.id,
        urun_adi: urun.ad,
        adet,
        tutar,
        kullanici_adi: user?.waiterName || user?.restaurant || user?.email || '',
      }])
      .select()
      .single();

    if (error) {
      console.error('İade/ikram kaydı eklenemedi:', error);
      alert('Kayıt eklenemedi: ' + error.message);
      return;
    }

    setIadeKayitlari([{ id: data.id, restaurantId: data.restaurant_id, tarih: data.tarih, tip: data.tip, sebep: data.sebep, urunId: data.urun_id, urunAdi: data.urun_adi, adet: Number(data.adet || 1), tutar: Number(data.tutar || 0), kullaniciAdi: data.kullanici_adi || '', createdAt: data.created_at, gunSonuKapandi: false, gunSonuRaporId: null }, ...iadeKayitlari]);
    setIadeUrunId('');
    setIadeAdet(1);
    setIadeTutar('');
  };

  // rezervasyonda kayıtlı cari müşteri seçilince bilgileri forma dolduran kod
  const rezervasyonCariMusterisiSec = (musteriId) => {
    setRezervasyonCariMusteriId(musteriId);

    if (!musteriId) {
      setRezervasyonCariArama('');
      return;
    }

    const cari = cariMusteriler.find(c => String(c.id) === String(musteriId));
    if (!cari) return;

    setRezervasyonAdi(cari.ad || '');
    setRezervasyonTelefon(cari.telefon || '');
    setRezervasyonNotu(cari.notMetni || rezervasyonNotu || '');
    setRezervasyonCariArama(`${cari.ad || ''}${cari.telefon ? ` - ${cari.telefon}` : ''}`);
  };

  // rezervasyon müşterisini cari listesinde bulup yoksa kaydeden kod
  const rezervasyonCariMusterisiniKaydetVeyaBul = async () => {
    const ad = String(rezervasyonAdi || '').trim();
    const telefon = String(rezervasyonTelefon || '').trim();

    if (!ad) return null;

    const seciliCari = cariMusteriler.find(c => String(c.id) === String(rezervasyonCariMusteriId));
    if (seciliCari) return seciliCari;

    const mevcutCari = cariMusteriler.find(c => {
      const telefonAyni = telefon && String(c.telefon || '').trim() === telefon;
      const adAyni = String(c.ad || '').trim().toLocaleLowerCase('tr-TR') === ad.toLocaleLowerCase('tr-TR');
      return telefonAyni || adAyni;
    });

    if (mevcutCari) {
      setRezervasyonCariMusteriId(String(mevcutCari.id));
      return mevcutCari;
    }

    const { data, error } = await supabase
      .from('cari_musteriler')
      .insert([{
        restaurant_id: mevcutRestaurantId,
        ad,
        telefon,
        not_metni: rezervasyonNotu || '',
        bakiye: 0,
        hareketler: [],
      }])
      .select()
      .single();

    if (error) {
      console.error('Rezervasyon carisi kaydedilemedi:', error);
      return null;
    }

    const yeniCari = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad || ad,
      telefon: data.telefon || telefon,
      notMetni: data.not_metni || '',
      bakiye: Number(data.bakiye || 0),
      hareketler: Array.isArray(data.hareketler) ? data.hareketler : [],
      createdAt: data.created_at,
    };

    setCariMusteriler([yeniCari, ...cariMusteriler]);
    setRezervasyonCariMusteriId(String(yeniCari.id));
    return yeniCari;
  };

  // rezervasyon ekleyen kod
  const rezervasyonEkle = async (e) => {
    e.preventDefault();

    if (!rezervasyonAdi || !rezervasyonTarihSaat || !rezervasyonBitisTarihSaat) {
      alert('Rezervasyon adı, başlangıç ve bitiş saati girin.');
      return;
    }

    if (new Date(rezervasyonBitisTarihSaat).getTime() <= new Date(rezervasyonTarihSaat).getTime()) {
      alert('Rezervasyon bitiş saati başlangıçtan sonra olmalı.');
      return;
    }

    const rezervasyonBaslangicIso = yerelTarihSaatIsoYap(rezervasyonTarihSaat);
    const rezervasyonBitisIso = yerelTarihSaatIsoYap(rezervasyonBitisTarihSaat);

    if (!rezervasyonBaslangicIso || !rezervasyonBitisIso) {
      alert('Rezervasyon saati geçerli değil.');
      return;
    }

    const rezervasyonCari = await rezervasyonCariMusterisiniKaydetVeyaBul();

    const masa = tumRestoranMasalari.find(m => String(m.id) === String(rezervasyonMasaId));

    if (masa && !rezervasyonMasaMusaitMi(masa)) {
      alert('Bu masa seçilen saat aralığında zaten rezerve. Lütfen başka masa veya saat seçin.');
      return;
    }

    const { data, error } = await supabase
      .from('rezervasyonlar')
      .insert([{
        restaurant_id: mevcutRestaurantId,
        musteri_adi: rezervasyonAdi,
        telefon: rezervasyonTelefon,
        cari_musteri_id: rezervasyonCari?.id || null,
        kisi_sayisi: Number(rezervasyonKisiSayisi || 0),
        rezervasyon_zamani: rezervasyonBaslangicIso,
        rezervasyon_bitis_zamani: rezervasyonBitisIso,
        masa_id: masa?.id || null,
        masa_adi: masa?.ad || '',
        not_metni: rezervasyonNotu,
        durum: 'Bekliyor',
      }])
      .select()
      .single();

    if (error) {
      console.error('Rezervasyon eklenemedi:', error);
      alert('Rezervasyon eklenemedi: ' + error.message);
      return;
    }

    setRezervasyonlar([{ id: data.id, restaurantId: data.restaurant_id, musteriAdi: data.musteri_adi, telefon: data.telefon || '', cariMusteriId: data.cari_musteri_id || rezervasyonCari?.id || null, kisiSayisi: Number(data.kisi_sayisi || 0), rezervasyonZamani: data.rezervasyon_zamani, rezervasyonBitisZamani: data.rezervasyon_bitis_zamani || null, masaId: data.masa_id, masaAdi: data.masa_adi || '', notMetni: data.not_metni || '', durum: data.durum || 'Bekliyor', createdAt: data.created_at }, ...rezervasyonlar]);
    setRezervasyonAdi('');
    setRezervasyonTelefon('');
    setRezervasyonKisiSayisi('');
    setRezervasyonTarihSaat('');
    setRezervasyonBitisTarihSaat('');
    setRezervasyonMasaId('');
    setRezervasyonNotu('');
    setRezervasyonCariMusteriId('');
    setRezervasyonCariArama('');
  };

  // rezervasyon durumunu güncelleyen kod
  const rezervasyonDurumGuncelle = async (rezervasyon, yeniDurum) => {
    const { data, error } = await supabase
      .from('rezervasyonlar')
      .update({ durum: yeniDurum })
      .eq('id', rezervasyon.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Rezervasyon güncellenemedi:', error);
      alert('Rezervasyon güncellenemedi: ' + error.message);
      return;
    }

    setRezervasyonlar(rezervasyonlar.map(r => r.id === rezervasyon.id ? { ...r, durum: data.durum } : r));
  };

  // gün sonunu kapatıp günlük hareketleri kasa Z arşivine aktaran kod
  const gunSonuKapatVeKasayaAktar = async () => {
    if (reportType !== 'gunluk') {
      alert('Gün sonu kapatma için rapor tipini Günlük seçin.');
      return;
    }

    const seciliTarih = raporTarihi || new Date().toISOString().split('T')[0];
    const gunlukSatislar = satisGecmisi.filter(s => {
      return String(s.restaurantId) === String(mevcutRestaurantId) &&
        String(s.tarih || '') === seciliTarih &&
        !s.gunSonuKapandi;
    });

    const gunlukGiderler = giderler.filter(g => {
      return String(g.restaurantId) === String(mevcutRestaurantId) &&
        String(g.tarih || '') === seciliTarih &&
        !g.gunSonuKapandi;
    });

    const gunlukIadeler = iadeKayitlari.filter(i => {
      return String(i.restaurantId) === String(mevcutRestaurantId) &&
        String(i.tarih || '') === seciliTarih &&
        !i.gunSonuKapandi;
    });

    const gunlukPaketler = paketSiparisleri.filter(p => {
      const paketTarihi = String(p.kapanisSaati || p.teslimSaati || p.createdAt || '').split('T')[0];
      return String(p.restaurantId) === String(mevcutRestaurantId) &&
        paketTarihi === seciliTarih &&
        !p.gunSonuKapandi &&
        (p.odendi || String(p.durum || '').toLowerCase().includes('teslim'));
    });

    if (gunlukSatislar.length === 0 && gunlukGiderler.length === 0 && gunlukIadeler.length === 0 && gunlukPaketler.length === 0) {
      alert('Bu gün için aktarılacak hareket bulunmuyor.');
      return;
    }

    const onay = window.confirm(`${seciliTarih} gün sonu kapatılsın mı? Günlük satış, paket, gider ve iade/ikram/zayi hareketleri rapor ekranından kalkar ve Kasa bölümüne Z raporu olarak aktarılır.`);
    if (!onay) return;

    const toplamCiro = gunlukSatislar.reduce((t, s) => t + Number(s.fiyat || 0) * Number(s.adet || 1), 0);
    const maliyetToplam = gunlukSatislar.reduce((t, s) => {
      return t + Number(s.toplamMaliyet || s.maliyet || 0) * (s.toplamMaliyet ? 1 : Number(s.adet || 1));
    }, 0);
    const giderToplam = gunlukGiderler.reduce((t, g) => t + Number(g.tutar || 0), 0);
    const iadeIkramZayiToplam = gunlukIadeler.reduce((t, i) => t + Number(i.tutar || 0), 0);

    const sayilanAdisyonlar = new Set();
    let nakitSatis = 0;
    let kartSatis = 0;

    gunlukSatislar.forEach(s => {
      const odemeler = Array.isArray(s.odemeler) ? s.odemeler : [];
      const adisyonAnahtari = s.adisyonId || `${s.masaId || 'masa'}-${s.tarih}-${JSON.stringify(odemeler)}`;
      if (sayilanAdisyonlar.has(adisyonAnahtari)) return;
      sayilanAdisyonlar.add(adisyonAnahtari);

      odemeler.forEach(o => {
        const tip = String(o.tip || '').toLowerCase();
        const tutar = Number(o.tutar || 0);
        if (tip.includes('nakit')) nakitSatis += tutar;
        if (tip.includes('kart')) kartSatis += tutar;
      });
    });

    const kasaAcilis = kasaHareketleri.filter(k => k.tip === 'Açılış').reduce((t, k) => t + Number(k.tutar || 0), 0);
    const kasaGiris = kasaHareketleri.filter(k => k.tip === 'Giriş').reduce((t, k) => t + Number(k.tutar || 0), 0);
    const kasaCikis = kasaHareketleri.filter(k => k.tip === 'Çıkış').reduce((t, k) => t + Number(k.tutar || 0), 0);
    const beklenenKasa = kasaAcilis + nakitSatis + kasaGiris - kasaCikis;
    const gercekKasa = sayiyaCevir(kasaGercekTutar || beklenenKasa);
    const kasaFarki = gercekKasa - beklenenKasa;
    const tahminiKar = toplamCiro - maliyetToplam - giderToplam - iadeIkramZayiToplam;

    const detaylar = {
      satislar: gunlukSatislar,
      paketSiparisleri: gunlukPaketler,
      giderler: gunlukGiderler,
      iadeIkramZayi: gunlukIadeler,
      kasaHareketleri,
      kapatmaSaati: new Date().toISOString(),
    };

    const { data: zData, error: zError } = await supabase
      .from('z_raporlari')
      .insert([{
        restaurant_id: mevcutRestaurantId,
        tarih: seciliTarih,
        toplam_ciro: toplamCiro,
        nakit_satis: nakitSatis,
        kart_satis: kartSatis,
        gider_toplam: giderToplam + iadeIkramZayiToplam,
        maliyet_toplam: maliyetToplam,
        tahmini_kar: tahminiKar,
        beklenen_kasa: beklenenKasa,
        gercek_kasa: gercekKasa,
        kasa_farki: kasaFarki,
        detaylar,
      }])
      .select()
      .single();

    if (zError) {
      console.error('Gün sonu kasaya aktarılamadı:', zError);
      alert('Gün sonu kasaya aktarılamadı: ' + zError.message);
      return;
    }

    const satisIds = gunlukSatislar.map(s => s.id).filter(Boolean);
    const giderIds = gunlukGiderler.map(g => g.id).filter(Boolean);
    const iadeIds = gunlukIadeler.map(i => i.id).filter(Boolean);
    const kasaIds = kasaHareketleri.map(k => k.id).filter(Boolean);
    const paketIds = Array.from(new Set([
      ...gunlukSatislar.map(s => s.paketSiparisId).filter(Boolean),
      ...gunlukPaketler.map(p => p.id).filter(Boolean),
    ]));

    const kapanisSaati = new Date().toISOString();
    const gunSonuHatalari = [];

    if (satisIds.length > 0) {
      const { error } = await supabase
        .from('satis_gecmisi')
        .update({
          gun_sonu_kapatildi: true,
          gunsonu_kapandi: true,
          gun_sonu_rapor_id: zData.id,
          gunsonu_rapor_id: zData.id,
          gun_sonu_kapanis_saati: kapanisSaati
        })
        .in('id', satisIds);
      if (error) gunSonuHatalari.push('Satışlar: ' + error.message);
    }

    if (giderIds.length > 0) {
      const { error } = await supabase
        .from('giderler')
        .update({
          gun_sonu_kapatildi: true,
          gunsonu_kapandi: true,
          gun_sonu_rapor_id: zData.id,
          gunsonu_rapor_id: zData.id
        })
        .in('id', giderIds);
      if (error) gunSonuHatalari.push('Giderler: ' + error.message);
    }

    if (iadeIds.length > 0) {
      const { error } = await supabase
        .from('iade_kayitlari')
        .update({
          gun_sonu_kapatildi: true,
          gunsonu_kapandi: true,
          gun_sonu_rapor_id: zData.id,
          gunsonu_rapor_id: zData.id
        })
        .in('id', iadeIds);
      if (error) gunSonuHatalari.push('İade/ikram/zayi: ' + error.message);
    }

    if (paketIds.length > 0) {
      const { error } = await supabase
        .from('paket_siparisleri')
        .update({
          gun_sonu_kapatildi: true,
          gunsonu_kapandi: true,
          gun_sonu_rapor_id: zData.id,
          gunsonu_rapor_id: zData.id,
          gun_sonu_kapanis_saati: kapanisSaati
        })
        .in('id', paketIds);
      if (error) gunSonuHatalari.push('Paket servis: ' + error.message);
    }

    if (kasaIds.length > 0) {
      const { error } = await supabase
        .from('kasa_hareketleri')
        .update({
          gun_sonu_kapatildi: true,
          gunsonu_kapandi: true,
          gun_sonu_rapor_id: zData.id,
          gunsonu_rapor_id: zData.id
        })
        .in('id', kasaIds);
      if (error) gunSonuHatalari.push('Kasa hareketleri: ' + error.message);
    }

    if (gunSonuHatalari.length > 0) {
      alert('Gün sonu raporu kasaya yazıldı ama bazı hareketler kapatılamadı:\n' + gunSonuHatalari.join('\n'));
      console.error('Gün sonu kapatma hataları:', gunSonuHatalari);
      return;
    }

    const yeniZRaporu = {
      id: zData.id,
      restaurantId: zData.restaurant_id,
      tarih: zData.tarih,
      toplamCiro: Number(zData.toplam_ciro || 0),
      nakitSatis: Number(zData.nakit_satis || 0),
      kartSatis: Number(zData.kart_satis || 0),
      giderToplam: Number(zData.gider_toplam || 0),
      maliyetToplam: Number(zData.maliyet_toplam || 0),
      tahminiKar: Number(zData.tahmini_kar || 0),
      beklenenKasa: Number(zData.beklenen_kasa || 0),
      gercekKasa: Number(zData.gercek_kasa || 0),
      kasaFarki: Number(zData.kasa_farki || 0),
      detaylar: zData.detaylar || detaylar,
      createdAt: zData.created_at,
    };

    setZRaporlari([yeniZRaporu, ...zRaporlari]);
    setSatisGecmisi(satisGecmisi.filter(s => !satisIds.includes(s.id)));
    setGiderler(giderler.filter(g => !giderIds.includes(g.id)));
    setIadeKayitlari(iadeKayitlari.filter(i => !iadeIds.includes(i.id)));
    setPaketSiparisleri(paketSiparisleri.filter(p => !paketIds.includes(p.id)));
    setKasaHareketleri(kasaHareketleri.filter(k => !kasaIds.includes(k.id)));

    if (typeof satisGecmisiniSupabasedenCek === 'function') await satisGecmisiniSupabasedenCek(mevcutRestaurantId);
    if (typeof paketSiparisleriniSupabasedenCek === 'function') await paketSiparisleriniSupabasedenCek(mevcutRestaurantId);
    if (typeof giderleriSupabasedenCek === 'function') await giderleriSupabasedenCek(mevcutRestaurantId);
    if (typeof iadeKayitlariniSupabasedenCek === 'function') await iadeKayitlariniSupabasedenCek(mevcutRestaurantId);
    if (typeof kasaHareketleriniSupabasedenCek === 'function') await kasaHareketleriniSupabasedenCek(mevcutRestaurantId);
    if (typeof zRaporlariniSupabasedenCek === 'function') await zRaporlariniSupabasedenCek(mevcutRestaurantId);

    zRaporuYazdir({
      tarih: seciliTarih,
      toplamCiro,
      nakitSatis,
      kartSatis,
      giderToplam,
      iadeIkramZayiToplam,
      maliyetToplam,
      tahminiKar,
      beklenenKasa,
      gercekKasa,
      kasaFarki,
    });
  };

  // gün sonu Z raporu çıktısı oluşturan kod
  const zRaporuYazdir = (rapor = null) => {
    const nakitSatis = bugunkuSatislar.reduce((toplam, s) => {
      const odemeler = Array.isArray(s.odemeler) ? s.odemeler : [];
      return toplam + odemeler.filter(o => String(o.tip || '').toLowerCase().includes('nakit')).reduce((t, o) => t + Number(o.tutar || 0), 0);
    }, 0);

    const kartSatis = bugunkuSatislar.reduce((toplam, s) => {
      const odemeler = Array.isArray(s.odemeler) ? s.odemeler : [];
      return toplam + odemeler.filter(o => String(o.tip || '').toLowerCase().includes('kart')).reduce((t, o) => t + Number(o.tutar || 0), 0);
    }, 0);

    const kasaAcilis = kasaHareketleri.filter(k => k.tip === 'Açılış').reduce((t, k) => t + Number(k.tutar || 0), 0);
    const kasaGiris = kasaHareketleri.filter(k => k.tip === 'Giriş').reduce((t, k) => t + Number(k.tutar || 0), 0);
    const kasaCikis = kasaHareketleri.filter(k => k.tip === 'Çıkış').reduce((t, k) => t + Number(k.tutar || 0), 0);
    const beklenen = kasaAcilis + nakitSatis + kasaGiris - kasaCikis;
    const gercek = sayiyaCevir(kasaGercekTutar || beklenen);
    const fark = gercek - beklenen;

    const yazTarih = rapor?.tarih || new Date().toLocaleDateString('tr-TR');
    const yazCiro = rapor?.toplamCiro ?? bugunkuCiro;
    const yazNakit = rapor?.nakitSatis ?? nakitSatis;
    const yazKart = rapor?.kartSatis ?? kartSatis;
    const yazGider = rapor ? Number(rapor.giderToplam || 0) + Number(rapor.iadeIkramZayiToplam || 0) : bugunkuGiderToplami + bugunkuIadeIkramZayiToplami;
    const yazMaliyet = rapor?.maliyetToplam ?? bugunkuMaliyet;
    const yazKar = rapor?.tahminiKar ?? bugunkuTahminiKar;
    const yazBeklenen = rapor?.beklenenKasa ?? beklenen;
    const yazGercek = rapor?.gercekKasa ?? gercek;
    const yazFark = rapor?.kasaFarki ?? fark;

    const html = `
      <!doctype html>
      <html><head><meta charset="utf-8" /><title>Z Raporu</title>
      <style>@page{size:80mm auto;margin:4mm}body{font-family:Arial,sans-serif;font-size:12px}.row{display:flex;justify-content:space-between;margin:5px 0}.line{border-top:1px dashed #000;margin:8px 0}.title{text-align:center;font-weight:900;font-size:16px}</style>
      </head><body>
        <div class="title">${user?.restaurant || 'Integra POS'}<br/>Gün Sonu Z Raporu</div>
        <div class="line"></div>
        <div class="row"><span>Tarih</span><strong>${yazTarih}</strong></div>
        <div class="row"><span>Toplam Ciro</span><strong>${yazCiro} TL</strong></div>
        <div class="row"><span>Nakit Satış</span><strong>${yazNakit} TL</strong></div>
        <div class="row"><span>Kart Satış</span><strong>${yazKart} TL</strong></div>
        <div class="row"><span>Gider</span><strong>${yazGider} TL</strong></div>
        <div class="row"><span>Maliyet</span><strong>${yazMaliyet} TL</strong></div>
        <div class="row"><span>Tahmini Kar</span><strong>${yazKar} TL</strong></div>
        <div class="line"></div>
        <div class="row"><span>Kasa Açılış</span><strong>${kasaAcilis} TL</strong></div>
        <div class="row"><span>Nakit Giriş</span><strong>${kasaGiris} TL</strong></div>
        <div class="row"><span>Nakit Çıkış</span><strong>${kasaCikis} TL</strong></div>
        <div class="row"><span>Beklenen Kasa</span><strong>${yazBeklenen} TL</strong></div>
        <div class="row"><span>Gerçek Kasa</span><strong>${yazGercek} TL</strong></div>
        <div class="row"><span>Kasa Farkı</span><strong>${yazFark} TL</strong></div>
        <script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}</script>
      </body></html>`;

    const printWindow = window.open('', '_blank', 'width=400,height=700');
    if (!printWindow) {
      alert('Z raporu penceresi açılamadı.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // yeni masa bölümü ekleyen kod
  const masaBolumuEkle = async (e) => {
    e.preventDefault();

    const bolumAdi = yeniBolumAdi.trim();

    if (!bolumAdi) {
      alert('Lütfen bölüm adı girin.');
      return;
    }

    if (masaBolumleriListesi.some(b => b.toLowerCase() === bolumAdi.toLowerCase())) {
      alert('Bu bölüm zaten var.');
      return;
    }

    const { data, error } = await supabase
      .from('masa_bolumleri')
      .insert([
        {
          restaurant_id: mevcutRestaurantId,
          ad: bolumAdi,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Bölüm ekleme hatası:', error);
      alert('Bölüm eklenemedi: ' + error.message);
      return;
    }

    const yeniBolum = data.ad;

    setMasaBolumleri([...masaBolumleriListesi, yeniBolum]);
    setAktifMasaBolumu(yeniBolum);
    setYeniBolumAdi('');
  };
  // masa aktarma modunu başlatan kod
  const masaAktarmaBaslat = () => {
    if (!activeMasa || !activeMasa.dolu || !activeMasa.siparisler || activeMasa.siparisler.length === 0) {
      setAktarimMesaji('Aktarılacak dolu bir masa seçin.');
      return;
    }

    setMasaAktarmaModu(true);
    setAktarilanKaynakMasaId(activeMasa.id);
    setAktarimMesaji(`${activeMasa.ad} aktarılıyor. Aktarmak istediğiniz boş masaya tıklayın.`);
  };

  // masa aktarma modunu iptal eden kod
  const masaAktarmaIptalEt = () => {
    setMasaAktarmaModu(false);
    setAktarilanKaynakMasaId(null);
    setAktarimMesaji('');
  };

  // boş masaya tıklayınca adisyonu direkt aktaran kod
  const masaAktarTikla = async (hedefMasa) => {
    if (!masaAktarmaModu || !aktarilanKaynakMasaId) {
      setSelectedMasaId(hedefMasa.id);
      setAktifMasaBolumu(hedefMasa.bolum || 'Salon');
      return;
    }

    const kaynakMasa = tumRestoranMasalari.find(m => String(m.id) === String(aktarilanKaynakMasaId));

    if (!kaynakMasa) {
      setAktarimMesaji('Kaynak masa bulunamadı.');
      masaAktarmaIptalEt();
      return;
    }

    if (String(kaynakMasa.id) === String(hedefMasa.id)) {
      setAktarimMesaji('Aynı masaya aktarma yapılamaz. Boş bir masa seçin.');
      return;
    }

    if (hedefMasa.dolu || Number(hedefMasa.tutar || 0) > 0 || (hedefMasa.siparisler && hedefMasa.siparisler.length > 0)) {
      setAktarimMesaji('Bu masa dolu. Lütfen boş bir masa seçin.');
      return;
    }

    const { data: hedefData, error: hedefError } = await supabase
      .from('masalar')
      .update({
        dolu: true,
        tutar: Number(kaynakMasa.tutar || 0),
        siparisler: Array.isArray(kaynakMasa.siparisler) ? kaynakMasa.siparisler : [],
        odemeler: Array.isArray(kaynakMasa.odemeler) ? kaynakMasa.odemeler : [],
        adisyon_acilis_saati: kaynakMasa.adisyonAcilisSaati || new Date().toISOString(),
        adisyon_garson_adi: kaynakMasa.adisyonGarsonAdi || '',
      })
      .eq('id', hedefMasa.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (hedefError) {
      console.error('Hedef masa güncellenemedi:', hedefError);
      setAktarimMesaji('Masa aktarılamadı: ' + hedefError.message);
      return;
    }

    const { data: kaynakData, error: kaynakError } = await supabase
      .from('masalar')
      .update({
        dolu: false,
        tutar: 0,
        siparisler: [],
        odemeler: [],
        adisyon_acilis_saati: null,
        adisyon_garson_adi: null,
        musteri_adi: null,
      })
      .eq('id', kaynakMasa.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (kaynakError) {
      console.error('Kaynak masa boşaltılamadı:', kaynakError);
      setAktarimMesaji('Hedef masa aktarıldı ama eski masa boşaltılamadı: ' + kaynakError.message);
      return;
    }

    const guncelHedefMasa = {
      id: hedefData.id,
      restaurantId: hedefData.restaurant_id,
      ad: hedefData.ad,
      dolu: hedefData.dolu || false,
      tutar: Number(hedefData.tutar || 0),
      siparisler: Array.isArray(hedefData.siparisler) ? hedefData.siparisler : [],
      odemeler: Array.isArray(hedefData.odemeler) ? hedefData.odemeler : [],
      adisyonAcilisSaati: hedefData.adisyon_acilis_saati || null,
      adisyonGarsonAdi: hedefData.adisyon_garson_adi || '',
      musteriAdi: hedefData.musteri_adi || hedefMasa.musteriAdi || '',
      bolum: hedefData.bolum || hedefMasa.bolum || 'Salon',
    };

    const guncelKaynakMasa = {
      id: kaynakData.id,
      restaurantId: kaynakData.restaurant_id,
      ad: kaynakData.ad,
      dolu: kaynakData.dolu || false,
      tutar: Number(kaynakData.tutar || 0),
      siparisler: Array.isArray(kaynakData.siparisler) ? kaynakData.siparisler : [],
      odemeler: Array.isArray(kaynakData.odemeler) ? kaynakData.odemeler : [],
      adisyonAcilisSaati: kaynakData.adisyon_acilis_saati || null,
      adisyonGarsonAdi: kaynakData.adisyon_garson_adi || '',
      musteriAdi: kaynakData.musteri_adi || '',
      bolum: kaynakData.bolum || kaynakMasa.bolum || 'Salon',
    };

    setMasalar(masalar.map(m => {
      if (m.id === guncelHedefMasa.id) return guncelHedefMasa;
      if (m.id === guncelKaynakMasa.id) return guncelKaynakMasa;
      return m;
    }));

    setSelectedMasaId(guncelHedefMasa.id);
    setAktifMasaBolumu(guncelHedefMasa.bolum || 'Salon');
    setMasaAktarmaModu(false);
    setAktarilanKaynakMasaId(null);
    setAktarimMesaji(`${kaynakMasa.ad} → ${hedefMasa.ad} aktarıldı.`);
  };
  // masa bölümlerini açıp kapatan kod
  const masaBolumuAcKapat = (bolum) => {
    setAktifMasaBolumu(bolum);

    setAcikBolumler(prev => {
      const liste = Array.isArray(prev) ? prev : [];

      if (liste.includes(bolum)) {
        return liste.filter(b => b !== bolum);
      }

      return [...liste, bolum];
    });
  };


  // yeni masa ekleyen ve Supabase'e kaydeden kod
  const masaEkle = async (e) => {
    e.preventDefault();

    if (!yeniMasaAdi) {
      alert('Lütfen masa adı girin.');
      return;
    }

    const { data, error } = await supabase
      .from('masalar')
      .insert([
        {
          restaurant_id: mevcutRestaurantId,
          ad: yeniMasaAdi,
          bolum: aktifMasaBolumu || 'Salon',
          dolu: false,
          tutar: 0,
          siparisler: [],
          odemeler: [],
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Masa ekleme hatası:', error);
      alert('Masa eklenemedi: ' + error.message);
      return;
    }

    const yeniMasa = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      dolu: data.dolu || false,
      tutar: Number(data.tutar || 0),
      siparisler: Array.isArray(data.siparisler) ? data.siparisler : [],
      odemeler: Array.isArray(data.odemeler) ? data.odemeler : [],
      adisyonAcilisSaati: data.adisyon_acilis_saati || null,
      bolum: data.bolum || aktifMasaBolumu || 'Salon',
    };

    setMasalar([...masalar, yeniMasa]);
    setYeniMasaAdi('');
    setSelectedMasaId(yeniMasa.id);

  };

  // masa adı düzenleme modunu başlatan kod
  const masaDuzenlemeyiBaslat = (masa) => {
    setDuzenlenenMasaId(masa.id);
    setDuzenlenenMasaAdi(masa.ad);
  };

  // masa adı düzenleme modunu iptal eden kod
  const masaDuzenlemeyiIptalEt = () => {
    setDuzenlenenMasaId(null);
    setDuzenlenenMasaAdi('');
  };

  // masa adını Supabase'de güncelleyen kod
  const masaGuncelle = async (id) => {
    if (!duzenlenenMasaAdi) {
      alert('Lütfen masa adı girin.');
      return;
    }

    const { data, error } = await supabase
      .from('masalar')
      .update({
        ad: duzenlenenMasaAdi,
      })
      .eq('id', id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Masa güncelleme hatası:', error);
      alert('Masa güncellenemedi: ' + error.message);
      return;
    }

    const guncelMasa = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      dolu: data.dolu || false,
      tutar: Number(data.tutar || 0),
      siparisler: Array.isArray(data.siparisler) ? data.siparisler : [],
      odemeler: Array.isArray(data.odemeler) ? data.odemeler : [],
      adisyonAcilisSaati: data.adisyon_acilis_saati || null,
      bolum: data.bolum || aktifMasaBolumu || 'Salon',
    };

    setMasalar(masalar.map(m => {
      if (m.id === id) {
        return guncelMasa;
      }
      return m;
    }));

    masaDuzenlemeyiIptalEt();
  };

  // mutfak fişini hazırlandı yapıp ekrandan kaldıran kod
  const mutfakFisiniHazirla = async (id) => {
    const { error } = await supabase
      .from('mutfak_fisleri')
      .update({
        durum: 'Hazırlandı',
      })
      .eq('id', id);

    if (error) {
      console.error('Mutfak fişi güncellenemedi:', error);
      alert('Mutfak fişi güncellenemedi: ' + error.message);
      return;
    }

    // hazırlandıya basınca fişi ekrandan kaldıran kod
    setMutfakFisleri(mutfakFisleri.filter(f => f.id !== id));
  };
  // boş masayı Supabase'den silen kod
  const masaSil = async (masa) => {
    if (masa.dolu || Number(masa.tutar || 0) > 0 || (masa.siparisler && masa.siparisler.length > 0)) {
      alert('Bu masa dolu olduğu için silinemez. Önce hesabı kapatın.');
      return;
    }

    const onay = window.confirm(`"${masa.ad}" masasını silmek istediğine emin misin?`);

    if (!onay) {
      return;
    }

    const { error } = await supabase
      .from('masalar')
      .delete()
      .eq('id', masa.id)
      .eq('restaurant_id', mevcutRestaurantId);

    if (error) {
      console.error('Masa silme hatası:', error);
      alert('Masa silinemedi: ' + error.message);
      return;
    }

    setMasalar(masalar.filter(m => m.id !== masa.id));

    if (selectedMasaId === masa.id) {
      const kalanMasalar = masalar.filter(m => m.id !== masa.id);
      setSelectedMasaId(kalanMasalar.length > 0 ? kalanMasalar[0].id : null);
    }

  };


  // personel yetkisi seçme kutularını açıp kapatan kod
  const yeniPersonelYetkiDegistir = (sekmeKey, secili) => {
    setYeniPersonelYetkileri(prev => {
      const liste = Array.isArray(prev) ? prev : [];

      if (secili) {
        return Array.from(new Set([...liste, sekmeKey]));
      }

      const yeniListe = liste.filter(y => y !== sekmeKey);
      return yeniListe.length > 0 ? yeniListe : ['masalar'];
    });
  };

  // kayıtlı personelin ekran yetkisini güncelleyen kod
  const personelYetkisiniDegistir = async (personel, sekmeKey, secili) => {
    const mevcutYetkiler = yetkiListesiniHazirla(personel.tabYetkileri, personel.gorev || 'Garson');
    const yeniYetkiler = secili
      ? Array.from(new Set([...mevcutYetkiler, sekmeKey]))
      : mevcutYetkiler.filter(y => y !== sekmeKey);

    if (yeniYetkiler.length === 0) {
      alert('Personelin en az bir ekran yetkisi olmalı.');
      return;
    }

    const { error } = await supabase
      .from('personeller')
      .update({
        tab_yetkileri: yeniYetkiler,
      })
      .eq('id', personel.id)
      .eq('restaurant_id', mevcutRestaurantId);

    if (error) {
      console.error('Personel yetkisi güncellenemedi:', error);
      alert('Personel yetkisi güncellenemedi: ' + error.message);
      return;
    }

    if (personel.email) {
      await supabase
        .from('restaurants')
        .update({
          tab_yetkileri: yeniYetkiler,
          personel_gorev: personel.gorev || 'Personel',
        })
        .eq('email', personel.email)
        .eq('parent_restaurant_id', mevcutRestaurantId);
    }

    setPersoneller(personeller.map(p => {
      if (p.id === personel.id) {
        return {
          ...p,
          tabYetkileri: yeniYetkiler,
        };
      }

      return p;
    }));
  };

  // restoranın lisans kullanıcı limitini süper adminin güncellemesini sağlayan kod
  const restoranKullaniciLimitiGuncelle = async (restoran, limitDegeri) => {
    const yeniLimit = Math.max(Number(limitDegeri || 0), 0);

    const { data, error } = await supabase
      .from('restaurants')
      .update({
        kullanici_limiti: yeniLimit,
      })
      .eq('id', restoran.id)
      .select()
      .single();

    if (error) {
      console.error('Kullanıcı limiti güncellenemedi:', error);
      alert('Kullanıcı limiti güncellenemedi: ' + error.message);
      return;
    }

    setRestoranlar(restoranlar.map(r => {
      if (r.id === restoran.id) {
        return {
          ...r,
          kullaniciLimiti: Number(data.kullanici_limiti || yeniLimit),
        };
      }

      return r;
    }));
  };

  // restorana bağlı yeni personel kaydı oluşturan kod
  const personelEkle = async (e) => {
    e.preventDefault();

    const personelAdi = String(yeniGarsonAdi || '').trim();
    const personelGorevi = String(yeniPersonelGorevi || 'Garson').trim();
    const personelTelefon = String(yeniPersonelTelefon || '').trim();
    const personelEmail = String(yeniGarsonEmail || '').trim();
    const personelSifre = String(yeniGarsonSifre || '').trim();
    const seciliYetkiler = yetkiListesiniHazirla(yeniPersonelYetkileri, personelGorevi);

    if (!personelAdi) {
      alert('Lütfen personel adı girin.');
      return;
    }

    const { data: lisansData } = await supabase
      .from('restaurants')
      .select('kullanici_limiti')
      .eq('id', mevcutRestaurantId)
      .maybeSingle();

    const kullaniciLimiti = Number(lisansData?.kullanici_limiti || user?.kullaniciLimiti || 3);

    const { count: mevcutPersonelSayisi, error: sayimError } = await supabase
      .from('personeller')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', mevcutRestaurantId)
      .neq('durum', 'Pasif');

    if (sayimError) {
      console.error('Personel sayısı kontrol edilemedi:', sayimError);
      alert('Personel limiti kontrol edilemedi: ' + sayimError.message);
      return;
    }

    if (kullaniciLimiti > 0 && Number(mevcutPersonelSayisi || 0) >= kullaniciLimiti) {
      alert(`Bu işletmenin lisansında en fazla ${kullaniciLimiti} personel tanımlanabilir. Yeni personel eklemek için süper adminden kullanıcı sayısını artırın.`);
      return;
    }

    if (personelEmail) {
      const { data: existingUser } = await supabase
        .from('restaurants')
        .select('*')
        .eq('email', personelEmail)
        .maybeSingle();

      if (existingUser) {
        alert('Bu e-posta ile zaten bir giriş hesabı var.');
        return;
      }
    }

    const { data: personelData, error: personelError } = await supabase
      .from('personeller')
      .insert([
        {
          restaurant_id: mevcutRestaurantId,
          ad: personelAdi,
          gorev: personelGorevi,
          telefon: personelTelefon,
          email: personelEmail,
          sifre: personelSifre,
          durum: 'Aktif',
          tab_yetkileri: seciliYetkiler,
        },
      ])
      .select()
      .single();

    if (personelError) {
      console.error('Personel ekleme hatası:', personelError);
      alert('Personel eklenemedi: ' + personelError.message);
      return;
    }

    const yeniPersonel = {
      id: personelData.id,
      restaurantId: personelData.restaurant_id,
      ad: personelData.ad,
      gorev: personelData.gorev || personelGorevi,
      telefon: personelData.telefon || '',
      email: personelData.email || '',
      sifre: personelData.sifre || personelData.password || '',
      durum: personelData.durum || 'Aktif',
      tabYetkileri: yetkiListesiniHazirla(personelData.tab_yetkileri, personelGorevi),
      createdAt: personelData.created_at,
    };

    setPersoneller([...personeller, yeniPersonel]);

    // e-posta ve şifre girildiyse personelin giriş hesabını oluşturan kod
    if (personelEmail && personelSifre) {
      const { data: girisData, error: girisError } = await supabase
        .from('restaurants')
        .insert([
          {
            name: personelAdi,
            restaurant_name: `${user.restaurant} - ${personelAdi}`,
            waiter_name: personelAdi,
            email: personelEmail,
            password: personelSifre,
            durum: 'Aktif',
            rol: 'waiter',
            parent_restaurant_id: mevcutRestaurantId,
            personel_id: personelData.id,
            personel_gorev: personelGorevi,
            tab_yetkileri: seciliYetkiler,
          },
        ])
        .select()
        .single();

      if (girisError) {
        console.error('Personel giriş hesabı oluşturulamadı:', girisError);
        alert('Personel kaydedildi ama giriş hesabı oluşturulamadı: ' + girisError.message);
      } else if (girisData) {
        setGarsonlar([
          ...garsonlar,
          {
            id: girisData.id,
            ad: girisData.waiter_name || girisData.name,
            email: girisData.email,
            durum: girisData.durum,
            rol: girisData.rol,
            parentRestaurantId: girisData.parent_restaurant_id,
            tabYetkileri: seciliYetkiler,
          },
        ]);
      }
    }

    setYeniGarsonAdi('');
    setYeniPersonelGorevi('Garson');
    setYeniPersonelTelefon('');
    setYeniGarsonEmail('');
    setYeniGarsonSifre('');
    setYeniPersonelYetkileri(goreveGoreVarsayilanYetkiler('Garson'));
  };


  // yeni menü grubu ekleyen kod
  const menuGrubuEkle = async (e) => {
    e.preventDefault();

    const grupAdi = yeniMenuGrupAdi.trim();

    if (!grupAdi) {
      alert('Lütfen grup adı girin.');
      return;
    }

    if (aktifMenuGruplari.some(g => g.ad.toLowerCase() === grupAdi.toLowerCase())) {
      alert('Bu menü grubu zaten var.');
      return;
    }

    const kdvOrani = Number(String(yeniMenuGrupKdvOrani || 0).replace(',', '.')) || 0;

    if (kdvOrani < 0) {
      alert('KDV oranı negatif olamaz.');
      return;
    }

    const yeniGrupPayload = {
      restaurant_id: mevcutRestaurantId,
      ad: grupAdi,
      departman: yeniMenuGrupDepartmani || 'Mutfak',
      kdv_orani: kdvOrani,
      mutfaga_gitsin: yeniMenuGrupMutfagaGitsin,
    };

    const { data, error } = await supabase
      .from('menu_gruplari')
      .insert([yeniGrupPayload])
      .select()
      .single();

    if (error) {
      console.error('Menü grubu ekleme hatası:', error);
      alert('Menü grubu eklenemedi: ' + error.message);
      return;
    }

    const yeniGrup = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      departman: data.departman || 'Mutfak',
      kdvOrani: Number(data.kdv_orani || 10),
      mutfagaGitsin: data.mutfaga_gitsin !== false,
      stokTakip: Boolean(data.stok_takip),
      stokAdedi: Number(data.stok_adedi || 0),
      kritikStok: Number(data.kritik_stok || 0),
      favori: Boolean(data.favori),
    };

    setMenuGruplari([...menuGruplari, yeniGrup]);
    setAktifMenuGrubu(yeniGrup.ad);
    setYeniMenuGrupAdi('');
    setYeniMenuGrupDepartmani('Mutfak');
    setYeniMenuGrupKdvOrani('10');
    setYeniMenuGrupMutfagaGitsin(true);
  };

  // menü grubunun mutfağa gidip gitmeyeceğini ayarlayan kod
  const menuGrubuMutfakDurumunuAyarla = async (grup, yeniDurum) => {
    if (!grup || !grup.ad) {
      alert('Grup bulunamadı.');
      return;
    }

    const { data, error } = await supabase
      .from('menu_gruplari')
      .update({ mutfaga_gitsin: yeniDurum })
      .eq('id', grup.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Grup mutfak durumu güncellenemedi:', error);
      alert('Grup mutfak durumu güncellenemedi: ' + error.message);
      return;
    }

    await supabase
      .from('menu_urunleri')
      .update({ mutfaga_gitsin: yeniDurum })
      .eq('restaurant_id', mevcutRestaurantId)
      .eq('menu_grubu', grup.ad);

    const guncelGrup = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      departman: data.departman || grup.departman || 'Mutfak',
      kdvOrani: Number(data.kdv_orani || grup.kdvOrani || 10),
      mutfagaGitsin: data.mutfaga_gitsin !== false,
    };

    setMenuGruplari(menuGruplari.map(g => {
      if (String(g.id) === String(grup.id)) {
        return guncelGrup;
      }

      return g;
    }));

    setMenuUrunleri(menuUrunleri.map(u => {
      if (String(u.restaurantId) === String(mevcutRestaurantId) && (u.menuGrubu || u.kategori || 'Genel') === grup.ad) {
        return {
          ...u,
          mutfagaGitsin: yeniDurum,
        };
      }

      return u;
    }));
  };

  // menü grubu düzenleme modunu başlatan kod
  const menuGrubuDuzenlemeyiBaslat = (grup) => {
    if (!grup) return;

    setDuzenlenenMenuGrupId(grup.id);
    setDuzenlenenMenuGrupAdi(grup.ad || '');
    setDuzenlenenMenuGrupDepartmani(grup.departman || 'Mutfak');
    setDuzenlenenMenuGrupKdvOrani(String(grup.kdvOrani ?? 10));
    setDuzenlenenMenuGrupMutfagaGitsin(grup.mutfagaGitsin !== false);
  };

  // menü grubu düzenleme modunu iptal eden kod
  const menuGrubuDuzenlemeyiIptalEt = () => {
    setDuzenlenenMenuGrupId(null);
    setDuzenlenenMenuGrupAdi('');
    setDuzenlenenMenuGrupDepartmani('');
    setDuzenlenenMenuGrupKdvOrani('');
    setDuzenlenenMenuGrupMutfagaGitsin(true);
  };

  // menü grubunu güncelleyen ve bu gruptaki ürünlere departman/KDV/mutfak ayarını aktaran kod
  const menuGrubuGuncelle = async (grup) => {
    if (!grup || !grup.ad) {
      alert('Grup bulunamadı.');
      return;
    }

    const eskiGrupAdi = grup.ad;
    const yeniGrupAdi = duzenlenenMenuGrupAdi.trim();
    const yeniDepartman = duzenlenenMenuGrupDepartmani.trim() || 'Mutfak';
    const yeniKdv = Number(String(duzenlenenMenuGrupKdvOrani || 0).replace(',', '.')) || 0;

    if (!yeniGrupAdi) {
      alert('Lütfen grup adı girin.');
      return;
    }

    if (yeniKdv < 0) {
      alert('KDV oranı negatif olamaz.');
      return;
    }

    const ayniIsimliBaskaGrup = aktifMenuGruplari.some(g => {
      return String(g.id) !== String(grup.id) && g.ad.toLowerCase() === yeniGrupAdi.toLowerCase();
    });

    if (ayniIsimliBaskaGrup) {
      alert('Bu isimde başka bir grup var.');
      return;
    }

    let kayitliGrupData = null;
    const grupDbdeVarMi = !String(grup.id).startsWith('varsayilan-') && !String(grup.id).startsWith('demo-') && !String(grup.id).startsWith('urun-grup-');

    if (grupDbdeVarMi) {
      const { data, error } = await supabase
        .from('menu_gruplari')
        .update({
          ad: yeniGrupAdi,
          departman: yeniDepartman,
          kdv_orani: yeniKdv,
          mutfaga_gitsin: duzenlenenMenuGrupMutfagaGitsin,
        })
        .eq('id', grup.id)
        .eq('restaurant_id', mevcutRestaurantId)
        .select()
        .single();

      if (error) {
        console.error('Menü grubu güncelleme hatası:', error);
        alert('Menü grubu güncellenemedi: ' + error.message);
        return;
      }

      kayitliGrupData = data;
    } else {
      const { data, error } = await supabase
        .from('menu_gruplari')
        .insert([
          {
            restaurant_id: mevcutRestaurantId,
            ad: yeniGrupAdi,
            departman: yeniDepartman,
            kdv_orani: yeniKdv,
            mutfaga_gitsin: duzenlenenMenuGrupMutfagaGitsin,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Menü grubu kaydetme hatası:', error);
        alert('Menü grubu kaydedilemedi: ' + error.message);
        return;
      }

      kayitliGrupData = data;
    }

    const { error: urunGuncellemeError } = await supabase
      .from('menu_urunleri')
      .update({
        kategori: yeniGrupAdi,
        menu_grubu: yeniGrupAdi,
        departman: yeniDepartman,
        kdv_orani: yeniKdv,
        mutfaga_gitsin: duzenlenenMenuGrupMutfagaGitsin,
      })
      .eq('restaurant_id', mevcutRestaurantId)
      .eq('menu_grubu', eskiGrupAdi);

    if (urunGuncellemeError) {
      console.error('Grup ürünleri güncellenemedi:', urunGuncellemeError);
      alert('Grup güncellendi ama ürünler güncellenemedi: ' + urunGuncellemeError.message);
      return;
    }

    const guncelGrup = {
      id: kayitliGrupData.id,
      restaurantId: kayitliGrupData.restaurant_id,
      ad: kayitliGrupData.ad,
      departman: kayitliGrupData.departman || yeniDepartman,
      kdvOrani: Number(kayitliGrupData.kdv_orani || yeniKdv),
      mutfagaGitsin: kayitliGrupData.mutfaga_gitsin !== false,
    };

    setMenuGruplari(prev => {
      const liste = Array.isArray(prev) ? prev : [];
      const kalanlar = liste.filter(g => String(g.id) !== String(grup.id) && g.ad !== eskiGrupAdi);
      return [...kalanlar, guncelGrup];
    });

    setMenuUrunleri(menuUrunleri.map(u => {
      if (String(u.restaurantId) === String(mevcutRestaurantId) && (u.menuGrubu || u.kategori || 'Genel') === eskiGrupAdi) {
        return {
          ...u,
          kategori: guncelGrup.ad,
          menuGrubu: guncelGrup.ad,
          departman: guncelGrup.departman,
          kdvOrani: guncelGrup.kdvOrani,
          mutfagaGitsin: guncelGrup.mutfagaGitsin,
        };
      }

      return u;
    }));

    setAktifMenuGrubu(guncelGrup.ad);
    menuGrubuDuzenlemeyiIptalEt();
  };

  // boş menü grubunu silen kod
  const menuGrubuSil = async (grup) => {
    if (!grup || !grup.ad) {
      alert('Grup bulunamadı.');
      return;
    }

    const gruptakiUrunSayisi = aktifMenu.filter(u => {
      return (u.menuGrubu || u.kategori || 'Genel') === grup.ad;
    }).length;

    if (gruptakiUrunSayisi > 0) {
      alert('Bu grupta ürün var. Önce ürünleri başka gruba taşıyın, sonra grubu silin.');
      return;
    }

    const onay = window.confirm(`"${grup.ad}" grubunu silmek istediğine emin misin?`);

    if (!onay) return;

    const grupDbdeVarMi = !String(grup.id).startsWith('varsayilan-') && !String(grup.id).startsWith('demo-') && !String(grup.id).startsWith('urun-grup-');

    if (grupDbdeVarMi) {
      const { error } = await supabase
        .from('menu_gruplari')
        .delete()
        .eq('id', grup.id)
        .eq('restaurant_id', mevcutRestaurantId);

      if (error) {
        console.error('Menü grubu silme hatası:', error);
        alert('Menü grubu silinemedi: ' + error.message);
        return;
      }
    }

    const kalanGruplar = menuGruplari.filter(g => String(g.id) !== String(grup.id) && g.ad !== grup.ad);
    setMenuGruplari(kalanGruplar);

    const ilkGrup = kalanGruplar.find(g => String(g.restaurantId) === String(mevcutRestaurantId)) || aktifMenuGruplari.find(g => g.ad !== grup.ad);
    setAktifMenuGrubu(ilkGrup?.ad || 'Genel');
    menuGrubuDuzenlemeyiIptalEt();
  };

  // ürünü başka menü grubuna taşıyan ve grup ayarlarını ürüne aktaran kod
  const urunuBaskaGrubaTasi = async (urun, hedefGrupAdi) => {
    if (!urun || !urun.id || !hedefGrupAdi) {
      alert('Ürün veya hedef grup bulunamadı.');
      return;
    }

    const hedefGrup = aktifMenuGruplari.find(g => g.ad === hedefGrupAdi);

    if (!hedefGrup) {
      alert('Hedef grup bulunamadı.');
      return;
    }

    const { data, error } = await supabase
      .from('menu_urunleri')
      .update({
        kategori: hedefGrup.ad,
        menu_grubu: hedefGrup.ad,
        departman: hedefGrup.departman || 'Mutfak',
        kdv_orani: Number(hedefGrup.kdvOrani || 10),
        mutfaga_gitsin: hedefGrup.mutfagaGitsin !== false,
      })
      .eq('id', urun.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Ürün grup taşıma hatası:', error);
      alert('Ürün başka gruba taşınamadı: ' + error.message);
      return;
    }

    const tasinmisUrun = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      fiyat: Number(data.fiyat || 0),
      maliyet: Number(data.maliyet || 0),
      kategori: data.menu_grubu || data.kategori || hedefGrup.ad,
      menuGrubu: data.menu_grubu || data.kategori || hedefGrup.ad,
      departman: data.departman || hedefGrup.departman || 'Mutfak',
      kdvOrani: Number(data.kdv_orani || hedefGrup.kdvOrani || 10),
      menuNotlari: Array.isArray(data.menu_notlari) ? data.menu_notlari : [],
      mutfagaGitsin: data.mutfaga_gitsin !== false,
      stokTakip: Boolean(data.stok_takip),
      stokAdedi: Number(data.stok_adedi || 0),
      kritikStok: Number(data.kritik_stok || 0),
      favori: Boolean(data.favori),
    };

    setMenuUrunleri(menuUrunleri.map(u => {
      if (String(u.id) === String(urun.id)) {
        return tasinmisUrun;
      }

      return u;
    }));
  };

  // menüye yeni ürün ekleyen ve Supabase'e kaydeden kod
  const urunEkle = async (e) => {
    e.preventDefault();

    if (!yeniUrunAdi || !yeniUrunFiyati) {
      alert('Lütfen ürün adı ve fiyat girin.');
      return;
    }

    const urunGrubu = aktifGrup || { ad: aktifMenuGrubu || 'Genel', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true };

    const { data, error } = await supabase
      .from('menu_urunleri')
      .insert([
        {
          restaurant_id: mevcutRestaurantId,
          ad: yeniUrunAdi,
          fiyat: Number(yeniUrunFiyati),
          maliyet: sayiyaCevir(yeniUrunMaliyeti || 0),
          kategori: urunGrubu.ad,
          menu_grubu: urunGrubu.ad,
          departman: urunGrubu.departman || 'Mutfak',
          kdv_orani: Number(urunGrubu.kdvOrani || 10),
          menu_notlari: [],
          mutfaga_gitsin: urunGrubu.mutfagaGitsin !== false,
          stok_takip: false,
          stok_adedi: 0,
          kritik_stok: 0,
          favori: false,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Ürün ekleme hatası:', error);
      alert('Ürün eklenemedi: ' + error.message);
      return;
    }

    const yeniUrun = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      fiyat: Number(data.fiyat || 0),
      maliyet: Number(data.maliyet || 0),
      kategori: data.menu_grubu || data.kategori || urunGrubu.ad,
      menuGrubu: data.menu_grubu || data.kategori || urunGrubu.ad,
      departman: data.departman || urunGrubu.departman || 'Mutfak',
      kdvOrani: Number(data.kdv_orani || urunGrubu.kdvOrani || 10),
      menuNotlari: Array.isArray(data.menu_notlari) ? data.menu_notlari : [],
      mutfagaGitsin: data.mutfaga_gitsin !== false,
      stokTakip: Boolean(data.stok_takip),
      stokAdedi: Number(data.stok_adedi || 0),
      kritikStok: Number(data.kritik_stok || 0),
      favori: Boolean(data.favori),
    };

    setMenuUrunleri([...menuUrunleri, yeniUrun]);
    setYeniUrunAdi('');
    setYeniUrunFiyati('');
    setYeniUrunMaliyeti('');
  };
  // ürün düzenleme modunu başlatan kod
  const urunDuzenlemeyiBaslat = (urun) => {
    setDuzenlenenUrunId(urun.id);
    setDuzenlenenUrunAdi(urun.ad);
    setDuzenlenenUrunFiyati(String(urun.fiyat));
    setDuzenlenenUrunMaliyeti(String(urun.maliyet || 0));
  };

  // ürün düzenleme modunu iptal eden kod
  const urunDuzenlemeyiIptalEt = () => {
    setDuzenlenenUrunId(null);
    setDuzenlenenUrunAdi('');
    setDuzenlenenUrunFiyati('');
    setDuzenlenenUrunMaliyeti('');
  };

  // ürün adını ve fiyatını Supabase'de güncelleyen, hazır notları koruyan kod
  const urunGuncelle = async (id) => {
    if (!duzenlenenUrunAdi || !duzenlenenUrunFiyati) {
      alert('Lütfen ürün adı ve fiyat girin.');
      return;
    }

    const eskiUrun = menuUrunleri.find(u => u.id === id);

    const { data, error } = await supabase
      .from('menu_urunleri')
      .update({
        ad: duzenlenenUrunAdi,
        fiyat: Number(duzenlenenUrunFiyati),
        kategori: eskiUrun?.menuGrubu || eskiUrun?.kategori || aktifGrup.ad || 'Genel',
        menu_grubu: eskiUrun?.menuGrubu || eskiUrun?.kategori || aktifGrup.ad || 'Genel',
        departman: eskiUrun?.departman || aktifGrup.departman || 'Mutfak',
        kdv_orani: Number(eskiUrun?.kdvOrani || aktifGrup.kdvOrani || 10),
        menu_notlari: Array.isArray(eskiUrun?.menuNotlari) ? eskiUrun.menuNotlari : [],
        mutfaga_gitsin: eskiUrun?.mutfagaGitsin !== false,
      })
      .eq('id', id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Ürün güncelleme hatası:', error);
      alert('Ürün güncellenemedi: ' + error.message);
      return;
    }

    const guncelUrun = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      fiyat: Number(data.fiyat || 0),
      maliyet: Number(data.maliyet || 0),
      kategori: data.menu_grubu || data.kategori || 'Genel',
      menuGrubu: data.menu_grubu || data.kategori || 'Genel',
      departman: data.departman || 'Mutfak',
      kdvOrani: Number(data.kdv_orani || 10),
      menuNotlari: Array.isArray(data.menu_notlari) ? data.menu_notlari : [],
      mutfagaGitsin: data.mutfaga_gitsin !== false,
      stokTakip: Boolean(data.stok_takip),
      stokAdedi: Number(data.stok_adedi || 0),
      kritikStok: Number(data.kritik_stok || 0),
      favori: Boolean(data.favori),
    };

    setMenuUrunleri(menuUrunleri.map(u => {
      if (u.id === id) {
        return guncelUrun;
      }

      return u;
    }));

    urunDuzenlemeyiIptalEt();
  };

  // ürünü Supabase'den silen kod
  const urunSil = async (id) => {
    const onay = window.confirm('Bu ürünü silmek istediğine emin misin?');

    if (!onay) {
      return;
    }

    const { error } = await supabase
      .from('menu_urunleri')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', mevcutRestaurantId);

    if (error) {
      console.error('Ürün silme hatası:', error);
      alert('Ürün silinemedi: ' + error.message);
      return;
    }

    setMenuUrunleri(menuUrunleri.filter(u => u.id !== id));

    if (String(seciliUrunId) === String(id)) {
      setSeciliUrunId('');
    }
  };

  // ürün için hazır not/seçenek ekleyen kod
  const menuNotuEkle = async (urun) => {
    if (!yeniMenuNotuAdi) {
      alert('Lütfen not/seçenek adı girin.');
      return;
    }

    const ekstraFiyat = Number(String(yeniMenuNotuFiyati || 0).replace(',', '.')) || 0;

    if (ekstraFiyat < 0) {
      alert('Ekstra fiyat negatif olamaz.');
      return;
    }

    const mevcutNotlar = Array.isArray(urun.menuNotlari) ? urun.menuNotlari : [];

    const yeniNot = {
      id: Date.now(),
      ad: yeniMenuNotuAdi.trim(),
      fiyat: ekstraFiyat,
    };

    const guncelNotlar = [...mevcutNotlar, yeniNot];

    const { data, error } = await supabase
      .from('menu_urunleri')
      .update({
        menu_notlari: guncelNotlar,
        mutfaga_gitsin: urun.mutfagaGitsin !== false,
      })
      .eq('id', urun.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Ürün notu ekleme hatası:', error);
      alert('Ürün notu eklenemedi: ' + error.message);
      return;
    }

    const guncelUrun = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      fiyat: Number(data.fiyat || 0),
      maliyet: Number(data.maliyet || 0),
      kategori: data.menu_grubu || data.kategori || 'Genel',
      menuGrubu: data.menu_grubu || data.kategori || 'Genel',
      departman: data.departman || 'Mutfak',
      kdvOrani: Number(data.kdv_orani || 10),
      menuNotlari: Array.isArray(data.menu_notlari) ? data.menu_notlari : [],
      mutfagaGitsin: data.mutfaga_gitsin !== false,
      stokTakip: Boolean(data.stok_takip),
      stokAdedi: Number(data.stok_adedi || 0),
      kritikStok: Number(data.kritik_stok || 0),
      favori: Boolean(data.favori),
    };

    setMenuUrunleri(menuUrunleri.map(u => {
      if (u.id === urun.id) {
        return guncelUrun;
      }

      return u;
    }));

    setYeniMenuNotuAdi('');
    setYeniMenuNotuFiyati('');
  };

  // ürün için tanımlı hazır not/seçeneği silen kod
  const menuNotuSil = async (urun, notId) => {
    const mevcutNotlar = Array.isArray(urun.menuNotlari) ? urun.menuNotlari : [];

    const guncelNotlar = mevcutNotlar.filter(n => {
      return String(n.id) !== String(notId);
    });

    const { data, error } = await supabase
      .from('menu_urunleri')
      .update({
        menu_notlari: guncelNotlar,
        mutfaga_gitsin: urun.mutfagaGitsin !== false,
      })
      .eq('id', urun.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Ürün notu silme hatası:', error);
      alert('Ürün notu silinemedi: ' + error.message);
      return;
    }

    const guncelUrun = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      fiyat: Number(data.fiyat || 0),
      maliyet: Number(data.maliyet || 0),
      kategori: data.menu_grubu || data.kategori || 'Genel',
      menuGrubu: data.menu_grubu || data.kategori || 'Genel',
      departman: data.departman || 'Mutfak',
      kdvOrani: Number(data.kdv_orani || 10),
      menuNotlari: Array.isArray(data.menu_notlari) ? data.menu_notlari : [],
      mutfagaGitsin: data.mutfaga_gitsin !== false,
      stokTakip: Boolean(data.stok_takip),
      stokAdedi: Number(data.stok_adedi || 0),
      kritikStok: Number(data.kritik_stok || 0),
      favori: Boolean(data.favori),
    };

    setMenuUrunleri(menuUrunleri.map(u => {
      if (u.id === urun.id) {
        return guncelUrun;
      }

      return u;
    }));
  };

  // ürünün mutfağa gidip gitmeyeceğini seçime göre ayarlayan kod
  const urunMutfakDurumunuAyarla = async (urun, yeniDurum) => {
    if (!urun || !urun.id) {
      alert('Ürün bulunamadı.');
      return;
    }

    const { data, error } = await supabase
      .from('menu_urunleri')
      .update({
        mutfaga_gitsin: yeniDurum,
      })
      .eq('id', urun.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Mutfak durumu güncellenemedi:', error);
      alert('Mutfak durumu güncellenemedi: ' + error.message);
      return;
    }

    const guncelUrun = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      fiyat: Number(data.fiyat || 0),
      maliyet: Number(data.maliyet || 0),
      kategori: data.menu_grubu || data.kategori || 'Genel',
      menuGrubu: data.menu_grubu || data.kategori || 'Genel',
      departman: data.departman || 'Mutfak',
      kdvOrani: Number(data.kdv_orani || 10),
      menuNotlari: Array.isArray(data.menu_notlari) ? data.menu_notlari : [],
      mutfagaGitsin: data.mutfaga_gitsin !== false,
      stokTakip: Boolean(data.stok_takip),
      stokAdedi: Number(data.stok_adedi || 0),
      kritikStok: Number(data.kritik_stok || 0),
      favori: Boolean(data.favori),
    };

    setMenuUrunleri(menuUrunleri.map(u => {
      if (u.id === urun.id) {
        return guncelUrun;
      }

      return u;
    }));
  };
  // seçili rapor tipine göre satışları filtreleyen kod
  const raporSatislariniFiltrele = () => {
    const bugunStr = new Date().toISOString().split('T')[0];
    const seciliTarih = raporTarihi || bugunStr;
    const seciliAy = seciliTarih.substring(0, 7);
    const baslangic = raporBaslangicTarihi || seciliTarih;
    const bitis = raporBitisTarihi || baslangic;

    let filtrelenmisSatislar = satisGecmisi.filter(s => {
      return String(s.restaurantId) === String(mevcutRestaurantId) && !s.gunSonuKapandi;
    });

    if (reportType === 'gunluk') {
      filtrelenmisSatislar = filtrelenmisSatislar.filter(s => String(s.tarih || '') === seciliTarih);
    } else if (reportType === 'aylik') {
      filtrelenmisSatislar = filtrelenmisSatislar.filter(s => String(s.tarih || '').startsWith(seciliAy));
    } else {
      filtrelenmisSatislar = filtrelenmisSatislar.filter(s => {
        const tarih = String(s.tarih || '');
        return tarih >= baslangic && tarih <= bitis;
      });
    }

    return filtrelenmisSatislar;
  };

  // seçili rapor dönemine göre gider kayıtlarını filtreleyen kod
  const raporGiderleriniFiltrele = () => {
    const bugunStr = new Date().toISOString().split('T')[0];
    const seciliTarih = raporTarihi || bugunStr;
    const seciliAy = seciliTarih.substring(0, 7);
    const baslangic = raporBaslangicTarihi || seciliTarih;
    const bitis = raporBitisTarihi || baslangic;

    let liste = giderler.filter(g => {
      return String(g.restaurantId) === String(mevcutRestaurantId) && !g.gunSonuKapandi;
    });

    if (reportType === 'gunluk') {
      return liste.filter(g => String(g.tarih || '') === seciliTarih);
    }

    if (reportType === 'aylik') {
      return liste.filter(g => String(g.tarih || '').startsWith(seciliAy));
    }

    return liste.filter(g => {
      const tarih = String(g.tarih || '');
      return tarih >= baslangic && tarih <= bitis;
    });
  };

  // seçili rapor dönemine göre iade / ikram / zayi kayıtlarını filtreleyen kod
  const raporIadeKayitlariniFiltrele = () => {
    const bugunStr = new Date().toISOString().split('T')[0];
    const seciliTarih = raporTarihi || bugunStr;
    const seciliAy = seciliTarih.substring(0, 7);
    const baslangic = raporBaslangicTarihi || seciliTarih;
    const bitis = raporBitisTarihi || baslangic;

    let liste = iadeKayitlari.filter(i => {
      return String(i.restaurantId) === String(mevcutRestaurantId) && !i.gunSonuKapandi;
    });

    if (reportType === 'gunluk') {
      return liste.filter(i => String(i.tarih || '') === seciliTarih);
    }

    if (reportType === 'aylik') {
      return liste.filter(i => String(i.tarih || '').startsWith(seciliAy));
    }

    return liste.filter(i => {
      const tarih = String(i.tarih || '');
      return tarih >= baslangic && tarih <= bitis;
    });
  };

  // rapor periyodunu yazıya çeviren kod
  const raporBasligi = () => {
    if (reportType === 'gunluk') {
      return `Günlük Rapor - ${raporTarihi}`;
    }

    if (reportType === 'aylik') {
      return `Aylık Rapor - ${(raporTarihi || new Date().toISOString().split('T')[0]).substring(0, 7)}`;
    }

    return `Tarih Aralığı - ${raporBaslangicTarihi} / ${raporBitisTarihi}`;
  };

  // satış geçmişinden günlük, aylık ve tarih aralıklı raporları hesaplayan kod
  const raporlariGetir = () => {
    const filtrelenmisSatislar = raporSatislariniFiltrele();
    const urunOzetMap = {};
    let toplamCiro = 0;
    let toplamIndirim = 0;

    filtrelenmisSatislar.forEach(s => {
      const notEki = s.not ? ` / Not: ${s.not}` : '';
      const urunAnahtari = `${s.ad}${notEki}`;
      const toplamUrunTutari = Number(s.fiyat || 0) * Number(s.adet || 1);
      toplamCiro += toplamUrunTutari;
      toplamIndirim += Number(s.indirimTutari || 0) * Number(s.adet || 1);

      if (urunOzetMap[urunAnahtari]) {
        urunOzetMap[urunAnahtari].adet += Number(s.adet || 1);
        urunOzetMap[urunAnahtari].ciro += toplamUrunTutari;
        urunOzetMap[urunAnahtari].indirimTutari += Number(s.indirimTutari || 0) * Number(s.adet || 1);
      } else {
        urunOzetMap[urunAnahtari] = {
          ad: s.ad,
          not: s.not || '',
          menuGrubu: s.menuGrubu || 'Genel',
          departman: s.departman || 'Mutfak',
          kdvOrani: Number(s.kdvOrani || 10),
          adet: Number(s.adet || 1),
          ciro: toplamUrunTutari,
          indirimTutari: Number(s.indirimTutari || 0) * Number(s.adet || 1),
          fiyat: Number(s.fiyat || 0),
        };
      }
    });

    const garsonOzetMap = {};

    filtrelenmisSatislar.forEach(s => {
      const garsonAdi = s.garsonAdi || 'Belirtilmedi';
      const tutar = Number(s.fiyat || 0) * Number(s.adet || 1);

      if (!garsonOzetMap[garsonAdi]) {
        garsonOzetMap[garsonAdi] = { garsonAdi, adisyonSayisi: 0, urunAdedi: 0, ciro: 0, _adisyonlar: new Set() };
      }

      garsonOzetMap[garsonAdi].urunAdedi += Number(s.adet || 1);
      garsonOzetMap[garsonAdi].ciro += tutar;

      const adisyonAnahtari = s.adisyonId || `${s.masaId || 'masa'}-${s.tarih}-${garsonAdi}`;
      garsonOzetMap[garsonAdi]._adisyonlar.add(adisyonAnahtari);
      garsonOzetMap[garsonAdi].adisyonSayisi = garsonOzetMap[garsonAdi]._adisyonlar.size;
    });

    const garsonOzetleri = Object.values(garsonOzetMap).map(g => ({
      garsonAdi: g.garsonAdi,
      adisyonSayisi: g.adisyonSayisi,
      urunAdedi: g.urunAdedi,
      ciro: g.ciro,
    }));

    const raporGiderleri = raporGiderleriniFiltrele();
    const raporIadeKayitlari = raporIadeKayitlariniFiltrele();
    const giderToplam = raporGiderleri.reduce((t, g) => t + Number(g.tutar || 0), 0);
    const iadeIkramZayiToplam = raporIadeKayitlari.reduce((t, i) => t + Number(i.tutar || 0), 0);

    const sayilanAdisyonlar = new Set();
    let nakitToplam = 0;
    let kartToplam = 0;
    let digerOdemeToplam = 0;

    filtrelenmisSatislar.forEach(s => {
      const odemeler = Array.isArray(s.odemeler) ? s.odemeler : [];

      if (odemeler.length === 0) {
        return;
      }

      const adisyonAnahtari =
        s.adisyonId ||
        `${s.masaId || 'masa'}-${s.tarih}-${JSON.stringify(odemeler)}`;

      if (sayilanAdisyonlar.has(adisyonAnahtari)) {
        return;
      }

      sayilanAdisyonlar.add(adisyonAnahtari);

      odemeler.forEach(odeme => {
        const tip = String(odeme.tip || '').toLowerCase();
        const tutar = Number(odeme.tutar || 0);

        if (tip.includes('nakit')) {
          nakitToplam += tutar;
        } else if (tip.includes('kart')) {
          kartToplam += tutar;
        } else {
          digerOdemeToplam += tutar;
        }
      });
    });

    const paketMap = {};
    filtrelenmisSatislar
      .filter(s => s.siparisTipi === 'Paket Servis' || s.paketSiparisId)
      .forEach(s => {
        const anahtar = s.paketSiparisId || s.adisyonId || `${s.tarih}-${s.musteriAdi || 'paket'}`;
        const satirToplam = Number(s.fiyat || 0) * Number(s.adet || 1);
        if (!paketMap[anahtar]) {
          paketMap[anahtar] = {
            id: anahtar,
            tarih: s.tarih,
            musteriAdi: s.musteriAdi || 'Paket Müşterisi',
            odemeTipi: s.odemeTipi || 'Belirtilmedi',
            kuryeAdi: s.garsonAdi || '-',
            toplam: 0,
            adet: 0,
            urunler: [],
          };
        }

        paketMap[anahtar].toplam += satirToplam;
        paketMap[anahtar].adet += Number(s.adet || 1);
        paketMap[anahtar].urunler.push({
          ad: s.ad,
          adet: Number(s.adet || 1),
          fiyat: Number(s.fiyat || 0),
          not: s.not || '',
          toplam: satirToplam,
        });
      });

    const paketRaporu = Object.values(paketMap).sort((a, b) => String(b.tarih).localeCompare(String(a.tarih)));
    const paketToplam = paketRaporu.reduce((t, p) => t + Number(p.toplam || 0), 0);

    return {
      liste: Object.values(urunOzetMap),
      paketRaporu,
      paketToplam,
      toplamCiro,
      toplamIndirim,
      nakitToplam,
      kartToplam,
      digerOdemeToplam,
      giderToplam,
      iadeIkramZayiToplam,
      raporGiderleri,
      raporIadeKayitlari,
      garsonOzetleri,
    };
  };

  // kapatılan adisyonları tek tek listelemek için satış geçmişini gruplayan kod
  const adisyonGecmisiniGetir = () => {
    const filtrelenmisSatislar = raporSatislariniFiltrele();
    const adisyonMap = {};

    filtrelenmisSatislar.forEach(s => {
      const odemeler = Array.isArray(s.odemeler) ? s.odemeler : [];
      const adisyonAnahtari =
        s.adisyonId ||
        `${s.masaId || 'masa'}-${s.tarih}-${JSON.stringify(odemeler)}`;

      if (!adisyonMap[adisyonAnahtari]) {
        adisyonMap[adisyonAnahtari] = {
          id: adisyonAnahtari,
          masaId: s.masaId,
          masaAdi: s.masaAdi,
          musteriAdi: s.musteriAdi || '',
          tarih: s.tarih,
          toplam: 0,
          toplamIndirim: 0,
          urunler: [],
          odemeler: odemeler,
          odemeTipi: s.odemeTipi || 'Belirtilmedi',
          adisyonAcilisSaati: s.adisyonAcilisSaati || null,
          adisyonKapanisSaati: s.adisyonKapanisSaati || null,
          siparisTipi: s.siparisTipi || 'Masa',
        };
      }

      const satirToplam = Number(s.fiyat || 0) * Number(s.adet || 1);
      const satirIndirim = Number(s.indirimTutari || 0) * Number(s.adet || 1);

      adisyonMap[adisyonAnahtari].toplam += satirToplam;
      adisyonMap[adisyonAnahtari].toplamIndirim += satirIndirim;

      adisyonMap[adisyonAnahtari].urunler.push({
        ad: s.ad,
        not: s.not || '',
        fiyat: Number(s.fiyat || 0),
        adet: Number(s.adet || 1),
        toplam: satirToplam,
        normalFiyat: Number(s.normalFiyat || s.fiyat || 0),
        listeFiyati: Number(s.listeFiyati || s.normalFiyat || s.fiyat || 0),
        satisFiyati: Number(s.satisFiyati || s.fiyat || 0),
        indirimYuzde: Number(s.indirimYuzde || 0),
        indirimTutari: Number(s.indirimTutari || 0),
        fiyatDegistirildi: Boolean(s.fiyatDegistirildi),
        menuGrubu: s.menuGrubu || 'Genel',
        departman: s.departman || 'Mutfak',
        kdvOrani: Number(s.kdvOrani || 10),
      });
    });

    return Object.values(adisyonMap).sort((a, b) => {
      return String(b.tarih).localeCompare(String(a.tarih));
    });
  };

  // ödeme listesini okunabilir yazıya çeviren kod
  const odemeOzetYazisi = (odemeler = []) => {
    if (!odemeler || odemeler.length === 0) {
      return 'Ödeme bilgisi yok';
    }

    return odemeler
      .map(o => {
        const alinan = Number(o.alinanTutar || 0);
        const tutar = Number(o.tutar || 0);
        const paraUstu = Number(o.paraUstu || 0);

        if (alinan > tutar && paraUstu > 0) {
          return `${o.tip}: ${tutar} TL (Alınan: ${alinan} TL / Para üstü: ${paraUstu} TL)`;
        }

        return `${o.tip}: ${tutar} TL`;
      })
      .join(' / ');
  };

  // adisyon panelinde seçili ürünü bulmak için kullanılan kod
  const seciliMenuUrunu = aktifMenu.find(u => String(u.id) === String(seciliUrunId));
  // paket servis ekranında seçili ürünü bulmak için kullanılan kod
  const paketSeciliMenuUrunu = aktifMenu.find(u => String(u.id) === String(paketSeciliUrunId));
  // seçili masayı tüm bölümler içinden bulan kod
  const activeMasa = Array.isArray(tumRestoranMasalari)
    ? tumRestoranMasalari.find(m => m.id === selectedMasaId) || aktifMasalar[0] || tumRestoranMasalari[0]
    : null;

  // ürün eklerken sağ panelde anlık fiyat/indirim sonucunu gösteren kod
  const seciliUrunFiyatBilgisi = urunFiyatHesapla(
    seciliMenuUrunu,
    seciliUrunHazirNotId,
    seciliUrunEkstraFiyat,
    seciliUrunSatisFiyati,
    seciliUrunIndirimYuzde,
    seciliUrunIndirimTutari
  );

  // adisyon ekranında ürün butonuna basılınca ürünü seçen kod
  const adisyondaUrunSec = (urun) => {
    if (!urun) return;

    setSeciliUrunId(String(urun.id));
    setSeciliUrunHazirNotId('');
    setSeciliUrunNotu('');
    setSeciliUrunEkstraFiyat('');
    setSeciliUrunSatisFiyati('');
    setSeciliUrunIndirimYuzde('');
    setSeciliUrunIndirimTutari('');
  };

  // paket servis ekranında ürün kartına basılınca ürünü seçen kod
  const paketteUrunSec = (urun) => {
    if (!urun) return;

    setPaketSeciliUrunId(String(urun.id));
  };

  // ödeme alanında girilen paraya göre para üstünü hesaplayan kod
  const odemeGirisTutari = sayiyaCevir(odemeTutariInput);
  const aktifMasaKalanTutar = activeMasa ? kalanTutar(activeMasa) : 0;
  const paraUstuTutari = activeMasa ? Math.max(odemeGirisTutari - aktifMasaKalanTutar, 0) : 0;

  // seçili masa değişince müşteri adı inputunu güncelleyen kod
  useEffect(() => {
    setMusteriAdiInput(activeMasa?.musteriAdi || '');
  }, [activeMasa?.id, activeMasa?.musteriAdi]);

  // menü grupları değişince adisyon ve paket servis ürün seçim grubunu güvenli tutan kod
  useEffect(() => {
    if (!Array.isArray(aktifMenuGruplari) || aktifMenuGruplari.length === 0) return;

    const aktifAdisyonGrubuVar = aktifMenuGruplari.some(g => g.ad === aktifAdisyonMenuGrubu);
    const aktifPaketGrubuVar = aktifMenuGruplari.some(g => g.ad === aktifPaketMenuGrubu);

    if (!aktifAdisyonGrubuVar) {
      setAktifAdisyonMenuGrubu(aktifMenuGruplari[0].ad);
    }

    if (!aktifPaketGrubuVar) {
      setAktifPaketMenuGrubu(aktifMenuGruplari[0].ad);
    }
  }, [mevcutRestaurantId, aktifMenuGruplari.length]);

  // rapor verisi bozuk gelse bile beyaz ekran olmaması için varsayılan rapor kodu
  const bosRaporData = {
    liste: [],
    toplamCiro: 0,
    toplamIndirim: 0,
    nakitToplam: 0,
    kartToplam: 0,
    digerOdemeToplam: 0,
    garsonOzetleri: [],
    paketRaporu: [],
    paketToplam: 0,
  };

  let raporData = bosRaporData;
  let adisyonGecmisiData = [];

  try {
    if (activeTab === 'raporlar') {
      raporData = typeof raporlariGetir === 'function' ? raporlariGetir() : bosRaporData;
      adisyonGecmisiData = typeof adisyonGecmisiniGetir === 'function' ? adisyonGecmisiniGetir() : [];
    }
  } catch (err) {
    console.error('Rapor verisi hazırlanırken hata oluştu:', err);
    raporData = bosRaporData;
    adisyonGecmisiData = [];
  }
  // kullanıcının yetkisi olmayan sekmede kalmasını engelleyen kod
  useEffect(() => {
    if (!user || screen !== 'dashboard') return;

    if (!tabGorunur(activeTab)) {
      setActiveTab(kullaniciSekmeleri[0] || 'masalar');
    }
  }, [user?.id, screen, activeTab]);

  // açık ekran bilgisini yenileme sonrası koruyan kod
  useEffect(() => {
    localStorage.setItem('integra_screen', screen);
  }, [screen]);
  // aktif panel sekmesini yenileme sonrası koruyan kod
  useEffect(() => {
    localStorage.setItem('integra_activeTab', activeTab);
  }, [activeTab]);

  // fiş yazdırma tercih ayarını tarayıcıda saklayan kod
  useEffect(() => {
    localStorage.setItem('integra_fis_yazdirma_modu', fisYazdirmaModu);
  }, [fisYazdirmaModu]);

  // sayfa yenilenince oturum verilerini Supabase'den tekrar yükleyen kod
  useEffect(() => {
    if (!user || screen !== 'dashboard') return;

    const verileriYenidenYukle = async () => {
      try {
        if (user.role === 'super_admin') {
          await restoranlariSupabasedenCek();
          return;
        }

        const aktifRestaurantId =
          user.role === 'waiter'
            ? user.parentRestaurantId
            : user.restaurantId;

        if (typeof mutfakFisleriniSupabasedenCek === 'function') {
          await mutfakFisleriniSupabasedenCek(aktifRestaurantId);
        }

        await masaBolumleriniSupabasedenCek(aktifRestaurantId);
        await masalariSupabasedenCek(aktifRestaurantId);
        await menuGruplariniSupabasedenCek(aktifRestaurantId);
        await menuUrunleriniSupabasedenCek(aktifRestaurantId);

        if (typeof paketSiparisleriniSupabasedenCek === 'function') {
          await paketSiparisleriniSupabasedenCek(aktifRestaurantId);
        }

        if (typeof paketMusterileriniSupabasedenCek === 'function') {
          await paketMusterileriniSupabasedenCek(aktifRestaurantId);
        }

        if (typeof cariMusterileriSupabasedenCek === 'function') {
          await cariMusterileriSupabasedenCek(aktifRestaurantId);
        }

        if (typeof kasaHareketleriniSupabasedenCek === 'function') {
          await kasaHareketleriniSupabasedenCek(aktifRestaurantId);
        }

        if (typeof zRaporlariniSupabasedenCek === 'function') {
          await zRaporlariniSupabasedenCek(aktifRestaurantId);
        }


        if (typeof giderleriSupabasedenCek === 'function') {
          await giderleriSupabasedenCek(aktifRestaurantId);
        }

        if (typeof iadeKayitlariniSupabasedenCek === 'function') {
          await iadeKayitlariniSupabasedenCek(aktifRestaurantId);
        }

        if (typeof rezervasyonlariSupabasedenCek === 'function') {
          await rezervasyonlariSupabasedenCek(aktifRestaurantId);
        }

        if (typeof satisGecmisiniSupabasedenCek === 'function') {
          await satisGecmisiniSupabasedenCek(aktifRestaurantId);
        }

        if (user.role === 'owner' && typeof garsonlariSupabasedenCek === 'function') {
          await garsonlariSupabasedenCek(aktifRestaurantId);
        }

        if (typeof personelleriSupabasedenCek === 'function') {
          await personelleriSupabasedenCek(aktifRestaurantId);
        }
      } catch (err) {
        console.error('Oturum verileri tekrar yüklenemedi:', err);
      }
    };

    verileriYenidenYukle();
  }, [user?.id]);

  return (
    <div style={styles.appViewport}>
      {/* ödeme sonrası fiş yazdırma sorusunu ortada estetik modal olarak gösteren kod */}
      {fisSorModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#fff',
              borderRadius: '18px',
              padding: '24px',
              boxShadow: '0 30px 80px -30px rgba(15,23,42,0.45)',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: '#fff7ed',
                color: '#ff6b35',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                margin: '0 auto 14px',
              }}
            >
              🖨️
            </div>

            <h3
              style={{
                margin: '0 0 8px',
                color: '#1e293b',
                fontSize: '20px',
                fontWeight: '900',
              }}
            >
              Fiş yazdırılsın mı?
            </h3>

            <p
              style={{
                margin: '0 0 18px',
                color: '#64748b',
                fontSize: '14px',
                lineHeight: '1.6',
              }}
            >
              Ödeme tamamlandı. Bu adisyon için fiş yazdırmak ister misiniz?
            </p>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '18px',
                textAlign: 'left',
                fontSize: '13px',
                color: '#334155',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>Masa:</span>
                <strong>{fisSorModal.masa?.ad}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Toplam:</span>
                <strong style={{ color: '#ff6b35' }}>
                  {fisSorModal.masa?.tutar} TL
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setFisSorModal(null);
                }}
                style={{
                  flex: 1,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#fff',
                  color: '#475569',
                  padding: '12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '800',
                  fontSize: '14px',
                }}
              >
                Yazdırma
              </button>

              <button
                type="button"
                onClick={() => {
                  fisYazdir(fisSorModal.masa, fisSorModal.odemeler);
                  setFisSorModal(null);
                }}
                style={{
                  flex: 1,
                  border: 'none',
                  backgroundColor: '#ff6b35',
                  color: '#fff',
                  padding: '12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '800',
                  fontSize: '14px',
                }}
              >
                Fişi Yazdır
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ana sayfa ekranını gösteren kod */}
      {screen === 'landing' && (
        <div style={styles.landingViewport}>
          {/* NAVBAR */}
          <header style={styles.navbar}>
            <div style={{ ...styles.logoContainer, cursor: 'pointer' }} onClick={() => setScreen('landing')}>
              <span style={styles.orangeDot}>●</span>
              <strong style={{ color: '#1e293b' }}>integra</strong>
              <span style={{ color: '#ff6b35', fontSize: '14px', fontWeight: '900', marginLeft: '2px' }}>POS</span>
            </div>

            <nav style={styles.landingNavLinks}>
              <a href="#moduller" style={styles.navLinkItem}>Modüller</a>
              <a href="#nasil-calisir" style={styles.navLinkItem}>Nasıl Çalışır?</a>
              <a href="#fiyatlar" style={styles.navLinkItem}>Fiyatlar</a>
              <a href="#sss" style={styles.navLinkItem}>SSS</a>
            </nav>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button onClick={() => setScreen('login')} style={styles.navbarLoginBtn}>Giriş Yap</button>
              <button onClick={() => setScreen('register')} style={styles.navbarRegisterBtn}>Demo Talep Et</button>
            </div>
          </header>

          {/* HERO */}
          <section
            style={{
              ...styles.heroSection,
              gridTemplateColumns: '1.05fr 0.95fr',
              paddingTop: '76px',
              paddingBottom: '76px',
            }}
          >
            <div style={styles.heroContent}>
              <span style={styles.heroBadge}>🚀 Restoran, kafe ve paket servis için bulut POS</span>
              <h1 style={styles.heroTitle}>Masa, mutfak, ödeme ve raporlar tek ekranda.</h1>
              <p style={styles.heroSubtitle}>
                Integra POS; garson siparişinden mutfak ekranına, parçalı ödemeden gün sonu raporuna kadar
                işletmenizin günlük akışını hızlandıran web tabanlı adisyon sistemidir.
              </p>

              <div style={styles.heroActionGroup}>
                <button onClick={() => setScreen('register')} style={styles.heroMainBtn}>Ücretsiz Demo Başvurusu</button>
                <button onClick={() => setScreen('login')} style={styles.heroSecondaryBtn}>Giriş Paneli</button>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '22px' }}>
                {['Tablet uyumlu', 'Mutfak ekranı', 'Gün sonu raporu', 'KDV & departman', 'Para üstü'].map(item => (
                  <span
                    key={item}
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      color: '#334155',
                      padding: '8px 11px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: '800',
                    }}
                  >
                    ✓ {item}
                  </span>
                ))}
              </div>

              <div style={styles.heroStatsRow}>
                <div style={styles.heroStatCard}>
                  <div style={styles.heroStatValue}>Anlık</div>
                  <div style={styles.heroStatLabel}>Bulut erişim</div>
                </div>
                <div style={styles.heroStatCard}>
                  <div style={styles.heroStatValue}>0 kurulum</div>
                  <div style={styles.heroStatLabel}>Tarayıcıdan kullanım</div>
                </div>
                <div style={styles.heroStatCard}>
                  <div style={styles.heroStatValue}>Anlık</div>
                  <div style={styles.heroStatLabel}>Masa ve ciro takibi</div>
                </div>
              </div>
            </div>

            <div style={styles.heroVisual}>
              <div style={{ ...styles.mockupCard, maxWidth: '560px' }}>
                <div style={styles.mockupHeader}>
                  <span style={{ color: '#ef4444' }}>●</span>
                  <span style={{ color: '#f59e0b' }}>●</span>
                  <span style={{ color: '#10b981' }}>●</span>
                  Canlı İşletme Paneli
                </div>

                <div style={{ padding: '18px' }}>
                  <div style={styles.mockupTopRow}>
                    <div style={styles.mockupBadge}>Salon / Bahçe / Teras</div>
                    <div style={styles.mockupMuted}>Anlık durum</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px', marginBottom: '16px' }}>
                    {[
                      { ad: 'Masa 1', tutar: '860 TL', durum: 'Dolu', renk: '#fff7ed' },
                      { ad: 'Masa 2', tutar: 'Boş', durum: 'Boş', renk: '#f0fdf4' },
                      { ad: 'Bahçe 3', tutar: '420 TL', durum: 'Dolu', renk: '#fff7ed' },
                    ].map(masa => (
                      <div
                        key={masa.ad}
                        style={{
                          border: '1px solid #e2e8f0',
                          backgroundColor: masa.renk,
                          borderRadius: '14px',
                          padding: '14px',
                        }}
                      >
                        <strong style={{ color: '#1e293b' }}>{masa.ad}</strong>
                        <div style={{ color: masa.durum === 'Dolu' ? '#ff6b35' : '#10b981', fontWeight: '900', marginTop: '6px' }}>
                          {masa.tutar}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>{masa.durum}</div>
                      </div>
                    ))}
                  </div>

                  <div style={styles.mockupReceipt}>
                    <div style={styles.mockupReceiptTitle}>🧾 Aktif Adisyon</div>
                    <div style={styles.mockupReceiptRow}>
                      <span>2x Lahmacun <small style={{ color: '#64748b' }}>(Acılı)</small></span>
                      <strong>240 TL</strong>
                    </div>
                    <div style={styles.mockupReceiptRow}>
                      <span>1x Kumpir <small style={{ color: '#64748b' }}>(Bol kaşar)</small></span>
                      <strong>220 TL</strong>
                    </div>
                    <div style={styles.mockupReceiptRow}>
                      <span>Parçalı ödeme</span>
                      <strong>Nakit + Kart</strong>
                    </div>
                    <div style={styles.mockupReceiptTotal}>
                      <span>Toplam</span>
                      <strong>460 TL</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* KİMLER İÇİN */}
          <section id="kimler" style={{ padding: '72px 4%', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <div style={styles.sectionHeadWrap}>
              <span style={styles.sectionBadge}>Kimler için?</span>
              <h2 style={styles.sectionTitle}>Restoran, kafe ve paket servis için ticari POS altyapısı</h2>
              <p style={styles.sectionSubtitle}>
                Masa servisinden gel-al satışa, paket servisten gün sonu kasasına kadar günlük operasyonu tek sistemde toplayın.
              </p>
            </div>

            <div style={{ ...styles.featuresGrid, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
              {[
                ['🍽️', 'Restoran', 'Masa, mutfak ve ödeme akışı'],
                ['☕', 'Kafe', 'Hızlı ürün seçimi ve kasa kontrolü'],
                ['🍔', 'Fast food', 'Yoğun saatlerde hızlı adisyon'],
                ['🥔', 'Kumpirci / büfe', 'Seçenekli ürün ve not sistemi'],
                ['🍰', 'Tatlıcı', 'Departman ve KDV takibi'],
                ['🛵', 'Paket servis', 'Paket ekranına hazır altyapı'],
              ].map(([icon, title, text]) => (
                <div key={title} style={{ ...styles.featureItem, padding: '22px' }}>
                  <div style={{ fontSize: '30px', marginBottom: '10px' }}>{icon}</div>
                  <h4 style={{ ...styles.featureTitle, fontSize: '16px' }}>{title}</h4>
                  <p style={{ ...styles.featureText, fontSize: '13px' }}>{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* MODÜLLER */}
          <section id="moduller" style={{ padding: '82px 4%', backgroundColor: '#fff' }}>
            <div style={styles.sectionHeadWrap}>
              <span style={styles.sectionBadge}>Modüller</span>
              <h2 style={styles.sectionTitle}>İşletmenin günlük ihtiyacı tek sistemde</h2>
              <p style={styles.sectionSubtitle}>
                Garson, mutfak, kasa ve patron ekranlarını birbirine bağlayan modüler POS yapısı.
              </p>
            </div>

            <div style={styles.featuresGrid}>
              {[
                ['🪑', 'Masa & Bölüm Yönetimi', 'Salon, bahçe, teras gibi bölümlere masa ekleyin; masa aktarımıyla adisyonu boş masaya taşıyın.'],
                ['🍽️', 'Grup Bazlı Menü', 'Ana yemek, içecek, tatlı gibi gruplar; departman, KDV ve mutfağa gönderme ayarları.'],
                ['👨‍🍳', 'Mutfak Ekranı', 'Mutfağa gidecek ürünler notlarıyla birlikte mutfak ekranına düşer, hazırlandı yapılınca listeden kalkar.'],
                ['💳', 'Ödeme & Para Üstü', 'Nakit, kredi kartı ve parçalı ödeme; alınan tutara göre para üstü hesabı.'],
                ['🏷️', 'İndirim & Fiyat Değiştirme', 'Satış anında ürün fiyatı değiştirin, yüzde veya TL indirim uygulayın.'],
                ['📊', 'Raporlama', 'Günlük, aylık ve tarih aralıklı rapor; gün sonu çıktısı ve ödeme kırılımı.'],
                ['🧾', 'Fiş & Adisyon Yazdırma', 'Hesap öncesi adisyon, ödeme sonrası fiş ve gün sonu raporu yazdırma.'],
                ['👥', 'Personel Kullanımı', 'Patron, garson, mutfak ve admin akışlarını ayrı ekranlarla yönetin.'],
              ].map(([icon, title, text]) => (
                <div key={title} style={styles.featureItem}>
                  <div style={styles.featureIcon}>{icon}</div>
                  <h4 style={styles.featureTitle}>{title}</h4>
                  <p style={styles.featureText}>{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* NASIL ÇALIŞIR */}
          <section id="nasil-calisir" style={{ padding: '82px 4%', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <div style={styles.sectionHeadWrap}>
              <span style={styles.sectionBadge}>Nasıl çalışır?</span>
              <h2 style={styles.sectionTitle}>Garsondan rapora kadar akış net</h2>
            </div>

            <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
              {[
                ['1', 'İşletme başvuru yapar', 'Admin panelinden hesap aktif edilir.'],
                ['2', 'Menü ve masalar tanımlanır', 'Gruplar, KDV, departman ve mutfak ayarları yapılır.'],
                ['3', 'Garson sipariş girer', 'Masa seçilir, grup üzerinden ürün eklenir.'],
                ['4', 'Mutfak anında görür', 'Notlu ürünler departmana göre ekrana düşer.'],
                ['5', 'Kasa ödeme alır', 'Nakit, kart, indirim ve para üstü hesaplanır.'],
                ['6', 'Patron raporu izler', 'Gün sonu, ürün ve ödeme raporu yazdırılır.'],
              ].map(([no, title, text]) => (
                <div
                  key={no}
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '18px',
                    padding: '22px',
                    boxShadow: '0 18px 40px -30px rgba(15,23,42,0.2)',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '12px',
                      backgroundColor: '#ff6b35',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '900',
                      marginBottom: '14px',
                    }}
                  >
                    {no}
                  </div>
                  <h4 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '16px' }}>{title}</h4>
                  <p style={{ margin: 0, color: '#64748b', lineHeight: '1.6', fontSize: '13px' }}>{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ÖNİZLEMELER */}
          <section style={{ padding: '82px 4%', backgroundColor: '#fff' }}>
            <div style={styles.sectionHeadWrap}>
              <span style={styles.sectionBadge}>Ekranlar</span>
              <h2 style={styles.sectionTitle}>Her rol için sade panel</h2>
              <p style={styles.sectionSubtitle}>Tablet, telefon ve bilgisayar ekranlarında kolay kullanılabilecek düzen.</p>
            </div>

            <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              {[
                ['🪑 Canlı Masalar', 'Bölüm sekmeleri, masa tutarı, açılış saati, garson adı ve hızlı ürün ekleme.'],
                ['👨‍🍳 Mutfak', 'Masa adı, ürün adı, adet, not, garson ve tarih bilgisiyle sipariş takibi.'],
                ['📊 Raporlar', 'Günlük, aylık ve tarih aralığıyla ciro, ödeme ve ürün detayları.'],
                ['🍽️ Menü Yönetimi', 'Grup, departman, KDV, mutfak gönderimi, ürün notları ve fiyat yönetimi.'],
              ].map(([title, text]) => (
                <div
                  key={title}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    backgroundColor: '#fff',
                    boxShadow: '0 24px 55px -34px rgba(15,23,42,0.24)',
                  }}
                >
                  <div style={{ backgroundColor: '#1e293b', color: '#fff', padding: '12px 14px', fontWeight: '900', fontSize: '13px' }}>
                    {title}
                  </div>
                  <div style={{ padding: '18px', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
                    <div style={{ height: '110px', border: '1px dashed #cbd5e1', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: '900', marginBottom: '14px' }}>
                      Panel Önizleme
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '13px', lineHeight: '1.7' }}>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* AVANTAJLAR */}
          <section style={{ padding: '82px 4%', backgroundColor: '#0f172a', color: '#fff' }}>
            <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px', alignItems: 'center' }}>
              <div>
                <span style={{ ...styles.sectionBadge, backgroundColor: 'rgba(255,255,255,0.08)', color: '#fed7aa', borderColor: 'rgba(255,255,255,0.15)' }}>
                  Neden Integra?
                </span>
                <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', lineHeight: '1.15', margin: '12px 0', fontWeight: '900' }}>
                  İşletmede hatayı azaltır, kontrolü artırır.
                </h2>
                <p style={{ color: '#cbd5e1', lineHeight: '1.8', fontSize: '15px' }}>
                  Sipariş notları kaybolmaz, mutfak bilgisi anında görür, ödeme ve raporlar tek sistemde tutulur.
                  Patron işletmesini uzaktan izleyebilir.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
                {[
                  ['Bulut', 'Kurulum gerektirmez'],
                  ['Rol bazlı', 'Kullanıcı ekranları'],
                  ['Anlık', 'Mutfak ve masa takibi'],
                  ['Detaylı', 'Rapor ve fiş çıktısı'],
                ].map(([big, small]) => (
                  <div key={big} style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '18px', padding: '22px' }}>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#ff6b35' }}>{big}</div>
                    <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '6px', fontWeight: '700' }}>{small}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* PRICING */}
          <section id="fiyatlar" style={styles.pricingSection}>
            <div style={styles.sectionHeadWrap}>
              <span style={styles.sectionBadge}>Fiyatlar</span>
              <h2 style={styles.sectionTitle}>İşletmenize uygun lisans paketi</h2>
              <p style={styles.sectionSubtitle}>Kullanıcı limiti, modül erişimi ve destek kapsamına göre paketlendirilmiş esnek yapı.</p>
            </div>

            <div style={styles.pricingGrid}>
              <div style={styles.priceCard}>
                <div style={styles.pricePlan}>Starter</div>
                <div style={styles.priceValue}>₺999<span style={styles.pricePeriod}>/ay</span></div>
                <ul style={styles.priceList}>
                  <li style={styles.priceListItem}>Masa & adisyon yönetimi</li>
                  <li style={styles.priceListItem}>Menü grupları</li>
                  <li style={styles.priceListItem}>Temel raporlar</li>
                  <li style={styles.priceListItem}>Fiş yazdırma</li>
                </ul>
                <button onClick={() => setScreen('register')} style={styles.priceBtnLight}>Başvur</button>
              </div>

              <div style={{ ...styles.priceCard, ...styles.priceCardFeatured }}>
                <div style={styles.pricePopularBadge}>En Popüler</div>
                <div style={styles.pricePlan}>Pro</div>
                <div style={styles.priceValue}>₺1.999<span style={styles.pricePeriod}>/ay</span></div>
                <ul style={styles.priceList}>
                  <li style={styles.priceListItem}>Sınırsız masa / menü</li>
                  <li style={styles.priceListItem}>Mutfak ekranı</li>
                  <li style={styles.priceListItem}>Gün sonu raporu</li>
                  <li style={styles.priceListItem}>Parçalı ödeme & indirim</li>
                </ul>
                <button onClick={() => setScreen('register')} style={styles.priceBtn}>Demo Talep Et</button>
              </div>

              <div style={styles.priceCard}>
                <div style={styles.pricePlan}>Kurumsal</div>
                <div style={styles.priceValue}>Teklif Al</div>
                <ul style={styles.priceList}>
                  <li style={styles.priceListItem}>Çok şubeli yapı</li>
                  <li style={styles.priceListItem}>Özel kurulum desteği</li>
                  <li style={styles.priceListItem}>Gelişmiş yetkilendirme</li>
                  <li style={styles.priceListItem}>Özel entegrasyonlar</li>
                </ul>
                <button onClick={() => setScreen('register')} style={styles.priceBtnLight}>İletişime Geç</button>
              </div>
            </div>
          </section>

          {/* SSS */}
          <section id="sss" style={{ padding: '82px 4%', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <div style={styles.sectionHeadWrap}>
              <span style={styles.sectionBadge}>Sık Sorulan Sorular</span>
              <h2 style={styles.sectionTitle}>Müşterinin aklına gelen sorular</h2>
            </div>

            <div style={{ maxWidth: '980px', margin: '0 auto', display: 'grid', gap: '12px' }}>
              {[
                ['Garsonlar telefondan kullanabilir mi?', 'Evet. Sistem web tabanlı olduğu için telefon, tablet ve bilgisayar tarayıcısından kullanılabilir.'],
                ['Fiş yazıcı bağlanır mı?', 'Tarayıcı yazdırma sistemiyle hesap öncesi adisyon, ödeme fişi ve gün sonu raporu alınabilir.'],
                ['Mutfak ekranı ayrı çalışır mı?', 'Evet. Mutfağa gidecek ürünler notları ve adetleriyle mutfak ekranına düşer.'],
                ['Raporlarda ödeme ayrımı var mı?', 'Nakit, kredi kartı, parçalı ödeme ve ürün bazlı satış raporları takip edilebilir.'],
                ['Kurulum gerekiyor mu?', 'Temel kullanım için ekstra kurulum gerekmez; internet olan cihazdan giriş yapılır.'],
              ].map(([q, a]) => (
                <details key={q} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 18px' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: '900', color: '#1e293b' }}>{q}</summary>
                  <p style={{ color: '#64748b', lineHeight: '1.7', marginBottom: 0 }}>{a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section style={{ padding: '72px 4%', backgroundColor: '#fff' }}>
            <div
              style={{
                maxWidth: '1120px',
                margin: '0 auto',
                background: 'linear-gradient(135deg, #ff6b35 0%, #1e293b 100%)',
                color: '#fff',
                borderRadius: '26px',
                padding: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '24px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h2 style={{ margin: '0 0 8px', fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: '900' }}>
                  İşletmenizi dijital adisyona taşıyalım.
                </h2>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.82)', lineHeight: '1.7' }}>
                  Demo başvurusu yapın, işletmenize uygun kurulum akışını birlikte planlayalım.
                </p>
              </div>

              <button
                onClick={() => setScreen('register')}
                style={{
                  border: 'none',
                  backgroundColor: '#fff',
                  color: '#1e293b',
                  padding: '14px 22px',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  fontWeight: '900',
                  fontSize: '14px',
                }}
              >
                Demo Başvurusu Yap
              </button>
            </div>
          </section>

          {/* FOOTER */}
          <footer id="hakkimizda" style={styles.footerSection}>
            <div style={styles.footerContainer}>
              <div style={styles.footerColumnWide}>
                <div style={{ ...styles.logoContainer, marginBottom: '12px' }}>
                  <span style={styles.orangeDot}>●</span>
                  <strong style={{ color: '#fff' }}>integra</strong>
                  <span style={{ color: '#ff6b35' }}>POS</span>
                </div>

                <p style={styles.footerText}>
                  Integra POS; restoran, kafe ve hizmet sektöründeki işletmeler için geliştirilen
                  bulut tabanlı adisyon, masa, mutfak, ödeme ve rapor yönetim platformudur.
                </p>
              </div>

              <div style={styles.footerColumn}>
                <h4 style={styles.footerHeading}>İletişim Bilgileri</h4>
                <ul style={styles.footerList}>
                  <li style={styles.footerListItem}>📞 <b>Telefon:</b> 0532 501 42 77</li>
                  <li style={styles.footerListItem}>✉️ <b>E-posta:</b> info@integraposbilisim.com</li>
                  <li style={styles.footerListItem}>🌐 <b>Web:</b> integraposbilisim.com</li>
                </ul>
              </div>
            </div>

            <div style={styles.footerBottom}>
              © 2026 Integra Yazılım Teknolojileri A.Ş. Tüm Hakları Saklıdır.
            </div>
          </footer>
        </div>
      )}

      {/* giriş ekranını gösteren kod */}
      {screen === 'login' && (
        <div style={styles.authBg}>
          <div style={styles.authCard}>
            <div
              onClick={() => setScreen('landing')}
              style={{ ...styles.logoContainer, cursor: 'pointer', marginBottom: '15px', justifyContent: 'center' }}
            >
              <span style={styles.orangeDot}>●</span>
              <strong style={{ color: '#1e293b' }}>integra</strong>
            </div>

            <h3 style={styles.authTitle}>Çoklu İşletme POS Girişi</h3>

            <form onSubmit={handleLogin} style={styles.form}>
              <input
                type="email"
                placeholder="E-posta Adresi"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={styles.authInput}
              />
              <input
                type="password"
                placeholder="Şifre"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={styles.authInput}
              />
              <button type="submit" style={styles.authBtnOrange}>Sisteme Giriş Yap</button>
            </form>

            <button onClick={() => setScreen('landing')} style={styles.cancelReturnBtn}>
              ← Ana Sayfaya Geri Dön
            </button>

            <p style={styles.authFooter}>
              Yeni işletme misiniz?{' '}
              <span onClick={() => setScreen('register')} style={styles.authLink}>
                Demo Talep Et
              </span>
            </p>

          </div>
        </div>
      )}

      {/* yeni restoran kayıt ekranını gösteren kod */}
      {screen === 'register' && (
        <div style={styles.authBg}>
          <div style={styles.authCard}>
            <div
              onClick={() => setScreen('landing')}
              style={{ ...styles.logoContainer, cursor: 'pointer', marginBottom: '15px', justifyContent: 'center' }}
            >
              <span style={styles.orangeDot}>●</span>
              <strong style={{ color: '#1e293b' }}>integra</strong>
            </div>

            <h3 style={styles.authTitle}>Yeni İşletme Başvurusu</h3>

            <form onSubmit={handleRegister} style={styles.form}>
              <input
                type="text"
                placeholder="Restoran / Kafe Adı"
                value={restaurantName}
                onChange={e => setRestaurantName(e.target.value)}
                style={styles.authInput}
              />
              <input
                type="email"
                placeholder="Yönetici E-posta Adresi"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={styles.authInput}
              />
              <input
                type="password"
                placeholder="Şifre Belirleyin"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={styles.authInput}
              />
              <button type="submit" style={styles.authBtn}>Kayıt Başvurusunu Gönder</button>
            </form>

            <button onClick={() => setScreen('landing')} style={styles.cancelReturnBtn}>
              ← Ana Sayfaya Geri Dön
            </button>

            <p style={styles.authFooter}>
              Zaten hesabınız var mı?{' '}
              <span onClick={() => setScreen('login')} style={styles.authLink}>
                Giriş Yap
              </span>
            </p>
          </div>
        </div>
      )}

      {/* giriş sonrası yönetim panelini gösteren kod */}
      {screen === 'dashboard' && user && (
        <div style={styles.dashboardLayout}>
          {/* SIDEBAR */}
          <div style={styles.sidebar}>
            <div
              onClick={() => setScreen('landing')}
              style={{ ...styles.sidebarLogo, cursor: 'pointer' }}
            >
              <span style={styles.orangeDot}>●</span> integra
            </div>

            <div style={styles.restaurantBadge}>
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{user?.restaurant}</div>
              <div style={{ fontSize: '11px', color: '#a4b5c6' }}>
                {user?.role === 'super_admin'
                  ? 'Global Admin'
                  : user?.role === 'owner'
                    ? 'İşletme Sahibi'
                    : user?.personelGorev || 'Personel Terminali'}
              </div>
            </div>

            <nav style={styles.navGroup}>
              {tabGorunur('raporlar') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('raporlar')}
                  style={activeTab === 'raporlar' ? styles.navItemActive : styles.navItem}
                >
                  📊 Satış & Ürün Raporları
                </button>
              )}

              {tabGorunur('masalar') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('masalar')}
                  style={activeTab === 'masalar' ? styles.navItemActive : styles.navItem}
                >
                  🪑 Canlı Masalarım
                </button>
              )}

              {tabGorunur('mutfak') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('mutfak')}
                  style={activeTab === 'mutfak' ? styles.navItemActive : styles.navItem}
                >
                  👨‍🍳 Mutfak
                </button>
              )}


              {tabGorunur('paket') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('paket')}
                  style={activeTab === 'paket' ? styles.navItemActive : styles.navItem}
                >
                  🛵 Paket Servis
                </button>
              )}

              {tabGorunur('cari') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('cari')}
                  style={activeTab === 'cari' ? styles.navItemActive : styles.navItem}
                >
                  📒 Cari / Veresiye
                </button>
              )}

              {tabGorunur('stok') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('stok')}
                  style={activeTab === 'stok' ? styles.navItemActive : styles.navItem}
                >
                  📦 Stok Takibi
                </button>
              )}

              {tabGorunur('kasa') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('kasa')}
                  style={activeTab === 'kasa' ? styles.navItemActive : styles.navItem}
                >
                  💰 Kasa
                </button>
              )}


              {tabGorunur('hizli_satis') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('hizli_satis')}
                  style={activeTab === 'hizli_satis' ? styles.navItemActive : styles.navItem}
                >
                  ⚡ Hızlı Satış
                </button>
              )}

              {tabGorunur('giderler') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('giderler')}
                  style={activeTab === 'giderler' ? styles.navItemActive : styles.navItem}
                >
                  🧾 Giderler
                </button>
              )}

              {tabGorunur('iadeler') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('iadeler')}
                  style={activeTab === 'iadeler' ? styles.navItemActive : styles.navItem}
                >
                  ↩️ İade / İkram
                </button>
              )}

              {tabGorunur('rezervasyonlar') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('rezervasyonlar')}
                  style={activeTab === 'rezervasyonlar' ? styles.navItemActive : styles.navItem}
                >
                  📅 Rezervasyon
                </button>
              )}

              {tabGorunur('garsonlar') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('garsonlar')}
                  style={activeTab === 'garsonlar' ? styles.navItemActive : styles.navItem}
                >
                  👥 Personel Listesi
                </button>
              )}

              {tabGorunur('menu') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('menu')}
                  style={activeTab === 'menu' ? styles.navItemActive : styles.navItem}
                >
                  🍔 Menü & Ayarlar
                </button>
              )}

              {user?.role === 'super_admin' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('super_admin')}
                  style={activeTab === 'super_admin' ? styles.navItemActive : styles.navItem}
                >
                  👑 Tüm integra Müşterileri
                </button>
              )}
            </nav>
            <button
              onClick={() => {
                localStorage.removeItem('integra_user');
                localStorage.removeItem('integra_activeTab');
                localStorage.setItem('integra_screen', 'login');

                setUser(null);
                setScreen('login');
                setActiveTab('masalar');
                setEmail('');
                setPassword('');
              }}
              style={styles.logoutBtn}
            >
              Çıkış Yap
            </button>
          </div>

          {/* MAIN */}
          <div style={styles.mainContent}>
            {/* masalar ve canlı adisyon ekranını gösteren kod */}
            {activeTab === 'masalar' && (
              <div style={styles.posLayout}>
                {/* sol tarafta bölüm sekmeleri ve masa kartlarını gösteren kod */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.contentHeader}>
                    <h2 style={styles.pageTitle}>Canlı Salon Planı</h2>

                    {user?.role === 'owner' && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <form onSubmit={masaBolumuEkle} style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="Bölüm adı"
                            value={yeniBolumAdi}
                            onChange={e => setYeniBolumAdi(e.target.value)}
                            style={styles.tableInputMini}
                          />

                          <button type="submit" style={styles.addBtnMini}>
                            + Bölüm
                          </button>
                        </form>

                        <form onSubmit={masaEkle} style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder={`${aktifMasaBolumu} için masa`}
                            value={yeniMasaAdi}
                            onChange={e => setYeniMasaAdi(e.target.value)}
                            style={styles.tableInputMini}
                          />

                          <button type="submit" style={styles.addBtnMini}>
                            + Masa
                          </button>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* masa bölümlerini üstte sekme olarak gösteren kod */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                      marginBottom: '16px',
                    }}
                  >
                    {masaBolumleriListesi.map(bolum => (
                      <button
                        key={bolum}
                        type="button"
                        onClick={() => {
                          setAktifMasaBolumu(bolum);
                          setSelectedMasaId(null);
                        }}
                        style={{
                          border: 'none',
                          backgroundColor: aktifMasaBolumu === bolum ? '#ff6b35' : '#e2e8f0',
                          color: aktifMasaBolumu === bolum ? '#fff' : '#334155',
                          padding: '9px 13px',
                          borderRadius: '999px',
                          cursor: 'pointer',
                          fontWeight: '900',
                          fontSize: '12px',
                        }}
                      >
                        {bolum}
                      </button>
                    ))}
                  </div>

                  {aktarimMesaji && (
                    <div
                      style={{
                        backgroundColor: masaAktarmaModu ? '#eef2ff' : '#f0fdf4',
                        color: masaAktarmaModu ? '#3730a3' : '#15803d',
                        border: masaAktarmaModu ? '1px solid #c7d2fe' : '1px solid #bbf7d0',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '800',
                        marginBottom: '14px',
                      }}
                    >
                      {aktarimMesaji}
                    </div>
                  )}

                  {/* seçili bölümdeki masaları gösteren kod */}
                  {aktifMasalar.length === 0 ? (
                    <div style={{ color: '#64748b' }}>
                      {aktifMasaBolumu} bölümünde henüz tanımlı masa yok.
                    </div>
                  ) : (
                    <div style={styles.mesaGrid}>
                      {aktifMasalar.map(m => {
                        const kaynakMasaMi =
                          masaAktarmaModu && String(m.id) === String(aktarilanKaynakMasaId);

                        const hedefOlabilirMi =
                          masaAktarmaModu &&
                          !kaynakMasaMi &&
                          !m.dolu &&
                          Number(m.tutar || 0) === 0 &&
                          (!m.siparisler || m.siparisler.length === 0);

                        const aktifRezervasyon = aktifRezervasyonBul(m.id);

                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              if (masaAktarmaModu) {
                                masaAktarTikla(m);
                                return;
                              }

                              setSelectedMasaId(m.id);
                              setAktifMasaBolumu(m.bolum || aktifMasaBolumu || 'Salon');
                            }}
                            style={{
                              ...styles.mesaCard,
                              borderColor: kaynakMasaMi
                                ? '#6366f1'
                                : hedefOlabilirMi
                                  ? '#10b981'
                                  : m.id === (selectedMasaId || aktifMasalar[0]?.id)
                                    ? '#ff6b35'
                                    : 'transparent',
                              backgroundColor: kaynakMasaMi
                                ? '#eef2ff'
                                : hedefOlabilirMi
                                  ? '#f0fdf4'
                                  : m.dolu
                                    ? '#fff7ed'
                                    : aktifRezervasyon
                                      ? '#eff6ff'
                                      : '#fff',
                              textAlign: 'left',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '8px',
                              }}
                            >
                              <div style={{ fontWeight: '900', color: '#1e293b', fontSize: '15px' }}>
                                {m.ad}
                              </div>

                              <span
                                style={{
                                  backgroundColor: m.dolu ? '#fed7aa' : aktifRezervasyon ? '#dbeafe' : '#dcfce7',
                                  color: m.dolu ? '#c2410c' : aktifRezervasyon ? '#1d4ed8' : '#15803d',
                                  padding: '4px 8px',
                                  borderRadius: '999px',
                                  fontSize: '11px',
                                  fontWeight: '900',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {m.dolu ? 'Dolu' : aktifRezervasyon ? 'Rezerve' : 'Boş'}
                              </span>
                            </div>

                            <div
                              style={{
                                fontSize: '18px',
                                fontWeight: '900',
                                color: m.dolu ? '#ff6b35' : '#10b981',
                                marginBottom: '8px',
                              }}
                            >
                              {m.dolu ? `${m.tutar} TL` : hedefOlabilirMi ? 'Aktarılabilir' : aktifRezervasyon ? 'Rezerve' : 'Boş'}
                            </div>

                            {m.dolu && (
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '5px',
                                  fontSize: '11px',
                                  color: '#64748b',
                                  fontWeight: '700',
                                  borderTop: '1px solid #fed7aa',
                                  paddingTop: '8px',
                                }}
                              >
                                <div>
                                  ⏰ Açılış: <strong>{saatYaz(m.adisyonAcilisSaati)}</strong>
                                </div>

                                <div>
                                  👤 Garson: <strong>{m.adisyonGarsonAdi || '-'}</strong>
                                </div>
                              </div>
                            )}

                            {!m.dolu && aktifRezervasyon && (
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '5px',
                                  fontSize: '11px',
                                  color: '#1d4ed8',
                                  fontWeight: '800',
                                  borderTop: '1px solid #bfdbfe',
                                  paddingTop: '8px',
                                }}
                              >
                                <div>📅 {aktifRezervasyon.musteriAdi}</div>
                                <div>
                                  ⏰ {saatYaz(aktifRezervasyon.rezervasyonZamani)} - {saatYaz(aktifRezervasyon.rezervasyonBitisZamani)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* sağ tarafta ürün ekleme ve adisyon panelini gösteren kod */}
                <div style={styles.adisyonPanel}>
                  <h3 style={styles.panelTitle}>
                    🧾 {activeMasa ? activeMasa.ad : 'Masa Seçilmedi'} Canlı Fişi
                  </h3>

                  {/* masa aktarma modunu başlatan sağ panel butonu */}
                  {activeMasa?.dolu && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      {!masaAktarmaModu ? (
                        <button
                          type="button"
                          onClick={masaAktarmaBaslat}
                          style={{
                            flex: 1,
                            border: 'none',
                            backgroundColor: '#6366f1',
                            color: '#fff',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontWeight: '900',
                            fontSize: '13px',
                          }}
                        >
                          🔁 Masa Aktar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={masaAktarmaIptalEt}
                          style={{
                            flex: 1,
                            border: 'none',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontWeight: '900',
                            fontSize: '13px',
                          }}
                        >
                          Aktarmadan Vazgeç
                        </button>
                      )}
                    </div>
                  )}

                  {/* açık adisyonun açılış saatini gösteren kod */}
                  {activeMasa?.dolu && (
                    <div
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '8px',
                        marginBottom: '10px',
                        fontSize: '12px',
                        color: '#475569',
                        fontWeight: '700',
                      }}
                    >
                      <div>
                        Açılış Saati: <strong>{saatYaz(activeMasa.adisyonAcilisSaati)}</strong>
                      </div>

                      <div>
                        Garson: <strong>{activeMasa.adisyonGarsonAdi || '-'}</strong>
                      </div>
                    </div>
                  )}

                  {/* seçili masaya müşteri adı verme ve hesap öncesi adisyon yazdırma kodu */}
                  {activeMasa && (
                    <div
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '8px',
                        marginBottom: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                          type="text"
                          placeholder="Müşteri adı"
                          value={musteriAdiInput}
                          onChange={e => setMusteriAdiInput(e.target.value)}
                          style={{
                            ...styles.panelSelect,
                            flex: 1,
                            padding: '8px',
                            fontSize: '12px',
                          }}
                        />

                        <button
                          type="button"
                          onClick={masaMusteriAdiKaydet}
                          style={{
                            border: 'none',
                            backgroundColor: '#1e293b',
                            color: '#fff',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '900',
                            fontSize: '12px',
                          }}
                        >
                          Kaydet
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => adisyonFisiYazdir(activeMasa)}
                        style={{
                          width: '100%',
                          border: 'none',
                          backgroundColor: '#0f766e',
                          color: '#fff',
                          padding: '9px 11px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '900',
                          fontSize: '12px',
                        }}
                      >
                        🧾 Hesap Öncesi Adisyon Yazdır
                      </button>
                    </div>
                  )}

                  {activeMasa && (
                    <>
                      <div style={styles.addOrderBox}>
                        {/* adisyon ekranında ürünleri grup butonları ve ürün kartlarıyla seçen kod */}
                        <div
                          style={{
                            flex: '1 1 100%',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '14px',
                            padding: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '10px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                              Ürün Seçimi
                            </strong>

                            <input
                              type="text"
                              placeholder="Ürün ara..."
                              value={adisyonUrunArama}
                              onChange={e => setAdisyonUrunArama(e.target.value)}
                              style={{
                                ...styles.panelSelect,
                                flex: '1 1 150px',
                                padding: '8px 10px',
                                fontSize: '12px',
                                backgroundColor: '#fff',
                              }}
                            />
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              gap: '7px',
                              overflowX: 'auto',
                              paddingBottom: '2px',
                            }}
                          >
                            {aktifMenuGruplari.length === 0 ? (
                              <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '700' }}>
                                Grup yok
                              </span>
                            ) : (
                              aktifMenuGruplari.map(grup => (
                                <button
                                  key={grup.id || grup.ad}
                                  type="button"
                                  onClick={() => {
                                    setAktifAdisyonMenuGrubu(grup.ad);
                                    setAdisyonUrunArama('');
                                  }}
                                  style={{
                                    border: 'none',
                                    backgroundColor: (aktifAdisyonGrup.ad || aktifAdisyonMenuGrubu) === grup.ad ? '#ff6b35' : '#e2e8f0',
                                    color: (aktifAdisyonGrup.ad || aktifAdisyonMenuGrubu) === grup.ad ? '#fff' : '#334155',
                                    padding: '8px 11px',
                                    borderRadius: '999px',
                                    cursor: 'pointer',
                                    fontWeight: '900',
                                    fontSize: '12px',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {grup.ad}
                                </button>
                              ))
                            )}
                          </div>

                          {aktifAdisyonGrubuUrunleri.length === 0 ? (
                            <div
                              style={{
                                color: '#94a3b8',
                                fontSize: '12px',
                                fontWeight: '700',
                                backgroundColor: '#fff',
                                border: '1px dashed #cbd5e1',
                                borderRadius: '10px',
                                padding: '12px',
                                textAlign: 'center',
                              }}
                            >
                              Bu grupta ürün bulunamadı.
                            </div>
                          ) : (
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                gap: '8px',
                                maxHeight: '220px',
                                overflowY: 'auto',
                                paddingRight: '2px',
                              }}
                            >
                              {aktifAdisyonGrubuUrunleri.map(u => {
                                const seciliMi = String(seciliUrunId) === String(u.id);

                                return (
                                  <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => adisyondaUrunSec(u)}
                                    style={{
                                      border: seciliMi ? '2px solid #ff6b35' : '1px solid #e2e8f0',
                                      backgroundColor: seciliMi ? '#fff7ed' : '#fff',
                                      color: '#1e293b',
                                      borderRadius: '12px',
                                      padding: '10px',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                      boxShadow: seciliMi ? '0 10px 24px -18px rgba(255,107,53,0.8)' : 'none',
                                    }}
                                  >
                                    <div style={{ fontWeight: '900', fontSize: '13px', marginBottom: '5px' }}>
                                      {u.favori ? '⭐ ' : ''}{u.ad}
                                    </div>

                                    <div style={{ color: '#ff6b35', fontWeight: '900', fontSize: '13px' }}>
                                      {u.fiyat} TL
                                    </div>

                                    <div style={{ color: '#64748b', fontWeight: '700', fontSize: '10px', marginTop: '4px' }}>
                                      {u.departman || aktifAdisyonGrup.departman || 'Mutfak'}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {seciliMenuUrunu && (
                            <div
                              style={{
                                backgroundColor: '#fff',
                                border: '1px solid #fed7aa',
                                color: '#c2410c',
                                borderRadius: '10px',
                                padding: '8px 10px',
                                fontSize: '12px',
                                fontWeight: '900',
                              }}
                            >
                              Seçili ürün: {seciliMenuUrunu.ad} / {seciliMenuUrunu.fiyat} TL
                            </div>
                          )}
                        </div>

                        <input
                          type="number"
                          min="1"
                          value={seciliUrunAdet}
                          onChange={e => setSeciliUrunAdet(e.target.value)}
                          style={{
                            ...styles.panelSelect,
                            width: '90px',
                            flex: '0 0 90px',
                          }}
                        />

                        {/* seçilen ürüne özel hazır not/seçenekleri gösteren kod */}
                        {seciliMenuUrunu && Array.isArray(seciliMenuUrunu.menuNotlari) && seciliMenuUrunu.menuNotlari.length > 0 && (
                          <select
                            value={seciliUrunHazirNotId}
                            onChange={e => {
                              setSeciliUrunHazirNotId(e.target.value);
                              setSeciliUrunNotu('');
                              setSeciliUrunEkstraFiyat('');
                            }}
                            style={{
                              ...styles.panelSelect,
                              flex: '1 1 100%',
                            }}
                          >
                            <option value="">Standart / seçenek yok</option>

                            {seciliMenuUrunu.menuNotlari.map(n => (
                              <option key={n.id} value={String(n.id)}>
                                {n.ad} {Number(n.fiyat || 0) > 0 ? `(+${n.fiyat} TL)` : ''}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* ürün notu yazma alanını gösteren kod */}
                        <input
                          type="text"
                          placeholder="Not"
                          value={seciliUrunNotu}
                          onChange={e => setSeciliUrunNotu(e.target.value)}
                          style={{
                            ...styles.panelSelect,
                            minWidth: '110px',
                          }}
                        />

                        {/* ürün için ekstra fiyat girme alanını gösteren kod */}
                        <input
                          type="number"
                          min="0"
                          placeholder="+ TL"
                          value={seciliUrunEkstraFiyat}
                          onChange={e => setSeciliUrunEkstraFiyat(e.target.value)}
                          style={{
                            ...styles.panelSelect,
                            width: '80px',
                            flex: '0 0 80px',
                          }}
                        />

                        {/* satışta fiyat değiştirme alanını gösteren kod */}
                        <input
                          type="number"
                          min="0"
                          placeholder="Satış fiyatı"
                          value={seciliUrunSatisFiyati}
                          onChange={e => setSeciliUrunSatisFiyati(e.target.value)}
                          style={{
                            ...styles.panelSelect,
                            minWidth: '115px',
                            flex: '1 1 115px',
                          }}
                        />

                        {/* yüzde indirim alanını gösteren kod */}
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="İndirim %"
                          value={seciliUrunIndirimYuzde}
                          onChange={e => setSeciliUrunIndirimYuzde(e.target.value)}
                          style={{
                            ...styles.panelSelect,
                            width: '95px',
                            flex: '0 0 95px',
                          }}
                        />

                        {/* tutar indirim alanını gösteren kod */}
                        <input
                          type="number"
                          min="0"
                          placeholder="İndirim TL"
                          value={seciliUrunIndirimTutari}
                          onChange={e => setSeciliUrunIndirimTutari(e.target.value)}
                          style={{
                            ...styles.panelSelect,
                            width: '105px',
                            flex: '0 0 105px',
                          }}
                        />

                        {seciliMenuUrunu && (
                          <div
                            style={{
                              flex: '1 1 100%',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding: '8px 10px',
                              fontSize: '12px',
                              color: '#475569',
                              fontWeight: '700',
                              lineHeight: '1.6',
                            }}
                          >
                            <div>Liste: <strong>{seciliUrunFiyatBilgisi.listeFiyati} TL</strong></div>
                            <div>Satış: <strong>{seciliUrunFiyatBilgisi.satisFiyati} TL</strong></div>
                            <div>İndirim: <strong>{seciliUrunFiyatBilgisi.indirimTutari} TL</strong></div>
                            <div>Son Birim: <strong style={{ color: '#ff6b35' }}>{seciliUrunFiyatBilgisi.birimFiyat} TL</strong></div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={masayaSeciliUrunuEkle}
                          style={styles.panelAddBtn}
                        >
                          Ekle
                        </button>
                      </div>

                      <div style={styles.receiptContainer}>
                        {(!activeMasa.siparisler || activeMasa.siparisler.length === 0) ? (
                          <div style={styles.emptyReceipt}>Bu masada aktif sipariş yok.</div>
                        ) : (
                          activeMasa.siparisler.map((s, idx) => (
                            <div
                              key={idx}
                              onClick={() => activeMasa.dolu && bolunecekUrunSec(idx)}
                              style={{
                                ...styles.receiptRow,
                                cursor: activeMasa.dolu ? 'pointer' : 'default',
                                backgroundColor: bolunecekSiparisIndexleri.includes(idx) ? '#eef2ff' : 'transparent',
                                border: bolunecekSiparisIndexleri.includes(idx) ? '1px solid #6366f1' : '1px solid transparent',
                                borderRadius: '10px',
                                padding: '9px 8px',
                              }}
                            >
                              {activeMasa.dolu && (
                                <div
                                  title="Adisyon bölme için seç"
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '7px',
                                    border: bolunecekSiparisIndexleri.includes(idx) ? '1px solid #6366f1' : '1px solid #cbd5e1',
                                    backgroundColor: bolunecekSiparisIndexleri.includes(idx) ? '#6366f1' : '#fff',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '13px',
                                    fontWeight: '900',
                                    flex: '0 0 22px',
                                  }}
                                >
                                  {bolunecekSiparisIndexleri.includes(idx) ? '✓' : ''}
                                </div>
                              )}

                              <div style={{ flex: 1 }}>
                                <div>
                                  {s.adet}x {s.ad} ({Number(s.fiyat || 0) * Number(s.adet || 1)} TL)
                                </div>

                                {s.not && (
                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                                    Not: {s.not}
                                  </div>
                                )}

                                {Number(s.ekstraUcret || 0) > 0 && (
                                  <div style={{ fontSize: '11px', color: '#ff6b35', marginTop: '3px', fontWeight: '800' }}>
                                    Ekstra: +{s.ekstraUcret} TL / adet
                                  </div>
                                )}

                                {s.fiyatDegistirildi && (
                                  <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '3px', fontWeight: '800' }}>
                                    Satış fiyatı değişti: {s.satisFiyati} TL
                                  </div>
                                )}

                                {Number(s.indirimTutari || 0) > 0 && (
                                  <div style={{ fontSize: '11px', color: '#10b981', marginTop: '3px', fontWeight: '800' }}>
                                    İndirim: -{s.indirimTutari} TL / adet {Number(s.indirimYuzde || 0) > 0 ? `(%${s.indirimYuzde})` : ''}
                                  </div>
                                )}

                                {s.ikram && (
                                  <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '3px', fontWeight: '900' }}>
                                    🎁 İkram ürün
                                  </div>
                                )}
                              </div>

                              {!s.ikram && Number(s.fiyat || 0) > 0 && (
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    adisyondaBirUrunIkramEt(idx);
                                  }}
                                  style={{
                                    border: 'none',
                                    backgroundColor: '#f59e0b',
                                    color: '#fff',
                                    borderRadius: '8px',
                                    padding: '6px 8px',
                                    cursor: 'pointer',
                                    fontWeight: '900',
                                    fontSize: '11px',
                                  }}
                                  title="Bu satırdan 1 ürünü ikram et"
                                >
                                  🎁 1 İkram
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  adisyondanUrunEksilt(idx);
                                }}
                                style={styles.deleteItemBtn}
                                title="1 Adet Eksilt"
                              >
                                ❌
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      <div style={styles.receiptFooter}>
                        <div style={styles.totalRow}>
                          <span>Toplam:</span>
                          <span style={{ fontSize: '22px', color: '#ff6b35', fontWeight: '800' }}>
                            {activeMasa.tutar} TL
                          </span>
                        </div>

                        {activeMasa.dolu && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px' }}>
                              <div style={{ fontSize: '12px', color: '#475569', fontWeight: '900', marginBottom: '6px' }}>
                                Adisyon Bölme: Seçili ürün toplamı {bolunenAdisyonToplamiGetir()} TL
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button type="button" onClick={() => bolunmusAdisyonOdemeAl('Nakit')} style={{ ...styles.checkoutBtn, backgroundColor: '#10b981', padding: '9px', fontSize: '12px' }}>Seçileni Nakit Kapat</button>
                                <button type="button" onClick={() => bolunmusAdisyonOdemeAl('Kredi Kartı')} style={{ ...styles.checkoutBtn, backgroundColor: '#2563eb', padding: '9px', fontSize: '12px' }}>Seçileni Kart Kapat</button>
                              </div>
                            </div>

                            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px' }}>
                              <div style={{ fontSize: '12px', color: '#475569', fontWeight: '900', marginBottom: '6px' }}>Cari / Veresiye</div>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                  <input
                                    type="text"
                                    placeholder="Cari müşteri ara..."
                                    value={cariAdisyonArama}
                                    onChange={e => {
                                      setCariAdisyonArama(e.target.value);
                                      setCariAdisyonMusteriId('');
                                    }}
                                    style={{ ...styles.panelSelect, padding: '8px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}
                                  />

                                  {(cariAdisyonArama || filtreliCariAdisyonMusterileri.length > 0) && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                                      {filtreliCariAdisyonMusterileri.length === 0 ? (
                                        <div style={{ color: '#94a3b8', fontSize: '11px', padding: '6px' }}>Eşleşen cari yok.</div>
                                      ) : (
                                        filtreliCariAdisyonMusterileri.map(c => (
                                          <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => cariAdisyonMusterisiSec(String(c.id))}
                                            style={{
                                              border: String(cariAdisyonMusteriId) === String(c.id) ? '1px solid #7c3aed' : '1px solid #e2e8f0',
                                              backgroundColor: String(cariAdisyonMusteriId) === String(c.id) ? '#f3e8ff' : '#fff',
                                              color: '#334155',
                                              padding: '7px 8px',
                                              borderRadius: '8px',
                                              cursor: 'pointer',
                                              textAlign: 'left',
                                              fontWeight: '800',
                                              fontSize: '11px',
                                            }}
                                          >
                                            {c.ad} {c.telefon ? ` / ${c.telefon}` : ''} — {Number(c.bakiye || 0)} TL
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>

                                <button type="button" onClick={aktifAdisyonuCariyeYaz} style={{ ...styles.checkoutBtn, backgroundColor: '#7c3aed', padding: '9px', fontSize: '12px', width: 'auto' }}>Cari'ye Yaz</button>
                              </div>
                            </div>

                            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px' }}>
                              <div style={{ fontSize: '12px', color: '#475569', fontWeight: '900', marginBottom: '6px' }}>Masa Birleştir</div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <select value={birlestirilecekMasaId} onChange={e => setBirlestirilecekMasaId(e.target.value)} style={{ ...styles.panelSelect, padding: '8px', fontSize: '12px' }}>
                                  <option value="">Dolu hedef masa seç...</option>
                                  {tumRestoranMasalari
                                    .filter(m => m.id !== activeMasa.id && m.dolu && m.siparisler && m.siparisler.length > 0)
                                    .map(m => (
                                      <option key={m.id} value={String(m.id)}>{m.bolum || 'Salon'} / {m.ad} / {m.tutar} TL</option>
                                    ))}
                                </select>
                                <button type="button" onClick={masaBirlestir} style={{ ...styles.checkoutBtn, backgroundColor: '#f59e0b', padding: '9px', fontSize: '12px', width: 'auto' }}>Birleştir</button>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeMasa.dolu && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                              <div>Ödenen: <strong>{odemeToplami(activeMasa)} TL</strong></div>
                              <div>Kalan: <strong>{kalanTutar(activeMasa)} TL</strong></div>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                padding: '8px',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: '800',
                                  color: '#475569',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Alınan:
                              </span>

                              <input
                                type="number"
                                min="0"
                                value={odemeTutariInput}
                                onChange={e => setOdemeTutariInput(e.target.value)}
                                placeholder={`${kalanTutar(activeMasa)} TL`}
                                style={{
                                  flex: 1,
                                  border: 'none',
                                  outline: 'none',
                                  backgroundColor: 'transparent',
                                  fontSize: '15px',
                                  fontWeight: '800',
                                  color: '#1e293b',
                                }}
                              />

                              <button
                                type="button"
                                onClick={() => setOdemeTutariInput(String(kalanTutar(activeMasa)))}
                                style={{
                                  border: 'none',
                                  backgroundColor: '#e2e8f0',
                                  color: '#334155',
                                  borderRadius: '8px',
                                  padding: '7px 9px',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                }}
                              >
                                Tümü
                              </button>
                            </div>

                            {paraUstuTutari > 0 && (
                              <div
                                style={{
                                  backgroundColor: '#ecfdf5',
                                  border: '1px solid #bbf7d0',
                                  color: '#15803d',
                                  borderRadius: '10px',
                                  padding: '9px 10px',
                                  fontSize: '13px',
                                  fontWeight: '900',
                                }}
                              >
                                Para üstü: {paraUstuTutari} TL
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => odemeAl('Nakit')}
                                style={{
                                  ...styles.checkoutBtn,
                                  backgroundColor: '#10b981',
                                  flex: 1,
                                }}
                              >
                                💵 Nakit Al
                              </button>

                              <button
                                type="button"
                                onClick={() => odemeAl('Kredi Kartı')}
                                style={{
                                  ...styles.checkoutBtn,
                                  backgroundColor: '#2563eb',
                                  flex: 1,
                                }}
                              >
                                💳 Kart Al
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            {/* son kapatılan adisyonun fişini manuel yazdıran kod */}
            {sonFisBilgisi && (
              <button
                type="button"
                onClick={() => fisYazdir(sonFisBilgisi.masa, sonFisBilgisi.odemeler)}
                style={{
                  ...styles.checkoutBtn,
                  backgroundColor: '#1e293b',
                  marginTop: '10px',
                }}
              >
                🖨️ Son Fişi Yazdır
              </button>
            )}

            {/* mutfak sipariş fişlerini gösteren ana ekran */}
            {activeTab === 'mutfak' && (
              <div style={styles.panelCard}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                    marginBottom: '18px',
                  }}
                >
                  <div>
                    <h2 style={styles.pageTitle}>👨‍🍳 Mutfak Siparişleri</h2>
                    <p style={{ color: '#64748b', fontSize: '13px', marginTop: '6px' }}>
                      Masalardan gelen siparişler burada görünür.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => mutfakFisleriniSupabasedenCek(mevcutRestaurantId)}
                    style={{
                      border: 'none',
                      backgroundColor: '#1e293b',
                      color: '#fff',
                      padding: '10px 13px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: '800',
                      fontSize: '12px',
                    }}
                  >
                    Yenile
                  </button>
                </div>

                {(!Array.isArray(mutfakFisleri) || mutfakFisleri.length === 0) ? (
                  <div
                    style={{
                      color: '#94a3b8',
                      fontSize: '14px',
                      textAlign: 'center',
                      padding: '35px',
                    }}
                  >
                    Henüz mutfak siparişi yok.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {mutfakFisleri.map(fis => (
                      <div
                        key={fis.id}
                        style={{
                          backgroundColor: fis.durum === 'Hazırlandı' ? '#f0fdf4' : '#fff7ed',
                          border: fis.durum === 'Hazırlandı' ? '1px solid #bbf7d0' : '1px solid #fed7aa',
                          borderRadius: '14px',
                          padding: '14px',
                          display: 'grid',
                          gridTemplateColumns: '1fr auto',
                          gap: '12px',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              gap: '8px',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              marginBottom: '8px',
                            }}
                          >
                            <span
                              style={{
                                backgroundColor: '#1e293b',
                                color: '#fff',
                                padding: '5px 9px',
                                borderRadius: '999px',
                                fontSize: '12px',
                                fontWeight: '900',
                              }}
                            >
                              {fis.masaAdi}
                            </span>

                            <span
                              style={{
                                backgroundColor: fis.durum === 'Hazırlandı' ? '#dcfce7' : '#ffedd5',
                                color: fis.durum === 'Hazırlandı' ? '#15803d' : '#c2410c',
                                padding: '5px 9px',
                                borderRadius: '999px',
                                fontSize: '12px',
                                fontWeight: '900',
                              }}
                            >
                              {fis.durum}
                            </span>
                          </div>

                          <div style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b' }}>
                            {fis.adet}x {fis.urunAdi}
                          </div>

                          {fis.notMetni && (
                            <div
                              style={{
                                marginTop: '6px',
                                fontSize: '13px',
                                color: '#ff6b35',
                                fontWeight: '800',
                              }}
                            >
                              Not: {fis.notMetni}
                            </div>
                          )}

                          <div
                            style={{
                              marginTop: '8px',
                              display: 'flex',
                              gap: '12px',
                              flexWrap: 'wrap',
                              fontSize: '12px',
                              color: '#64748b',
                              fontWeight: '700',
                            }}
                          >
                            <span>Garson: {fis.garsonAdi}</span>
                            <span>Tarih: {tarihSaatYaz(fis.createdAt)}</span>
                          </div>
                        </div>

                        {fis.durum !== 'Hazırlandı' && (
                          <button
                            type="button"
                            onClick={() => mutfakFisiniHazirla(fis.id)}
                            style={{
                              border: 'none',
                              backgroundColor: '#10b981',
                              color: '#fff',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              fontWeight: '900',
                              fontSize: '12px',
                            }}
                          >
                            Hazırlandı
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}




            {/* paket servis ekranını gösteren kod */}
            {activeTab === 'paket' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>🛵 Paket Servis</h2>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px' }}>
                  Gel-al ve paket siparişleri buradan takip edebilirsiniz.
                </p>

                <form onSubmit={paketSiparisOlustur} style={{ ...styles.inlineForm, alignItems: 'flex-start' }}>
                  {/* kayıtlı paket servis müşterisi seçme kodu */}
                  <div
                    style={{
                      width: '100%',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '12px',
                      display: 'grid',
                      gridTemplateColumns: 'minmax(220px, 1.4fr) auto auto',
                      gap: '10px',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ minWidth: '220px', width: '100%', position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Kayıtlı müşteri ara..."
                        value={paketMusteriArama}
                        onChange={e => {
                          setPaketMusteriArama(e.target.value);
                          setSeciliPaketMusteriId('');
                        }}
                        style={{
                          ...styles.input,
                          width: '100%',
                          minWidth: '220px',
                          backgroundColor: '#fff',
                          boxSizing: 'border-box',
                        }}
                      />

                      {(paketMusteriArama || filtreliPaketMusterileri.length > 0) && (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            marginTop: '6px',
                            maxHeight: '160px',
                            overflowY: 'auto',
                          }}
                        >
                          {filtreliPaketMusterileri.length === 0 ? (
                            <div style={{ color: '#94a3b8', fontSize: '12px', padding: '6px' }}>Kayıtlı müşteri bulunamadı.</div>
                          ) : (
                            filtreliPaketMusterileri.map(m => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => paketMusterisiSec(String(m.id))}
                                style={{
                                  border: String(seciliPaketMusteriId) === String(m.id) ? '1px solid #ff6b35' : '1px solid #e2e8f0',
                                  backgroundColor: String(seciliPaketMusteriId) === String(m.id) ? '#fff7ed' : '#fff',
                                  color: '#334155',
                                  padding: '8px 9px',
                                  borderRadius: '9px',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  fontWeight: '800',
                                  fontSize: '12px',
                                }}
                              >
                                {m.ad} {m.telefon ? `— ${m.telefon}` : ''}
                                {m.adres ? <span style={{ color: '#64748b', fontWeight: '700' }}> / {m.adres}</span> : null}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: '#475569',
                        fontWeight: '900',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={paketMusteriKaydedilsin}
                        onChange={e => setPaketMusteriKaydedilsin(e.target.checked)}
                      />
                      Müşteriyi kaydet/güncelle
                    </label>

                    <button
                      type="button"
                      onClick={() => paketMusterisiSec('')}
                      style={{
                        border: 'none',
                        backgroundColor: '#e2e8f0',
                        color: '#334155',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '900',
                        fontSize: '12px',
                      }}
                    >
                      Yeni Müşteri
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Müşteri adı"
                    value={paketMusteriAdi}
                    onChange={e => setPaketMusteriAdi(e.target.value)}
                    style={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="Telefon"
                    value={paketTelefon}
                    onChange={e => setPaketTelefon(e.target.value)}
                    style={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="Adres"
                    value={paketAdres}
                    onChange={e => setPaketAdres(e.target.value)}
                    style={{ ...styles.input, minWidth: '260px', flex: 1 }}
                  />
                  <input
                    type="text"
                    placeholder="Sipariş notu"
                    value={paketNotu}
                    onChange={e => setPaketNotu(e.target.value)}
                    style={{ ...styles.input, minWidth: '220px' }}
                  />
                  <div
                    style={{
                      ...styles.input,
                      minWidth: '260px',
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    Ödeme, sipariş kapanırken nakit veya kart olarak alınır.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '220px' }}>
                    <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>
                      Kurye / Personel
                    </label>
                    <select
                      value={paketSeciliKuryePersonelId}
                      onChange={e => setPaketSeciliKuryePersonelId(e.target.value)}
                      style={styles.input}
                    >
                      <option value="">Kurye/personel seç</option>
                      {paketKuryePersonelleri.map(personel => (
                        <option key={personel.id} value={String(personel.id)}>
                          {personel.ad} — {personel.gorev}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* paket servis ürünlerini grup butonları ve ürün kartlarıyla seçen kod */}
                  <div
                    style={{
                      width: '100%',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                        Paket Ürün Seçimi
                      </strong>

                      <input
                        type="text"
                        placeholder="Paket ürünü ara..."
                        value={paketUrunArama}
                        onChange={e => setPaketUrunArama(e.target.value)}
                        style={{
                          ...styles.input,
                          flex: '1 1 180px',
                          minWidth: '180px',
                          backgroundColor: '#fff',
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '7px',
                        overflowX: 'auto',
                        paddingBottom: '2px',
                      }}
                    >
                      {aktifMenuGruplari.length === 0 ? (
                        <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '700' }}>
                          Grup yok
                        </span>
                      ) : (
                        aktifMenuGruplari.map(grup => (
                          <button
                            key={grup.id || grup.ad}
                            type="button"
                            onClick={() => {
                              setAktifPaketMenuGrubu(grup.ad);
                              setPaketUrunArama('');
                              setPaketSeciliUrunId('');
                            }}
                            style={{
                              border: 'none',
                              backgroundColor: (aktifPaketGrup.ad || aktifPaketMenuGrubu) === grup.ad ? '#ff6b35' : '#e2e8f0',
                              color: (aktifPaketGrup.ad || aktifPaketMenuGrubu) === grup.ad ? '#fff' : '#334155',
                              padding: '8px 11px',
                              borderRadius: '999px',
                              cursor: 'pointer',
                              fontWeight: '900',
                              fontSize: '12px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {grup.ad}
                          </button>
                        ))
                      )}
                    </div>

                    {aktifPaketGrubuUrunleri.length === 0 ? (
                      <div
                        style={{
                          color: '#94a3b8',
                          fontSize: '12px',
                          fontWeight: '700',
                          backgroundColor: '#fff',
                          border: '1px dashed #cbd5e1',
                          borderRadius: '10px',
                          padding: '12px',
                          textAlign: 'center',
                        }}
                      >
                        Bu grupta paket için ürün bulunamadı.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
                          gap: '8px',
                          maxHeight: '260px',
                          overflowY: 'auto',
                          paddingRight: '2px',
                        }}
                      >
                        {aktifPaketGrubuUrunleri.map(u => {
                          const seciliMi = String(paketSeciliUrunId) === String(u.id);

                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => paketteUrunSec(u)}
                              style={{
                                border: seciliMi ? '2px solid #ff6b35' : '1px solid #e2e8f0',
                                backgroundColor: seciliMi ? '#fff7ed' : '#fff',
                                color: '#1e293b',
                                borderRadius: '12px',
                                padding: '10px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                boxShadow: seciliMi ? '0 10px 24px -18px rgba(255,107,53,0.8)' : 'none',
                              }}
                            >
                              <div style={{ fontWeight: '900', fontSize: '13px', marginBottom: '5px' }}>
                                {u.favori ? '⭐ ' : ''}{u.ad}
                              </div>

                              <div style={{ color: '#ff6b35', fontWeight: '900', fontSize: '13px' }}>
                                {u.fiyat} TL
                              </div>

                              <div style={{ color: '#64748b', fontWeight: '700', fontSize: '10px', marginTop: '4px' }}>
                                {u.departman || aktifPaketGrup.departman || 'Mutfak'}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {paketSeciliMenuUrunu && (
                      <div
                        style={{
                          backgroundColor: '#fff',
                          border: '1px solid #fed7aa',
                          color: '#c2410c',
                          borderRadius: '10px',
                          padding: '8px 10px',
                          fontSize: '12px',
                          fontWeight: '900',
                        }}
                      >
                        Seçili paket ürünü: {paketSeciliMenuUrunu.ad} / {paketSeciliMenuUrunu.fiyat} TL
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input
                        type="number"
                        min="1"
                        value={paketSeciliAdet}
                        onChange={e => setPaketSeciliAdet(e.target.value)}
                        style={{ ...styles.input, width: '90px', minWidth: '90px' }}
                      />

                      <input
                        type="text"
                        placeholder="Ürün notu (örn: acısız, bol sos)"
                        value={paketSeciliUrunNotu}
                        onChange={e => setPaketSeciliUrunNotu(e.target.value)}
                        style={{ ...styles.input, flex: '1 1 220px', minWidth: '220px' }}
                      />

                      <button type="button" onClick={paketUrunEkle} style={styles.btnOrange}>
                        Ürün Ekle
                      </button>
                    </div>
                  </div>

                  {paketUrunler.length > 0 && (
                    <div style={{ width: '100%', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                      <strong>Yeni paket ürünleri</strong>
                      {paketUrunler.map((u, index) => (
                        <div key={index} style={styles.receiptRow}>
                          <span>{u.adet}x {u.ad} — {Number(u.fiyat || 0) * Number(u.adet || 1)} TL {u.not ? ` / Not: ${u.not}` : ''}</span>
                          <button type="button" onClick={() => paketUrunSil(index)} style={styles.deleteItemBtn}>❌</button>
                        </div>
                      ))}
                      <div style={{ ...styles.totalRow, marginTop: '10px' }}>
                        <span>Toplam</span>
                        <strong>{paketToplam} TL</strong>
                      </div>
                    </div>
                  )}

                  <button type="submit" style={styles.btnOrange}>
                    Paket Siparişi Kaydet
                  </button>
                </form>


                <div style={{ ...styles.panelCard, marginTop: '18px', backgroundColor: '#f8fafc' }}>
                  <h3 style={{ fontSize: '16px', color: '#1e293b', marginTop: 0 }}>👥 Paket Müşteri Geçmişi</h3>
                  {paketMusteriGecmisiOzetleri.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '13px' }}>Kayıtlı paket müşterisi yok.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                      {paketMusteriGecmisiOzetleri.slice(0, 6).map(m => (
                        <div key={m.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px' }}>
                          <div style={{ fontWeight: '900', color: '#1e293b' }}>{m.ad}</div>
                          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>{m.telefon}</div>
                          <div style={{ color: '#ff6b35', fontSize: '12px', fontWeight: '900', marginTop: '6px' }}>
                            {m.siparisSayisi} sipariş / {m.toplamHarcama} TL
                          </div>
                          <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                            Son: {tarihSaatYaz(m.sonSiparis)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <h3 style={{ fontSize: '16px', color: '#1e293b', marginTop: '22px' }}>Paket Sipariş Listesi</h3>
                {aktifPaketSiparisleri.length === 0 ? (
                  <div style={{ color: '#94a3b8', padding: '20px' }}>Henüz paket sipariş yok.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {aktifPaketSiparisleri.map(p => (
                      <div key={p.id} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          <div>
                            <strong>{p.musteriAdi}</strong> — {p.telefon}
                            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>{p.adres}</div>
                            {p.notMetni && <div style={{ color: '#ff6b35', fontSize: '12px', marginTop: '4px' }}>Not: {p.notMetni}</div>}
                            {p.kuryeAdi && <div style={{ color: '#2563eb', fontSize: '12px', marginTop: '4px', fontWeight: '800' }}>Kurye: {p.kuryeAdi}</div>}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#ff6b35', fontWeight: '900' }}>{p.tutar} TL</div>
                            {p.odendi ? (
                              <div
                                style={{
                                  ...styles.badgeActive,
                                  display: 'inline-block',
                                  marginTop: '6px',
                                }}
                              >
                                Kapandı / {p.odemeTipi}
                              </div>
                            ) : (
                              <>
                              <select
                                value={p.kuryePersonelId ? String(p.kuryePersonelId) : ''}
                                onChange={e => {
                                  const personelId = e.target.value;
                                  const seciliPersonel = paketKuryePersonelleri.find(personel => String(personel.id) === String(personelId));
                                  setPaketSiparisleri(paketSiparisleri.map(siparis => {
                                    if (siparis.id === p.id) {
                                      return {
                                        ...siparis,
                                        kuryePersonelId: personelId || null,
                                        kuryeAdi: seciliPersonel?.ad || '',
                                      };
                                    }
                                    return siparis;
                                  }));
                                  setKuryeAdiInputs(prev => ({ ...(prev || {}), [p.id]: seciliPersonel?.ad || '' }));
                                }}
                                style={{ ...styles.input, minWidth: '170px', marginTop: '6px' }}
                              >
                                <option value="">Kurye/personel seç</option>
                                {paketKuryePersonelleri.map(personel => (
                                  <option key={personel.id} value={String(personel.id)}>
                                    {personel.ad} — {personel.gorev}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={p.durum}
                                onChange={e => paketDurumGuncelle(p, e.target.value)}
                                style={{ ...styles.input, minWidth: '150px', marginTop: '6px' }}
                              >
                                <option value="Hazırlanıyor">Hazırlanıyor</option>
                                <option value="Yolda">Yolda</option>
                                <option value="İptal">İptal</option>
                              </select>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => paketFisiYazdir(p)}
                              style={{
                                width: '100%',
                                border: 'none',
                                backgroundColor: '#0f766e',
                                color: '#fff',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '900',
                                fontSize: '12px',
                                marginTop: '6px',
                              }}
                            >
                              🖨️ Paket Fişi Yazdır
                            </button>

                            {!p.odendi && p.durum !== 'İptal' && (
                              <div
                                style={{
                                  marginTop: '8px',
                                  backgroundColor: '#fff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '10px',
                                  padding: '8px',
                                  textAlign: 'left',
                                }}
                              >
                                <div style={{ fontSize: '12px', color: '#475569', fontWeight: '900', marginBottom: '6px' }}>
                                  Ödeme Kapat
                                </div>

                                <input
                                  type="number"
                                  min="0"
                                  placeholder={`${p.tutar} TL alındı`}
                                  value={paketOdemeTutarInputs[p.id] || ''}
                                  onChange={e => {
                                    const deger = e.target.value;
                                    setPaketOdemeTutarInputs(prev => ({
                                      ...(prev || {}),
                                      [p.id]: deger,
                                    }));
                                  }}
                                  style={{
                                    ...styles.input,
                                    width: '100%',
                                    minWidth: '100%',
                                    boxSizing: 'border-box',
                                    marginBottom: '6px',
                                  }}
                                />

                                {Math.max(sayiyaCevir(paketOdemeTutarInputs[p.id] || p.tutar) - Number(p.tutar || 0), 0) > 0 && (
                                  <div style={{ color: '#10b981', fontSize: '12px', fontWeight: '900', marginBottom: '6px' }}>
                                    Para üstü: {Math.max(sayiyaCevir(paketOdemeTutarInputs[p.id] || p.tutar) - Number(p.tutar || 0), 0)} TL
                                  </div>
                                )}

                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => paketSiparisiKapat(p, 'Nakit')}
                                    style={{
                                      flex: 1,
                                      border: 'none',
                                      backgroundColor: '#10b981',
                                      color: '#fff',
                                      padding: '8px',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      fontWeight: '900',
                                      fontSize: '12px',
                                    }}
                                  >
                                    Nakit Kapat
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => paketSiparisiKapat(p, 'Kredi Kartı')}
                                    style={{
                                      flex: 1,
                                      border: 'none',
                                      backgroundColor: '#2563eb',
                                      color: '#fff',
                                      padding: '8px',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      fontWeight: '900',
                                      fontSize: '12px',
                                    }}
                                  >
                                    Kart Kapat
                                  </button>
                                </div>
                              </div>
                            )}

                            {p.odendi && (
                              <div style={{ color: '#10b981', fontSize: '12px', fontWeight: '900', marginTop: '6px' }}>
                                Ödendi: {p.odemeTipi} / Alınan: {p.alinanTutar || p.tutar} TL
                                {Number(p.paraUstu || 0) > 0 ? ` / Para üstü: ${p.paraUstu} TL` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {(p.urunler || []).map((u, idx) => (
                            <span key={idx} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '999px', padding: '6px 9px', fontSize: '12px', fontWeight: '800' }}>
                              {u.adet}x {u.ad}{u.not ? ` / Not: ${u.not}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* cari/veresiye ekranını gösteren kod */}
            {activeTab === 'cari' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>📒 Cari / Veresiye Hesapları</h2>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px' }}>
                  Müşteri borçlarını takip edin, tahsilat alın ve masadaki hesabı cariye yazın.
                </p>

                <form onSubmit={cariMusteriEkle} style={styles.inlineForm}>
                  <input type="text" placeholder="Müşteri adı" value={yeniCariAdi} onChange={e => setYeniCariAdi(e.target.value)} style={styles.input} />
                  <input type="text" placeholder="Telefon" value={yeniCariTelefon} onChange={e => setYeniCariTelefon(e.target.value)} style={styles.input} />
                  <input type="text" placeholder="Not" value={yeniCariNotu} onChange={e => setYeniCariNotu(e.target.value)} style={styles.input} />
                  <button type="submit" style={styles.btnOrange}>Cari Müşteri Ekle</button>
                </form>

                <input
                  type="text"
                  placeholder="Cari listesinde ara: müşteri adı, telefon veya not"
                  value={cariListeArama}
                  onChange={e => setCariListeArama(e.target.value)}
                  style={{ ...styles.input, width: '100%', boxSizing: 'border-box', marginBottom: '14px' }}
                />

                {cariMusteriler.length === 0 ? (
                  <div style={{ color: '#94a3b8', padding: '20px' }}>Henüz cari müşteri yok.</div>
                ) : filtreliCariMusteriler.length === 0 ? (
                  <div style={{ color: '#94a3b8', padding: '20px' }}>Aramanıza uygun cari müşteri bulunamadı.</div>
                ) : (
                  filtreliCariMusteriler.map(cari => (
                    <div key={cari.id} style={{ ...styles.dataRow, alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div>
                        <strong>{cari.ad}</strong>
                        <div style={{ color: '#64748b', fontSize: '12px' }}>{cari.telefon}</div>
                      </div>
                      <div style={{ fontWeight: '900', color: Number(cari.bakiye || 0) > 0 ? '#ef4444' : '#10b981' }}>
                        Bakiye: {cari.bakiye} TL
                      </div>
                      <input
                        type="number"
                        placeholder="Tahsilat"
                        value={cariTahsilatTutari}
                        onChange={e => setCariTahsilatTutari(e.target.value)}
                        style={{ ...styles.input, width: '120px', minWidth: '120px' }}
                      />
                      <button type="button" onClick={() => cariTahsilatAl(cari)} style={{ ...styles.btnOrange, backgroundColor: '#10b981' }}>
                        Tahsilat Al
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* stok takibi ekranını gösteren kod */}
            {activeTab === 'stok' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>📦 Stok Takibi</h2>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px' }}>
                  Stok takibi açık ürünlerde satış ve paket sipariş sonrası stok otomatik düşer.
                </p>

                {aktifMenu.length === 0 ? (
                  <div style={{ color: '#94a3b8', padding: '20px' }}>Stok takip edilecek ürün yok.</div>
                ) : (
                  aktifMenu.map(urun => (
                    <div key={urun.id} style={{ ...styles.dataRow, alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <strong>{urun.ad}</strong>
                        <div style={{ color: '#64748b', fontSize: '12px' }}>
                          {urun.menuGrubu} / {urun.departman}
                        </div>
                      </div>
                      <span style={Number(urun.stokAdedi || 0) <= Number(urun.kritikStok || 0) && urun.stokTakip ? styles.badgePending : styles.badgeActive}>
                        {urun.stokTakip ? `Stok: ${urun.stokAdedi}` : 'Stok Kapalı'}
                      </span>
                      {stokDuzenlemeUrunId === urun.id ? (
                        <>
                          <input type="number" placeholder="Stok / eklenecek" value={stokDuzenlemeAdedi} onChange={e => setStokDuzenlemeAdedi(e.target.value)} style={{ ...styles.input, width: '130px', minWidth: '130px' }} />
                          <input type="number" placeholder="Kritik" value={stokDuzenlemeKritik} onChange={e => setStokDuzenlemeKritik(e.target.value)} style={{ ...styles.input, width: '100px', minWidth: '100px' }} />
                          <button type="button" onClick={() => urunStokGuncelle(urun)} style={styles.btnOrange}>Ayarla</button>
                          <button type="button" onClick={() => urunStokEkle(urun)} style={{ ...styles.btnOrange, backgroundColor: '#10b981' }}>+ Stok Ekle</button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setStokDuzenlemeUrunId(urun.id);
                            setStokDuzenlemeAdedi(String(urun.stokAdedi || 0));
                            setStokDuzenlemeKritik(String(urun.kritikStok || 0));
                          }}
                          style={styles.btnOrange}
                        >
                          Stok Ayarla
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* kasa açılış kapanış ekranını gösteren kod */}
            {activeTab === 'kasa' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>💰 Kasa Açılış / Kapanış</h2>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px' }}>
                  Günlük kasa açılış tutarı, nakit giriş/çıkış ve beklenen kasa takibi.
                </p>

                <div style={styles.statsGrid}>
                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>Kasa Açılış</div>
                    <div style={styles.statsValue}>{kasaHareketleri.filter(k => k.tip === 'Açılış').reduce((t, k) => t + Number(k.tutar || 0), 0)} TL</div>
                  </div>
                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>Nakit Giriş</div>
                    <div style={{ ...styles.statsValue, color: '#10b981' }}>{kasaHareketleri.filter(k => k.tip === 'Giriş').reduce((t, k) => t + Number(k.tutar || 0), 0)} TL</div>
                  </div>
                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>Nakit Çıkış</div>
                    <div style={{ ...styles.statsValue, color: '#ef4444' }}>{kasaHareketleri.filter(k => k.tip === 'Çıkış').reduce((t, k) => t + Number(k.tutar || 0), 0)} TL</div>
                  </div>
                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>Beklenen Nakit Kasa</div>
                    <div style={styles.statsValue}>
                      {kasaHareketleri.filter(k => k.tip === 'Açılış' || k.tip === 'Giriş').reduce((t, k) => t + Number(k.tutar || 0), 0) - kasaHareketleri.filter(k => k.tip === 'Çıkış').reduce((t, k) => t + Number(k.tutar || 0), 0)} TL
                    </div>
                  </div>
                </div>


                <div style={{ ...styles.panelCard, marginTop: '18px', backgroundColor: '#f8fafc' }}>
                  <h3 style={{ fontSize: '16px', color: '#1e293b', marginTop: 0 }}>📌 Gün Sonu / Z Raporu</h3>
                  <div style={styles.statsGrid}>
                    <div style={styles.statsCard}>
                      <div style={styles.statsTitle}>Bugünkü Ciro</div>
                      <div style={styles.statsValue}>{bugunkuCiro} TL</div>
                    </div>
                    <div style={styles.statsCard}>
                      <div style={styles.statsTitle}>Bugünkü Gider</div>
                      <div style={{ ...styles.statsValue, color: '#ef4444' }}>{bugunkuGiderToplami} TL</div>
                    </div>
                    <div style={styles.statsCard}>
                      <div style={styles.statsTitle}>Ürün Maliyeti</div>
                      <div style={styles.statsValue}>{bugunkuMaliyet} TL</div>
                    </div>
                    <div style={styles.statsCard}>
                      <div style={styles.statsTitle}>Tahmini Net Kâr</div>
                      <div style={{ ...styles.statsValue, color: bugunkuTahminiKar >= 0 ? '#10b981' : '#ef4444' }}>{bugunkuTahminiKar} TL</div>
                    </div>
                  </div>

                  <div style={{ ...styles.inlineForm, marginTop: '12px' }}>
                    <input
                      type="number"
                      placeholder="Gerçek kasa tutarı"
                      value={kasaGercekTutar}
                      onChange={e => setKasaGercekTutar(e.target.value)}
                      style={styles.input}
                    />
                    <button type="button" onClick={zRaporuYazdir} style={{ ...styles.btnOrange, backgroundColor: '#1e293b' }}>
                      🖨️ Z Raporu Yazdır
                    </button>
                  </div>
                </div>

                <div style={{ ...styles.inlineForm, marginTop: '18px' }}>
                  <input type="number" placeholder="Açılış tutarı" value={kasaAcilisTutari} onChange={e => setKasaAcilisTutari(e.target.value)} style={styles.input} />
                  <button type="button" onClick={() => kasaHareketiEkle('Açılış', kasaAcilisTutari, 'Kasa açılışı')} style={styles.btnOrange}>Kasa Aç</button>
                  <input type="number" placeholder="Giriş/Çıkış tutarı" value={kasaHareketTutari} onChange={e => setKasaHareketTutari(e.target.value)} style={styles.input} />
                  <input type="text" placeholder="Açıklama" value={kasaHareketAciklama} onChange={e => setKasaHareketAciklama(e.target.value)} style={styles.input} />
                  <button type="button" onClick={() => kasaHareketiEkle('Giriş', kasaHareketTutari, kasaHareketAciklama || 'Nakit giriş')} style={{ ...styles.btnOrange, backgroundColor: '#10b981' }}>Giriş</button>
                  <button type="button" onClick={() => kasaHareketiEkle('Çıkış', kasaHareketTutari, kasaHareketAciklama || 'Nakit çıkış')} style={{ ...styles.btnOrange, backgroundColor: '#ef4444' }}>Çıkış</button>
                </div>

                <h3 style={{ fontSize: '16px', color: '#1e293b', marginTop: '20px' }}>Bugünkü Kasa Hareketleri</h3>
                {kasaHareketleri.length === 0 ? (
                  <div style={{ color: '#94a3b8', padding: '20px' }}>Bugün kasa hareketi yok.</div>
                ) : (
                  kasaHareketleri.map(k => (
                    <div key={k.id} style={styles.dataRow}>
                      <span>{k.tip} — {k.aciklama}</span>
                      <strong>{k.tutar} TL</strong>
                    </div>
                  ))
                )}

                <h3 style={{ fontSize: '16px', color: '#1e293b', marginTop: '24px' }}>📚 Kapanmış Gün Sonu Z Raporları</h3>
                {zRaporlari.length === 0 ? (
                  <div style={{ color: '#94a3b8', padding: '20px' }}>Henüz kasaya aktarılmış gün sonu raporu yok.</div>
                ) : (
                  zRaporlari.map(z => (
                    <details key={z.id} style={{ ...styles.dataRow, display: 'block' }}>
                      <summary style={{ cursor: 'pointer', fontWeight: '900', color: '#1e293b' }}>
                        {z.tarih} — Ciro: {z.toplamCiro} TL / Kâr: {z.tahminiKar} TL / Kasa farkı: {z.kasaFarki} TL
                      </summary>
                      <div style={{ marginTop: '10px', display: 'grid', gap: '6px', fontSize: '13px', color: '#475569' }}>
                        <div>Nakit: <strong>{z.nakitSatis} TL</strong> / Kart: <strong>{z.kartSatis} TL</strong></div>
                        <div>Gider + İade/İkram/Zayi: <strong>{z.giderToplam} TL</strong></div>
                        <div>Maliyet: <strong>{z.maliyetToplam} TL</strong></div>
                        <div>Beklenen kasa: <strong>{z.beklenenKasa} TL</strong> / Gerçek kasa: <strong>{z.gercekKasa} TL</strong></div>
                        <div>Satış satırı: <strong>{Array.isArray(z.detaylar?.satislar) ? z.detaylar.satislar.length : 0}</strong></div>
                        <div>Paket servis kaydı: <strong>{Array.isArray(z.detaylar?.paketSiparisleri) ? z.detaylar.paketSiparisleri.length : 0}</strong></div>
                        <div>Gider kaydı: <strong>{Array.isArray(z.detaylar?.giderler) ? z.detaylar.giderler.length : 0}</strong></div>
                        <div>İade/İkram/Zayi kaydı: <strong>{Array.isArray(z.detaylar?.iadeIkramZayi) ? z.detaylar.iadeIkramZayi.length : 0}</strong></div>

                        {Array.isArray(z.detaylar?.paketSiparisleri) && z.detaylar.paketSiparisleri.length > 0 && (
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                            <strong>📦 Paket Servis Detayları</strong>
                            {z.detaylar.paketSiparisleri.map((p, idx) => (
                              <div key={idx} style={{ marginTop: '5px' }}>
                                {p.musteriAdi || 'Paket Müşteri'} — {Number(p.tutar || 0)} TL — {p.odemeTipi || 'Ödeme'}
                              </div>
                            ))}
                          </div>
                        )}

                        {Array.isArray(z.detaylar?.satislar) && z.detaylar.satislar.length > 0 && (
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                            <strong>🧾 Satış Detayları</strong>
                            {z.detaylar.satislar.slice(0, 12).map((s, idx) => (
                              <div key={idx} style={{ marginTop: '5px' }}>
                                {s.siparisTipi || 'Satış'} — {s.ad} x{s.adet} — {Number(s.fiyat || 0) * Number(s.adet || 1)} TL
                              </div>
                            ))}
                            {z.detaylar.satislar.length > 12 && (
                              <div style={{ marginTop: '5px', color: '#94a3b8' }}>+ {z.detaylar.satislar.length - 12} satır daha</div>
                            )}
                          </div>
                        )}
                      </div>
                    </details>
                  ))
                )}
              </div>
            )}


            {/* hızlı satış / gel-al ekranını gösteren kod */}
            {activeTab === 'hizli_satis' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>⚡ Hızlı Satış / Gel-Al</h2>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px' }}>
                  Masa veya paket açmadan hızlı ürün seçip nakit/kart satış kapatabilirsiniz.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: '18px' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {aktifMenuGruplari.map(grup => (
                        <button
                          key={grup.ad}
                          type="button"
                          onClick={() => setAktifHizliSatisMenuGrubu(grup.ad)}
                          style={{
                            border: 'none',
                            backgroundColor: aktifHizliSatisMenuGrubu === grup.ad ? '#ff6b35' : '#e2e8f0',
                            color: aktifHizliSatisMenuGrubu === grup.ad ? '#fff' : '#334155',
                            padding: '9px 13px',
                            borderRadius: '999px',
                            cursor: 'pointer',
                            fontWeight: '900',
                            fontSize: '12px',
                          }}
                        >
                          {grup.ad}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder="Ürün ara..."
                      value={hizliSatisUrunArama}
                      onChange={e => setHizliSatisUrunArama(e.target.value)}
                      style={{ ...styles.input, width: '100%', boxSizing: 'border-box', marginBottom: '12px' }}
                    />

                    <div style={styles.mesaGrid}>
                      {aktifHizliSatisGrubuUrunleri.map(urun => (
                        <button
                          key={urun.id}
                          type="button"
                          onClick={() => hizliSatisUrunEkle(urun)}
                          style={{
                            ...styles.mesaCard,
                            textAlign: 'left',
                            borderColor: urun.favori ? '#f59e0b' : 'transparent',
                            backgroundColor: '#fff',
                          }}
                        >
                          <div style={{ fontWeight: '900', color: '#1e293b' }}>{urun.favori ? '⭐ ' : ''}{urun.ad}</div>
                          <div style={{ color: '#ff6b35', fontWeight: '900', marginTop: '8px' }}>{urun.fiyat} TL</div>
                          <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>{urun.menuGrubu || 'Genel'}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px' }}>
                    <h3 style={{ marginTop: 0, color: '#1e293b' }}>Hızlı Satış Sepeti</h3>
                    {hizliSatisUrunler.length === 0 ? (
                      <div style={{ color: '#94a3b8', fontSize: '13px' }}>Sepet boş.</div>
                    ) : (
                      hizliSatisUrunler.map((u, index) => (
                        <div key={`${u.urunId}-${index}`} style={{ ...styles.receiptRow, alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '800', color: '#1e293b' }}>
                              {u.adet}x {u.ad} {u.ikram ? '🎁 İkram' : ''}
                            </div>
                            {Array.isArray(u.menuNotlari) && u.menuNotlari.length > 0 && (
                              <select
                                value={u.hazirNotId || ''}
                                onChange={e => hizliSatisHazirNotSec(index, e.target.value)}
                                style={{
                                  ...styles.input,
                                  minWidth: '100%',
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  padding: '7px 8px',
                                  fontSize: '12px',
                                  marginTop: '5px',
                                }}
                              >
                                <option value="">Hazır not seç</option>
                                {u.menuNotlari.map(n => (
                                  <option key={n.id || n.ad} value={String(n.id || n.ad)}>
                                    {n.ad} {Number(n.fiyat || 0) > 0 ? `(+${n.fiyat} TL)` : ''}
                                  </option>
                                ))}
                              </select>
                            )}

                            <input
                              type="text"
                              placeholder="Ürün notu"
                              value={u.not || ''}
                              onChange={e => hizliSatisUrunNotuDegistir(index, e.target.value)}
                              style={{
                                ...styles.input,
                                minWidth: '100%',
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '7px 8px',
                                fontSize: '12px',
                                marginTop: '5px',
                              }}
                            />

                            {Number(u.ekstraUcret || 0) > 0 && (
                              <div style={{ fontSize: '11px', color: '#ff6b35', fontWeight: '900', marginTop: '4px' }}>
                                Hazır not ekstra: +{u.ekstraUcret} TL / adet
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <strong>{Number(u.fiyat || 0) * Number(u.adet || 1)} TL</strong>
                            {!u.ikram && Number(u.fiyat || 0) > 0 && (
                              <button type="button" onClick={() => hizliSatisBirUrunIkramEt(index)} style={{ ...styles.deleteItemBtn, color: '#f59e0b', fontWeight: '900' }}>🎁</button>
                            )}
                            <button type="button" onClick={() => hizliSatisAdetDegistir(index, -1)} style={styles.deleteItemBtn}>−</button>
                            <button type="button" onClick={() => hizliSatisAdetDegistir(index, 1)} style={styles.deleteItemBtn}>+</button>
                          </div>
                        </div>
                      ))
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="İndirim %"
                        value={hizliSatisIndirimYuzde}
                        onChange={e => setHizliSatisIndirimYuzde(e.target.value)}
                        style={{ ...styles.input, minWidth: '100%', width: '100%', boxSizing: 'border-box' }}
                      />

                      <input
                        type="number"
                        min="0"
                        placeholder="İndirim TL"
                        value={hizliSatisIndirimTutari}
                        onChange={e => setHizliSatisIndirimTutari(e.target.value)}
                        style={{ ...styles.input, minWidth: '100%', width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>

                    {hizliSatisToplamIndirim > 0 && (
                      <div style={{ color: '#ef4444', fontWeight: '900', fontSize: '13px', marginTop: '8px' }}>
                        Toplam indirim: -{hizliSatisToplamIndirim} TL
                      </div>
                    )}

                    <div style={{ ...styles.totalRow, marginTop: '12px' }}>
                      <span>Toplam:</span>
                      <strong style={{ color: '#ff6b35', fontSize: '22px' }}>{hizliSatisToplam} TL</strong>
                    </div>

                    <select value={hizliSatisOdemeTipi} onChange={e => setHizliSatisOdemeTipi(e.target.value)} style={{ ...styles.input, width: '100%', minWidth: '100%', boxSizing: 'border-box', marginTop: '8px' }}>
                      <option value="Nakit">Nakit</option>
                      <option value="Kredi Kartı">Kredi Kartı</option>
                    </select>

                    <input
                      type="number"
                      placeholder={`${hizliSatisToplam} TL alındı`}
                      value={hizliSatisAlinanTutar}
                      onChange={e => setHizliSatisAlinanTutar(e.target.value)}
                      style={{ ...styles.input, width: '100%', minWidth: '100%', boxSizing: 'border-box', marginTop: '8px' }}
                    />

                    {hizliSatisOdemeTipi === 'Nakit' && Math.max(sayiyaCevir(hizliSatisAlinanTutar || hizliSatisToplam) - hizliSatisToplam, 0) > 0 && (
                      <div style={{ color: '#10b981', fontWeight: '900', fontSize: '13px', marginTop: '8px' }}>
                        Para üstü: {Math.max(sayiyaCevir(hizliSatisAlinanTutar || hizliSatisToplam) - hizliSatisToplam, 0)} TL
                      </div>
                    )}

                    <button type="button" onClick={hizliSatisKapat} style={{ ...styles.checkoutBtn, marginTop: '10px' }}>
                      Satışı Kapat
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* gider takibi ekranını gösteren kod */}
            {activeTab === 'giderler' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>🧾 Gider Takibi</h2>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px' }}>
                  Günlük işletme giderlerini girin; kâr raporunda otomatik hesaplansın.
                </p>

                <form onSubmit={giderEkle} style={styles.inlineForm}>
                  <select value={yeniGiderKategori} onChange={e => setYeniGiderKategori(e.target.value)} style={styles.input}>
                    <option>Malzeme</option>
                    <option>Personel</option>
                    <option>Kira</option>
                    <option>Fatura</option>
                    <option>Komisyon</option>
                    <option>Diğer</option>
                  </select>
                  <input type="text" placeholder="Açıklama" value={yeniGiderAciklama} onChange={e => setYeniGiderAciklama(e.target.value)} style={styles.input} />
                  <input type="number" placeholder="Tutar" value={yeniGiderTutari} onChange={e => setYeniGiderTutari(e.target.value)} style={styles.input} />
                  <button type="submit" style={styles.btnOrange}>Gider Ekle</button>
                </form>

                <div style={styles.statsGrid}>
                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>Bugünkü Gider</div>
                    <div style={{ ...styles.statsValue, color: '#ef4444' }}>{bugunkuGiderToplami} TL</div>
                  </div>
                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>Tahmini Net Kâr</div>
                    <div style={{ ...styles.statsValue, color: bugunkuTahminiKar >= 0 ? '#10b981' : '#ef4444' }}>{bugunkuTahminiKar} TL</div>
                  </div>
                </div>

                <h3 style={{ fontSize: '16px', color: '#1e293b', marginTop: '20px' }}>Bugünkü Giderler</h3>
                {giderler.length === 0 ? (
                  <div style={{ color: '#94a3b8', padding: '20px' }}>Bugün gider yok.</div>
                ) : (
                  giderler.map(g => (
                    <div key={g.id} style={styles.dataRow}>
                      <span>{g.kategori} — {g.aciklama || 'Açıklama yok'}</span>
                      <strong>{g.tutar} TL</strong>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* iade / ikram / zayi ekranını gösteren kod */}
            {activeTab === 'iadeler' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>↩️ İade / İptal / İkram / Zayi</h2>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px' }}>
                  Satış dışı ürün hareketlerini sebebiyle birlikte kaydedin.
                </p>

                <form onSubmit={iadeKaydiEkle} style={styles.inlineForm}>
                  <select value={iadeTipi} onChange={e => setIadeTipi(e.target.value)} style={styles.input}>
                    <option>İade</option>
                    <option>İptal</option>
                    <option>İkram</option>
                    <option>Zayi</option>
                    <option>Personel Yemeği</option>
                  </select>
                  <select value={iadeSebebi} onChange={e => setIadeSebebi(e.target.value)} style={styles.input}>
                    <option>Müşteri vazgeçti</option>
                    <option>Yanlış girildi</option>
                    <option>Ürün yok</option>
                    <option>İkram</option>
                    <option>Personel hatası</option>
                    <option>Fire / zayi</option>
                  </select>
                  <select value={iadeUrunId} onChange={e => setIadeUrunId(e.target.value)} style={styles.input}>
                    <option value="">Ürün seç</option>
                    {aktifMenu.map(u => <option key={u.id} value={String(u.id)}>{u.ad}</option>)}
                  </select>
                  <input type="number" min="1" placeholder="Adet" value={iadeAdet} onChange={e => setIadeAdet(e.target.value)} style={{ ...styles.input, width: '90px', minWidth: '90px' }} />
                  <input type="number" placeholder="Tutar" value={iadeTutar} onChange={e => setIadeTutar(e.target.value)} style={styles.input} />
                  <button type="submit" style={styles.btnOrange}>Kaydet</button>
                </form>

                {iadeKayitlari.length === 0 ? (
                  <div style={{ color: '#94a3b8', padding: '20px' }}>Bugün kayıt yok.</div>
                ) : (
                  iadeKayitlari.map(i => (
                    <div key={i.id} style={styles.dataRow}>
                      <span>{i.tip} — {i.adet}x {i.urunAdi} / {i.sebep}</span>
                      <strong>{i.tutar} TL</strong>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* rezervasyon ekranını gösteren kod */}
            {activeTab === 'rezervasyonlar' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>📅 Rezervasyonlar</h2>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px' }}>
                  Masa rezervasyonlarını takip edin.
                </p>

                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '12px',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '900', marginBottom: '8px' }}>
                    Kayıtlı cari müşteriden seç
                  </div>
                  <input
                    type="text"
                    placeholder="Cari müşteri ara: ad / telefon"
                    value={rezervasyonCariArama}
                    onChange={e => {
                      setRezervasyonCariArama(e.target.value);
                      setRezervasyonCariMusteriId('');
                    }}
                    style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                  />

                  {rezervasyonCariArama && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {filtreliRezervasyonCariMusterileri.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: '12px' }}>Eşleşen cari yok. Rezervasyon ekleyince yeni cari olarak kaydedilir.</div>
                      ) : (
                        filtreliRezervasyonCariMusterileri.slice(0, 8).map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => rezervasyonCariMusterisiSec(String(c.id))}
                            style={{
                              border: String(rezervasyonCariMusteriId) === String(c.id) ? '1px solid #ff6b35' : '1px solid #e2e8f0',
                              backgroundColor: String(rezervasyonCariMusteriId) === String(c.id) ? '#fff7ed' : '#fff',
                              color: '#334155',
                              padding: '8px 10px',
                              borderRadius: '999px',
                              cursor: 'pointer',
                              fontWeight: '800',
                              fontSize: '12px',
                            }}
                          >
                            {c.ad} {c.telefon ? `- ${c.telefon}` : ''}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <form onSubmit={rezervasyonEkle} style={styles.inlineForm}>
                  <input type="text" placeholder="Müşteri adı" value={rezervasyonAdi} onChange={e => setRezervasyonAdi(e.target.value)} style={styles.input} />
                  <input type="text" placeholder="Telefon" value={rezervasyonTelefon} onChange={e => setRezervasyonTelefon(e.target.value)} style={styles.input} />
                  <input type="number" placeholder="Kişi" value={rezervasyonKisiSayisi} onChange={e => setRezervasyonKisiSayisi(e.target.value)} style={{ ...styles.input, width: '90px', minWidth: '90px' }} />
                  <input type="datetime-local" value={rezervasyonTarihSaat} onChange={e => setRezervasyonTarihSaat(e.target.value)} style={styles.input} />
                  <input type="datetime-local" value={rezervasyonBitisTarihSaat} onChange={e => setRezervasyonBitisTarihSaat(e.target.value)} style={styles.input} />
                  <select value={rezervasyonMasaId} onChange={e => setRezervasyonMasaId(e.target.value)} style={styles.input}>
                    <option value="">Masa seçme</option>
                    {tumRestoranMasalari.filter(m => rezervasyonMasaMusaitMi(m)).map(m => <option key={m.id} value={String(m.id)}>{m.bolum || 'Salon'} / {m.ad}</option>)}
                  </select>
                  <input type="text" placeholder="Not" value={rezervasyonNotu} onChange={e => setRezervasyonNotu(e.target.value)} style={styles.input} />
                  <button type="submit" style={styles.btnOrange}>Rezervasyon Ekle</button>
                </form>

                {rezervasyonlar.length === 0 ? (
                  <div style={{ color: '#94a3b8', padding: '20px' }}>Rezervasyon yok.</div>
                ) : (
                  rezervasyonlar.map(r => (
                    <div key={r.id} style={styles.dataRow}>
                      <span>
                        {tarihSaatYaz(r.rezervasyonZamani)} - {saatYaz(r.rezervasyonBitisZamani)} — <strong>{r.musteriAdi}</strong> / {r.kisiSayisi || '-'} kişi {r.masaAdi ? `/ ${r.masaAdi}` : ''}
                        {r.notMetni ? ` / ${r.notMetni}` : ''}
                      </span>
                      <select value={r.durum} onChange={e => rezervasyonDurumGuncelle(r, e.target.value)} style={{ ...styles.input, minWidth: '140px' }}>
                        <option>Bekliyor</option>
                        <option>Geldi</option>
                        <option>İptal</option>
                      </select>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* menü ürün grupları, ürün ekleme, düzenleme ve silme ekranını gösteren kod */}
            {activeTab === 'menu' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>Restoran Menü Yönetimi — Gruplu Sistem</h2>

                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px' }}>
                  Ürünleri Ana Yemekler, İçecekler, Tatlılar gibi gruplara ayırabilirsiniz. Ürünler departman, KDV ve mutfak ayarını bağlı olduğu gruptan alır.
                </p>

                {/* ödeme sonrası fiş yazdırma davranışını menü ve ayarlar ekranında seçen kod */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '12px',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '900', color: '#1e293b', fontSize: '14px' }}>
                      🖨️ Fiş Yazdırma Ayarı
                    </div>
                    <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', fontWeight: '700' }}>
                      Ödeme tamamlandığında sistemin fişi nasıl yöneteceğini buradan seçebilirsiniz.
                    </div>
                  </div>

                  <select
                    value={fisYazdirmaModu}
                    onChange={e => setFisYazdirmaModu(e.target.value)}
                    style={{
                      ...styles.input,
                      minWidth: '220px',
                      fontWeight: '800',
                    }}
                  >
                    <option value="sor">Ödeme sonrası sor</option>
                    <option value="yazdir">Otomatik yazdır</option>
                    <option value="yazdirma">Yazdırma</option>
                  </select>
                </div>

                {/* yeni menü grubu ekleme alanı */}
                <form
                  onSubmit={menuGrubuEkle}
                  style={{
                    ...styles.inlineForm,
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '12px',
                    marginBottom: '16px',
                  }}
                >
                  <input
                    type="text"
                    placeholder="Grup adı: Ana Yemekler"
                    value={yeniMenuGrupAdi}
                    onChange={e => setYeniMenuGrupAdi(e.target.value)}
                    style={styles.input}
                  />

                  <input
                    type="text"
                    placeholder="Departman: Mutfak / Bar"
                    value={yeniMenuGrupDepartmani}
                    onChange={e => setYeniMenuGrupDepartmani(e.target.value)}
                    style={styles.input}
                  />

                  <input
                    type="number"
                    placeholder="KDV %"
                    value={yeniMenuGrupKdvOrani}
                    onChange={e => setYeniMenuGrupKdvOrani(e.target.value)}
                    style={{ ...styles.input, width: '110px', minWidth: '110px' }}
                  />

                  <select
                    value={yeniMenuGrupMutfagaGitsin ? 'true' : 'false'}
                    onChange={e => setYeniMenuGrupMutfagaGitsin(e.target.value === 'true')}
                    style={styles.input}
                  >
                    <option value="true">👨‍🍳 Grup mutfağa gider</option>
                    <option value="false">🚫 Grup mutfağa gitmez</option>
                  </select>

                  <button type="submit" style={styles.btnOrange}>
                    + Grup Ekle
                  </button>
                </form>

                {/* menü gruplarını sekme olarak gösteren kod */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {aktifMenuGruplari.map(grup => (
                    <button
                      key={grup.ad}
                      type="button"
                      onClick={() => setAktifMenuGrubu(grup.ad)}
                      style={{
                        border: 'none',
                        backgroundColor: (aktifGrup.ad || aktifMenuGrubu) === grup.ad ? '#ff6b35' : '#e2e8f0',
                        color: (aktifGrup.ad || aktifMenuGrubu) === grup.ad ? '#fff' : '#334155',
                        padding: '10px 13px',
                        borderRadius: '999px',
                        cursor: 'pointer',
                        fontWeight: '900',
                        fontSize: '12px',
                      }}
                    >
                      {grup.ad}
                    </button>
                  ))}
                </div>

                {/* seçili grubun ayarlarını gösteren ve düzenleyen kod */}
                <div
                  style={{
                    backgroundColor: '#fff7ed',
                    border: '1px solid #fed7aa',
                    borderRadius: '14px',
                    padding: '12px',
                    marginBottom: '16px',
                  }}
                >
                  {String(duzenlenenMenuGrupId) === String(aktifGrup.id) ? (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Grup adı"
                        value={duzenlenenMenuGrupAdi}
                        onChange={e => setDuzenlenenMenuGrupAdi(e.target.value)}
                        style={styles.input}
                      />

                      <input
                        type="text"
                        placeholder="Departman"
                        value={duzenlenenMenuGrupDepartmani}
                        onChange={e => setDuzenlenenMenuGrupDepartmani(e.target.value)}
                        style={styles.input}
                      />

                      <input
                        type="number"
                        placeholder="KDV %"
                        value={duzenlenenMenuGrupKdvOrani}
                        onChange={e => setDuzenlenenMenuGrupKdvOrani(e.target.value)}
                        style={{ ...styles.input, width: '110px', minWidth: '110px' }}
                      />

                      <select
                        value={duzenlenenMenuGrupMutfagaGitsin ? 'true' : 'false'}
                        onChange={e => setDuzenlenenMenuGrupMutfagaGitsin(e.target.value === 'true')}
                        style={styles.input}
                      >
                        <option value="true">👨‍🍳 Mutfağa gider</option>
                        <option value="false">🚫 Mutfağa gitmez</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => menuGrubuGuncelle(aktifGrup)}
                        style={{
                          border: 'none',
                          backgroundColor: '#10b981',
                          color: '#fff',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '900',
                          fontSize: '12px',
                        }}
                      >
                        Grubu Kaydet
                      </button>

                      <button
                        type="button"
                        onClick={menuGrubuDuzenlemeyiIptalEt}
                        style={{
                          border: 'none',
                          backgroundColor: '#94a3b8',
                          color: '#fff',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '900',
                          fontSize: '12px',
                        }}
                      >
                        Vazgeç
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.7' }}>
                        <strong style={{ color: '#1e293b' }}>{aktifGrup.ad}</strong>
                        <span> / Departman: <strong>{aktifGrup.departman || 'Mutfak'}</strong></span>
                        <span> / KDV: <strong>%{aktifGrup.kdvOrani || 10}</strong></span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <select
                          value={aktifGrup.mutfagaGitsin !== false ? 'true' : 'false'}
                          onChange={e => menuGrubuMutfakDurumunuAyarla(aktifGrup, e.target.value === 'true')}
                          style={{
                            border: '1px solid #cbd5e1',
                            backgroundColor: aktifGrup.mutfagaGitsin !== false ? '#dcfce7' : '#f1f5f9',
                            color: aktifGrup.mutfagaGitsin !== false ? '#15803d' : '#475569',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '800',
                            fontSize: '12px',
                            outline: 'none',
                          }}
                        >
                          <option value="true">👨‍🍳 Bu grup mutfağa gider</option>
                          <option value="false">🚫 Bu grup mutfağa gitmez</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => menuGrubuDuzenlemeyiBaslat(aktifGrup)}
                          style={{
                            border: 'none',
                            backgroundColor: '#1e293b',
                            color: '#fff',
                            padding: '9px 11px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '900',
                            fontSize: '12px',
                          }}
                        >
                          Grubu Düzenle
                        </button>

                        <button
                          type="button"
                          onClick={() => menuGrubuSil(aktifGrup)}
                          style={{
                            border: 'none',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            padding: '9px 11px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '900',
                            fontSize: '12px',
                          }}
                        >
                          Grubu Sil
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* aktif gruba ürün ekleme alanı */}
                <form onSubmit={urunEkle} style={styles.inlineForm}>
                  <input
                    type="text"
                    placeholder={`${aktifGrup.ad || 'Grup'} için ürün adı`}
                    value={yeniUrunAdi}
                    onChange={e => setYeniUrunAdi(e.target.value)}
                    style={styles.input}
                  />

                  <input
                    type="number"
                    placeholder="Fiyat (TL)"
                    value={yeniUrunFiyati}
                    onChange={e => setYeniUrunFiyati(e.target.value)}
                    style={styles.input}
                  />

                  <input
                    type="number"
                    placeholder="Maliyet (TL)"
                    value={yeniUrunMaliyeti}
                    onChange={e => setYeniUrunMaliyeti(e.target.value)}
                    style={styles.input}
                  />

                  <button type="submit" style={styles.btnOrange}>
                    {aktifGrup.ad || 'Gruba'} Ürün Ekle
                  </button>
                </form>

                <h3 style={{ fontSize: '15px', color: '#1e293b', marginTop: '20px' }}>
                  {aktifGrup.ad || 'Genel'} Ürünleri
                </h3>

                {aktifMenuGrubuUrunleri.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>
                    Bu grupta henüz ürün yok.
                  </p>
                ) : (
                  aktifMenuGrubuUrunleri.map(u => (
                    <div
                      key={u.id}
                      style={{
                        ...styles.dataRow,
                        alignItems: 'center',
                        gap: '10px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {duzenlenenUrunId === u.id ? (
                        <>
                          <input
                            type="text"
                            value={duzenlenenUrunAdi}
                            onChange={e => setDuzenlenenUrunAdi(e.target.value)}
                            style={{ ...styles.input, minWidth: '160px', flex: 1 }}
                          />

                          <input
                            type="number"
                            value={duzenlenenUrunFiyati}
                            onChange={e => setDuzenlenenUrunFiyati(e.target.value)}
                            style={{ ...styles.input, minWidth: '120px', width: '140px' }}
                          />

                          <input
                            type="number"
                            value={duzenlenenUrunMaliyeti}
                            onChange={e => setDuzenlenenUrunMaliyeti(e.target.value)}
                            placeholder="Maliyet"
                            style={{ ...styles.input, minWidth: '120px', width: '140px' }}
                          />

                          <button
                            type="button"
                            onClick={() => urunGuncelle(u.id)}
                            style={{
                              border: 'none',
                              backgroundColor: '#10b981',
                              color: '#fff',
                              padding: '9px 12px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: '800',
                              fontSize: '12px',
                            }}
                          >
                            Kaydet
                          </button>

                          <button
                            type="button"
                            onClick={urunDuzenlemeyiIptalEt}
                            style={{
                              border: 'none',
                              backgroundColor: '#94a3b8',
                              color: '#fff',
                              padding: '9px 12px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: '800',
                              fontSize: '12px',
                            }}
                          >
                            Vazgeç
                          </button>
                        </>
                      ) : (
                        <>
                          <div style={{ flex: 1, minWidth: '220px' }}>
                            <div style={{ fontWeight: '900', color: '#1e293b' }}>🍽️ {u.ad}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                              Grup: <strong>{u.menuGrubu || u.kategori || 'Genel'}</strong> / Departman: <strong>{u.departman || 'Mutfak'}</strong> / KDV: <strong>%{u.kdvOrani || 10}</strong>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={styles.priceTag}>{u.fiyat} TL</span><span style={{ color: '#64748b', fontSize: '12px', fontWeight: '800' }}>Maliyet: {u.maliyet || 0} TL</span>

                            <span
                              style={{
                                backgroundColor: u.mutfagaGitsin !== false ? '#dcfce7' : '#f1f5f9',
                                color: u.mutfagaGitsin !== false ? '#15803d' : '#475569',
                                padding: '7px 9px',
                                borderRadius: '999px',
                                fontSize: '11px',
                                fontWeight: '900',
                              }}
                            >
                              {u.mutfagaGitsin !== false ? '👨‍🍳 Mutfağa Gider' : '🚫 Mutfağa Gitmez'}
                            </span>

                            {/* ürünü başka gruba taşıyan kod */}
                            <select
                              value={u.menuGrubu || u.kategori || 'Genel'}
                              onChange={e => urunuBaskaGrubaTasi(u, e.target.value)}
                              style={{
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#fff',
                                color: '#334155',
                                padding: '7px 9px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '800',
                                fontSize: '12px',
                                outline: 'none',
                              }}
                            >
                              {aktifMenuGruplari.map(grupSecenek => (
                                <option key={grupSecenek.ad} value={grupSecenek.ad}>
                                  {grupSecenek.ad} grubuna taşı
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => urunDuzenlemeyiBaslat(u)}
                              style={{
                                border: 'none',
                                backgroundColor: '#1e293b',
                                color: '#fff',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '800',
                                fontSize: '12px',
                              }}
                            >
                              Düzenle
                            </button>

                            <button
                              type="button"
                              onClick={() => urunSil(u.id)}
                              style={{
                                border: 'none',
                                backgroundColor: '#ef4444',
                                color: '#fff',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '800',
                                fontSize: '12px',
                              }}
                            >
                              Sil
                            </button>

                            <button
                              type="button"
                              onClick={() => urunFavoriDegistir(u)}
                              style={{
                                border: 'none',
                                backgroundColor: u.favori ? '#f59e0b' : '#64748b',
                                color: '#fff',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '800',
                                fontSize: '12px',
                              }}
                            >
                              {u.favori ? '⭐ Favori' : '☆ Favori'}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setNotAyarlananUrunId(u.id);
                                setYeniMenuNotuAdi('');
                                setYeniMenuNotuFiyati('');
                              }}
                              style={{
                                border: 'none',
                                backgroundColor: '#f59e0b',
                                color: '#fff',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '800',
                                fontSize: '12px',
                              }}
                            >
                              Notlar
                            </button>
                          </div>

                          {notAyarlananUrunId === u.id && (
                            <div
                              style={{
                                width: '100%',
                                marginTop: '10px',
                                paddingTop: '10px',
                                borderTop: '1px solid #e2e8f0',
                              }}
                            >
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                <input
                                  type="text"
                                  placeholder="Örn: Acılı, Acısız, Bol kaşar"
                                  value={yeniMenuNotuAdi}
                                  onChange={e => setYeniMenuNotuAdi(e.target.value)}
                                  style={{
                                    ...styles.input,
                                    minWidth: '180px',
                                    flex: 1,
                                  }}
                                />

                                <input
                                  type="number"
                                  placeholder="+ TL"
                                  value={yeniMenuNotuFiyati}
                                  onChange={e => setYeniMenuNotuFiyati(e.target.value)}
                                  style={{
                                    ...styles.input,
                                    width: '110px',
                                    minWidth: '110px',
                                  }}
                                />

                                <button
                                  type="button"
                                  onClick={() => menuNotuEkle(u)}
                                  style={{
                                    border: 'none',
                                    backgroundColor: '#10b981',
                                    color: '#fff',
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '800',
                                    fontSize: '12px',
                                  }}
                                >
                                  Not Ekle
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setNotAyarlananUrunId(null);
                                    setYeniMenuNotuAdi('');
                                    setYeniMenuNotuFiyati('');
                                  }}
                                  style={{
                                    border: 'none',
                                    backgroundColor: '#94a3b8',
                                    color: '#fff',
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '800',
                                    fontSize: '12px',
                                  }}
                                >
                                  Kapat
                                </button>
                              </div>

                              {(!u.menuNotlari || u.menuNotlari.length === 0) ? (
                                <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                                  Bu ürüne tanımlı hazır not yok.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  {u.menuNotlari.map(n => (
                                    <span
                                      key={n.id}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        backgroundColor: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '999px',
                                        padding: '6px 9px',
                                        fontSize: '12px',
                                        color: '#334155',
                                        fontWeight: '700',
                                      }}
                                    >
                                      {n.ad} {Number(n.fiyat || 0) > 0 ? `+${n.fiyat} TL` : ''}

                                      <button
                                        type="button"
                                        onClick={() => menuNotuSil(u, n.id)}
                                        style={{
                                          border: 'none',
                                          backgroundColor: 'transparent',
                                          color: '#ef4444',
                                          cursor: 'pointer',
                                          fontWeight: '900',
                                        }}
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* personel oluşturma ve listeleme ekranını gösteren kod */}
            {activeTab === 'garsonlar' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>👥 Personel Listesi</h2>

                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px' }}>
                  Garson, kurye, müdür, mutfak ve kasiyer personellerinizi buradan ekleyebilirsiniz. E-posta ve şifre girilen personel sisteme giriş yapabilir; göreceği ekranları işletme sahibi belirler.
                </p>

                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '12px',
                    marginBottom: '14px',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: '800',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>Personel Limiti: {aktifPersoneller.length} / {Number(user?.kullaniciLimiti || 3)}</span>
                  <span style={{ color: '#64748b' }}>Bu sayı süper admin tarafından lisans bölümünden belirlenir.</span>
                </div>

                <form onSubmit={personelEkle} style={styles.inlineForm}>
                  <input
                    type="text"
                    placeholder="Personel Adı"
                    value={yeniGarsonAdi}
                    onChange={e => setYeniGarsonAdi(e.target.value)}
                    style={styles.input}
                  />

                  <select
                    value={yeniPersonelGorevi}
                    onChange={e => {
                      setYeniPersonelGorevi(e.target.value);
                      setYeniPersonelYetkileri(goreveGoreVarsayilanYetkiler(e.target.value));
                    }}
                    style={styles.input}
                  >
                    <option value="Garson">Garson</option>
                    <option value="Kurye">Kurye</option>
                    <option value="Müdür">Müdür</option>
                    <option value="Mutfak">Mutfak</option>
                    <option value="Kasiyer">Kasiyer</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Telefon"
                    value={yeniPersonelTelefon}
                    onChange={e => setYeniPersonelTelefon(e.target.value)}
                    style={styles.input}
                  />

                  <input
                    type="email"
                    placeholder="E-posta (Garson girişi için)"
                    value={yeniGarsonEmail}
                    onChange={e => setYeniGarsonEmail(e.target.value)}
                    style={styles.input}
                  />

                  <input
                    type="password"
                    placeholder="Şifre (giriş hesabı için)"
                    value={yeniGarsonSifre}
                    onChange={e => setYeniGarsonSifre(e.target.value)}
                    style={styles.input}
                  />

                  <div
                    style={{
                      width: '100%',
                      backgroundColor: '#fff',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '12px',
                      padding: '10px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#475569', fontWeight: '900', marginBottom: '8px' }}>
                      Bu personelin göreceği ekranlar
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {personelSekmeSecenekleri.map(secenek => (
                        <label
                          key={secenek.key}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: yeniPersonelYetkileri.includes(secenek.key) ? '#eef2ff' : '#f8fafc',
                            border: yeniPersonelYetkileri.includes(secenek.key) ? '1px solid #6366f1' : '1px solid #e2e8f0',
                            color: yeniPersonelYetkileri.includes(secenek.key) ? '#3730a3' : '#475569',
                            padding: '7px 9px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: '800',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={yeniPersonelYetkileri.includes(secenek.key)}
                            onChange={e => yeniPersonelYetkiDegistir(secenek.key, e.target.checked)}
                          />
                          {secenek.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <button type="submit" style={styles.btnOrange}>
                    Personel Ekle
                  </button>
                </form>

                <h3 style={{ fontSize: '15px', color: '#1e293b', marginTop: '20px' }}>
                  Kayıtlı Personeller
                </h3>

                {aktifPersoneller.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>
                    Henüz personel oluşturulmamış.
                  </p>
                ) : (
                  aktifPersoneller.map(p => (
                    <div
                      key={p.id}
                      style={{
                        ...styles.dataRow,
                        alignItems: 'flex-start',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ minWidth: '220px', flex: 1 }}>
                        <div style={{ fontWeight: '900', color: '#1e293b' }}>👤 {p.ad}</div>
                        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '3px' }}>
                          {p.telefon || '-'} {p.email ? ` / ${p.email}` : ''}
                        </div>
                        <div style={{ color: '#475569', fontSize: '12px', marginTop: '6px', fontWeight: '800' }}>
                          Yetkiler: {yetkiEtiketleriYaz(p.tabYetkileri)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                        <span
                          style={{
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            padding: '5px 10px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: '900',
                          }}
                        >
                          {p.gorev || 'Personel'}
                        </span>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '620px' }}>
                          {personelSekmeSecenekleri.map(secenek => (
                            <label
                              key={`${p.id}-${secenek.key}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                backgroundColor: yetkiListesiniHazirla(p.tabYetkileri, p.gorev).includes(secenek.key) ? '#eef2ff' : '#fff',
                                border: yetkiListesiniHazirla(p.tabYetkileri, p.gorev).includes(secenek.key) ? '1px solid #6366f1' : '1px solid #e2e8f0',
                                color: yetkiListesiniHazirla(p.tabYetkileri, p.gorev).includes(secenek.key) ? '#3730a3' : '#64748b',
                                padding: '6px 8px',
                                borderRadius: '999px',
                                fontSize: '11px',
                                fontWeight: '800',
                                cursor: 'pointer',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={yetkiListesiniHazirla(p.tabYetkileri, p.gorev).includes(secenek.key)}
                                onChange={e => personelYetkisiniDegistir(p, secenek.key, e.target.checked)}
                              />
                              {secenek.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* satış raporları ekranını gösteren kod */}
            {activeTab === 'raporlar' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <h2 style={styles.pageTitle}>📊 İşletme Performans Raporları</h2>
                    <div style={{ color: '#64748b', fontSize: '13px', marginTop: '6px', fontWeight: '700' }}>
                      {raporBasligi()}
                    </div>
                  </div>
                </div>

                <div style={{ ...styles.panelCard, marginBottom: '18px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'end' }}>
                    <div style={styles.filterButtonGroup}>
                      <button
                        type="button"
                        onClick={() => setReportType('gunluk')}
                        style={reportType === 'gunluk' ? styles.filterBtnActive : styles.filterBtn}
                      >
                        Günlük
                      </button>

                      <button
                        type="button"
                        onClick={() => setReportType('aylik')}
                        style={reportType === 'aylik' ? styles.filterBtnActive : styles.filterBtn}
                      >
                        Aylık
                      </button>

                      <button
                        type="button"
                        onClick={() => setReportType('aralik')}
                        style={reportType === 'aralik' ? styles.filterBtnActive : styles.filterBtn}
                      >
                        Tarih Aralığı
                      </button>
                    </div>

                    {(reportType === 'gunluk' || reportType === 'aylik') && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>
                          {reportType === 'gunluk' ? 'Rapor Tarihi' : 'Ay seçimi'}
                        </label>
                        <input
                          type="date"
                          value={raporTarihi}
                          onChange={e => setRaporTarihi(e.target.value)}
                          style={styles.input}
                        />
                      </div>
                    )}

                    {reportType === 'aralik' && (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>Başlangıç</label>
                          <input
                            type="date"
                            value={raporBaslangicTarihi}
                            onChange={e => setRaporBaslangicTarihi(e.target.value)}
                            style={styles.input}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>Bitiş</label>
                          <input
                            type="date"
                            value={raporBitisTarihi}
                            onChange={e => setRaporBitisTarihi(e.target.value)}
                            style={styles.input}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div style={styles.statsGrid}>
                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>Toplam Net Ciro</div>
                    <div style={{ ...styles.statsValue, color: '#10b981' }}>{raporData.toplamCiro} TL</div>
                  </div>

                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>Nakit Tahsilat</div>
                    <div style={{ ...styles.statsValue, color: '#10b981' }}>{raporData.nakitToplam} TL</div>
                  </div>

                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>Kredi Kartı Tahsilat</div>
                    <div style={{ ...styles.statsValue, color: '#2563eb' }}>{raporData.kartToplam} TL</div>
                  </div>

                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>Açık Masalardaki Bekleyen Tutar</div>
                    <div style={styles.statsValue}>{tumRestoranMasalari.reduce((acc, curr) => acc + Number(curr.tutar || 0), 0)} TL</div>
                  </div>

                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>Toplam İndirim</div>
                    <div style={{ ...styles.statsValue, color: '#ef4444' }}>{raporData.toplamIndirim} TL</div>
                  </div>

                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>Giderler</div>
                    <div style={{ ...styles.statsValue, color: '#ef4444' }}>{raporData.giderToplam || 0} TL</div>
                  </div>

                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>İade / İkram / Zayi</div>
                    <div style={{ ...styles.statsValue, color: '#f59e0b' }}>{raporData.iadeIkramZayiToplam || 0} TL</div>
                  </div>
                </div>

                <div style={{ ...styles.panelCard, marginTop: '25px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setRaporSekmesi('satis')}
                      style={raporSekmesi === 'satis' ? styles.filterBtnActive : styles.filterBtn}
                    >
                      📦 Ürün Satışları
                    </button>

                    <button
                      type="button"
                      onClick={() => setRaporSekmesi('kapali_adisyonlar')}
                      style={raporSekmesi === 'kapali_adisyonlar' ? styles.filterBtnActive : styles.filterBtn}
                    >
                      🧾 Kapalı Adisyonlar
                    </button>

                    <button
                      type="button"
                      onClick={() => setRaporSekmesi('paket_servis')}
                      style={raporSekmesi === 'paket_servis' ? styles.filterBtnActive : styles.filterBtn}
                    >
                      🛵 Paket Servis Raporu
                    </button>

                    <button
                      type="button"
                      onClick={() => setRaporSekmesi('garson')}
                      style={raporSekmesi === 'garson' ? styles.filterBtnActive : styles.filterBtn}
                    >
                      👤 Garson Performansı
                    </button>
                  </div>
                </div>

                {raporSekmesi === 'satis' && (
                  <div style={{ ...styles.panelCard, marginTop: '25px' }}>
                    <h3 style={{ fontSize: '16px', margin: '0 0 15px 0', color: '#1e293b' }}>📦 Ürün Satış Analizleri</h3>

                    {raporData.liste.length === 0 ? (
                      <div style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '30px' }}>
                        Bu periyotta henüz kapatılmış bir adisyon satışı bulunmuyor.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                              <th style={styles.th}>Ürün Adı</th>
                              <th style={styles.th}>Not</th>
                              <th style={styles.th}>Grup / Departman</th>
                              <th style={styles.th}>Birim Fiyatı</th>
                              <th style={styles.th}>Toplam Satış Adeti</th>
                              <th style={styles.th}>Toplam Ciro</th>
                              <th style={styles.th}>İndirim</th>
                            </tr>
                          </thead>
                          <tbody>
                            {raporData.liste.map((item, idx) => (
                              <tr key={idx} style={styles.tr}>
                                <td style={{ ...styles.td, fontWeight: 'bold' }}>🍔 {item.ad}</td>
                                <td style={styles.td}>{item.not || '-'}</td>
                                <td style={styles.td}>{item.menuGrubu || 'Genel'} / {item.departman || '-'}</td>
                                <td style={styles.td}>{item.fiyat} TL</td>
                                <td style={{ ...styles.td, color: '#ff6b35', fontWeight: 'bold' }}>{item.adet} Adet</td>
                                <td style={{ ...styles.td, fontWeight: 'bold' }}>{item.ciro} TL</td>
                                <td style={{ ...styles.td, color: '#ef4444', fontWeight: 'bold' }}>{Number(item.indirimTutari || 0)} TL</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}


                {raporSekmesi === 'paket_servis' && (
                  <div style={{ ...styles.panelCard, marginTop: '25px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '15px' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', margin: 0, color: '#1e293b' }}>🛵 Paket Servis Raporu</h3>
                        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '5px', fontWeight: '700' }}>
                          Seçili dönemde kapatılan paket servisleri ve ürün detayları. Gün sonu kapatılan paketler bu listeden kalkar, Kasa bölümündeki Z raporunda saklanır.
                        </div>
                      </div>
                      <div style={{ ...styles.priceTag, fontSize: '18px' }}>Toplam: {raporData.paketToplam || 0} TL</div>
                    </div>

                    {(!raporData.paketRaporu || raporData.paketRaporu.length === 0) ? (
                      <div style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '30px' }}>
                        Bu periyotta kapatılmış paket servis satışı bulunmuyor.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {raporData.paketRaporu.map(paket => (
                          <details
                            key={paket.id}
                            style={{
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '12px',
                              padding: '12px',
                            }}
                          >
                            <summary
                              style={{
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '12px',
                                flexWrap: 'wrap',
                                fontWeight: '900',
                                color: '#1e293b',
                              }}
                            >
                              <span>🛵 {paket.musteriAdi || 'Paket Servis'} / {paket.tarih} / {paket.odemeTipi}</span>
                              <span style={{ color: '#ff6b35' }}>{paket.toplam} TL</span>
                            </summary>

                            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '800' }}>
                                Kurye/Personel: {paket.kuryeAdi || '-'} / Ürün Adedi: {paket.adet}
                              </div>

                              {paket.urunler.map((urun, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    gap: '10px',
                                    fontSize: '13px',
                                    color: '#334155',
                                    backgroundColor: '#fff',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid #eef2f7',
                                  }}
                                >
                                  <span>
                                    {urun.adet}x {urun.ad}
                                    {urun.not ? <span style={{ color: '#64748b' }}> / Not: {urun.not}</span> : null}
                                  </span>
                                  <strong>{urun.toplam} TL</strong>
                                </div>
                              ))}
                            </div>
                          </details>
                        ))}
                      </div>
                    )}
                  </div>
                )}


                {raporSekmesi === 'garson' && (
                  <div style={{ ...styles.panelCard, marginTop: '25px' }}>
                    <h3 style={{ fontSize: '16px', margin: '0 0 15px 0', color: '#1e293b' }}>👤 Garson Performansı</h3>
                    {(!raporData.garsonOzetleri || raporData.garsonOzetleri.length === 0) ? (
                      <div style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '30px' }}>
                        Bu periyotta garson performansı verisi yok.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                              <th style={styles.th}>Garson</th>
                              <th style={styles.th}>Adisyon</th>
                              <th style={styles.th}>Ürün Adedi</th>
                              <th style={styles.th}>Ciro</th>
                            </tr>
                          </thead>
                          <tbody>
                            {raporData.garsonOzetleri.map((g, idx) => (
                              <tr key={idx} style={styles.tr}>
                                <td style={{ ...styles.td, fontWeight: 'bold' }}>👤 {g.garsonAdi}</td>
                                <td style={styles.td}>{g.adisyonSayisi}</td>
                                <td style={styles.td}>{g.urunAdedi}</td>
                                <td style={{ ...styles.td, fontWeight: 'bold', color: '#10b981' }}>{g.ciro} TL</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {raporSekmesi === 'kapali_adisyonlar' && (
                  <div style={{ ...styles.panelCard, marginTop: '25px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                        marginBottom: '15px',
                      }}
                    >
                      <div>
                        <h3 style={{ fontSize: '16px', margin: 0, color: '#1e293b' }}>
                          🧾 Kapalı Adisyon Geçmişi
                        </h3>
                        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '5px', fontWeight: '700' }}>
                          Seçili rapor dönemindeki kapatılmış adisyonlar ve indirim detayları.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={gunSonuKapatVeKasayaAktar}
                        style={{
                          border: 'none',
                          backgroundColor: '#1e293b',
                          color: '#fff',
                          padding: '10px 13px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontWeight: '900',
                          fontSize: '12px',
                        }}
                      >
                        🖨️ Gün Sonu Raporu Yazdır
                      </button>
                    </div>

                    {adisyonGecmisiData.length === 0 ? (
                      <div style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '25px' }}>
                        Bu periyotta kapatılmış adisyon bulunmuyor.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {adisyonGecmisiData.map(adisyon => (
                          <details
                            key={adisyon.id}
                            style={{
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '12px',
                              padding: '12px',
                            }}
                          >
                            <summary
                              style={{
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '12px',
                                flexWrap: 'wrap',
                                fontWeight: '800',
                                color: '#1e293b',
                              }}
                            >
                              <span>
                                🧾 {adisyon.siparisTipi === 'Paket Servis' ? 'Paket Servis' : (adisyon.masaAdi || `Masa ${adisyon.masaId || '-'}`)} {adisyon.musteriAdi ? ` / ${adisyon.musteriAdi}` : ''} / {adisyon.tarih}
                              </span>

                              <span style={{ color: '#ff6b35' }}>
                                {adisyon.toplam} TL
                              </span>
                            </summary>

                            <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                                <strong>Açılış:</strong> {saatYaz(adisyon.adisyonAcilisSaati)} {' '} / {' '}
                                <strong>Kapanış:</strong> {saatYaz(adisyon.adisyonKapanisSaati)}
                              </div>

                              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                                <strong>Ödeme:</strong> {odemeOzetYazisi(adisyon.odemeler)}
                              </div>

                              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '10px' }}>
                                <strong>Toplam İndirim:</strong>{' '}
                                <span style={{ color: '#ef4444', fontWeight: '900' }}>
                                  {Number(adisyon.toplamIndirim || 0)} TL
                                </span>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {adisyon.urunler.map((urun, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      gap: '10px',
                                      fontSize: '13px',
                                      color: '#334155',
                                      backgroundColor: '#fff',
                                      padding: '8px 10px',
                                      borderRadius: '8px',
                                      border: '1px solid #eef2f7',
                                    }}
                                  >
                                    <span>
                                      {urun.adet}x {urun.ad}
                                      {urun.not ? <span style={{ color: '#64748b' }}> / Not: {urun.not}</span> : null}
                                      {Number(urun.indirimTutari || 0) > 0 ? (
                                        <span style={{ color: '#ef4444', fontWeight: '800' }}>
                                          {' '} / İndirim: {Number(urun.indirimTutari || 0) * Number(urun.adet || 1)} TL
                                        </span>
                                      ) : null}
                                    </span>

                                    <strong>
                                      {urun.toplam} TL
                                    </strong>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </details>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* süper admin müşteri yönetimi ekranını gösteren kod */}
            {activeTab === 'super_admin' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>👑 Müşteri Yönetimi</h2>

                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={styles.th}>İşletme Bilgileri</th>
                        <th style={styles.th}>Kullanıcı Tipi</th>
                        <th style={styles.th}>Lisans Durumu</th>
                        <th style={styles.th}>Kullanıcı Limiti</th>
                        <th style={{ ...styles.th, textAlign: 'right', paddingRight: '15px' }}>Yönetim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {restoranlar.map(r => (
                        <tr key={r.id} style={styles.tr}>
                          <td style={styles.td}>
                            <div style={{ fontWeight: 'bold', color: '#1e293b' }}>💼 {r.ad}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{r.email}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                              Paket: <strong>{r.paketAdi || 'Starter'}</strong> / Aylık: <strong>{r.aylikUcret || 0} TL</strong>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                              Son ödeme: <strong>{r.sonOdemeTarihi || '-'}</strong>
                            </div>
                          </td>
                          <td style={styles.td}>{r.rol === 'owner' ? 'Yönetici / Sahip' : 'Garson Terminali'}</td>
                          <td style={styles.td}>
                            <span style={r.durum === 'Aktif' ? styles.badgeActive : styles.badgePending}>{r.durum}</span>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                              Lisans: <strong>{r.lisansDurumu || r.durum}</strong>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <input
                              type="number"
                              min="0"
                              defaultValue={r.kullaniciLimiti || 3}
                              onBlur={e => restoranKullaniciLimitiGuncelle(r, e.target.value)}
                              style={{
                                ...styles.input,
                                width: '90px',
                                minWidth: '90px',
                                padding: '8px',
                                fontWeight: '900',
                              }}
                            />
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                              0 = sınırsız
                            </div>
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>
                            {r.durum !== 'Aktif' ? (
                              <button onClick={() => restoranDurumDegistir(r.id, 'Aktif')} style={styles.actionBtnApprove}>
                                ✔️ Aktif Et
                              </button>
                            ) : (
                              <button onClick={() => restoranDurumDegistir(r.id, 'Donduruldu')} style={styles.actionBtnBlock}>
                                🛑 Kapat
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// uygulamanın tüm görsel stil ayarları
const styles = {
  appViewport: {
    width: '100%',
    minHeight: '100vh',
    margin: 0,
    padding: 0,
    backgroundColor: '#f8fafc',
    fontFamily: 'Inter, Arial, sans-serif',
    overflowX: 'hidden',
  },

  landingViewport: {
    width: '100%',
    minHeight: '100vh',
    margin: 0,
    padding: 0,
    backgroundColor: '#ffffff',
  },

  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 4%',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: 'rgba(255,255,255,0.95)',
    position: 'sticky',
    top: 0,
    zIndex: 20,
    backdropFilter: 'blur(8px)',
    gap: '16px',
    flexWrap: 'wrap',
  },

  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '24px',
    fontWeight: '800',
  },

  orangeDot: {
    color: '#ff6b35',
  },

  landingNavLinks: {
    display: 'flex',
    gap: '28px',
    flexWrap: 'wrap',
  },

  navLinkItem: {
    textDecoration: 'none',
    color: '#475569',
    fontSize: '14px',
    fontWeight: '600',
  },

  navbarLoginBtn: {
    border: '1px solid #cbd5e1',
    padding: '10px 18px',
    borderRadius: '10px',
    backgroundColor: '#fff',
    color: '#1e293b',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '14px',
  },

  navbarRegisterBtn: {
    border: 'none',
    padding: '10px 18px',
    borderRadius: '10px',
    backgroundColor: '#ff6b35',
    color: '#fff',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '14px',
    boxShadow: '0 12px 30px -12px rgba(255,107,53,0.55)',
  },

  heroSection: {
    display: 'grid',
    gridTemplateColumns: '1.15fr 0.95fr',
    alignItems: 'center',
    gap: '48px',
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '72px 4% 64px',
  },

  heroContent: {
    minWidth: 0,
  },

  heroBadge: {
    display: 'inline-block',
    backgroundColor: '#fff7ed',
    color: '#ea580c',
    padding: '8px 14px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: '800',
    border: '1px solid #fed7aa',
  },

  heroTitle: {
    fontSize: 'clamp(34px, 5vw, 60px)',
    fontWeight: '900',
    color: '#0f172a',
    margin: '20px 0 14px',
    lineHeight: '1.08',
    letterSpacing: '-0.02em',
    maxWidth: '820px',
  },

  heroSubtitle: {
    fontSize: '17px',
    color: '#475569',
    lineHeight: '1.75',
    marginBottom: '28px',
    maxWidth: '680px',
  },

  heroActionGroup: {
    display: 'flex',
    gap: '14px',
    flexWrap: 'wrap',
  },

  heroMainBtn: {
    border: 'none',
    backgroundColor: '#1e293b',
    color: '#fff',
    padding: '14px 24px',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 18px 45px -18px rgba(15,23,42,0.55)',
  },

  heroSecondaryBtn: {
    border: '1px solid #cbd5e1',
    backgroundColor: '#fff',
    color: '#475569',
    padding: '14px 24px',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '800',
    cursor: 'pointer',
  },

  heroStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '14px',
    marginTop: '28px',
    maxWidth: '760px',
  },

  heroStatCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '18px',
    boxShadow: '0 20px 45px -28px rgba(15,23,42,0.18)',
  },

  heroStatValue: {
    fontSize: '22px',
    fontWeight: '900',
    color: '#0f172a',
  },

  heroStatLabel: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '6px',
    fontWeight: '600',
  },

  heroVisual: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 0,
  },

  mockupCard: {
    width: '100%',
    maxWidth: '520px',
    backgroundColor: '#fff',
    borderRadius: '22px',
    boxShadow: '0 40px 90px -40px rgba(15,23,42,0.35)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },

  mockupHeader: {
    backgroundColor: '#f8fafc',
    padding: '14px 16px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '12px',
    color: '#94a3b8',
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    fontWeight: '700',
  },

  mockupTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
    gap: '10px',
  },

  mockupBadge: {
    background: '#eff6ff',
    color: '#2563eb',
    padding: '8px 12px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '800',
  },

  mockupMuted: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '700',
  },

  mockupTableGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '12px',
    marginBottom: '18px',
  },

  mockupTableItem: {
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    color: '#1e293b',
    fontSize: '14px',
  },

  mockupReceipt: {
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '16px',
    background: '#fcfcfd',
  },

  mockupReceiptTitle: {
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: '12px',
  },

  mockupReceiptRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#475569',
    padding: '8px 0',
    borderBottom: '1px solid #eef2f7',
  },

  mockupReceiptTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '12px',
    fontWeight: '900',
    color: '#0f172a',
  },

  featuresSection: {
    padding: '88px 4%',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
  },

  sectionHeadWrap: {
    maxWidth: '820px',
    margin: '0 auto 36px',
    textAlign: 'center',
  },

  sectionBadge: {
    display: 'inline-block',
    padding: '7px 12px',
    borderRadius: '999px',
    background: '#fff7ed',
    color: '#ea580c',
    fontWeight: '800',
    fontSize: '12px',
    border: '1px solid #fed7aa',
    marginBottom: '12px',
  },

  sectionTitle: {
    fontSize: 'clamp(28px, 4vw, 42px)',
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: '12px',
    letterSpacing: '-0.02em',
  },

  sectionSubtitle: {
    fontSize: '16px',
    color: '#64748b',
    lineHeight: '1.7',
    margin: 0,
  },

  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '22px',
    maxWidth: '1280px',
    margin: '0 auto',
  },

  featureItem: {
    backgroundColor: '#fff',
    padding: '28px 24px',
    borderRadius: '18px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 20px 40px -28px rgba(15,23,42,0.16)',
    textAlign: 'left',
  },

  featureIcon: {
    fontSize: '30px',
    marginBottom: '16px',
  },

  featureTitle: {
    fontSize: '18px',
    color: '#0f172a',
    margin: '0 0 10px',
  },

  featureText: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.7',
    margin: 0,
  },

  pricingSection: {
    padding: '88px 4%',
    background: '#fff',
  },

  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },

  priceCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '22px',
    padding: '28px',
    boxShadow: '0 20px 40px -28px rgba(15,23,42,0.16)',
    position: 'relative',
  },

  priceCardFeatured: {
    border: '1px solid #ff6b35',
    boxShadow: '0 30px 60px -30px rgba(255,107,53,0.35)',
    transform: 'translateY(-4px)',
  },

  pricePopularBadge: {
    position: 'absolute',
    top: '-12px',
    right: '20px',
    background: '#ff6b35',
    color: '#fff',
    fontWeight: '800',
    fontSize: '12px',
    padding: '7px 12px',
    borderRadius: '999px',
  },

  pricePlan: {
    fontSize: '18px',
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: '10px',
  },

  priceValue: {
    fontSize: '36px',
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: '18px',
  },

  pricePeriod: {
    fontSize: '14px',
    color: '#64748b',
    marginLeft: '4px',
    fontWeight: '700',
  },

  priceList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 24px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  priceListItem: {
    fontSize: '14px',
    color: '#475569',
    position: 'relative',
    paddingLeft: '18px',
  },

  priceBtn: {
    width: '100%',
    border: 'none',
    background: '#ff6b35',
    color: '#fff',
    padding: '13px 18px',
    borderRadius: '12px',
    fontWeight: '800',
    cursor: 'pointer',
  },

  priceBtnLight: {
    width: '100%',
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#1e293b',
    padding: '13px 18px',
    borderRadius: '12px',
    fontWeight: '800',
    cursor: 'pointer',
  },

  footerSection: {
    backgroundColor: '#1e293b',
    color: '#cbd5e1',
    padding: '60px 4% 24px',
    borderTop: '4px solid #ff6b35',
  },

  footerContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
    flexWrap: 'wrap',
  },

  footerColumnWide: {
    flex: 2,
    minWidth: '280px',
  },

  footerColumn: {
    flex: 1,
    minWidth: '250px',
  },

  footerHeading: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '15px',
  },

  footerText: {
    fontSize: '13px',
    lineHeight: '1.8',
    color: '#94a3b8',
    maxWidth: '700px',
  },

  footerList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },

  footerListItem: {
    fontSize: '13px',
    marginBottom: '10px',
    color: '#cbd5e1',
  },

  footerBottom: {
    textAlign: 'center',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    marginTop: '40px',
    paddingTop: '20px',
    fontSize: '12px',
    color: '#64748b',
  },

  authBg: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100%',
    background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
    padding: '24px',
    boxSizing: 'border-box',
  },

  authCard: {
    backgroundColor: '#fff',
    padding: '36px',
    borderRadius: '22px',
    width: '100%',
    maxWidth: '460px',
    boxShadow: '0 30px 70px -35px rgba(15,23,42,0.3)',
    boxSizing: 'border-box',
    border: '1px solid #e2e8f0',
  },

  authTitle: {
    textAlign: 'center',
    color: '#1e293b',
    fontSize: '16px',
    margin: '6px 0 18px 0',
    fontWeight: '800',
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  authInput: {
    padding: '13px 14px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    background: '#fff',
  },

  authBtn: {
    padding: '13px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#1e293b',
    color: '#fff',
    fontWeight: '800',
    cursor: 'pointer',
    fontSize: '14px',
  },

  authBtnOrange: {
    padding: '13px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#ff6b35',
    color: '#fff',
    fontWeight: '800',
    cursor: 'pointer',
    fontSize: '14px',
  },

  cancelReturnBtn: {
    marginTop: '10px',
    width: '100%',
    padding: '11px',
    border: '1px dashed #cbd5e1',
    borderRadius: '12px',
    backgroundColor: 'transparent',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
  },

  authFooter: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#64748b',
    marginTop: '16px',
  },

  authLink: {
    color: '#ff6b35',
    fontWeight: 'bold',
    cursor: 'pointer',
    textDecoration: 'underline',
  },

  demoBox: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    fontSize: '11px',
    color: '#475569',
    lineHeight: '1.6',
    border: '1px dashed #cbd5e1',
  },

  dashboardLayout: {
    display: 'flex',
    width: '100%',
    minHeight: '100vh',
    margin: 0,
    padding: 0,
    background: '#f8fafc',
  },

  sidebar: {
    width: '270px',
    minWidth: '270px',
    backgroundColor: '#1e293b',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    padding: '22px',
    boxSizing: 'border-box',
  },

  sidebarLogo: {
    fontSize: '24px',
    fontWeight: '900',
    marginBottom: '20px',
  },

  restaurantBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: '14px',
    borderRadius: '12px',
    marginBottom: '20px',
  },

  navGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },

  navItem: {
    display: 'block',
    width: '100%',
    padding: '12px 14px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
  },

  navItemActive: {
    display: 'block',
    width: '100%',
    padding: '12px 14px',
    border: 'none',
    backgroundColor: '#ff6b35',
    color: '#fff',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: '10px',
    fontWeight: '800',
    fontSize: '14px',
    boxShadow: '0 18px 35px -20px rgba(255,107,53,0.8)',
  },

  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    border: 'none',
    padding: '12px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '800',
  },

  mainContent: {
    flex: 1,
    padding: '26px',
    overflowY: 'auto',
    boxSizing: 'border-box',
    minWidth: 0,
  },

  posLayout: {
    display: 'flex',
    gap: '22px',
    minHeight: 'calc(100vh - 52px)',
    alignItems: 'stretch',
  },

  contentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    gap: '12px',
    flexWrap: 'wrap',
  },

  pageTitle: {
    fontSize: '20px',
    color: '#1e293b',
    fontWeight: '900',
    margin: 0,
  },

  tableInputMini: {
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    fontSize: '13px',
  },

  addBtnMini: {
    backgroundColor: '#1e293b',
    color: '#fff',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '800',
    fontSize: '13px',
  },

  mesaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '14px',
  },

  mesaCard: {
    backgroundColor: '#fff',
    padding: '22px 16px',
    borderRadius: '16px',
    border: '2px solid transparent',
    cursor: 'pointer',
    boxShadow: '0 15px 30px -24px rgba(15,23,42,0.15)',
    textAlign: 'center',
  },

  mesaStatusText: {
    fontSize: '14px',
    fontWeight: '900',
    marginTop: '8px',
  },

  adisyonPanel: {
    width: '380px',
    minWidth: '380px',
    backgroundColor: '#fff',
    borderRadius: '18px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #e2e8f0',
    boxSizing: 'border-box',
    boxShadow: '0 18px 40px -28px rgba(15,23,42,0.16)',
  },

  panelTitle: {
    fontSize: '15px',
    color: '#1e293b',
    margin: '0 0 12px 0',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '10px',
    fontWeight: '800',
  },

  addOrderBox: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },

  panelSelect: {
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    fontSize: '13px',
  },

  panelAddBtn: {
    backgroundColor: '#ff6b35',
    color: '#fff',
    border: 'none',
    padding: '10px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '800',
    fontSize: '13px',
  },

  receiptContainer: {
    flex: 1,
    border: '1px dashed #cbd5e1',
    borderRadius: '12px',
    backgroundColor: '#fbfbfb',
    padding: '12px',
    overflowY: 'auto',
    minHeight: '250px',
  },

  emptyReceipt: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '12px',
    marginTop: '20px',
  },

  receiptRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '13px',
  },

  deleteItemBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '2px 6px',
  },

  receiptFooter: {
    marginTop: '15px',
    borderTop: '2px solid #1e293b',
    paddingTop: '12px',
  },

  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 'bold',
    marginBottom: '12px',
  },

  checkoutBtn: {
    width: '100%',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '10px',
    fontWeight: '800',
    cursor: 'pointer',
    fontSize: '14px',
  },

  panelCard: {
    backgroundColor: '#fff',
    padding: '22px',
    borderRadius: '18px',
    boxShadow: '0 18px 40px -28px rgba(15,23,42,0.16)',
    boxSizing: 'border-box',
    border: '1px solid #e2e8f0',
  },

  inlineForm: {
    display: 'flex',
    gap: '8px',
    marginBottom: '15px',
    flexWrap: 'wrap',
  },

  input: {
    padding: '11px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    fontSize: '13px',
    minWidth: '180px',
  },

  btnOrange: {
    backgroundColor: '#ff6b35',
    color: '#fff',
    border: 'none',
    padding: '11px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '800',
    fontSize: '13px',
  },

  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '8px',
    fontSize: '13px',
    border: '1px solid #eef2f7',
  },

  priceTag: {
    fontWeight: '800',
    color: '#ff6b35',
  },

  filterButtonGroup: {
    display: 'flex',
    backgroundColor: '#e2e8f0',
    padding: '4px',
    borderRadius: '10px',
    gap: '4px',
  },

  filterBtn: {
    border: 'none',
    padding: '7px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    backgroundColor: 'transparent',
    color: '#475569',
    fontWeight: '700',
  },

  filterBtnActive: {
    border: 'none',
    padding: '7px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    backgroundColor: '#fff',
    color: '#1e293b',
    fontWeight: '800',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '15px',
  },

  statsCard: {
    backgroundColor: '#fff',
    padding: '22px',
    borderRadius: '16px',
    boxShadow: '0 18px 40px -28px rgba(15,23,42,0.16)',
    border: '1px solid #e2e8f0',
  },

  statsTitle: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '700',
  },

  statsValue: {
    fontSize: '24px',
    fontWeight: '900',
    color: '#1e293b',
    marginTop: '8px',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px',
    minWidth: '700px',
  },

  th: {
    padding: '12px 10px',
    textAlign: 'left',
    borderBottom: '2px solid #e2e8f0',
    color: '#64748b',
    fontSize: '12px',
    fontWeight: '800',
  },

  td: {
    padding: '12px 10px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '13px',
    color: '#334155',
    verticalAlign: 'middle',
  },

  tr: {},

  badgeActive: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
    padding: '5px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '800',
  },

  badgePending: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
    padding: '5px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '800',
  },

  actionBtnApprove: {
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    padding: '7px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '800',
  },

  actionBtnBlock: {
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    padding: '7px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '800',
  },
};
