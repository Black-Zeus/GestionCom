# Menú — Ítems Raíz

Listado de todos los grupos padre que conforman el menú lateral del sistema.  
Cada entrada corresponde a un `moduleGroup` definido en `modules.js` y se visualiza como una sección colapsable en el sidebar.

> El sidebar es **dinámico**: los ítems visibles dependen de los permisos del usuario autenticado y de los flags `is_active` / `is_visible` de la tabla `menu_items` en base de datos.  
> Este archivo documenta la estructura lógica completa, independiente de los permisos.

---

| # | Nombre | Ruta raíz | Permiso requerido | Estado |
|---|--------|-----------|-------------------|--------|
| 1 | [**Inicio**](inicio/index.md) | `/dashboard` | `HOME_VISIBLE` | ✅ Implementado |
| 2 | [**Ventas**](ventas/index.md) | `/sales/*` | `SALES_VISIBLE` | ✅ Implementado |
| 3 | [**Clientes y proveedores**](clientes-proveedores/index.md) | `/customers`, `/suppliers` | `CUSTOMERS_VISIBLE` | ✅ Implementado |
| 4 | [**Caja**](caja/index.md) | `/cash/*` | `CASH_VISIBLE` | ✅ Implementado |
| 5 | [**Inventario**](inventario/index.md) | `/inventory/*` | `INVENTORY_VISIBLE` | ✅ Implementado |
| 6 | [**Finanzas**](finanzas/index.md) | `/finance/*` | `FINANCE_VISIBLE` | ✅ Implementado |
| 7 | [**Documentos**](documentos/index.md) | `/documents/*` | `DOCUMENTS_VISIBLE` | ⚠️ Parcial |
| 8 | [**Métricas e indicadores**](metricas/index.md) | `/metrics/*` | `METRICS_VISIBLE` | ✅ Implementado |
| 9 | [**Reportes de gestión**](reportes-gestion/index.md) | `/reports/*` | `REPORTS_VISIBLE` | ⚠️ Parcial |
| 10 | [**Reportes de auditoría**](reportes-auditoria/index.md) | `/reports/audit/*`, `/reports/financial/*` | `AUDIT_VISIBLE` | 🚧 En desarrollo |
| 11 | [**Integraciones**](integraciones/index.md) | `/integrations/*` | `DTE_ACCESS` | ⚠️ Parcial |
| 12 | [**Configuración**](configuracion/index.md) | `/config/*` | `SETTINGS_VISIBLE` | ⚠️ Parcial |
| 13 | [**Administración**](administracion/index.md) | `/admin/*` | `ADMIN_VISIBLE` | ⚠️ Parcial |

---

## Páginas del sistema (fuera del menú)

Accesibles desde el topbar o rutas directas, no aparecen en el sidebar:

| Nombre | Ruta | Estado |
|--------|------|--------|
| Búsqueda global | `/search` | ✅ |
| Mi perfil | `/profile` | ✅ |
| Centro de notificaciones | `/notifications` | ✅ |

---

## Convención de estados

| Icono | Significado |
|-------|------------|
| ✅ Implementado | Componente activo con funcionalidad completa o mayoritaria |
| ⚠️ Parcial | Implementado pero con ítems hijos aún en desarrollo |
| 🚧 En desarrollo | Pantalla presente pero sin funcionalidad operativa |
