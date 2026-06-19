# Transferencias de stock

**Ruta:** `/inventory/stock/transfers`  
**Permiso:** `INVENTORY_VISIBLE`  
**Componente:** `AdminStockTransfers`  
**Estado:** ✅ Implementado

## Misión

Gestión del traslado de stock entre bodegas. Registra la solicitud de transferencia, su despacho desde la bodega origen y la recepción en la bodega destino, con control de diferencias entre lo enviado y lo recibido.

## Funcionalidades implementadas

- Listado de transferencias con estado (borrador, en tránsito, recibida, con diferencias)
- Creación de transferencia: bodega origen, bodega destino, productos y cantidades
- Despacho: confirmación de envío con cantidades reales
- Recepción: ingreso de cantidades recibidas y registro de diferencias
- Aprobación de diferencias detectadas en la recepción
- Historial completo de transferencias por bodega
