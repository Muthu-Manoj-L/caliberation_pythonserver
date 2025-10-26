@echo off
title ColorUpdate - Local Python Processing
color 0A

echo ========================================
echo   ColorUpdate - Spectral Analysis
echo   Local Python Processing Mode
echo ========================================
echo.
echo [1/2] Starting Python Server (localhost:5000)...
echo.

cd /d "%~dp0"

start "Python Server" cmd /k "cd python && python spectral_server.py"

timeout /t 3 /nobreak > nul

echo.
echo [2/2] Starting Expo Metro...
echo.
echo ----------------------------------------
echo Ready! The Python server is running.
echo Processing happens LOCALLY on this PC.
echo ----------------------------------------
echo.

npx expo start --dev-client

pause
