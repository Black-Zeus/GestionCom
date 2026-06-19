# Cambio y devoluciones

**Ruta:** `/sales/returns`  
**Permiso:** `RETURNS_ACCESS`  
**Componente:** `SalesReturns`  
**Estado:** ✅ Implementado

## Misión

Gestión del proceso post-venta de cambios y devoluciones. Permite buscar la venta original, seleccionar los productos a devolver o cambiar, aplicar el motivo correspondiente y registrar el resultado (reembolso, nota de crédito o cambio de mercadería).

## Funcionalidades implementadas

- Búsqueda de venta original por código de documento, fecha o cliente
- Selección de líneas/productos a incluir en la devolución o cambio
- Selección de motivo de devolución (catálogo configurable)
- Flujo diferenciado: cambio de producto vs. reembolso vs. nota de crédito
- Validación de plazo máximo según motivo
- Registro del documento de devolución (nota de crédito)
- Indicador de aprobación pendiente cuando el motivo lo requiere
