/**
 * Utilidades de exportación de archivos.
 * Devuelven un blob URL listo para ser gestionado por ExportModal.
 *
 * Uso:
 *   const url = await buildCsvBlobUrl(headers, rows, { metadataRows });
 *   const url = await buildXlsxBlobUrl(headers, rows, sheetName?, { metadataRows });
 *
 * El llamador es responsable de revocar la URL (URL.revokeObjectURL)
 * cuando ya no se necesite. ReportLayout lo hace automáticamente al cerrar el modal.
 */

// ── CSV ──────────────────────────────────────────────────────────────────────

export const buildCsvBlobUrl = (headers, rows, options = {}) => {
  const esc   = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const metadataRows = options.metadataRows || [];
  const metadataLines = metadataRows.map((r) => r.map(esc).join(','));
  const lines = [
    ...metadataLines,
    ...(metadataLines.length ? [''] : []),
    headers.map(esc).join(','),
    ...rows.map((r) => r.map(esc).join(',')),
  ];
  const blob  = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  return URL.createObjectURL(blob);
};

// ── XLSX ─────────────────────────────────────────────────────────────────────

export const buildXlsxBlobUrl = async (headers, rows, sheetName = 'Datos', options = {}) => {
  const { utils, write } = await import('xlsx');
  const metadataRows = options.metadataRows || [];
  const worksheetRows = [
    ...metadataRows,
    ...(metadataRows.length ? [[]] : []),
    headers,
    ...rows,
  ];

  const ws = utils.aoa_to_sheet(worksheetRows);

  // Ancho de columna automático basado en contenido máximo
  const maxColumns = Math.max(headers.length, ...metadataRows.map((r) => r.length), 0);
  const colWidths = Array.from({ length: maxColumns }, (_, ci) => {
    const maxLen = Math.max(
      String(headers[ci] ?? '').length,
      ...metadataRows.map((r) => String(r[ci] ?? '').length),
      ...rows.map((r) => String(r[ci] ?? '').length),
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;

  const wb   = utils.book_new();
  utils.book_append_sheet(wb, ws, sheetName);

  const buf  = write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return URL.createObjectURL(blob);
};
