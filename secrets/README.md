# Secrets

Esta carpeta contiene el contrato local para secretos por ambiente. Los valores reales no se versionan.

Para desarrollo, `docker-compose-dev.yml` espera archivos en `secrets/dev/`:

- `backend_api_secret_key.txt`
- `mysql_root_password.txt`
- `mysql_password.txt`
- `redis_password.txt`
- `minio_root_user.txt`
- `minio_root_password.txt`
- `rabbitmq_default_user.txt`
- `rabbitmq_default_pass.txt`
- `rabbitmq_erlang_cookie.txt`

QA y PRD deben usar la misma convencion bajo `secrets/qa/` y `secrets/prd/`, o resolver esas rutas desde un gestor externo de secretos.
