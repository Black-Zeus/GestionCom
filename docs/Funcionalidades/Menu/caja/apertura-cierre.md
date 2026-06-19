# Apertura / cierre de caja

**Ruta:** `/cash/opening`  
**Permiso:** `CASH_VISIBLE`  
**Componente:** `CashOpening`  
**Estado:** ✅ Implementado

## Misión

Pantalla central de gestión del turno de caja. Permite al cajero abrir una sesión de caja registrando el fondo inicial (arqueo de apertura), consultar el estado de la sesión activa, y cerrar el turno con el arqueo final.

## Funcionalidades implementadas

- Visualización de estado de sesión activa (caja abierta / cerrada)
- Apertura de caja con ingreso de fondo inicial por denominación (billetes y monedas)
- Resumen de ventas y movimientos de la sesión en curso
- Cierre de caja con arqueo final por denominación
- Diferencia entre monto esperado y monto contado
- Historial de sesiones anteriores con detalle de aperturas y cierres
- Derivación al módulo de Arqueo (`/cash/count`) para el conteo detallado

> El arqueo detallado (CashCount) es un sub-componente accesible desde esta pantalla durante el proceso de apertura/cierre.
