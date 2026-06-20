# Ventas realizadas

**Ruta:** `/sales/completed`  
**Permiso:** `SALES_HISTORY_ACCESS`  
**Componente:** `SalesCompleted`  
**Estado:** ✅ Implementado

## Misión

Consulta de documentos de venta cerrados en caja. Permite revisar ventas ya realizadas, filtrar el historial operativo y abrir el detalle completo de cada documento para auditoría, seguimiento o atención post-venta.

## Funcionalidades implementadas

- Listado de ventas cerradas con folio, fecha, cliente, medio de pago, cantidad de ítems y total
- Filtros por texto, fecha desde y fecha hasta
- KPIs del resultado filtrado: ventas, total vendido, ticket promedio e ítems vendidos
- Acción de ver venta desde la tabla
- Modal de detalle con datos del documento, cliente, medios de pago, productos vendidos y totalizadores
- Soporte para ventas con medios de pago mixtos, mostrando el desglose real de pagos registrados
