# Ventas por cliente (reporte)

**Ruta:** `/reports/sales?report=customer-sales`  
**Permiso:** `REPORTS_VISIBLE`  
**Componente:** `CustomerSales`  
**Estado:** ✅ Implementado

## Misión

Reporte gerencial que desglosa las ventas por cliente en un período determinado. Permite identificar qué clientes generan más ingresos, cuántas transacciones realizan y qué porcentaje representan del total de ventas, facilitando decisiones comerciales y de fidelización.

## Funcionalidades implementadas

- Filtro por locación (una, varias o todas las autorizadas para el usuario)
- Filtro por rango de fechas (shortcuts + date picker)
- Toggle de vista: **Detalle** (transacciones individuales) / **Por cliente** (agrupado)
- Tabla agrupada: cliente, RUT, transacciones, total, % del total, ticket promedio
- Tabla de detalle: cliente, RUT, fecha, folio, sucursal, método de pago, total, modal de detalle de venta
- Gráfico de barras horizontal con top 10 clientes por monto total
- KPIs: total período, clientes activos, transacciones, ticket promedio, cliente líder, compra prom./cliente
- Exportación CSV
- Exportación Excel
- Generación de reporte PDF (vía backend Gotenberg con plantilla HTML)

## Lógica de datos

Solo se contabilizan:
- Documentos con estado `CLOSED`
- Documentos que no sean `RETURN_TICKET` ni `EXCHANGE_DRAFT`
- Documentos con `total_amount > 0`

El nombre del cliente se obtiene desde `sale_documents.customer_snapshot` (campo JSON) con la siguiente prioridad: `commercial_name` → `legal_name` → `customer_name` → `name` → `customer_code` → "Cliente Generico".

El RUT se obtiene desde `customer_snapshot.tax_id`.

Las ventas sin cliente identificado (`customer_id IS NULL`) se agrupan en una sola fila como "Cliente Generico".

El agrupamiento usa `ANY_VALUE(customer_snapshot)` sobre `GROUP BY customer_id`, que requiere MySQL 5.7.5+ / MariaDB 10.3+.

## Generación PDF (backend)

El PDF se genera en `routes/reports.py` usando la plantilla `templates/reports/client_sales.html`.  
El servicio Gotenberg convierte el HTML renderizado a PDF A4.

Endpoints:
- `GET /reports/sales/customer-sales/data` — datos para frontend
- `POST /reports/sales/customer-sales/pdf` — generación PDF
