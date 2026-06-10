# Plan de implementacion - checks de producto

Fecha de revision: 2026-06-09

## Resumen ejecutivo

Los checks del modal de producto no estan todos al mismo nivel funcional.

| Check | Estado | Diagnostico |
| --- | --- | --- |
| Activo | Operativo | Se guarda en producto/variante y las opciones de inventario filtran `p.is_active = TRUE` y `pv.is_active = TRUE`. |
| Usa variantes | Operativo | El maestro permite activar variantes y la UI habilita el flujo de SKU/variaciones. |
| Controla ubicacion | Operativo | Movimientos, transferencias, inventario fisico y putaway exigen ubicacion cuando el producto lo requiere. Se agrego reporteria de saneamiento para detectar stock historico sin ubicacion. |
| Controla lotes | Operativo | Movimientos, transferencias e inventario fisico exigen lote cuando corresponde y separan stock por lote. Se agrego reporte de lotes/vencimientos. Compras queda fuera del alcance actual. |
| Controla vencimiento | Operativo | Se exige lote y fecha de vencimiento en movimientos, transferencias e inventario fisico. Se agrego reporte operacional, emision manual y scheduler automatico de alertas de vencimiento. |
| Controla seriales | Operativo base | El flag se exige en movimientos manuales, transferencias e inventario fisico; el stock queda separado por serial y la UI muestra/captura el campo condicional. Compras queda fuera del alcance actual. |

## Evidencia revisada

- `scripts/mariadb/entrypoint/20260603_1303_schema_products.sql` define los flags `has_variants`, `is_active`, `has_batch_control`, `has_expiry_date`, `has_serial_numbers` y `has_location_tracking`.
- `volumes/frontend/src/pages/admin/AdminProducts.jsx` muestra y guarda los 6 checks en el formulario de producto.
- `volumes/backend-api/utils/inventory_tracking.py` valida ubicacion, lote, vencimiento y serial segun el producto.
- `volumes/backend-api/routes/stock_movements.py` usa `validate_tracking_dimensions`, graba ubicacion/lote/vencimiento en `stock` y `stock_movements`, y lista solo SKU activos.
- `volumes/backend-api/routes/stock_transfers.py` usa ubicacion/lote/vencimiento en disponibilidad, item, despacho, recepcion y ubicacion final.
- `volumes/backend-api/routes/physical_inventory.py` usa ubicacion/lote/vencimiento/serial para agregar/generar/contabilizar items.
- `volumes/frontend/src/pages/admin/AdminStockMovements.jsx`, `AdminStockTransfers.jsx` y `AdminPhysicalInventory.jsx` muestran campos condicionales para ubicacion/lote/vencimiento/serial.
- `scripts/mariadb/entrypoint/20260609_120000_enable_serial_tracking_dimensions.sql` agrega serial como dimension de stock y transferencias.
- `volumes/backend-api/routes/stock_movements.py` expone reportes de stock con ubicacion faltante y lotes por vencer.
- `volumes/backend-api/routes/stock_movements.py` permite emitir alertas de vencimiento hacia el centro de notificaciones con deduplicacion diaria.
- `volumes/backend-api/services/inventory_expiry_scheduler.py` ejecuta automaticamente la emision de alertas de vencimiento.
- `volumes/frontend/src/pages/admin/AdminInventoryTrackingReports.jsx` agrega la vista operacional `Control de tracking` y el boton `Emitir alertas`.
- `volumes/backend-api/routes/business_foundation.py` refuerza variante default, desactivacion y eliminacion segura de productos/SKU.
- `volumes/frontend/src/pages/admin/AdminProductFlagSettings.jsx` agrega Administracion > Checks de producto para mostrar u ocultar los checks del maestro.
- `volumes/backend-api/utils/product_feature_flags.py` centraliza la visibilidad de checks y evita activar por API checks ocultos.

## Brechas principales

### 1. Seriales tienen control base implementado

Implementado:

- `validate_tracking_dimensions` recibe y exige `serial_number` si `has_serial_numbers = TRUE`.
- `stock` y `stock_transfer_items` tienen `serial_number`.
- Movimientos manuales, transferencias e inventario fisico capturan y muestran serial.
- La regla operativa queda como una linea de cantidad `1` por serial.

Pendiente:

1. Agregar pruebas automatizadas de API.
2. Definir si productos no serializados deben rechazar explicitamente un serial recibido por API o simplemente ignorarlo.

### 2. Ubicacion esta operativa, pero falta cerrar bordes

Implementado:

- Movimientos y transferencia de origen exigen ubicacion interna si el producto la controla.
- En putaway ya se exige ubicacion interna si el producto controla ubicacion.
- Recepcion usa ubicacion pendiente tecnica; esto esta bien, pero conviene documentarlo como excepcion del flujo.
- Se agrego el endpoint `GET /stock-movements/reports/location-gaps` para listar stock positivo de productos con `has_location_tracking = TRUE` y ubicacion nula.
- Se agrego la vista frontend `/stock/tracking-reports` para revisar esas brechas.

Pendiente:

1. Agregar migracion correctiva o script operativo para mover stock general a ubicacion default si existe data historica.
2. Documentar ubicacion pendiente de recepcion como ubicacion tecnica permitida.

### 3. Lotes y vencimiento requieren cierre de reporteria/alertas

Implementado:

- Backend y UI ya exigen lote/vencimiento en movimientos, transferencias e inventario fisico.
- Se agrego el endpoint `GET /stock-movements/reports/expiring-lots` con filtro de dias y opcion de incluir vencimiento faltante.
- Se agrego la vista frontend `/stock/tracking-reports` con KPIs de vencidos, por vencer y sin vencimiento.

Implementado tambien:

- Emision manual de alertas de vencimiento usando `INVENTORY_ALERT` y la bandeja de notificaciones.
- Scheduler automatico configurable con `INVENTORY_EXPIRY_ALERTS_ENABLED`, `INVENTORY_EXPIRY_ALERTS_INTERVAL_SECONDS`, `INVENTORY_EXPIRY_ALERTS_DAYS`, `INVENTORY_EXPIRY_ALERTS_INCLUDE_MISSING` e `INVENTORY_EXPIRY_ALERTS_LIMIT`.

Pendiente:

- Documentos no requiere extension por ahora, salvo que se habilite un flujo documental que genere movimientos de stock.

Implementacion propuesta:

1. Si se habilita un flujo documental con impacto de inventario, reutilizar `validate_tracking_dimensions` y `validate_serial_quantity`.

### 4. Activo y variantes estan operativos, pero conviene reforzar reglas

Implementado:

1. Si `has_variants = FALSE`, se asegura existencia de variante default activa para operar inventario.
2. Si se desactiva un producto, se bloquea si tiene stock positivo y se desactivan sus variantes.
3. Si se desactiva una variante con stock positivo, se bloquea.
4. Se evita eliminar producto/SKU con stock o movimientos historicos; se debe usar desactivacion.

## Orden sugerido de trabajo

### Fase 1 - Cerrar seriales

Estado: implementada base.

1. Backend: extender modelos de payload y validador de tracking con `serial_number`. Listo.
2. Backend: incorporar serial en `stock`, `stock_movements`, `stock_transfer_items` y consultas de disponibilidad. Listo.
3. Frontend: agregar campos condicionales y visualizacion de serial. Listo.
4. Pruebas: cubrir movimientos manuales, transferencias e inventario fisico. Pendiente automatizar.

### Fase 2 - Endurecer ubicacion

Estado: implementado bloqueo principal.

1. Exigir ubicacion final en putaway para productos con ubicacion. Listo.
2. Agregar reporte/saneamiento de stock con ubicacion faltante. Reporte listo; saneamiento historico pendiente si hay datos antiguos.
3. Documentar ubicacion pendiente de recepcion como ubicacion tecnica permitida. Pendiente.

### Fase 3 - Reporteria de lotes y vencimientos

1. Endpoint/listado de lotes por vencer. Listo.
2. Filtros y KPIs en frontend. Listo.
3. Alertas operativas por vencimiento. Emision manual y scheduler automatico listos.

### Fase 4 - Reglas de consistencia del maestro

1. Variante default para productos sin variantes. Listo.
2. Politica de desactivacion producto/variante. Listo.
3. Bloqueos de eliminacion cuando hay stock/movimientos. Listo.

## Criterios de aceptacion

- Administracion permite mostrar u ocultar los checks funcionales del maestro de productos.
- Los checks ocultos no aparecen en el formulario ni se pueden activar por API en productos nuevos o editados.
- Un producto con `Controla seriales` no puede ingresar, salir, transferirse ni contarse sin serial.
- Un producto serializado no permite cantidad distinta de `1` por serial, salvo que se implemente captura multiple explicita.
- Un producto con `Controla ubicacion` no puede quedar en ubicacion final nula fuera de ubicaciones tecnicas documentadas.
- Un producto con `Controla lotes` no puede mover stock sin lote.
- Un producto con `Controla vencimiento` no puede mover stock sin lote y fecha de vencimiento.
- Los listados muestran lote, vencimiento, serial y ubicacion cuando corresponda.
- Las operaciones solo ofrecen productos/SKU activos.
