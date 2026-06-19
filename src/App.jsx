import React, { useState } from 'react';

export default function App() {
  const [screen, setScreen] = useState('landing');
  const [activeTab, setActiveTab] = useState('masalar');
  const [reportType, setReportType] = useState('gunluk');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [user, setUser] = useState(null);
  const [yeniMasaAdi, setYeniMasaAdi] = useState('');
  const [yeniUrunAdi, setYeniUrunAdi] = useState('');
  const [yeniUrunFiyati, setYeniUrunFiyati] = useState('');
  const [seciliUrunId, setSeciliUrunId] = useState('');
  const [selectedMasaId, setSelectedMasaId] = useState(null);

  // Veritabanı State'leri
  const [restoranlar, setRestoranlar] = useState([
    { id: 1, ad: "Gaziantep Lahmacun & Kebap", email: 'sahip@integra.com', sifre: '123456', durum: 'Aktif', rol: 'owner' },
    { id: 2, ad: 'Gaziantep Lahmacun (Garson)', email: 'garson@integra.com', sifre: '123456', durum: 'Aktif', rol: 'waiter', parentRestaurantId: 1 },
    { id: 3, ad: 'Nişantaşı Brasserie & Cafe', email: 'cafe@integra.com', sifre: '123456', durum: 'Onay Bekliyor', rol: 'owner' },
  ]);

  const [masalar, setMasalar] = useState([
    { id: 101, restaurantId: 1, ad: 'Masa 1', dolu: true, tutar: 400, siparisler: [{ ad: 'Adana Kebap', fiyat: 280, adet: 1 }, { ad: 'Künefe', fiyat: 120, adet: 1 }] },
    { id: 102, restaurantId: 1, ad: 'Masa 2', dolu: false, tutar: 0, siparisler: [] },
    { id: 103, restaurantId: 1, ad: 'Masa 3', dolu: true, tutar: 130, siparisler: [{ ad: 'Mercimek Çorbası', fiyat: 90, adet: 1 }, { ad: 'Ayran', fiyat: 40, adet: 1 }] },
    { id: 104, restaurantId: 3, ad: 'Teras 1', dolu: false, tutar: 0, siparisler: [] },
  ]);

  const [menuUrunleri, setMenuUrunleri] = useState([
    { id: 1, restaurantId: 1, ad: 'Adana Kebap', fiyat: 280, kategori: 'Ana Yemek' },
    { id: 2, restaurantId: 1, ad: 'Ayran', fiyat: 40, kategori: 'İçecek' },
    { id: 3, restaurantId: 1, ad: 'Künefe', fiyat: 120, kategori: 'Tatlı' },
    { id: 4, restaurantId: 1, ad: 'Mercimek Çorbası', fiyat: 90, kategori: 'Çorba' },
    { id: 5, restaurantId: 3, ad: 'Filtre Kahve', fiyat: 110, kategori: 'Kahve' },
  ]);

  const [satisGecmisi, setSatisGecmisi] = useState([
    { id: 501, restaurantId: 1, ad: 'Adana Kebap', fiyat: 280, adet: 4, tarih: '2026-06-19' },
    { id: 502, restaurantId: 1, ad: 'Ayran', fiyat: 40, adet: 6, tarih: '2026-06-19' },
  ]);

  const mevcutRestaurantId = user?.role === 'waiter' ? user?.parentRestaurantId : user?.restaurantId;
  const aktifMasalar = masalar.filter(m => m.restaurantId === mevcutRestaurantId);
  const aktifMenu = menuUrunleri.filter(u => u.restaurantId === mevcutRestaurantId);
  const activeMasa = aktifMasalar.find(m => m.id === selectedMasaId) || aktifMasalar[0];

  // Fonksiyonlar
  const handleLogin = (e) => {
    e.preventDefault();
    const hesap = restoranlar.find(r => r.email === email);
    if (!hesap || hesap.sifre !== password) return alert('Hatalı giriş!');
    setUser({ ...hesap, restaurant: hesap.ad, restaurantId: hesap.id, parentRestaurantId: hesap.parentRestaurantId || hesap.id });
    setScreen('dashboard');
  };

  const masayaSeciliUrunuEkle = () => {
    if (!seciliUrunId) return;
    const urun = aktifMenu.find(u => u.id === parseInt(seciliUrunId));
    setMasalar(masalar.map(m => m.id === selectedMasaId ? { ...m, dolu: true, siparisler: [...m.siparisler, { ...urun, adet: 1 }], tutar: m.tutar + urun.fiyat } : m));
  };

  const adisyonKapat = (id) => {
    setMasalar(masalar.map(m => m.id === id ? { ...m, dolu: false, tutar: 0, siparisler: [] } : m));
    alert('Hesap kapatıldı.');
  };

  const raporlariGetir = () => {
    const bugunStr = new Date().toISOString().split('T')[0];
    const filtrelenmis = satisGecmisi.filter(s => s.restaurantId === mevcutRestaurantId && (reportType === 'gunluk' ? s.tarih === bugunStr : true));
    return { liste: filtrelenmis, toplamCiro: filtrelenmis.reduce((acc, curr) => acc + (curr.fiyat * curr.adet), 0) };
  };

  const raporData = raporlariGetir();

  return (
    <div style={styles.appViewport}>
      {screen === 'landing' && (
        <div style={styles.landingViewport}>
            <header style={styles.navbar}>
                <div style={styles.logoContainer}>● <strong>integra</strong>SaaS</div>
                <button onClick={() => setScreen('login')} style={styles.navbarLoginBtn}>Giriş Yap</button>
            </header>
            <div style={styles.heroSection}>
                <h1>Restoranınızı Yönetin</h1>
                <button onClick={() => setScreen('register')} style={styles.heroMainBtn}>Hemen Başla</button>
            </div>
        </div>
      )}

      {screen === 'login' && (
        <div style={styles.authBg}>
            <div style={styles.authCard}>
                <h3>Giriş Yap</h3>
                <form onSubmit={handleLogin} style={styles.form}>
                    <input type="email" placeholder="E-posta" onChange={e => setEmail(e.target.value)} style={styles.authInput} />
                    <input type="password" placeholder="Şifre" onChange={e => setPassword(e.target.value)} style={styles.authInput} />
                    <button type="submit" style={styles.authBtnOrange}>Giriş</button>
                </form>
            </div>
        </div>
      )}

      {screen === 'dashboard' && (
        <div style={styles.dashboardLayout}>
          <div style={styles.sidebar}>
            <div style={styles.sidebarLogo}>● integra</div>
            <nav style={styles.navGroup}>
              <button onClick={() => setActiveTab('masalar')} style={activeTab === 'masalar' ? styles.navItemActive : styles.navItem}>🪑 Masalar</button>
              <button onClick={() => setActiveTab('raporlar')} style={activeTab === 'raporlar' ? styles.navItemActive : styles.navItem}>📊 Raporlar</button>
            </nav>
            <button onClick={() => setScreen('login')} style={styles.logoutBtn}>Çıkış</button>
          </div>
          
          <div style={styles.mainContent}>
            {activeTab === 'masalar' && (
                <div style={styles.posLayout}>
                    <div style={{flex:2}}>
                        <div style={styles.mesaGrid}>
                            {aktifMasalar.map(m => (
                                <div key={m.id} onClick={() => setSelectedMasaId(m.id)} style={{...styles.mesaCard, backgroundColor: m.dolu ? '#fee2e2' : '#fff'}}>
                                    <div>{m.ad}</div>
                                    <div>{m.tutar} TL</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={styles.adisyonPanel}>
                        <h3>Fiş</h3>
                        <select onChange={e => setSeciliUrunId(e.target.value)} style={styles.panelSelect}>
                            <option value="">Ürün Seç</option>
                            {aktifMenu.map(u => <option key={u.id} value={u.id}>{u.ad}</option>)}
                        </select>
                        <button onClick={masayaSeciliUrunuEkle} style={styles.panelAddBtn}>Ekle</button>
                        <button onClick={() => adisyonKapat(activeMasa.id)} style={styles.checkoutBtn}>Kapat</button>
                    </div>
                </div>
            )}
             {activeTab === 'raporlar' && (
                 <div style={styles.panelCard}>
                    <h2>Ciro: {raporData.toplamCiro} TL</h2>
                 </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}

// STYLES OBJECT
const styles = {
  appViewport: { position: 'fixed', inset: 0, backgroundColor: '#f4f6f8', fontFamily: 'sans-serif', overflow: 'hidden' },
  landingViewport: { width: '100%', height: '100%', overflowY: 'auto' },
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 5%', backgroundColor: '#fff', borderBottom: '1px solid #ddd' },
  logoContainer: { fontSize: '20px', fontWeight: 'bold' },
  navbarLoginBtn: { padding: '10px 20px', backgroundColor: '#ff6b35', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  heroSection: { textAlign: 'center', padding: '100px 20px' },
  heroMainBtn: { padding: '15px 30px', fontSize: '18px', backgroundColor: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  authBg: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f1f5f9' },
  authCard: { padding: '40px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', width: '350px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  authInput: { padding: '12px', border: '1px solid #ccc', borderRadius: '6px' },
  authBtnOrange: { padding: '12px', backgroundColor: '#ff6b35', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  dashboardLayout: { display: 'flex', height: '100vh' },
  sidebar: { width: '250px', backgroundColor: '#1e293b', color: '#fff', padding: '20px' },
  sidebarLogo: { fontSize: '20px', marginBottom: '40px' },
  navGroup: { display: 'flex', flexDirection: 'column', gap: '10px' },
  navItem: { padding: '12px', background: 'transparent', color: '#cbd5e1', border: 'none', textAlign: 'left', cursor: 'pointer' },
  navItemActive: { padding: '12px', background: '#ff6b35', color: '#fff', borderRadius: '8px', textAlign: 'left', border: 'none' },
  logoutBtn: { marginTop: 'auto', padding: '10px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', cursor: 'pointer' },
  mainContent: { flex: 1, padding: '20px', overflowY: 'auto' },
  posLayout: { display: 'flex', gap: '20px' },
  mesaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '15px' },
  mesaCard: { padding: '20px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', border: '1px solid #ddd' },
  adisyonPanel: { width: '300px', backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' },
  panelSelect: { width: '100%', padding: '10px', marginBottom: '10px' },
  panelAddBtn: { width: '100%', padding: '10px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', marginBottom: '20px' },
  checkoutBtn: { width: '100%', padding: '15px', backgroundColor: '#ff6b35', color: '#fff', border: 'none', borderRadius: '8px' },
  panelCard: { padding: '20px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd' }
};