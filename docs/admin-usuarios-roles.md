# Administracion: usuarios y roles

## Objetivo

Habilitar la primera superficie operativa de `Administracion > Usuarios / Roles` usando autenticacion real, permisos `USER_*` y peticiones al backend por `/api`.

## Estado actual

### Usuarios

- Ruta frontend: `/admin/users`.
- API usada: `/api/users`.
- Permisos frontend: `USER_READ` o `USER_MANAGER`.
- Permisos backend:
  - Lectura: `USER_READ` o `USER_MANAGER`.
  - Creacion: `USER_WRITE` o `USER_MANAGER`.
  - Activacion/desactivacion: `USER_MANAGER`.
- Funcionalidades disponibles:
  - Listado y busqueda.
  - Filtro de usuarios activos/todos.
  - Creacion con clave temporal validada por politica del backend.
  - Edicion de datos base.
  - Activacion/desactivacion.
  - Cambio de clave por usuario manager, con glosa obligatoria para auditoria.
  - Asignacion de roles a usuario con motivo obligatorio cuando hay cambios.

### Roles

- Ruta frontend: `/admin/roles`.
- API usada: `/api/roles`.
- Permiso requerido: `USER_MANAGER`.
- Perfil raiz seed: `SUPER_ADMIN`, perfil de sistema con todos los permisos activos asignados.
- Funcionalidades disponibles:
  - Listado y busqueda usando `DataTable` comun.
  - Filtro de activos y roles de sistema.
  - Resumen de roles, activos, sistema y asignaciones.
  - Creacion de perfiles custom con `Nuevo Perfil`.
  - Acciones de fila `Ver`, `Usuarios del perfil` y `Desactivar`.
  - Solo perfiles custom/usuario pueden desactivarse. Al intentar desactivar un perfil de sistema, se debe mostrar un modal informativo comun, no un confirm.
  - La accion `Ver` redirige a `/admin/roles/permissions?roleId={id}`.
  - La accion `Usuarios del perfil` abre un modal para ver usuarios asociados y asignar/desasignar usuarios de forma rapida desde Roles.
  - El modal no debe listar todos los usuarios por defecto: carga solo usuarios asociados al perfil y permite buscar usuarios puntuales para agregarlos.
  - El panel de busqueda de usuarios debe reservar una altura estable para evitar saltos visuales del modal al filtrar.
  - En escritorio, el modal de usuarios del perfil debe usar ancho amplio y separar zonas: usuarios asociados a la izquierda y busqueda/agregado a la derecha.
  - Los usuarios asociados se muestran como cards en grilla de 2 columnas, ampliable a 3 si el ancho disponible no queda apretado.
  - Al pulsar una card asociada se marca como `Remover` en rojo; el cambio se aplica solo al guardar.
  - El usuario de la sesion actual no puede agregarse, removerse ni restaurarse desde la administracion de usuarios del perfil; debe mostrarse como `Tu cuenta`.
  - La proteccion de la cuenta propia no debe bloquear altas o bajas de otros usuarios en el mismo perfil.

### Permisos de rol

- Ruta frontend: `/admin/roles/permissions`.
- API usada: `/api/roles/{role_id}/permissions`.
- Permiso requerido: `USER_MANAGER`.
- Funcionalidades disponibles:
  - Carga dedicada de permisos del perfil seleccionado.
  - KPIs del perfil seleccionado.
  - Edicion de permisos por modulo y accion con motivo obligatorio cuando hay cambios.
  - Accion de guardado ubicada en una barra inferior fija reutilizable.
  - Los perfiles de sistema se muestran como solo lectura: switches deshabilitados, motivo oculto y barra de guardado oculta.
  - Esta pantalla debe quedar preparada para reutilizarse posteriormente en `/admin/users/permissions`.

## Normalizaciones aplicadas

- Los codigos internos de mantenedores deben generarse en backend y no deben mostrarse en formularios de creacion, edicion o visualizacion. Ver `docs/codigos-internos.md`.
- La creacion de usuarios ahora persiste `password_hash` usando `PasswordManager.hash_password`.
- Se agrego seeder `20260604_094036_seed_super_admin.sql` para crear perfil `SUPER_ADMIN`, usuario `root` y asignar todos los permisos activos al perfil.
- Credencial inicial DEV para root: usuario `root`, clave `GCom#R7xP9!v2`. En ambientes posteriores debe gestionarse como secreto operativo y rotarse al primer acceso.
- El perfil `SUPER_ADMIN` es reservado: solo puede estar asignado al usuario `root`. No debe ofrecerse como perfil operativo ni asignarse a otros usuarios.
- Se agrego router backend `roles` protegido por `USER_MANAGER`.
- Se registro `/roles` en rutas privadas para middleware JWT.
- Se reemplazo `UnderConstruction` por paginas reales para `Usuarios` y `Roles`.
- Se agrego `ActionButton` como boton comun para acciones primarias como `Nuevo`.
- Las acciones de fila usan botones de icono en la ultima columna `Acciones`.
- Las acciones destructivas o de cambio de estado deben pedir confirmacion en modal.
- Los formularios de creacion/edicion deben abrirse en modal, no como panel inline.
- Al abrir modales, la pagina de fondo no debe hacer scroll. Si el contenido del modal excede la altura disponible, el scroll debe quedar dentro del modal.
- Las operaciones asincronas de UI deben mostrar estado con `react-hot-toast`.
- La barra KPI debe ser accionable: al pulsar un KPI debe aplicar filtros sobre la tabla.
- La barra de filtros debe mostrar desde el inicio todas las dimensiones relevantes del modulo. En Usuarios: busqueda, estado, rol y actividad.
- El listado de usuarios soporta filtros backend por `status`, `role_code`, `search` y `has_recent_login`.
- Las tablas de datos deben estar paginadas y permitir seleccionar 20, 30, 50 o 100 registros.
- El tamano de pagina forma parte de las preferencias persistidas del usuario junto con tema, zona horaria y futuras personalizaciones.
- `KpiBar`, `FilterBar`, `DataTable` y `DataTablePagination` son componentes comunes extensibles para mantener coherencia entre modulos.
- `DataTable` recibe `columns`, `data`, `getRowKey`, `emptyMessage`, `loading` y `footer`.
- Las columnas de `DataTable` pueden definir `sortable`, `accessor`, `sortValue`, `render`, `align` y `cellClassName`.
- Los componentes UI reutilizables estan documentados en `docs/frontend-componentes-ui.md` y deben respetarse en nuevas secciones.
- Las cargas lentas de paginas o tablas deben usar `ModuleSpinner` centrado vertical y horizontalmente.
- Las fechas recibidas desde backend se consideran UTC y se formatean en frontend con la zona horaria de preferencias del usuario.
- La columna `Acciones` de usuarios incluye edicion, cambio de clave y activacion/desactivacion.
- El alta y edicion de usuarios no deben exponer `Caja chica`; ese valor pertenece a un flujo operativo posterior y no aplica a todos los usuarios.
- El alta de usuario debe exigir un perfil inicial. La UI crea el usuario y luego asigna el perfil mediante `/api/users/{user_id}/roles` usando una glosa interna de alta inicial.
- La definicion de clave temporal en alta de usuario debe usar el mismo patron visual del modal de cambio de clave: ojos mostrar/ocultar, barra de robustez y politica de clave.
- Los titulos de modales de usuario deben ser genericos (`Nuevo usuario`, `Editar usuario`) y no deben incluir el username.
- El cambio de clave administrativo usa `/api/auth/change-password-by-admin`, requiere permiso `USER_MANAGER`, pide nueva clave, confirmacion y glosa obligatoria.
- El modal de cambio de clave debe mostrar una barra de robustez y una observacion clara con la politica de clave esperada.
- La asignacion de roles a usuario usa `/api/users/{user_id}/roles`, requiere permiso `USER_MANAGER`, reemplaza el set completo de roles y exige motivo cuando hay cambios.
- La UI de asignacion de roles debe separar roles asignados y busqueda/agregado para evitar listas saturadas. Los cambios se aplican al guardar y requieren motivo.
- Los permisos especiales por usuario usan `/api/users/{user_id}/permissions`, requieren permiso `USER_MANAGER`, reemplazan el set completo de permisos directos especiales y exigen motivo cuando hay cambios.
- Los permisos especiales son solo `GRANT`: agregan accesos que el usuario no recibe por sus roles. No se usa `DENY` en esta fase para evitar choques de precedencia entre roles restrictivos y roles mas amplios.
- Un permiso heredado por rol no puede guardarse tambien como permiso especial del usuario. La UI lo muestra bloqueado y el backend rechaza duplicidades.
- El calculo efectivo de permisos es la union de permisos heredados por todos los roles activos mas permisos especiales directos vigentes. Los duplicados se deduplican.
- Al cambiar permisos especiales se invalida la cache de permisos del usuario afectado y se marca la sesion como pendiente de sincronizacion. No se regenera `user.secret`.
- Desde Roles se puede gestionar rapidamente la asociacion de usuarios al perfil usando el mismo contrato `/api/users/{user_id}/roles`; esta operacion debe pedir motivo comun cuando existan altas o bajas.
- El modal de usuarios del perfil debe permitir agregar y quitar usuarios en la misma transaccion visual antes de guardar.
- Por seguridad, un usuario manager no puede modificar sus propios roles desde la administracion.
- Las tablas puente `user_roles` y `role_permissions` deben estar alineadas con `BaseModel`: `created_at`, `updated_at` y `deleted_at`. Sin esas columnas, el ORM genera errores 500 al asignar roles o permisos.
- La tabla puente `user_permissions` tambien debe estar alineada con `BaseModel`: `created_at`, `updated_at` y `deleted_at`.
- La edicion de permisos del rol usa `/api/roles/{role_id}/permissions`, requiere permiso `USER_MANAGER`, reemplaza el set completo de permisos y exige motivo cuando hay cambios.
- Los permisos de perfiles de sistema/default no pueden modificarse desde UI. La matriz debe mostrarse deshabilitada, el motivo debe quedar oculto y la barra de guardado no debe renderizarse.
- La administracion de permisos por rol debe vivir en una pagina dedicada separada del listado de Roles; no como panel lateral pequeno ni como bloque dentro de la tabla.
- La edicion de permisos por rol se presenta agrupada por modulo, en grilla de 2/3 columnas, con un switch on/off por permiso para evitar tablas anchas y scroll horizontal.
- El `permission_code` canonico se mantiene interno por ahora. La UI puede mostrar una clave corta visual `MOD.ACC` derivada de grupo y accion hasta validar la taxonomia real de permisos.
- Las agrupaciones de permisos en Roles deben ordenarse segun el orden logico del menu lateral para facilitar administracion.
- La matriz de permisos debe organizarse en dos niveles: agrupacion mayor por dominio del producto (`VENTAS`, `INVENTARIO`, `CLIENTES`, etc.) y agrupaciones funcionales internas.
- Los grupos relacionados con un mismo modulo del menu deben vivir bajo la misma agrupacion mayor. Ejemplo: `SALES` y `PRICING` bajo `VENTAS`; `PRODUCTS`, `INVENTORY` y `WAREHOUSE` bajo `INVENTARIO`.
- Los permisos `PAYMENTS`, `PURCHASES` y `RETURNS` deben mostrarse como `PAGOS`, `COMPRAS` y `DEVOLUCIONES`, ubicados bajo `FINANZAS`, `PROVEEDORES` y `DOCUMENTOS`, respectivamente.
- Cada agrupacion mayor debe permitir contraer/expandir su contenido con icono y animacion suave.
- Las pantallas con acciones de guardado persistentes deben usar una barra inferior reutilizable al final real del contenido; no debe ser `fixed` ni `sticky` si existe scroll.
- El layout principal debe mostrar un boton comun `Ir arriba` cuando el usuario baje en el scroll vertical del contenido. Debe ocultarse al estar arriba y aplicar a todos los modulos.
- Cada seccion principal del menu debe tener un permiso de visibilidad `*_VISIBLE` en su grupo funcional. Ejemplos: `SALES_VISIBLE`, `INVENTORY_VISIBLE`, `ADMIN_VISIBLE`.
- El permiso `*_VISIBLE` siempre debe mostrarse primero dentro de su agrupacion.
- Los titulos de agrupacion de permisos deben mostrarse en mayusculas.
- La visibilidad de seccion controla si el grupo aparece en el menu; los permisos de cada opcion controlan accesos mas especificos dentro de esa seccion.
- Las rutas del frontend deben heredar el permiso de visibilidad del grupo. Si una opcion tiene permisos propios, el acceso efectivo es: permiso `*_VISIBLE` del grupo AND alguno de los permisos propios de la opcion.
- Cada submodulo/opcion del menu debe tener un permiso `*_ACCESS`. Ejemplo: `SALES_VISIBLE` permite evaluar la seccion Ventas, pero `NEW_SALE_ACCESS`, `CASH_POS_ACCESS` o `SALES_HISTORY_ACCESS` controlan que opciones internas aparecen y son accesibles por URL.
- Si un usuario tiene `*_VISIBLE` pero no tiene ningun `*_ACCESS` dentro de esa seccion, la seccion no se muestra vacia en el menu.
- La visibilidad de perfiles operativos queda normalizada por rol:
  - `ACCOUNTANT`: `HOME_VISIBLE`, `CUSTOMERS_VISIBLE`, `CASH_VISIBLE`, `DOCUMENTS_VISIBLE`, `FINANCE_VISIBLE`, `REPORTS_VISIBLE`.
  - `SALES_PERSON`: `HOME_VISIBLE`, `SALES_VISIBLE`, `DOCUMENTS_VISIBLE`.
  - `WAREHOUSE_MANAGER`: `HOME_VISIBLE`, `INVENTORY_VISIBLE`.
  - `VIEWER`: `HOME_VISIBLE`.
- Los perfiles reservados `SUPER_ADMIN` y `ADMIN` no deben modificarse durante normalizaciones operativas de visibilidad.
- `MENU_VISIBLE` controla la opcion de configuracion de menu, pero vive bajo el grupo `ADMIN`. No deben mantenerse grupos legacy `MENU`, `MENU_SYSTEM` ni `USER_MENU` en la matriz de permisos.
- Los codigos visuales cortos deben evitar duplicados dentro de una misma agrupacion; cuando el permiso tiene sujeto propio, se usa ese sujeto antes que el grupo general.
- La auditoria de cambios de permisos del rol se registra en `audit_log` con `table_name=role_permissions`, permisos anteriores/nuevos y responsable.
- Al cambiar permisos de un rol se invalida la cache de permisos de todos los usuarios afectados y se marca la sesion como pendiente de sincronizacion. No se regenera `user.secret`.
- La auditoria de usuarios se registra en `audit_log` para creacion, edicion, cambio de estado y cambio de clave.
- La auditoria de cambios de roles de usuario se registra en `audit_log` con `table_name=user_roles`, roles anteriores/nuevos y responsable.
- Al cambiar roles de usuario se invalida la cache de permisos del usuario afectado y se marca la sesion como pendiente de sincronizacion. No se regenera `user.secret`.
- `user.secret` queda reservado para eventos de seguridad que requieren revocar sesiones, como cambio administrativo de clave, bloqueo real de sesion o invalidacion explicita.
- `POST /api/auth/sync-session` emite nuevos access/refresh tokens con roles y permisos vigentes sin cerrar la sesion del usuario.
- El menu de usuario debe incluir la accion `Sincronizar permisos` para refrescar manualmente la sesion mientras no exista sincronizacion automatica.
- La sincronizacion automatica futura debe implementarse con SSE por usuario: el canal no debe transportar permisos ni datos sensibles, solo una senal para ejecutar `sync-session`. Los canales globales deben reservarse para avisos generales y no para eventos por usuario.
- Los registros de auditoria deben incluir fecha/hora de base de datos en UTC, usuario responsable, tabla, registro, accion, campos modificados y valores anteriores/nuevos cuando corresponda.
- Para cambios de clave no se almacenan passwords ni hashes en auditoria; solo indicadores seguros como `password_set`, `password_changed_at`, responsable y glosa.
- La UI no debe avisar al usuario final que una accion sera registrada en auditoria; ese control es interno. En formularios se debe pedir una glosa o motivo cuando aplique, sin mencionar el destino de auditoria.

## Deuda pendiente

- Definir si la administracion de roles sera editable desde producto o solo mantenida por scripts/migraciones.
- Implementar permisos directos por usuario como excepcion controlada, no como mecanismo principal.
- Revisar consistencia entre modelos y esquema real en tablas puente (`user_roles`, `role_permissions`): los modelos heredan `deleted_at`, pero la base actual opera esas relaciones como tablas directas.
- Revisar si `USER_WRITE` debe permitir crear usuarios o si todo alta/baja debe quedar bajo `USER_MANAGER`.
- Agregar pruebas automatizadas para flujo de usuarios y roles.

## Regla activa

No generar commits salvo solicitud explicita. Si una funcionalidad requiere cambios de esquema o datos, crear un nuevo script incremental de alter/normalizacion; no modificar archivos SQL ya creados. Los nuevos SQL deben usar fecha y hora reales en el nombre del archivo.
