# Motivos de devolución

**Ruta:** `/documents/returns/reasons`  
**Permiso:** `SALES_MAINTAINERS_ACCESS` o `SALES_MAINTAINERS_MANAGE`  
**Componente:** `AdminReturnReasons`  
**Estado:** ✅ Implementado

## Misión

Catálogo de motivos de devolución y cambio. Define las causales válidas que pueden seleccionarse al iniciar un proceso de devolución, junto con las reglas operativas de cada causal.

## Funcionalidades implementadas

- Listado de motivos con estado y restricciones configuradas
- Creación y edición:
  - Nombre del motivo, descripción
  - Días máximos desde la venta
  - Flag: requiere aprobación
  - Flag: afecta stock
  - Flag: permite cambio / reembolso
- Activar / desactivar motivo

> El mismo contenido es accesible desde `/sales/promotions` tab `returns` dentro del módulo Ventas.
