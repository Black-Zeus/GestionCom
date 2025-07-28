"""
volumes/backend-api/database/schemas/user_menu_favorite.py
Schemas Pydantic para UserMenuFavorite - Compatible con Pydantic v2
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta


# ==========================================
# BASE SCHEMAS
# ==========================================

class UserMenuFavoriteBase(BaseModel):
    """Schema base para UserMenuFavorite"""
    user_id: int = Field(..., gt=0, description="ID del usuario propietario")
    menu_item_id: int = Field(..., gt=0, description="ID del elemento del menú favorito")
    favorite_order: int = Field(
        default=0, 
        ge=0, 
        le=9999, 
        description="Orden de aparición en la lista de favoritos"
    )
    
    @field_validator('user_id')
    @classmethod
    def validate_user_id(cls, v):
        """Validar ID del usuario"""
        if not isinstance(v, int) or v <= 0:
            raise ValueError("ID del usuario debe ser un entero positivo")
        return v
    
    @field_validator('menu_item_id')
    @classmethod
    def validate_menu_item_id(cls, v):
        """Validar ID del menú"""
        if not isinstance(v, int) or v <= 0:
            raise ValueError("ID del menú debe ser un entero positivo")
        return v
    
    @field_validator('favorite_order')
    @classmethod
    def validate_favorite_order(cls, v):
        """Validar orden del favorito"""
        if not isinstance(v, int) or v < 0:
            raise ValueError("Orden del favorito debe ser un entero no negativo")
        return v


# ==========================================
# CRUD SCHEMAS
# ==========================================

class UserMenuFavoriteCreate(UserMenuFavoriteBase):
    """Schema para crear UserMenuFavorite"""
    pass


class UserMenuFavoriteUpdate(BaseModel):
    """Schema para actualizar UserMenuFavorite"""
    favorite_order: Optional[int] = Field(None, ge=0, le=9999, description="Nuevo orden")
    
    @field_validator('favorite_order')
    @classmethod
    def validate_favorite_order(cls, v):
        """Validar orden del favorito"""
        if v is not None and (not isinstance(v, int) or v < 0):
            raise ValueError("Orden del favorito debe ser un entero no negativo")
        return v


class UserMenuFavoriteBulkCreate(BaseModel):
    """Schema para crear múltiples favoritos"""
    user_id: int = Field(..., gt=0, description="ID del usuario")
    menu_item_ids: List[int] = Field(
        ..., 
        min_length=1,
        max_length=100,
        description="Lista de IDs de menús a agregar a favoritos"
    )
    starting_order: int = Field(
        default=0, 
        ge=0,
        description="Orden inicial para los nuevos favoritos"
    )
    
    @field_validator('menu_item_ids')
    @classmethod
    def validate_menu_item_ids(cls, v):
        """Validar lista de IDs de menús"""
        if not isinstance(v, list) or len(v) == 0:
            raise ValueError("Debe proporcionar al menos un ID de menú")
        
        for menu_id in v:
            if not isinstance(menu_id, int) or menu_id <= 0:
                raise ValueError("Todos los IDs de menús deben ser enteros positivos")
        
        # Eliminar duplicados manteniendo orden
        return list(dict.fromkeys(v))


class UserMenuFavoriteReorder(BaseModel):
    """Schema para reordenar favoritos"""
    user_id: int = Field(..., gt=0, description="ID del usuario")
    ordered_menu_ids: List[int] = Field(
        ..., 
        min_length=1,
        description="Lista ordenada de IDs de menús favoritos"
    )
    
    @field_validator('ordered_menu_ids')
    @classmethod
    def validate_ordered_menu_ids(cls, v):
        """Validar lista ordenada de IDs"""
        if not isinstance(v, list) or len(v) == 0:
            raise ValueError("Debe proporcionar al menos un ID de menú")
        
        for menu_id in v:
            if not isinstance(menu_id, int) or menu_id <= 0:
                raise ValueError("Todos los IDs de menús deben ser enteros positivos")
        
        return v


class UserMenuFavoriteDelete(BaseModel):
    """Schema para eliminar favoritos"""
    user_id: int = Field(..., gt=0, description="ID del usuario")
    menu_item_ids: List[int] = Field(
        ..., 
        min_length=1,
        description="Lista de IDs de menús a remover de favoritos"
    )
    
    @field_validator('menu_item_ids')
    @classmethod
    def validate_menu_item_ids(cls, v):
        """Validar lista de IDs a eliminar"""
        if not isinstance(v, list) or len(v) == 0:
            raise ValueError("Debe proporcionar al menos un ID de menú")
        
        for menu_id in v:
            if not isinstance(menu_id, int) or menu_id <= 0:
                raise ValueError("Todos los IDs de menús deben ser enteros positivos")
        
        return list(set(v))  # Eliminar duplicados


# ==========================================
# RESPONSE SCHEMAS
# ==========================================

class UserMenuFavoriteResponse(BaseModel):
    """Schema de respuesta para UserMenuFavorite"""
    id: int
    user_id: int
    menu_item_id: int
    favorite_order: int
    
    # Información básica de relaciones
    username: Optional[str]
    user_full_name: Optional[str]
    menu_code: Optional[str]
    menu_name: Optional[str]
    menu_url: Optional[str]
    menu_icon: Optional[str]
    menu_icon_color: Optional[str]
    
    # Estado del menú
    is_menu_active: bool
    is_menu_visible: bool
    is_accessible: bool
    
    # Información temporal
    added_time_ago: str
    is_recent_favorite: bool
    
    # Jerarquía
    menu_level: Optional[int]
    menu_parent_name: Optional[str]
    
    # Metadatos
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class UserMenuFavoriteDetailed(UserMenuFavoriteResponse):
    """UserMenuFavorite con información detallada"""
    menu_breadcrumb: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Relaciones completas
    user: Optional[Dict[str, Any]] = None
    menu_item: Optional[Dict[str, Any]] = None


class UserMenuFavoriteForMenu(BaseModel):
    """UserMenuFavorite optimizado para construcción de menús"""
    id: int
    menu_code: str
    menu_name: str
    menu_url: Optional[str]
    icon_name: Optional[str]
    icon_color: Optional[str]
    target_window: str = "SELF"
    css_classes: Optional[str]
    is_favorite: bool = True
    favorite_order: int
    favorite_since: Optional[str]
    
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# BULK OPERATIONS SCHEMAS
# ==========================================

class UserMenuFavoriteBulkResponse(BaseModel):
    """Respuesta de operaciones masivas"""
    success: bool
    created_count: int = 0
    updated_count: int = 0
    deleted_count: int = 0
    skipped_count: int = 0
    error_count: int = 0
    
    # Detalles
    created_favorites: List[UserMenuFavoriteResponse] = Field(default_factory=list)
    updated_favorites: List[UserMenuFavoriteResponse] = Field(default_factory=list)
    deleted_favorites: List[Dict[str, Any]] = Field(default_factory=list)
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    
    # Metadatos
    operation_type: str
    processed_at: datetime
    processing_time_ms: Optional[int] = None


# ==========================================
# ANALYTICS SCHEMAS
# ==========================================

class UserFavoriteStats(BaseModel):
    """Estadísticas de favoritos de un usuario"""
    user_id: int
    username: Optional[str] = None
    user_full_name: Optional[str] = None
    
    # Estadísticas básicas
    total_favorites: int
    recent_favorites: int  # Últimos 7 días
    accessible_favorites: int  # Activos y visibles
    
    # Información temporal
    oldest_favorite_date: Optional[datetime] = None
    newest_favorite_date: Optional[datetime] = None
    avg_favorites_per_month: float = 0.0
    
    # Distribución
    favorites_by_level: Dict[int, int] = Field(default_factory=dict)
    most_used_parent_menus: List[Dict[str, Any]] = Field(default_factory=list)
    
    generated_at: datetime


class MenuPopularityStats(BaseModel):
    """Estadísticas de popularidad de menús como favoritos"""
    menu_item_id: int
    menu_code: Optional[str] = None
    menu_name: Optional[str] = None
    
    # Métricas de popularidad
    favorite_count: int
    unique_users: int
    popularity_rank: Optional[int] = None
    popularity_percentage: float = 0.0
    
    # Análisis temporal
    recent_additions: int  # Últimos 30 días
    growth_rate: float = 0.0
    
    # Información del menú
    menu_level: Optional[int] = None
    parent_menu_name: Optional[str] = None
    is_active: bool = True
    
    generated_at: datetime


class FavoriteTrends(BaseModel):
    """Tendencias de favoritos en el sistema"""
    period_days: int
    
    # Métricas generales
    total_favorites: int
    total_users_with_favorites: int
    avg_favorites_per_user: float
    
    # Tendencias temporales
    daily_additions: Dict[str, int] = Field(default_factory=dict)
    daily_removals: Dict[str, int] = Field(default_factory=dict)
    net_growth: Dict[str, int] = Field(default_factory=dict)
    
    # Top menús
    trending_up: List[MenuPopularityStats] = Field(default_factory=list)
    trending_down: List[MenuPopularityStats] = Field(default_factory=list)
    most_popular_overall: List[MenuPopularityStats] = Field(default_factory=list)
    
    generated_at: datetime


# ==========================================
# SEARCH AND FILTER SCHEMAS
# ==========================================

class UserMenuFavoriteFilters(BaseModel):
    """Filtros para búsqueda de favoritos"""
    user_id: Optional[int] = None
    menu_item_id: Optional[int] = None
    username: Optional[str] = None
    menu_code: Optional[str] = None
    menu_name: Optional[str] = None
    
    # Filtros de estado
    is_accessible: Optional[bool] = None
    is_recent: Optional[bool] = None
    menu_level: Optional[int] = None
    
    # Filtros de tiempo
    added_after: Optional[datetime] = None
    added_before: Optional[datetime] = None
    
    # Filtros de orden
    min_order: Optional[int] = Field(None, ge=0)
    max_order: Optional[int] = Field(None, ge=0)
    
    # Búsqueda general
    search: Optional[str] = Field(None, description="Búsqueda en username, menu_name")


class UserMenuFavoriteListResponse(BaseModel):
    """Respuesta de lista de favoritos"""
    favorites: List[UserMenuFavoriteResponse]
    total_found: int
    filters_applied: UserMenuFavoriteFilters
    pagination: Dict[str, Any]
    
    # Estadísticas de la búsqueda
    summary: Dict[str, Any] = Field(default_factory=dict)


# ==========================================
# USER MENU CONSTRUCTION SCHEMAS
# ==========================================

class UserPersonalizedMenu(BaseModel):
    """Menú personalizado del usuario con favoritos"""
    user_id: int
    username: str
    
    # Menús organizados
    favorite_menus: List[UserMenuFavoriteForMenu] = Field(default_factory=list)
    recent_menus: List[Dict[str, Any]] = Field(default_factory=list)
    suggested_menus: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Configuración
    max_favorites_shown: int = 10
    max_recent_shown: int = 5
    show_suggestions: bool = True
    
    # Metadatos
    generated_at: datetime
    cache_expires_at: Optional[datetime] = None


class FavoriteMenuGroup(BaseModel):
    """Grupo de menús favoritos organizados"""
    group_name: str
    group_order: int
    menus: List[UserMenuFavoriteForMenu] = Field(default_factory=list)
    is_collapsible: bool = True
    is_expanded: bool = True


class UserMenuDashboard(BaseModel):
    """Dashboard completo de menús del usuario"""
    user_id: int
    username: str
    
    # Secciones del dashboard
    quick_access: List[UserMenuFavoriteForMenu] = Field(default_factory=list)
    favorite_groups: List[FavoriteMenuGroup] = Field(default_factory=list)
    recent_activity: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Estadísticas del usuario
    stats: UserFavoriteStats
    
    # Configuración personalizada
    layout_preferences: Dict[str, Any] = Field(default_factory=dict)
    
    generated_at: datetime


# ==========================================
# COPY/IMPORT SCHEMAS
# ==========================================

class UserMenuFavoriteCopy(BaseModel):
    """Schema para copiar favoritos entre usuarios"""
    source_user_id: int = Field(..., gt=0, description="Usuario origen")
    target_user_ids: List[int] = Field(
        ..., 
        min_length=1,
        description="Usuarios destino"
    )
    copy_order: bool = Field(
        default=True, 
        description="Mantener el orden original"
    )
    overwrite_existing: bool = Field(
        default=False, 
        description="Sobrescribir favoritos existentes"
    )
    filter_accessible_only: bool = Field(
        default=True, 
        description="Solo copiar menús accesibles para usuarios destino"
    )
    
    @field_validator('target_user_ids')
    @classmethod
    def validate_target_user_ids(cls, v):
        """Validar usuarios destino"""
        if not isinstance(v, list) or len(v) == 0:
            raise ValueError("Debe proporcionar al menos un usuario destino")
        
        for user_id in v:
            if not isinstance(user_id, int) or user_id <= 0:
                raise ValueError("Todos los IDs de usuarios deben ser enteros positivos")
        
        return list(set(v))  # Eliminar duplicados


class UserMenuFavoriteTemplate(BaseModel):
    """Template de favoritos para aplicar a usuarios"""
    template_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    
    menu_configurations: List[Dict[str, Any]] = Field(
        ...,
        min_length=1,
        description="Configuraciones de menús del template"
    )
    
    # Configuración de aplicación
    target_user_roles: List[str] = Field(default_factory=list)
    auto_update: bool = Field(default=False)
    
    created_by_user_id: Optional[int] = None
    is_system_template: bool = Field(default=False)


class UserMenuFavoriteImport(BaseModel):
    """Importación masiva de favoritos"""
    favorites: List[UserMenuFavoriteCreate] = Field(..., min_length=1)
    source_system: Optional[str] = Field(None, description="Sistema origen")
    validate_users: bool = Field(default=True)
    validate_menus: bool = Field(default=True)
    skip_duplicates: bool = Field(default=True)
    preserve_order: bool = Field(default=True)


class UserMenuFavoriteImportResult(BaseModel):
    """Resultado de importación de favoritos"""
    success: bool
    imported_count: int
    skipped_count: int
    error_count: int
    
    # Detalles
    imported_favorites: List[UserMenuFavoriteResponse] = Field(default_factory=list)
    skipped_favorites: List[Dict[str, Any]] = Field(default_factory=list)
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Estadísticas
    users_affected: int = 0
    menus_affected: int = 0
    
    # Metadatos
    source_system: Optional[str] = None
    imported_at: datetime
    imported_by_user_id: Optional[int] = None


# ==========================================
# MAINTENANCE SCHEMAS
# ==========================================

class UserMenuFavoriteCleanup(BaseModel):
    """Configuración para limpieza de favoritos"""
    remove_invalid_menus: bool = Field(
        default=True, 
        description="Eliminar favoritos de menús eliminados"
    )
    remove_inaccessible_menus: bool = Field(
        default=False, 
        description="Eliminar favoritos de menús inaccesibles"
    )
    fix_duplicate_orders: bool = Field(
        default=True, 
        description="Corregir órdenes duplicados"
    )
    reorder_sequences: bool = Field(
        default=True, 
        description="Reordenar secuencias con gaps"
    )
    dry_run: bool = Field(default=True, description="Solo simular sin aplicar cambios")


class UserMenuFavoriteCleanupResult(BaseModel):
    """Resultado de limpieza de favoritos"""
    success: bool
    
    # Acciones realizadas
    invalid_menus_removed: int = 0
    inaccessible_menus_removed: int = 0
    duplicate_orders_fixed: int = 0
    sequences_reordered: int = 0
    
    # Detalles
    affected_users: List[int] = Field(default_factory=list)
    removed_favorites: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    
    # Metadatos
    cleaned_at: datetime
    cleaned_by_user_id: Optional[int] = None


# ==========================================
# EXPORT SCHEMAS
# ==========================================

class UserMenuFavoriteExport(BaseModel):
    """Configuración de exportación de favoritos"""
    user_ids: Optional[List[int]] = Field(None, description="Usuarios específicos")
    include_user_details: bool = Field(default=True)
    include_menu_details: bool = Field(default=True)
    include_inactive_menus: bool = Field(default=False)
    format: str = Field(default="json", description="Formato: json, csv, xlsx")
    group_by_user: bool = Field(default=True)


# ==========================================
# VALIDATION SCHEMAS
# ==========================================

class UserMenuFavoriteValidation(BaseModel):
    """Validación de favoritos"""
    is_valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    
    # Validaciones específicas
    invalid_user_references: List[int] = Field(default_factory=list)
    invalid_menu_references: List[int] = Field(default_factory=list)
    duplicate_favorites: List[Dict[str, Any]] = Field(default_factory=list)
    order_conflicts: List[Dict[str, Any]] = Field(default_factory=list)
    
    validated_at: datetime


class UserMenuFavoriteBulkReorderItem(BaseModel):
    """Item para reordenamiento masivo"""
    favorite_id: int = Field(..., gt=0, description="ID del favorito")
    new_order: int = Field(..., ge=0, description="Nueva posición")

class UserMenuFavoriteBulkReorder(BaseModel):
    """Schema para reordenar favoritos en lote"""
    items: List[UserMenuFavoriteBulkReorderItem] = Field(
        ..., 
        min_length=1,
        description="Lista de favoritos con nuevas posiciones"
    )
