# Archivos de entorno

Los `.env*` declaran configuracion no sensible y rutas a secretos. Los secretos reales viven fuera de Git en `secrets/<ambiente>/*.txt` o en el gestor de secretos equivalente del ambiente.

## `.env`

Archivo base para Compose. Define nombres, redes, puertos, hosts internos y rutas `*_FILE` por defecto para desarrollo.

No debe contener passwords, tokens, cookies, claves JWT ni credenciales embebidas.

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
- `RABBITMQ_DEFAULT_USER_FILE`
- `RABBITMQ_DEFAULT_PASS_FILE`
