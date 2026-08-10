param(
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$configPath = Join-Path $PSScriptRoot "config.json"
if (!(Test-Path -LiteralPath $configPath)) {
  throw "config.json bulunamadi: $configPath"
}

$yazicilar = @(Get-Printer | Sort-Object Name | Select-Object -ExpandProperty Name)
if ($yazicilar.Count -eq 0) {
  throw "Windows'ta kurulu yazici bulunamadi."
}

$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
if (!$config.printers) {
  $config | Add-Member -MemberType NoteProperty -Name printers -Value ([pscustomobject]@{})
}

$mevcut = if ($config.printers.PSObject.Properties.Name -contains "etiket") { [string]$config.printers.etiket } else { "" }
$otomatik = $yazicilar | Where-Object { $_ -match '(?i)etiket|barkod|barcode|label|zebra|tsc|xprinter|godex|argox' } | Select-Object -First 1
$secim = $null

if ($Quiet) {
  $secim = if ($otomatik) { $otomatik } elseif ($mevcut) { $mevcut } else { $null }
} else {
  Write-Host ""
  Write-Host "Etiketlerin basilacagi barkod yazicisini secin:" -ForegroundColor Cyan
  for ($index = 0; $index -lt $yazicilar.Count; $index++) {
    $isaret = if ($yazicilar[$index] -eq $otomatik) { " (onerilen)" } else { "" }
    Write-Host "[$($index + 1)] $($yazicilar[$index])$isaret"
  }
  Write-Host "[0] Simdilik atla"
  $cevap = Read-Host "Secim"
  $numara = 0
  if ([int]::TryParse($cevap, [ref]$numara) -and $numara -ge 1 -and $numara -le $yazicilar.Count) {
    $secim = $yazicilar[$numara - 1]
  }
}

if (!$secim) {
  if (!$Quiet) { Write-Host "Etiket yazicisi degistirilmedi." -ForegroundColor Yellow }
  exit 0
}

if ($config.printers.PSObject.Properties.Name -contains "etiket") {
  $config.printers.etiket = $secim
} else {
  $config.printers | Add-Member -MemberType NoteProperty -Name etiket -Value $secim
}

$json = $config | ConvertTo-Json -Depth 10
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($configPath, $json, $utf8NoBom)
if (!$Quiet) { Write-Host "Etiket yazicisi: $secim" -ForegroundColor Green }
