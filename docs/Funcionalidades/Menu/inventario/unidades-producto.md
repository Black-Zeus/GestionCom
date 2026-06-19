# Unidades por producto

**Ruta:** `/inventory/products/units`  
**Permiso:** `PRODUCT_UNITS_ACCESS` o `PRODUCT_UNITS_MANAGE`  
**Componente:** `AdminProductUnits` → `ProductUnitMaintainers`  
**Estado:** ✅ Implementado

## Misión

Gestión de las unidades de medida alternativas por producto. Un producto puede tener unidades distintas para compra, venta e inventario (ej: compra por caja de 12, venta por unidad).

## Funcionalidades implementadas

- Listado de unidades configuradas por producto
- Creación y edición de unidad con factor de conversión respecto a la unidad base
- Configuración de usos: compra, venta, inventario
- Activar / desactivar unidad
