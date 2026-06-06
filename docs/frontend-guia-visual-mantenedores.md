# Guia visual de mantenedores

## Objetivo

Esta guia define la composicion visual base para mantenedores y listados administrativos. La prioridad es que una persona pueda cambiar entre modulos sin reaprender patrones, iconos, tablas, filtros o estados.

Cuando exista duda entre una solucion local y esta guia, aplicar esta guia. Si una pantalla necesita una excepcion, debe quedar documentada en el componente o en la tarea.

## Estructura base

Todo mantenedor debe componerse en este orden:

1. Encabezado de pagina con titulo, descripcion breve y accion principal.
2. `KpiBar` cuando los indicadores aporten lectura operacional o filtrado rapido.
3. `ModuleTabs` si la pantalla contiene dos o mas mantenedores internos.
4. `FilterBar` inmediatamente antes de cada tabla visible.
5. `DataTable` para el listado.
6. `DataTablePagination` en el `footer` de toda tabla, salvo excepcion solicitada expresamente.
7. `ModalManager` para creacion/edicion acotada, o pagina completa cuando el formulario sea extenso.

No crear variantes locales de estos bloques si el componente comun cubre el caso.

## Tablas

Las tablas de datos deben usar siempre `DataTable`.

Columnas recomendadas:

- Primera columna: nombre funcional del registro. Puede mostrar un dato de negocio secundario debajo solo si no es codigo interno generado por backend.
- Columnas intermedias: atributos relevantes para comparar o filtrar.
- Columna `Estado`: obligatoria cuando el registro tenga estado activo/inactivo, suspendido, cerrado, bloqueado o equivalente.
- Columna `Actualizado`: usar cuando ayude a auditoria o revision operacional.
- Columna `Acciones`: ultima columna, alineada a la derecha, usando `RowActionButton`.
- La columna `Acciones` muestra maximo cuatro iconos por fila; si hay mas acciones, deben continuar en una segunda fila dentro de la misma celda.

Reglas:

- No usar tablas HTML manuales en paginas de mantenedores.
- No omitir paginacion por tener pocos registros; la paginacion mantiene consistencia visual y evita refactors posteriores.
- Si una tabla esta dentro de una pestana, cada pestana debe tener su propio `FilterBar` y su propio paginador.
- Las acciones por fila deben ser iconograficas y consistentes con la guia de iconografia.

## Filtros

Cada tabla visible debe tener `FilterBar`.

Composicion esperada:

- Busqueda textual al inicio.
- Filtros select para estado, tipo, categoria, bodega, rol u otra dimension primaria.
- Acciones al final: `Refrescar` con `RefreshCw` y `Limpiar` con `XCircle`.

Reglas:

- `Limpiar` debe resetear busqueda, filtros y pagina actual.
- `Refrescar` debe mantener el icono animado mientras carga.
- No dejar botones de refrescar separados fuera del `FilterBar` si la pantalla ya tiene barra de filtros.

## Badges de estado

El elemento visual que envuelve estados se llama `badge` o `pill de estado`.

La columna `Estado` debe usar `StatusBadge` cuando el estado sea una condicion persistente del registro. No debe mostrarse como texto plano en una tabla si otros mantenedores equivalentes usan badge.

Formato base del componente:

```jsx
<StatusBadge variant={item.is_active ? 'active' : 'inactive'}>
  {item.is_active ? 'Activo' : 'Inactivo'}
</StatusBadge>
```

Estados y colores:

| Estado | Estilo | Icono |
| --- | --- | --- |
| Activo / Abierto / Vigente | `bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300` | `CheckCircle2` cuando aporte claridad |
| Inactivo / Cerrado / Archivado | `bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300` | `XCircle` opcional |
| Suspendido / Bloqueado | `bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300` | `EyeOff` o icono especifico documentado |
| Error / Eliminado / Riesgo | `bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300` | `XCircle` o `Trash2` segun contexto |
| Informativo / Sistema | `bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300` | Icono de la entidad solo si aporta valor |

Reglas:

- Usar el mismo texto para el mismo estado en todos los mantenedores: `Activo`, `Inactivo`, `Suspendido`, etc.
- Evitar mezclar texto plano y badge en la columna `Estado`.
- No usar colores de alerta para estados normales.
- Si el badge representa tipo/categoria y no estado, puede usar azul/violeta/slate, pero debe mantener el mismo tamano y radio.

## Iconografia

La iconografia se rige por [frontend-iconografia-ui.md](frontend-iconografia-ui.md).

Resumen obligatorio:

- `RefreshCw`: refrescar.
- `XCircle`: limpiar filtros.
- `Pencil`: editar.
- `Trash2`: eliminar.
- `EyeOff`: desactivar/ocultar/suspender.
- `CheckCircle2`: activar en mantenedores generales.
- `ShieldCheck`: activar solo en acciones operacionales o sensibles.

## Modales y formularios

- Abrir modales con `ModalManager`.
- Usar `SimpleFormContent` solo como contenido reutilizable dentro de `ModalManager`.
- Los codigos generados por backend no se solicitan al crear.
- En modales de `view/edit` y en paginas `new/edit`, nunca se debe mostrar el codigo interno del registro, aunque sea `disabled/readOnly`.
- Los codigos internos pueden usarse en rutas cuando sean el parametro viable o menos costoso para resolver el registro sin exponer IDs numericos.
- Formularios con muchas secciones, relaciones o validaciones cruzadas deben pasar a pagina completa.

## Acciones

Accion principal:

- Debe estar en el encabezado.
- Usar `ActionButton`.
- Texto corto: `Nuevo`, `Nueva`, `Nuevo fondo`, `Nueva serie`.

Acciones por fila:

- Usar `RowActionButton`.
- Orden: editar primero, acciones especiales despues, eliminar antes del cambio de estado y cambio de estado siempre al final.
- No forzar acciones en una sola linea cuando superen cuatro iconos; `DataTable` debe permitir el salto de linea dentro de la celda.
- Si el cambio de estado tiene mas de dos opciones, debe abrir modal con selector de estados y una descripcion visible del estado seleccionado.
- Eliminar siempre usa variante visual de peligro.

## Revision antes de cerrar una pantalla

Antes de terminar un mantenedor, validar:

- Usa `KpiBar` si corresponde.
- Usa `ModuleTabs` si contiene mas de un mantenedor.
- Cada tabla usa `FilterBar`, `DataTable` y `DataTablePagination`.
- La columna `Estado` usa badge cuando corresponde.
- Las acciones usan `ActionButton` y `RowActionButton`.
- Los iconos coinciden con la guia.
- Los codigos internos generados no aparecen en formularios ni paginas de creacion/edicion.
- La pantalla no contiene tablas HTML manuales.
