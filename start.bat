@echo off
title SevaSetu - Start
color 0A

set CONTAINER_NAME=sevasetu-backend-local
set FRONTEND_PORT=5173
set BACKEND_PORT=3001

echo ============================================
echo        SevaSetu Application Launcher
echo      (Docker Backend + Local Frontend)
echo ============================================
echo.

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    color 0C
    echo [ERROR] Node.js is not installed or not in PATH
    pause
    exit /b 1
)

where docker >nul 2>nul
if errorlevel 1 (
    color 0C
    echo [ERROR] Docker is not installed or not in PATH
    pause
    exit /b 1
)

call :ensure_docker_running
if errorlevel 1 exit /b 1

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
    pause
    exit /b 1
)

netstat -aon 2>nul | findstr ":%BACKEND_PORT%.*LISTENING" >nul 2>&1
if not errorlevel 1 (
    color 0E
    echo [WARNING] Port %BACKEND_PORT% is already in use.
    echo Run stop.bat before starting SevaSetu again.
    pause
    exit /b 1
)

netstat -aon 2>nul | findstr ":%FRONTEND_PORT%.*LISTENING" >nul 2>&1
if not errorlevel 1 (
    color 0E
    echo [WARNING] Port %FRONTEND_PORT% is already in use.
    echo Run stop.bat before starting SevaSetu again.
    pause
    exit /b 1
)

echo.
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
)

:skip_seed
echo.
if not exist "logs" mkdir logs

echo [1/3] Building backend Docker image...
docker build -t sevasetu-backend ./backend
if errorlevel 1 (
    color 0C
    echo [ERROR] Docker image build failed.
    pause
    exit /b 1
)

docker rm -f %CONTAINER_NAME% >nul 2>&1

echo [2/3] Starting backend Docker container...
docker run --rm -d -p %BACKEND_PORT%:3001 --name %CONTAINER_NAME% --env-file backend/.env sevasetu-backend >nul
if errorlevel 1 (
    color 0C
    echo [ERROR] Failed to start backend Docker container.
    docker logs %CONTAINER_NAME% 2>nul
    pause
    exit /b 1
)

start "SevaSetu Backend Logs" cmd /k "docker logs -f %CONTAINER_NAME%"

echo [3/3] Starting frontend dev server...
start "SevaSetu Frontend (Port %FRONTEND_PORT%)" cmd /k "cd /d "%~dp0" && npm run dev"

timeout /t 5 /nobreak >nul

start http://localhost:%FRONTEND_PORT%

echo.
echo [INFO] Backend container status:
docker logs --tail 20 %CONTAINER_NAME%

echo.
echo ============================================
echo        SevaSetu Started Successfully!
echo ============================================
echo.
echo   Frontend: http://localhost:%FRONTEND_PORT%
echo   Backend:  http://localhost:%BACKEND_PORT%
echo   API:      http://localhost:%BACKEND_PORT%/api
echo   Health:   http://localhost:%BACKEND_PORT%/health
echo   Ready:    http://localhost:%BACKEND_PORT%/api/health/ready
echo.
echo   Windows opened:
echo   - SevaSetu Frontend (Vite dev server)
echo   - SevaSetu Backend Logs (Docker logs)
echo.
echo   To stop everything: run stop.bat
echo ============================================
echo.

:loop
timeout /t 30 /nobreak >nul
echo [%time%] Application running... (Use stop.bat to stop frontend + Docker backend)
goto loop

:ensure_docker_running
docker version >nul 2>&1
if not errorlevel 1 goto :eof

echo [INFO] Docker engine is not ready. Attempting to start Docker Desktop...

if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
    start "Docker Desktop" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
) else (
    color 0C
    echo [ERROR] Docker Desktop.exe not found. Start Docker manually and retry.
    pause
    exit /b 1
)

echo [INFO] Waiting for Docker Desktop to become ready...
for /L %%i in (1,1,30) do (
    timeout /t 2 /nobreak >nul
    docker version >nul 2>&1
    if not errorlevel 1 (
        echo [INFO] Docker is ready.
        goto :eof
    )
)

color 0C
echo [ERROR] Docker Desktop did not become ready in time.
echo Wait for Docker Desktop to finish starting, then run start.bat again.
pause
exit /b 1
