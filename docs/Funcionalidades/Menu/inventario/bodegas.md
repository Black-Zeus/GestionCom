# Administración de bodegas

**Ruta:** `/inventory/warehouses`  
**Permiso:** `WAREHOUSES_ACCESS` / `WAREHOUSE_READ` / `WAREHOUSE_MANAGER`  
**Componente:** `AdminWarehouses`  
**Estado:** ✅ Implementado

## Misión

Mantenedor de bodegas y sus estructuras internas (zonas y ubicaciones). Define los puntos físicos de almacenamiento que participan en el flujo de inventario y transferencias.

## Funcionalidades implementadas

- Listado de bodegas con estado y tipo
- Creación y edición de bodega: nombre, dirección, tipo, sucursal asociada
- Activar / desactivar bodega
- Gestión de zonas dentro de la bodega
- Gestión de ubicaciones dentro de cada zona (pasillos, estantes)
