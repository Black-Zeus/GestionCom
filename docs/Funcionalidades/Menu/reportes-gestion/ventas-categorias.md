# Ventas por categoría (reporte)

**Ruta:** `/reports/sales?report=category-sales`  
**Permiso:** `REPORTS_VISIBLE`  
**Componente:** `CategorySales`  
**Estado:** ✅ Implementado

## Misión

Reporte gerencial que desglosa las ventas por categoría de producto o marca en un período determinado. Permite identificar qué categorías o marcas generan más ingresos, cuántas unidades mueven y qué porcentaje representan del total de ventas, facilitando decisiones de compra, exhibición y estrategia comercial.

## Funcionalidades implementadas

- Filtro por locación (una, varias o todas las autorizadas para el usuario)
- Filtro por rango de fechas (shortcuts + date picker)
- Filtro propio: **Agrupar por** `Categoría` (default) o `Marca`
- Tabla de resultados: categoría/marca, unidades, transacciones, total, % del total, precio prom. unitario
- Gráfico de barras horizontal con top 10 por monto total
- KPIs: total período, grupos activos, unidades vendidas, transacciones, ticket promedio, grupo líder
- Exportación CSV
- Exportación Excel
- Generación de reporte PDF (vía backend Gotenberg con plantilla HTML)

## Lógica de datos

Solo se contabilizan:
- Documentos con estado `CLOSED`
- Documentos que no sean `RETURN_TICKET` ni `EXCHANGE_DRAFT` (cambios y devoluciones se excluyen, tienen su propio reporte)
- Líneas de venta con `paid_total_amount > 0`

La categoría se obtiene desde `products.category_id → categories.category_name`.  
La marca se obtiene desde `products.brand_id → product_brands.brand_name`.  
Productos sin categoría/marca asignada se agrupan bajo `Sin categoría` / `Sin marca`.

## Generación PDF (backend)

El PDF se genera en `routes/reports.py` usando la plantilla `templates/reports/category_sales.html`.  
El servicio Gotenberg convierte el HTML renderizado a PDF A4.

Endpoints:
- `GET /reports/sales/category-sales/data` — datos para frontend
- `POST /reports/sales/category-sales/pdf` — generación PDF
