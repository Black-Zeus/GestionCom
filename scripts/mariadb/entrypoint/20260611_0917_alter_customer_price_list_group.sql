DELIMITER //

DROP PROCEDURE IF EXISTS add_customer_price_list_group//

CREATE PROCEDURE add_customer_price_list_group()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'customers'
      AND COLUMN_NAME = 'price_list_group_id'
  ) THEN
    ALTER TABLE customers
      ADD COLUMN price_list_group_id BIGINT(20) UNSIGNED DEFAULT NULL
        AFTER postal_code;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'customers'
      AND INDEX_NAME = 'idx_customers_price_list_group_id'
  ) THEN
    ALTER TABLE customers
      ADD KEY idx_customers_price_list_group_id (price_list_group_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'customers'
      AND CONSTRAINT_NAME = 'fk_customers_price_list_group'
  ) THEN
    ALTER TABLE customers
      ADD CONSTRAINT fk_customers_price_list_group
      FOREIGN KEY (price_list_group_id)
      REFERENCES price_list_groups (id)
      ON DELETE SET NULL;
  END IF;
END//

CALL add_customer_price_list_group()//

DROP PROCEDURE IF EXISTS add_customer_price_list_group//

DELIMITER ;

UPDATE customers c
JOIN price_lists pl ON pl.id = c.price_list_id
SET c.price_list_group_id = pl.price_list_group_id
WHERE c.price_list_group_id IS NULL
  AND pl.price_list_group_id IS NOT NULL;

UPDATE customers c
JOIN price_list_groups plg ON plg.group_code = 'PLCAT_RETAIL'
LEFT JOIN price_lists pl ON pl.price_list_group_id = plg.id
  AND pl.is_active = 1
  AND pl.deleted_at IS NULL
SET c.price_list_group_id = plg.id,
    c.price_list_id = COALESCE(c.price_list_id, pl.id)
WHERE c.customer_code = 'DEFAULT_CUSTOMER';
