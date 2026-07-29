import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  kuaforHizmetiKaydet,
  kuaforMusterisiKaydet,
  kuaforPersoneliKaydet,
  kuaforRandevuDurumunuGuncelle,
  kuaforRandevusuKaydet,
  kuaforVerileriniGetir,
} from '../services/kuaforService';
import './kuafor.css';

const GUN_BASLANGIC_DAKIKA = 8 * 60;
const GUN_BITIS_DAKIKA = 21 * 60;
const DAKIKA_PIKSEL = 1.05;

const ikiHane = deger => String(deger).padStart(2, '0');
const bugunYerel = () => {
  const tarih = new Date();
  return `${tarih.getFullYear()}-${ikiHane(tarih.getMonth() + 1)}-${ikiHane(tarih.getDate())}`;
};
const yerelTarih = deger => {
  const tarih = new Date(deger);
  return `${tarih.getFullYear()}-${ikiHane(tarih.getMonth() + 1)}-${ikiHane(tarih.getDate())}`;
};
const yerelSaat = deger => {
  const tarih = new Date(deger);
  return `${ikiHane(tarih.getHours())}:${ikiHane(tarih.getMinutes())}`;
};
const para = deger => Number(deger || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tarihBasligi = tarih => new Date(`${tarih}T12:00:00`).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const durumSinifi = durum => String(durum || '').toLocaleLowerCase('tr-TR').replaceAll(' ', '-').replaceAll('ı', 'i').replaceAll('ş', 's').replaceAll('ç', 'c').replaceAll('ğ', 'g').replaceAll('ü', 'u').replaceAll('ö', 'o');

const bosRandevu = tarih => ({
  musteriId: '',
  musteriAdi: '',
  telefon: '',
  personelId: '',
  hizmetId: '',
  tarih,
  saat: '09:00',
  sureDakika: '30',
  ucret: '',
  kapora: '',
  kullanilanMalzemeler: '',
  notMetni: '',
});

const bosMusteri = { ad: '', telefon: '', email: '', dogumTarihi: '', notMetni: '' };
const bosPersonel = { ad: '', telefon: '', uzmanlik: '', renk: '#7c3aed', sira: '' };
const bosHizmet = { hizmetAdi: '', kategori: 'Saç', sureDakika: '30', fiyat: '', renk: '#f97316' };

export default function KuaforApp({ restaurantId, restaurantName, notify }) {
  const [aktifSekme, setAktifSekme] = useState('plan');
  const [seciliTarih, setSeciliTarih] = useState(bugunYerel());
  const [seciliPersonelFiltresi, setSeciliPersonelFiltresi] = useState('tumu');
  const [veriler, setVeriler] = useState({ personeller: [], hizmetler: [], musteriler: [], randevular: [] });
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islemYukleniyor, setIslemYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [randevuFormu, setRandevuFormu] = useState(() => bosRandevu(bugunYerel()));
  const [duzenlenenRandevuId, setDuzenlenenRandevuId] = useState(null);
  const [seciliRandevuId, setSeciliRandevuId] = useState(null);
  const [musteriArama, setMusteriArama] = useState('');
  const [acikMusteriId, setAcikMusteriId] = useState(null);
  const [musteriFormu, setMusteriFormu] = useState(bosMusteri);
  const [personelFormu, setPersonelFormu] = useState(bosPersonel);
  const [hizmetFormu, setHizmetFormu] = useState(bosHizmet);

  const mesajGoster = useCallback((mesaj, tip = 'info') => {
    if (typeof notify === 'function') notify(mesaj, tip);
  }, [notify]);

  const yenile = useCallback(async ({ sessiz = false } = {}) => {
    if (!restaurantId) return;
    if (!sessiz) setYukleniyor(true);
    setHata('');

    try {
      const sonuc = await kuaforVerileriniGetir(restaurantId);
      setVeriler(sonuc);
    } catch (error) {
      setHata(error?.message || 'Kuaför verileri yüklenemedi.');
    } finally {
      if (!sessiz) setYukleniyor(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    const zamanlayici = window.setTimeout(() => yenile(), 0);
    return () => window.clearTimeout(zamanlayici);
  }, [yenile]);

  const islemCalistir = async (calistir, basariMesaji) => {
    setIslemYukleniyor(true);
    setHata('');
    try {
      await calistir();
      mesajGoster(basariMesaji, 'success');
      await yenile({ sessiz: true });
      return true;
    } catch (error) {
      const mesaj = error?.message || 'İşlem tamamlanamadı.';
      setHata(mesaj);
      mesajGoster(mesaj, 'error');
      return false;
    } finally {
      setIslemYukleniyor(false);
    }
  };

  const gunRandevulari = useMemo(() => {
    return veriler.randevular
      .filter(randevu => yerelTarih(randevu.baslangic_zamani) === seciliTarih)
      .filter(randevu => seciliPersonelFiltresi === 'tumu' || String(randevu.personel_id) === String(seciliPersonelFiltresi))
      .sort((a, b) => new Date(a.baslangic_zamani) - new Date(b.baslangic_zamani));
  }, [veriler.randevular, seciliTarih, seciliPersonelFiltresi]);

  const gorunenPersoneller = useMemo(() => {
    if (seciliPersonelFiltresi === 'tumu') return veriler.personeller;
    return veriler.personeller.filter(p => String(p.id) === String(seciliPersonelFiltresi));
  }, [veriler.personeller, seciliPersonelFiltresi]);

  const filtreliMusteriler = useMemo(() => {
    const metin = String(musteriArama || '').trim().toLocaleLowerCase('tr-TR');
    return veriler.musteriler.filter(musteri =>
      !metin || `${musteri.ad || ''} ${musteri.telefon || ''} ${musteri.email || ''}`.toLocaleLowerCase('tr-TR').includes(metin)
    );
  }, [veriler.musteriler, musteriArama]);

  const seciliRandevu = veriler.randevular.find(r => String(r.id) === String(seciliRandevuId));
  const tamamlananSayisi = gunRandevulari.filter(r => r.durum === 'Tamamlandı').length;
  const iptalHaricGun = gunRandevulari.filter(r => r.durum !== 'İptal');
  const gunCirosu = gunRandevulari.filter(r => r.durum === 'Tamamlandı').reduce((toplam, r) => toplam + Number(r.ucret || 0), 0);
  const planlananCiro = iptalHaricGun.reduce((toplam, r) => toplam + Number(r.ucret || 0), 0);

  const tarihDegistir = gunFarki => {
    const tarih = new Date(`${seciliTarih}T12:00:00`);
    tarih.setDate(tarih.getDate() + gunFarki);
    setSeciliTarih(`${tarih.getFullYear()}-${ikiHane(tarih.getMonth() + 1)}-${ikiHane(tarih.getDate())}`);
    setSeciliRandevuId(null);
  };

  const randevuFormunuAc = ({ personelId = '', saat = '09:00', tarih = seciliTarih } = {}) => {
    setDuzenlenenRandevuId(null);
    setRandevuFormu({
      ...bosRandevu(tarih),
      personelId: personelId || veriler.personeller[0]?.id || '',
      hizmetId: veriler.hizmetler[0]?.id || '',
      saat,
      sureDakika: String(veriler.hizmetler[0]?.sure_dakika || 30),
      ucret: String(veriler.hizmetler[0]?.fiyat ?? ''),
    });
    setAktifSekme('kayit');
  };

  const planBoslugunaTikla = (event, personelId) => {
    if (event.target.closest('.kuafor-appointment')) return;
    const sinir = event.currentTarget.getBoundingClientRect();
    const dakika = Math.round((GUN_BASLANGIC_DAKIKA + (event.clientY - sinir.top) / DAKIKA_PIKSEL) / 15) * 15;
    const guvenliDakika = Math.max(GUN_BASLANGIC_DAKIKA, Math.min(dakika, GUN_BITIS_DAKIKA - 15));
    randevuFormunuAc({
      personelId,
      saat: `${ikiHane(Math.floor(guvenliDakika / 60))}:${ikiHane(guvenliDakika % 60)}`,
    });
  };

  const musteriSec = musteriId => {
    const musteri = veriler.musteriler.find(m => String(m.id) === String(musteriId));
    setRandevuFormu(prev => ({
      ...prev,
      musteriId,
      musteriAdi: musteri?.ad || '',
      telefon: musteri?.telefon || '',
    }));
  };

  const hizmetSec = hizmetId => {
    const hizmet = veriler.hizmetler.find(h => String(h.id) === String(hizmetId));
    setRandevuFormu(prev => ({
      ...prev,
      hizmetId,
      sureDakika: String(hizmet?.sure_dakika || 30),
      ucret: String(hizmet?.fiyat ?? ''),
    }));
  };

  const randevuyuKaydet = async event => {
    event.preventDefault();
    if (!randevuFormu.musteriAdi.trim() || !randevuFormu.personelId || !randevuFormu.hizmetId || !randevuFormu.tarih || !randevuFormu.saat) {
      mesajGoster('Müşteri, personel, işlem, tarih ve saat alanlarını doldurun.', 'warning');
      return;
    }

    const baslangic = new Date(`${randevuFormu.tarih}T${randevuFormu.saat}:00`);
    const basarili = await islemCalistir(
      () => kuaforRandevusuKaydet(restaurantId, {
        ...randevuFormu,
        baslangicZamani: baslangic.toISOString(),
      }, duzenlenenRandevuId),
      duzenlenenRandevuId ? 'Randevu güncellendi.' : 'Randevu gün planına kaydedildi.'
    );

    if (basarili) {
      setSeciliTarih(randevuFormu.tarih);
      setRandevuFormu(bosRandevu(randevuFormu.tarih));
      setDuzenlenenRandevuId(null);
      setAktifSekme('plan');
    }
  };

  const randevuyuDuzenle = randevu => {
    setRandevuFormu({
      musteriId: randevu.musteri_id || '',
      musteriAdi: randevu.musteri_adi || '',
      telefon: randevu.telefon || '',
      personelId: randevu.personel_id || '',
      hizmetId: randevu.hizmet_id || '',
      tarih: yerelTarih(randevu.baslangic_zamani),
      saat: yerelSaat(randevu.baslangic_zamani),
      sureDakika: String(randevu.sure_dakika || 30),
      ucret: String(randevu.ucret ?? ''),
      kapora: String(randevu.kapora ?? ''),
      kullanilanMalzemeler: randevu.kullanilan_malzemeler || '',
      notMetni: randevu.not_metni || '',
    });
    setDuzenlenenRandevuId(randevu.id);
    setAktifSekme('kayit');
  };

  const randevuDurumuDegistir = async (randevu, durum) => {
    const basarili = await islemCalistir(
      () => kuaforRandevuDurumunuGuncelle(restaurantId, randevu.id, durum),
      `Randevu durumu “${durum}” olarak güncellendi.`
    );
    if (basarili) setSeciliRandevuId(randevu.id);
  };

  const musteriKaydet = async event => {
    event.preventDefault();
    if (!musteriFormu.ad.trim()) {
      mesajGoster('Müşteri adını girin.', 'warning');
      return;
    }
    const basarili = await islemCalistir(
      () => kuaforMusterisiKaydet(restaurantId, musteriFormu),
      'Müşteri kartı kaydedildi.'
    );
    if (basarili) setMusteriFormu(bosMusteri);
  };

  const personelKaydet = async event => {
    event.preventDefault();
    if (!personelFormu.ad.trim()) {
      mesajGoster('Personel adını girin.', 'warning');
      return;
    }
    const basarili = await islemCalistir(
      () => kuaforPersoneliKaydet(restaurantId, personelFormu),
      'Kuaför personeli kaydedildi.'
    );
    if (basarili) setPersonelFormu(bosPersonel);
  };

  const hizmetKaydet = async event => {
    event.preventDefault();
    if (!hizmetFormu.hizmetAdi.trim() || Number(hizmetFormu.sureDakika) <= 0) {
      mesajGoster('İşlem adı ve geçerli süre girin.', 'warning');
      return;
    }
    const basarili = await islemCalistir(
      () => kuaforHizmetiKaydet(restaurantId, hizmetFormu),
      'İşlem ve süre bilgisi kaydedildi.'
    );
    if (basarili) setHizmetFormu(bosHizmet);
  };

  const saatCizgileri = [];
  for (let dakika = GUN_BASLANGIC_DAKIKA; dakika <= GUN_BITIS_DAKIKA; dakika += 60) {
    saatCizgileri.push({
      dakika,
      label: `${ikiHane(Math.floor(dakika / 60))}:00`,
      top: (dakika - GUN_BASLANGIC_DAKIKA) * DAKIKA_PIKSEL,
    });
  }

  if (yukleniyor) return <div className="kuafor-loading">Kuaför gün planı hazırlanıyor…</div>;

  return (
    <div className="kuafor-app">
      <header className="kuafor-header">
        <div>
          <span className="kuafor-eyebrow">RANDEVU VE GÜN PLANI</span>
          <h1>Kuaför Yönetimi</h1>
          <p>{restaurantName || 'İşletme'} için müşteri, personel, işlem süresi ve günlük randevu planı.</p>
        </div>
        <button type="button" className="kuafor-new-button" onClick={() => randevuFormunuAc()}>＋ Yeni Randevu</button>
      </header>

      {hata && <div className="kuafor-alert"><strong>Kontrol gerekiyor</strong><span>{hata}</span></div>}

      <nav className="kuafor-tabs">
        {[
          ['plan', 'Gün Planı'],
          ['kayit', duzenlenenRandevuId ? 'Randevuyu Düzenle' : 'Randevu Kaydı'],
          ['musteriler', 'Müşteri Kayıtları'],
          ['ayarlar', 'Personel & İşlemler'],
        ].map(([key, label]) => (
          <button type="button" key={key} className={aktifSekme === key ? 'active' : ''} onClick={() => setAktifSekme(key)}>{label}</button>
        ))}
      </nav>

      {aktifSekme === 'plan' && (
        <>
          <section className="kuafor-datebar">
            <div className="kuafor-date-nav">
              <button type="button" onClick={() => tarihDegistir(-1)}>‹</button>
              <button type="button" onClick={() => setSeciliTarih(bugunYerel())}>Bugün</button>
              <button type="button" onClick={() => tarihDegistir(1)}>›</button>
              <input type="date" value={seciliTarih} onChange={e => setSeciliTarih(e.target.value)} />
            </div>
            <div>
              <strong>{tarihBasligi(seciliTarih)}</strong>
              <span>{gunRandevulari.length} kayıtlı randevu</span>
            </div>
            <select value={seciliPersonelFiltresi} onChange={e => setSeciliPersonelFiltresi(e.target.value)}>
              <option value="tumu">Tüm personeller</option>
              {veriler.personeller.map(personel => <option key={personel.id} value={personel.id}>{personel.ad}</option>)}
            </select>
          </section>

          <section className="kuafor-stats">
            <article><span>Randevu</span><strong>{gunRandevulari.length}</strong><small>seçili gün</small></article>
            <article><span>Tamamlanan</span><strong>{tamamlananSayisi}</strong><small>işlemi biten</small></article>
            <article><span>Planlanan tutar</span><strong>{para(planlananCiro)} TL</strong><small>iptaller hariç</small></article>
            <article><span>Tamamlanan ciro</span><strong>{para(gunCirosu)} TL</strong><small>işlem sonucu</small></article>
          </section>

          {veriler.personeller.length === 0 ? (
            <div className="kuafor-empty setup-empty">
              Gün planını kullanmak için önce <button type="button" onClick={() => setAktifSekme('ayarlar')}>Personel & İşlemler</button> bölümünden personel ve hizmet tanımlayın.
            </div>
          ) : (
            <section className="kuafor-plan-card">
              <div className="kuafor-plan-scroll">
                <div className="kuafor-plan" style={{ '--lane-count': Math.max(gorunenPersoneller.length, 1) }}>
                  <div className="kuafor-time-head">Saat</div>
                  {gorunenPersoneller.map(personel => (
                    <div key={personel.id} className="kuafor-person-head" style={{ '--staff-color': personel.renk || '#7c3aed' }}>
                      <i />
                      <strong>{personel.ad}</strong>
                      <span>{personel.uzmanlik || 'Kuaför personeli'}</span>
                    </div>
                  ))}

                  <div className="kuafor-time-axis" style={{ height: (GUN_BITIS_DAKIKA - GUN_BASLANGIC_DAKIKA) * DAKIKA_PIKSEL }}>
                    {saatCizgileri.map(saat => <span key={saat.dakika} style={{ top: saat.top }}>{saat.label}</span>)}
                  </div>

                  {gorunenPersoneller.map(personel => (
                    <div
                      key={`lane-${personel.id}`}
                      className="kuafor-staff-lane"
                      style={{ height: (GUN_BITIS_DAKIKA - GUN_BASLANGIC_DAKIKA) * DAKIKA_PIKSEL }}
                      onClick={event => planBoslugunaTikla(event, personel.id)}
                    >
                      {gunRandevulari
                        .filter(randevu => String(randevu.personel_id) === String(personel.id))
                        .map(randevu => {
                          const baslangic = new Date(randevu.baslangic_zamani);
                          const baslangicDakika = baslangic.getHours() * 60 + baslangic.getMinutes();
                          const top = Math.max(0, (baslangicDakika - GUN_BASLANGIC_DAKIKA) * DAKIKA_PIKSEL);
                          const yukseklik = Math.max(38, Number(randevu.sure_dakika || 30) * DAKIKA_PIKSEL);
                          return (
                            <button
                              type="button"
                              key={randevu.id}
                              className={`kuafor-appointment ${durumSinifi(randevu.durum)}`}
                              style={{ top, height: yukseklik, '--service-color': randevu.hizmet_rengi || personel.renk || '#7c3aed' }}
                              onClick={event => { event.stopPropagation(); setSeciliRandevuId(randevu.id); }}
                            >
                              <b>{yerelSaat(randevu.baslangic_zamani)} · {randevu.musteri_adi}</b>
                              <span>{randevu.hizmet_adi}</span>
                              {yukseklik > 50 && <small>{randevu.durum}</small>}
                            </button>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="kuafor-plan-hint">Boş bir saate dokunarak o personel için hızlı randevu açabilirsiniz.</div>
            </section>
          )}

          {seciliRandevu && (
            <section className="kuafor-selected">
              <div>
                <span className={`kuafor-status ${durumSinifi(seciliRandevu.durum)}`}>{seciliRandevu.durum}</span>
                <h2>{seciliRandevu.musteri_adi}</h2>
                <p>{yerelSaat(seciliRandevu.baslangic_zamani)}–{yerelSaat(seciliRandevu.bitis_zamani)} · {seciliRandevu.hizmet_adi} · {seciliRandevu.personel_adi}</p>
                <small>{seciliRandevu.telefon || 'Telefon yok'}{seciliRandevu.kullanilan_malzemeler ? ` · Malzeme: ${seciliRandevu.kullanilan_malzemeler}` : ''}{seciliRandevu.not_metni ? ` · ${seciliRandevu.not_metni}` : ''}</small>
              </div>
              <div className="kuafor-selected-price"><span>İşlem</span><strong>{para(seciliRandevu.ucret)} TL</strong><small>Kapora: {para(seciliRandevu.kapora)} TL</small></div>
              <div className="kuafor-status-actions">
                <button type="button" onClick={() => randevuDurumuDegistir(seciliRandevu, 'Onaylandı')}>Onayla</button>
                <button type="button" onClick={() => randevuDurumuDegistir(seciliRandevu, 'Geldi')}>Geldi</button>
                <button type="button" className="success" onClick={() => randevuDurumuDegistir(seciliRandevu, 'Tamamlandı')}>Tamamlandı</button>
                <button type="button" className="danger" onClick={() => randevuDurumuDegistir(seciliRandevu, 'Gelmedi')}>Gelmedi</button>
                <button type="button" className="danger" onClick={() => randevuDurumuDegistir(seciliRandevu, 'İptal')}>İptal</button>
                <button type="button" onClick={() => randevuyuDuzenle(seciliRandevu)}>Düzenle</button>
              </div>
            </section>
          )}

          <section className="kuafor-card">
            <div className="kuafor-card-title"><div><h2>Günün randevu listesi</h2><p>Saat sırasına göre tüm kayıtlar.</p></div></div>
            <div className="kuafor-day-list">
              {gunRandevulari.map(randevu => (
                <button type="button" key={randevu.id} onClick={() => setSeciliRandevuId(randevu.id)}>
                  <time>{yerelSaat(randevu.baslangic_zamani)}</time>
                  <i style={{ background: randevu.hizmet_rengi || '#7c3aed' }} />
                  <span><strong>{randevu.musteri_adi}</strong><small>{randevu.hizmet_adi} · {randevu.personel_adi}</small></span>
                  <b>{para(randevu.ucret)} TL</b>
                  <em className={durumSinifi(randevu.durum)}>{randevu.durum}</em>
                </button>
              ))}
              {gunRandevulari.length === 0 && <div className="kuafor-empty">Bu gün için randevu bulunmuyor.</div>}
            </div>
          </section>
        </>
      )}

      {aktifSekme === 'kayit' && (
        <section className="kuafor-card appointment-form-card">
          <div className="kuafor-card-title">
            <div><h2>{duzenlenenRandevuId ? 'Randevuyu düzenle' : 'Yeni randevu kaydı'}</h2><p>Müşteriyi seçin veya yeni müşteri bilgisi girin; işlem süresi bitiş saatini otomatik hesaplar.</p></div>
          </div>
          {veriler.personeller.length === 0 || veriler.hizmetler.length === 0 ? (
            <div className="kuafor-empty setup-empty">Randevu açmadan önce personel ve en az bir işlem tanımlayın. <button type="button" onClick={() => setAktifSekme('ayarlar')}>Tanımları Aç</button></div>
          ) : (
            <form className="kuafor-randevu-form" onSubmit={randevuyuKaydet}>
              <label className="wide"><span>Kayıtlı müşteri</span><select value={randevuFormu.musteriId} onChange={e => musteriSec(e.target.value)}><option value="">Yeni müşteri / kayıt seçilmedi</option>{veriler.musteriler.map(m => <option key={m.id} value={m.id}>{m.ad}{m.telefon ? ` · ${m.telefon}` : ''}</option>)}</select></label>
              <label><span>Müşteri adı *</span><input value={randevuFormu.musteriAdi} onChange={e => setRandevuFormu(p => ({ ...p, musteriAdi: e.target.value, musteriId: '' }))} placeholder="Ad Soyad" /></label>
              <label><span>Telefon</span><input value={randevuFormu.telefon} onChange={e => setRandevuFormu(p => ({ ...p, telefon: e.target.value }))} placeholder="05xx..." /></label>
              <label><span>Personel *</span><select value={randevuFormu.personelId} onChange={e => setRandevuFormu(p => ({ ...p, personelId: e.target.value }))}><option value="">Personel seçin</option>{veriler.personeller.map(p => <option key={p.id} value={p.id}>{p.ad}</option>)}</select></label>
              <label><span>İşlem / hizmet *</span><select value={randevuFormu.hizmetId} onChange={e => hizmetSec(e.target.value)}><option value="">İşlem seçin</option>{veriler.hizmetler.map(h => <option key={h.id} value={h.id}>{h.hizmet_adi} · {h.sure_dakika} dk · {para(h.fiyat)} TL</option>)}</select></label>
              <label><span>Tarih *</span><input type="date" value={randevuFormu.tarih} onChange={e => setRandevuFormu(p => ({ ...p, tarih: e.target.value }))} /></label>
              <label><span>Başlangıç *</span><input type="time" step="900" value={randevuFormu.saat} onChange={e => setRandevuFormu(p => ({ ...p, saat: e.target.value }))} /></label>
              <label><span>Süre (dakika)</span><input type="number" min="5" step="5" value={randevuFormu.sureDakika} onChange={e => setRandevuFormu(p => ({ ...p, sureDakika: e.target.value }))} /></label>
              <label><span>İşlem ücreti</span><input type="number" min="0" step="0.01" value={randevuFormu.ucret} onChange={e => setRandevuFormu(p => ({ ...p, ucret: e.target.value }))} /></label>
              <label><span>Kapora</span><input type="number" min="0" step="0.01" value={randevuFormu.kapora} onChange={e => setRandevuFormu(p => ({ ...p, kapora: e.target.value }))} /></label>
              <label className="wide"><span>Kullanılan malzemeler</span><textarea value={randevuFormu.kullanilanMalzemeler} onChange={e => setRandevuFormu(p => ({ ...p, kullanilanMalzemeler: e.target.value }))} placeholder="Örn. Wella 7/1 boya, %6 oksidan 60 ml, keratin bakım…" /></label>
              <label className="wide"><span>Not</span><textarea value={randevuFormu.notMetni} onChange={e => setRandevuFormu(p => ({ ...p, notMetni: e.target.value }))} placeholder="Boya kodu, tercih, alerji veya hatırlatma notu…" /></label>
              <div className="kuafor-form-summary">
                <span>Planlanan bitiş</span>
                <strong>{(() => {
                  const [saat, dakika] = String(randevuFormu.saat || '00:00').split(':').map(Number);
                  const toplam = saat * 60 + dakika + Number(randevuFormu.sureDakika || 0);
                  return `${ikiHane(Math.floor(toplam / 60) % 24)}:${ikiHane(toplam % 60)}`;
                })()}</strong>
                <small>Aynı personelde çakışan randevu varsa sistem kaydı engeller.</small>
              </div>
              <div className="kuafor-form-actions wide">
                <button type="submit" className="primary" disabled={islemYukleniyor}>{duzenlenenRandevuId ? 'Randevuyu Güncelle' : 'Randevuyu Gün Planına Kaydet'}</button>
                {duzenlenenRandevuId && <button type="button" onClick={() => { setDuzenlenenRandevuId(null); setRandevuFormu(bosRandevu(seciliTarih)); }}>Yeni Kayıda Dön</button>}
              </div>
            </form>
          )}
        </section>
      )}

      {aktifSekme === 'musteriler' && (
        <section className="kuafor-grid-two">
          <div className="kuafor-card">
            <div className="kuafor-card-title"><div><h2>Müşteri kartı aç</h2><p>İletişim ve kişisel işlem notlarını saklayın.</p></div></div>
            <form className="kuafor-stack-form" onSubmit={musteriKaydet}>
              <input value={musteriFormu.ad} onChange={e => setMusteriFormu(p => ({ ...p, ad: e.target.value }))} placeholder="Ad Soyad *" />
              <input value={musteriFormu.telefon} onChange={e => setMusteriFormu(p => ({ ...p, telefon: e.target.value }))} placeholder="Telefon" />
              <input type="email" value={musteriFormu.email} onChange={e => setMusteriFormu(p => ({ ...p, email: e.target.value }))} placeholder="E-posta" />
              <label><span>Doğum tarihi</span><input type="date" value={musteriFormu.dogumTarihi} onChange={e => setMusteriFormu(p => ({ ...p, dogumTarihi: e.target.value }))} /></label>
              <textarea value={musteriFormu.notMetni} onChange={e => setMusteriFormu(p => ({ ...p, notMetni: e.target.value }))} placeholder="Saç tipi, boya kodu, alerji veya tercih notu…" />
              <button type="submit" className="primary" disabled={islemYukleniyor}>Müşteriyi Kaydet</button>
            </form>
          </div>
          <div className="kuafor-card">
            <div className="kuafor-card-title"><div><h2>Müşteri kayıtları</h2><p>{veriler.musteriler.length} kayıtlı müşteri.</p></div></div>
            <div className="kuafor-search"><span>⌕</span><input value={musteriArama} onChange={e => setMusteriArama(e.target.value)} placeholder="Ad, telefon veya e-posta ara…" /></div>
            <div className="kuafor-customer-list">
              {filtreliMusteriler.map(musteri => (
                <article key={musteri.id}>
                  <div className="kuafor-avatar">{String(musteri.ad || '?').slice(0, 1).toLocaleUpperCase('tr-TR')}</div>
                  <div><strong>{musteri.ad}</strong><span>{musteri.telefon || 'Telefon yok'}{musteri.email ? ` · ${musteri.email}` : ''}</span><small>{musteri.not_metni || 'Müşteri notu yok'}</small></div>
                  <b>{Number(musteri.toplam_ziyaret || 0)}<small>ziyaret</small></b>
                  <div className="kuafor-customer-actions">
                    <button type="button" onClick={() => setAcikMusteriId(prev => String(prev) === String(musteri.id) ? null : musteri.id)}>Geçmiş</button>
                    <button type="button" onClick={() => {
                      setRandevuFormu({ ...bosRandevu(seciliTarih), musteriId: musteri.id, musteriAdi: musteri.ad, telefon: musteri.telefon || '', personelId: veriler.personeller[0]?.id || '', hizmetId: veriler.hizmetler[0]?.id || '', sureDakika: String(veriler.hizmetler[0]?.sure_dakika || 30), ucret: String(veriler.hizmetler[0]?.fiyat ?? '') });
                      setAktifSekme('kayit');
                    }}>Randevu</button>
                  </div>
                  {String(acikMusteriId) === String(musteri.id) && (
                    <div className="kuafor-customer-history">
                      {veriler.randevular
                        .filter(randevu => String(randevu.musteri_id) === String(musteri.id))
                        .sort((a, b) => new Date(b.baslangic_zamani) - new Date(a.baslangic_zamani))
                        .slice(0, 12)
                        .map(randevu => (
                          <div key={randevu.id}>
                            <time>{new Date(randevu.baslangic_zamani).toLocaleDateString('tr-TR')}</time>
                            <span><strong>{randevu.hizmet_adi}</strong><small>{randevu.personel_adi} · {randevu.durum}</small></span>
                            <p>{randevu.kullanilan_malzemeler ? `Malzeme: ${randevu.kullanilan_malzemeler}` : 'Kullanılan malzeme kaydı yok.'}</p>
                          </div>
                        ))}
                      {!veriler.randevular.some(randevu => String(randevu.musteri_id) === String(musteri.id)) && <div className="kuafor-empty">Bu müşterinin henüz işlem geçmişi yok.</div>}
                    </div>
                  )}
                </article>
              ))}
              {filtreliMusteriler.length === 0 && <div className="kuafor-empty">Müşteri bulunamadı.</div>}
            </div>
          </div>
        </section>
      )}

      {aktifSekme === 'ayarlar' && (
        <section className="kuafor-grid-two">
          <div className="kuafor-card">
            <div className="kuafor-card-title"><div><h2>Kuaför personeli</h2><p>Gün planında ayrı sütun olarak görünür.</p></div></div>
            <form className="kuafor-catalog-form" onSubmit={personelKaydet}>
              <input value={personelFormu.ad} onChange={e => setPersonelFormu(p => ({ ...p, ad: e.target.value }))} placeholder="Personel adı *" />
              <input value={personelFormu.telefon} onChange={e => setPersonelFormu(p => ({ ...p, telefon: e.target.value }))} placeholder="Telefon" />
              <input value={personelFormu.uzmanlik} onChange={e => setPersonelFormu(p => ({ ...p, uzmanlik: e.target.value }))} placeholder="Uzmanlık (Boya, kesim…)" />
              <label className="color-label"><span>Plan rengi</span><input type="color" value={personelFormu.renk} onChange={e => setPersonelFormu(p => ({ ...p, renk: e.target.value }))} /></label>
              <button type="submit" className="primary" disabled={islemYukleniyor}>Personeli Kaydet</button>
            </form>
            <div className="kuafor-catalog-list">
              {veriler.personeller.map(personel => <div key={personel.id}><i style={{ background: personel.renk }} /><span><strong>{personel.ad}</strong><small>{personel.uzmanlik || 'Uzmanlık belirtilmedi'}</small></span></div>)}
            </div>
          </div>
          <div className="kuafor-card">
            <div className="kuafor-card-title"><div><h2>İşlem ve hizmetler</h2><p>Fiyat ve süre randevuya otomatik gelir.</p></div></div>
            <form className="kuafor-catalog-form" onSubmit={hizmetKaydet}>
              <input value={hizmetFormu.hizmetAdi} onChange={e => setHizmetFormu(p => ({ ...p, hizmetAdi: e.target.value }))} placeholder="İşlem adı *" />
              <input value={hizmetFormu.kategori} onChange={e => setHizmetFormu(p => ({ ...p, kategori: e.target.value }))} placeholder="Kategori" />
              <input type="number" min="5" step="5" value={hizmetFormu.sureDakika} onChange={e => setHizmetFormu(p => ({ ...p, sureDakika: e.target.value }))} placeholder="Süre (dk)" />
              <input type="number" min="0" step="0.01" value={hizmetFormu.fiyat} onChange={e => setHizmetFormu(p => ({ ...p, fiyat: e.target.value }))} placeholder="Fiyat" />
              <label className="color-label"><span>İşlem rengi</span><input type="color" value={hizmetFormu.renk} onChange={e => setHizmetFormu(p => ({ ...p, renk: e.target.value }))} /></label>
              <button type="submit" className="primary" disabled={islemYukleniyor}>İşlemi Kaydet</button>
            </form>
            <div className="kuafor-catalog-list">
              {veriler.hizmetler.map(hizmet => <div key={hizmet.id}><i style={{ background: hizmet.renk }} /><span><strong>{hizmet.hizmet_adi}</strong><small>{hizmet.kategori} · {hizmet.sure_dakika} dakika</small></span><b>{para(hizmet.fiyat)} TL</b></div>)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
