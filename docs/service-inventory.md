# Inventario de servicios

Documento vivo para decidir que servicios son necesarios, cuales son soporte de ambiente y cuales deben revisarse como posible deuda legacy.

Fuente actual: `docker-compose-dev.yml`, `scripts/nginx/nginx.dev.conf` y archivos `main.py` de las APIs.

## Criterios

- `Core`: necesario para la experiencia principal del producto.
- `Dependency`: dependencia tecnica de servicios core.
- `Tool`: herramienta de desarrollo, QA o soporte operativo.
- `Review`: servicio que existe, pero requiere decision funcional antes de pasar a QA/PRD.

## Resumen rapido

| Servicio | Tipo | Funcion principal | Decision preliminar |
|---|---|---|---|
| `nginx` | Core | Reverse proxy de entrada | Mantener |
| `frontend` | Core | Interfaz web | Mantener |
| `backend-api` | Core | API principal de negocio, auth, usuarios y datos | Mantener |
| `backend-docs` | Review | API documental y carga de archivos | Validar necesidad |
| `backend-tasks` | Review | API HTTP para tareas/colas | Validar necesidad o fusion |
| `backend-worker` | Core/Review | Worker Celery general | Mantener si hay jobs reales |
| `worker-notifications` | Review | Worker Celery para notificaciones | Validar si hay dominio de notificaciones |
| `backend-beat` | Review | Scheduler Celery Beat | Mantener solo si existen tareas periodicas |
| `mariadb` | Dependency | Base de datos transaccional | Mantener |
| `redis` | Dependency | Cache, sesiones, rate limit y backend Celery | Mantener |
| `rabbitmq` | Dependency | Broker de mensajeria Celery | Mantener si Celery sigue separado |
| `minio` | Dependency/Review | Almacenamiento S3 compatible | Mantener si docs/adjuntos aplica |
| `mailpit` | Tool | Captura de emails en dev | Mantener solo dev/QA |
| `redisinsight` | Tool | UI para inspeccionar Redis | Mantener bajo perfil `tools` |

## Servicios

### `nginx`

**Funcionalidad:** Reverse proxy de entrada para el stack.

**Descripcion:** Expone el puerto publico del ambiente y enruta trafico hacia el frontend y APIs internas. En `docker-compose-dev.yml` depende de `frontend`, `backend-api`, `backend-docs` y `backend-tasks`.

**Estado actual:** En `scripts/nginx/nginx.dev.conf`, `/api/` apunta al `backend-api`; los bloques especificos para `/api/documents/` y `/api/tasks/` estan comentados. Esto deja a `backend-docs` y `backend-tasks` levantados, pero no necesariamente publicados por el proxy dev.

**Criterio de permanencia:** Mantener. Es pieza necesaria para validar proxy, permisos, CORS, rutas publicas y comportamiento por ambiente.

### `frontend`

**Funcionalidad:** Aplicacion web del usuario.

**Descripcion:** Servicio Node/Vite/React en desarrollo. Consume backend via variables `VITE_*` y monta codigo fuente desde `volumes/frontend`.

**Dependencias:** `backend-api`, `backend-docs`, `backend-tasks` por healthcheck en compose.

**Criterio de permanencia:** Mantener. Es core del producto.

### `backend-api`

**Funcionalidad:** API principal de negocio y seguridad.

**Descripcion:** FastAPI principal. Carga routers de `health`, `auth`, `users`, `warehouses`, `system`, `menu-items` y `user-menus`. Tiene middleware de trace y auth, usa MariaDB y Redis, y valida secretos por archivo.

**Dependencias:** `mariadb`, `redis`.

**Criterio de permanencia:** Mantener. Es core de auth, users, permisos y datos.

### `backend-docs`

**Funcionalidad:** API documental.

**Descripcion:** FastAPI separada para carga y manejo de documentos. Expone rutas bajo `/upload` y healthcheck `/health`. Usa MinIO como almacenamiento compatible S3.

**Dependencias:** `minio`, `redis`.

**Observacion:** El servicio esta en compose y tiene healthcheck, pero el proxy dev tiene comentado el bloque `/api/documents/`. Si el frontend no consume documentos todavia, puede ser funcionalidad futura o arrastre legacy.

**Criterio de permanencia:** Review. Mantener si existe dominio documental real: adjuntos, facturas, respaldos, reportes o archivos de productos. Si no hay flujo funcional, dejar fuera de dependencias core o moverlo a perfil.

### `backend-tasks`

**Funcionalidad:** API HTTP para tareas en segundo plano.

**Descripcion:** FastAPI separada para gestionar tareas y colas. Expone rutas bajo `/tasks` y healthcheck `/health`.

**Dependencias:** `redis`, `rabbitmq`, `mariadb`.

**Observacion:** Existe junto a workers Celery. Puede ser util como API de orquestacion de trabajos, pero tambien puede ser duplicacion si `backend-api` puede disparar jobs directamente al broker.

**Criterio de permanencia:** Review. Decidir si sera una API real de orquestacion o si se fusiona en `backend-api` y se conserva solo `backend-worker`.

### `backend-worker`

**Funcionalidad:** Worker Celery general.

**Descripcion:** Procesa cola `default` usando modulo `tasks`. Se conecta a RabbitMQ como broker y Redis como result backend.

**Dependencias:** `redis`, `rabbitmq`, `mariadb`.

**Criterio de permanencia:** Mantener si existen tareas asincronas reales: procesos largos, reportes, cierres, sincronizaciones, jobs de inventario o integraciones. Si no hay jobs reales, puede pausarse temporalmente.

### `worker-notifications`

**Funcionalidad:** Worker Celery de notificaciones.

**Descripcion:** Procesa cola `notifications` usando modulo `notifications`.

**Dependencias:** `redis`, `rabbitmq`, `backend-worker`.

**Observacion:** Es una separacion valida cuando notificaciones tienen volumen, SLA o retries propios. Si solo existe una tarea demo, puede ser premature split.

**Criterio de permanencia:** Review. Mantener si hay roadmap concreto de emails, alertas, recordatorios, webhooks o notificaciones internas. Si no, fusionar con `backend-worker` o mover a perfil.

### `backend-beat`

**Funcionalidad:** Scheduler Celery Beat.

**Descripcion:** Ejecuta tareas periodicas y persiste schedule en volumen Docker `celerybeat_data`.

**Dependencias:** `redis`, `rabbitmq`, `backend-worker`.

**Observacion:** Actualmente debe validarse si existen tareas periodicas de negocio. Si no hay schedules reales, consume stack y dependencias sin aportar funcionalidad visible.

**Criterio de permanencia:** Review. Mantener solo si hay jobs periodicos definidos: expiraciones, limpieza, reportes programados, conciliaciones, cierres, recordatorios o auditorias.

### `mariadb`

**Funcionalidad:** Base de datos transaccional.

**Descripcion:** MariaDB con persistencia en volumen Docker, scripts de inicializacion y secretos por archivo.

**Dependencias:** Ninguna aplicativa.

**Criterio de permanencia:** Mantener. Es dependencia central del dominio.

### `redis`

**Funcionalidad:** Cache y backend tecnico.

**Descripcion:** Redis con password por secret. Se usa para cache, rate limiting, reset password, tokens y backend de resultados Celery.

**Dependencias:** Ninguna aplicativa.

**Criterio de permanencia:** Mantener. Es dependencia transversal de seguridad y performance.

### `rabbitmq`

**Funcionalidad:** Broker de mensajeria.

**Descripcion:** RabbitMQ management Alpine, con persistencia y credenciales por secrets. Alimenta Celery workers.

**Dependencias:** Ninguna aplicativa.

**Criterio de permanencia:** Mantener si se confirma arquitectura asincrona con Celery. Si se elimina Celery o se simplifica a Redis Queue, revisar.

### `minio`

**Funcionalidad:** Almacenamiento de objetos compatible S3.

**Descripcion:** Servicio de archivos para documentos, respaldos, reportes o facturas. Usa secrets para usuario/password y volumen Docker para datos.

**Dependencias:** Ninguna aplicativa.

**Criterio de permanencia:** Review. Mantener si `backend-docs` o flujos de archivos son parte del MVP. Si no, mover a perfil o retirar temporalmente.

### `mailpit`

**Funcionalidad:** Captura de correos para desarrollo.

**Descripcion:** Servidor SMTP/UI para validar emails sin enviar a proveedores reales.

**Dependencias:** Ninguna aplicativa.

**Criterio de permanencia:** Mantener en dev y posiblemente QA. No debe formar parte de PRD.

### `redisinsight`

**Funcionalidad:** UI de inspeccion Redis.

**Descripcion:** Herramienta opcional bajo perfil `tools` para inspeccionar claves, TTLs y datos de cache.

**Dependencias:** `redis`.

**Criterio de permanencia:** Mantener solo como herramienta. No debe levantarse por defecto en QA/PRD salvo necesidad operativa controlada.

## Decisiones pendientes

1. Confirmar si `backend-docs` es parte del MVP o si debe moverse a perfil hasta que exista flujo documental real.
2. Confirmar si `backend-tasks` debe ser API independiente o si sus rutas deben fusionarse en `backend-api`.
3. Confirmar si `worker-notifications` necesita cola dedicada o puede vivir dentro de `backend-worker`.
4. Confirmar si `backend-beat` tiene tareas periodicas reales; si no, dejarlo inactivo hasta necesitar schedules.
5. Revisar `scripts/nginx/nginx.dev.conf`: si docs/tasks se mantienen, decidir rutas proxy definitivas para `/api/documents/` y `/api/tasks/`.
