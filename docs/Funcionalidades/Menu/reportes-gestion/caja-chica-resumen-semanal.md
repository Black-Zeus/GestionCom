# Caja chica - resumen semanal (reporte)

**Ruta:** `/reports/petty-cash?report=petty-cash-weekly`  
**Permiso:** `REPORTS_VISIBLE`  
**Componente:** `PettyCashWeekly`  
**Estado:** ✅ Implementado

## Misión

Reporte gerencial para consolidar gastos de caja chica por semana, manteniendo trazabilidad al detalle de cada gasto.

## Funcionalidades implementadas

- Filtro por locación (una, varias o todas las autorizadas para el usuario)
- Filtro por rango de fechas (shortcuts + date picker)
- Filtros propios: categoría y estado
- Vista **Detalle** con gastos individuales
- Vista **Por semana** con totales, estados y comprobantes
- KPIs de total, cantidad de gastos y aprobados
- Exportación CSV, Excel y PDF respetando la vista activa

## Endpoints

- `GET /reports/petty-cash/weekly/data`
- `POST /reports/petty-cash/weekly/pdf`
