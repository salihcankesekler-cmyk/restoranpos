const DB_NAME = 'integra-pos-offline';
const DB_VERSION = 1;
const SNAPSHOT_STORE = 'snapshots';
const QUEUE_STORE = 'operation_queue';

const openDatabase = () => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') {
    reject(new Error('Bu cihaz çevrimdışı veri deposunu desteklemiyor.'));
    return;
  }

  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(SNAPSHOT_STORE)) {
      database.createObjectStore(SNAPSHOT_STORE, { keyPath: 'key' });
    }
    if (!database.objectStoreNames.contains(QUEUE_STORE)) {
      const queue = database.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      queue.createIndex('restaurant_type', ['restaurantId', 'type'], { unique: false });
      queue.createIndex('createdAt', 'createdAt', { unique: false });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Çevrimdışı veri deposu açılamadı.'));
});

const requestResult = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Çevrimdışı veri işlemi tamamlanamadı.'));
});

const withStore = async (storeName, mode, operation) => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const transactionDone = new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Çevrimdışı işlem kaydedilemedi.'));
      transaction.onabort = () => reject(transaction.error || new Error('Çevrimdışı işlem iptal edildi.'));
    });
    const result = await operation(store);
    await transactionDone;
    return result;
  } finally {
    database.close();
  }
};

export const cevrimdisiSnapshotKaydet = (key, data) => withStore(SNAPSHOT_STORE, 'readwrite', store => {
  store.put({ key: String(key), data, updatedAt: new Date().toISOString() });
});

export const cevrimdisiSnapshotGetir = async key => {
  const record = await withStore(SNAPSHOT_STORE, 'readonly', store => requestResult(store.get(String(key))));
  return record?.data || null;
};

export const cevrimdisiIslemEkle = operation => {
  const record = {
    ...operation,
    id: String(operation.id),
    restaurantId: String(operation.restaurantId),
    createdAt: operation.createdAt || new Date().toISOString(),
  };
  return withStore(QUEUE_STORE, 'readwrite', store => { store.put(record); });
};

export const cevrimdisiIslemleriGetir = async ({ restaurantId, type } = {}) => {
  const records = await withStore(QUEUE_STORE, 'readonly', store => requestResult(store.getAll()));
  return (Array.isArray(records) ? records : [])
    .filter(record => !restaurantId || String(record.restaurantId) === String(restaurantId))
    .filter(record => !type || record.type === type)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
};

export const cevrimdisiIslemSil = id => withStore(QUEUE_STORE, 'readwrite', store => { store.delete(String(id)); });

export const cevrimdisiKuyrukSayisi = async ({ restaurantId, type } = {}) => {
  const records = await cevrimdisiIslemleriGetir({ restaurantId, type });
  return records.length;
};

export const cevrimdisiAgHatasiMi = error => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const message = String(error?.message || error || '').toLocaleLowerCase('tr-TR');
  return ['failed to fetch', 'fetch failed', 'networkerror', 'network request failed', 'load failed', 'internet', 'bağlantı']
    .some(part => message.includes(part));
};
