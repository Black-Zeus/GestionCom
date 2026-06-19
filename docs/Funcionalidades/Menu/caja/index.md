# Módulo: Caja

**Ruta raíz:** `/cash/*`  
**Permiso de visibilidad:** `CASH_VISIBLE`  
**Estado:** ✅ Implementado

## Descripción

Módulo operativo de caja y punto de venta. Gestiona la apertura y cierre de cajas, el cobro de ventas (incluyendo multi-divisa y pagos mixtos), los movimientos de caja, y la administración de fondos de caja chica.

## Ítems del módulo

| Nombre | Ruta | Permiso adicional | Estado |
|--------|------|-------------------|--------|
| [Puntos de venta](puntos-de-venta.md) | `/cash/sales-points` | `SALES_POINTS_ACCESS` | ✅ |
| [Asignación de operadores](asignacion-operadores.md) | `/cash/operator-assignments` | `OPERATOR_ASSIGNMENTS_ACCESS` | ✅ |
| [Apertura / cierre de caja](apertura-cierre.md) | `/cash/opening` | — | ✅ |
| [Cobro en caja POS](cobro-pos.md) | `/cash/pos` | `CASH_POS_ACCESS` | ✅ |
| [Movimientos de caja](movimientos.md) | `/cash/movements` | — | ✅ |
| [Fondos de caja chica](caja-chica-fondos.md) | `/cash/petty` | `PETTY_CASH_FUNDS_ACCESS` | ✅ |
| [Gastos de caja chica](caja-chica-gastos.md) | `/cash/petty/expenses` | `PETTY_CASH_EXPENSES_ACCESS` | ✅ |
