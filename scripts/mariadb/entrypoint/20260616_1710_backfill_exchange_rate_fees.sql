-- Recalcula fees y tasas efectivas existentes con el fee actual configurado en currencies.
UPDATE currency_exchange_rates r
JOIN currencies c ON c.currency_code = r.currency_code
SET
  r.fee_pct = COALESCE(c.conversion_fee_pct, 0.00),
  r.effective_rate = ROUND(r.rate_value * (1 - COALESCE(c.conversion_fee_pct, 0.00) / 100), 6)
WHERE r.currency_code <> r.base_currency_code;

UPDATE currency_exchange_rates
SET fee_pct = 0.00, effective_rate = rate_value
WHERE currency_code = base_currency_code;
