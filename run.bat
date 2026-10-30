@echo off
cd /d "%~dp0"

if /i "%~1"=="backend" goto RUN_BACKEND
if /i "%~1"=="frontend" goto RUN_FRONTEND

echo ============================================================================
echo   THE NAME OF FEELING MUSEUM - STARTING BACKEND AND FRONTEND
echo ============================================================================

if not exist "venv\Scripts\activate.bat" (
    echo [Setup] Creating Python virtual environment ^(venv^)...
    python -m venv venv
)

echo [Thread 1] Starting Backend ^(venv -^> cd backend -^> uvicorn^)...
start "Museum Backend - FastAPI (Port 8000)" cmd /k "run.bat backend"

echo [Thread 2] Starting Frontend ^(venv -^> cd frontend -^> npm run dev^)...
start "Museum Frontend - Vite (Port 3000)" cmd /k "run.bat frontend"

echo.
echo [Done] Opened 2 terminal windows for Backend and Frontend:
echo   - Frontend: http://localhost:3000
echo   - Backend : http://localhost:8000/docs
goto :EOF

:RUN_BACKEND
echo [Thread 1 - Backend] Activating virtual environment...
if not exist "venv\Scripts\activate.bat" (
    python -m venv venv
)
call "venv\Scripts\activate.bat"
cd /d "%~dp0backend"
if not exist "..\venv\Scripts\uvicorn.exe" (
    echo [Thread 1 - Backend] Installing requirements.txt...
    pip install -r requirements.txt
)
echo [Thread 1 - Backend] Running uvicorn at http://localhost:8000 ...
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
goto :EOF

:RUN_FRONTEND
echo [Thread 2 - Frontend] Activating virtual environment...
if not exist "venv\Scripts\activate.bat" (
    python -m venv venv
)
call "venv\Scripts\activate.bat"
cd /d "%~dp0frontend"
if not exist "node_modules\.bin\vite.cmd" (
    echo [Thread 2 - Frontend] Installing frontend packages ^(npm install^)...
    call npm install
)
echo [Thread 2 - Frontend] Running npm run dev at http://localhost:3000 ...
npm run dev
goto :EOF
