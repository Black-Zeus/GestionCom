# Módulo: Inventario

**Ruta raíz:** `/inventory/*`  
**Permiso de visibilidad:** `INVENTORY_VISIBLE`  
**Estado:** ✅ Implementado

## Descripción

Módulo de gestión de inventario y stock. Centraliza el catálogo de productos y sus variantes, la administración de bodegas, el control de stock (movimientos, ajustes, transferencias, inventario físico) y las listas de precios.

## Ítems del módulo

| Nombre | Ruta | Estado | Detalle |
|--------|------|--------|---------|
| Catálogo de productos | `/inventory/products` | ✅ | [→](catalogo-productos.md) |
| Categorías de productos | `/inventory/products/categories` | ✅ | [→](categorias.md) |
| Atributos de productos | `/inventory/products/attributes` | ✅ | [→](atributos.md) |
| Marcas y modelos | `/inventory/products/brands-models` | ✅ | [→](marcas-modelos.md) |
| Unidades por producto | `/inventory/products/units` | ✅ | [→](unidades-producto.md) |
| Códigos de barra | `/inventory/products/barcodes` | ✅ | [→](codigos-barra.md) |
| Administración de bodegas | `/inventory/warehouses` | ✅ | [→](bodegas.md) |
| Stock crítico y reposición | `/inventory/stock/critical` | ✅ | [→](stock-critico.md) |
| Movimientos de stock | `/inventory/stock/movements` | ✅ | [→](movimientos-stock.md) |
| Conversión de stock | `/inventory/stock/conversions` | ✅ | [→](conversion-stock.md) |
| Inventario físico | `/inventory/stock/physical` | ✅ | [→](inventario-fisico.md) |
| Ajustes de inventario | `/inventory/stock/adjustments` | 🚧 | [→](ajustes-inventario.md) |
| Transferencias de stock | `/inventory/stock/transfers` | ✅ | [→](transferencias.md) |
| Control de tracking | `/inventory/stock/tracking-reports` | ✅ | [→](tracking.md) |
| Listas de precios | `/inventory/pricing/price-lists` | ✅ | [→](listas-precio.md) |
