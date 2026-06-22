/* eslint-disable react/prop-types */
import { useState } from 'react';
import { AlertTriangle, FileSpreadsheet, FileText, ListFilter } from 'lucide-react';
import KpiBar from '@/components/common/data/KpiBar';
import ReportCard from '@/components/common/data/ReportCard';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import ExportModal from '@/components/reports/ExportModal';

/**
 * Estructura base para módulos de gestión / reportes.
 *
 * Secciones obligatorias:
 *   1. ModuleHeader  — title, description, actions
 *   2. Barra filtros — filterBar (JSX libre)
 *   3. KPI bar       — kpiItems[]
 *   4. Gráficos      — charts = [{ title, subtitle, icon, content }]
 *                      mínimo 1 gráfico
 *   5. Tabla detalle — children + tableTitle / tableSubtitle / tableIcon
 *                      + toggle Detalle / Agrupado
 *                      + botones PDF / CSV / Excel
 *                      + tableActions para acciones adicionales
 *                      + tableFooter
 *
 * Exportaciones (flujo con modal gestionado por el layout):
 *   Las tres funciones son  async () => string  — deben devolver un blob URL.
 *   El layout gestiona el modal (loading → listo) y revoca la URL al cerrar.
 *
 *   onExportPdf     — abre modal PDF con preview embebido (80vw × 80vh)
 *   pdfFilename     — nombre sugerido para la descarga
 *
 *   onExportCsv     — abre modal CSV con tarjeta de descarga compacta
 *   csvFilename     — nombre sugerido para la descarga
 *
 *   onExportExcel   — abre modal Excel con tarjeta de descarga compacta
 *   excelFilename   — nombre sugerido para la descarga
 *
 *   exportDescription — texto de resumen compartido por los tres modales
 */
const RequiredSectionFallback = ({ label }) => (
  <div className="flex min-h-24 items-center justify-center gap-2 rounded-md border border-dashed border-amber-300 bg-amber-50 px-4 py-6 text-sm font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
    <AlertTriangle className="h-4 w-4 shrink-0" />
    {label}
  </div>
);

const ReportLayout = ({
  // ── Header ──────────────────────────────────────────────
  title,
  description,
  actions = [],

  // ── Filtros ─────────────────────────────────────────────
  // filterBar        → Sucursal | shortcuts | DatePicker
  // filterBarActions → Acciones de fila default, ej. Limpiar
  // filterBarTrailing → Filtros propios del reporte
  filterBar,
  filterBarActions,
  filterBarTrailing,
  onRunReport,
  runReportLabel = 'Ejecutar reporte',
  runReportDisabled = false,
  runReportLoading = false,

  // ── Vista (toggle Detalle / agrupado) ───────────────────
  // Se ubica en la cabecera de la tabla, junto a CSV / Excel.
  // viewMode: string con el valor activo
  // onViewModeChange: (id: string) => void
  // viewModeOptions: [{ id, label }] — por defecto Detalle | Por día
  viewMode,
  onViewModeChange,
  viewModeOptions = [{ id: 'detail', label: 'Detalle' }, { id: 'grouped', label: 'Por día' }],

  // ── KPIs ────────────────────────────────────────────────
  kpiItems,

  // ── Gráficos ────────────────────────────────────────────
  charts = [],

  // ── Tabla ───────────────────────────────────────────────
  tableTitle,
  tableSubtitle,
  tableIcon,
  tableActions,
  tableFooter,
  children,

  // ── Exportaciones ───────────────────────────────────────
  onExportPdf,
  pdfFilename,
  onExportCsv,
  csvFilename,
  onExportExcel,
  excelFilename,
  exportDescription,
}) => {
  // Estado unificado del modal de exportación
  const [modal, setModal] = useState({ type: null, phase: 'closed', blobUrl: null });
  // phase: 'closed' | 'loading' | 'ready'

  const openExport = async (type, fn) => {
    if (!fn) return;
    setModal({ type, phase: 'loading', blobUrl: null });
    try {
      const url = await fn();
      setModal({ type, phase: 'ready', blobUrl: url });
    } catch {
      setModal({ type: null, phase: 'closed', blobUrl: null });
    }
  };

  const closeExport = () => {
    if (modal.blobUrl) URL.revokeObjectURL(modal.blobUrl);
    setModal({ type: null, phase: 'closed', blobUrl: null });
  };

  const resolvedActions = actions;
  const resolvedKpiItems = kpiItems?.length > 0 ? kpiItems : [{
    id: 'required-kpi',
    label: 'KPI obligatorio',
    value: 'Pendiente',
    hint: 'Definir kpiItems en el reporte',
    disabled: true,
  }];
  const resolvedCharts = charts?.length > 0 ? charts : [{
    title: 'Gráfico obligatorio',
    subtitle: 'Mínimo 1 gráfico por reporte',
    icon: AlertTriangle,
    content: <RequiredSectionFallback label="Definir charts con al menos un gráfico para este reporte." />,
  }];

  // Controles de vista y exportación en la cabecera de la tabla
  const viewModeButtons = (
    <div className="flex items-center overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
      {viewModeOptions.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onViewModeChange?.(m.id)}
          disabled={!onViewModeChange}
          className={`h-7 px-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
            viewMode === m.id
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );

  const exportButtons = (
    <div className="flex items-center divide-x divide-slate-200 overflow-hidden rounded-md border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
      <button
        type="button"
        title={onExportPdf ? 'Exportar PDF' : 'Exportar PDF pendiente de implementar'}
        onClick={() => openExport('pdf', onExportPdf)}
        disabled={!onExportPdf}
        className="flex h-7 items-center gap-1.5 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
      >
        <FileText className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
        PDF
      </button>
      <button
        type="button"
        title={onExportCsv ? 'Exportar CSV' : 'Exportar CSV pendiente de implementar'}
        onClick={() => openExport('csv', onExportCsv)}
        disabled={!onExportCsv}
        className="flex h-7 items-center gap-1.5 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
      >
        <FileText className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
        CSV
      </button>
      <button
        type="button"
        title={onExportExcel ? 'Exportar Excel' : 'Exportar Excel pendiente de implementar'}
        onClick={() => openExport('excel', onExportExcel)}
        disabled={!onExportExcel}
        className="flex h-7 items-center gap-1.5 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
      >
        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
        Excel
      </button>
    </div>
  );

  const resolvedTableActions = (
    <>
      {tableActions}
      {viewModeButtons}
      {exportButtons}
    </>
  );

  const filenameForType = { pdf: pdfFilename, csv: csvFilename, excel: excelFilename };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">

      <ModuleHeader title={title} description={description} actions={resolvedActions} />

      <div className="mb-5 flex flex-col gap-2">

        {/* Fila default: Locación | shortcuts | DatePicker | Limpiar | Ejecutar */}
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {filterBar || <RequiredSectionFallback label="Definir barra de filtros del reporte." />}
          {filterBarActions}
          <button
            type="button"
            onClick={onRunReport}
            disabled={!onRunReport || runReportDisabled || runReportLoading}
            className="ml-auto flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            <ListFilter className="h-4 w-4" />
            {runReportLoading ? 'Ejecutando...' : runReportLabel}
          </button>
        </div>

        {/* Fila 2: filtros propios del reporte */}
        {filterBarTrailing && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {filterBarTrailing}
          </div>
        )}

      </div>

      <KpiBar items={resolvedKpiItems} className="mb-5" />

      {/* Gráficos: cada uno ocupa el ancho completo, apilados */}
      {resolvedCharts.map((c, i) => (
        <ReportCard key={i} title={c.title} subtitle={c.subtitle} icon={c.icon} className="mb-5">
          {c.content}
        </ReportCard>
      ))}

      <ReportCard
        title={tableTitle}
        subtitle={tableSubtitle}
        icon={tableIcon}
        actions={resolvedTableActions}
        footer={tableFooter}
      >
        {children || <RequiredSectionFallback label="Definir tabla de datos del reporte." />}
      </ReportCard>

      <ExportModal
        isOpen={modal.phase !== 'closed'}
        loading={modal.phase === 'loading'}
        type={modal.type}
        blobUrl={modal.blobUrl}
        title={title}
        description={exportDescription ?? description}
        filename={filenameForType[modal.type]}
        onClose={closeExport}
      />

    </section>
  );
};

export default ReportLayout;
