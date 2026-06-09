# 🔧 Variables de Entorno - Sistema de Inventario

Esta documentación describe la configuración de variables de entorno para el Sistema de Inventario, incluyendo la estructura de archivos `.env` y la descripción detallada de cada variable.

## 📋 Tabla de Contenidos

- [Estructura de Archivos](#-estructura-de-archivos)
- [Variables del Archivo .env General](#-variables-del-archivo-env-general)
- [Archivos Específicos por Entorno](#-archivos-específicos-por-entorno)
- [Jerarquía de Carga](#-jerarquía-de-carga)
- [Validación y Troubleshooting](#-validación-y-troubleshooting)

## 📁 Estructura de Archivos

El sistema utiliza múltiples archivos de configuración para diferentes entornos:

```
proyecto/
├── .env                    # Variables base compartidas (este archivo)
├── .env.dev               # Configuración específica de desarrollo
├── .env.qa                # Configuración específica de QA
├── .env.prd               # Configuración específica de producción
├── .env.template          # Template para generar nuevos .env
└── ignore.json            # Variables sensibles a omitir en templates
```

## 🌍 Variables del Archivo .env General

### Configuración Global del Proyecto

#### Variables de Entorno y Proyecto
```bash
# Entorno actual del sistema
ENV=general

# Nombre del proyecto (usado para contenedores y redes)
PROJECT_NAME=inventario

# Dominio base de la aplicación
DOMAIN_NAME=inventario.local
```

### Backend API (Puerto 8000)

#### Configuración Principal
```bash
# Puerto externo para acceso desde el host
BACKEND_API_PORT=8000

# Puerto interno del contenedor
BACKEND_API_PORT_INTERNAL=8000

# Host de binding (0.0.0.0 para desarrollo)
BACKEND_API_HOST=0.0.0.0

# Entorno de la aplicación
BACKEND_API_ENV=development

# Clave secreta para JWT y encriptación
BACKEND_API_SECRET_KEY=supersecretkey

# Nivel de logging (debug, info, warning, error)
BACKEND_API_LOG_LEVEL=debug

# Auto-reload en desarrollo (true/false)
BACKEND_API_RELOAD=true

# Prefijo de rutas de la API
BACKEND_API_PREFIX=/api/services
```

### NGINX (Puerto 80)

#### Configuración del Reverse Proxy
```bash
# Puerto externo del reverse proxy
NGINX_PORT=80

# Puerto interno del contenedor NGINX
NGINX_PORT_INTERNAL=80
```

### Frontend React (Puerto 3000)

#### Configuración del Cliente Web
```bash
# Puerto externo para acceso desde el host
FRONTEND_PORT=3000

# Puerto interno del contenedor
FRONTEND_PORT_INTERNAL=3000

# Host de binding
FRONTEND_HOST=0.0.0.0

# URL interna para comunicación con Backend API
FRONTEND_API_URL=http://backend-api:8000
```

### Backend Docs (Puerto 8010)

#### Generación de Documentos y MinIO
```bash
# Puerto externo del servicio de documentos
DOCS_API_PORT=8010

# Puerto interno del contenedor
DOCS_API_PORT_INTERNAL=8010

# Host de binding
DOCS_API_HOST=0.0.0.0

# Entorno de la aplicación
DOCS_API_ENV=development

# Prefijo de rutas de la API
DOCS_API_PREFIX=/api/documents

# URL interna del servicio
DOCS_API_URL=http://backend-docs:8010
```

### Backend Tasks (Puerto 8020)

#### Gestión de Tareas en Segundo Plano
```bash
# Puerto externo del servicio de tareas
TASKS_API_PORT=8020

# Puerto interno del contenedor
TASKS_API_PORT_INTERNAL=8020

# Host de binding
TASKS_API_HOST=0.0.0.0

# Entorno de la aplicación
TASKS_API_ENV=development

# Prefijo de rutas de la API
TASKS_API_PREFIX=/api/tasks
```

### Backend Worker (Celery)

#### Configuración de Procesamiento de Colas
```bash
# Nivel de logging para workers (debug, info, warning, error)
WORKER_LOG_LEVEL=info

# Número de procesos workers concurrentes
WORKER_CONCURRENCY=4

# Colas a procesar (separadas por coma)
WORKER_QUEUES=default,high_priority,low_priority,notifications
```

### MinIO (Almacenamiento S3)

#### Configuración de Object Storage
```bash
# Usuario administrador de MinIO
MINIO_ROOT_USER=minioadmin

# Contraseña del administrador
MINIO_ROOT_PASSWORD=minioadmin123

# Host interno para comunicación entre servicios
MINIO_HOST=minio

# Puerto de la API de MinIO
MINIO_PORT=9000

# Puerto de la consola web de administración
MINIO_CONSOLE_PORT=9001

# Bucket usado por el servicio de media/imagenes
MINIO_MEDIA_BUCKET=gestioncom-media
```

### Mailpit (Testing de Emails)

#### Servidor de Correo de Desarrollo
```bash
# Puerto SMTP para envío de emails
MAILPIT_SMTP_PORT=1025

# Puerto de la interfaz web
MAILPIT_UI_PORT=8025

# Ubicación del archivo de base de datos
MAILPIT_STORAGE=/data

# Color de la interfaz web (hexadecimal)
MAILPIT_UI_COLOR=#ff6b35
```

### MariaDB (Base de Datos)

#### Configuración de Base de Datos Principal
```bash
# Contraseña del usuario root
MYSQL_ROOT_PASSWORD=rootpassword123

# Nombre de la base de datos principal
MYSQL_DATABASE=inventario

# Usuario de aplicación (No Usado)
# MYSQL_USER=inventario_user

# Contraseña del usuario de aplicación (No Usado)
# MYSQL_PASSWORD=inventario_pass_2024

# Host interno para conexiones
MYSQL_HOST=mariadb

# Puerto de la base de datos
MYSQL_PORT=3306
```

### Redis (Cache y Message Broker)

#### Configuración de Cache y Celery Broker
```bash
# Host interno para conexiones
REDIS_HOST=redis

# Puerto de Redis
REDIS_PORT=6379

# Puerto para el panel web RedisInsight
REDIS_PORT_PANEL=8080

# Contraseña de acceso a Redis
REDIS_PASSWORD=mipasswordsegura

# Base de datos por defecto (0-15)
REDIS_DB=0
```

### RabbitMQ (Message Queue)

#### Configuración de Cola de Mensajes
```bash
# Usuario administrador de RabbitMQ
RABBITMQ_DEFAULT_USER=inventario_user

# Contraseña del administrador
RABBITMQ_DEFAULT_PASS=inventario_pass_2024

# Host interno para conexiones
RABBITMQ_HOST=rabbitmq

# Puerto AMQP para comunicación de aplicaciones
RABBITMQ_PORT=5672

# Puerto de la interfaz web de administración
RABBITMQ_UI_PORT=15672
```

### Redes y Configuración Docker

#### Configuración de Redes Docker
```bash
# Subred para acceso externo
EXTERNAL_SUBNET=192.168.55.0/24

# Red interna para comunicación entre servicios
INTERNAL_NETWORK=internal

# Red externa para acceso desde el host
EXTERNAL_NETWORK=external
```

### Health Checks

#### Configuración de Monitoreo de Salud
```bash
# Intervalo entre health checks
HEALTH_CHECK_INTERVAL=30s

# Timeout para cada health check
HEALTH_CHECK_TIMEOUT=10s

# Número de intentos antes de marcar como unhealthy
HEALTH_CHECK_RETRIES=3
```

## 🎯 Archivos Específicos por Entorno

### .env.dev (Desarrollo)
Variables específicas para el entorno de desarrollo:

```bash
# Entorno específico
ENV=dev

# Claves secretas de desarrollo
BACKEND_API_SECRET_KEY=dev_secret_key_2024
BACKEND_API_SECRET_KEY_REFRESH=dev_refresh_key_2024

# URLs específicas para desarrollo local
REACT_APP_API_URL=http://localhost:8000
REACT_APP_DOCS_URL=http://localhost:8010
REACT_APP_TASKS_URL=http://localhost:8020

# IP para React Native development
REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.100

# Configuraciones de debugging
DEBUG=true
LOG_LEVEL=debug
ENABLE_HOT_RELOAD=true
ENABLE_DEBUG_TOOLBAR=true
CORS_ALLOW_ALL_ORIGINS=true

# Contraseñas de desarrollo (diferentes a producción)
MYSQL_ROOT_PASSWORD=dev_root_pass_2024
MYSQL_PASSWORD=dev_inventario_pass_2024
REDIS_PASSWORD=dev_redis_pass_2024
MINIO_ROOT_PASSWORD=dev_admin_pass_2024
RABBITMQ_DEFAULT_PASS=dev_admin_pass_2024
```

### .env.qa (Quality Assurance)
```bash
ENV=qa
# Variables específicas para testing y QA
# Contraseñas diferentes a dev y producción
# URLs de servicios de QA
# Configuraciones de testing
```

### .env.prd (Producción)
```bash
ENV=prd
# Variables específicas para producción
# Contraseñas seguras y complejas
# URLs de servicios de producción
# Configuraciones optimizadas para rendimiento
```

## 🔄 Jerarquía de Carga

### Orden de Precedencia
Las variables se cargan en el siguiente orden (las últimas sobrescriben a las primeras):

1. **Variables del sistema** (environment variables del OS)
2. **Archivo .env** (variables base)
3. **Archivo .env.{entorno}** (variables específicas del entorno)
4. **Variables en docker-compose.yml** (environment section)

### Comando de Carga
```bash
# Para desarrollo
docker compose --env-file .env --env-file .env.dev up -d

# Para QA
docker compose --env-file .env --env-file .env.qa up -d

# Para producción
docker compose --env-file .env --env-file .env.prd up -d
```

## ✅ Validación y Troubleshooting

### Verificación de Variables
```bash
# Verificar variables cargadas en Docker Compose
docker compose config

# Verificar variables en un contenedor específico
docker compose exec backend-api env | grep BACKEND

# Verificar variables de un servicio específico
docker inspect container_name | grep -A 20 "Env"
```

### Variables Requeridas vs Opcionales

#### ✅ Variables Críticas (Requeridas)
```bash
PROJECT_NAME                    # Nombre del proyecto
MYSQL_ROOT_PASSWORD            # Contraseña de base de datos
MYSQL_DATABASE                 # Base de datos principal
REDIS_PASSWORD                 # Contraseña de Redis
RABBITMQ_DEFAULT_USER          # Usuario de RabbitMQ
RABBITMQ_DEFAULT_PASS          # Contraseña de RabbitMQ
BACKEND_API_SECRET_KEY         # Clave secreta del backend
```

#### ⚡ Variables con Valores por Defecto
```bash
BACKEND_API_PORT=8000          # Puerto del backend API
FRONTEND_PORT=3000             # Puerto del frontend
NGINX_PORT=80                  # Puerto de NGINX
WORKER_CONCURRENCY=4           # Concurrencia de workers
WORKER_LOG_LEVEL=info          # Nivel de logging
```

### Problemas Comunes

#### 1. Variables no definidas
```bash
# Error: Variable no definida
Error: The variable "PROJECT_NAME" is not set

# Solución: Verificar que la variable existe en .env
grep PROJECT_NAME .env
```

#### 2. Puertos en conflicto
```bash
# Error: Puerto ocupado
Error: Port 8000 is already in use

# Solución: Cambiar puerto en .env
BACKEND_API_PORT=8001
```

#### 3. Contraseñas incorrectas
```bash
# Error: Conexión rechazada
Error: Access denied for user 'inventario_user'

# Solución: Verificar contraseñas en .env
grep PASSWORD .env
```

#### 4. Variables de entorno específicas del servicio
```bash
# Verificar variables específicas cargadas
docker compose exec backend-api printenv | grep BACKEND
docker compose exec redis printenv | grep REDIS
```

### Herramientas de Validación

#### Script de validación manual
```bash
#!/bin/bash
# validate-env.sh

required_vars=(
    "PROJECT_NAME"
    "MYSQL_ROOT_PASSWORD"
    "MYSQL_DATABASE"
    "REDIS_PASSWORD"
    "RABBITMQ_DEFAULT_USER"
    "RABBITMQ_DEFAULT_PASS"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "ERROR: Variable $var no está definida"
        exit 1
    fi
done

echo "✅ Todas las variables requeridas están definidas"
```

#### Verificación de conectividad
```bash
# Probar conectividad entre servicios
docker compose exec backend-api ping redis
docker compose exec backend-api ping mariadb
docker compose exec backend-api ping rabbitmq
```

## 🔒 Seguridad

### Buenas Prácticas

#### Variables Sensibles
- ❌ **Nunca** commitear archivos `.env` con credenciales reales
- ✅ **Usar** archivos `.env.template` para documentar estructura
- ✅ **Rotar** contraseñas regularmente
- ✅ **Usar** contraseñas diferentes por entorno

#### Archivos a Ignorar en Git
```gitignore
# Variables de entorno sensibles
.env
.env.dev
.env.qa
.env.prd
.env.local

# Mantener solo
.env.template
.env.example
```

#### Generación de Contraseñas Seguras
```bash
# Generar contraseña aleatoria
openssl rand -base64 32

# Generar múltiples contraseñas
for i in {1..5}; do openssl rand -base64 16; done
```

---

## 📚 Referencias Adicionales

- [Docker Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [Best Practices for Managing Configuration](https://12factor.net/config)
- [Security Best Practices](https://docs.docker.com/engine/security/)
- [FastAPI Environment Variables](https://fastapi.tiangolo.com/advanced/settings/)
- [Celery Configuration](https://docs.celeryproject.org/en/stable/userguide/configuration.html)

## 📋 Checklist de Configuración

### ✅ Antes de Iniciar el Proyecto

#### Configuración Inicial
- [ ] Copiar `.env.template` a `.env`
- [ ] Configurar variables específicas del entorno en `.env.dev`
- [ ] Generar contraseñas seguras para servicios
- [ ] Verificar que todos los puertos estén disponibles
- [ ] Configurar IP para React Native (`REACT_NATIVE_PACKAGER_HOSTNAME`)

#### Variables Críticas a Configurar
- [ ] `PROJECT_NAME` - Nombre único del proyecto
- [ ] `MYSQL_ROOT_PASSWORD` - Contraseña segura para MariaDB
- [ ] `MYSQL_PASSWORD` - Contraseña del usuario de aplicación
- [ ] `REDIS_PASSWORD` - Contraseña para Redis
- [ ] `RABBITMQ_DEFAULT_PASS` - Contraseña para RabbitMQ
- [ ] `BACKEND_API_SECRET_KEY` - Clave secreta para JWT
- [ ] `MINIO_ROOT_PASSWORD` - Contraseña para MinIO

#### Configuración de Red
- [ ] Verificar que `EXTERNAL_SUBNET` no conflicte con red local
- [ ] Configurar `REACT_NATIVE_PACKAGER_HOSTNAME` con IP local
- [ ] Ajustar puertos si hay conflictos

### ✅ Después de Iniciar el Proyecto

#### Verificación de Servicios
- [ ] Todos los contenedores están en estado "healthy"
- [ ] Frontend accesible en http://localhost:3000
- [ ] Backend API accesible en http://localhost:8000/docs
- [ ] RabbitMQ Management en http://localhost:15672
- [ ] MinIO Console en http://localhost:9001
- [ ] RedisInsight en http://localhost:8080
- [ ] Mailpit en http://localhost:8025

#### Verificación de Conectividad
- [ ] Backend puede conectar a MariaDB
- [ ] Backend puede conectar a Redis
- [ ] Workers pueden procesar tareas en RabbitMQ
- [ ] Frontend puede comunicarse con Backend APIs
- [ ] MinIO puede almacenar y recuperar archivos

## 🚨 Solución de Problemas Comunes

### Error: Variable No Definida
```bash
# Problema
Error: The variable "BACKEND_API_SECRET_KEY" is not set

# Diagnóstico
echo $BACKEND_API_SECRET_KEY  # Verificar si está definida
grep BACKEND_API_SECRET_KEY .env .env.dev

# Solución
# Agregar la variable faltante en .env o .env.dev
BACKEND_API_SECRET_KEY=tu_clave_secreta_aqui
```

### Error: Puerto en Uso
```bash
# Problema
Error: Port 8000 is already in use by container

# Diagnóstico
netstat -tulpn | grep :8000
docker ps --format "table {{.Names}}\t{{.Ports}}"

# Solución
# Cambiar puerto en .env
BACKEND_API_PORT=8001
```

### Error: Conexión de Base de Datos
```bash
# Problema
sqlalchemy.exc.OperationalError: (pymysql.err.OperationalError)

# Diagnóstico
docker compose exec backend-api ping mariadb
docker compose exec mariadb mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW DATABASES;"

# Solución
# Verificar credenciales en .env (No Usado)
# MYSQL_USER=inventario_user
# MYSQL_PASSWORD=inventario_pass_2024
```

### Error: Redis Conexión Rechazada
```bash
# Problema
redis.exceptions.ConnectionError: Connection refused

# Diagnóstico
docker compose exec backend-api ping redis
docker compose exec redis redis-cli -a $REDIS_PASSWORD ping

# Solución
# Verificar contraseña en .env
REDIS_PASSWORD=mipasswordsegura
```

### Error: RabbitMQ Management No Accesible
```bash
# Problema
Unable to access RabbitMQ Management at localhost:15672

# Diagnóstico
docker compose exec rabbitmq rabbitmq-diagnostics ping
curl -u $RABBITMQ_DEFAULT_USER:$RABBITMQ_DEFAULT_PASS http://localhost:15672/api/overview

# Solución
# Verificar credenciales y que el puerto esté mapeado correctamente
RABBITMQ_DEFAULT_USER=inventario_user
RABBITMQ_DEFAULT_PASS=inventario_pass_2024
```

## 🔧 Comandos de Utilidad

### Gestión de Variables de Entorno

#### Mostrar todas las variables
```bash
# En Docker Compose
docker compose config | grep -A 50 "environment:"

# En contenedor específico
docker compose exec backend-api env | sort

# Variables que empiezan con prefijo específico
docker compose exec backend-api env | grep "^BACKEND"
```

#### Validar configuración
```bash
# Validar sintaxis de docker-compose
docker compose config

# Validar variables específicas
docker compose config | grep "MYSQL_PASSWORD"

# Verificar que no hay variables indefinidas
docker compose config 2>&1 | grep "is not set"
```

#### Backup y restauración de configuración
```bash
# Crear backup de configuración actual
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
cp .env.dev .env.dev.backup.$(date +%Y%m%d_%H%M%S)

# Restaurar desde backup
cp .env.backup.20240115_143022 .env

# Comparar configuraciones
diff .env .env.backup.20240115_143022
```

### Testing de Configuración

#### Script de testing completo
```bash
#!/bin/bash
# test-config.sh

echo "🔧 Probando configuración del Sistema de Inventario..."

# 1. Verificar archivos de configuración
echo "📁 Verificando archivos de configuración..."
files=(".env" ".env.dev")
for file in "${files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "✅ $file existe"
    else
        echo "❌ $file no encontrado"
        exit 1
    fi
done

# 2. Verificar variables críticas
echo "🔍 Verificando variables críticas..."
source .env
source .env.dev

critical_vars=(
    "PROJECT_NAME"
    "MYSQL_ROOT_PASSWORD" 
    "MYSQL_DATABASE"
    "REDIS_PASSWORD"
    "RABBITMQ_DEFAULT_USER"
    "RABBITMQ_DEFAULT_PASS"
    "BACKEND_API_SECRET_KEY"
)

for var in "${critical_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo "❌ Variable crítica $var no definida"
        exit 1
    else
        echo "✅ $var definida"
    fi
done

# 3. Verificar puertos disponibles
echo "🌐 Verificando disponibilidad de puertos..."
ports=("80" "3000" "8000" "8010" "8020" "3306" "6379" "5672" "15672" "9000" "9001")
for port in "${ports[@]}"; do
    if ss -tuln | grep -q ":$port "; then
        echo "⚠️  Puerto $port está en uso"
    else
        echo "✅ Puerto $port disponible"
    fi
done

echo "🎉 Configuración validada exitosamente!"
```

## 📖 Ejemplos de Configuración

### Configuración Mínima para Desarrollo
```bash
# .env mínimo para desarrollo local
PROJECT_NAME=inventario
ENV=general

# Backend
BACKEND_API_SECRET_KEY=dev_secret_key_2024
BACKEND_API_PORT=8000

# Base de datos
MYSQL_ROOT_PASSWORD=dev_root_123
MYSQL_DATABASE=inventario
# MYSQL_USER=inventario_user
# MYSQL_PASSWORD=dev_pass_123

# Cache
REDIS_PASSWORD=dev_redis_123

# Message Queue
RABBITMQ_DEFAULT_USER=dev_admin
RABBITMQ_DEFAULT_PASS=dev_rabbit_123

# Storage
MINIO_ROOT_USER=devadmin
MINIO_ROOT_PASSWORD=dev_minio_123
```

### Configuración para Equipo de Desarrollo
```bash
# .env.dev para equipo con IP específica
ENV=dev

# React Native development
REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.100

# URLs específicas del equipo
REACT_APP_API_URL=http://192.168.1.100:8000
FRONTEND_API_URL=http://backend-api:8000

# Debugging habilitado
DEBUG=true
LOG_LEVEL=debug
ENABLE_HOT_RELOAD=true
CORS_ALLOW_ALL_ORIGINS=true

# Workers con menos concurrencia para desarrollo
WORKER_CONCURRENCY=2
WORKER_LOG_LEVEL=debug
```

### Configuración para CI/CD
```bash
# .env.test para testing automatizado
ENV=test

# Base de datos de testing
MYSQL_DATABASE=inventario_test
MYSQL_USER=test_user
MYSQL_PASSWORD=test_pass_123

# Redis con base de datos separada
REDIS_DB=1

# Configuración optimizada para tests
WORKER_CONCURRENCY=1
BACKEND_API_LOG_LEVEL=warning

# URLs internas para testing
REACT_APP_API_URL=http://backend-api:8000
FRONTEND_API_URL=http://backend-api:8000
```

---

**Nota**: Este documento debe mantenerse actualizado conforme evolucione la configuración del proyecto. Cualquier cambio en variables debe reflejarse tanto en la documentación como en los archivos `.env.template`.

**Última actualización**: $(date +%Y-%m-%d)  
**Versión del proyecto**: v1.0.0  
**Entorno documentado**: Desarrollo (dev)
