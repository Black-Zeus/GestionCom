# Códigos de barra de productos

**Ruta:** `/inventory/products/barcodes`  
**Permiso:** `PRODUCT_BARCODES_ACCESS` o `PRODUCT_BARCODES_MANAGE`  
**Componente:** `AdminProductBarcodes` → `ProductBarcodeMaintainers`  
**Estado:** ✅ Implementado

## Misión

Gestión de los códigos de barra asociados a cada variante o unidad comercial de un producto. Soporta múltiples códigos por SKU (EAN-13, UPC, código interno, etc.).

## Funcionalidades implementadas

- Listado de códigos filtrado por producto/SKU
- Creación y edición de código: tipo, valor, flag principal
- Activar / desactivar código de barra
- Validación de unicidad del código
