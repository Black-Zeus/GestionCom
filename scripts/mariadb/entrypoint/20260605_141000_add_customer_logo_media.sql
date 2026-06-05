-- Permite asociar logo/avatar y banner visual a clientes usando media sanitizada en MinIO.

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS logo_media_asset_id BIGINT UNSIGNED NULL AFTER commercial_name,
ADD COLUMN IF NOT EXISTS banner_media_asset_id BIGINT UNSIGNED NULL AFTER logo_media_asset_id;

CREATE INDEX IF NOT EXISTS idx_customers_logo_media_asset_id ON customers (logo_media_asset_id);
CREATE INDEX IF NOT EXISTS idx_customers_banner_media_asset_id ON customers (banner_media_asset_id);
