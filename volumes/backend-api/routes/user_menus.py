"""
routes/user_menus.py
Endpoints para gestión de menús personalizados por usuario
Favoritos, menús recientes y construcción de menús jerárquicos
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Request, Depends, Query, Path
from fastapi.responses import JSONResponse
from sqlalchemy import select, and_, func, or_, desc

# Database imports
from database.database import db_manager
from database.models.menu_items import MenuItem
from database.models.user_menu_favorites import UserMenuFavorite
from database.models.menu_access_log import MenuAccessLog

# Schema imports
from database.schemas.user_menu_favorites import (
    UserMenuFavoriteCreate,
    UserMenuFavoriteUpdate,
    UserMenuFavoriteBulkReorder
)

# Core imports
from core.response import ResponseManager
from core.constants import ErrorCode, ErrorType

# Service imports
from services.menu_service import MenuService

# Utils imports
from utils.permissions_utils import require_permission
from utils.menu_helpers import find_menu_by_code, get_menu_children
from utils.log_helper import setup_logger

# ==========================================
# CONFIGURACIÓN DEL ROUTER
# ==========================================

logger = setup_logger(__name__)

router = APIRouter(
    prefix="/user-menus",
    tags=["User Menus"],
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

async def require_user_access(request: Request) -> dict:
    """Usuario autenticado (acceso a sus propios menús)"""
    return await require_permission("USER", ["READ"], request)

async def require_admin_access(request: Request) -> dict:
    """Acceso de administrador para operaciones masivas"""
    return await require_permission("USER", ["MANAGER"], request)

# ==========================================
# HELPER FUNCTIONS
# ==========================================

def favorite_to_dict(favorite: UserMenuFavorite, include_menu: bool = False) -> dict:
    """Convertir UserMenuFavorite a diccionario"""
    result = {
        "id": favorite.id,
        "user_id": favorite.user_id,
        "menu_item_id": favorite.menu_item_id,
        "favorite_order": favorite.favorite_order,
        "created_at": favorite.created_at
    }
    
    if include_menu and hasattr(favorite, 'menu_item') and favorite.menu_item:
        menu = favorite.menu_item
        result["menu_details"] = {
            "menu_code": menu.menu_code,
            "menu_name": menu.menu_name,
            "menu_description": menu.menu_description,
            "icon_name": menu.icon_name,
            "icon_color": menu.icon_color,
            "menu_url": menu.menu_url,
            "menu_type": menu.menu_type.value,
            "menu_level": menu.menu_level,
            "is_active": menu.is_active,
            "is_visible": menu.is_visible
        }
    
    return result

def build_user_menu_hierarchy(session, user_permissions: List[str], favorites_dict: Dict[int, UserMenuFavorite] = None) -> List[Dict[str, Any]]:
    """Construir jerarquía de menús para usuario con favoritos marcados"""
    
    def build_tree(parent_id: Optional[int] = None) -> List[Dict[str, Any]]:
        # Obtener menús del nivel
        stmt = select(MenuItem).where(
            MenuItem.parent_id == parent_id,
            MenuItem.deleted_at.is_(None),
            MenuItem.is_active == True,
            MenuItem.is_visible == True
        ).order_by(MenuItem.sort_order, MenuItem.menu_name)
        
        result = session.execute(stmt)
        menus = result.scalars().all()
        
        tree = []
        for menu in menus:
            # TODO: Aquí se debería verificar permisos del usuario
            # Por simplicidad, incluimos todos por ahora
            
            menu_dict = {
                "id": menu.id,
                "code": menu.menu_code,
                "name": menu.menu_name,
                "description": menu.menu_description,
                "icon_name": menu.icon_name,
                "icon_color": menu.icon_color,
                "url": menu.menu_url,
                "type": menu.menu_type.value,
                "level": menu.menu_level,
                "sort_order": menu.sort_order,
                "is_favorite": menu.id in favorites_dict if favorites_dict else False,
                "children": build_tree(menu.id)
            }
            
            if favorites_dict and menu.id in favorites_dict:
                menu_dict["favorite_order"] = favorites_dict[menu.id].favorite_order
                menu_dict["favorited_at"] = favorites_dict[menu.id].created_at
            
            tree.append(menu_dict)
        
        return tree
    
    return build_tree()

# ==========================================
# ENDPOINTS - FAVORITOS
# ==========================================

@router.get("/favorites", response_class=JSONResponse)
async def get_user_favorites(
    request: Request,
    user: dict = Depends(require_user_access),
    include_menu_details: bool = Query(True, description="Incluir detalles del menú"),
    active_only: bool = Query(True, description="Solo menús activos")
):
    """Obtener menús favoritos del usuario actual"""
    
    try:
        user_id = user['user_id']
        
        async with db_manager.get_async_session() as session:
            # Query para favoritos con detalles del menú
            stmt = select(UserMenuFavorite)
            
            if include_menu_details:
                stmt = stmt.join(MenuItem, UserMenuFavorite.menu_item_id == MenuItem.id)
            
            stmt = stmt.where(UserMenuFavorite.user_id == user_id)
            
            if include_menu_details:
                stmt = stmt.where(MenuItem.deleted_at.is_(None))
                if active_only:
                    stmt = stmt.where(
                        MenuItem.is_active == True,
                        MenuItem.is_visible == True
                    )
            
            stmt = stmt.order_by(UserMenuFavorite.favorite_order, UserMenuFavorite.id)
            
            result = await session.execute(stmt)
            favorites = result.scalars().all()
            
            # Convertir a diccionarios
            favorites_data = []
            for favorite in favorites:
                if include_menu_details:
                    # Cargar el menú asociado manualmente
                    menu_stmt = select(MenuItem).where(MenuItem.id == favorite.menu_item_id)
                    menu_result = await session.execute(menu_stmt)
                    menu = menu_result.scalar_one_or_none()
                    
                    if menu and (not active_only or (menu.is_active and menu.is_visible)):
                        favorite.menu_item = menu  # Asociar temporalmente
                        favorites_data.append(favorite_to_dict(favorite, include_menu=True))
                else:
                    favorites_data.append(favorite_to_dict(favorite, include_menu=False))
            
            logger.info(f"Usuario {user['username']} consultó {len(favorites_data)} favoritos")
            
            return ResponseManager.success(
                data={
                    "favorites": favorites_data,
                    "total_count": len(favorites_data),
                    "user_id": user_id
                },
                message="Favoritos obtenidos exitosamente",
                request=request
            )
    
    except Exception as e:
        logger.error(f"Error al obtener favoritos del usuario {user_id}: {e}")
        return ResponseManager.internal_server_error(
            message="Error al obtener favoritos",
            details=str(e),
            request=request
        )

@router.post("/favorites", response_class=JSONResponse)
async def add_favorite(
    request: Request,
    favorite_data: UserMenuFavoriteCreate,
    user: dict = Depends(require_user_access)
):
    """Agregar menú a favoritos del usuario"""
    
    try:
        user_id = user['user_id']
        
        # Verificar que el usuario solo agregue sus propios favoritos
        if favorite_data.user_id != user_id:
            return ResponseManager.error(
                error_code=ErrorCode.FORBIDDEN,
                error_type=ErrorType.AUTHORIZATION_ERROR,
                message="Solo puedes agregar favoritos a tu propia cuenta",
                request=request
            )
        
        async with db_manager.get_async_session() as session:
            # Verificar que el menú existe y está activo
            menu_stmt = select(MenuItem).where(
                MenuItem.id == favorite_data.menu_item_id,
                MenuItem.deleted_at.is_(None),
                MenuItem.is_active == True
            )
            menu_result = await session.execute(menu_stmt)
            menu = menu_result.scalar_one_or_none()
            
            if not menu:
                return ResponseManager.error(
                    error_code=ErrorCode.NOT_FOUND,
                    error_type=ErrorType.RESOURCE_NOT_FOUND,
                    message="Menú no encontrado o no está activo",
                    request=request
                )
            
            # Verificar que no existe ya como favorito
            existing_stmt = select(UserMenuFavorite).where(
                UserMenuFavorite.user_id == user_id,
                UserMenuFavorite.menu_item_id == favorite_data.menu_item_id
            )
            existing_result = await session.execute(existing_stmt)
            existing = existing_result.scalar_one_or_none()
            
            if existing:
                return ResponseManager.error(
                    error_code=ErrorCode.CONFLICT,
                    error_type=ErrorType.BUSINESS_RULE_VIOLATION,
                    message="El menú ya está en favoritos",
                    request=request
                )
            
            # Calcular orden si no se especifica
            if favorite_data.favorite_order == 0:
                max_order_stmt = select(func.max(UserMenuFavorite.favorite_order)).where(
                    UserMenuFavorite.user_id == user_id
                )
                max_order_result = await session.execute(max_order_stmt)
                max_order = max_order_result.scalar() or 0
                favorite_data.favorite_order = max_order + 10
            
            # Crear favorito
            new_favorite = UserMenuFavorite(
                user_id=favorite_data.user_id,
                menu_item_id=favorite_data.menu_item_id,
                favorite_order=favorite_data.favorite_order
            )
            
            session.add(new_favorite)
            await session.commit()
            await session.refresh(new_favorite)
            
            logger.info(f"Usuario {user['username']} agregó menú {menu.menu_code} a favoritos")
            
            return ResponseManager.success(
                data={
                    "id": new_favorite.id,
                    "user_id": new_favorite.user_id,
                    "menu_item_id": new_favorite.menu_item_id,
                    "favorite_order": new_favorite.favorite_order,
                    "menu_name": menu.menu_name,
                    "menu_code": menu.menu_code,
                    "created_at": new_favorite.created_at
                },
                message="Menú agregado a favoritos",
                request=request
            )
    
    except Exception as e:
        logger.error(f"Error al agregar favorito: {e}")
        return ResponseManager.internal_server_error(
            message="Error al agregar favorito",
            details=str(e),
            request=request
        )

@router.delete("/favorites/{favorite_id}", response_class=JSONResponse)
async def remove_favorite(
    request: Request,
    favorite_id: int = Path(..., gt=0),
    user: dict = Depends(require_user_access)
):
    """Remover menú de favoritos"""
    
    try:
        user_id = user['user_id']
        
        async with db_manager.get_async_session() as session:
            # Buscar favorito
            stmt = select(UserMenuFavorite).where(
                UserMenuFavorite.id == favorite_id,
                UserMenuFavorite.user_id == user_id
            )
            result = await session.execute(stmt)
            favorite = result.scalar_one_or_none()
            
            if not favorite:
                return ResponseManager.error(
                    error_code=ErrorCode.NOT_FOUND,
                    error_type=ErrorType.RESOURCE_NOT_FOUND,
                    message="Favorito no encontrado",
                    request=request
                )
            
            # Eliminar favorito
            await session.delete(favorite)
            await session.commit()
            
            logger.info(f"Usuario {user['username']} removió favorito {favorite_id}")
            
            return ResponseManager.success(
                data={"favorite_id": favorite_id},
                message="Favorito eliminado exitosamente",
                request=request
            )
    
    except Exception as e:
        logger.error(f"Error al eliminar favorito {favorite_id}: {e}")
        return ResponseManager.internal_server_error(
            message="Error al eliminar favorito",
            details=str(e),
            request=request
        )

@router.put("/favorites/reorder", response_class=JSONResponse)
async def reorder_favorites(
    request: Request,
    reorder_data: UserMenuFavoriteBulkReorder,
    user: dict = Depends(require_user_access)
):
    """Reordenar favoritos del usuario"""
    
    try:
        user_id = user['user_id']
        
        async with db_manager.get_async_session() as session:
            # Verificar que todos los favoritos pertenecen al usuario
            favorite_ids = [item.favorite_id for item in reorder_data.items]
            
            stmt = select(UserMenuFavorite).where(
                UserMenuFavorite.id.in_(favorite_ids),
                UserMenuFavorite.user_id == user_id
            )
            result = await session.execute(stmt)
            favorites = {fav.id: fav for fav in result.scalars().all()}
            
            if len(favorites) != len(favorite_ids):
                missing_ids = set(favorite_ids) - set(favorites.keys())
                return ResponseManager.error(
                    error_code=ErrorCode.NOT_FOUND,
                    error_type=ErrorType.RESOURCE_NOT_FOUND,
                    message=f"Favoritos no encontrados: {missing_ids}",
                    request=request
                )
            
            # Actualizar órdenes
            updated_count = 0
            for item in reorder_data.items:
                favorite = favorites[item.favorite_id]
                if favorite.favorite_order != item.new_order:
                    favorite.favorite_order = item.new_order
                    updated_count += 1
            
            await session.commit()
            
            logger.info(f"Usuario {user['username']} reordenó {updated_count} favoritos")
            
            return ResponseManager.success(
                data={
                    "updated_count": updated_count,
                    "total_items": len(favorite_ids)
                },
                message="Favoritos reordenados exitosamente",
                request=request
            )
    
    except Exception as e:
        logger.error(f"Error al reordenar favoritos: {e}")
        return ResponseManager.internal_server_error(
            message="Error al reordenar favoritos",
            details=str(e),
            request=request
        )

# ==========================================
# ENDPOINTS - MENÚS RECIENTES
# ==========================================

@router.get("/recent", response_class=JSONResponse)
async def get_recent_menus(
    request: Request,
    user: dict = Depends(require_user_access),
    limit: int = Query(10, ge=1, le=50, description="Límite de menús recientes"),
    days: int = Query(30, ge=1, le=90, description="Días hacia atrás")
):
    """Obtener menús recientemente accedidos por el usuario"""
    
    try:
        user_id = user['user_id']
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        async with db_manager.get_async_session() as session:
            # Query para menús recientes con detalles
            stmt = select(
                MenuAccessLog.menu_item_id,
                MenuItem.menu_code,
                MenuItem.menu_name,
                MenuItem.icon_name,
                MenuItem.icon_color,
                MenuItem.menu_url,
                func.max(MenuAccessLog.access_timestamp).label('last_access'),
                func.count(MenuAccessLog.id).label('access_count')
            ).join(
                MenuItem,
                MenuAccessLog.menu_item_id == MenuItem.id
            ).where(
                MenuAccessLog.user_id == user_id,
                MenuAccessLog.access_timestamp >= cutoff_date,
                MenuItem.deleted_at.is_(None),
                MenuItem.is_active == True,
                MenuItem.is_visible == True
            ).group_by(
                MenuAccessLog.menu_item_id,
                MenuItem.menu_code,
                MenuItem.menu_name,
                MenuItem.icon_name,
                MenuItem.icon_color,
                MenuItem.menu_url
            ).order_by(
                desc('last_access')
            ).limit(limit)
            
            result = await session.execute(stmt)
            recent_menus = []
            
            for row in result:
                recent_menus.append({
                    "menu_item_id": row.menu_item_id,
                    "menu_code": row.menu_code,
                    "menu_name": row.menu_name,
                    "icon_name": row.icon_name,
                    "icon_color": row.icon_color,
                    "menu_url": row.menu_url,
                    "last_access": row.last_access,
                    "access_count": row.access_count
                })
            
            logger.info(f"Usuario {user['username']} consultó {len(recent_menus)} menús recientes")
            
            return ResponseManager.success(
                data={
                    "recent_menus": recent_menus,
                    "total_count": len(recent_menus),
                    "period_days": days,
                    "user_id": user_id
                },
                message="Menús recientes obtenidos exitosamente",
                request=request
            )
    
    except Exception as e:
        logger.error(f"Error al obtener menús recientes: {e}")
        return ResponseManager.internal_server_error(
            message="Error al obtener menús recientes",
            details=str(e),
            request=request
        )

@router.post("/log-access", response_class=JSONResponse)
async def log_menu_access(
    request: Request,
    menu_id: int = Query(..., gt=0, description="ID del menú accedido"),
    user: dict = Depends(require_user_access)
):
    """Registrar acceso a un menú"""
    
    try:
        user_id = user['user_id']
        
        async with db_manager.get_async_session() as session:
            # Verificar que el menú existe
            menu_stmt = select(MenuItem).where(
                MenuItem.id == menu_id,
                MenuItem.deleted_at.is_(None)
            )
            menu_result = await session.execute(menu_stmt)
            menu = menu_result.scalar_one_or_none()
            
            if not menu:
                return ResponseManager.error(
                    error_code=ErrorCode.NOT_FOUND,
                    error_type=ErrorType.RESOURCE_NOT_FOUND,
                    message="Menú no encontrado",
                    request=request
                )
            
            # Registrar acceso
            access_log = MenuAccessLog(
                user_id=user_id,
                menu_item_id=menu_id,
                ip_address=getattr(request.client, 'host', None),
                user_agent=request.headers.get('user-agent'),
                session_id=None  # Se podría obtener del token JWT
            )
            
            session.add(access_log)
            await session.commit()
            
            logger.info(f"Usuario {user['username']} accedió al menú {menu.menu_code}")
            
            return ResponseManager.success(
                data={
                    "menu_id": menu_id,
                    "menu_code": menu.menu_code,
                    "accessed_at": access_log.access_timestamp
                },
                message="Acceso registrado exitosamente",
                request=request
            )
    
    except Exception as e:
        logger.error(f"Error al registrar acceso al menú {menu_id}: {e}")
        return ResponseManager.internal_server_error(
            message="Error al registrar acceso",
            details=str(e),
            request=request
        )

# ==========================================
# ENDPOINTS - MENÚ JERÁRQUICO PERSONALIZADO
# ==========================================

@router.get("/hierarchy", response_class=JSONResponse)
async def get_user_menu_hierarchy(
    request: Request,
    user: dict = Depends(require_user_access),
    include_favorites: bool = Query(True, description="Marcar favoritos"),
    max_depth: Optional[int] = Query(None, ge=1, le=10, description="Profundidad máxima")
):
    """Obtener jerarquía completa de menús para el usuario con favoritos marcados"""
    
    try:
        user_id = user['user_id']
        
        async with db_manager.get_async_session() as session:
            # Obtener favoritos del usuario si se solicita
            favorites_dict = {}
            if include_favorites:
                fav_stmt = select(UserMenuFavorite).where(
                    UserMenuFavorite.user_id == user_id
                )
                fav_result = await session.execute(fav_stmt)
                favorites = fav_result.scalars().all()
                favorites_dict = {fav.menu_item_id: fav for fav in favorites}
            
            # TODO: Obtener permisos del usuario
            user_permissions = []  # Placeholder
            
            # Construir jerarquía
            hierarchy = build_user_menu_hierarchy(
                session=session,
                user_permissions=user_permissions,
                favorites_dict=favorites_dict if include_favorites else None
            )
            
            logger.info(f"Usuario {user['username']} obtuvo jerarquía personalizada")
            
            return ResponseManager.success(
                data={
                    "hierarchy": hierarchy,
                    "user_id": user_id,
                    "favorites_included": include_favorites,
                    "total_favorites": len(favorites_dict),
                    "max_depth": max_depth
                },
                message="Jerarquía de menús obtenida exitosamente",
                request=request
            )
    
    except Exception as e:
        logger.error(f"Error al obtener jerarquía de usuario: {e}")
        return ResponseManager.internal_server_error(
            message="Error al obtener jerarquía de menús",
            details=str(e),
            request=request
        )

@router.get("/dashboard", response_class=JSONResponse)
async def get_user_dashboard(
    request: Request,
    user: dict = Depends(require_user_access),
    max_favorites: int = Query(10, ge=1, le=20, description="Máximo favoritos"),
    max_recent: int = Query(5, ge=1, le=15, description="Máximo recientes")
):
    """Obtener dashboard personalizado del usuario con favoritos y recientes"""
    
    try:
        user_id = user['user_id']
        
        async with db_manager.get_async_session() as session:
            # Obtener favoritos
            fav_stmt = select(UserMenuFavorite).join(
                MenuItem, UserMenuFavorite.menu_item_id == MenuItem.id
            ).where(
                UserMenuFavorite.user_id == user_id,
                MenuItem.deleted_at.is_(None),
                MenuItem.is_active == True,
                MenuItem.is_visible == True
            ).order_by(
                UserMenuFavorite.favorite_order
            ).limit(max_favorites)
            
            fav_result = await session.execute(fav_stmt)
            favorites = fav_result.scalars().all()
            
            favorites_data = []
            for favorite in favorites:
                # Cargar menú asociado
                menu_stmt = select(MenuItem).where(MenuItem.id == favorite.menu_item_id)
                menu_result = await session.execute(menu_stmt)
                menu = menu_result.scalar_one_or_none()
                
                if menu:
                    favorites_data.append({
                        "favorite_id": favorite.id,
                        "menu_id": menu.id,
                        "menu_code": menu.menu_code,
                        "menu_name": menu.menu_name,
                        "icon_name": menu.icon_name,
                        "icon_color": menu.icon_color,
                        "menu_url": menu.menu_url,
                        "favorite_order": favorite.favorite_order
                    })
            
            # Obtener recientes (últimos 7 días)
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=7)
            recent_stmt = select(
                MenuAccessLog.menu_item_id,
                MenuItem.menu_code,
                MenuItem.menu_name,
                MenuItem.icon_name,
                MenuItem.menu_url,
                func.max(MenuAccessLog.access_timestamp).label('last_access')
            ).join(
                MenuItem, MenuAccessLog.menu_item_id == MenuItem.id
            ).where(
                MenuAccessLog.user_id == user_id,
                MenuAccessLog.access_timestamp >= cutoff_date,
                MenuItem.deleted_at.is_(None),
                MenuItem.is_active == True,
                MenuItem.is_visible == True
            ).group_by(
                MenuAccessLog.menu_item_id,
                MenuItem.menu_code,
                MenuItem.menu_name,
                MenuItem.icon_name,
                MenuItem.menu_url
            ).order_by(
                desc('last_access')
            ).limit(max_recent)
            
            recent_result = await session.execute(recent_stmt)
            recent_data = []
            
            for row in recent_result:
                recent_data.append({
                    "menu_id": row.menu_item_id,
                    "menu_code": row.menu_code,
                    "menu_name": row.menu_name,
                    "icon_name": row.icon_name,
                    "menu_url": row.menu_url,
                    "last_access": row.last_access
                })
            
            logger.info(f"Usuario {user['username']} obtuvo dashboard personalizado")
            
            return ResponseManager.success(
                data={
                    "user_id": user_id,
                    "username": user['username'],
                    "favorites": favorites_data,
                    "recent_menus": recent_data,
                    "stats": {
                        "total_favorites": len(favorites_data),
                        "total_recent": len(recent_data)
                    },
                    "generated_at": datetime.now(timezone.utc)
                },
                message="Dashboard obtenido exitosamente",
                request=request
            )
    
    except Exception as e:
        logger.error(f"Error al obtener dashboard de usuario: {e}")
        return ResponseManager.internal_server_error(
            message="Error al obtener dashboard",
            details=str(e),
            request=request
        )

# ==========================================
# ENDPOINTS DE UTILIDADES
# ==========================================

@router.get("/stats", response_class=JSONResponse)
async def get_user_menu_stats(
    request: Request,
    user: dict = Depends(require_user_access)
):
    """Obtener estadísticas de menús del usuario"""
    
    try:
        user_id = user['user_id']
        
        async with db_manager.get_async_session() as session:
            # Contar favoritos
            fav_count_stmt = select(func.count(UserMenuFavorite.id)).where(
                UserMenuFavorite.user_id == user_id
            )
            fav_count_result = await session.execute(fav_count_stmt)
            total_favorites = fav_count_result.scalar()
            
            # Contar accesos últimos 30 días
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
            access_count_stmt = select(func.count(MenuAccessLog.id)).where(
                MenuAccessLog.user_id == user_id,
                MenuAccessLog.access_timestamp >= cutoff_date
            )
            access_count_result = await session.execute(access_count_stmt)
            recent_accesses = access_count_result.scalar()
            
            # Menús únicos accedidos
            unique_menus_stmt = select(func.count(func.distinct(MenuAccessLog.menu_item_id))).where(
                MenuAccessLog.user_id == user_id,
                MenuAccessLog.access_timestamp >= cutoff_date
            )
            unique_menus_result = await session.execute(unique_menus_stmt)
            unique_menus = unique_menus_result.scalar()
            
            stats = {
                "user_id": user_id,
                "total_favorites": total_favorites,
                "recent_accesses_30d": recent_accesses,
                "unique_menus_accessed_30d": unique_menus,
                "avg_accesses_per_menu": round(recent_accesses / max(unique_menus, 1), 2),
                "generated_at": datetime.now(timezone.utc)
            }
            
            logger.info(f"Usuario {user['username']} consultó sus estadísticas de menús")
            
            return ResponseManager.success(
                data=stats,
                message="Estadísticas obtenidas exitosamente",
                request=request
            )
    
    except Exception as e:
        logger.error(f"Error al obtener estadísticas de usuario: {e}")
        return ResponseManager.internal_server_error(
            message="Error al obtener estadísticas",
            details=str(e),
            request=request
        )