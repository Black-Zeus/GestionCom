-- Amplía sale_code a 36 chars para soportar UUID v4 (formato xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx)
ALTER TABLE sale_documents MODIFY COLUMN sale_code VARCHAR(36) NOT NULL;
