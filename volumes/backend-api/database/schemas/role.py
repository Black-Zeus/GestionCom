"""
Schemas Pydantic para el modelo Role
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, validator, ConfigDict


# ==========================================
# SCHEMAS BASE
# ==========================================

class RoleBase(BaseModel):
    """Schema base para Role con campos comunes"""
    
    role_code: str = Field(
        ...,
        min_length=2,
        max_length=50,
        description="Código único del rol",
        example="INVENTORY_MANAGER"
    )
    
    role_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Nombre descriptivo del rol",
        example="Encargado de Inventario"
    )
    
    role_description: Optional[str] = Field(
        None,
        max_length=1000,
        description="Descripción detallada del rol y sus responsabilidades",
        example="Responsable de gestionar el inventario, realizar ajustes de stock y supervisar movimientos de productos"
    )
    
    is_active: bool = Field(
        True,
        description="Si el rol está activo y puede ser asignado"
    )
    
    @validator('role_code')
    def validate_role_code(cls, v):
        """Validar código de rol"""
        if not v:
            raise ValueError('Código de rol es requerido')
        
        v = v.strip().upper()
        
        # Solo caracteres alfanuméricos y guiones bajos
        import re
        if not re.match(r'^[A-Z0-9_]+$', v):
            raise ValueError('Código de rol solo puede contener letras mayúsculas, números y guiones bajos')
        
        return v
    
    @validator('role_name')
    def validate_role_name(cls, v):
        """Validar nombre del rol"""
        if not v:
            raise ValueError('Nombre del rol es requerido')
        
        return v.strip()
    
    @validator('role_description')
    def validate_role_description(cls, v):
        """Validar descripción del rol"""
        if v:
            v = v.strip()
            if not v:
                return None
        return v


# ==========================================
# SCHEMAS PARA REQUESTS
# ==========================================

class RoleCreate(RoleBase):
    """Schema para crear rol"""
    
    is_system_role: bool = Field(
        False,
        description="Si es un rol del sistema (no editable por usuarios)"
    )


class RoleUpdate(BaseModel):
    """Schema para actualizar rol"""
    
    role_code: Optional[str] = Field(
        None,
        min_length=2,
        max_length=50,
        description="Código único del rol"
    )
    
    role_name: Optional[str] = Field(
        None,
        min_length=2,
        max_length=100,
        description="Nombre descriptivo del rol"
    )
    
    role_description: Optional[str] = Field(
        None,
        max_length=1000,
        description="Descripción detallada del rol"
    )
    
    is_active: Optional[bool] = Field(
        None,
        description="Si el rol está activo"
    )
    
    # Aplicar mismos validadores que RoleBase
    _validate_role_code = validator('role_code', allow_reuse=True)(RoleBase.validate_role_code)
    _validate_role_name = validator('role_name', allow_reuse=True)(RoleBase.validate_role_name)
    _validate_role_description = validator('role_description', allow_reuse=True)(RoleBase.validate_role_description)


class RoleBulkUpdate(BaseModel):
    """Schema para actualización masiva de roles"""
    
    role_ids: List[int] = Field(
        ...,
        min_items=1,
        description="Lista de IDs de roles a actualizar"
    )
    
    is_active: Optional[bool] = Field(
        None,
        description="Activar/desactivar roles"
    )


# ==========================================
# SCHEMAS PARA RESPONSES
# ==========================================

class RoleResponse(RoleBase):
    """Schema para respuesta de rol"""
    
    id: int = Field(..., description="ID único del rol")
    
    is_system_role: bool = Field(
        ...,
        description="Si es un rol del sistema"
    )
    
    display_name: str = Field(
        ...,
        description="Nombre para mostrar en la UI"
    )
    
    can_be_assigned: bool = Field(
        ...,
        description="Si el rol puede ser asignado a usuarios"
    )
    
    is_editable: bool = Field(
        ...,
        description="Si el rol puede ser editado"
    )
    
    created_at: datetime = Field(..., description="Fecha de creación")
    updated_at: datetime = Field(..., description="Última actualización")
    deleted_at: Optional[datetime] = Field(None, description="Fecha de eliminación")
    
    is_deleted: bool = Field(..., description="Si el rol está eliminado")
    
    model_config = ConfigDict(from_attributes=True)


class RoleSummary(BaseModel):
    """Schema resumido de rol para listas"""
    
    id: int = Field(..., description="ID único del rol")
    role_code: str = Field(..., description="Código del rol")
    role_name: str = Field(..., description="Nombre del rol")
    display_name: str = Field(..., description="Nombre para mostrar")
    is_active: bool = Field(..., description="Si el rol está activo")
    is_system_role: bool = Field(..., description="Si es rol del sistema")
    can_be_assigned: bool = Field(..., description="Si puede ser asignado")
    
    model_config = ConfigDict(from_attributes=True)


class RoleDetail(RoleResponse):
    """Schema detallado de rol con estadísticas"""
    
    users_count: int = Field(
        default=0,
        description="Número de usuarios con este rol"
    )
    
    permissions_count: int = Field(
        default=0,
        description="Número de permisos asociados al rol"
    )
    
    permissions: List[str] = Field(
        default_factory=list,
        description="Lista de códigos de permisos del rol"
    )


# ==========================================
# SCHEMAS PARA OPERACIONES ESPECÍFICAS
# ==========================================

class RoleAssignment(BaseModel):
    """Schema para asignar rol a usuario"""
    
    user_id: int = Field(..., description="ID del usuario")
    role_id: int = Field(..., description="ID del rol")
    assigned_by_user_id: Optional[int] = Field(
        None,
        description="ID del usuario que asigna el rol"
    )


class RolePermissionAssignment(BaseModel):
    """Schema para asignar permiso a rol"""
    
    role_id: int = Field(..., description="ID del rol")
    permission_id: int = Field(..., description="ID del permiso")
    granted_by_user_id: Optional[int] = Field(
        None,
        description="ID del usuario que otorga el permiso"
    )


class RoleAvailability(BaseModel):
    """Schema para verificar disponibilidad de código de rol"""
    
    role_code: str = Field(..., description="Código de rol a verificar")
    available: bool = Field(..., description="Si está disponible")
    suggestions: List[str] = Field(
        default_factory=list,
        description="Sugerencias si no está disponible"
    )


# ==========================================
# SCHEMAS PARA FILTROS Y BÚSQUEDAS
# ==========================================

class RoleSearchFilters(BaseModel):
    """Schema para filtros de búsqueda de roles"""
    
    search: Optional[str] = Field(
        None,
        description="Buscar en código, nombre o descripción"
    )
    
    is_active: Optional[bool] = Field(
        None,
        description="Filtrar por estado activo"
    )
    
    is_system_role: Optional[bool] = Field(
        None,
        description="Filtrar por tipo de rol (sistema o personalizado)"
    )
    
    created_after: Optional[datetime] = Field(
        None,
        description="Roles creados después de esta fecha"
    )
    
    created_before: Optional[datetime] = Field(
        None,
        description="Roles creados antes de esta fecha"
    )


class RoleListResponse(BaseModel):
    """Schema para respuesta de lista de roles con paginación"""
    
    roles: List[RoleSummary] = Field(..., description="Lista de roles")
    total: int = Field(..., description="Total de roles")
    page: int = Field(..., description="Página actual")
    size: int = Field(..., description="Tamaño de página")
    pages: int = Field(..., description="Total de páginas")


# ==========================================
# SCHEMAS PARA ROLES DEL SISTEMA
# ==========================================

class SystemRoleInfo(BaseModel):
    """Schema para información de roles del sistema"""
    
    role_code: str = Field(..., description="Código del rol del sistema")
    role_name: str = Field(..., description="Nombre del rol")
    description: str = Field(..., description="Descripción del rol")
    level: int = Field(..., description="Nivel jerárquico (1=más alto)")
    is_admin: bool = Field(..., description="Si tiene privilegios administrativos")


class SystemRolesList(BaseModel):
    """Schema para lista de roles del sistema disponibles"""
    
    roles: List[SystemRoleInfo] = Field(..., description="Roles del sistema")


# ==========================================
# SCHEMAS PARA VALIDACIONES
# ==========================================

class RoleValidation(BaseModel):
    """Schema para validar operaciones sobre roles"""
    
    role_id: int = Field(..., description="ID del rol")
    can_be_edited: bool = Field(..., description="Si puede ser editado")
    can_be_deleted: bool = Field(..., description="Si puede ser eliminado")
    can_be_assigned: bool = Field(..., description="Si puede ser asignado")
    validation_message: str = Field(..., description="Mensaje explicativo")


# ==========================================
# SCHEMAS PARA ESTADÍSTICAS
# ==========================================

class RoleStatistics(BaseModel):
    """Schema para estadísticas de roles"""
    
    total_roles: int = Field(..., description="Total de roles")
    active_roles: int = Field(..., description="Roles activos")
    system_roles: int = Field(..., description="Roles del sistema")
    custom_roles: int = Field(..., description="Roles personalizados")
    most_assigned_roles: List[RoleSummary] = Field(
        default_factory=list,
        description="Roles más asignados"
    )


# ==========================================
# SCHEMAS PARA IMPORTACIÓN/EXPORTACIÓN
# ==========================================

class RoleExport(BaseModel):
    """Schema para exportar roles"""
    
    id: int
    role_code: str
    role_name: str
    role_description: Optional[str]
    is_system_role: bool
    is_active: bool
    created_at: datetime
    users_count: int = 0
    permissions: List[str] = Field(default_factory=list)


class RoleImport(BaseModel):
    """Schema para importar roles"""
    
    role_code: str = Field(..., min_length=2, max_length=50)
    role_name: str = Field(..., min_length=2, max_length=100)
    role_description: Optional[str] = Field(None, max_length=1000)
    is_active: bool = Field(default=True)
    permissions: List[str] = Field(
        default_factory=list,
        description="Códigos de permisos a asignar"
    )
    
    # Aplicar validadores
    _validate_role_code = validator('role_code', allow_reuse=True)(RoleBase.validate_role_code)
    _validate_role_name = validator('role_name', allow_reuse=True)(RoleBase.validate_role_name)
    _validate_role_description = validator('role_description', allow_reuse=True)(RoleBase.validate_role_description)


class RoleImportResult(BaseModel):
    """Schema para resultado de importación de roles"""
    
    total_processed: int = Field(..., description="Total de roles procesados")
    successful_imports: int = Field(..., description="Importaciones exitosas")
    failed_imports: int = Field(..., description="Importaciones fallidas")
    errors: List[str] = Field(
        default_factory=list,
        description="Lista de errores encontrados"
    )
    imported_roles: List[RoleSummary] = Field(
        default_factory=list,
        description="Roles importados exitosamente"
    )