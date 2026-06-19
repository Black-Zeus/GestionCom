# Gastos de caja chica

**Ruta:** `/cash/petty/expenses`  
**Permiso:** `PETTY_CASH_EXPENSES_ACCESS` / `PETTY_CASH_EXPENSES_CREATE` / `PETTY_CASH_SPEND`  
**Componente:** `PettyCashExpenses`  
**Estado:** ✅ Implementado

## Misión

Registro y gestión de los gastos imputados a un fondo de caja chica. Permite al responsable del fondo ingresar comprobantes de gasto y a los aprobadores validarlos antes de que afecten el saldo disponible.

## Funcionalidades implementadas

- Listado de gastos pendientes y aprobados por fondo
- Registro de gasto con:
  - Monto, fecha, categoría de gasto
  - Descripción del concepto
  - Adjunto de comprobante (imagen/PDF)
- Flujo de aprobación (pendiente → aprobar / rechazar)
- Filtros por categoría, estado y rango de fechas
- Resumen de gastos acumulados por categoría
