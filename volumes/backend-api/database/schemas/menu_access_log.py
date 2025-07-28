"""
volumes/backend-api/database/schemas/menu_access_log.py
Schemas Pydantic para MenuAccessLog - Compatible con Pydantic v2
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timezone, timedelta
from ipaddress import ip_address, AddressValueError
import re


# ==========================================
# BASE SCHEMAS
# ==========================================

class MenuAccessLogBase(BaseModel):
    """Schema base para MenuAccessLog"""
    user_id: int = Field(..., gt=0, description="ID del usuario que accedió")
    menu_item_id: int = Field(..., gt=0, description="ID del elemento del menú accedido")
    access_timestamp: Optional[datetime] = Field(
        default=None, 
        description="Fecha y hora del acceso (UTC)"
    )
    ip_address: Optional[str] = Field(None, max_length=45, description="Dirección IP del acceso")
    user_agent: Optional[str] = Field(None, max_length=1000, description="User Agent del navegador")
    session_id: Optional[str] = Field(None, max_length=255, description="ID de sesión del usuario")
    
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
    
    @field_validator('access_timestamp')
    @classmethod
    def validate_access_timestamp(cls, v):
        """Validar timestamp de acceso"""
        if v is None:
            return datetime.now(timezone.utc)
        
        # Asegurar que tenga timezone info
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        
        # No permitir fechas futuras (más de 1 minuto para compensar diferencias de reloj)
        future_limit = datetime.now(timezone.utc) + timedelta(minutes=1)
        if v > future_limit:
            raise ValueError("La fecha de acceso no puede ser futura")
        
        # No permitir fechas muy antiguas (más de 5 años)
        past_limit = datetime.now(timezone.utc) - timedelta(days=365*5)
        if v < past_limit:
            raise ValueError("La fecha de acceso es demasiado antigua")
        
        return v
    
    @field_validator('ip_address')
    @classmethod
    def validate_ip_address(cls, v):
        """Validar dirección IP"""
        if not v:
            return None
        
        v = v.strip()
        
        # Permitir IPs especiales
        special_ips = ['localhost', '127.0.0.1', '::1', 'unknown']
        if v.lower() in special_ips:
            return v
        
        # Validar formato IPv4 o IPv6
        try:
            ip_address(v)
            return v
        except AddressValueError:
            # Validación más permisiva para casos especiales
            ipv4_pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
            if re.match(ipv4_pattern, v):
                # Verificar rangos válidos
                parts = v.split('.')
                if all(0 <= int(part) <= 255 for part in parts):
                    return v
            
            raise ValueError("Formato de dirección IP inválido")
    
    @field_validator('user_agent')
    @classmethod
    def validate_user_agent(cls, v):
        """Validar User Agent"""
        if not v:
            return None
        
        v = v.strip()
        
        # Limpiar caracteres de control
        v = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', v)
        
        # Limitar tamaño para evitar ataques
        if len(v) > 1000:
            v = v[:1000]
        
        return v if v else None
    
    @field_validator('session_id')
    @classmethod
    def validate_session_id(cls, v):
        """Validar ID de sesión"""
        if not v:
            return None
        
        v = v.strip()
        
        # Solo caracteres alfanuméricos y algunos especiales seguros
        if not re.match(r'^[a-zA-Z0-9\-_\.]+$', v):
            raise ValueError("ID de sesión contiene caracteres inválidos")
        
        return v


# ==========================================
# CRUD SCHEMAS
# ==========================================

class MenuAccessLogCreate(MenuAccessLogBase):
    """Schema para crear MenuAccessLog"""
    pass


class MenuAccessLogBulkCreate(BaseModel):
    """Schema para crear múltiples logs de acceso"""
    access_logs: List[MenuAccessLogCreate] = Field(
        ..., 
        min_length=1,
        max_length=1000,
        description="Lista de logs de acceso a crear"
    )
    batch_info: Optional[Dict[str, Any]] = Field(
        None, 
        description="Información del lote de creación"
    )
    
    @field_validator('access_logs')
    @classmethod
    def validate_access_logs(cls, v):
        """Validar lista de logs"""
        if not isinstance(v, list) or len(v) == 0:
            raise ValueError("Debe proporcionar al menos un log de acceso")
        
        if len(v) > 1000:
            raise ValueError("No se pueden crear más de 1000 logs a la vez")
        
        return v


# ==========================================
# RESPONSE SCHEMAS
# ==========================================

class MenuAccessLogResponse(BaseModel):
    """Schema de respuesta para MenuAccessLog"""
    id: int
    user_id: int
    menu_item_id: int
    access_timestamp: datetime
    ip_address: Optional[str]
    user_agent: Optional[str]
    session_id: Optional[str]
    
    # Información básica de relaciones
    username: Optional[str]
    user_full_name: Optional[str]
    menu_code: Optional[str]
    menu_name: Optional[str]
    menu_url: Optional[str]
    
    # Propiedades calculadas
    access_time_ago: str
    is_recent: bool
    is_today: bool
    is_internal_ip: bool
    
    # Metadatos
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class MenuAccessLogDetailed(MenuAccessLogResponse):
    """MenuAccessLog con información detallada"""
    browser_info: Dict[str, Optional[str]] = Field(default_factory=dict)
    location_info: Dict[str, Optional[str]] = Field(default_factory=dict)
    
    # Relaciones completas
    user: Optional[Dict[str, Any]] = None
    menu_item: Optional[Dict[str, Any]] = None


class MenuAccessLogWithContext(BaseModel):
    """MenuAccessLog con información contextual completa"""
    id: int
    user_id: int
    menu_item_id: int
    access_timestamp: datetime
    ip_address: Optional[str]
    session_id: Optional[str]
    
    # Contexto del navegador
    browser_name: Optional[str]
    browser_version: Optional[str]
    operating_system: Optional[str]
    device_type: Optional[str]
    
    # Contexto de red
    is_internal_access: bool
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    
    # Información del usuario
    user: Dict[str, Any]
    
    # Información del menú
    menu_item: Dict[str, Any]
    
    # Metadatos
    access_time_ago: str
    is_recent: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# ANALYTICS SCHEMAS
# ==========================================

class MenuAccessStats(BaseModel):
    """Estadísticas de acceso a un menú"""
    menu_item_id: int
    menu_code: Optional[str] = None
    menu_name: Optional[str] = None
    period_days: int
    
    # Estadísticas básicas
    total_accesses: int
    unique_users: int
    today_accesses: int
    
    # Promedios
    avg_accesses_per_day: float
    avg_accesses_per_user: float
    
    # Distribución temporal
    accesses_by_hour: Dict[int, int] = Field(default_factory=dict)
    accesses_by_day: Dict[str, int] = Field(default_factory=dict)
    
    # Top usuarios
    top_users: List[Dict[str, Any]] = Field(default_factory=list)
    
    generated_at: datetime


class UserAccessStats(BaseModel):
    """Estadísticas de acceso de un usuario"""
    user_id: int
    username: Optional[str] = None
    user_full_name: Optional[str] = None
    period_days: int
    
    # Estadísticas básicas
    total_accesses: int
    unique_menus: int
    today_accesses: int
    
    # Actividad
    most_active_day: Optional[str] = None
    most_active_hour: Optional[int] = None
    avg_accesses_per_day: float
    
    # Menús favoritos
    most_accessed_menus: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Patrones de uso
    access_patterns: Dict[str, Any] = Field(default_factory=dict)
    
    generated_at: datetime


class SystemAccessStats(BaseModel):
    """Estadísticas generales del sistema"""
    period_days: int
    
    # Totales
    total_accesses: int
    total_unique_users: int
    total_unique_menus: int
    
    # Actividad diaria
    avg_daily_accesses: float
    peak_daily_accesses: int
    peak_date: Optional[str] = None
    
    # Menús más populares
    most_popular_menus: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Usuarios más activos
    most_active_users: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Distribución por dispositivo
    device_distribution: Dict[str, int] = Field(default_factory=dict)
    
    # Distribución por navegador
    browser_distribution: Dict[str, int] = Field(default_factory=dict)
    
    # Accesos por hora
    hourly_distribution: Dict[int, int] = Field(default_factory=dict)
    
    generated_at: datetime


class AccessTrend(BaseModel):
    """Tendencia de accesos en el tiempo"""
    period: str  # 'daily', 'weekly', 'monthly'
    data_points: List[Dict[str, Any]] = Field(default_factory=list)
    trend_direction: str  # 'increasing', 'decreasing', 'stable'
    growth_rate: float
    
    # Predicciones simples
    predicted_next_period: Optional[int] = None
    confidence_level: Optional[float] = None
    
    generated_at: datetime


# ==========================================
# SEARCH AND FILTER SCHEMAS
# ==========================================

class MenuAccessLogFilters(BaseModel):
    """Filtros para búsqueda de logs de acceso"""
    user_id: Optional[int] = None
    menu_item_id: Optional[int] = None
    username: Optional[str] = None
    menu_code: Optional[str] = None
    
    # Filtros de tiempo
    access_date_from: Optional[datetime] = None
    access_date_to: Optional[datetime] = None
    date_preset: Optional[str] = Field(
        None, 
        description="Preset de fechas: 'today', 'yesterday', 'last_7_days', 'last_30_days'"
    )
    
    # Filtros de contexto
    ip_address: Optional[str] = None
    is_internal_ip: Optional[bool] = None
    session_id: Optional[str] = None
    
    # Filtros de navegador
    browser_name: Optional[str] = None
    operating_system: Optional[str] = None
    device_type: Optional[str] = None
    
    # Filtros de búsqueda
    search: Optional[str] = Field(None, description="Búsqueda en username, menu_name, ip")
    
    @field_validator('date_preset')
    @classmethod
    def validate_date_preset(cls, v):
        """Validar preset de fecha"""
        if v is None:
            return None
        
        valid_presets = [
            'today', 'yesterday', 'last_7_days', 'last_30_days', 
            'last_90_days', 'this_month', 'last_month'
        ]
        
        if v not in valid_presets:
            raise ValueError(f"Preset de fecha debe ser uno de: {valid_presets}")
        
        return v


class MenuAccessLogListResponse(BaseModel):
    """Respuesta de lista de logs de acceso"""
    access_logs: List[MenuAccessLogResponse]
    total_found: int
    filters_applied: MenuAccessLogFilters
    pagination: Dict[str, Any]
    
    # Estadísticas de la búsqueda
    summary: Dict[str, Any] = Field(default_factory=dict)


# ==========================================
# BULK OPERATIONS SCHEMAS
# ==========================================

class MenuAccessLogBulkResponse(BaseModel):
    """Respuesta de operaciones masivas"""
    success: bool
    created_count: int = 0
    processed_count: int = 0
    skipped_count: int = 0
    error_count: int = 0
    
    # Detalles
    created_logs: List[MenuAccessLogResponse] = Field(default_factory=list)
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    
    # Metadatos
    operation_type: str
    processed_at: datetime
    processing_time_ms: Optional[int] = None


class MenuAccessLogCleanup(BaseModel):
    """Configuración para limpieza de logs"""
    days_to_keep: int = Field(
        default=365, 
        gt=0, 
        le=3650,
        description="Días de logs a mantener (máximo 10 años)"
    )
    dry_run: bool = Field(default=True, description="Solo simular sin eliminar")
    batch_size: int = Field(
        default=1000, 
        gt=0, 
        le=10000,
        description="Tamaño del lote para eliminación"
    )
    confirm_cleanup: bool = Field(
        default=False, 
        description="Confirmación explícita para proceder"
    )


class MenuAccessLogCleanupResult(BaseModel):
    """Resultado de limpieza de logs"""
    success: bool
    deleted_count: int
    processed_batches: int
    cutoff_date: datetime
    
    # Detalles del proceso
    processing_time_ms: int
    estimated_space_freed: Optional[str] = None
    
    # Estadísticas antes/después
    total_logs_before: int
    total_logs_after: int
    
    cleaned_at: datetime
    cleaned_by_user_id: Optional[int] = None


# ==========================================
# SECURITY AND MONITORING SCHEMAS
# ==========================================

class SuspiciousActivityAlert(BaseModel):
    """Alerta de actividad sospechosa"""
    alert_type: str  # 'multiple_ips', 'unusual_access_pattern', 'blocked_user', etc.
    severity: str  # 'low', 'medium', 'high', 'critical'
    
    # Información del usuario
    user_id: int
    username: str
    
    # Detalles de la actividad
    description: str
    evidence: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Contexto
    time_window: str
    access_count: int
    unique_ips: Optional[int] = None
    
    # Recomendaciones
    recommended_actions: List[str] = Field(default_factory=list)
    
    detected_at: datetime
    requires_action: bool = False


class AccessSecurityReport(BaseModel):
    """Reporte de seguridad de accesos"""
    report_period: str
    generated_at: datetime
    
    # Métricas de seguridad
    total_accesses: int
    unique_users: int
    unique_ips: int
    
    # Alertas
    security_alerts: List[SuspiciousActivityAlert] = Field(default_factory=list)
    
    # Patrones anómalos
    anomalous_patterns: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Accesos desde IPs externas
    external_ip_accesses: int
    new_ip_addresses: List[str] = Field(default_factory=list)
    
    # Usuarios con actividad inusual
    unusual_activity_users: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Recomendaciones
    security_recommendations: List[str] = Field(default_factory=list)


# ==========================================
# EXPORT/IMPORT SCHEMAS
# ==========================================

class MenuAccessLogExport(BaseModel):
    """Configuración de exportación de logs"""
    filters: MenuAccessLogFilters = Field(default_factory=MenuAccessLogFilters)
    include_sensitive_data: bool = Field(
        default=False, 
        description="Incluir IPs y user agents completos"
    )
    format: str = Field(default="csv", description="Formato: csv, json, xlsx")
    max_records: int = Field(
        default=10000, 
        gt=0, 
        le=100000,
        description="Máximo número de registros a exportar"
    )
    include_user_details: bool = Field(default=True)
    include_menu_details: bool = Field(default=True)
    anonymize_data: bool = Field(
        default=False, 
        description="Anonimizar datos personales"
    )


class MenuAccessLogImport(BaseModel):
    """Importación de logs de acceso"""
    logs: List[MenuAccessLogCreate] = Field(..., min_length=1)
    source_system: Optional[str] = Field(None, description="Sistema origen de los logs")
    validate_references: bool = Field(
        default=True, 
        description="Validar que usuarios y menús existan"
    )
    skip_duplicates: bool = Field(
        default=True, 
        description="Omitir logs duplicados"
    )
    batch_size: int = Field(default=1000, gt=0, le=10000)


class MenuAccessLogImportResult(BaseModel):
    """Resultado de importación de logs"""
    success: bool
    imported_count: int
    skipped_count: int
    error_count: int
    
    # Detalles
    imported_logs: List[MenuAccessLogResponse] = Field(default_factory=list)
    skipped_logs: List[Dict[str, Any]] = Field(default_factory=list)
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Estadísticas
    date_range_imported: Optional[Dict[str, datetime]] = None
    users_affected: int = 0
    menus_affected: int = 0
    
    # Metadatos
    source_system: Optional[str] = None
    imported_at: datetime
    imported_by_user_id: Optional[int] = None


# ==========================================
# REAL-TIME MONITORING SCHEMAS
# ==========================================

class LiveAccessMetrics(BaseModel):
    """Métricas de acceso en tiempo real"""
    current_active_sessions: int
    accesses_last_minute: int
    accesses_last_hour: int
    
    # Usuarios activos
    active_users_count: int
    active_users: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Actividad por menú
    most_accessed_now: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Métricas de rendimiento
    avg_response_time: Optional[float] = None
    error_rate: Optional[float] = None
    
    # Alertas activas
    active_alerts: List[SuspiciousActivityAlert] = Field(default_factory=list)
    
    last_updated: datetime


class AccessHeatmap(BaseModel):
    """Mapa de calor de accesos"""
    period: str  # 'hourly', 'daily', 'weekly'
    data: Dict[str, Dict[str, int]] = Field(default_factory=dict)
    
    # Metadata
    max_value: int
    min_value: int
    total_accesses: int
    
    generated_at: datetime


# ==========================================
# VALIDATION SCHEMAS
# ==========================================

class MenuAccessLogValidation(BaseModel):
    """Validación de logs de acceso"""
    is_valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    
    # Validaciones específicas
    invalid_user_references: List[int] = Field(default_factory=list)
    invalid_menu_references: List[int] = Field(default_factory=list)
    suspicious_timestamps: List[Dict[str, Any]] = Field(default_factory=list)
    duplicate_entries: List[Dict[str, Any]] = Field(default_factory=list)
    
    validated_at: datetime