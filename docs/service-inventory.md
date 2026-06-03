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
| `backend-docs` | Review | API documental y acceso a MinIO | Validar si debe ser servicio separado |
| `backend-tasks` | Review | API HTTP para tareas/colas | Mantener si orquesta respaldos/jobs |
| `backend-worker` | Core/Review | Worker Celery general | Mantener para trabajos async |
| `worker-notifications` | Review | Worker Celery para notificaciones | Activar cuando el canal lo justifique |
| `backend-beat` | Review | Scheduler Celery Beat | Mantener si hay respaldos programados |
| `mariadb` | Dependency | Base de datos transaccional | Mantener |
| `redis` | Dependency | Cache, sesiones, rate limit y backend Celery | Mantener |
| `rabbitmq` | Dependency/Review | Broker de mensajeria Celery | Mantener si Celery se conserva |
| `minio` | Dependency/Review | Almacenamiento S3 compatible | Mantener si docs/adjuntos aplica |
| `mailpit` | Tool | Captura de emails en dev | Mantener solo dev/QA |
| `redisinsight` | Tool | UI para inspeccionar Redis | Mantener bajo perfil `tools` |

## Notas de intencion funcional

Estas notas vienen de la definicion funcional actual y ayudan a separar intencion valida de implementacion posiblemente sobredimensionada.

| Servicio | Intencion declarada | Lectura actual |
|---|---|---|
| `backend-docs` | Generar una API para consumir MinIO | Valido si documentos, adjuntos, respaldos o reportes son capacidades del producto; revisar si requiere servicio separado o puede vivir en `backend-api`. Evitar nombre publico `/api/docs` si puede confundirse con documentacion OpenAPI. Preferir `/api/documents` o `/api/files`. |
| `backend-tasks` | Gestionar tareas asincronas y respaldos programados | Valido como API de orquestacion si expone estado, historial, disparo manual o administracion de jobs. |
| `backend-worker` | Procesar trabajos en segundo plano/async | Valido si Celery se conserva. Es el ejecutor real de trabajos. |
| `worker-notifications` | Canal Celery para notificaciones | Activar cuando exista necesidad de procesamiento independiente, retries, auditoria o volumen propio. Para eventos live de interfaz, SSE desde `backend-api` puede cubrir parte de la experiencia sin worker dedicado. |
| `backend-beat` | No recordado inicialmente | Corresponde a scheduler de tareas periodicas Celery. Cobra sentido para respaldos programados, limpiezas o jobs recurrentes. |
| `rabbitmq` | No recordado inicialmente | Corresponde al broker de mensajes para Celery. No programa tareas; transporta trabajos hacia workers. |

Recomendacion de producto: conservar capacidades cuando tengan responsabilidad clara, valor funcional y costo operativo justificable. `backend-worker` sostiene ejecucion asincrona; `backend-tasks` debe existir si administra jobs como recurso del producto; `backend-beat` aplica cuando hay tareas periodicas gestionadas; `worker-notifications` debe activarse cuando notificaciones requieran canal propio. Para archivos, decidir si MinIO se consume desde un modulo de `backend-api` antes de sostener `backend-docs` como servicio independiente.

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

**Intencion funcional:** Se penso como una API para consumir MinIO desde el sistema. La idea funcional es valida para documentos, adjuntos, respaldos o reportes.

**Observacion:** El servicio esta en compose y tiene healthcheck, pero el proxy dev tiene comentado el bloque `/api/documents/`. Si el frontend no consume documentos todavia, puede ser funcionalidad futura o arrastre legacy. Tambien hay que evitar exponerlo como `/api/docs` si eso puede confundirse con la documentacion de APIs; una ruta publica mas clara seria `/api/documents` o `/api/files`.

**Criterio de permanencia:** Review. Mantener como servicio separado solo si el dominio documental justifica aislamiento. Si el objetivo es apenas consumir MinIO para adjuntos simples, puede implementarse como modulo dentro de `backend-api` y dejar `backend-docs` fuera del compose base.

### `backend-tasks`

**Funcionalidad:** API HTTP para tareas en segundo plano.

**Descripcion:** FastAPI separada para gestionar tareas y colas. Expone rutas bajo `/tasks` y healthcheck `/health`.

**Dependencias:** `redis`, `rabbitmq`, `mariadb`.

**Intencion funcional:** Se penso para generar tareas asincronas y manejar procesos como respaldos programados.

**Observacion:** Existe junto a workers Celery. Puede ser util como API de orquestacion de trabajos, especialmente si debe exponer estado, historial, cancelacion, reintentos, programacion manual o disparo administrativo. Tambien puede ser duplicacion si `backend-api` solo necesita encolar un job simple.

**Criterio de permanencia:** Review con tendencia a mantener si los respaldos/jobs son capacidad administrable del producto. Decidir si sera una API real de orquestacion o si `backend-api` encolara trabajos directamente y se conservara solo `backend-worker`.

### `backend-worker`

**Funcionalidad:** Worker Celery general.

**Descripcion:** Procesa cola `default` usando modulo `tasks`. Se conecta a RabbitMQ como broker y Redis como result backend.

**Dependencias:** `redis`, `rabbitmq`, `mariadb`.

**Intencion funcional:** Procesar trabajos en segundo plano o asincronos.

**Criterio de permanencia:** Mantener si se confirma Celery para tareas asincronas. Es el componente que realmente ejecuta procesos largos, reportes, cierres, sincronizaciones, backups o integraciones.

### `worker-notifications`

**Funcionalidad:** Worker Celery de notificaciones.

**Descripcion:** Procesa cola `notifications` usando modulo `notifications`.

**Dependencias:** `redis`, `rabbitmq`, `backend-worker`.

**Intencion funcional:** Se penso como canal de Celery para notificaciones. Aun no esta confirmado si se necesita ese canal; una alternativa para eventos de UI es SSE.

**Observacion:** Es una separacion valida cuando notificaciones tienen volumen, SLA, auditoria o retries propios. Si las notificaciones aun no son una capacidad de producto independiente, puede ser un split prematuro. SSE no reemplaza todos los casos de notificacion asincrona, pero puede cubrir eventos live hacia frontend sin sostener un worker separado.

**Criterio de permanencia:** Review. Mantener si hay capacidad concreta de emails, alertas, recordatorios, webhooks o notificaciones internas con procesamiento propio. Si no, fusionar con `backend-worker`, mover a perfil operativo o retirar del compose base.

### `backend-beat`

**Funcionalidad:** Scheduler Celery Beat.

**Descripcion:** Ejecuta tareas periodicas y persiste schedule en volumen Docker `celerybeat_data`.

**Dependencias:** `redis`, `rabbitmq`, `backend-worker`.

**Intencion funcional:** No estaba recordado al revisar, pero tecnicamente corresponde al scheduler de Celery. Es el componente que dispara tareas periodicas; por ejemplo respaldos programados.

**Observacion:** Actualmente debe validarse si existen tareas periodicas de negocio. Si no hay schedules reales, consume stack y dependencias sin aportar funcionalidad visible. Si respaldos programados son una capacidad del producto, `backend-beat` tiene justificacion clara.

**Criterio de permanencia:** Review. Mantener solo si hay jobs periodicos definidos: backups, expiraciones, limpieza, reportes programados, conciliaciones, cierres, recordatorios o auditorias.

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

**Intencion funcional:** No estaba recordado al revisar, pero su rol tecnico es ser broker de mensajes para Celery. Recibe trabajos desde APIs/schedulers y los entrega a workers. No agenda tareas por si mismo; esa funcion es de `backend-beat`.

**Criterio de permanencia:** Review con tendencia a mantener si se confirma Celery. Si la arquitectura async del producto se resuelve con otro broker o con Redis como broker/backend, revisar.

### `minio`

**Funcionalidad:** Almacenamiento de objetos compatible S3.

**Descripcion:** Servicio de archivos para documentos, respaldos, reportes o facturas. Usa secrets para usuario/password y volumen Docker para datos.

**Dependencias:** Ninguna aplicativa.

**Criterio de permanencia:** Review. Mantener si `backend-docs` o flujos de archivos son capacidad del producto. Si no, mover a perfil operativo o retirar del compose base hasta que exista responsabilidad funcional.

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

1. Decidir si MinIO se expone mediante `backend-docs` o mediante un modulo de `backend-api`. Evitar ruta publica `/api/docs` si puede confundirse con Swagger/OpenAPI; preferir `/api/documents` o `/api/files`.
2. Decidir si `backend-tasks` sera API independiente de administracion de jobs o si `backend-api` encolara tareas directamente.
3. Confirmar si respaldos programados son capacidad del producto. Si lo son, `backend-beat` y `backend-worker` tienen justificacion clara.
4. Confirmar si Celery se mantiene como arquitectura async. Si se mantiene, `rabbitmq` tiene sentido como broker; si no, revisar simplificacion.
5. Activar `worker-notifications` cuando exista necesidad de canal dedicado. Para eventos live hacia frontend, evaluar SSE desde `backend-api`.
6. Revisar `scripts/nginx/nginx.dev.conf`: si docs/tasks se mantienen, decidir rutas proxy definitivas para `/api/documents/` y `/api/tasks/`.
