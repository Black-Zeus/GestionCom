# Movimientos de caja

**Ruta:** `/cash/movements`  
**Permiso:** `CASH_VISIBLE`  
**Componente:** `CashMovements`  
**Estado:** ✅ Implementado

## Misión

Registro y consulta de movimientos de entrada y salida de efectivo de la caja durante una sesión. Incluye ingresos extraordinarios, egresos, y reposiciones de fondo que no corresponden a ventas directas.

## Funcionalidades implementadas

- Listado de movimientos de la sesión activa
- Registro de ingreso de efectivo con descripción y monto
- Registro de egreso de efectivo con descripción, monto y categoría
- Filtros por tipo de movimiento y rango de fecha
- Resumen acumulado por tipo (ingresos vs. egresos)
