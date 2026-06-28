# Templates de impresión térmica

**Ruta:** `/admin/print/templates`  
**Permiso:** `PRINT_TEMPLATES_ACCESS`  
**Componente:** `AdminPrintTemplates`  
**Estado:** ✅ Implementado

## Misión

Gestiona los templates que definen el formato de cada tipo de ticket térmico. El agente de impresión descarga el template activo automáticamente en su próximo ciclo.

## Tipos de ticket soportados

| Código | Descripción |
|--------|-------------|
| `TICKET_VENTA` | Ticket de venta al cliente |
| `TICKET_CAMBIO` | Ticket de cambio o devolución |
| `TICKET_PRUEBA` | Ticket de prueba para calibración |

## Funcionalidades implementadas

- Listado de templates con estado y versión
- Creación y edición de templates con vista previa en tiempo real
- Vista previa de ticket térmico (80 mm / 58 mm) con datos de muestra
- Activar / desactivar template (con confirmación modal)
- Versionado manual con botón "Incrementar patch" en edición
- Configuración por sección:

### Encabezado
| Campo | Descripción |
|-------|-------------|
| `show_logo` | Muestra logotipo de la empresa |
| `show_commercial_name` | Nombre comercial / razón social |
| `show_fantasy_name` | Nombre de fantasía |
| `show_rut` | RUT de la empresa |
| `show_date` | Fecha y hora de emisión |

### Cuerpo — Productos
| Campo | Descripción |
|-------|-------------|
| `show_unit_price` | Precio unitario por línea |
| `show_discount` | Descuento por línea (cuando aplica) |

### Pie — Totales
| Campo | Descripción |
|-------|-------------|
| `show_subtotal` | Subtotal neto |
| `show_tax` | IVA (19%) |
| `show_discounts` | Total descuentos aplicados |
| `show_total` | Total a pagar |
| `show_payment_method` | Método de pago utilizado |
| `show_change` | Vuelto entregado |
| `show_barcode` | Código de barras (con campo y tipo configurables) |
| `footer_message` | Mensaje libre al pie (máx. 200 caracteres) |

## Estructura del campo `content` (JSON)

```json
{
  "header": {
    "show_logo": false,
    "show_commercial_name": true,
    "show_fantasy_name": true,
    "show_rut": true,
    "show_date": true
  },
  "body": {
    "show_unit_price": false,
    "show_discount": true
  },
  "footer": {
    "show_subtotal": true,
    "show_tax": true,
    "show_discounts": true,
    "show_total": true,
    "show_payment_method": true,
    "show_change": true,
    "show_barcode": true,
    "barcode_field": "ticket_number",
    "barcode_type": "CODE128",
    "footer_message": "Guarda este ticket para cambios"
  }
}
```

## Tabla en BD: `print_templates`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `template_code` | `VARCHAR(50) UNIQUE` | Código del tipo de ticket |
| `template_name` | `VARCHAR(100)` | Nombre descriptivo |
| `version` | `VARCHAR(20)` | Versión semántica (ej. `1.0.3`) |
| `content` | `JSON` | Configuración de secciones |
| `paper_width_mm` | `INT` | Ancho de papel: 58 o 80 |
| `is_active` | `BOOLEAN` | Solo un template activo por código se usa en producción |

## Notas

- El agente de impresión descarga el template activo en su próximo ciclo de sincronización.
- Al editar, se recomienda incrementar la versión para que el agente detecte el cambio.
- Desactivar un template no borra los trabajos de impresión ya generados con él.
