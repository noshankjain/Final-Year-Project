@echo off
title CancerDx AI - Project Startup

echo ============================================
echo  CancerDx AI - Multi-Modal Cancer Diagnosis
echo ============================================
echo.

REM Check MongoDB is running
echo [1/3] Checking MongoDB...
sc query MongoDB | findstr "RUNNING" >nul
if errorlevel 1 (
    echo     Starting MongoDB service...
    net start MongoDB
) else (
    echo     MongoDB is already running OK
)
echo.

REM Start Backend
echo [2/3] Starting Express Backend (port 5000)...
start "CancerDx - Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak >nul
echo     Backend started!
echo.

REM Start ML Service
echo [3/3] Starting FastAPI ML Service (port 8000)...
start "CancerDx - ML Service" cmd /k "cd /d %~dp0ml_service && python -m uvicorn app.main:app --reload --port 8000"
timeout /t 4 /nobreak >nul
echo     ML Service started!
echo.

REM Start Frontend
echo [4/4] Starting React Frontend (port 5173)...
start "CancerDx - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 3 /nobreak >nul
echo     Frontend started!
echo.

echo ============================================
echo  All services are starting up!
echo ============================================
echo.
echo  Open your browser and go to:
echo  >>> http://localhost:5173 <<<
echo.
echo  Login credentials:
echo    Admin:     admin@hospital.com     / admin123
echo    Physician: dr.smith@hospital.com  / physician123
echo    Auditor:   auditor@hospital.com   / auditor123
echo.
echo  Services:
echo    Frontend  -> http://localhost:5173
echo    Backend   -> http://localhost:5000
echo    ML API    -> http://localhost:8000/docs
echo.
echo  Press any key to open the browser...
pause >nul
start http://localhost:5173
