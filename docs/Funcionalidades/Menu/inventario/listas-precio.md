# Listas de precios

**Ruta:** `/inventory/pricing/price-lists`  
**Permiso:** `PRICE_LISTS_ACCESS` o `PRICE_LISTS_MANAGE`  
**Componente:** `AdminPriceLists`  
**Estado:** ✅ Implementado

## Misión

Gestión de listas de precios diferenciadas por segmento de cliente. Cada lista define precios de venta alternativos al precio base, aplicables a grupos de clientes específicos (mayorista, minorista, VIP, etc.).

## Funcionalidades implementadas

- Listado de listas de precios con tipo y estado
- Creación y edición de lista: nombre, tipo, moneda
- Asignación de precios por producto dentro de la lista
- Grupos de listas de precios (para asignación masiva a clientes)
- Activar / desactivar lista de precios
