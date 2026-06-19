# Tab: Crédito de cliente

**Pertenece a:** [Listado de clientes](clientes.md)  
**Ruta:** `/customers` (tab activo: `credit`) o `/customers/credit?customer_id=X`  
**Componente:** `AdminCustomerCredit`  
**Estado:** ✅ Implementado

## Misión

Configuración de las condiciones de crédito comercial de un cliente. Define límites, plazos, penalidades por mora y las reglas de operación permitidas para el cliente en el flujo de ventas.

## Funcionalidades implementadas

- Visualización y edición de condiciones de crédito por cliente:
  - Límite de crédito ($)
  - Plazo de pago (días)
  - Días de gracia
  - Porcentaje de pago mínimo
  - Tasa de mora (%)
  - Nivel de riesgo
- Reglas de operación:
  - Permite pago en efectivo / cheque / transferencia / cuotas
  - Bloqueo automático por mora
- Indicador de estado crediticio actual
