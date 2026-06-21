/* eslint-disable react/prop-types */
import { useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import KpiBar from '@/components/common/data/KpiBar';
import ReportCard from '@/components/common/data/ReportCard';
import ModuleHeader from '@/components/common/navigation/ModuleHeader';
import ExportModal from '@/components/reports/ExportModal';

/**
 * Estructura base para módulos de gestión / reportes.
 *
 * Secciones (todas opcionales excepto title):
 *   1. ModuleHeader  — title, description, actions
 *                      + botón PDF automático si se provee onExportPdf
 *   2. Barra filtros — filterBar (JSX libre)
 *   3. KPI bar       — kpiItems[]
 *   4. Gráfico       — chart + chartTitle / chartSubtitle / chartIcon
 *   5. Tabla detalle — children + tableTitle / tableSubtitle / tableIcon
 *                      + botones CSV / Excel con modal si se proveen onExportCsv / onExportExcel
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
const ReportLayout = ({
  // ── Header ──────────────────────────────────────────────
  title,
  description,
  actions = [],

  // ── Filtros ─────────────────────────────────────────────
  filterBar,

  // ── KPIs ────────────────────────────────────────────────
  kpiItems,

  // ── Gráficos ────────────────────────────────────────────
  // Opción A (múltiples): charts = [{ title, subtitle, icon, content }]
  // Opción B (compat):    chart + chartTitle + chartSubtitle + chartIcon
  charts,
  chartTitle,
  chartSubtitle,
  chartIcon,
  chart,

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

  // Botón PDF en el header
  const resolvedActions = [
    ...actions,
    ...(onExportPdf
      ? [{ id: '__pdf', label: 'PDF', icon: FileText, onClick: () => openExport('pdf', onExportPdf) }]
      : []),
  ];

  // Botones CSV / Excel en la cabecera de la tabla
  const exportButtons = (onExportCsv || onExportExcel) && (
    <div className="flex items-center divide-x divide-slate-200 overflow-hidden rounded-md border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
      {onExportCsv && (
        <button
          type="button"
          title="Exportar CSV"
          onClick={() => openExport('csv', onExportCsv)}
          className="flex h-7 items-center gap-1.5 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
        >
          <FileText className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
          CSV
        </button>
      )}
      {onExportExcel && (
        <button
          type="button"
          title="Exportar Excel"
          onClick={() => openExport('excel', onExportExcel)}
          className="flex h-7 items-center gap-1.5 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
          Excel
        </button>
      )}
    </div>
  );

  const resolvedTableActions = (exportButtons || tableActions) && (
    <>
      {tableActions}
      {exportButtons}
    </>
  );

  const filenameForType = { pdf: pdfFilename, csv: csvFilename, excel: excelFilename };

  return (
    <section className="min-h-full bg-slate-50 px-6 py-5 text-slate-950 dark:bg-slate-950 dark:text-white">

      <ModuleHeader title={title} description={description} actions={resolvedActions} />

      {filterBar && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {filterBar}
        </div>
      )}

      {kpiItems?.length > 0 && (
        <KpiBar items={kpiItems} className="mb-5" />
      )}

      {/* Gráficos: array o prop simple (compat) */}
      {(charts || (chart ? [{ title: chartTitle, subtitle: chartSubtitle, icon: chartIcon, content: chart }] : [])).map((c, i) => (
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
        {children}
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
