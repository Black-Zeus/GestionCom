-- Alinea la tabla de gastos de caja chica con el router operativo actual.
-- El backend guarda metadatos del comprobante y usa expense_status para el flujo
-- pendiente/aprobado/rechazado.

ALTER TABLE petty_cash_expenses
  ADD COLUMN IF NOT EXISTS evidence_mime_type VARCHAR(100) NULL AFTER evidence_file_size,
  ADD COLUMN IF NOT EXISTS evidence_width INT UNSIGNED NULL AFTER evidence_mime_type,
  ADD COLUMN IF NOT EXISTS evidence_height INT UNSIGNED NULL AFTER evidence_width,
  ADD COLUMN IF NOT EXISTS evidence_original_filename VARCHAR(255) NULL AFTER evidence_height,
  ADD COLUMN IF NOT EXISTS expense_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING' AFTER has_receipt,
  ADD INDEX IF NOT EXISTS idx_expense_status (expense_status);
