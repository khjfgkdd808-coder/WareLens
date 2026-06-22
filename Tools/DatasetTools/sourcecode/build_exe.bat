@echo off
chcp 65001 >nul

set "PY_CMD=C:\Users\user\AppData\Local\Programs\Python\Python313\python.exe"

echo [1/3] Updating and forcing installation of PyInstaller...
REM 기존 체크 로직을 건너뛰고 해당 파이썬에 직접 강제 재설치합니다.
"%PY_CMD%" -m pip install --upgrade --force-reinstall pyinstaller pillow

echo.
echo [2/3] Building reviewer.exe ...
"%PY_CMD%" -m pyinstaller --noconfirm --onefile --windowed --name reviewer reviewer.py

echo.
echo [3/3] Copying result...
if exist "dist\reviewer.exe" (
    copy /Y "dist\reviewer.exe" "reviewer.exe" >nul
    echo.
    echo ============================================================
    echo  Build complete! reviewer.exe has been created in this folder.
    echo ============================================================
    echo.
) else (
    echo.
    echo [ERROR] Build failed. Please check the log above for details.
)

pause
