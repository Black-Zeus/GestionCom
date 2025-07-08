"""
Schemas Pydantic para el modelo Permission
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator, ConfigDict


# ==========================================
# SCHEMAS PARA OPERACIONES ESPECÍFICAS
# ==========================================

class PermissionAssignment(BaseModel):
    """Schema para asignar permiso a usuario"""
    
    user_id: int = Field(..., description="ID del usuario")
    permission_id: int = Field(..., description="ID del permiso")
    permission_type: str = Field(
        default="GRANT",
        description="Tipo de permiso (GRANT o DENY)",
        regex="^(GRANT|DENY)$"
    )
    granted_by_user_id: Optional[int] = Field(
        None,
        description="ID del usuario que otorga el permiso"
    )
    expires_at: Optional[datetime] = Field(
        None,
        description="Fecha de expiración del permiso"
    )


class RolePermissionAssignment(BaseModel):
    """Schema para asignar permiso a rol"""
    
    role_id: int = Field(..., description="ID del rol")
    permission_id: int = Field(..., description="ID del permiso")
    granted_by_user_id: Optional[int] = Field(
        None,
        description="ID del usuario que otorga el permiso"
    )


class PermissionAvailability(BaseModel):
    """Schema para verificar disponibilidad de código de permiso"""
    
    permission_code: str = Field(..., description="Código de permiso a verificar")
    available: bool = Field(..., description="Si está disponible")
    suggestions: List[str] = Field(
        default_factory=list,
        description="Sugerencias si no está disponible"
    )


# ==========================================
# SCHEMAS PARA FILTROS Y BÚSQUEDAS
# ==========================================

class PermissionSearchFilters(BaseModel):
    """Schema para filtros de búsqueda de permisos"""
    
    search: Optional[str] = Field(
        None,
        description="Buscar en código, nombre o descripción"
    )
    
    permission_group: Optional[str] = Field(
        None,
        description="Filtrar por grupo específico"
    )
    
    permission_groups: Optional[List[str]] = Field(
        None,
        description="Filtrar por múltiples grupos"
    )
    
    action: Optional[str] = Field(
        None,
        description="Filtrar por tipo de acción (VIEW, CREATE, etc.)"
    )
    
    actions: Optional[List[str]] = Field(
        None,
        description="Filtrar por múltiples acciones"
    )
    
    is_active: Optional[bool] = Field(
        None,
        description="Filtrar por estado activo"
    )
    
    created_after: Optional[datetime] = Field(
        None,
        description="Permisos creados después de esta fecha"
    )
    
    created_before: Optional[datetime] = Field(
        None,
        description="Permisos creados antes de esta fecha"
    )


class PermissionListResponse(BaseModel):
    """Schema para respuesta de lista de permisos con paginación"""
    
    permissions: List[PermissionSummary] = Field(..., description="Lista de permisos")
    total: int = Field(..., description="Total de permisos")
    page: int = Field(..., description="Página actual")
    size: int = Field(..., description="Tamaño de página")
    pages: int = Field(..., description="Total de páginas")


# ==========================================
# SCHEMAS PARA GRUPOS Y ACCIONES
# ==========================================

class PermissionGroupInfo(BaseModel):
    """Schema para información de grupos de permisos"""
    
    group_code: str = Field(..., description="Código del grupo")
    group_name: str = Field(..., description="Nombre legible del grupo")
    description: str = Field(..., description="Descripción del grupo")
    permissions_count: int = Field(..., description="Número de permisos en el grupo")
    permissions: List[PermissionSummary] = Field(
        default_factory=list,
        description="Lista de permisos del grupo"
    )


class PermissionActionInfo(BaseModel):
    """Schema para información de tipos de acción"""
    
    action_code: str = Field(..., description="Código de la acción")
    action_name: str = Field(..., description="Nombre legible de la acción")
    description: str = Field(..., description="Descripción de la acción")
    permissions_count: int = Field(..., description="Número de permisos con esta acción")


class PermissionGroupsList(BaseModel):
    """Schema para lista de grupos de permisos disponibles"""
    
    groups: List[PermissionGroupInfo] = Field(..., description="Grupos de permisos")


class PermissionActionsList(BaseModel):
    """Schema para lista de acciones disponibles"""
    
    actions: List[PermissionActionInfo] = Field(..., description="Tipos de acciones")


# ==========================================
# SCHEMAS PARA PERMISOS DEL SISTEMA
# ==========================================

class SystemPermissionInfo(BaseModel):
    """Schema para información de permisos del sistema"""
    
    permission_code: str = Field(..., description="Código del permiso")
    permission_name: str = Field(..., description="Nombre del permiso")
    description: str = Field(..., description="Descripción del permiso")
    group: str = Field(..., description="Grupo al que pertenece")
    action: str = Field(..., description="Acción que permite")
    is_critical: bool = Field(..., description="Si es un permiso crítico/administrativo")


class SystemPermissionsList(BaseModel):
    """Schema para lista de permisos del sistema predefinidos"""
    
    permissions: List[SystemPermissionInfo] = Field(..., description="Permisos del sistema")
    groups: List[str] = Field(..., description="Grupos disponibles")
    actions: List[str] = Field(..., description="Acciones disponibles")


# ==========================================
# SCHEMAS PARA VALIDACIONES
# ==========================================

class PermissionValidation(BaseModel):
    """Schema para validar operaciones sobre permisos"""
    
    permission_id: int = Field(..., description="ID del permiso")
    can_be_assigned: bool = Field(..., description="Si puede ser asignado")
    can_be_deleted: bool = Field(..., description="Si puede ser eliminado")
    validation_message: str = Field(..., description="Mensaje explicativo")


class PermissionMatrixValidation(BaseModel):
    """Schema para validar matriz de permisos"""
    
    user_id: int = Field(..., description="ID del usuario")
    role_ids: List[int] = Field(..., description="IDs de roles del usuario")
    effective_permissions: List[str] = Field(..., description="Permisos efectivos")
    denied_permissions: List[str] = Field(..., description="Permisos denegados")
    conflicts: List[str] = Field(
        default_factory=list,
        description="Conflictos entre permisos"
    )


# ==========================================
# SCHEMAS PARA ESTADÍSTICAS
# ==========================================

class PermissionStatistics(BaseModel):
    """Schema para estadísticas de permisos"""
    
    total_permissions: int = Field(..., description="Total de permisos")
    active_permissions: int = Field(..., description="Permisos activos")
    permissions_by_group: Dict[str, int] = Field(
        default_factory=dict,
        description="Cantidad de permisos por grupo"
    )
    permissions_by_action: Dict[str, int] = Field(
        default_factory=dict,
        description="Cantidad de permisos por acción"
    )
    most_assigned_permissions: List[PermissionSummary] = Field(
        default_factory=list,
        description="Permisos más asignados"
    )
    unused_permissions: List[PermissionSummary] = Field(
        default_factory=list,
        description="Permisos no asignados"
    )


# ==========================================
# SCHEMAS PARA IMPORTACIÓN/EXPORTACIÓN
# ==========================================

class PermissionExport(BaseModel):
    """Schema para exportar permisos"""
    
    id: int
    permission_code: str
    permission_name: str
    permission_group: str
    permission_description: Optional[str]
    is_active: bool
    created_at: datetime
    users_count: int = 0
    roles_count: int = 0
    assigned_roles: List[str] = Field(default_factory=list)


class PermissionImport(BaseModel):
    """Schema para importar permisos"""
    
    permission_code: str = Field(..., min_length=5, max_length=100)
    permission_name: str = Field(..., min_length=3, max_length=150)
    permission_group: str = Field(..., min_length=2, max_length=50)
    permission_description: Optional[str] = Field(None, max_length=2000)
    is_active: bool = Field(default=True)
    assign_to_roles: List[str] = Field(
        default_factory=list,
        description="Códigos de roles a los que asignar este permiso"
    )
    
    # Aplicar validadores
    _validate_permission_code = validator('permission_code', allow_reuse=True)(PermissionBase.validate_permission_code)
    _validate_permission_name = validator('permission_name', allow_reuse=True)(PermissionBase.validate_permission_name)
    _validate_permission_group = validator('permission_group', allow_reuse=True)(PermissionBase.validate_permission_group)
    _validate_permission_description = validator('permission_description', allow_reuse=True)(PermissionBase.validate_permission_description)


class PermissionImportResult(BaseModel):
    """Schema para resultado de importación de permisos"""
    
    total_processed: int = Field(..., description="Total de permisos procesados")
    successful_imports: int = Field(..., description="Importaciones exitosas")
    failed_imports: int = Field(..., description="Importaciones fallidas")
    errors: List[str] = Field(
        default_factory=list,
        description="Lista de errores encontrados"
    )
    imported_permissions: List[PermissionSummary] = Field(
        default_factory=list,
        description="Permisos importados exitosamente"
    )


# ==========================================
# SCHEMAS PARA PERMISOS EFECTIVOS
# ==========================================

class UserEffectivePermissions(BaseModel):
    """Schema para permisos efectivos de un usuario"""
    
    user_id: int = Field(..., description="ID del usuario")
    username: str = Field(..., description="Username del usuario")
    
    # Permisos por roles
    role_permissions: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Permisos obtenidos por cada rol"
    )
    
    # Permisos directos
    direct_permissions: List[str] = Field(
        default_factory=list,
        description="Permisos asignados directamente"
    )
    
    # Permisos denegados
    denied_permissions: List[str] = Field(
        default_factory=list,
        description="Permisos explícitamente denegados"
    )
    
    # Resultado final
    effective_permissions: List[str] = Field(
        default_factory=list,
        description="Permisos finales efectivos"
    )
    
    # Agrupados por categoría
    permissions_by_group: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Permisos agrupados por categoría"
    )


class PermissionMatrix(BaseModel):
    """Schema para matriz completa de permisos"""
    
    users: List[UserEffectivePermissions] = Field(
        ...,
        description="Permisos efectivos por usuario"
    )
    
    total_users: int = Field(..., description="Total de usuarios analizados")
    total_permissions: int = Field(..., description="Total de permisos disponibles")
    
    summary: Dict[str, Any] = Field(
        default_factory=dict,
        description="Resumen de la matriz de permisos"
    )


# ==========================================
# SCHEMAS PARA GENERACIÓN AUTOMÁTICA
# ==========================================

class PermissionGenerator(BaseModel):
    """Schema para generar permisos automáticamente"""
    
    groups: List[str] = Field(
        ...,
        description="Grupos para los que generar permisos"
    )
    
    actions: List[str] = Field(
        ...,
        description="Acciones para las que generar permisos"
    )
    
    name_template: str = Field(
        default="{action} {group}",
        description="Template para generar nombres"
    )
    
    description_template: str = Field(
        default="Permite {action_lower} en el módulo de {group_lower}",
        description="Template para generar descripciones"
    )


class PermissionGenerationResult(BaseModel):
    """Schema para resultado de generación de permisos"""
    
    generated_count: int = Field(..., description="Permisos generados")
    skipped_count: int = Field(..., description="Permisos omitidos (ya existían)")
    error_count: int = Field(..., description="Errores en generación")
    
    generated_permissions: List[PermissionSummary] = Field(
        default_factory=list,
        description="Permisos generados exitosamente"
    )
    
    errors: List[str] = Field(
        default_factory=list,
        description="Errores encontrados"
    )
# SCHEMAS BASE
# ==========================================

class PermissionBase(BaseModel):
    """Schema base para Permission con campos comunes"""
    
    permission_code: str = Field(
        ...,
        min_length=5,
        max_length=100,
        description="Código único del permiso en formato GRUPO.ACCION",
        example="PRODUCTS.CREATE"
    )
    
    permission_name: str = Field(
        ...,
        min_length=3,
        max_length=150,
        description="Nombre descriptivo del permiso",
        example="Crear Productos"
    )
    
    permission_group: str = Field(
        ...,
        min_length=2,
        max_length=50,
        description="Grupo de permisos",
        example="PRODUCTS"
    )
    
    permission_description: Optional[str] = Field(
        None,
        max_length=2000,
        description="Descripción detallada del permiso",
        example="Permite crear nuevos productos en el sistema incluyendo configuración de precios y categorías"
    )
    
    is_active: bool = Field(
        True,
        description="Si el permiso está activo y puede ser asignado"
    )
    
    @validator('permission_code')
    def validate_permission_code(cls, v):
        """Validar código de permiso"""
        if not v:
            raise ValueError('Código de permiso es requerido')
        
        v = v.strip().upper()
        
        # Formato: GRUPO.ACCION
        import re
        if not re.match(r'^[A-Z0-9_]+\.[A-Z0-9_]+$', v):
            raise ValueError('Código de permiso debe tener formato GRUPO.ACCION (ej: PRODUCTS.CREATE)')
        
        return v
    
    @validator('permission_name')
    def validate_permission_name(cls, v):
        """Validar nombre del permiso"""
        if not v:
            raise ValueError('Nombre del permiso es requerido')
        
        return v.strip()
    
    @validator('permission_group')
    def validate_permission_group(cls, v):
        """Validar grupo del permiso"""
        if not v:
            raise ValueError('Grupo de permiso es requerido')
        
        v = v.strip().upper()
        
        # Solo caracteres alfanuméricos y guiones bajos
        import re
        if not re.match(r'^[A-Z0-9_]+$', v):
            raise ValueError('Grupo de permiso solo puede contener letras mayúsculas, números y guiones bajos')
        
        return v
    
    @validator('permission_description')
    def validate_permission_description(cls, v):
        """Validar descripción del permiso"""
        if v:
            v = v.strip()
            if not v:
                return None
        return v
    
    @validator('permission_group', 'permission_code')
    def validate_group_consistency(cls, v, values):
        """Validar consistencia entre grupo y código"""
        if 'permission_code' in values and 'permission_group' in values:
            code = values.get('permission_code', '')
            group = values.get('permission_group', '')
            
            if '.' in code:
                code_group = code.split('.')[0]
                if code_group != group:
                    raise ValueError(f'El grupo en el código ({code_group}) debe coincidir con el campo grupo ({group})')
        
        return v


# ==========================================
# SCHEMAS PARA REQUESTS
# ==========================================

class PermissionCreate(PermissionBase):
    """Schema para crear permiso"""
    pass


class PermissionUpdate(BaseModel):
    """Schema para actualizar permiso"""
    
    permission_code: Optional[str] = Field(
        None,
        min_length=5,
        max_length=100,
        description="Código único del permiso"
    )
    
    permission_name: Optional[str] = Field(
        None,
        min_length=3,
        max_length=150,
        description="Nombre descriptivo del permiso"
    )
    
    permission_group: Optional[str] = Field(
        None,
        min_length=2,
        max_length=50,
        description="Grupo de permisos"
    )
    
    permission_description: Optional[str] = Field(
        None,
        max_length=2000,
        description="Descripción detallada del permiso"
    )
    
    is_active: Optional[bool] = Field(
        None,
        description="Si el permiso está activo"
    )
    
    # Aplicar mismos validadores que PermissionBase
    _validate_permission_code = validator('permission_code', allow_reuse=True)(PermissionBase.validate_permission_code)
    _validate_permission_name = validator('permission_name', allow_reuse=True)(PermissionBase.validate_permission_name)
    _validate_permission_group = validator('permission_group', allow_reuse=True)(PermissionBase.validate_permission_group)
    _validate_permission_description = validator('permission_description', allow_reuse=True)(PermissionBase.validate_permission_description)


class PermissionBulkUpdate(BaseModel):
    """Schema para actualización masiva de permisos"""
    
    permission_ids: List[int] = Field(
        ...,
        min_items=1,
        description="Lista de IDs de permisos a actualizar"
    )
    
    is_active: Optional[bool] = Field(
        None,
        description="Activar/desactivar permisos"
    )
    
    permission_group: Optional[str] = Field(
        None,
        description="Cambiar grupo de permisos"
    )


# ==========================================
# SCHEMAS PARA RESPONSES
# ==========================================

class PermissionResponse(PermissionBase):
    """Schema para respuesta de permiso"""
    
    id: int = Field(..., description="ID único del permiso")
    
    display_name: str = Field(
        ...,
        description="Nombre para mostrar en la UI"
    )
    
    group_display: str = Field(
        ...,
        description="Nombre legible del grupo"
    )
    
    can_be_assigned: bool = Field(
        ...,
        description="Si el permiso puede ser asignado"
    )
    
    action: str = Field(
        ...,
        description="Acción extraída del código"
    )
    
    group: str = Field(
        ...,
        description="Grupo extraído del código"
    )
    
    created_at: datetime = Field(..., description="Fecha de creación")
    updated_at: datetime = Field(..., description="Última actualización")
    deleted_at: Optional[datetime] = Field(None, description="Fecha de eliminación")
    
    is_deleted: bool = Field(..., description="Si el permiso está eliminado")
    
    model_config = ConfigDict(from_attributes=True)


class PermissionSummary(BaseModel):
    """Schema resumido de permiso para listas"""
    
    id: int = Field(..., description="ID único del permiso")
    permission_code: str = Field(..., description="Código del permiso")
    permission_name: str = Field(..., description="Nombre del permiso")
    permission_group: str = Field(..., description="Grupo del permiso")
    group_display: str = Field(..., description="Nombre legible del grupo")
    is_active: bool = Field(..., description="Si el permiso está activo")
    can_be_assigned: bool = Field(..., description="Si puede ser asignado")
    action: str = Field(..., description="Acción del permiso")
    
    model_config = ConfigDict(from_attributes=True)


class PermissionDetail(PermissionResponse):
    """Schema detallado de permiso con estadísticas"""
    
    users_count: int = Field(
        default=0,
        description="Número de usuarios con este permiso"
    )
    
    roles_count: int = Field(
        default=0,
        description="Número de roles que incluyen este permiso"
    )
    
    assigned_roles: List[str] = Field(
        default_factory=list,
        description="Lista de códigos de roles que tienen este permiso"
    )


# ==========================================