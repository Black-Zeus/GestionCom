-- Agrega precios de referencia al catalogo de productos.
-- Estos valores alimentan listas de precio como fuente consistente por producto.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS base_price DECIMAL(15,4) NULL AFTER base_measurement_unit_id,
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(15,4) NULL AFTER base_price;

UPDATE products product
LEFT JOIN (
  SELECT
    price_item.product_id,
    MIN(NULLIF(price_item.base_price, 0)) AS reference_base_price,
    MIN(NULLIF(price_item.cost_price, 0)) AS reference_cost_price
  FROM price_list_items price_item
  WHERE price_item.deleted_at IS NULL
    AND price_item.product_id IS NOT NULL
    AND price_item.is_active = 1
  GROUP BY price_item.product_id
) reference_price ON reference_price.product_id = product.id
SET
  product.base_price = COALESCE(product.base_price, reference_price.reference_base_price),
  product.cost_price = COALESCE(product.cost_price, reference_price.reference_cost_price)
WHERE product.deleted_at IS NULL;
