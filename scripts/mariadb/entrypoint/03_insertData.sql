INSERT INTO statuses (name, description, module, createdBy) VALUES
-- Estados generales
('active', 'Activo', 'general', 1),
('inactive', 'Inactivo', 'general', 1),
('paused', 'Pausado', 'general', 1),
('cancelled', 'Cancelado', 'general', 1),
('pending', 'Pendiente', 'general', 1),
('maintenance', 'En mantenimiento', 'general', 1),
('redirected', 'Derivado', 'general', 1),

-- Estados para productos
('inStock', 'Producto en stock', 'products', 1),
('lowStock', 'Producto con bajo stock', 'products', 1),
('outOfStock', 'Producto sin stock', 'products', 1),
('reserved', 'Producto reservado', 'products', 1),
('inTransit', 'Producto en tránsito', 'products', 1),
('damaged', 'Producto dañado', 'products', 1),
('expired', 'Producto vencido', 'products', 1),

-- Estados para órdenes
('orderPlaced', 'Orden generada', 'orders', 1),
('orderConfirmed', 'Orden confirmada', 'orders', 1),
('orderShipped', 'Orden despachada', 'orders', 1),
('orderDelivered', 'Orden entregada', 'orders', 1),
('orderCancelled', 'Orden cancelada', 'orders', 1),
('orderReturned', 'Orden devuelta', 'orders', 1),
('orderPending', 'Orden pendiente de confirmación', 'orders', 1),

-- Estados para almacenes
('warehouseOpen', 'Almacén operativo', 'warehouses', 1),
('warehouseClosed', 'Almacén cerrado', 'warehouses', 1),
('warehouseFull', 'Almacén lleno', 'warehouses', 1),
('warehouseUnderMaintenance', 'Almacén en mantenimiento', 'warehouses', 1),

-- Estados para movimientos
('movementInitiated', 'Movimiento iniciado', 'movements', 1),
('movementInProgress', 'Movimiento en progreso', 'movements', 1),
('movementCompleted', 'Movimiento completado', 'movements', 1),
('movementCancelled', 'Movimiento cancelado', 'movements', 1),

-- Estados para proveedores
('supplierActive', 'Proveedor activo', 'suppliers', 1),
('supplierInactive', 'Proveedor inactivo', 'suppliers', 1),
('supplierPendingApproval', 'Proveedor pendiente de aprobación', 'suppliers', 1),
('supplierSuspended', 'Proveedor suspendido', 'suppliers', 1);

INSERT INTO profiles (name, description, createdBy) VALUES
('admin', 'Administrador con acceso completo', 1),
('customer', 'Cliente con acceso limitado', 1),
('moderator', 'Moderador con permisos específicos', 1),
('support', 'Soporte técnico', 1),
('guest', 'Usuario invitado con permisos mínimos', 1);

INSERT INTO users (
    firstName, lastName, email, password, secretJwt, phone, gender, address, statusId, profileId, createdBy
) VALUES
('Juan', 'Pérez', 'juan.perez@ejemplo.com', '$2b$12$/DScHZaQfVOhjOAVU6X0u.TNF3MaLFALvls95LoyGmX6Hd73.mdBW', '$2b$12$ZrBxLVdIwaYFlt8dud36PuC7mfjt86DVd1pEvzOoALssiq6eA9IV6', '+56912345678', 'male', 'Calle Falsa 123', 1, 1, 1),
('María', 'Gómez', 'maria.gomez@ejemplo.com', '$2b$12$/DScHZaQfVOhjOAVU6X0u.TNF3MaLFALvls95LoyGmX6Hd73.mdBW', '$2b$12$ZrBxLVdIwaYFlt8dud36PuC7mfjt86DVd1pEvzOoALssiq6eA9IV6', '+56987654321', 'female', 'Avenida Siempre Viva 456', 1, 2, 1),
('Carlos', 'Ramírez', 'carlos.ramirez@ejemplo.com', '$2b$12$/DScHZaQfVOhjOAVU6X0u.TNF3MaLFALvls95LoyGmX6Hd73.mdBW', '$2b$12$ZrBxLVdIwaYFlt8dud36PuC7mfjt86DVd1pEvzOoALssiq6eA9IV6', '+56999999999', 'male', 'Pasaje Interior 321', 1, 1, 1),
('Ana', 'López', 'ana.lopez@ejemplo.com', '$2b$12$/DScHZaQfVOhjOAVU6X0u.TNF3MaLFALvls95LoyGmX6Hd73.mdBW', '$2b$12$ZrBxLVdIwaYFlt8dud36PuC7mfjt86DVd1pEvzOoALssiq6eA9IV6', '+56988888888', 'female', 'Calle Los Olivos 789', 2, 2, 1),
('Luis', 'Martínez', 'luis.martinez@ejemplo.com', '$2b$12$/DScHZaQfVOhjOAVU6X0u.TNF3MaLFALvls95LoyGmX6Hd73.mdBW', '$2b$12$ZrBxLVdIwaYFlt8dud36PuC7mfjt86DVd1pEvzOoALssiq6eA9IV6', '+56977777777', 'male', 'Av. Las Palmas 654', 1, 3, 1),
('Claudia', 'Fernández', 'claudia.fernandez@ejemplo.com', '$2b$12$/DScHZaQfVOhjOAVU6X0u.TNF3MaLFALvls95LoyGmX6Hd73.mdBW', '$2b$12$ZrBxLVdIwaYFlt8dud36PuC7mfjt86DVd1pEvzOoALssiq6eA9IV6', '+56966666666', 'female', 'Av. Los Robles 987', 3, 4, 1);

INSERT INTO branches (name, address, statusId, createdBy) VALUES
('Sucursal Central', 'Av. Principal 123', 1, 1),
('Sucursal Norte', 'Calle Secundaria 456', 1, 1),
('Sucursal Sur', 'Avenida Industrial 789', 2, 1),
('Sucursal Este', 'Avenida del Sol 123', 1, 1),
('Sucursal Oeste', 'Calle de la Luna 456', 1, 1),
('Sucursal Emergencias', 'Carretera Nacional Km 10', 3, 1);

INSERT INTO user_branches (userId, branchId, assignedAt) VALUES
(1, 1, '2025-01-01 10:00:00'), -- Usuario 1 asignado a Sucursal Central
(1, 2, '2025-01-02 11:00:00'), -- Usuario 1 asignado a Sucursal Norte
(1, 3, '2025-01-03 09:00:00'), -- Usuario 1 asignado a Sucursal Sur
(2, 1, '2025-01-04 12:00:00'), -- Usuario 2 asignado a Sucursal Central
(3, 4, '2025-01-05 14:45:00'), -- Usuario 3 asignado a Sucursal Este
(4, 5, '2025-01-06 08:15:00'); -- Usuario 4 asignado a Sucursal Oeste

