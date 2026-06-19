# Listado de proveedores

**Ruta:** `/suppliers`  
**Permiso:** `FOUNDATION_MAINTAINERS_ACCESS` o `FOUNDATION_MAINTAINERS_MANAGE`  
**Componente:** `AdminSuppliersMaintainers` → `SuppliersMaintainers`  
**Estado:** ✅ Implementado

## Misión

Mantenedor de la cartera de proveedores. Centraliza los datos maestros del proveedor y provee acceso a sus contactos, direcciones de despacho y catálogo de productos que suministra.

## Funcionalidades implementadas

- Listado con filtros por estado y búsqueda textual
- KPI bar con totales de proveedores activos
- Creación y edición con:
  - RUT, razón social, nombre de fantasía, giro
  - Contacto principal, email, teléfono
  - Días de pago y límite de crédito
  - Notas internas
- Activar / desactivar proveedor
- Eliminación con validación de dependencias

## Sub-navegación (tabs)

| Tab | Descripción | Detalle |
|-----|-------------|---------|
| Proveedores | CRUD principal | — |
| Contactos | Personas de contacto del proveedor | [→](proveedores_tab_contactos.md) |
| Direcciones | Direcciones comerciales y de despacho | [→](proveedores_tab_direcciones.md) |
| Productos | Catálogo de productos que suministra | [→](proveedores_tab_productos.md) |
