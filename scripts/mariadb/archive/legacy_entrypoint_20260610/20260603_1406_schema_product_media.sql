-- =====================================================
-- Schema archivos de producto
-- Archivo: 20260603_1406_schema_product_media.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS product_media (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NULL,
    product_variant_id BIGINT UNSIGNED NULL,
    media_type ENUM('IMAGE', 'DOCUMENT', 'LABEL', 'OTHER') DEFAULT 'IMAGE',
    storage_provider ENUM('MINIO', 'S3', 'LOCAL', 'EXTERNAL') DEFAULT 'MINIO',
    bucket_name VARCHAR(100) NULL,
    object_key VARCHAR(500) NOT NULL,
    public_url VARCHAR(1000) NULL,
    file_name VARCHAR(255) NULL,
    mime_type VARCHAR(100) NULL,
    file_size_bytes BIGINT UNSIGNED NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INT UNSIGNED DEFAULT 0,
    uploaded_by_user_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_product_id (product_id),
    INDEX idx_product_variant_id (product_variant_id),
    INDEX idx_media_type (media_type),
    INDEX idx_is_primary (is_primary),
    INDEX idx_deleted_at (deleted_at)
);

SET FOREIGN_KEY_CHECKS = 1;
