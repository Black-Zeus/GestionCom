# Mantenedor de Promociones

**Ruta:** `/sales/promotions`  
**Permiso:** `SALES_MAINTAINERS_ACCESS` o `SALES_MAINTAINERS_MANAGE`  
**Componente:** `AdminSalesConfigMaintainers` → `SalesConfigMaintainers (tab: promotions)`  
**Estado:** ✅ Implementado

## Misión

Gestión del catálogo de promociones comerciales. Define reglas de descuento temporales aplicables a productos o categorías específicas, con control de vigencia y aprobación.

## Funcionalidades implementadas

- Listado de promociones con filtro por estado y vigencia
- Creación y edición de promociones con:
  - Tipo de promoción (porcentaje, monto fijo, 2×1, etc.)
  - Objetivo: producto, categoría o todos los productos
  - Período de vigencia (fecha desde / hasta)
  - Flag de aprobación requerida
- Gestión de ítems de la promoción (productos o categorías incluidas)

## Sub-navegación (tabs internos)

Esta pantalla opera mediante el componente genérico de mantenedores con pestañas:

| Tab | Descripción | Estado |
|-----|-------------|--------|
| Promociones | CRUD principal de promociones | ✅ |
| [Items](promociones_tab_items.md) | Productos o categorías asociados a cada promoción | ✅ |
| [Devoluciones](promociones_tab_devoluciones.md) | Motivos y reglas de devolución asociados a ventas | ✅ |
