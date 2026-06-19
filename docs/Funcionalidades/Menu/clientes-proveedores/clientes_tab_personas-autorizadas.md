# Tab: Personas autorizadas (cliente)

**Pertenece a:** [Listado de clientes](clientes.md)  
**Ruta:** `/customers` (tab activo: `authorized`) o `/customers/authorized-persons?customer_id=X`  
**Componente:** `AdminCustomerAuthorized`  
**Estado:** ✅ Implementado

## Misión

Gestión de las personas físicas autorizadas para operar en nombre de un cliente empresa. Define quiénes pueden realizar compras, su nivel de autorización y monto máximo por operación.

## Funcionalidades implementadas

- Listado de personas autorizadas filtrado por cliente
- Creación y edición con:
  - Nombre, RUT, cargo
  - Teléfono, móvil, email
  - Nivel de autorización y glosa asociada
  - Monto máximo de compra permitido
- Activar / desactivar persona autorizada
- Eliminación de registro
