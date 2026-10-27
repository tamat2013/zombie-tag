@echo off
chcp 65001 >nul
rem Runs setup (skipped steps are instant) and then starts the emulator and the game.
rem Usage: run.cmd [--offline]
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 set "PATH=%ProgramFiles%\nodejs;%PATH%"

node scripts\setup.js
if errorlevel 1 (
  pause
  exit /b 1
)

node scripts\run-android.js %*
if errorlevel 1 pause
