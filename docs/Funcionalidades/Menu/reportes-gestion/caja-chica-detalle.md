# Caja chica - detalle (reporte)

**Ruta:** `/reports/petty-cash?report=petty-cash-detail`  
**Permiso:** `REPORTS_VISIBLE`  
**Componente:** `PettyCashDetail`  
**Estado:** ✅ Implementado

## Misión

Reporte operativo para revisar gastos de caja chica por período, locación, categoría y estado de aprobación. Permite controlar montos rendidos, evidencia registrada y concentración diaria de movimientos.

## Funcionalidades implementadas

- Filtro por locación (una, varias o todas las autorizadas para el usuario)
- Filtro por rango de fechas (shortcuts + date picker)
- Filtros propios: categoría y estado
- Vista **Detalle** con gastos individuales
- Vista **Por día** con todos los días del período, incluyendo días sin movimientos
- Gráfico de barras por día
- KPIs: total período, gastos registrados, gasto promedio, aprobados, rechazados y comprobantes
- Exportación CSV
- Exportación Excel
- Generación de reporte PDF vía backend Gotenberg con plantilla HTML

## Lógica de datos

Se consultan gastos reales desde `petty_cash_expenses`, asociados a:

- `petty_cash_funds` para fondo, responsable y locación
- `warehouses` para nombre de sucursal
- `petty_cash_categories` para categoría
- `users` para responsable, creador y aprobador

El detalle se ordena por `expense_date ASC, id ASC`.  
La vista agrupada por día construye el calendario completo del período ejecutado y rellena con cero los días sin gasto.

## Endpoints

- `GET /reports/petty-cash/detail/data` — datos para frontend
- `POST /reports/petty-cash/detail/pdf` — generación PDF
