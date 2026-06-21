# Reglas para construir módulos de reporte

Documento de referencia para el equipo. Define las convenciones técnicas y de diseño que deben seguirse al crear o extender cualquier reporte en el módulo de gestión, tomando como ejemplo canónico el reporte **Ventas Diarias** (`DailySales`).

---

## 1. Estructura de archivos

| Capa | Ubicación | Ejemplo |
|---|---|---|
| Página (React) | `frontend/src/pages/reports/<NombreReporte>.jsx` | `DailySales.jsx` |
| Endpoint datos | `backend-api/routes/reports.py` | `GET /reports/daily-sales/data` |
| Endpoint PDF | `backend-api/routes/reports.py` | `POST /reports/daily-sales/pdf` |
| Template HTML | `backend-api/templates/reports/<nombre>.html` | `daily_sales.html` |
| Partials HTML | `backend-api/templates/reports/partials/` | `_page_header.html`, `_styles.html` |
| Doc funcional | `docs/Funcionalidades/Menu/reportes-gestion/<nombre>.md` | `ventas-diarias.md` |

---

## 2. Frontend — Página del reporte

### 2.1 Componente base obligatorio

Toda página de reporte debe usar `ReportLayout` como componente raíz:

```jsx
import ReportLayout from '@/components/common/navigation/ReportLayout';

<ReportLayout
  title="Ventas diarias"
  description="..."
  charts={[...]}        // mínimo 1, máximo ilimitado
  kpiItems={[...]}
  onExportPdf={...}
  onExportCsv={...}
  onExportExcel={...}
  ...
>
  {/* tabla de detalle */}
</ReportLayout>
```

### 2.2 Prop `charts`

- Es un array de objetos `{ title, subtitle?, icon?, content }`.
- **Mínimo siempre 1** gráfico.
- Cada gráfico ocupa el **100 % del ancho** (apilados verticalmente).
- El número de gráficos es libre: un reporte puede tener 1, otro puede tener 5.

```jsx
charts={[
  {
    title:   'Evolución de ventas por día',
    icon:    BarChart3,
    content: <ReactApexChart ... />,
  },
  {
    title:    'Desglose por método de pago',
    subtitle: 'Efectivo · Débito · Crédito',
    icon:     BarChart2,
    content:  <ReactApexChart ... />,
  },
]}
```

### 2.3 Llamadas a la API

- **Nunca** usar `fetch` nativo para endpoints autenticados.
- Usar siempre `apiClient` (axios con interceptor JWT):

```js
import apiClient from '@/services/api/apiClient';

const { data } = await apiClient.get('/reports/daily-sales/data', { params });
```

### 2.4 Filtros de fecha — rangos rápidos

La barra de filtros incluye botones de período rápido definidos en un array `PERIODS`. Cada entrada puede calcular la fecha de inicio de dos formas:

```js
// Forma A: N días hacia atrás desde hoy
{ id: '7d', label: '7 días', days: 7 }

// Forma B: función que calcula la fecha exacta de inicio
{ id: 'week', label: 'Esta semana', getFrom: getMondayISO }
```

`applyPeriod` resuelve cuál usar:

```js
const applyPeriod = (id) => {
  const p = PERIODS.find((x) => x.id === id);
  if (p) setFilters((f) => ({
    ...f,
    period:   id,
    dateFrom: p.getFrom ? p.getFrom() : periodFrom(p.days),
    dateTo:   toISO(new Date()),
  }));
};
```

Rangos estándar definidos (en este orden en la barra):

| id | Label | Lógica |
|---|---|---|
| `today` | Hoy | 1 día |
| `week` | Esta semana | Desde el lunes de la semana actual |
| `7d` | 7 días | Últimos 7 días |
| `15d` | 15 días | Últimos 15 días |
| `30d` | 30 días | Últimos 30 días |
| `60d` | 60 días | Últimos 60 días |
| `90d` | 90 días | Últimos 90 días |

### 2.5 Gráficos con ApexCharts

- El gráfico de área usa `id: 'daily-sales-area'` y el de barras `id: 'daily-sales-bar'`.
- El **menú de exportación** (PNG / CSV) debe habilitarse en **todos** los gráficos:

```js
toolbar: {
  show: true,
  tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false },
  export: {
    png: { filename: `nombre-grafico_${filters.dateFrom}_${filters.dateTo}` },
    csv: { filename: `nombre-grafico_${filters.dateFrom}_${filters.dateTo}` },
  },
},
```

- Las series son **dinámicas**, derivadas de los datos recibidos de la API. No hardcodear métodos de pago, sucursales ni categorías.

### 2.6 Exportación PDF desde el frontend

El PDF se genera enviando las imágenes de los gráficos al backend vía `multipart/form-data`:

```js
const [areaImg, barImg] = await Promise.all([
  ApexCharts.exec('daily-sales-area', 'dataURI'),
  ApexCharts.exec('daily-sales-bar',  'dataURI'),
]);
const toBlob = async (dataURI) => (await fetch(dataURI)).blob();

const formData = new FormData();
formData.append('date_from', filters.dateFrom);
formData.append('date_to',   filters.dateTo);
formData.append('branch',    filters.sucursal);
formData.append('chart_area', await toBlob(areaImg.imgURI), 'chart_area.png');
formData.append('chart_bar',  await toBlob(barImg.imgURI),  'chart_bar.png');

const { data: blob } = await apiClient.post('/reports/daily-sales/pdf', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  responseType: 'blob',
});
return URL.createObjectURL(blob);
```

---

## 3. Backend — Endpoints

### 3.1 Endpoint de datos (`GET`)

```python
@router.get("/daily-sales/data", response_class=JSONResponse)
async def daily_sales_data(
    date_from:    date       = Query(...),
    date_to:      date       = Query(...),
    warehouse_id: int | None = Query(None),
    request:      Request    = None,
    user:         dict       = Depends(get_current_user),
):
```

- Retorna JSON con forma `{ rows: [...], warehouses: [...] }`.
- Los datos de medios de pago en cada fila son dinámicos (`by_method: [{ code, name, amount }]`).
- Nunca retornar datos mock. Siempre consultar la BD.

### 3.2 Endpoint PDF (`POST`)

```python
@router.post("/daily-sales/pdf", response_class=Response)
async def daily_sales_pdf(
    date_from:  str                  = Form(...),
    date_to:    str                  = Form(...),
    branch:     str                  = Form("all"),
    chart_area: Optional[UploadFile] = File(None),
    chart_bar:  Optional[UploadFile] = File(None),
):
```

- Debe ser `POST` (recibe imágenes de gráficos como `UploadFile`).
- Llama a `await _build_context(date_from, date_to, branch)` — función `async` que consulta la BD real.
- Incrusta las imágenes como `data:image/png;base64,...` dentro del HTML.
- Envía el HTML a Gotenberg vía `_call_gotenberg_sync`.

### 3.3 Builder de contexto PDF (`async`)

`_build_context` es **siempre async** y consulta la BD directamente:

```python
async def _build_context(date_from: str, date_to: str, branch: str) -> dict:
    # 1. Resuelve warehouse_id desde branch ("all" → None)
    # 2. Calcula período anterior (misma duración, inmediatamente anterior)
    # 3. Queries: totales diarios, anulaciones, medios de pago (período actual)
    # 4. Queries: totales y anulaciones agregadas (período anterior)
    # 5. Queries: totales diarios (período anterior, para gráfico SVG comparativo)
    # 6. Construye curr_rows con by_method dinámico
    # 7. Deriva all_methods ordenados por total descendente
    # 8. Arma el dict ctx con todos los keys del template
    # 9. Genera DETAIL_PAGES con tabla dinámica de métodos de pago
    return ctx
```

### 3.4 Manejo de pagos MIXED

El campo `payment_details` puede contener un JSON con tipo `MIXED` (pago dividido). El backend debe descomponerlo:

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

### 4.1 Estructura de páginas

Cada `<section class="report-page">` es una página A4. El template base tiene:

| Página | Contenido |
|---|---|
| Portada | `{{> _cover}}` |
| 1 | Resumen ejecutivo: KPIs, metadata, nota ejecutiva |
| 2 | Gráficos exportados desde la UI (`{{CHART_AREA_CARD}}`, `{{CHART_BAR_CARD}}`) |
| 3 | Análisis comparativo con período anterior |
| 4…N | Detalle diario (generado dinámicamente por `_build_detail_pages`) |

### 4.2 Gráficos en el PDF

Las imágenes enviadas por el frontend se incrustan con `min-height:0` para evitar desbordamiento de página:

```python
f'<div class="chart-section" style="min-height:0">'
f'<img src="data:image/png;base64,{b64}" style="width:100%;height:auto;display:block;" />'
```

### 4.3 Tabla de detalle dinámica

Las columnas de la tabla de detalle se generan en función de los métodos de pago presentes en el período, no de una lista fija. Las funciones clave son:

- `_table_colgroup(methods)` — anchos de columna proporcionales
- `_table_thead(methods)` — encabezados dinámicos
- `_table_row(r, methods, best_row)` — filas con celdas por método
- `_build_detail_pages(rows, methods, best_row, ctx)` — página(s) completa(s)

### 4.4 Variables del template

Todas las variables se sustituyen con `{{VAR}}`. Los partials con `{{> _partial}}`. No usar lógica condicional en el template; toda la lógica va en el builder Python.

---

## 5. Convenciones generales

- **Sin datos mock en producción.** `_build_context` y los endpoints siempre usan la BD.
- **`REPORT_STATUS`** debe ser `"INFORME"`, nunca `"INFORME MOCKUP"`.
- **Columnas dinámicas** tanto en la UI (gráfico de barras, CSV, XLSX) como en el PDF (tabla de detalle).
- **Período anterior** se calcula automáticamente: misma cantidad de días, inmediatamente anterior al período seleccionado.
- Los helpers `_money`, `_clp`, `_fmt`, `_pct_diff`, `_pct_color`, `_WEEKDAYS` son compartidos en `reports.py` y no deben duplicarse por reporte.
