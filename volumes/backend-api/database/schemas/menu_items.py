"""
volumes/backend-api/database/schemas/menu_item.py
Schemas Pydantic para MenuItem - Compatible con Pydantic v2
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum
import re
import json


# ==========================================
# ENUMS
# ==========================================

class MenuType(str, Enum):
    """Tipos de elementos del menú"""
    PARENT = "PARENT"
    LINK = "LINK"
    DIVIDER = "DIVIDER"
    HEADER = "HEADER"


class TargetWindow(str, Enum):
    """Tipos de ventana objetivo"""
    SELF = "SELF"
    BLANK = "BLANK"
    MODAL = "MODAL"


class PermissionType(str, Enum):
    """Tipos de relación con permisos"""
    REQUIRED = "REQUIRED"
    ALTERNATIVE = "ALTERNATIVE"
    EXCLUDE = "EXCLUDE"


# ==========================================
# BASE SCHEMAS
# ==========================================

class MenuItemBase(BaseModel):
    """Schema base para MenuItem"""
    menu_code: str = Field(..., min_length=2, max_length=50, description="Código único del menú")
    menu_name: str = Field(..., min_length=1, max_length=100, description="Nombre mostrado en el menú")
    menu_description: Optional[str] = Field(None, max_length=1000, description="Descripción del elemento")
    menu_url: Optional[str] = Field(None, max_length=255, description="URL/ruta del frontend")
    menu_type: MenuType = Field(default=MenuType.LINK, description="Tipo de elemento del menú")
    
    # Presentación
    icon_name: Optional[str] = Field(None, max_length=50, description="Nombre del icono")
    icon_color: Optional[str] = Field(None, max_length=20, description="Color del icono en formato hex")
    
    # Jerarquía
    parent_id: Optional[int] = Field(None, description="ID del menú padre")
    sort_order: int = Field(default=0, ge=0, description="Orden de aparición")
    
    # Control
    is_active: bool = Field(default=True, description="Si está activo globalmente")
    is_visible: bool = Field(default=True, description="Si es visible en el menú")
    
    # Features
    requires_feature: bool = Field(default=False, description="Si requiere característica habilitada")
    feature_code: Optional[str] = Field(None, max_length=100, description="Código de característica")
    
    # UI
    target_window: TargetWindow = Field(default=TargetWindow.SELF, description="Donde abrir el enlace")
    css_classes: Optional[str] = Field(None, max_length=255, description="Clases CSS adicionales")
    data_attributes: Optional[Dict[str, Any]] = Field(None, description="Atributos data adicionales")
    
    # Permisos
    required_permission_id: Optional[int] = Field(None, description="ID del permiso requerido")
    alternative_permissions: Optional[List[str]] = Field(None, description="Permisos alternativos")
    
    @field_validator('menu_code')
    @classmethod
    def validate_menu_code(cls, v):
        """Validar código del menú"""
        if not v:
            raise ValueError("Código del menú es requerido")
        
        v = v.strip().upper()
        
        # Solo letras, números y guiones bajos
        if not re.match(r'^[A-Z0-9_]+$', v):
            raise ValueError("Código solo puede contener letras mayúsculas, números y guiones bajos")
        
        return v
    
    @field_validator('menu_url')
    @classmethod
    def validate_menu_url(cls, v):
        """Validar URL del menú"""
        if not v:
            return None
        
        v = v.strip()
        
        # Debe empezar con / para rutas internas o http/https para externas
        if not (v.startswith('/') or v.startswith('http')):
            raise ValueError("URL debe empezar con '/' para rutas internas o 'http' para externas")
        
        return v
    
    @field_validator('icon_name')
    @classmethod
    def validate_icon_name(cls, v):
        """Validar nombre del icono"""
        if not v:
            return None
        
        v = v.strip().lower()
        
        # Solo letras, números y guiones
        if not re.match(r'^[a-z0-9-]+$', v):
            raise ValueError("Nombre del icono solo puede contener letras, números y guiones")
        
        return v
    
    @field_validator('icon_color')
    @classmethod
    def validate_icon_color(cls, v):
        """Validar color del icono"""
        if not v:
            return None
        
        v = v.strip()
        
        # Formato hex (#ffffff o #fff)
        if not re.match(r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$', v):
            raise ValueError("Color debe estar en formato hex (#ffffff o #fff)")
        
        return v.lower()
    
    @field_validator('feature_code')
    @classmethod
    def validate_feature_code(cls, v):
        """Validar código de característica"""
        if not v:
            return None
        
        v = v.strip().upper()
        
        # Solo letras, números y guiones bajos
        if not re.match(r'^[A-Z0-9_]+$', v):
            raise ValueError("Código de característica solo puede contener letras mayúsculas, números y guiones bajos")
        
        return v
    
    @field_validator('alternative_permissions')
    @classmethod
    def validate_alternative_permissions(cls, v):
        """Validar permisos alternativos"""
        if not v:
            return None
        
        if not isinstance(v, list):
            raise ValueError("Permisos alternativos debe ser una lista")
        
        # Validar que todos los elementos sean strings no vacíos
        for perm in v:
            if not isinstance(perm, str) or not perm.strip():
                raise ValueError("Todos los permisos alternativos deben ser strings no vacíos")
        
        return [perm.strip().upper() for perm in v]
    
    @field_validator('css_classes')
    @classmethod
    def validate_css_classes(cls, v):
        """Validar clases CSS"""
        if not v:
            return None
        
        v = v.strip()
        
        # Validar formato básico de clases CSS
        if not re.match(r'^[a-zA-Z0-9\s\-_]+$', v):
            raise ValueError("Clases CSS solo pueden contener letras, números, espacios, guiones y guiones bajos")
        
        return v
    
    @field_validator('data_attributes')
    @classmethod
    def validate_data_attributes(cls, v):
        """Validar atributos data"""
        if not v:
            return None
        
        if not isinstance(v, dict):
            raise ValueError("Atributos data debe ser un diccionario")
        
        # Validar claves (deben empezar con data-)
        for key in v.keys():
            if not isinstance(key, str) or not key.startswith('data-'):
                raise ValueError("Todas las claves deben empezar con 'data-'")
            
            if not re.match(r'^data-[a-z0-9-]+$', key):
                raise ValueError("Claves data deben seguir formato 'data-nombre-atributo'")
        
        return v


# ==========================================
# CRUD SCHEMAS
# ==========================================

class MenuItemCreate(MenuItemBase):
    """Schema para crear MenuItem"""
    pass


class MenuItemUpdate(BaseModel):
    """Schema para actualizar MenuItem"""
    menu_name: Optional[str] = Field(None, min_length=1, max_length=100)
    menu_description: Optional[str] = Field(None, max_length=1000)
    menu_url: Optional[str] = Field(None, max_length=255)
    menu_type: Optional[MenuType] = None
    
    # Presentación
    icon_name: Optional[str] = Field(None, max_length=50)
    icon_color: Optional[str] = Field(None, max_length=20)
    
    # Jerarquía
    parent_id: Optional[int] = None
    sort_order: Optional[int] = Field(None, ge=0)
    
    # Control
    is_active: Optional[bool] = None
    is_visible: Optional[bool] = None
    
    # Features
    requires_feature: Optional[bool] = None
    feature_code: Optional[str] = Field(None, max_length=100)
    
    # UI
    target_window: Optional[TargetWindow] = None
    css_classes: Optional[str] = Field(None, max_length=255)
    data_attributes: Optional[Dict[str, Any]] = None
    
    # Permisos
    required_permission_id: Optional[int] = None
    alternative_permissions: Optional[List[str]] = None
    
    # Aplicar las mismas validaciones que en MenuItemBase
    _validate_menu_url = field_validator('menu_url')(MenuItemBase.validate_menu_url)
    _validate_icon_name = field_validator('icon_name')(MenuItemBase.validate_icon_name)
    _validate_icon_color = field_validator('icon_color')(MenuItemBase.validate_icon_color)
    _validate_feature_code = field_validator('feature_code')(MenuItemBase.validate_feature_code)
    _validate_alternative_permissions = field_validator('alternative_permissions')(MenuItemBase.validate_alternative_permissions)
    _validate_css_classes = field_validator('css_classes')(MenuItemBase.validate_css_classes)
    _validate_data_attributes = field_validator('data_attributes')(MenuItemBase.validate_data_attributes)


class MenuItemMove(BaseModel):
    """Schema para mover MenuItem a nueva posición"""
    new_parent_id: Optional[int] = Field(None, description="Nuevo ID del padre (null para raíz)")
    new_sort_order: Optional[int] = Field(None, ge=0, description="Nueva posición en el orden")
    reason: Optional[str] = Field(None, max_length=500, description="Razón del movimiento")


class MenuItemReorder(BaseModel):
    """Schema para reordenar elementos hijos"""
    ordered_child_ids: List[int] = Field(..., description="Lista ordenada de IDs de hijos")


class MenuItemToggleStatus(BaseModel):
    """Schema para activar/desactivar MenuItem"""
    is_active: bool = Field(..., description="Nuevo estado de activación")
    reason: Optional[str] = Field(None, max_length=500, description="Razón del cambio")


class MenuItemVisibilityToggle(BaseModel):
    """Schema para mostrar/ocultar MenuItem"""
    is_visible: bool = Field(..., description="Nuevo estado de visibilidad")
    reason: Optional[str] = Field(None, max_length=500, description="Razón del cambio")


# ==========================================
# RESPONSE SCHEMAS
# ==========================================

class MenuItemResponse(BaseModel):
    """Schema de respuesta para MenuItem"""
    id: int
    menu_code: str
    menu_name: str
    menu_description: Optional[str]
    menu_url: Optional[str]
    menu_type: MenuType
    
    # Presentación
    icon_name: Optional[str]
    icon_color: Optional[str]
    
    # Jerarquía
    parent_id: Optional[int]
    menu_level: int
    menu_path: Optional[str]
    sort_order: int
    
    # Control
    is_active: bool
    is_visible: bool
    requires_feature: bool
    feature_code: Optional[str]
    
    # UI
    target_window: TargetWindow
    css_classes: Optional[str]
    data_attributes: Optional[Dict[str, Any]]
    
    # Permisos
    required_permission_id: Optional[int]
    alternative_permissions: Optional[List[str]]
    
    # Propiedades calculadas
    has_children: bool
    children_count: int
    active_children_count: int
    is_root: bool
    is_leaf: bool
    requires_permission: bool
    
    # Metadatos
    created_at: datetime
    updated_at: datetime
    created_by_user_id: Optional[int]
    
    model_config = ConfigDict(from_attributes=True)


class MenuItemWithPermissions(MenuItemResponse):
    """MenuItem con información detallada de permisos"""
    required_permission: Optional[Dict[str, Any]] = None
    all_permission_codes: List[str] = Field(default_factory=list)
    additional_permissions: List[Dict[str, Any]] = Field(default_factory=list)


class MenuItemWithRelations(MenuItemResponse):
    """MenuItem con relaciones completas"""
    parent: Optional["MenuItemResponse"] = None
    created_by_user: Optional[Dict[str, Any]] = None
    required_permission: Optional[Dict[str, Any]] = None


class MenuItemHierarchical(BaseModel):
    """MenuItem en estructura jerárquica"""
    id: int
    menu_code: str
    menu_name: str
    menu_description: Optional[str]
    menu_url: Optional[str]
    menu_type: MenuType
    icon_name: Optional[str]
    icon_color: Optional[str]
    menu_level: int
    sort_order: int
    is_active: bool
    is_visible: bool
    target_window: TargetWindow
    css_classes: Optional[str]
    data_attributes: Optional[Dict[str, Any]]
    requires_feature: bool
    feature_code: Optional[str]
    has_children: bool
    children_count: int
    children: List["MenuItemHierarchical"] = Field(default_factory=list)
    
    model_config = ConfigDict(from_attributes=True)


class MenuItemBreadcrumb(BaseModel):
    """Elemento de breadcrumb"""
    id: int
    code: str
    name: str
    url: Optional[str]


class MenuItemWithBreadcrumb(MenuItemResponse):
    """MenuItem con breadcrumb"""
    breadcrumb: List[MenuItemBreadcrumb] = Field(default_factory=list)


# ==========================================
# BULK OPERATIONS SCHEMAS
# ==========================================

class MenuItemBulkUpdate(BaseModel):
    """Schema para actualización masiva"""
    menu_item_ids: List[int] = Field(..., min_length=1, description="IDs de menús a actualizar")
    updates: MenuItemUpdate = Field(..., description="Campos a actualizar")
    reason: Optional[str] = Field(None, max_length=500, description="Razón de la actualización masiva")


class MenuItemBulkToggle(BaseModel):
    """Schema para activación/desactivación masiva"""
    menu_item_ids: List[int] = Field(..., min_length=1, description="IDs de menús")
    is_active: bool = Field(..., description="Estado de activación")
    reason: Optional[str] = Field(None, max_length=500, description="Razón del cambio")


class MenuItemBulkMove(BaseModel):
    """Schema para movimiento masivo"""
    menu_item_ids: List[int] = Field(..., min_length=1, description="IDs de menús a mover")
    new_parent_id: Optional[int] = Field(None, description="Nuevo padre común")
    reason: Optional[str] = Field(None, max_length=500, description="Razón del movimiento")


# ==========================================
# PERMISSION ASSIGNMENT SCHEMAS
# ==========================================

class MenuItemPermissionAssignment(BaseModel):
    """Schema para asignar permisos a menú"""
    permission_id: int = Field(..., gt=0, description="ID del permiso")
    permission_type: PermissionType = Field(default=PermissionType.ALTERNATIVE, description="Tipo de relación")


class MenuItemPermissionBulkAssignment(BaseModel):
    """Schema para asignación masiva de permisos"""
    permission_ids: List[int] = Field(..., min_length=1, description="IDs de permisos")
    permission_type: PermissionType = Field(default=PermissionType.ALTERNATIVE, description="Tipo de relación")


class MenuItemPermissionUpdate(BaseModel):
    """Schema para actualizar permisos de menú"""
    required_permission_id: Optional[int] = None
    alternative_permissions: Optional[List[str]] = None
    additional_permission_assignments: Optional[List[MenuItemPermissionAssignment]] = None


# ==========================================
# SEARCH AND FILTER SCHEMAS
# ==========================================

class MenuItemSearchFilters(BaseModel):
    """Filtros para búsqueda de menús"""
    search: Optional[str] = Field(None, description="Búsqueda en código, nombre o descripción")
    menu_type: Optional[MenuType] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_visible: Optional[bool] = None
    requires_feature: Optional[bool] = None
    feature_code: Optional[str] = None
    has_children: Optional[bool] = None
    menu_level: Optional[int] = Field(None, ge=1, le=10)
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None


class MenuItemListResponse(BaseModel):
    """Respuesta de lista de menús"""
    menu_items: List[MenuItemResponse]
    total_found: int
    filters_applied: MenuItemSearchFilters
    pagination: Dict[str, Any]


# ==========================================
# TREE STRUCTURE SCHEMAS
# ==========================================

class MenuItemTreeNode(BaseModel):
    """Nodo del árbol de menús"""
    id: int
    menu_code: str
    menu_name: str
    menu_type: MenuType
    icon_name: Optional[str]
    menu_level: int
    sort_order: int
    is_active: bool
    is_visible: bool
    has_children: bool
    children: List["MenuItemTreeNode"] = Field(default_factory=list)


class MenuItemTree(BaseModel):
    """Árbol completo de menús"""
    roots: List[MenuItemTreeNode] = Field(default_factory=list)
    total_nodes: int
    max_depth: int
    generated_at: datetime


# ==========================================
# VALIDATION SCHEMAS
# ==========================================

class MenuItemValidation(BaseModel):
    """Resultado de validación de menú"""
    is_valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)


class MenuItemHierarchyValidation(BaseModel):
    """Validación de jerarquía de menús"""
    is_valid: bool
    circular_references: List[Dict[str, Any]] = Field(default_factory=list)
    orphaned_items: List[Dict[str, Any]] = Field(default_factory=list)
    deep_nesting_warnings: List[Dict[str, Any]] = Field(default_factory=list)
    duplicate_codes: List[Dict[str, Any]] = Field(default_factory=list)


# ==========================================
# EXPORT/IMPORT SCHEMAS
# ==========================================

class MenuItemExport(BaseModel):
    """Schema para exportar menús"""
    include_inactive: bool = Field(default=False, description="Incluir menús inactivos")
    include_children: bool = Field(default=True, description="Incluir estructura jerárquica")
    format: str = Field(default="json", description="Formato de exportación")
    parent_id: Optional[int] = Field(None, description="Exportar solo subárbol específico")


class MenuItemImport(BaseModel):
    """Schema para importar menús"""
    menu_items: List[MenuItemCreate] = Field(..., description="Lista de menús a importar")
    overwrite_existing: bool = Field(default=False, description="Sobrescribir menús existentes")
    preserve_hierarchy: bool = Field(default=True, description="Preservar estructura jerárquica")
    dry_run: bool = Field(default=False, description="Solo validar sin importar")


class MenuItemImportResult(BaseModel):
    """Resultado de importación"""
    success: bool
    created_count: int
    updated_count: int
    skipped_count: int
    error_count: int
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[Dict[str, Any]] = Field(default_factory=list)


# ==========================================
# STATS SCHEMAS
# ==========================================

class MenuItemStats(BaseModel):
    """Estadísticas de menús"""
    total_items: int
    active_items: int
    visible_items: int
    items_by_type: Dict[str, int]
    items_by_level: Dict[int, int]
    items_with_permissions: int
    items_with_features: int
    orphaned_items: int
    max_depth: int
    generated_at: datetime


# ==========================================
# AUDIT SCHEMAS
# ==========================================

class MenuItemAuditLog(BaseModel):
    """Log de auditoría de menús"""
    menu_item_id: int
    action: str
    old_values: Optional[Dict[str, Any]]
    new_values: Optional[Dict[str, Any]]
    changed_by_user_id: int
    changed_at: datetime
    ip_address: Optional[str]
    user_agent: Optional[str]
    reason: Optional[str]


# Resolver referencias forward para MenuItemHierarchical y MenuItemTreeNode
MenuItemHierarchical.model_rebuild()
MenuItemTreeNode.model_rebuild()