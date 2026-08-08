import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  sistemMerkeziVerileriniGetir,
  sistemOlayiniCoz,
  sistemTeshisiYap,
} from '../services/systemService';
import './systemCenter.css';

const tarihSaat = deger => deger ? new Date(deger).toLocaleString('tr-TR') : '-';

const csvDegeri = deger => `"${String(deger ?? '').replaceAll('"', '""')}"`;

export default function SystemCenter({
  restaurantId,
  restaurantName,
  userRole,
  canliSenkronDurumu,
  supabaseBaglantiDurumu,
  sonVeriYenilemeZamani,
  acikMasaSayisi = 0,
  bekleyenServisSayisi = 0,
  yeniSiparisSayisi = 0,
  sonSistemHatasi = '',
  manuelYenilemeYapiliyor = false,
  onRefresh,
  notify,
}) {
  const [aktifPanel, setAktifPanel] = useState('hatalar');
  const [veriler, setVeriler] = useState({ olaylar: [], islemler: [], kilitler: [] });
  const [teshisler, setTeshisler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [teshisYapiliyor, setTeshisYapiliyor] = useState(false);
  const [hata, setHata] = useState('');
  const [arama, setArama] = useState('');
  const [yalnizAcik, setYalnizAcik] = useState(true);

  const bildir = useCallback((mesaj, tip = 'info') => {
    if (typeof notify === 'function') notify(mesaj, tip);
  }, [notify]);

  const yenile = useCallback(async ({ sessiz = false } = {}) => {
    if (!restaurantId) return;
    if (!sessiz) setYukleniyor(true);
    setHata('');
    try {
      setVeriler(await sistemMerkeziVerileriniGetir(restaurantId));
    } catch (error) {
      setHata(error?.message || 'Sistem merkezi yüklenemedi.');
    } finally {
      if (!sessiz) setYukleniyor(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    const timer = window.setTimeout(() => yenile(), 0);
    return () => window.clearTimeout(timer);
  }, [yenile]);

  const filtreliOlaylar = useMemo(() => {
    const metin = String(arama || '').trim().toLocaleLowerCase('tr-TR');
    return veriler.olaylar.filter(olay => {
      if (yalnizAcik && olay.cozuldu) return false;
      return !metin || `${olay.kaynak} ${olay.islem} ${olay.mesaj} ${olay.hata_kodu} ${olay.ekran}`
        .toLocaleLowerCase('tr-TR')
        .includes(metin);
    });
  }, [arama, veriler.olaylar, yalnizAcik]);

  const filtreliIslemler = useMemo(() => {
    const metin = String(arama || '').trim().toLocaleLowerCase('tr-TR');
    return veriler.islemler.filter(islem => !metin || `${islem.islem_tipi} ${islem.aciklama} ${islem.user_name} ${islem.ekran}`
      .toLocaleLowerCase('tr-TR')
      .includes(metin));
  }, [arama, veriler.islemler]);

  const acikHataSayisi = veriler.olaylar.filter(olay => !olay.cozuldu && ['error', 'critical'].includes(olay.seviye)).length;
  const uyariSayisi = veriler.olaylar.filter(olay => !olay.cozuldu && olay.seviye === 'warning').length;
  const bugun = new Date().toISOString().slice(0, 10);
  const bugunIslemSayisi = veriler.islemler.filter(islem => String(islem.created_at || '').slice(0, 10) === bugun).length;

  const teshisCalistir = async () => {
    setTeshisYapiliyor(true);
    try {
      const sonuclar = await sistemTeshisiYap(restaurantId);
      setTeshisler(sonuclar);
      const hataSayisi = sonuclar.filter(sonuc => sonuc.durum === 'Hata').length;
      bildir(hataSayisi ? `${hataSayisi} sistem kontrolü hata verdi.` : 'Tüm sistem kontrolleri başarılı.', hataSayisi ? 'error' : 'success');
    } catch (error) {
      bildir(error?.message || 'Sistem teşhisi tamamlanamadı.', 'error');
    } finally {
      setTeshisYapiliyor(false);
    }
  };

  const olayiKapat = async olay => {
    try {
      await sistemOlayiniCoz(restaurantId, olay.id, 'Sistem Merkezi üzerinden kontrol edildi.');
      await yenile({ sessiz: true });
      bildir('Sistem olayı çözüldü olarak işaretlendi.', 'success');
    } catch (error) {
      bildir(error?.message || 'Sistem olayı kapatılamadı.', 'error');
    }
  };

  const csvIndir = () => {
    const kaynak = aktifPanel === 'hatalar' ? filtreliOlaylar : filtreliIslemler;
    const satirlar = aktifPanel === 'hatalar'
      ? [['Tarih', 'Seviye', 'Kaynak', 'İşlem', 'Mesaj', 'Kod', 'Ekran', 'Çözüldü'], ...kaynak.map(o => [tarihSaat(o.created_at), o.seviye, o.kaynak, o.islem, o.mesaj, o.hata_kodu, o.ekran, o.cozuldu ? 'Evet' : 'Hayır'])]
      : [['Tarih', 'İşlem', 'Kullanıcı', 'Ekran', 'Hedef', 'Açıklama'], ...kaynak.map(i => [tarihSaat(i.created_at), i.islem_tipi, i.user_name, i.ekran, `${i.hedef_tablo || ''} ${i.hedef_id || ''}`.trim(), i.aciklama])];
    const blob = new Blob([`\uFEFF${satirlar.map(satir => satir.map(csvDegeri).join(';')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `integra-${aktifPanel}-${bugun}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (yukleniyor) return <div className="system-loading">Sistem kayıtları hazırlanıyor…</div>;

  return (
    <div className="system-center">
      <header className="system-header">
        <div>
          <span className="system-eyebrow">GÜVENLİK · HATA · İŞLEM KAYITLARI</span>
          <h1>Sistem Merkezi</h1>
          <p>{restaurantName || 'İşletme'} bağlantı, hata, işlem ve gün sonu durumunu tek ekranda izleyin.</p>
        </div>
        <div className="system-header-actions">
          <button type="button" onClick={teshisCalistir} disabled={teshisYapiliyor}>{teshisYapiliyor ? 'Kontrol ediliyor…' : 'Sistem Testi'}</button>
          <button type="button" className="primary" onClick={() => onRefresh?.({ bildirim: true })} disabled={manuelYenilemeYapiliyor}>{manuelYenilemeYapiliyor ? 'Yenileniyor…' : 'Tüm Verileri Yenile'}</button>
        </div>
      </header>

      {hata && <div className="system-alert"><strong>Kontrol gerekiyor</strong><span>{hata}</span></div>}

      <section className="system-stats">
        <article className={supabaseBaglantiDurumu === 'Aktif' ? 'ok' : 'danger'}><span>Supabase</span><strong>{supabaseBaglantiDurumu || 'Bekleniyor'}</strong><small>Canlı senkron: {canliSenkronDurumu || '-'}</small></article>
        <article className={acikHataSayisi ? 'danger' : 'ok'}><span>Açık hata</span><strong>{acikHataSayisi}</strong><small>{uyariSayisi} açık uyarı</small></article>
        <article><span>Bugünkü işlem</span><strong>{bugunIslemSayisi}</strong><small>Sunucuda kayıtlı hareket</small></article>
        <article><span>Açık operasyon</span><strong>{acikMasaSayisi + bekleyenServisSayisi + yeniSiparisSayisi}</strong><small>{acikMasaSayisi} masa · {bekleyenServisSayisi} servis · {yeniSiparisSayisi} sipariş</small></article>
        <article><span>Son yenileme</span><strong className="compact">{sonVeriYenilemeZamani ? tarihSaat(sonVeriYenilemeZamani) : '-'}</strong><small>Panel verilerinin son kontrolü</small></article>
      </section>

      {(sonSistemHatasi || teshisler.length > 0) && (
        <section className="system-diagnostics">
          {sonSistemHatasi && <div className="system-last-error"><strong>Son panel hatası</strong><span>{sonSistemHatasi}</span></div>}
          {teshisler.map(sonuc => <div key={sonuc.baslik} className={sonuc.durum === 'Aktif' ? 'ok' : 'danger'}><span>{sonuc.baslik}</span><strong>{sonuc.durum}</strong><small>{sonuc.adet == null ? sonuc.mesaj : `${sonuc.adet} kayıt · ${sonuc.mesaj}`}</small></div>)}
        </section>
      )}

      <nav className="system-tabs">
        <button type="button" className={aktifPanel === 'hatalar' ? 'active' : ''} onClick={() => setAktifPanel('hatalar')}>Hata Merkezi ({acikHataSayisi + uyariSayisi})</button>
        <button type="button" className={aktifPanel === 'islemler' ? 'active' : ''} onClick={() => setAktifPanel('islemler')}>İşlem Geçmişi</button>
        <button type="button" className={aktifPanel === 'gunsonu' ? 'active' : ''} onClick={() => setAktifPanel('gunsonu')}>Gün Sonu Kilitleri</button>
      </nav>

      <section className="system-card">
        {aktifPanel !== 'gunsonu' && (
          <div className="system-toolbar">
            <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Kayıtlarda ara…" />
            {aktifPanel === 'hatalar' && <label><input type="checkbox" checked={yalnizAcik} onChange={e => setYalnizAcik(e.target.checked)} /> Yalnız açık kayıtlar</label>}
            <button type="button" onClick={csvIndir}>CSV İndir</button>
            <button type="button" onClick={() => yenile()}>Yenile</button>
          </div>
        )}

        {aktifPanel === 'hatalar' && <div className="system-list">
          {filtreliOlaylar.map(olay => <article key={olay.id} className={`event ${olay.seviye} ${olay.cozuldu ? 'resolved' : ''}`}>
            <header><span className="system-level">{olay.seviye}</span><strong>{olay.kaynak}{olay.islem ? ` · ${olay.islem}` : ''}</strong><time>{tarihSaat(olay.created_at)}</time></header>
            <p>{olay.mesaj}</p>
            <footer><span>{olay.ekran || 'Genel'}{olay.hata_kodu ? ` · ${olay.hata_kodu}` : ''}</span>{!olay.cozuldu && userRole === 'owner' && <button type="button" onClick={() => olayiKapat(olay)}>Çözüldü Yap</button>}</footer>
          </article>)}
          {filtreliOlaylar.length === 0 && <div className="system-empty">Filtreye uygun sistem olayı bulunmuyor.</div>}
        </div>}

        {aktifPanel === 'islemler' && <div className="system-list">
          {filtreliIslemler.map(islem => <article key={islem.id} className="activity">
            <header><strong>{islem.islem_tipi}</strong><time>{tarihSaat(islem.created_at)}</time></header>
            <p>{islem.aciklama || 'Açıklama girilmedi.'}</p>
            <footer><span>{islem.user_name || 'Kullanıcı'} · {islem.ekran || 'Genel'}</span><span>{islem.hedef_tablo || ''}{islem.hedef_id ? ` #${islem.hedef_id}` : ''}</span></footer>
          </article>)}
          {filtreliIslemler.length === 0 && <div className="system-empty">Henüz sunucuya kaydedilmiş işlem bulunmuyor.</div>}
        </div>}

        {aktifPanel === 'gunsonu' && <div className="system-locks">
          {veriler.kilitler.map(kilit => <article key={kilit.id}><span className={kilit.kilitli ? 'locked' : 'open'}>{kilit.kilitli ? 'Kilitli' : 'Açık'}</span><strong>{new Date(`${kilit.tarih}T12:00:00`).toLocaleDateString('tr-TR')}</strong><small>{kilit.aciklama || 'Açıklama yok'} · {tarihSaat(kilit.updated_at)}</small></article>)}
          {veriler.kilitler.length === 0 && <div className="system-empty">Sunucuda gün sonu kilidi bulunmuyor.</div>}
        </div>}
      </section>
    </div>
  );
}
