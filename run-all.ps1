# FinovaX Multi-Service PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       Starting FinovaX Platform Services              " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

# 1. AI Service
Write-Host "[1/3] Launching Python FastAPI AI Microservice (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\ai-service'; .\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 2

# 2. Backend Server
Write-Host "[2/3] Launching Node.js Express Backend API Gateway (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; npm.cmd run dev"

Start-Sleep -Seconds 2

# 3. Frontend Server
Write-Host "[3/3] Launching React Vite Frontend Client (Port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm.cmd run dev"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " All 3 services have been launched in separate windows! " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host " Frontend Web App:  http://localhost:5173" -ForegroundColor Cyan
Write-Host " Backend API:       http://localhost:5000" -ForegroundColor Cyan
Write-Host " AI Microservice:   http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Green

