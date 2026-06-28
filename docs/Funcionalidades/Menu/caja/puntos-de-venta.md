# Puntos de venta

**Ruta:** `/cash/sales-points`  
**Permiso:** `SALES_POINTS_ACCESS` o `SALES_POINTS_MANAGE`  
**Componente:** `AdminSalesPoints`  
**Estado:** ✅ Implementado

## Misión

Mantenedor de los puntos de venta (sucursales/tiendas) habilitados en el sistema. Define qué sucursales pueden operar cajas y bajo qué configuración.

## Funcionalidades implementadas

- Listado de puntos de venta con estado activo/inactivo
- Creación y edición de punto de venta
- Asociación a sucursal/bodega
- Activar / desactivar punto de venta (con confirmación modal)
- Configuración de impresora térmica:
  - Toggle "Posee impresora"
  - Selección de ancho de papel: **58 mm** o **80 mm** (campo `printer_paper_width_mm`)
  - Generación y regeneración de clave de autorización del agente (`printer_api_key`, formato `XXXX-XXXX-XXXX-XXXX`)
  - Copia al portapapeles de la clave

## Campos del modelo `sales_points` (relevantes para impresión)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `has_printer` | `BOOLEAN` | Indica si el punto tiene impresora térmica vinculada |
| `printer_paper_width_mm` | `INT DEFAULT 80` | Ancho de papel de la impresora (58 o 80 mm) |
| `printer_api_key` | `VARCHAR(19)` | Clave de autorización del agente (`XXXX-XXXX-XXXX-XXXX`) |

## Notas

- El campo `printer_paper_width_mm` se usa para que el agente sepa qué template descargar según el ancho real del rollo instalado.
- La clave `printer_api_key` se genera desde el backend al pulsar "Generar clave". Al regenerar, la clave anterior queda inválida de inmediato.
- En modo creación, la clave solo se puede generar después de guardar el punto de venta.
