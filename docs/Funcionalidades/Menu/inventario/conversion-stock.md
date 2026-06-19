# Conversión de stock

**Ruta:** `/inventory/stock/conversions`  
**Permiso:** `STOCK_CONVERSIONS_ACCESS` / `STOCK_CONVERT` / `STOCK_ADJUST`  
**Componente:** `AdminStockConversions`  
**Estado:** ✅ Implementado

## Misión

Permite convertir stock de una unidad de medida a otra dentro de la misma bodega (ej: desconsolidar una caja en unidades individuales). Registra el movimiento de entrada y salida resultante.

## Funcionalidades implementadas

- Selección de producto y bodega origen
- Ingreso de cantidad y unidad de origen
- Selección de unidad de destino con cálculo automático según factor de conversión
- Vista previa del movimiento antes de confirmar
- Registro del movimiento de conversión con trazabilidad
