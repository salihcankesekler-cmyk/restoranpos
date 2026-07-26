$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function ConvertTo-PlainText {
  param(
    [Parameter(Mandatory = $true)]
    [Security.SecureString]$SecureValue
  )

  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)

  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env.local'
$nodeScript = Join-Path $PSScriptRoot 'set-super-admin-password.mjs'

if (-not (Test-Path -LiteralPath $envPath)) {
  throw '.env.local bulunamadı. VITE_SUPABASE_URL ayarı gereklidir.'
}

$supabaseUrl = ''

foreach ($line in Get-Content -LiteralPath $envPath) {
  if ($line -match '^\s*VITE_SUPABASE_URL\s*=\s*(.+?)\s*$') {
    $supabaseUrl = $matches[1].Trim().Trim('"').Trim("'")
    break
  }
}

if (-not $supabaseUrl) {
  throw '.env.local içinde VITE_SUPABASE_URL bulunamadı.'
}

$authUserId = (Read-Host 'Supabase Authentication kullanıcı UUID').Trim()

if ($authUserId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$') {
  throw 'Geçerli bir Supabase Auth UUID girilmedi.'
}

Write-Host 'Secret Key: Supabase > Project Settings > API Keys > Secret keys bölümünden alınır.'
Write-Host 'Bu anahtarı kimseyle paylaşmayın; girilen değer ekranda görünmez ve diske yazılmaz.'

$secretSecure = Read-Host 'Supabase Secret Key' -AsSecureString
$passwordSecure = Read-Host 'Yeni süper admin şifresi (en az 12 karakter)' -AsSecureString
$passwordRepeatSecure = Read-Host 'Yeni şifre tekrar' -AsSecureString

$secretKey = $null
$newPassword = $null
$newPasswordRepeat = $null
$payload = $null

try {
  $secretKey = ConvertTo-PlainText -SecureValue $secretSecure
  $newPassword = ConvertTo-PlainText -SecureValue $passwordSecure
  $newPasswordRepeat = ConvertTo-PlainText -SecureValue $passwordRepeatSecure

  if ($secretKey.StartsWith('sb_publishable_')) {
    throw 'Publishable Key girdiniz. Secret Key veya legacy service_role anahtarı kullanılmalıdır.'
  }

  if ($newPassword.Length -lt 12) {
    throw 'Yeni şifre en az 12 karakter olmalıdır.'
  }

  if ($newPassword -cne $newPasswordRepeat) {
    throw 'Girilen iki şifre aynı değil.'
  }

  $payload = @{
    supabaseUrl = $supabaseUrl
    supabaseSecretKey = $secretKey
    authUserId = $authUserId
    yeniSifre = $newPassword
  } | ConvertTo-Json -Compress

  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = 'node'
  $startInfo.Arguments = "`"$nodeScript`""
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardInput = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $startInfo

  if (-not $process.Start()) {
    throw 'Node işlemi başlatılamadı.'
  }

  $process.StandardInput.Write($payload)
  $process.StandardInput.Close()

  $output = $process.StandardOutput.ReadToEnd()
  $errorOutput = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  if ($process.ExitCode -ne 0) {
    throw ($errorOutput.Trim() -replace '\s+at\s+.*', '')
  }

  Write-Host ''
  Write-Host $output.Trim() -ForegroundColor Green
}
finally {
  $secretKey = $null
  $newPassword = $null
  $newPasswordRepeat = $null
  $payload = $null
  $secretSecure.Dispose()
  $passwordSecure.Dispose()
  $passwordRepeatSecure.Dispose()
}
