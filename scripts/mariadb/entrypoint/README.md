# MariaDB entrypoint order

This directory is mounted as `/docker-entrypoint-initdb.d`; keep only executable bootstrap SQL here.

Filename format:

`yyyymmdd_HHmm_{type}_{name}.sql`

Execution order:

1. `20260610_1300_database_users.sql`: database and application users.
2. `20260610_1310_schema_core.sql`: final table structure with historical `ALTER TABLE` changes folded into `CREATE TABLE`.
3. `20260610_1320_views_core.sql`: valid views regenerated from the current schema.
4. `20260610_1330_routines_core.sql`: stored procedures and functions.
5. `20260610_1340_seed_functional.sql`: functional baseline data such as permissions, roles, menus, statuses, currencies, taxes, measurement units and operational access.
6. `20260610_1350_seeder_demo_data.sql`: demo/testing data such as catalog attributes, products, prices, stock, customers and suppliers.

Legacy incremental scripts were moved to `scripts/mariadb/archive/legacy_entrypoint_20260610` for traceability and are not executed by the container entrypoint.
