import {
  LANDING_ADVANTAGES,
  LANDING_BUSINESS_TYPES,
  LANDING_FAQS,
  LANDING_HERO_FEATURES,
  LANDING_MODULES,
  LANDING_OPERATION_FLOW,
  LANDING_PANEL_PREVIEWS,
  LANDING_SETUP_STEPS,
  LANDING_SUPPORT_TOPICS,
  LANDING_TRUST_FEATURES,
} from './landingContent';
import './landing.css';

const HERO_MODULES = [
  { icon: '▦', title: 'Satış', detail: 'Masa & barkod', tone: 'orange' },
  { icon: '◷', title: 'Randevu', detail: 'Gün planı', tone: 'purple' },
  { icon: '▤', title: 'Stok', detail: 'Depo & şube', tone: 'green' },
  { icon: '₺', title: 'Finans', detail: 'Cari & rapor', tone: 'blue' },
];

function Brand({ light = false }) {
  return (
    <span className="lp-brand" aria-label="Integra POS">
      <span className="lp-brand-mark">i</span>
      <span className={light ? 'lp-brand-name lp-brand-name--light' : 'lp-brand-name'}>integra</span>
      <span className="lp-brand-pos">POS</span>
    </span>
  );
}

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

export default function LandingPage({
  onLogin,
  onRegister,
  onSupportSubmit,
  supportForm,
  setSupportField,
}) {
  return (
    <div className="lp-page">
      <header className="lp-header">
        <a className="lp-logo-link" href="#anasayfa" aria-label="Integra POS ana sayfa"><Brand light /></a>
        <nav className="lp-nav" aria-label="Ana menü">
          <a href="#cozumler">Çözümler</a>
          <a href="#isletmeler">İşletmeler</a>
          <a href="#nasil-calisir">Nasıl çalışır?</a>
          <a href="#paketler">Paketler</a>
          <a href="#destek">İletişim</a>
        </nav>
        <div className="lp-header-actions">
          <button type="button" className="lp-login-btn" onClick={onLogin}>Giriş Yap</button>
          <a className="lp-header-cta" href="#destek">Ücretsiz Görüşme <ArrowIcon /></a>
        </div>
      </header>

      <main>
        <section id="anasayfa" className="lp-hero">
          <div className="lp-hero-glow lp-hero-glow--one" />
          <div className="lp-hero-glow lp-hero-glow--two" />
          <div className="lp-shell lp-hero-grid">
            <div className="lp-hero-copy">
              <div className="lp-kicker"><span>Yeni nesil</span><strong>işletme teknolojileri</strong></div>
              <h1>İşletme yönetiminde<span> hız, kontrol ve sadelik.</span></h1>
              <p className="lp-hero-text">Satıştan randevuya, stoktan depoya, cariden gün sonuna kadar tüm operasyonunuz tek ve anlaşılır bir platformda.</p>
              <div className="lp-hero-actions">
                <a className="lp-primary-btn" href="#destek">Çözümünüzü Planlayalım <ArrowIcon /></a>
                <button type="button" className="lp-ghost-btn" onClick={onLogin}>Müşteri Girişi</button>
              </div>
              <div className="lp-hero-chips" aria-label="Öne çıkan özellikler">
                {LANDING_HERO_FEATURES.slice(0, 4).map(item => <span key={item}>✓ {item}</span>)}
              </div>
            </div>

            <div className="lp-hero-product" aria-label="Integra işletme paneli önizlemesi">
              <div className="lp-product-orbit lp-product-orbit--one" />
              <div className="lp-product-orbit lp-product-orbit--two" />
              <div className="lp-device-shadow" />
              <div className="lp-device">
                <div className="lp-device-topbar"><Brand /><span className="lp-live"><i /> Canlı</span></div>
                <div className="lp-device-body">
                  <aside className="lp-device-side"><span className="is-active">⌂</span><span>▦</span><span>▤</span><span>◷</span><span>⚙</span></aside>
                  <div className="lp-device-content">
                    <div className="lp-device-heading"><div><small>Bugünün özeti</small><strong>Operasyon Merkezi</strong></div><span>09 Ağustos</span></div>
                    <div className="lp-metric-row">
                      <div className="lp-main-metric"><small>Toplam satış</small><strong>₺ 18.460</strong><span>↑ %12,4 dünden</span></div>
                      <div className="lp-mini-chart" aria-hidden="true"><i style={{ height: '31%' }} /><i style={{ height: '45%' }} /><i style={{ height: '38%' }} /><i style={{ height: '72%' }} /><i style={{ height: '58%' }} /><i style={{ height: '88%' }} /></div>
                    </div>
                    <div className="lp-module-grid">
                      {HERO_MODULES.map(module => (
                        <div key={module.title} className={`lp-module-tile lp-module-tile--${module.tone}`}><span>{module.icon}</span><div><strong>{module.title}</strong><small>{module.detail}</small></div></div>
                      ))}
                    </div>
                    <div className="lp-device-feed">
                      <div className="lp-feed-title"><strong>Canlı akış</strong><span>Tümünü gör</span></div>
                      <div><i className="orange" /><span>Market satışı tamamlandı</span><strong>₺ 425</strong></div>
                      <div><i className="purple" /><span>Yeni randevu oluşturuldu</span><strong>14:30</strong></div>
                      <div><i className="green" /><span>Şube sevki teslim alındı</span><strong>24 ürün</strong></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lp-float-card lp-float-card--sales"><span>Bugünkü ciro</span><strong>₺18.460</strong><small>+12,4%</small></div>
              <div className="lp-float-card lp-float-card--stock"><b>✓</b><span><strong>Stok güncel</strong><small>2 sevk onaylandı</small></span></div>
            </div>
          </div>
        </section>

        <section className="lp-proof">
          <div className="lp-shell lp-proof-grid">
            {LANDING_TRUST_FEATURES.map(([icon, title, text]) => <article key={title} className="lp-proof-item"><span className="lp-proof-icon">{icon}</span><div><strong>{title}</strong><p>{text}</p></div></article>)}
          </div>
        </section>

        <section id="isletmeler" className="lp-section lp-business-section">
          <div className="lp-shell">
            <div className="lp-section-heading lp-section-heading--split">
              <div><span className="lp-eyebrow">HER İŞLETMEYE UYUM SAĞLAR</span><h2>Farklı iş modelleri.<br /><em>Tek güçlü altyapı.</em></h2></div>
              <p>Integra, işletmenize gereksiz kalabalık eklemez. Yalnızca ihtiyacınız olan modülleri açar, ekibinizin günlük işini hızlandırır.</p>
            </div>
            <div className="lp-business-pills">{LANDING_BUSINESS_TYPES.map(([icon, title]) => <span key={title}><b>{icon}</b>{title}</span>)}</div>
            <div className="lp-business-showcase">
              {LANDING_PANEL_PREVIEWS.map(([title, text], index) => (
                <article key={title} className={`lp-business-card lp-business-card--${index + 1}`}>
                  <span className="lp-card-index">0{index + 1}</span><div className="lp-business-visual" aria-hidden="true"><span /><span /><span /></div>
                  <h3>{title}</h3><p>{text}</p><a href="#destek" aria-label={`${title} çözümü hakkında bilgi alın`}>Çözümü incele <ArrowIcon /></a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="cozumler" className="lp-section lp-solutions-section">
          <div className="lp-shell">
            <div className="lp-section-heading lp-section-heading--center"><span className="lp-eyebrow">TEK PLATFORM, SINIRSIZ SENARYO</span><h2>Günlük operasyonun her adımı<br /><em>birbiriyle konuşur.</em></h2><p>Dağınık uygulamalar ve tekrar veri girişi yerine, işletmenizin tüm hareketlerini aynı merkezde yönetin.</p></div>
            <div className="lp-solutions-grid">
              {LANDING_MODULES.map(([icon, title, text], index) => (
                <article key={title} className={index === 0 || index === 8 ? 'lp-solution-card lp-solution-card--wide' : 'lp-solution-card'}><span className="lp-solution-icon">{icon}</span><h3>{title}</h3><p>{text}</p><a href="#destek">Bilgi al <ArrowIcon /></a></article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-dark-feature">
          <div className="lp-shell lp-dark-grid">
            <div className="lp-dark-copy"><span className="lp-eyebrow lp-eyebrow--dark">NEDEN INTEGRA?</span><h2>İşletmede hatayı azaltır,<br /><em>kontrolü artırır.</em></h2><p>Satış, randevu, stok, depo, cari ve personel kayıtları birbirinden kopmaz. Yönetici, işletmesinin bugünü ve yarını için aynı veriye bakar.</p><a className="lp-primary-btn" href="#destek">İşletmeniz için keşfedin <ArrowIcon /></a></div>
            <div className="lp-advantage-grid">{LANDING_ADVANTAGES.map(([big, small], index) => <article key={big}><span>0{index + 1}</span><strong>{big}</strong><p>{small}</p></article>)}</div>
          </div>
        </section>

        <section id="nasil-calisir" className="lp-section lp-flow-section">
          <div className="lp-shell">
            <div className="lp-section-heading lp-section-heading--split"><div><span className="lp-eyebrow">KURULUMDAN GÜN SONUNA</span><h2>Karmaşık değil.<br /><em>Adım adım, birlikte.</em></h2></div><p>İşletmenize uygun ekranları birlikte belirler, ürün ve personel kayıtlarını hazırlar, ekibinizin hızla kullanmaya başlamasını sağlarız.</p></div>
            <div className="lp-steps">{LANDING_SETUP_STEPS.map(([no, title, text]) => <article key={no}><span>{no}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
            <div className="lp-flow-strip">{LANDING_OPERATION_FLOW.map(([no, title, text]) => <article key={title}><span>{no}</span><strong>{title}</strong><p>{text}</p></article>)}</div>
          </div>
        </section>

        <section id="paketler" className="lp-section lp-packages-section">
          <div className="lp-shell">
            <div className="lp-section-heading lp-section-heading--center"><span className="lp-eyebrow">ESNEK PAKETLER</span><h2>İhtiyacınız kadarını kullanın.<br /><em>İşletmenizle birlikte büyütün.</em></h2></div>
            <div className="lp-package-grid">
              <article className="lp-package-card lp-package-card--featured"><span className="lp-package-label">En çok tercih edilen</span><h3>Profesyonel</h3><p>Tek veya birkaç noktada satış ve hizmet operasyonunu yöneten işletmeler için.</p><strong className="lp-package-price">Size özel teklif</strong><ul><li>İşletme tipine özel modül seçimi</li><li>Satış, randevu, stok ve müşteri yönetimi</li><li>Cari, finans ve gün sonu raporları</li><li>Personel rolleri ve yetkilendirme</li></ul><button type="button" onClick={() => onRegister('Profesyonel')}>Demo Başvurusu <ArrowIcon /></button></article>
              <article className="lp-package-card"><span className="lp-package-label">Çok şubeli yapı</span><h3>Kurumsal</h3><p>Merkez depo, şube sevki ve ortak raporlama isteyen büyüyen işletmeler için.</p><strong className="lp-package-price">Birlikte planlayalım</strong><ul><li>Çok şubeli merkezi yönetim</li><li>Depo, alış ve sevk iş akışları</li><li>Birleşik finans ve operasyon raporları</li><li>Özel kurulum ve eğitim desteği</li></ul><button type="button" onClick={() => onRegister('Kurumsal')}>Teklif Alın <ArrowIcon /></button></article>
            </div>
          </div>
        </section>

        <section id="destek" className="lp-contact-section">
          <div className="lp-shell lp-contact-grid">
            <div className="lp-contact-copy"><span className="lp-eyebrow lp-eyebrow--dark">BİRLİKTE PLANLAYALIM</span><h2>İşletmenize uygun sistemi<br /><em>birlikte kuralım.</em></h2><p>İşletme tipinizi ve ihtiyacınızı paylaşın. Ekibimiz doğru modülleri, kurulumu ve donanım seçeneklerini sizinle planlasın.</p><div className="lp-support-topics">{LANDING_SUPPORT_TOPICS.map(item => <span key={item}>✓ {item}</span>)}</div><div className="lp-contact-direct"><a href="tel:05325014277"><small>Telefon</small><strong>0532 501 42 77</strong></a><a href="mailto:info@integraposbilisim.com"><small>E-posta</small><strong>info@integraposbilisim.com</strong></a></div></div>
            <form className="lp-contact-form" onSubmit={onSupportSubmit}>
              <div className="lp-form-head"><span>01</span><div><strong>Talebinizi iletin</strong><p>Size en kısa sürede dönüş yapalım.</p></div></div>
              <div className="lp-form-grid">
                <label><span>Ad Soyad</span><input type="text" value={supportForm.adSoyad} onChange={event => setSupportField('adSoyad', event.target.value)} placeholder="Adınız ve soyadınız" /></label>
                <label><span>Firma / İşletme *</span><input type="text" required value={supportForm.firmaAdi} onChange={event => setSupportField('firmaAdi', event.target.value)} placeholder="İşletme adınız" /></label>
                <label><span>E-posta *</span><input type="email" required value={supportForm.email} onChange={event => setSupportField('email', event.target.value)} placeholder="ornek@firma.com" /></label>
                <label><span>Telefon</span><input type="tel" value={supportForm.telefon} onChange={event => setSupportField('telefon', event.target.value)} placeholder="05xx xxx xx xx" /></label>
                <label className="lp-form-full"><span>Talep türü</span><select value={supportForm.talepTipi} onChange={event => setSupportField('talepTipi', event.target.value)}><option>Geliştirme Talebi</option><option>Destek Talebi</option><option>Hata Bildirimi</option><option>Fiş / Yazıcı Talebi</option><option>Kurulum Talebi</option></select></label>
                <label className="lp-form-full"><span>Konu</span><input type="text" value={supportForm.konu} onChange={event => setSupportField('konu', event.target.value)} placeholder="Kısaca ihtiyacınız" /></label>
                <label className="lp-form-full"><span>Mesajınız *</span><textarea required value={supportForm.mesaj} onChange={event => setSupportField('mesaj', event.target.value)} placeholder="İşletmenizi ve kullanmak istediğiniz özellikleri anlatın" /></label>
              </div>
              <button type="submit" className="lp-form-submit">Talebi Gönder <ArrowIcon /></button>
            </form>
          </div>
        </section>

        <section className="lp-section lp-faq-section">
          <div className="lp-shell lp-faq-grid">
            <div className="lp-faq-title"><span className="lp-eyebrow">MERAK EDİLENLER</span><h2>Sık sorulan<br /><em>sorular.</em></h2><p>Aradığınız yanıt burada değilse bize doğrudan ulaşabilirsiniz.</p><a href="#destek">Bize sorun <ArrowIcon /></a></div>
            <div className="lp-faq-list">{LANDING_FAQS.map(([question, answer], index) => <details key={question} open={index === 0}><summary><span>{String(index + 1).padStart(2, '0')}</span>{question}<b>＋</b></summary><p>{answer}</p></details>)}</div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-shell"><div className="lp-footer-top"><div className="lp-footer-brand"><Brand light /><p>Satış, hizmet ve operasyon yönetiminde işletmenizin dijital çalışma merkezi.</p></div><div className="lp-footer-links"><strong>Çözümler</strong><a href="#isletmeler">İşletmeler</a><a href="#cozumler">Modüller</a><a href="#paketler">Paketler</a></div><div className="lp-footer-links"><strong>İletişim</strong><a href="tel:05325014277">0532 501 42 77</a><a href="mailto:info@integraposbilisim.com">info@integraposbilisim.com</a><span>integraposbilisim.com</span></div></div><div className="lp-footer-bottom"><span>© 2026 Integra Yazılım Teknolojileri A.Ş.</span><span>Tüm hakları saklıdır.</span></div></div>
      </footer>
    </div>
  );
}
