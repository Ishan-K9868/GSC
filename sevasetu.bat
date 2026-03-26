@echo off
title SevaSetu - Quick Start
color 0B

:menu
cls
echo.
echo  ========================================
echo       SEVASETU - Application Manager
echo  ========================================
echo   AI-powered NGO Resource Coordination
echo  ========================================
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
echo  ========================================
echo.

choice /C 12345678 /N /M "Enter your choice (1-8): "

if %errorlevel% equ 1 goto start_dev
if %errorlevel% equ 2 goto start_bg
if %errorlevel% equ 3 goto stop
if %errorlevel% equ 4 goto status
if %errorlevel% equ 5 goto install
if %errorlevel% equ 6 goto build
if %errorlevel% equ 7 goto logs
if %errorlevel% equ 8 goto exit_app

:start_dev
call "%~dp0start-dev.bat"
goto menu

:start_bg
call "%~dp0start.bat"
goto menu

:stop
call "%~dp0stop.bat"
pause
goto menu

:status
echo.
echo Checking application status...
echo.
echo Backend (Port 3001):
netstat -aon 2>nul | findstr ":3001.*LISTENING" >nul 2>&1
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
netstat -aon 2>nul | findstr ":5173.*LISTENING" >nul 2>&1
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
cd /d "%~dp0"
call npm install
echo.
echo [2/2] Backend dependencies...
cd /d "%~dp0backend"
call npm install
cd /d "%~dp0"
echo.
echo Dependencies installed!
pause
goto menu

:build
echo.
echo Building for production...
echo.
cd /d "%~dp0"
echo [1/2] Building frontend...
call npm run build
echo.
echo [2/2] Building backend...
cd /d "%~dp0backend"
call npm run build
cd /d "%~dp0"
echo.
echo Build complete!
echo   Frontend: ./dist
echo   Backend:  ./backend/dist
pause
goto menu

:logs
echo.
echo Opening logs directory...
if not exist "%~dp0logs" mkdir "%~dp0logs"
start explorer "%~dp0logs"
goto menu

:exit_app
exit /b 0
