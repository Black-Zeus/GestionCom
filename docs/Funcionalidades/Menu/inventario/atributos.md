# Atributos de productos

**Ruta:** `/inventory/products/attributes`  
**Permiso:** `PRODUCT_ATTRIBUTES_ACCESS` o `PRODUCT_ATTRIBUTES_MANAGE`  
**Componente:** `AdminProductAttributes`  
**Estado:** ✅ Implementado

## Misión

Definición de atributos de variante (ej: Talla, Color, Material) y sus valores posibles. Los atributos se asocian a productos para generar el árbol de variantes (SKUs individuales).

## Funcionalidades implementadas

- Listado de tipos de atributo con sus valores
- Creación y edición de atributo: nombre, tipo de dato, orden
- Gestión de valores por atributo (ej: S, M, L, XL para Talla)
- Activar / desactivar atributo y sus valores
