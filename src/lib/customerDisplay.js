const metniKacir = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const paraYaz = value => new Intl.NumberFormat('tr-TR', {
  style: 'currency', currency: 'TRY', maximumFractionDigits: 2,
}).format(Number(value || 0));

const miktarYaz = value => Number(value || 0).toLocaleString('tr-TR', {
  maximumFractionDigits: 3,
});

export const MARKET_MUSTERI_EKRANI_GUNCELLEME_OLAYI = 'integra-market-musteri-ekrani-guncelle';

export const musteriEkranGorseliniHazirla = file => new Promise((resolve, reject) => {
  if (!String(file?.type || '').startsWith('image/')) {
    reject(new Error('Yalnızca görsel dosyaları eklenebilir.'));
    return;
  }
  const okuyucu = new FileReader();
  okuyucu.onerror = () => reject(new Error('Görsel okunamadı.'));
  okuyucu.onload = () => {
    const gorsel = new Image();
    gorsel.onerror = () => reject(new Error(`${file.name} açılamadı.`));
    gorsel.onload = () => {
      const oran = Math.min(1920 / gorsel.naturalWidth, 1080 / gorsel.naturalHeight, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(Math.round(gorsel.naturalWidth * oran), 1);
      canvas.height = Math.max(Math.round(gorsel.naturalHeight * oran), 1);
      const cizim = canvas.getContext('2d');
      cizim.fillStyle = '#0f172a';
      cizim.fillRect(0, 0, canvas.width, canvas.height);
      cizim.drawImage(gorsel, 0, 0, canvas.width, canvas.height);
      resolve({
        id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        ad: file.name,
        veri: canvas.toDataURL('image/jpeg', .82),
      });
    };
    gorsel.src = okuyucu.result;
  };
  okuyucu.readAsDataURL(file);
});

export const musteriEkraniBelgesiniYaz = (pencere, {
  isletmeAdi,
  gorseller,
  bosMesaj = 'Afiyet olsun, yine bekleriz.',
  cariAdi = '',
  kalemler = [],
  toplam = 0,
  brutToplam = 0,
  indirim = 0,
}) => {
  if (!pencere || pencere.closed) return false;
  const liste = Array.isArray(gorseller) ? gorseller.filter(gorsel => gorsel?.veri) : [];
  const satisKalemleri = Array.isArray(kalemler) ? kalemler : [];
  const gorselSayisi = Math.max(liste.length, 1);
  const sure = gorselSayisi * 7;
  const dilim = 100 / gorselSayisi;
  const gorunurBitis = Math.max(dilim - 3, dilim * .84);
  const slaytlar = liste.map((gorsel, index) => `<img class="slayt" src="${metniKacir(gorsel.veri)}" alt="" style="${liste.length === 1 ? 'opacity:1;animation:none' : `animation-duration:${sure}s;animation-delay:${index * 7}s`}" />`).join('');
  const urunler = satisKalemleri.slice(-8).map(kalem => `<li><span><strong>${metniKacir(kalem.urun_adi)}</strong><small>${metniKacir(miktarYaz(kalem.adet))} × ${metniKacir(paraYaz(kalem.satis_fiyati))}</small></span><b>${metniKacir(paraYaz(Number(kalem.adet) * Number(kalem.satis_fiyati)))}</b></li>`).join('');
  const satisVar = satisKalemleri.length > 0;
  const guvenliBosMesaj = metniKacir(String(bosMesaj || '').trim() || 'Afiyet olsun, yine bekleriz.');

  try {
    pencere.document.open();
    pencere.document.write(`<!doctype html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arka Ekran · ${metniKacir(isletmeAdi)}</title><style>
      *{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#07111f;color:#fff;font-family:Inter,"Segoe UI",sans-serif}.ekran{position:relative;width:100%;height:100%}.bekleme{background:radial-gradient(circle at 80% 15%,#253d58,#07111f 62%)}.slaytlar,.slayt{position:absolute;inset:0;width:100%;height:100%}.slayt{object-fit:cover;opacity:0;animation:slaytGecisi linear infinite}.slaytlar:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#07111fdd 0,#07111f75 42%,#07111f14 76%)}.icerik{position:relative;z-index:2;height:100%;padding:clamp(36px,6vw,88px);display:flex;flex-direction:column;justify-content:space-between}.marka{display:flex;align-items:center;gap:15px;font-size:clamp(20px,2.4vw,34px);font-weight:950}.marka i{width:clamp(40px,4vw,60px);height:clamp(40px,4vw,60px);display:grid;place-items:center;border-radius:15px;background:#f97316;font-style:normal}.mesaj{max-width:min(920px,82vw)}.mesaj h1{margin:0;font-size:clamp(42px,7vw,104px);line-height:.96;letter-spacing:-.04em}.mesaj p{margin:20px 0 0;color:#f8fafc;font-size:clamp(22px,3vw,44px);font-weight:850;line-height:1.25;text-shadow:0 3px 18px #0008}.durum{align-self:flex-start;margin-top:30px;padding:10px 15px;border:1px solid #ffffff30;border-radius:999px;background:#ffffff14;color:#e2e8f0;font-size:clamp(11px,1.2vw,16px);font-weight:800;backdrop-filter:blur(8px)}.satis{height:100%;display:grid;grid-template-rows:74px 1fr;background:linear-gradient(135deg,#f8fafc,#fff7ed);color:#0f172a}.ust{height:74px;padding:0 34px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;background:#0f172a;color:#fff}.ust .marka{font-size:22px}.ust .marka i{width:36px;height:36px;border-radius:10px}.ust small{color:#cbd5e1;font-size:14px}.satis-icerik{min-height:0;display:grid;grid-template-columns:minmax(0,1.45fr) minmax(330px,.55fr)}.urunler{min-height:0;padding:30px 34px;overflow:hidden}.urunler h1{margin:0 0 22px;font-size:28px}.urunler ul{list-style:none;margin:0;padding:0;border-top:1px solid #dbe2ea}.urunler li{min-height:62px;display:flex;align-items:center;justify-content:space-between;gap:24px;border-bottom:1px solid #dbe2ea}.urunler li span{display:flex;min-width:0;flex-direction:column}.urunler li strong{font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.urunler li small{margin-top:4px;color:#64748b;font-size:13px}.urunler li b{font-size:19px;white-space:nowrap}.ozet{padding:38px 32px;display:flex;flex-direction:column;justify-content:flex-end;background:#0f172a;color:#fff}.ozet>span{color:#94a3b8;font-size:14px;font-weight:800}.ozet>strong{margin:8px 0 26px;color:#fb923c;font-size:clamp(50px,6vw,84px);line-height:1}.ozet dl{margin:0 0 28px}.ozet dl div{display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px solid #ffffff16}.ozet dt{color:#94a3b8}.ozet dd{margin:0;font-weight:850}.tesekkur{padding-top:22px;border-top:1px solid #ffffff24;font-size:21px;font-weight:900}.cari{margin-top:8px;color:#cbd5e1;font-size:13px}@keyframes slaytGecisi{0%,${gorunurBitis}%{opacity:1}${dilim}%,100%{opacity:0}}
    </style></head><body>${satisVar ? `<main class="ekran satis"><header class="ust"><span class="marka"><i>i</i>${metniKacir(isletmeAdi || 'Integra POS')}</span><small>Müşteri Ekranı</small></header><div class="satis-icerik"><section class="urunler"><h1>Alışverişiniz</h1><ul>${urunler}</ul></section><aside class="ozet"><span>ÖDENECEK TUTAR</span><strong>${metniKacir(paraYaz(toplam))}</strong><dl><div><dt>Brüt toplam</dt><dd>${metniKacir(paraYaz(brutToplam))}</dd></div>${Number(indirim) > 0 ? `<div><dt>Toplam indirim</dt><dd>-${metniKacir(paraYaz(indirim))}</dd></div>` : ''}</dl><div class="tesekkur">${guvenliBosMesaj}</div>${cariAdi ? `<div class="cari">Müşteri: ${metniKacir(cariAdi)}</div>` : ''}</aside></div></main>` : `<main class="ekran bekleme"><div class="slaytlar">${slaytlar}</div><div class="icerik"><div class="marka"><i>i</i> INTEGRA POS</div><div class="mesaj"><h1>${metniKacir(isletmeAdi || 'Hoş geldiniz')}</h1><p>${guvenliBosMesaj}</p><div class="durum">Satış başladığında ürünler ve toplam tutar burada görünür</div></div></div></main>`}</body></html>`);
    pencere.document.close();
    return true;
  } catch {
    return false;
  }
};

export const ikinciEkranPenceresiniAc = async (pencereAdi = 'integra-restoran-arka-ekran') => {
  const pencere = window.open('', pencereAdi, 'popup=yes,width=1280,height=720');
  if (!pencere) return { pencere: null, ikincilEkranBulundu: false, hata: 'popup' };

  let hedefEkran = null;
  try {
    if (typeof window.getScreenDetails === 'function') {
      const ekranBilgileri = await window.getScreenDetails();
      hedefEkran = ekranBilgileri.screens.find(ekran => !ekran.isPrimary)
        || ekranBilgileri.screens.find(ekran => ekran !== ekranBilgileri.currentScreen)
        || null;
    }
  } catch {
    hedefEkran = null;
  }

  if (hedefEkran) {
    const sol = hedefEkran.availLeft ?? hedefEkran.left ?? 0;
    const ust = hedefEkran.availTop ?? hedefEkran.top ?? 0;
    const genislik = hedefEkran.availWidth ?? hedefEkran.width ?? 1280;
    const yukseklik = hedefEkran.availHeight ?? hedefEkran.height ?? 720;
    try {
      pencere.moveTo(sol, ust);
      pencere.resizeTo(genislik, yukseklik);
    } catch {
      // Bazı tarayıcılar pencere taşıma iznini kısıtlayabilir.
    }
  }

  return { pencere, ikincilEkranBulundu: Boolean(hedefEkran), hata: '' };
};
