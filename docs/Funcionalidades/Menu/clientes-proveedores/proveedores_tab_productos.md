# Tab: Productos del proveedor

**Pertenece a:** [Listado de proveedores](proveedores.md)  
**Ruta:** `/suppliers` (tab activo: `products`) o `/suppliers/products?supplier_id=X`  
**Componente:** `AdminSupplierProducts`  
**Estado:** ✅ Implementado

## Misión

Catálogo de productos que suministra un proveedor específico. Vincula el SKU interno del sistema con el código y nombre que usa el proveedor, y registra condiciones comerciales de compra.

## Funcionalidades implementadas

- Listado de productos vinculados al proveedor
- Creación y edición:
  - SKU proveedor, código proveedor, nombre del producto según proveedor
  - Último costo de compra
  - Lead time (días de entrega)
  - Flag: proveedor preferido para este producto
- Activar / desactivar relación producto-proveedor
