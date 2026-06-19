# Auditoría del sistema

**Ruta:** `/reports/audit/system`  
**Permiso:** `AUDIT_VISIBLE`  
**Componente:** — (sin componente asignado)  
**Estado:** 🚧 En desarrollo

## Misión

Registro de auditoría de las acciones realizadas sobre los datos maestros del sistema (altas, bajas, modificaciones). Permite rastrear qué usuario realizó qué cambio y en qué momento.

## Funcionalidades planificadas

- Log completo de cambios en entidades críticas (productos, clientes, usuarios, configuración)
- Filtros por entidad, usuario, tipo de acción y rango de fechas
- Visualización de estado anterior vs. estado nuevo (diff)
- Exportación del log de auditoría
