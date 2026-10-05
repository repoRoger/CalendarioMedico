@echo off
:retry
cls
echo ========================================================
echo  🏥 DESPLEGANDO CALENDARIO MEDICO EN VERCEL 🏥
echo ========================================================
cd /d I:\Calendariomedico

REM Usamos --yes para aceptar confirmaciones automaticamente
call npx vercel --prod --yes

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  [EXITO] Calendario Medico desplegado y listo en Vercel.
    echo ========================================================
    echo Cerrando en 4 segundos...
    timeout /t 4 >nul
    exit
) else (
    echo.
    echo [ERROR] Ocurrio un fallo durante el despliegue.
    echo.
    echo NOTA: Si es la primera vez o pide iniciar sesion, presiona L.
    set choice=
    set /p choice="Presiona 1 o Y para reintentar, L para iniciar sesion (Login), o ENTER para salir: "
    if /i "%choice%"=="L" (
        echo.
        echo Abriendo inicio de sesion en Vercel...
        call npx vercel login
        goto retry
    )
    if /i "%choice%"=="1" goto retry
    if /i "%choice%"=="Y" goto retry
)
