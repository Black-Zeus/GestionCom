# Caja chica - gastos por categoría (reporte)

**Ruta:** `/reports/petty-cash?report=petty-cash-by-category`  
**Permiso:** `REPORTS_VISIBLE`  
**Componente:** `PettyCashByCategory`  
**Estado:** ✅ Implementado

## Misión

Reporte gerencial para revisar concentración de gastos de caja chica por categoría durante el período ejecutado.

## Funcionalidades implementadas

- Filtro por locación (una, varias o todas las autorizadas para el usuario)
- Filtro por rango de fechas (shortcuts + date picker)
- Filtro propio por estado del gasto
- Vista **Detalle** con gastos individuales
- Vista **Por categoría** con monto, participación y estados
- KPIs de total, cantidad de gastos y categorías con movimiento
- Exportación CSV, Excel y PDF respetando la vista activa

## Endpoints

- `GET /reports/petty-cash/by-category/data`
- `POST /reports/petty-cash/by-category/pdf`
