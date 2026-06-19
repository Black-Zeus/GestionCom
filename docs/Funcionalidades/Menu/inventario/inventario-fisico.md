# Inventario físico

**Ruta:** `/inventory/stock/physical`  
**Permiso:** `INVENTORY_VISIBLE`  
**Componente:** `AdminPhysicalInventory`  
**Estado:** ✅ Implementado

## Misión

Gestión del proceso de conteo físico de inventario. Permite crear una sesión de inventario físico, registrar los conteos reales por producto y bodega, y aplicar los ajustes de diferencia al stock del sistema.

## Funcionalidades implementadas

- Creación de sesión de inventario físico por bodega
- Listado de productos a contar con stock teórico del sistema
- Ingreso de cantidad contada por producto
- Cálculo de diferencia (sobrante / faltante)
- Aprobación del inventario y aplicación de ajustes de stock
- Historial de sesiones de inventario anteriores
