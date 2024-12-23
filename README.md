
# Inventario Versión 1

## Descripción General
Este proyecto es un sistema de gestión de inventarios que incluye tanto un frontend como múltiples servicios backend, utilizando tecnología de contenedores Docker para asegurar la portabilidad y la escalabilidad del sistema.

## Tecnologías Utilizadas
El proyecto utiliza las siguientes tecnologías, organizadas en varios contenedores:

- **Backend API**: Servicio que maneja la lógica de negocio. Implementado en Python (ver `docker/dockerfile.backend-api`).
- **Backend Docs**: Servicio para la gestión de documentación interna y APIs. Implementado en Python (ver `docker/dockerfile.backend-docs`).
- **Backend Tasks**: Maneja tareas programadas y de fondo. Implementado en Python (ver `docker/dockerfile.backend-tasks`).
- **Backend Worker**: Procesa tareas asíncronas que requieren más tiempo de ejecución. Implementado en Python (ver `docker/dockerfile.backend-worker`).
- **Frontend Dev**: Versión de desarrollo del frontend. Implementado en React (ver `docker/dockerfile.frontend.dev`).
- **Frontend Prd**: Versión de producción del frontend. Implementado en React (ver `docker/dockerfile.frontend.prd`).
- **MinIO**: Almacenamiento de objetos compatible con S3 para manejo de archivos (ver `docker/dockerfile.minio`).
- **MySQL**: Base de datos relacional (ver `docker/dockerfile.mysql`).
- **Redis**: Almacenamiento en caché para mejorar el rendimiento de la aplicación (ver `docker/dockerfile.redis`).

## Estructura de Directorios
- `.devcontainer`: Configuraciones para el entorno de desarrollo en contenedores.
- `docker`: Dockerfiles para cada uno de los servicios.
- `scripts`: Scripts para la inicialización y configuración de servicios.
- `volumes`: Datos persistentes para los servicios Docker.

## Instalación y Uso
### Prerrequisitos:
* Docker y Docker Compose instalados
* Node.js y npm (para el frontend)

### Pasos de Instalación:
* Clonar el repositorio:
```bash
    git clone https://github.com/tuusuario/inventory.git
```

* Crear el archivo .env en la raíz basado en .env.example.
* Construir y levantar los contenedores:
```bash
docker-compose up --build
```
* Acceder a la aplicación:
    > * Frontend: http://localhost:3000
    > * Backend-API: http://localhost:8000
    > * MariaDB: http://localhost:3306
    > * MInio: http://localhost:9001
    > * Redis: http://localhost:6379
    > * RabbitMQ: http://localhost:15672
    > * MailPit: http://localhost:8025

Este comando levantará todos los contenedores necesarios según las configuraciones definidas en `docker-compose.yml` y `docker-compose.override.yml`.

## Configuración de Entorno
Las variables de entorno están definidas en el archivo `.env` ubicado en la raíz del proyecto. Adicionalmente, cada contenedor tiene un `.env` local que hereda del archivo global principal.

## Puertos Expuestos
* FronEnd: `5000`
* Backend-API: `8000`
* Backend-DOCS: `(No expone puerto)`
* Backend-TASKS: `(No expone puerto)`
* Backend-WORKER: `(No expone puerto)`
* MariaDB: `3306`
* MinIO: `9000`, `9001`
* Redis: `6379`
* RabbitMQ: `15672`, `5672`
* MailPit (Solo Desarrollo): `1025`,`8025`

## Contribuciones
Las contribuciones son bienvenidas. Por favor, revisa `commitConventions.md` para las convenciones de commit antes de contribuir.

## Licencia
Este proyecto está licenciado bajo la Licencia MIT - vea el archivo [LICENSE (ENG)](LICENSE.md) / [LICENSE (ES)](LICENSE_ES.md) para más detalles.
