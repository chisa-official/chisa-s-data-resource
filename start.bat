@echo off
setlocal enabledelayedexpansion

title Student Management System - Start
echo.
echo  ================================================================
echo    Student Management System - Local Launcher
echo    Student UI : http://localhost:5173
echo    Admin UI   : http://localhost:5174
echo    API Server : http://localhost:3000
echo  ================================================================
echo.

cd /d "%~dp0"

rem ========= 1. Find Node.js =========
where node >nul 2>nul
if %errorlevel% neq 0 goto :find_node
echo  [1/6] Node.js ready:
node --version
goto :node_done

:find_node
echo  [1/6] Node.js not found in PATH, searching common install paths...

set "NODE_DIR=C:\Program Files\nodejs"
if exist "!NODE_DIR!\node.exe" goto :node_set_path

set "NODE_DIR=C:\Program Files (x86)\nodejs"
if exist "!NODE_DIR!\node.exe" goto :node_set_path

set "NODE_DIR=%LOCALAPPDATA%\Programs\nodejs"
if exist "!NODE_DIR!\node.exe" goto :node_set_path

set "NODE_DIR=D:\js.node"
if exist "!NODE_DIR!\node.exe" goto :node_set_path

echo.
echo    [ERROR] Node.js not found! Please install Node.js 20 LTS
echo      Download: https://nodejs.org/
echo      Check "Add to PATH" during installation, then re-run.
echo.
pause
exit /b 1

:node_set_path
set "PATH=!NODE_DIR!;%PATH%"
echo        [OK] Using !NODE_DIR!

:node_done

rem ========= 2. Check MySQL service =========
echo.
echo  [2/6] Checking MySQL service...

set MYSQL_READY=0

for %%s in (MySQL80 MySQL84 MySQL MySQL57) do (
    sc query %%s 2>nul | findstr /i "RUNNING" >nul
    if !errorlevel! equ 0 (
        echo        [OK] Local MySQL service [%%s] is running
        set MYSQL_READY=1
        goto :mysql_ready
    )
)

for %%s in (MySQL80 MySQL84 MySQL MySQL57) do (
    sc query %%s 2>nul | findstr /i "STOPPED" >nul
    if !errorlevel! equ 0 (
        echo        MySQL service [%%s] exists but stopped, trying to start...
        net start %%s 2>nul
        if !errorlevel! equ 0 (
            echo        [OK] Started MySQL service [%%s]
            timeout /t 2 /nobreak >nul
            set MYSQL_READY=1
            goto :mysql_ready
        )
    )
)

if "!MYSQL_READY!"=="0" (
    echo    [ERROR] No MySQL service found
    echo    Please install MySQL 8.0
    echo.
    pause
    exit /b 1
)

:mysql_ready
rem Verify MySQL connection
echo        Verifying MySQL connection...
set MYSQL_EXE=
if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" (
    set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
) else if exist "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" (
    set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
) else (
    echo        [!] mysql.exe not found, skipping verification
    goto :after_mysql
)

"!MYSQL_EXE!" -uroot -proot123456 -e "CREATE DATABASE IF NOT EXISTS student_mgmt DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
if %errorlevel% equ 0 (
    echo        [OK] MySQL connected, database student_mgmt ready
) else (
    echo    [ERROR] MySQL connection failed, check root password
    echo    If password differs, update DATABASE_URL in server/.env
    pause
    exit /b 1
)

:after_mysql

rem ========= 3. Install dependencies + DB init =========
echo.
echo  [3/6] Backend dependency check and database initialization...
cd server
if not exist node_modules (
    echo        First run, installing backend dependencies [1-3 min]...
    call npm install
    if errorlevel 1 (
        echo        [ERROR] Backend npm install failed
        cd ..
        pause
        exit /b 1
    )
)

echo        Syncing database schema...
call npx prisma generate >nul 2>nul
call npx prisma db push --accept-data-loss >nul 2>&1
echo        Seeding initial data...
call npm run seed >nul 2>&1
cd ..

rem ========= 4. Frontend dependencies =========
echo.
echo  [4/6] Frontend dependency check...
cd student-web
if not exist node_modules (
    echo        First run, installing student-web dependencies [1-3 min]...
    call npm install
    if errorlevel 1 (
        echo        [ERROR] Student-web npm install failed
        cd ..
        pause
        exit /b 1
    )
)
cd ..

cd admin-web
if not exist node_modules (
    echo        First run, installing admin-web dependencies [1-3 min]...
    call npm install
    if errorlevel 1 (
        echo        [ERROR] Admin-web npm install failed
        cd ..
        pause
        exit /b 1
    )
)
cd ..

rem ========= 5. Start services in new windows =========
echo.
echo  [5/6] Starting services...

echo        Starting backend API [port 3000]...
start "Backend API - http://localhost:3000" cmd /k "cd /d ""%~dp0server"" && echo [Backend] Starting... && npm run dev"

timeout /t 3 /nobreak >nul

echo        Starting student UI [port 5173]...
start "Student UI - http://localhost:5173" cmd /k "cd /d ""%~dp0student-web"" && echo [Student] Starting... && npm run dev"

echo        Starting admin UI [port 5174]...
start "Admin UI - http://localhost:5174" cmd /k "cd /d ""%~dp0admin-web"" && echo [Admin] Starting... && npm run dev"

rem ========= 6. Wait and open browser =========
echo.
echo  [6/6] Waiting for services [10-20s], opening browser soon...
timeout /t 10 /nobreak >nul

echo.
echo  [OK] All launch commands sent, 3 service windows are running
echo.
echo     Student UI  http://localhost:5173    Account: 20240001  Password: 123456
echo     Admin UI    http://localhost:5174    Account: admin      Password: admin123
echo     API Docs    http://localhost:3000/api-docs
echo.
echo  Opening student and admin UIs...
start http://localhost:5173
start http://localhost:5174

echo.
echo  ================================================================
echo   Tips:
echo    - Do NOT close this window or the 3 service windows
echo    - To stop all services, double-click stop.bat
echo    - If any window shows errors, screenshot and share for debugging
echo  ================================================================
echo.
pause
endlocal
