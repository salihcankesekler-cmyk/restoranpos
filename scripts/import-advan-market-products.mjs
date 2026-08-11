import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const PROJECT_REF = 'ahnusgkdlzdtmxerlthg';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const RESTAURANT_ID = 44;
const EXPECTED_RESTAURANT_NAME = 'BİLKENT TEPE MARKET';
const QUICK_GROUPS = new Set(['barkodsuz', 'ekmek', 'fiyat gir']);
const BATCH_SIZE = 250;

const csvPath = process.argv[2];
const applyChanges = process.argv.includes('--apply');
const verifyOnly = process.argv.includes('--verify');

if (!csvPath) {
  throw new Error('Kullanım: node scripts/import-advan-market-products.mjs <CSV yolu> [--apply]');
}

function parseCsv(text, delimiter = ';') {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    if (row.some(value => value !== '')) rows.push(row);
  }

  return rows;
}

function normalizeKey(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function parsePrice(value) {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  const normalized = raw.includes(',') ? raw.replaceAll('.', '').replace(',', '.') : raw;
  const price = Number(normalized);
  if (!Number.isFinite(price) || price < 0) throw new Error(`Geçersiz fiyat: ${raw}`);
  return Math.round((price + Number.EPSILON) * 100) / 100;
}

function serviceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;

  const args = [
    'projects', 'api-keys',
    '--project-ref', PROJECT_REF,
    '--reveal',
    '--output', 'json',
  ];
  const output = process.platform === 'win32'
    ? execFileSync(process.env.ComSpec || 'cmd.exe', [
      '/d', '/s', '/c', `supabase ${args.join(' ')}`,
    ], { encoding: 'utf8', windowsHide: true })
    : execFileSync('supabase', args, { encoding: 'utf8' });
  const keys = JSON.parse(output);
  const serviceRole = keys.find(key => key.name === 'service_role' && key.type === 'legacy');
  const value = serviceRole?.api_key || serviceRole?.key;
  if (!value) throw new Error('Supabase service_role anahtarı alınamadı. Önce Supabase CLI oturumu açılmalı.');
  return value;
}

const csvText = await readFile(csvPath, 'utf8');
const parsed = parseCsv(csvText.replace(/^\uFEFF/, ''));
if (parsed.length < 2) throw new Error('CSV içinde ürün satırı bulunamadı.');

const headers = parsed[0].map(value => value.trim());
const column = name => {
  const index = headers.indexOf(name);
  if (index < 0) throw new Error(`CSV kolonu bulunamadı: ${name}`);
  return index;
};
const barcodeIndex = column('Barkod');
const nameIndex = column('İsim');
const groupIndex = column('Grup');
const priceIndex = column('Fiyat');

let generatedBarcodeSequence = 0;
const seenBarcodes = new Set();
const products = parsed.slice(1).map((values, rowIndex) => {
  const productName = String(values[nameIndex] || '').trim();
  const groupName = String(values[groupIndex] || '').trim() || 'Genel';
  const sourceBarcode = String(values[barcodeIndex] || '').trim();
  if (!productName) throw new Error(`${rowIndex + 2}. satırda ürün adı boş.`);

  generatedBarcodeSequence += sourceBarcode ? 0 : 1;
  const barcode = sourceBarcode || `BARKODSUZ-ADVAN-${String(generatedBarcodeSequence).padStart(4, '0')}`;
  if (seenBarcodes.has(barcode)) throw new Error(`${rowIndex + 2}. satırda tekrarlanan barkod: ${barcode}`);
  seenBarcodes.add(barcode);

  return {
    barcode,
    sourceBarcode,
    productName,
    groupName,
    price: parsePrice(values[priceIndex]),
  };
});

const groupNames = [...new Map(products.map(product => [normalizeKey(product.groupName), product.groupName])).values()];
const supabase = createClient(SUPABASE_URL, serviceRoleKey(), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: restaurant, error: restaurantError } = await supabase
  .from('restaurants')
  .select('id, restaurant_name, name, email, isletme_tipi, durum, rol')
  .eq('id', RESTAURANT_ID)
  .single();
if (restaurantError) throw restaurantError;

const restaurantName = restaurant.restaurant_name || restaurant.name || '';
if (normalizeKey(restaurantName) !== normalizeKey(EXPECTED_RESTAURANT_NAME)
  || normalizeKey(restaurant.isletme_tipi) !== normalizeKey('Market')
  || normalizeKey(restaurant.rol) !== normalizeKey('owner')) {
  throw new Error(`Hedef işletme doğrulanamadı: ${restaurantName} (#${restaurant.id})`);
}

const [{ count: currentGroupCount, error: groupCountError }, { count: currentProductCount, error: productCountError }] = await Promise.all([
  supabase.from('market_gruplari').select('*', { count: 'exact', head: true }).eq('restaurant_id', RESTAURANT_ID),
  supabase.from('market_urunleri').select('*', { count: 'exact', head: true }).eq('restaurant_id', RESTAURANT_ID),
]);
if (groupCountError) throw groupCountError;
if (productCountError) throw productCountError;

console.log(JSON.stringify({
  mode: applyChanges ? 'apply' : verifyOnly ? 'verify' : 'dry-run',
  target: { id: restaurant.id, name: restaurantName, email: restaurant.email },
  source: {
    rows: products.length,
    groups: groupNames.length,
    barcoded: products.filter(product => product.sourceBarcode).length,
    generatedBarcodes: products.filter(product => !product.sourceBarcode).length,
  },
  current: { groups: currentGroupCount || 0, products: currentProductCount || 0 },
}, null, 2));

async function verifyImportedProducts() {
  const importedProducts = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase
      .from('market_urunleri')
      .select('barkod, urun_adi, kategori, satis_fiyati')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('barkod')
      .range(start, start + 999);
    if (error) throw error;
    const page = Array.isArray(data) ? data : [];
    importedProducts.push(...page);
    if (page.length < 1000) break;
  }

  const destination = new Map(importedProducts.map(product => [String(product.barkod), product]));
  const mismatches = [];
  for (const product of products) {
    const imported = destination.get(product.barcode);
    if (!imported) {
      mismatches.push(`${product.barcode}: hedefte bulunamadı`);
      continue;
    }
    if (String(imported.urun_adi) !== product.productName
      || String(imported.kategori) !== product.groupName
      || Number(imported.satis_fiyati) !== product.price) {
      mismatches.push(`${product.barcode}: ad/grup/fiyat eşleşmiyor`);
    }
  }

  const sourceBarcodes = new Set(products.map(product => product.barcode));
  const extras = importedProducts.filter(product => !sourceBarcodes.has(String(product.barkod)));
  if (mismatches.length || extras.length || importedProducts.length !== products.length) {
    throw new Error(`Tam doğrulama başarısız. Hatalı/eksik: ${mismatches.length}, fazla: ${extras.length}, hedef: ${importedProducts.length}. ${mismatches.slice(0, 5).join(' | ')}`);
  }

  const { data: importedGroups, error: groupError } = await supabase
    .from('market_gruplari')
    .select('grup_adi')
    .eq('restaurant_id', RESTAURANT_ID);
  if (groupError) throw groupError;
  const importedGroupKeys = new Set((importedGroups || []).map(group => normalizeKey(group.grup_adi)));
  const missingGroups = groupNames.filter(groupName => !importedGroupKeys.has(normalizeKey(groupName)));
  if (missingGroups.length || importedGroupKeys.size !== groupNames.length) {
    throw new Error(`Grup doğrulaması başarısız. Eksik gruplar: ${missingGroups.join(', ') || '-'}`);
  }

  return {
    ok: true,
    checked: importedProducts.length,
    fields: ['barkod', 'urun_adi', 'kategori', 'satis_fiyati'],
    groups: importedGroupKeys.size,
    mismatches: 0,
  };
}

if (verifyOnly) {
  console.log(JSON.stringify(await verifyImportedProducts(), null, 2));
  process.exit(0);
}
if (!applyChanges) process.exit(0);

const { data: existingGroups, error: existingGroupsError } = await supabase
  .from('market_gruplari')
  .select('*')
  .eq('restaurant_id', RESTAURANT_ID);
if (existingGroupsError) throw existingGroupsError;

const groupMap = new Map((existingGroups || []).map(group => [normalizeKey(group.grup_adi), group]));
for (const [index, groupName] of groupNames.entries()) {
  const key = normalizeKey(groupName);
  if (groupMap.has(key)) continue;

  const quickGroup = QUICK_GROUPS.has(key);
  const { data: insertedGroup, error } = await supabase
    .from('market_gruplari')
    .insert({
      restaurant_id: RESTAURANT_ID,
      grup_adi: groupName,
      satis_ekraninda_goster: quickGroup,
      sira: index + 1,
      kdv_orani: 20,
      grup_rengi: '#c2410c',
      urun_rengi: '#0f172a',
    })
    .select('*')
    .single();
  if (error) throw error;
  groupMap.set(key, insertedGroup);
}

const groupSequences = new Map();
const payload = products.map(product => {
  const groupKey = normalizeKey(product.groupName);
  const group = groupMap.get(groupKey);
  if (!group) throw new Error(`Grup oluşturulamadı: ${product.groupName}`);
  const sequence = (groupSequences.get(groupKey) || 0) + 1;
  groupSequences.set(groupKey, sequence);
  const showAsShortcut = QUICK_GROUPS.has(groupKey) || !product.sourceBarcode;

  return {
    restaurant_id: RESTAURANT_ID,
    grup_id: group.id,
    barkod: product.barcode,
    urun_adi: product.productName,
    stok_kodu: null,
    kategori: group.grup_adi,
    marka: null,
    birim: 'Adet',
    kdv_orani: Number(group.kdv_orani ?? 20),
    alis_fiyati: 0,
    satis_fiyati: product.price,
    stok_miktari: 0,
    minimum_stok: 0,
    raf_konumu: null,
    aktif: true,
    hizli_satis: false,
    sira: sequence,
    satis_ekraninda_goster: showAsShortcut,
  };
});

for (let start = 0; start < payload.length; start += BATCH_SIZE) {
  const batch = payload.slice(start, start + BATCH_SIZE);
  const { error } = await supabase
    .from('market_urunleri')
    .upsert(batch, { onConflict: 'restaurant_id,barkod' });
  if (error) throw new Error(`${start + 1}-${start + batch.length}. ürün grubunda aktarım hatası: ${error.message}`);
  console.log(`Aktarıldı: ${start + batch.length}/${payload.length}`);
}

const [{ count: finalGroupCount, error: finalGroupError }, { count: finalProductCount, error: finalProductError }] = await Promise.all([
  supabase.from('market_gruplari').select('*', { count: 'exact', head: true }).eq('restaurant_id', RESTAURANT_ID),
  supabase.from('market_urunleri').select('*', { count: 'exact', head: true }).eq('restaurant_id', RESTAURANT_ID),
]);
if (finalGroupError) throw finalGroupError;
if (finalProductError) throw finalProductError;
if (finalGroupCount !== groupNames.length || finalProductCount !== products.length) {
  throw new Error(`Aktarım doğrulaması başarısız. Beklenen ${groupNames.length}/${products.length}, bulunan ${finalGroupCount}/${finalProductCount}.`);
}

const verification = await verifyImportedProducts();

console.log(JSON.stringify({
  ok: true,
  target: { id: restaurant.id, name: restaurantName },
  imported: { groups: finalGroupCount, products: finalProductCount },
  verification,
}, null, 2));
