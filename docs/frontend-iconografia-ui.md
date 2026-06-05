# Iconografia UI

## Regla general

Los iconos deben ser coherentes por intencion de accion, no por gusto de cada pantalla. Antes de agregar un icono nuevo, revisar esta guia y reutilizar el mismo icono para la misma accion.

Usar iconos de `lucide-react` en botones, pestanas y acciones de fila. No mezclar iconos manuales/SVG locales si existe equivalente en la libreria.

Para composicion completa de mantenedores, tablas, filtros, paginacion y badges de estado, revisar tambien [frontend-guia-visual-mantenedores.md](frontend-guia-visual-mantenedores.md).

## Acciones globales

| Accion | Icono | Uso |
| --- | --- | --- |
| Crear / Nuevo | `Plus` | Boton principal de alta cuando el componente permite icono. |
| Refrescar | `RefreshCw` | Recargar datos o volver a consultar API. Si esta cargando, animar con `animate-spin`. |
| Limpiar filtros | `XCircle` | Resetear busqueda, filtros y pagina actual. No usar `EyeOff` para esta accion. |
| Guardar | `Save` | Persistir cambios acumulados o formularios principales. |
| Volver | `ArrowLeft` | Retornar a listado o vista anterior. |
| Buscar | `Search` | Input de busqueda o accion explicita de buscar. |

## Acciones por fila

| Accion | Icono | Uso |
| --- | --- | --- |
| Editar | `Pencil` | Abrir formulario de edicion. |
| Eliminar | `Trash2` | Eliminacion o soft delete. Usar variante visual de peligro. |
| Activar | `CheckCircle2` o `ShieldCheck` | Reactivar o habilitar un registro. Usar `CheckCircle2` en mantenedores generales y `ShieldCheck` solo cuando la accion sea operacional/sensible, como fondos o cajas. |
| Desactivar / ocultar | `EyeOff` | Deshabilitar visibilidad, acceso o estado activo. |
| Ver detalle | `Eye` | Abrir vista solo lectura o detalle. |

## Navegacion y secciones

| Seccion | Icono sugerido |
| --- | --- |
| Usuarios | `UserCog` / `UserCircle` |
| Roles / permisos | `ShieldCheck`, `KeyRound`, `Users` |
| Bodegas | `Building2` |
| Cajas POS / medios de pago | `CreditCard`, `Landmark` |
| Caja chica | `WalletCards`, `ReceiptText`, `Tags` |
| Categorias | `Tags` |
| Atributos de producto | `Layers3`, `ListChecks` |
| Tipos / series de documentos | `FileText`, `ClipboardList` |

## Revisiones esperadas

- `FilterBar` debe usar `RefreshCw` para refrescar y `XCircle` para limpiar filtros.
- `RowActionButton` debe mantener `Pencil`, `Trash2`, `EyeOff` y `CheckCircle2` de forma consistente.
- Si una accion no aparece en esta guia, documentarla antes de propagarla a varios modulos.
