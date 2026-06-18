-- Agrega medio de pago para convenios con empresas u organizaciones.
-- Permite registrar descuento convenio o credito convenio en payment_details.

INSERT INTO payment_methods
  (method_code, method_name, method_type, affects_cash_flow, requires_authorization, currency_code, is_active, allows_postdated, requires_bank_info, default_terms_days, icon_name, display_order, created_at, updated_at)
VALUES
  ('CONVENIO', 'Convenio', 'OTHER', 0, 1, 'CLP', 1, 0, 0, NULL, 'building-2', 90, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  method_name = VALUES(method_name),
  method_type = VALUES(method_type),
  affects_cash_flow = VALUES(affects_cash_flow),
  requires_authorization = VALUES(requires_authorization),
  currency_code = VALUES(currency_code),
  is_active = 1,
  deleted_at = NULL,
  allows_postdated = VALUES(allows_postdated),
  requires_bank_info = VALUES(requires_bank_info),
  default_terms_days = VALUES(default_terms_days),
  icon_name = VALUES(icon_name),
  display_order = VALUES(display_order),
  updated_at = CURRENT_TIMESTAMP;
