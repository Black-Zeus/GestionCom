# AGENTS.md

Reglas y politicas para agentes que trabajen en este repositorio.

## Alcance

- Estas reglas aplican a todo el repositorio.
- Si una instruccion explicita del usuario contradice este archivo, seguir la instruccion explicita del usuario solo para esa tarea.
- Antes de modificar archivos, revisar el contexto local relevante y respetar cambios existentes.

## Docker

- El agente puede ejecutar comandos Docker o Docker Compose para levantar, detener, reiniciar o revisar el estado del stack cuando sea necesario para validar el trabajo.
- El agente puede usar comandos como `docker compose up`, `docker compose down`, `docker compose ps`, `docker compose logs`, `docker compose build` y equivalentes operativos.
- El agente solo puede ejecutar limpieza Docker cuando el usuario lo pida explicitamente.
- Limpieza Docker incluye, entre otros:
  - `docker system prune`
  - `docker volume prune`
  - `docker image prune`
  - `docker builder prune`
  - eliminacion masiva de imagenes, volumenes, redes o contenedores
  - comandos que borren datos persistentes del stack

## Git

- El agente puede revisar estado, diff, log y archivos versionados cuando sea necesario.
- El agente solo debe generar commits cuando el usuario lo pida explicitamente.
- Una solicitud anterior de generar commits no autoriza commits futuros. Cada commit requiere una peticion explicita y vigente para el cambio actual.
- Si el usuario pide modificar archivos, documentar, validar o avanzar trabajo, eso no implica permiso para commitear.
- Antes de crear un commit, confirmar que la peticion explicita de commit existe en el mensaje actual o en una instruccion directa no ambigua del usuario para esa tanda de cambios.
- El agente no debe ejecutar `git pull` salvo que el usuario lo pida explicitamente.
- El agente no debe ejecutar `git push` salvo que el usuario lo pida explicitamente.
- No usar comandos destructivos como `git reset --hard`, `git checkout --` o equivalentes para descartar cambios, salvo solicitud explicita del usuario.
- Si hay cambios no relacionados en el working tree, no revertirlos ni incluirlos accidentalmente en commits.

## Cambios De Codigo

- Preferir cambios acotados al objetivo solicitado.
- Mantener las convenciones existentes del proyecto.
- Validar con build, tests o comandos razonables cuando aplique.
- Informar claramente si una validacion no pudo ejecutarse.

## Frontend

- Mantener `ModalManager` e `IconManager` como componentes reutilizables del sistema.
- Mantener Tailwind y su configuracion.
- Priorizar carga lazy, bundles livianos y evitar introducir dependencias pesadas sin necesidad.
- El modo claro/oscuro debe respetarse en layout, header, footer, side menu, modales y contenido.
- Al abrir modales, la pagina de fondo no debe hacer scroll. Si el contenido excede la altura disponible, el scroll debe ocurrir dentro del modal.
- Cuando se cree una pagina nueva, debe componetizarse en archivos separados. Evitar paginas monoliticas que mezclen layout, estado, secciones, formularios, tablas, modales y utilidades en un solo archivo.
- Para paginas frontend, separar al menos:
  - pagina contenedora
  - secciones visuales principales
  - formularios o paneles de accion
  - componentes reutilizables del dominio
  - hooks, servicios o helpers cuando existan reglas de estado o transformacion de datos
- Mantener los componentes cerca del dominio que los consume, salvo que sean reutilizables por varios dominios; en ese caso deben vivir en una carpeta comun del sistema.

## Nomenclatura

- Frontend:
  - Componentes, paginas, layouts y providers: `PascalCase`, por ejemplo `SalesSummaryCard.jsx`, `CashOpeningPage.jsx`.
  - Hooks: `camelCase` con prefijo `use`, por ejemplo `useCashSession.js`.
  - Funciones, variables, stores, servicios y helpers: `camelCase`, por ejemplo `formatCurrency`, `cashService.js`.
  - Carpetas de dominio o feature: `kebab-case`, por ejemplo `sales-history`, `cash-opening`.
  - Constantes globales: `SCREAMING_SNAKE_CASE`, por ejemplo `DEFAULT_PAGE_SIZE`.
- Backend:
  - Archivos, modulos, rutas, servicios, schemas y modelos Python: `snake_case`, por ejemplo `user_service.py`, `accounts_receivable.py`.
  - Clases y modelos declarativos: `PascalCase`, por ejemplo `UserSession`, `WarehouseZone`.
  - Funciones, variables y metodos: `snake_case`, por ejemplo `get_user_permissions`.
  - Constantes: `SCREAMING_SNAKE_CASE`, por ejemplo `ACCESS_TOKEN_EXPIRE_MINUTES`.
- Worker y tareas:
  - Archivos de tareas, servicios y procesos: `snake_case`, por ejemplo `stock_alert_tasks.py`.
  - Nombres de funciones de tarea: `snake_case` con verbo de accion, por ejemplo `send_pending_notifications`.
  - Clases: `PascalCase`.
  - Constantes: `SCREAMING_SNAKE_CASE`.
- Docker, scripts y configuracion operativa:
  - Archivos shell y scripts operativos: `snake_case` o `kebab-case`, manteniendo el estilo existente del directorio.
  - Variables de ambiente: `SCREAMING_SNAKE_CASE`.
  - Servicios Docker Compose: `kebab-case`, por ejemplo `backend-api`, `backend-worker`.
- Base de datos:
  - Tablas, columnas, vistas, rutinas y scopes SQL: `snake_case`.
  - Migraciones SQL: usar exclusivamente el formato definido en la seccion "Migraciones SQL".
- Documentacion:
  - Archivos Markdown de guias y dominios: `kebab-case`, salvo archivos convencionales como `README.md` o `AGENTS.md`.
  - Titulos visibles en documentos: texto natural en espanol, sin forzar el estilo del nombre de archivo.

## Backend E Infraestructura

- Evitar cambios de infraestructura que puedan borrar datos o alterar ambientes sin confirmacion del usuario.
- Para cambios en Docker Compose, revisar que variables de ambiente requeridas existan o queden documentadas.
- Para servicios backend, mantener imports y rutas consistentes con la estructura local del servicio.

## Migraciones SQL

- Los scripts SQL de `scripts/mariadb/entrypoint` deben nombrarse con el formato `YYYYMMDD_HHMM_{scope}.sql`.
- No modificar archivos SQL ya creados. Todo cambio posterior de schema, seed, vistas, rutinas o datos debe quedar en un nuevo script incremental.
- Si el cambio requiere ajustar datos existentes, generar un script de normalizacion o migracion de datos junto al `ALTER` correspondiente, ya sea en el mismo incremental si es pequeno y claro, o en un archivo `data_` separado.
- Los archivos base historicos deben conservarse como trazabilidad del estado original; no corregirlos retroactivamente salvo instruccion explicita del usuario.
- En entornos con base ya levantada, aplicar el incremental explicitamente y validar con consultas de verificacion.
- No usar prefijos numericos simples como `01_`, `02_` o similares para nuevas migraciones.
- La hora `HHMM` debe corresponder a la fecha y hora reales de creacion del script. No usar incrementos artificiales de 1 minuto para ordenar archivos.
- Separar las migraciones por dominio y tipo de contenido. Usar prefijos de scope como `schema_`, `alter_`, `seed_`, `views_`, `routines_` y `data_` segun corresponda.
- No mezclar creacion de tablas, seeds, vistas y rutinas en un mismo archivo salvo que sea una excepcion pequena y justificada.
- Preferir migraciones por scope funcional cuando haya dependencias entre tablas del mismo dominio, por ejemplo `users`, `inventory`, `sales`, `cash_registers`, `accounts_receivable`, antes que un archivo por tabla.
- Mantener cada archivo idealmente bajo 350 lineas. Si supera ese tamano, dividirlo por subdominio o por tipo de objeto.
- Mantener scopes en `snake_case`, descriptivos y estables.
