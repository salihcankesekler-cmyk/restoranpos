@echo off
title Integra Printer Agent Kurulum
cd /d "%~dp0"
taskkill /IM IntegraPrinterAgent.exe /F >nul 2>&1
echo.
echo =====================================
echo   INTEGRA PRINTER AGENT v3.5 KURULUM
echo =====================================
echo.
echo Satis fisleri ve barkod etiketleri yazdirma penceresi acmadan basilir.
echo Kurulum sirasinda fis ve etiket yazicilarini ayri ayri secebilirsiniz.
echo.
set /p KOD=Kurulum kodunu girin (orn: INT-26-XXXX):
echo.
echo Kurulum kodu kaydediliyor...
"%~dp0IntegraPrinterAgent.exe" setup %KOD%
if errorlevel 1 (
  echo HATA: Kurulum kodu kaydedilemedi.
  pause
  exit /b 1
)
echo.
echo Windows varsayilan fis yazicisi algilaniyor...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0varsayilan-yaziciyi-ayarla.ps1"
if errorlevel 1 (
  echo UYARI: Varsayilan fis yazicisi algilanamadi.
)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0etiket-yazicisini-ayarla.ps1"
echo.
echo Yazicilar kontrol ediliyor...
"%~dp0IntegraPrinterAgent.exe" printers
echo.
set /p TEST=Fis yazicilarina test fisi basilsin mi? (E/H):
if /I "%TEST%"=="E" (
  "%~dp0IntegraPrinterAgent.exe" test
)
echo.
echo Windows acilisina ekleniyor...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0baslangica-ekle.ps1"
echo.
echo Kurulum tamamlandi.
echo Program Windows acildiginda otomatik baslayacak.
echo Simdi calistirmak icin ENTER'a basin.
pause > nul
start "" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0agent-baslat.ps1"
