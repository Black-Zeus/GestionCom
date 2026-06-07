-- Normaliza la recepcion por linea en transferencias de stock.

ALTER TABLE stock_transfer_items
  ADD COLUMN IF NOT EXISTS reception_status VARCHAR(20) NULL AFTER received_quantity,
  ADD COLUMN IF NOT EXISTS reception_notes TEXT NULL AFTER reception_status;

UPDATE stock_transfer_items
SET reception_status = CASE
    WHEN received_quantity IS NULL THEN NULL
    WHEN received_quantity = quantity THEN 'ACCEPTED'
    ELSE 'OBSERVED'
  END
WHERE reception_status IS NULL
  AND received_quantity IS NOT NULL;
