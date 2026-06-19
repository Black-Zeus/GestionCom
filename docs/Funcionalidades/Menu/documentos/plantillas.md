# Plantillas de documentos

**Ruta:** `/documents/templates`  
**Permiso:** `DOCUMENT_TEMPLATES_ACCESS` o `DOCUMENT_TEMPLATES_MANAGE`  
**Componente:** `AdminDocumentTemplates` → `DocumentTemplateMaintainers`  
**Estado:** ✅ Implementado

## Misión

Gestión de las plantillas de salida para documentos comerciales. Define el formato de impresión o envío de cada tipo de documento (PDF, email, thermal) con su contenido HTML y configuración de página.

## Funcionalidades implementadas

- Listado de plantillas por tipo de documento y canal
- Creación y edición: canal (PDF/email/thermal), asunto, cuerpo HTML, tamaño de papel, orientación
- Flag de plantilla por defecto para cada tipo/canal
- Activar / desactivar plantilla
