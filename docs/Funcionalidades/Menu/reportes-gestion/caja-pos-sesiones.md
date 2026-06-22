# Caja POS - historial de sesiones (reporte)

**Ruta:** `/reports/cash-pos?report=cash-sessions`  
**Permiso:** `REPORTS_VISIBLE`  
**Componente:** `CashPosSessions`  
**Estado:** ✅ Implementado

## Misión

Reporte operativo para revisar aperturas y cierres de Caja POS por período, locación, caja y cajero.

## Funcionalidades implementadas

- Filtro por locación (una, varias o todas las autorizadas para el usuario)
- Filtro por rango de fechas (shortcuts + date picker)
- Filtro propio por estado de sesión
- Vista **Detalle** con sesiones individuales
- Vista **Por día** con sesiones, ventas asociadas y diferencias
- Gráfico de sesiones por día
- Exportación CSV, Excel y PDF respetando la vista activa

## Endpoints

- `GET /reports/cash-pos/sessions/data`
- `POST /reports/cash-pos/sessions/pdf`
