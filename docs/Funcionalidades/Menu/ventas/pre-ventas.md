# Pre-ventas pendientes

**Ruta:** `/sales/history`  
**Permiso:** `SALES_VISIBLE`  
**Componente:** `SalesHistory`  
**Estado:** ✅ Implementado

## Misión

Panel de gestión de documentos de venta emitidos pero pendientes de cobro. Permite retomar una pre-venta generada desde el módulo de Nueva Venta y derivarla al cobro en Caja POS.

## Funcionalidades implementadas

- Listado de pre-ventas pendientes por sucursal y caja
- Filtros por fecha, cliente y estado del documento
- Visualización del detalle de líneas de la pre-venta
- Acción de retomar venta → derivación al flujo de cobro POS
- Anulación de pre-venta pendiente
- Indicador de tiempo transcurrido desde la emisión
