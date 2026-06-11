-- Agrega campos de medio de pago e importe al cierre de venta
ALTER TABLE sale_documents
  ADD COLUMN payment_method_code VARCHAR(20) NULL AFTER cash_register_id,
  ADD COLUMN payment_method_name VARCHAR(100) NULL AFTER payment_method_code,
  ADD COLUMN amount_tendered DECIMAL(14,2) NULL AFTER payment_method_name,
  ADD COLUMN change_amount DECIMAL(14,2) NULL AFTER amount_tendered;
