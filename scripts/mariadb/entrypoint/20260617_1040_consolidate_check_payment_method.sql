-- Consolida Cheque y Cheque a Fecha en un unico medio.
-- El campo Fecha cheque del POS cubre ambos casos, por lo que POSTDATED_CHECK es duplicado.

UPDATE payment_methods
SET is_active = 0,
    deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP),
    display_order = 999,
    updated_at = CURRENT_TIMESTAMP
WHERE method_code = 'POSTDATED_CHECK'
  AND deleted_at IS NULL;

UPDATE payment_methods
SET method_name = 'Cheque',
    allows_postdated = 1,
    requires_bank_info = 1,
    icon_name = COALESCE(icon_name, 'circle-check'),
    display_order = LEAST(COALESCE(display_order, 100), 50),
    updated_at = CURRENT_TIMESTAMP
WHERE method_code = 'CHECK'
  AND deleted_at IS NULL;
