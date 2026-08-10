import { useEffect, useRef, useState } from 'react';
import { LANDING_DISCOVERY_LINKS, LANDING_SOLUTION_GROUPS } from './landingContent';

function HeaderBrand() {
  return (
    <span className="lp-brand" aria-label="Integra POS">
      <span className="lp-brand-mark">i</span>
      <span className="lp-brand-name lp-brand-name--light">integra</span>
      <span className="lp-brand-pos">POS</span>
    </span>
  );
}

function SolutionLinks({ onNavigate }) {
  return LANDING_SOLUTION_GROUPS.map(grup => (
    <section className="lp-mega-group" key={grup.baslik}>
      <div className="lp-mega-group-title">
        <h2>{grup.baslik}</h2>
        <p>{grup.aciklama}</p>
      </div>
      <div className="lp-mega-links">
        {grup.cozumler.map(cozum => (
          <a href={`/cozumler/${cozum.slug}`} key={cozum.slug} onClick={onNavigate}>
            <span aria-hidden="true">{cozum.icon}</span>
            <div><strong>{cozum.ad}</strong><small>{cozum.kisa}</small></div>
            <b aria-hidden="true">›</b>
          </a>
        ))}
      </div>
    </section>
  ));
}

function DiscoveryLinks({ onNavigate }) {
  return (
    <section className="lp-mega-group lp-mega-group--discovery">
      <div className="lp-mega-group-title">
        <h2>Keşfet</h2>
        <p>Ürünleri, kampanyaları ve bağlantı seçeneklerini inceleyin</p>
      </div>
      <div className="lp-mega-links">
        {LANDING_DISCOVERY_LINKS.map(item => (
          <a href={item.href} key={item.href} onClick={onNavigate}>
            <span aria-hidden="true">{item.icon}</span>
            <div><strong>{item.ad}</strong><small>{item.kisa}</small></div>
            <b aria-hidden="true">›</b>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function LandingHeader({ onLogin, compact = false }) {
  const [megaMenuAcik, setMegaMenuAcik] = useState(false);
  const menuKapatmaZamanlayici = useRef(null);

  const menuKapatmaZamanlayicisiniTemizle = () => {
    if (!menuKapatmaZamanlayici.current) return;
    window.clearTimeout(menuKapatmaZamanlayici.current);
    menuKapatmaZamanlayici.current = null;
  };

  const megaMenuyuAc = () => {
    menuKapatmaZamanlayicisiniTemizle();
    setMegaMenuAcik(true);
  };

  const megaMenuyuGecikmeliKapat = () => {
    menuKapatmaZamanlayicisiniTemizle();
    menuKapatmaZamanlayici.current = window.setTimeout(() => {
      setMegaMenuAcik(false);
      menuKapatmaZamanlayici.current = null;
    }, 320);
  };

  const megaMenuyuHemenKapat = () => {
    menuKapatmaZamanlayicisiniTemizle();
    setMegaMenuAcik(false);
  };

  useEffect(() => () => {
    if (menuKapatmaZamanlayici.current) window.clearTimeout(menuKapatmaZamanlayici.current);
  }, []);

  return (
    <header className={compact ? 'lp-header lp-header--compact' : 'lp-header'}>
      <a className="lp-logo-link" href="/" aria-label="Integra POS ana sayfa"><HeaderBrand /></a>

      <nav className="lp-nav" aria-label="Ana menü">
        <div
          className={megaMenuAcik ? 'lp-mega-trigger is-open' : 'lp-mega-trigger'}
          onMouseEnter={megaMenuyuAc}
          onMouseLeave={megaMenuyuGecikmeliKapat}
          onFocus={megaMenuyuAc}
          onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) megaMenuyuGecikmeliKapat();
          }}
        >
          <button
            type="button"
            aria-expanded={megaMenuAcik}
            aria-controls="landing-solutions-menu"
            onClick={() => {
              menuKapatmaZamanlayicisiniTemizle();
              setMegaMenuAcik(acik => !acik);
            }}
          >
            Çözümler <span aria-hidden="true">⌄</span>
          </button>
          <div id="landing-solutions-menu" className="lp-mega-panel" onMouseEnter={megaMenuyuAc}>
            <aside className="lp-mega-promo">
              <span className="lp-mega-promo-label">INTEGRA ÇÖZÜMLERİ</span>
              <div className="lp-mega-promo-screen" aria-hidden="true">
                <i /><i /><i /><i />
                <strong>Tek merkez</strong><small>Tüm işletme operasyonu</small>
              </div>
              <h2>İşletmenize uyan sistemi birlikte kurun.</h2>
              <p>İhtiyacınız olan modülleri seçin, gereksiz kalabalık olmadan kullanmaya başlayın.</p>
              <a href="/#destek" onClick={megaMenuyuHemenKapat}>Ücretsiz görüşme <span>↗</span></a>
            </aside>
            <div className="lp-mega-groups">
              <SolutionLinks onNavigate={megaMenuyuHemenKapat} />
              <DiscoveryLinks onNavigate={megaMenuyuHemenKapat} />
            </div>
          </div>
        </div>
        <a href="/donanimlar">Ürünler</a>
        <a href="/kampanyalar">Kampanyalar</a>
        <a href="/#isletmeler">İşletmeler</a>
        <a href="/#nasil-calisir">Nasıl çalışır?</a>
      </nav>

      <div className="lp-header-actions">
        <details className="lp-mobile-nav">
          <summary>Menü <span aria-hidden="true">⌄</span></summary>
          <div className="lp-mobile-nav-panel">
            <strong>Çözümler</strong>
            <SolutionLinks />
            <DiscoveryLinks />
            <div className="lp-mobile-main-links">
              <a href="/donanimlar">Ürünler</a>
              <a href="/kampanyalar">Kampanyalar</a>
              <a href="/#isletmeler">İşletmeler</a>
              <a href="/#nasil-calisir">Nasıl çalışır?</a>
            </div>
          </div>
        </details>
        <button type="button" className="lp-login-btn" onClick={onLogin}>Giriş Yap</button>
        <a className="lp-header-cta" href="/#destek">Ücretsiz Görüşme <span aria-hidden="true">↗</span></a>
      </div>
    </header>
  );
}
