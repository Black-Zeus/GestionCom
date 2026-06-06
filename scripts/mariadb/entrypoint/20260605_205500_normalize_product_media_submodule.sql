-- Normaliza la media de productos como soporte interno del catalogo de productos.
-- Enlaza product_media con media_assets, usa solo MinIO y permite una imagen activa por producto.

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

ALTER TABLE product_media
ADD COLUMN IF NOT EXISTS media_asset_id BIGINT UNSIGNED NULL AFTER product_variant_id;

ALTER TABLE product_media
MODIFY object_key VARCHAR(500) NULL;

CREATE INDEX IF NOT EXISTS idx_product_media_asset_id ON product_media (media_asset_id);

UPDATE product_media
SET product_variant_id = NULL,
    media_type = 'IMAGE',
    storage_provider = 'MINIO',
    public_url = NULL,
    is_primary = TRUE,
    sort_order = 0
WHERE deleted_at IS NULL;

UPDATE product_media pm
JOIN (
  SELECT product_id, MAX(id) AS keep_id
  FROM product_media
  WHERE deleted_at IS NULL
    AND product_id IS NOT NULL
  GROUP BY product_id
) kept ON kept.product_id = pm.product_id
SET pm.deleted_at = CURRENT_TIMESTAMP,
    pm.is_primary = FALSE
WHERE pm.deleted_at IS NULL
  AND pm.id <> kept.keep_id;

UPDATE products p
LEFT JOIN (
  SELECT product_id, media_asset_id
  FROM product_media
  WHERE deleted_at IS NULL
    AND is_primary = TRUE
    AND media_asset_id IS NOT NULL
) pm ON pm.product_id = p.id
SET p.primary_image_media_asset_id = pm.media_asset_id
WHERE p.deleted_at IS NULL;

ALTER TABLE product_media
ADD COLUMN IF NOT EXISTS active_product_image_key BIGINT UNSIGNED
  AS (IF(deleted_at IS NULL, product_id, NULL)) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS uk_product_media_active_product_image
ON product_media (active_product_image_key);

SET @fk_product_media_asset_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'product_media'
    AND CONSTRAINT_NAME = 'fk_product_media_asset_id'
);

SET @fk_product_media_asset_sql := IF(
  @fk_product_media_asset_exists = 0,
  'ALTER TABLE product_media ADD CONSTRAINT fk_product_media_asset_id FOREIGN KEY (media_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL',
  'SELECT 1'
);

PREPARE fk_product_media_asset_stmt FROM @fk_product_media_asset_sql;
EXECUTE fk_product_media_asset_stmt;
DEALLOCATE PREPARE fk_product_media_asset_stmt;

DELETE FROM menu_items
WHERE menu_code IN ('product_media', 'products_media')
   OR menu_url IN ('/products/media', '/product-media', '/inventory/product-media');

DELETE rp
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE p.permission_code IN ('PRODUCT_MEDIA_ACCESS', 'PRODUCT_MEDIA_MANAGE');

DELETE up
FROM user_permissions up
JOIN permissions p ON p.id = up.permission_id
WHERE p.permission_code IN ('PRODUCT_MEDIA_ACCESS', 'PRODUCT_MEDIA_MANAGE');

DELETE FROM permissions
WHERE permission_code IN ('PRODUCT_MEDIA_ACCESS', 'PRODUCT_MEDIA_MANAGE');

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.is_active = TRUE
WHERE r.role_code = 'SUPER_ADMIN';
