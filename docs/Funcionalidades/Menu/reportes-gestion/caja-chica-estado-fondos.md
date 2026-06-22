# Caja chica - estado de fondos (reporte)

**Ruta:** `/reports/petty-cash?report=petty-cash-fund-status`  
**Permiso:** `REPORTS_VISIBLE`  
**Componente:** `PettyCashFundStatus`  
**Estado:** ✅ Implementado

## Misión

Reporte operativo para revisar saldo, monto asignado, gastos acumulados y reposiciones de cada fondo de caja chica.

## Funcionalidades implementadas

- Filtro por locación (una, varias o todas las autorizadas para el usuario)
- Filtro por rango de fechas referencial para mantener el contrato visual de reportes
- Filtro propio por estado del fondo
- Vista **Detalle** por fondo
- Vista **Por estado** con consolidado de saldos y montos
- KPIs de saldo actual, monto asignado y gastos acumulados
- Exportación CSV, Excel y PDF respetando la vista activa

## Endpoints

- `GET /reports/petty-cash/fund-status/data`
- `POST /reports/petty-cash/fund-status/pdf`
