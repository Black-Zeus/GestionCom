"""
routes/menu_items.py
Endpoints CRUD limpios para gestión de menús
Refactorizado para usar MenuService - Sin lógica compleja
"""
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Request, Depends, Query, Path, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select, func, or_

# Database imports
from database.database import db_manager
from database.models.menu_items import MenuItem

# Schema imports
from database.schemas.menu_items import (
    MenuItemCreate,
    MenuItemUpdate,
    MenuItemResponse,
    MenuItemMove,
    MenuItemReorder,
    MenuItemToggleStatus,
    MenuItemBulkToggle
)

# Core imports
from core.response import ResponseManager
from core.constants import ErrorCode, ErrorType

# Service imports
from services.menu_service import MenuService

# Utils imports
from utils.permissions_utils import require_permission
from utils.menu_helpers import suggest_icon_for_menu
from utils.log_helper import setup_logger

# ==========================================
# CONFIGURACIÓN DEL ROUTER
# ==========================================

logger = setup_logger(__name__)

router = APIRouter(
    prefix="/menu-items",
    tags=["Menu Items"],
    responses={
        401: {"description": "Token inválido o expirado"},
        403: {"description": "Acceso denegado - Permisos insuficientes"},
        404: {"description": "Recurso no encontrado"},
        422: {"description": "Error de validación"},
        500: {"description": "Error interno del servidor"}
    }
)

# ==========================================
# DEPENDENCIES
# ==========================================

async def require_read_permission(request: Request) -> dict:
    return await require_permission("MENU", ["READ", "MANAGER"], request)

async def require_write_permission(request: Request) -> dict:
    return await require_permission("MENU", ["WRITE", "MANAGER"], request)

async def require_manager_permission(request: Request) -> dict:
    return await require_permission("MENU", ["MANAGER"], request)

# ==========================================
# HELPER FUNCTIONS
# ==========================================

def menu_to_dict(menu: MenuItem) -> dict:
    """Convertir MenuItem a diccionario para respuesta"""
    return {
        "id": menu.id,
        "parent_id": menu.parent_id,
        "menu_code": menu.menu_code,
        "menu_name": menu.menu_name,
        "menu_description": menu.menu_description,
        "icon_name": menu.icon_name,
        "icon_color": menu.icon_color,
        "menu_url": menu.menu_url,
        "menu_type": menu.menu_type.value,
        "menu_level": menu.menu_level,
        "menu_path": menu.menu_path,
        "sort_order": menu.sort_order,
        "is_active": menu.is_active,
        "is_visible": menu.is_visible,
        "requires_feature": menu.requires_feature,
        "feature_code": menu.feature_code,
        "target_window": menu.target_window.value,
        "css_classes": menu.css_classes,
        "data_attributes": menu.data_attributes,
        "required_permission_id": menu.required_permission_id,
        "alternative_permissions": menu.alternative_permissions,
        "created_at": menu.created_at,
        "updated_at": menu.updated_at,
        "created_by_user_id": menu.created_by_user_id
    }

# ==========================================
# ENDPOINTS BÁSICOS
# ==========================================

@router.get("/health")
async def health_check(request: Request):
    """Health check del módulo de menús"""
    return ResponseManager.success(
        data={
            "module": "menu_items",
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        message="Módulo de menús funcionando correctamente",
        request=request
    )

@router.get("/", response_class=JSONResponse)
async def list_menus(
    request: Request,
    user: dict = Depends(require_read_permission),
    parent_id: Optional[int] = Query(None, description="Filtrar por menú padre"),
    active_only: bool = Query(True, description="Solo menús activos"),
    visible_only: bool = Query(True, description="Solo menús visibles"),
    search: Optional[str] = Query(None, description="Buscar en nombre/código/descripción"),
    limit: int = Query(100, ge=1, le=1000, description="Límite de resultados"),
    offset: int = Query(0, ge=0, description="Desplazamiento")
):
    """Listar menús con filtros"""
    
    try:
        async with db_manager.get_async_session() as session:
            service = MenuService(session)
            
            # Obtener menús
            menus = service.list_menus(
                parent_id=parent_id,
                active_only=active_only,
                visible_only=visible_only,
                search=search,
                limit=limit,
                offset=offset
            )
            
            # Contar total
            total_count = service.count_menus(
                parent_id=parent_id,
                active_only=active_only
            )
            
            # Convertir a diccionarios
            menus_data = [menu_to_dict(menu) for menu in menus]
            
            logger.info(f"Usuario {user['username']} listó {len(menus_data)} menús")
            
            return ResponseManager.success(
                data={
                    "menus": menus_data,
                    "total_count": total_count,
                    "returned_count": len(menus_data),
                    "filters": {
                        "parent_id": parent_id,
                        "active_only": active_only,
                        "visible_only": visible_only,
                        "search": search,
                        "limit": limit,
                        "offset": offset
                    }
                },
                message="Menús obtenidos exitosamente",
                request=request
            )
    
    except Exception as e:
        logger.error(f"Error al listar menús: {e}")
        return ResponseManager.internal_server_error(
            message="Error al obtener lista de menús",
            details=str(e),
            request=request
        )

@router.get("/tree", response_class=JSONResponse)
async def get_menu_tree(
    request: Request,
    user: dict = Depends(require_read_permission),
    parent_id: Optional[int] = Query(None, description="Raíz del árbol"),
    max_depth: Optional[int] = Query(None, ge=1, le=10, description="Profundidad máxima")
):
    """Obtener árbol jerárquico de menús"""
    
    try:
        async with db_manager.get_async_session() as session:
            service = MenuService(session)
            
            # Obtener árbol
            tree = service.get_menu_tree(
                parent_id=parent_id,
                max_depth=max_depth
            )
            
            logger.info(f"Usuario {user['username']} obtuvo árbol de menús")
            
            return ResponseManager.success(
                data={
                    "tree": tree,
                    "root_parent_id": parent_id,
                    "max_depth": max_depth,
                    "total_nodes": len(tree)
                },
                message="Árbol de menús obtenido exitosamente",
                request=request
            )
    
    except Exception as e:
        logger.error(f"Error al obtener árbol de menús: {e}")
        return ResponseManager.internal_server_error(
            message="Error al obtener árbol de menús",
            details=str(e),
            request=request
        )

@router.get("/{menu_id}", response_class=JSONResponse)
async def get_menu(
    request: Request,
    user: dict = Depends(require_read_permission),
    menu_id: int = Path(gt=0)
):
    """Obtener menú por ID"""
    
    try:
        async with db_manager.get_async_session() as session:
            service = MenuService(session)
            
            menu = service.get_menu_by_id(menu_id)
            
            if not menu:
                return ResponseManager.error(
                    error_code=ErrorCode.NOT_FOUND,
                    error_type=ErrorType.RESOURCE_NOT_FOUND,
                    message=f"Menú con ID {menu_id} no encontrado",
                    request=request
                )
            
            logger.info(f"Usuario {user['username']} consultó menú {menu.menu_code}")
            
            return ResponseManager.success(
                data=menu_to_dict(menu),
                message="Menú obtenido exitosamente",
                request=request
            )
    
    except Exception as e:
        logger.error(f"Error al obtener menú {menu_id}: {e}")
        return ResponseManager.internal_server_error(
            message="Error al obtener menú",
            details=str(e),
            request=request
        )

@router.post("/", response_class=JSONResponse)
async def create_menu(
    request: Request,
    menu_data: MenuItemCreate,
    user: dict = Depends(require_write_permission)
):
    """Crear nuevo menú"""
    
    try:
        async with db_manager.get_async_session() as session:
            service = MenuService(session)
            
            # Crear menú
            new_menu = service.create_menu(menu_data, user['user_id'])
            
            logger.info(f"Usuario {user['username']} creó menú {new_menu.menu_code}")
            
            return ResponseManager.success(
                data=menu_to_dict(new_menu),
                message="Menú creado exitosamente",
                request=request
            )
    
    except ValueError as e:
        return ResponseManager.error(
            error_code=ErrorCode.VALIDATION_ERROR,
            error_type=ErrorType.VALIDATION_ERROR,
            message=str(e),
            request=request
        )
    except Exception as e:
        logger.error(f"Error al crear menú: {e}")
        return ResponseManager.internal_server_error(
            message="Error al crear menú",
            details=str(e),
            request=request
        )

@router.put("/{menu_id}", response_class=JSONResponse)
async def update_menu(
    request: Request,
    menu_data: MenuItemUpdate,
    user: dict = Depends(require_write_permission),
    menu_id: int = Path(gt=0)
):
    """Actualizar menú existente"""
    
    try:
        async with db_manager.get_async_session() as session:
            service = MenuService(session)
            
            # Actualizar menú
            updated_menu = service.update_menu(menu_id, menu_data, user['user_id'])
            
            logger.info(f"Usuario {user['username']} actualizó menú {updated_menu.menu_code}")
            
            return ResponseManager.success(
                data=menu_to_dict(updated_menu),
                message="Menú actualizado exitosamente",
                request=request
            )
    
    except ValueError as e:
        return ResponseManager.error(
            error_code=ErrorCode.VALIDATION_ERROR,
            error_type=ErrorType.VALIDATION_ERROR,
            message=str(e),
            request=request
        )
    except Exception as e:
        logger.error(f"Error al actualizar menú {menu_id}: {e}")
        return ResponseManager.internal_server_error(
            message="Error al actualizar menú",
            details=str(e),
            request=request
        )

@router.delete("/{menu_id}", response_class=JSONResponse)
async def delete_menu(
    request: Request,
    user: dict = Depends(require_manager_permission),
    force: bool = Query(False, description="Eliminación física"),
    menu_id: int = Path(gt=0)
):
    """Eliminar menú"""
    
    try:
        async with db_manager.get_async_session() as session:
            service = MenuService(session)
            
            # Eliminar menú
            success = service.delete_menu(menu_id, force_delete=force)
            
            delete_type = "físicamente" if force else "lógicamente"
            logger.info(f"Usuario {user['username']} eliminó menú {menu_id} {delete_type}")
            
            return ResponseManager.success(
                data={
                    "menu_id": menu_id,
                    "deleted": success,
                    "deletion_type": "physical" if force else "soft"
                },
                message=f"Menú eliminado {delete_type} exitosamente",
                request=request
            )
    
    except ValueError as e:
        return ResponseManager.error(
            error_code=ErrorCode.VALIDATION_ERROR,
            error_type=ErrorType.VALIDATION_ERROR,
            message=str(e),
            request=request
        )
    except Exception as e:
        logger.error(f"Error al eliminar menú {menu_id}: {e}")
        return ResponseManager.internal_server_error(
            message="Error al eliminar menú",
            details=str(e),
            request=request
        )

# ==========================================
# ENDPOINTS DE JERARQUÍA
# ==========================================

@router.put("/{menu_id}/move", response_class=JSONResponse)
async def move_menu(
    request: Request,
    move_data: MenuItemMove,
    user: dict = Depends(require_write_permission),
    menu_id: int = Path(gt=0)
):
    """Mover menú a nueva posición jerárquica"""
    
    try:
        async with db_manager.get_async_session() as session:
            service = MenuService(session)
            
            # Mover menú
            moved_menu = service.move_menu(
                menu_id=menu_id,
                new_parent_id=move_data.new_parent_id,
                new_sort_order=move_data.new_sort_order
            )
            
            logger.info(f"Usuario {user['username']} movió menú {moved_menu.menu_code} a padre {move_data.new_parent_id}")
            
            return ResponseManager.success(
                data=menu_to_dict(moved_menu),
                message="Menú movido exitosamente",
                request=request
            )
    
    except ValueError as e:
        return ResponseManager.error(
            error_code=ErrorCode.VALIDATION_ERROR,
            error_type=ErrorType.VALIDATION_ERROR,
            message=str(e),
            request=request
        )
    except Exception as e:
        logger.error(f"Error al mover menú {menu_id}: {e}")
        return ResponseManager.internal_server_error(
            message="Error al mover menú",
            details=str(e),
            request=request
        )

@router.put("/reorder", response_class=JSONResponse)
async def reorder_children(
    request: Request,
    reorder_data: MenuItemReorder,
    user: dict = Depends(require_write_permission),
    parent_id: Optional[int] = Query(None, description="ID del padre (null para raíz)")
):
    """Reordenar menús hijos"""
    
    try:
        async with db_manager.get_async_session() as session:
            service = MenuService(session)
            
            # Reordenar hijos
            updated_count = service.reorder_children(
                parent_id=parent_id,
                ordered_child_ids=reorder_data.ordered_child_ids
            )
            
            logger.info(f"Usuario {user['username']} reordenó {updated_count} menús hijos de padre {parent_id}")
            
            return ResponseManager.success(
                data={
                    "parent_id": parent_id,
                    "updated_count": updated_count,
                    "total_children": len(reorder_data.ordered_child_ids)
                },
                message="Menús reordenados exitosamente",
                request=request
            )
    
    except ValueError as e:
        return ResponseManager.error(
            error_code=ErrorCode.VALIDATION_ERROR,
            error_type=ErrorType.VALIDATION_ERROR,
            message=str(e),
            request=request
        )
    except Exception as e:
        logger.error(f"Error al reordenar menús hijos de {parent_id}: {e}")
        return ResponseManager.internal_server_error(
            message="Error al reordenar menús",
            details=str(e),
            request=request
        )

@router.post("/normalize-orders", response_class=JSONResponse)
async def normalize_orders(
    request: Request,
    parent_id: Optional[int] = Query(None, description="ID del padre (null para todos)"),
    user: dict = Depends(require_manager_permission)
):
    """Normalizar órdenes de menús"""
    
    try:
        async with db_manager.get_async_session() as session:
            service = MenuService(session)
            
            # Normalizar órdenes
            updated_count = service.normalize_menu_orders(parent_id)
            
            scope = f"padre {parent_id}" if parent_id else "todos los niveles"
            logger.info(f"Usuario {user['username']} normalizó órdenes en {scope}: {updated_count} actualizados")
            
            return ResponseManager.success(
                data={
                    "parent_id": parent_id,
                    "updated_count": updated_count,
                    "scope": "single_parent" if parent_id else "all_levels"
                },
                message="Órdenes normalizados exitosamente",
                request=request
            )
    
    except Exception as e:
        logger.error(f"Error al normalizar órdenes: {e}")
        return ResponseManager.internal_server_error(
            message="Error al normalizar órdenes",
            details=str(e),
            request=request
        )

# ==========================================
# ENDPOINTS DE ESTADO
# ==========================================

@router.put("/{menu_id}/toggle-status", response_class=JSONResponse)
async def toggle_menu_status(
    request: Request,
    toggle_data: MenuItemToggleStatus,
    user: dict = Depends(require_write_permission),
    menu_id: int = Path(gt=0)
):
    """Activar/desactivar menú"""
    
    try:
        async with db_manager.get_async_session() as session:
            service = MenuService(session)
            
            # Obtener y actualizar menú
            menu = service.get_menu_by_id(menu_id)
            if not menu:
                return ResponseManager.error(
                    error_code=ErrorCode.NOT_FOUND,
                    error_type=ErrorType.RESOURCE_NOT_FOUND,
                    message=f"Menú con ID {menu_id} no encontrado",
                    request=request
                )
            
            # Actualizar solo el estado
            from database.schemas.menu_items import MenuItemUpdate
            update_data = MenuItemUpdate(is_active=toggle_data.is_active)
            updated_menu = service.update_menu(menu_id, update_data, user['user_id'])
            
            status_text = "activado" if toggle_data.is_active else "desactivado"
            logger.info(f"Usuario {user['username']} {status_text} menú {updated_menu.menu_code}")
            
            return ResponseManager.success(
                data=menu_to_dict(updated_menu),
                message=f"Menú {status_text} exitosamente",
                request=request
            )
    
    except Exception as e:
        logger.error(f"Error al cambiar estado del menú {menu_id}: {e}")
        return ResponseManager.internal_server_error(
            message="Error al cambiar estado del menú",
            details=str(e),
            request=request
        )

@router.put("/bulk-toggle", response_class=JSONResponse)
async def bulk_toggle_status(
    request: Request,
    bulk_data: MenuItemBulkToggle,
    user: dict = Depends(require_manager_permission)
):
    """Activar/desactivar menús en lote"""
    
    try:
        async with db_manager.get_async_session() as session:
            service = MenuService(session)
            
            # Operación masiva
            updated_count, error_count = service.bulk_toggle_status(
                menu_ids=bulk_data.menu_ids,
                is_active=bulk_data.is_active
            )
            
            status_text = "activados" if bulk_data.is_active else "desactivados"
            logger.info(f"Usuario {user['username']} {status_text} {updated_count} menús en lote")
            
            return ResponseManager.success(
                data={
                    "updated_count": updated_count,
                    "error_count": error_count,
                    "total_requested": len(bulk_data.menu_ids),
                    "is_active": bulk_data.is_active,
                    "reason": bulk_data.reason
                },
                message=f"{updated_count} menús {status_text} exitosamente",
                request=request
            )
    
    except Exception as e:
        logger.error(f"Error en operación masiva: {e}")
        return ResponseManager.internal_server_error(
            message="Error en operación masiva",
            details=str(e),
            request=request
        )

# ==========================================
# ENDPOINTS DE UTILIDADES
# ==========================================

@router.get("/suggest-icon/{menu_name}", response_class=JSONResponse)
async def suggest_icon(
    request: Request,
    user: dict = Depends(require_read_permission),
    menu_type: Optional[str] = Query(None, description="Tipo del menú"),
    menu_name: str = Path(description="Nombre del menú")
):
    """Sugerir icono para un menú"""
    
    try:
        suggested_icon = suggest_icon_for_menu(menu_name, menu_type)
        
        return ResponseManager.success(
            data={
                "menu_name": menu_name,
                "menu_type": menu_type,
                "suggested_icon": suggested_icon
            },
            message="Icono sugerido exitosamente",
            request=request
        )
    
    except Exception as e:
        logger.error(f"Error al sugerir icono: {e}")
        return ResponseManager.internal_server_error(
            message="Error al sugerir icono",
            details=str(e),
            request=request
        )

@router.get("/code/{menu_code}", response_class=JSONResponse)
async def get_menu_by_code(
    request: Request,
    user: dict = Depends(require_read_permission),
    menu_code: str = Path(description="Código del menú")
):
    """Obtener menú por código"""
    
    try:
        async with db_manager.get_async_session() as session:
            service = MenuService(session)
            
            menu = service.get_menu_by_code(menu_code)
            
            if not menu:
                return ResponseManager.error(
                    error_code=ErrorCode.NOT_FOUND,
                    error_type=ErrorType.RESOURCE_NOT_FOUND,
                    message=f"Menú con código '{menu_code}' no encontrado",
                    request=request
                )
            
            logger.info(f"Usuario {user['username']} consultó menú por código {menu_code}")
            
            return ResponseManager.success(
                data=menu_to_dict(menu),
                message="Menú obtenido por código exitosamente",
                request=request
            )
    
    except Exception as e:
        logger.error(f"Error al obtener menú por código {menu_code}: {e}")
        return ResponseManager.internal_server_error(
            message="Error al obtener menú por código",
            details=str(e),
            request=request
        )