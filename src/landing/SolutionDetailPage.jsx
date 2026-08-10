import { useEffect } from 'react';
import LandingHeader from './LandingHeader';
import { LANDING_SOLUTION_PAGES } from './landingContent';

function DetailBrand() {
  return (
    <span className="lp-brand" aria-label="Integra POS">
      <span className="lp-brand-mark">i</span>
      <span className="lp-brand-name lp-brand-name--light">integra</span>
      <span className="lp-brand-pos">POS</span>
    </span>
  );
}

export default function SolutionDetailPage({ solution, onLogin, onRegister }) {
  useEffect(() => {
    const oncekiBaslik = document.title;
    document.title = `${solution.ad} | Integra POS`;
    window.scrollTo(0, 0);
    return () => { document.title = oncekiBaslik; };
  }, [solution.ad]);

  const ilgiliCozumler = LANDING_SOLUTION_PAGES
    .filter(item => item.slug !== solution.slug)
    .sort((a, b) => Number(b.grup === solution.grup) - Number(a.grup === solution.grup))
    .slice(0, 3);

  return (
    <div className="lp-page lp-detail-page">
      <LandingHeader onLogin={onLogin} compact />
      <main>
        <section className="lp-detail-hero">
          <div className="lp-detail-orbit lp-detail-orbit--one" />
          <div className="lp-detail-orbit lp-detail-orbit--two" />
          <div className="lp-shell lp-detail-hero-grid">
            <div className="lp-detail-copy">
              <nav className="lp-breadcrumb" aria-label="Sayfa yolu"><a href="/">Ana Sayfa</a><span>›</span><small>{solution.grup}</small></nav>
              <span className="lp-detail-label">{solution.etiket}</span>
              <h1>{solution.baslik}</h1>
              <p>{solution.aciklama}</p>
              <div className="lp-detail-actions">
                <button type="button" onClick={() => onRegister(solution.ad)}>Çözüm için teklif alın <span>↗</span></button>
                <a href="tel:05325014277">0532 501 42 77</a>
              </div>
              <div className="lp-detail-suitable">
                <strong>Kimler için?</strong>
                <div>{solution.uygun.map(item => <span key={item}>✓ {item}</span>)}</div>
              </div>
            </div>

            <div className="lp-detail-dashboard" aria-label={`${solution.ad} panel önizlemesi`}>
              <div className="lp-detail-dashboard-head"><DetailBrand /><span><i /> Canlı sistem</span></div>
              <div className="lp-detail-dashboard-body">
                <aside><b className="is-active">{solution.icon}</b><b>⌂</b><b>▦</b><b>▤</b><b>⚙</b></aside>
                <div className="lp-detail-dashboard-content">
                  <div className="lp-detail-dashboard-title"><div><small>{solution.grup}</small><strong>{solution.ad}</strong></div><span>Bugün</span></div>
                  <div className="lp-detail-stat-row">
                    <article><small>Bugünkü işlem</small><strong>148</strong><span>↑ %12,4</span></article>
                    <article><small>Canlı durum</small><strong>Aktif</strong><span>Tüm kayıtlar güncel</span></article>
                  </div>
                  <div className="lp-detail-feature-preview">
                    {solution.ozellikler.slice(0, 4).map(([icon, title], index) => (
                      <article key={title}><span>{icon}</span><div><strong>{title}</strong><i style={{ width: `${82 - (index * 9)}%` }} /></div></article>
                    ))}
                  </div>
                  <div className="lp-detail-chart"><span /><span /><span /><span /><span /><span /><span /></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-detail-features">
          <div className="lp-shell">
            <header className="lp-detail-section-heading"><span>ÇÖZÜMÜN İÇİNDE</span><h2>Günlük işinizi hızlandıran<br /><em>temel özellikler.</em></h2><p>Aynı veriyi tekrar tekrar girmeden, işlemleri birbirine bağlı ve izlenebilir biçimde yürütün.</p></header>
            <div className="lp-detail-feature-grid">
              {solution.ozellikler.map(([icon, title, text], index) => (
                <article key={title}><span className="lp-detail-feature-no">0{index + 1}</span><b>{icon}</b><h3>{title}</h3><p>{text}</p></article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-detail-flow">
          <div className="lp-shell lp-detail-flow-grid">
            <div><span>BAŞTAN SONA TEK AKIŞ</span><h2>İşlem başlar,<br /><em>sonuç rapora yansır.</em></h2><p>Integra POS’ta satış ve operasyon kayıtları birbirinden kopmaz. Yetkili kullanıcı işlemi yürütür, stok ve ödeme hareketleri güncellenir, yönetici sonucu aynı sistemden görür.</p></div>
            <ol>
              <li><span>01</span><div><strong>İşlem oluşturulur</strong><p>Yetkili personel kendi ekranından doğru kayıtla işe başlar.</p></div></li>
              <li><span>02</span><div><strong>Hareketler otomatik işlenir</strong><p>Stok, ödeme, cari ve kullanıcı bilgisi işleme bağlı kalır.</p></div></li>
              <li><span>03</span><div><strong>Sonuç anlık izlenir</strong><p>Yönetici güncel durumu ve geçmiş ayrıntıları raporlarda görür.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="lp-detail-related">
          <div className="lp-shell">
            <header><span>DİĞER ÇÖZÜMLER</span><h2>İşletmenizi tamamlayan çözümler</h2></header>
            <div className="lp-detail-related-grid">
              {ilgiliCozumler.map(item => (
                <a href={`/cozumler/${item.slug}`} key={item.slug}><b>{item.icon}</b><div><small>{item.grup}</small><strong>{item.ad}</strong><p>{item.kisa}</p></div><span>↗</span></a>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-detail-cta">
          <div className="lp-shell"><div><span>İŞLETMENİZE ÖZEL PLANLAMA</span><h2>{solution.ad} çözümünü birlikte kuralım.</h2><p>İhtiyacınız olan ekranları, donanımı ve kullanıcı yetkilerini işletmenize göre birlikte belirleyelim.</p></div><button type="button" onClick={() => onRegister(solution.ad)}>Ücretsiz görüşme <span>↗</span></button></div>
        </section>
      </main>

      <footer className="lp-footer lp-detail-footer">
        <div className="lp-shell"><div className="lp-footer-top"><div className="lp-footer-brand"><DetailBrand /><p>Satış, hizmet ve operasyon yönetiminde işletmenizin dijital çalışma merkezi.</p></div><div className="lp-footer-links"><strong>Çözümler</strong>{LANDING_SOLUTION_PAGES.slice(0, 5).map(item => <a href={`/cozumler/${item.slug}`} key={item.slug}>{item.ad}</a>)}</div><div className="lp-footer-links"><strong>İletişim</strong><a href="tel:05325014277">0532 501 42 77</a><a href="mailto:info@integraposbilisim.com">info@integraposbilisim.com</a><a href="/">Ana sayfa</a></div></div><div className="lp-footer-bottom"><span>© 2026 Integra Yazılım Teknolojileri A.Ş.</span><span>Tüm hakları saklıdır.</span></div></div>
      </footer>
    </div>
  );
}
