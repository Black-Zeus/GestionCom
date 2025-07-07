# 🛠️ Docker Tools - Guía de Usuario

Esta guía describe el uso completo del script `docker_tools.sh`, una herramienta interactiva para gestionar el entorno Docker del Sistema de Inventario de manera sencilla y eficiente.

## 📋 Tabla de Contenidos

- [Introducción](#-introducción)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Menú Principal](#-menú-principal)
- [Manejador de Contenedores](#-manejador-de-contenedores)
- [Monitoreo y Diagnóstico](#-monitoreo-y-diagnóstico)
- [Limpieza y Mantenimiento](#-limpieza-y-mantenimiento)
- [Configuración del Sistema](#️-configuración-del-sistema)
- [Herramientas Expo](#-herramientas-expo)
- [Gestión de Templates .ENV](#-gestión-de-templates-env)
- [Casos de Uso Comunes](#-casos-de-uso-comunes)
- [Troubleshooting](#-troubleshooting)

## 🚀 Introducción

`docker_tools.sh` es un script interactivo que proporciona una interfaz amigable para gestionar todos los aspectos del entorno Docker del Sistema de Inventario, desde el despliegue inicial hasta el mantenimiento diario.

### Características Principales

- ✅ **Interface Interactiva** con menús navegables
- ✅ **Gestión Completa** de contenedores y servicios
- ✅ **Monitoreo en Tiempo Real** de logs y estado
- ✅ **Herramientas de Limpieza** automatizadas
- ✅ **Configuración Dinámica** de entornos
- ✅ **Gestión de Variables** de entorno
- ✅ **Detección Automática** de IP local
- ✅ **Soporte Multi-entorno** (dev, qa, prd)

## 🔧 Instalación y Configuración

### Prerrequisitos

```bash
# Verificar que Docker está instalado
docker --version
docker compose version

# Verificar permisos del script
ls -la docker_tools.sh
```

### Hacer el Script Ejecutable

```bash
# Dar permisos de ejecución
chmod +x docker_tools.sh

# Ejecutar el script
./docker_tools.sh
```

### Primera Ejecución

Al ejecutar el script por primera vez, verás:

```
=======================================
Docker Tools - Menu Principal
Archivo de configuración: docker-compose-dev.yml
Stack: inventario
Entorno: dev
IP Actual: 192.168.1.100
=======================================

 1. 📋 MANEJADOR DE CONTENEDORES
 2. 📊 MONITOREO Y DIAGNÓSTICO
 3. 🧹 LIMPIEZA Y MANTENIMIENTO
 4. ⚙️  CONFIGURACIÓN DEL SISTEMA
 5. 📱 HERRAMIENTAS EXPO
 6. 📄 GESTIÓN DE TEMPLATES .ENV

 S. 🚪 Salir
=======================================
👉 Seleccione una opción [1-6, S]:
```

> **💡 Tip**: El script detecta automáticamente tu IP local para configuraciones de React Native y desarrollo móvil.

## 📋 Menú Principal

El menú principal está organizado en 6 secciones principales:

### 🏗️ Información del Banner

En la parte superior del menú siempre verás:

- **Archivo de configuración**: Qué docker-compose está siendo usado
- **Stack**: Nombre del proyecto (inventario)
- **Entorno**: Entorno actual (dev, qa, prd)
- **IP Actual**: Tu IP local detectada automáticamente

### 📍 Navegación

- **Números 1-6**: Acceder a cada sección
- **S**: Salir del script
- **V**: Volver al menú anterior (en submenús)

## 📦 Manejador de Contenedores

**Acceso**: Opción `1` del menú principal

```
=======================================
📋 MANEJADOR DE CONTENEDORES
=======================================

 1. 🚀 Iniciar contenedores y construir imagenes
 2. 🛑 Detener y eliminar contenedores
 3. 🔄 Reiniciar contenedores
 4. 🔃 Reiniciar contenedor unico
 5. 🔨 Construir imágenes
```

### 🚀 1. Iniciar Contenedores y Construir Imágenes

**Función**: Inicia todo el stack del Sistema de Inventario

```bash
# Comando ejecutado internamente:
docker compose -f docker-compose-dev.yml --env-file .env --env-file .env.dev up -d --build
```

**Proceso**:
1. Lee las variables de entorno de `.env` y `.env.dev`
2. Construye las imágenes Docker necesarias
3. Inicia todos los servicios en segundo plano
4. Muestra el progreso en tiempo real

**Servicios iniciados**:
- ✅ MariaDB (Base de datos)
- ✅ Redis (Cache)
- ✅ RabbitMQ (Message queue)
- ✅ MinIO (Storage)
- ✅ Backend API, Docs, Tasks
- ✅ Workers y Celery Beat
- ✅ Frontend React
- ✅ NGINX (Reverse proxy)
- ✅ Herramientas de desarrollo (Mailpit, RedisInsight)

> **📸 Captura sugerida**: Pantalla mostrando el proceso de build y startup de contenedores

### 🛑 2. Detener y Eliminar Contenedores

**Función**: Detiene todos los contenedores del stack y los elimina

```bash
# Comando ejecutado:
docker compose -f docker-compose-dev.yml --env-file .env --env-file .env.dev down
```

**Características**:
- ✅ Los datos persistentes se mantienen
- ✅ Las imágenes no se eliminan
- ✅ Proceso limpio y seguro

### 🔄 3. Reiniciar Contenedores

**Función**: Reinicio completo del stack (down + up + build)

**Proceso**:
1. Detiene todos los contenedores
2. Los elimina
3. Los reconstruye y reinicia

**Útil cuando**:
- Cambias configuraciones importantes
- Actualizas Dockerfiles
- Necesitas un "fresh start"

### 🔃 4. Reiniciar Contenedor Único

**Función**: Reinicia solo un contenedor específico

**Interface interactiva**:
```
 # | ID               | NOMBRE                          | IMAGEN                              | ESTADO
---|------------------|---------------------------------|-------------------------------------|------------
 1 | a1b2c3d4e5f6     | inventario-backend-api          | inventario/backend-api:dev.v0.1     | Up 2 hours
 2 | b2c3d4e5f6a1     | inventario-frontend             | inventario/frontend:dev.v0.1        | Up 2 hours
 3 | c3d4e5f6a1b2     | inventario-mariadb              | inventario/mariadb:10.6             | Up 2 hours

Seleccione el índice del contenedor a reiniciar: 1
```

**Características**:
- ✅ Lista solo contenedores del stack inventario
- ✅ Muestra información detallada
- ✅ Reinicio rápido sin afectar otros servicios

> **📸 Captura sugerida**: Lista de contenedores disponibles para reiniciar

### 🔨 5. Construir Imágenes

**Función**: Solo construye las imágenes sin iniciar contenedores

```bash
# Comando ejecutado:
docker compose -f docker-compose-dev.yml --env-file .env --env-file .env.dev build
```

**Útil cuando**:
- Actualizas Dockerfiles
- Cambias dependencias (requirements.txt, package.json)
- Quieres pre-construir antes de iniciar

## 📊 Monitoreo y Diagnóstico

**Acceso**: Opción `2` del menú principal

```
=======================================
📊 MONITOREO Y DIAGNÓSTICO
=======================================

 1. 📋 Ver logs
 2. 📊 Estado de los contenedores
 3. 📦 Listar contenedores de stack
 4. 💻 Abrir terminal en contenedor de stack
```

### 📋 1. Ver Logs

**Función**: Muestra logs en tiempo real de todos los servicios

```bash
# Comando ejecutado:
docker compose -f docker-compose-dev.yml logs -f
```

**Características**:
- ✅ Logs de todos los servicios mezclados
- ✅ Colores para diferenciar servicios
- ✅ Seguimiento en tiempo real (-f)
- ✅ Salir con `Ctrl+C`

**Ejemplo de salida**:
```
inventario-backend-api    | INFO:     Started server process [1]
inventario-frontend       | > dev
inventario-mariadb        | [Note] mysqld: ready for connections.
inventario-redis          | Ready to accept connections
```

> **📸 Captura sugerida**: Logs de múltiples servicios ejecutándose

### 📊 2. Estado de los Contenedores

**Función**: Muestra información detallada del estado de cada contenedor

**Interface tipo tabla**:
```
 # | SERVICIO                 | IMAGEN                                | PUERTO(S)                 | COMANDO
---|--------------------------|---------------------------------------|---------------------------|-------------------------------
 1 | inventario-nginx         | inventario/nginx:dev.v0.1             | 0.0.0.0:80->80/tcp       | nginx -g daemon off;
 2 | inventario-frontend      | inventario/frontend:dev.v0.1          | 0.0.0.0:3000->3000/tcp   | npm run dev
 3 | inventario-backend-api   | inventario/backend-api:dev.v0.1       | 0.0.0.0:8000->8000/tcp   | uvicorn main:app --reload
```

**Información mostrada**:
- ✅ Nombre del servicio
- ✅ Imagen Docker utilizada
- ✅ Puertos mapeados
- ✅ Comando en ejecución

> **📸 Captura sugerida**: Tabla completa con estado de todos los servicios

### 📦 3. Listar Contenedores de Stack

**Función**: Lista detallada solo de contenedores del inventario

**Información mostrada**:
```
  # | ID               | NOMBRE                          | IMAGEN                              | ESTADO
----|------------------|---------------------------------|-------------------------------------|------------
  1 | a1b2c3d4e5f6     | inventario-backend-api          | inventario/backend-api:dev.v0.1     | Up 2 hours
  2 | b2c3d4e5f6a1     | inventario-frontend             | inventario/frontend:dev.v0.1        | Up 2 hours
  3 | c3d4e5f6a1b2     | inventario-mariadb              | inventario/mariadb:10.6             | Up 2 hours (healthy)
```

**Características**:
- ✅ Solo muestra contenedores del stack inventario
- ✅ Incluye estado de health checks
- ✅ IDs de contenedor para debug

### 💻 4. Abrir Terminal en Contenedor

**Función**: Acceso interactivo shell a cualquier contenedor

**Proceso**:
1. Muestra lista de contenedores disponibles
2. Seleccionas el contenedor
3. Detecta automáticamente la shell disponible (bash/sh)
4. Te conecta al contenedor

**Ejemplo de uso**:
```
Seleccione el índice del contenedor (o 4 para volver): 1

Conectando al contenedor inventario-backend-api...
Verificando shell disponible...
Abriendo terminal con bash...

root@a1b2c3d4e5f6:/app# ls
main.py  requirements.txt  models/  routers/
root@a1b2c3d4e5f6:/app# python --version
Python 3.12.0
```

**Útil para**:
- ✅ Debug de aplicaciones
- ✅ Ejecutar comandos dentro del contenedor
- ✅ Inspeccionar archivos y configuraciones
- ✅ Verificar dependencias instaladas

> **📸 Captura sugerida**: Terminal abierta dentro de un contenedor backend

## 🧹 Limpieza y Mantenimiento

**Acceso**: Opción `3` del menú principal

```
=======================================
🧹 LIMPIEZA Y MANTENIMIENTO
=======================================

 1. 🧹 Limpiar contenedores, redes, imágenes y volúmenes
 2. 🖼️  Limpiar imágenes no utilizadas
 3. 💾 Limpiar volúmenes no utilizados
 4. 🗑️  Limpiar todo (contenedores, imágenes y volúmenes)
 5. 🔥 Eliminar Persistencias
```

### 🧹 1. Limpiar Contenedores, Redes, Imágenes y Volúmenes

**Función**: Limpieza completa del stack específico

```bash
# Comando ejecutado:
docker compose -f docker-compose-dev.yml down --rmi all --volumes --remove-orphans
```

**Qué elimina**:
- ✅ Contenedores del stack
- ✅ Imágenes construidas para el stack
- ✅ Volúmenes nombrados del stack
- ✅ Redes creadas para el stack
- ✅ Contenedores huérfanos

**⚠️ Importante**: Los datos en `volumes/` (bind mounts) se mantienen

### 🖼️ 2. Limpiar Imágenes No Utilizadas

**Función**: Elimina imágenes Docker que no están siendo utilizadas

```bash
# Comando ejecutado:
docker image prune -af
```

**Beneficios**:
- ✅ Libera espacio en disco
- ✅ Elimina imágenes colgantes (dangling)
- ✅ No afecta imágenes en uso

### 💾 3. Limpiar Volúmenes No Utilizados

**Función**: Elimina volúmenes Docker no utilizados

```bash
# Comando ejecutado:
docker volume prune -f
```

**Características**:
- ✅ Solo elimina volúmenes sin referencia
- ✅ Los volúmenes activos se mantienen
- ✅ Libera espacio de almacenamiento

### 🗑️ 4. Limpiar Todo

**Función**: Limpieza más agresiva del sistema Docker

**Proceso completo**:
1. Elimina contenedores, imágenes y volúmenes del stack
2. Busca y elimina volúmenes huérfanos del stack
3. Limpia imágenes no utilizadas del sistema
4. Limpia caché de builds de Docker

**Ejemplo de salida**:
```
=======================================
Limpiando contenedores, redes, imágenes y volúmenes del stack...
=======================================
[+] Running 13/13
 ✔ Container inventario-frontend       Removed
 ✔ Container inventario-backend-api    Removed
 ✔ Container inventario-mariadb        Removed

=======================================
Verificando volúmenes huérfanos relacionados con el stack...
=======================================
No se encontraron volúmenes huérfanos relacionados con el stack.

=======================================
Limpiando imágenes no utilizadas...
=======================================
Deleted Images:
untagged: inventario/backend-api:dev.v0.1

=======================================
Limpiando caché de builds generadas...
=======================================
Total reclaimed space: 1.2GB
```

> **📸 Captura sugerida**: Proceso completo de limpieza con estadísticas

### 🔥 5. Eliminar Persistencias

**Función**: Elimina datos persistentes de los servicios (⚠️ DESTRUCTIVO)

**Interface con confirmación**:
```
⚠️  ADVERTENCIA: Esta acción eliminará las persistencias de los contenedores.
   Se borrarán los datos almacenados de los siguientes Servicios/Contenedores,
   solo si no están en ejecución:

 - mailpit
 - mariadb
 - minio
 - rabbitmq
 - redis
 - redisinsight
 - frontend (node_modules, package-lock.json)

¿Seguro que deseas continuar? (S/N):
```

**Proceso de eliminación**:
```
Verificando contenedores en ejecución...
⏳ mariadb está en ejecución. [NO SE ELIMINA]
Eliminando persistencia servicio/contenedor: redis... [OK]
Eliminando persistencia servicio/contenedor: minio... [OK]
Eliminando node_modules de frontend... [OK]
Eliminando package-lock.json de frontend... [OK]

✅ Limpieza completada.
```

**Características de seguridad**:
- ✅ No elimina datos de contenedores en ejecución
- ✅ Confirmación requerida
- ✅ Feedback colorizado del proceso
- ✅ Verificación de existencia antes de eliminar

**Útil cuando**:
- ✅ Quieres resetear completamente los datos
- ✅ Problemas de corrupción en base de datos
- ✅ Cambio de esquema de base de datos
- ✅ Limpiar dependencias de frontend

> **📸 Captura sugerida**: Proceso de confirmación y eliminación de persistencias

## ⚙️ Configuración del Sistema

**Acceso**: Opción `4` del menú principal

```
=======================================
⚙️  CONFIGURACIÓN DEL SISTEMA
=======================================

 1. 🔧 Cambiar entorno (dev, qa, prd)
 2. 🌐 Actualizar IP en Docker Compose
 3. 🔍 Verificar IP actual
 4. 📋 Listar variables de entorno (contenedor)
```

### 🔧 1. Cambiar Entorno

**Función**: Cambia entre entornos de desarrollo, QA y producción

**Proceso**:
```
Ingrese el nuevo entorno: qa
Entorno cambiado a: qa
```

**Efectos del cambio**:
- ✅ Cambia archivo docker-compose (dev → qa → prd)
- ✅ Cambia archivo .env (.env.dev → .env.qa → .env.prd)
- ✅ Se refleja en el banner del menú

**Archivos utilizados por entorno**:
- `dev`: `docker-compose-dev.yml` + `.env.dev`
- `qa`: `docker-compose-qa.yml` + `.env.qa`
- `prd`: `docker-compose.yml` + `.env.prd`

### 🌐 2. Actualizar IP en Docker Compose

**Función**: Detecta y actualiza tu IP local para React Native y desarrollo móvil

**Proceso automático**:
```
🌐 IP actual detectada: 192.168.1.100

📄 IP en .env: 192.168.1.50

⚠️  Las IPs no coinciden.
¿Desea actualizar la IP en .env? (S/N): S

📋 Backup creado: .env.backup.20240115_143022
✅ IP actualizada a 192.168.1.100 en .env
```

**Proceso manual** (si no se detecta IP):
```
❌ No se pudo detectar la IP actual del equipo.
Puede intentar configurarla manualmente.

¿Desea ingresar la IP manualmente? (S/N): S
Ingrese la IP: 192.168.1.100
✅ IP actualizada a 192.168.1.100 en .env
```

**Variable actualizada**: `REACT_NATIVE_PACKAGER_HOSTNAME`

**Características de seguridad**:
- ✅ Crea backup automático con timestamp
- ✅ Valida formato de IP
- ✅ No sobrescribe si IPs coinciden

> **📸 Captura sugerida**: Proceso de detección y actualización de IP

### 🔍 3. Verificar IP Actual

**Función**: Muestra información completa de red y configuración

**Información mostrada**:
```
🌐 IP actual del equipo: 192.168.1.100

📡 Información de red:
   Hostname: mi-laptop

📄 IP en .env: 192.168.1.100
✅ Estado: Las IPs coinciden

🔍 Interfaces de red disponibles:
   [WiFi] 192.168.1.100 - Wi-Fi
   [Ethernet] 192.168.0.50 - Ethernet
   [WSL/Virtual] 172.17.0.1 - vEthernet (WSL)
```

**Útil para**:
- ✅ Verificar configuración de red
- ✅ Diagnosticar problemas de conectividad
- ✅ Conocer todas las interfaces disponibles
- ✅ Validar configuración antes de iniciar servicios

### 📋 4. Listar Variables de Entorno (Contenedor)

**Función**: Inspecciona variables de entorno dentro de un contenedor específico

**Selección de contenedor**:
```
Contenedores disponibles:
 1 | inventario-backend-api
 2 | inventario-frontend
 3 | inventario-mariadb

Seleccione el índice del contenedor: 1
```

**Output detallado**:
```
📋 Variables de entorno en: inventario-backend-api
============================================
Total de variables: 45

  1 | BACKEND_API_HOST=0.0.0.0
  2 | BACKEND_API_PORT=8000
  3 | BACKEND_API_SECRET_KEY=supersecretkey
  4 | DATABASE_URL=mysql://inventario_user:***@mariadb:3306/inventario
  5 | ENVIRONMENT=development
  ...
 45 | WORKER_QUEUES=default,high_priority,low_priority
```

**Útil para**:
- ✅ Debug de configuraciones
- ✅ Verificar que las variables lleguen correctamente
- ✅ Troubleshooting de conexiones
- ✅ Audit de configuración de seguridad

> **📸 Captura sugerida**: Lista de variables de entorno de un contenedor

## 📱 Herramientas Expo

**Acceso**: Opción `5` del menú principal

```
=======================================
📱 HERRAMIENTAS EXPO
=======================================

1) 🚀 Iniciar Expo Development Server
2) 🏗️  EAS Build (Generar APK/AAB)
```

### 🚀 1. Iniciar Expo Development Server

**Función**: Inicia el servidor de desarrollo de Expo para aplicaciones React Native

**Proceso**:
1. Busca contenedores relacionados con Expo
2. Detecta la shell disponible (bash/sh)
3. Ejecuta el script de inicio de Expo

**Ejemplo de ejecución**:
```
✅ Contenedor encontrado: inventario-expo-dev
✅ Shell detectada: bash

🚀 Ejecutando /scripts/start-expo.sh en inventario-expo-dev...

    docker exec -it inventario-expo-dev bash -c "bash /scripts/start-expo.sh"
```

### 🏗️ 2. EAS Build (Generar APK/AAB)

**Función**: Genera builds de producción para Android usando EAS

**Proceso con validaciones**:
```
✅ Contenedor encontrado: inventario-expo-dev
✅ Shell detectada: bash

⚠️  ADVERTENCIA: La variable EXPO_TOKEN no está configurada.
   El build podría fallar sin esta variable.

¿Continuar de todas formas? [y/N]: y

🏗️  Ejecutando EAS Build en inventario-expo-dev...
═══════════════════════════════════════════════════════════════════

✅ EAS Build completado exitosamente!
📱 Revisa tu dashboard de Expo para descargar el APK/AAB:
   https://expo.dev/accounts/blackzeus/projects/Ambrosia/builds
```

**Validaciones automáticas**:
- ✅ Verificar existencia del script `/scripts/eas-build.sh`
- ✅ Verificar configuración de `EXPO_TOKEN`
- ✅ Confirmar antes de proceder sin token

> **📸 Captura sugerida**: Proceso completo de build de Expo

## 📄 Gestión de Templates .ENV

**Acceso**: Opción `6` del menú principal

```
=======================================
📄 GESTIÓN DE TEMPLATES .ENV
=======================================

 1. 🔨 Generar .env.template desde archivos
 2. 📋 Generar archivos .env desde template
 3. 🔍 Verificar archivos .env existentes
```

### 🔨 1. Generar .env.template desde Archivos

**Función**: Crea un template limpio desde archivos .env existentes, omitiendo variables sensibles

**Proceso**:
```
📋 Cargando variables sensibles desde ignore.json...
✅ Variables sensibles encontradas: 5

📄 Procesando .env...
📄 Procesando .env.dev...
📄 Procesando .env.qa...
📄 Procesando .env.prd...

✅ Template generado exitosamente: .env.template
📊 Resumen:
   - Archivos procesados: 4
   - Variables sensibles omitidas: 5
   - Líneas totales en template: 234
```

**Variables sensibles omitidas** (configurables en `ignore.json`):
- API_SECRET_KEY
- BACKEND_API_SECRET_KEY
- MYSQL_ROOT_PASSWORD
- REDIS_PASSWORD
- EXPO_TOKEN

**Resultado en template**:
```
# Antes:
BACKEND_API_SECRET_KEY=supersecretkey123

# En template:
# BACKEND_API_SECRET_KEY= # Variable sensible omitida
```

### 📋 2. Generar Archivos .env desde Template

**Función**: Regenera archivos .env específicos desde el template

**Opciones de generación**:
```
📋 Opciones de generación:
 1. Generar solo .env
 2. Generar solo .env.dev
 3. Generar solo .env.qa
 4. Generar solo .env.prd
 5. Generar todos los archivos

Seleccione una opción [1-5]: 5
```

**Proceso de generación**:
```
🔨 Generando archivos desde template...

📋 Backup creado: .env.backup.20240115_143022
✅ Generado: .env
📋 Backup creado: .env.dev.backup.20240115_143022
✅ Generado: .env.dev
✅ Generado: .env.qa
✅ Generado: .env.prd

✅ Proceso completado!
📊 Archivos generados: 4 de 4

⚠️  IMPORTANTE: Revise los archivos generados y configure las variables sensibles manualmente.
```

**Características de seguridad**:
- ✅ Backup automático de archivos existentes
- ✅ No sobrescribe variables sensibles
- ✅ Separación por secciones (cortes)

### 🔍 3. Verificar Archivos .env Existentes

**Función**: Auditoría completa de archivos de configuración

**Reporte de estado**:
```
📋 Estado de archivos .env:
================================
✅ .env           |   2.1K |  67 líneas | 23 variables
✅ .env.dev       |   1.8K |  54 líneas | 18 variables
❌ .env.qa        | No existe
✅ .env.prd       |   2.5K |  78 líneas | 28 variables
✅ .env.template  |   3.2K | 156 líneas | 45 variables

📄 ignore.json:
✅ ignore.json | Variables sensibles configuradas: 8
```

**Útil para**:
- ✅ Audit de configuraciones
- ✅ Verificar completitud de entornos
- ✅ Comparar tamaños y variables entre entornos
- ✅ Validar configuración de seguridad

> **📸 Captura sugerida**: Reporte completo de estado de archivos .env

## 🎯 Casos de Uso Comunes

### 🚀 Inicio de Proyecto Nuevo

**Flujo completo para nuevo desarrollador**:

1. **Verificar configuración**:
   ```
   ./docker_tools.sh
   → 4. Configuración del Sistema
   → 3. Verificar IP actual
   ```

2. **Generar archivos .env**:
   ```
   → 6. Gestión de Templates .ENV
   → 2. Generar archivos .env desde template
   → Seleccionar opción 5 (todos)
   ```

3. **Configurar variables sensibles**:
   ```bash
   nano .env.dev
   # Configurar contraseñas y tokens
   ```

4. **Iniciar servicios**:
   ```
   → 1. Manejador de Contenedores
   → 1. Iniciar contenedores y construir imágenes
   ```

5. **Verificar estado**:
   ```
   → 2. Monitoreo y Diagnóstico
   → 2. Estado de los contenedores
   ```

### 🔧 Desarrollo Diario

**Flujo típico de desarrollo**:

1. **Iniciar servicios**:
   ```
   → 1. Manejador de Contenedores
   → 1. Iniciar contenedores
   ```

2. **Ver logs durante desarrollo**:
   ```
   → 2. Monitoreo y Diagnóstico
   → 1. Ver logs
   ```

3. **Reiniciar servicio específico tras cambios**:
   ```
   → 1. Manejador de Contenedores
   → 4. Reiniciar contenedor único
   → Seleccionar backend-api
   ```

4. **Debug en contenedor**:
   ```
   → 2. Monitoreo y Diagnóstico
   → 4. Abrir terminal en contenedor
   → Seleccionar el servicio a debuggear
   ```

### 🧹 Mantenimiento Semanal

**Rutina de limpieza recomendada**:

1. **Detener servicios**:
   ```
   → 1. Manejador de Contenedores
   → 2. Detener y eliminar contenedores
   ```

2. **Limpieza de sistema**:
   ```
   → 3. Limpieza y Mantenimiento
   → 4. Limpiar todo
   ```

3. **Reiniciar limpio**:
   ```
   → 1. Manejador de Contenedores
   → 1. Iniciar contenedores y construir imágenes
   ```

### 🔄 Cambio de Entorno

**Proceso para cambiar de desarrollo a QA**:

1. **Detener entorno actual**:
   ```
   → 1. Manejador de Contenedores
   → 2. Detener y eliminar contenedores
   ```

2. **Cambiar entorno**:
   ```
   → 4. Configuración del Sistema
   → 1. Cambiar entorno
   → Ingresar: qa
   ```

3. **Verificar configuración**:
   ```
   Comprobar que el banner muestre:
   Entorno: qa
   Archivo de configuración: docker-compose-qa.yml
   ```

4. **Iniciar en nuevo entorno**:
   ```
   → 1. Manejador de Contenedores
   → 1. Iniciar contenedores
   ```

### 📱 Desarrollo React Native

**Configuración para desarrollo móvil**:

1. **Actualizar IP para dispositivo móvil**:
   ```
   → 4. Configuración del Sistema
   → 2. Actualizar IP en Docker Compose
   ```

2. **Iniciar Expo (si aplica)**:
   ```
   → 5. Herramientas Expo
   → 1. Iniciar Expo Development Server
   ```

3. **Verificar conectividad**:
   ```
   → 4. Configuración del Sistema
   → 3. Verificar IP actual
   ```

> **📸 Captura sugerida**: Secuencia completa de configuración para React Native

## 🔍 Troubleshooting

### ❌ Problemas Comunes y Soluciones

#### 1. **Contenedores no inician**

**Síntomas**:
```
Error: Port 8000 is already in use
Error: Cannot start service backend-api
```

**Diagnóstico usando el script**:
```
→ 2. Monitoreo y Diagnóstico
→ 2. Estado de los contenedores
```

**Soluciones**:
1. **Verificar puertos ocupados**:
   ```bash
   # Fuera del script
   netstat -tulpn | grep :8000
   ```

2. **Cambiar puertos en .env**:
   ```
   → 4. Configuración del Sistema
   → 4. Listar variables de entorno
   ```

3. **Limpiar y reiniciar**:
   ```
   → 3. Limpieza y Mantenimiento
   → 1. Limpiar contenedores, redes, imágenes y volúmenes
   ```

#### 2. **Variables de entorno no se cargan**

**Síntomas**:
```
Environment variable not found: MYSQL_PASSWORD
Connection refused to database
```

**Diagnóstico**:
```
→ 4. Configuración del Sistema
→ 4. Listar variables de entorno (contenedor)
→ Seleccionar backend-api
```

**Verificar variables críticas**:
- MYSQL_PASSWORD
- REDIS_PASSWORD
- BACKEND_API_SECRET_KEY

**Soluciones**:
1. **Verificar archivos .env**:
   ```
   → 6. Gestión de Templates .ENV
   → 3. Verificar archivos .env existentes
   ```

2. **Regenerar desde template**:
   ```
   → 6. Gestión de Templates .ENV
   → 2. Generar archivos .env desde template
   ```

#### 3. **Problemas de conectividad de red**

**Síntomas**:
```
backend-api cannot connect to mariadb
Redis connection refused
```

**Diagnóstico con terminal**:
```
→ 2. Monitoreo y Diagnóstico
→ 4. Abrir terminal en contenedor
→ Seleccionar backend-api

# Dentro del contenedor:
ping mariadb
ping redis
nslookup rabbitmq
```

**Soluciones**:
1. **Verificar que todos los servicios estén arriba**:
   ```
   → 2. Monitoreo y Diagnóstico
   → 2. Estado de los contenedores
   ```

2. **Reiniciar red completa**:
   ```
   → 1. Manejador de Contenedores
   → 3. Reiniciar contenedores
   ```

#### 4. **Problemas de espacio en disco**

**Síntomas**:
```
No space left on device
Docker build failed
```

**Solución gradual**:
1. **Limpiar imágenes no utilizadas**:
   ```
   → 3. Limpieza y Mantenimiento
   → 2. Limpiar imágenes no utilizadas
   ```

2. **Si no es suficiente, limpiar volúmenes**:
   ```
   → 3. Limpieza y Mantenimiento
   → 3. Limpiar volúmenes no utilizados
   ```

3. **Limpieza completa como último recurso**:
   ```
   → 3. Limpieza y Mantenimiento
   → 4. Limpiar todo
   ```

#### 5. **IP no detectada correctamente**

**Síntomas**:
```
IP Actual: No detectada
React Native no conecta al servidor
```

**Soluciones**:
1. **Verificar interfaces disponibles**:
   ```
   → 4. Configuración del Sistema
   → 3. Verificar IP actual
   ```

2. **Configurar manualmente**:
   ```
   → 4. Configuración del Sistema
   → 2. Actualizar IP en Docker Compose
   → Ingresar IP manualmente
   ```

#### 6. **Logs muestran errores de permisos**

**Síntomas**:
```
Permission denied: /var/log/app
Cannot write to /app/node_modules
```

**Soluciones**:
1. **Verificar logs detallados**:
   ```
   → 2. Monitoreo y Diagnóstico
   → 1. Ver logs
   ```

2. **Corregir permisos fuera del script**:
   ```bash
   # En terminal normal
   sudo chown -R $USER:$USER volumes/
   chmod -R 755 volumes/
   ```

3. **Reiniciar servicios**:
   ```
   → 1. Manejador de Contenedores
   → 3. Reiniciar contenedores
   ```

> **📸 Captura sugerida**: Proceso de troubleshooting de conectividad usando el terminal del script

### 🔧 Comandos de Debug Avanzado

#### Dentro de contenedores (usando opción 4 de Monitoreo):

**Backend API**:
```bash
# Verificar FastAPI
curl http://localhost:8000/health
python -c "import requests; print(requests.get('http://mariadb:3306').status_code)"

# Verificar base de datos
mysql -h mariadb -u inventario_user -p inventario

# Verificar Redis
redis-cli -h redis -p 6379 ping
```

**Frontend**:
```bash
# Verificar Node.js
node --version
npm list

# Verificar conectividad con backend
curl http://backend-api:8000/health
ping backend-api
```

**Base de datos**:
```bash
# Estado de MySQL
mysqladmin -u root -p status
mysql -u root -p -e "SHOW PROCESSLIST;"

# Verificar tablas
mysql -u inventario_user -p inventario -e "SHOW TABLES;"
```

## 📈 Mejores Prácticas

### 🚀 Uso Diario Recomendado

1. **Al iniciar el día**:
   - Verificar estado de contenedores
   - Ver logs para detectar errores overnight
   - Verificar IP si trabajas con dispositivos móviles

2. **Durante desarrollo**:
   - Usar reinicio de contenedor único para cambios específicos
   - Mantener logs abiertos en terminal separado
   - Usar terminal de contenedor para debug directo

3. **Al finalizar el día**:
   - Detener contenedores para liberar recursos
   - No es necesario limpiar imágenes diariamente

### 🔒 Seguridad y Configuración

1. **Variables sensibles**:
   - Configurar ignore.json con todas las variables sensibles
   - Nunca commitear archivos .env con contraseñas reales
   - Usar diferentes contraseñas por entorno

2. **Backups automáticos**:
   - El script crea backups automáticos al modificar .env
   - Mantener los backups para recovery rápido
   - Verificar periódicamente la configuración con opción 3 de Templates

3. **Monitoreo**:
   - Revisar regularmente variables de entorno en contenedores
   - Verificar estado de health checks
   - Mantener logs limpios y útiles

### ⚡ Optimización de Rendimiento

1. **Builds eficientes**:
   - Usar "Construir imágenes" solo cuando cambien Dockerfiles
   - Aprovechar cache de Docker manteniendo orden en Dockerfiles
   - Limpiar build cache semanalmente

2. **Gestión de recursos**:
   - Detener servicios no necesarios durante desarrollo
   - Usar limpieza de imágenes regularmente
   - Monitorear uso de espacio en disco

3. **Red y conectividad**:
   - Mantener IP actualizada para mejor conectividad
   - Verificar health checks de servicios críticos
   - Usar terminal de contenedor para debug rápido

## 📚 Referencias y Recursos Adicionales

### 🔗 Enlaces Útiles

- **Documentación completa**: [docs/dockercompose.md](dockercompose.md)
- **Variables de entorno**: [docs/variables-entorno.md](variables-entorno.md)
- **Convenciones de commit**: [docs/commitConventions.md](commitConventions.md)

### 🛠️ Comandos Docker Equivalentes

Para referencia, estos son los comandos Docker que el script ejecuta:

```bash
# Equivalentes a las opciones del script
docker compose -f docker-compose-dev.yml --env-file .env --env-file .env.dev up -d --build  # Iniciar
docker compose -f docker-compose-dev.yml --env-file .env --env-file .env.dev down           # Detener
docker compose -f docker-compose-dev.yml --env-file .env --env-file .env.dev logs -f       # Logs
docker compose -f docker-compose-dev.yml --env-file .env --env-file .env.dev ps            # Estado
docker exec -it container_name bash                                                         # Terminal
docker restart container_id                                                                 # Reiniciar único
```

### 🎯 Tips de Productividad

1. **Alias útiles** (agregar a ~/.bashrc):
   ```bash
   alias dt='./docker_tools.sh'
   alias dtu='./docker_tools.sh && echo "1" | ./docker_tools.sh'  # Auto-start
   ```

2. **Scripts personalizados**:
   - Crear scripts wrapper para casos de uso específicos
   - Integrar con tu IDE para acceso rápido
   - Configurar atajos de teclado

3. **Monitoreo externo**:
   - Usar herramientas como Portainer para gestión visual
   - Configurar alertas para servicios críticos
   - Integrar con herramientas de monitoring

---

## 🎉 Conclusión

El script `docker_tools.sh` proporciona una interfaz amigable y poderosa para gestionar completamente el entorno Docker del Sistema de Inventario. Desde el despliegue inicial hasta el mantenimiento diario, todas las operaciones están organizadas de manera lógica y segura.

### ✅ Beneficios Clave

- **Simplicidad**: Interface intuitiva para operaciones complejas
- **Seguridad**: Confirmaciones y backups automáticos
- **Productividad**: Acceso rápido a todas las herramientas necesarias
- **Mantenimiento**: Herramientas integradas de limpieza y diagnóstico
- **Flexibilidad**: Soporte completo para múltiples entornos

### 🚀 Próximos Pasos

1. Familiarízate con el menú principal y las opciones básicas
2. Practica el flujo de desarrollo diario
3. Configura tu entorno específico (IP, variables, etc.)
4. Explora las herramientas de debug y monitoreo
5. Integra el script en tu workflow de desarrollo

**¡Happy coding!** 🎯

---

**Guía creada para el Sistema de Inventario v1.0**  
*Última actualización: $(date +%Y-%m-%d)*  
*Versión del script: docker_tools.sh v1.0*