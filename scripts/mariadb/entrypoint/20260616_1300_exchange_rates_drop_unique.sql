-- Permite múltiples registros por (currency_code, base_currency_code, rate_date)
-- para preservar la historia completa de sincronizaciones y entradas manuales.
-- La vista siempre toma MAX(rate_date) + MAX(created_at) por divisa.
USE inventario;

-- Crear índice no único ANTES de eliminar el unique (que sirve de soporte al FK de currency_code)
ALTER TABLE `currency_exchange_rates`
  ADD INDEX IF NOT EXISTS `idx_currency_code` (`currency_code`),
  ADD INDEX IF NOT EXISTS `idx_currency_base_date` (`currency_code`, `base_currency_code`, `rate_date`);

-- Ahora sí se puede eliminar el unique key
ALTER TABLE `currency_exchange_rates`
  DROP INDEX `uk_currency_rate_base_date`;
