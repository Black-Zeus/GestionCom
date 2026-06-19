# Consulta de precio

**Ruta:** `/sales/price-query`  
**Permiso:** `PRICE_LISTS_ACCESS` o `PRICE_LISTS_MANAGE`  
**Componente:** `SalesPriceQuery`  
**Estado:** ✅ Implementado

## Misión

Herramienta de consulta de precios sin generar documentos. Permite al vendedor o cajero verificar el precio vigente de un producto para un cliente específico o lista de precio, considerando promociones activas y reglas de descuento.

## Funcionalidades implementadas

- Búsqueda de producto por código, nombre o código de barras
- Consulta de precio según lista de precios asociada al cliente
- Visualización de precio base y precio con descuento aplicado
- Indicación de promociones vigentes que aplican al producto
- Comparativa de precios entre listas disponibles
