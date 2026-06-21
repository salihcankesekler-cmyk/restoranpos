import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

export default function App() {
  useEffect(() => {
  testConnection()
}, [])

const testConnection = async () => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')

  console.log('SUPABASE DATA:', data)
  console.log('SUPABASE ERROR:', error)
}
  const [screen, setScreen] = useState('landing'); // 'landing', 'login', 'register', 'dashboard'
  const [activeTab, setActiveTab] = useState('masalar'); // 'masalar', 'menu', 'raporlar', 'super_admin'
  const [reportType, setReportType] = useState('gunluk'); // 'gunluk', 'aylik'
  
  // Giriş/Kayıt Form State'leri
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [user, setUser] = useState(null);

  // Form Input State'leri
  const [yeniMasaAdi, setYeniMasaAdi] = useState('');
  const [yeniUrunAdi, setYeniUrunAdi] = useState('');
  const [yeniUrunFiyati, setYeniUrunFiyati] = useState('');
  const [seciliUrunId, setSeciliUrunId] = useState('');
  const [selectedMasaId, setSelectedMasaId] = useState(null);

  // --- RESTORAN / KULLANICI VERİTABANI ---
  const [restoranlar, setRestoranlar] = useState([
    { id: 1, ad: "Gaziantep Lahmacun & Kebap", email: 'sahip@integra.com', sifre: '123456', durum: 'Aktif', rol: 'owner' },
    { id: 2, ad: 'Gaziantep Lahmacun (Garson)', email: 'garson@integra.com', sifre: '123456', durum: 'Aktif', rol: 'waiter', parentRestaurantId: 1 },
    { id: 3, ad: 'Nişantaşı Brasserie & Cafe', email: 'cafe@integra.com', sifre: '123456', durum: 'Onay Bekliyor', rol: 'owner' },
  ]);

  // --- HER İŞLETMEYE ÖZEL MASALAR ---
  const [masalar, setMasalar] = useState([
    { id: 101, restaurantId: 1, ad: 'Masa 1', dolu: true, tutar: 400, siparisler: [{ ad: 'Adana Kebap', fiyat: 280, adet: 1 }, { ad: 'Künefe', fiyat: 120, adet: 1 }] },
    { id: 102, restaurantId: 1, ad: 'Masa 2', dolu: false, tutar: 0, siparisler: [] },
    { id: 103, restaurantId: 1, ad: 'Masa 3', dolu: true, tutar: 130, siparisler: [{ ad: 'Mercimek Çorbası', fiyat: 90, adet: 1 }, { ad: 'Ayran', fiyat: 40, adet: 1 }] },
    { id: 104, restaurantId: 3, ad: 'Teras 1', dolu: false, tutar: 0, siparisler: [] }, 
  ]);

  // --- HER İŞLETMEYE ÖZEL MENÜLER ---
  const [menuUrunleri, setMenuUrunleri] = useState([
    { id: 1, restaurantId: 1, ad: 'Adana Kebap', fiyat: 280, kategori: 'Ana Yemek' },
    { id: 2, restaurantId: 1, ad: 'Ayran', fiyat: 40, kategori: 'İçecek' },
    { id: 3, restaurantId: 1, ad: 'Künefe', fiyat: 120, kategori: 'Tatlı' },
    { id: 4, restaurantId: 1, ad: 'Mercimek Çorbası', fiyat: 90, kategori: 'Çorba' },
    { id: 5, restaurantId: 3, ad: 'Filtre Kahve', fiyat: 110, kategori: 'Kahve' },
  ]);

  // --- SATIŞ GEÇMİŞİ / RAPORLAMA VERİTABANI ---
  const [satisGecmisi, setSatisGecmisi] = useState([
    { id: 501, restaurantId: 1, ad: 'Adana Kebap', fiyat: 280, adet: 4, tarih: '2026-06-19' },
    { id: 502, restaurantId: 1, ad: 'Ayran', fiyat: 40, adet: 6, tarih: '2026-06-19' },
    { id: 503, restaurantId: 1, ad: 'Künefe', fiyat: 120, adet: 12, tarih: '2026-06-05' },
    { id: 504, restaurantId: 1, ad: 'Adana Kebap', fiyat: 280, adet: 8, tarih: '2026-05-20' },
  ]);

  // --- AKTİF KULLANICININ GÖREBİLECEĞİ FİLTRELENMİŞ VERİLER ---
  const mevcutRestaurantId = user?.role === 'waiter' ? user?.parentRestaurantId : user?.restaurantId;
  const aktifMasalar = masalar.filter(m => m.restaurantId === mevcutRestaurantId);
  const aktifMenu = menuUrunleri.filter(u => u.restaurantId === mevcutRestaurantId);

  // --- KONTROLLÜ GİRİŞ SİSTEMİ ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (!email || !password) return alert('Lütfen alanları doldurun.');

    if (email === 'admin@integra.com' && password === 'admin123') {
      setUser({ email, role: 'super_admin', restaurant: 'Integra Sistem Merkezi' });
      setActiveTab('super_admin');
      setScreen('dashboard');
      return;
    }

    const hesap = restoranlar.find(r => r.email === email);
    if (!hesap) return alert('Bu e-posta adresi sistemde kayıtlı değil!');
    if (hesap.sifre !== password) return alert('Hatalı şifre girdiniz!');
    
    if (hesap.durum !== 'Aktif') {
      return alert(`Erişim Engellendi! Hesap Durumunuz: [${hesap.durum}]. Lütfen sistem yöneticisiyle iletişime geçin.`);
    }

    setUser({ 
      email, 
      role: hesap.rol, 
      restaurant: hesap.ad, 
      restaurantId: hesap.id,
      parentRestaurantId: hesap.parentRestaurantId || hesap.id 
    });

    const ilkMasa = masalar.find(m => m.restaurantId === (hesap.parentRestaurantId || hesap.id));
    if (ilkMasa) setSelectedMasaId(ilkMasa.id);

    setActiveTab(hesap.rol === 'waiter' ? 'masalar' : 'raporlar');
    setScreen('dashboard');
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!restaurantName || !email || !password) return alert('Lütfen tüm alanları doldurun!');

    const yeniRestoranId = Date.now();
    const yeni = { id: yeniRestoranId, ad: restaurantName, email, sifre: password, durum: 'Onay Bekliyor', rol: 'owner' };
    
    const defaultMasalar = [
      { id: Date.now() + 1, restaurantId: yeniRestoranId, ad: 'Masa 1', dolu: false, tutar: 0, siparisler: [] },
      { id: Date.now() + 2, restaurantId: yeniRestoranId, ad: 'Masa 2', dolu: false, tutar: 0, siparisler: [] },
      { id: Date.now() + 3, restaurantId: yeniRestoranId, ad: 'Masa 3', dolu: false, tutar: 0, siparisler: [] },
    ];

    setRestoranlar([...restoranlar, yeni]);
    setMasalar([...masalar, ...defaultMasalar]);
    
    alert(`'${restaurantName}' başvurunuz alındı. Süper admin onayından sonra giriş yapabilirsiniz.`);
    setScreen('login');
  };

  const restoranDurumDegistir = (id, yeniDurum) => {
    setRestoranlar(restoranlar.map(r => {
      if (r.id === id || r.parentRestaurantId === id) {
        return { ...r, durum: yeniDurum };
      }
      return r;
    }));
  };

  // --- SİPARİŞ İŞLEMLERİ VE HESAP KAPATMA ---
  const masayaSeciliUrunuEkle = () => {
    if (!seciliUrunId) return alert('Lütfen menüden bir ürün seçin!');
    const urun = aktifMenu.find(u => u.id === parseInt(seciliUrunId));
    if (!urun) return;

    setMasalar(masalar.map(m => {
      if (m.id === selectedMasaId) {
        const mevcutSiparisIndex = m.siparisler.findIndex(s => s.ad === urun.ad);
        let yeniSiparisler = [...m.siparisler];

        if (mevcutSiparisIndex > -1) {
          yeniSiparisler[mevcutSiparisIndex].adet += 1;
        } else {
          yeniSiparisler.push({ ad: urun.ad, fiyat: urun.fiyat, adet: 1 });
        }
        return { ...m, dolu: true, siparisler: yeniSiparisler, tutar: m.tutar + urun.fiyat };
      }
      return m;
    }));
  };

  const adisyondanUrunEksilt = (urunAd) => {
    setMasalar(masalar.map(m => {
      if (m.id === selectedMasaId) {
        const hedefSiparis = m.siparisler.find(s => s.ad === urunAd);
        if (!hedefSiparis) return m;

        let yeniSiparisler = m.siparisler.map(s => {
          if (s.ad === urunAd) {
            return { ...s, adet: s.adet - 1 };
          }
          return s;
        }).filter(s => s.adet > 0);

        const yeniTutar = m.tutar - hedefSiparis.fiyat;
        return { ...m, dolu: yeniSiparisler.length > 0, siparisler: yeniSiparisler, tutar: yeniTutar < 0 ? 0 : yeniTutar };
      }
      return m;
    }));
  };

  const adisyonKapat = (id) => {
    const masa = masalar.find(m => m.id === id);
    if (!masa || masa.siparisler.length === 0) return;

    const bugun = new Date().toISOString().split('T')[0];
    const yeniRaporKayitlari = masa.siparisler.map(s => ({
      id: Date.now() + Math.random(),
      restaurantId: mevcutRestaurantId,
      ad: s.ad,
      fiyat: s.fiyat,
      adet: s.adet,
      tarih: bugun
    }));

    setSatisGecmisi([...satisGecmisi, ...yeniRaporKayitlari]);
    setMasalar(masalar.map(m => m.id === id ? { ...m, dolu: false, tutar: 0, siparisler: [] } : m));
    alert('Hesap kapatıldı ve satış raporlara işlendi.');
  };

  const masaEkle = (e) => {
    e.preventDefault();
    if (!yeniMasaAdi) return;
    setMasalar([...masalar, { id: Date.now(), restaurantId: mevcutRestaurantId, ad: yeniMasaAdi, dolu: false, tutar: 0, siparisler: [] }]);
    setYeniMasaAdi('');
  };

  const urunEkle = (e) => {
    e.preventDefault();
    if (!yeniUrunAdi || !yeniUrunFiyati) return;
    setMenuUrunleri([...menuUrunleri, { id: Date.now(), restaurantId: mevcutRestaurantId, ad: yeniUrunAdi, fiyat: parseFloat(yeniUrunFiyati), kategori: 'Genel' }]);
    setYeniUrunAdi('');
    setYeniUrunFiyati('');
  };

  const raporlariGetir = () => {
    const bugunStr = new Date().toISOString().split('T')[0];
    const buAyStr = bugunStr.substring(0, 7);
    let filtrelenmisSatislar = satisGecmisi.filter(s => s.restaurantId === mevcutRestaurantId);

    if (reportType === 'gunluk') {
      filtrelenmisSatislar = filtrelenmisSatislar.filter(s => s.tarih === bugunStr);
    } else {
      filtrelenmisSatislar = filtrelenmisSatislar.filter(s => s.tarih.startsWith(buAyStr));
    }

    const urunOzetMap = {};
    let toplamCiro = 0;

    filtrelenmisSatislar.forEach(s => {
      const toplamUrunTutari = s.fiyat * s.adet;
      toplamCiro += toplamUrunTutari;
      if (urunOzetMap[s.ad]) {
        urunOzetMap[s.ad].adet += s.adet;
        urunOzetMap[s.ad].ciro += toplamUrunTutari;
      } else {
        urunOzetMap[s.ad] = { adet: s.adet, ciro: toplamUrunTutari, fiyat: s.fiyat };
      }
    });

    return { liste: Object.keys(urunOzetMap).map(key => ({ ad: key, ...urunOzetMap[key] })), toplamCiro };
  };

  const activeMasa = aktifMasalar.find(m => m.id === selectedMasaId) || aktifMasalar[0];
  const raporData = raporlariGetir();

  return (
    <div style={styles.appViewport}>
      
      {/* 1. ANA TANITIM SAYFASI (LANDING PAGE) */}
      {screen === 'landing' && (
        <div style={styles.landingViewport}>
          {/* Üst Menü / Navbar */}
          <header style={styles.navbar}>
            <div style={{...styles.logoContainer, cursor:'pointer'}} onClick={() => setScreen('landing')}>
              <span style={styles.orangeDot}>●</span> <strong style={{color:'#1e293b'}}>integra</strong><span style={{color:'#ff6b35'}}>SaaS</span>
            </div>
            <nav style={styles.landingNavLinks}>
              <a href="#ozellikler" style={styles.navLinkItem}>Özellikler</a>
              <a href="#hakkimizda" style={styles.navLinkItem}>Hakkımızda</a>
            </nav>
            <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
              <button onClick={() => setScreen('login')} style={styles.navbarLoginBtn}>Giriş Yap</button>
              <button onClick={() => setScreen('register')} style={styles.navbarRegisterBtn}>Ücretsiz Dene</button>
            </div>
          </header>

          {/* Hero Kesiti */}
          <section style={styles.heroSection}>
            <div style={styles.heroContent}>
              <span style={styles.heroBadge}>🚀 Yeni Nesil Restoran Bulut POS Sistemi</span>
              <h1 style={styles.heroTitle}>Restoranınızı Cebinizden ve Tabletinizden Yönetin</h1>
              <p style={styles.heroSubtitle}>
                İnternet olan her yerden masalarınızı kontrol edin, sipariş alın ve adisyon yönetimini sıfır hata ile gerçekleştirin. Karmaşık kurulumlara son!
              </p>
              <div style={styles.heroActionGroup}>
                <button onClick={() => setScreen('register')} style={styles.heroMainBtn}>Hemen Başvuru Yapın</button>
                <button onClick={() => setScreen('login')} style={styles.heroSecondaryBtn}>Sistem Demosunu İncele</button>
              </div>
            </div>
            <div style={styles.heroVisual}>
              <div style={styles.mockupCard}>
                <div style={styles.mockupHeader}><span style={{color:'#ef4444'}}>●</span> <span style={{color:'#f59e0b'}}>●</span> <span style={{color:'#10b981'}}>●</span> Canlı POS Önizleme</div>
                <div style={{padding:'15px', fontSize:'13px', color:'#475569'}}>
                  <strong>Salon Planı / Masalar</strong>
                  <div style={{display:'flex', gap:'8px', marginTop:'8px'}}>
                    <div style={{backgroundColor:'#fee2e2', padding:'10px', borderRadius:'6px', flex:1, textAlign:'center', border:'1px solid #fca5a5'}}>Masa 1 <br/><b>400 TL</b></div>
                    <div style={{backgroundColor:'#f8fafc', padding:'10px', borderRadius:'6px', flex:1, textAlign:'center', border:'1px solid #e2e8f0'}}>Masa 2 <br/><span style={{color:'#10b981'}}>Boş</span></div>
                    <div style={{backgroundColor:'#fee2e2', padding:'10px', borderRadius:'6px', flex:1, textAlign:'center', border:'1px solid #fca5a5'}}>Masa 3 <br/><b>130 TL</b></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Özellikler Kesiti */}
          <section id="ozellikler" style={styles.featuresSection}>
            <h2 style={styles.sectionTitle}>Neden Integra Satış Sistemi?</h2>
            <div style={styles.featuresGrid}>
              <div style={styles.featureItem}>
                <div style={styles.featureIcon}>🪑</div>
                <h4>Kolay Adisyon & Masa Yönetimi</h4>
                <p>Görsel masa yerleşimiyle hangi masanın ne kadar süredir açık olduğunu ve sipariş detaylarını anlık görün.</p>
              </div>
              <div style={styles.featureItem}>
                <div style={styles.featureIcon}>📱</div>
                <h4>Garson El Terminali Uyumlu</h4>
                <p>Ekstra lisans ücreti ödemeden garsonlarınızın akıllı telefonlarını anında el terminaline dönüştürün.</p>
              </div>
              <div style={styles.featureItem}>
                <div style={styles.featureIcon}>📊</div>
                <h4>Gelişmiş Ciro Raporları</h4>
                <p>İşletmenizin günlük ve aylık net kâr/satış verilerini grafik ve tablolarla uzaktan takip edin.</p>
              </div>
            </div>
          </section>

          {/* HAKKIMIZDA & İLETİŞİM (FOOTER) KESİTİ */}
          <footer id="hakkimizda" style={styles.footerSection}>
            <div style={styles.footerContainer}>
              <div style={styles.footerColumnWide}>
                <div style={{...styles.logoContainer, marginBottom: '12px'}}>
                  <span style={styles.orangeDot}>●</span> <strong style={{color:'#fff'}}>integra</strong><span style={{color:'#ff6b35'}}>SaaS</span>
                </div>
                <p style={styles.footerText}>
                  Integra, restoran, kafe ve bar gibi hizmet sektöründeki işletmelerin operasyonel verimliliklerini bulut teknolojisiyle artırmak için kurulmuş yenilikçi bir adisyon ve POS yönetim platformudur. Güvenli, izole mimarimiz ve gelişmiş raporlama altyapımızla işletmenizin dijital dönüşüm ortağıyız.
                </p>
              </div>
              <div style={styles.footerColumn}>
                <h4 style={styles.footerHeading}>İletişim Bilgileri</h4>
                <ul style={styles.footerList}>
                  <li style={styles.footerListItem}>📞 <b>Telefon:</b> <a href="tel:05325014277" style={styles.footerLink}>0532 501 42 77</a></li>
                  <li style={styles.footerListItem}>✉️ <b>E-posta:</b> info@integraposbilisim.com</li>
                  <li style={styles.footerListItem}>📍 <b>Merkez:</b> integraposbilisim.com</li>
                </ul>
              </div>
            </div>
            <div style={styles.footerBottom}>
              © 2026 Integra Yazılım Teknolojileri A.Ş. Tüm Hakları Saklıdır.
            </div>
          </footer>
        </div>
      )}

      {/* 2. GİRİŞ EKRANI */}
      {screen === 'login' && (
        <div style={styles.authBg}>
          <div style={styles.authCard}>
            {/* LOGOYA TIKLAYINCA LANDING SAYFASINA DÖNÜŞ DÜZELTİLDİ */}
            <div onClick={() => setScreen('landing')} style={{...styles.logoContainer, cursor:'pointer', marginBottom:'15px', justifyContent:'center'}}>
              <span style={styles.orangeDot}>●</span> <strong style={{color:'#1e293b'}}>integra</strong><span style={{color:'#ff6b35'}}>SaaS</span>
            </div>
            <h3 style={styles.authTitle}>Çoklu İşletme POS Girişi</h3>
            <form onSubmit={handleLogin} style={styles.form}>
              <input type="email" placeholder="E-posta Adresi" value={email} onChange={e => setEmail(e.target.value)} style={styles.authInput} />
              <input type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} style={styles.authInput} />
              <button type="submit" style={styles.authBtnOrange}>Sisteme Giriş Yap</button>
            </form>
            
            {/* EKSTRA GERİ DÖNÜŞ BUTONU */}
            <button onClick={() => setScreen('landing')} style={styles.cancelReturnBtn}>← Ana Sayfaya Geri Dön</button>

            <p style={styles.authFooter}>
              Yeni işletme misiniz? <span onClick={() => setScreen('register')} style={styles.authLink}>Hemen Başvuru Yapın</span>
            </p>
            <div style={styles.demoBox}>
              <strong>🔑 Test Hesapları (Her biri kendi verisini görür):</strong><br/>
              • Gaziantep Kebap Sahibi: <code style={{color:'#ff6b35'}}>sahip@integra.com</code> (Sifre: 123456)<br/>
              • Garson Terminali: <code style={{color:'#ff6b35'}}>garson@integra.com</code> (Sifre: 123456)<br/>
              • Sistem Süper Admini: <code style={{color:'#ff6b35'}}>admin@integra.com</code> (Sifre: admin123)
            </div>
          </div>
        </div>
      )}

      {/* 3. KAYIT EKRANI */}
      {screen === 'register' && (
        <div style={styles.authBg}>
          <div style={styles.authCard}>
            {/* LOGOYA TIKLAYINCA LANDING SAYFASINA DÖNÜŞ DÜZELTİLDİ */}
            <div onClick={() => setScreen('landing')} style={{...styles.logoContainer, cursor:'pointer', marginBottom:'15px', justifyContent:'center'}}>
              <span style={styles.orangeDot}>●</span> <strong style={{color:'#1e293b'}}>integra</strong><span style={{color:'#ff6b35'}}>SaaS</span>
            </div>
            <h3 style={styles.authTitle}>Yeni İzole İşletme Kaydı</h3>
            <form onSubmit={handleRegister} style={styles.form}>
              <input type="text" placeholder="Restoran / Kafe Adı" value={restaurantName} onChange={e => setRestaurantName(e.target.value)} style={styles.authInput} />
              <input type="email" placeholder="Yönetici E-posta Adresi" value={email} onChange={e => setEmail(e.target.value)} style={styles.authInput} />
              <input type="password" placeholder="Şifre Belirleyin" value={password} onChange={e => setPassword(e.target.value)} style={styles.authInput} />
              <button type="submit" style={styles.authBtn}>Kayıt Başvurusunu Gönder</button>
            </form>

            {/* EKSTRA GERİ DÖNÜŞ BUTONU */}
            <button onClick={() => setScreen('landing')} style={styles.cancelReturnBtn}>← Ana Sayfaya Geri Dön</button>

            <p style={styles.authFooter}>
              Zaten hesabınız var mı? <span onClick={() => setScreen('login')} style={styles.authLink}>Giriş Yap</span>
            </p>
          </div>
        </div>
      )}

      {/* 4. MAIN POS & MANAGEMENT DASHBOARD */}
      {screen === 'dashboard' && (
        <div style={styles.dashboardLayout}>
          {/* SIDEBAR */}
          <div style={styles.sidebar}>
            <div style={styles.sidebarLogo} onClick={() => setScreen('landing')} style={{...styles.sidebarLogo, cursor:'pointer'}}><span style={styles.orangeDot}>●</span> integra</div>
            <div style={styles.restaurantBadge}>
              <div style={{fontWeight:'bold', fontSize:'13px'}}>{user?.restaurant}</div>
              <div style={{fontSize:'11px', color:'#a4b5c6'}}>
                {user?.role === 'super_admin' ? 'Global Admin' : user?.role === 'owner' ? 'İşletme Sahibi' : 'Garson Terminali'}
              </div>
            </div>

            <nav style={styles.navGroup}>
              {user?.role === 'owner' && (
                <button onClick={() => setActiveTab('raporlar')} style={activeTab === 'raporlar' ? styles.navItemActive : styles.navItem}>📊 Satış & Ürün Raporları</button>
              )}
              {user?.role !== 'super_admin' && (
                <button onClick={() => setActiveTab('masalar')} style={activeTab === 'masalar' ? styles.navItemActive : styles.navItem}>🪑 Canlı Masalarım</button>
              )}
              {user?.role === 'owner' && (
                <button onClick={() => setActiveTab('menu')} style={activeTab === 'menu' ? styles.navItemActive : styles.navItem}>🍔 Menü & Özel Ayarlar</button>
              )}
              {user?.role === 'super_admin' && (
                <button onClick={() => setActiveTab('super_admin')} style={activeTab === 'super_admin' ? styles.navItemActive : styles.navItem}>👑 Tüm SaaS Müşterileri</button>
              )}
            </nav>
            <button onClick={() => { setScreen('login'); setUser(null); }} style={styles.logoutBtn}>Çıkış Yap</button>
          </div>

          {/* MAIN CONTENT CONTAINER */}
          <div style={styles.mainContent}>
            
            {/* MASALARIM SEKME PANELİ */}
            {activeTab === 'masalar' && (
              <div style={styles.posLayout}>
                <div style={{flex: 1}}>
                  <div style={styles.contentHeader}>
                    <h2 style={styles.pageTitle}>Canlı Salon Planı</h2>
                    {user?.role === 'owner' && (
                      <form onSubmit={masaEkle} style={{display:'flex', gap:'8px'}}>
                        <input type="text" placeholder="Masa İsmi" value={yeniMasaAdi} onChange={e => setYeniMasaAdi(e.target.value)} style={styles.tableInputMini} />
                        <button type="submit" style={styles.addBtnMini}>+ Masa</button>
                      </form>
                    )}
                  </div>
                  
                  {aktifMasalar.length === 0 ? (
                    <div style={{color:'#64748b'}}>Henüz tanımlı masanız yok. Ayarlar sekmesinden ekleyin.</div>
                  ) : (
                    <div style={styles.mesaGrid}>
                      {aktifMasalar.map(m => (
                        <div key={m.id} onClick={() => setSelectedMasaId(m.id)} style={{...styles.mesaCard, borderColor: m.id === (selectedMasaId || aktifMasalar[0]?.id) ? '#ff6b35' : 'transparent', backgroundColor: m.dolu ? '#fee2e2' : '#fff'}}>
                          <div style={{fontWeight:'bold', color:'#1e293b'}}>{m.ad}</div>
                          <div style={{...styles.mesaStatusText, color: m.dolu ? '#ef4444' : '#10b981'}}>{m.dolu ? `${m.tutar} TL` : 'Boş'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SAĞ ADİSYON SİPARİŞ PANELİ */}
                <div style={styles.adisyonPanel}>
                  <h3 style={styles.panelTitle}>🧾 {activeMasa ? activeMasa.ad : 'Masa Seçilmedi'} Canlı Fişi</h3>
                  {activeMasa && (
                    <>
                      <div style={styles.addOrderBox}>
                        <select value={seciliUrunId} onChange={e => setSeciliUrunId(e.target.value)} style={styles.panelSelect}>
                          <option value="">-- Menüden Ürün Seç --</option>
                          {aktifMenu.map(u => <option key={u.id} value={u.id}>{u.ad} ({u.fiyat} TL)</option>)}
                        </select>
                        <button onClick={masayaSeciliUrunuEkle} style={styles.panelAddBtn}>Ekle</button>
                      </div>

                      <div style={styles.receiptContainer}>
                        {(!activeMasa.siparisler || activeMasa.siparisler.length === 0) ? (
                          <div style={styles.emptyReceipt}>Bu masada aktif sipariş yok.</div>
                        ) : (
                          activeMasa.siparisler.map((s, idx) => (
                            <div key={idx} style={styles.receiptRow}>
                              <span>{s.adet}x {s.ad} ({s.fiyat * s.adet} TL)</span>
                              <button onClick={() => adisyondanUrunEksilt(s.ad)} style={styles.deleteItemBtn} title="1 Adet Eksilt">❌</button>
                            </div>
                          ))
                        )}
                      </div>

                      <div style={styles.receiptFooter}>
                        <div style={styles.totalRow}>
                          <span>Toplam:</span>
                          <span style={{fontSize:'22px', color:'#ff6b35', fontWeight:'800'}}>{activeMasa.tutar} TL</span>
                        </div>
                        {activeMasa.dolu && <button onClick={() => adisyonKapat(activeMasa.id)} style={styles.checkoutBtn}>Hesabı Kapat (Nakit/Kredi)</button>}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* MENÜ & AYARLAR SEKMESİ */}
            {activeTab === 'menu' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>Restoran Menü Yönetimi</h2>
                <p style={{color:'#64748b', fontSize:'13px', marginBottom:'15px'}}>Buraya eklediğiniz ürünleri sadece sizin garsonlarınız ve siz görebilirsiniz.</p>
                <form onSubmit={urunEkle} style={styles.inlineForm}>
                  <input type="text" placeholder="Ürün Adı" value={yeniUrunAdi} onChange={e => setYeniUrunAdi(e.target.value)} style={styles.input} />
                  <input type="number" placeholder="Fiyat (TL)" value={yeniUrunFiyati} onChange={e => setYeniUrunFiyati(e.target.value)} style={styles.input} />
                  <button type="submit" style={styles.btnOrange}>Menüye Ekle</button>
                </form>
                
                <h3 style={{fontSize:'15px', color:'#1e293b', marginTop:'20px'}}>Mevcut Aktif Menünüz</h3>
                {aktifMenu.length === 0 ? <p style={{color:'#94a3b8', fontSize:'13px'}}>Henüz ürün eklenmemiş.</p> : aktifMenu.map(u => (
                  <div key={u.id} style={styles.dataRow}>
                    <span>🍽️ {u.ad}</span>
                    <span style={styles.priceTag}>{u.fiyat} TL</span>
                  </div>
                ))}
              </div>
            )}

            {/* RAPORLAR SEKMESİ */}
            {activeTab === 'raporlar' && (
              <div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                  <h2 style={styles.pageTitle}>📊 İşletme Performans Raporları</h2>
                  <div style={styles.filterButtonGroup}>
                    <button onClick={() => setReportType('gunluk')} style={reportType === 'gunluk' ? styles.filterBtnActive : styles.filterBtn}>Günlük Rapor</button>
                    <button onClick={() => setReportType('aylik')} style={reportType === 'aylik' ? styles.filterBtnActive : styles.filterBtn}>Aylık Rapor</button>
                  </div>
                </div>

                <div style={styles.statsGrid}>
                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>{reportType === 'gunluk' ? 'Bugünkü Toplam Net Ciro' : 'Bu Ayki Toplam Net Ciro'}</div>
                    <div style={{...styles.statsValue, color:'#10b981'}}>{raporData.toplamCiro} TL</div>
                  </div>
                  <div style={styles.statsCard}>
                    <div style={styles.statsTitle}>Şu An Açık Masalardaki Bekleyen Tutar</div>
                    <div style={styles.statsValue}>{aktifMasalar.reduce((acc, curr) => acc + curr.tutar, 0)} TL</div>
                  </div>
                </div>

                <div style={{...styles.panelCard, marginTop:'25px'}}>
                  <h3 style={{fontSize:'16px', margin:'0 0 15px 0', color:'#1e293b'}}>📦 Ürün Satış Analizleri</h3>
                  {raporData.liste.length === 0 ? (
                    <div style={{color:'#94a3b8', fontSize:'14px', textAlign:'center', padding:'30px'}}>Bu periyotta henüz kapatılmış bir adisyon satışı bulunmuyor.</div>
                  ) : (
                    <table style={styles.table}>
                      <thead>
                        <tr style={{backgroundColor:'#f8fafc'}}>
                          <th style={styles.th}>Ürün Adı</th>
                          <th style={styles.th}>Birim Fiyatı</th>
                          <th style={styles.th}>Toplam Satış Adeti</th>
                          <th style={styles.th}>Oluşturduğu Toplam Ciro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {raporData.liste.map((item, idx) => (
                          <tr key={idx} style={styles.tr}>
                            <td style={{...styles.td, fontWeight:'bold'}}>🍔 {item.ad}</td>
                            <td style={styles.td}>{item.fiyat} TL</td>
                            <td style={{...styles.td, color:'#ff6b35', fontWeight:'bold'}}>{item.adet} Adet</td>
                            <td style={{...styles.td, fontWeight:'bold'}}>{item.ciro} TL</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* SÜPER ADMİN SEKMESİ */}
            {activeTab === 'super_admin' && (
              <div style={styles.panelCard}>
                <h2 style={styles.pageTitle}>👑 Global SaaS Müşteri Yönetimi</h2>
                <table style={styles.table}>
                  <thead>
                    <tr style={{backgroundColor:'#f8fafc'}}>
                      <th style={styles.th}>İşletme Bilgileri</th>
                      <th style={styles.th}>Kullanıcı Tipi</th>
                      <th style={styles.th}>Lisans Durumu</th>
                      <th style={styles.th} style={{textAlign:'right', paddingRight:'15px'}}>Yönetim Aksiyonları</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restoranlar.map(r => (
                      <tr key={r.id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={{fontWeight:'bold', color:'#1e293b'}}>💼 {r.ad}</div>
                          <div style={{fontSize:'12px', color:'#64748b'}}>{r.email}</div>
                        </td>
                        <td style={styles.td}>{r.rol === 'owner' ? 'Yönetici / Sahip' : 'Garson Terminali'}</td>
                        <td style={styles.td}>
                          <span style={r.durum === 'Aktif' ? styles.badgeActive : styles.badgePending}>{r.durum}</span>
                        </td>
                        <td style={{...styles.td, textAlign:'right'}}>
                          {r.durum !== 'Aktif' ? (
                            <button onClick={() => restoranDurumDegistir(r.id, 'Aktif')} style={styles.actionBtnApprove}>✔️ Aktif Et</button>
                          ) : (
                            <button onClick={() => restoranDurumDegistir(r.id, 'Donduruldu')} style={styles.actionBtnBlock}>🛑 Kapat</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

// ================= INTEGRA STYLES =================
const styles = {
  appViewport: { position: 'fixed', inset: 0, margin: 0, padding: 0, backgroundColor: '#f4f6f8', fontFamily: 'sans-serif', overflow: 'hidden', width: '100vw', height: '100vh' },
  
  // LANDING PAGE TASARIM ŞABLONLARI
  landingViewport: { width: '100vw', height: '100vh', overflowY: 'auto', backgroundColor: '#ffffff', color: '#1e293b' },
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 5%', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff', position:'sticky', top:0, zIndex: 10 },
  landingNavLinks: { display: 'flex', gap: '30px' },
  navLinkItem: { textDecoration: 'none', color: '#475569', fontSize: '14px', fontWeight: '500', transition: '0.2s' },
  navbarLoginBtn: { border: '1px solid #cbd5e1', padding: '8px 20px', borderRadius: '8px', backgroundColor: 'transparent', color: '#1e293b', fontWeight: '600', cursor: 'pointer', fontSize:'14px' },
  navbarRegisterBtn: { border: 'none', padding: '9px 20px', borderRadius: '8px', backgroundColor: '#ff6b35', color: '#fff', fontWeight: '600', cursor: 'pointer', fontSize:'14px' },
  
  heroSection: { display: 'flex', alignItems: 'center', padding: '60px 5%', gap: '40px', maxWidth: '1200px', margin: '0 auto', flexWrap: 'wrap' },
  heroContent: { flex: 1, minWidth: '320px' },
  heroBadge: { backgroundColor: '#fff7ed', color: '#ea580c', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #ffedd5' },
  heroTitle: { fontSize: '42px', fontWeight: '800', color: '#0f172a', margin: '20px 0 15px 0', lineHeight: '1.2' },
  heroSubtitle: { fontSize: '16px', color: '#475569', lineHeight: '1.6', marginBottom: '30px' },
  heroActionGroup: { display: 'flex', gap: '15px' },
  heroMainBtn: { border: 'none', backgroundColor: '#1e293b', color: '#fff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  heroSecondaryBtn: { border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' },
  heroVisual: { flex: 1, minWidth: '320px', display: 'flex', justifyContent: 'center' },
  mockupCard: { width: '100%', maxWidth: '450px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', overflow: 'hidden' },
  mockupHeader: { backgroundColor: '#f8fafc', padding: '10px 15px', borderBottom: '1px solid #e2e8f0', fontSize: '12px', color: '#94a3b8', display: 'flex', gap: '6px', alignItems: 'center' },
  
  featuresSection: { padding: '60px 5%', backgroundColor: '#f8fafc', textAlign: 'center', borderTop: '1px solid #e2e8f0' },
  sectionTitle: { fontSize: '26px', fontWeight: '800', color: '#1e293b', marginBottom: '40px' },
  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', maxWidth: '1200px', margin: '0 auto' },
  featureItem: { backgroundColor: '#fff', padding: '30px 20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', textAlign: 'left' },
  featureIcon: { fontSize: '32px', marginBottom: '15px' },

  // FOOTER (HAKKIMIZDA & İLETİŞİM DÜZENİ)
  footerSection: { backgroundColor: '#1e293b', color: '#cbd5e1', padding: '50px 5% 20px 5%', borderTop: '4px solid #ff6b35' },
  footerContainer: { display: 'flex', justifyContent: 'space-between', gap: '40px', maxWidth: '1200px', margin: '0 auto', flexWrap: 'wrap' },
  footerColumnWide: { flex: 2, minWidth: '300px' },
  footerColumn: { flex: 1, minWidth: '250px' },
  footerHeading: { color: '#ffffff', fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' },
  footerText: { fontSize: '13px', lineHeight: '1.6', color: '#94a3b8', textAlign: 'justify' },
  footerList: { listStyle: 'none', padding: 0, margin: 0 },
  footerListItem: { fontSize: '13px', marginBottom: '10px', color: '#cbd5e1' },
  footerLink: { color: '#ff6b35', textDecoration: 'none', fontWeight: 'bold' },
  footerBottom: { textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '40px', paddingTop: '20px', fontSize: '12px', color: '#64748b' },

  // GİRİŞ / PANEL STRÜKTÜRLERİ
  authBg: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%', backgroundColor: '#f8fafc' },
  authCard: { backgroundColor: '#fff', padding: '35px', borderRadius: '16px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', boxSizing:'border-box' },
  logoContainer: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '24px', fontWeight: '800' },
  orangeDot: { color: '#ff6b35' },
  authTitle: { textAlign: 'center', color: '#1e293b', fontSize: '15px', margin: '5px 0 15px 0' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  authInput: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' },
  authBtn: { padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontWeight: 'bold', cursor: 'pointer' },
  authBtnOrange: { padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#ff6b35', color: '#fff', fontWeight: 'bold', cursor: 'pointer' },
  cancelReturnBtn: { marginTop: '8px', width: '100%', padding: '10px', border: '1px dashed #cbd5e1', borderRadius: '8px', backgroundColor: 'transparent', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' },
  authFooter: { textAlign: 'center', fontSize: '13px', color: '#64748b', marginTop: '15px' },
  authLink: { color: '#ff6b35', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' },
  demoBox: { marginTop: '15px', padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '8px', fontSize: '11px', color: '#475569', lineHeight: '1.5', border:'1px dashed #cbd5e1' },

  sidebar: { width: '260px', backgroundColor: '#1e293b', color: '#fff', display: 'flex', flexDirection: 'column', padding: '20px', boxSizing: 'border-box' },
  sidebarLogo: { fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' },
  restaurantBadge: { backgroundColor: 'rgba(255,255,255,0.07)', padding: '12px', borderRadius: '8px', marginBottom: '20px' },
  navGroup: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  navItem: { display: 'block', width: '100%', padding: '12px', border: 'none', backgroundColor: 'transparent', color: '#94a3b8', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', fontSize:'14px' },
  navItemActive: { display: 'block', width: '100%', padding: '12px', border: 'none', backgroundColor: '#ff6b35', color: '#fff', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold', fontSize:'14px' },
  logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  
  mainContent: { flex: 1, padding: '25px', overflowY: 'auto', boxSizing: 'border-box' },
  posLayout: { display: 'flex', gap: '20px', height: '100%', alignItems: 'stretch' },
  contentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  pageTitle: { fontSize: '18px', color: '#1e293b', fontWeight: 'bold', margin: 0 },
  
  tableInputMini: { padding:'6px 10px', borderRadius:'6px', border:'1px solid #cbd5e1', outline:'none', fontSize:'13px' },
  addBtnMini: { backgroundColor:'#1e293b', color:'#fff', border:'none', padding:'6px 12px', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', fontSize:'13px' },
  
  mesaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' },
  mesaCard: { backgroundColor: '#fff', padding: '20px 15px', borderRadius: '12px', border: '2px solid transparent', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.01)', textAlign: 'center' },
  mesaStatusText: { fontSize: '14px', fontWeight: '800', marginTop: '6px' },

  adisyonPanel: { width: '360px', backgroundColor: '#fff', borderRadius: '14px', padding: '15px', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
  panelTitle: { fontSize: '15px', color: '#1e293b', margin: '0 0 12px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' },
  addOrderBox: { display: 'flex', gap: '6px', marginBottom: '12px' },
  panelSelect: { flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize:'13px' },
  panelAddBtn: { backgroundColor: '#ff6b35', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize:'13px' },
  receiptContainer: { flex: 1, border: '1px dashed #cbd5e1', borderRadius: '8px', backgroundColor: '#fbfbfb', padding: '12px', overflowY: 'auto' },
  emptyReceipt: { textAlign: 'center', color: '#94a3b8', fontSize: '12px', marginTop: '20px' },
  receiptRow: { display: 'flex', justifyContent: 'space-between', alignItems:'center', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' },
  deleteItemBtn: { backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '2px 6px' },
  
  receiptFooter: { marginTop: '15px', borderTop: '2px solid #1e293b', paddingTop: '10px' },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', marginBottom: '12px' },
  checkoutBtn: { width: '100%', backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize:'14px' },

  panelCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)', boxSizing: 'border-box' },
  inlineForm: { display: 'flex', gap: '8px', marginBottom: '15px' },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize:'13px' },
  btnOrange: { backgroundColor: '#ff6b35', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize:'13px' },
  dataRow: { display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', marginBottom: '6px', fontSize:'13px' },
  priceTag: { fontWeight: 'bold', color: '#ff6b35' },

  filterButtonGroup: { display: 'flex', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '8px', gap: '4px' },
  filterBtn: { border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', backgroundColor: 'transparent', color: '#475569', fontWeight:'500' },
  filterBtnActive: { border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', backgroundColor: '#fff', color: '#1e293b', fontWeight: 'bold', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },

  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  statsCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' },
  statsTitle: { fontSize: '13px', color: '#64748b' },
  statsValue: { fontSize: '22px', fontWeight: 'bold', color: '#1e293b', marginTop: '6px' },

  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  th: { padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '12px' },
  td: { padding: '10px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', color: '#334155', verticalAlign: 'middle' },
  
  badgeActive: { backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
  badgePending: { backgroundColor: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },

  actionBtnApprove: { backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  actionBtnBlock: { backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }
};