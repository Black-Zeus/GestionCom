# Caja POS - movimientos extraordinarios (reporte)

**Ruta:** `/reports/cash-pos?report=cash-extra-movements`  
**Permiso:** `REPORTS_VISIBLE`  
**Componente:** `CashPosExtraMovements`  
**Estado:** ✅ Implementado

## Misión

Reporte operativo para controlar movimientos de Caja POS que no corresponden a ventas ni devoluciones.

## Funcionalidades implementadas

- Filtro por locación (una, varias o todas las autorizadas para el usuario)
- Filtro por rango de fechas (shortcuts + date picker)
- Filtro propio por tipo de movimiento
- Vista **Detalle** con movimientos individuales
- Vista **Por tipo** con total neto por tipo de movimiento
- Gráfico de movimientos por tipo
- Exportación CSV, Excel y PDF respetando la vista activa

## Endpoints

- `GET /reports/cash-pos/extra-movements/data`
- `POST /reports/cash-pos/extra-movements/pdf`
