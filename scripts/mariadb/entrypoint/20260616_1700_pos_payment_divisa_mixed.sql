-- Ajusta medios de pago POS para divisa extranjera, mixto y elimina seeds demo.
ALTER TABLE sale_documents
  ADD COLUMN IF NOT EXISTS payment_details JSON NULL AFTER change_amount;

ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS icon_name varchar(80) NULL AFTER default_terms_days,
  ADD COLUMN IF NOT EXISTS display_order int(10) unsigned NOT NULL DEFAULT 100 AFTER icon_name;

DELETE FROM payment_methods
WHERE method_code IN ('DEMO_CASH', 'DEMO_CARD', 'DEMO_TRANS')
   OR LOWER(method_name) LIKE '%demo%';

UPDATE payment_methods
SET is_active = 0,
    deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP),
    display_order = 999
WHERE method_code = 'WIRE_TRANSFER';

INSERT IGNORE INTO payment_methods
  (method_code, method_name, method_type, affects_cash_flow, requires_authorization, currency_code, is_active, allows_postdated, requires_bank_info, default_terms_days, icon_name, display_order)
VALUES
  ('FOREIGN_CURRENCY', 'Divisa Extranjera', 'OTHER', 1, 0, 'CLP', 1, 0, 0, NULL, 'repeat-2', 40),
  ('MIXED', 'Mixto', 'OTHER', 1, 0, 'CLP', 1, 0, 0, NULL, 'split-square-horizontal', 10);

UPDATE payment_methods SET icon_name = 'banknote', display_order = 20 WHERE method_code = 'CASH';
UPDATE payment_methods SET icon_name = 'credit-card', display_order = 30 WHERE method_code = 'DEBIT';
UPDATE payment_methods SET icon_name = 'repeat-2', display_order = 40 WHERE method_code = 'FOREIGN_CURRENCY';
UPDATE payment_methods SET icon_name = 'split-square-horizontal', display_order = 10 WHERE method_code = 'MIXED';
