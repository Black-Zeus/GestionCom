# Historial de impresiones

**Ruta:** `/admin/print/jobs`  
**Permiso:** `PRINT_TEMPLATES_ACCESS`  
**Componente:** `AdminPrintJobs`  
**Estado:** ✅ Implementado

## Misión

Registro de todos los trabajos de impresión térmica generados por el sistema. Permite consultar el estado de cada trabajo, ver el detalle del ticket enviado y relanzar reimpresiones.

## Funcionalidades implementadas

- Listado de trabajos con KPIs (total, completados, pendientes, fallidos)
- Filtros combinables:
  - Punto de venta
  - Estado (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`)
  - Tipo de ticket (`TICKET_VENTA`, `TICKET_CAMBIO`, `TICKET_PRUEBA`)
  - Rango de fechas (desde / hasta)
- Ver detalle del trabajo en modal de solo lectura
- Reimprimir ticket desde el historial (modal de confirmación con selección de punto de venta y tipo)

## Estados de un trabajo de impresión

| Estado | Descripción |
|--------|-------------|
| `PENDING` | En cola, esperando al agente |
| `PROCESSING` | El agente lo está procesando |
| `COMPLETED` | Impreso correctamente |
| `FAILED` | Error en la impresión |
| `CANCELLED` | Cancelado manualmente |

## Tabla en BD: `print_jobs`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `job_code` | `VARCHAR(36) UNIQUE` | UUID del trabajo |
| `sales_point_id` | `BIGINT FK` | Punto de venta destino |
| `cash_register_id` | `BIGINT FK` | Caja asociada (opcional) |
| `sale_document_id` | `BIGINT FK` | Documento de venta relacionado |
| `ticket_type` | `ENUM` | Tipo de ticket |
| `template_version` | `VARCHAR(20)` | Versión del template usada |
| `status` | `ENUM` | Estado actual del trabajo |
| `payload` | `JSON` | Datos del ticket al momento de la impresión |
| `error_message` | `TEXT` | Mensaje de error si falló |

## Endpoint de reimpresión

```
POST /print/jobs/reprint/{sale_document_id}
Body: { sales_point_id, ticket_type }
```
