const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const { execFile } = require('child_process');

const SUPABASE_URL = 'https://ahnusgkdlzdtmxerlthg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DxBWuwcH5u5CdJhCPpAfug_o0gNLNcU';

const APP_DIR = process.pkg ? path.dirname(process.execPath) : __dirname;
const CONFIG_PATH = path.join(APP_DIR, 'config.json');

const DEFAULT_CONFIG = {
  installationCode: '',
  restaurantId: null,
  restaurantName: '',
  checkIntervalMs: 3000,
  printers: { adisyon: 'adisyon', mutfak: 'mutfak', bar: 'bar', etiket: 'etiket' },
  barFallbackToMutfak: true,
  printLegacyKitchenTickets: true,
};

function log(message, extra = '') {
  const stamp = new Date().toLocaleString('tr-TR');
  console.log(`[${stamp}] ${message}${extra ? ' ' + extra : ''}`);
}

function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return { ...DEFAULT_CONFIG, ...parsed, printers: { ...DEFAULT_CONFIG.printers, ...(parsed.printers || {}) } };
  } catch { return { ...DEFAULT_CONFIG }; }
}
function writeConfig(config) { fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8'); }
function requireInstallationCode(config) {
  const code = String(config.installationCode || '').trim();
  if (!code) throw new Error('Kurulum kodu yok. Once su komutu calistir: IntegraPrinterAgent.exe setup INT-26-XXXX');
  return code;
}
async function supabaseRpc(functionName, payload) {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${functionName}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });
  const text = await response.text();
  if (!response.ok) {
    let detail = text;
    try { const parsed = JSON.parse(text); detail = parsed.message || parsed.error || text; } catch {}
    throw new Error(`Supabase RPC hatasi (${functionName}): ${response.status} ${detail}`);
  }
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}
function psQuote(value) { return `'${String(value || '').replace(/'/g, "''")}'`; }
function runPowerShell(command, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile','-ExecutionPolicy','Bypass','-Command',command], { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
      if (error) { reject(new Error((stderr || error.message || '').trim())); return; }
      resolve(String(stdout || '').trim());
    });
  });
}
async function getWindowsPrinters() {
  const command = "Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json -Compress";
  const stdout = await runPowerShell(command);
  if (!stdout) return [];
  try { const parsed = JSON.parse(stdout); return Array.isArray(parsed) ? parsed : [parsed]; }
  catch { return stdout.split(/\r?\n/).map(x => x.trim()).filter(Boolean); }
}
function findPrinter(printerNames, wantedName) {
  const wanted = String(wantedName || '').trim().toLocaleLowerCase('tr-TR');
  return printerNames.find(name => String(name || '').trim().toLocaleLowerCase('tr-TR') === wanted) || null;
}
function findLabelPrinter(printerNames, wantedName) {
  const exact = findPrinter(printerNames, wantedName);
  if (exact) return exact;
  const anahtarlar = ['etiket', 'barkod', 'barcode', 'label', 'zebra', 'tsc', 'xprinter', 'godex', 'argox'];
  return printerNames.find(name => anahtarlar.some(anahtar => String(name || '').toLocaleLowerCase('tr-TR').includes(anahtar))) || null;
}
async function checkStandardPrinters(config = readConfig()) {
  const names = await getWindowsPrinters();
  const resolved = { adisyon: findPrinter(names, config.printers.adisyon), mutfak: findPrinter(names, config.printers.mutfak), bar: findPrinter(names, config.printers.bar), etiket: findLabelPrinter(names, config.printers.etiket), all: names };
  if (!resolved.bar && config.barFallbackToMutfak && resolved.mutfak) resolved.bar = resolved.mutfak;
  return resolved;
}
function line(char='-', count=32){ return char.repeat(count); }
function center(text,width=32){ const value=String(text||''); if(value.length>=width) return value.slice(0,width); const left=Math.floor((width-value.length)/2); return `${' '.repeat(left)}${value}`; }
function safe(value,fallback='-'){ const temiz=String(value??'').trim(); return temiz||fallback; }
function isBarDepartment(departman){ const d=String(departman||'').toLocaleLowerCase('tr-TR'); return d.includes('bar')||d.includes('içecek')||d.includes('icecek')||d.includes('i̇çecek')||d.includes('kahve')||d.includes('çay')||d.includes('cay'); }
function normalizePrinterKey(value,fallback='adisyon'){ const v=String(value||'').toLocaleLowerCase('tr-TR'); if(v.includes('etiket')||v.includes('barkod')||v.includes('barcode')||v.includes('label')) return 'etiket'; if(v.includes('bar')||v.includes('içecek')||v.includes('icecek')) return 'bar'; if(v.includes('mutfak')||v.includes('yemek')) return 'mutfak'; if(v.includes('adisyon')||v.includes('hesap')||v.includes('kasa')) return 'adisyon'; return fallback; }
function printerKeyForDepartment(departman){ return isBarDepartment(departman) ? 'bar' : 'mutfak'; }
function formatKitchenTicket(fis, printerKey){ const tarih=fis.created_at?new Date(fis.created_at):new Date(); return [center('INTEGRA POS'),center(printerKey==='bar'?'BAR FISI':'MUTFAK FISI'),line('='),`Fis No : ${safe(fis.id)}`,`Tarih  : ${tarih.toLocaleString('tr-TR')}`,`Masa   : ${safe(fis.masa_adi)}`,`Depart.: ${safe(fis.departman,'Mutfak')}`,`Garson : ${safe(fis.garson_adi)}`,line('-'),`${Number(fis.adet||1)} x ${safe(fis.urun_adi)}`,fis.not_metni?`NOT: ${fis.not_metni}`:'',line('='),'\n\n\n'].filter(Boolean).join('\r\n'); }
function formatQueueTicket(job){ const title=job.baslik||job.fis_tipi||'FIS'; const body=job.icerik_text||''; return [center('INTEGRA POS'),center(String(title).toUpperCase()),line('='),body,line('='),'\n\n\n'].filter(Boolean).join('\r\n'); }
function formatTestTicket(printerKey, printerName){ return [center('INTEGRA POS'),center('TEST FISI'),line('='),`Yazici : ${printerName}`,`Tip    : ${printerKey}`,`Tarih  : ${new Date().toLocaleString('tr-TR')}`,line('-'),'Bu bir test fisidir.','Yazici baglantisi calisiyor.',line('='),'\n\n\n'].join('\r\n'); }
async function printTextToWindowsPrinter(printerName,text){ if(!printerName) throw new Error('Yazici adi bos.'); const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'integra-print-')); const filePath=path.join(tempDir,`fis-${Date.now()}.txt`); fs.writeFileSync(filePath,text,'utf8'); const command=[`$p = ${psQuote(filePath)}`,`$printer = ${psQuote(printerName)}`,`Get-Content -Path $p -Encoding UTF8 | Out-Printer -Name $printer`].join('; '); await runPowerShell(command,30000); setTimeout(()=>{try{fs.rmSync(tempDir,{recursive:true,force:true});}catch{}},5000); }
function parseLabelJob(job){
  const text=String(job?.icerik_text||'');
  const marker='INTEGRA_ETIKET_V1\n';
  if(!text.startsWith(marker)) return null;
  const satirlar=text.slice(marker.length).split('\n');
  const widthMm=Math.min(Math.max(Number(satirlar.shift()||58),20),120);
  const heightMm=Math.min(Math.max(Number(satirlar.shift()||40),15),100);
  const imageBase64=satirlar.join('').trim();
  if(!/^[A-Za-z0-9+/=]+$/.test(imageBase64) || imageBase64.length<100) throw new Error('Etiket gorseli gecersiz.');
  return {widthMm,heightMm,imageBase64};
}
async function printLabelToWindowsPrinter(printerName,label){
  if(!printerName) throw new Error('Etiket yazicisi adi bos.');
  const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'integra-label-'));
  const filePath=path.join(tempDir,`etiket-${Date.now()}-${Math.random().toString(16).slice(2)}.png`);
  fs.writeFileSync(filePath,Buffer.from(label.imageBase64,'base64'));
  const widthHi=Math.max(Math.round(Number(label.widthMm)*100/25.4),1);
  const heightHi=Math.max(Math.round(Number(label.heightMm)*100/25.4),1);
  const command=[
    'Add-Type -AssemblyName System.Drawing',
    `$p = ${psQuote(filePath)}`,
    `$printer = ${psQuote(printerName)}`,
    `$w = ${widthHi}`,
    `$h = ${heightHi}`,
    '$img = [System.Drawing.Image]::FromFile($p)',
    '$doc = New-Object System.Drawing.Printing.PrintDocument',
    '$doc.PrinterSettings.PrinterName = $printer',
    '$doc.PrintController = New-Object System.Drawing.Printing.StandardPrintController',
    '$paper = New-Object System.Drawing.Printing.PaperSize("Integra Etiket", $w, $h)',
    '$doc.DefaultPageSettings.PaperSize = $paper',
    '$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0,0,0,0)',
    '$handler = [System.Drawing.Printing.PrintPageEventHandler]{ param($sender,$e) $e.Graphics.TranslateTransform(-$e.PageSettings.HardMarginX,-$e.PageSettings.HardMarginY); $e.Graphics.DrawImage($img,0,0,$w,$h); $e.HasMorePages=$false }',
    '$doc.add_PrintPage($handler)',
    'try { $doc.Print() } finally { $doc.remove_PrintPage($handler); $img.Dispose(); $doc.Dispose() }',
  ].join('; ');
  try{ await runPowerShell(command,45000); }
  finally{ setTimeout(()=>{try{fs.rmSync(tempDir,{recursive:true,force:true});}catch{}},5000); }
}
async function resolveInstallationCode(code){ try{ const data=await supabaseRpc('printer_agent_resolve_code',{p_kurulum_kodu:code}); const row=Array.isArray(data)?data[0]:data; if(row) return row; } catch(err){ log(`Kurulum kodu RPC okunamadi, direkt mod deneniyor: ${err.message}`); } const match=String(code||'').match(/INT-(\d+)/i); if(!match) throw new Error('Kurulum kodu bulunamadi veya pasif.'); return { restaurant_id:Number(match[1]), restaurant_name:`Restoran ${match[1]}`, kurulum_kodu:String(code||'').trim(), aktif:true, adisyon_yazici_adi:'adisyon', mutfak_yazici_adi:'mutfak', bar_yazici_adi:'bar', bar_yoksa_mutfaga_gonder:true }; }
function askQuestion(question){ const rl=readline.createInterface({input:process.stdin,output:process.stdout}); return new Promise(resolve=>rl.question(question,answer=>{rl.close(); resolve(answer);})); }
async function setupAgent(){ const typedCode=String(process.argv[3]||process.argv[2]||'').trim(); const code=typedCode&&typedCode.toLowerCase()!=='setup'?typedCode:String(await askQuestion('Kurulum kodunu girin (orn: INT-26-A8F4): ')).trim(); if(!code) throw new Error('Kurulum kodu girilmedi.'); const row=await resolveInstallationCode(code); const config=readConfig(); const nextConfig={...config,installationCode:row.kurulum_kodu||code,restaurantId:Number(row.restaurant_id),restaurantName:row.restaurant_name||'',printers:{adisyon:row.adisyon_yazici_adi||config.printers.adisyon||'adisyon',mutfak:row.mutfak_yazici_adi||config.printers.mutfak||'mutfak',bar:row.bar_yazici_adi||config.printers.bar||'bar',etiket:row.etiket_yazici_adi||config.printers.etiket||'etiket'},barFallbackToMutfak:row.bar_yoksa_mutfaga_gonder!==false}; writeConfig(nextConfig); log('Kurulum tamamlandi.'); log(`Restoran: ${nextConfig.restaurantName} (#${nextConfig.restaurantId})`); log(`Yazicilar: adisyon=${nextConfig.printers.adisyon}, mutfak=${nextConfig.printers.mutfak}, bar=${nextConfig.printers.bar}, etiket=${nextConfig.printers.etiket}`); }
async function listPrintersOnly(){ const config=readConfig(); const printers=await checkStandardPrinters(config); log('Windows yazicilari:'); printers.all.forEach(name=>console.log(` - ${name}`)); console.log(''); log(`adisyon eslesmesi: ${printers.adisyon||'BULUNAMADI'}`); log(`mutfak  eslesmesi: ${printers.mutfak||'BULUNAMADI'}`); log(`bar     eslesmesi: ${printers.bar||'BULUNAMADI'}`); log(`etiket  eslesmesi: ${printers.etiket||'BULUNAMADI'}`); }
async function printTestTickets(){ const config=readConfig(); const printers=await checkStandardPrinters(config); for(const [key,name] of [['adisyon',printers.adisyon],['mutfak',printers.mutfak],['bar',printers.bar]]){ if(!name){ log(`UYARI: "${config.printers[key]}" yazicisi bulunamadi.`); continue; } log(`${key} test fisi yazdiriliyor -> ${name}`); await printTextToWindowsPrinter(name,formatTestTicket(key,name)); } log('Test islemi bitti.'); }
async function showStatus(){ const config=readConfig(); const code=requireInstallationCode(config); const row=await resolveInstallationCode(code); log('Agent durumu: BAGLI'); log(`Restoran: ${row.restaurant_name} (#${row.restaurant_id})`); log(`Kurulum kodu: ${row.kurulum_kodu}`); log(`Yazicilar: ${row.adisyon_yazici_adi}, ${row.mutfak_yazici_adi}, ${row.bar_yazici_adi}`); await listPrintersOnly(); }
async function fetchQueueJobs(config){ const data=await supabaseRpc('printer_agent_fetch_jobs',{p_kurulum_kodu:requireInstallationCode(config),p_limit:25}); return Array.isArray(data)?data:[]; }
async function markQueuePrinted(config,jobId,printerName){ await supabaseRpc('printer_agent_mark_job_printed',{p_kurulum_kodu:requireInstallationCode(config),p_job_id:jobId,p_yazici_adi:printerName}); }
async function markQueueError(config,jobId,message){ await supabaseRpc('printer_agent_mark_job_error',{p_kurulum_kodu:requireInstallationCode(config),p_job_id:jobId,p_hata_mesaji:String(message||'').slice(0,500)}); }
async function fetchKitchenTickets(config){ const data=await supabaseRpc('printer_agent_fetch_kitchen_tickets',{p_kurulum_kodu:requireInstallationCode(config),p_limit:25}); return Array.isArray(data)?data:[]; }
async function markKitchenPrinted(config,fisId,printerName){ await supabaseRpc('printer_agent_mark_kitchen_printed',{p_kurulum_kodu:requireInstallationCode(config),p_fis_id:fisId,p_yazici_adi:printerName}); }
async function markKitchenError(config,fisId,message){ await supabaseRpc('printer_agent_mark_kitchen_error',{p_kurulum_kodu:requireInstallationCode(config),p_fis_id:fisId,p_hata_mesaji:String(message||'').slice(0,500)}); }
async function processQueueOnce(){
  const config=readConfig();
  const printers=await checkStandardPrinters(config);
  const jobs=await fetchQueueJobs(config);
  if(jobs.length===0){ log('Bekleyen yazdirma kuyrugu yok.'); return; }
  log(`${jobs.length} bekleyen yazdirma kuyrugu bulundu.`);
  for(const job of jobs){
    try{
      const label=parseLabelJob(job);
      const fallback=label?'etiket':job.fis_tipi==='iptal'?'mutfak':'adisyon';
      const printerKey=normalizePrinterKey(job.yazici_tipi,fallback);
      const printerName=printers[printerKey];
      if(!printerName) throw new Error(`"${config.printers[printerKey]}" yazicisi bulunamadi.`);
      log(`Kuyruk #${job.id} yazdiriliyor -> ${printerName} (${printerKey})`);
      if(label) await printLabelToWindowsPrinter(printerName,label);
      else await printTextToWindowsPrinter(printerName,formatQueueTicket(job));
      await markQueuePrinted(config,job.id,printerName);
      log(`Kuyruk #${job.id} yazdirildi.`);
    }catch(err){
      const msg=err?.message||String(err);
      log(`Kuyruk #${job.id} hata: ${msg}`);
      await markQueueError(config,job.id,msg);
    }
  }
}
async function processKitchenOnce(){ const config=readConfig(); if(!config.printLegacyKitchenTickets) return; const printers=await checkStandardPrinters(config); const fisler=await fetchKitchenTickets(config); if(fisler.length===0){ log('Bekleyen mutfak/bar fisi yok.'); return; } log(`${fisler.length} bekleyen mutfak/bar fisi bulundu.`); for(const fis of fisler){ const printerKey=printerKeyForDepartment(fis.departman); const printerName=printers[printerKey]; if(!printerName){ const msg=`"${config.printers[printerKey]}" yazicisi bulunamadi.`; log(`Mutfak fisi #${fis.id} yazdirilamadi: ${msg}`); await markKitchenError(config,fis.id,msg); continue; } try{ log(`Mutfak fisi #${fis.id} yazdiriliyor -> ${printerName} (${safe(fis.departman)})`); await printTextToWindowsPrinter(printerName,formatKitchenTicket(fis,printerKey)); await markKitchenPrinted(config,fis.id,printerName); log(`Mutfak fisi #${fis.id} yazdirildi.`); } catch(err){ const msg=err?.message||String(err); log(`Mutfak fisi #${fis.id} hata: ${msg}`); await markKitchenError(config,fis.id,msg); } } }
async function processOnce(){ await processQueueOnce(); await processKitchenOnce(); }
async function startLoop(){ const config=readConfig(); const code=requireInstallationCode(config); const resolved=await resolveInstallationCode(code); log('Integra Printer Agent v3.5 basladi.'); log(`Restoran: ${resolved.restaurant_name} (#${resolved.restaurant_id})`); log(`Kurulum kodu: ${resolved.kurulum_kodu}`); log(`Kontrol araligi: ${config.checkIntervalMs} ms`); await listPrintersOnly(); while(true){ try{ await processOnce(); }catch(err){ log(err?.message||String(err)); } const freshConfig=readConfig(); await new Promise(resolve=>setTimeout(resolve,Number(freshConfig.checkIntervalMs||3000))); } }
async function main(){ const command=String(process.argv[2]||'start').toLowerCase(); if(command==='setup') return await setupAgent(); if(command==='printers') return await listPrintersOnly(); if(command==='test') return await printTestTickets(); if(command==='status') return await showStatus(); if(command==='queue-once') return await processQueueOnce(); if(command==='once') return await processOnce(); await startLoop(); }
if(require.main===module){
  main().catch(err=>{ console.error('\nHATA:',err?.message||err); process.exit(1); });
}
module.exports={parseLabelJob,normalizePrinterKey};
