-- Registro de uso de convenios aplicados en caja.
-- Permite reportar consumo por empresa/organizacion y por asociado.

CREATE TABLE IF NOT EXISTS agreement_usage_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_document_id BIGINT UNSIGNED NOT NULL,
  sale_code VARCHAR(36) NOT NULL,
  ticket_number VARCHAR(60) NULL,
  agreement_type ENUM('DISCOUNT', 'CREDIT') NOT NULL DEFAULT 'DISCOUNT',
  organization_name VARCHAR(180) NOT NULL,
  associate_identifier VARCHAR(80) NOT NULL,
  associate_name VARCHAR(180) NULL,
  reference_number VARCHAR(100) NULL,
  discount_percent DECIMAL(7,4) NULL,
  discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  original_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  final_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  payment_method_code VARCHAR(20) NULL,
  raw_payload JSON NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_agreement_usage_sale_document_id (sale_document_id),
  KEY idx_agreement_usage_org (organization_name),
  KEY idx_agreement_usage_associate (associate_identifier),
  KEY idx_agreement_usage_created_at (created_at),
  CONSTRAINT fk_agreement_usage_sale_document
    FOREIGN KEY (sale_document_id) REFERENCES sale_documents(id)
    ON DELETE CASCADE
);
