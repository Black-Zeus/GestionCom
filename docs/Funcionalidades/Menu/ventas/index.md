# Módulo: Ventas

**Ruta raíz:** `/sales/*`  
**Permiso de visibilidad:** `SALES_VISIBLE`  
**Estado:** ✅ Implementado

## Descripción

Módulo central de operación comercial. Centraliza el flujo de venta desde la emisión de documentos en punto de venta hasta la gestión de pre-ventas pendientes, consulta de precios y procesamiento de cambios y devoluciones.

## Ítems del módulo

| Nombre | Ruta | Estado | Detalle |
|--------|------|--------|---------|
| Nueva venta | `/sales/new` | ✅ | [→](nueva-venta.md) |
| Consulta de precio | `/sales/price-query` | ✅ | [→](consulta-precio.md) |
| Mantenedor de Promociones | `/sales/promotions` | ✅ | [→](promociones.md) |
| Pre-ventas pendientes | `/sales/history` | ✅ | [→](pre-ventas.md) |
| Cambio y devoluciones | `/sales/returns` | ✅ | [→](cambios-devoluciones.md) |
