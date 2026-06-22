# Caja chica - historial de reposiciones (reporte)

**Ruta:** `/reports/petty-cash?report=petty-cash-replenishments`  
**Permiso:** `REPORTS_VISIBLE`  
**Componente:** `PettyCashReplenishments`  
**Estado:** ✅ Implementado

## Misión

Reporte operativo para controlar reposiciones de fondos de caja chica por período y locación.

## Funcionalidades implementadas

- Filtro por locación (una, varias o todas las autorizadas para el usuario)
- Filtro por rango de fechas (shortcuts + date picker)
- Vista **Detalle** con reposiciones individuales
- Vista **Por día** con días del período y totales diarios
- KPIs de total repuesto, cantidad de reposiciones y promedio
- Exportación CSV, Excel y PDF respetando la vista activa

## Endpoints

- `GET /reports/petty-cash/replenishments/data`
- `POST /reports/petty-cash/replenishments/pdf`
