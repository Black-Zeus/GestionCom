-- =====================================================
-- Seed estados features y permisos legacy coverage
-- Archivo: 20260603_1358_seed_legacy_status_features_permissions.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

INSERT IGNORE INTO system_statuses
    (status_group, status_code, status_name, status_display_es, status_color, status_icon, sort_order)
VALUES
    ('SUPPLIER', 'ACTIVE', 'Active', 'Activo', '#28a745', 'fa-truck', 10),
    ('SUPPLIER', 'INACTIVE', 'Inactive', 'Inactivo', '#6c757d', 'fa-ban', 20),
    ('SUPPLIER', 'BLOCKED', 'Blocked', 'Bloqueado', '#dc3545', 'fa-lock', 30),
    ('PURCHASE', 'DRAFT', 'Draft', 'Borrador', '#6c757d', 'fa-edit', 10),
    ('PURCHASE', 'PENDING_APPROVAL', 'Pending Approval', 'Pendiente de Aprobacion', '#ffc107', 'fa-clock', 20),
    ('PURCHASE', 'APPROVED', 'Approved', 'Aprobada', '#28a745', 'fa-check', 30),
    ('PURCHASE', 'PARTIALLY_RECEIVED', 'Partially Received', 'Recepcion Parcial', '#17a2b8', 'fa-dolly', 40),
    ('PURCHASE', 'RECEIVED', 'Received', 'Recepcionada', '#28a745', 'fa-boxes', 50),
    ('PURCHASE', 'CANCELLED', 'Cancelled', 'Cancelada', '#dc3545', 'fa-times', 60),
    ('PAYABLE', 'PENDING', 'Pending', 'Pendiente', '#ffc107', 'fa-clock', 10),
    ('PAYABLE', 'PARTIAL', 'Partial', 'Pago Parcial', '#fd7e14', 'fa-coins', 20),
    ('PAYABLE', 'PAID', 'Paid', 'Pagada', '#28a745', 'fa-check', 30),
    ('PAYABLE', 'OVERDUE', 'Overdue', 'Vencida', '#dc3545', 'fa-exclamation-triangle', 40),
    ('PAYABLE', 'CANCELLED', 'Cancelled', 'Cancelada', '#6c757d', 'fa-times', 50),
    ('PHYSICAL_COUNT', 'DRAFT', 'Draft', 'Borrador', '#6c757d', 'fa-edit', 10),
    ('PHYSICAL_COUNT', 'COUNTING', 'Counting', 'En Conteo', '#17a2b8', 'fa-clipboard-list', 20),
    ('PHYSICAL_COUNT', 'REVIEW', 'Review', 'En Revision', '#ffc107', 'fa-search', 30),
    ('PHYSICAL_COUNT', 'APPROVED', 'Approved', 'Aprobado', '#28a745', 'fa-check', 40),
    ('PHYSICAL_COUNT', 'POSTED', 'Posted', 'Contabilizado', '#28a745', 'fa-check-double', 50),
    ('PHYSICAL_COUNT', 'CANCELLED', 'Cancelled', 'Cancelado', '#dc3545', 'fa-times', 60),
    ('TRANSFER_RECEPTION', 'PENDING', 'Pending', 'Pendiente', '#ffc107', 'fa-clock', 10),
    ('TRANSFER_RECEPTION', 'RECEIVED_OK', 'Received Ok', 'Recibida Conforme', '#28a745', 'fa-check', 20),
    ('TRANSFER_RECEPTION', 'RECEIVED_WITH_DIFFERENCE', 'Received With Difference', 'Recibida con Diferencia', '#fd7e14', 'fa-exclamation-triangle', 30),
    ('TRANSFER_RECEPTION', 'REJECTED', 'Rejected', 'Rechazada', '#dc3545', 'fa-times', 40),
    ('IMPORT_BATCH', 'PENDING', 'Pending', 'Pendiente', '#ffc107', 'fa-clock', 10),
    ('IMPORT_BATCH', 'PROCESSING', 'Processing', 'Procesando', '#17a2b8', 'fa-cog', 20),
    ('IMPORT_BATCH', 'COMPLETED', 'Completed', 'Completado', '#28a745', 'fa-check', 30),
    ('IMPORT_BATCH', 'COMPLETED_WITH_ERRORS', 'Completed With Errors', 'Completado con Errores', '#fd7e14', 'fa-exclamation-circle', 40),
    ('IMPORT_BATCH', 'FAILED', 'Failed', 'Fallido', '#dc3545', 'fa-times', 50),
    ('TAX_BOOK', 'OPEN', 'Open', 'Abierto', '#17a2b8', 'fa-book-open', 10),
    ('TAX_BOOK', 'CLOSED', 'Closed', 'Cerrado', '#28a745', 'fa-lock', 20),
    ('TAX_BOOK', 'DECLARED', 'Declared', 'Declarado', '#28a745', 'fa-file-signature', 30),
    ('TAX_BOOK', 'VOID', 'Void', 'Anulado', '#dc3545', 'fa-times', 40),
    ('BANK_RECONCILIATION', 'DRAFT', 'Draft', 'Borrador', '#6c757d', 'fa-edit', 10),
    ('BANK_RECONCILIATION', 'RECONCILED', 'Reconciled', 'Conciliada', '#28a745', 'fa-check', 20),
    ('BANK_RECONCILIATION', 'CANCELLED', 'Cancelled', 'Cancelada', '#dc3545', 'fa-times', 30);

INSERT IGNORE INTO system_features
    (feature_code, feature_name, feature_description, feature_type, default_value, current_value)
VALUES
    ('SUPPLIERS_ENABLED', 'Proveedores Habilitados', 'Activa maestros y contactos de proveedores', 'BOOLEAN', 'true', 'true'),
    ('PURCHASES_ENABLED', 'Compras Habilitadas', 'Activa ordenes, recepciones y documentos de compra', 'BOOLEAN', 'true', 'true'),
    ('ACCOUNTS_PAYABLE_ENABLED', 'Cuentas por Pagar Habilitadas', 'Activa deuda y pagos a proveedores', 'BOOLEAN', 'true', 'true'),
    ('PHYSICAL_INVENTORY_ENABLED', 'Inventario Fisico Habilitado', 'Activa conteos fisicos y conciliacion', 'BOOLEAN', 'true', 'true'),
    ('TRANSFER_DIFFERENCES_ENABLED', 'Diferencias de Transferencia Habilitadas', 'Controla enviado versus recibido', 'BOOLEAN', 'true', 'true'),
    ('TAX_BOOKS_ENABLED', 'Libros Tributarios Habilitados', 'Permite libros de compra y venta', 'BOOLEAN', 'true', 'true'),
    ('LEGACY_MAPPING_ENABLED', 'Mapeo Legacy Habilitado', 'Conserva trazabilidad de registros migrados desde inv_old', 'BOOLEAN', 'true', 'true'),
    ('BULK_IMPORT_ENABLED', 'Carga Masiva Habilitada', 'Registra importaciones Excel/CSV y errores por fila', 'BOOLEAN', 'true', 'true');

INSERT IGNORE INTO permissions (permission_code, permission_name, permission_group) VALUES
    ('SUPPLIERS_VIEW', 'Ver proveedores', 'SUPPLIERS'),
    ('SUPPLIERS_MANAGE', 'Gestionar proveedores', 'SUPPLIERS'),
    ('PURCHASES_VIEW', 'Ver compras', 'PURCHASES'),
    ('PURCHASES_CREATE', 'Crear compras', 'PURCHASES'),
    ('PURCHASES_APPROVE', 'Aprobar compras', 'PURCHASES'),
    ('PURCHASES_RECEIVE', 'Recepcionar compras', 'PURCHASES'),
    ('PAYABLES_VIEW', 'Ver cuentas por pagar', 'FINANCE'),
    ('PAYABLES_PAY', 'Registrar pagos a proveedores', 'FINANCE'),
    ('BANKS_MANAGE', 'Gestionar bancos y cuentas', 'FINANCE'),
    ('CHECKS_MANAGE', 'Gestionar cartera de cheques', 'FINANCE'),
    ('PHYSICAL_COUNTS_VIEW', 'Ver inventarios fisicos', 'INVENTORY'),
    ('PHYSICAL_COUNTS_MANAGE', 'Gestionar inventarios fisicos', 'INVENTORY'),
    ('TRANSFER_RECEPTIONS_MANAGE', 'Gestionar recepcion de transferencias', 'INVENTORY'),
    ('TAX_BOOKS_VIEW', 'Ver libros tributarios', 'REPORTS'),
    ('TAX_BOOKS_MANAGE', 'Gestionar libros tributarios', 'REPORTS'),
    ('BULK_IMPORT_MANAGE', 'Gestionar cargas masivas', 'ADMIN'),
    ('LEGACY_MIGRATION_VIEW', 'Ver trazabilidad legacy', 'ADMIN');

-- =====================================================
-- EXTENSIONES NO INVASIVAS SOBRE DOCUMENTOS
-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;
