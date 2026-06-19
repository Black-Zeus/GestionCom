# Métodos de pago

**Ruta:** `/config/payment-methods`  
**Permiso:** `CASH_VISIBLE`  
**Componente:** `AdminPaymentMethods`  
**Estado:** ✅ Implementado

## Misión

Gestión del catálogo de métodos de pago disponibles en el sistema. Define los medios aceptados en el punto de venta (efectivo, tarjeta, transferencia, divisa, mixto) con su configuración visual y orden de presentación en el POS.

## Funcionalidades implementadas

- Listado de métodos con código, tipo, icono, orden y estado
- Creación y edición: nombre, tipo (CASH/CARD/TRANSFER/OTHER), moneda, icono UI, orden en POS
- Flags: requiere autorización, permite cheque posfechado, requiere información bancaria
- Días de plazo por defecto para métodos de crédito
- `display_order`: controla el orden de aparición en el POS
- `icon_name`: nombre del icono Lucide sugerido para el método
- Activar / desactivar método de pago

## Métodos de sistema

Los siguientes métodos están presentes en el seed inicial:

| Código | Nombre | display_order |
|--------|--------|---------------|
| `MIXED` | Mixto | 10 |
| `CASH` | Efectivo | 20 |
| `DEBIT` | Tarjeta de Débito | 30 |
| `FOREIGN_CURRENCY` | Divisa Extranjera | 40 |
| `CREDIT` | Tarjeta de Crédito | 110 |
| `TRANSFER` | Transferencia Bancaria | 120 |
