# Menú — Ítems Raíz

Listado de todos los grupos padre que conforman el menú lateral del sistema.  
Cada entrada corresponde a un `moduleGroup` definido en `modules.js` y se visualiza como una sección colapsable en el sidebar.

> El sidebar es **dinámico**: los ítems visibles dependen de los permisos del usuario autenticado y de los flags `is_active` / `is_visible` de la tabla `menu_items` en base de datos.  
> Este archivo documenta la estructura lógica completa, independiente de los permisos.

---

| # | Nombre | Ruta raíz | Permiso requerido | Estado | Detalle |
|---|--------|-----------|-------------------|--------|---------|
| 1 | **Inicio** | `/dashboard` | `HOME_VISIBLE` | ✅ Implementado | [→](ventas/index.md) |
| 2 | **Ventas** | `/sales/*` | `SALES_VISIBLE` | ✅ Implementado | [→](ventas/index.md) |
| 3 | **Clientes y proveedores** | `/customers`, `/suppliers` | `CUSTOMERS_VISIBLE` | ✅ Implementado | [→](clientes-proveedores/index.md) |
| 4 | **Caja** | `/cash/*` | `CASH_VISIBLE` | ✅ Implementado | [→](caja/index.md) |
| 5 | **Inventario** | `/inventory/*` | `INVENTORY_VISIBLE` | ✅ Implementado | [→](inventario/index.md) |
| 6 | **Finanzas** | `/finance/*` | `FINANCE_VISIBLE` | ✅ Implementado | [→](finanzas/index.md) |
| 7 | **Documentos** | `/documents/*` | `DOCUMENTS_VISIBLE` | ⚠️ Parcial | [→](documentos/index.md) |
| 8 | **Métricas e indicadores** | `/metrics/*` | `METRICS_VISIBLE` | ✅ Implementado | [→](metricas/index.md) |
| 9 | **Reportes de gestión** | `/reports/*` | `REPORTS_VISIBLE` | ⚠️ Parcial | [→](reportes-gestion/index.md) |
| 10 | **Reportes de auditoría** | `/reports/audit/*`, `/reports/financial/*` | `AUDIT_VISIBLE` | 🚧 En desarrollo | [→](reportes-auditoria/index.md) |
| 11 | **Integraciones** | `/integrations/*` | `DTE_ACCESS` | ⚠️ Parcial | [→](integraciones/index.md) |
| 12 | **Configuración** | `/config/*` | `SETTINGS_VISIBLE` | ⚠️ Parcial | [→](configuracion/index.md) |
| 13 | **Administración** | `/admin/*` | `ADMIN_VISIBLE` | ⚠️ Parcial | [→](administracion/index.md) |

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
