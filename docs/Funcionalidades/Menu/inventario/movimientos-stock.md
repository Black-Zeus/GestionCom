# Movimientos de stock

**Ruta:** `/inventory/stock/movements`  
**Permiso:** `INVENTORY_VISIBLE`  
**Componente:** `AdminStockMovements`  
**Estado:** ✅ Implementado

## Misión

Consulta del historial completo de movimientos de inventario. Registra toda entrada, salida, ajuste y transferencia que afecta el stock de un producto en una bodega, con trazabilidad del origen de cada movimiento.

## Funcionalidades implementadas

- Listado de movimientos con filtros por producto, bodega, tipo y rango de fechas
- Visualización de: tipo de movimiento, cantidad, saldo resultante, documento origen
- Trazabilidad al documento de venta, transferencia o ajuste que generó el movimiento
- Exportación del listado
