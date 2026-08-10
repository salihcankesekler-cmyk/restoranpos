export const LANDING_HERO_FEATURES = [
  'Satış & Kasa', 'Randevu Planı', 'Müşteri / Cari', 'Stok & Depo', 'Personel', 'Rapor & Gün Sonu',
];

export const LANDING_SOLUTION_GROUPS = [
  {
    baslik: 'Satış',
    aciklama: 'Satış noktanıza uygun hızlı ve kontrollü çalışma düzeni',
    cozumler: [
      {
        slug: 'restoran-kafe-pos',
        icon: '▦',
        ad: 'Restoran & Kafe POS',
        kisa: 'Masa, adisyon, mutfak ve ödeme',
        etiket: 'Yeme içme işletmeleri',
        baslik: 'Servisin her adımını tek ekrandan yönetin.',
        aciklama: 'Masa açılışından mutfak hazırlığına, parçalı ödemeden gün sonuna kadar restoran ve kafe operasyonunu hızlandıran bütünleşik POS çözümü.',
        ozellikler: [
          ['🪑', 'Masa ve bölüm yönetimi', 'Salon, bahçe ve teras gibi alanları ayrı yönetin; adisyonları masalar arasında taşıyın.'],
          ['👨‍🍳', 'Mutfak iş akışı', 'Siparişleri notlarıyla ilgili hazırlık ekranına veya yazıcıya anında ulaştırın.'],
          ['💳', 'Esnek ödeme', 'Nakit, kart, cari ve parçalı ödemeleri tek satış üzerinde güvenle tamamlayın.'],
          ['📊', 'Canlı rapor', 'Ciro, ödeme dağılımı, ürün ve personel sonuçlarını gün içinde takip edin.'],
        ],
        uygun: ['Restoran', 'Kafe', 'Fast food', 'Paket servis', 'Tatlıcı ve büfe'],
      },
      {
        slug: 'market-perakende',
        icon: '▥',
        ad: 'Market & Perakende',
        kisa: 'Barkod, stok, sayım ve etiket',
        etiket: 'Barkodlu satış noktaları',
        baslik: 'Kasadan rafa kadar perakende kontrolü.',
        aciklama: 'Barkodlu satış, hızlı ürün tuşları, alış faturası, stok sayımı ve raf etiketi işlemlerini aynı sistemde birleştirin.',
        ozellikler: [
          ['▥', 'Hızlı barkodlu satış', 'Okutulan ürünü doğrudan sepete ekleyin; dokunmatik kısayollarla yoğun saatleri hızlandırın.'],
          ['📦', 'Alış ve stok', 'Alış faturasıyla stoğu artırın, satış tamamlanınca miktarı otomatik düşürün.'],
          ['🏷️', 'Fiyat ve etiket', 'Toplu fiyat güncelleyin, değişen ürünleri izleyin ve barkod etiketlerini sırayla basın.'],
          ['📋', 'Sayım ve fark', 'Barkodlu veya barkodsuz ürünleri sayın; sayım farklarını tek rapor içinde inceleyin.'],
        ],
        uygun: ['Market', 'Tekel', 'Şarküteri', 'Büfe', 'Perakende mağazası'],
      },
      {
        slug: 'hizli-satis',
        icon: '⚡',
        ad: 'Hızlı Satış',
        kisa: 'Dokunmatik ürün seçimi ve kısayollar',
        etiket: 'Yoğun satış noktaları',
        baslik: 'Daha az dokunuşla daha hızlı satış.',
        aciklama: 'Renkli grup ve ürün kutuları, ürün görselleri, klavyesiz tutar girişi ve ödeme kısayollarıyla satış süresini kısaltın.',
        ozellikler: [
          ['👆', 'Dokunmatik tasarım', 'Ürün, miktar ve ödeme butonlarını dokunmatik ekranlarda rahatça kullanın.'],
          ['🎨', 'Kişisel yerleşim', 'Grupların ve ürünlerin sırasını kasanın çalışma biçimine göre düzenleyin.'],
          ['⌨️', 'Kasa kısayolları', 'Nakit, kart, cari, iskonto ve bekleyen fiş işlemlerini fonksiyon tuşlarıyla açın.'],
          ['⏸️', 'Bekleyen satışlar', 'Satışı beklemeye alın, daha sonra aynı içerikle yeniden ekrana çağırın.'],
        ],
        uygun: ['Kafe', 'Pastane', 'Büfe', 'Fast food', 'Yoğun kasa noktaları'],
      },
      {
        slug: 'odeme-cari',
        icon: '₺',
        ad: 'Ödeme & Cari',
        kisa: 'Parçalı ödeme, tahsilat ve bakiye',
        etiket: 'Kasa ve finans kontrolü',
        baslik: 'Satıştan tahsilata bakiye her zaman net.',
        aciklama: 'Parçalı ödeme, para üstü, veresiye, tahsilat ve dışarı yapılan ödemeleri cari hareketlerle birlikte yönetin.',
        ozellikler: [
          ['💳', 'Parçalı ödeme', 'Bir hesabı nakit, kart ve cari yöntemleri arasında bölerek tamamlayın.'],
          ['👥', 'Cari hesaplar', 'Müşteri ve tedarikçilerin borç, alacak ve güncel bakiyelerini izleyin.'],
          ['↔️', 'Tahsilat ve ödeme', 'Satış dışı tahsilatları ve dışarı yapılan ödemeleri açıklamasıyla kaydedin.'],
          ['🧾', 'Hareket geçmişi', 'Her bakiyenin hangi satış, alış veya finans hareketinden oluştuğunu görün.'],
        ],
        uygun: ['Veresiye çalışan işletmeler', 'Tedarikçi takibi yapan firmalar', 'Çoklu ödeme alan kasalar'],
      },
    ],
  },
  {
    baslik: 'Operasyon',
    aciklama: 'Ürün, stok ve şube süreçlerinde kesintisiz veri akışı',
    cozumler: [
      {
        slug: 'stok-maliyet',
        icon: '📦',
        ad: 'Stok & Maliyet',
        kisa: 'Gerçek stok, hareket ve maliyet takibi',
        etiket: 'Envanter yönetimi',
        baslik: 'Ne kadar ürününüz kaldığını anlık bilin.',
        aciklama: 'Alış, satış, kullanım, sayım ve sevk hareketlerini tek stok geçmişinde toplayarak miktar ve maliyet kontrolünü güçlendirin.',
        ozellikler: [
          ['📦', 'Anlık stok', 'Satış ve tüketim işlemlerinden sonra güncellenen mevcut miktarı görün.'],
          ['↕️', 'Stok hareketleri', 'Giriş, çıkış, düzeltme, sayım ve sevk kaynaklarını ayrı ayrı inceleyin.'],
          ['🧮', 'Maliyet hesabı', 'Alış fiyatlarını ve eldeki stoğun tahmini toplam maliyetini takip edin.'],
          ['⚠️', 'Kritik stok', 'Azalan ürünleri fark ederek satın alma planını zamanında hazırlayın.'],
        ],
        uygun: ['Restoran', 'Market', 'Hizmet işletmesi', 'Depolu işletme'],
      },
      {
        slug: 'mutfak-siparis',
        icon: '👨‍🍳',
        ad: 'Mutfak Sipariş Yönetimi',
        kisa: 'Hazırlık ekranı, not ve yazıcı akışı',
        etiket: 'Hazırlık ve üretim',
        baslik: 'Sipariş kasadan mutfağa gecikmeden ulaşsın.',
        aciklama: 'Ürünleri ilgili hazırlık bölümüne yönlendirin; sipariş notlarını, bekleyenleri ve tamamlananları düzenli bir mutfak akışında izleyin.',
        ozellikler: [
          ['🔔', 'Anlık sipariş', 'Kaydedilen ürünleri mutfak ekranına veya mutfak yazıcısına aktarın.'],
          ['📝', 'Ürün notları', 'Pişirme, çıkarılacak malzeme ve müşteri isteklerini ürünle birlikte gösterin.'],
          ['✅', 'Hazırlık durumu', 'Bekliyor, hazırlanıyor ve hazır durumlarıyla servis ekibini bilgilendirin.'],
          ['🖨️', 'Bölüm yazıcıları', 'Ürün gruplarını doğru mutfak veya bar yazıcısına yönlendirin.'],
        ],
        uygun: ['Restoran', 'Kafe', 'Bar', 'Fast food', 'Paket servis mutfağı'],
      },
      {
        slug: 'depo-sube',
        icon: '🏭',
        ad: 'Depo & Şube Sevki',
        kisa: 'Merkez alış, sevk ve teslim onayı',
        etiket: 'Çok noktalı işletmeler',
        baslik: 'Merkez depodan şubelere kontrollü stok akışı.',
        aciklama: 'Alışları merkez depoya alın, sevk belgelerini hazırlayın ve şube teslim onayından sonra stokları güvenli biçimde aktarın.',
        ozellikler: [
          ['📥', 'Depoya alış', 'Tedarikçi alışlarını doğrudan merkez depo stoklarına kaydedin.'],
          ['🚚', 'Şubeye sevk', 'Ürün ve miktarları seçerek izlenebilir bir sevk belgesi oluşturun.'],
          ['✅', 'Teslim onayı', 'Şube onayından önce hedef stoğu değiştirmeyerek yanlış aktarımı önleyin.'],
          ['🏢', 'Ortak görünüm', 'Depo ve şube stoklarını yetkiye göre ayrı veya birlikte izleyin.'],
        ],
        uygun: ['Zincir restoran', 'Market şubeleri', 'Merkez depolu işletmeler', 'Üretim noktaları'],
      },
      {
        slug: 'raporlama',
        icon: '📊',
        ad: 'Raporlama',
        kisa: 'Satış, kâr, stok ve gün sonu',
        etiket: 'Yönetim ve karar desteği',
        baslik: 'İşletmenizin sonucunu tek bakışta görün.',
        aciklama: 'Gün sonu, satış, alış, ürün, grup, marka, kâr, stok, sayım ve cari raporlarını seçtiğiniz tarih aralığında inceleyin.',
        ozellikler: [
          ['📅', 'Gün sonu', 'Günlük ciroyu ödeme tipleri ve işlem adetleriyle birlikte görüntüleyin.'],
          ['📈', 'Satış analizi', 'Ürün, grup, marka ve personel kırılımlarında satış sonuçlarını karşılaştırın.'],
          ['💰', 'Kâr görünümü', 'Alış ve satış fiyatlarına göre tahmini brüt kârı takip edin.'],
          ['📋', 'Stok ve sayım', 'Eldeki stok değeri ile sayım farklarını raporlar üzerinden kontrol edin.'],
        ],
        uygun: ['İşletme sahipleri', 'Şube yöneticileri', 'Muhasebe ve finans ekipleri'],
      },
    ],
  },
  {
    baslik: 'Müşteri & Yönetim',
    aciklama: 'Müşteri deneyimi ve ekip kontrolü için tamamlayıcı araçlar',
    cozumler: [
      {
        slug: 'randevu-gun-plani',
        icon: '◷',
        ad: 'Randevu & Gün Planı',
        kisa: 'Müşteri, personel ve işlem takvimi',
        etiket: 'Hizmet işletmeleri',
        baslik: 'Randevudan ödemeye eksiksiz hizmet kaydı.',
        aciklama: 'Kayıtlı müşteri, personel ve hizmetlerle randevu oluşturun; kullanılan malzemeyi, ödemeyi ve ziyaret geçmişini aynı panelde saklayın.',
        ozellikler: [
          ['📅', 'Personel takvimi', 'Her personelin yalnızca yetkili olduğu kendi gün planını görmesini sağlayın.'],
          ['👤', 'Müşteri kartı', 'Ad, telefon, geçmiş işlemler, notlar ve cari bakiyeyi tek kayıtta tutun.'],
          ['✂️', 'Hizmet kaydı', 'Yapılan işlemi, personeli, süresini ve kullanılan stok malzemelerini seçin.'],
          ['💳', 'Tamamlama ve ödeme', 'Randevu tamamlandığında ödeme tipini kaydedip gün sonuna aktarın.'],
        ],
        uygun: ['Kuaför', 'Berber', 'Güzellik salonu', 'Bakım merkezi', 'Randevulu servis'],
      },
      {
        slug: 'musteri-cari',
        icon: '👥',
        ad: 'Müşteri & Cari Yönetimi',
        kisa: 'Kayıt, grup, bakiye ve geçmiş',
        etiket: 'Müşteri ve tedarikçi kayıtları',
        baslik: 'Müşteri ve tedarikçi bilgileri her işlemde hazır.',
        aciklama: 'Cari grupları oluşturun; iletişim, adres, vergi bilgileri, satışlar, alışlar, tahsilatlar ve bakiyeleri tek kayıtta yönetin.',
        ozellikler: [
          ['🗂️', 'Cari grupları', 'Müşteri, tedarikçi veya işletmenize özel gruplar oluşturarak listeyi hızla filtreleyin.'],
          ['🏢', 'Firma bilgileri', 'Vergi numarası, vergi dairesi, adres ve iletişim bilgilerini saklayın.'],
          ['🧾', 'İşleme bağlama', 'Satış, alış, sipariş ve randevularda kayıtlı cariyi yeniden yazmadan seçin.'],
          ['₺', 'Bakiye takibi', 'Borç, alacak, tahsilat ve ödeme hareketleriyle güncel bakiyeyi görün.'],
        ],
        uygun: ['Market', 'Restoran', 'Toptan satış', 'Hizmet işletmesi', 'Tedarikçi takibi'],
      },
      {
        slug: 'personel-yetki',
        icon: '🔐',
        ad: 'Personel & Yetki',
        kisa: 'Rol bazlı ekran ve işlem izinleri',
        etiket: 'Güvenli ekip kullanımı',
        baslik: 'Her kullanıcı yalnızca görevine ait ekranı görsün.',
        aciklama: 'Personel hesaplarını görevlerine göre yetkilendirin; satış, iptal, fiyat, rapor, depo ve yönetim işlemlerini ayrı ayrı kontrol edin.',
        ozellikler: [
          ['👤', 'Kişisel hesap', 'Personelin ortak parola kullanmadan kendi hesabıyla işlem yapmasını sağlayın.'],
          ['🧩', 'Modül yetkisi', 'Restoran, market, kuaför, depo ve finans panellerini role göre açın.'],
          ['🛡️', 'İşlem izni', 'İptal, indirim, fiyat değişikliği ve rapor görme gibi kritik işlemleri sınırlandırın.'],
          ['🕘', 'İşlem izi', 'Satış ve operasyon kayıtlarında işlemi yapan kullanıcıyı takip edin.'],
        ],
        uygun: ['Birden fazla çalışanı olan işletmeler', 'Şubeli yapılar', 'Yetki ayrımı gereken kasalar'],
      },
      {
        slug: 'donanim-entegrasyon',
        icon: '🖥️',
        ad: 'Donanım & Entegrasyon',
        kisa: 'Yazıcı, barkod, çekmece ve POS setleri',
        etiket: 'Satış noktası donanımı',
        baslik: 'Yazılım ve donanım aynı satış noktasında buluşsun.',
        aciklama: 'Dokunmatik bilgisayar, fiş ve etiket yazıcı, barkod okuyucu ve para çekmecesi seçeneklerini işletmenizin akışına göre birlikte planlayın.',
        ozellikler: [
          ['🖥️', 'Dokunmatik POS', 'Kasa kullanımına uygun dokunmatik bilgisayarlarla hızlı ve sade bir çalışma alanı kurun.'],
          ['🖨️', 'Fiş ve etiket', 'Satış fişi, adisyon, mutfak çıktısı ve barkod etiketlerini uygun yazıcıya gönderin.'],
          ['▥', 'Barkod ekipmanı', 'USB veya Bluetooth barkod okuyucuyla ürün girişini ve satışı hızlandırın.'],
          ['▱', 'Para çekmecesi', 'Uyumlu fiş yazıcı üzerinden otomatik açılan güvenli kasa düzeni oluşturun.'],
        ],
        uygun: ['Yeni açılan işletmeler', 'Donanım yenileyen satış noktaları', 'Komple POS seti isteyenler'],
      },
    ],
  },
];

export const LANDING_SOLUTION_PAGES = LANDING_SOLUTION_GROUPS.flatMap(grup =>
  grup.cozumler.map(cozum => ({ ...cozum, grup: grup.baslik })),
);

export const LANDING_DISCOVERY_LINKS = [
  { icon: '📣', ad: 'Kampanyalar', kisa: 'Hazır POS setleri ve güncel fırsatlar', href: '/kampanyalar' },
  { icon: '🏷️', ad: 'Fiyatlandırma', kisa: 'İşletmenize uygun yazılım paketleri', href: '/fiyatlandirma' },
  { icon: '🖥️', ad: 'Donanımlar', kisa: 'POS cihazları ve satış ekipmanları', href: '/donanimlar' },
  { icon: '⚙️', ad: 'Entegrasyonlar', kisa: 'Yazıcı, barkod ve çevre birimleri', href: '/entegrasyonlar' },
];

export const LANDING_HARDWARE_CATEGORIES = [
  {
    slug: 'dokunmatik-bilgisayarlar',
    ad: 'Dokunmatik Bilgisayarlar',
    aciklama: 'Yoğun satış noktalarında hızlı, sade ve uzun süreli kullanım için POS bilgisayarları.',
    urunler: [
      {
        icon: '🖥️',
        gorsel: '/references/integra-pos-kurulumu-1.webp',
        ad: '15,6 inç Dokunmatik POS Bilgisayar',
        aciklama: 'Kasa ve servis noktalarında Integra POS ekranlarını rahat kullanmak için kompakt dokunmatik bilgisayar.',
        ozellikler: ['15,6 inç dokunmatik ekran', 'Windows işletim sistemi', 'Wi-Fi ve dahili hoparlör'],
        fiyat: 'Fiyat için teklif alın',
      },
      {
        icon: '▣',
        ad: 'All-in-One Dokunmatik POS',
        aciklama: 'Bilgisayar kasasını ve ekranı tek gövdede birleştiren, tezgâhta az yer kaplayan satış noktası çözümü.',
        ozellikler: ['Tek gövdeli tasarım', 'Dokunmatik hızlı kullanım', 'Yazıcı ve barkod bağlantısı'],
        fiyat: 'Fiyat için teklif alın',
      },
    ],
  },
  {
    slug: 'adisyon-yazicilari',
    ad: 'Adisyon ve Fiş Yazıcıları',
    aciklama: 'Kasa fişi, müşteri adisyonu ve mutfak siparişi için hızlı termal yazıcı seçenekleri.',
    urunler: [
      {
        icon: '🖨️',
        gorsel: '/products/80mm-fis-yazici.webp',
        ad: '80 mm Adisyon / Fiş Yazıcı',
        aciklama: 'Satış fişleri ve hesap öncesi adisyonlar için yüksek hızlı termal yazıcı.',
        ozellikler: ['80 mm termal baskı', 'USB ve Ethernet bağlantısı', '203 DPI baskı kalitesi'],
        fiyat: 'Fiyat için teklif alın',
      },
      {
        icon: '▤',
        ad: 'Mutfak Sipariş Yazıcısı',
        aciklama: 'Siparişleri mutfak ve bar gibi hazırlık bölümlerine otomatik iletmek için dayanıklı yazıcı.',
        ozellikler: ['Sesli uyarı desteği', 'Yoğun kullanıma uygun', 'Bölüm bazlı yönlendirme'],
        fiyat: 'Fiyat için teklif alın',
      },
    ],
  },
  {
    slug: 'yazar-kasalar',
    ad: 'Yazar Kasalar',
    aciklama: 'İşletme yapınıza ve mevzuat ihtiyaçlarınıza göre planlanan yeni nesil ödeme ve yazar kasa çözümleri.',
    urunler: [
      {
        icon: '▥',
        ad: 'Yeni Nesil Yazar Kasa Çözümü',
        aciklama: 'Satış noktanızdaki ödeme ve mali belge ihtiyaçları için işletmeye uygun cihaz seçimi ve kurulum desteği.',
        ozellikler: ['İşletmeye uygun cihaz seçimi', 'POS alanına uygun kurulum', 'Teknik destek planlaması'],
        fiyat: 'Model için teklif alın',
      },
      {
        icon: '💳',
        gorsel: '/products/mobil-odeme-terminali.webp',
        ad: 'Mobil Ödeme Terminali',
        aciklama: 'Masada veya hareketli satış noktasında kartla ödeme almak için taşınabilir terminal seçeneği.',
        ozellikler: ['Taşınabilir kullanım', 'Kartla ödeme desteği', 'Servis akışına uygun'],
        fiyat: 'Model için teklif alın',
      },
    ],
  },
  {
    slug: 'diger-urunler',
    ad: 'Diğer Ürünler',
    aciklama: 'Satış noktasını tamamlayan barkod, kasa, etiket ve müşteri ekranı ekipmanları.',
    urunler: [
      {
        icon: '▱',
        gorsel: '/products/para-cekmecesi.webp',
        ad: 'Otomatik Para Çekmecesi',
        aciklama: 'Fiş yazıcı üzerinden otomatik açılabilen, dayanıklı metal para çekmecesi.',
        ozellikler: ['5 + 8 bölmeli', 'Otomatik açılma', 'Metal gövde'],
        fiyat: 'Fiyat için teklif alın',
      },
      {
        icon: '▥',
        ad: 'Barkod Okuyucu',
        aciklama: 'Market ve perakende satışlarında ürünleri saniyeler içinde sepete ekleyen okuyucu.',
        ozellikler: ['USB bağlantı', 'EAN-8 ve EAN-13 desteği', 'Hızlı okutma'],
        fiyat: 'Fiyat için teklif alın',
      },
      {
        icon: '🏷️',
        ad: 'Barkod Etiket Yazıcısı',
        aciklama: 'Raf ve ürün etiketlerini istenen ölçüde tek tek basmak için termal etiket yazıcısı.',
        ozellikler: ['Özel etiket ölçüsü', 'Barkod baskısı', 'Sıralı yazıcı kuyruğu'],
        fiyat: 'Fiyat için teklif alın',
      },
      {
        icon: '⚖️',
        gorsel: '/products/cas-hassas-terazi.webp',
        ad: 'CAS Hassas Satış Terazisi',
        aciklama: 'Gramaj ve kilogram üzerinden satılan ürünlerde hızlı ağırlık ve tutar hesabı için masaüstü terazi.',
        ozellikler: ['Hassas ağırlık ölçümü', 'Birim fiyat ve tutar hesabı', 'Market ve şarküteri kullanımına uygun'],
        fiyat: 'Fiyat için teklif alın',
      },
      {
        icon: '⚖️',
        gorsel: '/products/cas-barkodlu-terazi.webp',
        ad: 'CAS Barkod Etiketli Terazi',
        aciklama: 'Tartılan ürüne gramaj, fiyat ve barkod bilgisi içeren etiket basmak için profesyonel satış terazisi.',
        ozellikler: ['Dahili etiket yazıcısı', 'Müşteri göstergesi', 'Barkodlu tartım desteği'],
        fiyat: 'Fiyat için teklif alın',
      },
      {
        icon: '▰',
        ad: 'Müşteri Fiyat Göstergesi',
        aciklama: 'Satış sırasında ürün ve toplam tutarı müşteriye anlık göstermek için ikinci ekran.',
        ozellikler: ['Anlık tutar gösterimi', 'Kasa yanı kullanım', 'Kolay okunur ekran'],
        fiyat: 'Fiyat için teklif alın',
      },
    ],
  },
];

export const LANDING_REFERENCES = [
  {
    gorsel: '/references/integra-pos-kurulumu-1.webp',
    baslik: 'Dokunmatik POS ve ödeme sistemi kurulumu',
    aciklama: 'Satış bilgisayarı, ödeme cihazları ve Integra yazılımı işletmenin çalışma düzenine göre hazırlanıp kullanıma teslim edildi.',
    etiketler: ['Yerinde kurulum', 'Cihaz bağlantıları', 'Kullanıma hazır teslim'],
  },
];

export const LANDING_PANEL_SUMMARIES = [
  { ad: 'Satış & Kasa', tutar: '18.460 TL', durum: 'Günlük ciro', renk: '#fff7ed' },
  { ad: 'Randevu', tutar: '14 işlem', durum: '3 bekliyor', renk: '#faf5ff' },
  { ad: 'Stok & Depo', tutar: '2 sevk', durum: 'Onay bekliyor', renk: '#f0fdf4' },
];

export const LANDING_TRUST_FEATURES = [
  ['🧩', 'İşletmeye özel modüller', 'İhtiyacınız olan satış, randevu, stok, depo ve finans ekranlarını birlikte kullanın.'],
  ['📱', 'Mobil / tablet / bilgisayar', 'Dokunmatik ekranlara ve farklı cihazlara uygun hızlı çalışma düzeni.'],
  ['📊', 'Canlı rapor ve gün sonu', 'Kasa, ödeme, kâr, cari, işlem ve stok verileri anlık takip edilir.'],
  ['🔐', 'Rol bazlı kullanım', 'Her personel yalnızca yetkili olduğu işletme ekranlarını görür.'],
];

export const LANDING_OPERATION_FLOW = [
  ['1', 'Kayıt veya satış başlar', 'Masa, barkod, hızlı satış, randevu ya da müşteri kaydıyla doğru akış açılır.'],
  ['2', 'Personel görevini yürütür', 'Yetkili kullanıcı kendi ekranında siparişi, işlemi, stoğu veya sevki yönetir.'],
  ['3', 'Ödeme ve stok işlenir', 'Tahsilat, cari, stok düşümü ve depo hareketleri işlemle birlikte kaydedilir.'],
  ['4', 'Gün sonu rapora yansır', 'Satış, hizmet, ödeme, maliyet ve personel sonuçları tek raporda toplanır.'],
];

export const LANDING_BUSINESS_TYPES = [
  ['🍽️', 'Restoran', 'Masa, mutfak ve ödeme akışı'],
  ['☕', 'Kafe', 'Hızlı ürün seçimi ve kasa kontrolü'],
  ['🍔', 'Fast food', 'Yoğun saatlerde hızlı adisyon'],
  ['🥔', 'Kumpirci / büfe', 'Seçenekli ürün ve not sistemi'],
  ['🍰', 'Tatlıcı', 'Departman ve KDV takibi'],
  ['🛵', 'Paket servis', 'Paket ekranına hazır altyapı'],
  ['🏪', 'Market / Tekel', 'Barkodlu satış, stok ve etiket'],
  ['🧺', 'Şarküteri / Büfe', 'Alış faturası, sayım ve fiyat yönetimi'],
  ['✂️', 'Kuaför / Berber', 'Müşteri, randevu, personel ve gün sonu'],
  ['💆', 'Güzellik / Bakım', 'İşlem planı, müşteri geçmişi ve ödeme'],
  ['🧰', 'Servis / Atölye', 'Müşteri kaydı, iş takibi, stok ve tahsilat'],
  ['🏢', 'Çok Şubeli İşletme', 'Merkez depo, şube sevki ve ortak rapor'],
];

export const LANDING_MODULES = [
  ['🪑', 'Masa & Bölüm Yönetimi', 'Salon, bahçe, teras gibi bölümlere masa ekleyin; masa aktarımıyla adisyonu boş masaya taşıyın.'],
  ['🍽️', 'Grup Bazlı Menü', 'Ana yemek, içecek, tatlı gibi gruplar; departman, KDV ve mutfağa gönderme ayarları.'],
  ['👨‍🍳', 'Mutfak Ekranı', 'Mutfağa gidecek ürünler notlarıyla birlikte mutfak ekranına düşer, hazırlandı yapılınca listeden kalkar.'],
  ['💳', 'Ödeme & Para Üstü', 'Nakit, kredi kartı ve parçalı ödeme; alınan tutara göre para üstü hesabı.'],
  ['🏷️', 'İndirim & Fiyat Değiştirme', 'Satış anında ürün fiyatı değiştirin, yüzde veya TL indirim uygulayın.'],
  ['📊', 'Raporlama', 'Günlük, aylık ve tarih aralıklı rapor; gün sonu çıktısı ve ödeme kırılımı.'],
  ['🧾', 'Fiş & Adisyon Yazdırma', 'Hesap öncesi adisyon, ödeme sonrası fiş ve gün sonu raporu yazdırma.'],
  ['👥', 'Personel Kullanımı', 'Patron, garson, mutfak ve admin akışlarını ayrı ekranlarla yönetin.'],
  ['▥', 'Barkodlu Market Satışı', 'USB veya Bluetooth barkod okuyucuyla ürünü hızla bulun, satışı tamamlayın ve stoğu otomatik düşürün.'],
  ['📋', 'Alış, Sayım & Etiket', 'Alış faturasıyla stok artırın, barkodla sayım yapın, toplu fiyat güncelleyip raf etiketi basın.'],
  ['✂️', 'Randevu & Müşteri Geçmişi', 'Kayıtlı müşteri ve personelle gün planı oluşturun; işlem, malzeme, ödeme ve ziyaret geçmişini saklayın.'],
  ['🏭', 'Merkez Depo & Şube Sevki', 'Alışı depoya alın; şubeye sevk edilen stoğu teslim onayından sonra işletme stoklarına aktarın.'],
  ['💰', 'Cari & Finans', 'Tahsilat, ödeme, cari bakiye, kasa hareketi ve gün sonu sonuçlarını tek yerde izleyin.'],
];

export const LANDING_SETUP_STEPS = [
  ['1', 'İşletme başvuru yapar', 'Admin panelinden hesap aktif edilir.'],
  ['2', 'Gerekli modüller açılır', 'Restoran, market, kuaför, depo veya finans panelleri ihtiyaca göre yetkilendirilir.'],
  ['3', 'Katalog ve kayıtlar hazırlanır', 'Ürün, hizmet, müşteri, personel, şube ve stok başlangıçları tanımlanır.'],
  ['4', 'Günlük işlem yürütülür', 'Sipariş, barkodlu satış, randevu, alış veya sevk işlemi ilgili panelden yapılır.'],
  ['5', 'Ödeme ve hareket kaydedilir', 'Nakit, kart, cari ve diğer hareketler işleme bağlanır.'],
  ['6', 'Yönetici sonucu izler', 'Gün sonu, satış, hizmet, personel, stok ve kâr raporları takip edilir.'],
];

export const LANDING_PANEL_PREVIEWS = [
  ['🪑 Restoran & Kafe', 'Masa, adisyon, mutfak, paket servis, reçete ve ödeme akışları.'],
  ['▥ Market & Perakende', 'Barkodlu satış, hızlı tuşlar, alış, sayım, etiket ve cari takibi.'],
  ['✂️ Kuaför & Hizmet', 'Müşteri kartı, kayıtlı personel, randevu planı, işlem ve ödeme geçmişi.'],
  ['🏭 Depo & Yönetim', 'Merkez alış, şube sevki, stok, finans, yetki ve birleşik raporlar.'],
];

export const LANDING_PRODUCTS = [
  {
    icon: '▣',
    kategori: 'POS Donanımı',
    ad: 'Dokunmatik POS Bilgisayar',
    aciklama: 'Yoğun satış noktaları için dokunmatik ekranlı, masaüstü kullanıma uygun POS bilgisayarı.',
    ozellikler: ['15,6 inç dokunmatik ekran', 'Windows işletim sistemi', 'Wi-Fi ve hoparlör'],
    fiyat: 'Teklif alın',
  },
  {
    icon: '▤',
    kategori: 'Yazıcı',
    ad: '80 mm Fiş Yazıcı',
    aciklama: 'Satış fişi, adisyon ve mutfak çıktıları için hızlı termal yazıcı.',
    ozellikler: ['80 mm termal baskı', 'USB ve Ethernet', '203 DPI baskı kalitesi'],
    fiyat: 'Teklif alın',
  },
  {
    icon: '▱',
    kategori: 'Kasa Donanımı',
    ad: 'Otomatik Para Çekmecesi',
    aciklama: 'Fiş yazıcıyla birlikte otomatik açılan dayanıklı metal para çekmecesi.',
    ozellikler: ['5 + 8 bölmeli', 'Otomatik açılma', 'Metal gövde'],
    fiyat: 'Teklif alın',
  },
  {
    icon: '⌘',
    kategori: 'Yazılım',
    ad: 'Integra POS Yazılımı',
    aciklama: 'Satış, stok, personel, masa ve rapor yönetimini tek merkezde birleştiren işletme yazılımı.',
    ozellikler: ['Stok ve personel takibi', 'Satış analizleri', 'Hızlı satış ve masa takibi'],
    fiyat: 'İşletmeye özel',
  },
];

export const LANDING_CAMPAIGNS = [
  {
    etiket: 'Yeni işletmelere özel',
    ad: 'Donanımlı Integra POS Seti',
    aciklama: 'Satışa başlamak için gereken temel donanım ve Integra POS yazılımı tek kampanya setinde.',
    fiyat: '35.999 TL',
    vergi: 'KDV dahil',
    gorsel: '/campaigns/donanimli-pos-seti.webp',
    icerik: ['Dokunmatik POS bilgisayar', '80 mm fiş yazıcı', 'Otomatik para çekmecesi', 'Integra POS programı'],
    avantajlar: ['Yıllık ücret yok', 'Kurulum desteği', 'Satışa hazır set'],
  },
];

export const LANDING_ADVANTAGES = [
  ['Bulut', 'Kurulum gerektirmez'],
  ['Rol bazlı', 'Kullanıcı ekranları'],
  ['Anlık', 'Satış ve operasyon takibi'],
  ['Detaylı', 'Rapor ve gün sonu'],
];

export const LANDING_SUPPORT_TOPICS = [
  'Yeni özellik isteği', 'Fiş/yazıcı desteği', 'Kullanım veya kurulum desteği', 'Hata bildirimi ve iyileştirme',
];

export const LANDING_FAQS = [
  ['Hangi işletmeler kullanabilir?', 'Restoran, kafe, market, kuaför, güzellik salonu, servis, atölye ve farklı satış/hizmet işletmeleri için gerekli modüller ayrı ayrı açılabilir.'],
  ['Telefon ve tabletten kullanılabilir mi?', 'Evet. Sistem web tabanlıdır; telefon, dokunmatik tablet ve bilgisayar tarayıcısından kullanılabilir.'],
  ['Her personel tüm ekranları görür mü?', 'Hayır. İşletme sahibi her kullanıcıya yalnızca görevinde ihtiyaç duyduğu panel ve işlem yetkilerini açabilir.'],
  ['Randevu ve satış aynı rapora yansır mı?', 'Tamamlanıp ödemesi alınan randevu işlemleri gün sonu ve ana satış raporlarına aktarılır.'],
  ['Depo ve şubeler birlikte çalışır mı?', 'Evet. Alış merkez depoya alınabilir; sevk, şube tarafından onaylanınca şube stoğuna geçer.'],
  ['Kurulum gerekiyor mu?', 'Temel kullanım için ekstra kurulum gerekmez; internet olan cihazdan giriş yapılır. Yazıcı ve donanım bağlantıları ihtiyaca göre ayrıca kurulur.'],
];
