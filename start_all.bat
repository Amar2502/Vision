@echo off
setlocal EnableExtensions

cd /d "%~dp0"

echo.
echo  Starting Vision Dashboard...
echo.

REM Resolve Python for the backend (prefer local venv)
set "PYTHON=python"
if exist "backend\.venv\Scripts\python.exe" (
  set "PYTHON=%~dp0backend\.venv\Scripts\python.exe"
) else if exist "backend\venv\Scripts\python.exe" (
  set "PYTHON=%~dp0backend\venv\Scripts\python.exe"
) else if exist ".venv\Scripts\python.exe" (
  set "PYTHON=%~dp0.venv\Scripts\python.exe"
) else if exist "venv\Scripts\python.exe" (
  set "PYTHON=%~dp0venv\Scripts\python.exe"
)

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm was not found. Install Node.js and try again.
  pause
  exit /b 1
)

"%PYTHON%" --version >nul 2>&1
if errorlevel 1 (
  echo ERROR: Python was not found. Install Python or create backend\.venv
  pause
  exit /b 1
)

echo Starting backend on http://localhost:8000 ...
start /b "" /d "%~dp0backend" %PYTHON% -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

echo Starting frontend on http://localhost:3000 ...
start /b "" /d "%~dp0frontend" cmd /c "npm run dev"

echo Waiting for frontend to be ready...
timeout /t 6 /nobreak >nul

set "URL=http://localhost:3000"
set "BRAVE="
where brave >nul 2>&1
if not errorlevel 1 set "BRAVE=brave"
if not defined BRAVE if exist "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" (
  set "BRAVE=%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"
)
if not defined BRAVE if exist "%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe" (
  set "BRAVE=%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe"
)

if defined BRAVE (
  echo Opening Brave at %URL% ...
  start "" "%BRAVE%" "%URL%"
) else (
  echo Brave not found — opening default browser at %URL% ...
  start "" "%URL%"
)

echo.
echo  Backend:  http://localhost:8000
echo  Frontend: %URL%
echo.
echo  Logs from both servers appear in this window.
echo  Press any key to stop all servers and exit.
echo.

pause >nul
call :kill_servers
endlocal
exit /b 0

:kill_servers
echo Stopping servers...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
echo Done.
exit /b 0
