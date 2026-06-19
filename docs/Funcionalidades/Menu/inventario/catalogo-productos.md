# Catálogo de productos

**Ruta:** `/inventory/products`  
**Permiso:** `PRODUCTS_ACCESS` o `PRODUCTS_MANAGE`  
**Componente:** `AdminProducts`  
**Estado:** ✅ Implementado

## Misión

Mantenedor maestro del catálogo de productos. Es el núcleo del módulo de inventario: define cada producto con sus variantes (talla, color, atributos), SKUs, unidades de medida, fotografías y configuración de stock.

## Funcionalidades implementadas

- Listado con filtros por categoría, estado, marca y búsqueda textual
- KPI bar: total de productos, activos, inactivos, sin stock
- Creación y edición de producto con:
  - Código interno, nombre, descripción
  - Categoría, marca y modelo
  - Atributos y variantes (talla, color, etc.)
  - Unidades de compra, venta e inventario
  - Precio de costo y precio de venta base
  - Configuración de impuestos
  - Flag de producto activo / suspendido
- Gestión de media (imágenes del producto)
- Visualización de stock actual por bodega
- Acceso directo a códigos de barra, unidades y atributos desde la fila
- Checks de producto configurables (flags de comportamiento)
