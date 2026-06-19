# Ventas diarias (reporte)

**Ruta:** `/reports/sales?report=daily-sales`  
**Permiso:** `REPORTS_VISIBLE`  
**Componente:** `DailySales`  
**Estado:** ✅ Implementado

## Misión

Reporte operativo de ventas por rango de fechas. Permite analizar las ventas realizadas en un período determinado, filtrando por sucursal. Soporta exportación a CSV, Excel y generación de PDF vía Gotenberg.

## Funcionalidades implementadas

- Selector de rango de fechas (desde / hasta)
- Filtro por sucursal (una, varias o todas las autorizadas para el usuario)
- Tabla de resultados: fecha, sucursal, número de transacciones, total de ventas
- Totales acumulados del período
- Exportación CSV
- Exportación Excel
- Generación de reporte PDF (vía backend Gotenberg con plantilla HTML)

## Generación PDF (backend)

El PDF se genera en `routes/reports.py` usando la plantilla `templates/reports/daily_sales.html`. El servicio Gotenberg convierte el HTML renderizado a PDF A4 apaisado.
