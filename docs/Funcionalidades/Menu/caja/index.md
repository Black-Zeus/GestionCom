# Módulo: Caja

**Ruta raíz:** `/cash/*`  
**Permiso de visibilidad:** `CASH_VISIBLE`  
**Estado:** ✅ Implementado

## Descripción

Módulo operativo de caja y punto de venta. Gestiona la apertura y cierre de cajas, el cobro de ventas (incluyendo multi-divisa y pagos mixtos), los movimientos de caja, y la administración de fondos de caja chica.

## Ítems del módulo

| Nombre | Ruta | Permiso adicional | Estado | Detalle |
|--------|------|-------------------|--------|---------|
| Puntos de venta | `/cash/sales-points` | `SALES_POINTS_ACCESS` | ✅ | [→](puntos-de-venta.md) |
| Asignación de operadores | `/cash/operator-assignments` | `OPERATOR_ASSIGNMENTS_ACCESS` | ✅ | [→](asignacion-operadores.md) |
| Apertura / cierre de caja | `/cash/opening` | — | ✅ | [→](apertura-cierre.md) |
| Cobro en caja POS | `/cash/pos` | `CASH_POS_ACCESS` | ✅ | [→](cobro-pos.md) |
| Movimientos de caja | `/cash/movements` | — | ✅ | [→](movimientos.md) |
| Fondos de caja chica | `/cash/petty` | `PETTY_CASH_FUNDS_ACCESS` | ✅ | [→](caja-chica-fondos.md) |
| Gastos de caja chica | `/cash/petty/expenses` | `PETTY_CASH_EXPENSES_ACCESS` | ✅ | [→](caja-chica-gastos.md) |
