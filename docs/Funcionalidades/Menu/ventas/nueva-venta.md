# Nueva venta

**Ruta:** `/sales/new`  
**Permiso:** `SALES_VISIBLE`  
**Componente:** `NewSale`  
**Estado:** ✅ Implementado

## Misión

Pantalla de emisión de documentos de venta. Permite seleccionar productos, aplicar descuentos, elegir el tipo de documento (boleta, factura, nota de venta), registrar datos del cliente y confirmar la operación derivando el cobro al módulo de Caja POS.

## Funcionalidades implementadas

- Búsqueda y selección de productos por código, nombre o código de barras
- Cálculo automático de subtotal, impuestos y total
- Selección de tipo de documento de venta
- Asociación de cliente (búsqueda o selección rápida)
- Aplicación de descuentos por línea o global
- Integración con lista de precios del cliente
- Generación de pre-venta para cobro posterior en caja
- Derivación directa al flujo de cobro POS
