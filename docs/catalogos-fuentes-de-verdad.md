# Catalogos como fuente de verdad

Los mantenedores no deben duplicar listas de valores en frontend cuando exista una tabla catalogo.

## Monedas

La fuente de verdad para monedas es `currencies`.

Tablas que referencian `currencies.currency_code`:

- `payment_methods.currency_code`
- `price_lists.currency_code`
- `suppliers.default_currency_code`
- `bank_accounts.currency_code`
- `currency_exchange_rates.currency_code`

Reglas:

- Los selects de moneda deben cargar datos desde `/admin-maintainers/currencies`.
- No crear arreglos locales de monedas en componentes.
- Los codigos deben usar ISO-4217 de tres letras.
- El simbolo mostrado al usuario debe venir de `currencies.currency_symbol`.

## Empresa operativa

La fuente de verdad para datos legales y DTE de la empresa es `dte_company_config`.

Reglas:

- Puede existir mas de una empresa registrada para mantener historial o datos de certificacion.
- Solo puede existir una empresa activa a la vez.
- Solo puede existir una empresa en ambiente `PRODUCCION` a la vez.
- Al activar una empresa, el backend debe desactivar automaticamente cualquier otra empresa activa.
- Al pasar una empresa a `PRODUCCION`, el backend debe mover las demas a `CERTIFICACION`.
- La base de datos debe mantener restricciones defensivas para impedir duplicados si se carga informacion fuera de la API.
