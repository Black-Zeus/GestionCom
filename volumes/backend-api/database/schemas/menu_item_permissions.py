"""
volumes/backend-api/database/schemas/menu_item_permission.py
Schemas Pydantic para MenuItemPermission - Compatible con Pydantic v2
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum


# ==========================================
# ENUMS
# ==========================================

class PermissionType(str, Enum):
    """Tipos de relación entre menú y permiso"""
    REQUIRED = "REQUIRED"
    ALTERNATIVE = "ALTERNATIVE"
    EXCLUDE = "EXCLUDE"


# ==========================================
# BASE SCHEMAS
# ==========================================

class MenuItemPermissionBase(BaseModel):
    """Schema base para MenuItemPermission"""
    menu_item_id: int = Field(..., gt=0, description="ID del elemento del menú")
    permission_id: int = Field(..., gt=0, description="ID del permiso")
    permission_type: PermissionType = Field(
        default=PermissionType.ALTERNATIVE, 
        description="Tipo de relación con el permiso"
    )
    
    @field_validator('menu_item_id')
    @classmethod
    def validate_menu_item_id(cls, v):
        """Validar ID del menú"""
        if not isinstance(v, int) or v <= 0:
            raise ValueError("ID del menú debe ser un entero positivo")
        return v
    
    @field_validator('permission_id')
    @classmethod
    def validate_permission_id(cls, v):
        """Validar ID del permiso"""
        if not isinstance(v, int) or v <= 0:
            raise ValueError("ID del permiso debe ser un entero positivo")
        return v
    
    @field_validator('permission_type')
    @classmethod
    def validate_permission_type(cls, v):
        """Validar tipo de permiso"""
        if isinstance(v, str):
            try:
                return PermissionType(v.upper())
            except ValueError:
                valid_types = [t.value for t in PermissionType]
                raise ValueError(f"Tipo de permiso debe ser uno de: {valid_types}")
        return v


# ==========================================
# CRUD SCHEMAS
# ==========================================

class MenuItemPermissionCreate(MenuItemPermissionBase):
    """Schema para crear MenuItemPermission"""
    pass


class MenuItemPermissionUpdate(BaseModel):
    """Schema para actualizar MenuItemPermission"""
    permission_type: Optional[PermissionType] = Field(
        None, 
        description="Nuevo tipo de relación con el permiso"
    )
    
    @field_validator('permission_type')
    @classmethod
    def validate_permission_type(cls, v):
        """Validar tipo de permiso"""
        if v is None:
            return None
        
        if isinstance(v, str):
            try:
                return PermissionType(v.upper())
            except ValueError:
                valid_types = [t.value for t in PermissionType]
                raise ValueError(f"Tipo de permiso debe ser uno de: {valid_types}")
        return v


class MenuItemPermissionBulkCreate(BaseModel):
    """Schema para crear múltiples asignaciones de permisos"""
    menu_item_id: int = Field(..., gt=0, description="ID del elemento del menú")
    permission_assignments: List[Dict[str, Any]] = Field(
        ..., 
        min_length=1,
        description="Lista de asignaciones de permisos"
    )
    
    @field_validator('permission_assignments')
    @classmethod
    def validate_permission_assignments(cls, v):
        """Validar asignaciones de permisos"""
        if not isinstance(v, list) or len(v) == 0:
            raise ValueError("Debe proporcionar al menos una asignación de permiso")
        
        for i, assignment in enumerate(v):
            if not isinstance(assignment, dict):
                raise ValueError(f"Asignación {i+1} debe ser un diccionario")
            
            if 'permission_id' not in assignment:
                raise ValueError(f"Asignación {i+1} debe incluir 'permission_id'")
            
            permission_id = assignment.get('permission_id')
            if not isinstance(permission_id, int) or permission_id <= 0:
                raise ValueError(f"Asignación {i+1}: permission_id debe ser un entero positivo")
            
            permission_type = assignment.get('permission_type', 'ALTERNATIVE')
            if isinstance(permission_type, str):
                try:
                    PermissionType(permission_type.upper())
                except ValueError:
                    valid_types = [t.value for t in PermissionType]
                    raise ValueError(f"Asignación {i+1}: tipo debe ser uno de: {valid_types}")
        
        return v


class MenuItemPermissionBulkUpdate(BaseModel):
    """Schema para actualizar múltiples asignaciones"""
    assignments: List[Dict[str, Any]] = Field(
        ..., 
        min_length=1,
        description="Lista de asignaciones a actualizar"
    )
    
    @field_validator('assignments')
    @classmethod
    def validate_assignments(cls, v):
        """Validar asignaciones"""
        if not isinstance(v, list) or len(v) == 0:
            raise ValueError("Debe proporcionar al menos una asignación")
        
        for i, assignment in enumerate(v):
            if not isinstance(assignment, dict):
                raise ValueError(f"Asignación {i+1} debe ser un diccionario")
            
            if 'id' not in assignment:
                raise ValueError(f"Asignación {i+1} debe incluir 'id'")
            
            assignment_id = assignment.get('id')
            if not isinstance(assignment_id, int) or assignment_id <= 0:
                raise ValueError(f"Asignación {i+1}: id debe ser un entero positivo")
            
            if 'permission_type' in assignment:
                permission_type = assignment.get('permission_type')
                if isinstance(permission_type, str):
                    try:
                        PermissionType(permission_type.upper())
                    except ValueError:
                        valid_types = [t.value for t in PermissionType]
                        raise ValueError(f"Asignación {i+1}: tipo debe ser uno de: {valid_types}")
        
        return v


class MenuItemPermissionDelete(BaseModel):
    """Schema para eliminar asignaciones de permisos"""
    menu_item_id: int = Field(..., gt=0, description="ID del elemento del menú")
    permission_ids: List[int] = Field(
        ..., 
        min_length=1,
        description="Lista de IDs de permisos a eliminar"
    )
    reason: Optional[str] = Field(None, max_length=500, description="Razón de la eliminación")
    
    @field_validator('permission_ids')
    @classmethod
    def validate_permission_ids(cls, v):
        """Validar IDs de permisos"""
        if not isinstance(v, list) or len(v) == 0:
            raise ValueError("Debe proporcionar al menos un ID de permiso")
        
        for permission_id in v:
            if not isinstance(permission_id, int) or permission_id <= 0:
                raise ValueError("Todos los IDs de permisos deben ser enteros positivos")
        
        return list(set(v))  # Eliminar duplicados


# ==========================================
# RESPONSE SCHEMAS
# ==========================================

class MenuItemPermissionResponse(BaseModel):
    """Schema de respuesta para MenuItemPermission"""
    id: int
    menu_item_id: int
    permission_id: int
    permission_type: PermissionType
    
    # Propiedades calculadas
    is_required: bool
    is_alternative: bool
    is_exclude: bool
    grants_access: bool
    denies_access: bool
    relationship_description: str
    
    # Información básica de relaciones
    permission_code: Optional[str]
    permission_name: Optional[str]
    menu_code: Optional[str]
    menu_name: Optional[str]
    
    # Metadatos
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class MenuItemPermissionDetailed(MenuItemPermissionResponse):
    """MenuItemPermission con información detallada de relaciones"""
    menu_item: Optional[Dict[str, Any]] = Field(None, description="Información del menú")
    permission: Optional[Dict[str, Any]] = Field(None, description="Información del permiso")


class MenuItemPermissionWithRelations(BaseModel):
    """MenuItemPermission con relaciones completas"""
    id: int
    menu_item_id: int
    permission_id: int
    permission_type: PermissionType
    
    # Relaciones completas
    menu_item: Dict[str, Any]
    permission: Dict[str, Any]
    
    # Propiedades calculadas
    grants_access: bool
    denies_access: bool
    relationship_description: str
    
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# BULK OPERATION SCHEMAS
# ==========================================

class MenuItemPermissionBulkResponse(BaseModel):
    """Respuesta de operaciones masivas"""
    success: bool
    created_count: int = 0
    updated_count: int = 0
    deleted_count: int = 0
    skipped_count: int = 0
    error_count: int = 0
    total_processed: int
    
    # Detalles de resultados
    created_items: List[MenuItemPermissionResponse] = Field(default_factory=list)
    updated_items: List[MenuItemPermissionResponse] = Field(default_factory=list)
    deleted_items: List[Dict[str, Any]] = Field(default_factory=list)
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    
    # Metadatos
    operation_type: str
    processed_at: datetime
    processing_time_ms: Optional[int] = None


# ==========================================
# PERMISSION MANAGEMENT SCHEMAS
# ==========================================

class MenuPermissionSummary(BaseModel):
    """Resumen de permisos de un menú"""
    menu_item_id: int
    menu_code: str
    menu_name: str
    total_permissions: int
    
    # Permisos por tipo
    required_permissions: List[Dict[str, Any]] = Field(default_factory=list)
    alternative_permissions: List[Dict[str, Any]] = Field(default_factory=list)
    exclude_permissions: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Contadores por tipo
    by_type_count: Dict[str, int] = Field(default_factory=dict)
    
    # Metadatos
    has_restrictions: bool
    access_complexity: str  # 'SIMPLE', 'MODERATE', 'COMPLEX'
    generated_at: datetime


class UserMenuAccessCheck(BaseModel):
    """Resultado de verificación de acceso"""
    menu_item_id: int
    user_id: Optional[int] = None
    user_permissions: List[str] = Field(default_factory=list)
    
    # Resultado
    has_access: bool
    access_reason: str
    
    # Detalles de verificación
    missing_required_permissions: List[str] = Field(default_factory=list)
    available_alternative_permissions: List[str] = Field(default_factory=list)
    conflicting_exclude_permissions: List[str] = Field(default_factory=list)
    
    # Recomendaciones
    recommendations: List[str] = Field(default_factory=list)
    
    checked_at: datetime


class MenuPermissionMatrix(BaseModel):
    """Matriz de permisos para múltiples menús"""
    menu_items: List[Dict[str, Any]]
    permissions: List[Dict[str, Any]]
    matrix: Dict[str, Dict[str, str]]  # menu_id -> permission_id -> type
    
    # Estadísticas
    total_menus: int
    total_permissions: int
    total_assignments: int
    
    generated_at: datetime


# ==========================================
# VALIDATION SCHEMAS
# ==========================================

class MenuItemPermissionValidation(BaseModel):
    """Validación de asignación de permisos"""
    is_valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    
    # Detalles de validación
    duplicate_assignments: List[Dict[str, Any]] = Field(default_factory=list)
    conflicting_assignments: List[Dict[str, Any]] = Field(default_factory=list)
    invalid_references: List[Dict[str, Any]] = Field(default_factory=list)


class MenuPermissionConflictCheck(BaseModel):
    """Verificación de conflictos en permisos"""
    menu_item_id: int
    has_conflicts: bool
    conflicts: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Tipos de conflictos
    required_and_exclude_same_permission: List[Dict[str, Any]] = Field(default_factory=list)
    multiple_required_overlapping: List[Dict[str, Any]] = Field(default_factory=list)
    redundant_alternatives: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Recomendaciones
    resolution_suggestions: List[str] = Field(default_factory=list)
    
    checked_at: datetime


# ==========================================
# SEARCH AND FILTER SCHEMAS
# ==========================================

class MenuItemPermissionFilters(BaseModel):
    """Filtros para búsqueda de asignaciones"""
    menu_item_id: Optional[int] = None
    permission_id: Optional[int] = None
    permission_type: Optional[PermissionType] = None
    permission_code: Optional[str] = None
    menu_code: Optional[str] = None
    
    # Filtros de búsqueda
    search: Optional[str] = Field(None, description="Búsqueda en códigos y nombres")
    
    # Filtros de fecha
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    
    # Filtros booleanos
    grants_access: Optional[bool] = None
    denies_access: Optional[bool] = None


class MenuItemPermissionListResponse(BaseModel):
    """Respuesta de lista de asignaciones"""
    assignments: List[MenuItemPermissionResponse]
    total_found: int
    filters_applied: MenuItemPermissionFilters
    pagination: Dict[str, Any]
    
    # Estadísticas de la búsqueda
    summary: Dict[str, Any] = Field(default_factory=dict)


# ==========================================
# COPY/CLONE SCHEMAS
# ==========================================

class MenuPermissionCopy(BaseModel):
    """Schema para copiar permisos entre menús"""
    source_menu_id: int = Field(..., gt=0, description="ID del menú origen")
    target_menu_ids: List[int] = Field(
        ..., 
        min_length=1,
        description="IDs de menús destino"
    )
    permission_types_to_copy: List[PermissionType] = Field(
        default_factory=lambda: list(PermissionType),
        description="Tipos de permisos a copiar"
    )
    overwrite_existing: bool = Field(
        default=False, 
        description="Sobrescribir asignaciones existentes"
    )
    reason: Optional[str] = Field(None, max_length=500, description="Razón de la copia")
    
    @field_validator('target_menu_ids')
    @classmethod
    def validate_target_menu_ids(cls, v):
        """Validar IDs de menús destino"""
        if not isinstance(v, list) or len(v) == 0:
            raise ValueError("Debe proporcionar al menos un menú destino")
        
        for menu_id in v:
            if not isinstance(menu_id, int) or menu_id <= 0:
                raise ValueError("Todos los IDs de menús deben ser enteros positivos")
        
        return list(set(v))  # Eliminar duplicados


class MenuPermissionTemplate(BaseModel):
    """Template de permisos para aplicar a múltiples menús"""
    template_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    
    permission_assignments: List[Dict[str, Any]] = Field(
        ...,
        min_length=1,
        description="Lista de asignaciones del template"
    )
    
    # Configuración de aplicación
    apply_to_menu_types: List[str] = Field(default_factory=list)
    exclude_menus_with_permissions: bool = Field(default=False)
    
    created_by_user_id: Optional[int] = None
    is_system_template: bool = Field(default=False)


class MenuPermissionTemplateApplication(BaseModel):
    """Aplicación de template a menús"""
    template_id: int = Field(..., gt=0)
    target_menu_ids: List[int] = Field(..., min_length=1)
    overwrite_existing: bool = Field(default=False)
    dry_run: bool = Field(default=False, description="Solo simular sin aplicar")
    reason: Optional[str] = Field(None, max_length=500)


# ==========================================
# ANALYTICS SCHEMAS
# ==========================================

class MenuPermissionAnalytics(BaseModel):
    """Analytics de uso de permisos en menús"""
    
    # Estadísticas generales
    total_menu_items: int
    total_permissions: int
    total_assignments: int
    
    # Distribución por tipo
    assignments_by_type: Dict[str, int]
    
    # Menús más restringidos
    most_restricted_menus: List[Dict[str, Any]]
    least_restricted_menus: List[Dict[str, Any]]
    
    # Permisos más utilizados
    most_used_permissions: List[Dict[str, Any]]
    unused_permissions: List[Dict[str, Any]]
    
    # Complejidad del sistema
    average_permissions_per_menu: float
    max_permissions_per_menu: int
    menus_without_restrictions: int
    
    # Tendencias
    recent_changes: List[Dict[str, Any]]
    
    generated_at: datetime
    generated_by_user_id: Optional[int] = None


# ==========================================
# EXPORT/IMPORT SCHEMAS
# ==========================================

class MenuPermissionExport(BaseModel):
    """Configuración de exportación de permisos"""
    menu_item_ids: Optional[List[int]] = Field(None, description="Menús específicos (opcional)")
    permission_types: List[PermissionType] = Field(
        default_factory=lambda: list(PermissionType),
        description="Tipos de permisos a exportar"
    )
    include_menu_details: bool = Field(default=True)
    include_permission_details: bool = Field(default=True)
    format: str = Field(default="json", description="Formato de exportación")


class MenuPermissionImport(BaseModel):
    """Importación de permisos"""
    assignments: List[MenuItemPermissionCreate] = Field(..., min_length=1)
    overwrite_existing: bool = Field(default=False)
    validate_references: bool = Field(default=True)
    dry_run: bool = Field(default=False)
    import_source: Optional[str] = Field(None, description="Origen de la importación")


class MenuPermissionImportResult(BaseModel):
    """Resultado de importación"""
    success: bool
    imported_count: int
    skipped_count: int
    error_count: int
    
    # Detalles
    imported_assignments: List[MenuItemPermissionResponse] = Field(default_factory=list)
    skipped_assignments: List[Dict[str, Any]] = Field(default_factory=list)
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    
    # Metadatos
    import_source: Optional[str] = None
    imported_at: datetime
    imported_by_user_id: Optional[int] = None