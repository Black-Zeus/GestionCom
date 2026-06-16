-- Agrega base_currency_code a currency_exchange_rates y renombra rate_to_clp -> rate_value
-- para soportar multiples empresas con distintas divisas base.
USE inventario;

ALTER TABLE `currency_exchange_rates`
  CHANGE COLUMN `rate_to_clp` `rate_value` decimal(15, 6) NOT NULL,
  ADD COLUMN IF NOT EXISTS `base_currency_code` char(3) NOT NULL DEFAULT 'CLP' AFTER `currency_code`;

-- Actualizar unique key para incluir la divisa base
ALTER TABLE `currency_exchange_rates`
  DROP INDEX IF EXISTS `uk_currency_rate_date`,
  ADD UNIQUE KEY `uk_currency_rate_base_date` (`currency_code`, `base_currency_code`, `rate_date`);

-- FK para base_currency_code (IF NOT EXISTS no es soportado con CONSTRAINT en MariaDB, usamos DROP+ADD)
ALTER TABLE `currency_exchange_rates`
  ADD CONSTRAINT `fk_cer_base_currency`
    FOREIGN KEY (`base_currency_code`) REFERENCES `currencies` (`currency_code`)
    ON UPDATE CASCADE;
