@echo off
setlocal
cd /d "%~dp0"
set "VENV_DIR=%USERPROFILE%\.icp-portal-assistant-venv"
if not exist "%VENV_DIR%\Scripts\python.exe" (
  py -m venv "%VENV_DIR%"
  if errorlevel 1 goto :error
)
call "%VENV_DIR%\Scripts\activate.bat"
if not exist "%VENV_DIR%\.dependencies-ready" (
  python -m pip install --upgrade pip
  if errorlevel 1 goto :error
  python -m pip install -r requirements.txt
  if errorlevel 1 goto :error
  type nul > "%VENV_DIR%\.dependencies-ready"
)
python -m streamlit run app.py
goto :eof

:error
echo.
echo Setup could not finish. Check your internet connection and try again.
pause
exit /b 1
endlocal
