-- Mueve Convenios desde menu raiz hacia Finanzas.

UPDATE menu_items agreements
JOIN menu_items finance
  ON finance.menu_code = 'finance'
 AND finance.deleted_at IS NULL
SET agreements.parent_id = finance.id,
    agreements.menu_url = '/finance/agreements',
    agreements.menu_path = '/finance/agreements',
    agreements.menu_level = finance.menu_level + 1,
    agreements.sort_order = 30,
    agreements.is_active = TRUE,
    agreements.is_visible = TRUE,
    agreements.updated_at = NOW()
WHERE agreements.menu_code = 'agreements'
  AND agreements.deleted_at IS NULL;
