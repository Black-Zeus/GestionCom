# Configuración de caja POS

**Ruta:** `/admin/cash/pos`  
**Permiso:** `CASH_POS_ADMIN_ACCESS` o `CASH_SETTINGS_MANAGE`  
**Componente:** `AdminCashPos`  
**Estado:** ✅ Implementado

## Misión

Configuración operativa de las cajas POS del sistema. Define los parámetros de comportamiento de cada caja: tipos de documentos habilitados, métodos de pago permitidos, impresora asignada y otras opciones operativas.

## Funcionalidades implementadas

- Listado de cajas POS configuradas por sucursal
- Creación y edición de configuración de caja:
  - Nombre de la caja, sucursal asociada
  - Tipos de documentos habilitados en esa caja
  - Métodos de pago permitidos
  - Impresora térmica configurada
- Activar / desactivar caja POS
