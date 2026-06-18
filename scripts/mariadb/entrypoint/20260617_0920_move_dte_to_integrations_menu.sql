-- Mueve DTE desde Configuracion a un modulo independiente de Integraciones.

INSERT INTO menu_items (
  parent_id,
  menu_code,
  menu_name,
  menu_description,
  icon_name,
  icon_color,
  menu_url,
  menu_type,
  required_permission_id,
  alternative_permissions,
  is_active,
  is_visible,
  requires_feature,
  feature_code,
  sort_order,
  menu_level,
  menu_path,
  target_window,
  css_classes,
  data_attributes
)
SELECT
  NULL,
  'integrations',
  'Integraciones',
  'Modulos de integracion con servicios externos.',
  'plug-line',
  '#2563EB',
  NULL,
  'PARENT',
  permission.id,
  JSON_ARRAY('DTE_ACCESS', 'DTE_VIEW', 'DTE_CONFIG_MANAGE'),
  1,
  1,
  0,
  NULL,
  115,
  1,
  '/integrations',
  'SELF',
  NULL,
  NULL
FROM permissions permission
WHERE permission.permission_code = 'DTE_ACCESS'
  AND NOT EXISTS (
    SELECT 1
    FROM menu_items existing
    WHERE existing.menu_code = 'integrations'
      AND existing.deleted_at IS NULL
  );

UPDATE menu_items parent
JOIN permissions permission ON permission.permission_code = 'DTE_ACCESS'
SET
  parent.menu_name = 'Integraciones',
  parent.menu_description = 'Modulos de integracion con servicios externos.',
  parent.icon_name = 'plug-line',
  parent.icon_color = '#2563EB',
  parent.menu_type = 'PARENT',
  parent.required_permission_id = permission.id,
  parent.alternative_permissions = JSON_ARRAY('DTE_ACCESS', 'DTE_VIEW', 'DTE_CONFIG_MANAGE'),
  parent.is_active = 1,
  parent.is_visible = 1,
  parent.sort_order = 115,
  parent.menu_level = 1,
  parent.menu_path = '/integrations',
  parent.menu_url = NULL
WHERE parent.menu_code = 'integrations'
  AND parent.deleted_at IS NULL;

UPDATE menu_items child
JOIN menu_items parent ON parent.menu_code = 'integrations' AND parent.deleted_at IS NULL
JOIN permissions permission ON permission.permission_code = 'DTE_ACCESS'
SET
  child.parent_id = parent.id,
  child.menu_name = 'Facturacion electronica',
  child.menu_description = 'Configuracion de emision DTE y proveedor LibreDTE.',
  child.icon_name = 'file-text-line',
  child.menu_url = '/integrations/electronic-billing',
  child.menu_type = 'LINK',
  child.required_permission_id = permission.id,
  child.alternative_permissions = JSON_ARRAY('DTE_ACCESS', 'DTE_VIEW', 'DTE_CONFIG_MANAGE'),
  child.is_active = 1,
  child.is_visible = 1,
  child.sort_order = 10,
  child.menu_level = 2,
  child.menu_path = '/integrations/electronic-billing',
  child.target_window = 'SELF'
WHERE child.menu_code = 'electronic_billing'
  AND child.deleted_at IS NULL;

