@echo off
title SevaSetu - Stopping Application
color 0E

echo ============================================
echo        SevaSetu Application Stopper
echo ============================================
echo.

echo [INFO] Stopping all SevaSetu processes...
echo.

:: Kill Node.js processes running on ports 3001 and 5173
echo [1/4] Finding processes on port 3001 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo       Killing process %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo [2/4] Finding processes on port 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo       Killing process %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: Also check alternative Vite ports
echo [3/4] Checking alternative ports (5174, 5175)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5174" ^| findstr "LISTENING"') do (
    echo       Killing process %%a on port 5174
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5175" ^| findstr "LISTENING"') do (
    echo       Killing process %%a on port 5175
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill any remaining node processes with SevaSetu in title
echo [4/4] Cleaning up...

echo.
echo ============================================
echo        SevaSetu Stopped Successfully!
echo ============================================
echo.

:: Verify ports are free
echo Verifying ports are free...
netstat -aon 2>nul | findstr ":3001.*LISTENING" >nul 2>&1
if not errorlevel 1 (
    color 0C
    echo   Port 3001: Still in use [WARNING]
) else (
    echo   Port 3001: Free
)

netstat -aon 2>nul | findstr ":5173.*LISTENING" >nul 2>&1
if not errorlevel 1 (
    color 0C
    echo   Port 5173: Still in use [WARNING]
) else (
    echo   Port 5173: Free
)

echo.
echo Done!
echo.
