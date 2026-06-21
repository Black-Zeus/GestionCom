/* eslint-disable react/prop-types */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileSpreadsheet, FileText, Loader2, X } from 'lucide-react';

// ── Config por tipo ─────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  pdf: {
    loadingLabel: 'Generando reporte PDF',
    icon: FileText,
    iconBg: 'bg-rose-50 dark:bg-rose-950/30',
    iconCls: 'text-rose-600 dark:text-rose-400',
    ext: '.pdf',
  },
  csv: {
    loadingLabel: 'Preparando archivo CSV',
    icon: FileText,
    iconBg: 'bg-blue-50 dark:bg-blue-950/30',
    iconCls: 'text-blue-600 dark:text-blue-400',
    ext: '.csv',
  },
  excel: {
    loadingLabel: 'Preparando archivo Excel',
    icon: FileSpreadsheet,
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    iconCls: 'text-emerald-600 dark:text-emerald-400',
    ext: '.xlsx',
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const defaultFilename = (title, type) => {
  const base = (title || 'reporte').toLowerCase().replace(/\s+/g, '-');
  return `${base}${TYPE_CONFIG[type]?.ext ?? ''}`;
};

// ── Sub-vistas ───────────────────────────────────────────────────────────────

const LoadingCard = ({ type }) => (
  <div className="relative z-10 flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white px-12 py-10 shadow-xl dark:border-slate-700 dark:bg-slate-900">
    <Loader2 className="h-9 w-9 animate-spin text-blue-600 dark:text-blue-400" />
    <div className="text-center">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {TYPE_CONFIG[type]?.loadingLabel ?? 'Procesando…'}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Esto puede tardar unos segundos…</p>
    </div>
  </div>
);

const FileReadyCard = ({ type, title, description, filename, blobUrl, onClose }) => {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.csv;
  const Icon = cfg.icon;
  const suggested = filename || defaultFilename(title, type);

  const handleDownload = () => {
    if (!blobUrl) return;
    Object.assign(document.createElement('a'), { href: blobUrl, download: suggested }).click();
  };

  return (
    <div
      className="relative z-10 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Cerrar */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Icono tipo de archivo */}
      <div className="mb-5 flex justify-center">
        <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${cfg.iconBg}`}>
          <Icon className={`h-7 w-7 ${cfg.iconCls}`} />
        </div>
      </div>

      {/* Info */}
      <div className="mb-6 text-center">
        <p className="text-base font-semibold text-slate-900 dark:text-white">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
        <p className="mt-3 rounded-md bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {suggested}
        </p>
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-md border border-slate-200 bg-white py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cerrar
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!blobUrl}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Descargar
        </button>
      </div>
    </div>
  );
};

const PdfPreviewCard = ({ title, description, filename, blobUrl, onClose }) => {
  const suggested = filename || defaultFilename(title, 'pdf');

  const handleDownload = () => {
    if (!blobUrl) return;
    Object.assign(document.createElement('a'), { href: blobUrl, download: suggested }).click();
  };

  return (
    <div
      className="relative z-10 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      style={{ width: '80vw', height: '80vh' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Franja superior */}
      <div className="flex shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          {description && (
            <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!blobUrl}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Descargar
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Preview */}
      {blobUrl
        ? <iframe src={blobUrl} className="min-h-0 w-full flex-1 border-0" title={`Preview — ${title}`} />
        : <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Sin contenido.</div>}
    </div>
  );
};

// ── Componente principal ─────────────────────────────────────────────────────

/**
 * Modal de exportación unificado para PDF, CSV y Excel.
 *
 * Props:
 *   isOpen      — controla visibilidad
 *   loading     — true = estado cargando; false = estado listo
 *   type        — 'pdf' | 'csv' | 'excel'
 *   blobUrl     — URL del blob listo para descargar / previsualizar
 *   title       — nombre del reporte
 *   description — resumen rápido (visible en estado listo)
 *   filename    — nombre sugerido para la descarga
 *   onClose     — callback al cerrar
 */
const ExportModal = ({ isOpen, loading, type, blobUrl, title, description, filename, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  let content;
  if (loading) {
    content = <LoadingCard type={type} />;
  } else if (type === 'pdf') {
    content = <PdfPreviewCard title={title} description={description} filename={filename} blobUrl={blobUrl} onClose={onClose} />;
  } else {
    content = <FileReadyCard type={type} title={title} description={description} filename={filename} blobUrl={blobUrl} onClose={onClose} />;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
      />
      {content}
    </div>,
    document.getElementById('modal-root') || document.body,
  );
};

export default ExportModal;
