# Acceso y seguridad

## Estado normalizado

- Las peticiones frontend al backend pasan por `apiClient`.
- `apiClient` agrega `Authorization: Bearer <accessToken>` cuando existe token.
- Ante `401`, `apiClient` intenta renovar sesión con `/auth/refresh`, evita refresh paralelo y reintenta la petición original.
- Si refresh falla, se limpian tokens y se emite el evento interno de sesión expirada.
- `SessionEvents` escucha sesión expirada, limpia estado y redirige a `/login`.
- `SessionEvents` hidrata el usuario al iniciar si existe token persistido, validando `/users/me/profile`.
- `useAuthStore` centraliza login, logout, limpieza de sesión, estado autenticado y helpers de permisos.
- `RequireAuth` protege rutas autenticadas.
- `RequirePermission` permite proteger rutas o componentes por permisos explícitos.
- El modo demo queda desactivado por defecto y solo se habilita con `VITE_AUTH_DEMO_MODE=true`.

## Backend

- El middleware global usa `middleware.auth_middleware.authenticate_request`.
- Ya no existe bypass silencioso si falla la importación del middleware.
- `OPTIONS` queda liberado para preflight CORS.
- `SELF_AUTH_ROUTES` separa rutas que validan credenciales o tokens dentro del endpoint:
  - `/auth/login`
  - `/auth/refresh`
  - `/auth/validate-token`
  - `/auth/forgot-password`
  - `/auth/reset-password`
- `PRIVATE_ROUTES` protege rutas que requieren access token válido.
- `/auth/refresh` se valida en su endpoint usando refresh token, no por middleware global de access token.
- `require_permission` valida permisos específicos (`USER_READ`, `USER_MANAGER`, etc.) sin bypass implícito por rol `ADMIN`.
- `require_admin_only` se mantiene solo para endpoints que explícitamente requieran rol administrador.

## Reglas

- Los permisos efectivos deben venir en `user.permissions`.
- El rol `ADMIN` no debe saltarse controles funcionales por defecto.
- Para administración de usuarios usar permisos `USER_*`.
- Las rutas frontend con control funcional deben declarar permisos en metadata o envolver contenido con `RequirePermission`.
- Los cambios de schema o datos SQL deben hacerse con nuevos scripts incrementales, no modificando SQL ya creado.

## Validaciones realizadas

- `GET /api/health/` responde `200`.
- `GET /api/users/me/profile` sin token responde `401`.
- `POST /api/auth/login` con usuario demo real responde `success: true`.
- `GET /api/users/me/profile` con access token responde `success: true`.
- `POST /api/auth/refresh` con refresh token responde `success: true`.
- `GET /api/users/?limit=5` con token y permisos `USER_*` responde `success: true`.
