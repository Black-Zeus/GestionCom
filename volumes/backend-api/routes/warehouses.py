"""
volumes/backend-api/routes/warehouses.py
Router de Warehouses - CRUD básico para gestión de bodegas
Incluye autenticación JWT y control de permisos
"""
from utils.log_helper import setup_logger
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Request, Depends, Query, Path
from fastapi.responses import JSONResponse
from sqlalchemy import select, and_

# Database imports
from database.database import db_manager
from database.models.warehouses import Warehouse, WarehouseType
from database.models.warehouse_zones import WarehouseZone
from database.models.user_warehouse_access import UserWarehouseAccess, AccessType
from database.models.users import User

# Schema imports
from database.schemas.warehouses import (
    WarehouseCreate,
    WarehouseUpdate
)

from database.schemas.warehouse_zones import (
    WarehouseZoneCreate,
    WarehouseZoneUpdate
)

from database.schemas.user_warehouse_access import (
    UserWarehouseAccessCreate,
    UserWarehouseAccessUpdate
)

# Core imports
from core.response import ResponseManager
from core.constants import ErrorCode, ErrorType, HTTPStatus

# Utils imports
from utils.permissions_utils import require_permission

# ==========================================
# CONFIGURACIÓN DEL ROUTER
# ==========================================

logger = setup_logger(__name__)

router = APIRouter(
    tags=["Warehouses"],
    responses={
        401: {"description": "Token inválido o expirado"},
        403: {"description": "Acceso denegado - Permisos insuficientes"},
        404: {"description": "Recurso no encontrado"},
        422: {"description": "Error de validación"},
        500: {"description": "Error interno del servidor"}
    }
)

# ==========================================
# DEPENDENCIES DE AUTENTICACIÓN
# ==========================================

# WAREHOUSE
async def require_read_permission(request: Request) -> dict:
    return await require_permission("WAREHOUSE", ["READ", "MANAGER", "SUPERVISOR"], request)

async def require_write_permission(request: Request) -> dict:
    return await require_permission("WAREHOUSE", ["WRITE", "MANAGER"], request)

async def require_delete_permission(request: Request) -> dict:
    return await require_permission("WAREHOUSE", ["DELETE"], request)

# WAREHOUSE_ZONE
async def require_zone_read_permission(request: Request) -> dict:
    return await require_permission("WAREHOUSE_ZONE", ["READ", "MANAGER"], request)

async def require_zone_write_permission(request: Request) -> dict:
    return await require_permission("WAREHOUSE_ZONE", ["WRITE", "MANAGER"], request)

async def require_zone_delete_permission(request: Request) -> dict:
    return await require_permission("WAREHOUSE_ZONE", ["DELETE"], request)

async def require_zone_configure_permission(request: Request) -> dict:
    return await require_permission("WAREHOUSE_ZONE", ["CONFIGURE"], request)

# WAREHOUSE_ACCESS
async def require_access_read_permission(request: Request) -> dict:
    return await require_permission("WAREHOUSE_ACCESS", ["READ", "MANAGER", "ADMIN"], request)

async def require_access_write_permission(request: Request) -> dict:
    return await require_permission("WAREHOUSE_ACCESS", ["WRITE", "MANAGER", "ADMIN"], request)

async def require_access_delete_permission(request: Request) -> dict:
    return await require_permission("WAREHOUSE_ACCESS", ["DELETE", "ADMIN"], request)

async def require_access_grant_permission(request: Request) -> dict:
    return await require_permission("WAREHOUSE_ACCESS", ["GRANT", "MANAGER", "ADMIN"], request)

# ==========================================
# HELPER FUNCTIONS
# ==========================================

def warehouse_to_dict(warehouse: Warehouse) -> dict:
    """Convertir modelo Warehouse a diccionario"""
    return {
        "id": warehouse.id,
        "warehouse_code": warehouse.warehouse_code,
        "warehouse_name": warehouse.warehouse_name,
        "warehouse_type": warehouse.warehouse_type.value,
        "responsible_user_id": warehouse.responsible_user_id,
        "address": warehouse.address,
        "city": warehouse.city,
        "country": warehouse.country,
        "phone": warehouse.phone,
        "email": warehouse.email,
        "is_active": warehouse.is_active,
        "display_name": warehouse.display_name,
        "type_label": warehouse.type_label,
        "location_summary": warehouse.location_summary,
        "is_store": warehouse.is_store,
        "is_warehouse": warehouse.is_warehouse,
        "is_outlet": warehouse.is_outlet,
        "created_at": warehouse.created_at.isoformat() if warehouse.created_at else None,
        "updated_at": warehouse.updated_at.isoformat() if warehouse.updated_at else None
    }

def warehouse_zone_to_dict(zone: WarehouseZone) -> dict:
    """Convertir modelo WarehouseZone a diccionario"""
    return {
        "id": zone.id,
        "warehouse_id": zone.warehouse_id,
        "zone_code": zone.zone_code,
        "zone_name": zone.zone_name,
        "zone_description": zone.zone_description,
        "is_location_tracking_enabled": zone.is_location_tracking_enabled,
        "is_active": zone.is_active,
        "display_name": zone.display_name,
        "zone_status": zone.zone_status,
        "zone_info": zone.zone_info,
        "has_location_tracking": zone.has_location_tracking,
        "short_description": zone.short_description,
        "created_at": zone.created_at.isoformat() if zone.created_at else None,
        "updated_at": zone.updated_at.isoformat() if zone.updated_at else None
    }

def warehouse_access_to_dict(access: UserWarehouseAccess, include_details: bool = False) -> dict:
    """Convertir modelo UserWarehouseAccess a diccionario"""
    base_dict = {
        "id": access.id,
        "user_id": access.user_id,
        "warehouse_id": access.warehouse_id,
        "access_type": access.access_type.value,
        "granted_by_user_id": access.granted_by_user_id,
        "granted_at": access.granted_at.isoformat() if access.granted_at else None,
        "has_full_access": access.has_full_access,
        "has_read_only_access": access.has_read_only_access,
        "is_denied": access.is_denied,
        "can_write": access.can_write,
        "can_read": access.can_read,
        "access_level_label": access.access_level_label,
        "access_info": access.access_info,
        "is_self_granted": access.is_self_granted,
        "created_at": access.created_at.isoformat() if access.created_at else None,
        "updated_at": access.updated_at.isoformat() if access.updated_at else None
    }
    
    return base_dict

# ==========================================
# ENDPOINTS CRUD BÁSICOS
# ==========================================

@router.get("/heatlth")
async def info_warehouses(request: Request):
    """Información básica del sistema de autenticación"""
    from utils.routes_helper import get_warehouses_info
    return await  get_warehouses_info(router, request)

@router.get("/", response_class=JSONResponse)
async def list_warehouses(
    request: Request,
    user: dict = Depends(require_read_permission),
    skip: int = Query(0, ge=0, description="Elementos a saltar"),
    limit: int = Query(100, ge=1, le=1000, description="Límite de elementos"),
    active_only: bool = Query(True, description="Solo elementos activos")
):
    """Listar todas las bodegas"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Construir query base
            stmt = select(Warehouse).where(Warehouse.deleted_at.is_(None))
            
            if active_only:
                stmt = stmt.where(Warehouse.is_active == True)
            
            # Aplicar paginación y ordenamiento
            stmt = stmt.order_by(Warehouse.warehouse_name).offset(skip).limit(limit)
            
            result = await session.execute(stmt)
            warehouses = result.scalars().all()
            
            warehouse_data = [warehouse_to_dict(warehouse) for warehouse in warehouses]
            
            logger.info(f"Usuario {user['username']} listó {len(warehouse_data)} bodegas")
            
            return ResponseManager.success(
                data=warehouse_data,
                message=f"Se encontraron {len(warehouse_data)} bodegas",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al listar bodegas: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al obtener lista de bodegas",
            details=str(e),
            request=request
        )

@router.post("/", response_class=JSONResponse)
async def create_warehouse(
    warehouse_data: WarehouseCreate,
    request: Request,
    user: dict = Depends(require_write_permission)
):
    """Crear una nueva bodega"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Verificar que el código no exista
            existing_stmt = select(Warehouse).where(
                and_(
                    Warehouse.warehouse_code == warehouse_data.warehouse_code.upper(),
                    Warehouse.deleted_at.is_(None)
                )
            )
            existing_result = await session.execute(existing_stmt)
            existing_warehouse = existing_result.scalar_one_or_none()
            
            if existing_warehouse:
                return ResponseManager.error(
                    message=f"Ya existe una bodega con el código: {warehouse_data.warehouse_code}",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.RESOURCE_DUPLICATE,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Verificar que el usuario responsable existe
            user_stmt = select(User).where(User.id == warehouse_data.responsible_user_id)
            user_result = await session.execute(user_stmt)
            responsible_user = user_result.scalar_one_or_none()
            
            if not responsible_user:
                return ResponseManager.error(
                    message=f"Usuario responsable no encontrado: {warehouse_data.responsible_user_id}",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.VALIDATION_FIELD_REQUIRED,
                    error_type=ErrorType.VALIDATION_ERROR,
                    request=request
                )
            
            # Crear la bodega
            new_warehouse = Warehouse(
                warehouse_code=warehouse_data.warehouse_code.upper(),
                warehouse_name=warehouse_data.warehouse_name,
                warehouse_type=WarehouseType(warehouse_data.warehouse_type),
                responsible_user_id=warehouse_data.responsible_user_id,
                address=warehouse_data.address,
                city=warehouse_data.city,
                country=warehouse_data.country,
                phone=warehouse_data.phone,
                email=warehouse_data.email,
                is_active=warehouse_data.is_active
            )
            
            session.add(new_warehouse)
            await session.commit()
            await session.refresh(new_warehouse)  # ✅ Corregido: era 'warehouse'
            
            warehouse_dict = warehouse_to_dict(new_warehouse)
            
            logger.info(f"Usuario {user['username']} creó bodega: {new_warehouse.warehouse_code}")
            
            return ResponseManager.success(
                data=warehouse_dict,
                message=f"Bodega '{new_warehouse.warehouse_name}' creada exitosamente",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al crear bodega: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al crear bodega",
            details=str(e),
            request=request
        )

@router.get("/{warehouse_id}", response_class=JSONResponse)
async def get_warehouse(
    warehouse_id: int = Path(..., description="ID de la bodega"),
    request: Request = None,
    user: dict = Depends(require_read_permission)
):
    """Obtener una bodega específica por ID"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Obtener bodega
            stmt = select(Warehouse).where(
                and_(
                    Warehouse.id == warehouse_id,
                    Warehouse.deleted_at.is_(None)
                )
            )
            
            result = await session.execute(stmt)
            warehouse = result.scalar_one_or_none()
            
            if not warehouse:
                return ResponseManager.error(
                    message=f"Bodega no encontrada: {warehouse_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            warehouse_dict = warehouse_to_dict(warehouse)
            
            logger.info(f"Usuario {user['username']} consultó bodega: {warehouse.warehouse_code}")
            
            return ResponseManager.success(
                data=warehouse_dict,
                message="Bodega encontrada",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al obtener bodega {warehouse_id}: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al obtener bodega",
            details=str(e),
            request=request
        )

@router.put("/{warehouse_id}", response_class=JSONResponse)
async def update_warehouse(
    warehouse_data: WarehouseUpdate,
    warehouse_id: int = Path(..., description="ID de la bodega"),
    request: Request = None,
    user: dict = Depends(require_write_permission)  # ✅ Corregido
):
    """Actualizar una bodega existente"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Obtener bodega existente
            stmt = select(Warehouse).where(
                and_(
                    Warehouse.id == warehouse_id,
                    Warehouse.deleted_at.is_(None)
                )
            )
            
            result = await session.execute(stmt)
            warehouse = result.scalar_one_or_none()
            
            if not warehouse:
                return ResponseManager.error(
                    message=f"Bodega no encontrada: {warehouse_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Aplicar actualizaciones solo a campos no None
            updated_fields = []
            
            if warehouse_data.warehouse_name is not None:
                warehouse.warehouse_name = warehouse_data.warehouse_name
                updated_fields.append("warehouse_name")
            
            if warehouse_data.warehouse_type is not None:
                warehouse.warehouse_type = WarehouseType(warehouse_data.warehouse_type)
                updated_fields.append("warehouse_type")
            
            if warehouse_data.responsible_user_id is not None:
                # Verificar que el usuario existe
                user_stmt = select(User).where(User.id == warehouse_data.responsible_user_id)
                user_result = await session.execute(user_stmt)
                responsible_user = user_result.scalar_one_or_none()
                
                if not responsible_user:
                    return ResponseManager.error(
                        message=f"Usuario responsable no encontrado: {warehouse_data.responsible_user_id}",
                        status_code=HTTPStatus.BAD_REQUEST,
                        error_code=ErrorCode.VALIDATION_FIELD_REQUIRED,
                        error_type=ErrorType.VALIDATION_ERROR,
                        request=request
                    )
                
                warehouse.responsible_user_id = warehouse_data.responsible_user_id
                updated_fields.append("responsible_user_id")
            
            if warehouse_data.address is not None:
                warehouse.address = warehouse_data.address
                updated_fields.append("address")
            
            if warehouse_data.city is not None:
                warehouse.city = warehouse_data.city
                updated_fields.append("city")
            
            if warehouse_data.country is not None:
                warehouse.country = warehouse_data.country
                updated_fields.append("country")
            
            if warehouse_data.phone is not None:
                warehouse.phone = warehouse_data.phone
                updated_fields.append("phone")
            
            if warehouse_data.email is not None:
                warehouse.email = warehouse_data.email
                updated_fields.append("email")
            
            if warehouse_data.is_active is not None:
                warehouse.is_active = warehouse_data.is_active
                updated_fields.append("is_active")
            
            # Actualizar timestamp
            warehouse.updated_at = datetime.now(timezone.utc)
            
            await session.commit()
            await session.refresh(warehouse)  # ✅ Corregido: era 'new_warehouse'
            
            warehouse_dict = warehouse_to_dict(warehouse)
            
            logger.info(f"Usuario {user['username']} actualizó bodega {warehouse.warehouse_code}: {', '.join(updated_fields)}")
            
            return ResponseManager.success(
                data=warehouse_dict,
                message=f"Bodega '{warehouse.warehouse_name}' actualizada exitosamente",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al actualizar bodega {warehouse_id}: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al actualizar bodega",
            details=str(e),
            request=request
        )

@router.delete("/{warehouse_id}", response_class=JSONResponse)
async def delete_warehouse(
    warehouse_id: int = Path(..., description="ID de la bodega"),
    request: Request = None,
    user: dict = Depends(require_delete_permission)
):
    """Eliminar una bodega (soft delete)"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Obtener bodega
            stmt = select(Warehouse).where(
                and_(
                    Warehouse.id == warehouse_id,
                    Warehouse.deleted_at.is_(None)
                )
            )
            
            result = await session.execute(stmt)
            warehouse = result.scalar_one_or_none()
            
            if not warehouse:
                return ResponseManager.error(
                    message=f"Bodega no encontrada: {warehouse_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Realizar soft delete
            warehouse.deleted_at = datetime.now(timezone.utc)
            warehouse.is_active = False
            
            await session.commit()
            
            warehouse_dict = warehouse_to_dict(warehouse)
            
            logger.info(f"Usuario {user['username']} eliminó bodega: {warehouse.warehouse_code}")
            
            return ResponseManager.success(
                data=warehouse_dict,
                message=f"Bodega '{warehouse.warehouse_name}' eliminada exitosamente",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al eliminar bodega {warehouse_id}: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al eliminar bodega",
            details=str(e),
            request=request
        )
    
# ==========================================
# ENDPOINTS DE WAREHOUSE ZONES
# ==========================================

@router.get("/{warehouse_id}/zones", response_class=JSONResponse)
async def list_warehouse_zones(
    warehouse_id: int = Path(..., description="ID de la bodega"),
    request: Request = None,
    user: dict = Depends(require_zone_read_permission),
    skip: int = Query(0, ge=0, description="Elementos a saltar"),
    limit: int = Query(50, ge=1, le=100, description="Límite de elementos"),
    is_active: Optional[bool] = Query(None, description="Filtrar por zonas activas"),
    has_tracking: Optional[bool] = Query(None, description="Filtrar por seguimiento habilitado")
):
    """Listar zonas de una bodega específica"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Verificar que la bodega existe
            warehouse_stmt = select(Warehouse).where(
                and_(
                    Warehouse.id == warehouse_id,
                    Warehouse.deleted_at.is_(None)
                )
            )
            warehouse_result = await session.execute(warehouse_stmt)
            warehouse = warehouse_result.scalar_one_or_none()
            
            if not warehouse:
                return ResponseManager.error(
                    message=f"Bodega no encontrada: {warehouse_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Construir query para zonas
            stmt = select(WarehouseZone).where(
                and_(
                    WarehouseZone.warehouse_id == warehouse_id,
                    WarehouseZone.deleted_at.is_(None)
                )
            )
            
            # Aplicar filtros
            if is_active is not None:
                stmt = stmt.where(WarehouseZone.is_active == is_active)
            
            if has_tracking is not None:
                stmt = stmt.where(WarehouseZone.is_location_tracking_enabled == has_tracking)
            
            # Aplicar paginación y ordenamiento
            stmt = stmt.order_by(WarehouseZone.zone_code).offset(skip).limit(limit)
            
            result = await session.execute(stmt)
            zones = result.scalars().all()
            
            # Convertir a diccionarios
            zones_data = [warehouse_zone_to_dict(zone) for zone in zones]
            
            # Estadísticas
            total_zones = len(zones_data)
            active_zones = sum(1 for zone in zones_data if zone["is_active"])
            zones_with_tracking = sum(1 for zone in zones_data if zone["is_location_tracking_enabled"])
            
            response_data = {
                "warehouse_id": warehouse.id,
                "warehouse_name": warehouse.warehouse_name,
                "warehouse_code": warehouse.warehouse_code,
                "zones": zones_data,
                "total_zones": total_zones,
                "active_zones": active_zones,
                "zones_with_tracking": zones_with_tracking
            }
            
            logger.info(f"Usuario {user['username']} listó {total_zones} zonas de bodega {warehouse.warehouse_code}")
            
            return ResponseManager.success(
                data=response_data,
                message=f"Se encontraron {total_zones} zonas en bodega {warehouse.warehouse_name}",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al listar zonas de bodega {warehouse_id}: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al obtener lista de zonas",
            details=str(e),
            request=request
        )

@router.post("/{warehouse_id}/zones", response_class=JSONResponse)
async def create_warehouse_zone(
    zone_data: WarehouseZoneCreate,
    warehouse_id: int = Path(..., description="ID de la bodega"),
    request: Request = None,
    user: dict = Depends(require_zone_write_permission)
):
    """Crear una nueva zona en una bodega"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Verificar que la bodega existe
            warehouse_stmt = select(Warehouse).where(
                and_(
                    Warehouse.id == warehouse_id,
                    Warehouse.deleted_at.is_(None)
                )
            )
            warehouse_result = await session.execute(warehouse_stmt)
            warehouse = warehouse_result.scalar_one_or_none()
            
            if not warehouse:
                return ResponseManager.error(
                    message=f"Bodega no encontrada: {warehouse_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Verificar que el código de zona no exista en esta bodega
            existing_stmt = select(WarehouseZone).where(
                and_(
                    WarehouseZone.warehouse_id == warehouse_id,
                    WarehouseZone.zone_code == zone_data.zone_code.upper(),
                    WarehouseZone.deleted_at.is_(None)
                )
            )
            existing_result = await session.execute(existing_stmt)
            existing_zone = existing_result.scalar_one_or_none()
            
            if existing_zone:
                return ResponseManager.error(
                    message=f"Ya existe una zona con el código '{zone_data.zone_code}' en esta bodega",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.RESOURCE_DUPLICATE,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Crear la zona
            new_zone = WarehouseZone(
                warehouse_id=warehouse_id,
                zone_code=zone_data.zone_code.upper(),
                zone_name=zone_data.zone_name,
                zone_description=zone_data.zone_description,
                is_location_tracking_enabled=zone_data.is_location_tracking_enabled,
                is_active=zone_data.is_active
            )
            
            session.add(new_zone)
            await session.commit()
            await session.refresh(new_zone)
            
            zone_dict = warehouse_zone_to_dict(new_zone)
            
            logger.info(f"Usuario {user['username']} creó zona {new_zone.zone_code} en bodega {warehouse.warehouse_code}")
            
            return ResponseManager.success(
                data=zone_dict,
                message=f"Zona '{new_zone.zone_name}' creada exitosamente en {warehouse.warehouse_name}",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al crear zona en bodega {warehouse_id}: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al crear zona",
            details=str(e),
            request=request
        )

@router.get("/{warehouse_id}/zones/{zone_id}", response_class=JSONResponse)
async def get_warehouse_zone(
    warehouse_id: int = Path(..., description="ID de la bodega"),
    zone_id: int = Path(..., description="ID de la zona"),
    request: Request = None,
    user: dict = Depends(require_zone_read_permission)
):
    """Obtener una zona específica de una bodega"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Obtener zona con información de bodega
            stmt = select(WarehouseZone, Warehouse).join(
                Warehouse, WarehouseZone.warehouse_id == Warehouse.id
            ).where(
                and_(
                    WarehouseZone.id == zone_id,
                    WarehouseZone.warehouse_id == warehouse_id,
                    WarehouseZone.deleted_at.is_(None),
                    Warehouse.deleted_at.is_(None)
                )
            )
            
            result = await session.execute(stmt)
            zone_warehouse = result.first()
            
            if not zone_warehouse:
                return ResponseManager.error(
                    message=f"Zona no encontrada: {zone_id} en bodega {warehouse_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            zone, warehouse = zone_warehouse
            
            # Crear respuesta detallada
            zone_dict = warehouse_zone_to_dict(zone)
            zone_dict.update({
                "warehouse_name": warehouse.warehouse_name,
                "warehouse_code": warehouse.warehouse_code,
                "warehouse_is_active": warehouse.is_active
            })
            
            logger.info(f"Usuario {user['username']} consultó zona {zone.zone_code} de bodega {warehouse.warehouse_code}")
            
            return ResponseManager.success(
                data=zone_dict,
                message="Zona encontrada",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al obtener zona {zone_id} de bodega {warehouse_id}: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al obtener zona",
            details=str(e),
            request=request
        )

@router.put("/{warehouse_id}/zones/{zone_id}", response_class=JSONResponse)
async def update_warehouse_zone(
    zone_data: WarehouseZoneUpdate,
    warehouse_id: int = Path(..., description="ID de la bodega"),
    zone_id: int = Path(..., description="ID de la zona"),
    request: Request = None,
    user: dict = Depends(require_zone_write_permission)
):
    """Actualizar una zona de bodega"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Obtener zona existente
            stmt = select(WarehouseZone).where(
                and_(
                    WarehouseZone.id == zone_id,
                    WarehouseZone.warehouse_id == warehouse_id,
                    WarehouseZone.deleted_at.is_(None)
                )
            )
            
            result = await session.execute(stmt)
            zone = result.scalar_one_or_none()
            
            if not zone:
                return ResponseManager.error(
                    message=f"Zona no encontrada: {zone_id} en bodega {warehouse_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Aplicar actualizaciones solo a campos no None
            updated_fields = []
            
            if zone_data.zone_name is not None:
                zone.zone_name = zone_data.zone_name
                updated_fields.append("zone_name")
            
            if zone_data.zone_description is not None:
                zone.zone_description = zone_data.zone_description
                updated_fields.append("zone_description")
            
            if zone_data.is_location_tracking_enabled is not None:
                zone.is_location_tracking_enabled = zone_data.is_location_tracking_enabled
                updated_fields.append("is_location_tracking_enabled")
            
            if zone_data.is_active is not None:
                zone.is_active = zone_data.is_active
                updated_fields.append("is_active")
            
            # Actualizar timestamp
            zone.updated_at = datetime.now(timezone.utc)
            
            await session.commit()
            await session.refresh(zone)
            
            zone_dict = warehouse_zone_to_dict(zone)
            
            logger.info(f"Usuario {user['username']} actualizó zona {zone.zone_code}: {', '.join(updated_fields)}")
            
            return ResponseManager.success(
                data=zone_dict,
                message=f"Zona '{zone.zone_name}' actualizada exitosamente",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al actualizar zona {zone_id}: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al actualizar zona",
            details=str(e),
            request=request
        )

@router.delete("/{warehouse_id}/zones/{zone_id}", response_class=JSONResponse)
async def delete_warehouse_zone(
    warehouse_id: int = Path(..., description="ID de la bodega"),
    zone_id: int = Path(..., description="ID de la zona"),
    request: Request = None,
    user: dict = Depends(require_zone_delete_permission)
):
    """Eliminar una zona de bodega (soft delete)"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Obtener zona
            stmt = select(WarehouseZone).where(
                and_(
                    WarehouseZone.id == zone_id,
                    WarehouseZone.warehouse_id == warehouse_id,
                    WarehouseZone.deleted_at.is_(None)
                )
            )
            
            result = await session.execute(stmt)
            zone = result.scalar_one_or_none()
            
            if not zone:
                return ResponseManager.error(
                    message=f"Zona no encontrada: {zone_id} en bodega {warehouse_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Realizar soft delete
            zone.deleted_at = datetime.now(timezone.utc)
            zone.is_active = False
            
            await session.commit()
            
            zone_dict = warehouse_zone_to_dict(zone)
            
            logger.info(f"Usuario {user['username']} eliminó zona {zone.zone_code}")
            
            return ResponseManager.success(
                data=zone_dict,
                message=f"Zona '{zone.zone_name}' eliminada exitosamente",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al eliminar zona {zone_id}: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al eliminar zona",
            details=str(e),
            request=request
        )
    
# ==========================================
# ENDPOINTS DE WAREHOUSE ACCESS
# ==========================================

@router.get("/{warehouse_id}/access", response_class=JSONResponse)
async def list_warehouse_access(
    warehouse_id: int = Path(..., description="ID de la bodega"),
    request: Request = None,
    user: dict = Depends(require_access_read_permission),
    skip: int = Query(0, ge=0, description="Elementos a saltar"),
    limit: int = Query(50, ge=1, le=100, description="Límite de elementos"),
    access_type: Optional[str] = Query(None, description="Filtrar por tipo de acceso"),
    include_denied: bool = Query(False, description="Incluir accesos denegados")
):
    """Listar accesos de usuarios a una bodega específica"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Verificar que la bodega existe
            warehouse_stmt = select(Warehouse).where(
                and_(
                    Warehouse.id == warehouse_id,
                    Warehouse.deleted_at.is_(None)
                )
            )
            warehouse_result = await session.execute(warehouse_stmt)
            warehouse = warehouse_result.scalar_one_or_none()
            
            if not warehouse:
                return ResponseManager.error(
                    message=f"Bodega no encontrada: {warehouse_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Construir query para accesos con JOIN a usuarios
            stmt = select(UserWarehouseAccess, User).join(
                User, UserWarehouseAccess.user_id == User.id
            ).where(
                UserWarehouseAccess.warehouse_id == warehouse_id
            )
            
            # Aplicar filtros
            if access_type:
                try:
                    access_enum = AccessType(access_type.upper())
                    stmt = stmt.where(UserWarehouseAccess.access_type == access_enum)
                except ValueError:
                    return ResponseManager.error(
                        message=f"Tipo de acceso inválido: {access_type}",
                        status_code=HTTPStatus.BAD_REQUEST,
                        error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                        error_type=ErrorType.VALIDATION_ERROR,
                        request=request
                    )
            
            if not include_denied:
                stmt = stmt.where(UserWarehouseAccess.access_type != AccessType.DENIED)
            
            # Aplicar paginación y ordenamiento
            stmt = stmt.order_by(User.username).offset(skip).limit(limit)
            
            result = await session.execute(stmt)
            access_user_pairs = result.all()
            
            # Convertir a diccionarios con información de usuario
            access_data = []
            for access, user in access_user_pairs:
                access_dict = warehouse_access_to_dict(access, include_details=True)
                access_dict.update({
                    "user_username": user.username,
                    "user_full_name": f"{user.first_name} {user.last_name}".strip() or user.username,
                    "user_email": user.email,
                    "user_is_active": user.is_active
                })
                access_data.append(access_dict)
            
            # Estadísticas
            total_access = len(access_data)
            full_access_count = sum(1 for a in access_data if a["access_type"] == "FULL")
            read_only_count = sum(1 for a in access_data if a["access_type"] == "READ_ONLY")
            denied_count = sum(1 for a in access_data if a["access_type"] == "DENIED")
            
            response_data = {
                "warehouse_id": warehouse.id,
                "warehouse_name": warehouse.warehouse_name,
                "warehouse_code": warehouse.warehouse_code,
                "access_list": access_data,
                "total_access": total_access,
                "full_access_count": full_access_count,
                "read_only_count": read_only_count,
                "denied_count": denied_count
            }
            
            logger.info(f"Usuario {user['username']} listó {total_access} accesos de bodega {warehouse.warehouse_code}")
            
            return ResponseManager.success(
                data=response_data,
                message=f"Se encontraron {total_access} accesos para bodega {warehouse.warehouse_name}",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al listar accesos de bodega {warehouse_id}: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al obtener lista de accesos",
            details=str(e),
            request=request
        )

@router.post("/{warehouse_id}/access", response_class=JSONResponse)
async def grant_warehouse_access(
    access_data: UserWarehouseAccessCreate,
    warehouse_id: int = Path(..., description="ID de la bodega"),
    request: Request = None,
    user: dict = Depends(require_access_grant_permission)
):
    """Otorgar acceso de usuario a una bodega"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Verificar que la bodega existe
            warehouse_stmt = select(Warehouse).where(
                and_(
                    Warehouse.id == warehouse_id,
                    Warehouse.deleted_at.is_(None)
                )
            )
            warehouse_result = await session.execute(warehouse_stmt)
            warehouse = warehouse_result.scalar_one_or_none()
            
            if not warehouse:
                return ResponseManager.error(
                    message=f"Bodega no encontrada: {warehouse_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Verificar que el usuario existe
            user_stmt = select(User).where(User.id == access_data.user_id)
            user_result = await session.execute(user_stmt)
            target_user = user_result.scalar_one_or_none()
            
            if not target_user:
                return ResponseManager.error(
                    message=f"Usuario no encontrado: {access_data.user_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Verificar si ya existe un acceso
            existing_stmt = select(UserWarehouseAccess).where(
                and_(
                    UserWarehouseAccess.user_id == access_data.user_id,
                    UserWarehouseAccess.warehouse_id == warehouse_id
                )
            )
            existing_result = await session.execute(existing_stmt)
            existing_access = existing_result.scalar_one_or_none()
            
            if existing_access:
                return ResponseManager.error(
                    message=f"El usuario {target_user.username} ya tiene acceso configurado para esta bodega",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.RESOURCE_DUPLICATE,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Crear el acceso
            new_access = UserWarehouseAccess(
                user_id=access_data.user_id,
                warehouse_id=warehouse_id,
                access_type=AccessType(access_data.access_type),
                granted_by_user_id=user['user_id']
            )
            
            session.add(new_access)
            await session.commit()
            await session.refresh(new_access)
            
            access_dict = warehouse_access_to_dict(new_access)
            access_dict.update({
                "user_username": target_user.username,
                "user_full_name": f"{target_user.first_name} {target_user.last_name}".strip() or target_user.username,
                "warehouse_name": warehouse.warehouse_name,
                "warehouse_code": warehouse.warehouse_code,
                "granted_by_username": user['username']
            })
            
            logger.info(f"Usuario {user['username']} otorgó acceso {access_data.access_type} a {target_user.username} para bodega {warehouse.warehouse_code}")
            
            return ResponseManager.success(
                data=access_dict,
                message=f"Acceso {access_data.access_type} otorgado a {target_user.username} para bodega {warehouse.warehouse_name}",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al otorgar acceso a bodega {warehouse_id}: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al otorgar acceso",
            details=str(e),
            request=request
        )

@router.get("/{warehouse_id}/access/{user_id}", response_class=JSONResponse)
async def get_user_warehouse_access(
    warehouse_id: int = Path(..., description="ID de la bodega"),
    user_id: int = Path(..., description="ID del usuario"),
    request: Request = None,
    user: dict = Depends(require_access_read_permission)
):
    """Obtener acceso específico de un usuario a una bodega"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Obtener acceso con información de usuario y bodega
            stmt = select(UserWarehouseAccess, User, Warehouse).join(
                User, UserWarehouseAccess.user_id == User.id
            ).join(
                Warehouse, UserWarehouseAccess.warehouse_id == Warehouse.id
            ).where(
                and_(
                    UserWarehouseAccess.user_id == user_id,
                    UserWarehouseAccess.warehouse_id == warehouse_id,
                    Warehouse.deleted_at.is_(None)
                )
            )
            
            result = await session.execute(stmt)
            access_data = result.first()
            
            if not access_data:
                return ResponseManager.error(
                    message=f"Acceso no encontrado para usuario {user_id} en bodega {warehouse_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            access, target_user, warehouse = access_data
            
            # Obtener información de quien otorgó el acceso
            granted_by_stmt = select(User).where(User.id == access.granted_by_user_id)
            granted_by_result = await session.execute(granted_by_stmt)
            granted_by_user = granted_by_result.scalar_one_or_none()
            
            # Crear respuesta detallada
            access_dict = warehouse_access_to_dict(access)
            access_dict.update({
                "user_username": target_user.username,
                "user_full_name": f"{target_user.first_name} {target_user.last_name}".strip() or target_user.username,
                "user_email": target_user.email,
                "user_is_active": target_user.is_active,
                "warehouse_name": warehouse.warehouse_name,
                "warehouse_code": warehouse.warehouse_code,
                "warehouse_is_active": warehouse.is_active,
                "granted_by_username": granted_by_user.username if granted_by_user else "Sistema"
            })
            
            logger.info(f"Usuario {user['username']} consultó acceso de {target_user.username} a bodega {warehouse.warehouse_code}")
            
            return ResponseManager.success(
                data=access_dict,
                message="Acceso encontrado",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al obtener acceso usuario {user_id} bodega {warehouse_id}: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al obtener acceso",
            details=str(e),
            request=request
        )

@router.put("/{warehouse_id}/access/{user_id}", response_class=JSONResponse)
async def update_warehouse_access(
    access_data: UserWarehouseAccessUpdate,
    warehouse_id: int = Path(..., description="ID de la bodega"),
    user_id: int = Path(..., description="ID del usuario"),
    request: Request = None,
    user: dict = Depends(require_access_write_permission)
):
    """Actualizar acceso de usuario a bodega"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Obtener acceso existente
            stmt = select(UserWarehouseAccess).where(
                and_(
                    UserWarehouseAccess.user_id == user_id,
                    UserWarehouseAccess.warehouse_id == warehouse_id
                )
            )
            
            result = await session.execute(stmt)
            access = result.scalar_one_or_none()
            
            if not access:
                return ResponseManager.error(
                    message=f"Acceso no encontrado para usuario {user_id} en bodega {warehouse_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Actualizar tipo de acceso
            old_access_type = access.access_type.value
            access.access_type = AccessType(access_data.access_type)
            access.granted_by_user_id = user['user_id']  # Actualizar quien modificó
            access.updated_at = datetime.now(timezone.utc)
            
            await session.commit()
            await session.refresh(access)
            
            access_dict = warehouse_access_to_dict(access)
            
            logger.info(f"Usuario {user['username']} cambió acceso de usuario {user_id} en bodega {warehouse_id} de {old_access_type} a {access_data.access_type}")
            
            return ResponseManager.success(
                data=access_dict,
                message=f"Acceso actualizado de {old_access_type} a {access_data.access_type}",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al actualizar acceso usuario {user_id} bodega {warehouse_id}: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al actualizar acceso",
            details=str(e),
            request=request
        )

@router.delete("/{warehouse_id}/access/{user_id}", response_class=JSONResponse)
async def revoke_warehouse_access(
    warehouse_id: int = Path(..., description="ID de la bodega"),
    user_id: int = Path(..., description="ID del usuario"),
    request: Request = None,
    user: dict = Depends(require_access_delete_permission)
):
    """Revocar acceso de usuario a bodega"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Obtener acceso existente con información adicional
            stmt = select(UserWarehouseAccess, User, Warehouse).join(
                User, UserWarehouseAccess.user_id == User.id
            ).join(
                Warehouse, UserWarehouseAccess.warehouse_id == Warehouse.id
            ).where(
                and_(
                    UserWarehouseAccess.user_id == user_id,
                    UserWarehouseAccess.warehouse_id == warehouse_id,
                    Warehouse.deleted_at.is_(None)
                )
            )
            
            result = await session.execute(stmt)
            access_data = result.first()
            
            if not access_data:
                return ResponseManager.error(
                    message=f"Acceso no encontrado para usuario {user_id} en bodega {warehouse_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            access, target_user, warehouse = access_data
            
            # Eliminar acceso
            await session.delete(access)
            await session.commit()
            
            access_dict = warehouse_access_to_dict(access)
            access_dict.update({
                "user_username": target_user.username,
                "warehouse_name": warehouse.warehouse_name,
                "warehouse_code": warehouse.warehouse_code,
                "revoked_by": user['username'],
                "revoked_at": datetime.now(timezone.utc).isoformat()
            })
            
            logger.info(f"Usuario {user['username']} revocó acceso de {target_user.username} a bodega {warehouse.warehouse_code}")
            
            return ResponseManager.success(
                data=access_dict,
                message=f"Acceso revocado para {target_user.username} en bodega {warehouse.warehouse_name}",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al revocar acceso usuario {user_id} bodega {warehouse_id}: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al revocar acceso",
            details=str(e),
            request=request
        )

# ==========================================
# ENDPOINT ADICIONAL: LISTAR TODOS LOS ACCESOS
# ==========================================

@router.get("/access/all", response_class=JSONResponse)
async def list_all_warehouse_access(
    request: Request = None,
    user: dict = Depends(require_access_read_permission),
    skip: int = Query(0, ge=0, description="Elementos a saltar"),
    limit: int = Query(100, ge=1, le=500, description="Límite de elementos"),
    user_id: Optional[int] = Query(None, description="Filtrar por usuario"),
    warehouse_id: Optional[int] = Query(None, description="Filtrar por bodega"),
    access_type: Optional[str] = Query(None, description="Filtrar por tipo de acceso")
):
    """Listar todos los accesos de warehouse del sistema"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Query base con JOINs
            stmt = select(UserWarehouseAccess, User, Warehouse).join(
                User, UserWarehouseAccess.user_id == User.id
            ).join(
                Warehouse, UserWarehouseAccess.warehouse_id == Warehouse.id
            ).where(
                Warehouse.deleted_at.is_(None)
            )
            
            # Aplicar filtros
            if user_id:
                stmt = stmt.where(UserWarehouseAccess.user_id == user_id)
            
            if warehouse_id:
                stmt = stmt.where(UserWarehouseAccess.warehouse_id == warehouse_id)
            
            if access_type:
                try:
                    access_enum = AccessType(access_type.upper())
                    stmt = stmt.where(UserWarehouseAccess.access_type == access_enum)
                except ValueError:
                    return ResponseManager.error(
                        message=f"Tipo de acceso inválido: {access_type}",
                        status_code=HTTPStatus.BAD_REQUEST,
                        error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                        error_type=ErrorType.VALIDATION_ERROR,
                        request=request
                    )
            
            # Paginación y orden
            stmt = stmt.order_by(Warehouse.warehouse_name, User.username).offset(skip).limit(limit)
            
            result = await session.execute(stmt)
            access_records = result.all()
            
            # Procesar resultados
            access_list = []
            for access, target_user, warehouse in access_records:
                access_dict = warehouse_access_to_dict(access)
                access_dict.update({
                    "user_username": target_user.username,
                    "user_full_name": f"{target_user.first_name} {target_user.last_name}".strip() or target_user.username,
                    "warehouse_name": warehouse.warehouse_name,
                    "warehouse_code": warehouse.warehouse_code
                })
                access_list.append(access_dict)
            
            # Estadísticas generales
            total_records = len(access_list)
            
            response_data = {
                "access_list": access_list,
                "total_records": total_records,
                "filters_applied": {
                    "user_id": user_id,
                    "warehouse_id": warehouse_id,
                    "access_type": access_type
                },
                "pagination": {
                    "skip": skip,
                    "limit": limit,
                    "total": total_records
                }
            }
            
            logger.info(f"Usuario {user['username']} listó {total_records} accesos del sistema")
            
            return ResponseManager.success(
                data=response_data,
                message=f"Se encontraron {total_records} registros de acceso",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al listar todos los accesos: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al obtener lista de accesos",
            details=str(e),
            request=request
        )