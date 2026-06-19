# Denominaciones de efectivo

**Ruta:** `/admin/cash/denominations`  
**Permiso:** `FINANCE_MAINTAINERS_ACCESS` / `FOUNDATION_MAINTAINERS_ACCESS`  
**Componente:** `AdminCashMaintainers` → `CashMaintainers`  
**Estado:** ✅ Implementado

## Misión

Catálogo de denominaciones de efectivo (billetes y monedas) utilizadas en el arqueo de apertura y cierre de caja. Define cada billete/moneda con su valor nominal y etiqueta de presentación.

## Funcionalidades implementadas

- Listado de denominaciones ordenadas por valor
- Creación y edición: etiqueta (ej: "$1.000"), valor numérico
- Activar / desactivar denominación
- Las denominaciones activas aparecen en el formulario de arqueo de CashOpening/CashCount

## Sub-navegación (tabs)

| Tab | Descripción |
|-----|-------------|
| Denominaciones | Gestión del catálogo de billetes y monedas |
