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

## Backend E Infraestructura

- Evitar cambios de infraestructura que puedan borrar datos o alterar ambientes sin confirmacion del usuario.
- Para cambios en Docker Compose, revisar que variables de ambiente requeridas existan o queden documentadas.
- Para servicios backend, mantener imports y rutas consistentes con la estructura local del servicio.

## Migraciones SQL

- Los scripts SQL de `scripts/mariadb/entrypoint` deben nombrarse con el formato `YYYYMMDD_HHMM_{scope}.sql`.
- No usar prefijos numericos simples como `01_`, `02_` o similares para nuevas migraciones.
- La hora `HHMM` define el orden de ejecucion lexicografico; si se agregan varias migraciones en la misma fecha, avanzar en incrementos de 1 minuto: `1300`, `1301`, `1302`, etc.
- Separar las migraciones por dominio y tipo de contenido. Usar prefijos de scope como `schema_`, `alter_`, `seed_`, `views_`, `routines_` y `data_` segun corresponda.
- No mezclar creacion de tablas, seeds, vistas y rutinas en un mismo archivo salvo que sea una excepcion pequena y justificada.
- Preferir migraciones por scope funcional cuando haya dependencias entre tablas del mismo dominio, por ejemplo `users`, `inventory`, `sales`, `cash_registers`, `accounts_receivable`, antes que un archivo por tabla.
- Mantener cada archivo idealmente bajo 350 lineas. Si supera ese tamano, dividirlo por subdominio o por tipo de objeto.
- Mantener scopes en `snake_case`, descriptivos y estables.
