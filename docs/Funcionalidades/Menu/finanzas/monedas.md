# Monedas

**Ruta:** `/finance/currencies`  
**Permiso:** `FINANCE_MAINTAINERS_ACCESS` o `FINANCE_MAINTAINERS_MANAGE`  
**Componente:** `AdminFinanceCurrencies` → `CurrenciesMaintainers`  
**Estado:** ✅ Implementado

## Misión

Catálogo de divisas utilizadas en el sistema. Define cada moneda con su símbolo, decimales de precisión y el porcentaje de fee de conversión que se aplica al calcular la tasa efectiva en cobros en moneda extranjera.

## Funcionalidades implementadas

- Listado de monedas con símbolo, código ISO y estado
- Creación y edición: nombre, código, símbolo, decimales
- Configuración de fee de conversión (%) por moneda, usado al calcular `effective_rate`
- Activar / desactivar moneda
