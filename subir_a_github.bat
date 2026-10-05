@echo off
cls
echo ========================================================
echo  🐙 SUBIENDO CALENDARIO MEDICO A GITHUB 🐙
echo ========================================================
cd /d I:\Calendariomedico

REM Verificar si git esta inicializado
if not exist ".git" (
    echo [INFO] Inicializando repositorio Git local...
    git init
    git branch -M main
)

set /p msg="Ingresa la descripcion del cambio (o presiona ENTER para 'Actualizacion'): "
if "%msg%"=="" set msg=Actualizacion Calendario Medico

git add .
git commit -m "%msg%"

echo.
echo Enviando cambios a GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  [EXITO] Cambios subidos correctamente a GitHub.
    echo ========================================================
    timeout /t 3 >nul
) else (
    echo.
    echo [AVISO] Si aun no has conectado el repositorio remoto de GitHub,
    echo escribe en tu terminal:
    echo   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
    echo   git push -u origin main
    echo.
    pause
)
