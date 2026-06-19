# Categorías de productos

**Ruta:** `/inventory/products/categories`  
**Permiso:** `CATEGORIES_ACCESS` o `PRODUCT_CATEGORIES_MANAGE`  
**Componente:** `AdminProductCategories`  
**Estado:** ✅ Implementado

## Misión

Gestión del árbol de categorías que clasifica el catálogo de productos. Soporta jerarquía de categorías (padre/hijo) para organización y filtrado en búsquedas.

## Funcionalidades implementadas

- Listado de categorías con indicador de nivel jerárquico
- Creación y edición: nombre, descripción, categoría padre
- Activar / desactivar categoría
- Eliminación con validación de productos asociados
