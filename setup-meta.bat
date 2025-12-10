@echo off
REM Quick Meta Webhook Setup for Windows

echo.
echo ========================================
echo   META WEBHOOK SETUP - WINDOWS
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm is not installed!
    echo.
    pause
    exit /b 1
)

echo Checking Meta credentials...
echo.

call npm run check:meta-credentials

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo   ACTION REQUIRED
    echo ========================================
    echo.
    echo Your Meta credentials are not configured.
    echo.
    echo Please follow these steps:
    echo   1. Edit .env.meta file
    echo   2. Add your actual Meta credentials
    echo   3. Run this script again
    echo.
    echo See URGENT_META_FIX.md for detailed instructions
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Running Meta Webhook Setup
echo ========================================
echo.

call npm run setup:meta-webhook

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   SUCCESS!
    echo ========================================
    echo.
    echo Meta webhook is now configured!
    echo.
    echo Next steps:
    echo   1. Submit a test lead via Facebook
    echo   2. Run: npm run check:webhook
    echo   3. Check Vercel logs for confirmation
    echo.
) else (
    echo.
    echo ========================================
    echo   SETUP FAILED
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo See URGENT_META_FIX.md for troubleshooting.
    echo.
)

pause
