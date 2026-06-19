# Listado de clientes

**Ruta:** `/customers`  
**Permiso:** `FOUNDATION_MAINTAINERS_ACCESS` o `FOUNDATION_MAINTAINERS_MANAGE`  
**Componente:** `AdminCustomersMaintainers` → `CustomersMaintainers`  
**Estado:** ✅ Implementado

## Misión

Mantenedor central de la cartera de clientes. Administra los datos maestros de cada cliente (empresa o persona natural), su imagen/logo, y provee acceso a sub-módulos de personas autorizadas y condiciones de crédito.

## Funcionalidades implementadas

- Listado con filtros por tipo de cliente, estado, ciudad, lista de precios y moneda
- KPI bar con contadores de clientes activos/inactivos
- Creación y edición de cliente con formulario completo:
  - Tipo (empresa / persona natural), RUT, razón social, nombre de fantasía
  - Giro, ciudad, región, país
  - Contacto principal, email, teléfono
  - Moneda por defecto, lista de precios asignada
  - Flag cliente de crédito
- Gestión de media (logo/imagen del cliente)
- Toggle activar/desactivar cliente con confirmación
- Eliminación con validación de registros dependientes
- Acceso directo a personas autorizadas desde la fila

## Sub-navegación (tabs)

| Tab | Ruta funcional | Detalle |
|-----|---------------|---------|
| Clientes | `/customers` (principal) | — |
| Personas autorizadas | `/customers` (tab: authorized) | [→](clientes_tab_personas-autorizadas.md) |
| Crédito | `/customers` (tab: credit) | [→](clientes_tab_credito.md) |
