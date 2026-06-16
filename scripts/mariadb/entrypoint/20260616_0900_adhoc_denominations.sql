-- Habilita conteo de denominaciones ad-hoc (divisas extranjeras) en el cierre de caja.
-- denomination_id queda nullable para registros sin referencia al mantenedor.
USE inventario;

ALTER TABLE `cash_session_denomination_counts`
  MODIFY COLUMN `currency_denomination_id` bigint(20) unsigned NULL,
  ADD COLUMN IF NOT EXISTS `adhoc_label`             varchar(100)    NULL AFTER `count_type`,
  ADD COLUMN IF NOT EXISTS `adhoc_currency_code`     char(3)         NULL AFTER `adhoc_label`,
  ADD COLUMN IF NOT EXISTS `adhoc_denomination_value` decimal(15,2)  NULL AFTER `adhoc_currency_code`;
