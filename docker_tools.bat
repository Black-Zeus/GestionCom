@echo off
chcp 65001 > nul

:: Variables iniciales
set ENV=dev
set LABEL_FILTER=stack=inventario
set COMPOSE_FILE=

:: Menú principal
:menu
cls

:: Define el archivo de configuración de Docker Compose según el entorno
if "%ENV%"=="dev" (
    set COMPOSE_FILE=docker-compose-dev.yml
) else if "%ENV%"=="qa" (
    set COMPOSE_FILE=docker-compose-qa.yml
) else if "%ENV%"=="prd" (
    set COMPOSE_FILE=docker-compose.yml
) else (
    echo Entorno no válido. Se usará el archivo por defecto: docker-compose-dev.yml
    set COMPOSE_FILE=docker-compose-dev.yml
)

echo =======================================
echo Docker Tools - Entorno: %ENV%
echo Archivo de configuración: %COMPOSE_FILE%
echo =======================================
echo 1. Iniciar contenedores y construir imágenes
echo 2. Detener y eliminar contenedores
echo 3. Reiniciar contenedores
echo 4. Construir imágenes
echo 5. Ver logs
echo 6. Estado de los contenedores
echo 7. Listar contenedores de stack
echo 8. Abrir terminal en contenedor de stack
echo 9. Limpiar contenedores, redes, imágenes y volúmenes
echo 10. Limpiar imágenes no utilizadas
echo 11. Limpiar volúmenes no utilizados
echo 12. Limpiar todo (contenedores, imágenes y volúmenes)
echo 13. Cambiar entorno (dev, qa, prd)
echo 14. Salir
echo =======================================
set /p choice=Seleccione una opción [1-14]: 

if "%choice%"=="1" goto up
if "%choice%"=="2" goto down
if "%choice%"=="3" goto restart
if "%choice%"=="4" goto build
if "%choice%"=="5" goto logs
if "%choice%"=="6" goto ps
if "%choice%"=="7" goto list_stack
if "%choice%"=="8" goto exec_stack
if "%choice%"=="9" goto clean
if "%choice%"=="10" goto clean_images
if "%choice%"=="11" goto clean_volumes
if "%choice%"=="12" goto clean_all
if "%choice%"=="13" goto change_env
if "%choice%"=="14" goto exit_script

echo Opción inválida. Inténtelo de nuevo.
pause
goto menu

:: Funciones
:up
cls
echo =======================================
echo Docker Tools - Iniciar Contenedores
echo Entorno: %ENV%
echo Archivo de configuración: %COMPOSE_FILE%
echo =======================================
docker-compose -f %COMPOSE_FILE% --env-file .env --env-file .env.%ENV% up -d --build
pause
goto menu

:down
cls
echo =======================================
echo Docker Tools - Detener y Eliminar Contenedores
echo Entorno: %ENV%
echo Archivo de configuración: %COMPOSE_FILE%
echo =======================================
docker-compose -f %COMPOSE_FILE% --env-file .env --env-file .env.%ENV% down
pause
goto menu

:restart
cls
echo =======================================
echo Docker Tools - Reiniciar Contenedores
echo Entorno: %ENV%
echo Archivo de configuración: %COMPOSE_FILE%
echo =======================================
docker-compose -f %COMPOSE_FILE% --env-file .env --env-file .env.%ENV% down
docker-compose -f %COMPOSE_FILE% --env-file .env --env-file .env.%ENV% up -d --build
pause
goto menu

:build
cls
echo =======================================
echo Docker Tools - Construir Imágenes
echo Entorno: %ENV%
echo Archivo de configuración: %COMPOSE_FILE%
echo =======================================
docker-compose -f %COMPOSE_FILE% --env-file .env --env-file .env.%ENV% build
pause
goto menu

:logs
cls
echo =======================================
echo Docker Tools - Mostrar Logs
echo Entorno: %ENV%
echo Archivo de configuración: %COMPOSE_FILE%
echo =======================================
docker-compose -f %COMPOSE_FILE% --env-file .env --env-file .env.%ENV% logs -f
pause
goto menu

:ps
cls
echo =======================================
echo Docker Tools - Estado de los Contenedores
echo Entorno: %ENV%
echo Archivo de configuración: %COMPOSE_FILE%
echo =======================================
docker-compose -f %COMPOSE_FILE% --env-file .env --env-file .env.%ENV% ps
pause
goto menu

:list_stack
cls
echo =======================================
echo Docker Tools - Listar Contenedores
echo Entorno: %ENV%
echo Archivo de configuración: %COMPOSE_FILE%
echo =======================================
docker ps --filter "label=%LABEL_FILTER%" --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}"
pause
goto menu

:exec_stack
cls
echo =======================================
echo Docker Tools - Abrir Terminal en Contenedor
echo Entorno: %ENV%
echo Archivo de configuración: %COMPOSE_FILE%
echo =======================================
docker ps --filter "label=%LABEL_FILTER%" --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}"
echo =======================================
set /p container_id=Ingrese el ID o nombre del contenedor: 
if "%container_id%"=="" (
    echo El ID o nombre no puede estar vacío.
    pause
    goto menu
)
docker exec %container_id% bash -c "echo Bash disponible" 2>nul && (
    echo Abriendo terminal con Bash...
    docker exec -it %container_id% bash
) || (
    echo Bash no disponible, utilizando sh...
    docker exec -it %container_id% sh
)
pause
goto menu

:clean
cls
echo =======================================
echo Docker Tools - Limpiar Contenedores, Redes e Imágenes
echo Entorno: %ENV%
echo Archivo de configuración: %COMPOSE_FILE%
echo =======================================
docker-compose -f %COMPOSE_FILE% --env-file .env --env-file .env.%ENV% down --rmi all --volumes --remove-orphans
pause
goto menu

:clean_images
cls
echo =======================================
echo Docker Tools - Limpiar Imágenes No Utilizadas
echo Entorno: %ENV%
echo =======================================
docker image prune -af
pause
goto menu

:clean_volumes
cls
echo =======================================
echo Docker Tools - Limpiar Volúmenes No Utilizados
echo Entorno: %ENV%
echo =======================================
docker volume prune -f
pause
goto menu

:clean_all
cls
echo =======================================
echo Docker Tools - Limpieza Completa
echo Entorno: %ENV%
echo Archivo de configuración: %COMPOSE_FILE%
echo =======================================
docker-compose -f %COMPOSE_FILE% --env-file .env --env-file .env.%ENV% down --rmi all --volumes --remove-orphans
docker image prune -af
docker volume prune -f
pause
goto menu

:change_env
cls
echo =======================================
echo Docker Tools - Cambiar Entorno
echo Entorno Actual: %ENV%
echo =======================================
set /p new_env=Ingrese el nuevo entorno (dev, qa, prd): 
if "%new_env%"=="" (
    echo El entorno no puede estar vacío.
    pause
    goto menu
)
set ENV=%new_env%
goto menu

:exit_script
cls
echo =======================================
echo Gracias por usar Docker Tools v1
echo Todos los procesos han sido cerrados correctamente.
echo =======================================
exit
