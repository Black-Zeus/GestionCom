# Tab: Estados del sistema

**Pertenece a:** [Parámetros del sistema](parametros-sistema.md)  
**Ruta:** `/config/system-parameters` (tab activo: `statuses`)  
**Estado:** ✅ Implementado

## Misión

Catálogo central de estados utilizados en todo el sistema. Cada estado pertenece a un grupo funcional (ej: `sale_document`, `transfer`, `petty_cash_request`) y tiene un código interno, nombre visible, color de badge e ícono.

## Funcionalidades implementadas

- Listado completo de estados con grupo, código, nombre visible, color, ícono y orden
- Creación de estado: grupo, código, nombre interno, nombre visible, color, ícono
- Edición de estado
- Reordenamiento por campo `sort_order`
- Activar / desactivar estado
