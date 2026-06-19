# Módulo: Reportes de gestión

**Ruta raíz:** `/reports/*`  
**Permiso de visibilidad:** `REPORTS_VISIBLE`  
**Estado:** ⚠️ Parcial (1 reporte operativo disponible, resto en desarrollo)

## Descripción

Módulo de reportería gerencial y operativa. Organiza los reportes por área de negocio. Cada área tiene su propia página con el catálogo de reportes disponibles y en desarrollo. Los reportes disponibles generan salida en PDF (vía Gotenberg) y exportaciones CSV/Excel.

## Ítems del módulo

| Nombre | Ruta | Estado |
|--------|------|--------|
| [Hub de reportes](hub.md) | `/reports` | ✅ |
| [Reportes de ventas](ventas.md) | `/reports/sales` | ⚠️ |
| [Reportes de inventario](inventario.md) | `/reports/inventory` | 🚧 |
| [Reportes de transferencias](transferencias.md) | `/reports/transfers` | 🚧 |
| [Reportes de caja](caja.md) | `/reports/cash` | 🚧 |
| [Reportes de clientes](clientes.md) | `/reports/customers` | 🚧 |
| [Ventas diarias (reporte)](ventas-diarias.md) | `/reports/sales?report=daily-sales` | ✅ |
