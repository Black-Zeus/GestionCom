-- Agrega la columna currency_code a currency_denominations y relaciona con currencies.
-- Todos los registros existentes (CLP) quedan migrados automáticamente.
USE inventario;

ALTER TABLE `currency_denominations`
  ADD COLUMN `currency_code` CHAR(3) NULL
    AFTER `denomination_type`,
  ADD CONSTRAINT `fk_denom_currency`
    FOREIGN KEY (`currency_code`) REFERENCES `currencies` (`currency_code`);

UPDATE `currency_denominations` SET `currency_code` = 'CLP' WHERE `currency_code` IS NULL;
