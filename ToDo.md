# Proyecto

Sistema de Inventario y Punto de Venta – Definición de módulos de navegación (sidebar).

---

## Desglose del proyecto

Este proyecto define la estructura de navegación lateral (`sidebarNavData`) para un sistema de **Inventario + Punto de Venta (POS)**.

El menú se organiza por **bloques funcionales** alineados al flujo operativo:

- Operación comercial: ventas, caja, finanzas.
- Gestión de inventario y proveedores.
- Reportes operacionales y financieros.
- Configuración de parámetros y mantenimiento del sistema.
- Administración (usuarios, roles, bodegas, cajas).
- Demos y vistas de prueba.

La siguiente tabla funciona como **TODO técnico/funcional**, marcando el estado por capa:

- **DB**: modelo de datos y estructuras necesarias listas.
- **UI**: vistas/componentes implementados.
- **API**: endpoints o servicios backend.
- **Integración**: UI + API + otros sistemas conectados.
- **Pruebas**: pruebas ejecutadas y validadas.

Convención:  
- `X` → Completado  
- `-` → Pendiente  

---

## Módulos / submódulos y estado

> Según lo indicado:
> - **DB**: todo en `X`.
> - **API**: todo `-` por ahora.
> - **Auth**: todo `X` (DB, UI, API, Integración, Pruebas).
> - **UI**: `X` solo en:
>   - Dashboard
>   - Nueva Venta
>   - Historial de Ventas
>   - Lista de Productos
>   - Categorías
>   - Códigos de Barras
>   - Listas de Precios
>   - Usuarios
>   - Roles y Permisos
>   - Bodegas
>   - Caja POS
>   - Caja Chica

### Leyenda rápida

- **Nombre**: `Bloque – Submódulo` (cuando aplica).

---

### Tabla

| Módulo / Submódulo                                            | Finalidad principal                                                                                          | DB | UI | API | Integración | Pruebas |
|---------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|----|----|-----|-------------|---------|
| Core – Autenticación (Auth)                                   | Gestión de login, sesiones, tokens y seguridad de acceso.                                                  | X  | X  | X   | X           | X       |
| Principal – Dashboard                                          | Panel principal con KPIs y resumen de operación.                                                            | X  | X  | -   | -           | -       |
| Ventas – Nueva Venta                                          | Flujo POS para emitir ventas en línea de caja.                                                              | X  | X  | -   | -           | -       |
| Ventas – Historial de Ventas                                  | Consulta y trazabilidad de ventas realizadas.                                                               | X  | X  | -   | -           | -       |
| Ventas – Clientes                                             | Nodo principal para gestión de clientes.                                                                    | X  | -  | -   | -           | -       |
| Ventas – Clientes – Lista de Clientes                         | Listado maestro de clientes con búsqueda y filtros.                                                         | X  | X  | -   | -           | -       |
| Ventas – Clientes – Personas Autorizadas                      | Definir personas autorizadas asociadas a clientes.                                                          | X  | -  | -   | -           | -       |
| Ventas – Clientes – Créditos y Límites                        | Configurar y controlar créditos y límites de compra de clientes.                                           | X  | -  | -   | -           | -       |
| Ventas – Clientes – Historial de Compras                      | Historial detallado de compras por cliente.                                                                 | X  | -  | -   | -           | -       |
| Ventas – Clientes – Estado de Cuenta                          | Estado de cuenta de clientes (saldos, documentos pendientes).                                               | X  | -  | -   | -           | -       |
| Caja – Apertura de Caja                                       | Registrar la apertura de caja y saldos iniciales.                                                           | X  | -  | -   | -           | -       |
| Caja – Cierre de Caja                                         | Cerrar caja, consolidar montos y diferencias.                                                               | X  | -  | -   | -           | -       |
| Caja – Movimientos de Caja                                    | Registrar ingresos/egresos de caja durante el día.                                                          | X  | -  | -   | -           | -       |
| Caja – Arqueo de Caja                                         | Conteo y conciliación física de caja.                                                                      | X  | -  | -   | -           | -       |
| Finanzas – Gastos Operativos                                  | Registro y control de gastos operacionales.                                                                 | X  | -  | -   | -           | -       |
| Finanzas – Ingresos Adicionales                               | Registro de ingresos no asociados directamente a ventas POS.                                               | X  | -  | -   | -           | -       |
| Finanzas – Pagos a Proveedores                                | Gestión de pagos a proveedores y obligaciones asociadas.                                                   | X  | -  | -   | -           | -       |
| Finanzas – Conciliación Bancaria                              | Conciliar movimientos bancarios con registros internos.                                                    | X  | -  | -   | -           | -       |
| Inventario – Productos                                        | Nodo principal de administración de productos.                                                              | X  | -  | -   | -           | -       |
| Inventario – Productos – Lista de Productos                   | Maestro de productos, con ficha de producto y filtros.                                                      | X  | X  | -   | -           | -       |
| Inventario – Productos – Categorías                           | Definir y mantener categorías de productos.                                                                 | X  | X  | -   | -           | -       |
| Inventario – Productos – Códigos de Barras                    | Administración de códigos de barras asociados a productos.                                                  | X  | X  | -   | -           | -       |
| Inventario – Productos – Listas de Precios                    | Gestión de listas de precios y políticas de valor.                                                          | X  | X  | -   | -           | -       |
| Inventario – Gestión de Stock                                 | Nodo principal para gestión de movimientos y stock.                                                         | X  | -  | -   | -           | -       |
| Inventario – Gestión de Stock – Movimientos de Stock          | Registro de movimientos de stock (entradas, salidas, traspasos).                                           | X  | -  | -   | -           | -       |
| Inventario – Gestión de Stock – Inventario Físico             | Toma de inventario físico y conciliación con sistema.                                                       | X  | -  | -   | -           | -       |
| Inventario – Gestión de Stock – Ajustes de Inventario         | Ajustes manuales de stock por corrección, merma, etc.                                                       | X  | -  | -   | -           | -       |
| Inventario – Gestión de Stock – Transferencias                | Transferencias de stock entre bodegas o ubicaciones.                                                        | X  | -  | -   | -           | -       |
| Inventario – Proveedores                                      | Nodo principal de gestión de proveedores.                                                                   | X  | -  | -   | -           | -       |
| Inventario – Proveedores – Lista de Proveedores               | Maestro de proveedores.                                                                                    | X  | -  | -   | -           | -       |
| Inventario – Proveedores – Contactos y Representantes         | Gestión de contactos asociados a cada proveedor.                                                            | X  | -  | -   | -           | -       |
| Inventario – Proveedores – Productos por Proveedor            | Relación de productos ofrecidos por cada proveedor.                                                         | X  | -  | -   | -           | -       |
| Inventario – Proveedores – Órdenes de Compra                  | Registro y seguimiento de órdenes de compra.                                                                | X  | -  | -   | -           | -       |
| Inventario – Proveedores – Historial de Compras               | Historial de compras realizadas a proveedores.                                                              | X  | -  | -   | -           | -       |
| Inventario – Proveedores – Evaluación de Proveedores          | Evaluación de desempeño y calidad de proveedores.                                                           | X  | -  | -   | -           | -       |
| Inventario – Proveedores – Cuentas por Pagar                  | Cuentas por pagar asociadas a proveedores.                                                                  | X  | -  | -   | -           | -       |
| Reportes – Reportes Operativos                                | Nodo principal para reportes operacionales.                                                                 | X  | -  | -   | -           | -       |
| Reportes – Reportes Operativos – Ventas Diarias               | Reporte de ventas diarias.                                                                                  | X  | -  | -   | -           | -       |
| Reportes – Reportes Operativos – Ventas por Vendedor          | Análisis de ventas agrupadas por vendedor.                                                                  | X  | -  | -   | -           | -       |
| Reportes – Reportes Operativos – Productos Más Vendidos       | Ranking de productos top en ventas.                                                                         | X  | -  | -   | -           | -       |
| Reportes – Reportes Operativos – Inventario Bajo Stock        | Alertas de productos con stock bajo.                                                                        | X  | -  | -   | -           | -       |
| Reportes – Reportes Operativos – Movimientos de Inventario    | Reporte de movimientos de inventario.                                                                       | X  | -  | -   | -           | -       |
| Reportes – Reportes Operativos – Clientes Frecuentes          | Identificación de clientes recurrentes.                                                                     | X  | -  | -   | -           | -       |
| Reportes – Reportes Operativos – Productos Devueltos          | Reporte de devoluciones de productos.                                                                       | X  | -  | -   | -           | -       |
| Reportes – Reportes Operativos – Performance por Sucursal     | Comparativo de desempeño entre sucursales.                                                                  | X  | -  | -   | -           | -       |
| Reportes – Reportes Operativos – Alertas de Vencimiento       | Productos próximos a vencer.                                                                                | X  | -  | -   | -           | -       |
| Reportes – Reportes Operativos – Actividad de Usuarios        | Auditoría de actividad de usuarios en el sistema.                                                           | X  | -  | -   | -           | -       |
| Reportes – Reportes Financieros                               | Nodo principal para reportes financieros.                                                                   | X  | -  | -   | -           | -       |
| Reportes – Reportes Financieros – Estado de Resultados        | Estado de resultados (pérdidas y ganancias).                                                                | X  | -  | -   | -           | -       |
| Reportes – Reportes Financieros – Flujo de Caja               | Flujo de caja en periodo seleccionado.                                                                     | X  | -  | -   | -           | -       |
| Reportes – Reportes Financieros – Cuentas por Cobrar          | Saldos pendientes por cobrar.                                                                              | X  | -  | -   | -           | -       |
| Reportes – Reportes Financieros – Cuentas por Pagar           | Saldos pendientes por pagar.                                                                               | X  | -  | -   | -           | -       |
| Reportes – Reportes Financieros – Análisis de Rentabilidad    | Análisis de rentabilidad por producto, línea o negocio.                                                     | X  | -  | -   | -           | -       |
| Reportes – Reportes Financieros – Presupuesto vs Real         | Comparación de presupuesto vs ejecución real.                                                               | X  | -  | -   | -           | -       |
| Reportes – Reportes Financieros – Costos Operacionales        | Reporte de costos operacionales.                                                                            | X  | -  | -   | -           | -       |
| Reportes – Reportes Financieros – Márgenes de Utilidad        | Márgenes de utilidad bruta/neta.                                                                           | X  | -  | -   | -           | -       |
| Reportes – Reportes Financieros – Impuestos y Declaraciones   | Reportes para impuestos y declaraciones tributarias.                                                        | X  | -  | -   | -           | -       |
| Reportes – Reportes Financieros – Auditoría Financiera        | Vistas para auditoría financiera y controles.                                                               | X  | -  | -   | -           | -       |
| Configuración – Configuración General                         | Nodo principal de parámetros generales del sistema.                                                         | X  | -  | -   | -           | -       |
| Configuración – Configuración General – Parámetros del Sistema| Configuración de parámetros técnicos y de negocio globales.                                                 | X  | -  | -   | -           | -       |
| Configuración – Configuración General – Configuración de Empresa | Datos maestros de la empresa (razón social, RUT, etc.).                                                  | X  | -  | -   | -           | -       |
| Configuración – Configuración General – Configuración de Impuestos | Definir impuestos, tasas y reglas tributarias.                                                          | X  | -  | -   | -           | -       |
| Configuración – Configuración General – Métodos de Pago       | Configurar métodos de pago disponibles en el POS.                                                           | X  | -  | -   | -           | -       |
| Configuración – Configuración General – Plantillas de Documentos | Definir plantillas de documentos (boletas, facturas, etc.).                                             | X  | -  | -   | -           | -       |
| Configuración – Mantenimiento del Sistema                     | Nodo principal de mantenimiento técnico.                                                                    | X  | -  | -   | -           | -       |
| Configuración – Mantenimiento – Backup y Restauración         | Configurar y ejecutar copias de seguridad y restauraciones.                                                | X  | -  | -   | -           | -       |
| Configuración – Mantenimiento – Logs del Sistema              | Revisión y consulta de logs de sistema.                                                                     | X  | -  | -   | -           | -       |
| Configuración – Mantenimiento – Auditoría del Sistema         | Auditoría técnica y de seguridad del sistema.                                                               | X  | -  | -   | -           | -       |
| Configuración – Mantenimiento – Optimización de Base de Datos | Tareas de mantenimiento y optimización de la base de datos.                                                | X  | -  | -   | -           | -       |
| Administración – Usuarios                                     | Gestión de usuarios de la plataforma.                                                                      | X  | X  | -   | -           | -       |
| Administración – Roles y Permisos                             | Definición de roles y asignación de permisos.                                                               | X  | X  | -   | -           | -       |
| Administración – Bodegas                                      | Administración de bodegas y ubicaciones de stock.                                                           | X  | X  | -   | -           | -       |
| Administración – Caja POS                                     | Configuración de cajas POS (terminales).                                                                    | X  | X  | -   | -           | -       |
| Administración – Caja Chica                                   | Configuración de centros de caja chica.                                                                    | X  | X  | -   | -           | -       |
| Administración – Configuración de Menú                        | Administración de estructura y permisos del menú.                                                           | X  | -  | -   | -           | -       |