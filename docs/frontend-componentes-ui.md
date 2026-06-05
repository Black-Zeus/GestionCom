# Componentes UI reutilizables

## Regla general

Las nuevas secciones frontend deben reutilizar los componentes comunes existentes antes de crear controles propios. Esto mantiene coherencia visual, evita duplicacion y reduce regresiones entre mantenedores.

La composicion visual de mantenedores debe respetar la [guia visual de mantenedores](frontend-guia-visual-mantenedores.md).

Los iconos deben respetar la guia de [iconografia UI](frontend-iconografia-ui.md). Para una misma accion se debe reutilizar el mismo icono en todos los mantenedores.

Si una pagina contiene mas de un mantenedor interno, debe usar `ModuleTabs` para separar las vistas. No crear selectores de pestanas locales.

Todas las tablas de datos deben usar `DataTable` con `DataTablePagination` en el `footer`, salvo que se solicite expresamente que esa tabla no lleve paginador.

## Componentes vigentes

- `ModuleTabs`: pestanas para paginas con dos o mas mantenedores internos. Soporta icono, contador y estado deshabilitado.
- `DataTable`: tabla comun para listados de mantenedores. Usar columnas configurables con `sortable`, `sortValue`, `render`, `align` y `cellClassName`.
- `DataTablePagination`: paginacion comun para tablas con colecciones medianas o grandes.
- `FilterBar`: barra comun para busqueda, filtros y acciones de refrescar/limpiar.
- `KpiBar`: resumen superior de indicadores filtrables o informativos.
- `StatusBadge`: pill comun para estados persistentes como activo, inactivo, suspendido o informativo.
- `ActionButton`: boton primario para acciones principales como crear un registro.
- `RowActionButton`: boton iconografico para acciones por fila como editar, activar/desactivar o eliminar.
- `BottomActionBar`: barra inferior fija para pantallas de edicion/asignacion con cambios pendientes y acciones de guardar/cancelar.
- `SimpleFormContent`: formulario simple declarativo para contenido de mantenedores acotados. Debe montarse mediante `ModalManager`, no reemplazarlo.
- `ModalManager`: gestor unico para apertura de modales de formulario, confirmacion y contenido personalizado.
- `ModuleSpinner`: estado de carga para modulos y tablas.
- `PermissionMatrix`: matriz comun de permisos para usuarios/roles.

## Patrones por tipo de pantalla

Mantenedor simple:
- Encabezado con titulo y `ActionButton`.
- `KpiBar` si aporta lectura operacional.
- `FilterBar` para busqueda/filtros.
- `DataTable` para listado.
- `DataTablePagination` cuando el listado se pagina en cliente o servidor.
- `ModalManager` para alta/edicion si el formulario es acotado. Si se reutiliza un formulario generico, usar `SimpleFormContent` como `contentComponent`.

Mantenedor compuesto:
- Encabezado con accion contextual segun pestana activa.
- `ModuleTabs` inmediatamente bajo el bloque superior.
- Cada pestana debe reutilizar `DataTable`, `FilterBar`, `KpiBar` o formularios comunes segun aplique.

Pantallas de permisos/asignaciones:
- Usar `BottomActionBar` para guardar cambios acumulados.
- Usar componentes especificos ya existentes, como `PermissionMatrix`, antes de crear variantes.

## Ubicaciones

- `volumes/frontend/src/components/common/navigation/ModuleTabs.jsx`
- `volumes/frontend/src/components/common/data/DataTable.jsx`
- `volumes/frontend/src/components/common/data/DataTablePagination.jsx`
- `volumes/frontend/src/components/common/data/FilterBar.jsx`
- `volumes/frontend/src/components/common/data/KpiBar.jsx`
- `volumes/frontend/src/components/common/data/StatusBadge.jsx`
- `volumes/frontend/src/components/common/actions/ActionButton.jsx`
- `volumes/frontend/src/components/common/actions/BottomActionBar.jsx`
- `volumes/frontend/src/components/common/forms/SimpleFormContent.jsx`
- `volumes/frontend/src/components/ui/modal/index.jsx`
- `volumes/frontend/src/components/common/loading/ModuleSpinner.jsx`
- `volumes/frontend/src/components/common/permissions/PermissionMatrix.jsx`
