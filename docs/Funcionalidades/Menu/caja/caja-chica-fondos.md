# Fondos de caja chica

**Ruta:** `/cash/petty`  
**Permiso:** `PETTY_CASH_FUNDS_ACCESS` / `PETTY_CASH_ACCESS` / `PETTY_CASH_FUNDS_MANAGE`  
**Componente:** `AdminPettyCashFunds`  
**Estado:** ✅ Implementado

## Misión

Gestión de los fondos fijos de caja chica asignados a sucursales o áreas. Controla el saldo disponible, las reposiciones y el historial de aprobaciones de cada fondo.

## Funcionalidades implementadas

- Listado de fondos de caja chica por sucursal
- Creación de fondo con monto asignado, responsable y sucursal
- Visualización de saldo disponible vs. saldo asignado
- Solicitud de reposición de fondo
- Flujo de aprobación de reposición (solicitar → aprobar / rechazar)
- Historial de reposiciones del fondo
