-- Track original exchange credit amount for reporting.
-- Populated when an EXCHANGE_DRAFT is created.
-- Allows computing: used_credit, refunded_credit, forfeited_credit at report time.
USE inventario;

ALTER TABLE sale_documents
    ADD COLUMN exchange_credit_total DECIMAL(15,2) NULL DEFAULT NULL
        COMMENT 'Credito original generado por cambio (solo EXCHANGE_DRAFT)';

ALTER TABLE sale_documents
    ADD COLUMN exchange_forfeited_credit DECIMAL(15,2) NULL DEFAULT NULL
        COMMENT 'Credito de cambio no utilizado ni devuelto al cliente (se llena al cerrar EXCHANGE_DRAFT)';
