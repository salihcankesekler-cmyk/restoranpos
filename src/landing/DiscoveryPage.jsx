import { useEffect } from 'react';
import LandingHeader from './LandingHeader';
import {
  LANDING_CAMPAIGNS,
  LANDING_HARDWARE_CATEGORIES,
} from './landingContent';

const PAGE_INFO = {
  donanimlar: {
    eyebrow: 'POS DONANIMLARI',
    title: 'Satış noktanızı tamamlayan donanımlar.',
    description: 'Dokunmatik bilgisayardan adisyon yazıcısına, yazar kasadan barkod ekipmanına kadar işletmenize uygun ürünleri kategori kategori inceleyin.',
  },
  kampanyalar: {
    eyebrow: 'GÜNCEL FIRSATLAR',
    title: 'Yazılım ve donanımın bir arada olduğu hazır setler.',
    description: 'Yeni işletmeler ve sistemini yenilemek isteyenler için hazırladığımız kampanyalı POS setlerini, içerikleri ve fiyatlarıyla inceleyin.',
  },
  fiyatlandirma: {
    eyebrow: 'ESNEK FİYATLANDIRMA',
    title: 'Yalnızca ihtiyacınız olan sistemi kullanın.',
    description: 'İşletme tipinize, kullanıcı sayınıza, şube yapınıza ve kullanacağınız modüllere göre size uygun paketi birlikte planlayalım.',
  },
  entegrasyonlar: {
    eyebrow: 'BAĞLANTI SEÇENEKLERİ',
    title: 'Satış noktanızdaki cihazlar birlikte çalışsın.',
    description: 'Fiş ve etiket yazıcısı, barkod okuyucu, para çekmecesi ve diğer çevre birimlerini Integra POS akışına bağlayın.',
  },
};

const PRICING_PACKAGES = [
  { ad: 'Başlangıç', kisa: 'Tek satış noktası için temel kullanım', fiyat: 'İşletmeye özel', ozellikler: ['Satış ve ödeme ekranları', 'Ürün ve müşteri yönetimi', 'Gün sonu raporları'] },
  { ad: 'Profesyonel', kisa: 'Operasyonunu tek merkezde yöneten işletmeler', fiyat: 'İşletmeye özel', ozellikler: ['İşletme tipine özel modüller', 'Stok, cari ve personel yetkileri', 'Detaylı satış ve operasyon raporları'] },
  { ad: 'Kurumsal', kisa: 'Şube ve merkez depo kullanan büyüyen yapılar', fiyat: 'Birlikte planlayalım', ozellikler: ['Çok şubeli merkezi yönetim', 'Depo ve şube sevki', 'Ortak finans ve yönetim raporları'] },
];

const INTEGRATIONS = [
  ['🖨️', 'Fiş ve Adisyon Yazıcıları', 'Satış fişlerini, hesap öncesi adisyonları ve mutfak siparişlerini doğru yazıcıya yönlendirin.'],
  ['🏷️', 'Etiket Yazıcıları', 'Barkod ve raf etiketlerini belirlediğiniz ölçüde ürün başına ayrı baskı işi olarak gönderin.'],
  ['▥', 'Barkod Okuyucular', 'USB veya Bluetooth okuyucuyla ürünü anında bulun ve doğrudan satış sepetine ekleyin.'],
  ['▱', 'Para Çekmecesi', 'Uyumlu fiş yazıcısı üzerinden ödeme sonunda para çekmecesini otomatik açın.'],
  ['⚖️', 'Terazi Ürünleri', 'Gramaj veya tutar bilgisiyle terazili ürün satışını hesaplayın ve barkodlu tartım kodlarını okuyun.'],
  ['🖥️', 'Müşteri Ekranı', 'Okutulan ürünleri, toplam tutarı ve ödeme bilgisini müşteriye ikinci ekrandan gösterin.'],
];

function PageFooter() {
  return (
    <footer className="lp-footer lp-discovery-footer">
      <div className="lp-shell"><div className="lp-footer-top"><div className="lp-footer-brand"><strong className="lp-discovery-footer-logo">integra <em>POS</em></strong><p>Satış, hizmet ve operasyon yönetiminde işletmenizin dijital çalışma merkezi.</p></div><div className="lp-footer-links"><strong>Keşfet</strong><a href="/donanimlar">Donanımlar</a><a href="/kampanyalar">Kampanyalar</a><a href="/fiyatlandirma">Fiyatlandırma</a><a href="/entegrasyonlar">Entegrasyonlar</a></div><div className="lp-footer-links"><strong>İletişim</strong><a href="tel:05325014277">0532 501 42 77</a><a href="mailto:info@integraposbilisim.com">info@integraposbilisim.com</a><a href="/">Ana sayfa</a></div></div><div className="lp-footer-bottom"><span>© 2026 Integra Yazılım Teknolojileri A.Ş.</span><span>Tüm hakları saklıdır.</span></div></div>
    </footer>
  );
}

function HardwareCatalog({ onRegister }) {
  return (
    <div className="lp-hardware-catalog">
      {LANDING_HARDWARE_CATEGORIES.map((kategori, kategoriIndex) => (
        <section id={kategori.slug} className={kategoriIndex % 2 ? 'lp-hardware-category lp-hardware-category--soft' : 'lp-hardware-category'} key={kategori.slug}>
          <div className="lp-shell">
            <header className="lp-hardware-category-head"><div><span>{String(kategoriIndex + 1).padStart(2, '0')}</span><h2>{kategori.ad}</h2></div><p>{kategori.aciklama}</p></header>
            <div className="lp-hardware-grid">
              {kategori.urunler.map(urun => (
                <article className="lp-hardware-card" key={urun.ad}>
                  <div className="lp-hardware-visual"><span>{urun.icon}</span><small>INTEGRA DONANIM</small></div>
                  <div className="lp-hardware-copy"><h3>{urun.ad}</h3><p>{urun.aciklama}</p><ul>{urun.ozellikler.map(ozellik => <li key={ozellik}>✓ {ozellik}</li>)}</ul></div>
                  <footer><div><small>Fiyat</small><strong>{urun.fiyat}</strong></div><button type="button" onClick={() => onRegister(urun.ad)}>Bilgi alın <span>↗</span></button></footer>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function CampaignCatalog({ onRegister }) {
  return (
    <section className="lp-campaign-catalog">
      <div className="lp-shell">
        <div className="lp-campaign-catalog-grid">
          {LANDING_CAMPAIGNS.map(kampanya => (
            <article className="lp-campaign-showcase" key={kampanya.ad}>
              <div className="lp-campaign-showcase-media"><img src={kampanya.gorsel} alt={`${kampanya.ad} ürün seti`} /><span>{kampanya.etiket}</span></div>
              <div className="lp-campaign-showcase-copy"><small>HAZIR POS SETİ</small><h2>{kampanya.ad}</h2><p>{kampanya.aciklama}</p><ul>{kampanya.icerik.map(item => <li key={item}><span>✓</span>{item}</li>)}</ul><div className="lp-campaign-showcase-benefits">{kampanya.avantajlar.map(item => <span key={item}>{item}</span>)}</div><footer><div><small>Set fiyatı</small><strong>{kampanya.fiyat}</strong><em>{kampanya.vergi}</em></div><button type="button" onClick={() => onRegister(kampanya.ad)}>Kampanyadan yararlan <span>↗</span></button></footer></div>
            </article>
          ))}
        </div>
        <div className="lp-campaign-note"><span>＋</span><div><strong>Yeni kampanya setleri eklenebilir</strong><p>Yeni bir set oluşturulduğunda görseli, içeriği, eski/yeni fiyatı ve KDV bilgisi bu sayfaya ayrı kart olarak eklenebilir.</p></div></div>
      </div>
    </section>
  );
}

function PricingCatalog({ onRegister }) {
  return <section className="lp-pricing-catalog"><div className="lp-shell"><div className="lp-pricing-grid">{PRICING_PACKAGES.map((paket, index) => <article className={index === 1 ? 'is-featured' : ''} key={paket.ad}><span>{index === 1 ? 'En çok tercih edilen' : 'Integra POS'}</span><h2>{paket.ad}</h2><p>{paket.kisa}</p><strong>{paket.fiyat}</strong><ul>{paket.ozellikler.map(item => <li key={item}>✓ {item}</li>)}</ul><button type="button" onClick={() => onRegister(paket.ad)}>Teklif alın <b>↗</b></button></article>)}</div></div></section>;
}

function IntegrationCatalog({ onRegister }) {
  return <section className="lp-integration-catalog"><div className="lp-shell"><div className="lp-integration-grid">{INTEGRATIONS.map(([icon, title, text], index) => <article key={title}><span className="lp-integration-no">0{index + 1}</span><b>{icon}</b><h2>{title}</h2><p>{text}</p></article>)}</div><div className="lp-integration-cta"><div><span>UYUMLULUK KONTROLÜ</span><h2>Kullandığınız cihazı birlikte kontrol edelim.</h2><p>Marka ve model bilgisini paylaşın; bağlantı yöntemini ve gerekli kurulumu size anlatalım.</p></div><button type="button" onClick={() => onRegister('Entegrasyon')}>Destek alın <span>↗</span></button></div></div></section>;
}

export default function DiscoveryPage({ page, onLogin, onRegister }) {
  const pageInfo = PAGE_INFO[page] || PAGE_INFO.donanimlar;

  useEffect(() => {
    const oncekiBaslik = document.title;
    document.title = `${pageInfo.eyebrow} | Integra POS`;
    window.scrollTo(0, 0);
    return () => { document.title = oncekiBaslik; };
  }, [pageInfo.eyebrow]);

  return (
    <div className="lp-page lp-discovery-page">
      <LandingHeader onLogin={onLogin} compact />
      <main>
        <section className="lp-discovery-hero"><div className="lp-shell"><nav><a href="/">Ana Sayfa</a><span>›</span><small>{pageInfo.eyebrow}</small></nav><span className="lp-discovery-eyebrow">{pageInfo.eyebrow}</span><h1>{pageInfo.title}</h1><p>{pageInfo.description}</p>{page === 'donanimlar' && <div className="lp-hardware-category-links">{LANDING_HARDWARE_CATEGORIES.map(kategori => <a href={`#${kategori.slug}`} key={kategori.slug}>{kategori.ad}</a>)}</div>}</div></section>
        {page === 'donanimlar' && <HardwareCatalog onRegister={onRegister} />}
        {page === 'kampanyalar' && <CampaignCatalog onRegister={onRegister} />}
        {page === 'fiyatlandirma' && <PricingCatalog onRegister={onRegister} />}
        {page === 'entegrasyonlar' && <IntegrationCatalog onRegister={onRegister} />}
      </main>
      <PageFooter />
    </div>
  );
}
