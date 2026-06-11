-- Oculta opciones que ahora se acceden desde acciones del cliente.
-- Creditos/limites y personas autorizadas dependen del cliente seleccionado.

UPDATE menu_items
SET
  is_active = FALSE,
  is_visible = FALSE,
  sort_order = 999,
  menu_description = 'Opcion dependiente de cliente; se accede desde acciones del mantenedor de clientes.'
WHERE menu_code IN ('customer_credit', 'authorized_persons');
