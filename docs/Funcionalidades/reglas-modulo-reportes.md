# Reglas para construir módulos de reporte

Documento de referencia para el equipo. Define las convenciones técnicas y de diseño que deben seguirse al crear o extender cualquier reporte del módulo de gestión.

Los reportes canónicos actuales son:

- `DailySales.jsx`: ventas diarias.
- `ReturnsExchangesReport.jsx`: cambios y devoluciones.
- `CategorySales.jsx`: ventas por categoría o marca.
- `ReportLayout.jsx`: layout común para reportes.

---

## 1. Estructura de archivos

| Capa | Ubicación | Ejemplo |
|---|---|---|
| Página React | `frontend/src/pages/reports/<NombreReporte>.jsx` | `DailySales.jsx` |
| Layout común | `frontend/src/components/common/navigation/ReportLayout.jsx` | `ReportLayout.jsx` |
| Endpoint datos | `backend-api/routes/reports.py` | `GET /reports/daily-sales/data` |
| Endpoint PDF | `backend-api/routes/reports.py` | `POST /reports/daily-sales/pdf` |
| Template HTML PDF | `backend-api/templates/reports/<nombre>.html` | `daily_sales.html` |
| Partials PDF | `backend-api/templates/reports/partials/` | `_cover.html`, `_page_header.html`, `_styles.html` |
| Doc funcional | `docs/Funcionalidades/Menu/reportes-gestion/<nombre>.md` | `ventas-diarias.md` |

---

## 2. Frontend

### 2.1 Uso obligatorio de `ReportLayout`

Toda página de reporte debe usar `ReportLayout` como componente raíz.

```jsx
<ReportLayout
  title="Ventas diarias"
  description="15-06-2026 - 21-06-2026 · 7 días"
  actions={[
    { id: 'back', label: 'Volver', icon: ArrowLeft, variant: 'neutral', onClick: () => navigate(pathname) },
  ]}
  filterBar={...}
  filterBarActions={...}
  filterBarTrailing={...}
  onRunReport={() => fetchData(filters)}
  runReportLoading={loading}
  kpiItems={...}
  charts={...}
  viewMode={viewMode}
  onViewModeChange={handleViewModeChange}
  onExportPdf={handlePdfExport}
  onExportCsv={handleCsvExport}
  onExportExcel={handleXlsxExport}
>
  {/* tabla de datos */}
</ReportLayout>
```

### 2.2 Barra de filtros

La barra de filtros se divide en dos filas con responsabilidades fijas.

Fila default:

```text
Locación | shortcuts Fechas | Date Picker | Limpiar | Ejecutar reporte
```

Reglas de la fila default:

- `Locación`, shortcuts de fecha y `DatePicker` van en `filterBar`.
- `Limpiar` va en `filterBarActions`.
- `Ejecutar reporte` se declara con `onRunReport` y debe quedar alineado a la derecha.
- Esta fila existe en todos los reportes.

Fila 2:

```text
Controles/filtros propios del reporte
```

Reglas de la fila 2:

- Los filtros específicos de cada reporte van en `filterBarTrailing`.
- Ejemplos: tipo de documento, estado, familia, vendedor, categoría, canal, etc.
- `Limpiar` no va en esta fila.
- Si el reporte no tiene filtros propios, esta fila no se renderiza.

### 2.3 Ejecución manual

Los controles de filtro no deben autoejecutar el reporte.

Reglas:

- Cambiar locación, rango de fecha o filtros propios solo actualiza `filters`.
- El reporte se ejecuta únicamente al pulsar `Ejecutar reporte`.
- Mantener dos estados:
  - `filters`: valores visibles/editables en la barra.
  - `executedFilters`: últimos filtros realmente ejecutados.
- KPIs, gráficos, tabla y exportaciones deben describir y exportar `executedFilters`, no filtros pendientes.
- El botón debe mostrar estado de carga con `runReportLoading`.

Ejemplo:

```js
const [filters, setFilters] = useState(() => defaultFilters(activeWarehouse));
const [executedFilters, setExecutedFilters] = useState(() => defaultFilters(activeWarehouse));

const fetchData = async (nextFilters = filters) => {
  const { data } = await apiClient.get('/reports/daily-sales/data', { params });
  setRows(data.rows || []);
  setExecutedFilters(resolvedFilters);
};
```

### 2.4 Defaults de fecha y locación

Al acceder a un reporte:

- El rango por defecto debe ser `Esta semana`.
- `dateFrom` debe ser el lunes de la semana actual.
- `dateTo` debe ser hoy.
- La lista de locaciones debe incluir todas las locaciones a las que el usuario tiene acceso.
- La locación seleccionada por defecto debe ser solo la locación activa del usuario conectado.

La fuente de locaciones autorizadas en frontend es `useSessionStore`.

```js
const activeLocationRecord = useSessionStore((state) => state.getActiveLocation());
const locations = useSessionStore((state) => state.locations);
```

La opción `Todas las sucursales` o `Todas las locaciones` debe seleccionar todas las locaciones autorizadas del usuario, no todas las locaciones globales del sistema.

### 2.5 Locación multiselect

El control de locación debe ser `AutocompleteSelect` en modo `multiple`.

Reglas:

- Debe permitir seleccionar más de una locación.
- Debe incluir una opción `Todas...`.
- Al seleccionar `Todas...`, se deben marcar todas las opciones autorizadas del usuario.
- Si un usuario tiene 2 locaciones, `Todas...` significa esas 2.
- Si tiene 5 locaciones, `Todas...` significa esas 5.
- No debe depender de una lista parcial devuelta por el endpoint del reporte si esa lista excluye locaciones válidas del usuario.

### 2.6 Rangos rápidos

Orden estándar:

| id | Label | Lógica |
|---|---|---|
| `today` | Hoy | Solo hoy |
| `week` | Esta semana | Desde lunes hasta hoy |
| `7d` | 7 días | Últimos 7 días incluyendo hoy |
| `15d` | 15 días | Últimos 15 días incluyendo hoy |
| `30d` | 30 días | Últimos 30 días incluyendo hoy |
| `60d` | 60 días | Últimos 60 días incluyendo hoy |
| `90d` | 90 días | Últimos 90 días incluyendo hoy |

`Por día` nunca debe mostrar un mes completo si el rango seleccionado no es mensual. Debe listar solo los días del rango ejecutado.

### 2.7 Toggle de vista (obligatorio)

**Todo reporte debe incluir el toggle de vista.** No existe reporte sin él.

El toggle se declara con `viewMode`, `onViewModeChange` y `viewModeOptions` en `ReportLayout`.

Reglas de posicionamiento:

- Se renderiza en la cabecera de la tabla de datos, junto a los botones de exportación.
- No pertenece a la barra de filtros.

#### Opciones según el tipo de reporte

| Tipo de reporte | opción 1 (id) | opción 2 (id) |
|---|---|---|
| Serie temporal (ventas por período) | `detail` → Detalle | `grouped` → Por día |
| Agrupado por dimensión (categoría, marca, cliente…) | `detail` → Detalle | `grouped` → Por [dimensión] |

El label de la opción agrupada debe reflejar la dimensión real del reporte (`Por día`, `Por categoría`, `Por marca`, etc.), no siempre `Por día`.

#### Vista `Detalle`

- Lista registros individuales sin agrupar (una fila por documento o por línea de venta, según el reporte).
- Debe incluir columna `Acciones` cuando exista navegación o modal de detalle.
- La acción de ver debe reutilizar modales existentes del sistema, por ejemplo `SaleDetailModal`.

#### Vista agrupada (`Por día` / `Por categoría` / etc.)

- Agrupa los registros según la dimensión principal del reporte.
- Cuando la dimensión es temporal:
  - Debe incluir todos los días del rango, aunque no existan movimientos.
  - Los días sin movimiento deben mostrar cero según el tipo de columna.
  - El orden debe ser ascendente: fecha más antigua a fecha más nueva.
- Cuando la dimensión no es temporal (categoría, marca…):
  - El orden debe ser por monto total descendente.
  - Puede omitir filas sin movimiento (no tiene sentido mostrar categorías con cero ventas).

### 2.8 Header y acciones

En el header del módulo:

- Debe existir `Volver`.
- No debe existir botón `Actualizar`.
- No debe ubicarse PDF en el header.

Exportaciones:

- PDF, CSV y Excel deben estar agrupados en la cabecera de la tabla de datos.
- `ReportLayout` gestiona los botones y el modal de exportación.

### 2.9 Exportaciones CSV, Excel y PDF

Las exportaciones deben respetar la vista seleccionada:

- Si `viewMode === 'detail'`, exportar el detalle individual (sin agrupación).
- Si `viewMode === 'grouped'`, exportar datos agrupados según la dimensión principal del reporte (día, categoría, marca, etc.).

CSV y Excel:

- Deben incluir una sección superior de parámetros de filtrado antes de la tabla.
- Parámetros mínimos:
  - Reporte.
  - Periodo.
  - Locación o sucursal.
  - Moneda.
  - Vista.
  - Generado el.
- Si el reporte tiene filtros propios, agregarlos también.

PDF:

- Debe recibir `view_mode`.
- Debe respetar la agrupación seleccionada.
- Debe incluir la moneda en portada en una línea separada.
- No debe mostrar un ID visual de reporte si no es trazable en backend.
- Si se generan páginas dinámicas con partials, resolver `{{> _page_header}}` y `{{> _page_footer}}` antes de inyectarlas al template principal.

### 2.10 Moneda

Toda exportación debe mostrar nombre y código de moneda.

Formato estándar:

```text
Peso chileno (CLP)
```

Ejemplos:

- `Total Peso chileno (CLP)`
- `Ticket prom. Peso chileno (CLP)`
- Portada PDF: label `Moneda` y valor `Peso chileno (CLP)` en línea separada.

### 2.11 API desde frontend

- Nunca usar `fetch` nativo para endpoints autenticados, salvo conversión local de `dataURI` a `Blob`.
- Usar siempre `apiClient`.

```js
const { data } = await apiClient.get('/reports/daily-sales/data', { params });
```

---

## 3. Backend

### 3.1 Endpoint de datos

Los endpoints de datos deben:

- Recibir `date_from` y `date_to`.
- Aceptar una locación (`warehouse_id`) o múltiples locaciones (`warehouse_ids` separado por coma).
- Validar y normalizar fechas.
- Retornar datos reales desde BD, nunca mock.
- Retornar filas suficientes para:
  - KPIs.
  - Gráficos.
  - Tabla agrupada.
  - Tabla detalle, si aplica.

Ejemplo:

```python
@router.get("/daily-sales/data", response_class=JSONResponse)
async def daily_sales_data(
    date_from: date = Query(...),
    date_to: date = Query(...),
    warehouse_id: int | None = Query(None),
    warehouse_ids: str | None = Query(None),
    user: dict = Depends(get_current_user),
):
    selected_warehouse_ids = _parse_id_list(warehouse_ids) or ([warehouse_id] if warehouse_id else [])
```

### 3.2 Filtros de locación

Usar helpers estructurados para listas de IDs, no interpolar strings manualmente.

```python
selected_warehouse_ids = _parse_id_list(warehouse_ids)
params = {"date_from": date_from, "date_to": date_to}
warehouse_filters = []
_append_in_filter(warehouse_filters, params, "sd.warehouse_id", selected_warehouse_ids, "warehouse_id")
warehouse_clause = f"AND {' AND '.join(warehouse_filters)}" if warehouse_filters else ""
```

### 3.3 Endpoint PDF

Los endpoints PDF deben:

- Ser `POST`.
- Recibir gráficos como `UploadFile` cuando aplique.
- Recibir `view_mode`.
- Recibir locaciones como `all` o lista separada por coma.
- Construir contexto desde BD real.
- Enviar HTML final a Gotenberg.

### 3.4 Detalle y agrupación

Si un reporte soporta detalle y agrupación:

- El endpoint debe proveer datos para ambas vistas o el builder PDF debe poder construir ambas.
- El detalle debe ordenarse por fecha ascendente.
- La agrupación por día debe crear todos los días del rango, aunque no existan movimientos.
- Los totales de agrupación deben usar cero cuando no haya datos.

### 3.5 Pagos mixtos

Cuando `payment_details` contenga pagos mixtos (`MIXED`), el backend debe descomponer cada medio de pago y acumular montos por método.

```python
details = _payment_details(r.get("payment_details"))
if isinstance(details, dict) and str(details.get("type") or "").upper() == "MIXED":
    for p in (details.get("payments") or []):
        _add(p.get("payment_method_code"), p.get("payment_method_name"), _payment_amount(p))
else:
    received = _money(r.get("amount_tendered") or r.get("total_amount")) - _money(r.get("change_amount"))
    _add(r.get("payment_method_code"), r.get("payment_method_name"), received)
```

---

## 4. Template PDF

### 4.1 Estructura

Cada `<section class="report-page">` representa una página A4.

Estructura recomendada:

| Página | Contenido |
|---|---|
| Portada | `{{> _cover}}` |
| 1 | Resumen ejecutivo, metadata, KPIs |
| 2 | Gráficos exportados desde UI, si aplica |
| 3...N | Detalle o agrupación según `view_mode` |

### 4.2 Partials

Los templates usan:

- `{{> _styles}}`
- `{{> _cover}}`
- `{{> _page_header}}`
- `{{> _page_footer}}`

Regla importante:

- Si una página se genera como string dinámico en Python y luego se inserta en `{{CHART_PAGE}}` o `{{DETAIL_PAGES}}`, sus partials deben resolverse antes de inyectarla.

### 4.3 Portada

La portada debe mostrar:

- Título.
- Subtítulo.
- Periodo.
- Locación o sucursal.
- Moneda en línea separada: `Peso chileno (CLP)`.

No mostrar IDs visuales de reporte si no existe trazabilidad real en backend.

### 4.4 Variables

Todas las variables se sustituyen con `{{VAR}}`. No agregar lógica condicional compleja al HTML; la lógica vive en Python.

---

## 5. Convenciones generales

- Sin datos mock en producción.
- `REPORT_STATUS` debe ser `"INFORME"`.
- Los gráficos deben derivarse de datos reales de API.
- No hardcodear métodos de pago, sucursales ni categorías si pueden venir de datos.
- CSV, Excel y PDF deben usar los últimos filtros ejecutados.
- `Limpiar` debe restaurar defaults: `Esta semana` y locación activa.
- La tabla y las exportaciones deben mantener orden por fecha ascendente cuando la vista sea temporal.
- Los helpers compartidos de `reports.py` no deben duplicarse por reporte.
