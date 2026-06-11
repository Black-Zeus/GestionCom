-- Sugerencias rapidas de proveedor/comercio para gastos de caja chica.

CREATE TABLE IF NOT EXISTS petty_cash_vendor_suggestions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendor_name VARCHAR(255) NOT NULL,
  usage_count INT UNSIGNED NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id BIGINT UNSIGNED NULL,
  updated_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uq_petty_cash_vendor_name (vendor_name),
  INDEX idx_petty_cash_vendor_last_used (last_used_at),
  INDEX idx_petty_cash_vendor_deleted_at (deleted_at),
  CONSTRAINT fk_petty_cash_vendor_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  CONSTRAINT fk_petty_cash_vendor_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id)
);

INSERT INTO petty_cash_vendor_suggestions (vendor_name, usage_count, last_used_at)
SELECT TRIM(vendor_name), COUNT(*), MAX(created_at)
FROM petty_cash_expenses
WHERE vendor_name IS NOT NULL
  AND TRIM(vendor_name) <> ''
GROUP BY TRIM(vendor_name)
ON DUPLICATE KEY UPDATE
  usage_count = GREATEST(usage_count, VALUES(usage_count)),
  last_used_at = GREATEST(COALESCE(last_used_at, VALUES(last_used_at)), VALUES(last_used_at));
