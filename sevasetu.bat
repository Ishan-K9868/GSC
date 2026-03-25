@echo off
title SevaSetu - Quick Start
color 0B

echo.
echo   ____                  ____       _         
echo  / ___|  _____   ____ _/ ___|  ___| |_ _   _ 
echo  \___ \ / _ \ \ / / _` \___ \ / _ \ __| | | |
echo   ___) |  __/\ V / (_| |___) |  __/ |_| |_| |
echo  |____/ \___| \_/ \__,_|____/ \___|\__|\__,_|
echo.
echo  AI-powered NGO Resource Coordination Platform
echo.
echo ============================================
echo.
echo  Choose an option:
echo.
echo    [1] Start Application (Separate Windows)
echo    [2] Start Application (Background Mode)
echo    [3] Stop Application
echo    [4] Check Status
echo    [5] Install Dependencies
echo    [6] Build for Production
echo    [7] View Logs
echo    [8] Exit
echo.
echo ============================================
echo.

choice /C 12345678 /N /M "Enter your choice (1-8): "

if %errorlevel% equ 1 goto start_dev
if %errorlevel% equ 2 goto start_bg
if %errorlevel% equ 3 goto stop
if %errorlevel% equ 4 goto status
if %errorlevel% equ 5 goto install
if %errorlevel% equ 6 goto build
if %errorlevel% equ 7 goto logs
if %errorlevel% equ 8 goto exit

:start_dev
call start-dev.bat
goto end

:start_bg
call start.bat
goto end

:stop
call stop.bat
goto menu

:status
echo.
echo Checking application status...
echo.
echo Backend (Port 3001):
netstat -aon | findstr ":3001.*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo   [RUNNING] Backend is active
    curl -s http://localhost:3001/health >nul 2>&1
    if %errorlevel% equ 0 (
        echo   [HEALTHY] Health check passed
    ) else (
        echo   [WARNING] Health check failed
    )
) else (
    echo   [STOPPED] Backend is not running
)
echo.
echo Frontend (Port 5173):
netstat -aon | findstr ":5173.*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo   [RUNNING] Frontend is active
) else (
    echo   [STOPPED] Frontend is not running
)
echo.
pause
goto menu

:install
echo.
echo Installing dependencies...
echo.
echo [1/2] Frontend dependencies...
call npm install
echo.
echo [2/2] Backend dependencies...
cd backend && call npm install && cd ..
echo.
echo Dependencies installed!
pause
goto menu

:build
echo.
echo Building for production...
echo.
echo [1/2] Building frontend...
call npm run build
echo.
echo [2/2] Building backend...
cd backend && call npm run build && cd ..
echo.
echo Build complete!
echo   Frontend: ./dist
echo   Backend:  ./backend/dist
pause
goto menu

:logs
echo.
echo Opening logs directory...
if not exist "logs" mkdir logs
start explorer logs
goto menu

:menu
cls
call sevasetu.bat
goto end

:exit
exit /b 0

:end
