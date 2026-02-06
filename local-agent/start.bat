@echo off
title ApexTime Local Sync Agent
echo Starting ApexTime Local Sync Agent...
echo.
REM Check if Node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed! Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

REM Install dependencies if node_modules doesn't exist
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)

REM Run the agent
call npm start
pause
