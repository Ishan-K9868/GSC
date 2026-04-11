@echo off
title SevaSetu - Application Manager
color 0B

:menu
cls
echo.
echo  ========================================
echo       SEVASETU - Application Manager
echo  ========================================
echo.
echo    [1] Start Application
echo    [2] Stop Application
echo    [3] Check Status
echo    [4] Install Dependencies
echo    [5] Build for Production
echo    [6] Run Docker Smoke Test
echo    [7] View Logs
echo    [0] Exit
echo.

choice /C 12345670 /N /M "Enter your choice (0-7): "

if %errorlevel% equ 1 goto start_app
if %errorlevel% equ 2 goto stop_app
if %errorlevel% equ 3 goto status
if %errorlevel% equ 4 goto install
if %errorlevel% equ 5 goto build
if %errorlevel% equ 6 goto docker_smoke
if %errorlevel% equ 7 goto logs
if %errorlevel% equ 8 goto exit_app

:start_app
call "%~dp0start.bat"
goto menu

:stop_app
call "%~dp0stop.bat"
pause
goto menu

:status
echo.
echo Checking application status...
echo.
echo Backend (Port 3001):
netstat -aon 2>nul | findstr ":3001.*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo   [RUNNING] Backend is active
    curl -s http://localhost:3001/health >nul 2>&1
    if not errorlevel 1 (
        echo   [HEALTHY] Health check passed
    ) else (
        echo   [WARNING] Health check failed
    )
) else (
    echo   [STOPPED] Backend is not running
)
docker ps --format "{{.Names}}" 2>nul | findstr /I "sevasetu-backend-local" >nul 2>&1
if not errorlevel 1 (
    echo   [DOCKER] sevasetu-backend-local container is running
)
echo.
echo Frontend (Port 5173):
netstat -aon 2>nul | findstr ":5173.*LISTENING" >nul 2>&1
if not errorlevel 1 (
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

:docker_smoke
echo.
echo Running backend Docker smoke test...
echo.
cd /d "%~dp0backend"
call npm run docker:smoke
cd /d "%~dp0"
pause
goto menu

:logs
echo.
echo Opening logs directory...
echo Note: frontend now runs in its own terminal window and backend logs stream in a Docker logs window.
if not exist "%~dp0logs" mkdir "%~dp0logs"
start explorer "%~dp0logs"
goto menu

:exit_app
exit /b 0
