-- Habilita perfil de usuario y media sanitizada en MinIO para usuarios, empresa y productos.

CREATE TABLE IF NOT EXISTS media_assets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  media_code VARCHAR(50) NOT NULL UNIQUE,
  owner_type ENUM('USER', 'COMPANY', 'PRODUCT') NOT NULL,
  owner_id BIGINT UNSIGNED NOT NULL,
  media_role ENUM('AVATAR', 'LOGO', 'BANNER', 'PRODUCT_IMAGE') NOT NULL,
  storage_provider ENUM('MINIO') NOT NULL DEFAULT 'MINIO',
  bucket_name VARCHAR(100) NOT NULL,
  object_key_full VARCHAR(500) NOT NULL,
  object_key_thumb VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NULL,
  mime_type VARCHAR(100) NOT NULL DEFAULT 'image/webp',
  full_width INT UNSIGNED NULL,
  full_height INT UNSIGNED NULL,
  thumb_width INT UNSIGNED NULL,
  thumb_height INT UNSIGNED NULL,
  full_size_bytes BIGINT UNSIGNED NULL,
  thumb_size_bytes BIGINT UNSIGNED NULL,
  uploaded_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_media_owner (owner_type, owner_id, media_role, deleted_at),
  INDEX idx_media_deleted_at (deleted_at),
  CONSTRAINT fk_media_uploaded_by_user FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_media_asset_id BIGINT UNSIGNED NULL AFTER petty_cash_limit;

ALTER TABLE dte_company_config
ADD COLUMN IF NOT EXISTS logo_media_asset_id BIGINT UNSIGNED NULL AFTER sii_user,
ADD COLUMN IF NOT EXISTS banner_media_asset_id BIGINT UNSIGNED NULL AFTER logo_media_asset_id;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS primary_image_media_asset_id BIGINT UNSIGNED NULL AFTER product_description;

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  theme VARCHAR(20) NULL,
  timezone VARCHAR(80) NULL,
  table_page_size INT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO permissions (permission_code, permission_name, permission_group, permission_description, is_active) VALUES
('PROFILE_ACCESS', 'Acceder a Mi Perfil', 'PROFILE', 'Permite ver y actualizar el perfil propio.', TRUE);

SET @system_user_id := (SELECT id FROM users WHERE username = 'root' LIMIT 1);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.permission_code = 'PROFILE_ACCESS'
WHERE r.role_code IN ('ADMIN', 'SUPER_ADMIN');

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by_user_id)
SELECT r.id, p.id, @system_user_id
FROM roles r
JOIN permissions p ON p.is_active = TRUE
WHERE r.role_code = 'SUPER_ADMIN';
