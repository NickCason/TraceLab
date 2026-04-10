@echo off
setlocal
cd /d %~dp0\..
where npm >nul 2>nul
if errorlevel 1 (
  echo npm is required but was not found in PATH.
  exit /b 1
)
if not exist dist (
  echo dist\ not found. Run build-local.bat first.
  exit /b 1
)
start "TraceLab" cmd /c npm run preview
timeout /t 2 /nobreak >nul
start http://localhost:4173
