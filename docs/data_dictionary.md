# 📚 Diccionario de Datos - Sistema de Inventario

## 📦 **GESTIÓN DE PRODUCTOS**

### `categories`
Organización jerárquica de productos en categorías y subcategorías. Permite clasificar productos para facilitar navegación, reportes y gestión de inventario.

### `products`
Información maestra de productos. Define características base como nombre, descripción, marca, modelo y configuraciones de control (lotes, series, vencimientos).

### `product_variants`
Variaciones de un producto base (tallas, colores, presentaciones). Cada variante tiene su propio SKU y puede tener diferentes precios y stock.

### `product_variant_attributes`
Valores específicos de atributos para cada variante (ej: Talla=XL, Color=Rojo). Permite configurar características específicas de cada variación.

### `product_barcodes`
Códigos de barras asociados a variantes de productos. Soporta múltiples tipos (EAN13, UPC, QR) y permite tener varios códigos por producto.

### `product_measurement_units`
Unidades de medida aplicables a cada producto (venta por unidad, caja, kilo). Define factores de conversión entre diferentes unidades.

### `attributes`
Definición de características configurables de productos (color, talla, peso). Permite crear atributos reutilizables para múltiples productos.

### `attribute_groups`
Agrupación lógica de atributos relacionados (ej: "Dimensiones" agrupa largo, ancho, alto). Facilita organización en interfaces de usuario.

### `attribute_values`
Valores predefinidos para atributos de tipo SELECT (ej: colores disponibles). Estandariza opciones disponibles para selección.

---

## 📊 **INVENTARIO Y STOCK**

### `stock`
Cantidad actual de cada variante de producto por bodega y zona. Es el corazón del control de inventario con stock actual, reservado y disponible.

### `stock_movements`
Registro de todos los movimientos de inventario (entradas, salidas, transferencias). Proporciona trazabilidad completa de cambios en stock.

### `stock_alerts`
Alertas automáticas por stock bajo, productos sin movimiento, etc. Sistema proactivo para gestión de inventario crítico.

### `stock_critical_config`
Configuración de puntos críticos por producto/bodega (stock mínimo, máximo, punto de reorden). Define umbrales para alertas automáticas.

### `warehouses`
Definición de bodegas y puntos de venta. Cada ubicación física donde se almacena o vende inventario.

### `warehouse_zones`
Subdivisión de bodegas en zonas específicas (estanterías, pasillos). Permite ubicación precisa de productos dentro de una bodega.

### `reorder_suggestions`
Sugerencias automatizadas de reabastecimiento basadas en consumo histórico y tiempos de entrega. Optimiza gestión de compras.

---

## 💰 **VENTAS Y DOCUMENTOS**

### `documents`
Documentos comerciales del sistema (facturas, boletas, guías, notas). Núcleo de todas las transacciones comerciales.

### `document_items`
Detalle línea por línea de productos en cada documento. Especifica cantidades, precios, descuentos por producto vendido.

### `document_types`
Tipos de documentos disponibles (venta, compra, transferencia). Define comportamiento y validaciones específicas por tipo.

### `document_series`
Series de numeración para documentos por bodega. Controla secuencia y rangos de folios para cada tipo de documento.

### `document_payment_details`
Detalle de métodos de pago utilizados en cada documento. Permite múltiples formas de pago en una sola transacción.

---

## 👥 **CLIENTES Y CUENTAS POR COBRAR**

### `customers`
Información maestra de clientes (personas y empresas). Incluye datos de contacto, configuración de crédito y vendedor asignado.

### `customer_authorized_users`
Personas autorizadas para comprar a nombre de clientes empresariales. Control de quién puede realizar compras por empresa.

### `customer_credit_config`
Configuración de límites y condiciones de crédito por cliente. Define términos de pago, límites y restricciones crediticias.

### `customer_payments`
Registro de pagos recibidos de clientes. Incluye cheques, transferencias, efectivo y su estado de procesamiento.

### `customer_penalties`
Multas e intereses aplicados por mora en pagos. Cálculo automático de penalizaciones por retraso en pagos.

### `accounts_receivable`
Cuentas por cobrar pendientes por cliente. Controla saldos, vencimientos y días de mora por factura.

### `credit_limit_exceptions`
Excepciones temporales a límites de crédito autorizadas por supervisores. Permite ventas excepcionales con aprobación.

### `payment_allocations`
Aplicación de pagos recibidos a facturas específicas. Controla cómo se distribuyen los pagos entre diferentes cuentas por cobrar.

---

## 🔄 **DEVOLUCIONES**

### `return_documents`
Documentos de devolución de productos vendidos. Registra información general de la devolución y motivos.

### `return_document_items`
Detalle de productos específicos devueltos. Cantidades, condición del producto y si retorna a inventario.

### `return_reasons`
Catálogo de motivos de devolución (defecto, cambio de opinión, etc.). Estandariza razones y define políticas por motivo.

### `return_refunds`
Reembolsos procesados por devoluciones. Registra el método y estado del reembolso al cliente.

---

## 💵 **CAJA Y PAGOS**

### `cash_registers`
Definición de cajas registradoras por punto de venta. Configuración física de terminales de cobro.

### `cash_register_sessions`
Sesiones de trabajo de cajeros (apertura/cierre de caja). Controla períodos operativos y cuadre de efectivo.

### `cash_movements`
Todos los movimientos de dinero en caja (ventas, cambios, gastos). Registro detallado del flujo de efectivo.

### `payment_methods`
Métodos de pago disponibles (efectivo, tarjetas, transferencias). Define características y validaciones por método.

### `petty_cash_funds`
Fondos de caja chica por punto de venta. Dinero destinado a gastos menores operativos.

### `petty_cash_categories`
Categorías de gastos permitidos en caja chica (limpieza, oficina, etc.). Clasificación de tipos de gastos menores.

### `petty_cash_expenses`
Gastos individuales realizados con caja chica. Registro detallado con comprobantes y aprobaciones.

### `petty_cash_replenishments`
Reposiciones de dinero a fondos de caja chica. Control de cuando y cuánto se repone a cada fondo.

---

## 💲 **PRECIOS Y PROMOCIONES**

### `price_lists`
Listas de precios para diferentes tipos de clientes o canales. Permite manejar precios diferenciados por segmento.

### `price_list_groups`
Agrupación de listas de precios relacionadas. Organiza listas por categorías (mayorista, minorista, etc.).

### `price_list_items`
Precios específicos por producto y lista. Define el precio de venta para cada combinación producto-lista.

### `promotions`
Definición de promociones y descuentos especiales. Configura reglas, vigencia y tipos de ofertas.

### `promotion_items`
Productos o categorías incluidas en cada promoción. Especifica qué items aplican para cada oferta.

---

## 📋 **UNIDADES DE MEDIDA**

### `measurement_units`
Catálogo de unidades de medida del sistema (kg, litros, unidades, cajas). Base para todas las transacciones de inventario.

---

## 📄 **FACTURACIÓN ELECTRÓNICA (DTE)**

### `dte_company_config`
Configuración de la empresa para facturación electrónica SII. Datos fiscales, certificados y rangos de folios autorizados.

### `dte_transaction_log`
Log de transacciones con el SII para documentos electrónicos. Trazabilidad de envíos, respuestas y estados en SII.

---

## 👤 **USUARIOS Y PERMISOS**

### `users`
Usuarios del sistema con credenciales y información personal. Base de autenticación y identificación.

### `roles`
Roles funcionales para agrupar permisos (cajero, supervisor, administrador). Facilita asignación masiva de permisos.

### `permissions`
Permisos específicos del sistema (crear facturas, ver reportes, etc.). Granularidad fina de control de acceso.

### `user_roles`
Asignación de roles a usuarios específicos. Relación many-to-many entre usuarios y roles.

### `user_permissions`
Permisos individuales adicionales o excepciones por usuario. Permite personalizar accesos específicos.

### `role_permissions`
Permisos incluidos en cada rol. Define qué puede hacer cada tipo de usuario.

### `user_warehouse_access`
Control de acceso de usuarios a bodegas específicas. Restringe operaciones por ubicación.

### `permission_audit_log`
Auditoría de cambios en permisos y roles. Trazabilidad de quién modificó accesos y cuándo.

---

## 🧭 **MENÚS Y NAVEGACIÓN**

### `menu_items`
Estructura del menú de navegación del sistema. Define jerarquía, iconos y enlaces de la interfaz.

### `menu_item_permissions`
Permisos requeridos para ver cada opción de menú. Controla visibilidad de opciones por usuario.

### `user_menu_favorites`
Menús marcados como favoritos por cada usuario. Personalización de accesos rápidos.

### `menu_access_log`
Log de acceso a opciones de menú por usuario. Analítica de uso del sistema.

---

## ⚙️ **ESTADOS Y CONFIGURACIÓN DEL SISTEMA**

### `system_statuses`
**🆕 Tabla centralizada de todos los estados del sistema agrupados por módulo. Reemplaza ENUMs dispersos con gestión unificada de estados, colores e iconos para UI.**

### `status_change_history`
**🆕 Historial completo de cambios de estado en todas las tablas. Auditoría transversal que registra quién, cuándo y por qué cambió cada estado.**

### `system_features`
Configuración de características habilitadas del sistema. Control de funcionalidades activas por instalación.

### `audit_log`
Log general de auditoría para cambios importantes en datos. Trazabilidad de modificaciones críticas del sistema.

---

## 🔗 **Tablas Transversales**

### `documents`
**Conecta productos con ventas** - Núcleo de transacciones comerciales

### `customer_payments`
**Conecta caja con clientes** - Flujo de dinero desde clientes

### `stock`
**Conecta inventario con productos** - Estado actual de inventario

### `payment_methods`
**Usado en caja y facturación** - Métodos de pago disponibles

### `user_warehouse_access`
**Conecta usuarios con inventario** - Control de acceso por ubicación

### `system_statuses` 🆕
**Centraliza estados de todos los módulos** - Estados unificados transversales

### `status_change_history` 🆕
**Auditoría transversal de cambios** - Historial unificado de estados