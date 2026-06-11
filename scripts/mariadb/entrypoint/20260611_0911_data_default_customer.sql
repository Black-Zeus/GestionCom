START TRANSACTION;

DELETE cau
FROM customer_authorized_users cau
JOIN customers c ON c.id = cau.customer_id
WHERE c.customer_code IN ('DEMO_CUS_001', 'DEMO_CUS_002');

DELETE ccc
FROM customer_credit_config ccc
JOIN customers c ON c.id = ccc.customer_id
WHERE c.customer_code IN ('DEMO_CUS_001', 'DEMO_CUS_002');

DELETE FROM customers
WHERE customer_code IN ('DEMO_CUS_001', 'DEMO_CUS_002')
  AND tax_id IN ('11111111-1', '22222222-2');

INSERT INTO customers (
  customer_code,
  customer_type,
  tax_id,
  legal_name,
  commercial_name,
  business_activity,
  contact_person,
  email,
  phone,
  mobile,
  address,
  city,
  region,
  country,
  price_list_id,
  default_currency_code,
  sales_rep_user_id,
  status_id,
  is_credit_customer,
  registration_date,
  notes,
  internal_notes,
  created_by_user_id
) VALUES (
  'DEFAULT_CUSTOMER',
  'INDIVIDUAL',
  '66666666-6',
  'Cliente Generico',
  'Cliente Generico',
  'Cliente final',
  'Cliente Generico',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'Chile',
  NULL,
  'CLP',
  NULL,
  6,
  0,
  CURDATE(),
  'Cliente por defecto para ventas sin cliente identificado.',
  'Cliente funcional creado para presugerencia en Nueva Venta.',
  NULL
)
ON DUPLICATE KEY UPDATE
  customer_code = VALUES(customer_code),
  tax_id = VALUES(tax_id),
  customer_type = VALUES(customer_type),
  legal_name = VALUES(legal_name),
  commercial_name = VALUES(commercial_name),
  business_activity = VALUES(business_activity),
  contact_person = VALUES(contact_person),
  default_currency_code = VALUES(default_currency_code),
  sales_rep_user_id = VALUES(sales_rep_user_id),
  status_id = VALUES(status_id),
  is_credit_customer = VALUES(is_credit_customer),
  notes = VALUES(notes),
  internal_notes = VALUES(internal_notes),
  deleted_at = NULL;

COMMIT;
