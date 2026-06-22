# Caja POS - diferencias de arqueo (reporte)

**Ruta:** `/reports/cash-pos?report=cash-discrepancies`  
**Permiso:** `REPORTS_VISIBLE`  
**Componente:** `CashPosDiscrepancies`  
**Estado:** ✅ Implementado

## Misión

Reporte gerencial para identificar sesiones de Caja POS con diferencias entre monto físico y monto teórico.

## Funcionalidades implementadas

- Filtro por locación (una, varias o todas las autorizadas para el usuario)
- Filtro por rango de fechas (shortcuts + date picker)
- Vista **Detalle** con sesiones con diferencia
- Vista **Por sucursal** con diferencia absoluta, sobrantes y faltantes
- Gráfico top de diferencias de arqueo
- Exportación CSV, Excel y PDF respetando la vista activa

## Endpoints

- `GET /reports/cash-pos/discrepancies/data`
- `POST /reports/cash-pos/discrepancies/pdf`
