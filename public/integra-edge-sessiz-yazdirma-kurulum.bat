@echo off
setlocal
title Integra Edge Sessiz Yazdirma Kurulumu

fltmc >nul 2>&1
if not "%errorlevel%"=="0" (
  echo Yonetici izni isteniyor...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo Microsoft Edge sessiz yazdirma ilkesi etkinlestiriliyor...
reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v SilentPrintingEnabled /t REG_DWORD /d 1 /f >nul

if not "%errorlevel%"=="0" (
  echo.
  echo Kurulum tamamlanamadi. Dosyayi yonetici olarak yeniden calistirin.
  pause
  exit /b 1
)

echo.
echo Kurulum tamamlandi.
echo 1. Fis yazicisini Windows Ayarlarinda varsayilan yazici yapin.
echo 2. Acik Microsoft Edge pencerelerini kapatip yeniden acin.
echo 3. Edge adres cubuguna edge://policy yazip Reload Policies tusuna basabilirsiniz.
echo.
echo Geri almak icin integra-edge-sessiz-yazdirma-kaldir.bat dosyasini calistirin.
pause
endlocal
