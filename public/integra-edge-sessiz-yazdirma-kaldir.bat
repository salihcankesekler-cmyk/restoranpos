@echo off
setlocal
title Integra Edge Sessiz Yazdirma Ayarini Kaldir

fltmc >nul 2>&1
if not "%errorlevel%"=="0" (
  echo Yonetici izni isteniyor...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo Microsoft Edge sessiz yazdirma ilkesi kaldiriliyor...
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v SilentPrintingEnabled /f >nul 2>&1

echo.
echo Ayar kaldirildi. Microsoft Edge pencerelerini kapatip yeniden acin.
pause
endlocal
