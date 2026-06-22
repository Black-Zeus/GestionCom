# Ranking de vendedores (reporte)

**Ruta:** `/reports/sales?report=seller-ranking`  
**Permiso:** `REPORTS_VISIBLE`  
**Componente:** `SellerRanking`  
**Estado:** ✅ Implementado

## Misión

Reporte gerencial que clasifica a los vendedores por monto total de ventas en un período determinado. Permite identificar a los vendedores más productivos, comparar su participación porcentual, transacciones realizadas y ticket promedio.

## Funcionalidades implementadas

- Filtro por locación (una, varias o todas las autorizadas para el usuario)
- Filtro por rango de fechas (shortcuts + date picker)
- Toggle de vista: **Detalle** (transacciones individuales) / **Por vendedor** (agrupado)
- Tabla agrupada: posición (🥇🥈🥉), vendedor, transacciones, total, % del total, ticket promedio
- Tabla de detalle: vendedor, fecha, folio, sucursal, método de pago, total, modal de detalle de venta
- Gráfico de barras horizontal (ranking por monto total, color ámbar)
- KPIs: total período, vendedores activos, transacciones, ticket promedio, vendedor líder, ticket prom. líder
- Exportación CSV
- Exportación Excel
- Generación de reporte PDF (vía backend Gotenberg con plantilla HTML)

## Lógica de datos

El **vendedor** se determina por `sale_documents.closed_by_user_id` (quien cerró/completó la transacción).

Solo se contabilizan:
- Documentos con estado `CLOSED`
- Documentos que no sean `RETURN_TICKET` ni `EXCHANGE_DRAFT`
- Documentos con `total_amount > 0`

Ventas sin vendedor identificado (`closed_by_user_id IS NULL`) se agrupan como "Sin vendedor".

El nombre se obtiene desde `CONCAT(users.first_name, ' ', users.last_name)`.

## Generación PDF (backend)

El PDF se genera en `routes/reports.py` usando la plantilla `templates/reports/seller_ranking.html`.  
El servicio Gotenberg convierte el HTML renderizado a PDF A4.

Endpoints:
- `GET /reports/sales/seller-ranking/data` — datos para frontend
- `POST /reports/sales/seller-ranking/pdf` — generación PDF
