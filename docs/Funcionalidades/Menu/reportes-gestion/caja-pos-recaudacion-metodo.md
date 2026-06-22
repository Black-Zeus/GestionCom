# Caja POS - recaudación por método (reporte)

**Ruta:** `/reports/cash-pos?report=pos-collection-by-method`  
**Permiso:** `REPORTS_VISIBLE`  
**Componente:** `CashPosCollectionByMethod`  
**Estado:** ✅ Implementado

## Misión

Reporte gerencial para analizar lo cobrado en Caja POS por método de pago durante el período ejecutado.

## Funcionalidades implementadas

- Filtro por locación (una, varias o todas las autorizadas para el usuario)
- Filtro por rango de fechas (shortcuts + date picker)
- Filtro propio por método de pago
- Vista **Detalle** con componentes reales de pago
- Vista **Por método** con recaudación agrupada
- Gráfico de recaudación por método
- Exportación CSV, Excel y PDF respetando la vista activa

Los pagos mixtos no se informan como método `Mixto`; se descomponen en los medios de pago reales registrados dentro de `payment_details.payments`.

Cuando una operación no tiene monto a cancelar, por ejemplo ciertos cambios, se informa como `Sin cobro` y no como medio de pago.

## Endpoints

- `GET /reports/cash-pos/collection-by-method/data`
- `POST /reports/cash-pos/collection-by-method/pdf`
