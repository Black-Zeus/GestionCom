# Administración de usuarios

**Ruta:** `/admin/users`  
**Permiso:** `USER_READ` o `USER_MANAGER`  
**Componente:** `AdminUsers`  
**Estado:** ✅ Implementado

## Misión

Gestión completa del ciclo de vida de los usuarios del sistema. Permite crear, editar, activar/desactivar usuarios y asignarles roles que determinan sus permisos de acceso a los módulos.

## Funcionalidades implementadas

- Listado de usuarios con nombre, email, rol y estado
- Creación de usuario: nombre, apellido, email, contraseña temporal, rol asignado
- Edición de datos del usuario
- Asignación de rol al usuario
- Activar / desactivar usuario
- Forzar cambio de contraseña en próximo login
- Eliminación de usuario con validación de registros dependientes
