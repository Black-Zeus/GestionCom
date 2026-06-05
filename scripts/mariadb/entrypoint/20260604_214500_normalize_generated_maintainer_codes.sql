-- Normaliza codigos visibles de mantenedores para que sean generados por backend.
-- No modifica codigos de permisos ni roles de sistema: son identificadores funcionales.

UPDATE warehouses
SET warehouse_code = CASE warehouse_code
  WHEN 'BODEGA_CENTRAL' THEN 'BOD_0001'
  WHEN 'TIENDA_CENTRO' THEN 'TIE_0001'
  WHEN 'TIENDA_MALL' THEN 'TIE_0002'
  WHEN 'TIENDA_VALPO' THEN 'TIE_0003'
  ELSE warehouse_code
END
WHERE warehouse_code IN ('BODEGA_CENTRAL', 'TIENDA_CENTRO', 'TIENDA_MALL', 'TIENDA_VALPO');

UPDATE cash_registers
SET register_code = CASE register_code
  WHEN 'CAJA01_CENTRO' THEN 'POS_0001'
  WHEN 'CAJA02_CENTRO' THEN 'POS_0002'
  WHEN 'CAJA01_MALL' THEN 'POS_0003'
  WHEN 'CAJA01_VALPO' THEN 'POS_0004'
  ELSE register_code
END
WHERE register_code IN ('CAJA01_CENTRO', 'CAJA02_CENTRO', 'CAJA01_MALL', 'CAJA01_VALPO');

UPDATE petty_cash_funds
SET fund_code = CASE fund_code
  WHEN 'CCHICA_CENTRO' THEN 'PCF_000001'
  WHEN 'CCHICA_MALL' THEN 'PCF_000002'
  WHEN 'CCHICA_VALPO' THEN 'PCF_000003'
  ELSE fund_code
END
WHERE fund_code IN ('CCHICA_CENTRO', 'CCHICA_MALL', 'CCHICA_VALPO');

UPDATE petty_cash_categories
SET category_code = CASE category_code
  WHEN 'FOOD' THEN 'PCC_0001'
  WHEN 'SUPPLIES' THEN 'PCC_0002'
  WHEN 'TRANSPORT' THEN 'PCC_0003'
  WHEN 'SERVICES' THEN 'PCC_0004'
  WHEN 'PACKAGING' THEN 'PCC_0005'
  WHEN 'UTILITIES' THEN 'PCC_0006'
  WHEN 'MAINTENANCE' THEN 'PCC_0007'
  WHEN 'OTHER' THEN 'PCC_0008'
  ELSE category_code
END
WHERE category_code IN ('FOOD', 'SUPPLIES', 'TRANSPORT', 'SERVICES', 'PACKAGING', 'UTILITIES', 'MAINTENANCE', 'OTHER');

SET @custom_role_seq := (
  SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(role_code, '_', -1) AS UNSIGNED)), 0)
  FROM roles
  WHERE role_code REGEXP '^ROLE_[0-9]+$'
);

UPDATE roles r
JOIN (
  SELECT id, (@custom_role_seq := @custom_role_seq + 1) AS next_seq
  FROM roles
  WHERE is_system_role = FALSE
    AND role_code NOT REGEXP '^ROLE_[0-9]+$'
  ORDER BY id
) pending ON pending.id = r.id
SET r.role_code = CONCAT('ROLE_', LPAD(pending.next_seq, 4, '0'));
