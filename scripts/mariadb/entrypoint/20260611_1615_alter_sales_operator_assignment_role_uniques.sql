DELIMITER //

DROP PROCEDURE IF EXISTS update_operator_assignment_unique_keys//

CREATE PROCEDURE update_operator_assignment_unique_keys()
BEGIN
  DECLARE cash_columns TEXT DEFAULT NULL;
  DECLARE sales_point_columns TEXT DEFAULT NULL;

  SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',')
    INTO cash_columns
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cash_register_user_assignments'
    AND INDEX_NAME = 'uk_cash_register_user_assignment';

  IF cash_columns IS NOT NULL
     AND cash_columns <> 'cash_register_id,user_id,operator_role' THEN
    ALTER TABLE cash_register_user_assignments
      DROP INDEX uk_cash_register_user_assignment;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'cash_register_user_assignments'
      AND INDEX_NAME = 'uk_cash_register_user_assignment'
  ) THEN
    ALTER TABLE cash_register_user_assignments
      ADD UNIQUE INDEX uk_cash_register_user_assignment (cash_register_id, user_id, operator_role);
  END IF;

  SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',')
    INTO sales_point_columns
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sales_point_user_assignments'
    AND INDEX_NAME = 'uk_sales_point_user_assignment';

  IF sales_point_columns IS NOT NULL
     AND sales_point_columns <> 'sales_point_id,user_id,operator_role' THEN
    ALTER TABLE sales_point_user_assignments
      DROP INDEX uk_sales_point_user_assignment;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_point_user_assignments'
      AND INDEX_NAME = 'uk_sales_point_user_assignment'
  ) THEN
    ALTER TABLE sales_point_user_assignments
      ADD UNIQUE INDEX uk_sales_point_user_assignment (sales_point_id, user_id, operator_role);
  END IF;
END//

CALL update_operator_assignment_unique_keys()//

DROP PROCEDURE IF EXISTS update_operator_assignment_unique_keys//

DELIMITER ;
