# Tab: Conciliación bancaria

**Pertenece a:** [Bancos y cuentas bancarias](bancos-cuentas.md)  
**Ruta:** `/finance/banking` (tab activo: `reconciliation`)  
**Componente:** `AdminBankReconciliationSettings`  
**Estado:** ✅ Implementado

## Misión

Configuración de los parámetros que rigen el proceso de conciliación bancaria automática. Define tolerancias de fecha y monto, y si la conciliación puede ejecutarse automáticamente o requiere revisión humana.

## Funcionalidades implementadas

- Configuración por cuenta bancaria:
  - Flag: matching por referencia habilitado
  - Flag: matching por monto habilitado
  - Tolerancia de fecha (días)
  - Tolerancia de monto ($)
  - Flag: conciliación automática habilitada
  - Monto a partir del cual se requiere revisión manual
- Activar / desactivar configuración de conciliación
