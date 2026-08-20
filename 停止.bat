@echo off

title ==================================== Student Management System - Stop ====================================
echo.
echo  ================================================================
echo    Student Management System - Local Stopper
echo  ================================================================
echo.

cd /d "%~dp0"

rem ========= 1. MySQL service =========
echo  [1/3] MySQL service...
echo    Local MySQL is a Windows service (MySQL80), auto-starts on boot.
echo    Recommend: keep running, no impact on system performance.
set /p STOP_MYSQL="    Stop MySQL service? (Y/N, default N): "
if /i "%STOP_MYSQL%"=="Y" (
    net stop MySQL80 2>nul
    if %errorlevel% equ 0 (
        echo        [OK] MySQL80 service stopped
    ) else (
        echo        [!] Stop failed (may need admin rights), use Services Manager
    )
) else (
    echo        Keeping MySQL service running (recommended)
)

rem ========= 2. Kill Node.js processes =========
echo.
echo  [2/3] Stopping Node.js services (backend + student + admin)...

rem Find PIDs by port and kill gracefully
for %%p in (3000 5173 5174) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p " ^| findstr LISTENING') do (
        if not "%%a"=="" (
            echo        Port %%p - PID %%a, killing...
            taskkill /F /PID %%a >nul 2>nul
        )
    )
)

echo.
echo  [!] Force-kill ALL Node.js processes? (Use caution - kills other Node projects too!)
echo    If you are not running other Node projects, Y ensures full cleanup.
set /p CONFIRM="    Enter Y/N (default N): "
if /i "%CONFIRM%"=="Y" (
    taskkill /F /IM node.exe >nul 2>nul
    taskkill /F /IM nodemon.exe >nul 2>nul
    echo        [OK] All Node.js processes killed
) else (
    echo        Skipped global Node cleanup.
    echo        If services remain, use Task Manager to end node.exe manually.
)

rem ========= 3. Close remaining cmd windows =========
echo.
echo  [3/3] Closing service windows...
taskkill /F /FI "WINDOWTITLE eq Backend API*" >nul 2>nul
taskkill /F /FI "WINDOWTITLE eq Student UI*" >nul 2>nul
taskkill /F /FI "WINDOWTITLE eq Admin UI*" >nul 2>nul
echo        [OK] Service windows closed

echo.
echo  ================================================================
echo   [OK] Stop operations completed!
echo   If ports are still occupied, reboot or manually end node.exe.
echo  ================================================================
echo.
pause