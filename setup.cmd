@echo off
chcp 65001 >nul
rem Installs Node.js (if missing), then runs scripts\setup.js which installs the project
rem dependencies, a JDK, the Android SDK and the emulator. Double-click or run: setup.cmd
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js לא נמצא. מתקין עם winget...
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  if errorlevel 1 (
    echo ההתקנה האוטומטית נכשלה. התקן ידנית מ-https://nodejs.org ואז הרץ שוב.
    pause
    exit /b 1
  )
  set "PATH=%ProgramFiles%\nodejs;%PATH%"
)

node scripts\setup.js
if errorlevel 1 (
  pause
  exit /b 1
)

echo.
echo הכל מותקן. אם Node.js או Java הותקנו הרגע, סגור ופתח מחדש את VS Code, ואז לחץ F5.
pause
