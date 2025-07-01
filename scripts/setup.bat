@echo off
setlocal enabledelayedexpansion

REM QuantumTrade Pro Setup Script for Windows
REM This script automates the setup process for QuantumTrade Pro on Windows

echo ==========================================
echo QuantumTrade Pro Setup Script
echo ==========================================
echo.

REM Check if Node.js is installed
echo [INFO] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18 or higher from https://nodejs.org/
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [SUCCESS] Node.js version %NODE_VERSION% is installed

REM Check if pnpm is installed
echo [INFO] Checking pnpm installation...
pnpm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] pnpm is not installed. Installing pnpm...
    npm install -g pnpm
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install pnpm
        pause
        exit /b 1
    )
    echo [SUCCESS] pnpm installed successfully
) else (
    echo [SUCCESS] pnpm is already installed
)

REM Install dependencies
echo [INFO] Installing dependencies...
pnpm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [SUCCESS] Dependencies installed successfully

REM Create .env.local file if it doesn't exist
if not exist .env.local (
    echo [INFO] Creating .env.local file...
    (
        echo # Database Configuration
        echo NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
        echo SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
        echo.
        echo # Binance API Configuration
        echo BINANCE_API_KEY=your_binance_api_key
        echo BINANCE_API_SECRET=your_binance_api_secret
        echo.
        echo # Telegram Bot Configuration ^(Optional^)
        echo TELEGRAM_BOT_TOKEN=your_telegram_bot_token
        echo TELEGRAM_CHAT_ID=your_telegram_chat_id
        echo.
        echo # Application Configuration
        echo NEXT_PUBLIC_APP_URL=http://localhost:3000
        echo NODE_ENV=development
    ) > .env.local
    echo [SUCCESS] .env.local file created
    echo [WARNING] Please update .env.local with your actual API keys and configuration
) else (
    echo [INFO] .env.local file already exists
)

REM Build the application
echo [INFO] Building the application...
pnpm build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build application
    pause
    exit /b 1
)
echo [SUCCESS] Application built successfully

REM Show setup summary
echo.
echo ==========================================
echo QuantumTrade Pro Setup Summary
echo ==========================================
echo.
echo ✅ Dependencies installed
echo ✅ Environment file created
echo.
echo 📋 Next Steps:
echo 1. Update .env.local with your API keys
echo 2. Set up your Supabase database
echo 3. Configure your Binance API keys
echo 4. Set up Telegram bot ^(optional^)
echo 5. Start the development server: pnpm dev
echo.
echo 📚 Documentation:
echo - Setup Guide: docs/SETUP_AND_STARTUP.md
echo - Trading Logic: docs/TRADING_LOGIC_ANALYSIS.md
echo - Database: docs/DATABASE_INTEGRATION.md
echo.
echo 🚀 Quick Start:
echo pnpm dev
echo.

REM Ask if user wants to start development server
set /p START_DEV="Do you want to start the development server now? (y/n): "
if /i "%START_DEV%"=="y" (
    echo [INFO] Starting development server...
    pnpm dev
) else (
    echo [INFO] Setup complete. Run 'pnpm dev' to start the development server.
)

pause 