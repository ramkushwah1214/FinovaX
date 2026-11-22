@echo off
title FinovaX Multi-Service Launcher
echo ========================================================
echo        Starting FinovaX Platform Services
echo ========================================================
echo.

echo [1/3] Launching Python FastAPI AI Microservice (Port 8000)...
start "FinovaX AI Microservice [Port 8000]" cmd /k "cd /d %~dp0ai-service && .\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo [2/3] Launching Node.js Express Backend API Gateway (Port 5000)...
start "FinovaX Backend API [Port 5000]" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 2 /nobreak >nul

echo [3/3] Launching React 18 Vite Frontend (Port 5173)...
start "FinovaX Frontend Client [Port 5173]" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo  All 3 services are launching in their own windows!
echo ========================================================
echo  Frontend Web App:  http://localhost:5173
echo  Backend API:       http://localhost:5000
echo  AI Microservice:   http://127.0.0.1:8000
echo ========================================================
pause

