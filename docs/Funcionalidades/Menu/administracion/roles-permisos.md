# Roles y permisos

**Ruta:** `/admin/roles`  
**Permiso:** `USER_MANAGER`  
**Componente:** `AdminRoles` (con drill-down a `AdminRolePermissions`)  
**Estado:** ✅ Implementado

## Misión

Gestión del modelo de roles y permisos del sistema. Define los roles disponibles y los permisos granulares asignados a cada uno, controlando qué módulos y acciones puede ejecutar cada perfil de usuario.

## Funcionalidades implementadas

- Listado de roles con nombre y descripción
- Creación y edición de rol
- Asignación de permisos al rol (lista de permission codes)
- Vista de permisos agrupados por módulo
- Activar / desactivar rol
- Eliminación de rol con validación de usuarios asignados
