-- Agrega fee de conversion a currencies y columnas de fee/tasa efectiva a currency_exchange_rates
USE inventario;

-- Fee por divisa (porcentaje de descuento al convertir, ej: 10.00 = 10%)
ALTER TABLE `currencies`
  ADD COLUMN IF NOT EXISTS `conversion_fee_pct` decimal(5, 2) NOT NULL DEFAULT 0.00
    COMMENT 'Porcentaje de cargo por conversion. 0 = sin cargo.' AFTER `is_base_currency`;

-- Snapshot del fee vigente al momento del sync + tasa efectiva calculada
ALTER TABLE `currency_exchange_rates`
  ADD COLUMN IF NOT EXISTS `fee_pct` decimal(5, 2) NOT NULL DEFAULT 0.00 AFTER `rate_value`,
  ADD COLUMN IF NOT EXISTS `effective_rate` decimal(15, 6) NOT NULL DEFAULT 0.000000 AFTER `fee_pct`;

-- Recalcular effective_rate en filas existentes (todas tienen fee_pct=0 => effective_rate=rate_value)
UPDATE `currency_exchange_rates` SET `effective_rate` = `rate_value` WHERE `effective_rate` = 0;
