# Módulo: Ventas

**Ruta raíz:** `/sales/*`  
**Permiso de visibilidad:** `SALES_VISIBLE`  
**Estado:** ✅ Implementado

## Descripción

Módulo central de operación comercial. Centraliza el flujo de venta desde la emisión de documentos en punto de venta hasta la gestión de pre-ventas pendientes, consulta de precios y procesamiento de cambios y devoluciones.

## Ítems del módulo

| Nombre | Ruta | Estado |
|--------|------|--------|
| [Nueva venta](nueva-venta.md) | `/sales/new` | ✅ |
| [Consulta de precio](consulta-precio.md) | `/sales/price-query` | ✅ |
| [Mantenedor de Promociones](promociones.md) | `/sales/promotions` | ✅ |
| [Pre-ventas pendientes](pre-ventas.md) | `/sales/history` | ✅ |
| [Cambio y devoluciones](cambios-devoluciones.md) | `/sales/returns` | ✅ |
