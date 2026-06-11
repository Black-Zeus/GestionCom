-- Amplia etiquetas del menu para aprovechar el mayor espacio disponible en navegacion.

UPDATE menu_items
SET menu_name = CASE menu_code
  WHEN 'customers' THEN 'Listado de clientes'
  WHEN 'account_status' THEN 'Estado de cuenta de clientes'
  WHEN 'products' THEN 'Catalogo de productos'
  WHEN 'barcodes' THEN 'Codigos de barra de productos'
  WHEN 'suppliers' THEN 'Listado de proveedores'
  WHEN 'returns' THEN 'Devoluciones de ventas'
  WHEN 'credit_notes' THEN 'Notas de credito de ventas'
  WHEN 'document_series' THEN 'Tipos y series de documentos'
  WHEN 'metrics' THEN 'Metricas e indicadores'
  WHEN 'management_reports' THEN 'Reportes de gestion'
  WHEN 'audit_reports' THEN 'Reportes de auditoria'
  WHEN 'payment_methods' THEN 'Configuracion de metodos de pago'
  WHEN 'measurement_units' THEN 'Configuracion de unidades de medida'
  WHEN 'admin_users' THEN 'Administracion de usuarios'
  WHEN 'admin_roles' THEN 'Administracion de roles y permisos'
  WHEN 'warehouses' THEN 'Administracion de bodegas'
  ELSE menu_name
END,
menu_description = CASE menu_code
  WHEN 'customers' THEN 'Listado y gestion base de clientes.'
  WHEN 'account_status' THEN 'Estado de cuenta, saldos y deuda de clientes.'
  WHEN 'products' THEN 'Catalogo maestro de productos.'
  WHEN 'barcodes' THEN 'Codigos de barra asociados a productos.'
  WHEN 'suppliers' THEN 'Listado y gestion base de proveedores.'
  WHEN 'returns' THEN 'Gestion de devoluciones de ventas.'
  WHEN 'credit_notes' THEN 'Notas de credito asociadas a ventas.'
  WHEN 'document_series' THEN 'Tipos documentales y series de numeracion.'
  WHEN 'metrics' THEN 'Metricas e indicadores operacionales.'
  WHEN 'management_reports' THEN 'Reportes de gestion comercial y operacional.'
  WHEN 'audit_reports' THEN 'Reportes de auditoria y trazabilidad.'
  WHEN 'payment_methods' THEN 'Configuracion de metodos de pago aceptados.'
  WHEN 'measurement_units' THEN 'Configuracion de unidades de medida y conversiones.'
  WHEN 'admin_users' THEN 'Administracion de usuarios del sistema.'
  WHEN 'admin_roles' THEN 'Administracion de roles, perfiles y permisos.'
  WHEN 'warehouses' THEN 'Administracion de bodegas, tiendas y puntos de stock.'
  ELSE menu_description
END
WHERE menu_code IN (
  'customers',
  'account_status',
  'products',
  'barcodes',
  'suppliers',
  'returns',
  'credit_notes',
  'document_series',
  'metrics',
  'management_reports',
  'audit_reports',
  'payment_methods',
  'measurement_units',
  'admin_users',
  'admin_roles',
  'warehouses'
);
