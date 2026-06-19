# Stock crítico y reposición

**Ruta:** `/inventory/stock/critical`  
**Permiso:** `INVENTORY_MAINTAINERS_ACCESS` o `INVENTORY_MAINTAINERS_MANAGE`  
**Componente:** `AdminStockCriticalConfig` → `InventoryMaintainers`  
**Estado:** ✅ Implementado

## Misión

Configuración de umbrales de stock crítico y parámetros de reposición automática por producto y bodega. Permite definir cuándo un producto necesita reposición y en qué cantidad, vinculado al sistema de alertas de inventario.

## Funcionalidades implementadas

- Configuración de stock mínimo, máximo y de seguridad por producto/bodega
- Punto de reorden configurable
- Lead time (días de entrega del proveedor)
- Flag de alerta habilitada por producto
- Indicador visual de productos actualmente bajo stock crítico

## Sub-navegación (tabs)

| Tab | Descripción | Detalle |
|-----|-------------|---------|
| Zonas | Zonas dentro de las bodegas | [→](stock-critico_tab_zonas.md) |
| Ubicaciones | Locaciones físicas dentro de cada zona | [→](stock-critico_tab_ubicaciones.md) |
| Stock crítico | Configuración de umbrales por producto | — (tab principal) |
