@echo off
title SevaSetu - Starting Application
color 0A

echo ============================================
echo        SevaSetu Application Launcher
echo            (Background Mode)
echo ============================================
echo.

cd /d "%~dp0"

:: Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    color 0C
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules" (
    echo [INFO] Frontend dependencies not found. Installing...
    call npm install
    if errorlevel 1 (
        color 0C
        echo [ERROR] Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

if not exist "backend\node_modules" (
    echo [INFO] Backend dependencies not found. Installing...
    cd backend
    call npm install
    cd ..
    if errorlevel 1 (
        color 0C
        echo [ERROR] Failed to install backend dependencies
        pause
        exit /b 1
    )
)

:: Check for environment files
if not exist ".env.local" (
    color 0E
    echo [WARNING] Frontend .env.local not found!
    echo Please copy .env.example to .env.local and configure it.
    echo.
)

if not exist "backend\.env" (
    color 0E
    echo [WARNING] Backend .env not found!
    echo Please copy backend\.env.example to backend\.env and configure it.
    echo.
)

choice /C YN /N /M "Run fresh demo seed before startup? [Y/N]: "
if errorlevel 2 goto skip_seed
if errorlevel 1 (
    echo.
    echo [INFO] Running backend demo seed...
    call npm run seed --prefix backend -- --clear --count=24
    if errorlevel 1 (
        color 0C
        echo [ERROR] Demo seed failed. Check backend env/Firebase setup, then retry.
        pause
        exit /b 1
    )
    echo [INFO] Demo seed completed successfully.
    echo.
)
:skip_seed

echo.
echo [INFO] Starting SevaSetu application...
echo.

:: Create logs directory if needed
if not exist "logs" mkdir logs

:: Start Backend Server
echo [1/2] Starting Backend Server (Port 3001)...
cd backend
start /B cmd /c "npm run dev > ..\logs\backend.log 2>&1"
cd ..

:: Give backend time to start
timeout /t 3 /nobreak >nul

:: Start Frontend Server
echo [2/2] Starting Frontend Server (Port 5173)...
start /B cmd /c "npm run dev > logs\frontend.log 2>&1"

echo.
echo ============================================
echo        SevaSetu Started Successfully!
echo ============================================
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3001
echo   API:      http://localhost:3001/api
echo   Health:   http://localhost:3001/health
echo.
echo   Logs: ./logs/frontend.log
echo         ./logs/backend.log
echo.
echo   To stop: Run stop.bat or press Ctrl+C
echo ============================================
echo.

:: Keep window open and show status
:loop
timeout /t 30 /nobreak >nul
echo [%time%] Application running... (Press Ctrl+C to stop)
goto loop
