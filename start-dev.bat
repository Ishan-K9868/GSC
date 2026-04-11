@echo off
title SevaSetu Launcher
color 0A

echo ============================================
echo        SevaSetu Application Launcher
echo          (Separate Windows Mode)
echo ============================================
echo.

cd /d "%~dp0"

:: Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    color 0C
    echo [ERROR] Node.js is not installed or not in PATH
    pause
    exit /b 1
)

:: Check dependencies
if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies...
    call npm install
)

if not exist "backend\node_modules" (
    echo [INFO] Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

:: Warn about missing env files
if not exist ".env.local" (
    color 0E
    echo [WARNING] .env.local not found - copy from .env.example
)
if not exist "backend\.env" (
    color 0E
    echo [WARNING] backend\.env not found - copy from backend\.env.example
)

echo.
choice /C YN /N /M "Run fresh demo seed before starting? [Y/N]: "
if errorlevel 2 goto skip_seed
if errorlevel 1 (
    echo.
    echo [INFO] Running backend demo seed...
    call npm run seed --prefix backend -- --clear --count=24
    if errorlevel 1 (
        color 0C
        echo [ERROR] Demo seed failed. Fix the backend setup and try again.
        pause
        exit /b 1
    )
    echo [INFO] Demo seed completed successfully.
)
:skip_seed

echo.
echo Starting servers in separate windows...
echo.

:: Start Backend in new window
echo [1/2] Starting Backend...
start "SevaSetu Backend (Port 3001)" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: Wait for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Frontend in new window
echo [2/2] Starting Frontend...
start "SevaSetu Frontend (Port 5173)" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo ============================================
echo        SevaSetu Started!
echo ============================================
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3001
echo   Health:   http://localhost:3001/api/health/deps
echo.
echo   Two terminal windows opened:
echo   - "SevaSetu Backend" - Express server
echo   - "SevaSetu Frontend" - Vite dev server
echo.
echo   To stop: Close both windows or run stop.bat
echo ============================================
echo.

:: Open browser after a short delay
choice /C YN /T 5 /D Y /M "Open browser to http://localhost:5173"
if errorlevel 2 goto skip_browser
if errorlevel 1 (
    timeout /t 3 /nobreak >nul
    start http://localhost:5173
)
:skip_browser

echo.
echo You can close this launcher window.
pause
