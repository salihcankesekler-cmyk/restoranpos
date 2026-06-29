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

  const izinliScreens = ['landing', 'login', 'register', 'forgot_password', 'dashboard'];

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
        ? (['super_admin', 'admin_lisans', 'admin_moduller', 'admin_destek'].includes(kayitliActiveTab) ? kayitliActiveTab : 'super_admin')
        : kayitliActiveTab || 'raporlar';

  // müşterinin QR menü linkiyle siteye girdiğini yakalayan kod
  const qrMenuLinkRestaurantId = (() => {
    if (typeof window === 'undefined') return '';

    try {
      const params = new URLSearchParams(window.location.search || '');
      const hashParams = String(window.location.hash || '').includes('?')
        ? new URLSearchParams(String(window.location.hash || '').split('?')[1] || '')
        : null;

      return params.get('qr_menu') || params.get('qrMenu') || params.get('menu') || hashParams?.get('qr_menu') || hashParams?.get('qrMenu') || '';
    } catch {
      return '';
    }
  })();

  const qrMenuMusteriModu = Boolean(qrMenuLinkRestaurantId);

  const [screen, setScreen] = useState(baslangicScreen);
  const [activeTab, setActiveTab] = useState(baslangicTab);
  const [reportType, setReportType] = useState('gunluk');
  const [rehberGizli, setRehberGizli] = useState(() => localStorage.getItem('integra_rehber_gizli') === '1');

  const kullanimRehberiniDegistir = () => {
    setRehberGizli(prev => {
      const yeniDeger = !prev;
      localStorage.setItem('integra_rehber_gizli', yeniDeger ? '1' : '0');
      return yeniDeger;
    });
  };

  // mobil ve tablet ekranlarda panelin taşmasını engelleyen kod
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 900;
  });

  // auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sifremiUnuttumEmail, setSifremiUnuttumEmail] = useState('');
  const [sifremiUnuttumTelefon, setSifremiUnuttumTelefon] = useState('');
  const [sifremiUnuttumYeniSifre, setSifremiUnuttumYeniSifre] = useState('');
  const [sifremiUnuttumYeniSifreTekrar, setSifremiUnuttumYeniSifreTekrar] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [kayitYetkiliAdi, setKayitYetkiliAdi] = useState('');
  const [kayitTelefon, setKayitTelefon] = useState('');
  const [kayitAdres, setKayitAdres] = useState('');
  const [kayitNotu, setKayitNotu] = useState('');
  const [kayitPaketi, setKayitPaketi] = useState('Profesyonel');
  const [destekAdSoyad, setDestekAdSoyad] = useState('');
  const [destekFirmaAdi, setDestekFirmaAdi] = useState('');
  const [destekEmail, setDestekEmail] = useState('');
  const [destekTelefon, setDestekTelefon] = useState('');
  const [destekTalepTipi, setDestekTalepTipi] = useState('Geliştirme Talebi');
  const [destekKonu, setDestekKonu] = useState('');
  const [destekMesaj, setDestekMesaj] = useState('');
  const [adminBildirimleri, setAdminBildirimleri] = useState([]);
  const [destekTalepleri, setDestekTalepleri] = useState([]);
  const [adminDetayAcikId, setAdminDetayAcikId] = useState(null);
  const [adminDestekFiltresi, setAdminDestekFiltresi] = useState('Açık');
  const [adminLisansFiltresi, setAdminLisansFiltresi] = useState('Tümü');
  const [adminLisansArama, setAdminLisansArama] = useState('');
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
  const [topluMasaOnEk, setTopluMasaOnEk] = useState('Masa');
  const [topluMasaBaslangicNo, setTopluMasaBaslangicNo] = useState(1);
  const [topluMasaAdet, setTopluMasaAdet] = useState(5);
  const [yeniUrunAdi, setYeniUrunAdi] = useState('');
  const [yeniUrunFiyati, setYeniUrunFiyati] = useState('');

  // menü ürün gruplarını tutan kod
  const [menuGruplari, setMenuGruplari] = useState([
    { id: 'demo-grup-1', restaurantId: 1, ad: 'Ana Yemekler', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true, mutfakEkraninaGitsin: true, yaziciyaGitsin: true },
    { id: 'demo-grup-2', restaurantId: 1, ad: 'İçecekler', departman: 'Bar', kdvOrani: 20, mutfagaGitsin: true, mutfakEkraninaGitsin: true, yaziciyaGitsin: true },
    { id: 'demo-grup-3', restaurantId: 1, ad: 'Tatlılar', departman: 'Tatlı', kdvOrani: 10, mutfagaGitsin: true, mutfakEkraninaGitsin: true, yaziciyaGitsin: true },
  ]);

  // menü yönetiminde aktif seçili ürün grubunu tutan kod
  const [aktifMenuGrubu, setAktifMenuGrubu] = useState('Ana Yemekler');

  // adisyon ekranında aktif seçili ürün grubunu tutan kod
  const [aktifAdisyonMenuGrubu, setAktifAdisyonMenuGrubu] = useState('Ana Yemekler');

  // adisyon ekranında ürün arama metnini tutan kod
  const [adisyonUrunArama, setAdisyonUrunArama] = useState('');

  // QR menü ayarları ve herkese açık QR menü ekranı için kullanılan kod
  const [qrMenuArama, setQrMenuArama] = useState('');
  const [aktifQrMenuGrubu, setAktifQrMenuGrubu] = useState('Tümü');
  const [qrMenuMesaji, setQrMenuMesaji] = useState('');
  const [qrMenuYukleniyor, setQrMenuYukleniyor] = useState(false);
  const [qrMenuHatasi, setQrMenuHatasi] = useState('');
  const [qrMenuRestoran, setQrMenuRestoran] = useState(null);
  const [qrMenuPublicUrunleri, setQrMenuPublicUrunleri] = useState([]);
  const [qrMenuPublicGruplari, setQrMenuPublicGruplari] = useState([]);
  const [qrMenuPublicMasalar, setQrMenuPublicMasalar] = useState([]);
  const [qrMenuAyarlari, setQrMenuAyarlari] = useState(() => {
    try {
      const kayit = localStorage.getItem('integra_qr_menu_ayarlari');
      return kayit ? JSON.parse(kayit) : {};
    } catch {
      return {};
    }
  });

  // QR menüden sipariş, garson çağırma ve hesap isteme için kullanılan kod
  const [qrSepet, setQrSepet] = useState([]);
  const [qrSiparisMasaNo, setQrSiparisMasaNo] = useState('');
  const [qrSiparisMusteriAdi, setQrSiparisMusteriAdi] = useState('');
  const [qrSiparisNotu, setQrSiparisNotu] = useState('');
  const [qrSiparisMesaji, setQrSiparisMesaji] = useState('');
  const [qrSiparisGonderiliyor, setQrSiparisGonderiliyor] = useState(false);
  const [qrServisMesaji, setQrServisMesaji] = useState('');

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

  // açık masanın/adisyonun genel toplamına uygulanacak yüzde ve TL indirimini tutan kod
  const [adisyonToplamIndirimYuzde, setAdisyonToplamIndirimYuzde] = useState('');
  const [adisyonToplamIndirimTutari, setAdisyonToplamIndirimTutari] = useState('');
  // fiş yazıcı ve firma bilgisi için varsayılan ayarları oluşturan kod
  function varsayilanFisAyarlari(firmaAdi = '') {
    return {
      firmaAdi: firmaAdi || 'Integra POS',
      firmaTelefon: '',
      firmaAdres: '',
      vergiBilgisi: '',
      fisAltNotu: 'Bizi tercih ettiğiniz için teşekkür ederiz.',
      adisyonYaziciAdi: 'Adisyon Yazıcısı',
      adisyonYaziciNo: '',
      mutfakYaziciAdi: 'Mutfak Yazıcısı',
      mutfakYaziciNo: '',
      barYaziciAdi: 'Bar / İçecek Yazıcısı',
      barYaziciNo: '',
      mutfakFisYazdirmaModu: 'sor',
    };
  }


  // kalıcı yazıcı sistemi için varsayılan Windows yazıcı adlarını oluşturan kod
  function varsayilanYaziciAyarlari() {
    return {
      adisyonYaziciAdi: 'adisyon',
      mutfakYaziciAdi: 'mutfak',
      barYaziciAdi: 'bar',
      barYoksaMutfagaGonder: true,
      adisyonFisiAktif: true,
      odemeFisiAktif: true,
      mutfakFisiAktif: true,
      iptalFisiAktif: true,
      paketFisiAktif: true,
      zRaporuAktif: true,
    };
  }

  // kalıcı fiş şablonları için varsayılan metinleri oluşturan kod
  function varsayilanFisSablonlari() {
    return [
      {
        fisTipi: 'adisyon',
        baslik: 'ADİSYON FİŞİ',
        aktif: true,
        sablonText: `{firma_adi}
{fis_baslik}
Masa: {masa_adi}
Garson: {garson_adi}
Tarih: {tarih}

{urunler}

Ara Toplam: {ara_toplam}
İndirim: {indirim}
KDV: {kdv}
Toplam: {toplam}

{alt_not}`,
      },
      {
        fisTipi: 'odeme',
        baslik: 'ÖDEME FİŞİ',
        aktif: true,
        sablonText: `{firma_adi}
{fis_baslik}
Masa: {masa_adi}
Ödeme: {odeme_tipi}
Tarih: {tarih}

{urunler}

Toplam: {toplam}
Ödenen: {odenen}
Kalan: {kalan}
Para Üstü: {para_ustu}

{alt_not}`,
      },
      {
        fisTipi: 'mutfak',
        baslik: 'MUTFAK FİŞİ',
        aktif: true,
        sablonText: `{fis_baslik}
Masa: {masa_adi}
Departman: {departman}
Garson: {garson_adi}
Tarih: {tarih}

{urunler}

Not: {not}`,
      },
      {
        fisTipi: 'iptal',
        baslik: 'İPTAL FİŞİ',
        aktif: true,
        sablonText: `*** İPTAL ***
Masa: {masa_adi}
Departman: {departman}
Garson: {garson_adi}
Tarih: {tarih}

{urunler}

Sebep: {iptal_sebebi}`,
      },
      {
        fisTipi: 'paket',
        baslik: 'PAKET SERVİS FİŞİ',
        aktif: true,
        sablonText: `{firma_adi}
{fis_baslik}
Müşteri: {musteri_adi}
Telefon: {telefon}
Adres: {adres}
Tarih: {tarih}

{urunler}

Toplam: {toplam}

{alt_not}`,
      },
      {
        fisTipi: 'z_raporu',
        baslik: 'GÜN SONU Z RAPORU',
        aktif: true,
        sablonText: `{firma_adi}
{fis_baslik}
Tarih: {tarih}

Nakit: {nakit}
Kart: {kart}
Cari: {cari}
Toplam Ciro: {toplam}

{alt_not}`,
      },
    ];
  }

  // her restoran için fiş ayarlarını ayrı tarayıcı kaydında tutan kod
  function fisAyarlariLocalKey(restaurantId) {
    return `integra_fis_yazici_ayarlari_${restaurantId || 'genel'}`;
  }

  // fiş yazdırma tercih ayarını tutan kod
  const [fisYazdirmaModu, setFisYazdirmaModu] = useState(
    localStorage.getItem('integra_fis_yazdirma_modu') || 'sor'
  );

  // firma adı, fiş alt notu ve adisyon/mutfak yazıcı seçimlerini tutan kod
  const [fisAyarlari, setFisAyarlari] = useState(() => {
    const ilkKullanici = kayitliUser || {};
    const ilkRestaurantId = ilkKullanici?.role === 'waiter'
      ? ilkKullanici?.parentRestaurantId
      : ilkKullanici?.restaurantId;
    const varsayilan = varsayilanFisAyarlari(ilkKullanici?.restaurant || '');

    try {
      const kayit = localStorage.getItem(fisAyarlariLocalKey(ilkRestaurantId)) || localStorage.getItem('integra_fis_yazici_ayarlari');
      return kayit ? { ...varsayilan, ...JSON.parse(kayit) } : varsayilan;
    } catch {
      return varsayilan;
    }
  });

  // kalıcı yazıcı kurallarını tutan kod
  const [yaziciAyarlari, setYaziciAyarlari] = useState(() => varsayilanYaziciAyarlari());

  // kalıcı fiş şablonlarını tutan kod
  const [fisSablonlari, setFisSablonlari] = useState(() => varsayilanFisSablonlari());
  const [aktifFisSablonTipi, setAktifFisSablonTipi] = useState('adisyon');

  // Printer Agent kurulum kodu ve indirme paneli için kullanılan kod
  const [printerAgentKurulumu, setPrinterAgentKurulumu] = useState(null);
  const [printerAgentKurulumYukleniyor, setPrinterAgentKurulumYukleniyor] = useState(false);
  const [printerAgentKurulumMesaji, setPrinterAgentKurulumMesaji] = useState('');

  // fiş ayarları kaydedilirken butonu kilitleyen kod
  const [fisAyarlariKaydediliyor, setFisAyarlariKaydediliyor] = useState(false);
  // ödeme sonrası fiş yazdırma sorusunu ekranda modal olarak göstermek için kullanılan kod
  const [fisSorModal, setFisSorModal] = useState(null);
  // mutfak fişi yazdırma sorusunu ekranda modal olarak göstermek için kullanılan kod
  const [mutfakFisSorModal, setMutfakFisSorModal] = useState(null);
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

  // paket servis sipariş toplamına uygulanacak yüzde ve TL indirimini tutan kod
  const [paketToplamIndirimYuzde, setPaketToplamIndirimYuzde] = useState('');
  const [paketToplamIndirimTutari, setPaketToplamIndirimTutari] = useState('');

  // paket serviste seçilen ürüne özel notu tutan kod
  const [paketSeciliUrunNotu, setPaketSeciliUrunNotu] = useState('');
  const [paketSeciliHazirNotId, setPaketSeciliHazirNotId] = useState('');

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

  // Trendyol / Getir / Migros gibi online sipariş entegrasyonları için kullanılan kod
  const entegrasyonPlatformSecenekleri = ['Trendyol', 'Getir', 'Migros'];
  const [paketOnlineSekmesi, setPaketOnlineSekmesi] = useState('yeni');
  const [aktifEntegrasyonPlatformu, setAktifEntegrasyonPlatformu] = useState('Trendyol');
  const [onlineSiparisYukleniyor, setOnlineSiparisYukleniyor] = useState(false);
  const [onlineSiparisMesaji, setOnlineSiparisMesaji] = useState('');
  const [entegrasyonMesaji, setEntegrasyonMesaji] = useState('');
  const [entegrasyonTestModu, setEntegrasyonTestModu] = useState(() => {
    try {
      const kayit = localStorage.getItem('integra_entegrasyon_test_modu');
      return kayit === null ? true : kayit !== 'false';
    } catch {
      return true;
    }
  });
  const [entegrasyonTestSenaryosu, setEntegrasyonTestSenaryosu] = useState('normal');
  const [onlineSiparisler, setOnlineSiparisler] = useState(() => {
    try {
      const kayit = localStorage.getItem('integra_online_siparisler');
      return kayit ? JSON.parse(kayit) : [];
    } catch {
      return [];
    }
  });
  const [platformBaglantilari, setPlatformBaglantilari] = useState(() => {
    try {
      const kayit = localStorage.getItem('integra_platform_baglantilari');
      return kayit ? JSON.parse(kayit) : [];
    } catch {
      return [];
    }
  });
  const [entegrasyonFormu, setEntegrasyonFormu] = useState({
    platform: 'Trendyol',
    saticiId: '',
    entegrasyonReferansKodu: '',
    apiKey: '',
    apiSecret: '',
    token: '',
    hesapTuru: 'Yemek',
    aktif: true,
  });

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

  // masa birleştirme ve seçili ürün ödeme alanlarını tutan kod
  const [birlestirilecekMasaId, setBirlestirilecekMasaId] = useState('');
  const [masaBirlestirmeModu, setMasaBirlestirmeModu] = useState(false);
  const [birlestirilenKaynakMasaId, setBirlestirilenKaynakMasaId] = useState(null);
  const [bolunecekSiparisIndexleri, setBolunecekSiparisIndexleri] = useState([]);

  // stok düzenleme alanlarını tutan kod
  const [stokDuzenlemeUrunId, setStokDuzenlemeUrunId] = useState(null);
  const [stokDuzenlemeAdedi, setStokDuzenlemeAdedi] = useState('');
  const [stokDuzenlemeKritik, setStokDuzenlemeKritik] = useState('');

  // hammadde stok ve ürün reçetesi alanlarını tutan kod
  const [stokMalzemeleri, setStokMalzemeleri] = useState([]);
  const [urunReceteleri, setUrunReceteleri] = useState([]);
  const [yeniStokMalzemeAdi, setYeniStokMalzemeAdi] = useState('');
  const [yeniStokMalzemeBirim, setYeniStokMalzemeBirim] = useState('kg');
  const [yeniStokMalzemeMiktar, setYeniStokMalzemeMiktar] = useState('');
  const [yeniStokMalzemeKritik, setYeniStokMalzemeKritik] = useState('');
  const [yeniStokMalzemeMaliyet, setYeniStokMalzemeMaliyet] = useState('');
  const [stokMalzemeEklenecekMiktarlar, setStokMalzemeEklenecekMiktarlar] = useState({});
  const [receteAyarlananUrunId, setReceteAyarlananUrunId] = useState('');
  const [receteMalzemeId, setReceteMalzemeId] = useState('');
  const [receteMiktar, setReceteMiktar] = useState('');
  const [receteFireYuzde, setReceteFireYuzde] = useState('');
  const [receteHazirlikNotu, setReceteHazirlikNotu] = useState('');
  const [recetePorsiyonCarpani, setRecetePorsiyonCarpani] = useState('1');
  const [receteKopyalanacakUrunId, setReceteKopyalanacakUrunId] = useState('');
  const [receteDuzenlenenSatirId, setReceteDuzenlenenSatirId] = useState(null);
  const [receteDuzenlemeMiktar, setReceteDuzenlemeMiktar] = useState('');
  const [receteDuzenlemeFireYuzde, setReceteDuzenlemeFireYuzde] = useState('');
  const [receteDuzenlemeNotu, setReceteDuzenlemeNotu] = useState('');

  // ürün reçetesini tek tek kaydetmek yerine önce listeye toplayıp toplu kaydetmek için kullanılan kod
  const [receteTaslakKalemleri, setReceteTaslakKalemleri] = useState([]);

  // reçeteli ürünleri manuel üretmek veya satışta otomatik üretmek için kullanılan kod
  const [uretimMiktari, setUretimMiktari] = useState('1');
  const [uretimNotu, setUretimNotu] = useState('');
  const [uretimMesaji, setUretimMesaji] = useState('');


  // hızlı satış / gel-al ekranı için kullanılan kod
  const [hizliSatisUrunler, setHizliSatisUrunler] = useState([]);
  const [aktifHizliSatisMenuGrubu, setAktifHizliSatisMenuGrubu] = useState('Ana Yemekler');
  const [hizliSatisUrunArama, setHizliSatisUrunArama] = useState('');
  const [hizliSatisOdemeTipi, setHizliSatisOdemeTipi] = useState('Nakit');
  const [hizliSatisAlinanTutar, setHizliSatisAlinanTutar] = useState('');
  const [hizliSatisIndirimYuzde, setHizliSatisIndirimYuzde] = useState('');
  const [hizliSatisIndirimTutari, setHizliSatisIndirimTutari] = useState('');
  const [hizliSatisCariMusteriId, setHizliSatisCariMusteriId] = useState('');
  const [hizliSatisCariArama, setHizliSatisCariArama] = useState('');

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
  const [rezervasyonKaporaTutari, setRezervasyonKaporaTutari] = useState('');
  const [rezervasyonHatirlatma, setRezervasyonHatirlatma] = useState(true);
  const [rezervasyonTakvimGorunumu, setRezervasyonTakvimGorunumu] = useState('liste');

  // QR sipariş, servis talebi, sadakat, kiosk, stok sayım ve satın alma modülleri için kullanılan kod
  const [servisTalepleri, setServisTalepleri] = useState(() => {
    try {
      const kayit = localStorage.getItem('integra_servis_talepleri');
      return kayit ? JSON.parse(kayit) : [];
    } catch {
      return [];
    }
  });
  const [sadakatMusterileri, setSadakatMusterileri] = useState(() => {
    try {
      const kayit = localStorage.getItem('integra_sadakat_musterileri');
      return kayit ? JSON.parse(kayit) : [];
    } catch {
      return [];
    }
  });
  const [sadakatAdi, setSadakatAdi] = useState('');
  const [sadakatTelefon, setSadakatTelefon] = useState('');
  const [sadakatPuan, setSadakatPuan] = useState('');
  const [sadakatMesaji, setSadakatMesaji] = useState('');
  const [islemLoglari, setIslemLoglari] = useState(() => {
    try {
      const kayit = localStorage.getItem('integra_islem_loglari');
      return kayit ? JSON.parse(kayit) : [];
    } catch {
      return [];
    }
  });
  const [elTerminaliModu, setElTerminaliModu] = useState(() => localStorage.getItem('integra_el_terminali_modu') === 'true');
  const [kioskSepet, setKioskSepet] = useState([]);
  const [kioskMusteriAdi, setKioskMusteriAdi] = useState('');
  const [kioskSiparisNotu, setKioskSiparisNotu] = useState('');
  const [kioskMesaji, setKioskMesaji] = useState('');
  const [stokSayimKayitlari, setStokSayimKayitlari] = useState(() => {
    try {
      const kayit = localStorage.getItem('integra_stok_sayim_kayitlari');
      return kayit ? JSON.parse(kayit) : [];
    } catch {
      return [];
    }
  });
  const [satinAlmaTalepleri, setSatinAlmaTalepleri] = useState(() => {
    try {
      const kayit = localStorage.getItem('integra_satin_alma_talepleri');
      return kayit ? JSON.parse(kayit) : [];
    } catch {
      return [];
    }
  });
  const [satinAlmaMalzemeId, setSatinAlmaMalzemeId] = useState('');
  const [satinAlmaMiktar, setSatinAlmaMiktar] = useState('');
  const [satinAlmaTedarikci, setSatinAlmaTedarikci] = useState('');
  const [satinAlmaMesaji, setSatinAlmaMesaji] = useState('');

  // alış fişi ile hammadde stok girişi ve dış gider kaydı için kullanılan kod
  const [alisFisleri, setAlisFisleri] = useState(() => {
    try {
      const kayit = localStorage.getItem('integra_alis_fisleri');
      return kayit ? JSON.parse(kayit) : [];
    } catch {
      return [];
    }
  });
  const [alisFisTedarikci, setAlisFisTedarikci] = useState('');
  const [alisFisCariMusteriId, setAlisFisCariMusteriId] = useState('');
  const [alisFisBelgeNo, setAlisFisBelgeNo] = useState('');
  const [alisFisOdemeTipi, setAlisFisOdemeTipi] = useState('Nakit');
  const [alisFisNotu, setAlisFisNotu] = useState('');
  const [alisFisGiderKategorisi, setAlisFisGiderKategorisi] = useState('Malzeme');
  const [alisFisGiderOlarakIsle, setAlisFisGiderOlarakIsle] = useState(true);
  const [alisFisMalzemeId, setAlisFisMalzemeId] = useState('');
  const [alisFisMiktar, setAlisFisMiktar] = useState('');
  const [alisFisBirimFiyat, setAlisFisBirimFiyat] = useState('');
  const [alisFisKalemleri, setAlisFisKalemleri] = useState([]);
  const [alisFisMesaji, setAlisFisMesaji] = useState('');

  // depo sayımı ekranında aktif sayımı ve açıklamasını tutan kod
  const [aktifStokSayimId, setAktifStokSayimId] = useState(null);
  const [stokSayimBaslik, setStokSayimBaslik] = useState('Günlük Depo Sayımı');

  // ürün maliyeti, ürün görseli ve kasa gün sonu için kullanılan kod
  const [yeniUrunMaliyeti, setYeniUrunMaliyeti] = useState('');
  const [duzenlenenUrunMaliyeti, setDuzenlenenUrunMaliyeti] = useState('');
  const [yeniUrunResimUrl, setYeniUrunResimUrl] = useState('');
  const [duzenlenenUrunResimUrl, setDuzenlenenUrunResimUrl] = useState('');
  const [yeniUrunQrMenudeGorunsun, setYeniUrunQrMenudeGorunsun] = useState(true);
  const [duzenlenenUrunQrMenudeGorunsun, setDuzenlenenUrunQrMenudeGorunsun] = useState(true);
  const [yeniUrunSatistaAktif, setYeniUrunSatistaAktif] = useState(true);
  const [duzenlenenUrunSatistaAktif, setDuzenlenenUrunSatistaAktif] = useState(true);
  const [kasaGercekTutar, setKasaGercekTutar] = useState('');

  // gün sonu kapatıldıktan sonra kasa bölümünde saklanacak Z raporlarını tutan kod
  const [zRaporlari, setZRaporlari] = useState([]);
  const [kuryeAdiInputs, setKuryeAdiInputs] = useState({});

  const [selectedMasaId, setSelectedMasaId] = useState(null);
  // mobilde masaya tıklanınca tam ekran adisyon panelini açıp kapatan kod
  const [mobilAdisyonAcik, setMobilAdisyonAcik] = useState(false);
  const [mobilAdisyonSekmesi, setMobilAdisyonSekmesi] = useState('urun');
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
    { id: 1, restaurantId: 1, ad: 'Adana Kebap', fiyat: 280, kategori: 'Ana Yemekler', menuGrubu: 'Ana Yemekler', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true, mutfakEkraninaGitsin: true, yaziciyaGitsin: true, resimUrl: '', menuNotlari: [] },
    { id: 2, restaurantId: 1, ad: 'Ayran', fiyat: 40, kategori: 'İçecekler', menuGrubu: 'İçecekler', departman: 'Bar', kdvOrani: 20, mutfagaGitsin: true, mutfakEkraninaGitsin: true, yaziciyaGitsin: true, resimUrl: '', menuNotlari: [] },
    { id: 3, restaurantId: 1, ad: 'Künefe', fiyat: 120, kategori: 'Tatlılar', menuGrubu: 'Tatlılar', departman: 'Tatlı', kdvOrani: 10, mutfagaGitsin: true, mutfakEkraninaGitsin: true, yaziciyaGitsin: true, resimUrl: '', menuNotlari: [] },
    { id: 4, restaurantId: 1, ad: 'Mercimek Çorbası', fiyat: 90, kategori: 'Ana Yemekler', menuGrubu: 'Ana Yemekler', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true, mutfakEkraninaGitsin: true, yaziciyaGitsin: true, resimUrl: '', menuNotlari: [] },
    { id: 5, restaurantId: 3, ad: 'Filtre Kahve', fiyat: 110, kategori: 'İçecekler', menuGrubu: 'İçecekler', departman: 'Bar', kdvOrani: 20, mutfagaGitsin: true, mutfakEkraninaGitsin: true, yaziciyaGitsin: true, resimUrl: '', menuNotlari: [] },
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

  // giriş yapan restorana ait hammadde/stok malzemelerini listeleyen kod
  const aktifStokMalzemeleri = (Array.isArray(stokMalzemeleri) ? stokMalzemeleri : [])
    .filter(m => String(m.restaurantId || '') === String(mevcutRestaurantId || ''));

  // para ve yüzde inputlarını güvenli sayıya çeviren yardımcı kod
  const sayiyaCevir = (deger) => {
    const sayi = Number(String(deger || '').replace(',', '.'));
    return Number.isFinite(sayi) ? sayi : 0;
  };

  // şifre sıfırlamada telefonları sadece rakam olarak karşılaştıran kod
  const telefonRakamlari = (deger) => {
    return String(deger || '').replace(/\D/g, '');
  };

  // ürün görseli alanını temizleyen kod. URL yerine bilgisayardan seçilen görsel base64 olarak saklanır.
  const urunResimUrlTemizle = (deger) => String(deger || '').trim();

  // ürün kartlarında kullanılacak görseli bulan kod
  const urunGosterimResmi = (urun) => {
    return urunResimUrlTemizle(urun?.resimUrl || urun?.resim_url || '');
  };

  // ürünün satışta ve QR menüde görünür olup olmadığını standart hale getiren kod
  const urunSatistaAktifMi = (urun = {}) => {
    if (urun?.satistaAktif !== undefined) return urun.satistaAktif !== false;
    if (urun?.satista_aktif !== undefined) return urun.satista_aktif !== false;
    if (urun?.satisAktif !== undefined) return urun.satisAktif !== false;
    if (urun?.aktif !== undefined) return urun.aktif !== false;

    const durumMetni = String(urun?.durum || urun?.status || '').toLocaleLowerCase('tr-TR');
    if (durumMetni.includes('pasif') || durumMetni.includes('satıştan') || durumMetni.includes('satistan') || durumMetni.includes('kalk')) return false;

    return true;
  };

  const urunQrMenudeGorunurMu = (urun = {}) => {
    const qrDurumu = urun?.qrMenudeGorunsun ?? urun?.qr_menude_gorunsun ?? urun?.qrMenuAktif ?? urun?.qr_menu_aktif ?? true;
    return qrDurumu !== false && urunSatistaAktifMi(urun);
  };

  // bilgisayardan seçilen ürün görselini uygulamada saklanabilir hale çeviren kod
  const urunResimDosyasiSec = (event, setter) => {
    const dosya = event?.target?.files?.[0];
    if (!dosya) return;

    if (!String(dosya.type || '').startsWith('image/')) {
      alert('Lütfen jpg, png veya webp gibi bir görsel dosyası seçin.');
      event.target.value = '';
      return;
    }

    const maksimumBoyutMb = 1.5;
    const maksimumBoyutByte = maksimumBoyutMb * 1024 * 1024;

    if (dosya.size > maksimumBoyutByte) {
      alert(`Görsel çok büyük. Lütfen ${maksimumBoyutMb} MB altında bir görsel seçin.`);
      event.target.value = '';
      return;
    }

    const okuyucu = new FileReader();

    okuyucu.onload = () => {
      setter(String(okuyucu.result || ''));
    };

    okuyucu.onerror = () => {
      alert('Görsel okunamadı. Lütfen farklı bir dosya deneyin.');
    };

    okuyucu.readAsDataURL(dosya);
  };

  // departman / yazıcı hedefi değerini standart hale getiren kod
  const yaziciDepartmaniniNormalizeEt = (departman = '') => {
    const ham = String(departman || '').trim();
    const metin = ham.toLocaleLowerCase('tr-TR');

    if (
      metin === '2' ||
      metin.includes('yazıcı 2') ||
      metin.includes('yazici 2') ||
      metin.includes('printer 2') ||
      metin.includes('bar') ||
      metin.includes('içecek') ||
      metin.includes('icecek') ||
      metin.includes('kahve') ||
      metin.includes('çay') ||
      metin.includes('cay')
    ) {
      return 'Bar';
    }

    if (
      metin === '1' ||
      metin.includes('yazıcı 1') ||
      metin.includes('yazici 1') ||
      metin.includes('printer 1') ||
      metin.includes('mutfak') ||
      metin.includes('yemek')
    ) {
      return 'Mutfak';
    }

    return ham || 'Mutfak';
  };

  // mutfak ekranı ve fiziksel fiş yazıcı ayarlarını ayrı kontrol eden kod
  const mutfakEkraniAktifMi = (kayit = {}) => {
    if (kayit?.mutfakEkraninaGitsin !== undefined) return kayit.mutfakEkraninaGitsin !== false;
    if (kayit?.mutfak_ekranina_gitsin !== undefined) return kayit.mutfak_ekranina_gitsin !== false;
    if (kayit?.mutfagaGitsin !== undefined) return kayit.mutfagaGitsin !== false;
    if (kayit?.mutfaga_gitsin !== undefined) return kayit.mutfaga_gitsin !== false;
    return true;
  };

  const fisYaziciAktifMi = (kayit = {}) => {
    if (kayit?.yaziciyaGitsin !== undefined) return kayit.yaziciyaGitsin !== false;
    if (kayit?.yaziciya_gitsin !== undefined) return kayit.yaziciya_gitsin !== false;
    if (kayit?.mutfagaGitsin !== undefined) return kayit.mutfagaGitsin !== false;
    if (kayit?.mutfaga_gitsin !== undefined) return kayit.mutfaga_gitsin !== false;
    return true;
  };

  // Supabase menu_gruplari.id bigint olduğu için sadece sayısal id'ler doğrudan güncellenir.
  // Ürünlerden otomatik oluşan gruplar urun-grup-... id alır; bunlar önce gerçek grup kaydına çevrilir.
  const menuGrubuDbKaydiVarMi = (grup = {}) => {
    const idMetni = String(grup?.id ?? '').trim();
    return /^\d+$/.test(idMetni);
  };

  const mutfakYaziciDurumEtiketi = (kayit = {}) => {
    const ekran = mutfakEkraniAktifMi(kayit);
    const yazici = fisYaziciAktifMi(kayit);

    if (ekran && yazici) return '👨‍🍳 Ekran + 🖨️ Yazıcı';
    if (ekran && !yazici) return '👨‍🍳 Sadece mutfak ekranı';
    if (!ekran && yazici) return '🖨️ Sadece fiş yazıcı';
    return '🚫 Mutfak/Yazıcı kapalı';
  };

  const yaziciDepartmaniSecenekleri = [
    { value: 'Mutfak', label: 'Yazıcı 1 / Mutfak-Yemek' },
    { value: 'Bar', label: 'Yazıcı 2 / İçecek-Bar' },
    { value: 'Tatlı', label: 'Yazıcı 1 / Tatlı' },
  ];

  // fiş ayarı formundaki alanları güncelleyen kod
  const fisAyariGuncelle = (alan, deger) => {
    setFisAyarlari(prev => ({
      ...prev,
      [alan]: deger,
    }));
  };


  // kalıcı yazıcı ayarlarını güncelleyen kod
  const yaziciAyariGuncelle = (alan, deger) => {
    setYaziciAyarlari(prev => ({
      ...prev,
      [alan]: deger,
    }));
  };

  // fiş tipi isimlerini ekranda okunur hale getiren kod
  const fisTipiEtiketi = (tip) => {
    const etiketler = {
      adisyon: 'Adisyon',
      odeme: 'Ödeme',
      mutfak: 'Mutfak',
      iptal: 'İptal',
      paket: 'Paket',
      z_raporu: 'Z Raporu',
    };
    return etiketler[tip] || tip;
  };

  // QR menü için varsayılan ayarları oluşturan kod
  function varsayilanQrMenuAyarlari(restaurantId = mevcutRestaurantId, firmaAdi = user?.restaurant || '') {
    return {
      restaurantId,
      aktif: true,
      baslik: firmaAdi || 'Dijital Menü',
      aciklama: 'QR kodu okutarak menümüzü inceleyebilirsiniz.',
      logoUrl: '',
      temaRengi: '#ff6b35',
      whatsappTelefon: '',
      siparisNotu: 'Sipariş vermek için garsonumuza bilgi verebilirsiniz.',
      fiyatlariGoster: true,
      qrSiparisAktif: true,
      garsonCagirmaAktif: true,
      hesapIstemeAktif: true,
      masaNoZorunlu: true,
    };
  }

  // QR menü linkini oluşturan kod
  function qrMenuLinkiHazirla(restaurantId = mevcutRestaurantId) {
    const hedefId = restaurantId || mevcutRestaurantId || '';
    const origin = typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://www.integraposbilisim.com';

    return `${origin}/?qr_menu=${encodeURIComponent(String(hedefId || ''))}`;
  }

  // QR kod görselini dış servis üzerinden hazırlayan kod
  function qrKodGorselUrlHazirla(link, boyut = 280) {
    const guvenliLink = encodeURIComponent(String(link || ''));
    const temizBoyut = Math.max(Number(boyut || 280), 160);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${temizBoyut}x${temizBoyut}&data=${guvenliLink}`;
  }

  // QR menüde gösterilecek grupları ürünlerle birlikte hazırlayan kod
  function qrMenuGruplariniHazirla(urunler = [], gruplar = [], restaurantId = mevcutRestaurantId) {
    const temizUrunler = (Array.isArray(urunler) ? urunler : [])
      .filter(u => String(u.restaurantId || u.restaurant_id || '') === String(restaurantId || u.restaurantId || u.restaurant_id || ''))
      .filter(u => String(u.ad || '').trim())
      .filter(u => urunQrMenudeGorunurMu(u))
      .map(u => ({
        ...u,
        ad: u.ad || u.name || 'Ürün',
        fiyat: Number(u.fiyat || u.price || 0),
        menuGrubu: u.menuGrubu || u.menu_grubu || u.kategori || 'Genel',
        kategori: u.menuGrubu || u.menu_grubu || u.kategori || 'Genel',
        resimUrl: u.resimUrl || u.resim_url || '',
        aciklama: u.aciklama || u.description || '',
      }));

    const grupMap = new Map();

    (Array.isArray(gruplar) ? gruplar : [])
      .filter(g => !restaurantId || String(g.restaurantId || g.restaurant_id || '') === String(restaurantId))
      .forEach(g => {
        const ad = String(g.ad || g.name || 'Genel').trim() || 'Genel';
        if (!grupMap.has(ad)) {
          grupMap.set(ad, { ...g, ad, urunler: [] });
        }
      });

    temizUrunler.forEach(u => {
      const grupAdi = String(u.menuGrubu || u.kategori || 'Genel').trim() || 'Genel';
      if (!grupMap.has(grupAdi)) {
        grupMap.set(grupAdi, { id: `qr-grup-${grupAdi}`, restaurantId: restaurantId || u.restaurantId, ad: grupAdi, urunler: [] });
      }

      grupMap.get(grupAdi).urunler.push(u);
    });

    return Array.from(grupMap.values())
      .map(g => ({
        ...g,
        urunler: (Array.isArray(g.urunler) ? g.urunler : []).sort((a, b) => {
          const favoriFarki = Number(Boolean(b.favori)) - Number(Boolean(a.favori));
          if (favoriFarki !== 0) return favoriFarki;
          return String(a.ad || '').localeCompare(String(b.ad || ''), 'tr');
        }),
      }))
      .filter(g => g.urunler.length > 0);
  }

  // seçili fiş şablonunu bulan kod
  const fisSablonuBul = (fisTipi) => {
    const varsayilan = varsayilanFisSablonlari().find(s => s.fisTipi === fisTipi) || varsayilanFisSablonlari()[0];
    const kayitli = (Array.isArray(fisSablonlari) ? fisSablonlari : []).find(s => s.fisTipi === fisTipi);
    return { ...varsayilan, ...(kayitli || {}) };
  };

  // fiş şablon alanlarını güncelleyen kod
  const fisSablonuGuncelle = (fisTipi, alan, deger) => {
    setFisSablonlari(prev => {
      const liste = Array.isArray(prev) && prev.length > 0 ? prev : varsayilanFisSablonlari();
      const varMi = liste.some(s => s.fisTipi === fisTipi);
      const yeniListe = varMi
        ? liste.map(s => s.fisTipi === fisTipi ? { ...s, [alan]: deger } : s)
        : [...liste, { ...fisSablonuBul(fisTipi), [alan]: deger }];
      return yeniListe;
    });
  };

  // Printer Agent kurulum kodu üretirken kullanılan yardımcı kod
  const printerAgentKurulumKoduUret = (restaurantId = mevcutRestaurantId) => {
    const temizId = String(restaurantId || '').replace(/\D/g, '') || '0';
    const rastgele = Math.random().toString(36).replace(/[^a-z0-9]/gi, '').slice(2, 6).toUpperCase().padEnd(4, 'X');
    return `INT-${temizId}-${rastgele}`;
  };

  // Printer Agent kurulum kaydını Supabase'den çeken kod
  const printerAgentKurulumunuSupabasedenCek = async (restaurantId = mevcutRestaurantId) => {
    if (!restaurantId || String(restaurantId) === 'super_admin') return null;

    setPrinterAgentKurulumYukleniyor(true);
    setPrinterAgentKurulumMesaji('');

    try {
      const { data, error } = await supabase
        .from('printer_agent_kurulumlari')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (error) {
        console.warn('Printer Agent kurulum kaydı çekilemedi:', error.message);
        setPrinterAgentKurulumMesaji('Kurulum kaydı okunamadı. Printer Agent v3.4 SQL tamir kodunun çalıştığından emin olun.');
        return null;
      }

      setPrinterAgentKurulumu(data || null);
      return data || null;
    } finally {
      setPrinterAgentKurulumYukleniyor(false);
    }
  };

  // Printer Agent kurulum kodunu oluşturan veya yenileyen kod
  const printerAgentKurulumKoduHazirla = async (yeniKodUret = false) => {
    const hedefRestaurantId = mevcutRestaurantId;

    if (!hedefRestaurantId || String(hedefRestaurantId) === 'super_admin') {
      alert('Printer Agent kurulumu için aktif restoran bulunamadı.');
      return;
    }

    setPrinterAgentKurulumYukleniyor(true);
    setPrinterAgentKurulumMesaji('');

    try {
      if (!yeniKodUret) {
        const mevcutKayit = await printerAgentKurulumunuSupabasedenCek(hedefRestaurantId);
        if (mevcutKayit?.kurulum_kodu) {
          setPrinterAgentKurulumMesaji('Mevcut kurulum kodu hazır.');
          return;
        }
      }

      const yeniKod = printerAgentKurulumKoduUret(hedefRestaurantId);

      const { data, error } = await supabase
        .from('printer_agent_kurulumlari')
        .upsert(
          {
            restaurant_id: hedefRestaurantId,
            kurulum_kodu: yeniKod,
            cihaz_adi: 'Windows Printer Agent',
            aktif: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'restaurant_id' }
        )
        .select('*')
        .single();

      if (error) {
        console.error('Printer Agent kurulum kodu kaydedilemedi:', error);
        alert('Printer Agent kurulum kodu kaydedilemedi: ' + error.message);
        return;
      }

      setPrinterAgentKurulumu(data);
      setPrinterAgentKurulumMesaji(yeniKodUret ? 'Yeni kurulum kodu oluşturuldu.' : 'Kurulum kodu oluşturuldu.');
    } finally {
      setPrinterAgentKurulumYukleniyor(false);
    }
  };

  // Printer Agent kurulum kodunu panoya kopyalayan kod
  const printerAgentKurulumKoduKopyala = async () => {
    const kod = String(printerAgentKurulumu?.kurulum_kodu || '').trim();

    if (!kod) {
      alert('Önce kurulum kodu oluşturun.');
      return;
    }

    try {
      await navigator.clipboard.writeText(kod);
      setPrinterAgentKurulumMesaji('Kurulum kodu kopyalandı.');
    } catch {
      window.prompt('Kurulum kodunu kopyalayın:', kod);
    }
  };

  // yazdırma kuyruğuna iş eklenip eklenmeyeceğini belirleyen kod
  const fisKuyruguAktifMi = (fisTipi = 'adisyon', yaziciTipi = 'adisyon') => {
    const tip = String(fisTipi || '').toLocaleLowerCase('tr-TR');
    const yazici = String(yaziciTipi || '').toLocaleLowerCase('tr-TR');

    if (tip.includes('iptal')) return yaziciAyarlari.iptalFisiAktif !== false;
    if (tip.includes('paket')) return yaziciAyarlari.paketFisiAktif !== false;
    if (tip.includes('z')) return yaziciAyarlari.zRaporuAktif !== false;
    if (tip.includes('hesap') || tip.includes('odeme') || tip.includes('ödeme')) return yaziciAyarlari.odemeFisiAktif !== false;
    if (yazici === 'mutfak' || yazici === 'bar' || tip.includes('mutfak') || tip.includes('bar') || tip.includes('hazirlama')) return yaziciAyarlari.mutfakFisiAktif !== false;
    return yaziciAyarlari.adisyonFisiAktif !== false;
  };

  // şablon içindeki {alan} değerlerini gerçek fiş verisiyle dolduran kod
  const sablonDegiskenleriniUygula = (sablonText = '', degiskenler = {}) => {
    return String(sablonText || '').replace(/\{([a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]+)\}/g, (tamamı, anahtar) => {
      const deger = degiskenler[anahtar];
      if (deger === undefined || deger === null) return '';
      return String(deger);
    });
  };

  // kayıtlı fiş şablonu varsa onu, yoksa varsayılan metni kullanan kod
  const fisSablonTextHazirla = (fisTipi, degiskenler, varsayilanText) => {
    const sablon = fisSablonuBul(fisTipi);
    if (!sablon || sablon.aktif === false || !String(sablon.sablonText || '').trim()) {
      return varsayilanText;
    }

    const sonuc = sablonDegiskenleriniUygula(sablon.sablonText, degiskenler).replace(/\n/g, '\r\n');
    return String(sonuc || '').trim() || varsayilanText;
  };

  // yazdırma HTML'i içinde özel karakterleri güvenli hale getiren kod
  const htmlGuvenli = (deger) => {
    return String(deger ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // fiş ayarlarını uygulama formatına çeviren kod
  const fisAyarlariKaydiniTemizle = (kayit = {}) => {
    return {
      firmaAdi: kayit.firmaAdi ?? kayit.firma_adi ?? '',
      firmaTelefon: kayit.firmaTelefon ?? kayit.firma_telefon ?? '',
      firmaAdres: kayit.firmaAdres ?? kayit.firma_adres ?? '',
      vergiBilgisi: kayit.vergiBilgisi ?? kayit.vergi_bilgisi ?? '',
      fisAltNotu: kayit.fisAltNotu ?? kayit.fis_alt_notu ?? 'Bizi tercih ettiğiniz için teşekkür ederiz.',
      adisyonYaziciAdi: kayit.adisyonYaziciAdi ?? kayit.adisyon_yazici_adi ?? 'Adisyon Yazıcısı',
      adisyonYaziciNo: kayit.adisyonYaziciNo ?? kayit.adisyon_yazici_no ?? '',
      mutfakYaziciAdi: kayit.mutfakYaziciAdi ?? kayit.mutfak_yazici_adi ?? 'Mutfak Yazıcısı',
      mutfakYaziciNo: kayit.mutfakYaziciNo ?? kayit.mutfak_yazici_no ?? '',
      barYaziciAdi: kayit.barYaziciAdi ?? kayit.bar_yazici_adi ?? 'Bar / İçecek Yazıcısı',
      barYaziciNo: kayit.barYaziciNo ?? kayit.bar_yazici_no ?? '',
      mutfakFisYazdirmaModu: kayit.mutfakFisYazdirmaModu ?? kayit.mutfak_fis_yazdirma_modu ?? 'sor',
    };
  };

  // termal fişlerin üst firma bilgisini hazırlayan kod
  const fisBaslikHtml = (altBaslik = 'Fiş') => {
    const ayarlar = {
      ...varsayilanFisAyarlari(user?.restaurant || ''),
      ...fisAyarlari,
    };

    const firmaAdi = htmlGuvenli(ayarlar.firmaAdi || user?.restaurant || 'Integra POS');
    const telefon = String(ayarlar.firmaTelefon || '').trim();
    const adres = String(ayarlar.firmaAdres || '').trim();
    const vergiBilgisi = String(ayarlar.vergiBilgisi || '').trim();

    return `
      <div class="center">
        <div class="title">${firmaAdi}</div>
        ${telefon ? `<div class="subtitle">Tel: ${htmlGuvenli(telefon)}</div>` : ''}
        ${adres ? `<div class="subtitle">${htmlGuvenli(adres)}</div>` : ''}
        ${vergiBilgisi ? `<div class="subtitle">${htmlGuvenli(vergiBilgisi)}</div>` : ''}
        <div class="subtitle"><strong>${htmlGuvenli(altBaslik)}</strong></div>
      </div>
    `;
  };

  // fiş alt notunu hazırlayan kod
  const fisAltNotHtml = (varsayilanMetin = 'Bizi tercih ettiğiniz için teşekkür ederiz.') => {
    const notMetni = String(fisAyarlari?.fisAltNotu || varsayilanMetin || '').trim();
    return notMetni ? `<div class="thanks">${htmlGuvenli(notMetni)}</div>` : '';
  };

  // yazıcı adını ve numarasını tek satırda göstermek için hazırlayan kod
  const yaziciEtiketiHazirla = (adi, no, varsayilanAdi = 'Yazıcı') => {
    const temizAdi = String(adi || varsayilanAdi || 'Yazıcı').trim();
    const temizNo = String(no || '').trim();
    return temizNo ? `${temizAdi} / No: ${temizNo}` : temizAdi;
  };

  // departmana göre mutfak/bar yazıcı hedefini belirleyen kod
  const yaziciHedefiBul = (departman = '', tip = 'mutfak') => {
    const ayarlar = {
      ...varsayilanFisAyarlari(user?.restaurant || ''),
      ...fisAyarlari,
    };

    if (tip === 'adisyon') {
      return {
        tur: 'Adisyon',
        adi: ayarlar.adisyonYaziciAdi || 'Adisyon Yazıcısı',
        no: ayarlar.adisyonYaziciNo || '',
        departman: 'Adisyon',
      };
    }

    const normalDepartman = yaziciDepartmaniniNormalizeEt(departman);
    const barDepartmani = normalDepartman === 'Bar';

    if (barDepartmani) {
      return {
        tur: 'Bar / İçecek',
        adi: ayarlar.barYaziciAdi || ayarlar.mutfakYaziciAdi || 'Bar / İçecek Yazıcısı',
        no: ayarlar.barYaziciNo || ayarlar.mutfakYaziciNo || '',
        departman: departman || 'Bar',
      };
    }

    return {
      tur: 'Mutfak',
      adi: ayarlar.mutfakYaziciAdi || 'Mutfak Yazıcısı',
      no: ayarlar.mutfakYaziciNo || '',
      departman: departman || 'Mutfak',
    };
  };

  // yazıcı hedefini kullanıcıya okunur metne çeviren kod
  const yaziciHedefEtiketi = (hedef) => {
    if (!hedef) return 'Yazıcı seçilmedi';
    return `${hedef.tur}: ${yaziciEtiketiHazirla(hedef.adi, hedef.no, hedef.tur)}`;
  };

  // birden fazla mutfak fişi varsa hedef yazıcıya göre gruplayan kod
  const mutfakFisleriniYaziciyaGoreGrupla = (fisler = []) => {
    const gruplar = {};

    (Array.isArray(fisler) ? fisler : []).filter(Boolean).forEach(fis => {
      const hedef = yaziciHedefiBul(fis.departman || 'Mutfak', 'mutfak');
      const key = `${hedef.tur}|${hedef.adi}|${hedef.no}`;

      if (!gruplar[key]) {
        gruplar[key] = { key, hedef, fisler: [] };
      }

      gruplar[key].fisler.push(fis);
    });

    return Object.values(gruplar);
  };

  // mutfak fişi modalında hangi yazıcılara gideceğini özetleyen kod
  const mutfakFisYaziciOzeti = (fisler = []) => {
    const gruplar = mutfakFisleriniYaziciyaGoreGrupla(fisler);
    if (gruplar.length === 0) return yaziciHedefEtiketi(yaziciHedefiBul('Mutfak', 'mutfak'));
    return gruplar.map(grup => `${yaziciHedefEtiketi(grup.hedef)} (${grup.fisler.length} fiş)`).join(' • ');
  };

  // sipariş satırlarının brüt toplamını hesaplayan kod
  const siparislerAraToplamHesapla = (siparisler = []) => {
    return (Array.isArray(siparisler) ? siparisler : []).reduce((toplam, s) => {
      return toplam + Number(s.fiyat || 0) * Number(s.adet || 1);
    }, 0);
  };

  // para değerlerini ekranda düzgün göstermek için iki haneye yuvarlayan kod
  const paraYuvarla = (deger) => {
    const sayi = Number(deger || 0);
    if (!Number.isFinite(sayi)) return 0;
    return Math.round(sayi * 100) / 100;
  };

  // depo sayımı ekranında farklı alan adlarıyla gelen stok değerlerini tek formata çeviren kod
  const stokMalzemeMiktari = (malzeme = {}) => {
    return paraYuvarla(sayiyaCevir(malzeme.stokMiktari ?? malzeme.stok_miktari ?? malzeme.miktar ?? 0));
  };

  const stokMalzemeKritikMiktari = (malzeme = {}) => {
    return paraYuvarla(sayiyaCevir(malzeme.kritikMiktar ?? malzeme.kritik_miktar ?? malzeme.kritik ?? 0));
  };

  const stokSayimKaleminiHesapla = (kalem = {}, sayilanDeger = kalem.sayilanMiktarRaw ?? kalem.sayilanMiktar ?? '') => {
    const sistemMiktari = stokMalzemeMiktari(kalem);
    const sayilanMiktarRaw = String(sayilanDeger ?? '');
    const sayildi = sayilanMiktarRaw.trim() !== '';
    const sayilanMiktar = sayildi ? paraYuvarla(sayiyaCevir(sayilanMiktarRaw)) : '';
    const farkMiktar = sayildi ? paraYuvarla(Number(sayilanMiktar || 0) - sistemMiktari) : 0;
    const birimMaliyet = paraYuvarla(sayiyaCevir(kalem.birimMaliyet ?? kalem.birim_maliyet ?? 0));

    return {
      ...kalem,
      sistemMiktari,
      sayilanMiktarRaw,
      sayilanMiktar,
      sayildi,
      farkMiktar,
      farkTutar: paraYuvarla(farkMiktar * birimMaliyet),
      kritikMiktar: stokMalzemeKritikMiktari(kalem),
      birimMaliyet,
    };
  };

  // KDV dahil satış tutarının içindeki KDV payını hesaplayan kod
  const kdvDahilTutarOzeti = (brutTutar, kdvOrani = 10) => {
    const toplam = Math.max(Number(brutTutar || 0), 0);
    const oran = Math.max(Number(kdvOrani || 0), 0);
    const kdvTutari = oran > 0 ? toplam * oran / (100 + oran) : 0;
    const matrah = Math.max(toplam - kdvTutari, 0);

    return {
      oran,
      toplam: paraYuvarla(toplam),
      matrah: paraYuvarla(matrah),
      kdvTutari: paraYuvarla(kdvTutari),
    };
  };

  // siparişlerdeki toplam KDV tutarını hesaplayan kod
  const siparislerKdvOzetiHesapla = (siparisler = [], netToplamDegeri = null) => {
    const liste = Array.isArray(siparisler) ? siparisler : [];
    const brutToplam = siparislerAraToplamHesapla(liste);
    const netToplam = netToplamDegeri === null || netToplamDegeri === undefined
      ? brutToplam
      : Math.max(Number(netToplamDegeri || 0), 0);
    const toplamIndirim = Math.min(Math.max(brutToplam - netToplam, 0), brutToplam);
    const gruplar = {};

    liste.forEach(s => {
      const adet = Math.max(Number(s.adet || 1), 0);
      const satirBrut = Math.max(Number(s.fiyat || 0) * adet, 0);
      const oran = Math.max(Number(s.kdvOrani ?? s.kdv_orani ?? 10), 0);
      const satirPayi = brutToplam > 0 ? satirBrut / brutToplam : 0;
      const satirNet = Math.max(satirBrut - toplamIndirim * satirPayi, 0);
      const satirOzeti = kdvDahilTutarOzeti(satirNet, oran);
      const key = String(oran);

      if (!gruplar[key]) {
        gruplar[key] = { oran, toplam: 0, matrah: 0, kdvTutari: 0 };
      }

      gruplar[key].toplam += satirOzeti.toplam;
      gruplar[key].matrah += satirOzeti.matrah;
      gruplar[key].kdvTutari += satirOzeti.kdvTutari;
    });

    const detaylar = Object.values(gruplar).map(g => ({
      oran: g.oran,
      toplam: paraYuvarla(g.toplam),
      matrah: paraYuvarla(g.matrah),
      kdvTutari: paraYuvarla(g.kdvTutari),
    }));

    return {
      brutToplam: paraYuvarla(brutToplam),
      netToplam: paraYuvarla(netToplam),
      matrahToplam: paraYuvarla(detaylar.reduce((t, g) => t + Number(g.matrah || 0), 0)),
      kdvToplam: paraYuvarla(detaylar.reduce((t, g) => t + Number(g.kdvTutari || 0), 0)),
      detaylar,
    };
  };

  // satış raporlarındaki tek satır için KDV hesabı yapan kod
  const satisSatiriKdvOzetiHesapla = (satisSatiri = {}) => {
    const toplam = Math.max(Number(satisSatiri.fiyat || 0) * Number(satisSatiri.adet || 1), 0);
    return kdvDahilTutarOzeti(toplam, Number(satisSatiri.kdvOrani ?? satisSatiri.kdv_orani ?? 10));
  };

  // rapordaki satış satırlarının toplam KDV özetini hesaplayan kod
  const satisKayitlariKdvOzetiHesapla = (satislar = []) => {
    const detaylar = {};

    (Array.isArray(satislar) ? satislar : []).forEach(s => {
      const satirOzeti = satisSatiriKdvOzetiHesapla(s);
      const key = String(satirOzeti.oran);

      if (!detaylar[key]) {
        detaylar[key] = { oran: satirOzeti.oran, toplam: 0, matrah: 0, kdvTutari: 0 };
      }

      detaylar[key].toplam += satirOzeti.toplam;
      detaylar[key].matrah += satirOzeti.matrah;
      detaylar[key].kdvTutari += satirOzeti.kdvTutari;
    });

    const liste = Object.values(detaylar).map(g => ({
      oran: g.oran,
      toplam: paraYuvarla(g.toplam),
      matrah: paraYuvarla(g.matrah),
      kdvTutari: paraYuvarla(g.kdvTutari),
    }));

    return {
      toplam: paraYuvarla(liste.reduce((t, g) => t + Number(g.toplam || 0), 0)),
      matrahToplam: paraYuvarla(liste.reduce((t, g) => t + Number(g.matrah || 0), 0)),
      kdvToplam: paraYuvarla(liste.reduce((t, g) => t + Number(g.kdvTutari || 0), 0)),
      detaylar: liste,
    };
  };

  // adisyon, hızlı satış ve paket servis genel toplam indirimini hesaplayan kod
  const toplamIndirimHesapla = (araToplam, yuzdeDegeri, tutarDegeri) => {
    const brutToplam = Math.max(Number(araToplam || 0), 0);
    const indirimYuzde = Math.min(Math.max(sayiyaCevir(yuzdeDegeri), 0), 100);
    const yuzdeIndirimTutari = brutToplam * indirimYuzde / 100;
    const tlIndirimTutari = Math.max(sayiyaCevir(tutarDegeri), 0);
    const toplamIndirim = Math.min(brutToplam, yuzdeIndirimTutari + tlIndirimTutari);
    const netToplam = Math.max(brutToplam - toplamIndirim, 0);

    return {
      brutToplam,
      indirimYuzde,
      tlIndirimTutari,
      yuzdeIndirimTutari,
      toplamIndirim,
      netToplam,
    };
  };

  // toplam indirimi satış satırlarına oransal olarak dağıtan kod
  const toplamIndirimiSatirlaraDagit = (siparisler = [], toplamIndirim = 0, araToplam = null) => {
    const brutToplam = araToplam === null ? siparislerAraToplamHesapla(siparisler) : Number(araToplam || 0);
    const indirimToplami = Math.min(Math.max(Number(toplamIndirim || 0), 0), brutToplam);

    return (Array.isArray(siparisler) ? siparisler : []).map(s => {
      const adet = Number(s.adet || 1);
      const satirBrut = Number(s.fiyat || 0) * adet;
      const satirPayi = brutToplam > 0 ? satirBrut / brutToplam : 0;
      const satirToplamIndirim = Math.min(satirBrut, indirimToplami * satirPayi);
      const satirNetToplam = Math.max(satirBrut - satirToplamIndirim, 0);
      const netBirimFiyat = adet > 0 ? satirNetToplam / adet : 0;

      return {
        kaynak: s,
        adet,
        satirBrut,
        satirToplamIndirim,
        satirNetToplam,
        netBirimFiyat,
      };
    });
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
        ...aktifMenu.map(u => ({
          id: `urun-grup-${u.menuGrubu || u.kategori || 'Genel'}`,
          restaurantId: mevcutRestaurantId,
          ad: u.menuGrubu || u.kategori || 'Genel',
          departman: u.departman || 'Mutfak',
          kdvOrani: Number(u.kdvOrani || 10),
          mutfagaGitsin: mutfakEkraniAktifMi(u),
          mutfakEkraninaGitsin: mutfakEkraniAktifMi(u),
          yaziciyaGitsin: fisYaziciAktifMi(u),
        })),
        ...(Array.isArray(menuGruplari) ? menuGruplari.filter(g => String(g.restaurantId) === String(mevcutRestaurantId)) : []),
      ].map(g => [g.ad, g])
    ).values()
  );

  // aktif menü grubunu bulan kod
  const aktifGrup =
    aktifMenuGruplari.find(g => g.ad === aktifMenuGrubu) ||
    aktifMenuGruplari[0] ||
    { ad: 'Genel', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true, mutfakEkraninaGitsin: true, yaziciyaGitsin: true };

  // aktif seçili menü grubundaki ürünleri filtreleyen kod
  const aktifMenuGrubuUrunleri = aktifMenu.filter(u => {
    return (u.menuGrubu || u.kategori || 'Genel') === (aktifGrup.ad || aktifMenuGrubu || 'Genel');
  });

  // QR menüye aktarılacak ürün ve grup verisini hazırlayan kod
  const aktifQrMenuAyari = {
    ...varsayilanQrMenuAyarlari(mevcutRestaurantId, user?.restaurant || ''),
    ...((qrMenuAyarlari || {})[String(mevcutRestaurantId)] || {}),
  };
  const qrMenuPanelLinki = qrMenuLinkiHazirla(mevcutRestaurantId);
  const qrMenuPanelKodUrl = qrKodGorselUrlHazirla(qrMenuPanelLinki, 280);
  const qrMenuPanelGruplari = qrMenuGruplariniHazirla(aktifMenu, aktifMenuGruplari, mevcutRestaurantId);
  const qrMenuPanelUrunSayisi = qrMenuPanelGruplari.reduce((toplam, g) => toplam + g.urunler.length, 0);
  const qrMenuAramaMetni = String(qrMenuArama || '').toLocaleLowerCase('tr-TR').trim();
  const qrMenuPanelFiltreliGruplari = qrMenuPanelGruplari
    .map(grup => ({
      ...grup,
      urunler: grup.urunler.filter(u => {
        const grupUyuyor = aktifQrMenuGrubu === 'Tümü' || grup.ad === aktifQrMenuGrubu;
        const aramaUyuyor = !qrMenuAramaMetni
          || String(u.ad || '').toLocaleLowerCase('tr-TR').includes(qrMenuAramaMetni)
          || String(u.aciklama || '').toLocaleLowerCase('tr-TR').includes(qrMenuAramaMetni)
          || String(grup.ad || '').toLocaleLowerCase('tr-TR').includes(qrMenuAramaMetni);

        return grupUyuyor && aramaUyuyor;
      }),
    }))
    .filter(grup => grup.urunler.length > 0);

  // adisyon ekranında aktif seçili ürün grubunu bulan kod
  const aktifAdisyonGrup =
    aktifMenuGruplari.find(g => g.ad === aktifAdisyonMenuGrubu) ||
    aktifMenuGruplari[0] ||
    { ad: 'Genel', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true, mutfakEkraninaGitsin: true, yaziciyaGitsin: true };

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
    { ad: 'Genel', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true, mutfakEkraninaGitsin: true, yaziciyaGitsin: true };

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

  // online sipariş entegrasyon bağlantılarını aktif restorana göre hazırlayan kod
  const aktifRestoranPlatformBaglantilari = (Array.isArray(platformBaglantilari) ? platformBaglantilari : []).filter(b => {
    return String(b.restaurantId || '') === String(mevcutRestaurantId || '');
  });

  const aktifPlatformBaglantisi = aktifRestoranPlatformBaglantilari.find(b => b.platform === aktifEntegrasyonPlatformu) || null;

  // online sipariş listesini aktif restoran ve seçilen duruma göre hazırlayan kod
  const aktifRestoranOnlineSiparisleri = (Array.isArray(onlineSiparisler) ? onlineSiparisler : [])
    .filter(s => String(s.restaurantId || '') === String(mevcutRestaurantId || ''))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const yeniOnlineSiparisSayisi = aktifRestoranOnlineSiparisleri.filter(s => String(s.durum || 'Yeni') === 'Yeni').length;
  const aktarilanOnlineSiparisSayisi = aktifRestoranOnlineSiparisleri.filter(s => String(s.durum || '') === 'Paket Servise Aktarıldı').length;

  const filtreliOnlineSiparisler = aktifRestoranOnlineSiparisleri.filter(s => {
    const durum = String(s.durum || 'Yeni');
    if (paketOnlineSekmesi === 'yeni') return ['Yeni', 'Onaylandı', 'Hazırlanıyor'].includes(durum);
    if (paketOnlineSekmesi === 'aktarilan') return durum === 'Paket Servise Aktarıldı' || durum === 'Teslim Edildi';
    if (paketOnlineSekmesi === 'iptal') return durum === 'İptal' || durum === 'Yok Sayıldı';
    return true;
  });

  const onlineSiparisDurumRengi = (durum = 'Yeni') => {
    const metin = String(durum || 'Yeni');
    if (metin === 'Yeni') return { backgroundColor: '#fff7ed', color: '#ea580c', borderColor: '#fed7aa' };
    if (metin === 'Onaylandı' || metin === 'Hazırlanıyor') return { backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' };
    if (metin === 'Paket Servise Aktarıldı' || metin === 'Teslim Edildi') return { backgroundColor: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' };
    if (metin === 'İptal' || metin === 'Yok Sayıldı') return { backgroundColor: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' };
    return { backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' };
  };

  const platformRenkleri = (platform = '') => {
    const metin = String(platform || '').toLocaleLowerCase('tr-TR');
    if (metin.includes('trendyol')) return { backgroundColor: '#fff7ed', color: '#f97316', borderColor: '#fed7aa' };
    if (metin.includes('getir')) return { backgroundColor: '#f5f3ff', color: '#6d28d9', borderColor: '#ddd6fe' };
    if (metin.includes('migros')) return { backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' };
    return { backgroundColor: '#f8fafc', color: '#334155', borderColor: '#e2e8f0' };
  };

  // gerçek API bilgisi olmadan platform akışını denemek için hazır test senaryolarını oluşturan kod
  const onlineTestSenaryolari = [
    { key: 'normal', label: 'Normal Sipariş', aciklama: 'Online ödendi, yeni sipariş olarak düşer.' },
    { key: 'kapida_nakit', label: 'Kapıda Nakit', aciklama: 'Kapıda nakit ödeme ve kurye notu ile gelir.' },
    { key: 'kapida_kart', label: 'Kapıda Kart', aciklama: 'Kapıda kart ödeme olarak paket servise aktarılır.' },
    { key: 'gecikmis', label: 'Gecikmiş Sipariş', aciklama: '20 dk önce gelmiş gibi görünür ve gecikme uyarısını test eder.' },
    { key: 'yogun', label: 'Yoğun Saat Paketi', aciklama: 'Aynı platformdan 3 farklı test siparişi oluşturur.' },
  ];

  const onlineTestSenaryosuBul = (senaryoKey = entegrasyonTestSenaryosu) => {
    return onlineTestSenaryolari.find(s => s.key === senaryoKey) || onlineTestSenaryolari[0];
  };

  const platformApiUyarisiMetni = (platform = aktifEntegrasyonPlatformu, baglanti = aktifPlatformBaglantisi) => {
    const hesapTuru = String(baglanti?.hesapTuru || entegrasyonFormu?.hesapTuru || 'Yemek');

    if (platform === 'Trendyol' && hesapTuru === 'Pazaryeri') {
      return 'Bu hesap Trendyol Pazaryeri / satış mağazası hesabı olarak işaretli. Bağlantı başarılı olsa bile Trendyol Yemek siparişleri dönmeyebilir; yemek tarafı için ayrı API erişimi gerekebilir.';
    }

    if (platform === 'Getir' || platform === 'Migros') {
      return `${platform} canlı sipariş çekimi için işletmeye özel API / iş ortağı erişimi gerekir. Erişim gelene kadar test modu ile tüm POS akışı denenebilir.`;
    }

    return 'Canlı sipariş çekimi için platformun yemek/market sipariş API erişimi gerekir. Test modu açıkken gerçek API çağrısı yapılmadan örnek sipariş oluşturulur.';
  };

  // online sipariş platform seçimi yapılınca formu dolduran kod
  const entegrasyonPlatformuSec = (platform) => {
    const secilenPlatform = platform || 'Trendyol';
    const mevcutKayit = aktifRestoranPlatformBaglantilari.find(b => b.platform === secilenPlatform);

    setAktifEntegrasyonPlatformu(secilenPlatform);
    setEntegrasyonMesaji('');
    setEntegrasyonFormu({
      platform: secilenPlatform,
      saticiId: mevcutKayit?.saticiId || '',
      entegrasyonReferansKodu: mevcutKayit?.entegrasyonReferansKodu || '',
      apiKey: mevcutKayit?.apiKey || '',
      apiSecret: mevcutKayit?.apiSecret || '',
      token: mevcutKayit?.token || '',
      hesapTuru: mevcutKayit?.hesapTuru || 'Yemek',
      aktif: mevcutKayit?.aktif !== false,
    });
  };

  const entegrasyonFormuGuncelle = (alan, deger) => {
    setEntegrasyonFormu(prev => ({
      ...(prev || {}),
      [alan]: deger,
    }));
  };

  // Trendyol / Getir / Migros bağlantı bilgilerini panelde kaydeden kod
  const platformBaglantisiKaydet = (e) => {
    e.preventDefault();

    if (!mevcutRestaurantId || String(mevcutRestaurantId) === 'super_admin') {
      alert('Entegrasyon kaydı için aktif restoran bulunamadı.');
      return;
    }

    if (!entegrasyonFormu.platform) {
      alert('Platform seçin.');
      return;
    }

    if (!String(entegrasyonFormu.saticiId || '').trim()) {
      alert('Satıcı ID / Cari ID alanını girin.');
      return;
    }

    const kayit = {
      id: `${mevcutRestaurantId}-${entegrasyonFormu.platform}`,
      restaurantId: mevcutRestaurantId,
      platform: entegrasyonFormu.platform,
      saticiId: String(entegrasyonFormu.saticiId || '').trim(),
      entegrasyonReferansKodu: String(entegrasyonFormu.entegrasyonReferansKodu || '').trim(),
      apiKey: String(entegrasyonFormu.apiKey || '').trim(),
      apiSecret: String(entegrasyonFormu.apiSecret || '').trim(),
      token: String(entegrasyonFormu.token || '').trim(),
      hesapTuru: entegrasyonFormu.hesapTuru || 'Yemek',
      testModu: entegrasyonTestModu,
      aktif: entegrasyonFormu.aktif !== false,
      updatedAt: new Date().toISOString(),
    };

    setPlatformBaglantilari(prev => {
      const liste = Array.isArray(prev) ? prev : [];
      const digerleri = liste.filter(b => !(String(b.restaurantId) === String(mevcutRestaurantId) && b.platform === kayit.platform));
      return [kayit, ...digerleri];
    });

    setEntegrasyonMesaji(`${kayit.platform} bağlantısı kaydedildi. ${kayit.hesapTuru === 'Pazaryeri' ? 'Bu kayıt satış mağazası/pazaryeri hesabı olarak işaretlendi; yemek siparişleri için ayrı erişim gerekebilir.' : 'Yemek/market sipariş erişimi geldiğinde backend adaptörü bu bilgileri kullanacak.'}`);
  };

  const platformBaglantisiSil = (platform = aktifEntegrasyonPlatformu) => {
    if (!window.confirm(`${platform} entegrasyon bilgileri silinsin mi?`)) return;

    setPlatformBaglantilari(prev => (Array.isArray(prev) ? prev : []).filter(b => {
      return !(String(b.restaurantId) === String(mevcutRestaurantId) && b.platform === platform);
    }));

    setEntegrasyonFormu({
      platform,
      saticiId: '',
      entegrasyonReferansKodu: '',
      apiKey: '',
      apiSecret: '',
      token: '',
      hesapTuru: 'Yemek',
      aktif: true,
    });
    setEntegrasyonMesaji(`${platform} bağlantısı silindi.`);
  };

  // backendden gelen farklı platform siparişlerini tek formata çeviren kod
  const onlineSiparisiNormalizeEt = (siparis = {}, varsayilanPlatform = aktifEntegrasyonPlatformu) => {
    const platform = siparis.platform || siparis.kaynak || varsayilanPlatform || 'Online';
    const urunler = Array.isArray(siparis.urunler)
      ? siparis.urunler
      : Array.isArray(siparis.lines)
        ? siparis.lines
        : Array.isArray(siparis.items)
          ? siparis.items
          : [];

    const temizUrunler = urunler.map((u, idx) => {
      const ad = u.ad || u.name || u.productName || u.urun_adi || `Ürün ${idx + 1}`;
      const adet = Number(u.adet || u.quantity || u.qty || 1);
      const fiyat = Number(u.fiyat || u.price || u.unitPrice || u.unit_price || 0);
      const menuUrunu = aktifMenu.find(mu => String(mu.ad || '').toLocaleLowerCase('tr-TR') === String(ad || '').toLocaleLowerCase('tr-TR'));

      return {
        urunId: menuUrunu?.id || u.urunId || u.productId || `online-${idx + 1}`,
        ad,
        adet: adet > 0 ? adet : 1,
        fiyat,
        normalFiyat: Number(menuUrunu?.fiyat || fiyat || 0),
        listeFiyati: Number(menuUrunu?.fiyat || fiyat || 0),
        satisFiyati: fiyat,
        maliyet: Number(menuUrunu?.maliyet || 0),
        menuGrubu: menuUrunu?.menuGrubu || menuUrunu?.kategori || u.menuGrubu || 'Online Sipariş',
        departman: menuUrunu?.departman || u.departman || 'Mutfak',
        kdvOrani: Number(menuUrunu?.kdvOrani || u.kdvOrani || 10),
        not: u.not || u.note || u.description || '',
      };
    });

    const hesaplananToplam = temizUrunler.reduce((toplam, u) => toplam + Number(u.fiyat || 0) * Number(u.adet || 1), 0);

    return {
      id: siparis.id || siparis.platform_order_id || siparis.orderId || `${platform}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      restaurantId: mevcutRestaurantId,
      platform,
      platformOrderId: siparis.platformOrderId || siparis.platform_order_id || siparis.orderNumber || siparis.orderId || siparis.id || `ORD-${Date.now()}`,
      musteriAdi: siparis.musteriAdi || siparis.customerName || siparis.customer_name || siparis.clientName || 'Online Müşteri',
      telefon: siparis.telefon || siparis.phone || siparis.customerPhone || siparis.customer_phone || '',
      adres: siparis.adres || siparis.address || siparis.deliveryAddress || siparis.delivery_address || '',
      notMetni: siparis.notMetni || siparis.note || siparis.customerNote || siparis.customer_note || '',
      odemeTipi: siparis.odemeTipi || siparis.paymentType || siparis.payment_type || 'Online Ödendi',
      toplam: Number(siparis.toplam || siparis.total || siparis.totalPrice || siparis.total_price || hesaplananToplam || 0),
      durum: siparis.durum || 'Yeni',
      urunler: temizUrunler,
      rawPayload: siparis.rawPayload || siparis,
      createdAt: siparis.createdAt || siparis.created_at || new Date().toISOString(),
    };
  };

  const onlineSiparisleriListeyeEkle = (liste = []) => {
    const temizListe = (Array.isArray(liste) ? liste : []).map(s => onlineSiparisiNormalizeEt(s));

    setOnlineSiparisler(prev => {
      const mevcutListe = Array.isArray(prev) ? prev : [];
      const mevcutAnahtarlar = new Set(mevcutListe.map(s => `${s.platform}-${s.platformOrderId}`));
      const yeniKayitlar = temizListe.filter(s => !mevcutAnahtarlar.has(`${s.platform}-${s.platformOrderId}`));
      return [...yeniKayitlar, ...mevcutListe];
    });

    return temizListe.length;
  };

  // online sipariş backend fonksiyonunu çağıran kod
  const onlineSiparisleriBackenddenCek = async (platform = aktifEntegrasyonPlatformu) => {
    if (!mevcutRestaurantId || String(mevcutRestaurantId) === 'super_admin') {
      alert('Online sipariş çekmek için aktif restoran bulunamadı.');
      return;
    }

    if (entegrasyonTestModu) {
      onlineTestSenaryoOlustur(platform, entegrasyonTestSenaryosu);
      setOnlineSiparisMesaji(`${platform} test modu açık. Gerçek API çağrısı yapılmadı; seçili senaryo online sipariş havuzuna eklendi.`);
      return;
    }

    const baglanti = aktifRestoranPlatformBaglantilari.find(b => b.platform === platform);
    if (!baglanti || baglanti.aktif === false) {
      alert(`${platform} bağlantısı aktif değil. Önce Entegrasyonlar ekranından kaydedin veya test modunu açın.`);
      return;
    }

    setOnlineSiparisYukleniyor(true);
    setOnlineSiparisMesaji('');

    try {
      const { data, error } = await supabase.functions.invoke('online-siparisleri-cek', {
        body: {
          restaurantId: mevcutRestaurantId,
          platform,
        },
      });

      if (error) {
        console.warn('Online sipariş backend fonksiyonu cevap vermedi:', error.message);
        setOnlineSiparisMesaji('Backend fonksiyonu henüz bağlı değil. Şimdilik test siparişiyle ekranı deneyebilirsiniz.');
        return;
      }

      const gelenSiparisler = Array.isArray(data?.siparisler)
        ? data.siparisler
        : Array.isArray(data)
          ? data
          : [];

      const adet = onlineSiparisleriListeyeEkle(gelenSiparisler);
      setOnlineSiparisMesaji(adet > 0 ? `${adet} online sipariş alındı.` : 'Yeni online sipariş bulunamadı.');
    } catch (err) {
      console.warn('Online siparişler çekilemedi:', err);
      setOnlineSiparisMesaji('Backend entegrasyonu henüz hazır değil. Test siparişi oluşturup ekran akışını deneyebilirsiniz.');
    } finally {
      setOnlineSiparisYukleniyor(false);
    }
  };

  // gerçek API bağlanmadan ekran akışını denemek için örnek online sipariş oluşturan kod
  const onlineDemoSiparisOlustur = (platform = aktifEntegrasyonPlatformu, senaryoKey = entegrasyonTestSenaryosu, sıraNo = 0) => {
    if (!mevcutRestaurantId || String(mevcutRestaurantId) === 'super_admin') {
      alert('Test siparişi için aktif restoran bulunamadı.');
      return null;
    }

    const senaryo = onlineTestSenaryosuBul(senaryoKey);
    const secilenUrunler = aktifMenu.slice(sıraNo, sıraNo + 2);
    const varsayilanUrunler = secilenUrunler.length > 0
      ? secilenUrunler.map((u, idx) => ({
          ad: u.ad,
          adet: idx === 0 ? 1 + sıraNo : 2,
          fiyat: Number(u.fiyat || 0),
          not: idx === 0 ? `${senaryo.label} / test siparişi` : '',
        }))
      : [
          { ad: 'Online Test Ürünü', adet: 1 + sıraNo, fiyat: 100, not: senaryo.label },
        ];

    const senaryoAyar = {
      normal: { odemeTipi: 'Online Ödendi', notMetni: 'Bu kayıt API bağlanmadan ekran akışını test etmek için oluşturuldu.', dakikaOnce: 0 },
      kapida_nakit: { odemeTipi: 'Kapıda Nakit', notMetni: 'Kapıda nakit alınacak. Kurye para üstü kontrol etsin.', dakikaOnce: 3 },
      kapida_kart: { odemeTipi: 'Kapıda Kart', notMetni: 'Kapıda POS ile kart ödeme alınacak.', dakikaOnce: 4 },
      gecikmis: { odemeTipi: 'Online Ödendi', notMetni: 'Gecikme uyarısını test etmek için 20 dk önce gelmiş gibi oluşturuldu.', dakikaOnce: 20 },
      yogun: { odemeTipi: sıraNo % 2 === 0 ? 'Online Ödendi' : 'Kapıda Nakit', notMetni: 'Yoğun saat test paketi siparişi.', dakikaOnce: sıraNo * 2 },
    }[senaryo.key] || {};

    const createdAt = new Date(Date.now() - Number(senaryoAyar.dakikaOnce || 0) * 60000).toISOString();
    const demoSiparis = onlineSiparisiNormalizeEt({
      platform,
      platformOrderId: `${platform.slice(0, 2).toUpperCase()}-TEST-${Date.now().toString().slice(-6)}${sıraNo ? `-${sıraNo + 1}` : ''}`,
      musteriAdi: `${platform} ${senaryo.label} Müşterisi${sıraNo ? ` ${sıraNo + 1}` : ''}`,
      telefon: '05xx xxx xx xx',
      adres: `Test Mahallesi, ${platform} ${senaryo.label} Sokak No:${sıraNo + 1}`,
      notMetni: senaryoAyar.notMetni || senaryo.aciklama,
      odemeTipi: senaryoAyar.odemeTipi || 'Online Ödendi',
      urunler: varsayilanUrunler,
      durum: 'Yeni',
      createdAt,
      rawPayload: { testModu: true, senaryo: senaryo.key, kaynak: 'Integra POS demo' },
    }, platform);

    setOnlineSiparisler(prev => [demoSiparis, ...(Array.isArray(prev) ? prev : [])]);
    setPaketOnlineSekmesi('yeni');
    setOnlineSiparisMesaji(`${platform} ${senaryo.label} test siparişi online sipariş havuzuna eklendi.`);
    return demoSiparis;
  };

  const onlineTestSenaryoOlustur = (platform = aktifEntegrasyonPlatformu, senaryoKey = entegrasyonTestSenaryosu) => {
    const senaryo = onlineTestSenaryosuBul(senaryoKey);

    if (senaryo.key === 'yogun') {
      const siparisler = [0, 1, 2]
        .map(index => onlineDemoSiparisOlustur(platform, senaryo.key, index))
        .filter(Boolean);
      setOnlineSiparisMesaji(`${platform} yoğun saat test paketi oluşturuldu: ${siparisler.length} sipariş havuza eklendi.`);
      return siparisler;
    }

    return onlineDemoSiparisOlustur(platform, senaryo.key, 0);
  };

  const onlineSiparisDurumuGuncelle = (siparisId, yeniDurum, ekstra = {}) => {
    setOnlineSiparisler(prev => (Array.isArray(prev) ? prev : []).map(s => {
      if (String(s.id) === String(siparisId)) {
        return { ...s, ...ekstra, durum: yeniDurum, updatedAt: new Date().toISOString() };
      }
      return s;
    }));
  };

  // online siparişi mevcut paket servis sistemine aktaran kod
  const onlineSiparisiPaketServiseAktar = async (onlineSiparis) => {
    if (!onlineSiparis) return;

    if (!Array.isArray(onlineSiparis.urunler) || onlineSiparis.urunler.length === 0) {
      alert('Aktarılacak online siparişte ürün yok.');
      return;
    }

    const paketUrunleri = onlineSiparis.urunler.map((u, idx) => {
      const menuUrunu = aktifMenu.find(mu => {
        return String(mu.id) === String(u.urunId) || String(mu.ad || '').toLocaleLowerCase('tr-TR') === String(u.ad || '').toLocaleLowerCase('tr-TR');
      });

      return {
        urunId: menuUrunu?.id || u.urunId || `online-${idx}`,
        ad: u.ad || menuUrunu?.ad || `Ürün ${idx + 1}`,
        fiyat: Number(u.fiyat || u.satisFiyati || menuUrunu?.fiyat || 0),
        adet: Number(u.adet || 1),
        not: u.not || onlineSiparis.notMetni || '',
        normalFiyat: Number(u.normalFiyat || menuUrunu?.fiyat || u.fiyat || 0),
        listeFiyati: Number(u.listeFiyati || menuUrunu?.fiyat || u.fiyat || 0),
        satisFiyati: Number(u.satisFiyati || u.fiyat || menuUrunu?.fiyat || 0),
        maliyet: Number(u.maliyet || menuUrunu?.maliyet || 0),
        menuGrubu: u.menuGrubu || menuUrunu?.menuGrubu || menuUrunu?.kategori || 'Online Sipariş',
        departman: u.departman || menuUrunu?.departman || 'Mutfak',
        kdvOrani: Number(u.kdvOrani || menuUrunu?.kdvOrani || 10),
      };
    });

    const toplam = Number(onlineSiparis.toplam || siparislerAraToplamHesapla(paketUrunleri) || 0);
    const notMetni = [
      `${onlineSiparis.platform || 'Online'} Sipariş No: ${onlineSiparis.platformOrderId || '-'}`,
      onlineSiparis.odemeTipi ? `Ödeme: ${onlineSiparis.odemeTipi}` : '',
      onlineSiparis.notMetni || '',
    ].filter(Boolean).join(' | ');

    const { data, error } = await supabase
      .from('paket_siparisleri')
      .insert([
        {
          restaurant_id: mevcutRestaurantId,
          paket_musteri_id: null,
          musteri_adi: onlineSiparis.musteriAdi || 'Online Müşteri',
          telefon: onlineSiparis.telefon || '',
          adres: onlineSiparis.adres || '',
          not_metni: notMetni,
          durum: 'Hazırlanıyor',
          odeme_tipi: 'Bekliyor',
          tutar: toplam,
          brut_tutar: toplam,
          indirim_yuzde: 0,
          indirim_tutari: 0,
          urunler: paketUrunleri,
          odendi: false,
          alinan_tutar: 0,
          para_ustu: 0,
          kapanis_saati: null,
          kurye_adi: '',
          kurye_personel_id: null,
          yola_cikis_saati: null,
          teslim_saati: null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Online sipariş paket servise aktarılamadı:', error);
      alert('Online sipariş paket servise aktarılamadı: ' + error.message);
      return;
    }

    const yeniPaket = {
      id: data.id,
      restaurantId: data.restaurant_id,
      paketMusteriId: null,
      musteriAdi: data.musteri_adi || onlineSiparis.musteriAdi || 'Online Müşteri',
      telefon: data.telefon || onlineSiparis.telefon || '',
      adres: data.adres || onlineSiparis.adres || '',
      notMetni: data.not_metni || notMetni,
      durum: data.durum || 'Hazırlanıyor',
      odemeTipi: data.odeme_tipi || 'Bekliyor',
      tutar: Number(data.tutar || toplam),
      brutTutar: Number(data.brut_tutar || toplam),
      indirimYuzde: 0,
      indirimTutari: 0,
      urunler: Array.isArray(data.urunler) ? data.urunler : paketUrunleri,
      odendi: Boolean(data.odendi),
      alinanTutar: 0,
      paraUstu: 0,
      kapanisSaati: null,
      kuryeAdi: '',
      kuryePersonelId: null,
      yolaCikisSaati: null,
      teslimSaati: null,
      createdAt: data.created_at,
      kaynakPlatform: onlineSiparis.platform || 'Online',
      platformOrderId: onlineSiparis.platformOrderId || '',
    };

    const onlineMutfakKayitlari = paketUrunleri
      .filter(paketUrun => {
        const menuUrunu = aktifMenu.find(u => String(u.id) === String(paketUrun.urunId));
        return mutfakEkraniAktifMi(paketUrun) && mutfakEkraniAktifMi(menuUrunu);
      })
      .map(paketUrun => ({
        restaurant_id: mevcutRestaurantId,
        masa_id: null,
        masa_adi: `${onlineSiparis.platform || 'Online'} - ${onlineSiparis.musteriAdi || 'Müşteri'}`,
        urun_adi: paketUrun.ad,
        adet: Number(paketUrun.adet || 1),
        not_metni: [paketUrun.not ? `Ürün Notu: ${paketUrun.not}` : '', notMetni].filter(Boolean).join(' | '),
        departman: paketUrun.departman || 'Mutfak',
        garson_adi: onlineSiparis.platform || 'Online Sipariş',
        durum: 'Bekliyor',
        yazdirildi: !fisYaziciAktifMi(paketUrun),
      }));

    if (onlineMutfakKayitlari.length > 0) {
      const { data: mutfakData, error: mutfakError } = await supabase
        .from('mutfak_fisleri')
        .insert(onlineMutfakKayitlari)
        .select();

      if (mutfakError) {
        console.error('Online sipariş mutfak fişi oluşturulamadı:', mutfakError);
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
          garsonAdi: f.garson_adi || onlineSiparis.platform || 'Online Sipariş',
          durum: f.durum || 'Bekliyor',
          createdAt: f.created_at,
        }));

        setMutfakFisleri(prev => [
          ...yeniMutfakFisleri,
          ...(Array.isArray(prev) ? prev : []),
        ]);

        mutfakFisYazdirmaKontrolEt(yeniMutfakFisleri);
      }
    }

    setPaketSiparisleri(prev => [yeniPaket, ...(Array.isArray(prev) ? prev : [])]);
    onlineSiparisDurumuGuncelle(onlineSiparis.id, 'Paket Servise Aktarıldı', { paketSiparisId: yeniPaket.id });
    setOnlineSiparisMesaji(`${onlineSiparis.platform || 'Online'} siparişi paket servise aktarıldı.`);
  };

  // QR menü ayar alanını güncelleyen kod
  const qrMenuAyariGuncelle = (alan, deger) => {
    if (!mevcutRestaurantId) return;

    const key = String(mevcutRestaurantId);
    setQrMenuAyarlari(prev => ({
      ...(prev || {}),
      [key]: {
        ...varsayilanQrMenuAyarlari(mevcutRestaurantId, user?.restaurant || ''),
        ...((prev || {})[key] || {}),
        restaurantId: mevcutRestaurantId,
        [alan]: deger,
      },
    }));
  };

  // QR menü linkini panoya kopyalayan kod
  const qrMenuLinkiniKopyala = async () => {
    const link = qrMenuLinkiHazirla(mevcutRestaurantId);

    try {
      await navigator.clipboard.writeText(link);
      setQrMenuMesaji('QR menü linki panoya kopyalandı.');
    } catch {
      window.prompt('QR menü linkini kopyalayın:', link);
    }
  };

  // QR kod çıktısı almak için ayrı yazdırma penceresi açan kod
  const qrMenuKoduYazdir = () => {
    const link = qrMenuLinkiHazirla(mevcutRestaurantId);
    const qrUrl = qrKodGorselUrlHazirla(link, 360);
    const ayar = { ...varsayilanQrMenuAyarlari(mevcutRestaurantId, user?.restaurant || ''), ...aktifQrMenuAyari };
    const pencere = window.open('', '_blank', 'width=460,height=640');

    if (!pencere) {
      alert('Yazdırma penceresi açılamadı. Tarayıcı açılır pencere iznini kontrol edin.');
      return;
    }

    pencere.document.write(`
      <html>
        <head>
          <title>QR Menü</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 28px; text-align: center; color: #0f172a; }
            .card { border: 1px solid #e2e8f0; border-radius: 22px; padding: 26px; max-width: 360px; margin: 0 auto; }
            h1 { font-size: 24px; margin: 0 0 8px; }
            p { color: #64748b; margin: 0 0 18px; line-height: 1.5; }
            img { width: 300px; height: 300px; }
            .link { margin-top: 16px; font-size: 11px; color: #475569; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${htmlGuvenli(ayar.baslik || user?.restaurant || 'QR Menü')}</h1>
            <p>${htmlGuvenli(ayar.aciklama || 'Menümüzü görüntülemek için QR kodu okutun.')}</p>
            <img src="${htmlGuvenli(qrUrl)}" alt="QR Menü" />
            <div class="link">${htmlGuvenli(link)}</div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    pencere.document.close();
  };

  // herkese açık QR menü linki açıldığında restoranın ürün ve grup verisini çeken kod
  async function qrMenuyuSupabasedenCek(restaurantId) {
    if (!restaurantId) return;

    setQrMenuYukleniyor(true);
    setQrMenuHatasi('');

    try {
      const [restoranSonuc, grupSonuc, urunSonuc, masaSonuc] = await Promise.all([
        supabase
          .from('restaurants')
          .select('*')
          .eq('id', restaurantId)
          .maybeSingle(),
        supabase
          .from('menu_gruplari')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('id', { ascending: true }),
        supabase
          .from('menu_urunleri')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('id', { ascending: true }),
        supabase
          .from('masalar')
          .select('id, restaurant_id, ad, bolum')
          .eq('restaurant_id', restaurantId)
          .order('id', { ascending: true }),
      ]);

      if (restoranSonuc.error) throw restoranSonuc.error;
      if (grupSonuc.error) throw grupSonuc.error;
      if (urunSonuc.error) throw urunSonuc.error;
      if (masaSonuc.error) throw masaSonuc.error;

      const restoran = restoranSonuc.data
        ? restoranSatiriniHazirla(restoranSonuc.data)
        : { id: restaurantId, ad: 'Dijital Menü' };

      const temizGruplar = (Array.isArray(grupSonuc.data) ? grupSonuc.data : []).map(g => ({
        id: g.id,
        restaurantId: g.restaurant_id,
        ad: g.ad || 'Genel',
        departman: g.departman || 'Mutfak',
        kdvOrani: Number(g.kdv_orani || 10),
      }));

      const temizUrunler = (Array.isArray(urunSonuc.data) ? urunSonuc.data : []).map(u => ({
        id: u.id,
        restaurantId: u.restaurant_id,
        ad: u.ad || 'Ürün',
        fiyat: Number(u.fiyat || 0),
        maliyet: Number(u.maliyet || 0),
        kategori: u.menu_grubu || u.kategori || 'Genel',
        menuGrubu: u.menu_grubu || u.kategori || 'Genel',
        departman: u.departman || 'Mutfak',
        kdvOrani: Number(u.kdv_orani || 10),
        menuNotlari: Array.isArray(u.menu_notlari) ? u.menu_notlari : [],
        resimUrl: u.resim_url || u.resimUrl || '',
        aciklama: u.aciklama || u.description || '',
        qrMenudeGorunsun: (u.qr_menude_gorunsun ?? u.qrMenudeGorunsun ?? true) !== false,
        satistaAktif: (u.satista_aktif ?? u.satistaAktif ?? u.aktif ?? true) !== false,
        favori: Boolean(u.favori),
      }));

      const temizMasalar = (Array.isArray(masaSonuc.data) ? masaSonuc.data : []).map(m => ({
        id: m.id,
        restaurantId: m.restaurant_id,
        ad: m.ad || `Masa ${m.id}`,
        bolum: m.bolum || 'Salon',
      }));

      setQrMenuRestoran(restoran);
      setQrMenuPublicGruplari(temizGruplar);
      setQrMenuPublicUrunleri(temizUrunler);
      setQrMenuPublicMasalar(temizMasalar);
    } catch (err) {
      console.error('QR menü verisi çekilemedi:', err);
      setQrMenuHatasi('QR menü şu anda yüklenemedi. Lütfen işletmeden destek isteyin.');
    } finally {
      setQrMenuYukleniyor(false);
    }
  }


  // QR sipariş, servis, sadakat, kiosk ve satın alma modüllerinde kullanılan yardımcı kodlar
  const aktifServisTalepleri = (Array.isArray(servisTalepleri) ? servisTalepleri : [])
    .filter(t => String(t.restaurantId || '') === String(mevcutRestaurantId || ''))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const acikServisTalebiSayisi = aktifServisTalepleri.filter(t => String(t.durum || 'Açık') === 'Açık').length;

  const aktifSadakatMusterileri = (Array.isArray(sadakatMusterileri) ? sadakatMusterileri : [])
    .filter(m => String(m.restaurantId || '') === String(mevcutRestaurantId || ''))
    .sort((a, b) => Number(b.puan || 0) - Number(a.puan || 0));
  const sadakatToplamPuan = aktifSadakatMusterileri.reduce((toplam, m) => toplam + Number(m.puan || 0), 0);
  const sadakatToplamZiyaret = aktifSadakatMusterileri.reduce((toplam, m) => toplam + Number(m.ziyaret || 0), 0);

  const bugunkuRezervasyonlar = (Array.isArray(rezervasyonlar) ? rezervasyonlar : []).filter(r => {
    return String(r.restaurantId || '') === String(mevcutRestaurantId || '') && String(r.rezervasyonZamani || '').slice(0, 10) === bugunRaporTarihi;
  });

  const gecikenOnlineSiparisSayisi = aktifRestoranOnlineSiparisleri.filter(s => {
    const durum = String(s.durum || 'Yeni');
    if (durum === 'Paket Servise Aktarıldı' || durum === 'İptal' || durum === 'Yok Sayıldı' || durum === 'Teslim Edildi') return false;
    const dakika = (Date.now() - new Date(s.createdAt || Date.now()).getTime()) / 60000;
    return dakika >= 15;
  }).length;

  const platformOzetleri = entegrasyonPlatformSecenekleri.map(platform => {
    const liste = aktifRestoranOnlineSiparisleri.filter(s => String(s.platform || '') === platform);
    return {
      platform,
      adet: liste.length,
      yeni: liste.filter(s => String(s.durum || 'Yeni') === 'Yeni').length,
      toplam: liste.reduce((t, s) => t + Number(s.toplam || 0), 0),
    };
  });

  const islemLoguEkle = (tip, aciklama, ekstra = {}) => {
    const kayit = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      restaurantId: mevcutRestaurantId,
      tip,
      aciklama,
      kullanici: user?.email || user?.restaurant || 'Sistem',
      createdAt: new Date().toISOString(),
      ...ekstra,
    };

    setIslemLoglari(prev => [kayit, ...(Array.isArray(prev) ? prev : [])].slice(0, 120));
    return kayit;
  };

  const QR_SERVIS_TALEBI_JSON_PREFIX = '__INTEGRA_QR_SERVIS_TALEBI__';

  const servisTalebiGomuluPayloadCoz = (satir = {}) => {
    const mesaj = String(satir?.mesaj || satir?.not_metni || '').trim();
    if (!mesaj.startsWith(QR_SERVIS_TALEBI_JSON_PREFIX)) return {};

    try {
      const jsonMetni = mesaj.slice(QR_SERVIS_TALEBI_JSON_PREFIX.length);
      return JSON.parse(jsonMetni) || {};
    } catch (err) {
      console.warn('QR servis talebi gömülü payload çözülemedi:', err?.message || err);
      return {};
    }
  };

  const servisTalebiSupabaseSatiriniHazirla = (satir = {}) => {
    const gomuluPayload = servisTalebiGomuluPayloadCoz(satir);
    const payload = satir.payload || satir.raw_payload || gomuluPayload || {};
    const siparisUrunleri = satir.siparis_urunleri || satir.siparisUrunleri || payload.siparisUrunleri || payload.urunler || [];
    const masaAdi = satir.masa_adi || satir.masa_no || payload.masaAdi || payload.masaNo || '';
    const mesajMetni = String(satir.mesaj || '').startsWith(QR_SERVIS_TALEBI_JSON_PREFIX) ? (payload.notMetni || '') : satir.mesaj;

    return {
      id: satir.id,
      restaurantId: satir.restaurant_id || satir.restaurantId || payload.restaurantId || mevcutRestaurantId,
      tip: satir.talep_tipi || satir.tip || payload.tip || 'Servis Talebi',
      masaId: satir.masa_id || satir.masaId || payload.masaId || '',
      masaNo: satir.masa_no || payload.masaNo || masaAdi || '',
      masaAdi: masaAdi || payload.masaAdi || '',
      notMetni: satir.not_metni || satir.notMetni || mesajMetni || payload.notMetni || '',
      kaynak: satir.kaynak || satir.source || payload.kaynak || 'QR Menü',
      durum: satir.durum || payload.durum || 'Açık',
      siparisUrunleri: Array.isArray(siparisUrunleri) ? siparisUrunleri : [],
      toplam: Number(satir.toplam || payload.toplam || 0),
      musteriAdi: satir.musteri_adi || payload.musteriAdi || '',
      payload,
      createdAt: satir.created_at || satir.createdAt || payload.createdAt || new Date().toISOString(),
      kapandiAt: satir.tamamlanma_zamani || satir.kapandiAt || null,
    };
  };

  const servisTalebiTemelMesajiHazirla = (kayit = {}) => {
    return `${QR_SERVIS_TALEBI_JSON_PREFIX}${JSON.stringify(kayit)}`;
  };

  const servisTalebiSupabaseKaydet = async (kayit = {}) => {
    const tamSatir = {
      restaurant_id: kayit.restaurantId,
      talep_tipi: kayit.tip,
      masa_id: kayit.masaId || null,
      masa_adi: kayit.masaAdi || kayit.masaNo || '',
      masa_no: kayit.masaNo || kayit.masaAdi || '',
      mesaj: kayit.notMetni || '',
      not_metni: kayit.notMetni || '',
      kaynak: kayit.kaynak || 'QR Menü',
      durum: kayit.durum || 'Açık',
      siparis_urunleri: Array.isArray(kayit.siparisUrunleri) ? kayit.siparisUrunleri : [],
      toplam: Number(kayit.toplam || 0),
      musteri_adi: kayit.musteriAdi || '',
      payload: kayit,
    };

    const { data, error } = await supabase
      .from('servis_talepleri')
      .insert([tamSatir])
      .select()
      .single();

    if (!error) return servisTalebiSupabaseSatiriniHazirla(data || tamSatir);

    console.warn('Servis talebi tam kolonlarla kaydedilemedi, temel kayıt deneniyor:', error.message);

    const temelSatir = {
      restaurant_id: kayit.restaurantId,
      talep_tipi: kayit.tip,
      masa_id: kayit.masaId || null,
      masa_adi: kayit.masaAdi || kayit.masaNo || '',
      mesaj: servisTalebiTemelMesajiHazirla(kayit),
      durum: kayit.durum || 'Açık',
    };

    const { data: temelData, error: temelError } = await supabase
      .from('servis_talepleri')
      .insert([temelSatir])
      .select()
      .single();

    if (temelError) throw temelError;
    return servisTalebiSupabaseSatiriniHazirla(temelData || temelSatir);
  };

  const servisTalepleriniSupabasedenCek = async (restaurantId = mevcutRestaurantId) => {
    if (!restaurantId || String(restaurantId) === 'super_admin') return [];

    try {
      const { data, error } = await supabase
        .from('servis_talepleri')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.warn('Servis talepleri çekilemedi:', error.message);
        return [];
      }

      const temizListe = (Array.isArray(data) ? data : []).map(servisTalebiSupabaseSatiriniHazirla);
      setServisTalepleri(prev => {
        const lokalListe = (Array.isArray(prev) ? prev : []).filter(t => String(t.restaurantId || '') !== String(restaurantId || '') || String(t.id || '').startsWith('srv-') || String(t.id || '').startsWith('qr-'));
        const lokalTekil = lokalListe.filter(lokal => !temizListe.some(uzak => String(uzak.id) === String(lokal.id)));
        return [...temizListe, ...lokalTekil];
      });
      return temizListe;
    } catch (err) {
      console.warn('Servis talepleri okunamadı:', err?.message || err);
      return [];
    }
  };

  const servisTalebiEkle = (tip, masaNo = '', notMetni = '', kaynak = 'Panel', ekstra = {}) => {
    const kayit = {
      id: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      restaurantId: mevcutRestaurantId || qrMenuLinkRestaurantId,
      tip,
      masaId: ekstra.masaId || '',
      masaNo: String(masaNo || '').trim(),
      masaAdi: ekstra.masaAdi || String(masaNo || '').trim(),
      notMetni: String(notMetni || '').trim(),
      kaynak,
      durum: 'Açık',
      siparisUrunleri: Array.isArray(ekstra.siparisUrunleri) ? ekstra.siparisUrunleri : [],
      toplam: Number(ekstra.toplam || 0),
      musteriAdi: ekstra.musteriAdi || '',
      payload: ekstra.payload || {},
      createdAt: new Date().toISOString(),
    };

    setServisTalepleri(prev => [kayit, ...(Array.isArray(prev) ? prev : [])]);

    servisTalebiSupabaseKaydet(kayit).then(kayitliTalep => {
      setServisTalepleri(prev => (Array.isArray(prev) ? prev : []).map(t => String(t.id) === String(kayit.id) ? kayitliTalep : t));
    }).catch(err => {
      console.warn('Servis talebi Supabase kaydı atlandı:', err?.message || err);
      alert('Servis talebi veritabanına kaydedilemedi. Supabase servis_talepleri SQL izinlerini kontrol edin.');
    });

    islemLoguEkle('Servis Talebi', `${kayit.masaAdi || kayit.masaNo ? `${kayit.masaAdi || kayit.masaNo} - ` : ''}${tip}`);
    return kayit;
  };

  const servisTalebiniKapat = async (talepId) => {
    setServisTalepleri(prev => (Array.isArray(prev) ? prev : []).map(t => String(t.id) === String(talepId) ? { ...t, durum: 'Kapandı', kapandiAt: new Date().toISOString() } : t));

    if (/^\d+$/.test(String(talepId || ''))) {
      try {
        await supabase
          .from('servis_talepleri')
          .update({ durum: 'Kapandı', tamamlanma_zamani: new Date().toISOString() })
          .eq('id', talepId);
      } catch (err) {
        console.warn('Servis talebi Supabase kapatma atlandı:', err?.message || err);
      }
    }

    islemLoguEkle('Servis Talebi', 'Servis talebi kapatıldı.');
  };

  const qrSiparisTalebiniMasayaAktar = async (talep) => {
    const urunler = Array.isArray(talep?.siparisUrunleri) ? talep.siparisUrunleri : [];

    if (urunler.length === 0) {
      alert('Bu talepte aktarılacak QR sipariş ürünü yok.');
      return;
    }

    const hedefMasa = tumRestoranMasalari.find(m => {
      return String(m.id) === String(talep.masaId || '')
        || String(m.ad || '').toLocaleLowerCase('tr-TR') === String(talep.masaAdi || talep.masaNo || '').toLocaleLowerCase('tr-TR')
        || String(m.ad || '').toLocaleLowerCase('tr-TR') === `masa ${String(talep.masaNo || '').trim()}`.toLocaleLowerCase('tr-TR');
    });

    if (!hedefMasa) {
      alert('Siparişin aktarılacağı masa bulunamadı. QR menüde masa seçimini kontrol edin.');
      return;
    }

    const mevcutSiparisler = Array.isArray(hedefMasa.siparisler) ? hedefMasa.siparisler : [];
    const yeniSiparisler = [...mevcutSiparisler];

    urunler.forEach(satir => {
      const urun = aktifMenu.find(u => String(u.id) === String(satir.urunId || satir.id || '')) || satir;
      const adet = Number(satir.adet || 1);
      const notMetni = String(satir.not || satir.notMetni || talep.notMetni || '').trim();
      const birimFiyat = Number(satir.fiyat || urun.fiyat || 0);
      const mevcutIndex = yeniSiparisler.findIndex(s => {
        return String(s.urunId || '') === String(urun.id || satir.urunId || '')
          && String(s.ad || '') === String(urun.ad || satir.ad || '')
          && String(s.not || '') === String(notMetni || '')
          && Number(s.fiyat || 0) === birimFiyat;
      });

      if (mevcutIndex > -1) {
        yeniSiparisler[mevcutIndex] = {
          ...yeniSiparisler[mevcutIndex],
          adet: Number(yeniSiparisler[mevcutIndex].adet || 0) + adet,
        };
      } else {
        yeniSiparisler.push({
          urunId: urun.id || satir.urunId,
          ad: urun.ad || satir.ad || 'Ürün',
          fiyat: birimFiyat,
          normalFiyat: Number(satir.normalFiyat || satir.fiyat || urun.fiyat || 0),
          listeFiyati: Number(satir.listeFiyati || satir.fiyat || urun.fiyat || 0),
          satisFiyati: Number(satir.satisFiyati || satir.fiyat || urun.fiyat || 0),
          ekstraUcret: Number(satir.ekstraUcret || 0),
          indirimYuzde: Number(satir.indirimYuzde || 0),
          indirimTutari: Number(satir.indirimTutari || 0),
          fiyatDegistirildi: Boolean(satir.fiyatDegistirildi),
          not: notMetni,
          adet,
          resimUrl: urunGosterimResmi(urun),
          menuGrubu: urun.menuGrubu || urun.kategori || satir.menuGrubu || 'Genel',
          departman: urun.departman || satir.departman || 'Mutfak',
          kdvOrani: Number(urun.kdvOrani || satir.kdvOrani || 10),
          mutfagaGitsin: mutfakEkraniAktifMi(urun),
          mutfakEkraninaGitsin: mutfakEkraniAktifMi(urun),
          yaziciyaGitsin: fisYaziciAktifMi(urun),
          kaynak: 'QR Menü',
        });
      }
    });

    const yeniAraToplam = siparislerAraToplamHesapla(yeniSiparisler);
    const genelIndirimOzeti = toplamIndirimHesapla(
      yeniAraToplam,
      hedefMasa.adisyonIndirimYuzde || 0,
      hedefMasa.adisyonIndirimTutari || 0
    );
    const yeniTutar = genelIndirimOzeti.netToplam;
    const adisyonAcilisSaati = hedefMasa.adisyonAcilisSaati || new Date().toISOString();
    const adisyonGarsonAdi = hedefMasa.adisyonGarsonAdi || (user?.role === 'waiter' ? user?.waiterName || user?.restaurant || user?.email : 'İşletme Sahibi');
    const qrMusteriAdi = String(talep?.musteriAdi || talep?.payload?.musteriAdi || '').trim();
    const guncelMusteriAdi = qrMusteriAdi || hedefMasa.musteriAdi || '';

    const { data, error } = await supabase
      .from('masalar')
      .update({
        dolu: true,
        tutar: yeniTutar,
        brut_tutar: genelIndirimOzeti.brutToplam,
        adisyon_indirim_yuzde: genelIndirimOzeti.indirimYuzde,
        adisyon_indirim_tutari: genelIndirimOzeti.tlIndirimTutari,
        siparisler: yeniSiparisler,
        adisyon_acilis_saati: adisyonAcilisSaati,
        adisyon_garson_adi: adisyonGarsonAdi,
        musteri_adi: guncelMusteriAdi || null,
      })
      .eq('id', hedefMasa.id)
      .select()
      .single();

    if (error) {
      console.error('QR sipariş masaya aktarılamadı:', error);
      alert('QR sipariş masaya aktarılamadı: ' + error.message);
      return;
    }

    const guncelMasa = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      dolu: data.dolu || false,
      tutar: Number(data.tutar || 0),
      brutTutar: Number(data.brut_tutar || 0),
      adisyonIndirimYuzde: Number(data.adisyon_indirim_yuzde || 0),
      adisyonIndirimTutari: Number(data.adisyon_indirim_tutari || 0),
      siparisler: Array.isArray(data.siparisler) ? data.siparisler : [],
      odemeler: Array.isArray(data.odemeler) ? data.odemeler : [],
      adisyonAcilisSaati: data.adisyon_acilis_saati || adisyonAcilisSaati,
      adisyonGarsonAdi: data.adisyon_garson_adi || adisyonGarsonAdi || '',
      musteriAdi: data.musteri_adi || guncelMusteriAdi || '',
      bolum: data.bolum || hedefMasa.bolum || aktifMasaBolumu || 'Salon',
    };

    setMasalar(prev => (Array.isArray(prev) ? prev : []).map(m => String(m.id) === String(guncelMasa.id) ? guncelMasa : m));
    setSelectedMasaId(guncelMasa.id);

    const yeniFisler = [];
    for (const satir of urunler) {
      const urun = aktifMenu.find(u => String(u.id) === String(satir.urunId || satir.id || '')) || satir;
      const adet = Number(satir.adet || 1);
      const notMetni = String(satir.not || satir.notMetni || talep.notMetni || '').trim();
      const mutfakEkraninaGitsin = mutfakEkraniAktifMi(urun);
      const fizikiYaziciyaGitsin = fisYaziciAktifMi(urun);
      const departman = urun.departman || satir.departman || 'Mutfak';

      if (mutfakEkraninaGitsin) {
        try {
          const { data: mutfakData, error: mutfakError } = await supabase
            .from('mutfak_fisleri')
            .insert([{
              restaurant_id: mevcutRestaurantId,
              masa_id: hedefMasa.id,
              masa_adi: hedefMasa.ad,
              urun_adi: urun.ad || satir.ad || 'Ürün',
              adet,
              not_metni: notMetni,
              departman,
              garson_adi: adisyonGarsonAdi,
              durum: 'Bekliyor',
              yazdirildi: !fizikiYaziciyaGitsin,
            }])
            .select()
            .single();

          if (!mutfakError && mutfakData) {
            yeniFisler.push({
              id: mutfakData.id,
              restaurantId: mutfakData.restaurant_id,
              masaId: mutfakData.masa_id,
              masaAdi: mutfakData.masa_adi,
              urunAdi: mutfakData.urun_adi,
              adet: Number(mutfakData.adet || 1),
              notMetni: mutfakData.not_metni || '',
              departman: mutfakData.departman || departman,
              garsonAdi: mutfakData.garson_adi || adisyonGarsonAdi,
              durum: mutfakData.durum || 'Bekliyor',
              createdAt: mutfakData.created_at,
            });
          }
        } catch (err) {
          console.warn('QR sipariş mutfak fişi oluşturulamadı:', err?.message || err);
        }
      } else if (fizikiYaziciyaGitsin) {
        const yaziciTipi = yaziciDepartmaniniNormalizeEt(departman) === 'Bar' ? 'bar' : 'mutfak';
        await yazdirmaKuyrugunaEkle({
          yaziciTipi,
          fisTipi: 'hazirlama',
          baslik: yaziciTipi === 'bar' ? 'Bar Fişi' : 'Mutfak Fişi',
          icerikText: mutfakSiparisFisiTextHazirla({
            masaAdi: hedefMasa.ad,
            urunAdi: urun.ad || satir.ad || 'Ürün',
            adet,
            notMetni,
            departman,
            garsonAdi: adisyonGarsonAdi,
            baslik: yaziciTipi === 'bar' ? 'BAR FİŞİ' : 'MUTFAK FİŞİ',
          }),
        });
      }
    }

    if (yeniFisler.length > 0) {
      setMutfakFisleri(prev => [...yeniFisler, ...(Array.isArray(prev) ? prev : [])]);
      mutfakFisYazdirmaKontrolEt(yeniFisler);
    }

    setServisTalepleri(prev => (Array.isArray(prev) ? prev : []).map(t => String(t.id) === String(talep.id) ? { ...t, durum: 'Masaya Aktarıldı', kapandiAt: new Date().toISOString() } : t));

    if (/^\d+$/.test(String(talep.id || ''))) {
      try {
        await supabase
          .from('servis_talepleri')
          .update({ durum: 'Masaya Aktarıldı', tamamlanma_zamani: new Date().toISOString() })
          .eq('id', talep.id);
      } catch (err) {
        console.warn('QR sipariş talebi durumu güncellenemedi:', err?.message || err);
      }
    }

    islemLoguEkle('QR Sipariş', `${hedefMasa.ad} için QR sipariş masaya aktarıldı.`);
    alert(`${hedefMasa.ad} için QR sipariş masaya aktarıldı.`);
  };

  const whatsappLinkiHazirla = (telefon = '', mesaj = '') => {
    const temizTelefon = String(telefon || '').replace(/\D/g, '');
    const hedefTelefon = temizTelefon.startsWith('90') ? temizTelefon : temizTelefon ? `90${temizTelefon.replace(/^0+/, '')}` : '';
    const guvenliMesaj = encodeURIComponent(String(mesaj || ''));
    return hedefTelefon ? `https://wa.me/${hedefTelefon}?text=${guvenliMesaj}` : `https://wa.me/?text=${guvenliMesaj}`;
  };

  const whatsappMesajiAc = (telefon, mesaj) => {
    window.open(whatsappLinkiHazirla(telefon, mesaj), '_blank');
  };

  const sadakatMusterisiEkle = (e) => {
    e.preventDefault();
    if (!sadakatAdi.trim()) {
      alert('Müşteri adı girin.');
      return;
    }

    const puan = Math.max(Number(sadakatPuan || 0), 0);
    const yeniMusteri = {
      id: `sad-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      restaurantId: mevcutRestaurantId,
      ad: sadakatAdi.trim(),
      telefon: sadakatTelefon.trim(),
      puan,
      ziyaret: 1,
      toplamHarcama: 0,
      sonIslem: new Date().toISOString(),
    };

    setSadakatMusterileri(prev => [yeniMusteri, ...(Array.isArray(prev) ? prev : [])]);
    setSadakatAdi('');
    setSadakatTelefon('');
    setSadakatPuan('');
    setSadakatMesaji('Sadakat müşterisi eklendi.');
    islemLoguEkle('Sadakat', `${yeniMusteri.ad} sadakat sistemine eklendi.`);
  };

  const sadakatPuanGuncelle = (musteriId, puanDegisimi, ziyaretEkle = false) => {
    setSadakatMusterileri(prev => (Array.isArray(prev) ? prev : []).map(m => {
      if (String(m.id) !== String(musteriId)) return m;
      const yeniPuan = Math.max(Number(m.puan || 0) + Number(puanDegisimi || 0), 0);
      return { ...m, puan: yeniPuan, ziyaret: Number(m.ziyaret || 0) + (ziyaretEkle ? 1 : 0), sonIslem: new Date().toISOString() };
    }));
    islemLoguEkle('Sadakat', `Sadakat puanı güncellendi: ${puanDegisimi > 0 ? '+' : ''}${puanDegisimi}`);
  };

  const sadakatMusterileriniCaridenAktar = () => {
    const kaynakMusteriler = [
      ...(Array.isArray(cariMusteriler) ? cariMusteriler : []),
      ...(Array.isArray(paketMusterileri) ? paketMusterileri : []),
    ].filter(m => String(m.restaurantId || '') === String(mevcutRestaurantId || ''));

    let eklenen = 0;
    setSadakatMusterileri(prev => {
      const liste = Array.isArray(prev) ? prev : [];
      const mevcutTelefonlar = new Set(liste.map(m => String(m.telefon || '').replace(/\D/g, '')).filter(Boolean));
      const yeniKayitlar = kaynakMusteriler
        .filter(m => String(m.ad || '').trim())
        .filter(m => {
          const tel = String(m.telefon || '').replace(/\D/g, '');
          return !tel || !mevcutTelefonlar.has(tel);
        })
        .map(m => {
          eklenen += 1;
          return {
            id: `sad-${Date.now()}-${eklenen}`,
            restaurantId: mevcutRestaurantId,
            ad: m.ad || m.musteriAdi || 'Müşteri',
            telefon: m.telefon || '',
            puan: 0,
            ziyaret: 1,
            toplamHarcama: Number(m.bakiye || 0),
            sonIslem: new Date().toISOString(),
          };
        });
      return [...yeniKayitlar, ...liste];
    });

    setSadakatMesaji(`${eklenen} müşteri sadakat sistemine aktarıldı.`);
  };

  const onlineSiparisSesiCal = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.frequency.value = 880;
      gain.gain.value = 0.05;
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 180);
    } catch {
      // tarayıcı izin vermezse sessiz geçilir
    }
  };

  const onlineSiparisKabulEt = (siparis) => {
    onlineSiparisDurumuGuncelle(siparis.id, 'Onaylandı');
    setOnlineSiparisMesaji(`${siparis.platform || 'Online'} siparişi onaylandı.`);
    islemLoguEkle('Online Sipariş', `${siparis.platform || 'Online'} siparişi onaylandı.`);
  };

  const onlineSiparisReddet = (siparis) => {
    if (!window.confirm('Online sipariş iptal / yok sayıldı olarak işaretlensin mi?')) return;
    onlineSiparisDurumuGuncelle(siparis.id, 'Yok Sayıldı');
    setOnlineSiparisMesaji(`${siparis.platform || 'Online'} siparişi yok sayıldı.`);
    islemLoguEkle('Online Sipariş', `${siparis.platform || 'Online'} siparişi yok sayıldı.`);
  };

  const kioskSepeteEkle = (urun) => {
    if (!urun) return;
    setKioskSepet(prev => {
      const liste = Array.isArray(prev) ? prev : [];
      const mevcut = liste.find(s => String(s.urunId) === String(urun.id));
      if (mevcut) {
        return liste.map(s => String(s.urunId) === String(urun.id) ? { ...s, adet: Number(s.adet || 1) + 1 } : s);
      }
      return [...liste, { urunId: urun.id, ad: urun.ad, fiyat: Number(urun.fiyat || 0), adet: 1, menuGrubu: urun.menuGrubu || urun.kategori || 'Genel', departman: urun.departman || 'Mutfak' }];
    });
  };

  const kioskSepetAdetGuncelle = (urunId, fark) => {
    setKioskSepet(prev => (Array.isArray(prev) ? prev : [])
      .map(s => String(s.urunId) === String(urunId) ? { ...s, adet: Number(s.adet || 1) + Number(fark || 0) } : s)
      .filter(s => Number(s.adet || 0) > 0));
  };

  const kioskToplam = (Array.isArray(kioskSepet) ? kioskSepet : []).reduce((t, u) => t + Number(u.fiyat || 0) * Number(u.adet || 1), 0);

  const kioskSiparisiniKasayaGonder = () => {
    if (!Array.isArray(kioskSepet) || kioskSepet.length === 0) {
      alert('Kiosk sepetine ürün ekleyin.');
      return;
    }

    const siparis = onlineSiparisiNormalizeEt({
      platform: 'Kiosk',
      platformOrderId: `KIOSK-${Date.now()}`,
      musteriAdi: kioskMusteriAdi || 'Kiosk Müşterisi',
      telefon: '',
      adres: 'Self Servis / Kiosk',
      urunler: kioskSepet,
      toplam: kioskToplam,
      odemeTipi: 'Kasada Ödenecek',
      notMetni: kioskSiparisNotu,
      durum: 'Yeni',
      createdAt: new Date().toISOString(),
    }, 'Kiosk');

    setOnlineSiparisler(prev => [siparis, ...(Array.isArray(prev) ? prev : [])]);
    setKioskSepet([]);
    setKioskMusteriAdi('');
    setKioskSiparisNotu('');
    setKioskMesaji('Kiosk siparişi online sipariş havuzuna gönderildi.');
    onlineSiparisSesiCal();
    islemLoguEkle('Kiosk', 'Kiosk siparişi oluşturuldu.');
  };

  const stokSayimFisOlustur = () => {
    const malzemeler = (Array.isArray(aktifStokMalzemeleri) ? aktifStokMalzemeleri : [])
      .filter(m => String(m.ad || '').trim());

    if (malzemeler.length === 0) {
      alert('Önce Stok > Hammadde bölümünden malzeme ekleyin. Depo sayımı bu malzemeler üzerinden yapılır.');
      return;
    }

    const kalemler = malzemeler.map(m => stokSayimKaleminiHesapla({
      malzemeId: m.id,
      malzemeAdi: m.ad,
      ad: m.ad,
      birim: m.birim || 'adet',
      stokMiktari: stokMalzemeMiktari(m),
      sistemMiktari: stokMalzemeMiktari(m),
      kritikMiktar: stokMalzemeKritikMiktari(m),
      birimMaliyet: sayiyaCevir(m.birimMaliyet || 0),
    }, ''));

    const kayit = {
      id: `sayim-${Date.now()}`,
      restaurantId: mevcutRestaurantId,
      baslik: stokSayimBaslik || 'Depo Sayımı',
      tarih: new Date().toISOString(),
      malzemeSayisi: kalemler.length,
      kritikSayisi: kalemler.filter(k => Number(k.sistemMiktari || 0) <= Number(k.kritikMiktar || 0)).length,
      sayilanKalemSayisi: 0,
      toplamFarkTutari: 0,
      kalemler,
      durum: 'Sayıma Açık',
    };

    setStokSayimKayitlari(prev => [kayit, ...(Array.isArray(prev) ? prev : [])]);
    setAktifStokSayimId(kayit.id);
    setSatinAlmaMesaji('Depo sayımı başlatıldı. Şimdi her malzeme için elindeki gerçek miktarı gir.');
    islemLoguEkle('Depo Sayımı', 'Depo sayımı başlatıldı.');
  };

  const stokSayimKaleminiGuncelle = (sayimId, malzemeId, deger) => {
    setStokSayimKayitlari(prev => (Array.isArray(prev) ? prev : []).map(kayit => {
      if (String(kayit.id) !== String(sayimId)) return kayit;

      const kalemler = (Array.isArray(kayit.kalemler) ? kayit.kalemler : []).map(kalem => {
        if (String(kalem.malzemeId) !== String(malzemeId)) return kalem;
        return stokSayimKaleminiHesapla(kalem, deger);
      });

      const sayilanKalemSayisi = kalemler.filter(k => k.sayildi).length;
      const toplamFarkTutari = paraYuvarla(kalemler.reduce((t, k) => t + Number(k.farkTutar || 0), 0));

      return {
        ...kayit,
        kalemler,
        sayilanKalemSayisi,
        toplamFarkTutari,
        updatedAt: new Date().toISOString(),
      };
    }));
  };

  const stokSayimKaydiniTamamla = async (sayimId, stoguGuncelle = false) => {
    const sayim = (Array.isArray(stokSayimKayitlari) ? stokSayimKayitlari : []).find(k => String(k.id) === String(sayimId));
    if (!sayim) {
      alert('Depo sayımı bulunamadı.');
      return;
    }

    const kalemler = (Array.isArray(sayim.kalemler) ? sayim.kalemler : []).map(k => stokSayimKaleminiHesapla(k));
    const sayilanKalemler = kalemler.filter(k => k.sayildi);

    if (sayilanKalemler.length === 0) {
      alert('Önce en az bir malzemenin sayılan gerçek miktarını girin.');
      return;
    }

    if (stoguGuncelle) {
      for (const kalem of sayilanKalemler) {
        const { error } = await supabase
          .from('stok_malzemeleri')
          .update({ stok_miktari: Number(kalem.sayilanMiktar || 0) })
          .eq('id', kalem.malzemeId)
          .eq('restaurant_id', mevcutRestaurantId);

        if (error) {
          console.error('Depo sayımı stok güncelleme hatası:', error);
          alert(`${kalem.malzemeAdi} stoğu güncellenemedi: ${error.message}`);
          return;
        }
      }

      setStokMalzemeleri(prev => (Array.isArray(prev) ? prev : []).map(m => {
        const kalem = sayilanKalemler.find(k => String(k.malzemeId) === String(m.id));
        return kalem ? { ...m, stokMiktari: Number(kalem.sayilanMiktar || 0) } : m;
      }));
    }

    const toplamFarkTutari = paraYuvarla(kalemler.reduce((t, k) => t + Number(k.farkTutar || 0), 0));
    setStokSayimKayitlari(prev => (Array.isArray(prev) ? prev : []).map(k => String(k.id) === String(sayimId) ? {
      ...k,
      kalemler,
      sayilanKalemSayisi: sayilanKalemler.length,
      toplamFarkTutari,
      durum: stoguGuncelle ? 'Tamamlandı / Stok Güncellendi' : 'Tamamlandı / Kontrol Edildi',
      tamamlandi: true,
      tamamlanmaTarihi: new Date().toISOString(),
    } : k));

    setSatinAlmaMesaji(stoguGuncelle ? 'Depo sayımı tamamlandı ve stoklar gerçek sayılan miktarlara göre güncellendi.' : 'Depo sayımı kontrol edildi. Stok miktarları değiştirilmedi.');
    islemLoguEkle('Depo Sayımı', stoguGuncelle ? 'Depo sayımı stoklara işlendi.' : 'Depo sayımı kontrol edildi.');
  };

  const stokSayimEksiklerindenSatinAlmaOlustur = (sayimId) => {
    const sayim = (Array.isArray(stokSayimKayitlari) ? stokSayimKayitlari : []).find(k => String(k.id) === String(sayimId));
    if (!sayim) return;

    const eksikler = (Array.isArray(sayim.kalemler) ? sayim.kalemler : [])
      .map(k => stokSayimKaleminiHesapla(k))
      .filter(k => k.sayildi && Number(k.sayilanMiktar || 0) <= Number(k.kritikMiktar || 0));

    if (eksikler.length === 0) {
      alert('Bu sayımda kritik seviyenin altında kalan malzeme yok.');
      return;
    }

    const yeniTalepler = eksikler.map(k => {
      const hedefMiktar = Math.max(Number(k.kritikMiktar || 0) * 2, Number(k.sayilanMiktar || 0) + 1);
      const onerilenMiktar = paraYuvarla(Math.max(hedefMiktar - Number(k.sayilanMiktar || 0), 1));
      return {
        id: `satinalma-${Date.now()}-${k.malzemeId}`,
        restaurantId: mevcutRestaurantId,
        malzemeId: k.malzemeId,
        malzemeAdi: k.malzemeAdi,
        birim: k.birim || 'adet',
        miktar: onerilenMiktar,
        tedarikci: 'Depo sayımından otomatik',
        durum: 'Talep Açıldı',
        kaynak: 'Depo Sayımı',
        createdAt: new Date().toISOString(),
      };
    });

    setSatinAlmaTalepleri(prev => [...yeniTalepler, ...(Array.isArray(prev) ? prev : [])]);
    setSatinAlmaMesaji(`${yeniTalepler.length} kritik malzeme için eksik malzeme siparişi oluşturuldu.`);
    islemLoguEkle('Satın Alma', 'Depo sayımından eksik malzeme siparişi oluşturuldu.');
  };

  const satinAlmaTalebiOlustur = (e) => {
    e.preventDefault();
    const malzeme = (Array.isArray(aktifStokMalzemeleri) ? aktifStokMalzemeleri : []).find(m => String(m.id) === String(satinAlmaMalzemeId));
    if (!malzeme) {
      alert('Malzeme seçin. Liste boşsa önce Hammadde bölümünden malzeme ekleyin.');
      return;
    }

    const miktar = Number(String(satinAlmaMiktar || '').replace(',', '.'));
    if (!miktar || miktar <= 0) {
      alert('Geçerli miktar girin.');
      return;
    }

    const kayit = {
      id: `satinalma-${Date.now()}`,
      restaurantId: mevcutRestaurantId,
      malzemeId: malzeme.id,
      malzemeAdi: malzeme.ad,
      birim: malzeme.birim || 'adet',
      mevcutStok: stokMalzemeMiktari(malzeme),
      kritikMiktar: stokMalzemeKritikMiktari(malzeme),
      miktar,
      tedarikci: satinAlmaTedarikci || 'Tedarikçi seçilmedi',
      durum: 'Talep Açıldı',
      createdAt: new Date().toISOString(),
    };

    setSatinAlmaTalepleri(prev => [kayit, ...(Array.isArray(prev) ? prev : [])]);
    setSatinAlmaMalzemeId('');
    setSatinAlmaMiktar('');
    setSatinAlmaTedarikci('');
    setSatinAlmaMesaji('Eksik malzeme siparişi oluşturuldu.');
    islemLoguEkle('Satın Alma', `${kayit.malzemeAdi} için satın alma talebi açıldı.`);
  };

  const satinAlmaDurumGuncelle = async (talepId, durum) => {
    const talep = (Array.isArray(satinAlmaTalepleri) ? satinAlmaTalepleri : []).find(t => String(t.id) === String(talepId));

    if (durum === 'Teslim Alındı' && talep && !talep.stogaIslendi) {
      const malzeme = (Array.isArray(stokMalzemeleri) ? stokMalzemeleri : []).find(m => String(m.id) === String(talep.malzemeId));
      if (!malzeme) {
        alert('Teslim alınacak malzeme stok listesinde bulunamadı.');
        return;
      }

      const yeniStok = paraYuvarla(stokMalzemeMiktari(malzeme) + sayiyaCevir(talep.miktar || 0));
      const { error } = await supabase
        .from('stok_malzemeleri')
        .update({ stok_miktari: yeniStok })
        .eq('id', talep.malzemeId)
        .eq('restaurant_id', mevcutRestaurantId);

      if (error) {
        alert('Teslim alınan malzeme stoğa işlenemedi: ' + error.message);
        return;
      }

      await supabase.from('stok_hareketleri').insert([{
        restaurant_id: mevcutRestaurantId,
        malzeme_id: talep.malzemeId,
        tip: 'Giriş',
        miktar: sayiyaCevir(talep.miktar || 0),
        aciklama: `${talep.malzemeAdi || 'Malzeme'} satın alma teslimi`,
      }]);

      setStokMalzemeleri(prev => (Array.isArray(prev) ? prev : []).map(m => String(m.id) === String(talep.malzemeId) ? { ...m, stokMiktari: yeniStok } : m));
    }

    setSatinAlmaTalepleri(prev => (Array.isArray(prev) ? prev : []).map(t => String(t.id) === String(talepId) ? {
      ...t,
      durum,
      stogaIslendi: durum === 'Teslim Alındı' ? true : t.stogaIslendi,
      updatedAt: new Date().toISOString(),
    } : t));
    islemLoguEkle('Satın Alma', `Satın alma durumu ${durum} yapıldı.`);
  };

  // alış fişi toplamını hesaplayan kod
  const alisFisToplami = (Array.isArray(alisFisKalemleri) ? alisFisKalemleri : []).reduce((toplam, kalem) => {
    return toplam + Number(kalem.miktar || 0) * Number(kalem.birimFiyat || 0);
  }, 0);

  // alış fişinde hem hammadde hem de satış ürünü seçilebilmesi için ortak liste oluşturan kod
  const alisFisiSecilebilirKalemler = [
    ...(Array.isArray(aktifStokMalzemeleri) ? aktifStokMalzemeleri : []).map(m => ({
      secimId: `malzeme:${m.id}`,
      tip: 'malzeme',
      id: m.id,
      ad: m.ad,
      birim: m.birim || 'adet',
      mevcutStok: stokMalzemeMiktari(m),
      kritikStok: stokMalzemeKritikMiktari(m),
      birimMaliyet: Number(m.birimMaliyet ?? m.birim_maliyet ?? 0),
      etiket: 'Hammadde',
    })),
    ...(Array.isArray(aktifMenu) ? aktifMenu : []).map(u => ({
      secimId: `urun:${u.id}`,
      tip: 'urun',
      id: u.id,
      ad: u.ad,
      birim: 'adet',
      mevcutStok: Number(u.stokAdedi ?? u.stok_adedi ?? 0),
      kritikStok: Number(u.kritikStok ?? u.kritik_stok ?? 0),
      birimMaliyet: Number(u.maliyet ?? 0),
      etiket: 'Satış Ürünü',
    })),
  ];

  const alisFisiKalemBul = (secimId) => {
    const temiz = String(secimId || '').trim();
    return alisFisiSecilebilirKalemler.find(k => String(k.secimId) === temiz) || null;
  };

  // hammaddeyi alış fişine hızlı seçen kod
  const alisFisineMalzemeyiSec = (malzeme) => {
    if (!malzeme) return;
    setAlisFisMalzemeId(`malzeme:${malzeme.id}`);
    setAlisFisBirimFiyat(String(malzeme.birimMaliyet || malzeme.birim_maliyet || ''));
    setAlisFisMesaji(`${malzeme.ad} seçildi. Miktarı girip alış fişine ekleyin.`);
  };

  // alış fişine kalem ekleyen kod
  const alisFisKalemiEkle = () => {
    const secilenKalem = alisFisiKalemBul(alisFisMalzemeId);
    if (!secilenKalem) {
      alert('Alış fişine eklemek için hammadde veya satış ürünü seçin. Liste boşsa önce hammadde kartı ya da menü ürünü oluşturun.');
      return;
    }

    const miktar = sayiyaCevir(alisFisMiktar);
    if (!miktar || miktar <= 0) {
      alert('Alınan miktarı girin.');
      return;
    }

    const birimFiyat = sayiyaCevir(alisFisBirimFiyat || secilenKalem.birimMaliyet || 0);
    const yeniKalem = {
      id: `${secilenKalem.tip}-${secilenKalem.id}-${Date.now()}`,
      kalemTipi: secilenKalem.tip,
      malzemeId: secilenKalem.tip === 'malzeme' ? secilenKalem.id : null,
      urunId: secilenKalem.tip === 'urun' ? secilenKalem.id : null,
      malzemeAdi: secilenKalem.ad,
      birim: secilenKalem.birim || 'adet',
      mevcutStok: Number(secilenKalem.mevcutStok || 0),
      miktar,
      birimFiyat,
      toplam: paraYuvarla(miktar * birimFiyat),
    };

    setAlisFisKalemleri(prev => {
      const liste = Array.isArray(prev) ? prev : [];
      const ayniIndex = liste.findIndex(k => {
        const ayniTip = String(k.kalemTipi || 'malzeme') === String(yeniKalem.kalemTipi);
        const ayniKayit = yeniKalem.kalemTipi === 'urun'
          ? String(k.urunId) === String(yeniKalem.urunId)
          : String(k.malzemeId) === String(yeniKalem.malzemeId);
        return ayniTip && ayniKayit && Number(k.birimFiyat || 0) === Number(birimFiyat || 0);
      });

      if (ayniIndex >= 0) {
        return liste.map((k, index) => {
          if (index !== ayniIndex) return k;
          const yeniMiktar = paraYuvarla(Number(k.miktar || 0) + miktar);
          return { ...k, miktar: yeniMiktar, toplam: paraYuvarla(yeniMiktar * Number(k.birimFiyat || 0)) };
        });
      }
      return [...liste, yeniKalem];
    });

    setAlisFisMalzemeId('');
    setAlisFisMiktar('');
    setAlisFisBirimFiyat('');
  };

  // alış fişinden kalem silen kod
  const alisFisKalemiSil = (kalemId) => {
    setAlisFisKalemleri(prev => (Array.isArray(prev) ? prev : []).filter(k => String(k.id) !== String(kalemId)));
  };

  // alış fişini kaydedip stok girişini yapan kod
  const alisFisiniKaydetVeStogaIsle = async () => {
    const kalemler = Array.isArray(alisFisKalemleri) ? alisFisKalemleri : [];
    if (kalemler.length === 0) {
      alert('Alış fişine en az bir hammadde veya ürün ekleyin.');
      return;
    }

    const toplam = paraYuvarla(kalemler.reduce((t, k) => t + Number(k.toplam || 0), 0));
    const seciliAlisCari = (Array.isArray(cariMusteriler) ? cariMusteriler : []).find(c => String(c.id) === String(alisFisCariMusteriId));

    const fis = {
      id: `alis-${Date.now()}`,
      restaurantId: mevcutRestaurantId,
      cariMusteriId: seciliAlisCari?.id || null,
      cariMusteriAdi: seciliAlisCari?.ad || '',
      tedarikci: alisFisTedarikci || seciliAlisCari?.ad || 'Tedarikçi belirtilmedi',
      belgeNo: alisFisBelgeNo || '',
      odemeTipi: alisFisOdemeTipi || 'Nakit',
      giderKategorisi: alisFisGiderKategorisi || 'Malzeme',
      notu: alisFisNotu || '',
      toplam,
      kalemler,
      giderOlarakIslendi: Boolean(alisFisGiderOlarakIsle),
      tarih: new Date().toISOString(),
      durum: 'Stoğa İşlendi',
    };

    const guncellenenMalzemeKalemleri = [];
    const guncellenenUrunKalemleri = [];

    for (const kalem of kalemler) {
      const kalemTipi = String(kalem.kalemTipi || 'malzeme');

      if (kalemTipi === 'urun') {
        const urun = (Array.isArray(menuUrunleri) ? menuUrunleri : []).find(u => String(u.id) === String(kalem.urunId));
        if (!urun) continue;

        const yeniStok = paraYuvarla(Number(urun.stokAdedi || 0) + Number(kalem.miktar || 0));
        const yeniMaliyet = Number(kalem.birimFiyat || 0) > 0 ? Number(kalem.birimFiyat || 0) : Number(urun.maliyet || 0);

        const { data, error } = await supabase
          .from('menu_urunleri')
          .update({ stok_takip: true, stok_adedi: yeniStok, maliyet: yeniMaliyet })
          .eq('id', kalem.urunId)
          .eq('restaurant_id', mevcutRestaurantId)
          .select()
          .single();

        if (error) {
          alert(`${kalem.malzemeAdi} ürün stoğuna işlenemedi: ${error.message}`);
          return;
        }

        guncellenenUrunKalemleri.push({ kalem, data, yeniStok, yeniMaliyet });
        continue;
      }

      const malzeme = (Array.isArray(stokMalzemeleri) ? stokMalzemeleri : []).find(m => String(m.id) === String(kalem.malzemeId));
      if (!malzeme) continue;

      const yeniStok = paraYuvarla(stokMalzemeMiktari(malzeme) + Number(kalem.miktar || 0));
      const yeniBirimMaliyet = Number(kalem.birimFiyat || 0) > 0 ? Number(kalem.birimFiyat || 0) : Number(malzeme.birimMaliyet || 0);

      const { data, error } = await supabase
        .from('stok_malzemeleri')
        .update({ stok_miktari: yeniStok, birim_maliyet: yeniBirimMaliyet })
        .eq('id', kalem.malzemeId)
        .eq('restaurant_id', mevcutRestaurantId)
        .select()
        .single();

      if (error) {
        alert(`${kalem.malzemeAdi} stoğa işlenemedi: ${error.message}`);
        return;
      }

      await supabase.from('stok_hareketleri').insert([{
        restaurant_id: mevcutRestaurantId,
        malzeme_id: kalem.malzemeId,
        tip: 'Giriş',
        miktar: Number(kalem.miktar || 0),
        aciklama: `Alış fişi ${fis.belgeNo || fis.id} - ${fis.tedarikci}`,
      }]);

      guncellenenMalzemeKalemleri.push({ kalem, data, yeniStok, yeniBirimMaliyet });
    }

    if (guncellenenMalzemeKalemleri.length > 0) {
      setStokMalzemeleri(prev => (Array.isArray(prev) ? prev : []).map(m => {
        const guncel = guncellenenMalzemeKalemleri.find(k => String(k.kalem.malzemeId) === String(m.id));
        if (!guncel) return m;
        return {
          ...m,
          stokMiktari: Number(guncel.data?.stok_miktari ?? guncel.yeniStok),
          birimMaliyet: Number(guncel.data?.birim_maliyet ?? guncel.yeniBirimMaliyet),
        };
      }));
    }

    if (guncellenenUrunKalemleri.length > 0) {
      setMenuUrunleri(prev => (Array.isArray(prev) ? prev : []).map(u => {
        const guncel = guncellenenUrunKalemleri.find(k => String(k.kalem.urunId) === String(u.id));
        if (!guncel) return u;
        return {
          ...u,
          stokTakip: true,
          stokAdedi: Number(guncel.data?.stok_adedi ?? guncel.yeniStok),
          maliyet: Number(guncel.data?.maliyet ?? guncel.yeniMaliyet),
        };
      }));
    }

    if (alisFisGiderOlarakIsle && toplam > 0) {
      const bugun = new Date().toISOString().split('T')[0];
      const aciklama = `Alış fişi${fis.belgeNo ? ` ${fis.belgeNo}` : ''} - ${fis.tedarikci}`;
      const { data, error } = await supabase
        .from('giderler')
        .insert([{ restaurant_id: mevcutRestaurantId, tarih: bugun, kategori: fis.giderKategorisi, aciklama, tutar: toplam }])
        .select()
        .single();

      if (!error && data) {
        setGiderler(prev => [{ id: data.id, restaurantId: data.restaurant_id, tarih: data.tarih, kategori: data.kategori, aciklama: data.aciklama || '', tutar: Number(data.tutar || 0), createdAt: data.created_at, gunSonuKapandi: false, gunSonuRaporId: null }, ...(Array.isArray(prev) ? prev : [])]);
      } else if (error) {
        console.warn('Alış fişi gider kaydı oluşturulamadı:', error.message);
      }
    }

    if (seciliAlisCari && alisFisOdemeTipi === 'Cari / Vadeli' && toplam > 0) {
      const cariAciklama = `Alış fişi${fis.belgeNo ? ` ${fis.belgeNo}` : ''} - ${fis.tedarikci}`;
      await cariHareketEkle(seciliAlisCari, 'Alacak', toplam, cariAciklama);
    }

    setAlisFisleri(prev => [fis, ...(Array.isArray(prev) ? prev : [])]);
    setAlisFisKalemleri([]);
    setAlisFisTedarikci('');
    setAlisFisCariMusteriId('');
    setAlisFisBelgeNo('');
    setAlisFisNotu('');
    setAlisFisMesaji('Alış fişi kaydedildi. Seçilen hammadde ve ürün girişleri stoklara işlendi.');
    islemLoguEkle('Alış Fişi', `Alış fişi stoğa işlendi. Toplam: ${toplam} TL`);
  };

  const aktifStokSayimKaydi = (Array.isArray(stokSayimKayitlari) ? stokSayimKayitlari : []).find(k => String(k.id) === String(aktifStokSayimId))
    || (Array.isArray(stokSayimKayitlari) ? stokSayimKayitlari : []).find(k => String(k.restaurantId) === String(mevcutRestaurantId) && !k.tamamlandi && Array.isArray(k.kalemler));

  const aktifStokSayimKalemleri = Array.isArray(aktifStokSayimKaydi?.kalemler)
    ? aktifStokSayimKaydi.kalemler.map(k => stokSayimKaleminiHesapla(k))
    : [];

  const aktifStokSayimOzeti = {
    sayilan: aktifStokSayimKalemleri.filter(k => k.sayildi).length,
    toplam: aktifStokSayimKalemleri.length,
    eksikKalem: aktifStokSayimKalemleri.filter(k => k.sayildi && Number(k.farkMiktar || 0) < 0).length,
    fazlaKalem: aktifStokSayimKalemleri.filter(k => k.sayildi && Number(k.farkMiktar || 0) > 0).length,
    toplamFarkTutari: paraYuvarla(aktifStokSayimKalemleri.reduce((t, k) => t + Number(k.farkTutar || 0), 0)),
  };

  // personel ekran yetkilerinde kullanılacak sekme seçeneklerini tutan kod
  const personelSekmeSecenekleri = [
    { key: 'masalar', label: '🪑 Masalar' },
    { key: 'mutfak', label: '👨‍🍳 Mutfak' },
    { key: 'paket', label: '🛵 Paket Servis' },
    { key: 'entegrasyonlar', label: '🔌 Entegrasyonlar' },
    { key: 'hizli_satis', label: '⚡ Hızlı Satış' },
    { key: 'menu', label: '🍔 Menü & Ayarlar' },
    { key: 'receteler', label: '🧾 Reçeteler' },
    { key: 'qr_menu', label: '📱 QR Menü' },
    { key: 'servis_talepleri', label: '🔔 Servis Talepleri' },
    { key: 'sadakat', label: '🎁 Sadakat' },
    { key: 'kiosk', label: '🧍 Kiosk' },
    { key: 'raporlar', label: '📊 Raporlar' },
    { key: 'cari', label: '📒 Cari / Veresiye' },
    { key: 'stok', label: '📦 Stok' },
    { key: 'kasa', label: '💰 Kasa' },
    { key: 'giderler', label: '🧾 Giderler' },
    { key: 'iadeler', label: '↩️ İade / İkram' },
    { key: 'rezervasyonlar', label: '📅 Rezervasyon' },
    { key: 'garsonlar', label: '👥 Personel Listesi' },
  ];


  // süper adminin işletme bazında açıp kapatabileceği modül paketlerini tutan kod
  const tumIsletmeSekmeYetkileri = () => personelSekmeSecenekleri.map(s => s.key);

  // Supabase jsonb/text[]/metin olarak gelen yetki değerlerini güvenli diziye çeviren kod
  const diziDegeriniHazirla = (deger) => {
    if (Array.isArray(deger)) return deger.filter(Boolean).map(String);

    if (typeof deger === 'string') {
      const temiz = deger.trim();
      if (!temiz) return [];

      try {
        const parseEdilen = JSON.parse(temiz);
        if (Array.isArray(parseEdilen)) return parseEdilen.filter(Boolean).map(String);
      } catch {
        // metin JSON değilse virgül veya noktalı virgülle ayrılmış liste kabul edilir
      }

      return temiz
        .split(/[;,]/)
        .map(s => s.trim())
        .filter(Boolean);
    }

    return [];
  };

  // satış paketlerine göre hazır modül/sekme şablonlarını hazırlayan kod
  const modulPaketSablonlari = [
    {
      key: 'Baslangic',
      label: 'Başlangıç',
      aciklama: 'Masa, mutfak, hızlı satış ve temel rapor isteyen küçük işletmeler.',
      sekmeler: ['masalar', 'mutfak', 'hizli_satis', 'menu', 'receteler', 'raporlar', 'kasa', 'garsonlar'],
    },
    {
      key: 'Profesyonel',
      label: 'Profesyonel',
      aciklama: 'Restoranların günlük operasyonu için en dengeli paket.',
      sekmeler: ['raporlar', 'masalar', 'mutfak', 'paket', 'hizli_satis', 'menu', 'receteler', 'qr_menu', 'servis_talepleri', 'cari', 'stok', 'kasa', 'giderler', 'iadeler', 'rezervasyonlar', 'garsonlar'],
    },
    {
      key: 'Paket Servis',
      label: 'Paket Servis Odaklı',
      aciklama: 'Paket, online sipariş havuzu, kurye ve entegrasyon ağırlıklı kullanım.',
      sekmeler: ['paket', 'entegrasyonlar', 'mutfak', 'hizli_satis', 'menu', 'receteler', 'qr_menu', 'cari', 'kasa', 'raporlar', 'servis_talepleri', 'garsonlar'],
    },
    {
      key: 'QR Plus',
      label: 'QR Menü Plus',
      aciklama: 'QR menü, masadan sipariş, servis talebi ve sadakat odaklı kullanım.',
      sekmeler: ['masalar', 'mutfak', 'menu', 'receteler', 'qr_menu', 'servis_talepleri', 'sadakat', 'raporlar', 'kasa', 'garsonlar'],
    },
    {
      key: 'Premium',
      label: 'Premium / Tüm Modüller',
      aciklama: 'Tüm sekmeler açık. Demo, satış sunumu ve tam paket müşteriler için.',
      sekmeler: tumIsletmeSekmeYetkileri(),
    },
    {
      key: 'Kurumsal',
      label: 'Kurumsal / Özel',
      aciklama: 'Tüm modüller açık; özel entegrasyon ve kurumsal kullanım için.',
      sekmeler: tumIsletmeSekmeYetkileri(),
    },
  ];

  const modulPaketSablonuBul = (paketAdi = '') => {
    const paketMetni = String(paketAdi || '').toLocaleLowerCase('tr-TR');
    return modulPaketSablonlari.find(p => {
      return paketMetni === String(p.key).toLocaleLowerCase('tr-TR') || paketMetni === String(p.label).toLocaleLowerCase('tr-TR');
    }) || modulPaketSablonlari.find(p => p.key === 'Premium');
  };

  // işletme sahibi ve personeller için işletme bazlı aktif sekmeleri hazırlayan kod
  const isletmeSekmeleriniHazirla = (sekmeler, paketAdi = 'Premium') => {
    const izinliSekmeler = tumIsletmeSekmeYetkileri();
    const kayitliListe = diziDegeriniHazirla(sekmeler).filter(s => izinliSekmeler.includes(s));
    const kaynak = kayitliListe.length > 0
      ? kayitliListe
      : modulPaketSablonuBul(paketAdi || 'Premium')?.sekmeler || izinliSekmeler;

    const temizListe = Array.from(new Set(kaynak.filter(s => izinliSekmeler.includes(s))));
    return temizListe.length > 0 ? temizListe : ['masalar'];
  };

  // göreve göre varsayılan personel ekran yetkilerini oluşturan kod
  const goreveGoreVarsayilanYetkiler = (gorev) => {
    const gorevMetni = String(gorev || '').toLocaleLowerCase('tr-TR');

    if (gorevMetni.includes('müdür') || gorevMetni.includes('mudur')) {
      return ['raporlar', 'masalar', 'mutfak', 'paket', 'cari', 'stok', 'kasa', 'hizli_satis', 'giderler', 'iadeler', 'rezervasyonlar', 'garsonlar', 'menu', 'receteler', 'qr_menu', 'servis_talepleri', 'sadakat', 'kiosk'];
    }

    if (gorevMetni.includes('mutfak')) {
      return ['mutfak'];
    }

    if (gorevMetni.includes('kurye')) {
      return ['paket'];
    }

    if (gorevMetni.includes('kasiyer')) {
      return ['masalar', 'paket', 'hizli_satis', 'cari', 'kiosk'];
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
      return ['super_admin', 'admin_lisans', 'admin_moduller', 'admin_destek'];
    }

    const isletmeAktifSekmeleri = isletmeSekmeleriniHazirla(user?.aktifSekmeler, user?.modulPaketi || user?.paketAdi || 'Premium');

    if (user?.role === 'owner') {
      return isletmeAktifSekmeleri;
    }

    const personelYetkileri = yetkiListesiniHazirla(user?.tabYetkileri, user?.personelGorev || 'Garson');
    const kesisenYetkiler = personelYetkileri.filter(y => isletmeAktifSekmeleri.includes(y));
    return kesisenYetkiler.length > 0 ? kesisenYetkiler : [isletmeAktifSekmeleri[0] || 'masalar'];
  })();

  // sekmenin kullanıcı için görünür olup olmadığını kontrol eden kod
  const tabGorunur = (tabKey) => {
    return kullaniciSekmeleri.includes(tabKey);
  };

  // giriş sonrası açılacak ilk sekmeyi seçen kod
  const ilkGirisSekmesi = (rol, yetkiler, gorev = 'Garson', isletmeSekmeleri = null) => {
    if (rol === 'super_admin') return 'super_admin';

    const aktifIsletmeSekmeleri = Array.isArray(isletmeSekmeleri) && isletmeSekmeleri.length > 0
      ? isletmeSekmeleri
      : isletmeSekmeleriniHazirla(null, 'Premium');

    if (rol === 'owner') {
      return aktifIsletmeSekmeleri.includes('raporlar') ? 'raporlar' : aktifIsletmeSekmeleri[0] || 'masalar';
    }

    const personelYetkileri = yetkiListesiniHazirla(yetkiler, gorev).filter(y => aktifIsletmeSekmeleri.includes(y));
    return personelYetkileri[0] || aktifIsletmeSekmeleri[0] || 'masalar';
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

  // hızlı satışta cariye yazma alanında müşterileri arama metnine göre filtreleyen kod
  const hizliSatisCariAramaMetni = String(hizliSatisCariArama || '').toLocaleLowerCase('tr-TR').trim();
  const filtreliHizliSatisCariMusterileri = cariMusteriler
    .filter(c => {
      const arananAlan = `${c.ad || ''} ${c.telefon || ''} ${c.notMetni || ''}`.toLocaleLowerCase('tr-TR');
      return !hizliSatisCariAramaMetni || arananAlan.includes(hizliSatisCariAramaMetni);
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
    { ad: 'Genel', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true, mutfakEkraninaGitsin: true, yaziciyaGitsin: true };

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
  const hizliSatisKdvOzeti = siparislerKdvOzetiHesapla(hizliSatisUrunler, hizliSatisToplam);

  // reçete satırını fire oranı, stok düşümü ve maliyet açısından hesaplayan yardımcı kodlar
  const receteSatirlariBul = (urunId) => {
    return (Array.isArray(urunReceteleri) ? urunReceteleri : [])
      .filter(r => String(r.urunId) === String(urunId));
  };

  const receteSatiriFireOrani = (satir = {}) => {
    return Math.max(0, sayiyaCevir(satir.fireYuzde ?? satir.fire_yuzde ?? 0));
  };

  const receteSatiriNetMiktar = (satir = {}) => {
    return Math.max(0, sayiyaCevir(satir.miktar));
  };

  const receteSatiriFireliMiktar = (satir = {}) => {
    const netMiktar = receteSatiriNetMiktar(satir);
    const fireYuzde = receteSatiriFireOrani(satir);
    return paraYuvarla(netMiktar * (1 + fireYuzde / 100));
  };

  const receteSatiriMaliyetiHesapla = (satir = {}) => {
    const malzeme = aktifStokMalzemeleri.find(m => String(m.id) === String(satir.malzemeId));
    return paraYuvarla(receteSatiriFireliMiktar(satir) * Number(malzeme?.birimMaliyet || 0));
  };

  const urunReceteAnaliziHesapla = (urunId) => {
    const urun = aktifMenu.find(u => String(u.id) === String(urunId));
    const satirlar = receteSatirlariBul(urunId);
    const maliyet = paraYuvarla(satirlar.reduce((toplam, satir) => toplam + receteSatiriMaliyetiHesapla(satir), 0));
    const satisFiyati = Number(urun?.fiyat || 0);
    const brutKar = paraYuvarla(satisFiyati - maliyet);
    const maliyetOrani = satisFiyati > 0 ? paraYuvarla((maliyet / satisFiyati) * 100) : 0;
    const eksikMaliyetliKalemler = satirlar.filter(satir => {
      const malzeme = aktifStokMalzemeleri.find(m => String(m.id) === String(satir.malzemeId));
      return !malzeme || Number(malzeme?.birimMaliyet || 0) <= 0;
    });
    const porsiyonLimitleri = satirlar
      .map(satir => {
        const malzeme = aktifStokMalzemeleri.find(m => String(m.id) === String(satir.malzemeId));
        const kullanilan = receteSatiriFireliMiktar(satir);
        if (!malzeme || !kullanilan) return null;
        return Math.floor(Number(malzeme.stokMiktari || 0) / kullanilan);
      })
      .filter(sayi => Number.isFinite(sayi));
    const stoktanCikabilecekPorsiyon = porsiyonLimitleri.length > 0 ? Math.max(0, Math.min(...porsiyonLimitleri)) : 0;

    return {
      urun,
      satirlar,
      maliyet,
      satisFiyati,
      brutKar,
      maliyetOrani,
      eksikMaliyetliKalemler,
      stoktanCikabilecekPorsiyon,
      receteTamamMi: satirlar.length > 0 && eksikMaliyetliKalemler.length === 0,
    };
  };

  // reçeteli ürünlerin üretim modunu standart hale getiren kod
  const urunUretimModuBul = (urun = {}) => {
    const mod = String(urun?.uretimModu || urun?.uretim_modu || 'manuel').trim();
    return mod === 'satisla_uretim' ? 'satisla_uretim' : 'manuel';
  };

  const urunUretimModuEtiketi = (urun = {}) => {
    return urunUretimModuBul(urun) === 'satisla_uretim' ? 'Satışta satıldıkça üret' : 'Manuel üret / stoka al';
  };

  const urunSatistaUretilecekMi = (urun = {}) => {
    if (!urun?.id) return false;
    return urunUretimModuBul(urun) === 'satisla_uretim' && receteSatirlariBul(urun.id).length > 0;
  };

  const urunUretimGereklilikleriHesapla = (urunId, adet = 1) => {
    const uretilecekAdet = Math.max(0, sayiyaCevir(adet));
    return receteSatirlariBul(urunId).map(satir => {
      const malzeme = aktifStokMalzemeleri.find(m => String(m.id) === String(satir.malzemeId));
      const birimMiktar = receteSatiriFireliMiktar(satir);
      const gerekliMiktar = paraYuvarla(birimMiktar * uretilecekAdet);
      const mevcutStok = Number(malzeme?.stokMiktari || 0);
      const yeterli = mevcutStok >= gerekliMiktar;
      return {
        satir,
        malzeme,
        birimMiktar,
        gerekliMiktar,
        mevcutStok,
        yeterli,
        eksikMiktar: yeterli ? 0 : paraYuvarla(gerekliMiktar - mevcutStok),
        maliyet: paraYuvarla(gerekliMiktar * Number(malzeme?.birimMaliyet || 0)),
      };
    });
  };

  // ürün reçetesinden veya ürün kartından birim maliyet hesaplayan kod
  const urunBirimMaliyetiBul = (kayit = {}) => {
    const urunId = kayit.urunId || kayit.urun_id || kayit.id;
    const urunAdi = kayit.ad || kayit.urun_adi || '';
    const urun = aktifMenu.find(u => String(u.id) === String(urunId)) ||
      aktifMenu.find(u => String(u.ad || '') === String(urunAdi || ''));
    const hedefUrunId = urun?.id || urunId;
    const receteMaliyeti = urunReceteAnaliziHesapla(hedefUrunId).maliyet;

    if (receteMaliyeti > 0) return paraYuvarla(receteMaliyeti);
    return paraYuvarla(Number(kayit.maliyet ?? urun?.maliyet ?? 0));
  };

  const urunReceteMaliyetiHesapla = (urunId) => {
    return urunReceteAnaliziHesapla(urunId).maliyet;
  };

  // satış raporlarında ürün maliyetini tutarlı hesaplayan kod
  const satisSatiriToplamMaliyetiHesapla = (satisSatiri = {}) => {
    const adet = Number(satisSatiri.adet || 1);
    const kayitliToplamMaliyet = Number(satisSatiri.toplamMaliyet ?? satisSatiri.toplam_maliyet ?? 0);

    if (kayitliToplamMaliyet > 0) {
      return paraYuvarla(kayitliToplamMaliyet);
    }

    const kayitliBirimMaliyet = Number(satisSatiri.maliyet ?? 0);
    const birimMaliyet = kayitliBirimMaliyet > 0 ? kayitliBirimMaliyet : urunBirimMaliyetiBul(satisSatiri);
    return paraYuvarla(birimMaliyet * adet);
  };

  const satisSatiriBirimMaliyetiHesapla = (satisSatiri = {}) => {
    const adet = Math.max(Number(satisSatiri.adet || 1), 1);
    const kayitliBirimMaliyet = Number(satisSatiri.maliyet ?? 0);

    if (kayitliBirimMaliyet > 0) {
      return paraYuvarla(kayitliBirimMaliyet);
    }

    return paraYuvarla(satisSatiriToplamMaliyetiHesapla(satisSatiri) / adet);
  };

  const bugunStrGenel = new Date().toISOString().split('T')[0];
  const bugunkuSatislar = satisGecmisi.filter(s => {
    return s.restaurantId === mevcutRestaurantId && String(s.tarih || '') === bugunStrGenel && !s.gunSonuKapandi;
  });

  const bugunkuCiro = bugunkuSatislar.reduce((toplam, s) => {
    return toplam + Number(s.fiyat || 0) * Number(s.adet || 1);
  }, 0);

  const bugunkuMaliyet = paraYuvarla(bugunkuSatislar.reduce((toplam, s) => {
    return toplam + satisSatiriToplamMaliyetiHesapla(s);
  }, 0));

  const bugunkuKdvToplami = satisKayitlariKdvOzetiHesapla(bugunkuSatislar).kdvToplam;
  const bugunkuIndirimToplami = paraYuvarla(bugunkuSatislar.reduce((toplam, s) => toplam + Number(s.indirimTutari || s.indirim_tutari || 0) * Number(s.adet || 1), 0));
  const bugunkuCariSatis = paraYuvarla(bugunkuSatislar.filter(s => String(s.odemeTipi || s.odeme_tipi || '').toLocaleLowerCase('tr-TR').includes('cari')).reduce((t, s) => t + Number(s.fiyat || 0) * Number(s.adet || 1), 0));
  const bugunkuPaketSatis = paraYuvarla(bugunkuSatislar.filter(s => String(s.siparisTipi || s.siparis_tipi || '').toLocaleLowerCase('tr-TR').includes('paket')).reduce((t, s) => t + Number(s.fiyat || 0) * Number(s.adet || 1), 0));
  const bugunkuHizliSatis = paraYuvarla(bugunkuSatislar.filter(s => String(s.siparisTipi || s.siparis_tipi || '').toLocaleLowerCase('tr-TR').includes('hızlı') || String(s.siparisTipi || s.siparis_tipi || '').toLocaleLowerCase('tr-TR').includes('hizli')).reduce((t, s) => t + Number(s.fiyat || 0) * Number(s.adet || 1), 0));
  const bugunkuMasaSatis = paraYuvarla(Math.max(bugunkuCiro - bugunkuPaketSatis - bugunkuHizliSatis, 0));

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

  // süper admin destek panelinde durumlara göre filtrelenen talepleri hazırlayan kod
  const adminDestekAcikSayisi = destekTalepleri.filter(t => String(t.durum || 'Yeni') !== 'Tamamlandı').length;
  const adminDestekTamamlananSayisi = destekTalepleri.filter(t => String(t.durum || 'Yeni') === 'Tamamlandı').length;
  const adminDestekListe = destekTalepleri.filter(t => {
    const durum = String(t.durum || 'Yeni');
    if (adminDestekFiltresi === 'Tümü') return true;
    if (adminDestekFiltresi === 'Açık') return durum !== 'Tamamlandı';
    return durum === adminDestekFiltresi;
  });

  // süper admin lisans / paket / ödeme paneli için hesaplamaları yapan kod
  const bugunLocalTarih = new Date();
  const tarihInputDegeri = (tarih = new Date()) => {
    const kopya = new Date(tarih);
    if (Number.isNaN(kopya.getTime())) return '';
    return kopya.toISOString().split('T')[0];
  };

  const birAySonraTarih = () => {
    const tarih = new Date();
    tarih.setMonth(tarih.getMonth() + 1);
    return tarihInputDegeri(tarih);
  };

  const kalanGunHesapla = (tarihDegeri) => {
    if (!tarihDegeri) return null;
    const hedef = new Date(`${tarihDegeri}T23:59:59`);
    if (Number.isNaN(hedef.getTime())) return null;
    const gunMs = 24 * 60 * 60 * 1000;
    return Math.ceil((hedef.getTime() - bugunLocalTarih.getTime()) / gunMs);
  };

  const lisansRozetiHazirla = (restoran) => {
    const kalanGun = kalanGunHesapla(restoran.sonrakiOdemeTarihi || restoran.sonOdemeTarihi);
    const lisans = String(restoran.lisansDurumu || restoran.durum || 'Onay Bekliyor');
    const odeme = String(restoran.odemeDurumu || 'Ödeme Bekliyor');

    if (lisans === 'Donduruldu' || lisans === 'Askıya Alındı') {
      return { etiket: 'Askıya Alındı', renk: '#991b1b', zemin: '#fee2e2', kalanGun };
    }

    if (kalanGun !== null && kalanGun < 0) {
      return { etiket: 'Ödeme Gecikti', renk: '#b91c1c', zemin: '#fee2e2', kalanGun };
    }

    if (odeme === 'Ödeme Bekliyor' || lisans === 'Ödeme Bekliyor') {
      return { etiket: 'Ödeme Bekliyor', renk: '#b45309', zemin: '#fef3c7', kalanGun };
    }

    if (kalanGun !== null && kalanGun <= 7) {
      return { etiket: 'Yaklaşıyor', renk: '#c2410c', zemin: '#ffedd5', kalanGun };
    }

    if (lisans === 'Aktif') {
      return { etiket: 'Aktif', renk: '#15803d', zemin: '#dcfce7', kalanGun };
    }

    return { etiket: lisans, renk: '#475569', zemin: '#e2e8f0', kalanGun };
  };

  const sahipRestoranlar = restoranlar.filter(r => r.rol === 'owner');
  const adminLisansAramaMetni = String(adminLisansArama || '').toLocaleLowerCase('tr-TR').trim();

  const adminLisansListe = sahipRestoranlar.filter(r => {
    const rozet = lisansRozetiHazirla(r);
    const arananAlan = `${r.ad || ''} ${r.email || ''} ${r.yetkiliAdi || ''} ${r.firmaTelefon || ''} ${r.paketAdi || ''}`.toLocaleLowerCase('tr-TR');
    const aramaUyuyor = !adminLisansAramaMetni || arananAlan.includes(adminLisansAramaMetni);

    if (!aramaUyuyor) return false;
    if (adminLisansFiltresi === 'Tümü') return true;
    if (adminLisansFiltresi === 'Aktif') return rozet.etiket === 'Aktif';
    if (adminLisansFiltresi === 'Yaklaşan Ödeme') return rozet.etiket === 'Yaklaşıyor';
    if (adminLisansFiltresi === 'Geciken') return rozet.etiket === 'Ödeme Gecikti';
    if (adminLisansFiltresi === 'Ödeme Bekliyor') return rozet.etiket === 'Ödeme Bekliyor';
    if (adminLisansFiltresi === 'Askıya Alındı') return rozet.etiket === 'Askıya Alındı';
    return true;
  });

  const adminLisansOzet = {
    toplam: sahipRestoranlar.length,
    aktif: sahipRestoranlar.filter(r => lisansRozetiHazirla(r).etiket === 'Aktif').length,
    yaklasan: sahipRestoranlar.filter(r => lisansRozetiHazirla(r).etiket === 'Yaklaşıyor').length,
    geciken: sahipRestoranlar.filter(r => lisansRozetiHazirla(r).etiket === 'Ödeme Gecikti').length,
    bekleyen: sahipRestoranlar.filter(r => lisansRozetiHazirla(r).etiket === 'Ödeme Bekliyor').length,
    aski: sahipRestoranlar.filter(r => lisansRozetiHazirla(r).etiket === 'Askıya Alındı').length,
    aylikTahmini: sahipRestoranlar
      .filter(r => !['Donduruldu', 'Askıya Alındı'].includes(String(r.lisansDurumu || r.durum || '')))
      .reduce((toplam, r) => toplam + Number(r.aylikUcret || 0), 0),
  };
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

  // Supabase restaurants satırını süper admin panelinin anlayacağı formata çeviren kod
  const restoranSatiriniHazirla = (r) => ({
    id: r.id,
    ad: r.restaurant_name || r.name || r.firma_adi || 'İsimsiz İşletme',
    email: r.email || '',
    durum: r.durum || 'Onay Bekliyor',
    rol: r.rol || 'owner',
    paketAdi: r.paket_adi || r.basvuru_paketi || 'Profesyonel',
    basvuruPaketi: r.basvuru_paketi || r.paket_adi || 'Profesyonel',
    aylikUcret: Number(r.aylik_ucret || 699),
    sonOdemeTarihi: r.son_odeme_tarihi || '',
    sonrakiOdemeTarihi: r.sonraki_odeme_tarihi || r.son_odeme_tarihi || '',
    sonOdemeTutari: Number(r.son_odeme_tutari || 0),
    sonOdemeYontemi: r.son_odeme_yontemi || 'Banka / Havale',
    odemeDurumu: r.odeme_durumu || 'Ödeme Bekliyor',
    lisansDurumu: r.lisans_durumu || r.durum || 'Onay Bekliyor',
    lisansNotu: r.lisans_notu || '',
    kullaniciLimiti: Number(r.kullanici_limiti || 3),
    aktifSekmeler: isletmeSekmeleriniHazirla(r.aktif_sekmeler, r.modul_paketi || r.paket_adi || r.basvuru_paketi || 'Premium'),
    modulPaketi: r.modul_paketi || r.paket_adi || r.basvuru_paketi || 'Premium',
    modulNotu: r.modul_notu || '',
    yetkiliAdi: r.yetkili_adi || '',
    firmaTelefon: r.firma_telefon || r.telefon || '',
    firmaAdres: r.firma_adres || r.adres || '',
    kayitNotu: r.kayit_notu || '',
    adminNotu: r.admin_notu || '',
    createdAt: r.created_at || '',
  });

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

    const temizListe = (Array.isArray(data) ? data : []).map(restoranSatiriniHazirla);

    setRestoranlar(temizListe);
  };

  // süper admin bildirimlerini Supabase'den çeken kod
  const adminBildirimleriniSupabasedenCek = async () => {
    const { data, error } = await supabase
      .from('admin_bildirimleri')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Admin bildirimleri çekilemedi:', error);
      setAdminBildirimleri([]);
      return;
    }

    setAdminBildirimleri((Array.isArray(data) ? data : []).map(b => ({
      id: b.id,
      tip: b.tip || 'Bilgi',
      baslik: b.baslik || '',
      mesaj: b.mesaj || '',
      hedefEmail: b.hedef_email || 'salihcankesekler@gmail.com',
      restaurantId: b.restaurant_id || null,
      metadata: b.metadata || {},
      okundu: Boolean(b.okundu),
      createdAt: b.created_at || '',
    })));
  };

  // destek ve geliştirme taleplerini süper admin için çeken kod
  const destekTalepleriniSupabasedenCek = async () => {
    const { data, error } = await supabase
      .from('destek_talepleri')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Destek talepleri çekilemedi:', error);
      setDestekTalepleri([]);
      return;
    }

    setDestekTalepleri((Array.isArray(data) ? data : []).map(t => ({
      id: t.id,
      restaurantId: t.restaurant_id || null,
      adSoyad: t.ad_soyad || '',
      firmaAdi: t.firma_adi || '',
      email: t.email || '',
      telefon: t.telefon || '',
      talepTipi: t.talep_tipi || 'Geliştirme Talebi',
      konu: t.konu || '',
      mesaj: t.mesaj || '',
      durum: t.durum || 'Yeni',
      adminNotu: t.admin_notu || '',
      createdAt: t.created_at || '',
      updatedAt: t.updated_at || '',
    })));
  };

  // süper admin destek panelinde talebin durumunu güncelleyen kod
  const destekTalebiDurumGuncelle = async (talepId, yeniDurum) => {
    if (!talepId) return;

    const { error } = await supabase
      .from('destek_talepleri')
      .update({
        durum: yeniDurum,
        updated_at: new Date().toISOString(),
      })
      .eq('id', talepId);

    if (error) {
      console.error('Destek talebi durumu güncellenemedi:', error);
      alert('Destek talebi durumu güncellenemedi: ' + error.message);
      return;
    }

    setDestekTalepleri(prev => prev.map(t => (
      String(t.id) === String(talepId)
        ? { ...t, durum: yeniDurum, updatedAt: new Date().toISOString() }
        : t
    )));
  };

  // Edge Function aktifse admin maili göndermeyi deneyen kod
  const adminMailGonder = async ({ tip, baslik, mesaj, metadata = {} }) => {
    try {
      const { error } = await supabase.functions.invoke('admin-mail-gonder', {
        body: {
          to: 'salihcankesekler@gmail.com',
          tip,
          baslik,
          mesaj,
          metadata,
        },
      });

      if (error) {
        console.warn('Admin mail gönderimi şimdilik aktif değil:', error.message);
      }
    } catch (err) {
      console.warn('Admin mail fonksiyonu çağrılamadı:', err?.message || err);
    }
  };

  // admin paneline bildirim kaydı atan kod
  const adminBildirimKaydiOlustur = async ({ tip, baslik, mesaj, restaurantId = null, metadata = {} }) => {
    try {
      await supabase
        .from('admin_bildirimleri')
        .insert([{
          tip,
          baslik,
          mesaj,
          hedef_email: 'salihcankesekler@gmail.com',
          restaurant_id: restaurantId,
          metadata,
        }]);
    } catch (err) {
      console.warn('Admin bildirim kaydı oluşturulamadı:', err?.message || err);
    }
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
      brutTutar: Number(m.brut_tutar || 0),
      adisyonIndirimYuzde: Number(m.adisyon_indirim_yuzde || 0),
      adisyonIndirimTutari: Number(m.adisyon_indirim_tutari || 0),
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

  // hammadde stoklarını Supabase'den çeken kod
  const stokMalzemeleriniSupabasedenCek = async (restaurantId) => {
    const { data, error } = await supabase
      .from('stok_malzemeleri')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('ad', { ascending: true });

    if (error) {
      console.warn('Hammadde stokları çekilemedi:', error.message);
      setStokMalzemeleri([]);
      return;
    }

    setStokMalzemeleri((Array.isArray(data) ? data : []).map(m => ({
      id: m.id,
      restaurantId: m.restaurant_id,
      ad: m.ad || '',
      birim: m.birim || 'adet',
      stokMiktari: Number(m.stok_miktari || 0),
      kritikMiktar: Number(m.kritik_miktar || 0),
      birimMaliyet: Number(m.birim_maliyet || 0),
      createdAt: m.created_at,
    })));
  };

  // ürün reçetelerini Supabase'den çeken kod
  const urunReceteleriniSupabasedenCek = async (restaurantId) => {
    const { data, error } = await supabase
      .from('urun_receteleri')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('id', { ascending: true });

    if (error) {
      console.warn('Ürün reçeteleri çekilemedi:', error.message);
      setUrunReceteleri([]);
      return;
    }

    setUrunReceteleri((Array.isArray(data) ? data : []).map(r => ({
      id: r.id,
      restaurantId: r.restaurant_id,
      urunId: r.urun_id,
      malzemeId: r.malzeme_id,
      miktar: Number(r.miktar || 0),
      fireYuzde: Number(r.fire_yuzde || r.fire_orani || 0),
      hazirlikNotu: r.hazirlik_notu || r.notu || '',
      birimMaliyetSnapshot: Number(r.birim_maliyet_snapshot || 0),
      createdAt: r.created_at,
    })));
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
      mutfagaGitsin: (u.mutfak_ekranina_gitsin ?? u.mutfaga_gitsin) !== false,
      mutfakEkraninaGitsin: (u.mutfak_ekranina_gitsin ?? u.mutfaga_gitsin) !== false,
      yaziciyaGitsin: (u.yaziciya_gitsin ?? u.mutfaga_gitsin) !== false,
      stokTakip: Boolean(u.stok_takip),
      stokAdedi: Number(u.stok_adedi || 0),
      kritikStok: Number(u.kritik_stok || 0),
      favori: Boolean(u.favori),
      qrMenudeGorunsun: (u.qr_menude_gorunsun ?? u.qrMenudeGorunsun ?? true) !== false,
      satistaAktif: (u.satista_aktif ?? u.satistaAktif ?? u.aktif ?? true) !== false,
      uretimModu: u.uretim_modu || u.uretimModu || 'manuel',
      uretimNotu: u.uretim_notu || u.uretimNotu || '',
      resimUrl: u.resim_url || u.resimUrl || '',
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
              { id: 'varsayilan-ana-yemekler', restaurantId, ad: 'Ana Yemekler', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true, mutfakEkraninaGitsin: true, yaziciyaGitsin: true },
              { id: 'varsayilan-icecekler', restaurantId, ad: 'İçecekler', departman: 'Bar', kdvOrani: 20, mutfagaGitsin: true, mutfakEkraninaGitsin: true, yaziciyaGitsin: true },
              { id: 'varsayilan-tatlilar', restaurantId, ad: 'Tatlılar', departman: 'Tatlı', kdvOrani: 10, mutfagaGitsin: true, mutfakEkraninaGitsin: true, yaziciyaGitsin: true },
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
      mutfagaGitsin: (g.mutfak_ekranina_gitsin ?? g.mutfaga_gitsin) !== false,
      mutfakEkraninaGitsin: (g.mutfak_ekranina_gitsin ?? g.mutfaga_gitsin) !== false,
      yaziciyaGitsin: (g.yaziciya_gitsin ?? g.mutfaga_gitsin) !== false,
    }));

    const gruplar = temizGruplar.length > 0
      ? temizGruplar
      : [
          { id: 'varsayilan-ana-yemekler', restaurantId, ad: 'Ana Yemekler', departman: 'Mutfak', kdvOrani: 10, mutfagaGitsin: true, mutfakEkraninaGitsin: true, yaziciyaGitsin: true },
          { id: 'varsayilan-icecekler', restaurantId, ad: 'İçecekler', departman: 'Bar', kdvOrani: 20, mutfagaGitsin: true, mutfakEkraninaGitsin: true, yaziciyaGitsin: true },
          { id: 'varsayilan-tatlilar', restaurantId, ad: 'Tatlılar', departman: 'Tatlı', kdvOrani: 10, mutfagaGitsin: true, mutfakEkraninaGitsin: true, yaziciyaGitsin: true },
        ];

    setMenuGruplari(gruplar);

    if (!gruplar.some(g => g.ad === aktifMenuGrubu)) {
      setAktifMenuGrubu(gruplar[0]?.ad || 'Genel');
    }
  };

  // fiş ve yazıcı ayarlarını Supabase'den çeken kod
  const fisAyarlariSupabasedenCek = async (restaurantId) => {
    if (!restaurantId || String(restaurantId) === 'super_admin') return;

    const localKey = fisAyarlariLocalKey(restaurantId);
    const varsayilan = varsayilanFisAyarlari(user?.restaurant || restaurantName || '');

    try {
      const localKayit = localStorage.getItem(localKey) || localStorage.getItem('integra_fis_yazici_ayarlari');
      if (localKayit) {
        setFisAyarlari({
          ...varsayilan,
          ...fisAyarlariKaydiniTemizle(JSON.parse(localKayit)),
        });
      } else {
        setFisAyarlari(prev => ({
          ...varsayilan,
          ...prev,
          firmaAdi: prev?.firmaAdi || varsayilan.firmaAdi,
        }));
      }
    } catch {
      setFisAyarlari(varsayilan);
    }

    const { data, error } = await supabase
      .from('fis_yazici_ayarlari')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (error) {
      console.warn('Fiş/yazıcı ayarları Supabase tablosundan çekilemedi. SQL henüz çalıştırılmamış olabilir:', error.message);
      return;
    }

    if (data) {
      const temizAyarlar = {
        ...varsayilan,
        ...fisAyarlariKaydiniTemizle(data),
      };

      setFisAyarlari(temizAyarlar);
      localStorage.setItem(localKey, JSON.stringify(temizAyarlar));
    }


    // yeni kalıcı yazıcı ayarları tablosunu çeken kod
    const { data: yeniYaziciData, error: yeniYaziciError } = await supabase
      .from('yazici_ayarlari')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (!yeniYaziciError && yeniYaziciData) {
      const temizYaziciAyarlari = {
        ...varsayilanYaziciAyarlari(),
        adisyonYaziciAdi: yeniYaziciData.adisyon_yazici_adi || 'adisyon',
        mutfakYaziciAdi: yeniYaziciData.mutfak_yazici_adi || 'mutfak',
        barYaziciAdi: yeniYaziciData.bar_yazici_adi || 'bar',
        barYoksaMutfagaGonder: yeniYaziciData.bar_yoksa_mutfaga_gonder !== false,
        adisyonFisiAktif: yeniYaziciData.adisyon_fisi_aktif !== false,
        odemeFisiAktif: yeniYaziciData.odeme_fisi_aktif !== false,
        mutfakFisiAktif: yeniYaziciData.mutfak_fisi_aktif !== false,
        iptalFisiAktif: yeniYaziciData.iptal_fisi_aktif !== false,
        paketFisiAktif: yeniYaziciData.paket_fisi_aktif !== false,
        zRaporuAktif: yeniYaziciData.z_raporu_aktif !== false,
      };

      setYaziciAyarlari(temizYaziciAyarlari);
      setFisAyarlari(prev => ({
        ...prev,
        adisyonYaziciNo: temizYaziciAyarlari.adisyonYaziciAdi,
        mutfakYaziciNo: temizYaziciAyarlari.mutfakYaziciAdi,
        barYaziciNo: temizYaziciAyarlari.barYaziciAdi,
      }));
    }

    // yeni kalıcı fiş şablonları tablosunu çeken kod
    const { data: yeniSablonData, error: yeniSablonError } = await supabase
      .from('fis_sablonlari')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('id', { ascending: true });

    if (!yeniSablonError && Array.isArray(yeniSablonData) && yeniSablonData.length > 0) {
      const varsayilanlar = varsayilanFisSablonlari();
      const temizSablonlar = varsayilanlar.map(v => {
        const kayit = yeniSablonData.find(s => s.fis_tipi === v.fisTipi);
        return kayit
          ? {
            ...v,
            id: kayit.id,
            baslik: kayit.baslik || v.baslik,
            sablonText: kayit.sablon_text || v.sablonText,
            aktif: kayit.aktif !== false,
            ayarlar: kayit.ayarlar || {},
          }
          : v;
      });
      setFisSablonlari(temizSablonlar);
    }
  };

  // fiş ve yazıcı ayarlarını Supabase'e kaydeden kod
  const fisAyarlariKaydet = async () => {
    if (!mevcutRestaurantId || String(mevcutRestaurantId) === 'super_admin') {
      alert('Fiş ayarları için aktif restoran bulunamadı.');
      return;
    }

    const temizAyarlar = {
      ...varsayilanFisAyarlari(user?.restaurant || ''),
      ...fisAyarlari,
      firmaAdi: String(fisAyarlari?.firmaAdi || user?.restaurant || 'Integra POS').trim(),
      firmaTelefon: String(fisAyarlari?.firmaTelefon || '').trim(),
      firmaAdres: String(fisAyarlari?.firmaAdres || '').trim(),
      vergiBilgisi: String(fisAyarlari?.vergiBilgisi || '').trim(),
      fisAltNotu: String(fisAyarlari?.fisAltNotu || '').trim(),
      adisyonYaziciAdi: String(fisAyarlari?.adisyonYaziciAdi || 'Adisyon Yazıcısı').trim(),
      adisyonYaziciNo: String(fisAyarlari?.adisyonYaziciNo || '').trim(),
      mutfakYaziciAdi: String(fisAyarlari?.mutfakYaziciAdi || 'Mutfak Yazıcısı').trim(),
      mutfakYaziciNo: String(fisAyarlari?.mutfakYaziciNo || '').trim(),
      barYaziciAdi: String(fisAyarlari?.barYaziciAdi || 'Bar / İçecek Yazıcısı').trim(),
      barYaziciNo: String(fisAyarlari?.barYaziciNo || '').trim(),
      mutfakFisYazdirmaModu: fisAyarlari?.mutfakFisYazdirmaModu || 'sor',
    };

    setFisAyarlariKaydediliyor(true);
    setFisAyarlari(temizAyarlar);
    localStorage.setItem(fisAyarlariLocalKey(mevcutRestaurantId), JSON.stringify(temizAyarlar));

    // yeni kalıcı yazıcı ayarlarını Supabase'e kaydeden kod
    const { error: yeniYaziciError } = await supabase
      .from('yazici_ayarlari')
      .upsert(
        {
          restaurant_id: mevcutRestaurantId,
          adisyon_yazici_adi: String(yaziciAyarlari.adisyonYaziciAdi || temizAyarlar.adisyonYaziciNo || 'adisyon').trim(),
          mutfak_yazici_adi: String(yaziciAyarlari.mutfakYaziciAdi || temizAyarlar.mutfakYaziciNo || 'mutfak').trim(),
          bar_yazici_adi: String(yaziciAyarlari.barYaziciAdi || temizAyarlar.barYaziciNo || 'bar').trim(),
          bar_yoksa_mutfaga_gonder: yaziciAyarlari.barYoksaMutfagaGonder !== false,
          adisyon_fisi_aktif: yaziciAyarlari.adisyonFisiAktif !== false,
          odeme_fisi_aktif: yaziciAyarlari.odemeFisiAktif !== false,
          mutfak_fisi_aktif: yaziciAyarlari.mutfakFisiAktif !== false,
          iptal_fisi_aktif: yaziciAyarlari.iptalFisiAktif !== false,
          paket_fisi_aktif: yaziciAyarlari.paketFisiAktif !== false,
          z_raporu_aktif: yaziciAyarlari.zRaporuAktif !== false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'restaurant_id' }
      );

    if (yeniYaziciError) {
      console.warn('Kalıcı yazıcı ayarları kaydedilemedi:', yeniYaziciError.message);
    }

    const sablonKayitlari = (Array.isArray(fisSablonlari) ? fisSablonlari : varsayilanFisSablonlari()).map(sablon => ({
      restaurant_id: mevcutRestaurantId,
      fis_tipi: sablon.fisTipi,
      baslik: sablon.baslik || fisTipiEtiketi(sablon.fisTipi),
      sablon_text: sablon.sablonText || '',
      ayarlar: sablon.ayarlar || {},
      aktif: sablon.aktif !== false,
      updated_at: new Date().toISOString(),
    }));

    const { error: yeniSablonError } = await supabase
      .from('fis_sablonlari')
      .upsert(sablonKayitlari, { onConflict: 'restaurant_id,fis_tipi' });

    if (yeniSablonError) {
      console.warn('Fiş şablonları kaydedilemedi:', yeniSablonError.message);
    }

    const { error } = await supabase
      .from('fis_yazici_ayarlari')
      .upsert(
        {
          restaurant_id: mevcutRestaurantId,
          firma_adi: temizAyarlar.firmaAdi,
          firma_telefon: temizAyarlar.firmaTelefon,
          firma_adres: temizAyarlar.firmaAdres,
          vergi_bilgisi: temizAyarlar.vergiBilgisi,
          fis_alt_notu: temizAyarlar.fisAltNotu,
          adisyon_yazici_adi: temizAyarlar.adisyonYaziciAdi,
          adisyon_yazici_no: temizAyarlar.adisyonYaziciNo,
          mutfak_yazici_adi: temizAyarlar.mutfakYaziciAdi,
          mutfak_yazici_no: temizAyarlar.mutfakYaziciNo,
          bar_yazici_adi: temizAyarlar.barYaziciAdi,
          bar_yazici_no: temizAyarlar.barYaziciNo,
          mutfak_fis_yazdirma_modu: temizAyarlar.mutfakFisYazdirmaModu,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'restaurant_id' }
      );

    setFisAyarlariKaydediliyor(false);

    if (error) {
      console.warn('Fiş/yazıcı ayarları Supabase kaydı yapılamadı:', error.message);
      alert('Ayarlar bu tarayıcıda kaydedildi. Supabase için verdiğim SQL dosyasını çalıştırırsan tüm cihazlarda da kalıcı olur. Hata: ' + error.message);
      return;
    }

    alert('Fiş ve yazıcı ayarları kaydedildi.');
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
      const superAdminKullanici = {
        id: 'super_admin',
        email: 'admin@integra.com',
        restaurant: 'Integra Admin',
        restaurantId: 'super_admin',
        role: 'super_admin',
        durum: 'Aktif',
      };

      localStorage.setItem('integra_user', JSON.stringify(superAdminKullanici));
      localStorage.setItem('integra_screen', 'dashboard');
      localStorage.setItem('integra_activeTab', 'super_admin');

      setUser(superAdminKullanici);
      setScreen('dashboard');
      setActiveTab('super_admin');

      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data) {
        const temizListe = (Array.isArray(data) ? data : []).map(restoranSatiriniHazirla);

        setRestoranlar(temizListe);
        if (typeof adminBildirimleriniSupabasedenCek === 'function') await adminBildirimleriniSupabasedenCek();
        if (typeof destekTalepleriniSupabasedenCek === 'function') await destekTalepleriniSupabasedenCek();
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

    const parentRestaurantId = data.parentRestaurantId || data.parent_restaurant_id || data.id;
    let isletmeAyarKaydi = data;

    if (data.rol !== 'owner' && parentRestaurantId && String(parentRestaurantId) !== String(data.id)) {
      const { data: parentData, error: parentError } = await supabase
        .from('restaurants')
        .select('id, aktif_sekmeler, modul_paketi, paket_adi, basvuru_paketi, kullanici_limiti')
        .eq('id', parentRestaurantId)
        .maybeSingle();

      if (!parentError && parentData) {
        isletmeAyarKaydi = { ...data, ...parentData };
      }
    }

    const aktifIsletmeSekmeleri = isletmeSekmeleriniHazirla(
      isletmeAyarKaydi.aktif_sekmeler,
      isletmeAyarKaydi.modul_paketi || isletmeAyarKaydi.paket_adi || isletmeAyarKaydi.basvuru_paketi || 'Premium'
    );

    // giriş yapan kullanıcı bilgisini uygulama formatına çeviren kod
    const girenKullanici = {
      id: data.id,
      email: data.email,
      restaurant: data.restaurant_name || data.name,
      restaurantId: data.id,
      parentRestaurantId,
      role: data.rol,
      durum: data.durum,
      waiterName: data.waiter_name || data.name || data.restaurant_name || data.email,
      personelId: data.personel_id || null,
      personelGorev: data.personel_gorev || data.gorev || (data.rol === 'owner' ? 'İşletme Sahibi' : 'Garson'),
      tabYetkileri: yetkiListesiniHazirla(data.tab_yetkileri, data.personel_gorev || 'Garson'),
      aktifSekmeler: aktifIsletmeSekmeleri,
      modulPaketi: isletmeAyarKaydi.modul_paketi || isletmeAyarKaydi.paket_adi || isletmeAyarKaydi.basvuru_paketi || 'Premium',
      kullaniciLimiti: Number(isletmeAyarKaydi.kullanici_limiti || data.kullanici_limiti || 3),
    };

    localStorage.setItem('integra_user', JSON.stringify(girenKullanici));
    localStorage.setItem('integra_screen', 'dashboard');

    const girisTab = ilkGirisSekmesi(data.rol, data.tab_yetkileri, data.personel_gorev || 'Garson', aktifIsletmeSekmeleri);
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
      if (typeof stokMalzemeleriniSupabasedenCek === 'function') await stokMalzemeleriniSupabasedenCek(aktifRestaurantId);
      if (typeof urunReceteleriniSupabasedenCek === 'function') await urunReceteleriniSupabasedenCek(aktifRestaurantId);

      if (typeof fisAyarlariSupabasedenCek === 'function') {
        await fisAyarlariSupabasedenCek(aktifRestaurantId);
      }

      if (typeof printerAgentKurulumunuSupabasedenCek === 'function') {
        await printerAgentKurulumunuSupabasedenCek(aktifRestaurantId);
      }

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
  // şifremi unuttum ekranında e-posta ve kayıtlı telefonla yeni şifre oluşturan kod
  const handleSifremiUnuttum = async (e) => {
    e.preventDefault();

    const temizEmail = String(sifremiUnuttumEmail || '').trim().toLowerCase();
    const girilenTelefon = telefonRakamlari(sifremiUnuttumTelefon);
    const yeniSifre = String(sifremiUnuttumYeniSifre || '').trim();
    const yeniSifreTekrar = String(sifremiUnuttumYeniSifreTekrar || '').trim();

    if (!temizEmail || !girilenTelefon || !yeniSifre || !yeniSifreTekrar) {
      alert('Lütfen e-posta, kayıtlı telefon ve yeni şifre alanlarını doldurun.');
      return;
    }

    if (yeniSifre.length < 6) {
      alert('Yeni şifre en az 6 karakter olmalı.');
      return;
    }

    if (yeniSifre !== yeniSifreTekrar) {
      alert('Yeni şifreler birbiriyle aynı değil.');
      return;
    }

    if (temizEmail === 'admin@integra.com') {
      alert('Süper admin şifresi güvenlik için bu ekrandan değiştirilemez.');
      return;
    }

    const { data: hesap, error: hesapError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('email', temizEmail)
      .maybeSingle();

    if (hesapError) {
      console.error('Şifre sıfırlama hesap sorgusu hatası:', hesapError);
      alert('Hesap kontrol edilemedi: ' + hesapError.message);
      return;
    }

    if (!hesap) {
      alert('Bu e-posta ve telefon bilgisiyle eşleşen hesap bulunamadı.');
      return;
    }

    let telefonEslesiyor = false;
    let personelKaydi = null;
    const hesapTelefonu = telefonRakamlari(hesap.firma_telefon || hesap.telefon || hesap.phone || '');

    if (hesapTelefonu && hesapTelefonu === girilenTelefon) {
      telefonEslesiyor = true;
    }

    // personel/garson hesabında telefon bilgisi personeller tablosunda olabilir
    if (!telefonEslesiyor && hesap.rol === 'waiter') {
      const { data: personel, error: personelError } = await supabase
        .from('personeller')
        .select('*')
        .eq('email', temizEmail)
        .maybeSingle();

      if (!personelError && personel) {
        const personelTelefonu = telefonRakamlari(personel.telefon || personel.firma_telefon || '');

        if (personelTelefonu && personelTelefonu === girilenTelefon) {
          telefonEslesiyor = true;
          personelKaydi = personel;
        }
      }
    }

    if (!telefonEslesiyor) {
      alert('Bu e-posta ve telefon bilgisiyle eşleşen hesap bulunamadı.');
      return;
    }

    const { error: sifreGuncellemeError } = await supabase
      .from('restaurants')
      .update({ password: yeniSifre })
      .eq('id', hesap.id);

    if (sifreGuncellemeError) {
      console.error('Şifre güncelleme hatası:', sifreGuncellemeError);
      alert('Şifre güncellenemedi: ' + sifreGuncellemeError.message);
      return;
    }

    if (personelKaydi?.id) {
      const { error: personelSifreError } = await supabase
        .from('personeller')
        .update({ sifre: yeniSifre })
        .eq('id', personelKaydi.id);

      if (personelSifreError) {
        console.warn('Personel şifresi güncellenemedi:', personelSifreError.message);
      }
    }

    setEmail(temizEmail);
    setPassword('');
    setSifremiUnuttumEmail('');
    setSifremiUnuttumTelefon('');
    setSifremiUnuttumYeniSifre('');
    setSifremiUnuttumYeniSifreTekrar('');
    setScreen('login');
    alert('Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.');
  };
  // mutfak fişlerini Supabase'den çeken kod
  const mutfakFisleriniSupabasedenCek = async (restaurantId) => {
    const { data, error } = await supabase
      .from('mutfak_fisleri')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .in('durum', ['Bekliyor', 'İptal'])
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
      maliyet: Number(s.maliyet || 0),
      toplamMaliyet: Number(s.toplam_maliyet || 0),
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
      brutTutar: Number(p.brut_tutar || 0),
      indirimYuzde: Number(p.indirim_yuzde || 0),
      indirimTutari: Number(p.indirim_tutari || 0),
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

  // hızlı satışta cariye yazılacak müşteriyi seçen kod
  const hizliSatisCariMusterisiSec = (musteriId) => {
    setHizliSatisCariMusteriId(musteriId);

    if (!musteriId) {
      setHizliSatisCariArama('');
      return;
    }

    const cari = cariMusteriler.find(c => String(c.id) === String(musteriId));
    if (!cari) return;

    setHizliSatisCariArama(`${cari.ad || ''}${cari.telefon ? ` - ${cari.telefon}` : ''}`);
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

    if (!restaurantName || !kayitYetkiliAdi || !kayitTelefon || !email || !password) {
      alert('Lütfen işletme adı, yetkili adı, telefon, e-posta ve şifre girin.');
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
          yetkili_adi: kayitYetkiliAdi,
          firma_telefon: kayitTelefon,
          firma_adres: kayitAdres,
          kayit_notu: kayitNotu,
          basvuru_paketi: kayitPaketi,
          paket_adi: kayitPaketi,
          aylik_ucret: 0,
          lisans_durumu: 'Onay Bekliyor',
          kullanici_limiti: kayitPaketi === 'Profesyonel' ? 3 : 0,
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

    const adminMesaji = `Yeni kayıt başvurusu: ${restaurantName} / Yetkili: ${kayitYetkiliAdi} / Telefon: ${kayitTelefon} / Paket: ${kayitPaketi}`;

    await adminBildirimKaydiOlustur({
      tip: 'Yeni Kayıt',
      baslik: 'Yeni restoran başvurusu var',
      mesaj: adminMesaji,
      restaurantId: yeniRestoran.id,
      metadata: {
        restaurantName,
        yetkiliAdi: kayitYetkiliAdi,
        telefon: kayitTelefon,
        adres: kayitAdres,
        email,
        paket: kayitPaketi,
        not: kayitNotu,
      },
    });

    await adminMailGonder({
      tip: 'Yeni Kayıt Başvurusu',
      baslik: 'Integra POS yeni kayıt başvurusu',
      mesaj: adminMesaji,
      metadata: {
        restaurantName,
        yetkiliAdi: kayitYetkiliAdi,
        telefon: kayitTelefon,
        adres: kayitAdres,
        email,
        paket: kayitPaketi,
        not: kayitNotu,
      },
    });

    alert('Kayıt başarılı. Başvurunuz bize ulaştı. Admin onayından sonra giriş yapabilirsiniz.');

    setRestaurantName('');
    setKayitYetkiliAdi('');
    setKayitTelefon('');
    setKayitAdres('');
    setKayitNotu('');
    setKayitPaketi('Profesyonel');
    setEmail('');
    setPassword('');
    setScreen('login');
  };

  // ana sayfadaki destek/geliştirme talebini Supabase'e ve admin bildirimlerine gönderen kod
  const destekTalebiGonder = async (e) => {
    e.preventDefault();

    if (!destekFirmaAdi || !destekEmail || !destekMesaj) {
      alert('Lütfen firma adı, e-posta ve talep açıklamasını yazın.');
      return;
    }

    const destekPayload = {
      ad_soyad: destekAdSoyad,
      firma_adi: destekFirmaAdi,
      email: destekEmail,
      telefon: destekTelefon,
      talep_tipi: destekTalepTipi,
      konu: destekKonu,
      mesaj: destekMesaj,
      durum: 'Yeni',
    };

    const { data, error } = await supabase
      .from('destek_talepleri')
      .insert([destekPayload])
      .select()
      .single();

    if (error) {
      console.error('Destek talebi gönderilemedi:', error);
      alert('Talep gönderilemedi: ' + error.message);
      return;
    }

    const adminMesaji = `${destekTalepTipi}: ${destekFirmaAdi} / ${destekEmail} / ${destekKonu || 'Konu yok'}`;

    await adminBildirimKaydiOlustur({
      tip: 'Destek Talebi',
      baslik: 'Yeni destek/geliştirme talebi',
      mesaj: adminMesaji,
      metadata: {
        talepId: data?.id,
        adSoyad: destekAdSoyad,
        firmaAdi: destekFirmaAdi,
        email: destekEmail,
        telefon: destekTelefon,
        talepTipi: destekTalepTipi,
        konu: destekKonu,
        mesaj: destekMesaj,
      },
    });

    await adminMailGonder({
      tip: 'Destek/Geliştirme Talebi',
      baslik: 'Integra POS yeni destek/geliştirme talebi',
      mesaj: `${adminMesaji}\n\n${destekMesaj}`,
      metadata: {
        talepId: data?.id,
        adSoyad: destekAdSoyad,
        firmaAdi: destekFirmaAdi,
        email: destekEmail,
        telefon: destekTelefon,
        talepTipi: destekTalepTipi,
        konu: destekKonu,
        mesaj: destekMesaj,
      },
    });

    setDestekAdSoyad('');
    setDestekFirmaAdi('');
    setDestekEmail('');
    setDestekTelefon('');
    setDestekTalepTipi('Geliştirme Talebi');
    setDestekKonu('');
    setDestekMesaj('');

    alert('Talebiniz alındı. Destek ekibi en kısa sürede dönüş yapacak.');
  };

  // süper adminin restoran durumunu aktif veya kapalı yapmasını sağlayan kod
  const restoranDurumDegistir = async (id, yeniDurum) => {
    const { data, error } = await supabase
      .from('restaurants')
      .update({ durum: yeniDurum, lisans_durumu: yeniDurum })
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
          lisansDurumu: data.lisans_durumu || data.durum,
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
      '',
      '',
      ''
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
        resimUrl: urunGosterimResmi(urun),
        menuGrubu: urun.menuGrubu || urun.kategori || 'Genel',
        departman: urun.departman || 'Mutfak',
        kdvOrani: Number(urun.kdvOrani || 10),
        mutfagaGitsin: mutfakEkraniAktifMi(urun),
        mutfakEkraninaGitsin: mutfakEkraniAktifMi(urun),
        yaziciyaGitsin: fisYaziciAktifMi(urun),
      });
    }

    const yeniAraToplam = siparislerAraToplamHesapla(yeniSiparisler);
    const genelIndirimOzeti = toplamIndirimHesapla(
      yeniAraToplam,
      masa.adisyonIndirimYuzde || 0,
      masa.adisyonIndirimTutari || 0
    );
    const yeniTutar = genelIndirimOzeti.netToplam;

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
        brut_tutar: genelIndirimOzeti.brutToplam,
        adisyon_indirim_yuzde: genelIndirimOzeti.indirimYuzde,
        adisyon_indirim_tutari: genelIndirimOzeti.tlIndirimTutari,
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
      brutTutar: Number(data.brut_tutar || 0),
      adisyonIndirimYuzde: Number(data.adisyon_indirim_yuzde || 0),
      adisyonIndirimTutari: Number(data.adisyon_indirim_tutari || 0),
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

    // ürünün sitedeki mutfak ekranı ve fiziksel fiş yazıcı ayarını ayrı uygulayan kod
    const mutfakEkraninaGitsin = mutfakEkraniAktifMi(urun);
    const fizikiYaziciyaGitsin = fisYaziciAktifMi(urun);
    const garsonAdi =
      user?.role === 'waiter'
        ? user?.waiterName || user?.restaurant || user?.email
        : 'İşletme Sahibi';

    if (mutfakEkraninaGitsin) {
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
            yazdirildi: !fizikiYaziciyaGitsin,
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

        if (fizikiYaziciyaGitsin) {
          mutfakFisYazdirmaKontrolEt([yeniMutfakFisi]);
        }

        if (typeof mutfakFisleriniSupabasedenCek === 'function') {
          await mutfakFisleriniSupabasedenCek(mevcutRestaurantId);
        }
      }
    } else if (fizikiYaziciyaGitsin) {
      const yaziciTipi = yaziciDepartmaniniNormalizeEt(urun.departman || 'Mutfak') === 'Bar' ? 'bar' : 'mutfak';
      await yazdirmaKuyrugunaEkle({
        yaziciTipi,
        fisTipi: 'hazirlama',
        baslik: yaziciTipi === 'bar' ? 'Bar Fişi' : 'Mutfak Fişi',
        icerikText: mutfakSiparisFisiTextHazirla({
          masaAdi: masa.ad,
          urunAdi: urun.ad,
          adet,
          notMetni: notMetni || '',
          departman: urun.departman || 'Mutfak',
          garsonAdi,
          baslik: yaziciTipi === 'bar' ? 'BAR FİŞİ' : 'MUTFAK FİŞİ',
        }),
      });
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

    const yeniAraToplam = siparislerAraToplamHesapla(yeniSiparisler);
    const genelIndirimOzeti = yeniSiparisler.length > 0
      ? toplamIndirimHesapla(
          yeniAraToplam,
          masa.adisyonIndirimYuzde || 0,
          masa.adisyonIndirimTutari || 0
        )
      : toplamIndirimHesapla(0, 0, 0);
    const yeniTutar = genelIndirimOzeti.netToplam;

    const { data, error } = await supabase
      .from('masalar')
      .update({
        dolu: yeniSiparisler.length > 0,
        tutar: yeniTutar,
        brut_tutar: genelIndirimOzeti.brutToplam,
        adisyon_indirim_yuzde: yeniSiparisler.length > 0 ? genelIndirimOzeti.indirimYuzde : 0,
        adisyon_indirim_tutari: yeniSiparisler.length > 0 ? genelIndirimOzeti.tlIndirimTutari : 0,
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
      brutTutar: Number(data.brut_tutar || 0),
      adisyonIndirimYuzde: Number(data.adisyon_indirim_yuzde || 0),
      adisyonIndirimTutari: Number(data.adisyon_indirim_tutari || 0),
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

    await iptalFisiniMutfakEkraninaVeYaziciyaGonder(
      masa,
      hedefSiparis,
      1,
      'Adisyondan ürün iptal edildi'
    );
  };

  // adisyondaki seçili ürünün satış fiyatını değiştiren kod
  const adisyonUrunFiyatiDegistir = async (siparisIndex) => {
    const masa = activeMasa;

    if (!masa || !Array.isArray(masa.siparisler)) {
      alert('Fiyatı değiştirilecek adisyon bulunamadı.');
      return;
    }

    const hedefSiparis = masa.siparisler[siparisIndex];

    if (!hedefSiparis) {
      alert('Ürün satırı bulunamadı.');
      return;
    }

    if (hedefSiparis.ikram) {
      alert('İkram ürünün fiyatı değiştirilemez.');
      return;
    }

    const mevcutFiyat = Number(hedefSiparis.fiyat || 0);
    const girilen = window.prompt(`${hedefSiparis.ad} için yeni birim satış fiyatını girin:`, String(mevcutFiyat));

    if (girilen === null) return;

    const yeniFiyat = sayiyaCevir(girilen);

    if (!Number.isFinite(yeniFiyat) || yeniFiyat < 0) {
      alert('Geçerli bir satış fiyatı girin.');
      return;
    }

    const listeFiyati = Number(hedefSiparis.listeFiyati || hedefSiparis.normalFiyat || hedefSiparis.fiyat || yeniFiyat || 0);
    const yeniSiparisler = masa.siparisler.map((s, index) => {
      if (index !== siparisIndex) return s;

      return {
        ...s,
        fiyat: yeniFiyat,
        satisFiyati: yeniFiyat,
        indirimTutari: Math.max(listeFiyati - yeniFiyat, 0),
        indirimYuzde: listeFiyati > 0 && yeniFiyat < listeFiyati ? Math.round(((listeFiyati - yeniFiyat) / listeFiyati) * 10000) / 100 : 0,
        fiyatDegistirildi: Math.abs(yeniFiyat - listeFiyati) > 0.001,
      };
    });

    const yeniAraToplam = siparislerAraToplamHesapla(yeniSiparisler);
    const genelIndirimOzeti = toplamIndirimHesapla(
      yeniAraToplam,
      masa.adisyonIndirimYuzde || 0,
      masa.adisyonIndirimTutari || 0
    );

    const { data, error } = await supabase
      .from('masalar')
      .update({
        tutar: genelIndirimOzeti.netToplam,
        brut_tutar: genelIndirimOzeti.brutToplam,
        adisyon_indirim_yuzde: genelIndirimOzeti.indirimYuzde,
        adisyon_indirim_tutari: genelIndirimOzeti.tlIndirimTutari,
        siparisler: yeniSiparisler,
      })
      .eq('id', masa.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Ürün fiyatı değiştirilemedi:', error);
      alert('Ürün fiyatı değiştirilemedi: ' + error.message);
      return;
    }

    const guncelMasa = {
      ...masa,
      id: data.id,
      restaurantId: data.restaurant_id,
      tutar: Number(data.tutar || 0),
      brutTutar: Number(data.brut_tutar || 0),
      adisyonIndirimYuzde: Number(data.adisyon_indirim_yuzde || 0),
      adisyonIndirimTutari: Number(data.adisyon_indirim_tutari || 0),
      siparisler: Array.isArray(data.siparisler) ? data.siparisler : yeniSiparisler,
      odemeler: Array.isArray(data.odemeler) ? data.odemeler : masa.odemeler || [],
      bolum: data.bolum || masa.bolum || aktifMasaBolumu || 'Salon',
    };

    setMasalar(masalar.map(m => String(m.id) === String(guncelMasa.id) ? guncelMasa : m));
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

    const yeniAraToplam = siparislerAraToplamHesapla(yeniSiparisler);
    const genelIndirimOzeti = yeniSiparisler.length > 0
      ? toplamIndirimHesapla(
          yeniAraToplam,
          masa.adisyonIndirimYuzde || 0,
          masa.adisyonIndirimTutari || 0
        )
      : toplamIndirimHesapla(0, 0, 0);
    const yeniTutar = genelIndirimOzeti.netToplam;

    const { data, error } = await supabase
      .from('masalar')
      .update({
        dolu: yeniSiparisler.length > 0,
        tutar: yeniTutar,
        brut_tutar: genelIndirimOzeti.brutToplam,
        adisyon_indirim_yuzde: yeniSiparisler.length > 0 ? genelIndirimOzeti.indirimYuzde : 0,
        adisyon_indirim_tutari: yeniSiparisler.length > 0 ? genelIndirimOzeti.tlIndirimTutari : 0,
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
      brutTutar: Number(data.brut_tutar || 0),
      adisyonIndirimYuzde: Number(data.adisyon_indirim_yuzde || 0),
      adisyonIndirimTutari: Number(data.adisyon_indirim_tutari || 0),
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
      const notSatiri = s.not ? `<div class="muted">Not: ${htmlGuvenli(s.not)}</div>` : '';
      const ekstraSatiri = Number(s.ekstraUcret || 0) > 0 ? `<div class="muted">Ekstra: +${Number(s.ekstraUcret || 0)} TL</div>` : '';
      const fiyatDegistiSatiri = s.fiyatDegistirildi ? `<div class="muted">Satış fiyatı: ${Number(s.satisFiyati || s.fiyat || 0)} TL</div>` : '';
      const indirimSatiri = Number(s.indirimTutari || 0) > 0
        ? `<div class="muted">İndirim: ${Number(s.indirimTutari || 0)} TL${Number(s.indirimYuzde || 0) > 0 ? ` / %${Number(s.indirimYuzde || 0)}` : ''}</div>`
        : '';
      const ikramSatiri = s.ikram ? `<div class="muted"><strong>İkram</strong></div>` : '';
      const kdvSatiri = `<div class="muted">KDV: %${Number(s.kdvOrani ?? s.kdv_orani ?? 10)}</div>`;

      return `
        <div class="item">
          <div>
            <strong>${htmlGuvenli(s.ad)}</strong>
            <div class="muted">${adet} x ${fiyat} TL</div>
            ${kdvSatiri}
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

  // mutfak fişi satırlarını hazırlayan kod
  const mutfakFisSatirlariHazirla = (fisler = []) => {
    return fisler.map(fis => {
      const iptalMi = String(fis.durum || '') === 'İptal';

      return `
      <div class="kitchen-item">
        <div class="qty">${Number(fis.adet || 1)}x</div>
        <div class="kitchen-detail">
          ${iptalMi ? `<div class="note">*** İPTAL ***</div>` : ''}
          <strong>${iptalMi ? 'İPTAL - ' : ''}${htmlGuvenli(fis.urunAdi || fis.ad || '-')}</strong>
          ${fis.notMetni ? `<div class="note">Not: ${htmlGuvenli(fis.notMetni)}</div>` : ''}
          ${fis.departman ? `<div class="muted">Departman: ${htmlGuvenli(fis.departman)}</div>` : ''}
          <div class="muted">Yazıcı Hedefi: ${htmlGuvenli(yaziciHedefEtiketi(yaziciHedefiBul(fis.departman || 'Mutfak', 'mutfak')))}</div>
        </div>
      </div>
    `;
    }).join('');
  };

  // mutfak ekranındaki siparişi hedef yazıcıya göre ayrı termal fiş pencerelerine bölen kod
  const mutfakFisiYazdir = (fislerInput = [], baslik = 'Mutfak Fişi') => {
    const fisler = (Array.isArray(fislerInput) ? fislerInput : [fislerInput]).filter(Boolean);

    if (fisler.length === 0) {
      alert('Yazdırılacak mutfak fişi bulunamadı.');
      return;
    }

    const gruplar = mutfakFisleriniYaziciyaGoreGrupla(fisler);

    if (gruplar.length > 1) {
      gruplar.forEach(grup => {
        mutfakFisiPenceresiYazdir(grup.fisler, `${baslik} - ${grup.hedef.tur}`, grup.hedef);
      });
      return;
    }

    mutfakFisiPenceresiYazdir(fisler, baslik, gruplar[0]?.hedef || yaziciHedefiBul(fisler[0]?.departman || 'Mutfak', 'mutfak'));
  };

  // hedef yazıcı bilgisiyle tek mutfak/bar fişi penceresi hazırlayan kod
  const mutfakFisiPenceresiYazdir = (fisler = [], baslik = 'Mutfak Fişi', yaziciHedefi = null) => {
    const temizFisler = (Array.isArray(fisler) ? fisler : [fisler]).filter(Boolean);

    if (temizFisler.length === 0) {
      alert('Yazdırılacak mutfak fişi bulunamadı.');
      return;
    }

    const ilkFis = temizFisler[0] || {};
    const hedef = yaziciHedefi || yaziciHedefiBul(ilkFis.departman || 'Mutfak', 'mutfak');
    const tarihSaat = new Date().toLocaleString('tr-TR');
    const masaAdi = ilkFis.masaAdi || 'Mutfak';
    const garsonAdi = ilkFis.garsonAdi || '-';
    const yaziciAdi = yaziciEtiketiHazirla(hedef.adi, hedef.no, hedef.tur || 'Mutfak Yazıcısı');
    const urunSatirlari = mutfakFisSatirlariHazirla(temizFisler);

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${htmlGuvenli(yaziciAdi)} - ${htmlGuvenli(baslik)}</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #000; background: #fff; }
            .receipt { width: 72mm; font-size: 13px; }
            .center { text-align: center; }
            .title { font-size: 18px; font-weight: 900; margin-bottom: 4px; }
            .subtitle { font-size: 11px; margin-bottom: 4px; }
            .line { border-top: 1px dashed #000; margin: 9px 0; }
            .row { display: flex; justify-content: space-between; gap: 8px; margin: 5px 0; }
            .kitchen-item { display: grid; grid-template-columns: 34px 1fr; gap: 8px; border-bottom: 1px dashed #999; padding: 8px 0; }
            .qty { font-size: 20px; font-weight: 900; }
            .kitchen-detail strong { font-size: 17px; }
            .note { font-size: 13px; font-weight: 900; margin-top: 4px; }
            .muted { font-size: 10px; color: #333; margin-top: 3px; }
            .footer { text-align: center; font-size: 10px; margin-top: 10px; }
            .printer-warning { border: 2px solid #000; padding: 6px; margin: 7px 0; text-align: center; font-size: 12px; font-weight: 900; }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${fisBaslikHtml(baslik)}
            <div class="line"></div>
            <div class="row"><span>Hedef</span><strong>${htmlGuvenli(hedef.tur || 'Mutfak')}</strong></div>
            <div class="row"><span>Yazıcı</span><strong>${htmlGuvenli(yaziciAdi)}</strong></div>
            <div class="printer-warning">Windows yazdırma penceresinde seçilecek yazıcı: ${htmlGuvenli(yaziciAdi)}</div>
            <div class="row"><span>Masa/Sipariş</span><strong>${htmlGuvenli(masaAdi)}</strong></div>
            <div class="row"><span>Garson</span><strong>${htmlGuvenli(garsonAdi)}</strong></div>
            <div class="row"><span>Tarih</span><strong>${htmlGuvenli(tarihSaat)}</strong></div>
            <div class="line"></div>
            ${urunSatirlari}
            <div class="line"></div>
            <div class="footer">Fiyat bilgisi mutfak fişinde gösterilmez.</div>
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

    yazdirHtml(html, `${yaziciAdi} - ${baslik}`);
  };

  // mutfak fişi ayarına göre otomatik yazdıran veya kullanıcıya soran kod
  const mutfakFisYazdirmaKontrolEt = (fislerInput = []) => {
    const fisler = (Array.isArray(fislerInput) ? fislerInput : [fislerInput]).filter(Boolean);
    if (fisler.length === 0) return;

    const yazdirmaModu = fisAyarlari?.mutfakFisYazdirmaModu || 'sor';

    if (yazdirmaModu === 'yazdir') {
      mutfakFisiYazdir(fisler);
      return;
    }

    if (yazdirmaModu === 'sor') {
      setMutfakFisSorModal({ fisler });
    }
  };

  // Windows Printer Agent için genel yazdırma kuyruğuna kayıt atan kod
  const yazdirmaKuyrugunaEkle = async ({ yaziciTipi = 'adisyon', fisTipi = 'adisyon', baslik = 'Fiş', icerikText = '', restaurantId = mevcutRestaurantId, payloadJson = null, kaynakTablo = '', kaynakId = '' } = {}) => {
    const hedefRestaurantId = restaurantId || mevcutRestaurantId;

    if (!hedefRestaurantId || String(hedefRestaurantId) === 'super_admin') {
      return null;
    }

    if (!fisKuyruguAktifMi(fisTipi, yaziciTipi)) {
      console.log('Fiş kuyruğu ayar nedeniyle pasif:', fisTipi, yaziciTipi);
      return null;
    }

    const temizIcerik = String(icerikText || '').trim();

    if (!temizIcerik) {
      return null;
    }

    const { data, error } = await supabase
      .from('yazdirma_kuyrugu')
      .insert([
        {
          restaurant_id: hedefRestaurantId,
          yazici_tipi: yaziciTipi || 'adisyon',
          fis_tipi: fisTipi || 'adisyon',
          baslik: baslik || 'Fiş',
          icerik_text: temizIcerik,
          payload_json: payloadJson || null,
          kaynak_tablo: kaynakTablo || null,
          kaynak_id: kaynakId ? String(kaynakId) : null,
          durum: 'Bekliyor',
          yazdirildi: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Yazdırma kuyruğuna kayıt atılamadı:', error);
      return null;
    }

    return data;
  };

  // termal yazıcıya gönderilecek sade metni hizalayan kod
  const termalTextSatiri = (sol = '', sag = '', genislik = 32) => {
    const solMetin = String(sol ?? '').trim();
    const sagMetin = String(sag ?? '').trim();

    if (!sagMetin) return solMetin;

    const bosluk = Math.max(genislik - solMetin.length - sagMetin.length, 1);
    return `${solMetin}${' '.repeat(bosluk)}${sagMetin}`;
  };

  const termalTextOrtala = (metin = '', genislik = 32) => {
    const temizMetin = String(metin ?? '').trim();
    if (temizMetin.length >= genislik) return temizMetin;
    const solBosluk = Math.floor((genislik - temizMetin.length) / 2);
    return `${' '.repeat(solBosluk)}${temizMetin}`;
  };

  const termalTextCizgi = (karakter = '=', genislik = 32) => karakter.repeat(genislik);

  const fisUrunSatirlariTextHazirla = (siparisler = []) => {
    return (Array.isArray(siparisler) ? siparisler : []).flatMap(s => {
      const adet = Number(s.adet || 1);
      const fiyat = Number(s.fiyat || 0);
      const satirToplam = adet * fiyat;
      const satirlar = [
        `${adet} x ${s.ad || '-'}        ${satirToplam} TL`,
        `Birim: ${fiyat} TL / KDV: %${Number(s.kdvOrani ?? s.kdv_orani ?? 10)}`,
      ];

      if (s.not) satirlar.push(`Not: ${s.not}`);
      if (Number(s.ekstraUcret || 0) > 0) satirlar.push(`Ekstra: +${Number(s.ekstraUcret || 0)} TL`);
      if (Number(s.indirimTutari || 0) > 0) satirlar.push(`İndirim: ${Number(s.indirimTutari || 0)} TL${Number(s.indirimYuzde || 0) > 0 ? ` / %${Number(s.indirimYuzde || 0)}` : ''}`);
      if (s.ikram) satirlar.push('İkram');

      satirlar.push(termalTextCizgi('-', 32));
      return satirlar;
    }).join('\r\n');
  };

  const adisyonFisiTextHazirla = (masa, odemeler = [], baslik = 'ADİSYON FİŞİ') => {
    const toplamTutar = Number(masa?.tutar || 0);
    const araToplam = siparislerAraToplamHesapla(masa?.siparisler || []);
    const kdvOzeti = siparislerKdvOzetiHesapla(masa?.siparisler || [], toplamTutar);
    const toplamIndirim = Math.max(araToplam - toplamTutar, 0);
    const odenen = odemeToplami(masa || {});
    const kalan = kalanTutar(masa || {});
    const ayarlar = { ...varsayilanFisAyarlari(user?.restaurant || ''), ...fisAyarlari };
    const odemeSatirlari = (Array.isArray(odemeler) && odemeler.length > 0)
      ? odemeler.flatMap(o => {
        const satirlar = [termalTextSatiri(o.tip || 'Ödeme', `${Number(o.tutar || 0)} TL`)];
        if (Number(o.alinanTutar || 0) > Number(o.tutar || 0)) {
          satirlar.push(termalTextSatiri('Alınan', `${Number(o.alinanTutar || 0)} TL`));
          satirlar.push(termalTextSatiri('Para Üstü', `${Number(o.paraUstu || 0)} TL`));
        }
        return satirlar;
      }).join('\r\n')
      : termalTextSatiri('Ödeme', `${toplamTutar} TL`);

    const urunlerText = fisUrunSatirlariTextHazirla(masa?.siparisler || []);
    const varsayilanText = [
      termalTextOrtala(ayarlar.firmaAdi || user?.restaurant || 'INTEGRA POS'),
      termalTextOrtala(baslik),
      termalTextCizgi('='),
      termalTextSatiri('Masa', masa?.ad || '-'),
      masa?.musteriAdi ? termalTextSatiri('Müşteri', masa.musteriAdi) : '',
      termalTextSatiri('Tarih', new Date().toLocaleString('tr-TR')),
      termalTextCizgi('-'),
      fisUrunSatirlariTextHazirla(masa?.siparisler || []),
      toplamIndirim > 0 ? termalTextSatiri('Toplam İndirim', `-${toplamIndirim} TL`) : '',
      termalTextSatiri('KDV Matrahı', `${kdvOzeti.matrahToplam} TL`),
      termalTextSatiri('KDV Toplamı', `${kdvOzeti.kdvToplam} TL`),
      termalTextSatiri('Toplam', `${toplamTutar} TL`),
      odenen > 0 ? termalTextSatiri('Ödenen', `${odenen} TL`) : '',
      kalan > 0 ? termalTextSatiri('Kalan', `${kalan} TL`) : '',
      termalTextCizgi('-'),
      odemeSatirlari,
      termalTextCizgi('='),
      ayarlar.fisAltNotu || 'Bizi tercih ettiğiniz için teşekkür ederiz.',
    ].filter(Boolean).join('\r\n');

    const paraUstuToplam = (Array.isArray(odemeler) ? odemeler : []).reduce((t, o) => t + Number(o.paraUstu || 0), 0);
    const fisTipi = String(baslik || '').toLocaleLowerCase('tr-TR').includes('hesap') ? 'odeme' : 'adisyon';

    return fisSablonTextHazirla(fisTipi, {
      firma_adi: ayarlar.firmaAdi || user?.restaurant || 'INTEGRA POS',
      fis_baslik: baslik,
      masa_adi: masa?.ad || '-',
      musteri_adi: masa?.musteriAdi || '',
      garson_adi: masa?.adisyonGarsonAdi || user?.waiterName || user?.restaurant || '',
      tarih: new Date().toLocaleString('tr-TR'),
      urunler: urunlerText,
      ara_toplam: `${paraYuvarla(araToplam)} TL`,
      indirim: toplamIndirim > 0 ? `-${paraYuvarla(toplamIndirim)} TL` : '0 TL',
      kdv: `${kdvOzeti.kdvToplam} TL`,
      toplam: `${toplamTutar} TL`,
      odenen: `${odenen} TL`,
      kalan: `${kalan} TL`,
      para_ustu: `${paraYuvarla(paraUstuToplam)} TL`,
      odeme_tipi: (Array.isArray(odemeler) && odemeler.length > 0) ? (odemeler.length > 1 ? 'Parçalı' : odemeler[0]?.tip || 'Ödeme') : 'Ödeme',
      alt_not: ayarlar.fisAltNotu || 'Bizi tercih ettiğiniz için teşekkür ederiz.',
    }, varsayilanText);
  };

  const mutfakSiparisFisiTextHazirla = ({ masaAdi = '-', urunAdi = '-', adet = 1, notMetni = '', departman = 'Mutfak', garsonAdi = '-', baslik = 'MUTFAK FİŞİ' } = {}) => {
    const ayarlar = { ...varsayilanFisAyarlari(user?.restaurant || ''), ...fisAyarlari };

    const urunlerText = `${Number(adet || 1)} x ${urunAdi || '-'}`;
    const varsayilanText = [
      termalTextOrtala(ayarlar.firmaAdi || user?.restaurant || 'INTEGRA POS'),
      termalTextOrtala(baslik),
      termalTextCizgi('='),
      termalTextSatiri('Tarih', new Date().toLocaleString('tr-TR')),
      termalTextSatiri('Masa', masaAdi || '-'),
      termalTextSatiri('Departman', departman || 'Mutfak'),
      termalTextSatiri('Garson', garsonAdi || '-'),
      termalTextCizgi('-'),
      urunlerText,
      notMetni ? `NOT: ${notMetni}` : '',
      termalTextCizgi('='),
    ].filter(Boolean).join('\r\n');

    return fisSablonTextHazirla('mutfak', {
      firma_adi: ayarlar.firmaAdi || user?.restaurant || 'INTEGRA POS',
      fis_baslik: baslik,
      masa_adi: masaAdi || '-',
      departman: departman || 'Mutfak',
      garson_adi: garsonAdi || '-',
      tarih: new Date().toLocaleString('tr-TR'),
      urunler: urunlerText,
      not: notMetni || '',
      alt_not: ayarlar.fisAltNotu || '',
    }, varsayilanText);
  };

  const iptalFisiTextHazirla = ({ masa, siparis, adet = 1, sebep = 'Ürün iptal edildi', departman = 'Mutfak', garsonAdi = '-' } = {}) => {
    const ayarlar = { ...varsayilanFisAyarlari(user?.restaurant || ''), ...fisAyarlari };

    const urunlerText = `İPTAL: ${Number(adet || 1)} x ${siparis?.ad || '-'}`;
    const varsayilanText = [
      termalTextOrtala(ayarlar.firmaAdi || user?.restaurant || 'INTEGRA POS'),
      termalTextOrtala('İPTAL FİŞİ'),
      termalTextCizgi('='),
      termalTextSatiri('Tarih', new Date().toLocaleString('tr-TR')),
      termalTextSatiri('Masa', masa?.ad || '-'),
      termalTextSatiri('Departman', departman || 'Mutfak'),
      termalTextSatiri('Garson', garsonAdi || '-'),
      termalTextCizgi('-'),
      urunlerText,
      siparis?.not ? `Ürün Notu: ${siparis.not}` : '',
      sebep ? `Sebep: ${sebep}` : '',
      termalTextCizgi('='),
    ].filter(Boolean).join('\r\n');

    return fisSablonTextHazirla('iptal', {
      firma_adi: ayarlar.firmaAdi || user?.restaurant || 'INTEGRA POS',
      fis_baslik: 'İPTAL FİŞİ',
      masa_adi: masa?.ad || '-',
      departman: departman || 'Mutfak',
      garson_adi: garsonAdi || '-',
      tarih: new Date().toLocaleString('tr-TR'),
      urunler: urunlerText,
      not: siparis?.not || '',
      iptal_sebebi: sebep || '',
      alt_not: ayarlar.fisAltNotu || '',
    }, varsayilanText);
  };

  // ürün iptal edilince mutfak ekranı ve fiziksel fiş yazıcı ayarını ayrı uygulayan kod
  const iptalFisiniMutfakEkraninaVeYaziciyaGonder = async (masa, siparis, adet = 1, sebep = 'Ürün iptal edildi') => {
    const mutfakEkraninaGitsin = mutfakEkraniAktifMi(siparis);
    const fizikiYaziciyaGitsin = fisYaziciAktifMi(siparis);

    if (!masa || !siparis || (!mutfakEkraninaGitsin && !fizikiYaziciyaGitsin)) {
      return;
    }

    const departman = siparis.departman || 'Mutfak';
    const garsonAdi =
      user?.role === 'waiter'
        ? user?.waiterName || user?.restaurant || user?.email
        : masa.adisyonGarsonAdi || user?.restaurant || 'İşletme Sahibi';
    const notMetni = [
      sebep,
      siparis.not ? `Ürün Notu: ${siparis.not}` : '',
    ].filter(Boolean).join(' | ');

    if (mutfakEkraninaGitsin) {
      const { data, error } = await supabase
        .from('mutfak_fisleri')
        .insert([
          {
            restaurant_id: mevcutRestaurantId,
            masa_id: masa.id,
            masa_adi: masa.ad,
            urun_adi: siparis.ad,
            adet: Number(adet || 1),
            not_metni: notMetni,
            departman,
            garson_adi: garsonAdi,
            durum: 'İptal',
            yazdirildi: !fizikiYaziciyaGitsin,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('İptal fişi mutfak ekranına düşürülemedi:', error);
      } else {
        const yeniIptalFisi = {
          id: data.id,
          restaurantId: data.restaurant_id,
          masaId: data.masa_id,
          masaAdi: data.masa_adi,
          urunAdi: data.urun_adi,
          adet: Number(data.adet || 1),
          notMetni: data.not_metni || '',
          departman: data.departman || departman,
          garsonAdi: data.garson_adi || garsonAdi,
          durum: data.durum || 'İptal',
          createdAt: data.created_at,
        };

        setMutfakFisleri(prev => [
          yeniIptalFisi,
          ...(Array.isArray(prev) ? prev : []),
        ]);
      }
    }

    if (fizikiYaziciyaGitsin) {
      const yaziciTipi = yaziciDepartmaniniNormalizeEt(departman) === 'Bar' ? 'bar' : 'mutfak';

      await yazdirmaKuyrugunaEkle({
        yaziciTipi,
        fisTipi: 'iptal',
        baslik: 'İptal Fişi',
        icerikText: iptalFisiTextHazirla({ masa, siparis, adet, sebep, departman, garsonAdi }),
      });
    }
  };

  // kapatılan adisyon için termal fiş yazdırma penceresi oluşturan kod
  const fisYazdir = (masa, odemeler = []) => {
    if (!masa || !masa.siparisler || masa.siparisler.length === 0) {
      return;
    }

    const toplamTutar = Number(masa.tutar || 0);
    const araToplam = siparislerAraToplamHesapla(masa.siparisler || []);
    const fisKdvOzeti = siparislerKdvOzetiHesapla(masa.siparisler || [], toplamTutar);
    const toplamIndirim = Math.max(araToplam - toplamTutar, 0);
    const indirimSatiri = toplamIndirim > 0
      ? `<div class="row"><span>Toplam İndirim</span><strong>-${toplamIndirim} TL</strong></div>`
      : '';

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
    const adisyonYaziciHedefi = yaziciHedefiBul('Adisyon', 'adisyon');
    const adisyonYaziciAdi = yaziciEtiketiHazirla(adisyonYaziciHedefi.adi, adisyonYaziciHedefi.no, 'Adisyon Yazıcısı');

    const fisHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${htmlGuvenli(adisyonYaziciAdi)} - Fiş</title>
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
          ${fisBaslikHtml('Adisyon Fişi')}
          <div class="line"></div>
          <div class="row"><span>Yazıcı</span><strong>${htmlGuvenli(adisyonYaziciAdi)}</strong></div>
          <div class="row"><span>Masa</span><strong>${htmlGuvenli(masa.ad)}</strong></div>
          ${masa.musteriAdi ? `<div class="row"><span>Müşteri</span><strong>${htmlGuvenli(masa.musteriAdi)}</strong></div>` : ''}
          <div class="row"><span>Tarih</span><strong>${tarihSaat}</strong></div>
          <div class="line"></div>
          ${urunSatirlari}
          <div class="line"></div>
          ${indirimSatiri}
          <div class="row"><span>KDV Matrahı</span><strong>${fisKdvOzeti.matrahToplam} TL</strong></div>
          <div class="row"><span>KDV Toplamı</span><strong>${fisKdvOzeti.kdvToplam} TL</strong></div>
          <div class="row total"><span>Toplam</span><strong>${toplamTutar} TL</strong></div>
          <div class="line"></div>
          ${odemeSatirlari}
          <div class="line"></div>
          ${fisAltNotHtml()}
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

    yazdirmaKuyrugunaEkle({
      yaziciTipi: 'adisyon',
      fisTipi: 'hesap',
      baslik: 'Hesap Fişi',
      icerikText: adisyonFisiTextHazirla(masa, odemeler, 'HESAP FİŞİ'),
    });

    // Printer Agent kuyruğa düşen fişi doğrudan adisyon yazıcısına basar.
    // Tarayıcı önizlemesi açılmasın diye burada yazdirHtml çağrısı yapılmaz.
  };

  // hesap alınmadan önce açık adisyon fişi yazdıran kod
  const adisyonFisiYazdir = (masa) => {
    if (!masa || !Array.isArray(masa.siparisler) || masa.siparisler.length === 0) {
      alert('Yazdırılacak açık adisyon yok.');
      return;
    }

    const toplamTutar = Number(masa.tutar || 0);
    const araToplam = siparislerAraToplamHesapla(masa.siparisler || []);
    const adisyonKdvOzeti = siparislerKdvOzetiHesapla(masa.siparisler || [], toplamTutar);
    const toplamIndirim = Math.max(araToplam - toplamTutar, 0);
    const indirimSatiri = toplamIndirim > 0
      ? `<div class="row"><span>Toplam İndirim</span><strong>-${toplamIndirim} TL</strong></div>`
      : '';
    const odenen = odemeToplami(masa);
    const kalan = kalanTutar(masa);
    const urunSatirlari = fisUrunSatirlariHazirla(masa.siparisler || []);
    const tarihSaat = new Date().toLocaleString('tr-TR');
    const adisyonYaziciHedefi = yaziciHedefiBul('Adisyon', 'adisyon');
    const adisyonYaziciAdi = yaziciEtiketiHazirla(adisyonYaziciHedefi.adi, adisyonYaziciHedefi.no, 'Adisyon Yazıcısı');

    const adisyonHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${htmlGuvenli(adisyonYaziciAdi)} - Hesap Öncesi Adisyon</title>
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
            ${fisBaslikHtml('Hesap Öncesi Adisyon')}
            <div class="line"></div>
            <div class="row"><span>Yazıcı</span><strong>${htmlGuvenli(adisyonYaziciAdi)}</strong></div>
            <div class="row"><span>Masa</span><strong>${htmlGuvenli(masa.ad)}</strong></div>
            ${masa.musteriAdi ? `<div class="row"><span>Müşteri</span><strong>${htmlGuvenli(masa.musteriAdi)}</strong></div>` : ''}
            <div class="row"><span>Açılış</span><strong>${saatYaz(masa.adisyonAcilisSaati)}</strong></div>
            <div class="row"><span>Tarih</span><strong>${tarihSaat}</strong></div>
            <div class="line"></div>
            ${urunSatirlari}
            <div class="line"></div>
            ${indirimSatiri}
            <div class="row"><span>KDV Matrahı</span><strong>${adisyonKdvOzeti.matrahToplam} TL</strong></div>
            <div class="row"><span>KDV Toplamı</span><strong>${adisyonKdvOzeti.kdvToplam} TL</strong></div>
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

    yazdirmaKuyrugunaEkle({
      yaziciTipi: 'adisyon',
      fisTipi: 'adisyon',
      baslik: 'Adisyon Fişi',
      icerikText: adisyonFisiTextHazirla(masa, [], 'ADİSYON FİŞİ'),
    });

    // Printer Agent kuyruğa düşen açık adisyonu doğrudan adisyon yazıcısına basar.
    // Tarayıcı önizlemesi açılmasın diye burada yazdirHtml çağrısı yapılmaz.
  };

  // seçili rapor periyodu için gün sonu / rapor çıktısı oluşturan kod
  const gunSonuRaporuYazdir = () => {
    const urunSatirlari = (raporData.liste || []).map(item => `
      <tr>
        <td>${item.ad}${item.not ? ` / ${item.not}` : ''}</td>
        <td>${item.adet}</td>
        <td>${Number(item.indirimTutari || 0)} TL</td>
        <td>${Number(item.kdvTutari || 0)} TL</td>
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
            ${fisBaslikHtml('Gün Sonu / Rapor Çıktısı')}
            <div class="center"><div class="subtitle">${htmlGuvenli(raporBasligi())}</div></div>
            <div class="line"></div>
            <div class="row"><span>Toplam Ciro</span><strong>${raporData.toplamCiro} TL</strong></div>
            <div class="row"><span>KDV Matrahı</span><strong>${raporData.toplamMatrah || 0} TL</strong></div>
            <div class="row"><span>KDV Toplamı</span><strong>${raporData.toplamKdv || 0} TL</strong></div>
            <div class="row"><span>Toplam İndirim</span><strong>${raporData.toplamIndirim} TL</strong></div>
            <div class="row"><span>Nakit</span><strong>${raporData.nakitToplam} TL</strong></div>
            <div class="row"><span>Kredi Kartı</span><strong>${raporData.kartToplam} TL</strong></div>
            <div class="row"><span>Diğer</span><strong>${raporData.digerOdemeToplam} TL</strong></div>
            <div class="line"></div>
            <strong>Ürün Satışları</strong>
            <table>
              <thead><tr><th>Ürün</th><th>Adet</th><th>İnd.</th><th>KDV</th><th>Ciro</th></tr></thead>
              <tbody>${urunSatirlari || '<tr><td colspan="5">Satış yok</td></tr>'}</tbody>
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

    const paketAraToplamFis = paket.brutTutar || paket.urunler.reduce((toplam, urun) => {
      return toplam + Number(urun.fiyat || 0) * Number(urun.adet || 1);
    }, 0);
    const toplamTutar = Number(paket.tutar || paketAraToplamFis || 0);
    const paketKdvOzeti = siparislerKdvOzetiHesapla(paket.urunler || [], toplamTutar);
    const toplamIndirim = Math.max(Number(paketAraToplamFis || 0) - toplamTutar, 0);
    const indirimSatiri = toplamIndirim > 0
      ? `<div class="row"><span>Toplam İndirim</span><strong>-${toplamIndirim} TL</strong></div>`
      : '';

    const urunSatirlari = paket.urunler.map(u => `
      <div class="item">
        <div>
          <strong>${htmlGuvenli(u.ad)}</strong>${u.not ? `<div class="muted">Not: ${htmlGuvenli(u.not)}</div>` : ''}
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
            ${fisBaslikHtml('Paket Servis Fişi')}

            <div class="line"></div>

            <div class="row"><span>Müşteri</span><strong>${htmlGuvenli(paket.musteriAdi || '-')}</strong></div>
            <div class="row"><span>Telefon</span><strong>${htmlGuvenli(paket.telefon || '-')}</strong></div>
            <div class="row"><span>Durum</span><strong>${htmlGuvenli(paket.durum || '-')}</strong></div>
            <div class="row"><span>Ödeme</span><strong>${htmlGuvenli(paket.odemeTipi || 'Bekliyor')}</strong></div>
            ${paket.odendi ? `<div class="row"><span>Alınan</span><strong>${Number(paket.alinanTutar || paket.tutar || 0)} TL</strong></div>` : ''}
            ${Number(paket.paraUstu || 0) > 0 ? `<div class="row"><span>Para Üstü</span><strong>${Number(paket.paraUstu || 0)} TL</strong></div>` : ''}
            <div class="row"><span>Tarih</span><strong>${tarihSaat}</strong></div>

            ${paket.adres ? `<div class="note"><strong>Adres:</strong> ${htmlGuvenli(paket.adres)}</div>` : ''}
            ${paket.notMetni ? `<div class="note"><strong>Not:</strong> ${htmlGuvenli(paket.notMetni)}</div>` : ''}

            <div class="line"></div>
            ${urunSatirlari}
            <div class="line"></div>

            ${indirimSatiri}
            <div class="row"><span>KDV Matrahı</span><strong>${paketKdvOzeti.matrahToplam} TL</strong></div>
            <div class="row"><span>KDV Toplamı</span><strong>${paketKdvOzeti.kdvToplam} TL</strong></div>
            <div class="row total"><span>Toplam</span><strong>${toplamTutar} TL</strong></div>

            <div class="line"></div>
            ${fisAltNotHtml('Afiyet olsun.')}
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

  // açık masanın genel toplam indirimini Supabase'e kaydeden kod
  const adisyonToplamIndirimiKaydet = async () => {
    const masa = activeMasa;

    if (!masa || !masa.dolu || !Array.isArray(masa.siparisler) || masa.siparisler.length === 0) {
      alert('İndirim uygulanacak açık adisyon yok.');
      return;
    }

    const araToplam = siparislerAraToplamHesapla(masa.siparisler);
    const indirimOzeti = toplamIndirimHesapla(
      araToplam,
      adisyonToplamIndirimYuzde,
      adisyonToplamIndirimTutari
    );

    if (odemeToplami(masa) > indirimOzeti.netToplam) {
      alert('Bu adisyonda alınan ödeme yeni indirimli toplamdan fazla. Önce ödeme durumunu kontrol edin.');
      return;
    }

    const { data, error } = await supabase
      .from('masalar')
      .update({
        tutar: indirimOzeti.netToplam,
        brut_tutar: indirimOzeti.brutToplam,
        adisyon_indirim_yuzde: indirimOzeti.indirimYuzde,
        adisyon_indirim_tutari: indirimOzeti.tlIndirimTutari,
      })
      .eq('id', masa.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Adisyon toplam indirimi kaydedilemedi:', error);
      alert('Toplam indirim kaydedilemedi: ' + error.message);
      return;
    }

    const guncelMasa = {
      ...masa,
      tutar: Number(data.tutar || 0),
      brutTutar: Number(data.brut_tutar || indirimOzeti.brutToplam),
      adisyonIndirimYuzde: Number(data.adisyon_indirim_yuzde || 0),
      adisyonIndirimTutari: Number(data.adisyon_indirim_tutari || 0),
    };

    setMasalar(masalar.map(m => String(m.id) === String(guncelMasa.id) ? guncelMasa : m));

    alert(`Toplam indirim kaydedildi. Yeni adisyon toplamı: ${indirimOzeti.netToplam} TL`);
  };

  // nakit veya kredi kartı ile parçalı ödeme alan ve ödeme tamamlanınca hesabı kapatan fonksiyon
  const odemeAl = async (odemeTipi) => {
    const masa = activeMasa;

    if (!masa || !masa.siparisler || masa.siparisler.length === 0) {
      alert('Bu masada ödeme alınacak adisyon yok.');
      return;
    }

    if (Array.isArray(bolunecekSiparisIndexleri) && bolunecekSiparisIndexleri.length > 0) {
      await bolunmusAdisyonOdemeAl(odemeTipi);
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
        brutTutar: Number(data.brut_tutar || 0),
        adisyonIndirimYuzde: Number(data.adisyon_indirim_yuzde || 0),
        adisyonIndirimTutari: Number(data.adisyon_indirim_tutari || 0),
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

    const masaAraToplam = siparislerAraToplamHesapla(masa.siparisler);
    const masaGenelIndirimOzeti = toplamIndirimHesapla(
      masaAraToplam,
      masa.adisyonIndirimYuzde || 0,
      masa.adisyonIndirimTutari || 0
    );
    const dagitilmisMasaSatirlari = toplamIndirimiSatirlaraDagit(
      masa.siparisler,
      masaGenelIndirimOzeti.toplamIndirim,
      masaGenelIndirimOzeti.brutToplam
    );

    // kapanan masadaki ürünleri satış geçmişine ödeme bilgisiyle kaydeden kod
    const satisKayitlari = dagitilmisMasaSatirlari.map(satir => {
      const s = satir.kaynak;
      const satirIndirimTutari = Number(s.indirimTutari || 0) + Number(satir.satirToplamIndirim || 0) / Math.max(Number(s.adet || 1), 1);
      const satirMaliyetKaydi = { ...s, fiyat: Number(satir.netBirimFiyat || 0), adet: Number(s.adet || 1) };
      const birimMaliyet = satisSatiriBirimMaliyetiHesapla(satirMaliyetKaydi);
      const toplamMaliyet = satisSatiriToplamMaliyetiHesapla(satirMaliyetKaydi);

      return ({
      restaurant_id: mevcutRestaurantId,
      masa_id: masa.id,
      masa_adi: masa.ad,
      musteri_adi: masa.musteriAdi || null,
      adisyon_id: adisyonId,
      ad: s.ad,
      fiyat: Number(satir.netBirimFiyat || 0),
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
      satis_fiyati: Number(satir.netBirimFiyat || 0),
      indirim_yuzde: Number(s.indirimYuzde || 0) || Number(masaGenelIndirimOzeti.indirimYuzde || 0),
      indirim_tutari: satirIndirimTutari,
      fiyat_degistirildi: Boolean(s.fiyatDegistirildi) || Number(satir.satirToplamIndirim || 0) > 0,
      ikram: Boolean(s.ikram),
      menu_grubu: s.menuGrubu || 'Genel',
      departman: s.departman || 'Mutfak',
      kdv_orani: Number(s.kdvOrani || 10),
      maliyet: birimMaliyet,
      toplam_maliyet: toplamMaliyet,
      garson_adi: masa.adisyonGarsonAdi || '',
    });
    });
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
        brut_tutar: 0,
        adisyon_indirim_yuzde: 0,
        adisyon_indirim_tutari: 0,
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
    const yeniRaporKayitlari = dagitilmisMasaSatirlari.map(satir => {
      const s = satir.kaynak;
      const satirIndirimTutari = Number(s.indirimTutari || 0) + Number(satir.satirToplamIndirim || 0) / Math.max(Number(s.adet || 1), 1);
      const satirMaliyetKaydi = { ...s, fiyat: Number(satir.netBirimFiyat || 0), adet: Number(s.adet || 1) };
      const birimMaliyet = satisSatiriBirimMaliyetiHesapla(satirMaliyetKaydi);
      const toplamMaliyet = satisSatiriToplamMaliyetiHesapla(satirMaliyetKaydi);

      return ({
      id: Date.now() + Math.random(),
      restaurantId: mevcutRestaurantId,
      masaId: masa.id,
      masaAdi: masa.ad,
      musteriAdi: masa.musteriAdi || '',
      adisyonId: adisyonId,
      ad: s.ad,
      fiyat: Number(satir.netBirimFiyat || 0),
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
      satisFiyati: Number(satir.netBirimFiyat || 0),
      indirimYuzde: Number(s.indirimYuzde || 0) || Number(masaGenelIndirimOzeti.indirimYuzde || 0),
      indirimTutari: satirIndirimTutari,
      fiyatDegistirildi: Boolean(s.fiyatDegistirildi) || Number(satir.satirToplamIndirim || 0) > 0,
      ikram: Boolean(s.ikram),
      menuGrubu: s.menuGrubu || 'Genel',
      departman: s.departman || 'Mutfak',
      kdvOrani: Number(s.kdvOrani || 10),
      maliyet: birimMaliyet,
      toplamMaliyet: toplamMaliyet,
      garsonAdi: masa.adisyonGarsonAdi || '',
    });
    });

    setSatisGecmisi([...satisGecmisi, ...yeniRaporKayitlari]);

    const guncelMasa = {
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      dolu: data.dolu || false,
      tutar: Number(data.tutar || 0),
      brutTutar: Number(data.brut_tutar || 0),
      adisyonIndirimYuzde: Number(data.adisyon_indirim_yuzde || 0),
      adisyonIndirimTutari: Number(data.adisyon_indirim_tutari || 0),
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
      brutTutar: Number(data.brut_tutar || 0),
      adisyonIndirimYuzde: Number(data.adisyon_indirim_yuzde || 0),
      adisyonIndirimTutari: Number(data.adisyon_indirim_tutari || 0),
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
    const satilanSiparisler = Array.isArray(siparisler) ? siparisler : [];

    const stokGuncellenecekler = satilanSiparisler
      .map(s => {
        const urun = menuUrunleri.find(u => String(u.id) === String(s.urunId));
        return { siparis: s, urun };
      })
      .filter(x => x.urun && x.urun.stokTakip && !urunSatistaUretilecekMi(x.urun));

    const yeniMenu = [...menuUrunleri];

    for (const { siparis, urun } of stokGuncellenecekler) {
      const mevcutStok = Number(urun.stokAdedi || 0);
      const dusulecekAdet = Number(siparis.adet || 1);
      const yeniStok = Math.max(0, mevcutStok - dusulecekAdet);

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

    if (stokGuncellenecekler.length > 0) {
      setMenuUrunleri(yeniMenu);
    }

    // Ürün reçetesi tanımlıysa hammaddeleri de otomatik stoktan düşüren kod
    const receteHareketleri = [];
    const malzemeGuncellemeleri = {};

    satilanSiparisler.forEach(siparis => {
      const satilanUrun = menuUrunleri.find(u => String(u.id) === String(siparis.urunId));
      if (!urunSatistaUretilecekMi(satilanUrun)) return;

      const receteSatirlari = (Array.isArray(urunReceteleri) ? urunReceteleri : [])
        .filter(r => String(r.urunId) === String(siparis.urunId));

      receteSatirlari.forEach(r => {
        const adet = Number(siparis.adet || 1);
        const dusulecekMiktar = receteSatiriFireliMiktar(r) * adet;
        if (!dusulecekMiktar || dusulecekMiktar <= 0) return;

        malzemeGuncellemeleri[r.malzemeId] = Number(malzemeGuncellemeleri[r.malzemeId] || 0) + dusulecekMiktar;
        const malzeme = stokMalzemeleri.find(m => String(m.id) === String(r.malzemeId));
        receteHareketleri.push({
          restaurant_id: mevcutRestaurantId,
          malzeme_id: r.malzemeId,
          urun_id: siparis.urunId || null,
          tip: 'Çıkış',
          miktar: dusulecekMiktar,
          aciklama: `${siparis.ad || 'Ürün'} satışı otomatik üretim hammadde düşümü`,
        });
      });
    });

    if (Object.keys(malzemeGuncellemeleri).length === 0) return;

    const yeniMalzemeler = stokMalzemeleri.map(m => {
      const dusulecek = Number(malzemeGuncellemeleri[m.id] || 0);
      return dusulecek > 0 ? { ...m, stokMiktari: paraYuvarla(Number(m.stokMiktari || 0) - dusulecek) } : m;
    });

    for (const malzeme of yeniMalzemeler) {
      if (!malzemeGuncellemeleri[malzeme.id]) continue;
      const { error } = await supabase
        .from('stok_malzemeleri')
        .update({ stok_miktari: malzeme.stokMiktari })
        .eq('id', malzeme.id)
        .eq('restaurant_id', mevcutRestaurantId);

      if (error) console.error('Reçete hammadde stok düşme hatası:', error);
    }

    if (receteHareketleri.length > 0) {
      const { error } = await supabase.from('stok_hareketleri').insert(receteHareketleri);
      if (error) console.warn('Stok hareketleri kaydedilemedi:', error.message);
    }

    setStokMalzemeleri(yeniMalzemeler);
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

    const paketHazirNotlar = Array.isArray(urun.menuNotlari) ? urun.menuNotlari : [];
    const seciliPaketHazirNot = paketHazirNotlar.find(n => String(n.id) === String(paketSeciliHazirNotId));
    const urunNotu = seciliPaketHazirNot
      ? String(seciliPaketHazirNot.ad || '').trim()
      : String(paketSeciliUrunNotu || '').trim();
    const paketNotEkstraFiyat = seciliPaketHazirNot ? Math.max(Number(seciliPaketHazirNot.fiyat || 0), 0) : 0;
    const paketBirimFiyat = Number(urun.fiyat || 0) + paketNotEkstraFiyat;

    const mevcutIndex = paketUrunler.findIndex(u => {
      return String(u.urunId) === String(urun.id) && String(u.not || '') === String(urunNotu || '') && Number(u.ekstraUcret || 0) === Number(paketNotEkstraFiyat || 0);
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
        fiyat: paketBirimFiyat,
        normalFiyat: Number(urun.fiyat || 0),
        listeFiyati: paketBirimFiyat,
        satisFiyati: paketBirimFiyat,
        ekstraUcret: paketNotEkstraFiyat,
        maliyet: Number(urun.maliyet || 0),
        adet,
        not: urunNotu,
        menuGrubu: urun.menuGrubu || urun.kategori || 'Genel',
        departman: urun.departman || 'Mutfak',
        kdvOrani: Number(urun.kdvOrani || 10),
        mutfagaGitsin: mutfakEkraniAktifMi(urun),
        mutfakEkraninaGitsin: mutfakEkraniAktifMi(urun),
        yaziciyaGitsin: fisYaziciAktifMi(urun),
      });
    }

    setPaketUrunler(yeniListe);
    setPaketSeciliUrunId('');
    setPaketSeciliAdet(1);
    setPaketSeciliHazirNotId('');
    setPaketSeciliUrunNotu('');
  };

  // paket servis ürününü listeden çıkaran kod
  const paketUrunSil = (index) => {
    setPaketUrunler(paketUrunler.filter((_, i) => i !== index));
  };

  // paket servis toplamını hesaplayan kod
  const paketAraToplam = paketUrunler.reduce((toplam, urun) => {
    return toplam + Number(urun.fiyat || 0) * Number(urun.adet || 1);
  }, 0);
  const paketIndirimOzeti = toplamIndirimHesapla(
    paketAraToplam,
    paketToplamIndirimYuzde,
    paketToplamIndirimTutari
  );
  const paketToplam = paketIndirimOzeti.netToplam;

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
          brut_tutar: paketIndirimOzeti.brutToplam,
          indirim_yuzde: paketIndirimOzeti.indirimYuzde,
          indirim_tutari: paketIndirimOzeti.tlIndirimTutari,
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
      brutTutar: Number(data.brut_tutar || paketIndirimOzeti.brutToplam || 0),
      indirimYuzde: Number(data.indirim_yuzde || paketIndirimOzeti.indirimYuzde || 0),
      indirimTutari: Number(data.indirim_tutari || paketIndirimOzeti.tlIndirimTutari || 0),
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
        return mutfakEkraniAktifMi(paketUrun) && mutfakEkraniAktifMi(menuUrunu);
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
          yazdirildi: !(fisYaziciAktifMi(paketUrun) && fisYaziciAktifMi(menuUrunu)),
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

        mutfakFisYazdirmaKontrolEt(yeniMutfakFisleri);
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
    setPaketToplamIndirimYuzde('');
    setPaketToplamIndirimTutari('');
    setPaketSeciliUrunId('');
    setPaketSeciliAdet(1);
    setPaketSeciliHazirNotId('');
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

    const paketAraToplamKapanis = siparislerAraToplamHesapla(paket.urunler);
    const paketIndirimOzetiKapanis = toplamIndirimHesapla(
      paketAraToplamKapanis,
      paket.indirimYuzde || 0,
      paket.indirimTutari || 0
    );
    const dagitilmisPaketSatirlari = toplamIndirimiSatirlaraDagit(
      paket.urunler,
      paketIndirimOzetiKapanis.toplamIndirim,
      paketIndirimOzetiKapanis.brutToplam
    );

    const satisKayitlari = dagitilmisPaketSatirlari.map(satir => {
      const u = satir.kaynak;
      const satirIndirimTutari = Number(satir.satirToplamIndirim || 0) / Math.max(Number(u.adet || 1), 1);

      return ({
      restaurant_id: mevcutRestaurantId,
      masa_id: null,
      masa_adi: 'Paket Servis',
      musteri_adi: paket.musteriAdi || '',
      adisyon_id: adisyonId,
      ad: u.ad,
      fiyat: Number(satir.netBirimFiyat || 0),
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
      satis_fiyati: Number(satir.netBirimFiyat || 0),
      indirim_yuzde: Number(paketIndirimOzetiKapanis.indirimYuzde || 0),
      indirim_tutari: satirIndirimTutari,
      fiyat_degistirildi: Number(satir.satirToplamIndirim || 0) > 0,
      menu_grubu: u.menuGrubu || 'Genel',
      departman: u.departman || 'Paket Servis',
      kdv_orani: Number(u.kdvOrani || 10),
      garson_adi: paket.kuryeAdi || 'Paket Servis',
      siparis_tipi: 'Paket Servis',
      paket_siparis_id: paket.id,
    });
    });

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
      brutTutar: Number(paket.brutTutar || paketIndirimOzetiKapanis.brutToplam || 0),
      indirimYuzde: Number(paket.indirimYuzde || paketIndirimOzetiKapanis.indirimYuzde || 0),
      indirimTutari: Number(paket.indirimTutari || paketIndirimOzetiKapanis.tlIndirimTutari || 0),
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

    const yeniRaporKayitlari = dagitilmisPaketSatirlari.map(satir => {
      const u = satir.kaynak;
      const satirIndirimTutari = Number(satir.satirToplamIndirim || 0) / Math.max(Number(u.adet || 1), 1);

      return ({
      id: Date.now() + Math.random(),
      restaurantId: mevcutRestaurantId,
      masaId: null,
      masaAdi: 'Paket Servis',
      musteriAdi: paket.musteriAdi || '',
      adisyonId,
      ad: u.ad,
      fiyat: Number(satir.netBirimFiyat || 0),
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
      satisFiyati: Number(satir.netBirimFiyat || 0),
      indirimYuzde: Number(paketIndirimOzetiKapanis.indirimYuzde || 0),
      indirimTutari: satirIndirimTutari,
      fiyatDegistirildi: Number(satir.satirToplamIndirim || 0) > 0,
      menuGrubu: u.menuGrubu || 'Genel',
      departman: u.departman || 'Paket Servis',
      kdvOrani: Number(u.kdvOrani || 10),
      garsonAdi: paket.kuryeAdi || 'Paket Servis',
      siparisTipi: 'Paket Servis',
      paketSiparisId: paket.id,
    });
    });

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
      brutTutar: Number(data.brut_tutar || 0),
      adisyonIndirimYuzde: Number(data.adisyon_indirim_yuzde || 0),
      adisyonIndirimTutari: Number(data.adisyon_indirim_tutari || 0),
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
      brutTutar: Number(data.brut_tutar || 0),
      adisyonIndirimYuzde: Number(data.adisyon_indirim_yuzde || 0),
      adisyonIndirimTutari: Number(data.adisyon_indirim_tutari || 0),
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


  // hammadde stok kartı ekleyen kod
  const stokMalzemeEkle = async (e) => {
    e.preventDefault();

    const ad = String(yeniStokMalzemeAdi || '').trim();
    if (!ad) {
      alert('Hammadde adı girin.');
      return;
    }

    const kayit = {
      restaurant_id: mevcutRestaurantId,
      ad,
      birim: yeniStokMalzemeBirim || 'adet',
      stok_miktari: sayiyaCevir(yeniStokMalzemeMiktar),
      kritik_miktar: sayiyaCevir(yeniStokMalzemeKritik),
      birim_maliyet: sayiyaCevir(yeniStokMalzemeMaliyet),
    };

    const { data, error } = await supabase
      .from('stok_malzemeleri')
      .insert([kayit])
      .select()
      .single();

    if (error) {
      alert('Hammadde eklenemedi: ' + error.message);
      return;
    }

    setStokMalzemeleri([{
      id: data.id,
      restaurantId: data.restaurant_id,
      ad: data.ad,
      birim: data.birim || 'adet',
      stokMiktari: Number(data.stok_miktari || 0),
      kritikMiktar: Number(data.kritik_miktar || 0),
      birimMaliyet: Number(data.birim_maliyet || 0),
      createdAt: data.created_at,
    }, ...stokMalzemeleri]);

    setYeniStokMalzemeAdi('');
    setYeniStokMalzemeMiktar('');
    setYeniStokMalzemeKritik('');
    setYeniStokMalzemeMaliyet('');
  };

  // hammadde stoğuna giriş yapan kod
  const stokMalzemeStokEkle = async (malzeme) => {
    const eklenecek = sayiyaCevir(stokMalzemeEklenecekMiktarlar[malzeme.id]);
    if (!eklenecek || eklenecek <= 0) {
      alert('Eklenecek miktar girin.');
      return;
    }

    const yeniStok = paraYuvarla(Number(malzeme.stokMiktari || 0) + eklenecek);

    const { data, error } = await supabase
      .from('stok_malzemeleri')
      .update({ stok_miktari: yeniStok })
      .eq('id', malzeme.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      alert('Hammadde stoğu güncellenemedi: ' + error.message);
      return;
    }

    await supabase.from('stok_hareketleri').insert([{
      restaurant_id: mevcutRestaurantId,
      malzeme_id: malzeme.id,
      tip: 'Giriş',
      miktar: eklenecek,
      aciklama: 'Manuel stok girişi',
    }]);

    setStokMalzemeleri(stokMalzemeleri.map(m => String(m.id) === String(malzeme.id) ? {
      ...m,
      stokMiktari: Number(data.stok_miktari || yeniStok),
    } : m));

    setStokMalzemeEklenecekMiktarlar(prev => ({ ...prev, [malzeme.id]: '' }));
  };

  // Supabase'den gelen reçete satırını uygulama formatına çeviren kod
  const receteSatiriniUygulamaFormatinaCevir = (data = {}, yedek = {}) => ({
    id: data.id ?? yedek.id,
    restaurantId: data.restaurant_id ?? yedek.restaurantId ?? mevcutRestaurantId,
    urunId: data.urun_id ?? yedek.urunId,
    malzemeId: data.malzeme_id ?? yedek.malzemeId,
    miktar: Number(data.miktar ?? yedek.miktar ?? 0),
    fireYuzde: Number(data.fire_yuzde ?? yedek.fireYuzde ?? 0),
    hazirlikNotu: data.hazirlik_notu ?? yedek.hazirlikNotu ?? '',
    birimMaliyetSnapshot: Number(data.birim_maliyet_snapshot ?? yedek.birimMaliyetSnapshot ?? 0),
    createdAt: data.created_at ?? yedek.createdAt,
  });

  // reçete satırı kaydederken yeni kolonlar yoksa kullanıcıyı anlaşılır şekilde uyaran kod
  const receteKolonHatasiMesaji = (error) => {
    const mesaj = String(error?.message || '');
    if (mesaj.includes('fire_yuzde') || mesaj.includes('hazirlik_notu') || mesaj.includes('birim_maliyet_snapshot')) {
      return 'Reçete geliştirme SQL kolonları eksik görünüyor. Önce gönderdiğim urun_receteleri SQL tamir kodunu çalıştırın.';
    }
    return mesaj;
  };

  // ürün reçetesine hammadde satırı ekleyen veya aynı satır varsa güncelleyen kod
  const urunReceteSatiriEkle = async () => {
    if (!receteAyarlananUrunId || !receteMalzemeId) {
      alert('Ürün ve hammadde seçin.');
      return;
    }

    const miktar = sayiyaCevir(receteMiktar);
    if (!miktar || miktar <= 0) {
      alert('Reçete miktarı girin.');
      return;
    }

    const secilenMalzeme = aktifStokMalzemeleri.find(m => String(m.id) === String(receteMalzemeId));
    const fireYuzde = Math.max(0, sayiyaCevir(receteFireYuzde));
    const hazirlikNotu = String(receteHazirlikNotu || '').trim();
    const mevcutSatir = receteSatirlariBul(receteAyarlananUrunId)
      .find(r => String(r.malzemeId) === String(receteMalzemeId));

    const kayit = {
      restaurant_id: mevcutRestaurantId,
      urun_id: receteAyarlananUrunId,
      malzeme_id: receteMalzemeId,
      miktar,
      fire_yuzde: fireYuzde,
      hazirlik_notu: hazirlikNotu,
      birim_maliyet_snapshot: Number(secilenMalzeme?.birimMaliyet || 0),
    };

    if (mevcutSatir) {
      const { data, error } = await supabase
        .from('urun_receteleri')
        .update(kayit)
        .eq('id', mevcutSatir.id)
        .eq('restaurant_id', mevcutRestaurantId)
        .select()
        .single();

      if (error) {
        alert('Reçete satırı güncellenemedi: ' + receteKolonHatasiMesaji(error));
        return;
      }

      const guncelSatir = receteSatiriniUygulamaFormatinaCevir(data, {
        ...mevcutSatir,
        urunId: receteAyarlananUrunId,
        malzemeId: receteMalzemeId,
        miktar,
        fireYuzde,
        hazirlikNotu,
        birimMaliyetSnapshot: Number(secilenMalzeme?.birimMaliyet || 0),
      });

      setUrunReceteleri(urunReceteleri.map(r => String(r.id) === String(mevcutSatir.id) ? guncelSatir : r));
    } else {
      const { data, error } = await supabase
        .from('urun_receteleri')
        .insert([kayit])
        .select()
        .single();

      if (error) {
        alert('Reçete satırı eklenemedi: ' + receteKolonHatasiMesaji(error));
        return;
      }

      setUrunReceteleri([...urunReceteleri, receteSatiriniUygulamaFormatinaCevir(data, {
        restaurantId: mevcutRestaurantId,
        urunId: receteAyarlananUrunId,
        malzemeId: receteMalzemeId,
        miktar,
        fireYuzde,
        hazirlikNotu,
        birimMaliyetSnapshot: Number(secilenMalzeme?.birimMaliyet || 0),
      })]);
    }

    setReceteMalzemeId('');
    setReceteMiktar('');
    setReceteFireYuzde('');
    setReceteHazirlikNotu('');
    islemLoguEkle('Reçete', 'Ürün reçetesi satırı kaydedildi.');
  };



  // ürün reçetesine birden fazla hammaddeyi önce taslak listeye ekleyen kod
  const receteTaslakKalemiEkle = () => {
    if (!receteAyarlananUrunId) {
      alert('Önce hangi ürünün reçetesini oluşturacağını seçin. Örn: Kek, Kumpir, Lahmacun.');
      return;
    }

    if (!receteMalzemeId) {
      alert('Reçeteye eklenecek hammaddeyi seçin. Örn: Un, yumurta, kaşar, patates.');
      return;
    }

    const miktar = sayiyaCevir(receteMiktar);
    if (!miktar || miktar <= 0) {
      alert('Bu üründen 1 adet satıldığında kullanılacak hammadde miktarını girin. Örn: 0.200 kg un, 2 adet yumurta.');
      return;
    }

    const secilenMalzeme = aktifStokMalzemeleri.find(m => String(m.id) === String(receteMalzemeId));
    if (!secilenMalzeme) {
      alert('Seçilen hammadde bulunamadı. Önce Reçeteler > Hammadde Stokları bölümünden hammadde kartı açın.');
      return;
    }

    const fireYuzde = Math.max(0, sayiyaCevir(receteFireYuzde));
    const hazirlikNotu = String(receteHazirlikNotu || '').trim();
    const yeniKalem = {
      taslakId: `taslak-${receteMalzemeId}-${Date.now()}`,
      malzemeId: secilenMalzeme.id,
      malzemeAdi: secilenMalzeme.ad,
      birim: secilenMalzeme.birim || 'adet',
      miktar,
      fireYuzde,
      hazirlikNotu,
      birimMaliyetSnapshot: Number(secilenMalzeme.birimMaliyet || 0),
    };

    setReceteTaslakKalemleri(prev => {
      const liste = Array.isArray(prev) ? prev : [];
      const ayniVarMi = liste.some(k => String(k.malzemeId) === String(yeniKalem.malzemeId));
      if (ayniVarMi) {
        return liste.map(k => String(k.malzemeId) === String(yeniKalem.malzemeId) ? { ...k, ...yeniKalem, taslakId: k.taslakId } : k);
      }
      return [...liste, yeniKalem];
    });

    setReceteMalzemeId('');
    setReceteMiktar('');
    setReceteFireYuzde('');
    setReceteHazirlikNotu('');
  };

  const receteTaslakKalemiSil = (taslakId) => {
    setReceteTaslakKalemleri(prev => (Array.isArray(prev) ? prev : []).filter(k => String(k.taslakId) !== String(taslakId)));
  };

  const receteTaslaginiTemizle = () => {
    setReceteTaslakKalemleri([]);
  };

  // taslaktaki tüm hammaddeleri ürüne tek seferde kaydeden kod
  const receteTaslaginiKaydet = async () => {
    if (!receteAyarlananUrunId) {
      alert('Reçetesi oluşturulacak ürünü seçin.');
      return;
    }

    const kalemler = Array.isArray(receteTaslakKalemleri) ? receteTaslakKalemleri : [];
    if (kalemler.length === 0) {
      alert('Önce ürünü oluşturan hammaddeleri listeye ekleyin. Örn: Kek için un + yumurta + şeker.');
      return;
    }

    let yeniReceteListesi = Array.isArray(urunReceteleri) ? [...urunReceteleri] : [];

    for (const kalem of kalemler) {
      const mevcutSatir = yeniReceteListesi
        .filter(r => String(r.urunId) === String(receteAyarlananUrunId))
        .find(r => String(r.malzemeId) === String(kalem.malzemeId));

      const kayit = {
        restaurant_id: mevcutRestaurantId,
        urun_id: receteAyarlananUrunId,
        malzeme_id: kalem.malzemeId,
        miktar: Number(kalem.miktar || 0),
        fire_yuzde: Number(kalem.fireYuzde || 0),
        hazirlik_notu: kalem.hazirlikNotu || '',
        birim_maliyet_snapshot: Number(kalem.birimMaliyetSnapshot || 0),
      };

      if (mevcutSatir) {
        const { data, error } = await supabase
          .from('urun_receteleri')
          .update(kayit)
          .eq('id', mevcutSatir.id)
          .eq('restaurant_id', mevcutRestaurantId)
          .select()
          .single();

        if (error) {
          alert(`${kalem.malzemeAdi} reçeteye güncellenemedi: ${receteKolonHatasiMesaji(error)}`);
          return;
        }

        const guncelSatir = receteSatiriniUygulamaFormatinaCevir(data, {
          ...mevcutSatir,
          urunId: receteAyarlananUrunId,
          malzemeId: kalem.malzemeId,
          miktar: kalem.miktar,
          fireYuzde: kalem.fireYuzde,
          hazirlikNotu: kalem.hazirlikNotu,
          birimMaliyetSnapshot: kalem.birimMaliyetSnapshot,
        });
        yeniReceteListesi = yeniReceteListesi.map(r => String(r.id) === String(mevcutSatir.id) ? guncelSatir : r);
      } else {
        const { data, error } = await supabase
          .from('urun_receteleri')
          .insert([kayit])
          .select()
          .single();

        if (error) {
          alert(`${kalem.malzemeAdi} reçeteye eklenemedi: ${receteKolonHatasiMesaji(error)}`);
          return;
        }

        yeniReceteListesi.push(receteSatiriniUygulamaFormatinaCevir(data, {
          restaurantId: mevcutRestaurantId,
          urunId: receteAyarlananUrunId,
          malzemeId: kalem.malzemeId,
          miktar: kalem.miktar,
          fireYuzde: kalem.fireYuzde,
          hazirlikNotu: kalem.hazirlikNotu,
          birimMaliyetSnapshot: kalem.birimMaliyetSnapshot,
        }));
      }
    }

    setUrunReceteleri(yeniReceteListesi);
    setReceteTaslakKalemleri([]);
    islemLoguEkle('Reçete', `${kalemler.length} hammadde ürüne toplu reçete olarak kaydedildi.`);
    alert('Reçete kaydedildi. Bu ürün artık üretime hazır. Manuel üretimde önce ürün üretip stoğa alırsın; satışta satıldıkça üret modunda satış anında hammaddeler düşer.');
  };

  const receteliUrunUretimModunuGuncelle = async (urunId, yeniMod) => {
    const urun = aktifMenu.find(u => String(u.id) === String(urunId));
    if (!urun) {
      alert('Üretim modu güncellenecek ürün bulunamadı.');
      return;
    }

    const temizMod = yeniMod === 'satisla_uretim' ? 'satisla_uretim' : 'manuel';

    const { error } = await supabase
      .from('menu_urunleri')
      .update({
        uretim_modu: temizMod,
        stok_takip: true,
        uretim_notu: uretimNotu || null,
      })
      .eq('id', urun.id)
      .eq('restaurant_id', mevcutRestaurantId);

    if (error) {
      alert('Üretim modu güncellenemedi. Supabase SQL kolonlarını eklediğinden emin ol: ' + error.message);
      return;
    }

    setMenuUrunleri(menuUrunleri.map(u => String(u.id) === String(urun.id) ? {
      ...u,
      uretimModu: temizMod,
      uretimNotu: uretimNotu || u.uretimNotu || '',
      stokTakip: true,
    } : u));

    setUretimMesaji(`Üretim modu güncellendi: ${temizMod === 'satisla_uretim' ? 'Satışta satıldıkça üret' : 'Manuel üret / stoka al'}`);
    islemLoguEkle('Üretim Modu', `${urun.ad} üretim modu güncellendi.`);
  };

  const receteliUrunuManuelUret = async () => {
    if (!receteAyarlananUrunId) {
      alert('Üretim için önce reçeteli ürün seçin.');
      return;
    }

    const urun = aktifMenu.find(u => String(u.id) === String(receteAyarlananUrunId));
    if (!urun) {
      alert('Üretilecek ürün bulunamadı.');
      return;
    }

    const miktar = Math.max(0, sayiyaCevir(uretimMiktari));
    if (!miktar || miktar <= 0) {
      alert('Üretilecek adet/porsiyon miktarı girin.');
      return;
    }

    const gerekliler = urunUretimGereklilikleriHesapla(urun.id, miktar);
    if (gerekliler.length === 0) {
      alert('Bu ürünün reçetesi yok. Önce ürünü oluşturan hammaddeleri reçeteye ekleyin.');
      return;
    }

    const eksikler = gerekliler.filter(g => !g.yeterli);
    if (eksikler.length > 0) {
      alert('Üretim yapılamaz. Eksik hammaddeler:\n' + eksikler.map(g => `${g.malzeme?.ad || 'Hammadde'}: ${g.eksikMiktar} ${g.malzeme?.birim || ''} eksik`).join('\n'));
      return;
    }

    const yeniMalzemeler = stokMalzemeleri.map(m => {
      const gereken = gerekliler.find(g => String(g.malzeme?.id) === String(m.id));
      if (!gereken) return m;
      return { ...m, stokMiktari: paraYuvarla(Number(m.stokMiktari || 0) - gereken.gerekliMiktar) };
    });

    const mevcutUrunStok = Number(urun.stokAdedi || 0);
    const yeniUrunStok = paraYuvarla(mevcutUrunStok + miktar);

    for (const gereken of gerekliler) {
      const malzeme = yeniMalzemeler.find(m => String(m.id) === String(gereken.malzeme?.id));
      const { error } = await supabase
        .from('stok_malzemeleri')
        .update({ stok_miktari: malzeme?.stokMiktari ?? 0 })
        .eq('id', gereken.malzeme.id)
        .eq('restaurant_id', mevcutRestaurantId);

      if (error) {
        alert(`${gereken.malzeme?.ad || 'Hammadde'} stoktan düşülemedi: ${error.message}`);
        return;
      }
    }

    const { error: urunError } = await supabase
      .from('menu_urunleri')
      .update({
        stok_adedi: yeniUrunStok,
        stok_takip: true,
        uretim_modu: 'manuel',
        uretim_notu: uretimNotu || null,
      })
      .eq('id', urun.id)
      .eq('restaurant_id', mevcutRestaurantId);

    if (urunError) {
      alert('Ürün stoğu üretim sonrası güncellenemedi: ' + urunError.message);
      return;
    }

    const hareketler = [
      ...gerekliler.map(g => ({
        restaurant_id: mevcutRestaurantId,
        malzeme_id: g.malzeme?.id || null,
        urun_id: urun.id,
        tip: 'Üretim Çıkış',
        miktar: g.gerekliMiktar,
        aciklama: `${urun.ad} manuel üretimi için hammadde düşümü`,
      })),
      {
        restaurant_id: mevcutRestaurantId,
        malzeme_id: null,
        urun_id: urun.id,
        tip: 'Üretim Giriş',
        miktar,
        aciklama: `${urun.ad} manuel üretildi ve ürün stoğuna alındı${uretimNotu ? ` - ${uretimNotu}` : ''}`,
      },
    ];

    const { error: hareketError } = await supabase.from('stok_hareketleri').insert(hareketler);
    if (hareketError) console.warn('Üretim stok hareketleri kaydedilemedi:', hareketError.message);

    setStokMalzemeleri(yeniMalzemeler);
    setMenuUrunleri(menuUrunleri.map(u => String(u.id) === String(urun.id) ? {
      ...u,
      stokAdedi: yeniUrunStok,
      stokTakip: true,
      uretimModu: 'manuel',
      uretimNotu: uretimNotu || u.uretimNotu || '',
    } : u));

    setUretimMesaji(`${urun.ad} için ${miktar} adet/porsiyon üretildi. Ürün stoğu ${yeniUrunStok} oldu.`);
    setUretimMiktari('1');
    setUretimNotu('');
    islemLoguEkle('Üretim', `${urun.ad} manuel üretildi. Miktar: ${miktar}`);
  };

  const urunReceteSatiriDuzenlemeyeAl = (satir) => {
    setReceteDuzenlenenSatirId(satir.id);
    setReceteDuzenlemeMiktar(String(satir.miktar || ''));
    setReceteDuzenlemeFireYuzde(String(satir.fireYuzde || ''));
    setReceteDuzenlemeNotu(satir.hazirlikNotu || '');
  };

  const urunReceteDuzenlemeyiIptalEt = () => {
    setReceteDuzenlenenSatirId(null);
    setReceteDuzenlemeMiktar('');
    setReceteDuzenlemeFireYuzde('');
    setReceteDuzenlemeNotu('');
  };

  const urunReceteSatiriGuncelle = async (satir) => {
    const miktar = sayiyaCevir(receteDuzenlemeMiktar);
    if (!miktar || miktar <= 0) {
      alert('Geçerli reçete miktarı girin.');
      return;
    }

    const malzeme = aktifStokMalzemeleri.find(m => String(m.id) === String(satir.malzemeId));
    const fireYuzde = Math.max(0, sayiyaCevir(receteDuzenlemeFireYuzde));
    const hazirlikNotu = String(receteDuzenlemeNotu || '').trim();
    const payload = {
      miktar,
      fire_yuzde: fireYuzde,
      hazirlik_notu: hazirlikNotu,
      birim_maliyet_snapshot: Number(malzeme?.birimMaliyet || 0),
    };

    const { data, error } = await supabase
      .from('urun_receteleri')
      .update(payload)
      .eq('id', satir.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      alert('Reçete satırı güncellenemedi: ' + receteKolonHatasiMesaji(error));
      return;
    }

    const guncelSatir = receteSatiriniUygulamaFormatinaCevir(data, {
      ...satir,
      miktar,
      fireYuzde,
      hazirlikNotu,
      birimMaliyetSnapshot: Number(malzeme?.birimMaliyet || 0),
    });

    setUrunReceteleri(urunReceteleri.map(r => String(r.id) === String(satir.id) ? guncelSatir : r));
    urunReceteDuzenlemeyiIptalEt();
    islemLoguEkle('Reçete', 'Ürün reçetesi satırı güncellendi.');
  };

  // ürün reçetesinden hammadde satırı silen kod
  const urunReceteSatiriSil = async (receteId) => {
    if (!window.confirm('Bu reçete satırı silinsin mi?')) return;

    const { error } = await supabase
      .from('urun_receteleri')
      .delete()
      .eq('id', receteId)
      .eq('restaurant_id', mevcutRestaurantId);

    if (error) {
      alert('Reçete satırı silinemedi: ' + error.message);
      return;
    }

    setUrunReceteleri(urunReceteleri.filter(r => r.id !== receteId));
    islemLoguEkle('Reçete', 'Ürün reçetesi satırı silindi.');
  };

  const urunRecetesiniKopyala = async () => {
    if (!receteAyarlananUrunId || !receteKopyalanacakUrunId) {
      alert('Kopyalama için kaynak ve hedef ürün seçin.');
      return;
    }

    if (String(receteAyarlananUrunId) === String(receteKopyalanacakUrunId)) {
      alert('Aynı üründen aynı ürüne reçete kopyalanamaz.');
      return;
    }

    const kaynakSatirlar = receteSatirlariBul(receteKopyalanacakUrunId);
    if (kaynakSatirlar.length === 0) {
      alert('Kaynak üründe kopyalanacak reçete satırı yok.');
      return;
    }

    const hedefSatirlar = receteSatirlariBul(receteAyarlananUrunId);
    if (hedefSatirlar.length > 0 && !window.confirm('Hedef üründe mevcut reçete var. Silip kaynak reçeteyi kopyalayalım mı?')) {
      return;
    }

    if (hedefSatirlar.length > 0) {
      const { error: silError } = await supabase
        .from('urun_receteleri')
        .delete()
        .eq('restaurant_id', mevcutRestaurantId)
        .eq('urun_id', receteAyarlananUrunId);

      if (silError) {
        alert('Mevcut reçete temizlenemedi: ' + silError.message);
        return;
      }
    }

    const yeniSatirlar = kaynakSatirlar.map(satir => {
      const malzeme = aktifStokMalzemeleri.find(m => String(m.id) === String(satir.malzemeId));
      return {
        restaurant_id: mevcutRestaurantId,
        urun_id: receteAyarlananUrunId,
        malzeme_id: satir.malzemeId,
        miktar: Number(satir.miktar || 0),
        fire_yuzde: Number(satir.fireYuzde || 0),
        hazirlik_notu: satir.hazirlikNotu || '',
        birim_maliyet_snapshot: Number(malzeme?.birimMaliyet || 0),
      };
    });

    const { data, error } = await supabase
      .from('urun_receteleri')
      .insert(yeniSatirlar)
      .select();

    if (error) {
      alert('Reçete kopyalanamadı: ' + receteKolonHatasiMesaji(error));
      return;
    }

    const temizListe = urunReceteleri.filter(r => String(r.urunId) !== String(receteAyarlananUrunId));
    const eklenenler = (Array.isArray(data) ? data : []).map((satir, index) => receteSatiriniUygulamaFormatinaCevir(satir, {
      ...kaynakSatirlar[index],
      restaurantId: mevcutRestaurantId,
      urunId: receteAyarlananUrunId,
    }));
    setUrunReceteleri([...temizListe, ...eklenenler]);
    setReceteKopyalanacakUrunId('');
    islemLoguEkle('Reçete', 'Ürün reçetesi başka üründen kopyalandı.');
  };

  const receteMaliyetiniUrunKartinaYaz = async (urunId) => {
    const maliyet = urunReceteMaliyetiHesapla(urunId);
    if (!maliyet || maliyet <= 0) {
      alert('Bu ürün için hesaplanmış reçete maliyeti yok.');
      return;
    }

    const { data, error } = await supabase
      .from('menu_urunleri')
      .update({ maliyet })
      .eq('id', urunId)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      alert('Ürün kartı maliyeti güncellenemedi: ' + error.message);
      return;
    }

    setMenuUrunleri(menuUrunleri.map(u => String(u.id) === String(urunId) ? { ...u, maliyet: Number(data?.maliyet ?? maliyet) } : u));
    islemLoguEkle('Reçete', 'Reçete maliyeti ürün kartına yazıldı.');
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
          mutfagaGitsin: mutfakEkraniAktifMi(urun),
          mutfakEkraninaGitsin: mutfakEkraniAktifMi(urun),
          yaziciyaGitsin: fisYaziciAktifMi(urun),
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

  // hızlı satışta ürünün satış fiyatını geçici değiştiren kod
  const hizliSatisUrunFiyatiDegistir = (index) => {
    setHizliSatisUrunler(prev => {
      const liste = Array.isArray(prev) ? [...prev] : [];
      const urun = liste[index];
      if (!urun) return liste;

      const mevcutFiyat = Number(urun.fiyat || 0);
      const girilen = window.prompt(`${urun.ad} için yeni birim satış fiyatı`, String(mevcutFiyat));
      if (girilen === null) return liste;

      const yeniFiyat = sayiyaCevir(girilen);
      if (!Number.isFinite(yeniFiyat) || yeniFiyat < 0) {
        alert('Geçerli bir fiyat girin.');
        return liste;
      }

      liste[index] = {
        ...urun,
        fiyat: paraYuvarla(yeniFiyat),
        fiyatDegistirildi: true,
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

  // hızlı satış sepetini satış kapatmadan adisyon yazıcısına gönderen kod
  const hizliSatisAdisyonYazdir = () => {
    if (!Array.isArray(hizliSatisUrunler) || hizliSatisUrunler.length === 0) {
      alert('Adisyon yazdırmak için hızlı satış sepetine ürün ekleyin.');
      return;
    }

    const toplamIndirim = Number(hizliSatisToplamIndirim || 0);

    const hizliSatisFiseGidenUrunler = hizliSatisUrunler.map(u => {
      const adet = Math.max(Number(u.adet || 1), 1);
      const satirBrut = Number(u.fiyat || 0) * adet;
      const satirPayi = hizliSatisAraToplam > 0 ? satirBrut / hizliSatisAraToplam : 0;
      const satirIndirim = Math.min(satirBrut, toplamIndirim * satirPayi);
      const satirNetToplam = Math.max(satirBrut - satirIndirim, 0);
      const netBirimFiyat = adet > 0 ? satirNetToplam / adet : 0;

      return {
        ...u,
        fiyat: Number(netBirimFiyat || 0),
        normalFiyat: Number(u.normalFiyat || u.fiyat || 0),
        listeFiyati: Number(u.fiyat || 0),
        indirimYuzde: hizliSatisIndirimYuzdeSayi,
        indirimTutari: Number(satirIndirim || 0) / adet,
      };
    });

    adisyonFisiYazdir({
      ad: 'Hızlı Satış / Gel-Al',
      musteriAdi: hizliSatisMusteriAdi,
      tutar: Number(hizliSatisToplam || 0),
      siparisler: hizliSatisFiseGidenUrunler,
      odemeler: [],
      adisyonAcilisSaati: new Date().toISOString(),
    });
  };

  // hızlı satışı kapatıp raporlara işleyen kod
  const hizliSatisKapat = async (odemeTipiOverride = null, cariOverride = null) => {
    if (!Array.isArray(hizliSatisUrunler) || hizliSatisUrunler.length === 0) {
      alert('Hızlı satış için ürün seçin.');
      return;
    }

    const tutar = Number(hizliSatisToplam || 0);
    const aktifOdemeTipi = odemeTipiOverride || hizliSatisOdemeTipi || 'Nakit';
    const cariMusteri = aktifOdemeTipi === 'Cari'
      ? (cariOverride || cariMusteriler.find(c => String(c.id) === String(hizliSatisCariMusteriId)))
      : null;
    const hizliSatisMusteriAdi = aktifOdemeTipi === 'Cari' && cariMusteri?.ad ? cariMusteri.ad : 'Gel-Al';
    const alinanTutar = aktifOdemeTipi === 'Cari' ? 0 : sayiyaCevir(hizliSatisAlinanTutar || tutar);
    const toplamIndirim = Number(hizliSatisToplamIndirim || 0);

    if (aktifOdemeTipi === 'Cari' && !cariMusteri) {
      alert('Cariye yazmak için müşteri seçin.');
      return;
    }

    if (aktifOdemeTipi === 'Kredi Kartı' && alinanTutar !== tutar) {
      alert('Kart ödemesinde alınan tutar toplamla aynı olmalı.');
      return;
    }

    if (aktifOdemeTipi === 'Nakit' && alinanTutar < tutar) {
      alert('Nakit alınan tutar toplamdan az olamaz.');
      return;
    }

    if (aktifOdemeTipi === 'Cari') {
      const cariKaydi = await cariHareketEkle(cariMusteri, 'Borç', tutar, 'Hızlı satış / Gel-Al cariye yazıldı');
      if (!cariKaydi) return;
    }

    const paraUstu = aktifOdemeTipi === 'Nakit' ? Math.max(alinanTutar - tutar, 0) : 0;
    const bugun = new Date().toISOString().split('T')[0];
    const kapanisSaati = new Date().toISOString();
    const adisyonId = `hizli-${Date.now()}`;
    const odemeler = [{ tip: aktifOdemeTipi, tutar, alinanTutar, paraUstu, indirimTutari: toplamIndirim, tarih: kapanisSaati }];

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
      musteri_adi: hizliSatisMusteriAdi,
      adisyon_id: adisyonId,
      ad: u.ad,
      fiyat: Number(satir.netBirimFiyat || 0),
      adet: Number(u.adet || 1),
      tarih: bugun,
      odeme_tipi: aktifOdemeTipi,
      odemeler,
      adisyon_acilis_saati: kapanisSaati,
      adisyon_kapanis_saati: kapanisSaati,
      urun_notu: u.not || null,
      ekstra_ucret: Number(u.ekstraUcret || 0),
      normal_fiyat: Number(u.normalFiyat || u.fiyat || 0),
      liste_fiyati: Number(u.fiyat || 0),
      satis_fiyati: Number(satir.netBirimFiyat || 0),
      indirim_yuzde: hizliSatisIndirimYuzdeSayi,
      indirim_tutari: Number(satir.satirIndirim || 0) / Math.max(Number(u.adet || 1), 1),
      fiyat_degistirildi: Boolean(u.fiyatDegistirildi) || Number(satir.satirIndirim || 0) > 0 || Boolean(u.ikram),
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
        return mutfakEkraniAktifMi(hizliUrun) && mutfakEkraniAktifMi(menuUrunu);
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
          yazdirildi: !(fisYaziciAktifMi(hizliUrun) && fisYaziciAktifMi(menuUrunu)),
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

        mutfakFisYazdirmaKontrolEt(yeniMutfakFisleri);
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
        musteriAdi: hizliSatisMusteriAdi,
        adisyonId,
        ad: u.ad,
        fiyat: Number(satir.netBirimFiyat || 0),
        adet: Number(u.adet || 1),
        tarih: bugun,
        odemeTipi: aktifOdemeTipi,
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
        indirimTutari: Number(satir.satirIndirim || 0) / Math.max(Number(u.adet || 1), 1),
        ikram: Boolean(u.ikram),
        fiyatDegistirildi: Boolean(u.fiyatDegistirildi),
      });
      }),
    ]);

    const hizliSatisFiseGidenUrunler = hizliSatisUrunler.map(u => {
      const satir = hizliSatisSatirHesapla(u);
      return {
        ...u,
        fiyat: Number(satir.netBirimFiyat || 0),
        normalFiyat: Number(u.normalFiyat || u.fiyat || 0),
        listeFiyati: Number(u.fiyat || 0),
        indirimYuzde: hizliSatisIndirimYuzdeSayi,
        indirimTutari: Number(satir.satirIndirim || 0) / Math.max(Number(u.adet || 1), 1),
      };
    });

    setSonFisBilgisi({
      masa: { ad: 'Hızlı Satış', musteriAdi: hizliSatisMusteriAdi, tutar, siparisler: hizliSatisFiseGidenUrunler },
      odemeler,
    });

    if (fisYazdirmaModu === 'yazdir') {
      fisYazdir({ ad: 'Hızlı Satış', musteriAdi: hizliSatisMusteriAdi, tutar, siparisler: hizliSatisFiseGidenUrunler }, odemeler);
    } else if (fisYazdirmaModu === 'sor') {
      setFisSorModal({ masa: { ad: 'Hızlı Satış', musteriAdi: hizliSatisMusteriAdi, tutar, siparisler: hizliSatisFiseGidenUrunler }, odemeler });
    }

    setHizliSatisUrunler([]);
    setHizliSatisAlinanTutar('');
    setHizliSatisIndirimYuzde('');
    setHizliSatisIndirimTutari('');
    setHizliSatisCariMusteriId('');
    setHizliSatisCariArama('');
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

    const rezervasyonNotMetni = [
      rezervasyonNotu,
      rezervasyonKaporaTutari ? `Kapora: ${rezervasyonKaporaTutari} TL` : '',
      rezervasyonHatirlatma ? 'WhatsApp hatırlatma açık' : '',
    ].filter(Boolean).join(' | ');

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
        not_metni: rezervasyonNotMetni,
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
    setRezervasyonKaporaTutari('');
    setRezervasyonHatirlatma(true);
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

  // gün sonunu tek işlemle Supabase tarafında kapatıp Kasa Z arşivine aktaran kod
  const gunSonuKapatVeKasayaAktar = async () => {
    if (reportType !== 'gunluk') {
      alert('Gün sonu kapatma için rapor tipini Günlük seçin.');
      return;
    }

    const seciliTarih = raporTarihi || new Date().toISOString().split('T')[0];

    const onay = window.confirm(
      `${seciliTarih} gün sonu kapatılsın mı? Bu işlem günlük masa satışlarını, paket servisleri, hızlı satışları, giderleri, iade/ikram/zayi kayıtlarını ve kasa hareketlerini Kasa bölümündeki Z raporu arşivine aktarır. Kapatılan hareketler rapor ekranında tekrar görünmez.`
    );

    if (!onay) return;

    const gercekKasaDegeri = kasaGercekTutar === '' || kasaGercekTutar === null
      ? null
      : sayiyaCevir(kasaGercekTutar);

    const { data: sonuc, error } = await supabase.rpc('gun_sonu_kapat_v2', {
      p_restaurant_id: mevcutRestaurantId,
      p_tarih: seciliTarih,
      p_gercek_kasa: gercekKasaDegeri,
    });

    if (error) {
      console.error('Gün sonu kapatılamadı:', error);
      alert('Gün sonu kapatılamadı: ' + error.message);
      return;
    }

    if (!sonuc || sonuc.success === false) {
      alert(sonuc?.message || 'Gün sonu kapatılamadı.');
      return;
    }

    const toplamlar = sonuc.toplamlar || {};
    const z = sonuc.z_rapor || {};

    const yeniZRaporu = {
      id: z.id,
      restaurantId: z.restaurant_id || mevcutRestaurantId,
      tarih: z.tarih || seciliTarih,
      toplamCiro: Number(z.toplam_ciro ?? toplamlar.toplamCiro ?? 0),
      nakitSatis: Number(z.nakit_satis ?? toplamlar.nakitSatis ?? 0),
      kartSatis: Number(z.kart_satis ?? toplamlar.kartSatis ?? 0),
      giderToplam: Number(z.gider_toplam ?? toplamlar.giderToplam ?? 0),
      maliyetToplam: Number(z.maliyet_toplam ?? toplamlar.maliyetToplam ?? 0),
      tahminiKar: Number(z.tahmini_kar ?? toplamlar.tahminiKar ?? 0),
      beklenenKasa: Number(z.beklenen_kasa ?? toplamlar.beklenenKasa ?? 0),
      gercekKasa: Number(z.gercek_kasa ?? toplamlar.gercekKasa ?? 0),
      kasaFarki: Number(z.kasa_farki ?? toplamlar.kasaFarki ?? 0),
      detaylar: z.detaylar || sonuc.detaylar || {},
      createdAt: z.created_at || new Date().toISOString(),
    };

    setZRaporlari([yeniZRaporu, ...zRaporlari]);
    setKasaGercekTutar('');

    if (typeof satisGecmisiniSupabasedenCek === 'function') await satisGecmisiniSupabasedenCek(mevcutRestaurantId);
    if (typeof paketSiparisleriniSupabasedenCek === 'function') await paketSiparisleriniSupabasedenCek(mevcutRestaurantId);
    if (typeof giderleriSupabasedenCek === 'function') await giderleriSupabasedenCek(mevcutRestaurantId);
    if (typeof iadeKayitlariniSupabasedenCek === 'function') await iadeKayitlariniSupabasedenCek(mevcutRestaurantId);
    if (typeof kasaHareketleriniSupabasedenCek === 'function') await kasaHareketleriniSupabasedenCek(mevcutRestaurantId);
    if (typeof zRaporlariniSupabasedenCek === 'function') await zRaporlariniSupabasedenCek(mevcutRestaurantId);

    zRaporuYazdir({
      tarih: seciliTarih,
      toplamCiro: Number(toplamlar.toplamCiro ?? yeniZRaporu.toplamCiro ?? 0),
      nakitSatis: Number(toplamlar.nakitSatis ?? yeniZRaporu.nakitSatis ?? 0),
      kartSatis: Number(toplamlar.kartSatis ?? yeniZRaporu.kartSatis ?? 0),
      giderToplam: Number(toplamlar.giderToplam ?? 0),
      iadeIkramZayiToplam: Number(toplamlar.iadeIkramZayiToplam ?? 0),
      maliyetToplam: Number(toplamlar.maliyetToplam ?? yeniZRaporu.maliyetToplam ?? 0),
      tahminiKar: Number(toplamlar.tahminiKar ?? yeniZRaporu.tahminiKar ?? 0),
      beklenenKasa: Number(toplamlar.beklenenKasa ?? yeniZRaporu.beklenenKasa ?? 0),
      gercekKasa: Number(toplamlar.gercekKasa ?? yeniZRaporu.gercekKasa ?? 0),
      kasaFarki: Number(toplamlar.kasaFarki ?? yeniZRaporu.kasaFarki ?? 0),
    });

    alert('Gün sonu başarıyla kapatıldı ve Kasa bölümündeki Z raporları arşivine aktarıldı.');
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
    const yazKdv = rapor?.toplamKdv ?? satisKayitlariKdvOzetiHesapla(bugunkuSatislar).kdvToplam;
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
        <div class="row"><span>Masa Satış</span><strong>${bugunkuMasaSatis} TL</strong></div>
        <div class="row"><span>Paket Servis</span><strong>${bugunkuPaketSatis} TL</strong></div>
        <div class="row"><span>Hızlı Satış</span><strong>${bugunkuHizliSatis} TL</strong></div>
        <div class="row"><span>Cari Satış</span><strong>${bugunkuCariSatis} TL</strong></div>
        <div class="row"><span>İndirim</span><strong>${bugunkuIndirimToplami} TL</strong></div>
        <div class="row"><span>KDV Toplamı</span><strong>${yazKdv} TL</strong></div>
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

    setMasaBirlestirmeModu(false);
    setBirlestirilenKaynakMasaId(null);
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

  // masa birleştirme modunu başlatan kod
  const masaBirlestirmeBaslat = () => {
    if (!activeMasa || !activeMasa.dolu || !activeMasa.siparisler || activeMasa.siparisler.length === 0) {
      setAktarimMesaji('Birleştirilecek dolu bir kaynak masa seçin.');
      return;
    }

    setMasaAktarmaModu(false);
    setAktarilanKaynakMasaId(null);
    setMasaBirlestirmeModu(true);
    setBirlestirilenKaynakMasaId(activeMasa.id);
    setAktarimMesaji(`${activeMasa.ad} birleştiriliyor. Birleşeceği dolu masaya tıklayın.`);
  };

  // masa birleştirme modunu iptal eden kod
  const masaBirlestirmeIptalEt = () => {
    setMasaBirlestirmeModu(false);
    setBirlestirilenKaynakMasaId(null);
    setAktarimMesaji('');
  };

  // dolu masaya tıklayınca adisyonları birleştiren kod
  const masaBirlestirTikla = async (hedefMasa) => {
    if (!masaBirlestirmeModu || !birlestirilenKaynakMasaId) {
      setSelectedMasaId(hedefMasa.id);
      setAktifMasaBolumu(hedefMasa.bolum || 'Salon');
      return;
    }

    const kaynakMasa = tumRestoranMasalari.find(m => String(m.id) === String(birlestirilenKaynakMasaId));

    if (!kaynakMasa) {
      setAktarimMesaji('Kaynak masa bulunamadı.');
      masaBirlestirmeIptalEt();
      return;
    }

    if (String(kaynakMasa.id) === String(hedefMasa.id)) {
      setAktarimMesaji('Aynı masaya birleştirme yapılamaz. Dolu bir hedef masa seçin.');
      return;
    }

    if (!hedefMasa.dolu || !hedefMasa.siparisler || hedefMasa.siparisler.length === 0) {
      setAktarimMesaji('Masa birleştirme için hedef masa dolu olmalı.');
      return;
    }

    const yeniSiparisler = [...(hedefMasa.siparisler || []), ...(kaynakMasa.siparisler || [])];
    const yeniOdemeler = [...(hedefMasa.odemeler || []), ...(kaynakMasa.odemeler || [])];
    const yeniAraToplam = siparislerAraToplamHesapla(yeniSiparisler);
    const hedefIndirimOzeti = toplamIndirimHesapla(
      yeniAraToplam,
      hedefMasa.adisyonIndirimYuzde || 0,
      hedefMasa.adisyonIndirimTutari || 0
    );

    const { data: hedefData, error: hedefError } = await supabase
      .from('masalar')
      .update({
        dolu: true,
        tutar: hedefIndirimOzeti.netToplam,
        brut_tutar: hedefIndirimOzeti.brutToplam,
        adisyon_indirim_yuzde: hedefIndirimOzeti.indirimYuzde,
        adisyon_indirim_tutari: hedefIndirimOzeti.tlIndirimTutari,
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
      setAktarimMesaji('Masa birleştirilemedi: ' + hedefError.message);
      return;
    }

    const { data: kaynakData, error: kaynakError } = await supabase
      .from('masalar')
      .update({
        dolu: false,
        tutar: 0,
        brut_tutar: 0,
        adisyon_indirim_yuzde: 0,
        adisyon_indirim_tutari: 0,
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
      setAktarimMesaji('Hedef masa birleştirildi ama eski masa boşaltılamadı: ' + kaynakError.message);
      return;
    }

    const guncelHedefMasa = {
      id: hedefData.id,
      restaurantId: hedefData.restaurant_id,
      ad: hedefData.ad,
      dolu: hedefData.dolu || false,
      tutar: Number(hedefData.tutar || 0),
      brutTutar: Number(hedefData.brut_tutar || 0),
      adisyonIndirimYuzde: Number(hedefData.adisyon_indirim_yuzde || 0),
      adisyonIndirimTutari: Number(hedefData.adisyon_indirim_tutari || 0),
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
      brutTutar: Number(kaynakData.brut_tutar || 0),
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
    setMasaBirlestirmeModu(false);
    setBirlestirilenKaynakMasaId(null);
    setAktarimMesaji(`${kaynakMasa.ad} → ${hedefMasa.ad} birleştirildi.`);
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
      brutTutar: Number(data.brut_tutar || 0),
      adisyonIndirimYuzde: Number(data.adisyon_indirim_yuzde || 0),
      adisyonIndirimTutari: Number(data.adisyon_indirim_tutari || 0),
      siparisler: Array.isArray(data.siparisler) ? data.siparisler : [],
      odemeler: Array.isArray(data.odemeler) ? data.odemeler : [],
      adisyonAcilisSaati: data.adisyon_acilis_saati || null,
      bolum: data.bolum || aktifMasaBolumu || 'Salon',
    };

    setMasalar([...masalar, yeniMasa]);
    setYeniMasaAdi('');
    setSelectedMasaId(yeniMasa.id);

  };

  // seçili bölüme birden fazla masayı toplu ekleyen kod
  const topluMasaEkle = async (e) => {
    e.preventDefault();

    const adet = Math.max(Number(topluMasaAdet || 0), 0);
    const baslangicNo = Math.max(Number(topluMasaBaslangicNo || 1), 1);
    const onEk = String(topluMasaOnEk || 'Masa').trim() || 'Masa';

    if (!adet || adet <= 0) {
      alert('Toplu masa eklemek için geçerli adet girin.');
      return;
    }

    if (adet > 100) {
      alert('Tek seferde en fazla 100 masa ekleyebilirsiniz.');
      return;
    }

    const kayitlar = Array.from({ length: adet }).map((_, index) => ({
      restaurant_id: mevcutRestaurantId,
      ad: `${onEk} ${baslangicNo + index}`,
      bolum: aktifMasaBolumu || 'Salon',
      dolu: false,
      tutar: 0,
      siparisler: [],
      odemeler: [],
    }));

    const { data, error } = await supabase
      .from('masalar')
      .insert(kayitlar)
      .select();

    if (error) {
      console.error('Toplu masa ekleme hatası:', error);
      alert('Toplu masa eklenemedi: ' + error.message);
      return;
    }

    const yeniMasalar = (Array.isArray(data) ? data : []).map(m => ({
      id: m.id,
      restaurantId: m.restaurant_id,
      ad: m.ad,
      dolu: m.dolu || false,
      tutar: Number(m.tutar || 0),
      brutTutar: Number(m.brut_tutar || 0),
      adisyonIndirimYuzde: Number(m.adisyon_indirim_yuzde || 0),
      adisyonIndirimTutari: Number(m.adisyon_indirim_tutari || 0),
      siparisler: Array.isArray(m.siparisler) ? m.siparisler : [],
      odemeler: Array.isArray(m.odemeler) ? m.odemeler : [],
      adisyonAcilisSaati: m.adisyon_acilis_saati || null,
      bolum: m.bolum || aktifMasaBolumu || 'Salon',
    }));

    setMasalar([...masalar, ...yeniMasalar]);
    if (yeniMasalar[0]) setSelectedMasaId(yeniMasalar[0].id);
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
      brutTutar: Number(data.brut_tutar || 0),
      adisyonIndirimYuzde: Number(data.adisyon_indirim_yuzde || 0),
      adisyonIndirimTutari: Number(data.adisyon_indirim_tutari || 0),
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


  // süper adminin işletme bazlı aktif modül/sekme listesini kaydeden kod
  const restoranModulYetkileriniKaydet = async (restoran, yeniSekmeler, ekstraAlanlar = {}) => {
    if (!restoran?.id) return;

    const temizSekmeler = isletmeSekmeleriniHazirla(yeniSekmeler, restoran.modulPaketi || restoran.paketAdi || 'Premium');

    if (temizSekmeler.length === 0) {
      alert('İşletmede en az bir sekme aktif olmalı.');
      return;
    }

    const guncelleme = {
      aktif_sekmeler: temizSekmeler,
      modul_guncelleme_tarihi: new Date().toISOString(),
      ...ekstraAlanlar,
    };

    const { data, error } = await supabase
      .from('restaurants')
      .update(guncelleme)
      .eq('id', restoran.id)
      .select()
      .single();

    if (error) {
      console.error('İşletme modül yetkileri güncellenemedi:', error);
      alert('Modül yetkileri güncellenemedi. Supabase SQL kolonlarını eklediğinden emin ol. Hata: ' + error.message);
      return;
    }

    const temizRestoran = restoranSatiriniHazirla(data);
    setRestoranlar(restoranlar.map(r => String(r.id) === String(restoran.id) ? temizRestoran : r));
  };

  // süper adminin tek bir işletme sekmesini açıp kapatmasını sağlayan kod
  const restoranModulYetkisiDegistir = async (restoran, sekmeKey, secili) => {
    const mevcutSekmeler = isletmeSekmeleriniHazirla(restoran.aktifSekmeler, restoran.modulPaketi || restoran.paketAdi || 'Premium');
    const yeniSekmeler = secili
      ? Array.from(new Set([...mevcutSekmeler, sekmeKey]))
      : mevcutSekmeler.filter(s => s !== sekmeKey);

    if (yeniSekmeler.length === 0) {
      alert('İşletmede en az bir sekme açık kalmalı.');
      return;
    }

    await restoranModulYetkileriniKaydet(restoran, yeniSekmeler, {
      modul_paketi: restoran.modulPaketi || 'Özel Paket',
    });
  };

  // süper adminin hazır paket şablonunu işletmeye uygulamasını sağlayan kod
  const restoranModulPaketiUygula = async (restoran, paketKey) => {
    const sablon = modulPaketSablonuBul(paketKey);
    if (!sablon) return;

    await restoranModulYetkileriniKaydet(restoran, sablon.sekmeler, {
      modul_paketi: sablon.key,
      paket_adi: restoran.paketAdi || sablon.label,
    });
  };

  // süper adminin işletme modül notunu kaydetmesini sağlayan kod
  const restoranModulNotuGuncelle = async (restoran, notMetni) => {
    if (!restoran?.id) return;

    const { data, error } = await supabase
      .from('restaurants')
      .update({
        modul_notu: notMetni,
        modul_guncelleme_tarihi: new Date().toISOString(),
      })
      .eq('id', restoran.id)
      .select()
      .single();

    if (error) {
      console.error('Modül notu güncellenemedi:', error);
      alert('Modül notu güncellenemedi: ' + error.message);
      return;
    }

    const temizRestoran = restoranSatiriniHazirla(data);
    setRestoranlar(restoranlar.map(r => String(r.id) === String(restoran.id) ? temizRestoran : r));
  };

  // modül yetki kutularını hem lisans hem modül panelinde tekrar kullanmak için hazırlayan kod
  const restoranModulYetkiPaneli = (restoran) => {
    const aktifSekmeler = isletmeSekmeleriniHazirla(restoran.aktifSekmeler, restoran.modulPaketi || restoran.paketAdi || 'Premium');
    const aktifPaket = modulPaketSablonuBul(restoran.modulPaketi || restoran.paketAdi || 'Premium');

    return (
      <div style={{ marginTop: '14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div>
            <h4 style={{ margin: '0 0 4px', color: '#1e293b' }}>🧩 İşletme Modül Yetkileri</h4>
            <div style={{ color: '#64748b', fontSize: '12px', lineHeight: 1.5 }}>
              Aktif paket: <strong>{aktifPaket?.label || restoran.modulPaketi || 'Premium'}</strong> / Açık sekme: <strong>{aktifSekmeler.length}</strong> / {personelSekmeSecenekleri.length}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {modulPaketSablonlari.map(paket => (
              <button
                key={paket.key}
                type="button"
                onClick={() => restoranModulPaketiUygula(restoran, paket.key)}
                title={paket.aciklama}
                style={(restoran.modulPaketi === paket.key || restoran.modulPaketi === paket.label) ? styles.filterBtnActive : styles.filterBtn}
              >
                {paket.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '8px' }}>
          {personelSekmeSecenekleri.map(sekme => {
            const secili = aktifSekmeler.includes(sekme.key);
            return (
              <label
                key={sekme.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: secili ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                  backgroundColor: secili ? '#fff7ed' : '#fff',
                  color: '#334155',
                  padding: '9px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '900',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={secili}
                  onChange={e => restoranModulYetkisiDegistir(restoran, sekme.key, e.target.checked)}
                />
                <span>{sekme.label}</span>
              </label>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: '10px', alignItems: 'end', marginTop: '12px' }}>
          <label style={{ display: 'grid', gap: '5px', fontSize: '12px', color: '#64748b', fontWeight: '800' }}>
            Modül / Satış Notu
            <input
              defaultValue={restoran.modulNotu || ''}
              onBlur={e => restoranModulNotuGuncelle(restoran, e.target.value)}
              placeholder="Örn: QR Plus paketi teklif edildi, kiosk kapalı bırakıldı"
              style={{ ...styles.input, minWidth: '100%' }}
            />
          </label>

          <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px', color: '#64748b', fontSize: '12px', minWidth: isMobile ? '100%' : '230px' }}>
            <div><strong>Kapalı sekme:</strong> {Math.max(personelSekmeSecenekleri.length - aktifSekmeler.length, 0)}</div>
            <div><strong>Personel etkisi:</strong> Kapalı sekmeler personelde de gizlenir.</div>
          </div>
        </div>
      </div>
    );
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

  // restoranın lisans / paket / ödeme alanlarını süper admin panelinden güncelleyen kod
  const restoranLisansAlanGuncelle = async (restoran, alan, deger) => {
    if (!restoran?.id) return;

    const kolonMap = {
      paketAdi: 'paket_adi',
      aylikUcret: 'aylik_ucret',
      lisansDurumu: 'lisans_durumu',
      odemeDurumu: 'odeme_durumu',
      sonOdemeTarihi: 'son_odeme_tarihi',
      sonrakiOdemeTarihi: 'sonraki_odeme_tarihi',
      sonOdemeTutari: 'son_odeme_tutari',
      sonOdemeYontemi: 'son_odeme_yontemi',
      lisansNotu: 'lisans_notu',
      modulPaketi: 'modul_paketi',
      modulNotu: 'modul_notu',
    };

    const kolon = kolonMap[alan];
    if (!kolon) return;

    let temizDeger = deger;
    if (['aylikUcret', 'sonOdemeTutari'].includes(alan)) {
      temizDeger = Math.max(sayiyaCevir(deger), 0);
    }

    const guncelleme = { [kolon]: temizDeger };

    if (alan === 'paketAdi') {
      guncelleme.basvuru_paketi = temizDeger;
      if (temizDeger === 'Profesyonel') {
        guncelleme.aylik_ucret = Number(restoran.aylikUcret || 699) || 699;
        guncelleme.kullanici_limiti = Number(restoran.kullaniciLimiti || 3) || 3;
      }
    }

    if (alan === 'lisansDurumu') {
      guncelleme.durum = temizDeger === 'Aktif' ? 'Aktif' : temizDeger === 'Askıya Alındı' ? 'Donduruldu' : temizDeger;
    }

    const { data, error } = await supabase
      .from('restaurants')
      .update(guncelleme)
      .eq('id', restoran.id)
      .select()
      .single();

    if (error) {
      console.error('Lisans alanı güncellenemedi:', error);
      alert('Lisans bilgisi güncellenemedi: ' + error.message);
      return;
    }

    const temizRestoran = restoranSatiriniHazirla(data);
    setRestoranlar(restoranlar.map(r => String(r.id) === String(restoran.id) ? temizRestoran : r));
  };

  // ödeme alındığında lisansı aktif yapıp sonraki ödeme tarihini 1 ay ileri alan kod
  const restoranOdemeAlindi = async (restoran) => {
    if (!restoran?.id) return;

    const bugun = tarihInputDegeri(new Date());
    const sonrakiOdeme = birAySonraTarih();
    const tutar = Number(restoran.aylikUcret || 699);

    const { data, error } = await supabase
      .from('restaurants')
      .update({
        durum: 'Aktif',
        lisans_durumu: 'Aktif',
        odeme_durumu: 'Ödendi',
        son_odeme_tarihi: bugun,
        sonraki_odeme_tarihi: sonrakiOdeme,
        son_odeme_tutari: tutar,
        son_odeme_yontemi: restoran.sonOdemeYontemi || 'Banka / Havale',
        aylik_ucret: tutar,
        paket_adi: restoran.paketAdi || 'Profesyonel',
      })
      .eq('id', restoran.id)
      .select()
      .single();

    if (error) {
      console.error('Ödeme kaydı güncellenemedi:', error);
      alert('Ödeme kaydı güncellenemedi: ' + error.message);
      return;
    }

    const temizRestoran = restoranSatiriniHazirla(data);
    setRestoranlar(restoranlar.map(r => String(r.id) === String(restoran.id) ? temizRestoran : r));
    alert(`${temizRestoran.ad} için ödeme alındı ve lisans aktif edildi.`);
  };

  // restoran lisansını hızlıca askıya alan kod
  const restoranLisansAskıyaAl = async (restoran) => {
    if (!restoran?.id) return;

    const { data, error } = await supabase
      .from('restaurants')
      .update({
        durum: 'Donduruldu',
        lisans_durumu: 'Askıya Alındı',
        odeme_durumu: 'Ödeme Bekliyor',
      })
      .eq('id', restoran.id)
      .select()
      .single();

    if (error) {
      console.error('Lisans askıya alınamadı:', error);
      alert('Lisans askıya alınamadı: ' + error.message);
      return;
    }

    const temizRestoran = restoranSatiriniHazirla(data);
    setRestoranlar(restoranlar.map(r => String(r.id) === String(restoran.id) ? temizRestoran : r));
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
        mutfak_ekranina_gitsin: yeniMenuGrupMutfagaGitsin,
        yaziciya_gitsin: yeniMenuGrupMutfagaGitsin,
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
      mutfagaGitsin: (data.mutfak_ekranina_gitsin ?? data.mutfaga_gitsin) !== false,
      mutfakEkraninaGitsin: (data.mutfak_ekranina_gitsin ?? data.mutfaga_gitsin) !== false,
      yaziciyaGitsin: (data.yaziciya_gitsin ?? data.mutfaga_gitsin) !== false,
      stokTakip: Boolean(data.stok_takip),
      stokAdedi: Number(data.stok_adedi || 0),
      kritikStok: Number(data.kritik_stok || 0),
      favori: Boolean(data.favori),
      qrMenudeGorunsun: (data.qr_menude_gorunsun ?? data.qrMenudeGorunsun ?? true) !== false,
      satistaAktif: (data.satista_aktif ?? data.satistaAktif ?? data.aktif ?? true) !== false,
      resimUrl: data.resim_url || data.resimUrl || '',
    };

    setMenuGruplari([...menuGruplari, yeniGrup]);
    setAktifMenuGrubu(yeniGrup.ad);
    setYeniMenuGrupAdi('');
    setYeniMenuGrupDepartmani('Mutfak');
    setYeniMenuGrupKdvOrani('10');
    setYeniMenuGrupMutfagaGitsin(true);
  };

  // menü grubunun yazıcı hedefini ayarlayan ve ürünlere uygulayan kod
  const menuGrubuYaziciHedefiAyarla = async (grup, yeniDepartman) => {
    if (!grup || !grup.ad) {
      alert('Grup bulunamadı.');
      return;
    }

    const temizDepartman = yaziciDepartmaniniNormalizeEt(yeniDepartman);
    const grupDbdeVarMi = !String(grup.id).startsWith('varsayilan-') && !String(grup.id).startsWith('demo-') && !String(grup.id).startsWith('urun-grup-');
    let kayitliGrup = null;

    if (grupDbdeVarMi) {
      const { data, error } = await supabase
        .from('menu_gruplari')
        .update({ departman: temizDepartman, yaziciya_gitsin: true })
        .eq('id', grup.id)
        .eq('restaurant_id', mevcutRestaurantId)
        .select()
        .single();

      if (error) {
        console.error('Grup yazıcı hedefi güncellenemedi:', error);
        alert('Grup yazıcı hedefi güncellenemedi: ' + error.message);
        return;
      }

      kayitliGrup = data;
    } else {
      const { data, error } = await supabase
        .from('menu_gruplari')
        .insert([
          {
            restaurant_id: mevcutRestaurantId,
            ad: grup.ad,
            departman: temizDepartman,
            kdv_orani: Number(grup.kdvOrani || 10),
            mutfaga_gitsin: mutfakEkraniAktifMi(grup),
            mutfak_ekranina_gitsin: mutfakEkraniAktifMi(grup),
            yaziciya_gitsin: true,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Grup yazıcı hedefi kaydedilemedi:', error);
        alert('Grup yazıcı hedefi kaydedilemedi: ' + error.message);
        return;
      }

      kayitliGrup = data;
    }

    const { error: urunError } = await supabase
      .from('menu_urunleri')
      .update({ departman: temizDepartman, yaziciya_gitsin: true })
      .eq('restaurant_id', mevcutRestaurantId)
      .eq('menu_grubu', grup.ad);

    if (urunError) {
      console.error('Grup ürün yazıcı hedefi güncellenemedi:', urunError);
      alert('Grup hedefi kaydedildi ama ürünlere uygulanamadı: ' + urunError.message);
      return;
    }

    const guncelGrup = {
      id: kayitliGrup.id,
      restaurantId: kayitliGrup.restaurant_id,
      ad: kayitliGrup.ad,
      departman: kayitliGrup.departman || temizDepartman,
      kdvOrani: Number(kayitliGrup.kdv_orani || grup.kdvOrani || 10),
      mutfagaGitsin: mutfakEkraniAktifMi(kayitliGrup),
      mutfakEkraninaGitsin: mutfakEkraniAktifMi(kayitliGrup),
      yaziciyaGitsin: true,
    };

    setMenuGruplari(prev => {
      const liste = Array.isArray(prev) ? prev : [];
      const kalanlar = liste.filter(g => String(g.id) !== String(grup.id) && g.ad !== grup.ad);
      return [...kalanlar, guncelGrup];
    });

    setMenuUrunleri(menuUrunleri.map(u => {
      if (String(u.restaurantId) === String(mevcutRestaurantId) && (u.menuGrubu || u.kategori || 'Genel') === grup.ad) {
        return {
          ...u,
          departman: temizDepartman,
          yaziciyaGitsin: true,
        };
      }

      return u;
    }));
  };

  // menü grubunun mutfak ekranında görünüp görünmeyeceğini ayarlayan kod
  const menuGrubuMutfakDurumunuAyarla = async (grup, yeniDurum) => {
    if (!grup || !grup.ad) {
      alert('Grup bulunamadı.');
      return;
    }

    let kayitliGrupData = null;
    const mevcutYaziciDurumu = fisYaziciAktifMi(grup);

    if (menuGrubuDbKaydiVarMi(grup)) {
      const { data, error } = await supabase
        .from('menu_gruplari')
        .update({
          mutfaga_gitsin: yeniDurum,
          mutfak_ekranina_gitsin: yeniDurum,
        })
        .eq('id', grup.id)
        .eq('restaurant_id', mevcutRestaurantId)
        .select()
        .single();

      if (error) {
        console.error('Grup mutfak ekranı durumu güncellenemedi:', error);
        alert('Grup mutfak ekranı durumu güncellenemedi: ' + error.message);
        return;
      }

      kayitliGrupData = data;
    } else {
      const { data, error } = await supabase
        .from('menu_gruplari')
        .insert([
          {
            restaurant_id: mevcutRestaurantId,
            ad: grup.ad,
            departman: grup.departman || 'Mutfak',
            kdv_orani: Number(grup.kdvOrani || 10),
            mutfaga_gitsin: yeniDurum,
            mutfak_ekranina_gitsin: yeniDurum,
            yaziciya_gitsin: mevcutYaziciDurumu,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Grup mutfak ekranı durumu kaydedilemedi:', error);
        alert('Grup mutfak ekranı durumu kaydedilemedi: ' + error.message);
        return;
      }

      kayitliGrupData = data;
    }

    const { error: urunError } = await supabase
      .from('menu_urunleri')
      .update({
        mutfaga_gitsin: yeniDurum,
        mutfak_ekranina_gitsin: yeniDurum,
      })
      .eq('restaurant_id', mevcutRestaurantId)
      .eq('menu_grubu', grup.ad);

    if (urunError) {
      console.error('Grup ürün mutfak ekranı durumu güncellenemedi:', urunError);
      alert('Grup kaydedildi ama ürünlere uygulanamadı: ' + urunError.message);
      return;
    }

    const guncelGrup = {
      id: kayitliGrupData.id,
      restaurantId: kayitliGrupData.restaurant_id,
      ad: kayitliGrupData.ad,
      departman: kayitliGrupData.departman || grup.departman || 'Mutfak',
      kdvOrani: Number(kayitliGrupData.kdv_orani || grup.kdvOrani || 10),
      mutfagaGitsin: (kayitliGrupData.mutfak_ekranina_gitsin ?? kayitliGrupData.mutfaga_gitsin) !== false,
      mutfakEkraninaGitsin: (kayitliGrupData.mutfak_ekranina_gitsin ?? kayitliGrupData.mutfaga_gitsin) !== false,
      yaziciyaGitsin: (kayitliGrupData.yaziciya_gitsin ?? mevcutYaziciDurumu) !== false,
    };

    setMenuGruplari(prev => {
      const liste = Array.isArray(prev) ? prev : [];
      const kalanlar = liste.filter(g => String(g.id) !== String(grup.id) && g.ad !== grup.ad);
      return [...kalanlar, guncelGrup];
    });

    setMenuUrunleri(menuUrunleri.map(u => {
      if (String(u.restaurantId) === String(mevcutRestaurantId) && (u.menuGrubu || u.kategori || 'Genel') === grup.ad) {
        return {
          ...u,
          mutfagaGitsin: yeniDurum,
          mutfakEkraninaGitsin: yeniDurum,
        };
      }

      return u;
    }));
  };

  // menü grubunun fiziksel fiş yazıcıya gidip gitmeyeceğini ayarlayan kod
  const menuGrubuYaziciDurumunuAyarla = async (grup, yeniDurum) => {
    if (!grup || !grup.ad) {
      alert('Grup bulunamadı.');
      return;
    }

    let kayitliGrupData = null;
    const mevcutMutfakEkraniDurumu = mutfakEkraniAktifMi(grup);

    if (menuGrubuDbKaydiVarMi(grup)) {
      const { data, error } = await supabase
        .from('menu_gruplari')
        .update({ yaziciya_gitsin: yeniDurum })
        .eq('id', grup.id)
        .eq('restaurant_id', mevcutRestaurantId)
        .select()
        .single();

      if (error) {
        console.error('Grup yazıcı durumu güncellenemedi:', error);
        alert('Grup yazıcı durumu güncellenemedi: ' + error.message);
        return;
      }

      kayitliGrupData = data;
    } else {
      const { data, error } = await supabase
        .from('menu_gruplari')
        .insert([
          {
            restaurant_id: mevcutRestaurantId,
            ad: grup.ad,
            departman: grup.departman || 'Mutfak',
            kdv_orani: Number(grup.kdvOrani || 10),
            mutfaga_gitsin: mevcutMutfakEkraniDurumu,
            mutfak_ekranina_gitsin: mevcutMutfakEkraniDurumu,
            yaziciya_gitsin: yeniDurum,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Grup yazıcı durumu kaydedilemedi:', error);
        alert('Grup yazıcı durumu kaydedilemedi: ' + error.message);
        return;
      }

      kayitliGrupData = data;
    }

    const { error: urunError } = await supabase
      .from('menu_urunleri')
      .update({ yaziciya_gitsin: yeniDurum })
      .eq('restaurant_id', mevcutRestaurantId)
      .eq('menu_grubu', grup.ad);

    if (urunError) {
      console.error('Grup ürün yazıcı durumu güncellenemedi:', urunError);
      alert('Grup kaydedildi ama ürünlere uygulanamadı: ' + urunError.message);
      return;
    }

    const guncelGrup = {
      id: kayitliGrupData.id,
      restaurantId: kayitliGrupData.restaurant_id,
      ad: kayitliGrupData.ad,
      departman: kayitliGrupData.departman || grup.departman || 'Mutfak',
      kdvOrani: Number(kayitliGrupData.kdv_orani || grup.kdvOrani || 10),
      mutfagaGitsin: (kayitliGrupData.mutfak_ekranina_gitsin ?? kayitliGrupData.mutfaga_gitsin ?? mevcutMutfakEkraniDurumu) !== false,
      mutfakEkraninaGitsin: (kayitliGrupData.mutfak_ekranina_gitsin ?? kayitliGrupData.mutfaga_gitsin ?? mevcutMutfakEkraniDurumu) !== false,
      yaziciyaGitsin: (kayitliGrupData.yaziciya_gitsin ?? yeniDurum) !== false,
    };

    setMenuGruplari(prev => {
      const liste = Array.isArray(prev) ? prev : [];
      const kalanlar = liste.filter(g => String(g.id) !== String(grup.id) && g.ad !== grup.ad);
      return [...kalanlar, guncelGrup];
    });

    setMenuUrunleri(menuUrunleri.map(u => {
      if (String(u.restaurantId) === String(mevcutRestaurantId) && (u.menuGrubu || u.kategori || 'Genel') === grup.ad) {
        return { ...u, yaziciyaGitsin: yeniDurum };
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
          mutfak_ekranina_gitsin: duzenlenenMenuGrupMutfagaGitsin,
          yaziciya_gitsin: duzenlenenMenuGrupMutfagaGitsin,
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
          mutfak_ekranina_gitsin: duzenlenenMenuGrupMutfagaGitsin,
          yaziciya_gitsin: duzenlenenMenuGrupMutfagaGitsin,
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
          mutfak_ekranina_gitsin: duzenlenenMenuGrupMutfagaGitsin,
          yaziciya_gitsin: duzenlenenMenuGrupMutfagaGitsin,
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
      mutfagaGitsin: (kayitliGrupData.mutfak_ekranina_gitsin ?? kayitliGrupData.mutfaga_gitsin) !== false,
      mutfakEkraninaGitsin: (kayitliGrupData.mutfak_ekranina_gitsin ?? kayitliGrupData.mutfaga_gitsin) !== false,
      yaziciyaGitsin: (kayitliGrupData.yaziciya_gitsin ?? kayitliGrupData.mutfaga_gitsin) !== false,
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
          mutfagaGitsin: mutfakEkraniAktifMi(guncelGrup),
          mutfakEkraninaGitsin: mutfakEkraniAktifMi(guncelGrup),
          yaziciyaGitsin: fisYaziciAktifMi(guncelGrup),
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
        mutfaga_gitsin: mutfakEkraniAktifMi(hedefGrup),
        mutfak_ekranina_gitsin: mutfakEkraniAktifMi(hedefGrup),
        yaziciya_gitsin: fisYaziciAktifMi(hedefGrup),
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
      mutfagaGitsin: (data.mutfak_ekranina_gitsin ?? data.mutfaga_gitsin) !== false,
      mutfakEkraninaGitsin: (data.mutfak_ekranina_gitsin ?? data.mutfaga_gitsin) !== false,
      yaziciyaGitsin: (data.yaziciya_gitsin ?? data.mutfaga_gitsin) !== false,
      stokTakip: Boolean(data.stok_takip),
      stokAdedi: Number(data.stok_adedi || 0),
      kritikStok: Number(data.kritik_stok || 0),
      favori: Boolean(data.favori),
      qrMenudeGorunsun: (data.qr_menude_gorunsun ?? data.qrMenudeGorunsun ?? true) !== false,
      satistaAktif: (data.satista_aktif ?? data.satistaAktif ?? data.aktif ?? true) !== false,
      resimUrl: data.resim_url || data.resimUrl || '',
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
          mutfaga_gitsin: mutfakEkraniAktifMi(urunGrubu),
          mutfak_ekranina_gitsin: mutfakEkraniAktifMi(urunGrubu),
          yaziciya_gitsin: fisYaziciAktifMi(urunGrubu),
          stok_takip: false,
          stok_adedi: 0,
          kritik_stok: 0,
          favori: false,
          qr_menude_gorunsun: yeniUrunQrMenudeGorunsun,
          satista_aktif: yeniUrunSatistaAktif,
          aktif: yeniUrunSatistaAktif,
          resim_url: urunResimUrlTemizle(yeniUrunResimUrl),
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
      mutfagaGitsin: (data.mutfak_ekranina_gitsin ?? data.mutfaga_gitsin) !== false,
      mutfakEkraninaGitsin: (data.mutfak_ekranina_gitsin ?? data.mutfaga_gitsin) !== false,
      yaziciyaGitsin: (data.yaziciya_gitsin ?? data.mutfaga_gitsin) !== false,
      stokTakip: Boolean(data.stok_takip),
      stokAdedi: Number(data.stok_adedi || 0),
      kritikStok: Number(data.kritik_stok || 0),
      favori: Boolean(data.favori),
      qrMenudeGorunsun: (data.qr_menude_gorunsun ?? data.qrMenudeGorunsun ?? true) !== false,
      satistaAktif: (data.satista_aktif ?? data.satistaAktif ?? data.aktif ?? true) !== false,
      resimUrl: data.resim_url || data.resimUrl || '',
    };

    setMenuUrunleri([...menuUrunleri, yeniUrun]);
    setYeniUrunAdi('');
    setYeniUrunFiyati('');
    setYeniUrunMaliyeti('');
    setYeniUrunResimUrl('');
    setYeniUrunQrMenudeGorunsun(true);
    setYeniUrunSatistaAktif(true);
    if (e.currentTarget && typeof e.currentTarget.reset === 'function') {
      e.currentTarget.reset();
    }
  };
  // ürün düzenleme modunu başlatan kod
  const urunDuzenlemeyiBaslat = (urun) => {
    setDuzenlenenUrunId(urun.id);
    setDuzenlenenUrunAdi(urun.ad);
    setDuzenlenenUrunFiyati(String(urun.fiyat));
    setDuzenlenenUrunMaliyeti(String(urun.maliyet || 0));
    setDuzenlenenUrunResimUrl(urunGosterimResmi(urun));
    setDuzenlenenUrunQrMenudeGorunsun(urunQrMenudeGorunurMu(urun));
    setDuzenlenenUrunSatistaAktif(urunSatistaAktifMi(urun));
  };

  // ürün düzenleme modunu iptal eden kod
  const urunDuzenlemeyiIptalEt = () => {
    setDuzenlenenUrunId(null);
    setDuzenlenenUrunAdi('');
    setDuzenlenenUrunFiyati('');
    setDuzenlenenUrunMaliyeti('');
    setDuzenlenenUrunResimUrl('');
    setDuzenlenenUrunQrMenudeGorunsun(true);
    setDuzenlenenUrunSatistaAktif(true);
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
        maliyet: sayiyaCevir(duzenlenenUrunMaliyeti || 0),
        resim_url: urunResimUrlTemizle(duzenlenenUrunResimUrl),
        qr_menude_gorunsun: duzenlenenUrunQrMenudeGorunsun && duzenlenenUrunSatistaAktif,
        satista_aktif: duzenlenenUrunSatistaAktif,
        aktif: duzenlenenUrunSatistaAktif,
        kategori: eskiUrun?.menuGrubu || eskiUrun?.kategori || aktifGrup.ad || 'Genel',
        menu_grubu: eskiUrun?.menuGrubu || eskiUrun?.kategori || aktifGrup.ad || 'Genel',
        departman: eskiUrun?.departman || aktifGrup.departman || 'Mutfak',
        kdv_orani: Number(eskiUrun?.kdvOrani || aktifGrup.kdvOrani || 10),
        menu_notlari: Array.isArray(eskiUrun?.menuNotlari) ? eskiUrun.menuNotlari : [],
        mutfaga_gitsin: mutfakEkraniAktifMi(eskiUrun),
        mutfak_ekranina_gitsin: mutfakEkraniAktifMi(eskiUrun),
        yaziciya_gitsin: fisYaziciAktifMi(eskiUrun),
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
      mutfagaGitsin: (data.mutfak_ekranina_gitsin ?? data.mutfaga_gitsin) !== false,
      mutfakEkraninaGitsin: (data.mutfak_ekranina_gitsin ?? data.mutfaga_gitsin) !== false,
      yaziciyaGitsin: (data.yaziciya_gitsin ?? data.mutfaga_gitsin) !== false,
      stokTakip: Boolean(data.stok_takip),
      stokAdedi: Number(data.stok_adedi || 0),
      kritikStok: Number(data.kritik_stok || 0),
      favori: Boolean(data.favori),
      qrMenudeGorunsun: (data.qr_menude_gorunsun ?? data.qrMenudeGorunsun ?? true) !== false,
      satistaAktif: (data.satista_aktif ?? data.satistaAktif ?? data.aktif ?? true) !== false,
      resimUrl: data.resim_url || data.resimUrl || '',
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
        mutfaga_gitsin: mutfakEkraniAktifMi(urun),
        mutfak_ekranina_gitsin: mutfakEkraniAktifMi(urun),
        yaziciya_gitsin: fisYaziciAktifMi(urun),
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
      mutfagaGitsin: (data.mutfak_ekranina_gitsin ?? data.mutfaga_gitsin) !== false,
      mutfakEkraninaGitsin: (data.mutfak_ekranina_gitsin ?? data.mutfaga_gitsin) !== false,
      yaziciyaGitsin: (data.yaziciya_gitsin ?? data.mutfaga_gitsin) !== false,
      stokTakip: Boolean(data.stok_takip),
      stokAdedi: Number(data.stok_adedi || 0),
      kritikStok: Number(data.kritik_stok || 0),
      favori: Boolean(data.favori),
      qrMenudeGorunsun: (data.qr_menude_gorunsun ?? data.qrMenudeGorunsun ?? true) !== false,
      satistaAktif: (data.satista_aktif ?? data.satistaAktif ?? data.aktif ?? true) !== false,
      resimUrl: data.resim_url || data.resimUrl || '',
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
        mutfaga_gitsin: mutfakEkraniAktifMi(urun),
        mutfak_ekranina_gitsin: mutfakEkraniAktifMi(urun),
        yaziciya_gitsin: fisYaziciAktifMi(urun),
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
      mutfagaGitsin: (data.mutfak_ekranina_gitsin ?? data.mutfaga_gitsin) !== false,
      mutfakEkraninaGitsin: (data.mutfak_ekranina_gitsin ?? data.mutfaga_gitsin) !== false,
      yaziciyaGitsin: (data.yaziciya_gitsin ?? data.mutfaga_gitsin) !== false,
      stokTakip: Boolean(data.stok_takip),
      stokAdedi: Number(data.stok_adedi || 0),
      kritikStok: Number(data.kritik_stok || 0),
      favori: Boolean(data.favori),
      qrMenudeGorunsun: (data.qr_menude_gorunsun ?? data.qrMenudeGorunsun ?? true) !== false,
      satistaAktif: (data.satista_aktif ?? data.satistaAktif ?? data.aktif ?? true) !== false,
      resimUrl: data.resim_url || data.resimUrl || '',
    };

    setMenuUrunleri(menuUrunleri.map(u => {
      if (u.id === urun.id) {
        return guncelUrun;
      }

      return u;
    }));
  };

  // ürünün hangi hazırlama yazıcısına gideceğini ayarlayan kod
  const urunYaziciHedefiAyarla = async (urun, yeniDepartman) => {
    if (!urun || !urun.id) {
      alert('Ürün bulunamadı.');
      return;
    }

    const temizDepartman = yaziciDepartmaniniNormalizeEt(yeniDepartman);

    const { data, error } = await supabase
      .from('menu_urunleri')
      .update({
        departman: temizDepartman,
        yaziciya_gitsin: true,
      })
      .eq('id', urun.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Ürün yazıcı hedefi güncellenemedi:', error);
      alert('Ürün yazıcı hedefi güncellenemedi: ' + error.message);
      return;
    }

    setMenuUrunleri(menuUrunleri.map(u => {
      if (u.id === urun.id) {
        return {
          ...u,
          departman: data.departman || temizDepartman,
          yaziciyaGitsin: (data.yaziciya_gitsin ?? true) !== false,
        };
      }

      return u;
    }));
  };

  // ürünün hazırlama fişi çıkıp çıkmayacağını seçime göre ayarlayan kod
  const urunMutfakDurumunuAyarla = async (urun, yeniDurum) => {
    if (!urun || !urun.id) {
      alert('Ürün bulunamadı.');
      return;
    }

    const { data, error } = await supabase
      .from('menu_urunleri')
      .update({
        mutfaga_gitsin: yeniDurum,
        mutfak_ekranina_gitsin: yeniDurum,
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
      mutfagaGitsin: (data.mutfak_ekranina_gitsin ?? data.mutfaga_gitsin) !== false,
      mutfakEkraninaGitsin: (data.mutfak_ekranina_gitsin ?? data.mutfaga_gitsin) !== false,
      yaziciyaGitsin: (data.yaziciya_gitsin ?? data.mutfaga_gitsin) !== false,
      stokTakip: Boolean(data.stok_takip),
      stokAdedi: Number(data.stok_adedi || 0),
      kritikStok: Number(data.kritik_stok || 0),
      favori: Boolean(data.favori),
      qrMenudeGorunsun: (data.qr_menude_gorunsun ?? data.qrMenudeGorunsun ?? true) !== false,
      satistaAktif: (data.satista_aktif ?? data.satistaAktif ?? data.aktif ?? true) !== false,
      resimUrl: data.resim_url || data.resimUrl || '',
    };

    setMenuUrunleri(menuUrunleri.map(u => {
      if (u.id === urun.id) {
        return guncelUrun;
      }

      return u;
    }));
  };
  // ürünün fiziksel fiş yazıcıya gidip gitmeyeceğini ayarlayan kod
  const urunFisYaziciDurumunuAyarla = async (urun, yeniDurum) => {
    if (!urun || !urun.id) {
      alert('Ürün bulunamadı.');
      return;
    }

    const { data, error } = await supabase
      .from('menu_urunleri')
      .update({ yaziciya_gitsin: yeniDurum })
      .eq('id', urun.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Ürün fiş yazıcı durumu güncellenemedi:', error);
      alert('Ürün fiş yazıcı durumu güncellenemedi: ' + error.message);
      return;
    }

    setMenuUrunleri(menuUrunleri.map(u => {
      if (u.id === urun.id) {
        return {
          ...u,
          yaziciyaGitsin: (data.yaziciya_gitsin ?? yeniDurum) !== false,
        };
      }
      return u;
    }));
  };

  // ürünün QR menüde görünüp görünmeyeceğini ayarlayan kod
  const urunQrMenuDurumunuAyarla = async (urun, yeniDurum) => {
    if (!urun || !urun.id) {
      alert('Ürün bulunamadı.');
      return;
    }

    const satistaAktif = urunSatistaAktifMi(urun);
    const qrDurumu = Boolean(yeniDurum) && satistaAktif;

    const { data, error } = await supabase
      .from('menu_urunleri')
      .update({ qr_menude_gorunsun: qrDurumu })
      .eq('id', urun.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('QR menü ürün durumu güncellenemedi:', error);
      alert('QR menü ürün durumu güncellenemedi. Supabase SQL kolonlarını eklediğinden emin ol: ' + error.message);
      return;
    }

    setMenuUrunleri(menuUrunleri.map(u => String(u.id) === String(urun.id) ? {
      ...u,
      qrMenudeGorunsun: (data.qr_menude_gorunsun ?? qrDurumu) !== false,
    } : u));
  };

  // ürünü satışta aktif/pasif yapıp QR menüden de otomatik kaldıran kod
  const urunSatisDurumunuAyarla = async (urun, yeniDurum) => {
    if (!urun || !urun.id) {
      alert('Ürün bulunamadı.');
      return;
    }

    const satistaAktif = Boolean(yeniDurum);
    const qrDurumu = satistaAktif ? urunQrMenudeGorunurMu(urun) : false;

    const { data, error } = await supabase
      .from('menu_urunleri')
      .update({
        satista_aktif: satistaAktif,
        aktif: satistaAktif,
        qr_menude_gorunsun: qrDurumu,
      })
      .eq('id', urun.id)
      .eq('restaurant_id', mevcutRestaurantId)
      .select()
      .single();

    if (error) {
      console.error('Ürün satış durumu güncellenemedi:', error);
      alert('Ürün satış durumu güncellenemedi. Supabase SQL kolonlarını eklediğinden emin ol: ' + error.message);
      return;
    }

    setMenuUrunleri(menuUrunleri.map(u => String(u.id) === String(urun.id) ? {
      ...u,
      satistaAktif: (data.satista_aktif ?? data.aktif ?? satistaAktif) !== false,
      qrMenudeGorunsun: (data.qr_menude_gorunsun ?? qrDurumu) !== false,
    } : u));
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
    let toplamKdv = 0;
    let toplamMatrah = 0;
    let toplamMaliyet = 0;

    filtrelenmisSatislar.forEach(s => {
      const notEki = s.not ? ` / Not: ${s.not}` : '';
      const urunAnahtari = `${s.ad}${notEki}`;
      const toplamUrunTutari = Number(s.fiyat || 0) * Number(s.adet || 1);
      const satirKdvOzeti = satisSatiriKdvOzetiHesapla(s);
      const satirToplamMaliyet = satisSatiriToplamMaliyetiHesapla(s);
      const satirBirimMaliyet = satisSatiriBirimMaliyetiHesapla(s);
      toplamCiro += toplamUrunTutari;
      toplamIndirim += Number(s.indirimTutari || 0) * Number(s.adet || 1);
      toplamKdv += satirKdvOzeti.kdvTutari;
      toplamMatrah += satirKdvOzeti.matrah;
      toplamMaliyet += satirToplamMaliyet;

      if (urunOzetMap[urunAnahtari]) {
        urunOzetMap[urunAnahtari].adet += Number(s.adet || 1);
        urunOzetMap[urunAnahtari].ciro += toplamUrunTutari;
        urunOzetMap[urunAnahtari].indirimTutari += Number(s.indirimTutari || 0) * Number(s.adet || 1);
        urunOzetMap[urunAnahtari].kdvTutari += satirKdvOzeti.kdvTutari;
        urunOzetMap[urunAnahtari].matrah += satirKdvOzeti.matrah;
        urunOzetMap[urunAnahtari].maliyet += satirToplamMaliyet;
        urunOzetMap[urunAnahtari].kar = urunOzetMap[urunAnahtari].ciro - urunOzetMap[urunAnahtari].maliyet;
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
          kdvTutari: satirKdvOzeti.kdvTutari,
          matrah: satirKdvOzeti.matrah,
          fiyat: Number(s.fiyat || 0),
          birimMaliyet: satirBirimMaliyet,
          maliyet: satirToplamMaliyet,
          kar: toplamUrunTutari - satirToplamMaliyet,
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
      toplamCiro: paraYuvarla(toplamCiro),
      toplamIndirim: paraYuvarla(toplamIndirim),
      toplamKdv: paraYuvarla(toplamKdv),
      toplamMatrah: paraYuvarla(toplamMatrah),
      toplamMaliyet: paraYuvarla(toplamMaliyet),
      brutKar: paraYuvarla(toplamCiro - toplamMaliyet),
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


  // QR müşteri ekranında sepete ürün ekleyen kod
  const qrSepeteUrunEkle = (urun) => {
    if (!urun) return;
    setQrSepet(prev => {
      const liste = Array.isArray(prev) ? prev : [];
      const mevcut = liste.find(s => String(s.urunId) === String(urun.id));
      if (mevcut) {
        return liste.map(s => String(s.urunId) === String(urun.id) ? { ...s, adet: Number(s.adet || 1) + 1 } : s);
      }
      return [...liste, { urunId: urun.id, ad: urun.ad, fiyat: Number(urun.fiyat || 0), adet: 1, menuGrubu: urun.menuGrubu || urun.kategori || 'Genel', departman: urun.departman || 'Mutfak' }];
    });
  };

  const qrSepetAdetGuncelle = (urunId, fark) => {
    setQrSepet(prev => (Array.isArray(prev) ? prev : [])
      .map(s => String(s.urunId) === String(urunId) ? { ...s, adet: Number(s.adet || 1) + Number(fark || 0) } : s)
      .filter(s => Number(s.adet || 0) > 0));
  };

  const qrSepetToplam = (Array.isArray(qrSepet) ? qrSepet : []).reduce((toplam, u) => toplam + Number(u.fiyat || 0) * Number(u.adet || 1), 0);

  const qrSeciliMasaBilgisi = () => {
    const seciliDeger = String(qrSiparisMasaNo || '').trim();
    const masa = (Array.isArray(qrMenuPublicMasalar) ? qrMenuPublicMasalar : []).find(m => {
      return String(m.id) === seciliDeger || String(m.ad || '').toLocaleLowerCase('tr-TR') === seciliDeger.toLocaleLowerCase('tr-TR');
    });

    return masa || {
      id: '',
      ad: seciliDeger,
      bolum: '',
    };
  };

  const qrServisTalebiGonder = async (tip) => {
    if (publicAyarlariMasaZorunluMu() && !String(qrSiparisMasaNo || '').trim()) {
      alert('Lütfen masa seçin.');
      return;
    }

    const seciliMasa = qrSeciliMasaBilgisi();
    const kayit = {
      restaurantId: qrMenuLinkRestaurantId,
      tip,
      masaId: seciliMasa.id || null,
      masaNo: seciliMasa.ad || String(qrSiparisMasaNo || '').trim(),
      masaAdi: seciliMasa.ad || String(qrSiparisMasaNo || '').trim(),
      notMetni: qrSiparisNotu,
      kaynak: 'QR Menü',
      durum: 'Açık',
      siparisUrunleri: [],
      toplam: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      const kayitliTalep = await servisTalebiSupabaseKaydet(kayit);
      setServisTalepleri(prev => [kayitliTalep, ...(Array.isArray(prev) ? prev : [])]);
      setQrServisMesaji(`${tip} talebiniz işletmeye iletildi.`);
    } catch (err) {
      console.error('QR servis talebi panele düşürülemedi:', err);
      setQrServisMesaji('Talep panele iletilemedi. Lütfen işletme personeline haber verin.');
      alert('Servis talebi panele düşürülemedi: ' + (err?.message || err));
    }
  };

  const publicAyarlariMasaZorunluMu = () => {
    const ayarKey = String(qrMenuLinkRestaurantId || '');
    const kayitliAyar = (qrMenuAyarlari || {})[ayarKey] || {};
    return kayitliAyar.masaNoZorunlu !== false;
  };

  const qrSiparisGonder = async () => {
    if (!Array.isArray(qrSepet) || qrSepet.length === 0) {
      alert('Sepete ürün ekleyin.');
      return;
    }

    if (publicAyarlariMasaZorunluMu() && !String(qrSiparisMasaNo || '').trim()) {
      alert('Lütfen masa seçin.');
      return;
    }

    const seciliMasa = qrSeciliMasaBilgisi();
    const siparisTalebi = {
      restaurantId: qrMenuLinkRestaurantId,
      tip: 'QR Sipariş Onayı',
      masaId: seciliMasa.id || null,
      masaNo: seciliMasa.ad || String(qrSiparisMasaNo || '').trim(),
      masaAdi: seciliMasa.ad || String(qrSiparisMasaNo || '').trim(),
      musteriAdi: String(qrSiparisMusteriAdi || '').trim(),
      notMetni: qrSiparisNotu,
      kaynak: 'QR Menü',
      durum: 'Açık',
      siparisUrunleri: qrSepet,
      toplam: qrSepetToplam,
      createdAt: new Date().toISOString(),
    };

    setQrSiparisGonderiliyor(true);
    try {
      const kayitliTalep = await servisTalebiSupabaseKaydet(siparisTalebi);
      setServisTalepleri(prev => [kayitliTalep, ...(Array.isArray(prev) ? prev : [])]);
      setQrSepet([]);
      setQrSiparisNotu('');
      setQrSiparisMesaji('Sipariş talebiniz garson onayına gönderildi. Garson onaylayınca masanıza aktarılacak.');
    } catch (err) {
      console.error('QR sipariş servis talebi panele düşürülemedi:', err);
      setQrSiparisMesaji('Sipariş talebi panele iletilemedi. Lütfen işletme personeline haber verin.');
      alert('QR sipariş panele düşürülemedi: ' + (err?.message || err));
    } finally {
      setQrSiparisGonderiliyor(false);
    }
  };

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
    setPaketSeciliHazirNotId('');
    setPaketSeciliUrunNotu('');
  };

  // açık masa/adisyon toplam indirim özetini hazırlayan kod
  const aktifMasaAraToplam = activeMasa ? siparislerAraToplamHesapla(activeMasa.siparisler || []) : 0;
  const aktifMasaIndirimOzeti = activeMasa
    ? toplamIndirimHesapla(aktifMasaAraToplam, activeMasa.adisyonIndirimYuzde || 0, activeMasa.adisyonIndirimTutari || 0)
    : toplamIndirimHesapla(0, 0, 0);
  const aktifMasaKdvOzeti = activeMasa
    ? siparislerKdvOzetiHesapla(activeMasa.siparisler || [], activeMasa.tutar || 0)
    : siparislerKdvOzetiHesapla([], 0);
  const adisyonIndirimOnizleme = activeMasa
    ? toplamIndirimHesapla(aktifMasaAraToplam, adisyonToplamIndirimYuzde, adisyonToplamIndirimTutari)
    : toplamIndirimHesapla(0, 0, 0);

  // ödeme alanında girilen paraya göre para üstünü hesaplayan kod
  const odemeGirisTutari = sayiyaCevir(odemeTutariInput);
  const aktifMasaKalanTutar = activeMasa ? kalanTutar(activeMasa) : 0;
  const paraUstuTutari = activeMasa ? Math.max(odemeGirisTutari - aktifMasaKalanTutar, 0) : 0;

  // seçili masa değişince müşteri adı inputunu güncelleyen kod
  useEffect(() => {
    setMusteriAdiInput(activeMasa?.musteriAdi || '');
  }, [activeMasa?.id, activeMasa?.musteriAdi]);

  // seçili masa değişince adisyon toplam indirim alanlarını güncelleyen kod
  useEffect(() => {
    setAdisyonToplamIndirimYuzde(activeMasa?.adisyonIndirimYuzde ? String(activeMasa.adisyonIndirimYuzde) : '');
    setAdisyonToplamIndirimTutari(activeMasa?.adisyonIndirimTutari ? String(activeMasa.adisyonIndirimTutari) : '');
  }, [activeMasa?.id, activeMasa?.adisyonIndirimYuzde, activeMasa?.adisyonIndirimTutari]);

  // mobil tam ekran adisyon açıkken sayfa arka planının kaymasını engelleyen kod
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const oncekiOverflow = document.body.style.overflow;

    if (activeTab === 'masalar' && isMobile && mobilAdisyonAcik) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = oncekiOverflow;
    };
  }, [activeTab, isMobile, mobilAdisyonAcik]);

  // masaüstüne geçilince mobil adisyon panelini kapatan kod
  useEffect(() => {
    if (!isMobile && mobilAdisyonAcik) {
      setMobilAdisyonAcik(false);
    }
  }, [isMobile, mobilAdisyonAcik]);

  // menü grupları değişince adisyon ve paket servis ürün seçim grubunu güvenli tutan kod
  useEffect(() => {
    if (!Array.isArray(aktifMenuGruplari) || aktifMenuGruplari.length === 0) return;

    const aktifAdisyonGrubuVar = aktifMenuGruplari.some(g => g.ad === aktifAdisyonMenuGrubu);
    const aktifPaketGrubuVar = aktifMenuGruplari.some(g => g.ad === aktifPaketMenuGrubu);
    const aktifQrGrubuVar = aktifQrMenuGrubu === 'Tümü' || aktifMenuGruplari.some(g => g.ad === aktifQrMenuGrubu);

    if (!aktifAdisyonGrubuVar) {
      setAktifAdisyonMenuGrubu(aktifMenuGruplari[0].ad);
    }

    if (!aktifPaketGrubuVar) {
      setAktifPaketMenuGrubu(aktifMenuGruplari[0].ad);
    }

    if (!aktifQrGrubuVar) {
      setAktifQrMenuGrubu('Tümü');
    }
  }, [mevcutRestaurantId, aktifMenuGruplari.length, aktifQrMenuGrubu]);

  // rapor verisi bozuk gelse bile beyaz ekran olmaması için varsayılan rapor kodu
  const bosRaporData = {
    liste: [],
    toplamCiro: 0,
    toplamIndirim: 0,
    toplamKdv: 0,
    toplamMatrah: 0,
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

  // ekran boyutu değişince mobil düzeni güncelleyen kod
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ekranBoyutunuKontrolEt = () => {
      setIsMobile(window.innerWidth <= 900);
    };

    ekranBoyutunuKontrolEt();
    window.addEventListener('resize', ekranBoyutunuKontrolEt);

    return () => {
      window.removeEventListener('resize', ekranBoyutunuKontrolEt);
    };
  }, []);

  // açık ekran bilgisini yenileme sonrası koruyan kod
  useEffect(() => {
    localStorage.setItem('integra_screen', screen);
  }, [screen]);
  // aktif panel sekmesini yenileme sonrası koruyan kod
  useEffect(() => {
    localStorage.setItem('integra_activeTab', activeTab);
  }, [activeTab]);

  // online sipariş havuzunu tarayıcıda yedekleyen kod
  useEffect(() => {
    localStorage.setItem('integra_online_siparisler', JSON.stringify(onlineSiparisler));
  }, [onlineSiparisler]);

  // platform bağlantı bilgilerini tarayıcıda yedekleyen kod
  useEffect(() => {
    localStorage.setItem('integra_platform_baglantilari', JSON.stringify(platformBaglantilari));
  }, [platformBaglantilari]);

  // entegrasyon test modunu tarayıcıda yedekleyen kod
  useEffect(() => {
    localStorage.setItem('integra_entegrasyon_test_modu', String(entegrasyonTestModu));
  }, [entegrasyonTestModu]);

  // QR menü ayarlarını tarayıcıda yedekleyen kod
  useEffect(() => {
    localStorage.setItem('integra_qr_menu_ayarlari', JSON.stringify(qrMenuAyarlari));
  }, [qrMenuAyarlari]);

  // yeni ticari modüllerin kayıtlarını tarayıcıda yedekleyen kod
  useEffect(() => {
    localStorage.setItem('integra_servis_talepleri', JSON.stringify(servisTalepleri));
  }, [servisTalepleri]);

  useEffect(() => {
    localStorage.setItem('integra_sadakat_musterileri', JSON.stringify(sadakatMusterileri));
  }, [sadakatMusterileri]);

  useEffect(() => {
    localStorage.setItem('integra_islem_loglari', JSON.stringify(islemLoglari));
  }, [islemLoglari]);

  useEffect(() => {
    localStorage.setItem('integra_el_terminali_modu', String(elTerminaliModu));
  }, [elTerminaliModu]);

  useEffect(() => {
    localStorage.setItem('integra_stok_sayim_kayitlari', JSON.stringify(stokSayimKayitlari));
  }, [stokSayimKayitlari]);

  useEffect(() => {
    localStorage.setItem('integra_satin_alma_talepleri', JSON.stringify(satinAlmaTalepleri));
  }, [satinAlmaTalepleri]);

  useEffect(() => {
    localStorage.setItem('integra_alis_fisleri', JSON.stringify(alisFisleri));
  }, [alisFisleri]);

  // herkese açık QR menü linki açıldığında menü verisini yükleyen kod
  useEffect(() => {
    if (!qrMenuMusteriModu || !qrMenuLinkRestaurantId) return;
    qrMenuyuSupabasedenCek(qrMenuLinkRestaurantId);
  }, [qrMenuMusteriModu, qrMenuLinkRestaurantId]);

  // servis taleplerini panel açıkken belirli aralıklarla Supabase'den yenileyen kod
  useEffect(() => {
    if (!user || screen !== 'dashboard' || !mevcutRestaurantId || String(mevcutRestaurantId) === 'super_admin') return undefined;

    servisTalepleriniSupabasedenCek(mevcutRestaurantId);
    const zamanlayici = window.setInterval(() => {
      servisTalepleriniSupabasedenCek(mevcutRestaurantId);
    }, 12000);

    return () => window.clearInterval(zamanlayici);
  }, [user?.id, screen, mevcutRestaurantId]);

  // aktif entegrasyon platformu değişince formu kayıtlı bilgiyle dolduran kod
  useEffect(() => {
    if (!mevcutRestaurantId || String(mevcutRestaurantId) === 'super_admin') return;
    const mevcutKayit = (Array.isArray(platformBaglantilari) ? platformBaglantilari : []).find(b => {
      return String(b.restaurantId) === String(mevcutRestaurantId) && b.platform === aktifEntegrasyonPlatformu;
    });

    setEntegrasyonFormu({
      platform: aktifEntegrasyonPlatformu,
      saticiId: mevcutKayit?.saticiId || '',
      entegrasyonReferansKodu: mevcutKayit?.entegrasyonReferansKodu || '',
      apiKey: mevcutKayit?.apiKey || '',
      apiSecret: mevcutKayit?.apiSecret || '',
      token: mevcutKayit?.token || '',
      aktif: mevcutKayit?.aktif !== false,
    });
  }, [aktifEntegrasyonPlatformu, mevcutRestaurantId]);

  // fiş yazdırma tercih ayarını tarayıcıda saklayan kod
  useEffect(() => {
    localStorage.setItem('integra_fis_yazdirma_modu', fisYazdirmaModu);
  }, [fisYazdirmaModu]);

  // fiş/yazıcı ayarlarını değişiklik oldukça tarayıcıda yedekleyen kod
  useEffect(() => {
    if (!user || user.role === 'super_admin') return;
    const aktifRestaurantId = user.role === 'waiter' ? user.parentRestaurantId : user.restaurantId;
    if (!aktifRestaurantId) return;

    localStorage.setItem(fisAyarlariLocalKey(aktifRestaurantId), JSON.stringify(fisAyarlari));
  }, [fisAyarlari, user?.id, user?.restaurantId, user?.parentRestaurantId, user?.role]);

  // sayfa yenilenince oturum verilerini Supabase'den tekrar yükleyen kod
  useEffect(() => {
    if (!user || screen !== 'dashboard') return;

    const verileriYenidenYukle = async () => {
      try {
        if (user.role === 'super_admin') {
          await restoranlariSupabasedenCek();
          await adminBildirimleriniSupabasedenCek();
          await destekTalepleriniSupabasedenCek();
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
        if (typeof stokMalzemeleriniSupabasedenCek === 'function') await stokMalzemeleriniSupabasedenCek(aktifRestaurantId);
        if (typeof urunReceteleriniSupabasedenCek === 'function') await urunReceteleriniSupabasedenCek(aktifRestaurantId);

        if (typeof fisAyarlariSupabasedenCek === 'function') {
          await fisAyarlariSupabasedenCek(aktifRestaurantId);
        }

        if (typeof printerAgentKurulumunuSupabasedenCek === 'function') {
          await printerAgentKurulumunuSupabasedenCek(aktifRestaurantId);
        }

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

        if (typeof servisTalepleriniSupabasedenCek === 'function') {
          await servisTalepleriniSupabasedenCek(aktifRestaurantId);
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

  if (qrMenuMusteriModu) {
    const publicRestoranAdi = qrMenuRestoran?.ad || qrMenuRestoran?.restaurant || 'Dijital Menü';
    const publicAyarlari = varsayilanQrMenuAyarlari(qrMenuLinkRestaurantId, publicRestoranAdi);
    const publicGruplar = qrMenuGruplariniHazirla(qrMenuPublicUrunleri, qrMenuPublicGruplari, qrMenuLinkRestaurantId);
    const publicAramaMetni = String(qrMenuArama || '').toLocaleLowerCase('tr-TR').trim();
    const publicFiltreliGruplar = publicGruplar
      .map(grup => ({
        ...grup,
        urunler: grup.urunler.filter(u => {
          const grupUyuyor = aktifQrMenuGrubu === 'Tümü' || grup.ad === aktifQrMenuGrubu;
          const aramaUyuyor = !publicAramaMetni
            || String(u.ad || '').toLocaleLowerCase('tr-TR').includes(publicAramaMetni)
            || String(u.aciklama || '').toLocaleLowerCase('tr-TR').includes(publicAramaMetni)
            || String(grup.ad || '').toLocaleLowerCase('tr-TR').includes(publicAramaMetni);

          return grupUyuyor && aramaUyuyor;
        }),
      }))
      .filter(grup => grup.urunler.length > 0);

    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 34%, #f8fafc 100%)', fontFamily: 'Inter, Arial, sans-serif', color: '#0f172a' }}>
        <div style={{ maxWidth: '980px', margin: '0 auto', padding: isMobile ? '18px 14px 34px' : '32px 20px 56px' }}>
          <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '28px', padding: isMobile ? '24px 18px' : '34px', color: '#fff', boxShadow: '0 30px 80px -45px rgba(15,23,42,0.5)', marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '999px', padding: '8px 12px', fontSize: '12px', fontWeight: '900', marginBottom: '14px' }}>📱 QR Menü</div>
                <h1 style={{ margin: '0 0 8px', fontSize: isMobile ? '30px' : '42px', lineHeight: 1.08, letterSpacing: '-0.03em' }}>{publicRestoranAdi}</h1>
                <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.7, maxWidth: '680px', fontWeight: '600' }}>{publicAyarlari.aciklama}</p>
              </div>
              <div style={{ backgroundColor: '#fff', color: '#0f172a', borderRadius: '18px', padding: '12px 15px', minWidth: '130px', textAlign: 'center', boxShadow: '0 18px 40px -28px rgba(0,0,0,0.5)' }}>
                <div style={{ fontSize: '24px', fontWeight: '900' }}>{publicGruplar.reduce((t, g) => t + g.urunler.length, 0)}</div>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '800' }}>ürün</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
            <input type="text" placeholder="Ürün ara..." value={qrMenuArama} onChange={e => setQrMenuArama(e.target.value)} style={{ ...styles.input, flex: '1 1 260px', minWidth: '220px', borderRadius: '14px', backgroundColor: '#fff' }} />
            <button type="button" onClick={() => setAktifQrMenuGrubu('Tümü')} style={{ border: aktifQrMenuGrubu === 'Tümü' ? `1px solid ${publicAyarlari.temaRengi}` : '1px solid #e2e8f0', backgroundColor: aktifQrMenuGrubu === 'Tümü' ? '#fff7ed' : '#fff', color: aktifQrMenuGrubu === 'Tümü' ? '#ea580c' : '#334155', padding: '10px 12px', borderRadius: '999px', cursor: 'pointer', fontWeight: '900' }}>Tümü</button>
            {publicGruplar.map(grup => (
              <button key={grup.ad} type="button" onClick={() => setAktifQrMenuGrubu(grup.ad)} style={{ border: aktifQrMenuGrubu === grup.ad ? `1px solid ${publicAyarlari.temaRengi}` : '1px solid #e2e8f0', backgroundColor: aktifQrMenuGrubu === grup.ad ? '#fff7ed' : '#fff', color: aktifQrMenuGrubu === grup.ad ? '#ea580c' : '#334155', padding: '10px 12px', borderRadius: '999px', cursor: 'pointer', fontWeight: '900' }}>{grup.ad}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr', gap: '14px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '14px', boxShadow: '0 16px 45px -38px rgba(15,23,42,0.35)' }}>
              <div style={{ fontWeight: '900', color: '#1e293b', marginBottom: '10px' }}>Masa ve sipariş bilgisi</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {Array.isArray(qrMenuPublicMasalar) && qrMenuPublicMasalar.length > 0 ? (
                  <select value={qrSiparisMasaNo} onChange={e => setQrSiparisMasaNo(e.target.value)} style={{ ...styles.input, flex: '1 1 180px', minWidth: '160px' }}>
                    <option value="">Masa seçin</option>
                    {qrMenuPublicMasalar.map(masa => (
                      <option key={masa.id} value={masa.id}>{masa.ad}{masa.bolum ? ` / ${masa.bolum}` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" placeholder="Masa no" value={qrSiparisMasaNo} onChange={e => setQrSiparisMasaNo(e.target.value)} style={{ ...styles.input, flex: '1 1 110px', minWidth: '100px' }} />
                )}
                <input type="text" placeholder="Adınız (opsiyonel)" value={qrSiparisMusteriAdi} onChange={e => setQrSiparisMusteriAdi(e.target.value)} style={{ ...styles.input, flex: '2 1 180px', minWidth: '160px' }} />
                <input type="text" placeholder="Not: acısız, az pişmiş..." value={qrSiparisNotu} onChange={e => setQrSiparisNotu(e.target.value)} style={{ ...styles.input, flex: '3 1 240px', minWidth: '180px' }} />
              </div>
              {qrServisMesaji ? <div style={{ marginTop: '8px', color: '#047857', fontWeight: '900', fontSize: '12px' }}>{qrServisMesaji}</div> : null}
            </div>
            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '14px', boxShadow: '0 16px 45px -38px rgba(15,23,42,0.35)' }}>
              <div style={{ fontWeight: '900', color: '#1e293b', marginBottom: '10px' }}>Hızlı servis</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {publicAyarlari.garsonCagirmaAktif !== false ? <button type="button" onClick={() => qrServisTalebiGonder('Garson Çağır')} style={{ ...styles.btnOrange, padding: '10px 12px', fontSize: '12px' }}>🔔 Garson Çağır</button> : null}
                {publicAyarlari.hesapIstemeAktif !== false ? <button type="button" onClick={() => qrServisTalebiGonder('Hesap İste')} style={{ ...styles.btnOrange, background: '#1e293b', padding: '10px 12px', fontSize: '12px' }}>🧾 Hesap İste</button> : null}
                <button type="button" onClick={() => qrServisTalebiGonder('Su İste')} style={{ ...styles.btnOrange, background: '#2563eb', padding: '10px 12px', fontSize: '12px' }}>💧 Su İste</button>
              </div>
            </div>
          </div>

          {qrMenuYukleniyor ? (
            <div style={{ ...styles.panelCard, textAlign: 'center', color: '#64748b', fontWeight: '800' }}>Menü yükleniyor...</div>
          ) : qrMenuHatasi ? (
            <div style={{ ...styles.panelCard, textAlign: 'center', color: '#dc2626', fontWeight: '800' }}>{qrMenuHatasi}</div>
          ) : publicFiltreliGruplar.length === 0 ? (
            <div style={{ ...styles.panelCard, textAlign: 'center', color: '#94a3b8', fontWeight: '800' }}>Bu menüde gösterilecek ürün bulunamadı.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {publicFiltreliGruplar.map(grup => (
                <section key={grup.ad} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '24px', padding: isMobile ? '16px' : '22px', boxShadow: '0 24px 55px -40px rgba(15,23,42,0.35)' }}>
                  <h2 style={{ margin: '0 0 14px', fontSize: '22px', color: '#0f172a' }}>{grup.ad}</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                    {grup.urunler.map(urun => {
                      const resim = urunGosterimResmi(urun);
                      return (
                        <div key={urun.id} style={{ display: 'flex', gap: '12px', border: '1px solid #eef2f7', borderRadius: '18px', padding: '12px', backgroundColor: '#fbfdff' }}>
                          {resim ? <img src={resim} alt={urun.ad} style={{ width: '78px', height: '78px', objectFit: 'cover', borderRadius: '14px', flex: '0 0 78px', border: '1px solid #e2e8f0' }} /> : <div style={{ width: '78px', height: '78px', borderRadius: '14px', flex: '0 0 78px', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', border: '1px solid #fed7aa' }}>🍽️</div>}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                              <strong style={{ color: '#1e293b', fontSize: '15px' }}>{urun.ad}</strong>
                              <span style={{ color: publicAyarlari.temaRengi, fontWeight: '900', whiteSpace: 'nowrap' }}>{Number(urun.fiyat || 0).toLocaleString('tr-TR')} TL</span>
                            </div>
                            {urun.aciklama ? <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '12px', lineHeight: 1.5 }}>{urun.aciklama}</p> : null}
                            {Array.isArray(urun.menuNotlari) && urun.menuNotlari.length > 0 ? (
                              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '8px' }}>
                                {urun.menuNotlari.slice(0, 4).map(not => <span key={not.id || not.ad} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '999px', padding: '4px 7px', color: '#475569', fontSize: '11px', fontWeight: '800' }}>{not.ad}{Number(not.fiyat || 0) > 0 ? ` +${Number(not.fiyat || 0)} TL` : ''}</span>)}
                              </div>
                            ) : null}
                            {publicAyarlari.qrSiparisAktif !== false ? (
                              <button type="button" onClick={() => qrSepeteUrunEkle(urun)} style={{ marginTop: '10px', border: 'none', backgroundColor: publicAyarlari.temaRengi, color: '#fff', padding: '8px 10px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900', fontSize: '12px' }}>Sepete Ekle</button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
          {publicAyarlari.qrSiparisAktif !== false ? (
            <div style={{ position: 'sticky', bottom: '12px', marginTop: '18px', backgroundColor: '#0f172a', color: '#fff', borderRadius: '22px', padding: '14px', boxShadow: '0 24px 80px -38px rgba(15,23,42,0.75)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: '900', fontSize: '15px' }}>Sepet — {qrSepet.reduce((t, u) => t + Number(u.adet || 1), 0)} ürün</div>
                  <div style={{ color: '#cbd5e1', fontSize: '12px', marginTop: '3px' }}>{qrSepet.length === 0 ? 'Ürün seçip garson onayına gönderebilirsiniz.' : qrSepet.map(u => `${u.adet}x ${u.ad}`).join(' / ')}</div>
                  {qrSiparisMesaji ? <div style={{ color: '#86efac', fontSize: '12px', fontWeight: '900', marginTop: '6px' }}>{qrSiparisMesaji}</div> : null}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {qrSepet.map(u => (
                    <div key={u.urunId} style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '999px', padding: '5px 7px' }}>
                      <button type="button" onClick={() => qrSepetAdetGuncelle(u.urunId, -1)} style={{ border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontWeight: '900' }}>-</button>
                      <span style={{ fontSize: '12px', fontWeight: '900' }}>{u.adet}</span>
                      <button type="button" onClick={() => qrSepetAdetGuncelle(u.urunId, 1)} style={{ border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontWeight: '900' }}>+</button>
                    </div>
                  ))}
                  <strong style={{ whiteSpace: 'nowrap' }}>{qrSepetToplam.toLocaleString('tr-TR')} TL</strong>
                  <button type="button" disabled={qrSiparisGonderiliyor || qrSepet.length === 0} onClick={qrSiparisGonder} style={{ border: 'none', backgroundColor: '#22c55e', color: '#fff', padding: '11px 14px', borderRadius: '14px', cursor: qrSepet.length === 0 ? 'not-allowed' : 'pointer', fontWeight: '900' }}>{qrSiparisGonderiliyor ? 'Gönderiliyor...' : 'Sipariş Talebi Gönder'}</button>
                </div>
              </div>
            </div>
          ) : null}
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: '800', marginTop: '24px' }}>integra POS QR Menü</div>
        </div>
      </div>
    );
  }


  // gelişmiş reçete panelini stoktan ayrı sekmede de kullanmak için hazırlayan kod
  const receteYonetimiPaneli = (kapsayiciStili = {}) => (
                <div style={{ ...styles.panelCard, backgroundColor: '#fff7ed', marginBottom: '16px', ...kapsayiciStili }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ fontSize: '17px', color: '#1e293b', margin: '0 0 6px' }}>🧾 Gelişmiş Ürün Reçetesi</h3>
                      <p style={{ color: '#64748b', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
                        Her ürünün kaç gram/kg/adet hammadde kullandığını tanımlayın. Sistem üretim moduna göre çalışır: manuel üretimde önce ürünü üretip stoğa alırsın, satışta satıldıkça üret modunda hammaddeler satış anında düşer.
                      </p>
                    </div>
                    <div style={{ backgroundColor: '#fff', border: '1px solid #fed7aa', borderRadius: '14px', padding: '10px 12px', minWidth: '220px' }}>
                      <div style={{ fontSize: '11px', color: '#9a3412', fontWeight: '900' }}>Reçete Durumu</div>
                      <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '900' }}>{aktifMenu.filter(u => receteSatirlariBul(u.id).length > 0).length} ürün reçeteli / {aktifMenu.length} ürün</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Reçetesiz ürünler maliyet raporunda eksik kâr gösterebilir.</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr', gap: '12px', marginTop: '14px' }}>
                    <div style={{ backgroundColor: '#fff', border: '1px solid #fed7aa', borderRadius: '16px', padding: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '900', color: '#9a3412', marginBottom: '8px' }}>1) Ürün seç ve reçete satırı ekle</div>
                      <div style={styles.inlineForm}>
                        <select value={receteAyarlananUrunId} onChange={e => { setReceteAyarlananUrunId(e.target.value); setReceteTaslakKalemleri([]); setUretimMesaji(''); }} style={styles.input}>
                          <option value="">Reçete ürünü seç</option>
                          {aktifMenu.map(u => <option key={u.id} value={u.id}>{u.ad} — Satış {u.fiyat} TL / Stok {Number(u.stokAdedi || 0)} / {urunUretimModuEtiketi(u)}</option>)}
                        </select>
                        <select value={receteMalzemeId} onChange={e => setReceteMalzemeId(e.target.value)} style={styles.input}>
                          <option value="">Hammadde seç</option>
                          {aktifStokMalzemeleri.map(m => <option key={m.id} value={m.id}>{m.ad} ({m.birim}) / Stok {m.stokMiktari}</option>)}
                        </select>
                        <input type="number" step="0.001" placeholder="Net miktar" value={receteMiktar} onChange={e => setReceteMiktar(e.target.value)} style={{ ...styles.input, maxWidth: '130px' }} />
                        <input type="number" step="0.01" placeholder="Fire %" value={receteFireYuzde} onChange={e => setReceteFireYuzde(e.target.value)} style={{ ...styles.input, maxWidth: '100px' }} />
                        <input type="text" placeholder="Hazırlık notu: doğranmış, pişmiş, soslu..." value={receteHazirlikNotu} onChange={e => setReceteHazirlikNotu(e.target.value)} style={{ ...styles.input, flex: '1 1 220px' }} />
                        <button type="button" onClick={receteTaslakKalemiEkle} style={styles.btnOrange}>Reçete Listesine Ekle</button>
                      </div>
                      <div style={{ color: '#64748b', fontSize: '11px', lineHeight: 1.5, marginTop: '8px' }}>
                        Mantık: Ürün birden fazla hammaddeden oluşur. Örnek: Kek = 0.20 kg un + 2 adet yumurta + 0.10 kg şeker. Manuel üretimde bu hammaddeler üretim yapınca düşer; satışta satıldıkça üret modunda satış anında düşer.
                      </div>

                      {receteTaslakKalemleri.length > 0 ? (
                        <div style={{ marginTop: '12px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '14px', padding: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                            <strong style={{ color: '#9a3412' }}>Ürünü oluşturan hammaddeler ({receteTaslakKalemleri.length})</strong>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button type="button" onClick={receteTaslaginiKaydet} style={{ ...styles.btnOrange, backgroundColor: '#10b981' }}>Tüm Reçeteyi Kaydet</button>
                              <button type="button" onClick={receteTaslaginiTemizle} style={{ ...styles.btnOrange, backgroundColor: '#64748b' }}>Listeyi Temizle</button>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                            {receteTaslakKalemleri.map(k => {
                              const fireli = paraYuvarla(Number(k.miktar || 0) * (1 + Number(k.fireYuzde || 0) / 100));
                              const maliyet = paraYuvarla(fireli * Number(k.birimMaliyetSnapshot || 0));
                              return (
                                <div key={k.taslakId} style={{ backgroundColor: '#fff', border: '1px solid #fed7aa', borderRadius: '10px', padding: '8px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.75fr 0.75fr 0.75fr auto', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
                                  <strong style={{ color: '#1e293b' }}>{k.malzemeAdi}</strong>
                                  <span>Net: <strong>{k.miktar}</strong> {k.birim}</span>
                                  <span>Fireli: <strong>{fireli}</strong> {k.birim}</span>
                                  <span>Maliyet: <strong>{maliyet} TL</strong></span>
                                  <button type="button" onClick={() => receteTaslakKalemiSil(k.taslakId)} style={{ border: 'none', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', fontWeight: '900' }}>Sil</button>
                                  {k.hazirlikNotu ? <div style={{ gridColumn: isMobile ? 'auto' : '1 / -1', color: '#64748b' }}>Not: {k.hazirlikNotu}</div> : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div style={{ backgroundColor: '#fff', border: '1px solid #fed7aa', borderRadius: '16px', padding: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '900', color: '#9a3412', marginBottom: '8px' }}>2) Başka üründen reçete kopyala</div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <select value={receteKopyalanacakUrunId} onChange={e => setReceteKopyalanacakUrunId(e.target.value)} style={{ ...styles.input, flex: '1 1 180px' }}>
                          <option value="">Kaynak ürün seç</option>
                          {aktifMenu.filter(u => String(u.id) !== String(receteAyarlananUrunId) && receteSatirlariBul(u.id).length > 0).map(u => <option key={u.id} value={u.id}>{u.ad} ({receteSatirlariBul(u.id).length} kalem)</option>)}
                        </select>
                        <button type="button" onClick={urunRecetesiniKopyala} style={{ ...styles.btnOrange, backgroundColor: '#1e293b' }}>Kopyala</button>
                      </div>
                      <div style={{ color: '#64748b', fontSize: '11px', marginTop: '8px', lineHeight: 1.5 }}>
                        Benzer ürünlerde hızlı kurulum için kullanılır. Örn: Kaşarlı Kumpir reçetesini Karışık Kumpir'e kopyalayıp sadece ekstra malzemeleri ekleyin.
                      </div>
                    </div>
                  </div>

                  {receteAyarlananUrunId ? (() => {
                    const seciliUrun = aktifMenu.find(u => String(u.id) === String(receteAyarlananUrunId));
                    const uretimAdedi = Math.max(1, sayiyaCevir(uretimMiktari) || 1);
                    const gerekliler = urunUretimGereklilikleriHesapla(receteAyarlananUrunId, uretimAdedi);
                    const eksikVar = gerekliler.some(g => !g.yeterli);
                    return (
                      <div style={{ marginTop: '14px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '16px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <div>
                            <h3 style={{ margin: '0 0 6px', color: '#065f46', fontSize: '16px' }}>🏭 Üretim Modu ve Ürün Stoğu</h3>
                            <p style={{ margin: 0, color: '#047857', fontSize: '12px', lineHeight: 1.5 }}>
                              Manuel üretimde hammaddeler üretim yaptığında düşer ve ürün stoğu artar. Satışta satıldıkça üret modunda ürün stoğu beklemez; satış anında reçetedeki hammaddeler düşer.
                            </p>
                          </div>
                          <div style={{ backgroundColor: '#fff', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '10px 12px', minWidth: '170px' }}>
                            <div style={{ color: '#047857', fontSize: '11px', fontWeight: '900' }}>Ürün Stoğu</div>
                            <div style={{ color: '#0f172a', fontSize: '22px', fontWeight: '900' }}>{Number(seciliUrun?.stokAdedi || 0)}</div>
                            <div style={{ color: '#64748b', fontSize: '11px' }}>{urunUretimModuEtiketi(seciliUrun)}</div>
                          </div>
                        </div>

                        {uretimMesaji ? <div style={{ marginTop: '10px', backgroundColor: '#d1fae5', border: '1px solid #86efac', color: '#047857', borderRadius: '12px', padding: '9px 11px', fontSize: '12px', fontWeight: '800' }}>{uretimMesaji}</div> : null}

                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                          <div style={{ backgroundColor: '#fff', border: '1px solid #a7f3d0', borderRadius: '14px', padding: '10px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '900', color: '#047857', marginBottom: '8px' }}>Üretim şekli</div>
                            <select value={urunUretimModuBul(seciliUrun)} onChange={e => receteliUrunUretimModunuGuncelle(receteAyarlananUrunId, e.target.value)} style={{ ...styles.input, backgroundColor: '#fff' }}>
                              <option value="manuel">Manuel üret / ürün stoğuna al</option>
                              <option value="satisla_uretim">Satışta satıldıkça üret</option>
                            </select>
                            <input type="text" placeholder="Üretim notu / hazırlık bilgisi" value={uretimNotu} onChange={e => setUretimNotu(e.target.value)} style={{ ...styles.input, backgroundColor: '#fff', marginTop: '8px' }} />
                            <div style={{ color: '#64748b', fontSize: '11px', lineHeight: 1.5, marginTop: '8px' }}>
                              Tavsiye: Kek, hamur, çorba gibi önceden hazırlanan ürünlerde manuel üretim; anlık hazırlanan kumpir/tost gibi ürünlerde satışta satıldıkça üret kullanılabilir.
                            </div>
                          </div>

                          <div style={{ backgroundColor: '#fff', border: '1px solid #a7f3d0', borderRadius: '14px', padding: '10px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '900', color: '#047857', marginBottom: '8px' }}>Manuel üretim yap</div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                              <input type="number" step="0.001" placeholder="Üretilecek adet" value={uretimMiktari} onChange={e => setUretimMiktari(e.target.value)} style={{ ...styles.input, maxWidth: '160px', backgroundColor: '#fff' }} />
                              <button type="button" onClick={receteliUrunuManuelUret} disabled={gerekliler.length === 0 || eksikVar} style={{ ...styles.btnOrange, backgroundColor: eksikVar ? '#94a3b8' : '#10b981', cursor: eksikVar ? 'not-allowed' : 'pointer' }}>Üret ve Ürün Stoğuna Al</button>
                            </div>
                            {gerekliler.length === 0 ? (
                              <div style={{ color: '#b45309', fontSize: '12px', marginTop: '8px', fontWeight: '800' }}>Önce bu ürün için reçete kaydedin.</div>
                            ) : (
                              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {gerekliler.map(g => (
                                  <div key={g.satir.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', backgroundColor: g.yeterli ? '#f0fdf4' : '#fef2f2', border: g.yeterli ? '1px solid #bbf7d0' : '1px solid #fecaca', borderRadius: '10px', padding: '7px 9px', fontSize: '12px', color: '#334155' }}>
                                    <span><strong>{g.malzeme?.ad || 'Hammadde'}</strong> gerekli: {g.gerekliMiktar} {g.malzeme?.birim || ''}</span>
                                    <span>Stok: {g.mevcutStok} {g.malzeme?.birim || ''}{g.yeterli ? '' : ` / Eksik ${g.eksikMiktar}`}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })() : null}

                  {receteAyarlananUrunId ? (() => {
                    const analiz = urunReceteAnaliziHesapla(receteAyarlananUrunId);
                    const porsiyonCarpani = Math.max(1, sayiyaCevir(recetePorsiyonCarpani) || 1);
                    return (
                      <div style={{ marginTop: '14px' }}>
                        <div style={styles.statsGrid}>
                          <div style={styles.statsCard}>
                            <div style={styles.statsTitle}>Satış Fiyatı</div>
                            <div style={styles.statsValue}>{analiz.satisFiyati} TL</div>
                          </div>
                          <div style={styles.statsCard}>
                            <div style={styles.statsTitle}>Reçete Maliyeti</div>
                            <div style={styles.statsValue}>{analiz.maliyet} TL</div>
                          </div>
                          <div style={styles.statsCard}>
                            <div style={styles.statsTitle}>Brüt Kâr</div>
                            <div style={{ ...styles.statsValue, color: analiz.brutKar >= 0 ? '#10b981' : '#ef4444' }}>{analiz.brutKar} TL</div>
                          </div>
                          <div style={styles.statsCard}>
                            <div style={styles.statsTitle}>Maliyet Oranı</div>
                            <div style={{ ...styles.statsValue, color: analiz.maliyetOrani > 45 ? '#ef4444' : '#10b981' }}>%{analiz.maliyetOrani}</div>
                          </div>
                          <div style={styles.statsCard}>
                            <div style={styles.statsTitle}>Stoktan Çıkabilecek</div>
                            <div style={styles.statsValue}>{analiz.stoktanCikabilecekPorsiyon} porsiyon</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', margin: '12px 0' }}>
                          <input type="number" min="1" step="1" placeholder="Kaç porsiyon?" value={recetePorsiyonCarpani} onChange={e => setRecetePorsiyonCarpani(e.target.value)} style={{ ...styles.input, maxWidth: '150px' }} />
                          <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '800' }}>{porsiyonCarpani} porsiyon üretimde toplam reçete maliyeti: {paraYuvarla(analiz.maliyet * porsiyonCarpani)} TL</span>
                          <button type="button" onClick={() => receteMaliyetiniUrunKartinaYaz(receteAyarlananUrunId)} style={{ ...styles.btnOrange, backgroundColor: '#10b981' }}>Maliyeti Ürün Kartına Yaz</button>
                        </div>

                        {analiz.eksikMaliyetliKalemler.length > 0 ? (
                          <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fdba74', color: '#9a3412', borderRadius: '12px', padding: '10px 12px', fontSize: '12px', fontWeight: '800', marginBottom: '10px' }}>
                            Bu reçetede maliyeti 0 olan veya eksik hammadde var. Hammadde kartına birim maliyet girersen kâr raporu düzelir.
                          </div>
                        ) : null}

                        {analiz.satirlar.length === 0 ? (
                          <div style={{ color: '#94a3b8', padding: '12px', backgroundColor: '#fff', border: '1px dashed #fed7aa', borderRadius: '14px' }}>Bu ürün için reçete satırı yok. Yukarıdan hammadde seçip miktar girerek başlayın.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {analiz.satirlar.map(r => {
                              const malzeme = aktifStokMalzemeleri.find(m => String(m.id) === String(r.malzemeId));
                              const fireliMiktar = receteSatiriFireliMiktar(r);
                              const satirMaliyeti = receteSatiriMaliyetiHesapla(r);
                              const duzenleniyor = String(receteDuzenlenenSatirId) === String(r.id);
                              return (
                                <div key={r.id} style={{ backgroundColor: '#fff', border: '1px solid #fed7aa', borderRadius: '14px', padding: '10px 12px' }}>
                                  {duzenleniyor ? (
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                      <strong style={{ minWidth: '150px', color: '#1e293b' }}>{malzeme?.ad || 'Hammadde'}</strong>
                                      <input type="number" step="0.001" value={receteDuzenlemeMiktar} onChange={e => setReceteDuzenlemeMiktar(e.target.value)} style={{ ...styles.input, maxWidth: '130px' }} />
                                      <input type="number" step="0.01" value={receteDuzenlemeFireYuzde} onChange={e => setReceteDuzenlemeFireYuzde(e.target.value)} placeholder="Fire %" style={{ ...styles.input, maxWidth: '100px' }} />
                                      <input type="text" value={receteDuzenlemeNotu} onChange={e => setReceteDuzenlemeNotu(e.target.value)} placeholder="Not" style={{ ...styles.input, flex: '1 1 200px' }} />
                                      <button type="button" onClick={() => urunReceteSatiriGuncelle(r)} style={{ ...styles.btnOrange, backgroundColor: '#10b981' }}>Kaydet</button>
                                      <button type="button" onClick={urunReceteDuzenlemeyiIptalEt} style={{ ...styles.btnOrange, backgroundColor: '#64748b' }}>Vazgeç</button>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 0.9fr 0.9fr 0.8fr 0.8fr auto', gap: '8px', alignItems: 'center' }}>
                                      <div>
                                        <strong style={{ color: '#1e293b' }}>{malzeme?.ad || 'Hammadde bulunamadı'}</strong>
                                        <div style={{ color: '#64748b', fontSize: '11px' }}>{r.hazirlikNotu || 'Hazırlık notu yok'}</div>
                                      </div>
                                      <div style={{ fontSize: '12px', color: '#334155' }}>Net: <strong>{r.miktar}</strong> {malzeme?.birim || ''}</div>
                                      <div style={{ fontSize: '12px', color: '#334155' }}>Fireli: <strong>{fireliMiktar}</strong> {malzeme?.birim || ''}</div>
                                      <div style={{ fontSize: '12px', color: '#334155' }}>Fire: <strong>%{receteSatiriFireOrani(r)}</strong></div>
                                      <div style={{ fontSize: '12px', color: '#334155' }}>Maliyet: <strong>{satirMaliyeti} TL</strong></div>
                                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                                        <button type="button" onClick={() => urunReceteSatiriDuzenlemeyeAl(r)} style={{ ...styles.btnOrange, backgroundColor: '#0f172a' }}>Düzenle</button>
                                        <button type="button" onClick={() => urunReceteSatiriSil(r.id)} style={{ ...styles.btnOrange, backgroundColor: '#ef4444' }}>Sil</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    <div style={{ color: '#94a3b8', padding: '12px', marginTop: '12px', backgroundColor: '#fff', border: '1px dashed #fed7aa', borderRadius: '14px' }}>Reçete yönetimi için önce ürün seçin.</div>
                  )}

                  {aktifMenu.filter(u => receteSatirlariBul(u.id).length === 0).length > 0 ? (
                    <details style={{ marginTop: '12px', backgroundColor: '#fff', border: '1px solid #fed7aa', borderRadius: '14px', padding: '10px 12px' }}>
                      <summary style={{ cursor: 'pointer', color: '#9a3412', fontWeight: '900' }}>Reçetesiz ürünler ({aktifMenu.filter(u => receteSatirlariBul(u.id).length === 0).length})</summary>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                        {aktifMenu.filter(u => receteSatirlariBul(u.id).length === 0).slice(0, 40).map(u => (
                          <button key={u.id} type="button" onClick={() => setReceteAyarlananUrunId(String(u.id))} style={{ border: '1px solid #fed7aa', backgroundColor: '#fff7ed', color: '#9a3412', borderRadius: '999px', padding: '6px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: '800' }}>{u.ad}</button>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
  );


  const ekranRehberleri = {
    raporlar: {
      rozet: 'Patron özeti',
      baslik: 'Satış, maliyet ve kârı tek ekranda izle',
      aciklama: 'Günlük veya tarih aralığı seçerek ciroyu, ürün maliyetini ve brüt kârı kontrol edin. Maliyetlerin doğru çıkması için ürün reçetesi veya ürün kartı maliyeti dolu olmalı.',
      adimlar: ['Tarih filtresini seç', 'Satış ve ürün sekmesini kontrol et', 'Maliyet / brüt kâr farklarını izle'],
      aksiyonlar: [{ label: 'Reçeteleri düzenle', tab: 'receteler' }, { label: 'Kasa hareketleri', tab: 'kasa' }],
    },
    masalar: {
      rozet: 'Salon akışı',
      baslik: 'Masa, adisyon ve QR siparişleri buradan yönet',
      aciklama: 'Masaya ürün ekleyin, QR menüden gelen talepleri garson onayıyla masaya aktarın ve ödeme alınca satış raporuna işleyin.',
      adimlar: ['Masa seç', 'Ürünleri adisyona ekle', 'Ödeme al ve adisyonu kapat'],
      aksiyonlar: [{ label: 'Servis talepleri', tab: 'servis_talepleri' }, { label: 'QR Menü', tab: 'qr_menu' }],
    },
    mutfak: {
      rozet: 'Hazırlık ekranı',
      baslik: 'Mutfak ve bar fişlerini canlı takip et',
      aciklama: 'Masadan, QR siparişten, paket servisten ve hızlı satıştan gelen hazırlama fişlerini burada takip edin.',
      adimlar: ['Yeni fişleri kontrol et', 'Hazırlananları kapat', 'İptal ve notları takip et'],
      aksiyonlar: [{ label: 'Masalar', tab: 'masalar' }, { label: 'Paket servis', tab: 'paket' }],
    },
    paket: {
      rozet: 'Paket servis',
      baslik: 'Manuel paket ve online sipariş havuzu',
      aciklama: 'Telefonla alınan siparişleri buradan girin. Trendyol/Getir/Migros entegrasyonları hazır olduğunda online siparişler de bu akışa bağlanır.',
      adimlar: ['Müşteri seç veya gir', 'Ürünleri ekle', 'Kurye/ödeme durumunu takip et'],
      aksiyonlar: [{ label: 'Entegrasyonlar', tab: 'entegrasyonlar' }, { label: 'Cari hesaplar', tab: 'cari' }],
    },
    entegrasyonlar: {
      rozet: 'Dış platformlar',
      baslik: 'Trendyol, Getir, Migros ve test siparişleri',
      aciklama: 'Gerçek API bilgisi gelene kadar test moduyla akışı deneyin. API bilgileri hiçbir zaman App.jsx içine yazılmaz; güvenli ayar alanında tutulur.',
      adimlar: ['Platformu seç', 'Hesap türünü belirle', 'Test siparişiyle akışı dene'],
      aksiyonlar: [{ label: 'Online siparişler', tab: 'paket' }],
    },
    cari: {
      rozet: 'Müşteri / tedarikçi',
      baslik: 'Cari hesap, tahsilat ve alış bağlantısı',
      aciklama: 'Müşteri veresiye hesaplarını ve tedarikçi alışlarını buradan takip edin. Alış fişinde cari seçildiğinde vadeli borç ekstereye işlenir.',
      adimlar: ['Cari oluştur', 'Tahsilat veya borç işle', 'Ekstreyi kontrol et'],
      aksiyonlar: [{ label: 'Alış fişi', tab: 'receteler' }, { label: 'Sadakat', tab: 'sadakat' }],
    },
    stok: {
      rozet: 'Satış stoku',
      baslik: 'Satış ürünlerinin stok durumunu izle',
      aciklama: 'Hammadde, alış fişi, üretim ve depo sayımı Reçeteler ekranında yönetilir. Bu ekran satış ürünlerinin stok takibi için sade tutuldu.',
      adimlar: ['Stok takipli ürünleri kontrol et', 'Kritik stokları izle', 'Gerekirse Reçetelerden alış/üretim yap'],
      aksiyonlar: [{ label: 'Reçeteler ve alış', tab: 'receteler' }, { label: 'Raporlar', tab: 'raporlar' }],
    },
    kasa: {
      rozet: 'Gün sonu',
      baslik: 'Kasa, ödeme ve Z raporu kontrolü',
      aciklama: 'Nakit, kart, cari ve paket servis hareketlerini gün sonunda buradan kontrol edip arşivleyin.',
      adimlar: ['Kasa hareketlerini kontrol et', 'Gerçek kasa tutarını gir', 'Gün sonu Z raporunu al'],
      aksiyonlar: [{ label: 'Satış raporu', tab: 'raporlar' }],
    },
    hizli_satis: {
      rozet: 'Gel-al satış',
      baslik: 'Masa açmadan hızlı satış yap',
      aciklama: 'Kasadan hızlı ürün satışı, nakit/kart/cari ödeme ve anlık fiyat değişikliği için kullanılır.',
      adimlar: ['Ürünleri sepete ekle', 'Ödeme tipini seç', 'Satışı kapat'],
      aksiyonlar: [{ label: 'Menü ayarları', tab: 'menu' }, { label: 'Cari hesap', tab: 'cari' }],
    },
    giderler: {
      rozet: 'Masraf takibi',
      baslik: 'Dış giderleri ve işletme masraflarını takip et',
      aciklama: 'Kira, personel, elektrik, temizlik veya alış fişinden gelen giderleri bu bölümde izleyin.',
      adimlar: ['Kategori seç', 'Tutar ve açıklama gir', 'Kârlılık raporunda gideri takip et'],
      aksiyonlar: [{ label: 'Raporlar', tab: 'raporlar' }],
    },
    iadeler: {
      rozet: 'Kontrol kaydı',
      baslik: 'İade, ikram, zayi ve personel yemeği',
      aciklama: 'Satış dışı ürün hareketlerini kayıt altına alarak maliyet ve stok farklarını daha doğru izleyin.',
      adimlar: ['İşlem tipini seç', 'Ürün ve sebebi gir', 'Kaydı oluştur'],
      aksiyonlar: [{ label: 'Raporlar', tab: 'raporlar' }],
    },
    rezervasyonlar: {
      rozet: 'Misafir planlama',
      baslik: 'Rezervasyon, kapora ve hatırlatma akışı',
      aciklama: 'Müşteri, masa, saat ve kapora bilgilerini düzenli tutun. WhatsApp hatırlatma linkleriyle müşteriye hızlı dönüş yapın.',
      adimlar: ['Müşteri ve tarih seç', 'Masa/kapora gir', 'Geldi veya gelmedi durumunu işle'],
      aksiyonlar: [{ label: 'Cari oluştur', tab: 'cari' }, { label: 'Masalar', tab: 'masalar' }],
    },
    garsonlar: {
      rozet: 'Personel yetkisi',
      baslik: 'Personel ekranlarını ve görevlerini yönet',
      aciklama: 'Garson/kasiyer yetkilerini işletmenin aktif modülleriyle uyumlu şekilde verin. Kapalı modüller personele görünmez.',
      adimlar: ['Personel oluştur', 'Görev ve telefon gir', 'Ekran yetkilerini seç'],
      aksiyonlar: [{ label: 'Modül yetkileri', tab: 'admin_moduller' }],
    },
    menu: {
      rozet: 'Ürün vitrini',
      baslik: 'Menü, fiyat, QR görünürlük ve satış durumu',
      aciklama: 'Ürünleri satışa alın/kaldırın, QR menüde görünüp görünmeyeceğini belirleyin ve ürün kartı maliyetini kontrol edin.',
      adimlar: ['Ürün gruplarını düzenle', 'Fiyat ve görsel gir', 'QR / satış durumunu ayarla'],
      aksiyonlar: [{ label: 'QR Menü önizle', tab: 'qr_menu' }, { label: 'Reçete kur', tab: 'receteler' }],
    },
    receteler: {
      rozet: 'Üretim ve alış',
      baslik: 'Hammadde, reçete, üretim, alış fişi ve depo sayımı',
      aciklama: 'Bir ürünü oluşturan tüm hammaddeleri reçeteye ekleyin. Manuel üretimde ürün stoğu artar; satışta üretimde hammadde satış anında düşer.',
      adimlar: ['Hammadde kartlarını aç', 'Ürüne toplu reçete kaydet', 'Üretim veya alış fişiyle stokları güncelle'],
      aksiyonlar: [{ label: 'Satış ürünü aç', tab: 'menu' }, { label: 'Stok takibi', tab: 'stok' }],
    },
    qr_menu: {
      rozet: 'Müşteri ekranı',
      baslik: 'QR menüden masa seçimi ve sipariş talebi',
      aciklama: 'Müşteri masa seçip sipariş talebi gönderir. Talep servis ekranına düşer; garson kabul edince ilgili masaya aktarılır.',
      adimlar: ['QR linkini paylaş', 'Masa seçimini test et', 'Servis taleplerinden onayla'],
      aksiyonlar: [{ label: 'Servis talepleri', tab: 'servis_talepleri' }, { label: 'Menü ürünleri', tab: 'menu' }],
    },
    servis_talepleri: {
      rozet: 'Garson onayı',
      baslik: 'QR sipariş, garson çağır ve hesap iste talepleri',
      aciklama: 'QR siparişler paket servise düşmez. Garson burada kabul ederse ürünler seçili masanın adisyonuna aktarılır.',
      adimlar: ['Yeni talepleri izle', 'QR siparişi kontrol et', 'Kabul edip masaya aktar'],
      aksiyonlar: [{ label: 'Masaları aç', tab: 'masalar' }, { label: 'QR Menü', tab: 'qr_menu' }],
    },
    sadakat: {
      rozet: 'Tekrar müşteri',
      baslik: 'Puan, ziyaret ve kampanya takibi',
      aciklama: 'Cari müşterilerden sadakat listesi oluşturup puan, ziyaret ve WhatsApp kampanya akışını takip edin.',
      adimlar: ['Müşteri seç', 'Puan/ziyaret kontrol et', 'Kampanya mesajı hazırla'],
      aksiyonlar: [{ label: 'Cari hesaplar', tab: 'cari' }],
    },
    kiosk: {
      rozet: 'Self servis',
      baslik: 'Kiosk / self servis sipariş ekranı',
      aciklama: 'Fast food ve gel-al işletmeler için müşteri veya kasiyer odaklı hızlı sipariş akışı.',
      adimlar: ['Ürünleri seç', 'Siparişi oluştur', 'Mutfak ve ödeme akışını kontrol et'],
      aksiyonlar: [{ label: 'Hızlı satış', tab: 'hizli_satis' }, { label: 'Mutfak', tab: 'mutfak' }],
    },
    super_admin: {
      rozet: 'SaaS yönetimi',
      baslik: 'Tüm işletmeleri ve başvuruları yönet',
      aciklama: 'Yeni işletmeleri onaylayın, hesap durumlarını kontrol edin ve müşteri destek sürecini takip edin.',
      adimlar: ['Yeni başvuruları incele', 'Aktif/pasif durumunu yönet', 'Modül paketini kontrol et'],
      aksiyonlar: [{ label: 'Lisanslar', tab: 'admin_lisans' }, { label: 'Modül yetkileri', tab: 'admin_moduller' }],
    },
    admin_lisans: {
      rozet: 'Gelir takibi',
      baslik: 'Lisans, ödeme ve paket yönetimi',
      aciklama: 'Deneme süresi, geciken ödeme ve paket bazlı müşteri takibini buradan yapın.',
      adimlar: ['Gecikenleri kontrol et', 'Paketi güncelle', 'Modül yetkisini düzenle'],
      aksiyonlar: [{ label: 'Modül yetkileri', tab: 'admin_moduller' }],
    },
    admin_moduller: {
      rozet: 'Paket yetkisi',
      baslik: 'İşletme bazlı sekme ve modül erişimi',
      aciklama: 'Başlangıç, profesyonel, QR plus veya premium paketlere göre işletmenin göreceği ekranları belirleyin.',
      adimlar: ['İşletmeyi seç', 'Paket şablonu uygula', 'Gereken sekmeleri aç/kapat'],
      aksiyonlar: [{ label: 'Lisanslar', tab: 'admin_lisans' }],
    },
    admin_destek: {
      rozet: 'Destek merkezi',
      baslik: 'Müşteri talepleri ve geliştirme notları',
      aciklama: 'Panel içinden gelen destek taleplerini durum, konu ve işletmeye göre takip edin.',
      adimlar: ['Açık talepleri incele', 'Durum güncelle', 'Geliştirme notu bırak'],
      aksiyonlar: [{ label: 'Tüm müşteriler', tab: 'super_admin' }],
    },
  };

  const renderEkranRehberi = () => {
    const rehber = ekranRehberleri[activeTab];
    if (!rehber || rehberGizli) return null;

    const gorunurAksiyonlar = (rehber.aksiyonlar || []).filter(aksiyon => {
      if (!aksiyon?.tab) return false;
      if (user?.role === 'super_admin' && String(aksiyon.tab).startsWith('admin')) return true;
      return tabGorunur(aksiyon.tab);
    });

    return (
      <div style={styles.smartGuideCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div style={styles.smartGuideBadge}>{rehber.rozet}</div>
            <h2 style={styles.smartGuideTitle}>{rehber.baslik}</h2>
            <p style={styles.smartGuideText}>{rehber.aciklama}</p>
          </div>
          <button type="button" onClick={kullanimRehberiniDegistir} style={styles.smartGuideCloseBtn}>Rehberi gizle</button>
        </div>

        <div style={isMobile ? styles.smartGuideStepsMobile : styles.smartGuideSteps}>
          {(rehber.adimlar || []).map((adim, index) => (
            <div key={`${activeTab}-rehber-${index}`} style={styles.smartGuideStep}>
              <span style={styles.smartGuideStepNo}>{index + 1}</span>
              <span>{adim}</span>
            </div>
          ))}
        </div>

        {gorunurAksiyonlar.length > 0 ? (
          <div style={styles.smartGuideActions}>
            {gorunurAksiyonlar.map(aksiyon => (
              <button
                key={`${activeTab}-${aksiyon.tab}`}
                type="button"
                onClick={() => setActiveTab(aksiyon.tab)}
                style={styles.smartGuideActionBtn}
              >
                {aksiyon.label} →
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

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
      {/* mutfak fişi yazdırma sorusunu ortada modal olarak gösteren kod */}
      {mutfakFisSorModal && (
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
              maxWidth: '430px',
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
                backgroundColor: '#ecfdf5',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                margin: '0 auto 14px',
              }}
            >
              👨‍🍳
            </div>

            <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '20px', fontWeight: '900' }}>
              Mutfak fişi yazdırılsın mı?
            </h3>

            <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>
              Bu sipariş mutfak ekranına düştü. Yazıcı hedefi: <strong>{mutfakFisYaziciOzeti(mutfakFisSorModal.fisler || [])}</strong>.
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
                <span>Fiş sayısı:</span>
                <strong>{mutfakFisSorModal.fisler?.length || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Sipariş:</span>
                <strong>{mutfakFisSorModal.fisler?.[0]?.masaAdi || '-'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', gap: '10px' }}>
                <span>Yönlendirme:</span>
                <strong style={{ textAlign: 'right' }}>{mutfakFisYaziciOzeti(mutfakFisSorModal.fisler || [])}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setMutfakFisSorModal(null)}
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
                Sadece Ekranda Kalsın
              </button>

              <button
                type="button"
                onClick={() => {
                  mutfakFisiYazdir(mutfakFisSorModal.fisler || []);
                  setMutfakFisSorModal(null);
                }}
                style={{
                  flex: 1,
                  border: 'none',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  padding: '12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '800',
                  fontSize: '14px',
                }}
              >
                Mutfak Fişi Yazdır
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
              <a href="#fiyatlar" style={styles.navLinkItem}>Paketler</a>
              <a href="#destek" style={styles.navLinkItem}>Destek</a>
              <a href="#sss" style={styles.navLinkItem}>SSS</a>
            </nav>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button onClick={() => setScreen('login')} style={styles.navbarLoginBtn}>Giriş Yap</button>
              <a href="#destek" style={{ ...styles.navbarRegisterBtn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>İletişime Geç</a>
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
              <span style={styles.heroBadge}>✨ Bulut tabanlı restoran POS • QR menü • Reçete & maliyet • Mobil uyumlu</span>
              <h1 style={styles.heroTitle}>Restoran, kafe ve paket servisi tek panelden yönetin.</h1>
              <p style={styles.heroSubtitle}>
                Integra POS; masa adisyonu, QR menü siparişi, paket servis, reçete-maliyet, cari/veresiye, stok ve gün sonu raporlarını modern bir işletme panelinde toplar.
              </p>

              <div style={styles.heroActionGroup}>
                <a href="#destek" style={{ ...styles.heroMainBtn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>İletişime Geç</a>
                <button onClick={() => setScreen('login')} style={styles.heroSecondaryBtn}>Müşteri Girişi</button>
                <a href="tel:05325014277" style={styles.heroPhoneBtn}>📞 Hemen Ara</a>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '22px' }}>
                {['QR Menü', 'Masa Adisyon', 'Android APK', 'Mutfak & Bar', 'Cari / Veresiye', 'Stok & Reçete'].map(item => (
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
                  <div style={styles.heroStatValue}>QR</div>
                  <div style={styles.heroStatLabel}>Masa siparişi</div>
                </div>
                <div style={styles.heroStatCard}>
                  <div style={styles.heroStatValue}>Kâr</div>
                  <div style={styles.heroStatLabel}>Maliyet takibi</div>
                </div>
              </div>
            </div>

            <div style={styles.heroVisual}>
              <div style={{ ...styles.mockupCard, maxWidth: '560px' }}>
                <div style={styles.mockupHeader}>
                  <span style={{ color: '#ef4444' }}>●</span>
                  <span style={{ color: '#f59e0b' }}>●</span>
                  <span style={{ color: '#10b981' }}>●</span>
                  Canlı Integra POS Paneli
                </div>

                <div style={{ padding: '18px' }}>
                  <div style={styles.mockupTopRow}>
                    <div style={styles.mockupBadge}>Salon / Bahçe / Teras • Canlı</div>
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
                    <div style={styles.mockupReceiptTitle}>🧾 Aktif Adisyon • Reçete & Maliyet Takibi</div>
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

          {/* PREMIUM GÜVEN ŞERİDİ */}
          <section style={styles.trustStripSection}>
            {[
              ['🧾', 'Fiş ve mutfak akışı', 'Adisyon, mutfak, bar ve ödeme süreçleri tek panelden yönetilir.'],
              ['📱', 'Mobil / APK', 'Telefon ve tablet kullanımına uygun hızlı adisyon ekranları.'],
              ['📊', 'Canlı rapor', 'Kasa, KDV, kâr, cari ve gün sonu verileri anlık takip edilir.'],
              ['🛵', 'Paket servis', 'Müşteri, kurye, paket fişi ve cari/veresiye akışı tek panelde.'],
            ].map(([icon, title, text]) => (
              <div key={title} style={styles.trustPillCard}>
                <div style={styles.trustPillIcon}>{icon}</div>
                <div>
                  <strong style={styles.trustPillTitle}>{title}</strong>
                  <p style={styles.trustPillText}>{text}</p>
                </div>
              </div>
            ))}
          </section>

          {/* CANLI OPERASYON AKIŞI */}
          <section style={{ padding: '72px 4%', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
              <div style={styles.sectionHeadWrap}>
                <span style={styles.sectionBadge}>Canlı Operasyon</span>
                <h2 style={styles.sectionTitle}>Siparişten rapora kadar akış tek çizgide ilerler</h2>
                <p style={styles.sectionSubtitle}>
                  QR menü, masa adisyonu, reçete/stok düşümü ve kâr raporu birbirine bağlı çalışır. İşletme sahibi gün sonunda sadece ciroyu değil, maliyeti ve kârlılığı da görür.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {[
                  ['1', 'Müşteri sipariş verir', 'Masa, QR menü, hızlı satış veya paket servis üzerinden sipariş alınır.'],
                  ['2', 'Garson onaylar', 'QR talepleri servis ekranına düşer, garson onayıyla doğru masaya aktarılır.'],
                  ['3', 'Stok ve reçete işler', 'Ürün reçetesine göre hammadde veya üretilmiş ürün stoğu kontrollü düşer.'],
                  ['4', 'Kâr rapora yansır', 'Satış, maliyet, brüt kâr, cari ve kasa hareketleri raporlarda toplanır.'],
                ].map(([no, title, text]) => (
                  <div key={title} style={{ background: 'linear-gradient(180deg, #fff 0%, #fff7ed 100%)', border: '1px solid #fed7aa', borderRadius: '20px', padding: '22px', boxShadow: '0 18px 40px -28px rgba(15,23,42,0.22)' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '14px', backgroundColor: '#ff6b35', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', marginBottom: '14px' }}>{no}</div>
                    <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '17px' }}>{title}</h3>
                    <p style={{ margin: 0, color: '#64748b', lineHeight: 1.65, fontSize: '13px' }}>{text}</p>
                  </div>
                ))}
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
              <span style={styles.sectionBadge}>Paketler</span>
              <h2 style={styles.sectionTitle}>İşletmenize uygun paketi birlikte belirleyelim</h2>
              <p style={styles.sectionSubtitle}>İhtiyacınız olan modüllere göre size uygun kurulumu ve lisans paketini birlikte planlayalım.</p>
            </div>

            <div style={{ ...styles.pricingGrid, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              <div style={{ ...styles.priceCard, ...styles.priceCardFeatured }}>
                <div style={styles.pricePopularBadge}>En Çok Tercih Edilen</div>
                <div style={styles.pricePlan}>Profesyonel</div>
                <div style={styles.priceValue}>İletişime Geçin</div>
                <ul style={styles.priceList}>
                  <li style={styles.priceListItem}>Masa, adisyon ve masa aktarma</li>
                  <li style={styles.priceListItem}>Paket servis ve hızlı satış</li>
                  <li style={styles.priceListItem}>Mutfak ekranı ve fiş tasarımı</li>
                  <li style={styles.priceListItem}>Gün sonu, kasa ve raporlar</li>
                  <li style={styles.priceListItem}>Personel yetkileri ve kullanıcı limiti</li>
                </ul>
                <a href="#destek" style={{ ...styles.priceBtn, textDecoration: 'none', display: 'inline-flex', justifyContent: 'center' }}>İletişime Geç</a>
              </div>

              <div style={styles.priceCard}>
                <div style={styles.pricePlan}>Kurumsal / Özel Çözüm</div>
                <div style={styles.priceValue}>İletişime Geçin</div>
                <ul style={styles.priceList}>
                  <li style={styles.priceListItem}>Çok şubeli yapı</li>
                  <li style={styles.priceListItem}>Özel kurulum ve eğitim desteği</li>
                  <li style={styles.priceListItem}>Yazıcı ve donanım danışmanlığı</li>
                  <li style={styles.priceListItem}>Özel entegrasyon ve geliştirme</li>
                </ul>
                <button onClick={() => { setKayitPaketi('Kurumsal'); setScreen('register'); }} style={styles.priceBtnLight}>İletişime Geç</button>
              </div>
            </div>
          </section>

          {/* DESTEK VE GELİŞTİRME */}
          <section id="destek" style={{ padding: '82px 4%', backgroundColor: '#fff7ed', borderTop: '1px solid #fed7aa' }}>
            <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px', alignItems: 'start' }}>
              <div>
                <span style={styles.sectionBadge}>Destek ve Geliştirme</span>
                <h2 style={styles.sectionTitle}>İstek, hata ve geliştirme taleplerinizi bize gönderin.</h2>
                <p style={styles.sectionSubtitle}>Müşterilerinizden gelen ihtiyaçlara göre sistemi büyütelim. Formdan gönderilen talepler ekibimize ulaşır; işletmenize uygun kurulum ve kullanım akışını birlikte planlarız.</p>
                <div style={{ display: 'grid', gap: '12px', marginTop: '22px' }}>
                  {[
                    'Yeni özellik isteği',
                    'Fiş/yazıcı desteği',
                    'Kullanım veya kurulum desteği',
                    'Hata bildirimi ve iyileştirme',
                  ].map(item => (
                    <div key={item} style={{ backgroundColor: '#fff', border: '1px solid #fed7aa', borderRadius: '14px', padding: '14px', color: '#334155', fontWeight: '800' }}>
                      ✅ {item}
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={destekTalebiGonder} style={{ backgroundColor: '#fff', border: '1px solid #fed7aa', borderRadius: '22px', padding: '22px', boxShadow: '0 20px 45px -30px rgba(15,23,42,0.25)' }}>
                <h3 style={{ margin: '0 0 14px', color: '#1e293b' }}>Talep Gönder</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <input type="text" placeholder="Ad Soyad" value={destekAdSoyad} onChange={e => setDestekAdSoyad(e.target.value)} style={styles.authInput} />
                  <input type="text" placeholder="Firma / İşletme Adı *" value={destekFirmaAdi} onChange={e => setDestekFirmaAdi(e.target.value)} style={styles.authInput} />
                  <input type="email" placeholder="E-posta *" value={destekEmail} onChange={e => setDestekEmail(e.target.value)} style={styles.authInput} />
                  <input type="tel" placeholder="Telefon" value={destekTelefon} onChange={e => setDestekTelefon(e.target.value)} style={styles.authInput} />
                  <select value={destekTalepTipi} onChange={e => setDestekTalepTipi(e.target.value)} style={styles.authInput}>
                    <option>Geliştirme Talebi</option>
                    <option>Destek Talebi</option>
                    <option>Hata Bildirimi</option>
                    <option>Fiş / Yazıcı Talebi</option>
                    <option>Kurulum Talebi</option>
                  </select>
                  <input type="text" placeholder="Konu" value={destekKonu} onChange={e => setDestekKonu(e.target.value)} style={styles.authInput} />
                  <textarea placeholder="Talebinizi yazın *" value={destekMesaj} onChange={e => setDestekMesaj(e.target.value)} style={{ ...styles.authInput, minHeight: '120px', resize: 'vertical' }} />
                  <button type="submit" style={styles.priceBtn}>Talebi Gönder</button>
                </div>
              </form>
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
                ['Fiş ve mutfak akışı var mı?', 'Adisyon, mutfak, bar, ödeme fişi ve gün sonu raporu aynı panelden yönetilebilir.'],
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

          <div style={styles.landingFloatingCta}>
            <div style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>Integra POS</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>Teklif ve demo için ulaşın</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <a href="#destek" style={{ ...styles.floatingCtaPrimary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>İletişim</a>
              <a href="tel:05325014277" style={styles.floatingCtaSecondary}>Ara</a>
            </div>
          </div>

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
              <div style={{ textAlign: 'right', marginTop: '-4px', marginBottom: '2px' }}>
                <span
                  onClick={() => {
                    setSifremiUnuttumEmail(email);
                    setScreen('forgot_password');
                  }}
                  style={{ ...styles.authLink, fontSize: '13px' }}
                >
                  Şifremi Unuttum
                </span>
              </div>
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


      {/* şifremi unuttum ekranını gösteren kod */}
      {screen === 'forgot_password' && (
        <div style={styles.authBg}>
          <div style={styles.authCard}>
            <div
              onClick={() => setScreen('landing')}
              style={{ ...styles.logoContainer, cursor: 'pointer', marginBottom: '15px', justifyContent: 'center' }}
            >
              <span style={styles.orangeDot}>●</span>
              <strong style={{ color: '#1e293b' }}>integra</strong>
            </div>

            <h3 style={styles.authTitle}>Şifremi Unuttum</h3>

            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', lineHeight: '1.6', margin: '0 0 16px' }}>
              E-posta adresinizi ve kayıtlı telefon numaranızı girerek yeni şifre belirleyin.
            </p>

            <form onSubmit={handleSifremiUnuttum} style={styles.form}>
              <input
                type="email"
                placeholder="E-posta Adresi"
                value={sifremiUnuttumEmail}
                onChange={e => setSifremiUnuttumEmail(e.target.value)}
                style={styles.authInput}
              />
              <input
                type="tel"
                placeholder="Kayıtlı Telefon"
                value={sifremiUnuttumTelefon}
                onChange={e => setSifremiUnuttumTelefon(e.target.value)}
                style={styles.authInput}
              />
              <input
                type="password"
                placeholder="Yeni Şifre"
                value={sifremiUnuttumYeniSifre}
                onChange={e => setSifremiUnuttumYeniSifre(e.target.value)}
                style={styles.authInput}
              />
              <input
                type="password"
                placeholder="Yeni Şifre Tekrar"
                value={sifremiUnuttumYeniSifreTekrar}
                onChange={e => setSifremiUnuttumYeniSifreTekrar(e.target.value)}
                style={styles.authInput}
              />
              <button type="submit" style={styles.authBtnOrange}>Şifreyi Güncelle</button>
            </form>

            <button onClick={() => setScreen('login')} style={styles.cancelReturnBtn}>
              ← Giriş Ekranına Dön
            </button>

            <p style={styles.authFooter}>
              Telefon bilgisine ulaşamıyorsanız işletme yöneticinizden veya destek ekibinden yardım isteyin.
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
                placeholder="Restoran / Kafe Adı *"
                value={restaurantName}
                onChange={e => setRestaurantName(e.target.value)}
                style={styles.authInput}
              />
              <input
                type="text"
                placeholder="Yetkili Adı Soyadı *"
                value={kayitYetkiliAdi}
                onChange={e => setKayitYetkiliAdi(e.target.value)}
                style={styles.authInput}
              />
              <input
                type="tel"
                placeholder="Firma Telefonu *"
                value={kayitTelefon}
                onChange={e => setKayitTelefon(e.target.value)}
                style={styles.authInput}
              />
              <input
                type="text"
                placeholder="Firma Adresi"
                value={kayitAdres}
                onChange={e => setKayitAdres(e.target.value)}
                style={styles.authInput}
              />
              <select
                value={kayitPaketi}
                onChange={e => setKayitPaketi(e.target.value)}
                style={styles.authInput}
              >
                <option value="Profesyonel">Profesyonel - İletişime Geçin</option>
                <option value="Kurumsal">Kurumsal / Özel Çözüm - İletişime Geçin</option>
              </select>
              <input
                type="email"
                placeholder="Yönetici E-posta Adresi *"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={styles.authInput}
              />
              <input
                type="password"
                placeholder="Şifre Belirleyin *"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={styles.authInput}
              />
              <textarea
                placeholder="Başvuru notu / ihtiyaçlarınız"
                value={kayitNotu}
                onChange={e => setKayitNotu(e.target.value)}
                style={{ ...styles.authInput, minHeight: '90px', resize: 'vertical' }}
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
        <div style={isMobile ? styles.dashboardLayoutMobile : styles.dashboardLayout}>
          {/* SIDEBAR */}
          <div style={isMobile ? styles.sidebarMobile : styles.sidebar}>
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

            <nav style={isMobile ? styles.navGroupMobile : styles.navGroup}>
              <div style={styles.navSectionTitle}>Günlük Operasyon</div>
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
                  🛵 Paket Servis {yeniOnlineSiparisSayisi > 0 ? `(${yeniOnlineSiparisSayisi})` : ''}
                </button>
              )}

              {tabGorunur('entegrasyonlar') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('entegrasyonlar')}
                  style={activeTab === 'entegrasyonlar' ? styles.navItemActive : styles.navItem}
                >
                  🔌 Entegrasyonlar
                </button>
              )}

              <div style={styles.navSectionTitle}>Finans ve Müşteri</div>
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


              <div style={styles.navSectionTitle}>Satış Kanalları</div>
              {tabGorunur('hizli_satis') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('hizli_satis')}
                  style={activeTab === 'hizli_satis' ? styles.navItemActive : styles.navItem}
                >
                  ⚡ Hızlı Satış
                </button>
              )}

              <div style={styles.navSectionTitle}>Yönetim</div>
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

              <div style={styles.navSectionTitle}>Ürün ve Dijital</div>
              {tabGorunur('menu') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('menu')}
                  style={activeTab === 'menu' ? styles.navItemActive : styles.navItem}
                >
                  🍔 Menü & Ayarlar
                </button>
              )}

              {tabGorunur('receteler') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('receteler')}
                  style={activeTab === 'receteler' ? styles.navItemActive : styles.navItem}
                >
                  🧾 Reçeteler
                </button>
              )}

              {tabGorunur('qr_menu') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('qr_menu')}
                  style={activeTab === 'qr_menu' ? styles.navItemActive : styles.navItem}
                >
                  📱 QR Menü
                </button>
              )}

              {tabGorunur('servis_talepleri') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('servis_talepleri')}
                  style={activeTab === 'servis_talepleri' ? styles.navItemActive : styles.navItem}
                >
                  🔔 Servis Talepleri {acikServisTalebiSayisi > 0 ? `(${acikServisTalebiSayisi})` : ''}
                </button>
              )}

              {tabGorunur('sadakat') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('sadakat')}
                  style={activeTab === 'sadakat' ? styles.navItemActive : styles.navItem}
                >
                  🎁 Sadakat
                </button>
              )}

              {tabGorunur('kiosk') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('kiosk')}
                  style={activeTab === 'kiosk' ? styles.navItemActive : styles.navItem}
                >
                  🧍 Kiosk
                </button>
              )}

              {user?.role === 'super_admin' && (
                <>
                  <div style={styles.navSectionTitle}>Integra Admin</div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('super_admin')}
                    style={activeTab === 'super_admin' ? styles.navItemActive : styles.navItem}
                  >
                    👑 Tüm integra Müşterileri
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin_lisans')}
                    style={activeTab === 'admin_lisans' ? styles.navItemActive : styles.navItem}
                  >
                    💳 Lisans & Ödeme {adminLisansOzet.geciken > 0 ? `(${adminLisansOzet.geciken})` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin_moduller')}
                    style={activeTab === 'admin_moduller' ? styles.navItemActive : styles.navItem}
                  >
                    🧩 Modül Yetkileri
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setActiveTab('admin_destek');
                      await destekTalepleriniSupabasedenCek();
                    }}
                    style={activeTab === 'admin_destek' ? styles.navItemActive : styles.navItem}
                  >
                    🛠️ Destek Paneli {adminDestekAcikSayisi > 0 ? `(${adminDestekAcikSayisi})` : ''}
                  </button>
                </>
              )}
            </nav>
            <div style={styles.sidebarHelpBox}>
              <div style={{ fontWeight: '900', color: '#fff', marginBottom: '4px' }}>Destek ve kurulum</div>
              <div style={{ color: '#cbd5e1', fontSize: '11px', lineHeight: 1.45 }}>Canlı destek: 0532 501 42 77</div>
            </div>
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
          <div style={isMobile ? styles.mainContentMobile : styles.mainContent}>
            {renderEkranRehberi()}
            {rehberGizli ? (
              <button type="button" onClick={kullanimRehberiniDegistir} style={styles.smartGuideShowBtn}>💡 Ekran rehberini göster</button>
            ) : null}
            {/* masalar ve canlı adisyon ekranını gösteren kod */}
            {activeTab === 'masalar' && (
              <div style={isMobile ? styles.posLayoutMobile : styles.posLayout}>
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

                        <form onSubmit={topluMasaEkle} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            placeholder="Ön ek"
                            value={topluMasaOnEk}
                            onChange={e => setTopluMasaOnEk(e.target.value)}
                            style={{ ...styles.tableInputMini, width: '85px' }}
                          />
                          <input
                            type="number"
                            min="1"
                            placeholder="Başlangıç"
                            value={topluMasaBaslangicNo}
                            onChange={e => setTopluMasaBaslangicNo(e.target.value)}
                            style={{ ...styles.tableInputMini, width: '80px' }}
                          />
                          <input
                            type="number"
                            min="1"
                            max="100"
                            placeholder="Adet"
                            value={topluMasaAdet}
                            onChange={e => setTopluMasaAdet(e.target.value)}
                            style={{ ...styles.tableInputMini, width: '70px' }}
                          />
                          <button type="submit" style={styles.addBtnMini}>
                            + Toplu
                          </button>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* masa bölümlerini üstte sekme olarak gösteren kod */}
                  <div
                    style={isMobile
                      ? { ...styles.yatayKaydirmaSekmeleri, marginBottom: '16px' }
                      : {
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
                          setMobilAdisyonAcik(false);
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
                          flex: '0 0 auto',
                        }}
                      >
                        {bolum}
                      </button>
                    ))}
                  </div>

                  {aktarimMesaji && (
                    <div
                      style={{
                        backgroundColor: (masaAktarmaModu || masaBirlestirmeModu) ? '#eef2ff' : '#f0fdf4',
                        color: (masaAktarmaModu || masaBirlestirmeModu) ? '#3730a3' : '#15803d',
                        border: (masaAktarmaModu || masaBirlestirmeModu) ? '1px solid #c7d2fe' : '1px solid #bbf7d0',
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
                    <div style={isMobile ? styles.mesaGridMobile : styles.mesaGrid}>
                      {aktifMasalar.map(m => {
                        const kaynakMasaMi =
                          (masaAktarmaModu && String(m.id) === String(aktarilanKaynakMasaId)) ||
                          (masaBirlestirmeModu && String(m.id) === String(birlestirilenKaynakMasaId));

                        const hedefOlabilirMi =
                          (masaAktarmaModu &&
                            !kaynakMasaMi &&
                            !m.dolu &&
                            Number(m.tutar || 0) === 0 &&
                            (!m.siparisler || m.siparisler.length === 0)) ||
                          (masaBirlestirmeModu &&
                            !kaynakMasaMi &&
                            m.dolu &&
                            Array.isArray(m.siparisler) &&
                            m.siparisler.length > 0);

                        const aktifRezervasyon = aktifRezervasyonBul(m.id);

                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              if (masaAktarmaModu) {
                                masaAktarTikla(m);
                                return;
                              }

                              if (masaBirlestirmeModu) {
                                masaBirlestirTikla(m);
                                return;
                              }

                              setSelectedMasaId(m.id);
                              setAktifMasaBolumu(m.bolum || aktifMasaBolumu || 'Salon');

                              if (isMobile) {
                                setMobilAdisyonSekmesi('urun');
                                setMobilAdisyonAcik(true);
                              }
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
                {(!isMobile || (mobilAdisyonAcik && activeMasa)) && (
                <div style={isMobile ? styles.mobilAdisyonTamEkran : styles.adisyonPanel}>
                  {isMobile ? (
                    <div style={styles.mobilAdisyonUstBar}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={styles.mobilAdisyonMasaAdi}>🧾 {activeMasa ? activeMasa.ad : 'Masa Seçilmedi'}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setMobilAdisyonAcik(false)}
                        style={styles.mobilAdisyonKapatBtn}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div style={styles.desktopAdisyonUstBar}>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ ...styles.panelTitle, marginBottom: '0' }}>
                          🧾 {activeMasa ? activeMasa.ad : 'Masa Seçilmedi'} Canlı Fişi
                        </h3>
                      </div>
                    </div>
                  )}

                  <div style={isMobile ? styles.mobilAdisyonSekmeKutusu : styles.desktopAdisyonSekmeKutusu}>
                    <button
                      type="button"
                      onClick={() => setMobilAdisyonSekmesi('urun')}
                      style={mobilAdisyonSekmesi === 'urun' ? styles.mobilAdisyonSekmeAktif : styles.mobilAdisyonSekme}
                    >
                      Ürün Ekle
                    </button>

                    <button
                      type="button"
                      onClick={() => setMobilAdisyonSekmesi('adisyon')}
                      style={mobilAdisyonSekmesi === 'adisyon' ? styles.mobilAdisyonSekmeAktif : styles.mobilAdisyonSekme}
                    >
                      Adisyon / Fiş
                    </button>
                  </div>

                  {mobilAdisyonSekmesi === 'adisyon' && (
                    <>
                      {activeMasa?.dolu && (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                          {!masaAktarmaModu ? (
                            <button
                              type="button"
                              onClick={masaAktarmaBaslat}
                              style={{ ...styles.checkoutBtn, backgroundColor: '#6366f1', padding: '10px 12px', fontSize: '12px' }}
                            >
                              🔁 Masa Aktar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={masaAktarmaIptalEt}
                              style={{ ...styles.checkoutBtn, backgroundColor: '#ef4444', padding: '10px 12px', fontSize: '12px' }}
                            >
                              Aktarmadan Vazgeç
                            </button>
                          )}

                          {!masaBirlestirmeModu ? (
                            <button
                              type="button"
                              onClick={masaBirlestirmeBaslat}
                              style={{ ...styles.checkoutBtn, backgroundColor: '#f59e0b', padding: '10px 12px', fontSize: '12px' }}
                            >
                              🔗 Masa Birleştir
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={masaBirlestirmeIptalEt}
                              style={{ ...styles.checkoutBtn, backgroundColor: '#ef4444', padding: '10px 12px', fontSize: '12px' }}
                            >
                              Birleştirmeden Vazgeç
                            </button>
                          )}
                        </div>
                      )}

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
                          <div>Açılış Saati: <strong>{saatYaz(activeMasa.adisyonAcilisSaati)}</strong></div>
                          <div>Garson: <strong>{activeMasa.adisyonGarsonAdi || '-'}</strong></div>
                        </div>
                      )}

                      {activeMasa && (
                        <div
                          style={{
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '8px',
                            marginBottom: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          <details style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px' }}>
                            <summary style={{ fontSize: '12px', color: '#475569', fontWeight: '900', cursor: 'pointer' }}>
                              📒 Cari / Veresiye {cariAdisyonMusteriId ? '— Seçili' : ''}
                            </summary>

                            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginTop: '8px' }}>
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

                                {cariAdisyonMusteriId && (
                                  <div style={{ color: '#7c3aed', fontSize: '11px', padding: '6px 2px', fontWeight: '900' }}>
                                    Seçili cari: {cariAdisyonArama}
                                  </div>
                                )}

                                {cariAdisyonArama && !cariAdisyonMusteriId && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                                    {filtreliCariAdisyonMusterileri.length === 0 ? (
                                      <div style={{ color: '#94a3b8', fontSize: '11px', padding: '6px' }}>Eşleşen cari yok.</div>
                                    ) : (
                                      filtreliCariAdisyonMusterileri.map(c => (
                                        <button
                                          key={c.id}
                                          type="button"
                                          onClick={() => cariAdisyonMusterisiSec(String(c.id))}
                                          style={{
                                            border: '1px solid #e2e8f0',
                                            backgroundColor: '#fff',
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
                          </details>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder="Müşteri adı"
                              value={musteriAdiInput}
                              onChange={e => setMusteriAdiInput(e.target.value)}
                              style={{ ...styles.panelSelect, flex: 1, padding: '8px', fontSize: '12px' }}
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
                    </>
                  )}


                  {activeMasa && (
                    <>
                      {mobilAdisyonSekmesi === 'urun' && (
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
                                flex: isMobile ? '1 1 100%' : '1 1 150px',
                                width: isMobile ? '100%' : undefined,
                                padding: '8px 10px',
                                fontSize: '12px',
                                backgroundColor: '#fff',
                              }}
                            />
                          </div>

                          <div
                            style={isMobile
                              ? { ...styles.yatayKaydirmaSekmeleri, gap: '7px', paddingBottom: '2px', paddingRight: '2px' }
                              : {
                                display: 'flex',
                                gap: '7px',
                                flexWrap: 'wrap',
                                maxHeight: '96px',
                                overflowY: 'auto',
                                paddingBottom: '2px',
                                paddingRight: '2px',
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
                                    flex: '0 0 auto',
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
                                    {urunGosterimResmi(u) && (
                                      <img
                                        src={urunGosterimResmi(u)}
                                        alt={u.ad}
                                        onError={e => { e.currentTarget.style.display = 'none'; }}
                                        style={{ width: '100%', height: '74px', objectFit: 'cover', borderRadius: '10px', marginBottom: '7px', backgroundColor: '#f1f5f9' }}
                                      />
                                    )}

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

                        <button
                          type="button"
                          onClick={masayaSeciliUrunuEkle}
                          style={styles.panelAddBtn}
                        >
                          Ekle
                        </button>
                      </div>
                      )}

                      {mobilAdisyonSekmesi === 'adisyon' && (
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
                                    adisyonUrunFiyatiDegistir(idx);
                                  }}
                                  style={{
                                    border: 'none',
                                    backgroundColor: '#0ea5e9',
                                    color: '#fff',
                                    borderRadius: '8px',
                                    padding: '6px 8px',
                                    cursor: 'pointer',
                                    fontWeight: '900',
                                    fontSize: '11px',
                                  }}
                                  title="Bu satırın satış fiyatını değiştir"
                                >
                                  💸 Fiyat
                                </button>
                              )}

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
                      )}

                      {mobilAdisyonSekmesi === 'adisyon' && (
                      <div style={styles.receiptFooter}>
                        <div style={styles.totalRow}>
                          <span>Toplam:</span>
                          <span style={{ fontSize: '22px', color: '#ff6b35', fontWeight: '800' }}>
                            {activeMasa.tutar} TL
                          </span>
                        </div>

                        {activeMasa.dolu && (Number(activeMasa.adisyonIndirimYuzde || 0) > 0 || Number(activeMasa.adisyonIndirimTutari || 0) > 0) && (
                          <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '10px', padding: '8px 10px', fontSize: '12px', fontWeight: '900', marginBottom: '10px' }}>
                            Ara Toplam: {aktifMasaIndirimOzeti.brutToplam} TL / Toplam İndirim: -{aktifMasaIndirimOzeti.toplamIndirim} TL
                          </div>
                        )}

                        {activeMasa.dolu && activeMasa.siparisler && activeMasa.siparisler.length > 0 && (
                          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '10px', padding: '8px 10px', fontSize: '12px', fontWeight: '900', marginBottom: '10px' }}>
                            KDV Matrahı: {aktifMasaKdvOzeti.matrahToplam} TL / KDV Tutarı: {aktifMasaKdvOzeti.kdvToplam} TL
                          </div>
                        )}

                        {activeMasa.dolu && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                              <div>Ödenen: <strong>{odemeToplami(activeMasa)} TL</strong></div>
                              <div>Kalan: <strong>{kalanTutar(activeMasa)} TL</strong></div>
                              <div>KDV: <strong>{aktifMasaKdvOzeti.kdvToplam} TL</strong></div>
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

                            {activeMasa.dolu && (
                          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', color: '#475569', fontWeight: '900', marginBottom: '8px' }}>Adisyon Toplam İndirimi</div>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="% indirim"
                                value={adisyonToplamIndirimYuzde}
                                onChange={e => setAdisyonToplamIndirimYuzde(e.target.value)}
                                style={{ ...styles.panelSelect, padding: '8px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}
                              />
                              <input
                                type="number"
                                min="0"
                                placeholder="TL indirim"
                                value={adisyonToplamIndirimTutari}
                                onChange={e => setAdisyonToplamIndirimTutari(e.target.value)}
                                style={{ ...styles.panelSelect, padding: '8px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}
                              />
                              <button
                                type="button"
                                onClick={adisyonToplamIndirimiKaydet}
                                style={{ ...styles.checkoutBtn, backgroundColor: '#0f766e', padding: '9px', fontSize: '12px', width: isMobile ? '100%' : 'auto' }}
                              >
                                Uygula
                              </button>
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b', fontWeight: '800', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span>Ara toplam: {adisyonIndirimOnizleme.brutToplam} TL</span>
                              <span>İndirim: -{adisyonIndirimOnizleme.toplamIndirim} TL</span>
                              <span>İndirimli toplam: {adisyonIndirimOnizleme.netToplam} TL</span>
                            </div>
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
                      )}
                    </>
                  )}
                </div>
                )}
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

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => mutfakFisiYazdir(mutfakFisleri, 'Mutfak Toplu Fiş')}
                      disabled={!Array.isArray(mutfakFisleri) || mutfakFisleri.length === 0}
                      style={{
                        border: 'none',
                        backgroundColor: (!Array.isArray(mutfakFisleri) || mutfakFisleri.length === 0) ? '#94a3b8' : '#10b981',
                        color: '#fff',
                        padding: '10px 13px',
                        borderRadius: '10px',
                        cursor: (!Array.isArray(mutfakFisleri) || mutfakFisleri.length === 0) ? 'not-allowed' : 'pointer',
                        fontWeight: '800',
                        fontSize: '12px',
                      }}
                    >
                      Mutfak Fişi Yazdır
                    </button>

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
                          backgroundColor: fis.durum === 'İptal' ? '#fef2f2' : fis.durum === 'Hazırlandı' ? '#f0fdf4' : '#fff7ed',
                          border: fis.durum === 'İptal' ? '1px solid #fecaca' : fis.durum === 'Hazırlandı' ? '1px solid #bbf7d0' : '1px solid #fed7aa',
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
                                backgroundColor: fis.durum === 'İptal' ? '#fee2e2' : fis.durum === 'Hazırlandı' ? '#dcfce7' : '#ffedd5',
                                color: fis.durum === 'İptal' ? '#b91c1c' : fis.durum === 'Hazırlandı' ? '#15803d' : '#c2410c',
                                padding: '5px 9px',
                                borderRadius: '999px',
                                fontSize: '12px',
                                fontWeight: '900',
                              }}
                            >
                              {fis.durum}
                            </span>
                          </div>

                          <div style={{ fontSize: '18px', fontWeight: '900', color: fis.durum === 'İptal' ? '#b91c1c' : '#1e293b' }}>
                            {fis.durum === 'İptal' ? '❌ İPTAL - ' : ''}{fis.adet}x {fis.urunAdi}
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

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'stretch' }}>
                          <button
                            type="button"
                            onClick={() => mutfakFisiYazdir([fis])}
                            style={{
                              border: 'none',
                              backgroundColor: '#1e293b',
                              color: '#fff',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              fontWeight: '900',
                              fontSize: '12px',
                            }}
                          >
                            Fiş Yazdır
                          </button>

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
                              {fis.durum === 'İptal' ? 'İptali Kaldır' : 'Hazırlandı'}
                            </button>
                          )}
                        </div>
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

                <div style={{ ...styles.panelCard, backgroundColor: '#f8fafc', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', margin: 0, color: '#1e293b' }}>🌐 Online Siparişler</h3>
                      <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                        Trendyol, Getir ve Migros siparişleri burada toplanır; onayladığınız sipariş paket servise ve mutfağa aktarılır.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => onlineSiparisleriBackenddenCek(aktifEntegrasyonPlatformu)} disabled={onlineSiparisYukleniyor} style={{ ...styles.btnOrange, backgroundColor: onlineSiparisYukleniyor ? '#94a3b8' : '#2563eb' }}>
                        {onlineSiparisYukleniyor ? 'Çekiliyor...' : 'Siparişleri Çek'}
                      </button>
                      <button type="button" onClick={() => onlineTestSenaryoOlustur(aktifEntegrasyonPlatformu, entegrasyonTestSenaryosu)} style={{ ...styles.btnOrange, backgroundColor: '#10b981' }}>
                        Test Siparişi Düşür
                      </button>
                      <button type="button" onClick={() => setActiveTab('entegrasyonlar')} style={{ ...styles.btnOrange, backgroundColor: '#0f172a' }}>
                        Entegrasyon Ayarları
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {entegrasyonPlatformSecenekleri.map(platform => {
                      const bagli = aktifRestoranPlatformBaglantilari.some(b => b.platform === platform && b.aktif !== false);
                      return (
                        <button key={platform} type="button" onClick={() => setAktifEntegrasyonPlatformu(platform)} style={{ border: aktifEntegrasyonPlatformu === platform ? '1px solid #ff6b35' : '1px solid #e2e8f0', backgroundColor: aktifEntegrasyonPlatformu === platform ? '#fff7ed' : '#fff', color: aktifEntegrasyonPlatformu === platform ? '#ea580c' : '#334155', padding: '8px 10px', borderRadius: '999px', cursor: 'pointer', fontWeight: '900', fontSize: '12px' }}>
                          {platform} {bagli ? '✅' : '⚙️'}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ backgroundColor: entegrasyonTestModu ? '#eff6ff' : '#f8fafc', border: entegrasyonTestModu ? '1px solid #bfdbfe' : '1px solid #e2e8f0', borderRadius: '14px', padding: '10px', marginBottom: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <strong style={{ color: '#1e293b', fontSize: '13px' }}>🧪 Entegrasyon test modu: {entegrasyonTestModu ? 'Açık' : 'Kapalı'}</strong>
                      <div style={{ color: '#64748b', fontSize: '12px', marginTop: '3px' }}>API bilgisi yokken seçili senaryo ile gerçek sipariş gibi deneme kaydı oluşturur.</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <select value={entegrasyonTestSenaryosu} onChange={e => setEntegrasyonTestSenaryosu(e.target.value)} style={{ ...styles.input, minWidth: '170px' }}>
                        {onlineTestSenaryolari.map(senaryo => (<option key={senaryo.key} value={senaryo.key}>{senaryo.label}</option>))}
                      </select>
                      <button type="button" onClick={() => setEntegrasyonTestModu(prev => !prev)} style={{ ...styles.btnOrange, backgroundColor: entegrasyonTestModu ? '#1d4ed8' : '#64748b' }}>
                        {entegrasyonTestModu ? 'Test Modunu Kapat' : 'Test Modunu Aç'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {[
                      { key: 'yeni', label: `Yeni (${yeniOnlineSiparisSayisi})` },
                      { key: 'aktarilan', label: `Aktarılan (${aktarilanOnlineSiparisSayisi})` },
                      { key: 'tum', label: `Tümü (${aktifRestoranOnlineSiparisleri.length})` },
                      { key: 'iptal', label: 'İptal / Yok Sayıldı' },
                    ].map(sekme => (
                      <button key={sekme.key} type="button" onClick={() => setPaketOnlineSekmesi(sekme.key)} style={{ border: paketOnlineSekmesi === sekme.key ? '1px solid #0f172a' : '1px solid #e2e8f0', backgroundColor: paketOnlineSekmesi === sekme.key ? '#0f172a' : '#fff', color: paketOnlineSekmesi === sekme.key ? '#fff' : '#334155', padding: '8px 10px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900', fontSize: '12px' }}>
                        {sekme.label}
                      </button>
                    ))}
                  </div>

                  {onlineSiparisMesaji && (
                    <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #bbf7d0', color: '#047857', padding: '9px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', marginBottom: '10px' }}>
                      {onlineSiparisMesaji}
                    </div>
                  )}

                  {filtreliOnlineSiparisler.length === 0 ? (
                    <div style={{ color: '#94a3b8', padding: '12px', backgroundColor: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                      Bu bölümde online sipariş yok. API bağlanınca siparişler otomatik burada görünecek.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                      {filtreliOnlineSiparisler.map(siparis => (
                        <div key={siparis.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                              <span style={{ ...platformRenkleri(siparis.platform), display: 'inline-block', border: '1px solid', borderRadius: '999px', padding: '4px 8px', fontSize: '11px', fontWeight: '900', marginBottom: '6px' }}>{siparis.platform || 'Online'}</span>
                              <div style={{ fontWeight: '900', color: '#1e293b' }}>#{siparis.platformOrderId || siparis.id}</div>
                              <div style={{ color: '#64748b', fontSize: '12px' }}>{new Date(siparis.createdAt || Date.now()).toLocaleString('tr-TR')}</div>
                            </div>
                            <span style={{ ...onlineSiparisDurumRengi(siparis.durum), border: '1px solid', borderRadius: '999px', padding: '5px 8px', fontSize: '11px', fontWeight: '900', whiteSpace: 'nowrap' }}>{siparis.durum || 'Yeni'}</span>
                          </div>
                          <div style={{ color: '#334155', fontSize: '13px', lineHeight: 1.5 }}>
                            <strong>{siparis.musteriAdi || 'Online Müşteri'}</strong><br />
                            {siparis.telefon ? <>☎️ {siparis.telefon}<br /></> : null}
                            {siparis.adres ? <>📍 {siparis.adres}<br /></> : null}
                            {siparis.notMetni ? <>📝 {siparis.notMetni}</> : null}
                          </div>
                          <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {(siparis.urunler || []).map((u, idx) => (
                              <span key={idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '999px', padding: '6px 9px', fontSize: '12px', fontWeight: '800' }}>{u.adet}x {u.ad} / {u.fiyat} TL</span>
                            ))}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                            <div>
                              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>{siparis.odemeTipi || 'Ödeme bilgisi yok'}</div>
                              <div style={{ fontSize: '18px', color: '#0f172a', fontWeight: '950' }}>{Number(siparis.toplam || 0)} TL</div>
                            </div>
                            {String(siparis.durum || 'Yeni') === 'Yeni' ? (
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => onlineSiparisKabulEt(siparis)} style={{ ...styles.btnOrange, backgroundColor: '#2563eb', padding: '8px 10px', fontSize: '12px' }}>Kabul Et</button>
                                <button type="button" onClick={() => onlineSiparisiPaketServiseAktar(siparis)} style={{ ...styles.btnOrange, backgroundColor: '#10b981', padding: '8px 10px', fontSize: '12px' }}>Paket Servise Aktar</button>
                                <button type="button" onClick={() => onlineSiparisReddet(siparis)} style={{ ...styles.btnOrange, backgroundColor: '#ef4444', padding: '8px 10px', fontSize: '12px' }}>Reddet</button>
                              </div>
                            ) : (
                              <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '900' }}>{siparis.paketSiparisId ? `Paket ID: ${siparis.paketSiparisId}` : 'İşlem tamamlandı'}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

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
                          flex: isMobile ? '1 1 100%' : '1 1 180px',
                          minWidth: isMobile ? '100%' : '180px',
                          backgroundColor: '#fff',
                        }}
                      />
                    </div>

                    <div
                      style={isMobile
                        ? { ...styles.yatayKaydirmaSekmeleri, gap: '7px', paddingBottom: '2px', paddingRight: '2px' }
                        : {
                          display: 'flex',
                          gap: '7px',
                          flexWrap: 'wrap',
                          maxHeight: '96px',
                          overflowY: 'auto',
                          paddingBottom: '2px',
                          paddingRight: '2px',
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
                              setPaketSeciliHazirNotId('');
                              setPaketSeciliUrunNotu('');
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
                              flex: '0 0 auto',
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
                              {urunGosterimResmi(u) && (
                                <img
                                  src={urunGosterimResmi(u)}
                                  alt={u.ad}
                                  onError={e => { e.currentTarget.style.display = 'none'; }}
                                  style={{ width: '100%', height: '76px', objectFit: 'cover', borderRadius: '10px', marginBottom: '7px', backgroundColor: '#f1f5f9' }}
                                />
                              )}

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

                      {paketSeciliMenuUrunu && Array.isArray(paketSeciliMenuUrunu.menuNotlari) && paketSeciliMenuUrunu.menuNotlari.length > 0 && (
                        <select
                          value={paketSeciliHazirNotId}
                          onChange={e => {
                            setPaketSeciliHazirNotId(e.target.value);
                            setPaketSeciliUrunNotu('');
                          }}
                          style={{ ...styles.input, flex: '1 1 220px', minWidth: '220px' }}
                        >
                          <option value="">Standart / seçenek yok</option>
                          {paketSeciliMenuUrunu.menuNotlari.map(n => (
                            <option key={n.id} value={String(n.id)}>
                              {n.ad} {Number(n.fiyat || 0) > 0 ? `(+${n.fiyat} TL)` : ''}
                            </option>
                          ))}
                        </select>
                      )}

                      <input
                        type="text"
                        placeholder="Manuel ürün notu (örn: acısız, bol sos)"
                        value={paketSeciliUrunNotu}
                        onChange={e => {
                          setPaketSeciliUrunNotu(e.target.value);
                          setPaketSeciliHazirNotId('');
                        }}
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
                      <div style={{ marginTop: '10px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px' }}>
                        <div style={{ fontSize: '12px', color: '#475569', fontWeight: '900', marginBottom: '8px' }}>Paket Toplam İndirimi</div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="% indirim"
                            value={paketToplamIndirimYuzde}
                            onChange={e => setPaketToplamIndirimYuzde(e.target.value)}
                            style={{ ...styles.input, minWidth: 0 }}
                          />
                          <input
                            type="number"
                            min="0"
                            placeholder="TL indirim"
                            value={paketToplamIndirimTutari}
                            onChange={e => setPaketToplamIndirimTutari(e.target.value)}
                            style={{ ...styles.input, minWidth: 0 }}
                          />
                        </div>

                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b', fontWeight: '800', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span>Ara toplam: {paketIndirimOzeti.brutToplam} TL</span>
                          <span>İndirim: -{paketIndirimOzeti.toplamIndirim} TL</span>
                        </div>
                      </div>

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
                            {(p.kaynakPlatform || String(p.notMetni || '').includes('Sipariş No:')) && (
                              <div style={{ marginTop: '5px' }}>
                                <span style={{ ...platformRenkleri(p.kaynakPlatform || 'Online'), display: 'inline-block', border: '1px solid', borderRadius: '999px', padding: '4px 8px', fontSize: '11px', fontWeight: '900' }}>
                                  🌐 {p.kaynakPlatform || 'Online Sipariş'} {p.platformOrderId ? `#${p.platformOrderId}` : ''}
                                </span>
                              </div>
                            )}
                            {p.notMetni && <div style={{ color: '#ff6b35', fontSize: '12px', marginTop: '4px' }}>Not: {p.notMetni}</div>}
                            {p.kuryeAdi && <div style={{ color: '#2563eb', fontSize: '12px', marginTop: '4px', fontWeight: '800' }}>Kurye: {p.kuryeAdi}</div>}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#ff6b35', fontWeight: '900' }}>{p.tutar} TL</div>
                            <div style={{ color: '#7c3aed', fontSize: '11px', fontWeight: '900', marginTop: '3px' }}>KDV: {siparislerKdvOzetiHesapla(p.urunler || [], p.tutar || 0).kdvToplam} TL</div>
                            {Number(p.indirimTutari || 0) > 0 || Number(p.indirimYuzde || 0) > 0 ? (
                              <div style={{ color: '#10b981', fontSize: '11px', fontWeight: '900', marginTop: '3px' }}>
                                İndirim: {Number(p.indirimYuzde || 0) > 0 ? `%${p.indirimYuzde}` : ''} {Number(p.indirimTutari || 0) > 0 ? `+ ${p.indirimTutari} TL` : ''}
                              </div>
                            ) : null}
                            {p.brutTutar && Number(p.brutTutar || 0) > Number(p.tutar || 0) ? (
                              <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '800' }}>Ara toplam: {p.brutTutar} TL</div>
                            ) : null}
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

            {/* entegrasyonlar ekranını gösteren kod */}
            {activeTab === 'entegrasyonlar' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>🔌 Entegrasyonlar</h2>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px' }}>
                  Trendyol, Getir ve Migros gibi platformların API bilgilerini burada yönetin. Siparişler Paket Servis ekranındaki Online Siparişler havuzuna düşer.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
                  {platformOzetleri.map(o => (
                    <div key={o.platform} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '12px' }}>
                      <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '800' }}>{o.platform}</div>
                      <div style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a' }}>{o.adet}</div>
                      <div style={{ color: '#94a3b8', fontSize: '12px' }}>Yeni: {o.yeni} / Ciro: {o.toplam.toLocaleString('tr-TR')} TL</div>
                    </div>
                  ))}
                  <div style={{ backgroundColor: gecikenOnlineSiparisSayisi > 0 ? '#fef2f2' : '#ecfdf5', border: gecikenOnlineSiparisSayisi > 0 ? '1px solid #fecaca' : '1px solid #a7f3d0', borderRadius: '16px', padding: '12px' }}>
                    <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '800' }}>Geciken Sipariş</div>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: gecikenOnlineSiparisSayisi > 0 ? '#b91c1c' : '#047857' }}>{gecikenOnlineSiparisSayisi}</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>15 dk üstü açık sipariş</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ ...styles.panelCard, backgroundColor: '#f8fafc', margin: 0, border: '1px solid #e2e8f0' }}>
                    <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '16px' }}>Platformlar</h3>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {entegrasyonPlatformSecenekleri.map(platform => {
                        const kayit = aktifRestoranPlatformBaglantilari.find(b => b.platform === platform);
                        return (
                          <button key={platform} type="button" onClick={() => entegrasyonPlatformuSec(platform)} style={{ textAlign: 'left', border: aktifEntegrasyonPlatformu === platform ? '1px solid #ff6b35' : '1px solid #e2e8f0', backgroundColor: aktifEntegrasyonPlatformu === platform ? '#fff7ed' : '#fff', color: '#0f172a', borderRadius: '12px', padding: '12px', cursor: 'pointer', fontWeight: '900' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}><span>{platform}</span><span>{kayit?.aktif !== false && kayit ? '✅' : '⚙️'}</span></div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: '800' }}>{kayit ? `Satıcı ID: ${kayit.saticiId || '-'}` : 'Bağlantı yok'}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ ...styles.panelCard, backgroundColor: '#fff', margin: 0, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px' }}>{aktifEntegrasyonPlatformu} Bağlantısı</h3>
                        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>API Key / Secret bilgileri App.jsx içine gömülmez; kullanıcı panelden girer. Canlı çekim için backend fonksiyonu kullanılır.</div>
                      </div>
                      <span style={{ ...platformRenkleri(aktifEntegrasyonPlatformu), display: 'inline-block', border: '1px solid', borderRadius: '999px', padding: '6px 10px', fontSize: '12px', fontWeight: '900' }}>{aktifPlatformBaglantisi?.aktif !== false && aktifPlatformBaglantisi ? 'Aktif Bağlantı' : 'Kurulum Bekliyor'}</span>
                    </div>
                    <div style={{ backgroundColor: entegrasyonTestModu ? '#eff6ff' : '#fff7ed', border: entegrasyonTestModu ? '1px solid #bfdbfe' : '1px solid #fed7aa', borderRadius: '14px', padding: '12px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#1e293b' }}>🧪 Test Modu {entegrasyonTestModu ? 'Açık' : 'Kapalı'}</strong>
                          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', lineHeight: 1.5 }}>{platformApiUyarisiMetni(aktifEntegrasyonPlatformu, aktifPlatformBaglantisi)}</div>
                        </div>
                        <button type="button" onClick={() => setEntegrasyonTestModu(prev => !prev)} style={{ ...styles.btnOrange, backgroundColor: entegrasyonTestModu ? '#2563eb' : '#64748b' }}>
                          {entegrasyonTestModu ? 'Test Modu Açık' : 'Test Modu Kapalı'}
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                        <select value={entegrasyonTestSenaryosu} onChange={e => setEntegrasyonTestSenaryosu(e.target.value)} style={{ ...styles.input, width: '100%' }}>
                          {onlineTestSenaryolari.map(senaryo => (<option key={senaryo.key} value={senaryo.key}>{senaryo.label} - {senaryo.aciklama}</option>))}
                        </select>
                        <button type="button" onClick={() => onlineTestSenaryoOlustur(aktifEntegrasyonPlatformu, entegrasyonTestSenaryosu)} style={{ ...styles.btnOrange, backgroundColor: '#10b981' }}>Seçili Senaryoyu Oluştur</button>
                      </div>
                    </div>
                    <form onSubmit={platformBaglantisiKaydet} style={{ display: 'grid', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                        <label style={{ fontSize: '12px', color: '#475569', fontWeight: '900' }}>Platform
                          <select value={entegrasyonFormu.platform} onChange={e => entegrasyonPlatformuSec(e.target.value)} style={{ ...styles.input, width: '100%', marginTop: '5px' }}>
                            {entegrasyonPlatformSecenekleri.map(platform => (<option key={platform} value={platform}>{platform}</option>))}
                          </select>
                        </label>
                        <label style={{ fontSize: '12px', color: '#475569', fontWeight: '900' }}>Satıcı ID / Cari ID
                          <input type="text" value={entegrasyonFormu.saticiId} onChange={e => entegrasyonFormuGuncelle('saticiId', e.target.value)} placeholder="Trendyol Satıcı ID / Cari ID" style={{ ...styles.input, width: '100%', marginTop: '5px' }} />
                        </label>
                      </div>
                      <label style={{ fontSize: '12px', color: '#475569', fontWeight: '900' }}>Entegrasyon Referans Kodu
                        <input type="text" value={entegrasyonFormu.entegrasyonReferansKodu} onChange={e => entegrasyonFormuGuncelle('entegrasyonReferansKodu', e.target.value)} placeholder="Panelde görünen entegrasyon referans kodu" style={{ ...styles.input, width: '100%', marginTop: '5px' }} />
                      </label>
                      <label style={{ fontSize: '12px', color: '#475569', fontWeight: '900' }}>Hesap Türü
                        <select value={entegrasyonFormu.hesapTuru || 'Yemek'} onChange={e => entegrasyonFormuGuncelle('hesapTuru', e.target.value)} style={{ ...styles.input, width: '100%', marginTop: '5px' }}>
                          <option value="Yemek">Yemek / restoran sipariş hesabı</option>
                          <option value="Pazaryeri">Pazaryeri / satış mağazası</option>
                          <option value="Market">Market / hızlı market hesabı</option>
                          <option value="Bilinmiyor">Emin değilim</option>
                        </select>
                      </label>
                      {entegrasyonFormu.hesapTuru === 'Pazaryeri' && (
                        <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', padding: '10px', borderRadius: '12px', fontSize: '12px', fontWeight: '900', lineHeight: 1.5 }}>
                          Bu hesap satış mağazası / pazaryeri hesabı olarak işaretlendi. Trendyol Yemek gibi restoran siparişleri bu API'den dönmeyebilir; yine de test modu ile POS akışını deneyebilirsiniz.
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                        <label style={{ fontSize: '12px', color: '#475569', fontWeight: '900' }}>API Key
                          <input type="password" value={entegrasyonFormu.apiKey} onChange={e => entegrasyonFormuGuncelle('apiKey', e.target.value)} placeholder="API Key" style={{ ...styles.input, width: '100%', marginTop: '5px' }} />
                        </label>
                        <label style={{ fontSize: '12px', color: '#475569', fontWeight: '900' }}>API Secret
                          <input type="password" value={entegrasyonFormu.apiSecret} onChange={e => entegrasyonFormuGuncelle('apiSecret', e.target.value)} placeholder="API Secret" style={{ ...styles.input, width: '100%', marginTop: '5px' }} />
                        </label>
                      </div>
                      <label style={{ fontSize: '12px', color: '#475569', fontWeight: '900' }}>Token
                        <input type="password" value={entegrasyonFormu.token} onChange={e => entegrasyonFormuGuncelle('token', e.target.value)} placeholder="Token varsa girin" style={{ ...styles.input, width: '100%', marginTop: '5px' }} />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', fontWeight: '900' }}>
                        <input type="checkbox" checked={entegrasyonFormu.aktif !== false} onChange={e => entegrasyonFormuGuncelle('aktif', e.target.checked)} />
                        Bu platformdan sipariş çekme aktif olsun
                      </label>
                      <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', lineHeight: 1.5 }}>Güvenlik notu: Gerçek canlı kullanımda API anahtarları Supabase Edge Function / Vercel API tarafında saklanmalı ve React tarafında doğrudan platform API çağrısı yapılmamalı. Bu ekran POS içi bağlantı yönetimi ve backend adaptörüne hazırlık için eklendi.</div>
                      {entegrasyonMesaji && (<div style={{ backgroundColor: '#ecfdf5', border: '1px solid #bbf7d0', color: '#047857', padding: '10px', borderRadius: '12px', fontSize: '12px', fontWeight: '900' }}>{entegrasyonMesaji}</div>)}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button type="submit" style={styles.btnOrange}>Bağlantıyı Kaydet</button>
                        <button type="button" onClick={() => onlineSiparisleriBackenddenCek(aktifEntegrasyonPlatformu)} disabled={onlineSiparisYukleniyor} style={{ ...styles.btnOrange, backgroundColor: onlineSiparisYukleniyor ? '#94a3b8' : '#2563eb' }}>{onlineSiparisYukleniyor ? 'Test Ediliyor...' : 'Sipariş Çekmeyi Test Et'}</button>
                        <button type="button" onClick={() => onlineTestSenaryoOlustur(aktifEntegrasyonPlatformu, entegrasyonTestSenaryosu)} style={{ ...styles.btnOrange, backgroundColor: '#10b981' }}>Test Siparişi Oluştur</button>
                        {aktifPlatformBaglantisi && (<button type="button" onClick={() => platformBaglantisiSil(aktifEntegrasyonPlatformu)} style={{ ...styles.btnOrange, backgroundColor: '#ef4444' }}>Bağlantıyı Sil</button>)}
                      </div>
                    </form>
                    <div style={{ marginTop: '16px' }}>
                      <h4 style={{ margin: '0 0 8px', color: '#1e293b' }}>Kayıtlı Bağlantılar</h4>
                      {aktifRestoranPlatformBaglantilari.length === 0 ? (
                        <div style={{ color: '#94a3b8', padding: '12px', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>Bu restoran için kayıtlı platform bağlantısı yok.</div>
                      ) : (
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {aktifRestoranPlatformBaglantilari.map(baglanti => (
                            <div key={baglanti.id || baglanti.platform} style={{ ...styles.dataRow, alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <span style={{ ...platformRenkleri(baglanti.platform), display: 'inline-block', border: '1px solid', borderRadius: '999px', padding: '5px 9px', fontSize: '12px', fontWeight: '900' }}>{baglanti.platform}</span>
                              <div style={{ flex: 1 }}><strong>{baglanti.saticiId || '-'}</strong><div style={{ color: '#64748b', fontSize: '12px' }}>Hesap: {baglanti.hesapTuru || 'Yemek'} / API Key: {baglanti.apiKey ? '••••••••' : 'Yok'} / Token: {baglanti.token ? '••••••••' : 'Yok'}</div></div>
                              <span style={baglanti.aktif !== false ? styles.badgeActive : styles.badgePending}>{baglanti.aktif !== false ? 'Aktif' : 'Pasif'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
                      <details style={{ width: '100%', marginTop: '8px', backgroundColor: '#f8fafc', borderRadius: '12px', padding: '10px' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: '900', color: '#1e293b' }}>Ekstre / Hareket Geçmişi</summary>
                        {Array.isArray(cari.hareketler) && cari.hareketler.length > 0 ? (
                          <div style={{ display: 'grid', gap: '6px', marginTop: '10px' }}>
                            {cari.hareketler.slice(0, 20).map(h => (
                              <div key={h.id || `${h.tarih}-${h.tutar}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', fontSize: '12px' }}>
                                <span>{String(h.tarih || '').slice(0, 16).replace('T', ' ')} — {h.tip} — {h.aciklama}</span>
                                <strong style={{ color: h.tip === 'Borç' ? '#ef4444' : '#10b981' }}>{h.tutar} TL</strong>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: '#94a3b8', marginTop: '8px', fontSize: '12px' }}>Bu caride henüz hareket yok.</div>
                        )}
                      </details>
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
                  Stok takibi açık ürünlerde satış ve paket sipariş sonrası stok otomatik düşer. Reçete tanımlarsanız satışta hammaddeler de düşer ve maliyet/kâr raporu daha doğru hesaplanır.
                </p>

                <div style={{ ...styles.panelCard, backgroundColor: '#fff7ed', border: '1px solid #fed7aa', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '17px', color: '#1e293b', margin: '0 0 6px' }}>🧾 Reçete / Hammadde / Alış işlemleri taşındı</h3>
                  <p style={{ color: '#64748b', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
                    Hammadde ekleme, alış fişi, depo sayımı ve eksik malzeme siparişi artık sol menüdeki <strong>Reçeteler</strong> sekmesinden yönetilir. Bu ekranda sadece satış ürünlerinin stok takibi kalır.
                  </p>
                  <button type="button" onClick={() => setActiveTab('receteler')} style={{ ...styles.btnOrange, marginTop: '10px' }}>Reçeteler Sekmesini Aç</button>
                </div>


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

            {/* depo sayımı ve eksik malzeme siparişi Reçeteler sekmesine taşındı. */}

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
                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>Cari Satış</div>
                    <div style={styles.statsValue}>{bugunkuCariSatis} TL</div>
                  </div>
                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>Paket / Hızlı Satış</div>
                    <div style={styles.statsValue}>{bugunkuPaketSatis} TL / {bugunkuHizliSatis} TL</div>
                  </div>
                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>İndirim / KDV</div>
                    <div style={styles.statsValue}>{bugunkuIndirimToplami} TL / {bugunkuKdvToplami} TL</div>
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
                    <div style={isMobile ? { ...styles.yatayKaydirmaSekmeleri, marginBottom: '12px' } : { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
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
                            flex: '0 0 auto',
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

                    <div style={isMobile ? styles.mesaGridMobile : styles.mesaGrid}>
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
                          {urunGosterimResmi(urun) && (
                            <img
                              src={urunGosterimResmi(urun)}
                              alt={urun.ad}
                              onError={e => { e.currentTarget.style.display = 'none'; }}
                              style={{ width: '100%', height: '82px', objectFit: 'cover', borderRadius: '10px', marginBottom: '8px', backgroundColor: '#f1f5f9' }}
                            />
                          )}
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

                            {u.fiyatDegistirildi && (
                              <div style={{ fontSize: '11px', color: '#0f766e', fontWeight: '900', marginTop: '4px' }}>
                                Satış fiyatı değiştirildi: {u.fiyat} TL / adet
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <strong>{Number(u.fiyat || 0) * Number(u.adet || 1)} TL</strong>
                            {!u.ikram && Number(u.fiyat || 0) > 0 && (
                              <button type="button" onClick={() => hizliSatisBirUrunIkramEt(index)} style={{ ...styles.deleteItemBtn, color: '#f59e0b', fontWeight: '900' }}>🎁</button>
                            )}
                            {!u.ikram && (
                              <button type="button" onClick={() => hizliSatisUrunFiyatiDegistir(index)} style={{ ...styles.deleteItemBtn, color: '#0f766e', fontWeight: '900' }}>💸</button>
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

                    {hizliSatisUrunler.length > 0 && (
                      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 10px', fontSize: '12px', color: '#475569', fontWeight: '900', marginTop: '8px' }}>
                        KDV Matrahı: {hizliSatisKdvOzeti.matrahToplam} TL / KDV: {hizliSatisKdvOzeti.kdvToplam} TL
                      </div>
                    )}

                    <div style={{ marginTop: '10px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px' }}>
                      <div style={{ fontWeight: '900', color: '#1e293b', marginBottom: '8px' }}>Cari / Veresiye</div>
                      <input
                        type="text"
                        placeholder="Cari müşteri ara..."
                        value={hizliSatisCariArama}
                        onChange={e => {
                          setHizliSatisCariArama(e.target.value);
                          setHizliSatisCariMusteriId('');
                        }}
                        style={{ ...styles.input, width: '100%', minWidth: '100%', boxSizing: 'border-box' }}
                      />

                      {hizliSatisCariArama && !hizliSatisCariMusteriId && (
                        <div style={{ marginTop: '6px', display: 'grid', gap: '6px', maxHeight: '170px', overflowY: 'auto' }}>
                          {filtreliHizliSatisCariMusterileri.length === 0 ? (
                            <div style={{ color: '#94a3b8', fontSize: '12px' }}>Cari müşteri bulunamadı.</div>
                          ) : (
                            filtreliHizliSatisCariMusterileri.map(cari => (
                              <button
                                key={cari.id}
                                type="button"
                                onClick={() => hizliSatisCariMusterisiSec(cari.id)}
                                style={{ border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#f8fafc', padding: '8px 10px', textAlign: 'left', cursor: 'pointer' }}
                              >
                                <strong>{cari.ad}</strong>
                                {cari.telefon ? <span style={{ color: '#64748b' }}> • {cari.telefon}</span> : null}
                                <span style={{ color: '#ef4444', fontWeight: '900', float: 'right' }}>{Number(cari.bakiye || 0)} TL</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <input
                      type="number"
                      placeholder={`${hizliSatisToplam} TL alındı`}
                      value={hizliSatisAlinanTutar}
                      onChange={e => setHizliSatisAlinanTutar(e.target.value)}
                      style={{ ...styles.input, width: '100%', minWidth: '100%', boxSizing: 'border-box', marginTop: '8px' }}
                    />

                    {Math.max(sayiyaCevir(hizliSatisAlinanTutar || hizliSatisToplam) - hizliSatisToplam, 0) > 0 && (
                      <div style={{ color: '#10b981', fontWeight: '900', fontSize: '13px', marginTop: '8px' }}>
                        Para üstü: {Math.max(sayiyaCevir(hizliSatisAlinanTutar || hizliSatisToplam) - hizliSatisToplam, 0)} TL
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={hizliSatisAdisyonYazdir}
                        style={{ ...styles.checkoutBtn, backgroundColor: '#0f766e', marginTop: 0 }}
                      >
                        🧾 Adisyon
                      </button>

                      <button type="button" onClick={() => hizliSatisKapat('Nakit')} style={{ ...styles.checkoutBtn, marginTop: 0 }}>
                        💵 Nakit Al
                      </button>

                      <button type="button" onClick={() => hizliSatisKapat('Kredi Kartı')} style={{ ...styles.checkoutBtn, backgroundColor: '#2563eb', marginTop: 0 }}>
                        💳 Kredi Kartı
                      </button>

                      <button type="button" onClick={() => hizliSatisKapat('Cari')} style={{ ...styles.checkoutBtn, backgroundColor: '#7c3aed', marginTop: 0 }}>
                        📒 Cariye Yaz
                      </button>
                    </div>
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
                  <input type="number" placeholder="Kapora TL" value={rezervasyonKaporaTutari} onChange={e => setRezervasyonKaporaTutari(e.target.value)} style={{ ...styles.input, width: '120px', minWidth: '120px' }} />
                  <label style={{ ...styles.input, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', color: '#475569' }}><input type="checkbox" checked={rezervasyonHatirlatma} onChange={e => setRezervasyonHatirlatma(e.target.checked)} />WhatsApp hatırlatma</label>
                  <button type="submit" style={styles.btnOrange}>Rezervasyon Ekle</button>
                </form>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '10px', margin: '14px 0' }}>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px' }}><div style={{ color: '#64748b', fontSize: '12px', fontWeight: '800' }}>Bugünkü Rezervasyon</div><strong style={{ fontSize: '22px' }}>{bugunkuRezervasyonlar.length}</strong></div>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px' }}><div style={{ color: '#64748b', fontSize: '12px', fontWeight: '800' }}>Bekleyen</div><strong style={{ fontSize: '22px' }}>{rezervasyonlar.filter(r => r.durum === 'Bekliyor').length}</strong></div>
                  <button type="button" onClick={() => setRezervasyonTakvimGorunumu(rezervasyonTakvimGorunumu === 'liste' ? 'takvim' : 'liste')} style={{ ...styles.btnOrange, background: '#1e293b' }}>{rezervasyonTakvimGorunumu === 'liste' ? 'Takvim Görünümü' : 'Liste Görünümü'}</button>
                  <button type="button" onClick={() => whatsappMesajiAc(rezervasyonTelefon, `${restaurantName || user?.restaurant || 'Integra POS'} rezervasyon hatırlatma: ${rezervasyonTarihSaat || 'Rezervasyon saatiniz'} için sizi bekliyoruz.`)} style={{ ...styles.btnOrange, background: '#22c55e' }}>WhatsApp Hatırlat</button>
                </div>

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
                        <option>Gelmedi</option>
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

                <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px', color: '#0f172a', fontSize: '16px' }}>📱 QR Menü / Satış Durumu</h3>
                      <p style={{ color: '#475569', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
                        Ürünü satıştan kaldırırsan QR menüden de otomatik gizlenir. Sadece QR'da gizlemek istersen “QR Kapalı” yap.
                      </p>
                    </div>
                    <button type="button" onClick={() => setActiveTab('qr_menu')} style={{ ...styles.btnOrange, backgroundColor: '#2563eb' }}>QR Menü Önizle</button>
                  </div>

                  {aktifMenu.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '800' }}>Ürün ekledikten sonra QR/satış durumları burada görünür.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                      {aktifMenu.map(u => (
                        <div key={`qr-durum-${u.id}`} style={{ backgroundColor: '#fff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '9px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr auto auto auto', gap: '8px', alignItems: 'center' }}>
                          <div>
                            <strong style={{ color: '#0f172a' }}>{u.ad}</strong>
                            <div style={{ color: '#64748b', fontSize: '11px' }}>{u.menuGrubu || u.kategori || 'Genel'} / {u.fiyat} TL</div>
                          </div>
                          <span style={{ backgroundColor: urunSatistaAktifMi(u) ? '#dcfce7' : '#fee2e2', color: urunSatistaAktifMi(u) ? '#15803d' : '#991b1b', padding: '7px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '900', textAlign: 'center' }}>{urunSatistaAktifMi(u) ? 'Satışta' : 'Satıştan kalktı'}</span>
                          <button type="button" onClick={() => urunSatisDurumunuAyarla(u, !urunSatistaAktifMi(u))} style={{ border: 'none', backgroundColor: urunSatistaAktifMi(u) ? '#fee2e2' : '#dcfce7', color: urunSatistaAktifMi(u) ? '#991b1b' : '#15803d', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', fontWeight: '900', fontSize: '12px' }}>{urunSatistaAktifMi(u) ? 'Satıştan Kaldır' : 'Satışa Al'}</button>
                          <button type="button" disabled={!urunSatistaAktifMi(u)} onClick={() => urunQrMenuDurumunuAyarla(u, !urunQrMenudeGorunurMu(u))} style={{ border: 'none', backgroundColor: urunQrMenudeGorunurMu(u) ? '#dbeafe' : '#f1f5f9', color: urunQrMenudeGorunurMu(u) ? '#1d4ed8' : '#475569', borderRadius: '8px', padding: '8px 10px', cursor: urunSatistaAktifMi(u) ? 'pointer' : 'not-allowed', fontWeight: '900', fontSize: '12px', opacity: urunSatistaAktifMi(u) ? 1 : 0.6 }}>{urunQrMenudeGorunurMu(u) ? 'QR Kapalı Yap' : 'QR Aç'}</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* firma bilgisi ve adisyon/mutfak yazıcı ayarlarını yöneten kod */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '14px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                      flexWrap: 'wrap',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '900', color: '#1e293b', fontSize: '15px' }}>
                        🖨️ Fiş Dizaynı ve Yazıcı Ayarları
                      </div>
                      <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', fontWeight: '700', lineHeight: 1.5 }}>
                        Firma adı fişin üstünde görünür. Adisyon, mutfak ve bar/içecek için ayrı yazıcı adı veya numarası tanımlayabilirsiniz.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={fisAyarlariKaydet}
                      disabled={fisAyarlariKaydediliyor}
                      style={{
                        border: 'none',
                        backgroundColor: fisAyarlariKaydediliyor ? '#94a3b8' : '#10b981',
                        color: '#fff',
                        padding: '10px 13px',
                        borderRadius: '10px',
                        cursor: fisAyarlariKaydediliyor ? 'not-allowed' : 'pointer',
                        fontWeight: '900',
                        fontSize: '12px',
                      }}
                    >
                      {fisAyarlariKaydediliyor ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(220px, 1fr))',
                      gap: '10px',
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Fişte görünecek firma adı"
                      value={fisAyarlari.firmaAdi}
                      onChange={e => fisAyariGuncelle('firmaAdi', e.target.value)}
                      style={styles.input}
                    />

                    <input
                      type="text"
                      placeholder="Telefon"
                      value={fisAyarlari.firmaTelefon}
                      onChange={e => fisAyariGuncelle('firmaTelefon', e.target.value)}
                      style={styles.input}
                    />

                    <input
                      type="text"
                      placeholder="Adres"
                      value={fisAyarlari.firmaAdres}
                      onChange={e => fisAyariGuncelle('firmaAdres', e.target.value)}
                      style={styles.input}
                    />

                    <input
                      type="text"
                      placeholder="Vergi bilgisi / belge notu"
                      value={fisAyarlari.vergiBilgisi}
                      onChange={e => fisAyariGuncelle('vergiBilgisi', e.target.value)}
                      style={styles.input}
                    />

                    <input
                      type="text"
                      placeholder="Fiş alt notu"
                      value={fisAyarlari.fisAltNotu}
                      onChange={e => fisAyariGuncelle('fisAltNotu', e.target.value)}
                      style={styles.input}
                    />

                    <select
                      value={fisYazdirmaModu}
                      onChange={e => setFisYazdirmaModu(e.target.value)}
                      style={{ ...styles.input, fontWeight: '800' }}
                    >
                      <option value="sor">Adisyon: ödeme sonrası sor</option>
                      <option value="yazdir">Adisyon: otomatik yazdır</option>
                      <option value="yazdirma">Adisyon: yazdırma</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Adisyon yazıcı adı"
                      value={fisAyarlari.adisyonYaziciAdi}
                      onChange={e => fisAyariGuncelle('adisyonYaziciAdi', e.target.value)}
                      style={styles.input}
                    />

                    <input
                      type="text"
                      placeholder="Adisyon yazıcı no / Windows adı"
                      value={fisAyarlari.adisyonYaziciNo}
                      onChange={e => fisAyariGuncelle('adisyonYaziciNo', e.target.value)}
                      style={styles.input}
                    />

                    <input
                      type="text"
                      placeholder="Mutfak yazıcı adı"
                      value={fisAyarlari.mutfakYaziciAdi}
                      onChange={e => fisAyariGuncelle('mutfakYaziciAdi', e.target.value)}
                      style={styles.input}
                    />

                    <input
                      type="text"
                      placeholder="Mutfak yazıcı no / Windows adı"
                      value={fisAyarlari.mutfakYaziciNo}
                      onChange={e => fisAyariGuncelle('mutfakYaziciNo', e.target.value)}
                      style={styles.input}
                    />

                    <input
                      type="text"
                      placeholder="Bar / içecek yazıcı adı"
                      value={fisAyarlari.barYaziciAdi}
                      onChange={e => fisAyariGuncelle('barYaziciAdi', e.target.value)}
                      style={styles.input}
                    />

                    <input
                      type="text"
                      placeholder="Bar / içecek yazıcı no / Windows adı"
                      value={fisAyarlari.barYaziciNo}
                      onChange={e => fisAyariGuncelle('barYaziciNo', e.target.value)}
                      style={styles.input}
                    />

                    <select
                      value={fisAyarlari.mutfakFisYazdirmaModu}
                      onChange={e => fisAyariGuncelle('mutfakFisYazdirmaModu', e.target.value)}
                      style={{ ...styles.input, fontWeight: '800' }}
                    >
                      <option value="sor">Mutfak: siparişte sor</option>
                      <option value="yazdir">Mutfak: otomatik fiş yazdır</option>
                      <option value="yazdirma">Mutfak: sadece ekranda göster</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => fisYazdir({ ad: 'Test Adisyon', tutar: 100, musteriAdi: 'Test Müşteri', siparisler: [{ ad: 'Test Ürün', fiyat: 100, adet: 1, not: 'Az pişmiş' }] }, [{ tip: 'Nakit', tutar: 100 }])}
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
                      Test Adisyon Fişi
                    </button>

                    <button
                      type="button"
                      onClick={() => mutfakFisiYazdir([
                        { masaAdi: 'Test Masa', urunAdi: 'Test Ana Yemek', adet: 1, notMetni: 'Soğansız', departman: 'Mutfak', garsonAdi: user?.waiterName || user?.restaurant || 'Test' },
                        { masaAdi: 'Test Masa', urunAdi: 'Test İçecek', adet: 1, notMetni: 'Buzsuz', departman: 'Bar', garsonAdi: user?.waiterName || user?.restaurant || 'Test' },
                      ])}
                      style={{
                        border: 'none',
                        backgroundColor: '#10b981',
                        color: '#fff',
                        padding: '10px 13px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '900',
                        fontSize: '12px',
                      }}
                    >
                      Test Mutfak Fişi
                    </button>
                  <div
                    style={{
                      gridColumn: isMobile ? 'auto' : '1 / -1',
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                  >
                    <h4 style={{ margin: '0 0 10px', color: '#1e293b' }}>Kalıcı Yazıcı Kuralları</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(160px, 1fr))', gap: '10px' }}>
                      <input type="text" placeholder="Windows adisyon yazıcısı: adisyon" value={yaziciAyarlari.adisyonYaziciAdi} onChange={e => yaziciAyariGuncelle('adisyonYaziciAdi', e.target.value)} style={styles.input} />
                      <input type="text" placeholder="Windows mutfak yazıcısı: mutfak" value={yaziciAyarlari.mutfakYaziciAdi} onChange={e => yaziciAyariGuncelle('mutfakYaziciAdi', e.target.value)} style={styles.input} />
                      <input type="text" placeholder="Windows bar yazıcısı: bar" value={yaziciAyarlari.barYaziciAdi} onChange={e => yaziciAyariGuncelle('barYaziciAdi', e.target.value)} style={styles.input} />

                      {[
                        ['adisyonFisiAktif', 'Adisyon fişi'],
                        ['odemeFisiAktif', 'Ödeme fişi'],
                        ['mutfakFisiAktif', 'Mutfak/bar fişi'],
                        ['iptalFisiAktif', 'İptal fişi'],
                        ['paketFisiAktif', 'Paket fişi'],
                        ['zRaporuAktif', 'Z raporu'],
                      ].map(([alan, etiket]) => (
                        <label key={alan} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900', color: '#334155', fontSize: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px' }}>
                          <input type="checkbox" checked={yaziciAyarlari[alan] !== false} onChange={e => yaziciAyariGuncelle(alan, e.target.checked)} />
                          {etiket} aktif
                        </label>
                      ))}

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900', color: '#334155', fontSize: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px' }}>
                        <input type="checkbox" checked={yaziciAyarlari.barYoksaMutfagaGonder !== false} onChange={e => yaziciAyariGuncelle('barYoksaMutfagaGonder', e.target.checked)} />
                        Bar yoksa mutfağa gönder
                      </label>
                    </div>
                  </div>

                  <div
                    style={{
                      gridColumn: isMobile ? 'auto' : '1 / -1',
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ margin: 0, color: '#1e293b' }}>Fiş Şablonları</h4>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {varsayilanFisSablonlari().map(sablon => (
                          <button
                            key={sablon.fisTipi}
                            type="button"
                            onClick={() => setAktifFisSablonTipi(sablon.fisTipi)}
                            style={{
                              border: 'none',
                              backgroundColor: aktifFisSablonTipi === sablon.fisTipi ? '#ff6b35' : '#e2e8f0',
                              color: aktifFisSablonTipi === sablon.fisTipi ? '#fff' : '#334155',
                              padding: '8px 10px',
                              borderRadius: '999px',
                              cursor: 'pointer',
                              fontWeight: '900',
                              fontSize: '12px',
                            }}
                          >
                            {fisTipiEtiketi(sablon.fisTipi)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Fiş başlığı"
                      value={fisSablonuBul(aktifFisSablonTipi).baslik || ''}
                      onChange={e => fisSablonuGuncelle(aktifFisSablonTipi, 'baslik', e.target.value)}
                      style={{ ...styles.input, marginBottom: '8px' }}
                    />

                    <textarea
                      value={fisSablonuBul(aktifFisSablonTipi).sablonText || ''}
                      onChange={e => fisSablonuGuncelle(aktifFisSablonTipi, 'sablonText', e.target.value)}
                      style={{ ...styles.input, width: '100%', minHeight: '170px', resize: 'vertical', fontFamily: 'Consolas, monospace', fontSize: '12px', lineHeight: 1.5 }}
                    />

                    <div style={{ color: '#64748b', fontSize: '11px', marginTop: '8px', lineHeight: 1.6, fontWeight: '700' }}>
                      Kullanılabilir alanlar: {'{firma_adi}'}, {'{fis_baslik}'}, {'{masa_adi}'}, {'{garson_adi}'}, {'{tarih}'}, {'{urunler}'}, {'{toplam}'}, {'{kdv}'}, {'{indirim}'}, {'{alt_not}'}, {'{not}'}, {'{iptal_sebebi}'}.
                    </div>
                  </div>
                  </div>

                  <div style={{ color: '#64748b', fontSize: '11px', marginTop: '10px', lineHeight: 1.5, fontWeight: '700' }}>
                    Not: Windows tarafında yazıcı adları standart olarak adisyon, mutfak ve bar kalır. Bu ekrandaki kurallar ve şablonlar Supabase'de kalıcı saklanır; Printer Agent bekleyen kuyruğu basar.
                  </div>
                </div>

                {/* Printer Agent kurulum kodu ve indirme panelini gösteren kod */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '14px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                      flexWrap: 'wrap',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '900', color: '#1e293b', fontSize: '15px' }}>
                        🧩 Printer Agent Kurulumu
                      </div>
                      <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', fontWeight: '700', lineHeight: 1.5 }}>
                        Müşteri bilgisayarına kurulacak yazıcı programı için kurulum kodu üretin. Windows yazıcı adları standart: adisyon, mutfak, bar.
                      </div>
                    </div>

                    <a
                      href="/integra-printer-agent-kurulum.zip"
                      download
                      style={{
                        textDecoration: 'none',
                        backgroundColor: '#1e293b',
                        color: '#fff',
                        padding: '10px 13px',
                        borderRadius: '10px',
                        fontWeight: '900',
                        fontSize: '12px',
                      }}
                    >
                      ⬇️ Agent İndir
                    </a>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: '12px', alignItems: 'stretch' }}>
                    <div
                      style={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '12px',
                      }}
                    >
                      <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '900', marginBottom: '6px' }}>
                        Kurulum Kodu
                      </div>
                      <div
                        style={{
                          backgroundColor: '#0f172a',
                          color: '#fff',
                          borderRadius: '10px',
                          padding: '14px',
                          fontSize: isMobile ? '20px' : '24px',
                          fontWeight: '900',
                          letterSpacing: '1px',
                          wordBreak: 'break-word',
                          marginBottom: '10px',
                        }}
                      >
                        {printerAgentKurulumu?.kurulum_kodu || 'Kod hazır değil'}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => printerAgentKurulumKoduHazirla(false)}
                          disabled={printerAgentKurulumYukleniyor}
                          style={{
                            border: 'none',
                            backgroundColor: printerAgentKurulumYukleniyor ? '#94a3b8' : '#10b981',
                            color: '#fff',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            cursor: printerAgentKurulumYukleniyor ? 'not-allowed' : 'pointer',
                            fontWeight: '900',
                            fontSize: '12px',
                          }}
                        >
                          {printerAgentKurulumYukleniyor ? 'Hazırlanıyor...' : 'Kodu Hazırla'}
                        </button>

                        <button
                          type="button"
                          onClick={printerAgentKurulumKoduKopyala}
                          disabled={!printerAgentKurulumu?.kurulum_kodu}
                          style={{
                            border: 'none',
                            backgroundColor: printerAgentKurulumu?.kurulum_kodu ? '#ff6b35' : '#cbd5e1',
                            color: '#fff',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            cursor: printerAgentKurulumu?.kurulum_kodu ? 'pointer' : 'not-allowed',
                            fontWeight: '900',
                            fontSize: '12px',
                          }}
                        >
                          Kopyala
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Yeni kurulum kodu üretilecek. Eski kodla kurulan Agent tekrar kurulum isteyebilir. Devam edilsin mi?')) {
                              printerAgentKurulumKoduHazirla(true);
                            }
                          }}
                          disabled={printerAgentKurulumYukleniyor}
                          style={{
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#fff',
                            color: '#334155',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            cursor: printerAgentKurulumYukleniyor ? 'not-allowed' : 'pointer',
                            fontWeight: '900',
                            fontSize: '12px',
                          }}
                        >
                          Yeni Kod Üret
                        </button>
                      </div>

                      {printerAgentKurulumMesaji && (
                        <div style={{ color: '#059669', fontSize: '12px', fontWeight: '900', marginTop: '10px' }}>
                          {printerAgentKurulumMesaji}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '12px',
                        color: '#334155',
                        fontSize: '12px',
                        lineHeight: 1.6,
                        fontWeight: '700',
                      }}
                    >
                      <div style={{ fontWeight: '900', color: '#1e293b', marginBottom: '8px' }}>Müşteri Kurulum Adımları</div>
                      <div>1. ZIP dosyasını indir.</div>
                      <div>2. ZIP’i çıkar ve <strong>musteri-kurulum.bat</strong> dosyasını çalıştır.</div>
                      <div>3. Bu ekrandaki kurulum kodunu gir.</div>
                      <div>4. Test fişi bas ve programı Windows başlangıcına ekle.</div>
                      <div style={{ marginTop: '8px', color: '#64748b' }}>
                        Agent kuyruğu REST ile dinler; adisyon, mutfak, bar ve iptal fişleri otomatik basılır.
                      </div>
                    </div>
                  </div>
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
                    <option value="true">🖨️ Grup hazırlama fişi çıkarır</option>
                    <option value="false">🚫 Grup fiş çıkarmaz</option>
                  </select>

                  <button type="submit" style={styles.btnOrange}>
                    + Grup Ekle
                  </button>
                </form>

                {/* menü gruplarını sekme olarak gösteren kod */}
                <div style={isMobile ? { ...styles.yatayKaydirmaSekmeleri, marginBottom: '16px' } : { display: 'flex', gap: '8px', flexWrap: 'wrap', maxHeight: '112px', overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
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
                        flex: '0 0 auto',
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
                        <span> / KDV: <strong>%{aktifGrup.kdvOrani || 10}</strong></span><span> / Durum: <strong>{mutfakYaziciDurumEtiketi(aktifGrup)}</strong></span><span> / Hedef: <strong>{yaziciHedefEtiketi(yaziciHedefiBul(aktifGrup.departman || 'Mutfak', 'mutfak'))}</strong></span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <select
                          value={mutfakEkraniAktifMi(aktifGrup) ? 'true' : 'false'}
                          onChange={e => menuGrubuMutfakDurumunuAyarla(aktifGrup, e.target.value === 'true')}
                          style={{
                            border: '1px solid #cbd5e1',
                            backgroundColor: mutfakEkraniAktifMi(aktifGrup) ? '#dcfce7' : '#f1f5f9',
                            color: mutfakEkraniAktifMi(aktifGrup) ? '#15803d' : '#475569',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '800',
                            fontSize: '12px',
                            outline: 'none',
                          }}
                        >
                          <option value="true">👨‍🍳 Mutfak ekranında görünsün</option>
                          <option value="false">🚫 Mutfak ekranında görünmesin</option>
                        </select>

                        <select
                          value={fisYaziciAktifMi(aktifGrup) ? 'true' : 'false'}
                          onChange={e => menuGrubuYaziciDurumunuAyarla(aktifGrup, e.target.value === 'true')}
                          style={{
                            border: '1px solid #cbd5e1',
                            backgroundColor: fisYaziciAktifMi(aktifGrup) ? '#fee2e2' : '#f1f5f9',
                            color: fisYaziciAktifMi(aktifGrup) ? '#b91c1c' : '#475569',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '800',
                            fontSize: '12px',
                            outline: 'none',
                          }}
                        >
                          <option value="true">🖨️ Fiş yazıcı bassın</option>
                          <option value="false">🚫 Fiş yazıcı basmasın</option>
                        </select>

                        <select
                          value={yaziciDepartmaniniNormalizeEt(aktifGrup.departman || 'Mutfak')}
                          onChange={e => menuGrubuYaziciHedefiAyarla(aktifGrup, e.target.value)}
                          style={{
                            border: '1px solid #cbd5e1',
                            backgroundColor: yaziciDepartmaniniNormalizeEt(aktifGrup.departman || 'Mutfak') === 'Bar' ? '#dbeafe' : '#fff7ed',
                            color: '#334155',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '900',
                            fontSize: '12px',
                            outline: 'none',
                          }}
                        >
                          {yaziciDepartmaniSecenekleri.map(secenek => (
                            <option key={secenek.value} value={secenek.value}>{secenek.label}</option>
                          ))}
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 260px', flexWrap: 'wrap' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => urunResimDosyasiSec(e, setYeniUrunResimUrl)}
                      style={{ ...styles.input, minWidth: '220px', flex: '1 1 220px' }}
                    />

                    {yeniUrunResimUrl && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src={yeniUrunResimUrl} alt="Ürün ön izleme" style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                        <button type="button" onClick={() => setYeniUrunResimUrl('')} style={{ border: 'none', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', fontWeight: '900', fontSize: '12px' }}>
                          Resmi Kaldır
                        </button>
                      </div>
                    )}
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: '900', color: '#334155', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '9px 10px' }}>
                    <input type="checkbox" checked={yeniUrunSatistaAktif} onChange={e => { setYeniUrunSatistaAktif(e.target.checked); if (!e.target.checked) setYeniUrunQrMenudeGorunsun(false); }} />
                    Satışta aktif
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: '900', color: '#334155', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '9px 10px' }}>
                    <input type="checkbox" checked={yeniUrunQrMenudeGorunsun && yeniUrunSatistaAktif} disabled={!yeniUrunSatistaAktif} onChange={e => setYeniUrunQrMenudeGorunsun(e.target.checked)} />
                    QR menüde görünsün
                  </label>

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

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 260px', flexWrap: 'wrap' }}>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={e => urunResimDosyasiSec(e, setDuzenlenenUrunResimUrl)}
                              style={{ ...styles.input, minWidth: '220px', flex: 1 }}
                            />

                            {duzenlenenUrunResimUrl && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <img src={duzenlenenUrunResimUrl} alt="Ürün ön izleme" style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                                <button type="button" onClick={() => setDuzenlenenUrunResimUrl('')} style={{ border: 'none', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', fontWeight: '900', fontSize: '12px' }}>
                                  Resmi Kaldır
                                </button>
                              </div>
                            )}
                          </div>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: '900', color: '#334155', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '9px 10px' }}>
                            <input type="checkbox" checked={duzenlenenUrunSatistaAktif} onChange={e => { setDuzenlenenUrunSatistaAktif(e.target.checked); if (!e.target.checked) setDuzenlenenUrunQrMenudeGorunsun(false); }} />
                            Satışta aktif
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: '900', color: '#334155', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '9px 10px' }}>
                            <input type="checkbox" checked={duzenlenenUrunQrMenudeGorunsun && duzenlenenUrunSatistaAktif} disabled={!duzenlenenUrunSatistaAktif} onChange={e => setDuzenlenenUrunQrMenudeGorunsun(e.target.checked)} />
                            QR menüde görünsün
                          </label>

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
                          <div style={{ width: '62px', height: '62px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 62px', color: '#94a3b8', fontSize: '22px' }}>
                            {urunGosterimResmi(u) ? (
                              <img src={urunGosterimResmi(u)} alt={u.ad} onError={e => { e.currentTarget.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : '🍽️'}
                          </div>

                          <div style={{ flex: 1, minWidth: '220px' }}>
                            <div style={{ fontWeight: '900', color: '#1e293b' }}>{u.favori ? '⭐ ' : ''}{u.ad}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                              Grup: <strong>{u.menuGrubu || u.kategori || 'Genel'}</strong> / Departman: <strong>{u.departman || 'Mutfak'}</strong> / KDV: <strong>%{u.kdvOrani || 10}</strong> / Durum: <strong>{mutfakYaziciDurumEtiketi(u)}</strong> / Hedef: <strong>{fisYaziciAktifMi(u) ? yaziciHedefEtiketi(yaziciHedefiBul(u.departman || 'Mutfak', 'mutfak')) : 'Yazdırma yok'}</strong>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={styles.priceTag}>{u.fiyat} TL</span><span style={{ color: '#64748b', fontSize: '12px', fontWeight: '800' }}>Maliyet: {u.maliyet || 0} TL</span>

                            <span style={{ backgroundColor: urunSatistaAktifMi(u) ? '#dcfce7' : '#fee2e2', color: urunSatistaAktifMi(u) ? '#15803d' : '#991b1b', padding: '7px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '900' }}>
                              {urunSatistaAktifMi(u) ? '✅ Satışta' : '🚫 Satıştan kalktı'}
                            </span>

                            <span style={{ backgroundColor: urunQrMenudeGorunurMu(u) ? '#dbeafe' : '#f1f5f9', color: urunQrMenudeGorunurMu(u) ? '#1d4ed8' : '#475569', padding: '7px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '900' }}>
                              {urunQrMenudeGorunurMu(u) ? '📱 QR açık' : '📵 QR kapalı'}
                            </span>

                            <select value={urunSatistaAktifMi(u) ? 'true' : 'false'} onChange={e => urunSatisDurumunuAyarla(u, e.target.value === 'true')} style={{ border: '1px solid #cbd5e1', backgroundColor: urunSatistaAktifMi(u) ? '#dcfce7' : '#fee2e2', color: urunSatistaAktifMi(u) ? '#15803d' : '#991b1b', padding: '7px 9px', borderRadius: '8px', cursor: 'pointer', fontWeight: '900', fontSize: '12px', outline: 'none' }}>
                              <option value="true">✅ Satışta aktif</option>
                              <option value="false">🚫 Satıştan kaldır</option>
                            </select>

                            <select value={urunQrMenudeGorunurMu(u) ? 'true' : 'false'} disabled={!urunSatistaAktifMi(u)} onChange={e => urunQrMenuDurumunuAyarla(u, e.target.value === 'true')} style={{ border: '1px solid #cbd5e1', backgroundColor: urunQrMenudeGorunurMu(u) ? '#dbeafe' : '#f1f5f9', color: urunQrMenudeGorunurMu(u) ? '#1d4ed8' : '#475569', padding: '7px 9px', borderRadius: '8px', cursor: urunSatistaAktifMi(u) ? 'pointer' : 'not-allowed', fontWeight: '900', fontSize: '12px', outline: 'none', opacity: urunSatistaAktifMi(u) ? 1 : 0.65 }}>
                              <option value="true">📱 QR menüde görünsün</option>
                              <option value="false">📵 QR menüde görünmesin</option>
                            </select>

                            <span
                              style={{
                                backgroundColor: mutfakEkraniAktifMi(u) ? '#dcfce7' : '#f1f5f9',
                                color: mutfakEkraniAktifMi(u) ? '#15803d' : '#475569',
                                padding: '7px 9px',
                                borderRadius: '999px',
                                fontSize: '11px',
                                fontWeight: '900',
                              }}
                            >
                              {mutfakYaziciDurumEtiketi(u)}
                            </span>

                            <select
                              value={mutfakEkraniAktifMi(u) ? 'true' : 'false'}
                              onChange={e => urunMutfakDurumunuAyarla(u, e.target.value === 'true')}
                              style={{
                                border: '1px solid #cbd5e1',
                                backgroundColor: mutfakEkraniAktifMi(u) ? '#dcfce7' : '#f1f5f9',
                                color: mutfakEkraniAktifMi(u) ? '#15803d' : '#475569',
                                padding: '7px 9px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '800',
                                fontSize: '12px',
                                outline: 'none',
                              }}
                            >
                              <option value="true">👨‍🍳 Ekranda görünsün</option>
                              <option value="false">🚫 Ekranda görünmesin</option>
                            </select>

                            <select
                              value={fisYaziciAktifMi(u) ? 'true' : 'false'}
                              onChange={e => urunFisYaziciDurumunuAyarla(u, e.target.value === 'true')}
                              style={{
                                border: '1px solid #cbd5e1',
                                backgroundColor: fisYaziciAktifMi(u) ? '#fee2e2' : '#f1f5f9',
                                color: fisYaziciAktifMi(u) ? '#b91c1c' : '#475569',
                                padding: '7px 9px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '800',
                                fontSize: '12px',
                                outline: 'none',
                              }}
                            >
                              <option value="true">🖨️ Yazıcı bassın</option>
                              <option value="false">🚫 Yazıcı basmasın</option>
                            </select>

                            {/* ürünün hangi yazıcıya gideceğini seçen kod */}
                            <select
                              value={yaziciDepartmaniniNormalizeEt(u.departman || 'Mutfak')}
                              onChange={e => urunYaziciHedefiAyarla(u, e.target.value)}
                              style={{
                                border: '1px solid #cbd5e1',
                                backgroundColor: yaziciDepartmaniniNormalizeEt(u.departman || 'Mutfak') === 'Bar' ? '#dbeafe' : '#fff7ed',
                                color: '#334155',
                                padding: '7px 9px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '900',
                                fontSize: '12px',
                                outline: 'none',
                              }}
                            >
                              {yaziciDepartmaniSecenekleri.map(secenek => (
                                <option key={secenek.value} value={secenek.value}>{secenek.label}</option>
                              ))}
                            </select>

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

            {/* ürün reçetelerini ayrı sekmede yöneten kod */}
            {activeTab === 'receteler' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>🧾 Ürün Reçeteleri</h2>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px', lineHeight: 1.55 }}>
                  Satılan ürünlerin hangi hammaddelerden oluştuğunu buradan tanımlayın. Reçete maliyeti, fireli stok düşümü, porsiyon hesabı ve kâr oranı bu sekmede yönetilir.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '16px', padding: '14px' }}>
                    <h3 style={{ margin: '0 0 6px', color: '#1e293b' }}>📦 Reçete Operasyon Merkezi</h3>
                    <p style={{ color: '#475569', fontSize: '12px', lineHeight: 1.55, margin: 0 }}>
                      Hammadde kartları, alış fişi, depo sayımı ve eksik malzeme siparişi artık burada. Alış fişinde hem <strong>hammadde</strong> hem de <strong>satış ürünü</strong> seçebilirsin; ürün seçersen stok doğrudan ürün kartına işlenir.
                    </p>
                  </div>
                </div>

                <div style={{ ...styles.panelCard, backgroundColor: '#f8fafc', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1e293b', marginTop: 0 }}>🥦 Hammadde Stokları</h3>
                  <form onSubmit={stokMalzemeEkle} style={styles.inlineForm}>
                    <input type="text" placeholder="Hammadde adı" value={yeniStokMalzemeAdi} onChange={e => setYeniStokMalzemeAdi(e.target.value)} style={styles.input} />
                    <input type="text" placeholder="Birim kg / lt / adet" value={yeniStokMalzemeBirim} onChange={e => setYeniStokMalzemeBirim(e.target.value)} style={{ ...styles.input, maxWidth: '140px' }} />
                    <input type="number" placeholder="Mevcut stok" value={yeniStokMalzemeMiktar} onChange={e => setYeniStokMalzemeMiktar(e.target.value)} style={{ ...styles.input, maxWidth: '140px' }} />
                    <input type="number" placeholder="Kritik" value={yeniStokMalzemeKritik} onChange={e => setYeniStokMalzemeKritik(e.target.value)} style={{ ...styles.input, maxWidth: '120px' }} />
                    <input type="number" placeholder="Birim maliyet" value={yeniStokMalzemeMaliyet} onChange={e => setYeniStokMalzemeMaliyet(e.target.value)} style={{ ...styles.input, maxWidth: '140px' }} />
                    <button type="submit" style={styles.btnOrange}>Hammadde Ekle</button>
                  </form>

                  {aktifStokMalzemeleri.length === 0 ? (
                    <div style={{ color: '#94a3b8', padding: '12px' }}>Henüz hammadde stok kartı yok. Satın alma ve reçete listesi için önce hammadde ekleyin.</div>
                  ) : aktifStokMalzemeleri.map(m => (
                    <div key={m.id} style={{ ...styles.dataRow, alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <strong>{m.ad}</strong>
                        <div style={{ color: '#64748b', fontSize: '12px' }}>Birim: {m.birim} / Maliyet: {m.birimMaliyet} TL</div>
                      </div>
                      <span style={Number(m.stokMiktari || 0) <= Number(m.kritikMiktar || 0) ? styles.badgePending : styles.badgeActive}>
                        Stok: {m.stokMiktari} {m.birim}
                      </span>
                      <button type="button" onClick={() => alisFisineMalzemeyiSec(m)} style={{ ...styles.btnOrange, backgroundColor: '#0ea5e9' }}>Alış Fişine Ekle</button>
                    </div>
                  ))}
                </div>

                <div style={{ ...styles.panelCard, backgroundColor: '#ecfeff', border: '1px solid #bae6fd', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ fontSize: '17px', color: '#0f172a', margin: '0 0 6px' }}>🧾 Alış Fişi / Ürün Girişi</h3>
                      <p style={{ color: '#475569', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
                        Stok ekleme artık buradan yapılır. Tedarikçiden alınan hammaddeyi veya satış ürününü fişe ekle; kaydettiğinde seçtiğin kalemin stoğu artar ve istersen gider kaydı da oluşur.
                      </p>
                    </div>
                    <div style={{ backgroundColor: '#fff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '10px 12px', minWidth: '160px' }}>
                      <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: '900' }}>Fiş Toplamı</div>
                      <div style={{ fontSize: '20px', color: '#0f172a', fontWeight: '900' }}>{paraYuvarla(alisFisToplami)} TL</div>
                    </div>
                  </div>

                  {alisFisMesaji ? <div style={{ marginTop: '10px', backgroundColor: '#dbeafe', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: '12px', padding: '9px 11px', fontSize: '12px', fontWeight: '800' }}>{alisFisMesaji}</div> : null}

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, minmax(150px, 1fr))', gap: '8px', marginTop: '12px' }}>
                    <select value={alisFisCariMusteriId} onChange={e => {
                      const seciliId = e.target.value;
                      const seciliCari = cariMusteriler.find(c => String(c.id) === String(seciliId));
                      setAlisFisCariMusteriId(seciliId);
                      if (seciliCari?.ad) setAlisFisTedarikci(seciliCari.ad);
                    }} style={{ ...styles.input, backgroundColor: '#fff' }}>
                      <option value="">Kayıtlı cari/tedarikçi seç</option>
                      {cariMusteriler.filter(c => String(c.restaurantId) === String(mevcutRestaurantId)).map(c => <option key={c.id} value={c.id}>{c.ad} {c.bakiye ? `— Bakiye ${c.bakiye} TL` : ''}</option>)}
                    </select>
                    <input type="text" placeholder="Tedarikçi / firma" value={alisFisTedarikci} onChange={e => setAlisFisTedarikci(e.target.value)} style={{ ...styles.input, backgroundColor: '#fff' }} />
                    <input type="text" placeholder="Fiş / fatura no" value={alisFisBelgeNo} onChange={e => setAlisFisBelgeNo(e.target.value)} style={{ ...styles.input, backgroundColor: '#fff' }} />
                    <select value={alisFisOdemeTipi} onChange={e => setAlisFisOdemeTipi(e.target.value)} style={{ ...styles.input, backgroundColor: '#fff' }}>
                      <option>Nakit</option>
                      <option>Kart</option>
                      <option>Cari / Vadeli</option>
                      <option>Havale / EFT</option>
                    </select>
                    <select value={alisFisGiderKategorisi} onChange={e => setAlisFisGiderKategorisi(e.target.value)} style={{ ...styles.input, backgroundColor: '#fff' }}>
                      <option>Malzeme</option>
                      <option>Ambalaj</option>
                      <option>Temizlik</option>
                      <option>Bakım / Servis</option>
                      <option>Diğer</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 0.7fr 0.7fr auto', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                    <select value={alisFisMalzemeId} onChange={e => {
                      const secili = alisFisiKalemBul(e.target.value);
                      setAlisFisMalzemeId(e.target.value);
                      setAlisFisBirimFiyat(secili?.birimMaliyet ? String(secili.birimMaliyet) : '');
                    }} style={{ ...styles.input, backgroundColor: '#fff' }}>
                      <option value="">Alınan hammadde veya satış ürünü seç</option>
                      <optgroup label="Hammaddeler">
                        {alisFisiSecilebilirKalemler.filter(k => k.tip === 'malzeme').map(k => <option key={k.secimId} value={k.secimId}>{k.ad} / Stok: {k.mevcutStok} {k.birim} / Maliyet: {k.birimMaliyet || 0} TL</option>)}
                      </optgroup>
                      <optgroup label="Satış Ürünleri">
                        {alisFisiSecilebilirKalemler.filter(k => k.tip === 'urun').map(k => <option key={k.secimId} value={k.secimId}>{k.ad} / Ürün stoğu: {k.mevcutStok} adet / Maliyet: {k.birimMaliyet || 0} TL</option>)}
                      </optgroup>
                    </select>
                    <input type="number" step="0.001" placeholder="Miktar" value={alisFisMiktar} onChange={e => setAlisFisMiktar(e.target.value)} style={{ ...styles.input, backgroundColor: '#fff' }} />
                    <input type="number" step="0.01" placeholder="Birim fiyat" value={alisFisBirimFiyat} onChange={e => setAlisFisBirimFiyat(e.target.value)} style={{ ...styles.input, backgroundColor: '#fff' }} />
                    <button type="button" onClick={alisFisKalemiEkle} style={styles.btnOrange}>Fişe Ekle</button>
                  </div>

                  <input type="text" placeholder="Alış notu / açıklama" value={alisFisNotu} onChange={e => setAlisFisNotu(e.target.value)} style={{ ...styles.input, backgroundColor: '#fff', marginTop: '8px' }} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', fontSize: '12px', fontWeight: '900', marginTop: '8px' }}>
                    <input type="checkbox" checked={alisFisGiderOlarakIsle} onChange={e => setAlisFisGiderOlarakIsle(e.target.checked)} />
                    Bu alış fişini giderlere de işle
                  </label>
                  <div style={{ color: '#64748b', fontSize: '11px', lineHeight: 1.5, marginTop: '6px' }}>
                    Kayıtlı cari seçip ödeme tipini <strong>Cari / Vadeli</strong> yaparsan fiş tutarı cari ekstresine tedarikçi borcu olarak işlenir. Peşin alışlarda sadece tedarikçi adı olarak kullanılır.
                  </div>

                  {alisFisKalemleri.length === 0 ? (
                    <div style={{ marginTop: '10px', backgroundColor: '#fff', border: '1px dashed #bae6fd', color: '#64748b', borderRadius: '12px', padding: '12px', fontSize: '12px' }}>
                      Henüz fiş kalemi yok. Hammadde veya satış ürünü seçip miktar girerek alış fişine ekleyin. Ürün seçersen stok ürün kartına, hammadde seçersen hammadde kartına işlenir.
                    </div>
                  ) : (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {alisFisKalemleri.map(k => (
                        <div key={k.id} style={{ backgroundColor: '#fff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '9px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.55fr 0.55fr 0.55fr auto', gap: '8px', alignItems: 'center' }}>
                          <strong style={{ color: '#0f172a' }}>{k.kalemTipi === 'urun' ? '🍔 Ürün: ' : '🥦 Hammadde: '}{k.malzemeAdi}</strong>
                          <span style={{ color: '#334155', fontSize: '12px', fontWeight: '800' }}>{k.miktar} {k.birim}</span>
                          <span style={{ color: '#334155', fontSize: '12px', fontWeight: '800' }}>{k.birimFiyat} TL</span>
                          <span style={{ color: '#0f172a', fontSize: '12px', fontWeight: '900' }}>{k.toplam} TL</span>
                          <button type="button" onClick={() => alisFisKalemiSil(k.id)} style={{ border: 'none', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', fontWeight: '900' }}>Sil</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                    <button type="button" onClick={alisFisiniKaydetVeStogaIsle} style={{ ...styles.btnOrange, backgroundColor: '#10b981' }}>Alış Fişini Kaydet ve Stoğa İşle</button>
                    <button type="button" onClick={() => setAlisFisKalemleri([])} style={{ ...styles.btnOrange, backgroundColor: '#64748b' }}>Fişi Temizle</button>
                  </div>

                  {alisFisleri.filter(f => String(f.restaurantId) === String(mevcutRestaurantId)).length > 0 ? (
                    <details style={{ marginTop: '12px' }}>
                      <summary style={{ cursor: 'pointer', fontWeight: '900', color: '#0369a1' }}>Son alış fişleri</summary>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                        {alisFisleri.filter(f => String(f.restaurantId) === String(mevcutRestaurantId)).slice(0, 8).map(f => (
                          <div key={f.id} style={{ backgroundColor: '#fff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '9px', fontSize: '12px', color: '#334155' }}>
                            <strong>{f.tedarikci}</strong>{f.cariMusteriAdi ? ` / Cari: ${f.cariMusteriAdi}` : ''} — {f.belgeNo || 'Belge no yok'} — {tarihSaatYaz(f.tarih)} — <strong>{f.toplam} TL</strong>
                            <div style={{ color: '#64748b', marginTop: '4px' }}>{Array.isArray(f.kalemler) ? f.kalemler.map(k => `${k.malzemeAdi}: ${k.miktar} ${k.birim}`).join(' / ') : ''}</div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>


              <div style={{ ...styles.panelCard, marginTop: '16px' }}>
                <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>📋 Depo Sayımı & Eksik Malzeme Siparişi</h3>
                <p style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.55, marginTop: 0 }}>
                  Depo sayımı artık sadece mevcut miktarı göstermez. Önce sayımı başlat, elindeki gerçek miktarı gir, sistem farkı ve maliyet etkisini hesaplasın. İstersen stokları gerçek sayıma göre güncelleyebilir veya kritik eksiklerden satın alma talebi oluşturabilirsin.
                </p>

                {satinAlmaMesaji ? <div style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '10px 12px', fontSize: '13px', fontWeight: '800', marginBottom: '12px' }}>{satinAlmaMesaji}</div> : null}

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.35fr 0.9fr', gap: '14px' }}>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                      <div>
                        <h4 style={{ margin: 0, color: '#1e293b' }}>Depo sayımı</h4>
                        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>1) Başlat 2) Gerçek sayılan miktarı gir 3) Farkları kontrol et 4) Stoka işle</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input type="text" value={stokSayimBaslik} onChange={e => setStokSayimBaslik(e.target.value)} placeholder="Sayım adı" style={{ ...styles.input, minWidth: '170px', backgroundColor: '#fff' }} />
                        <button type="button" onClick={stokSayimFisOlustur} style={styles.btnOrange}>Yeni Depo Sayımı Başlat</button>
                      </div>
                    </div>

                    {aktifStokMalzemeleri.length === 0 ? (
                      <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', borderRadius: '12px', padding: '12px', fontSize: '13px', fontWeight: '800' }}>
                        Sayım yapılacak hammadde yok. Önce yukarıdaki Hammadde Stokları bölümünden Patates, Kaşar, Sosis gibi malzemeleri ekle.
                      </div>
                    ) : !aktifStokSayimKaydi ? (
                      <div style={{ backgroundColor: '#fff', border: '1px dashed #cbd5e1', color: '#64748b', borderRadius: '12px', padding: '16px', fontSize: '13px' }}>
                        Aktif depo sayımı yok. “Yeni Depo Sayımı Başlat” butonuna basınca mevcut hammadde listesi sayım tablosuna dönüşür.
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: '8px', marginBottom: '12px' }}>
                          <div style={styles.statsCard}><div style={styles.statsTitle}>Sayım</div><div style={{ ...styles.statsValue, fontSize: '18px' }}>{aktifStokSayimOzeti.sayilan}/{aktifStokSayimOzeti.toplam}</div></div>
                          <div style={styles.statsCard}><div style={styles.statsTitle}>Eksik Kalem</div><div style={{ ...styles.statsValue, fontSize: '18px', color: '#ef4444' }}>{aktifStokSayimOzeti.eksikKalem}</div></div>
                          <div style={styles.statsCard}><div style={styles.statsTitle}>Fazla Kalem</div><div style={{ ...styles.statsValue, fontSize: '18px', color: '#10b981' }}>{aktifStokSayimOzeti.fazlaKalem}</div></div>
                          <div style={styles.statsCard}><div style={styles.statsTitle}>Fark Tutarı</div><div style={{ ...styles.statsValue, fontSize: '18px' }}>{aktifStokSayimOzeti.toplamFarkTutari} TL</div></div>
                          <div style={styles.statsCard}><div style={styles.statsTitle}>Durum</div><div style={{ ...styles.statsValue, fontSize: '15px' }}>{aktifStokSayimKaydi.durum}</div></div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '430px', overflowY: 'auto', paddingRight: '4px' }}>
                          {aktifStokSayimKalemleri.map(kalem => (
                            <div key={kalem.malzemeId} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.75fr 0.85fr 0.8fr 0.75fr', gap: '8px', alignItems: 'center' }}>
                              <div>
                                <strong style={{ color: '#1e293b' }}>{kalem.malzemeAdi}</strong>
                                <div style={{ color: '#64748b', fontSize: '12px' }}>Kritik: {kalem.kritikMiktar} {kalem.birim} / Birim maliyet: {kalem.birimMaliyet} TL</div>
                              </div>
                              <div style={{ color: '#334155', fontSize: '12px', fontWeight: '900' }}>Sistem: {kalem.sistemMiktari} {kalem.birim}</div>
                              <input type="number" step="0.001" value={kalem.sayilanMiktarRaw ?? ''} onChange={e => stokSayimKaleminiGuncelle(aktifStokSayimKaydi.id, kalem.malzemeId, e.target.value)} placeholder="Sayılan gerçek" style={{ ...styles.input, backgroundColor: '#fff' }} />
                              <div style={{ fontSize: '12px', fontWeight: '900', color: !kalem.sayildi ? '#94a3b8' : Number(kalem.farkMiktar || 0) < 0 ? '#ef4444' : Number(kalem.farkMiktar || 0) > 0 ? '#10b981' : '#334155' }}>
                                {!kalem.sayildi ? 'Henüz sayılmadı' : `Fark: ${kalem.farkMiktar} ${kalem.birim}`}
                              </div>
                              <div style={{ fontSize: '12px', fontWeight: '900', color: Number(kalem.farkTutar || 0) < 0 ? '#ef4444' : '#334155' }}>{kalem.sayildi ? `${kalem.farkTutar} TL` : '-'}</div>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                          <button type="button" onClick={() => stokSayimKaydiniTamamla(aktifStokSayimKaydi.id, false)} style={{ ...styles.btnOrange, backgroundColor: '#475569' }}>Sadece Kontrol Olarak Kaydet</button>
                          <button type="button" onClick={() => stokSayimKaydiniTamamla(aktifStokSayimKaydi.id, true)} style={{ ...styles.btnOrange, backgroundColor: '#10b981' }}>Stoku Gerçek Sayıma Göre Güncelle</button>
                          <button type="button" onClick={() => stokSayimEksiklerindenSatinAlmaOlustur(aktifStokSayimKaydi.id)} style={{ ...styles.btnOrange, backgroundColor: '#2563eb' }}>Kritik Eksiklerden Sipariş Listesi Oluştur</button>
                        </div>
                      </>
                    )}

                    <details style={{ marginTop: '12px' }}>
                      <summary style={{ cursor: 'pointer', fontWeight: '900', color: '#334155' }}>Geçmiş depo sayımları</summary>
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {stokSayimKayitlari.filter(k => String(k.restaurantId) === String(mevcutRestaurantId)).slice(0, 8).map(k => (
                          <div key={k.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '9px', fontSize: '12px', color: '#334155', display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                            <span><strong>{k.baslik || 'Depo Sayımı'}</strong> — {tarihSaatYaz(k.tarih)} — {k.sayilanKalemSayisi || 0}/{k.malzemeSayisi || 0} kalem</span>
                            <span>{k.durum} / Fark: {k.toplamFarkTutari || 0} TL</span>
                            <button type="button" onClick={() => setAktifStokSayimId(k.id)} style={{ border: 'none', backgroundColor: '#e2e8f0', color: '#334155', borderRadius: '8px', padding: '6px 9px', cursor: 'pointer', fontWeight: '900', fontSize: '11px' }}>Aç</button>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px' }}>
                    <h4 style={{ margin: '0 0 6px', color: '#1e293b' }}>Eksik malzeme siparişi</h4>
                    <p style={{ color: '#64748b', fontSize: '12px', lineHeight: 1.5, marginTop: 0 }}>Bu liste Hammadde Stokları bölümüne eklediğin malzemelerden gelir. Liste boşsa önce hammadde ekle.</p>
                    <form onSubmit={satinAlmaTalebiOlustur} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <select value={satinAlmaMalzemeId} onChange={e => setSatinAlmaMalzemeId(e.target.value)} style={{ ...styles.input, flex: '1 1 180px', backgroundColor: '#fff' }}>
                        <option value="">Malzeme seç</option>
                        {aktifStokMalzemeleri.map(m => <option key={m.id} value={String(m.id)}>{m.ad} / Stok: {stokMalzemeMiktari(m)} {m.birim} / Kritik: {stokMalzemeKritikMiktari(m)}</option>)}
                      </select>
                      <input type="number" placeholder="Alınacak miktar" value={satinAlmaMiktar} onChange={e => setSatinAlmaMiktar(e.target.value)} style={{ ...styles.input, width: '150px', backgroundColor: '#fff' }} />
                      <input type="text" placeholder="Tedarikçi" value={satinAlmaTedarikci} onChange={e => setSatinAlmaTedarikci(e.target.value)} style={{ ...styles.input, flex: '1 1 160px', backgroundColor: '#fff' }} />
                      <button type="submit" style={styles.btnOrange}>Sipariş Talebi Aç</button>
                    </form>

                    {aktifStokMalzemeleri.length === 0 ? (
                      <div style={{ marginTop: '10px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', borderRadius: '12px', padding: '10px', fontSize: '12px', fontWeight: '800' }}>Malzeme seçimi için önce Hammadde Stokları bölümünden malzeme ekleyin.</div>
                    ) : null}

                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {satinAlmaTalepleri.filter(t => String(t.restaurantId) === String(mevcutRestaurantId)).slice(0, 8).map(t => <div key={t.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '9px', display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}><span style={{ fontSize: '12px', color: '#334155' }}><strong>{t.malzemeAdi}</strong> — {t.miktar} {t.birim} / {t.tedarikci}<br /><span style={{ color: '#94a3b8' }}>Mevcut: {t.mevcutStok ?? '-'} / Kritik: {t.kritikMiktar ?? '-'} / Kaynak: {t.kaynak || 'Manuel'}</span></span><select value={t.durum} onChange={e => satinAlmaDurumGuncelle(t.id, e.target.value)} style={{ ...styles.input, minWidth: '140px', backgroundColor: '#fff' }}><option>Talep Açıldı</option><option>Sipariş Verildi</option><option>Teslim Alındı</option><option>İptal</option></select></div>)}
                    </div>
                  </div>
                </div>
              </div>


                {receteYonetimiPaneli({ marginBottom: 0 })}
              </div>
            )}

            {/* QR menü linki, QR kod ve müşteriye açık dijital menü ekranını yöneten kod */}
            {activeTab === 'qr_menu' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={styles.panelCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <div>
                      <h2 style={styles.pageTitle}>📱 QR Menü</h2>
                      <p style={{ color: '#64748b', fontSize: '13px', margin: '8px 0 0', lineHeight: 1.6, maxWidth: '760px' }}>
                        Menü yönetimindeki tüm ürünler ve gruplar otomatik olarak QR menüye aktarılır. Ürün adı, fiyatı, görseli, hazır notları ve grup bilgisi müşterinin telefonunda görünür.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button type="button" onClick={qrMenuLinkiniKopyala} style={{ ...styles.btnOrange, background: '#1e293b' }}>Linki Kopyala</button>
                      <button type="button" onClick={() => window.open(qrMenuPanelLinki, '_blank')} style={{ ...styles.btnOrange, background: '#2563eb' }}>Müşteri Önizle</button>
                      <button type="button" onClick={qrMenuKoduYazdir} style={{ ...styles.btnOrange, background: '#10b981' }}>QR Yazdır</button>
                    </div>
                  </div>

                  {qrMenuMesaji && <div style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '10px 12px', fontSize: '13px', fontWeight: '800', marginBottom: '14px' }}>{qrMenuMesaji}</div>}

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '280px 1fr', gap: '18px', alignItems: 'start' }}>
                    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ backgroundColor: '#fff', borderRadius: '18px', padding: '14px', border: '1px solid #e2e8f0', display: 'inline-block' }}>
                        <img src={qrMenuPanelKodUrl} alt="QR Menü Kodu" style={{ width: '230px', height: '230px', display: 'block' }} />
                      </div>
                      <div style={{ marginTop: '12px', color: '#1e293b', fontWeight: '900' }}>{user?.restaurant || 'Restoran'}</div>
                      <div style={{ marginTop: '6px', color: '#64748b', fontSize: '11px', wordBreak: 'break-all', lineHeight: 1.5 }}>{qrMenuPanelLinki}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                      <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '18px', padding: '16px' }}>
                        <div style={{ color: '#9a3412', fontSize: '12px', fontWeight: '900' }}>QR Ürün</div>
                        <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: '900', marginTop: '8px' }}>{qrMenuPanelUrunSayisi}</div>
                        <div style={{ color: '#9a3412', fontSize: '12px', marginTop: '4px', fontWeight: '700' }}>menüden otomatik gelir</div>
                      </div>
                      <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '18px', padding: '16px' }}>
                        <div style={{ color: '#1d4ed8', fontSize: '12px', fontWeight: '900' }}>QR Grup</div>
                        <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: '900', marginTop: '8px' }}>{qrMenuPanelGruplari.length}</div>
                        <div style={{ color: '#1d4ed8', fontSize: '12px', marginTop: '4px', fontWeight: '700' }}>ürün grupları aktarılır</div>
                      </div>
                      <div style={{ backgroundColor: aktifQrMenuAyari.aktif ? '#ecfdf5' : '#fef2f2', border: aktifQrMenuAyari.aktif ? '1px solid #a7f3d0' : '1px solid #fecaca', borderRadius: '18px', padding: '16px' }}>
                        <div style={{ color: aktifQrMenuAyari.aktif ? '#047857' : '#b91c1c', fontSize: '12px', fontWeight: '900' }}>Durum</div>
                        <div style={{ color: '#0f172a', fontSize: '22px', fontWeight: '900', marginTop: '8px' }}>{aktifQrMenuAyari.aktif ? 'Aktif' : 'Pasif'}</div>
                        <label style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', color: '#475569', fontSize: '12px', fontWeight: '800' }}><input type="checkbox" checked={aktifQrMenuAyari.aktif !== false} onChange={e => qrMenuAyariGuncelle('aktif', e.target.checked)} />QR menü açık</label>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={styles.panelCard}>
                  <h3 style={{ margin: '0 0 12px', color: '#1e293b' }}>QR Menü Görünüm Ayarları</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(220px, 1fr))', gap: '10px' }}>
                    <input type="text" placeholder="QR menü başlığı" value={aktifQrMenuAyari.baslik} onChange={e => qrMenuAyariGuncelle('baslik', e.target.value)} style={styles.input} />
                    <input type="text" placeholder="Logo / ürün görseli URL" value={aktifQrMenuAyari.logoUrl} onChange={e => qrMenuAyariGuncelle('logoUrl', e.target.value)} style={styles.input} />
                    <input type="text" placeholder="Açıklama" value={aktifQrMenuAyari.aciklama} onChange={e => qrMenuAyariGuncelle('aciklama', e.target.value)} style={styles.input} />
                    <input type="text" placeholder="WhatsApp telefon" value={aktifQrMenuAyari.whatsappTelefon} onChange={e => qrMenuAyariGuncelle('whatsappTelefon', e.target.value)} style={styles.input} />
                    <input type="text" placeholder="Alt not" value={aktifQrMenuAyari.siparisNotu} onChange={e => qrMenuAyariGuncelle('siparisNotu', e.target.value)} style={styles.input} />
                    <label style={{ ...styles.input, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', color: '#475569' }}><input type="checkbox" checked={aktifQrMenuAyari.fiyatlariGoster !== false} onChange={e => qrMenuAyariGuncelle('fiyatlariGoster', e.target.checked)} />Fiyatları QR menüde göster</label>
                    <label style={{ ...styles.input, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', color: '#475569' }}><input type="checkbox" checked={aktifQrMenuAyari.qrSiparisAktif !== false} onChange={e => qrMenuAyariGuncelle('qrSiparisAktif', e.target.checked)} />QR menüden sipariş alınsın</label>
                    <label style={{ ...styles.input, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', color: '#475569' }}><input type="checkbox" checked={aktifQrMenuAyari.garsonCagirmaAktif !== false} onChange={e => qrMenuAyariGuncelle('garsonCagirmaAktif', e.target.checked)} />Garson çağır butonu açık</label>
                    <label style={{ ...styles.input, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', color: '#475569' }}><input type="checkbox" checked={aktifQrMenuAyari.hesapIstemeAktif !== false} onChange={e => qrMenuAyariGuncelle('hesapIstemeAktif', e.target.checked)} />Hesap iste butonu açık</label>
                    <label style={{ ...styles.input, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', color: '#475569' }}><input type="checkbox" checked={aktifQrMenuAyari.masaNoZorunlu !== false} onChange={e => qrMenuAyariGuncelle('masaNoZorunlu', e.target.checked)} />Masa numarası zorunlu</label>
                  </div>
                </div>

                <div style={styles.panelCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    <div>
                      <h3 style={{ margin: 0, color: '#1e293b' }}>Canlı QR Menü Önizleme</h3>
                      <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', marginTop: '4px' }}>Ürünler ve gruplar Menü & Ayarlar ekranından otomatik beslenir.</div>
                    </div>
                    <input type="text" placeholder="QR menüde ürün ara..." value={qrMenuArama} onChange={e => setQrMenuArama(e.target.value)} style={{ ...styles.input, minWidth: isMobile ? '100%' : '260px' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <button type="button" onClick={() => setAktifQrMenuGrubu('Tümü')} style={{ border: aktifQrMenuGrubu === 'Tümü' ? '1px solid #ff6b35' : '1px solid #e2e8f0', backgroundColor: aktifQrMenuGrubu === 'Tümü' ? '#fff7ed' : '#fff', color: aktifQrMenuGrubu === 'Tümü' ? '#ea580c' : '#334155', padding: '8px 10px', borderRadius: '999px', cursor: 'pointer', fontWeight: '900', fontSize: '12px' }}>Tümü</button>
                    {qrMenuPanelGruplari.map(grup => <button key={grup.ad} type="button" onClick={() => setAktifQrMenuGrubu(grup.ad)} style={{ border: aktifQrMenuGrubu === grup.ad ? '1px solid #ff6b35' : '1px solid #e2e8f0', backgroundColor: aktifQrMenuGrubu === grup.ad ? '#fff7ed' : '#fff', color: aktifQrMenuGrubu === grup.ad ? '#ea580c' : '#334155', padding: '8px 10px', borderRadius: '999px', cursor: 'pointer', fontWeight: '900', fontSize: '12px' }}>{grup.ad} ({grup.urunler.length})</button>)}
                  </div>

                  {qrMenuPanelFiltreliGruplari.length === 0 ? <div style={{ color: '#94a3b8', padding: '18px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '16px', textAlign: 'center', fontWeight: '800' }}>QR menüye aktarılacak ürün yok. Önce Menü & Ayarlar ekranından ürün ve grup ekleyin.</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {qrMenuPanelFiltreliGruplari.map(grup => (
                        <div key={grup.ad} style={{ border: '1px solid #e2e8f0', borderRadius: '18px', padding: '14px', backgroundColor: '#fbfdff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px' }}><h4 style={{ margin: 0, color: '#1e293b', fontSize: '16px' }}>{grup.ad}</h4><span style={{ color: '#64748b', fontSize: '12px', fontWeight: '800' }}>{grup.urunler.length} ürün</span></div>
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                            {grup.urunler.map(urun => {
                              const resim = urunGosterimResmi(urun);
                              return (
                                <div key={urun.id} style={{ display: 'flex', gap: '10px', backgroundColor: '#fff', border: '1px solid #eef2f7', borderRadius: '14px', padding: '10px' }}>
                                  {resim ? <img src={resim} alt={urun.ad} style={{ width: '58px', height: '58px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #e2e8f0', flex: '0 0 58px' }} /> : <div style={{ width: '58px', height: '58px', borderRadius: '12px', backgroundColor: '#fff7ed', color: '#f97316', border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 58px', fontSize: '22px' }}>🍽️</div>}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}><strong style={{ color: '#1e293b', fontSize: '13px' }}>{urun.ad}</strong>{aktifQrMenuAyari.fiyatlariGoster !== false && <span style={{ color: '#ff6b35', fontWeight: '900', fontSize: '13px', whiteSpace: 'nowrap' }}>{Number(urun.fiyat || 0).toLocaleString('tr-TR')} TL</span>}</div>
                                    <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', fontWeight: '700' }}>{urun.departman || grup.departman || 'Menü'} {urun.kdvOrani ? `• KDV %${urun.kdvOrani}` : ''}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* personel oluşturma ve listeleme ekranını gösteren kod */}

            {/* QR servis talepleri ve işlem loglarını gösteren kod */}
            {activeTab === 'servis_talepleri' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>🔔 Servis Talepleri</h2>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px' }}>QR menüden gelen garson çağır, hesap iste ve servis taleplerini buradan yönetin.</p>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '16px', padding: '12px' }}><div style={{ color: '#9a3412', fontSize: '12px', fontWeight: '800' }}>Açık Talep</div><strong style={{ fontSize: '26px', color: '#ea580c' }}>{acikServisTalebiSayisi}</strong></div>
                  <button type="button" onClick={() => servisTalebiEkle('Garson Çağır', activeMasa?.ad || '', '', 'Panel')} style={styles.btnOrange}>Test Garson Çağır</button>
                  <button type="button" onClick={() => servisTalebiEkle('Hesap İste', activeMasa?.ad || '', '', 'Panel')} style={{ ...styles.btnOrange, background: '#1e293b' }}>Test Hesap İste</button>
                </div>
                {aktifServisTalepleri.length === 0 ? <div style={{ color: '#94a3b8', padding: '20px' }}>Henüz servis talebi yok.</div> : aktifServisTalepleri.map(t => {
                  const qrSiparisTalebiMi = String(t.tip || '').toLocaleLowerCase('tr-TR').includes('qr sipariş');
                  const siparisUrunleri = Array.isArray(t.siparisUrunleri) ? t.siparisUrunleri : [];
                  return (
                    <div key={t.id} style={{ ...styles.dataRow, alignItems: 'stretch', flexDirection: isMobile ? 'column' : 'row' }}>
                      <div style={{ flex: 1 }}>
                        <span><strong>{t.tip}</strong> {t.masaAdi || t.masaNo ? `/ ${t.masaAdi || t.masaNo}` : ''}{t.musteriAdi ? ` / Müşteri: ${t.musteriAdi}` : ''} — {t.kaynak || 'QR'} / {tarihSaatYaz(t.createdAt)} {t.notMetni ? ` / ${t.notMetni}` : ''}</span>
                        {qrSiparisTalebiMi ? (
                          <div style={{ marginTop: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px' }}>
                            <div style={{ color: '#334155', fontSize: '12px', fontWeight: '900', marginBottom: '6px' }}>QR sipariş ürünleri — {Number(t.toplam || 0).toLocaleString('tr-TR')} TL</div>
                            {siparisUrunleri.length === 0 ? (
                              <div style={{ color: '#94a3b8', fontSize: '12px' }}>Ürün listesi bulunamadı.</div>
                            ) : (
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {siparisUrunleri.map((urun, index) => (
                                  <span key={`${t.id}-${index}`} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '999px', padding: '5px 8px', color: '#1e293b', fontSize: '12px', fontWeight: '900' }}>
                                    {Number(urun.adet || 1)}x {urun.ad}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                        <span style={{ border: '1px solid #e2e8f0', borderRadius: '999px', padding: '5px 8px', fontSize: '12px', fontWeight: '900', color: t.durum === 'Açık' ? '#ea580c' : '#047857', backgroundColor: t.durum === 'Açık' ? '#fff7ed' : '#ecfdf5' }}>{t.durum}</span>
                        {qrSiparisTalebiMi && t.durum === 'Açık' ? <button type="button" onClick={() => qrSiparisTalebiniMasayaAktar(t)} style={{ ...styles.btnOrange, background: '#2563eb', padding: '8px 10px', fontSize: '12px' }}>Kabul Et ve Masaya Aktar</button> : null}
                        {t.durum === 'Açık' ? <button type="button" onClick={() => servisTalebiniKapat(t.id)} style={{ ...styles.btnOrange, background: '#10b981', padding: '8px 10px', fontSize: '12px' }}>{qrSiparisTalebiMi ? 'Reddet/Kapat' : 'Kapat'}</button> : null}
                      </div>
                    </div>
                  );
                })}
                <h3 style={{ margin: '18px 0 10px', color: '#1e293b' }}>🛡️ İşlem Logları</h3>
                {(Array.isArray(islemLoglari) ? islemLoglari : []).filter(l => String(l.restaurantId) === String(mevcutRestaurantId)).slice(0, 12).map(l => (
                  <div key={l.id} style={{ ...styles.dataRow, backgroundColor: '#f8fafc' }}><span>{tarihSaatYaz(l.createdAt)} — <strong>{l.tip}</strong> / {l.aciklama}</span><span style={{ color: '#64748b', fontSize: '12px' }}>{l.kullanici}</span></div>
                ))}
              </div>
            )}

            {/* sadakat sistemini gösteren kod */}
            {activeTab === 'sadakat' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>🎁 Müşteri Sadakat Sistemi</h2>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px' }}>Puan, ziyaret sayısı, kampanya ve WhatsApp iletişimini tek ekrandan yönetin.</p>
                {sadakatMesaji ? <div style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '10px 12px', fontSize: '13px', fontWeight: '800', marginBottom: '12px' }}>{sadakatMesaji}</div> : null}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '12px' }}><div style={{ color: '#64748b', fontSize: '12px', fontWeight: '800' }}>Sadakat Müşterisi</div><strong style={{ fontSize: '26px' }}>{aktifSadakatMusterileri.length}</strong></div>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '12px' }}><div style={{ color: '#64748b', fontSize: '12px', fontWeight: '800' }}>Toplam Puan</div><strong style={{ fontSize: '26px' }}>{sadakatToplamPuan}</strong></div>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '12px' }}><div style={{ color: '#64748b', fontSize: '12px', fontWeight: '800' }}>Toplam Ziyaret</div><strong style={{ fontSize: '26px' }}>{sadakatToplamZiyaret}</strong></div>
                </div>
                <form onSubmit={sadakatMusterisiEkle} style={styles.inlineForm}>
                  <input type="text" placeholder="Müşteri adı" value={sadakatAdi} onChange={e => setSadakatAdi(e.target.value)} style={styles.input} />
                  <input type="text" placeholder="Telefon" value={sadakatTelefon} onChange={e => setSadakatTelefon(e.target.value)} style={styles.input} />
                  <input type="number" placeholder="Başlangıç puanı" value={sadakatPuan} onChange={e => setSadakatPuan(e.target.value)} style={{ ...styles.input, width: '150px' }} />
                  <button type="submit" style={styles.btnOrange}>Müşteri Ekle</button>
                  <button type="button" onClick={sadakatMusterileriniCaridenAktar} style={{ ...styles.btnOrange, background: '#1e293b' }}>Cariden Aktar</button>
                </form>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px', marginTop: '14px' }}>
                  {aktifSadakatMusterileri.length === 0 ? <div style={{ color: '#94a3b8', padding: '20px' }}>Sadakat müşterisi yok.</div> : aktifSadakatMusterileri.map(m => (
                    <div key={m.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}><strong>{m.ad}</strong><span style={{ color: '#ea580c', fontWeight: '900' }}>{m.puan} puan</span></div>
                      <div style={{ color: '#64748b', fontSize: '12px', marginTop: '5px' }}>{m.telefon || 'Telefon yok'} / {m.ziyaret || 0} ziyaret</div>
                      <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginTop: '10px' }}>
                        <button type="button" onClick={() => sadakatPuanGuncelle(m.id, 10, true)} style={{ ...styles.btnOrange, padding: '8px 10px', fontSize: '12px' }}>+10 Puan</button>
                        <button type="button" onClick={() => sadakatPuanGuncelle(m.id, -10, false)} style={{ ...styles.btnOrange, background: '#ef4444', padding: '8px 10px', fontSize: '12px' }}>-10 Kullan</button>
                        <button type="button" onClick={() => whatsappMesajiAc(m.telefon, `${user?.restaurant || 'Integra POS'} sadakat kampanyası: ${m.puan} puanınız var. Sizi tekrar bekleriz.`)} style={{ ...styles.btnOrange, background: '#22c55e', padding: '8px 10px', fontSize: '12px' }}>WhatsApp</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* kiosk self servis ekranını gösteren kod */}
            {activeTab === 'kiosk' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>🧍 Kiosk / Self Servis</h2>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px' }}>Kumpirci, dönerci, kahveci ve fast food işletmeleri için self servis sipariş ekranı. Siparişler Online Siparişler havuzuna düşer.</p>
                {kioskMesaji ? <div style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '10px 12px', fontSize: '13px', fontWeight: '800', marginBottom: '12px' }}>{kioskMesaji}</div> : null}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px' }}>
                      {aktifMenu.map(urun => <button key={urun.id} type="button" onClick={() => kioskSepeteEkle(urun)} style={{ textAlign: 'left', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '12px', cursor: 'pointer' }}><div style={{ fontWeight: '900', color: '#1e293b' }}>{urun.ad}</div><div style={{ color: '#ea580c', fontWeight: '900', marginTop: '6px' }}>{Number(urun.fiyat || 0).toLocaleString('tr-TR')} TL</div></button>)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '14px' }}>
                    <h3 style={{ margin: '0 0 10px', color: '#1e293b' }}>Sepet</h3>
                    <input type="text" placeholder="Müşteri adı / sıra no" value={kioskMusteriAdi} onChange={e => setKioskMusteriAdi(e.target.value)} style={{ ...styles.input, width: '100%', boxSizing: 'border-box', marginBottom: '8px' }} />
                    <input type="text" placeholder="Sipariş notu" value={kioskSiparisNotu} onChange={e => setKioskSiparisNotu(e.target.value)} style={{ ...styles.input, width: '100%', boxSizing: 'border-box', marginBottom: '8px' }} />
                    {kioskSepet.length === 0 ? <div style={{ color: '#94a3b8', fontSize: '13px' }}>Sepet boş.</div> : kioskSepet.map(u => <div key={u.urunId} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginBottom: '8px' }}><span style={{ fontSize: '13px', color: '#334155' }}>{u.ad}</span><div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><button type="button" onClick={() => kioskSepetAdetGuncelle(u.urunId, -1)}>-</button><strong>{u.adet}</strong><button type="button" onClick={() => kioskSepetAdetGuncelle(u.urunId, 1)}>+</button></div></div>)}
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}><strong>Toplam</strong><strong>{kioskToplam.toLocaleString('tr-TR')} TL</strong></div>
                    <button type="button" onClick={kioskSiparisiniKasayaGonder} style={{ ...styles.btnOrange, width: '100%', marginTop: '12px' }}>Kasaya Gönder</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'garsonlar' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>👥 Personel Listesi</h2>
                <div style={{ backgroundColor: elTerminaliModu ? '#ecfdf5' : '#f8fafc', border: elTerminaliModu ? '1px solid #a7f3d0' : '1px solid #e2e8f0', borderRadius: '16px', padding: '14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <strong style={{ color: '#1e293b' }}>📱 Android Garson El Terminali Modu</strong>
                    <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Garson APK tarafında masa, ürün ekleme ve mutfak fişi akışını sadeleştirir. Yetkiler personel bazlı çalışır.</div>
                  </div>
                  <label style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#475569', fontWeight: '900' }}><input type="checkbox" checked={elTerminaliModu} onChange={e => setElTerminaliModu(e.target.checked)} />El terminali modu açık</label>
                </div>

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
                    <div style={styles.statsTitle}>KDV Matrahı</div>
                    <div style={{ ...styles.statsValue, color: '#0f766e' }}>{raporData.toplamMatrah || 0} TL</div>
                  </div>

                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>KDV Tutarı</div>
                    <div style={{ ...styles.statsValue, color: '#7c3aed' }}>{raporData.toplamKdv || 0} TL</div>
                  </div>

                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>Ürün Maliyeti</div>
                    <div style={{ ...styles.statsValue, color: '#ef4444' }}>{raporData.toplamMaliyet || 0} TL</div>
                  </div>

                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>Brüt Kâr</div>
                    <div style={{ ...styles.statsValue, color: Number(raporData.brutKar || 0) >= 0 ? '#10b981' : '#ef4444' }}>{raporData.brutKar || 0} TL</div>
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
                              <th style={styles.th}>Maliyet</th>
                              <th style={styles.th}>Brüt Kâr</th>
                              <th style={styles.th}>KDV</th>
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
                                <td style={{ ...styles.td, fontWeight: 'bold' }}>{paraYuvarla(item.ciro)} TL</td>
                                <td style={{ ...styles.td, color: '#ef4444', fontWeight: 'bold' }}>{paraYuvarla(item.maliyet || 0)} TL <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '800' }}>Birim: {paraYuvarla(item.birimMaliyet || 0)} TL</div></td>
                                <td style={{ ...styles.td, color: Number(item.kar || 0) >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{paraYuvarla(item.kar || 0)} TL</td>
                                <td style={{ ...styles.td, color: '#7c3aed', fontWeight: 'bold' }}>{paraYuvarla(item.kdvTutari || 0)} TL</td>
                                <td style={{ ...styles.td, color: '#ef4444', fontWeight: 'bold' }}>{paraYuvarla(item.indirimTutari || 0)} TL</td>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '18px' }}>
                  <div>
                    <h2 style={styles.pageTitle}>👑 Süper Admin Paneli</h2>
                    <p style={{ color: '#64748b', marginTop: '-6px' }}>Kayıt başvuruları, firma detayları, lisanslar ve destek talepleri burada görünür.</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await restoranlariSupabasedenCek();
                      await adminBildirimleriniSupabasedenCek();
                      await destekTalepleriniSupabasedenCek();
                    }}
                    style={styles.btnOrange}
                  >
                    🔄 Yenile
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ ...styles.statCard, margin: 0 }}>
                    <span>Toplam Firma</span>
                    <strong>{restoranlar.filter(r => r.rol === 'owner').length}</strong>
                  </div>
                  <div style={{ ...styles.statCard, margin: 0 }}>
                    <span>Onay Bekleyen</span>
                    <strong>{restoranlar.filter(r => r.durum !== 'Aktif' && r.rol === 'owner').length}</strong>
                  </div>
                  <div style={{ ...styles.statCard, margin: 0 }}>
                    <span>Yeni Bildirim</span>
                    <strong>{adminBildirimleri.filter(b => !b.okundu).length}</strong>
                  </div>
                  <div style={{ ...styles.statCard, margin: 0 }}>
                    <span>Destek Talepleri</span>
                    <strong>{destekTalepleri.length}</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '22px' }}>
                  <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '18px', padding: '16px' }}>
                    <h3 style={{ margin: '0 0 12px', color: '#1e293b' }}>🔔 Son Admin Bildirimleri</h3>
                    {adminBildirimleri.length === 0 ? (
                      <div style={{ color: '#94a3b8', fontSize: '13px' }}>Henüz bildirim yok.</div>
                    ) : (
                      <div style={{ display: 'grid', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                        {adminBildirimleri.slice(0, 8).map(b => (
                          <div key={b.id} style={{ backgroundColor: '#fff', border: '1px solid #fed7aa', borderRadius: '12px', padding: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                              <strong style={{ color: '#1e293b' }}>{b.baslik}</strong>
                              <span style={{ fontSize: '11px', color: '#ff6b35', fontWeight: '900' }}>{b.tip}</span>
                            </div>
                            <div style={{ color: '#475569', fontSize: '12px', marginTop: '6px', lineHeight: 1.5 }}>{b.mesaj}</div>
                            <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '6px' }}>{tarihSaatYaz(b.createdAt)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, color: '#1e293b' }}>🛠️ Destek ve Geliştirme Talepleri</h3>
                      <button type="button" onClick={() => setActiveTab('admin_destek')} style={styles.filterBtn}>Panele Git</button>
                    </div>
                    {destekTalepleri.length === 0 ? (
                      <div style={{ color: '#94a3b8', fontSize: '13px' }}>Henüz destek talebi yok.</div>
                    ) : (
                      <div style={{ display: 'grid', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                        {destekTalepleri.slice(0, 8).map(t => (
                          <div key={t.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                              <strong style={{ color: '#1e293b' }}>{t.firmaAdi}</strong>
                              <span style={{ fontSize: '11px', color: '#0f766e', fontWeight: '900' }}>{t.talepTipi}</span>
                            </div>
                            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '5px' }}>{t.email}{t.telefon ? ` / ${t.telefon}` : ''}</div>
                            <div style={{ color: '#1e293b', fontSize: '13px', marginTop: '7px', fontWeight: '800' }}>{t.konu || 'Konu yok'}</div>
                            <div style={{ color: '#475569', fontSize: '12px', marginTop: '4px', lineHeight: 1.5 }}>{t.mesaj}</div>
                            <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '6px' }}>{tarihSaatYaz(t.createdAt)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <h3 style={{ margin: '0 0 12px', color: '#1e293b' }}>🏢 Kayıtlı Firmalar ve Detaylar</h3>

                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={styles.th}>Firma Detayları</th>
                        <th style={styles.th}>Paket / Lisans</th>
                        <th style={styles.th}>Durum</th>
                        <th style={styles.th}>Kullanıcı Limiti</th>
                        <th style={{ ...styles.th, textAlign: 'right', paddingRight: '15px' }}>Yönetim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {restoranlar.map(r => (
                        <tr key={r.id} style={styles.tr}>
                          <td style={styles.td}>
                            <div style={{ fontWeight: 'bold', color: '#1e293b' }}>💼 {r.ad}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Yetkili: <strong>{r.yetkiliAdi || '-'}</strong></div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>E-posta: <strong>{r.email || '-'}</strong></div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Telefon: <strong>{r.firmaTelefon || '-'}</strong></div>
                            <button
                              type="button"
                              onClick={() => setAdminDetayAcikId(adminDetayAcikId === r.id ? null : r.id)}
                              style={{ ...styles.filterBtn, marginTop: '8px' }}
                            >
                              {adminDetayAcikId === r.id ? 'Detayı Gizle' : 'Firma Detayı'}
                            </button>

                            {adminDetayAcikId === r.id && (
                              <div style={{ marginTop: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px', fontSize: '12px', color: '#475569', lineHeight: 1.7 }}>
                                <div><strong>Adres:</strong> {r.firmaAdres || '-'}</div>
                                <div><strong>Başvuru Paketi:</strong> {r.basvuruPaketi || r.paketAdi || '-'}</div>
                                <div><strong>Kayıt Tarihi:</strong> {tarihSaatYaz(r.createdAt)}</div>
                                <div><strong>Başvuru Notu:</strong> {r.kayitNotu || '-'}</div>
                                <div><strong>Admin Notu:</strong> {r.adminNotu || '-'}</div>
                              </div>
                            )}
                          </td>
                          <td style={styles.td}>
                            <div>Paket: <strong>{r.paketAdi || 'Profesyonel'}</strong></div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Modül Paketi: <strong>{modulPaketSablonuBul(r.modulPaketi || r.paketAdi)?.label || r.modulPaketi || 'Premium'}</strong></div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Açık Sekme: <strong>{isletmeSekmeleriniHazirla(r.aktifSekmeler, r.modulPaketi || r.paketAdi).length} / {personelSekmeSecenekleri.length}</strong></div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Aylık: <strong>{Number(r.aylikUcret || 0)} TL</strong></div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Son ödeme: <strong>{r.sonOdemeTarihi || '-'}</strong></div>
                          </td>
                          <td style={styles.td}>
                            <span style={r.durum === 'Aktif' ? styles.badgeActive : styles.badgePending}>{r.durum}</span>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                              Lisans: <strong>{r.lisansDurumu || r.durum}</strong>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                              Tip: <strong>{r.rol === 'owner' ? 'Yönetici / Sahip' : 'Personel'}</strong>
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

            {/* süper admin lisans / paket / ödeme ekranını gösteren kod */}
            {activeTab === 'admin_lisans' && (
              <div style={styles.panelCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '18px' }}>
                  <div>
                    <h2 style={styles.pageTitle}>💳 Lisans & Ödeme Takibi</h2>
                    <p style={{ color: '#64748b', marginTop: '-6px' }}>Müşteri paketlerini, aylık ücretlerini, ödeme tarihlerini ve lisans durumlarını tek ekrandan yönetin.</p>
                  </div>
                  <button
                    type="button"
                    onClick={restoranlariSupabasedenCek}
                    style={styles.btnOrange}
                  >
                    🔄 Firmaları Yenile
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                  <div style={{ ...styles.statCard, margin: 0 }}>
                    <span>Toplam Firma</span>
                    <strong>{adminLisansOzet.toplam}</strong>
                  </div>
                  <div style={{ ...styles.statCard, margin: 0 }}>
                    <span>Aktif Lisans</span>
                    <strong>{adminLisansOzet.aktif}</strong>
                  </div>
                  <div style={{ ...styles.statCard, margin: 0 }}>
                    <span>Yaklaşan Ödeme</span>
                    <strong>{adminLisansOzet.yaklasan}</strong>
                  </div>
                  <div style={{ ...styles.statCard, margin: 0 }}>
                    <span>Geciken</span>
                    <strong>{adminLisansOzet.geciken}</strong>
                  </div>
                  <div style={{ ...styles.statCard, margin: 0 }}>
                    <span>Bekleyen</span>
                    <strong>{adminLisansOzet.bekleyen}</strong>
                  </div>
                  <div style={{ ...styles.statCard, margin: 0 }}>
                    <span>Aylık Tahmini</span>
                    <strong>{adminLisansOzet.aylikTahmini} TL</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '18px' }}>
                  <input
                    value={adminLisansArama}
                    onChange={e => setAdminLisansArama(e.target.value)}
                    placeholder="Firma, yetkili, mail, telefon ara..."
                    style={{ ...styles.input, minWidth: isMobile ? '100%' : '300px' }}
                  />
                  {['Tümü', 'Aktif', 'Yaklaşan Ödeme', 'Geciken', 'Ödeme Bekliyor', 'Askıya Alındı'].map(filtre => (
                    <button
                      key={filtre}
                      type="button"
                      onClick={() => setAdminLisansFiltresi(filtre)}
                      style={adminLisansFiltresi === filtre ? styles.filterBtnActive : styles.filterBtn}
                    >
                      {filtre}
                    </button>
                  ))}
                </div>

                {adminLisansListe.length === 0 ? (
                  <div style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '16px', padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    Bu filtreye uyan firma bulunamadı.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '14px' }}>
                    {adminLisansListe.map(r => {
                      const rozet = lisansRozetiHazirla(r);
                      const kalanGun = rozet.kalanGun;

                      return (
                        <div key={r.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '16px', boxShadow: '0 18px 36px -30px rgba(15,23,42,0.28)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '14px' }}>
                            <div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <strong style={{ color: '#1e293b', fontSize: '17px' }}>🏢 {r.ad}</strong>
                                <span style={{ fontSize: '11px', color: rozet.renk, backgroundColor: rozet.zemin, padding: '5px 9px', borderRadius: '999px', fontWeight: '900' }}>
                                  {rozet.etiket}
                                </span>
                              </div>
                              <div style={{ color: '#64748b', fontSize: '12px', marginTop: '5px' }}>
                                {r.yetkiliAdi ? `${r.yetkiliAdi} / ` : ''}{r.email}{r.firmaTelefon ? ` / ${r.firmaTelefon}` : ''}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button type="button" onClick={() => restoranOdemeAlindi(r)} style={styles.actionBtnApprove}>
                                💰 Ödeme Alındı
                              </button>
                              <button type="button" onClick={() => restoranLisansAskıyaAl(r)} style={styles.actionBtnBlock}>
                                🛑 Askıya Al
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
                            <label style={{ display: 'grid', gap: '5px', fontSize: '12px', color: '#64748b', fontWeight: '800' }}>
                              Paket
                              <select
                                value={r.paketAdi || 'Profesyonel'}
                                onChange={e => restoranLisansAlanGuncelle(r, 'paketAdi', e.target.value)}
                                style={styles.input}
                              >
                                <option>Profesyonel</option>
                                <option>Kurumsal</option>
                                <option>Özel Paket</option>
                              </select>
                            </label>

                            <label style={{ display: 'grid', gap: '5px', fontSize: '12px', color: '#64748b', fontWeight: '800' }}>
                              Aylık Ücret
                              <input
                                type="number"
                                min="0"
                                defaultValue={r.aylikUcret || 699}
                                onBlur={e => restoranLisansAlanGuncelle(r, 'aylikUcret', e.target.value)}
                                style={styles.input}
                              />
                            </label>

                            <label style={{ display: 'grid', gap: '5px', fontSize: '12px', color: '#64748b', fontWeight: '800' }}>
                              Kullanıcı Limiti
                              <input
                                type="number"
                                min="0"
                                defaultValue={r.kullaniciLimiti || 3}
                                onBlur={e => restoranKullaniciLimitiGuncelle(r, e.target.value)}
                                style={styles.input}
                              />
                            </label>

                            <label style={{ display: 'grid', gap: '5px', fontSize: '12px', color: '#64748b', fontWeight: '800' }}>
                              Lisans Durumu
                              <select
                                value={r.lisansDurumu || r.durum || 'Onay Bekliyor'}
                                onChange={e => restoranLisansAlanGuncelle(r, 'lisansDurumu', e.target.value)}
                                style={styles.input}
                              >
                                <option>Aktif</option>
                                <option>Onay Bekliyor</option>
                                <option>Ödeme Bekliyor</option>
                                <option>Askıya Alındı</option>
                                <option>Donduruldu</option>
                              </select>
                            </label>

                            <label style={{ display: 'grid', gap: '5px', fontSize: '12px', color: '#64748b', fontWeight: '800' }}>
                              Ödeme Durumu
                              <select
                                value={r.odemeDurumu || 'Ödeme Bekliyor'}
                                onChange={e => restoranLisansAlanGuncelle(r, 'odemeDurumu', e.target.value)}
                                style={styles.input}
                              >
                                <option>Ödendi</option>
                                <option>Ödeme Bekliyor</option>
                                <option>Gecikti</option>
                                <option>Muaf</option>
                              </select>
                            </label>

                            <label style={{ display: 'grid', gap: '5px', fontSize: '12px', color: '#64748b', fontWeight: '800' }}>
                              Son Ödeme Tarihi
                              <input
                                type="date"
                                value={r.sonOdemeTarihi || ''}
                                onChange={e => restoranLisansAlanGuncelle(r, 'sonOdemeTarihi', e.target.value)}
                                style={styles.input}
                              />
                            </label>

                            <label style={{ display: 'grid', gap: '5px', fontSize: '12px', color: '#64748b', fontWeight: '800' }}>
                              Sonraki Ödeme Tarihi
                              <input
                                type="date"
                                value={r.sonrakiOdemeTarihi || ''}
                                onChange={e => restoranLisansAlanGuncelle(r, 'sonrakiOdemeTarihi', e.target.value)}
                                style={styles.input}
                              />
                            </label>

                            <label style={{ display: 'grid', gap: '5px', fontSize: '12px', color: '#64748b', fontWeight: '800' }}>
                              Son Ödeme Tutarı
                              <input
                                type="number"
                                min="0"
                                defaultValue={r.sonOdemeTutari || r.aylikUcret || 699}
                                onBlur={e => restoranLisansAlanGuncelle(r, 'sonOdemeTutari', e.target.value)}
                                style={styles.input}
                              />
                            </label>

                            <label style={{ display: 'grid', gap: '5px', fontSize: '12px', color: '#64748b', fontWeight: '800' }}>
                              Ödeme Yöntemi
                              <select
                                value={r.sonOdemeYontemi || 'Banka / Havale'}
                                onChange={e => restoranLisansAlanGuncelle(r, 'sonOdemeYontemi', e.target.value)}
                                style={styles.input}
                              >
                                <option>Banka / Havale</option>
                                <option>Nakit</option>
                                <option>Kredi Kartı</option>
                                <option>Online Ödeme</option>
                                <option>Diğer</option>
                              </select>
                            </label>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: '10px', alignItems: 'end', marginTop: '12px' }}>
                            <label style={{ display: 'grid', gap: '5px', fontSize: '12px', color: '#64748b', fontWeight: '800' }}>
                              Lisans / Ödeme Notu
                              <input
                                defaultValue={r.lisansNotu || ''}
                                onBlur={e => restoranLisansAlanGuncelle(r, 'lisansNotu', e.target.value)}
                                placeholder="Örn: WhatsApp ile ödeme hatırlatması yapıldı"
                                style={{ ...styles.input, minWidth: '100%' }}
                              />
                            </label>

                            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px', fontSize: '12px', color: '#475569', minWidth: isMobile ? '100%' : '220px' }}>
                              <div><strong>Kalan gün:</strong> {kalanGun === null ? '-' : kalanGun < 0 ? `${Math.abs(kalanGun)} gün gecikti` : `${kalanGun} gün`}</div>
                              <div><strong>Son ödeme:</strong> {r.sonOdemeTarihi || '-'}</div>
                              <div><strong>Sonraki ödeme:</strong> {r.sonrakiOdemeTarihi || '-'}</div>
                            </div>
                          </div>

                          {restoranModulYetkiPaneli(r)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* süper admin modül yetkileri ekranını gösteren kod */}
            {activeTab === 'admin_moduller' && (
              <div style={styles.panelCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '18px' }}>
                  <div>
                    <h2 style={styles.pageTitle}>🧩 İşletme Modül Yetkileri</h2>
                    <p style={{ color: '#64748b', marginTop: '-6px' }}>Her işletmenin kullanacağı sekmeleri buradan açıp kapatabilirsiniz. Kapalı sekmeler işletme sahibi ve personel panelinde görünmez.</p>
                  </div>
                  <button type="button" onClick={restoranlariSupabasedenCek} style={styles.btnOrange}>
                    🔄 Firmaları Yenile
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                  <div style={{ ...styles.statCard, margin: 0 }}><span>Firma</span><strong>{sahipRestoranlar.length}</strong></div>
                  <div style={{ ...styles.statCard, margin: 0 }}><span>Toplam Sekme</span><strong>{personelSekmeSecenekleri.length}</strong></div>
                  <div style={{ ...styles.statCard, margin: 0 }}><span>Tüm Modüller Açık</span><strong>{sahipRestoranlar.filter(r => isletmeSekmeleriniHazirla(r.aktifSekmeler, r.modulPaketi || r.paketAdi).length === personelSekmeSecenekleri.length).length}</strong></div>
                  <div style={{ ...styles.statCard, margin: 0 }}><span>Kısıtlı Paket</span><strong>{sahipRestoranlar.filter(r => isletmeSekmeleriniHazirla(r.aktifSekmeler, r.modulPaketi || r.paketAdi).length < personelSekmeSecenekleri.length).length}</strong></div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '18px' }}>
                  <input value={adminLisansArama} onChange={e => setAdminLisansArama(e.target.value)} placeholder="Firma, yetkili, mail veya paket ara..." style={{ ...styles.input, minWidth: isMobile ? '100%' : '320px' }} />
                  {modulPaketSablonlari.map(paket => (
                    <span key={paket.key} style={{ fontSize: '11px', color: '#475569', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 9px', borderRadius: '999px', fontWeight: '900' }}>
                      {paket.label}: {paket.sekmeler.length} sekme
                    </span>
                  ))}
                </div>

                {adminLisansListe.length === 0 ? (
                  <div style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '16px', padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    Bu aramaya uyan firma bulunamadı.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '14px' }}>
                    {adminLisansListe.map(r => (
                      <div key={r.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '16px', boxShadow: '0 18px 36px -30px rgba(15,23,42,0.28)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <div>
                            <strong style={{ color: '#1e293b', fontSize: '17px' }}>🏢 {r.ad}</strong>
                            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '5px' }}>
                              {r.yetkiliAdi ? `${r.yetkiliAdi} / ` : ''}{r.email}{r.firmaTelefon ? ` / ${r.firmaTelefon}` : ''}
                            </div>
                          </div>
                          <span style={{ fontSize: '11px', color: '#0f766e', backgroundColor: '#ccfbf1', padding: '5px 9px', borderRadius: '999px', fontWeight: '900' }}>
                            {modulPaketSablonuBul(r.modulPaketi || r.paketAdi)?.label || 'Premium'}
                          </span>
                        </div>

                        {restoranModulYetkiPaneli(r)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* süper admin destek talepleri ekranını gösteren kod */}
            {activeTab === 'admin_destek' && (
              <div style={styles.panelCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '18px' }}>
                  <div>
                    <h2 style={styles.pageTitle}>🛠️ Destek Paneli</h2>
                    <p style={{ color: '#64748b', marginTop: '-6px' }}>Siteden gelen destek ve geliştirme talepleri burada listelenir. Durumu değiştirerek talebi tamamlandı yapabilirsiniz.</p>
                  </div>
                  <button
                    type="button"
                    onClick={destekTalepleriniSupabasedenCek}
                    style={styles.btnOrange}
                  >
                    🔄 Talepleri Yenile
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                  <div style={{ ...styles.statCard, margin: 0 }}>
                    <span>Açık Talepler</span>
                    <strong>{adminDestekAcikSayisi}</strong>
                  </div>
                  <div style={{ ...styles.statCard, margin: 0 }}>
                    <span>Tamamlanan</span>
                    <strong>{adminDestekTamamlananSayisi}</strong>
                  </div>
                  <div style={{ ...styles.statCard, margin: 0 }}>
                    <span>Toplam Talep</span>
                    <strong>{destekTalepleri.length}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  {['Açık', 'Yeni', 'İnceleniyor', 'Tamamlandı', 'Tümü'].map(filtre => (
                    <button
                      key={filtre}
                      type="button"
                      onClick={() => setAdminDestekFiltresi(filtre)}
                      style={adminDestekFiltresi === filtre ? styles.filterBtnActive : styles.filterBtn}
                    >
                      {filtre}
                    </button>
                  ))}
                </div>

                {adminDestekListe.length === 0 ? (
                  <div style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '16px', padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    Bu filtrede destek talebi yok.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '14px' }}>
                    {adminDestekListe.map(t => {
                      const durum = String(t.durum || 'Yeni');
                      const tamamlandi = durum === 'Tamamlandı';

                      return (
                        <div key={t.id} style={{ backgroundColor: '#fff', border: tamamlandi ? '1px solid #bbf7d0' : '1px solid #fed7aa', borderRadius: '18px', padding: '16px', boxShadow: '0 18px 36px -30px rgba(15,23,42,0.28)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                                <strong style={{ color: '#1e293b', fontSize: '16px' }}>🏢 {t.firmaAdi || 'Firma adı yok'}</strong>
                                <span style={{ fontSize: '11px', color: '#0f766e', fontWeight: '900', backgroundColor: '#ccfbf1', padding: '4px 8px', borderRadius: '999px' }}>{t.talepTipi}</span>
                                <span style={{ fontSize: '11px', color: tamamlandi ? '#166534' : '#c2410c', fontWeight: '900', backgroundColor: tamamlandi ? '#dcfce7' : '#ffedd5', padding: '4px 8px', borderRadius: '999px' }}>{durum}</span>
                              </div>
                              <div style={{ color: '#64748b', fontSize: '12px' }}>
                                {t.adSoyad ? `${t.adSoyad} / ` : ''}{t.email}{t.telefon ? ` / ${t.telefon}` : ''}
                              </div>
                              <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>Gönderim: {tarihSaatYaz(t.createdAt)}</div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <select
                                value={durum}
                                onChange={e => destekTalebiDurumGuncelle(t.id, e.target.value)}
                                style={{ ...styles.input, minWidth: '160px', padding: '9px 10px' }}
                              >
                                <option>Yeni</option>
                                <option>İnceleniyor</option>
                                <option>Tamamlandı</option>
                              </select>
                              {durum !== 'Tamamlandı' && (
                                <button type="button" onClick={() => destekTalebiDurumGuncelle(t.id, 'Tamamlandı')} style={styles.actionBtnApprove}>
                                  ✔️ Tamamlandı
                                </button>
                              )}
                            </div>
                          </div>

                          <div style={{ marginTop: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px' }}>
                            <div style={{ color: '#1e293b', fontWeight: '900', marginBottom: '6px' }}>{t.konu || 'Konu yok'}</div>
                            <div style={{ color: '#475569', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{t.mesaj}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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


  smartGuideCard: {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,247,237,0.94))',
    border: '1px solid #fed7aa',
    borderRadius: '22px',
    padding: '18px',
    marginBottom: '16px',
    boxShadow: '0 24px 55px -38px rgba(249,115,22,0.45)',
  },

  smartGuideBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#ffedd5',
    color: '#c2410c',
    border: '1px solid #fed7aa',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '11px',
    fontWeight: '900',
    marginBottom: '8px',
  },

  smartGuideTitle: {
    margin: '0 0 6px',
    color: '#0f172a',
    fontSize: '22px',
    letterSpacing: '-0.02em',
  },

  smartGuideText: {
    margin: 0,
    color: '#64748b',
    fontSize: '13px',
    lineHeight: 1.65,
    fontWeight: '650',
  },

  smartGuideCloseBtn: {
    border: '1px solid #fed7aa',
    backgroundColor: '#fff',
    color: '#9a3412',
    borderRadius: '999px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontWeight: '900',
    fontSize: '12px',
  },

  smartGuideShowBtn: {
    border: '1px solid #fed7aa',
    backgroundColor: '#fff7ed',
    color: '#9a3412',
    borderRadius: '999px',
    padding: '9px 13px',
    cursor: 'pointer',
    fontWeight: '900',
    fontSize: '12px',
    marginBottom: '14px',
    boxShadow: '0 12px 28px -24px rgba(249,115,22,0.55)',
  },

  smartGuideSteps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '10px',
    marginTop: '14px',
  },

  smartGuideStepsMobile: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '8px',
    marginTop: '14px',
  },

  smartGuideStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#fff',
    border: '1px solid #ffedd5',
    borderRadius: '14px',
    padding: '10px 12px',
    color: '#334155',
    fontSize: '12px',
    fontWeight: '850',
  },

  smartGuideStepNo: {
    width: '24px',
    height: '24px',
    borderRadius: '999px',
    backgroundColor: '#f97316',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '900',
    flex: '0 0 24px',
    fontSize: '11px',
  },

  smartGuideActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '14px',
  },

  smartGuideActionBtn: {
    border: 'none',
    backgroundColor: '#0f172a',
    color: '#fff',
    borderRadius: '999px',
    padding: '9px 12px',
    cursor: 'pointer',
    fontWeight: '900',
    fontSize: '12px',
  },

  navSectionTitle: {
    margin: '12px 0 5px',
    color: '#7890a9',
    fontSize: '10px',
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    fontWeight: '900',
    padding: '0 8px',
  },

  sidebarHelpBox: {
    margin: '12px 0',
    backgroundColor: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '14px',
    padding: '10px 12px',
  },

  landingViewport: {
    width: '100%',
    minHeight: '100vh',
    margin: 0,
    padding: 0,
    background: 'radial-gradient(circle at top left, rgba(255,107,53,0.16), transparent 34%), radial-gradient(circle at 80% 8%, rgba(30,41,59,0.12), transparent 32%), #ffffff',
    color: '#0f172a',
  },

  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 4%',
    borderBottom: '1px solid rgba(226,232,240,0.86)',
    backgroundColor: 'rgba(255,255,255,0.88)',
    position: 'sticky',
    top: 0,
    zIndex: 20,
    backdropFilter: 'blur(18px)',
    gap: '16px',
    flexWrap: 'wrap',
    boxShadow: '0 18px 40px -34px rgba(15,23,42,0.35)',
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
    padding: '11px 18px',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, #ff7a3d, #f97316 55%, #ea580c)',
    color: '#fff',
    fontWeight: '900',
    cursor: 'pointer',
    fontSize: '14px',
    boxShadow: '0 16px 34px -16px rgba(249,115,22,0.85)',
  },

  heroSection: {
    display: 'grid',
    gridTemplateColumns: '1.15fr 0.95fr',
    alignItems: 'center',
    gap: '48px',
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '72px 4% 64px',
    position: 'relative',
  },

  heroContent: {
    minWidth: 0,
  },

  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, #fff7ed, #ffffff)',
    color: '#c2410c',
    padding: '9px 15px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: '900',
    border: '1px solid #fed7aa',
    boxShadow: '0 14px 32px -26px rgba(234,88,12,0.75)',
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
    background: 'linear-gradient(135deg, #ff7a3d, #f97316 55%, #ea580c)',
    color: '#fff',
    padding: '15px 25px',
    borderRadius: '14px',
    fontSize: '15px',
    fontWeight: '900',
    cursor: 'pointer',
    boxShadow: '0 22px 50px -20px rgba(249,115,22,0.88)',
  },

  heroSecondaryBtn: {
    border: '1px solid #cbd5e1',
    backgroundColor: 'rgba(255,255,255,0.82)',
    color: '#1e293b',
    padding: '14px 24px',
    borderRadius: '14px',
    fontSize: '15px',
    fontWeight: '900',
    cursor: 'pointer',
    boxShadow: '0 14px 34px -28px rgba(15,23,42,0.35)',
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
    background: 'linear-gradient(180deg, #ffffff, #f8fafc)',
    borderRadius: '26px',
    boxShadow: '0 45px 110px -42px rgba(15,23,42,0.55)',
    border: '1px solid rgba(226,232,240,0.92)',
    overflow: 'hidden',
    transform: 'rotate(-1deg)',
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

  heroPhoneBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    border: '1px solid #cbd5e1',
    backgroundColor: '#fff',
    color: '#0f172a',
    padding: '14px 20px',
    borderRadius: '14px',
    fontSize: '15px',
    fontWeight: '900',
    boxShadow: '0 14px 34px -28px rgba(15,23,42,0.35)',
  },

  trustStripSection: {
    maxWidth: '1240px',
    margin: '-22px auto 0',
    padding: '0 4% 72px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
  },

  trustPillCard: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(226,232,240,0.95)',
    borderRadius: '18px',
    padding: '16px',
    boxShadow: '0 22px 55px -38px rgba(15,23,42,0.32)',
    backdropFilter: 'blur(12px)',
  },

  trustPillIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    fontSize: '20px',
    flex: '0 0 38px',
  },

  trustPillTitle: {
    display: 'block',
    color: '#0f172a',
    fontSize: '14px',
    fontWeight: '900',
    marginBottom: '4px',
  },

  trustPillText: {
    color: '#64748b',
    fontSize: '12px',
    lineHeight: 1.55,
    margin: 0,
    fontWeight: '600',
  },

  landingFloatingCta: {
    position: 'fixed',
    right: '18px',
    bottom: '18px',
    zIndex: 50,
    backgroundColor: 'rgba(255,255,255,0.94)',
    border: '1px solid #e2e8f0',
    borderRadius: '18px',
    padding: '12px',
    boxShadow: '0 26px 62px -30px rgba(15,23,42,0.55)',
    backdropFilter: 'blur(12px)',
  },

  floatingCtaPrimary: {
    border: 'none',
    background: 'linear-gradient(135deg, #ff7a3d, #f97316 55%, #ea580c)',
    color: '#fff',
    borderRadius: '11px',
    padding: '9px 12px',
    fontSize: '12px',
    fontWeight: '900',
    cursor: 'pointer',
  },

  floatingCtaSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    textDecoration: 'none',
    border: '1px solid #cbd5e1',
    backgroundColor: '#fff',
    color: '#0f172a',
    borderRadius: '11px',
    padding: '9px 12px',
    fontSize: '12px',
    fontWeight: '900',
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
    background: 'radial-gradient(circle at 22% 0%, rgba(255,107,53,0.10), transparent 30%), linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
  },

  dashboardLayoutMobile: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minHeight: '100vh',
    margin: 0,
    padding: 0,
    background: 'linear-gradient(180deg, #f8fafc, #eef2ff)',
    overflowX: 'hidden',
  },

  sidebar: {
    width: '270px',
    minWidth: '270px',
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 58%, #111827 100%)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    padding: '22px',
    boxSizing: 'border-box',
    boxShadow: '22px 0 55px -45px rgba(15,23,42,0.75)',
  },

  sidebarMobile: {
    width: '100%',
    minWidth: 0,
    maxHeight: '48vh',
    overflowY: 'auto',
    overflowX: 'hidden',
    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    boxSizing: 'border-box',
    position: 'relative',
    zIndex: 5,
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

  navGroupMobile: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '8px',
    flex: '0 0 auto',
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
    padding: '28px',
    overflowY: 'auto',
    boxSizing: 'border-box',
    minWidth: 0,
  },

  mainContentMobile: {
    width: '100%',
    flex: '0 0 auto',
    padding: '14px',
    overflowY: 'visible',
    overflowX: 'hidden',
    boxSizing: 'border-box',
    minWidth: 0,
  },

  posLayout: {
    display: 'flex',
    gap: '22px',
    minHeight: 'calc(100vh - 52px)',
    alignItems: 'stretch',
  },

  posLayoutMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    minHeight: 'auto',
    alignItems: 'stretch',
    width: '100%',
    maxWidth: '100%',
    overflowX: 'hidden',
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

  mesaGridMobile: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px',
    width: '100%',
  },

  mesaCard: {
    background: 'linear-gradient(180deg, #ffffff, #fbfdff)',
    padding: '22px 16px',
    borderRadius: '20px',
    border: '1px solid rgba(226,232,240,0.95)',
    cursor: 'pointer',
    boxShadow: '0 20px 45px -32px rgba(15,23,42,0.32)',
    textAlign: 'center',
    transition: 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease',
  },

  mesaStatusText: {
    fontSize: '14px',
    fontWeight: '900',
    marginTop: '8px',
  },

  adisyonPanel: {
    width: '390px',
    minWidth: '390px',
    background: 'linear-gradient(180deg, #ffffff, #fbfdff)',
    borderRadius: '22px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid rgba(226,232,240,0.95)',
    boxSizing: 'border-box',
    boxShadow: '0 28px 58px -38px rgba(15,23,42,0.42)',
  },

  adisyonPanelMobile: {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    backgroundColor: '#fff',
    borderRadius: '18px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #e2e8f0',
    boxSizing: 'border-box',
    boxShadow: '0 18px 40px -28px rgba(15,23,42,0.16)',
  },

  yatayKaydirmaSekmeleri: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    overflowX: 'hidden',
    overflowY: 'visible',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: '4px',
    paddingRight: '4px',
    maxWidth: '100%',
    width: '100%',
    boxSizing: 'border-box',
  },

  mobilAdisyonTamEkran: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    width: '100vw',
    height: '100dvh',
    maxWidth: '100vw',
    backgroundColor: '#fff',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    border: 'none',
    borderRadius: 0,
    boxSizing: 'border-box',
    overflowY: 'auto',
    overflowX: 'hidden',
  },

  mobilAdisyonUstBar: {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '8px 0 10px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: '10px',
  },

  mobilAdisyonMasaAdi: {
    fontSize: '17px',
    fontWeight: '900',
    color: '#1e293b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  mobilAdisyonOzetSatiri: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    whiteSpace: 'nowrap',
    WebkitOverflowScrolling: 'touch',
    color: '#475569',
    fontSize: '12px',
    fontWeight: '800',
    marginTop: '5px',
    paddingBottom: '2px',
  },

  mobilAdisyonKapatBtn: {
    width: '38px',
    height: '38px',
    border: 'none',
    borderRadius: '999px',
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '900',
    flex: '0 0 38px',
  },

  mobilAdisyonSekmeKutusu: {
    position: 'sticky',
    top: '62px',
    zIndex: 2,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '8px',
    backgroundColor: '#fff',
    paddingBottom: '10px',
    marginBottom: '10px',
  },

  desktopAdisyonSekmeKutusu: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '8px',
    marginBottom: '10px',
  },

  mobilAdisyonSekme: {
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    color: '#475569',
    padding: '11px 10px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '900',
    fontSize: '13px',
  },

  mobilAdisyonSekmeAktif: {
    border: '1px solid #ff6b35',
    backgroundColor: '#ff6b35',
    color: '#fff',
    padding: '11px 10px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '900',
    fontSize: '13px',
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
    background: 'linear-gradient(180deg, #ffffff, #fbfdff)',
    padding: '22px',
    borderRadius: '22px',
    boxShadow: '0 24px 54px -38px rgba(15,23,42,0.34)',
    boxSizing: 'border-box',
    border: '1px solid rgba(226,232,240,0.95)',
  },

  inlineForm: {
    display: 'flex',
    gap: '8px',
    marginBottom: '15px',
    flexWrap: 'wrap',
  },

  input: {
    padding: '12px 13px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    fontSize: '13px',
    minWidth: '180px',
    backgroundColor: '#fff',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
  },

  btnOrange: {
    background: 'linear-gradient(135deg, #ff7a3d, #f97316 55%, #ea580c)',
    color: '#fff',
    border: 'none',
    padding: '12px 16px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '900',
    fontSize: '13px',
    boxShadow: '0 15px 30px -20px rgba(249,115,22,0.8)',
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
