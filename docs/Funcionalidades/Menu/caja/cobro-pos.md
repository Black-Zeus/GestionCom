# Cobro en caja POS

**Ruta:** `/cash/pos`  
**Permiso:** `CASH_POS_ACCESS`  
**Componente:** `CashPos`  
**Estado:** ✅ Implementado

## Misión

Pantalla de cobro en punto de venta. Recibe una pre-venta o una venta directa y gestiona el proceso de pago hasta emitir el comprobante. Soporta múltiples métodos de pago incluyendo efectivo en moneda extranjera y pagos mixtos (split de métodos).

## Funcionalidades implementadas

- Visualización del detalle de la venta a cobrar (líneas, subtotal, impuestos, total)
- Selección de método de pago:
  - **Efectivo (CLP):** ingreso del monto recibido, cálculo automático de vuelto
  - **Tarjeta débito / crédito:** ingreso de referencia de autorización
  - **Transferencia:** ingreso de datos de referencia
  - **Divisa extranjera:** selección de moneda, aplicación de tasa de cambio vigente, cálculo de vuelto en CLP
  - **Pago mixto:** distribución del total entre múltiples métodos con control de saldo pendiente
- Validación de documentos DTE (factura electrónica) con restricción de métodos permitidos
- Ingreso de correo electrónico del cliente para envío de comprobante (`receipt_email`)
- Registro del pago con `payment_details` JSON para auditoría completa
- Confirmación y emisión del documento
- Impresión / descarga del comprobante
