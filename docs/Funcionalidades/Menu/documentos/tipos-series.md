# Tipos y series de documentos

**Ruta:** `/documents/series`  
**Permiso:** `DOCUMENT_SERIES_ACCESS` o `DOCUMENT_SERIES_MANAGE`  
**Componente:** `AdminDocumentTypes` (con drill-down a `AdminDocumentSeries`)  
**Estado:** ✅ Implementado

## Misión

Gestión de los tipos de documentos tributarios y comerciales del sistema (boleta, factura, nota de crédito, guía de despacho, etc.) y sus series de numeración. Cada tipo puede tener múltiples series activas asociadas a bodegas o globales.

## Funcionalidades implementadas

**Tipos de documentos (`AdminDocumentTypes`):**
- Listado de tipos con nombre, categoría (venta/compra/inventario/transferencia) y estado
- Creación y edición: nombre, código, categoría, descripción
- Toggle activar / desactivar tipo con confirmación
- Eliminación con validación
- Acceso a series del tipo desde la fila

**Series de documentos (`AdminDocumentSeries`) — drill-down desde la fila:**
- Listado de series del tipo seleccionado con rango de números y bodega
- Creación de serie: código, bodega (o global), número inicial/final
- Edición de serie
- Toggle activar / desactivar serie con confirmación
- Eliminación de serie
