-- Agrega soporte de logo/avatar y banner para proveedores.

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS logo_media_asset_id BIGINT UNSIGNED NULL AFTER internal_notes,
ADD COLUMN IF NOT EXISTS banner_media_asset_id BIGINT UNSIGNED NULL AFTER logo_media_asset_id;

CREATE INDEX IF NOT EXISTS idx_suppliers_logo_media_asset_id ON suppliers (logo_media_asset_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_banner_media_asset_id ON suppliers (banner_media_asset_id);
