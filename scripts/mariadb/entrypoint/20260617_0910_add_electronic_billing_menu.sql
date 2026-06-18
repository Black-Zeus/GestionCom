-- Menu para mantenedor de facturacion electronica / DTE.

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
  parent.id,
  'electronic_billing',
  'Facturacion electronica',
  'Configuracion de emision DTE y proveedor LibreDTE.',
  'file-text-line',
  NULL,
  '/config/electronic-billing',
  'LINK',
  permission.id,
  JSON_ARRAY('DTE_ACCESS', 'DTE_VIEW', 'DTE_CONFIG_MANAGE'),
  1,
  1,
  0,
  NULL,
  25,
  2,
  '/config/electronic-billing',
  'SELF',
  NULL,
  NULL
FROM menu_items parent
JOIN permissions permission ON permission.permission_code = 'DTE_ACCESS'
WHERE parent.menu_code = 'settings'
  AND NOT EXISTS (
    SELECT 1
    FROM menu_items existing
    WHERE existing.menu_code = 'electronic_billing'
      AND existing.deleted_at IS NULL
  );

