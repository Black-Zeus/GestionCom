# Configuración de impuestos

**Ruta:** `/config/taxes`  
**Permiso:** `TAX_CONFIG_ACCESS` o `TAX_CONFIG_MANAGE`  
**Componente:** `AdminTaxConfig`  
**Estado:** ✅ Implementado

## Misión

Gestión del catálogo de impuestos aplicables a productos y documentos de venta (IVA, impuestos específicos, exenciones). Define la tasa, el código tributario y si el impuesto está incluido en el precio o se suma.

## Funcionalidades implementadas

- Listado de impuestos configurados con tasa y estado
- Creación y edición: nombre, código tributario, tasa (%), incluido en precio
- Activar / desactivar impuesto
