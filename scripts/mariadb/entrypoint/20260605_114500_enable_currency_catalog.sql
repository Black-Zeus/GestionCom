-- Centraliza monedas para evitar dobles fuentes de verdad en metodos de pago,
-- listas de precios, proveedores, cuentas bancarias y tipos de cambio.

CREATE TABLE IF NOT EXISTS currencies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    currency_code CHAR(3) UNIQUE NOT NULL,
    currency_name VARCHAR(100) NOT NULL,
    currency_symbol VARCHAR(12) NOT NULL,
    decimal_places TINYINT UNSIGNED NOT NULL DEFAULT 2,
    is_base_currency BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_currency_code (currency_code),
    INDEX idx_is_base_currency (is_base_currency),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

INSERT INTO currencies (
  currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, is_active
) VALUES
('CLP', 'Peso chileno', '$', 0, TRUE, TRUE),
('USD', 'Dolar estadounidense', 'US$', 2, FALSE, TRUE),
('EUR', 'Euro', 'EUR', 2, FALSE, TRUE),
('ARS', 'Peso argentino', '$', 2, FALSE, TRUE),
('BRL', 'Real brasileno', 'R$', 2, FALSE, TRUE),
('PEN', 'Sol peruano', 'S/', 2, FALSE, TRUE),
('COP', 'Peso colombiano', '$', 2, FALSE, TRUE),
('MXN', 'Peso mexicano', '$', 2, FALSE, TRUE),
('UYU', 'Peso uruguayo', '$U', 2, FALSE, TRUE),
('BOB', 'Boliviano', 'Bs', 2, FALSE, TRUE),
('PYG', 'Guarani paraguayo', 'Gs', 0, FALSE, TRUE),
('GBP', 'Libra esterlina', 'GBP', 2, FALSE, TRUE),
('CAD', 'Dolar canadiense', 'C$', 2, FALSE, TRUE),
('AUD', 'Dolar australiano', 'A$', 2, FALSE, TRUE),
('CHF', 'Franco suizo', 'CHF', 2, FALSE, TRUE),
('JPY', 'Yen japones', 'JPY', 0, FALSE, TRUE),
('CNY', 'Yuan chino', 'CNY', 2, FALSE, TRUE)
ON DUPLICATE KEY UPDATE
  currency_name = VALUES(currency_name),
  currency_symbol = VALUES(currency_symbol),
  decimal_places = VALUES(decimal_places),
  is_active = TRUE,
  deleted_at = NULL;

ALTER TABLE payment_methods
MODIFY COLUMN currency_code CHAR(3) NOT NULL DEFAULT 'CLP';

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payment_methods'
    AND CONSTRAINT_NAME = 'fk_payment_methods_currency'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE payment_methods ADD CONSTRAINT fk_payment_methods_currency FOREIGN KEY (currency_code) REFERENCES currencies(currency_code)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'price_lists'
    AND CONSTRAINT_NAME = 'fk_price_lists_currency'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE price_lists ADD CONSTRAINT fk_price_lists_currency FOREIGN KEY (currency_code) REFERENCES currencies(currency_code)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'suppliers'
    AND CONSTRAINT_NAME = 'fk_suppliers_default_currency'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE suppliers ADD CONSTRAINT fk_suppliers_default_currency FOREIGN KEY (default_currency_code) REFERENCES currencies(currency_code)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bank_accounts'
    AND CONSTRAINT_NAME = 'fk_bank_accounts_currency'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE bank_accounts ADD CONSTRAINT fk_bank_accounts_currency FOREIGN KEY (currency_code) REFERENCES currencies(currency_code)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'currency_exchange_rates'
    AND CONSTRAINT_NAME = 'fk_currency_exchange_rates_currency'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE currency_exchange_rates ADD CONSTRAINT fk_currency_exchange_rates_currency FOREIGN KEY (currency_code) REFERENCES currencies(currency_code)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
