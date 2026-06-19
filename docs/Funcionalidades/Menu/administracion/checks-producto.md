# Checks de producto

**Ruta:** `/admin/product-flags`  
**Permiso:** `PRODUCT_FLAG_SETTINGS_ACCESS` / `PRODUCT_FLAG_SETTINGS_MANAGE` / `FOUNDATION_MAINTAINERS_MANAGE`  
**Componente:** `AdminProductFlagSettings`  
**Estado:** ✅ Implementado

## Misión

Configuración de los flags de comportamiento de productos (checks). Permite definir qué indicadores booleanos están disponibles para ser activados en un producto (ej: "requiere serie", "producto perecible", "venta restringida").

## Funcionalidades implementadas

- Listado de flags configurables con nombre, descripción y estado
- Creación y edición de flag: nombre, código, descripción, tipo
- Activar / desactivar flag
- Los flags activos aparecen en el formulario de edición de producto
