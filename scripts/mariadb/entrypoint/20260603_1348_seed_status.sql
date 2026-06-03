-- =====================================================
-- Seed estados centralizados
-- Archivo: 20260603_1348_seed_status.sql
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;


-- ===============================================
-- PASO 2: POBLAR DATOS EN TABLAS NUEVAS
-- ===============================================

-- Estados para documentos
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('DOCUMENT', 'DRAFT', 'Draft', 'Borrador', '#6c757d', 'fa-edit', 10),
('DOCUMENT', 'PENDING', 'Pending', 'Pendiente', '#ffc107', 'fa-clock', 20),
('DOCUMENT', 'APPROVED', 'Approved', 'Aprobado', '#28a745', 'fa-check', 30),
('DOCUMENT', 'PROCESSED', 'Processed', 'Procesado', '#17a2b8', 'fa-check-double', 40),
('DOCUMENT', 'CANCELLED', 'Cancelled', 'Cancelado', '#dc3545', 'fa-times', 50);

-- Estados para clientes
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('CUSTOMER', 'ACTIVE', 'Active', 'Activo', '#28a745', 'fa-user-check', 10),
('CUSTOMER', 'INACTIVE', 'Inactive', 'Inactivo', '#6c757d', 'fa-user-slash', 20),
('CUSTOMER', 'BLOCKED', 'Blocked', 'Bloqueado', '#dc3545', 'fa-user-lock', 30),
('CUSTOMER', 'DEFAULTED', 'Defaulted', 'En Mora', '#fd7e14', 'fa-exclamation-triangle', 40);

-- Estados para pagos
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('PAYMENT', 'PENDING', 'Pending', 'Pendiente', '#ffc107', 'fa-clock', 10),
('PAYMENT', 'CONFIRMED', 'Confirmed', 'Confirmado', '#28a745', 'fa-check', 20),
('PAYMENT', 'CLEARED', 'Cleared', 'Liquidado', '#17a2b8', 'fa-check-double', 30),
('PAYMENT', 'CANCELLED', 'Cancelled', 'Cancelado', '#dc3545', 'fa-times', 40);

-- Estados para sesiones de caja
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('CASH_SESSION', 'OPEN', 'Open', 'Abierta', '#28a745', 'fa-cash-register', 10),
('CASH_SESSION', 'PENDING_CLOSE', 'Pending Close', 'Pendiente de Cierre', '#ffc107', 'fa-clock', 20),
('CASH_SESSION', 'CLOSED', 'Closed', 'Cerrada', '#17a2b8', 'fa-lock', 30),
('CASH_SESSION', 'CANCELLED', 'Cancelled', 'Cancelada', '#dc3545', 'fa-times', 40);

-- Estados para cuentas por cobrar
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('RECEIVABLE', 'PENDING', 'Pending', 'Pendiente', '#ffc107', 'fa-clock', 10),
('RECEIVABLE', 'PARTIAL', 'Partial', 'Parcial', '#fd7e14', 'fa-coins', 20),
('RECEIVABLE', 'PAID', 'Paid', 'Pagada', '#28a745', 'fa-check', 30),
('RECEIVABLE', 'OVERDUE', 'Overdue', 'Vencida', '#dc3545', 'fa-exclamation-triangle', 40),
('RECEIVABLE', 'WRITTEN_OFF', 'Written Off', 'Castigada', '#6c757d', 'fa-times-circle', 50);

-- Estados para devoluciones
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('RETURN', 'DRAFT', 'Draft', 'Borrador', '#6c757d', 'fa-edit', 10),
('RETURN', 'PENDING_APPROVAL', 'Pending Approval', 'Pendiente de Aprobación', '#ffc107', 'fa-clock', 20),
('RETURN', 'APPROVED', 'Approved', 'Aprobada', '#28a745', 'fa-check', 30),
('RETURN', 'PROCESSED', 'Processed', 'Procesada', '#17a2b8', 'fa-check-double', 40),
('RETURN', 'CANCELLED', 'Cancelled', 'Cancelada', '#dc3545', 'fa-times', 50);

-- Estados para alertas de stock
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('STOCK_ALERT', 'NEW', 'New', 'Nueva', '#dc3545', 'fa-bell', 10),
('STOCK_ALERT', 'ACKNOWLEDGED', 'Acknowledged', 'Reconocida', '#ffc107', 'fa-eye', 20),
('STOCK_ALERT', 'IN_PROGRESS', 'In Progress', 'En Proceso', '#17a2b8', 'fa-cog', 30),
('STOCK_ALERT', 'RESOLVED', 'Resolved', 'Resuelta', '#28a745', 'fa-check', 40),
('STOCK_ALERT', 'DISMISSED', 'Dismissed', 'Descartada', '#6c757d', 'fa-times', 50);

-- Estados para gastos de caja chica
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('EXPENSE', 'PENDING', 'Pending', 'Pendiente', '#ffc107', 'fa-clock', 10),
('EXPENSE', 'APPROVED', 'Approved', 'Aprobado', '#28a745', 'fa-check', 20),
('EXPENSE', 'REJECTED', 'Rejected', 'Rechazado', '#dc3545', 'fa-times', 30);

-- Estados para cheques
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('CHECK', 'PENDING', 'Pending', 'Pendiente', '#ffc107', 'fa-clock', 10),
('CHECK', 'DEPOSITED', 'Deposited', 'Depositado', '#17a2b8', 'fa-university', 20),
('CHECK', 'CLEARED', 'Cleared', 'Liberado', '#28a745', 'fa-check', 30),
('CHECK', 'BOUNCED', 'Bounced', 'Rebotado', '#dc3545', 'fa-exclamation-circle', 40);

-- Estados para DTE
INSERT INTO `system_statuses` (`status_group`, `status_code`, `status_name`, `status_display_es`, `status_color`, `status_icon`, `sort_order`) VALUES
('DTE', 'DRAFT', 'Draft', 'Borrador', '#6c757d', 'fa-edit', 10),
('DTE', 'SENT', 'Sent', 'Enviado', '#17a2b8', 'fa-paper-plane', 20),
('DTE', 'ACCEPTED', 'Accepted', 'Aceptado', '#28a745', 'fa-check', 30),
('DTE', 'REJECTED', 'Rejected', 'Rechazado', '#dc3545', 'fa-times', 40),
('DTE', 'CANCELLED', 'Cancelled', 'Cancelado', '#6c757d', 'fa-ban', 50);

-- ===============================================
-- PASO 3: MIGRAR TABLAS ACTUALES
-- ===============================================

SET FOREIGN_KEY_CHECKS = 1;
