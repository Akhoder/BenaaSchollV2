@echo off
REM Auto Port Detection Script for BenaaSchool
REM This script automatically finds an available port and starts the development server

echo 🔍 BenaaSchool Auto Port Detection
echo ==================================

REM Kill all Node.js processes first
echo 🔄 Killing existing Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
echo ✅ Node.js processes terminated

REM Wait for ports to be released
echo ⏳ Waiting for ports to be released...
timeout /t 3 >nul

REM Find available port
echo 🔍 Searching for available port...
set PORT_FOUND=0

REM Check ports 3005-3015
for /L %%i in (3005,1,3015) do (
    if !PORT_FOUND! equ 0 (
        netstat -aon | findstr ":%%i " >nul 2>&1
        if errorlevel 1 (
            echo ✅ Found available port: %%i
            set PORT_FOUND=1
            set AVAILABLE_PORT=%%i
        )
    )
)

if %PORT_FOUND% equ 0 (
    echo ❌ No available ports found in range 3005-3015
    echo 💡 Try running: npm run dev:kill && npm run dev:alt
    pause
    exit /b 1
)

REM Update package.json with the found port
echo 🔧 Updating package.json with port %AVAILABLE_PORT%...
powershell -Command "(Get-Content package.json) -replace '\"dev\": \"next dev -p [0-9]*\"', '\"dev\": \"next dev -p %AVAILABLE_PORT%\"' | Set-Content package.json"

REM Start the development server
echo 🚀 Starting development server on port %AVAILABLE_PORT%...
echo 📱 Application will be available at: http://localhost:%AVAILABLE_PORT%
echo.

REM Start the server
npm run dev