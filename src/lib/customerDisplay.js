const metniKacir = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

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

export const musteriEkraniBelgesiniYaz = (pencere, { isletmeAdi, gorseller }) => {
  if (!pencere || pencere.closed) return false;
  const liste = Array.isArray(gorseller) ? gorseller.filter(gorsel => gorsel?.veri) : [];
  const gorselSayisi = Math.max(liste.length, 1);
  const sure = gorselSayisi * 7;
  const dilim = 100 / gorselSayisi;
  const gorunurBitis = Math.max(dilim - 3, dilim * .84);
  const slaytlar = liste.map((gorsel, index) => `<img class="slayt" src="${metniKacir(gorsel.veri)}" alt="" style="${liste.length === 1 ? 'opacity:1;animation:none' : `animation-duration:${sure}s;animation-delay:${index * 7}s`}" />`).join('');

  try {
    pencere.document.open();
    pencere.document.write(`<!doctype html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arka Ekran · ${metniKacir(isletmeAdi)}</title><style>
      *{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#07111f;color:#fff;font-family:Inter,"Segoe UI",sans-serif}.ekran{position:relative;width:100%;height:100%;background:radial-gradient(circle at 80% 15%,#253d58,#07111f 62%)}.slaytlar,.slayt{position:absolute;inset:0;width:100%;height:100%}.slayt{object-fit:cover;opacity:0;animation:slaytGecisi linear infinite}.slaytlar:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#07111fdd 0,#07111f75 42%,#07111f14 76%)}.icerik{position:relative;z-index:2;height:100%;padding:clamp(36px,6vw,88px);display:flex;flex-direction:column;justify-content:space-between}.marka{display:flex;align-items:center;gap:15px;font-size:clamp(20px,2.4vw,34px);font-weight:950}.marka i{width:clamp(40px,4vw,60px);height:clamp(40px,4vw,60px);display:grid;place-items:center;border-radius:15px;background:#f97316;font-style:normal}.mesaj{max-width:min(850px,75vw)}.mesaj h1{margin:0;font-size:clamp(46px,8vw,118px);line-height:.96;letter-spacing:-.04em}.mesaj p{margin:20px 0 0;color:#dbe6f4;font-size:clamp(17px,2.1vw,30px);line-height:1.4}.durum{align-self:flex-start;margin-top:30px;padding:10px 15px;border:1px solid #ffffff30;border-radius:999px;background:#ffffff14;color:#e2e8f0;font-size:clamp(11px,1.2vw,16px);font-weight:800;backdrop-filter:blur(8px)}@keyframes slaytGecisi{0%,${gorunurBitis}%{opacity:1}${dilim}%,100%{opacity:0}}
    </style></head><body><main class="ekran"><div class="slaytlar">${slaytlar}</div><div class="icerik"><div class="marka"><i>i</i> INTEGRA POS</div><div class="mesaj"><h1>${metniKacir(isletmeAdi || 'Hoş geldiniz')}</h1><p>${liste.length ? 'Kampanyalarımızı ve size özel duyurularımızı inceleyin.' : 'Arka ekran görselleri eklendiğinde burada otomatik olarak gösterilecek.'}</p><div class="durum">İyi vakit geçirmenizi dileriz</div></div></div></main></body></html>`);
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
