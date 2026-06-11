USE inventario;

-- Valid views regenerated from current database. Legacy invalid views are intentionally omitted.
-- View: v_cash_flow_period
CREATE
OR REPLACE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_cash_flow_period` AS
select
    cast(`cm`.`created_at` as date) AS `movement_date`,
    `cr`.`register_code` AS `register_code`,
    `w`.`warehouse_name` AS `warehouse_name`,
    `cm`.`movement_type` AS `movement_type`,
    `pm`.`method_name` AS `payment_method`,
    count(`cm`.`id`) AS `transaction_count`,
    sum(`cm`.`amount`) AS `total_amount`,
    sum(`cm`.`change_amount`) AS `total_change`,
    sum(`cm`.`received_amount`) AS `total_received`
from
    (
        (
            (
                (
                    `cash_movements` `cm`
                    join `cash_register_sessions` `crs` on(`cm`.`cash_register_session_id` = `crs`.`id`)
                )
                join `cash_registers` `cr` on(`crs`.`cash_register_id` = `cr`.`id`)
            )
            join `warehouses` `w` on(`cr`.`warehouse_id` = `w`.`id`)
        )
        join `payment_methods` `pm` on(`cm`.`payment_method_id` = `pm`.`id`)
    )
where
    `cr`.`deleted_at` is null
    and `w`.`deleted_at` is null
    and `pm`.`deleted_at` is null
group by
    cast(`cm`.`created_at` as date),
    `cr`.`id`,
    `cm`.`movement_type`,
    `pm`.`id`
order by
    cast(`cm`.`created_at` as date) desc,
    `cr`.`register_code`;

-- View: v_current_prices
CREATE
OR REPLACE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_current_prices` AS
select
    `pv`.`id` AS `product_variant_id`,
    `pv`.`variant_sku` AS `variant_sku`,
    `p`.`product_name` AS `product_name`,
    `pl`.`price_list_code` AS `price_list_code`,
    `pl`.`price_list_name` AS `price_list_name`,
    `mu`.`unit_code` AS `unit_code`,
    `mu`.`unit_name` AS `unit_name`,
    `pli`.`sale_price` AS `sale_price`,
    `pli`.`cost_price` AS `cost_price`,
    `pli`.`margin_percentage` AS `margin_percentage`,
    `pl`.`valid_from` AS `valid_from`,
    `pl`.`valid_to` AS `valid_to`
from
    (
        (
            (
                (
                    `product_variants` `pv`
                    join `products` `p` on(`pv`.`product_id` = `p`.`id`)
                )
                join `price_list_items` `pli` on(`pv`.`id` = `pli`.`product_variant_id`)
            )
            join `price_lists` `pl` on(`pli`.`price_list_id` = `pl`.`id`)
        )
        join `measurement_units` `mu` on(`pli`.`measurement_unit_id` = `mu`.`id`)
    )
where
    `p`.`deleted_at` is null
    and `pv`.`deleted_at` is null
    and `pl`.`deleted_at` is null
    and `mu`.`deleted_at` is null
    and `pl`.`is_active` = 1
    and `pli`.`is_active` = 1
    and curdate() between `pl`.`valid_from`
    and coalesce(`pl`.`valid_to`, '9999-12-31');

-- View: v_document_payment_breakdown
CREATE
OR REPLACE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_document_payment_breakdown` AS
select
    `d`.`id` AS `document_id`,
    `d`.`document_number` AS `document_number`,
    `d`.`document_date` AS `document_date`,
    `d`.`total_amount` AS `total_amount`,
    count(`dpd`.`id`) AS `payment_methods_count`,
    sum(`dpd`.`payment_amount`) AS `total_paid`,
    sum(`dpd`.`change_amount`) AS `total_change`,
    group_concat(
        concat(
            `pm`.`method_name`,
            ': $',
            format(`dpd`.`payment_amount`, 2)
        )
        order by
            `dpd`.`payment_order` ASC separator ' | '
    ) AS `payment_breakdown`,
case
        when abs(`d`.`total_amount` - sum(`dpd`.`payment_amount`)) < 0.01 then 'BALANCED'
        when `d`.`total_amount` > sum(`dpd`.`payment_amount`) then 'UNDERPAID'
        else 'OVERPAID'
    end AS `payment_status`,
    `d`.`total_amount` - sum(`dpd`.`payment_amount`) AS `balance_difference`
from
    (
        (
            `documents` `d`
            join `document_payment_details` `dpd` on(`d`.`id` = `dpd`.`document_id`)
        )
        join `payment_methods` `pm` on(`dpd`.`payment_method_id` = `pm`.`id`)
    )
where
    `d`.`deleted_at` is null
    and `pm`.`deleted_at` is null
group by
    `d`.`id`
order by
    `d`.`document_date` desc;

-- View: v_dte_documents
CREATE
OR REPLACE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_dte_documents` AS
select
    `d`.`id` AS `id`,
    `d`.`document_number` AS `document_number`,
    `d`.`document_date` AS `document_date`,
    `dt`.`document_type_name` AS `document_type_name`,
    `d`.`dte_type_code` AS `dte_type_code`,
    `d`.`dte_folio` AS `dte_folio`,
    `d`.`dte_status` AS `dte_status`,
    `d`.`total_amount` AS `total_amount`,
    `d`.`rut_emisor` AS `rut_emisor`,
    `d`.`rut_receptor` AS `rut_receptor`,
    `d`.`customer_supplier_name` AS `customer_supplier_name`,
    `d`.`ambiente_dte` AS `ambiente_dte`,
    `d`.`dte_sent_date` AS `dte_sent_date`,
    `d`.`dte_accepted_date` AS `dte_accepted_date`,
case
        when `d`.`dte_status` = 'ACCEPTED' then 'Aceptado por SII'
        when `d`.`dte_status` = 'SENT' then 'Enviado al SII'
        when `d`.`dte_status` = 'REJECTED' then 'Rechazado por SII'
        when `d`.`dte_status` = 'CANCELLED' then 'Anulado'
        else 'Borrador'
    end AS `status_description`,
    `d`.`created_at` AS `created_at`,
    `d`.`created_by_user_id` AS `created_by_user_id`
from
    (
        `documents` `d`
        join `document_types` `dt` on(`d`.`document_type_id` = `dt`.`id`)
    )
where
    `d`.`dte_type_code` is not null
    and `d`.`deleted_at` is null
order by
    `d`.`created_at` desc;

-- View: v_menu_hierarchy
CREATE
OR REPLACE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_menu_hierarchy` AS with recursive menu_tree as (
    select
        `m`.`id` AS `id`,
        `m`.`parent_id` AS `parent_id`,
        `m`.`menu_code` AS `menu_code`,
        `m`.`menu_name` AS `menu_name`,
        `m`.`menu_description` AS `menu_description`,
        `m`.`icon_name` AS `icon_name`,
        `m`.`icon_color` AS `icon_color`,
        `m`.`menu_url` AS `menu_url`,
        `m`.`menu_type` AS `menu_type`,
        `m`.`required_permission_id` AS `required_permission_id`,
        `p`.`permission_code` AS `required_permission_code`,
        `m`.`is_active` AS `is_active`,
        `m`.`is_visible` AS `is_visible`,
        `m`.`sort_order` AS `sort_order`,
        `m`.`menu_level` AS `menu_level`,
        `m`.`menu_path` AS `menu_path`,
        `m`.`target_window` AS `target_window`,
        `m`.`css_classes` AS `css_classes`,
        cast(`m`.`menu_name` as char(1000) charset utf8mb3) AS `full_path`
    from
        (
            `menu_items` `m`
            left join `permissions` `p` on(`m`.`required_permission_id` = `p`.`id`)
        )
    where
        `m`.`parent_id` is null
        and `m`.`deleted_at` is null
    union
    all
    select
        `m`.`id` AS `id`,
        `m`.`parent_id` AS `parent_id`,
        `m`.`menu_code` AS `menu_code`,
        `m`.`menu_name` AS `menu_name`,
        `m`.`menu_description` AS `menu_description`,
        `m`.`icon_name` AS `icon_name`,
        `m`.`icon_color` AS `icon_color`,
        `m`.`menu_url` AS `menu_url`,
        `m`.`menu_type` AS `menu_type`,
        `m`.`required_permission_id` AS `required_permission_id`,
        `p`.`permission_code` AS `required_permission_code`,
        `m`.`is_active` AS `is_active`,
        `m`.`is_visible` AS `is_visible`,
        `m`.`sort_order` AS `sort_order`,
        `m`.`menu_level` AS `menu_level`,
        `m`.`menu_path` AS `menu_path`,
        `m`.`target_window` AS `target_window`,
        `m`.`css_classes` AS `css_classes`,
        concat(`mt`.`full_path`, ' > ', `m`.`menu_name`) AS `full_path`
    from
        (
            (
                `menu_items` `m`
                join `menu_tree` `mt` on(`m`.`parent_id` = `mt`.`id`)
            )
            left join `permissions` `p` on(`m`.`required_permission_id` = `p`.`id`)
        )
    where
        `m`.`deleted_at` is null
)
select
    `menu_tree`.`id` AS `id`,
    `menu_tree`.`parent_id` AS `parent_id`,
    `menu_tree`.`menu_code` AS `menu_code`,
    `menu_tree`.`menu_name` AS `menu_name`,
    `menu_tree`.`menu_description` AS `menu_description`,
    `menu_tree`.`icon_name` AS `icon_name`,
    `menu_tree`.`icon_color` AS `icon_color`,
    `menu_tree`.`menu_url` AS `menu_url`,
    `menu_tree`.`menu_type` AS `menu_type`,
    `menu_tree`.`required_permission_id` AS `required_permission_id`,
    `menu_tree`.`required_permission_code` AS `required_permission_code`,
    `menu_tree`.`is_active` AS `is_active`,
    `menu_tree`.`is_visible` AS `is_visible`,
    `menu_tree`.`sort_order` AS `sort_order`,
    `menu_tree`.`menu_level` AS `menu_level`,
    `menu_tree`.`menu_path` AS `menu_path`,
    `menu_tree`.`target_window` AS `target_window`,
    `menu_tree`.`css_classes` AS `css_classes`,
    `menu_tree`.`full_path` AS `full_path`
from
    `menu_tree`
order by
    `menu_tree`.`menu_level`,
    `menu_tree`.`sort_order`,
    `menu_tree`.`menu_name`;

-- View: v_menu_tree_structure
CREATE
OR REPLACE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_menu_tree_structure` AS with recursive menu_hierarchy as (
    select
        `m`.`id` AS `id`,
        `m`.`parent_id` AS `parent_id`,
        `m`.`menu_code` AS `menu_code`,
        `m`.`menu_name` AS `menu_name`,
        `m`.`icon_name` AS `icon_name`,
        `m`.`icon_color` AS `icon_color`,
        `m`.`menu_url` AS `menu_url`,
        `m`.`menu_type` AS `menu_type`,
        `m`.`sort_order` AS `sort_order`,
        `m`.`menu_level` AS `menu_level`,
        cast(`m`.`id` as char(200) charset utf8mb3) AS `path`,
        json_object(
            'id',
            `m`.`id`,
            'code',
            `m`.`menu_code`,
            'name',
            `m`.`menu_name`,
            'icon',
            `m`.`icon_name`,
            'iconColor',
            `m`.`icon_color`,
            'url',
            `m`.`menu_url`,
            'type',
            `m`.`menu_type`,
            'level',
            `m`.`menu_level`,
            'children',
            json_array()
        ) AS `menu_node`
    from
        `menu_items` `m`
    where
        `m`.`parent_id` is null
        and `m`.`deleted_at` is null
        and `m`.`is_active` = 1
        and `m`.`is_visible` = 1
    union
    all
    select
        `m`.`id` AS `id`,
        `m`.`parent_id` AS `parent_id`,
        `m`.`menu_code` AS `menu_code`,
        `m`.`menu_name` AS `menu_name`,
        `m`.`icon_name` AS `icon_name`,
        `m`.`icon_color` AS `icon_color`,
        `m`.`menu_url` AS `menu_url`,
        `m`.`menu_type` AS `menu_type`,
        `m`.`sort_order` AS `sort_order`,
        `m`.`menu_level` AS `menu_level`,
        concat(`mh`.`path`, '->', `m`.`id`) AS `path`,
        json_object(
            'id',
            `m`.`id`,
            'code',
            `m`.`menu_code`,
            'name',
            `m`.`menu_name`,
            'icon',
            `m`.`icon_name`,
            'iconColor',
            `m`.`icon_color`,
            'url',
            `m`.`menu_url`,
            'type',
            `m`.`menu_type`,
            'level',
            `m`.`menu_level`,
            'children',
            json_array()
        ) AS `menu_node`
    from
        (
            `menu_items` `m`
            join `menu_hierarchy` `mh` on(`m`.`parent_id` = `mh`.`id`)
        )
    where
        `m`.`deleted_at` is null
        and `m`.`is_active` = 1
        and `m`.`is_visible` = 1
)
select
    `menu_hierarchy`.`id` AS `id`,
    `menu_hierarchy`.`parent_id` AS `parent_id`,
    `menu_hierarchy`.`menu_code` AS `menu_code`,
    `menu_hierarchy`.`menu_name` AS `menu_name`,
    `menu_hierarchy`.`icon_name` AS `icon_name`,
    `menu_hierarchy`.`icon_color` AS `icon_color`,
    `menu_hierarchy`.`menu_url` AS `menu_url`,
    `menu_hierarchy`.`menu_type` AS `menu_type`,
    `menu_hierarchy`.`sort_order` AS `sort_order`,
    `menu_hierarchy`.`menu_level` AS `menu_level`,
    `menu_hierarchy`.`path` AS `path`,
    `menu_hierarchy`.`menu_node` AS `menu_node`
from
    `menu_hierarchy`
order by
    `menu_hierarchy`.`menu_level`,
    `menu_hierarchy`.`sort_order`;

-- View: v_menu_usage_stats
CREATE
OR REPLACE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_menu_usage_stats` AS
select
    `m`.`menu_code` AS `menu_code`,
    `m`.`menu_name` AS `menu_name`,
    `m`.`menu_url` AS `menu_url`,
    count(`mal`.`id`) AS `total_accesses`,
    count(distinct `mal`.`user_id`) AS `unique_users`,
    count(distinct cast(`mal`.`access_timestamp` as date)) AS `active_days`,
    max(`mal`.`access_timestamp`) AS `last_access`,
    avg(`daily_access`.`daily_count`) AS `avg_daily_accesses`
from
    (
        (
            `menu_items` `m`
            left join `menu_access_log` `mal` on(`m`.`id` = `mal`.`menu_item_id`)
        )
        left join (
            select
                `menu_access_log`.`menu_item_id` AS `menu_item_id`,
                cast(`menu_access_log`.`access_timestamp` as date) AS `access_date`,
                count(0) AS `daily_count`
            from
                `menu_access_log`
            group by
                `menu_access_log`.`menu_item_id`,
                cast(`menu_access_log`.`access_timestamp` as date)
        ) `daily_access` on(`m`.`id` = `daily_access`.`menu_item_id`)
    )
where
    `m`.`deleted_at` is null
group by
    `m`.`id`
order by
    count(`mal`.`id`) desc;

-- View: v_physical_inventory_differences
CREATE
OR REPLACE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_physical_inventory_differences` AS
select
    `pic`.`id` AS `count_id`,
    `pic`.`count_code` AS `count_code`,
    `w`.`warehouse_code` AS `warehouse_code`,
    `w`.`warehouse_name` AS `warehouse_name`,
    `wz`.`zone_code` AS `zone_code`,
    `wz`.`zone_name` AS `zone_name`,
    `wzl`.`location_code` AS `location_code`,
    `wzl`.`location_name` AS `location_name`,
    `pv`.`variant_sku` AS `variant_sku`,
    `pv`.`variant_name` AS `variant_name`,
    `p`.`product_code` AS `product_code`,
    `p`.`product_name` AS `product_name`,
    `pici`.`system_quantity` AS `system_quantity`,
    `pici`.`counted_quantity` AS `counted_quantity`,
    `pici`.`difference_quantity` AS `difference_quantity`,
    `pici`.`difference_cost` AS `difference_cost`,
    `pici`.`review_status` AS `review_status`
from
    (
        (
            (
                (
                    (
                        (
                            `physical_inventory_count_items` `pici`
                            join `physical_inventory_counts` `pic` on(
                                `pic`.`id` = `pici`.`physical_inventory_count_id`
                            )
                        )
                        join `warehouses` `w` on(`w`.`id` = `pic`.`warehouse_id`)
                    )
                    left join `warehouse_zones` `wz` on(`wz`.`id` = `pici`.`warehouse_zone_id`)
                )
                left join `warehouse_zone_locations` `wzl` on(`wzl`.`id` = `pici`.`warehouse_zone_location_id`)
            )
            join `product_variants` `pv` on(`pv`.`id` = `pici`.`product_variant_id`)
        )
        join `products` `p` on(`p`.`id` = `pv`.`product_id`)
    )
where
    `pici`.`difference_quantity` <> 0;

-- View: v_products_stock
CREATE
OR REPLACE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_products_stock` AS
select
    `p`.`id` AS `product_id`,
    `p`.`product_code` AS `product_code`,
    `p`.`product_name` AS `product_name`,
    `pv`.`id` AS `product_variant_id`,
    `pv`.`variant_sku` AS `variant_sku`,
    `pv`.`variant_name` AS `variant_name`,
    `c`.`category_name` AS `category_name`,
    `w`.`warehouse_code` AS `warehouse_code`,
    `w`.`warehouse_name` AS `warehouse_name`,
    `s`.`current_quantity` AS `current_quantity`,
    `s`.`reserved_quantity` AS `reserved_quantity`,
    `s`.`available_quantity` AS `available_quantity`,
    `s`.`minimum_stock` AS `minimum_stock`,
    `s`.`maximum_stock` AS `maximum_stock`,
case
        when `s`.`available_quantity` <= `s`.`minimum_stock` then 'LOW'
        when `s`.`available_quantity` = 0 then 'OUT_OF_STOCK'
        else 'OK'
    end AS `stock_status`,
    `s`.`last_movement_date` AS `last_movement_date`
from
    (
        (
            (
                (
                    `products` `p`
                    join `product_variants` `pv` on(`p`.`id` = `pv`.`product_id`)
                )
                join `categories` `c` on(`p`.`category_id` = `c`.`id`)
            )
            left join `stock` `s` on(`pv`.`id` = `s`.`product_variant_id`)
        )
        left join `warehouses` `w` on(`s`.`warehouse_id` = `w`.`id`)
    )
where
    `p`.`deleted_at` is null
    and `pv`.`deleted_at` is null
    and `c`.`deleted_at` is null
    and (
        `w`.`deleted_at` is null
        or `w`.`id` is null
    );

-- View: v_purchase_receipt_summary
CREATE
OR REPLACE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_purchase_receipt_summary` AS
select
    `pr`.`id` AS `purchase_receipt_id`,
    `pr`.`receipt_code` AS `receipt_code`,
    `po`.`purchase_order_code` AS `purchase_order_code`,
    `s`.`supplier_code` AS `supplier_code`,
    `s`.`legal_name` AS `supplier_name`,
    `w`.`warehouse_code` AS `warehouse_code`,
    `w`.`warehouse_name` AS `warehouse_name`,
    `pr`.`receipt_date` AS `receipt_date`,
    `ss`.`status_display_es` AS `status_name`,
    count(`pri`.`id`) AS `item_count`,
    coalesce(
        sum(`pri`.`accepted_quantity` * `pri`.`unit_cost`),
        0
    ) AS `accepted_cost_total`,
    coalesce(sum(`pri`.`rejected_quantity`), 0) AS `rejected_quantity_total`
from
    (
        (
            (
                (
                    (
                        `purchase_receipts` `pr`
                        join `suppliers` `s` on(`s`.`id` = `pr`.`supplier_id`)
                    )
                    join `warehouses` `w` on(`w`.`id` = `pr`.`warehouse_id`)
                )
                left join `purchase_orders` `po` on(`po`.`id` = `pr`.`purchase_order_id`)
            )
            left join `purchase_receipt_items` `pri` on(`pri`.`purchase_receipt_id` = `pr`.`id`)
        )
        left join `system_statuses` `ss` on(`ss`.`id` = `pr`.`status_id`)
    )
where
    `pr`.`deleted_at` is null
group by
    `pr`.`id`,
    `pr`.`receipt_code`,
    `po`.`purchase_order_code`,
    `s`.`supplier_code`,
    `s`.`legal_name`,
    `w`.`warehouse_code`,
    `w`.`warehouse_name`,
    `pr`.`receipt_date`,
    `ss`.`status_display_es`;

-- View: v_recent_stock_movements
CREATE
OR REPLACE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_recent_stock_movements` AS
select
    `sm`.`id` AS `id`,
    `p`.`product_code` AS `product_code`,
    `p`.`product_name` AS `product_name`,
    `pv`.`variant_sku` AS `variant_sku`,
    `pv`.`variant_name` AS `variant_name`,
    `w`.`warehouse_code` AS `warehouse_code`,
    `w`.`warehouse_name` AS `warehouse_name`,
    `wz`.`zone_code` AS `zone_code`,
    `wz`.`zone_name` AS `zone_name`,
    `wzl`.`location_code` AS `location_code`,
    `wzl`.`location_name` AS `location_name`,
    `sm`.`movement_type` AS `movement_type`,
    `sm`.`reference_type` AS `reference_type`,
    `sm`.`quantity` AS `quantity`,
    `sm`.`quantity_before` AS `quantity_before`,
    `sm`.`quantity_after` AS `quantity_after`,
    `sm`.`batch_lot_number` AS `batch_lot_number`,
    `sm`.`expiry_date` AS `expiry_date`,
    `sm`.`serial_number` AS `serial_number`,
    `u`.`username` AS `created_by`,
    `sm`.`created_at` AS `created_at`
from
    (
        (
            (
                (
                    (
                        (
                            `stock_movements` `sm`
                            join `product_variants` `pv` on(`sm`.`product_variant_id` = `pv`.`id`)
                        )
                        join `products` `p` on(`pv`.`product_id` = `p`.`id`)
                    )
                    join `warehouses` `w` on(`sm`.`warehouse_id` = `w`.`id`)
                )
                left join `warehouse_zones` `wz` on(`sm`.`warehouse_zone_id` = `wz`.`id`)
            )
            left join `warehouse_zone_locations` `wzl` on(`sm`.`warehouse_zone_location_id` = `wzl`.`id`)
        )
        join `users` `u` on(`sm`.`created_by_user_id` = `u`.`id`)
    )
where
    `p`.`deleted_at` is null
    and `pv`.`deleted_at` is null
    and `w`.`deleted_at` is null
    and `u`.`deleted_at` is null
order by
    `sm`.`created_at` desc;

-- View: v_supplier_balance
CREATE
OR REPLACE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_supplier_balance` AS
select
    `s`.`id` AS `supplier_id`,
    `s`.`supplier_code` AS `supplier_code`,
    `s`.`legal_name` AS `legal_name`,
    `s`.`tax_id` AS `tax_id`,
    coalesce(sum(`ap`.`original_amount`), 0) AS `total_invoiced`,
    coalesce(sum(`ap`.`paid_amount`), 0) AS `total_paid`,
    coalesce(sum(`ap`.`current_balance`), 0) AS `current_balance`,
    coalesce(
        sum(
            case
                when `ap`.`due_date` < curdate()
                and `ap`.`current_balance` > 0 then `ap`.`current_balance`
                else 0
            end
        ),
        0
    ) AS `overdue_balance`,
    count(`ap`.`id`) AS `payable_count`
from
    (
        `suppliers` `s`
        left join `accounts_payable` `ap` on(`ap`.`supplier_id` = `s`.`id`)
    )
where
    `s`.`deleted_at` is null
group by
    `s`.`id`,
    `s`.`supplier_code`,
    `s`.`legal_name`,
    `s`.`tax_id`;

-- View: v_tax_book_summary
CREATE
OR REPLACE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_tax_book_summary` AS
select
    `tp`.`tax_year` AS `tax_year`,
    `tp`.`tax_month` AS `tax_month`,
    `tbe`.`book_type` AS `book_type`,
    count(`tbe`.`id`) AS `document_count`,
    coalesce(sum(`tbe`.`net_amount`), 0) AS `net_amount`,
    coalesce(sum(`tbe`.`exempt_amount`), 0) AS `exempt_amount`,
    coalesce(sum(`tbe`.`tax_amount`), 0) AS `tax_amount`,
    coalesce(sum(`tbe`.`total_amount`), 0) AS `total_amount`
from
    (
        `tax_book_entries` `tbe`
        join `tax_periods` `tp` on(`tp`.`id` = `tbe`.`tax_period_id`)
    )
group by
    `tp`.`tax_year`,
    `tp`.`tax_month`,
    `tbe`.`book_type`;

-- View: v_transfer_reception_differences
CREATE
OR REPLACE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_transfer_reception_differences` AS
select
    `tr`.`id` AS `transfer_reception_id`,
    `tr`.`reception_code` AS `reception_code`,
    `tr`.`transfer_document_id` AS `transfer_document_id`,
    `sw`.`warehouse_code` AS `source_warehouse_code`,
    `tw`.`warehouse_code` AS `target_warehouse_code`,
    `pv`.`variant_sku` AS `variant_sku`,
    `pv`.`variant_name` AS `variant_name`,
    `tri`.`shipped_quantity` AS `shipped_quantity`,
    `tri`.`received_quantity` AS `received_quantity`,
    `tri`.`difference_quantity` AS `difference_quantity`,
    `tri`.`difference_reason` AS `difference_reason`
from
    (
        (
            (
                (
                    `transfer_reception_items` `tri`
                    join `transfer_receptions` `tr` on(`tr`.`id` = `tri`.`transfer_reception_id`)
                )
                join `warehouses` `sw` on(`sw`.`id` = `tr`.`source_warehouse_id`)
            )
            join `warehouses` `tw` on(`tw`.`id` = `tr`.`target_warehouse_id`)
        )
        join `product_variants` `pv` on(`pv`.`id` = `tri`.`product_variant_id`)
    )
where
    `tri`.`difference_quantity` <> 0;

-- View: v_user_favorites_menu
CREATE
OR REPLACE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_user_favorites_menu` AS
select
    `u`.`id` AS `user_id`,
    `u`.`username` AS `username`,
    `m`.`id` AS `menu_item_id`,
    `m`.`menu_code` AS `menu_code`,
    `m`.`menu_name` AS `menu_name`,
    `m`.`icon_name` AS `icon_name`,
    `m`.`icon_color` AS `icon_color`,
    `m`.`menu_url` AS `menu_url`,
    `umf`.`favorite_order` AS `favorite_order`,
    `umf`.`created_at` AS `favorited_at`
from
    (
        (
            `users` `u`
            join `user_menu_favorites` `umf` on(`u`.`id` = `umf`.`user_id`)
        )
        join `menu_items` `m` on(`umf`.`menu_item_id` = `m`.`id`)
    )
where
    `u`.`deleted_at` is null
    and `m`.`deleted_at` is null
    and `m`.`is_active` = 1
order by
    `u`.`id`,
    `umf`.`favorite_order`;

-- View: v_user_menu
CREATE
OR REPLACE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_user_menu` AS
select
    distinct `u`.`id` AS `user_id`,
    `u`.`username` AS `username`,
    `m`.`id` AS `menu_item_id`,
    `m`.`parent_id` AS `parent_id`,
    `m`.`menu_code` AS `menu_code`,
    `m`.`menu_name` AS `menu_name`,
    `m`.`menu_description` AS `menu_description`,
    `m`.`icon_name` AS `icon_name`,
    `m`.`icon_color` AS `icon_color`,
    `m`.`menu_url` AS `menu_url`,
    `m`.`menu_type` AS `menu_type`,
    `m`.`sort_order` AS `sort_order`,
    `m`.`menu_level` AS `menu_level`,
    `m`.`menu_path` AS `menu_path`,
    `m`.`target_window` AS `target_window`,
    `m`.`css_classes` AS `css_classes`,
    `m`.`data_attributes` AS `data_attributes`,
    `m`.`required_permission_id` AS `required_permission_id`,
    `p`.`permission_code` AS `required_permission`,
case
        when `umf`.`id` is not null then 1
        else 0
    end AS `is_favorite`,
    `umf`.`favorite_order` AS `favorite_order`,
case
        when `m`.`required_permission_id` is null then 1
        when `user_perms`.`has_permission` = 1 then 1
        else 0
    end AS `has_access`
from
    (
        (
            (
                (
                    `users` `u`
                    join `menu_items` `m`
                )
                left join `permissions` `p` on(`m`.`required_permission_id` = `p`.`id`)
            )
            left join `user_menu_favorites` `umf` on(
                `u`.`id` = `umf`.`user_id`
                and `m`.`id` = `umf`.`menu_item_id`
            )
        )
        left join (
            select
                distinct `u`.`id` AS `user_id`,
                `rp`.`permission_id` AS `permission_id`,
                1 AS `has_permission`
            from
                (
                    (
                        (
                            `users` `u`
                            join `user_roles` `ur` on(`u`.`id` = `ur`.`user_id`)
                        )
                        join `role_permissions` `rp` on(`ur`.`role_id` = `rp`.`role_id`)
                    )
                    join `permissions` `p` on(`rp`.`permission_id` = `p`.`id`)
                )
            where
                `u`.`deleted_at` is null
            union
            select
                distinct `up`.`user_id` AS `user_id`,
                `up`.`permission_id` AS `permission_id`,
case
                    when `up`.`permission_type` = 'GRANT' then 1
                    else 0
                end AS `has_permission`
            from
                `user_permissions` `up`
            where
                `up`.`expires_at` is null
                or `up`.`expires_at` > current_timestamp()
        ) `user_perms` on(
            `u`.`id` = `user_perms`.`user_id`
            and `m`.`required_permission_id` = `user_perms`.`permission_id`
        )
    )
where
    `u`.`deleted_at` is null
    and `m`.`deleted_at` is null
    and `m`.`is_active` = 1
    and `m`.`is_visible` = 1
    and (
        `m`.`required_permission_id` is null
        or `user_perms`.`has_permission` = 1
    )
order by
    `u`.`id`,
    `m`.`menu_level`,
    `m`.`sort_order`,
    `m`.`menu_name`;