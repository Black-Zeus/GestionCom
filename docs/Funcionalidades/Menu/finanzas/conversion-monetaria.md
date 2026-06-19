# Conversión monetaria

**Ruta:** `/finance/exchange-rates`  
**Permiso:** `FINANCE_MAINTAINERS_ACCESS` o `FINANCE_MAINTAINERS_MANAGE`  
**Componente:** `AdminCurrencyRates`  
**Estado:** ✅ Implementado

## Misión

Gestión de las tasas de cambio entre divisas. Permite ingresar manualmente las tasas vigentes o consultarlas desde fuentes externas. La tasa efectiva se calcula dinámicamente aplicando el fee de conversión configurado en la moneda, sin depender del valor almacenado.

## Funcionalidades implementadas

- Listado de tasas de cambio vigentes por par de monedas
- Ingreso manual de tasa de cambio con fecha de vigencia
- Cálculo de `effective_rate` = `rate_value × (1 - fee_pct / 100)` al momento de la consulta
- Fuente de la tasa (manual, API externa)
- Historial de tasas registradas por moneda
