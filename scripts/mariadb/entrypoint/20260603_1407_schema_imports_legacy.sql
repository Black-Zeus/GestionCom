-- =====================================================
-- Schema importaciones y mapeo legacy
-- Archivo: 20260603_1407_schema_imports_legacy.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS import_batches (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    batch_code VARCHAR(50) UNIQUE NOT NULL,
    import_type ENUM('PRODUCTS', 'STOCK', 'PRICES', 'CUSTOMERS', 'SUPPLIERS', 'PURCHASES', 'LEGACY_FULL', 'OTHER') NOT NULL,
    source_file_name VARCHAR(255) NULL,
    source_file_path VARCHAR(500) NULL,
    source_format ENUM('CSV', 'XLS', 'XLSX', 'JSON', 'SQL', 'OTHER') DEFAULT 'XLSX',
    total_rows INT UNSIGNED DEFAULT 0,
    processed_rows INT UNSIGNED DEFAULT 0,
    success_rows INT UNSIGNED DEFAULT 0,
    error_rows INT UNSIGNED DEFAULT 0,
    status_id BIGINT UNSIGNED NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (status_id) REFERENCES system_statuses(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_import_type (import_type),
    INDEX idx_status_id (status_id),
    INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS import_batch_errors (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    import_batch_id BIGINT UNSIGNED NOT NULL,
    row_number INT UNSIGNED NULL,
    source_key VARCHAR(255) NULL,
    field_name VARCHAR(100) NULL,
    error_code VARCHAR(50) NULL,
    error_message TEXT NOT NULL,
    raw_payload JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (import_batch_id) REFERENCES import_batches(id) ON DELETE CASCADE,
    INDEX idx_import_batch_id (import_batch_id),
    INDEX idx_row_number (row_number),
    INDEX idx_error_code (error_code)
);

CREATE TABLE IF NOT EXISTS legacy_table_map (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    legacy_database_name VARCHAR(100) DEFAULT 'inv_old',
    legacy_table_name VARCHAR(100) NOT NULL,
    modern_table_name VARCHAR(100) NOT NULL,
    migration_strategy ENUM('DIRECT', 'SPLIT', 'MERGED', 'DERIVED', 'IGNORED') NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_legacy_modern_table (legacy_database_name, legacy_table_name, modern_table_name),
    INDEX idx_legacy_table_name (legacy_table_name),
    INDEX idx_modern_table_name (modern_table_name)
);

CREATE TABLE IF NOT EXISTS legacy_record_map (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    legacy_table_name VARCHAR(100) NOT NULL,
    legacy_primary_key VARCHAR(100) NOT NULL,
    modern_table_name VARCHAR(100) NOT NULL,
    modern_primary_key BIGINT UNSIGNED NOT NULL,
    import_batch_id BIGINT UNSIGNED NULL,
    checksum_hash VARCHAR(128) NULL,
    migrated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (import_batch_id) REFERENCES import_batches(id) ON DELETE SET NULL,
    UNIQUE KEY uk_legacy_record_target (legacy_table_name, legacy_primary_key, modern_table_name),
    INDEX idx_modern_record (modern_table_name, modern_primary_key),
    INDEX idx_import_batch_id (import_batch_id)
);

SET FOREIGN_KEY_CHECKS = 1;
