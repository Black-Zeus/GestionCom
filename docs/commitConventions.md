# 📝 Convenciones de Commit - Sistema de Inventario

Esta guía define las convenciones de commits para el Sistema de Inventario, basado en [Conventional Commits](https://www.conventionalcommits.org/) para mantener un historial de cambios claro y automatizar el versionado semántico.

## 📋 Tabla de Contenidos

- [Estructura de Commits](#-estructura-de-commits)
- [Tipos de Commits](#-tipos-de-commits)
- [Scopes Específicos del Proyecto](#-scopes-específicos-del-proyecto)
- [Ejemplos Prácticos](#-ejemplos-prácticos)
- [Breaking Changes](#-breaking-changes)
- [Herramientas y Validación](#-herramientas-y-validación)

## 📄 Estructura de Commits

```
<tipo>[scope opcional]: <descripción>

[cuerpo opcional]

[pie(s) opcional(es)]
```

### Formato Básico
```bash
feat: añadir autenticación con JWT
fix(api): corregir validación de formulario de login
docs: actualizar README con instrucciones de Docker
```

### Formato Extendido
```bash
feat(backend-api): implementar sistema de autenticación JWT

- Añadir middleware de autenticación
- Crear endpoints de login y logout
- Implementar validación de tokens
- Añadir tests unitarios

Closes #123
```

## 🔖 Tipos de Commits

### 1. **feat** (Feature) 🚀
- **Uso:** Añade una nueva característica o funcionalidad
- **Impacto SemVer:** Aumenta versión menor (`minor`)
- **Ejemplos del proyecto:**
  ```bash
  feat(backend-api): añadir endpoint de gestión de inventario
  feat(frontend): implementar dashboard de métricas
  feat(worker): añadir procesamiento de archivos Excel
  ```

### 2. **fix** (Bug Fix) 🐛
- **Uso:** Corrige un error o bug
- **Impacto SemVer:** Aumenta versión de parche (`patch`)
- **Ejemplos del proyecto:**
  ```bash
  fix(backend-api): corregir error en la validación de productos
  fix(frontend): resolver problema de renderizado en tabla
  fix(redis): corregir configuración de persistencia
  ```

### 3. **refactor** (Refactoring) ♻️
- **Uso:** Modifica el código para mejorar estructura sin cambiar funcionalidad
- **Impacto SemVer:** No afecta versionado
- **Ejemplos del proyecto:**
  ```bash
  refactor(backend-api): simplificar lógica de cálculo de stock
  refactor(frontend): extraer componentes reutilizables
  refactor(worker): optimizar procesamiento de colas Celery
  ```

### 4. **docs** (Documentation) 📚
- **Uso:** Actualiza o agrega documentación
- **Impacto SemVer:** No afecta versionado
- **Ejemplos del proyecto:**
  ```bash
  docs: actualizar README con nuevas instrucciones de despliegue
  docs(api): añadir ejemplos de uso en documentación Swagger
  docs(docker): documentar configuración de variables de entorno
  ```

### 5. **style** (Code Style) 💄
- **Uso:** Cambios de formato sin afectar la lógica
- **Impacto SemVer:** No afecta versionado
- **Ejemplos del proyecto:**
  ```bash
  style(backend-api): formatear código según PEP8
  style(frontend): aplicar prettier a todos los archivos React
  style: corregir indentación en docker-compose.yml
  ```

### 6. **test** (Testing) ✅
- **Uso:** Añade o actualiza pruebas
- **Impacto SemVer:** No afecta versionado
- **Ejemplos del proyecto:**
  ```bash
  test(backend-api): añadir pruebas unitarias para módulo de productos
  test(frontend): implementar tests E2E con Cypress
  test(worker): añadir tests de integración para Celery
  ```

### 7. **build** (Build System) 🔧
- **Uso:** Cambios en sistema de compilación o herramientas externas
- **Impacto SemVer:** No afecta versionado
- **Ejemplos del proyecto:**
  ```bash
  build(docker): actualizar Dockerfile para usar Python 3.12
  build(frontend): configurar build para producción con Vite
  build: optimizar configuración de Docker Compose
  ```

### 8. **ci** (Continuous Integration) 🔄
- **Uso:** Cambios en configuraciones de CI/CD
- **Impacto SemVer:** No afecta versionado
- **Ejemplos del proyecto:**
  ```bash
  ci: añadir GitHub Actions para testing automático
  ci: configurar pipeline de deployment en QA
  ci: añadir linting automático en pre-commit
  ```

### 9. **chore** (Maintenance) 🧹
- **Uso:** Tareas de mantenimiento y actualización de dependencias
- **Impacto SemVer:** No afecta versionado
- **Ejemplos del proyecto:**
  ```bash
  chore: actualizar dependencias de npm
  chore(backend-api): actualizar FastAPI a versión 0.104
  chore: limpiar archivos temporales de desarrollo
  ```

### 10. **perf** (Performance) ⚡
- **Uso:** Mejoras de rendimiento o optimización
- **Impacto SemVer:** Puede aumentar versión menor si es significativo
- **Ejemplos del proyecto:**
  ```bash
  perf(backend-api): optimizar consultas SQL para listado de productos
  perf(redis): configurar pipeline para operaciones en lote
  perf(frontend): implementar lazy loading en componentes
  ```

### 11. **security** (Security) 🔒
- **Uso:** Correcciones de seguridad
- **Impacto SemVer:** Aumenta versión de parche o menor según severidad
- **Ejemplos del proyecto:**
  ```bash
  security(backend-api): corregir vulnerabilidad de inyección SQL
  security: actualizar dependencias con vulnerabilidades conocidas
  security(auth): implementar rate limiting en endpoints de login
  ```

### 12. **revert** (Revert) ↩️
- **Uso:** Revertir un cambio anterior
- **Formato especial:**
  ```bash
  revert: feat(backend-api): añadir endpoint de productos
  
  This reverts commit abc123def456.
  Razón: El endpoint causaba conflictos con la base de datos.
  ```

## 🎯 Scopes Específicos del Proyecto

### Backend Services
- `backend-api` - API principal de negocio
- `backend-docs` - Servicio de generación de documentos
- `backend-tasks` - Servicio de gestión de tareas
- `backend-worker` - Workers de Celery
- `worker-notifications` - Worker de notificaciones
- `backend-beat` - Planificador Celery Beat

### Frontend & Infrastructure
- `frontend` - Aplicación React
- `nginx` - Reverse proxy
- `docker` - Configuraciones Docker
- `compose` - Docker Compose específico

### Data Layer
- `mariadb` - Base de datos
- `redis` - Cache y message broker
- `minio` - Almacenamiento de objetos
- `rabbitmq` - Message queue

### Development Tools
- `mailpit` - Testing de emails
- `redisinsight` - Interface de Redis
- `scripts` - Scripts de inicialización

### General
- `auth` - Sistema de autenticación
- `api` - APIs en general
- `config` - Configuraciones
- `deps` - Dependencias
- `env` - Variables de entorno

## 📚 Ejemplos Prácticos

### Desarrollo de Features
```bash
# Nueva funcionalidad en el backend
feat(backend-api): implementar CRUD de categorías de productos

- Añadir modelos de categorías
- Crear endpoints REST para categorías
- Implementar validaciones de datos
- Añadir tests unitarios

Closes #45

# Nueva interfaz en frontend
feat(frontend): añadir página de gestión de inventario

- Crear componentes de tabla de productos
- Implementar filtros y búsqueda
- Añadir formularios de creación/edición
- Integrar con API de backend

Refs #67
```

### Corrección de Bugs
```bash
# Error en backend
fix(backend-api): corregir error 500 en endpoint de productos

El endpoint fallaba cuando el producto no tenía categoría asignada.
Se añade validación para manejar productos sin categoría.

Fixes #89

# Error en frontend
fix(frontend): resolver problema de estado en formulario

El estado del formulario no se limpiaba después de envío exitoso.
Se añade reset del formulario en el callback de éxito.

Fixes #112
```

### Mejoras de Infraestructura
```bash
# Optimización de Docker
perf(docker): optimizar build de imágenes con cache multi-stage

- Usar multi-stage builds para reducir tamaño
- Implementar cache de dependencias
- Reducir tiempo de build en 60%

# Configuración de base de datos
build(mariadb): añadir índices para optimizar consultas

- Añadir índice en tabla productos.categoria_id
- Optimizar consulta de listado principal
- Reducir tiempo de respuesta de 2s a 200ms
```

### Documentación y Configuración
```bash
# Actualización de documentación
docs(api): documentar nuevos endpoints de categorías

- Añadir ejemplos de request/response
- Documentar códigos de error
- Actualizar collection de Postman

# Configuración de entorno
chore(env): añadir variables para configuración de cache

- REDIS_CACHE_TTL para tiempo de expiración
- REDIS_MAX_CONNECTIONS para pool de conexiones
- Actualizar .env.template con nuevas variables
```

## 💥 Breaking Changes

### Formato para Breaking Changes
```bash
feat(backend-api): refactor completo del sistema de autenticación

- Migrar de sesiones a JWT
- Cambiar estructura de respuesta de auth endpoints
- Requerir header Authorization en todas las APIs protegidas

BREAKING CHANGE: 
- El endpoint /auth/login ahora retorna un token JWT en lugar de crear sesión
- Todos los endpoints protegidos requieren header "Authorization: Bearer <token>"
- El endpoint /auth/logout ya no es necesario (tokens tienen expiración)

Se requiere actualizar:
- Frontend para manejar JWT
- Variables de entorno con JWT_SECRET_KEY
- Documentación de API

Closes #200
```

### Ejemplos de Breaking Changes del Proyecto
```bash
# Cambio en estructura de base de datos
feat(mariadb): migrar a nueva estructura de tablas

BREAKING CHANGE: 
- Tabla 'productos' renombrada a 'items_inventario'
- Campo 'precio' dividido en 'precio_compra' y 'precio_venta'
- Se requiere ejecutar migración manual de datos

# Cambio en API
feat(backend-api): unificar formato de respuestas API

BREAKING CHANGE:
- Todas las respuestas ahora usan formato estándar:
  { "success": bool, "data": any, "message": string }
- Códigos de estado HTTP cambiaron para mayor consistencia
- Se requiere actualizar clientes de la API
```

## 🛠️ Herramientas y Validación

### Configuración de Pre-commit
```bash
# Instalar pre-commit hooks
pip install pre-commit
pre-commit install

# .pre-commit-config.yaml
repos:
  - repo: https://github.com/compilerla/conventional-pre-commit
    rev: v3.0.0
    hooks:
      - id: conventional-pre-commit
        stages: [commit-msg]
```

### Validación Manual
```bash
# Verificar formato de commit
git log --oneline -10

# Generar changelog automático
conventional-changelog -p conventionalcommits -i CHANGELOG.md -s
```

### Comandos Git Útiles
```bash
# Commit con template
git commit -t .gitmessage

# Amend del último commit
git commit --amend

# Commit interactivo para múltiples archivos
git add -p
git commit
```

### Template de Commit (.gitmessage)
```
# <tipo>[scope]: <descripción corta>
# |<----  Usar máximo 50 caracteres  ---->|

# Explicar el QUÉ y POR QUÉ (no el cómo)
# |<----   Usar máximo 72 caracteres   ---->|

# Tickets/Issues relacionados
# Closes #123
# Refs #456

# --- TIPOS DISPONIBLES ---
# feat:     Nueva funcionalidad
# fix:      Corrección de bug
# docs:     Documentación
# style:    Formato de código
# refactor: Refactoring
# test:     Tests
# chore:    Mantenimiento
# perf:     Mejora de rendimiento
# ci:       Integración continua
# build:    Build system
# security: Seguridad
```

## ✅ Checklist de Commits

Antes de hacer commit, verifica:

- [ ] **Tipo correcto**: ¿El tipo de commit refleja el cambio realizado?
- [ ] **Scope apropiado**: ¿El scope es específico y relevante?
- [ ] **Descripción clara**: ¿La descripción explica QUÉ cambió?
- [ ] **Formato correcto**: ¿Sigue la estructura conventional commits?
- [ ] **Breaking changes**: ¿Está marcado si rompe compatibilidad?
- [ ] **Referencias**: ¿Incluye referencias a issues/tickets?
- [ ] **Tests**: ¿Los cambios incluyen tests si es necesario?

## 🔗 Referencias

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)

---

**Manteniendo un historial de cambios limpio y profesional para el Sistema de Inventario** 🏭

*Última actualización: $(date +%Y-%m-%d)*