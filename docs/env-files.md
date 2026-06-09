# Archivos de entorno

Los `.env*` declaran configuracion no sensible y rutas a secretos. Los secretos reales viven fuera de Git en `secrets/<ambiente>/*.txt` o en el gestor de secretos equivalente del ambiente.

## `.env`

Archivo base para Compose. Define nombres, redes, puertos, hosts internos y rutas `*_FILE` por defecto para desarrollo.

No debe contener passwords, tokens, cookies, claves JWT ni credenciales embebidas.

- `TZ`: zona horaria del sistema operativo dentro de todos los contenedores. En dev se usa `America/Santiago`.

## Fechas y horas

- La base de datos guarda fechas y horas en UTC.
- El backend debe persistir y comparar fechas en UTC.
- La conexion a MariaDB fuerza `SET time_zone = '+00:00'`.
- El frontend convierte fechas UTC a la zona horaria de preferencias del usuario.
- En dev la zona horaria visible por defecto es `America/Santiago`.
- Todos los contenedores deben recibir el mismo `TZ` desde Compose.

## `.env.dev`

Overlay de desarrollo local. Ajusta puertos, flags de debug y rutas `*_FILE` bajo `secrets/dev/`.

Se usa para demos locales y validacion temprana de proxy, permisos, conexiones y healthchecks.

## `.env.qa`

Overlay de QA. Mantiene configuracion no sensible de QA y apunta a `secrets/qa/`.

Antes de levantar QA deben existir todos los archivos referenciados por `*_FILE` o su equivalente desde el mecanismo de secretos del ambiente.

## `.env.prd`

Overlay de produccion. No debe contener valores `change_me` ni secretos literales.

Las rutas `*_FILE` son contrato de despliegue; en PRD pueden mapearse a Docker secrets, secretos gestionados por la plataforma o archivos inyectados por el pipeline.

## `.env.example`

Plantilla versionada. Debe reflejar las variables esperadas sin incluir secretos reales.

Cuando se agregue una variable sensible, documentarla como `NOMBRE_FILE`, no como `NOMBRE=valor`.

## `.env` de servicios

Los archivos bajo `volumes/*/.env` son configuracion runtime del contenedor. Pueden usar variables interpoladas desde Compose, pero para credenciales deben preferir:

- `JWT_SECRET_SYSTEM_FILE`
- `MYSQL_PASSWORD_FILE`
- `REDIS_PASSWORD_FILE`
- `MINIO_ACCESS_KEY_FILE`
- `MINIO_SECRET_KEY_FILE`

El bucket funcional usado por media debe declararse como `MINIO_MEDIA_BUCKET`; en desarrollo el valor esperado es `gestioncom-media`.

### `volumes/frontend/.env`

Define variables expuestas a Vite. Todo nombre visible de producto debe venir desde `VITE_FRONTEND_NAME`; el codigo no debe hardcodear la marca.

- `VITE_FRONTEND_ENV`: ambiente visible para la UI.
- `VITE_FRONTEND_VERSION`: version visible del frontend.
- `VITE_FRONTEND_NAME`: nombre visible del producto.
- `VITE_FRONTEND_NAMESPACE`: prefijo tecnico para storage, eventos internos e identificadores DOM.
- `VITE_AUTH_DEMO_EMAIL`: email usado por la sesion demo local.
- `VITE_FRONTEND_PORT`: puerto externo esperado por el frontend.
- `VITE_FRONTEND_HOST`: host configurado para el frontend.
- `VITE_FRONTEND_API_URL`: URL base usada por el cliente HTTP; en dev normalmente pasa por `/api`.
- `VITE_HMR_PROTOCOL`: protocolo HMR de Vite.
- `VITE_HMR_HOST`: host HMR de Vite.
- `VITE_HMR_CLIENT_PORT`: puerto cliente HMR expuesto por Nginx/dev.
