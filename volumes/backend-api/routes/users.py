"""
volumes/backend-api/routes/users.py
Router de Users - CRUD básico para gestión de usuarios
Incluye autenticación JWT y control de permisos
Responsabilidad única: gestión de datos de usuario (sin roles/permisos/contraseñas)
"""
from utils.log_helper import setup_logger
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Request, Depends, Query, Path
from fastapi.responses import JSONResponse
from sqlalchemy import select, and_, func, or_

# Database imports
from database.database import db_manager
from database.models.users import User

# Schema imports
from database.schemas.user import (
    UserCreate,
    UserUpdate,
    UserActivationToggle
)

# Core imports
from core.response import ResponseManager
from core.constants import ErrorCode, ErrorType, HTTPStatus

# Utils imports
from utils.permissions_utils import require_permission
from utils.profile_helpers import ProfileHelper 

# ==========================================
# CONFIGURACIÓN DEL ROUTER
# ==========================================

logger = setup_logger(__name__)

router = APIRouter(
    tags=["Users"],
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

async def require_read_permission(request: Request) -> dict:
    return await require_permission("USER", ["READ", "MANAGER"], request)

async def require_write_permission(request: Request) -> dict:
    return await require_permission("USER", ["WRITE", "MANAGER"], request)

async def require_manager_permission(request: Request) -> dict:
    return await require_permission("USER", ["MANAGER"], request)

# ==========================================
# HELPER FUNCTIONS
# ==========================================

def user_to_dict(user: User, include_sensitive: bool = False) -> dict:
    """Convertir modelo User a diccionario"""
    base_dict = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": user.full_name,
        "display_name": user.display_name,
        "initials": user.initials,
        "phone": user.phone,
        "is_active": user.is_active,
        "is_authenticated": user.is_authenticated,
        "petty_cash_limit": float(user.petty_cash_limit) if user.petty_cash_limit else None,
        "has_petty_cash_access": user.has_petty_cash_access,
        #"is_recently_active": user.is_recently_active,
        "is_recently_active": user.has_recent_login,
        # Arrays vacíos preparados para futuro módulo de permisos
        "roles": [],
        "permissions": [],
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None
    }
    
    if include_sensitive:
        base_dict.update({
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "last_login_ip": user.last_login_ip,
            "password_changed_at": user.password_changed_at.isoformat() if user.password_changed_at else None,
            "password_age_days": user.password_age_days,
            "needs_password_change": user.needs_password_change
        })
    
    return base_dict

async def get_profile(session, user_id: int, requesting_user_id: int, is_own_profile: bool = False) -> dict:
    """
    Función unificada para obtener perfil completo de usuario
    
    Args:
        session: Sesión de base de datos
        user_id: ID del usuario cuyo perfil se solicita
        requesting_user_id: ID del usuario que hace la solicitud
        is_own_profile: Si es el propio perfil o de otro usuario
        
    Returns:
        Dict con información completa del perfil
    """
    try:
        # ==========================================
        # OBTENER USUARIO BASE
        # ==========================================
        stmt = select(User).where(
            and_(
                User.id == user_id,
                User.deleted_at.is_(None)
            )
        )
        
        result = await session.execute(stmt)
        target_user = result.scalar_one_or_none()
        
        if not target_user:
            return None
        
        # Para perfiles de otros usuarios, verificar que esté activo
        if not is_own_profile and not target_user.is_active:
            return None
        
        # ==========================================
        # OBTENER INFORMACIÓN BÁSICA DEL USUARIO
        # ==========================================
        user_basic_data = user_to_dict(target_user, include_sensitive=True)
        
        # ==========================================
        # OBTENER ROLES Y PERMISOS
        # ==========================================
        roles_and_permissions = await ProfileHelper.get_user_roles_and_permissions(session, user_id)
        
        # ==========================================
        # OBTENER ACCESOS A BODEGAS
        # ==========================================
        warehouse_accesses = await ProfileHelper.get_user_warehouse_accesses(session, user_id)
        
        # ==========================================
        # CONSTRUIR RESPUESTA UNIFICADA
        # ==========================================
        profile_data = {
            # Información básica del usuario
            **user_basic_data,
            
            # Información de roles y permisos
            "roles": roles_and_permissions.get("role_codes", []),
            "role_names": roles_and_permissions.get("role_names", []),
            "permissions": roles_and_permissions.get("permission_codes", []),
            "role_details": roles_and_permissions.get("role_details", []),
            "permission_details": roles_and_permissions.get("permission_details", []),
            
            # Contadores de roles y permisos
            "role_count": roles_and_permissions.get("role_count", 0),
            "permission_count": roles_and_permissions.get("permission_count", 0),
            
            # Propiedades derivadas de roles
            "has_admin_role": roles_and_permissions.get("has_admin_role", False),
            "has_manager_role": roles_and_permissions.get("has_manager_role", False),
            "is_supervisor": roles_and_permissions.get("is_supervisor", False),
            "is_cashier": roles_and_permissions.get("is_cashier", False),
            
            # Información de bodegas
            "warehouse_accesses": warehouse_accesses.get("accesses", []),
            "warehouse_count": warehouse_accesses.get("total_warehouses", 0),
            "responsible_warehouse_count": warehouse_accesses.get("responsible_warehouses", 0),
            "warehouse_access_types": warehouse_accesses.get("access_types", []),
            
            # Metadatos del perfil
            "is_own_profile": is_own_profile,
            "profile_requested_by": requesting_user_id,
            "profile_generated_at": datetime.now(timezone.utc).isoformat(),
            
            # Información adicional para el frontend
            "profile_completeness": ProfileHelper.calculate_profile_completeness(target_user),
            "security_score": ProfileHelper.calculate_security_score(target_user, roles_and_permissions),
        }
        
        logger.info(f"Perfil generado para usuario {user_id} {'(propio)' if is_own_profile else '(por manager)'}")
        
        return profile_data
        
    except Exception as e:
        logger.error(f"Error en get_profile para usuario {user_id}: {e}")
        raise

# ==========================================
# ENDPOINTS CRUD BÁSICOS
# ==========================================

@router.get("/health")
async def info_users(request: Request):
    """Información básica del sistema de usuarios"""
    from utils.routes_helper import get_users_info
    return await get_users_info(router, request)

@router.get("/", response_class=JSONResponse)
async def list_users(
    request: Request,
    user: dict = Depends(require_read_permission),
    skip: int = Query(0, ge=0, description="Elementos a saltar"),
    limit: int = Query(100, ge=1, le=1000, description="Límite de elementos"),
    active_only: bool = Query(True, description="Solo usuarios activos"),
    search: Optional[str] = Query(None, description="Buscar por username, nombre o email"),
    has_recent_login: Optional[bool] = Query(None, description="Filtrar por login reciente")
):
    """Listar todos los usuarios"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Construir query base
            stmt = select(User).where(User.deleted_at.is_(None))
            
            if active_only:
                stmt = stmt.where(User.is_active == True)
            
            # Filtro de búsqueda
            if search:
                search_term = f"%{search.lower()}%"
                stmt = stmt.where(
                    or_(
                        func.lower(User.username).like(search_term),
                        func.lower(User.first_name).like(search_term),
                        func.lower(User.last_name).like(search_term),
                        func.lower(User.email).like(search_term)
                    )
                )
            
            # Filtro por login reciente
            if has_recent_login is not None:
                if has_recent_login:
                    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
                    stmt = stmt.where(User.last_login_at >= thirty_days_ago)
                else:
                    stmt = stmt.where(
                        or_(
                            User.last_login_at.is_(None),
                            User.last_login_at < (datetime.now(timezone.utc) - timedelta(days=30))
                        )
                    )
            
            # Aplicar paginación y ordenamiento
            stmt = stmt.order_by(User.username).offset(skip).limit(limit)
            
            result = await session.execute(stmt)
            users = result.scalars().all()
            
            # Convertir a diccionarios (sin información sensible para listado)
            user_data = [user_to_dict(user, include_sensitive=False) for user in users]
            
            # Estadísticas básicas
            total_found = len(user_data)
            active_count = sum(1 for u in user_data if u["is_active"])
            recent_login_count = sum(1 for u in user_data if u["is_recently_active"])
            
            response_data = {
                "users": user_data,
                "total_found": total_found,
                "active_count": active_count,
                "recent_login_count": recent_login_count,
                "filters_applied": {
                    "active_only": active_only,
                    "search": search,
                    "has_recent_login": has_recent_login
                },
                "pagination": {
                    "skip": skip,
                    "limit": limit
                }
            }
            
            logger.info(f"Usuario {user['username']} listó {total_found} usuarios")
            
            return ResponseManager.success(
                data=response_data,
                message=f"Se encontraron {total_found} usuarios",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al listar usuarios: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al obtener lista de usuarios",
            details=str(e),
            request=request
        )

@router.post("/", response_class=JSONResponse)
async def create_user(
    user_data: UserCreate,
    request: Request,
    user: dict = Depends(require_write_permission)
):
    """Crear un nuevo usuario (sin contraseña - se asigna después)"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Verificar que el username no exista
            existing_username_stmt = select(User).where(
                and_(
                    func.lower(User.username) == user_data.username.lower(),
                    User.deleted_at.is_(None)
                )
            )
            existing_username_result = await session.execute(existing_username_stmt)
            existing_username = existing_username_result.scalar_one_or_none()
            
            if existing_username:
                return ResponseManager.error(
                    message=f"Ya existe un usuario con el username: {user_data.username}",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.RESOURCE_DUPLICATE,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Verificar que el email no exista
            existing_email_stmt = select(User).where(
                and_(
                    func.lower(User.email) == user_data.email.lower(),
                    User.deleted_at.is_(None)
                )
            )
            existing_email_result = await session.execute(existing_email_stmt)
            existing_email = existing_email_result.scalar_one_or_none()
            
            if existing_email:
                return ResponseManager.error(
                    message=f"Ya existe un usuario con el email: {user_data.email}",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.RESOURCE_DUPLICATE,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Crear el usuario (sin contraseña - se asigna después)
            new_user = User(
                username=user_data.username.lower(),
                email=user_data.email.lower(),
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                phone=user_data.phone,
                is_active=True,  # Por defecto activo
                petty_cash_limit=user_data.petty_cash_limit,
                # Campos requeridos temporales (se actualizarán en auth)
                password_hash="0" * 64,  # Hash temporal - se actualiza en auth
                password_changed_at=datetime.now(timezone.utc)
            )
            
            # Generar secret para JWT
            new_user.generate_secret()
            
            session.add(new_user)
            await session.commit()
            await session.refresh(new_user)
            
            user_dict = user_to_dict(new_user, include_sensitive=True)
            
            logger.info(f"Usuario {user['username']} creó usuario: {new_user.username} (sin contraseña)")
            
            return ResponseManager.success(
                data=user_dict,
                message=f"Usuario '{new_user.username}' creado exitosamente. Contraseña pendiente de asignación.",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al crear usuario: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al crear usuario",
            details=str(e),
            request=request
        )

@router.get("/{user_id}", response_class=JSONResponse)
async def get_user(
    user_id: int = Path(..., description="ID del usuario"),
    request: Request = None,
    user: dict = Depends(require_read_permission)
):
    """Obtener un usuario específico por ID"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Obtener usuario
            stmt = select(User).where(
                and_(
                    User.id == user_id,
                    User.deleted_at.is_(None)
                )
            )
            
            result = await session.execute(stmt)
            target_user = result.scalar_one_or_none()
            
            if not target_user:
                return ResponseManager.error(
                    message=f"Usuario no encontrado: {user_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Verificar si puede ver información sensible (manager o mismo usuario)
            can_view_sensitive = (
                user['user_id'] == user_id or 
                'USER_MANAGER' in user.get('permissions', []) or
                'USER_ADMIN' in user.get('permissions', [])
            )
            
            user_dict = user_to_dict(target_user, include_sensitive=can_view_sensitive)
            
            logger.info(f"Usuario {user['username']} consultó usuario: {target_user.username}")
            
            return ResponseManager.success(
                data=user_dict,
                message="Usuario encontrado",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al obtener usuario {user_id}: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al obtener usuario",
            details=str(e),
            request=request
        )

@router.put("/{user_id}", response_class=JSONResponse)
async def update_user(
    user_data: UserUpdate,
    user_id: int = Path(..., description="ID del usuario"),
    request: Request = None,
    user: dict = Depends(require_read_permission)  # Cambiado para permitir auto-edición
):
    """Actualizar un usuario existente"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Obtener usuario objetivo
            stmt = select(User).where(
                and_(
                    User.id == user_id,
                    User.deleted_at.is_(None)
                )
            )
            
            result = await session.execute(stmt)
            target_user = result.scalar_one_or_none()
            
            if not target_user:
                return ResponseManager.error(
                    message=f"Usuario no encontrado: {user_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Verificar permisos - CORREGIDO para incluir rol ADMIN
            is_admin = "ADMIN" in user.get('roles', [])
            is_manager = (
                'USER_MANAGER' in user.get('permissions', []) or
                'USER_ADMIN' in user.get('permissions', [])
            )
            is_self_edit = user['user_id'] == user_id
            
            if not is_admin and not is_manager and not is_self_edit:
                return ResponseManager.error(
                    message="No tienes permisos para editar este usuario",
                    status_code=HTTPStatus.FORBIDDEN,
                    error_code=ErrorCode.PERMISSION_DENIED,
                    error_type=ErrorType.PERMISSION_ERROR,
                    request=request
                )
            
            # Aplicar actualizaciones según permisos
            updated_fields = []
            
            # Campos que el usuario puede editar de sí mismo
            if user_data.first_name is not None:
                target_user.first_name = user_data.first_name
                updated_fields.append("first_name")
            
            if user_data.last_name is not None:
                target_user.last_name = user_data.last_name
                updated_fields.append("last_name")
            
            if user_data.phone is not None:
                target_user.phone = user_data.phone
                updated_fields.append("phone")
            
            if user_data.email is not None and user_data.email != target_user.email:
                # Verificar que el nuevo email no exista
                existing_email_stmt = select(User).where(
                    and_(
                        func.lower(User.email) == user_data.email.lower(),
                        User.id != user_id,
                        User.deleted_at.is_(None)
                    )
                )
                existing_email_result = await session.execute(existing_email_stmt)
                existing_email = existing_email_result.scalar_one_or_none()
                
                if existing_email:
                    return ResponseManager.error(
                        message=f"Ya existe un usuario con el email: {user_data.email}",
                        status_code=HTTPStatus.BAD_REQUEST,
                        error_code=ErrorCode.RESOURCE_DUPLICATE,
                        error_type=ErrorType.RESOURCE_ERROR,
                        request=request
                    )
                
                target_user.email = user_data.email.lower()
                updated_fields.append("email")
            
            # Campos que solo admin/manager puede editar - CORREGIDO
            if is_admin or is_manager:
                if user_data.is_active is not None:
                    # Evitar auto-desactivación
                    if user['user_id'] == user_id and user_data.is_active == False:
                        return ResponseManager.error(
                            message="No puedes desactivar tu propio usuario",
                            status_code=HTTPStatus.BAD_REQUEST,
                            error_code=ErrorCode.BUSINESS_RULE_VIOLATION,
                            error_type=ErrorType.BUSINESS_ERROR,
                            request=request
                        )
                    
                    target_user.is_active = user_data.is_active
                    updated_fields.append("is_active")
                
                if user_data.petty_cash_limit is not None:
                    target_user.petty_cash_limit = user_data.petty_cash_limit
                    updated_fields.append("petty_cash_limit")
            else:
                # Usuario normal no puede editar campos administrativos
                if user_data.is_active is not None or user_data.petty_cash_limit is not None:
                    return ResponseManager.error(
                        message="No tienes permisos para editar campos administrativos",
                        status_code=HTTPStatus.FORBIDDEN,
                        error_code=ErrorCode.PERMISSION_DENIED,
                        error_type=ErrorType.PERMISSION_ERROR,
                        request=request
                    )
            
            # Actualizar timestamp (automático por BaseModel)
            # target_user.updated_at se actualiza automáticamente
            
            await session.commit()
            await session.refresh(target_user)
            
            # CORREGIDO: incluir is_admin en la validación para datos sensibles
            user_dict = user_to_dict(target_user, include_sensitive=(is_admin or is_manager))
            
            logger.info(f"Usuario {user['username']} actualizó usuario {target_user.username}: {', '.join(updated_fields)}")
            
            return ResponseManager.success(
                data=user_dict,
                message=f"Usuario '{target_user.username}' actualizado exitosamente",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al actualizar usuario {user_id}: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al actualizar usuario",
            details=str(e),
            request=request
        )

@router.delete("/{user_id}", response_class=JSONResponse)
async def delete_user(
    user_id: int = Path(..., description="ID del usuario"),
    request: Request = None,
    user: dict = Depends(require_manager_permission)
):
    """Eliminar un usuario (soft delete)"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Obtener usuario
            stmt = select(User).where(
                and_(
                    User.id == user_id,
                    User.deleted_at.is_(None)
                )
            )
            
            result = await session.execute(stmt)
            target_user = result.scalar_one_or_none()
            
            if not target_user:
                return ResponseManager.error(
                    message=f"Usuario no encontrado: {user_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Evitar auto-eliminación
            if user['user_id'] == user_id:
                return ResponseManager.error(
                    message="No puedes eliminar tu propio usuario",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.BUSINESS_RULE_VIOLATION,
                    error_type=ErrorType.BUSINESS_ERROR,
                    request=request
                )
            
            # Realizar soft delete
            target_user.deleted_at = datetime.now(timezone.utc)
            target_user.is_active = False
            
            await session.commit()
            
            user_dict = user_to_dict(target_user, include_sensitive=True)
            
            logger.info(f"Usuario {user['username']} eliminó usuario: {target_user.username}")
            
            return ResponseManager.success(
                data=user_dict,
                message=f"Usuario '{target_user.username}' eliminado exitosamente",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al eliminar usuario {user_id}: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al eliminar usuario",
            details=str(e),
            request=request
        )

# ==========================================
# ENDPOINTS DE ACTIVACIÓN/DESACTIVACIÓN
# ==========================================

@router.put("/{user_id}/toggle-activation", response_class=JSONResponse)
async def toggle_user_activation(
    activation_data: UserActivationToggle,
    user_id: int = Path(..., description="ID del usuario"),
    request: Request = None,
    user: dict = Depends(require_manager_permission)
):
    """Activar o desactivar usuario"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Obtener usuario
            stmt = select(User).where(
                and_(
                    User.id == user_id,
                    User.deleted_at.is_(None)
                )
            )
            
            result = await session.execute(stmt)
            target_user = result.scalar_one_or_none()
            
            if not target_user:
                return ResponseManager.error(
                    message=f"Usuario no encontrado: {user_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            # Evitar auto-desactivación
            if user['user_id'] == user_id and activation_data.is_active == False:
                return ResponseManager.error(
                    message="No puedes desactivar tu propio usuario",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.BUSINESS_RULE_VIOLATION,
                    error_type=ErrorType.BUSINESS_ERROR,
                    request=request
                )
            
            # Actualizar estado
            old_status = target_user.is_active
            target_user.is_active = activation_data.is_active
            
            await session.commit()
            await session.refresh(target_user)
            
            user_dict = user_to_dict(target_user, include_sensitive=True)
            
            action = "activó" if activation_data.is_active else "desactivó"
            logger.info(f"Usuario {user['username']} {action} usuario {target_user.username}. Razón: {activation_data.reason or 'No especificada'}")
            
            return ResponseManager.success(
                data=user_dict,
                message=f"Usuario '{target_user.username}' {action} exitosamente",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al cambiar estado usuario {user_id}: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al cambiar estado del usuario",
            details=str(e),
            request=request
        )

# ==========================================
# ENDPOINTS DE INFORMACIÓN ADICIONAL
# ==========================================

@router.get("/me/profile", response_class=JSONResponse)
async def get_my_profile(
    request: Request = None,
    user: dict = Depends(require_read_permission)
):
    """Obtener mi perfil completo - Siempre permitido para usuarios autenticados"""
    
    try:
        async with db_manager.get_async_session() as session:
            
            # Usar función unificada
            profile_data = await get_profile(
                session=session,
                user_id=user['user_id'],
                requesting_user_id=user['user_id'],
                is_own_profile=True
            )
            
            if not profile_data:
                return ResponseManager.error(
                    message="Tu perfil no fue encontrado",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            logger.info(f"Usuario {user['username']} consultó su propio perfil completo")
            
            return ResponseManager.success(
                data=profile_data,
                message="Perfil personal obtenido exitosamente",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al obtener mi perfil: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al obtener tu perfil",
            details=str(e),
            request=request
        )

@router.get("/{user_id}/profile", response_class=JSONResponse)
async def get_user_profile(
    user_id: int = Path(..., description="ID del usuario"),
    request: Request = None,
    user: dict = Depends(require_manager_permission)  # ✅ CAMBIO: Solo managers
):
    """Obtener perfil completo de cualquier usuario - Solo para managers"""
    
    try:
        async with db_manager.get_async_session() as session:
            
            # Usar función unificada
            profile_data = await get_profile(
                session=session,
                user_id=user_id,
                requesting_user_id=user['user_id'],
                is_own_profile=False
            )
            
            if not profile_data:
                return ResponseManager.error(
                    message=f"Usuario no encontrado o inactivo: {user_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )
            
            logger.info(f"Manager {user['username']} consultó perfil completo de usuario {user_id}")
            
            return ResponseManager.success(
                data=profile_data,
                message="Perfil de usuario obtenido exitosamente",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al obtener perfil de usuario {user_id}: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al obtener perfil de usuario",
            details=str(e),
            request=request
        )
    
# ==========================================
# ENDPOINT DE ESTADÍSTICAS
# ==========================================

@router.get("/stats/summary", response_class=JSONResponse)
async def get_users_stats(
    request: Request = None,
    user: dict = Depends(require_manager_permission)
):
    """Obtener estadísticas generales de usuarios (solo managers)"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Contar usuarios totales
            total_stmt = select(func.count(User.id)).where(User.deleted_at.is_(None))
            total_result = await session.execute(total_stmt)
            total_users = total_result.scalar()
            
            # Contar usuarios activos
            active_stmt = select(func.count(User.id)).where(
                and_(User.deleted_at.is_(None), User.is_active == True)
            )
            active_result = await session.execute(active_stmt)
            active_users = active_result.scalar()
            
            # Contar usuarios con login reciente
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            recent_login_stmt = select(func.count(User.id)).where(
                and_(
                    User.deleted_at.is_(None),
                    User.last_login_at >= thirty_days_ago
                )
            )
            recent_login_result = await session.execute(recent_login_stmt)
            recent_login_users = recent_login_result.scalar()
            
            # Contar usuarios con acceso a caja chica
            petty_cash_stmt = select(func.count(User.id)).where(
                and_(
                    User.deleted_at.is_(None),
                    User.petty_cash_limit.isnot(None),
                    User.petty_cash_limit > 0
                )
            )
            petty_cash_result = await session.execute(petty_cash_stmt)
            petty_cash_users = petty_cash_result.scalar()
            
            # Estadísticas de creación por período
            today = datetime.now(timezone.utc).date()
            week_ago = today - timedelta(days=7)
            month_ago = today - timedelta(days=30)
            
            # Usuarios creados esta semana
            week_stmt = select(func.count(User.id)).where(
                and_(
                    User.deleted_at.is_(None),
                    func.date(User.created_at) >= week_ago
                )
            )
            week_result = await session.execute(week_stmt)
            users_this_week = week_result.scalar()
            
            # Usuarios creados este mes
            month_stmt = select(func.count(User.id)).where(
                and_(
                    User.deleted_at.is_(None),
                    func.date(User.created_at) >= month_ago
                )
            )
            month_result = await session.execute(month_stmt)
            users_this_month = month_result.scalar()
            
            # Crear respuesta con estadísticas
            stats_data = {
                "general": {
                    "total_users": total_users,
                    "active_users": active_users,
                    "inactive_users": total_users - active_users,
                    "users_with_recent_login": recent_login_users,
                    "users_with_petty_cash": petty_cash_users
                },
                "activity": {
                    "recent_login_percentage": round((recent_login_users / total_users * 100) if total_users > 0 else 0, 2),
                    "active_percentage": round((active_users / total_users * 100) if total_users > 0 else 0, 2)
                },
                "growth": {
                    "users_created_this_week": users_this_week,
                    "users_created_this_month": users_this_month
                },
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Usuario {user['username']} consultó estadísticas de usuarios")
            
            return ResponseManager.success(
                data=stats_data,
                message="Estadísticas de usuarios obtenidas",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al obtener estadísticas de usuarios: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al obtener estadísticas",
            details=str(e),
            request=request
        )

# ==========================================
# ENDPOINT DE BÚSQUEDA AVANZADA
# ==========================================

@router.get("/search/advanced", response_class=JSONResponse)
async def advanced_user_search(
    request: Request = None,
    user: dict = Depends(require_read_permission),
    query: Optional[str] = Query(None, description="Término de búsqueda general"),
    username: Optional[str] = Query(None, description="Buscar por username específico"),
    email: Optional[str] = Query(None, description="Buscar por email específico"),
    first_name: Optional[str] = Query(None, description="Buscar por nombre"),
    last_name: Optional[str] = Query(None, description="Buscar por apellido"),
    is_active: Optional[bool] = Query(None, description="Filtrar por estado activo"),
    has_petty_cash: Optional[bool] = Query(None, description="Filtrar por acceso a caja chica"),
    created_after: Optional[str] = Query(None, description="Creados después de (YYYY-MM-DD)"),
    created_before: Optional[str] = Query(None, description="Creados antes de (YYYY-MM-DD)"),
    last_login_after: Optional[str] = Query(None, description="Último login después de (YYYY-MM-DD)"),
    skip: int = Query(0, ge=0, description="Elementos a saltar"),
    limit: int = Query(50, ge=1, le=500, description="Límite de elementos")
):
    """Búsqueda avanzada de usuarios con múltiples filtros"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Construir query base
            stmt = select(User).where(User.deleted_at.is_(None))
            
            # Aplicar filtros específicos
            if query:
                # Búsqueda general en múltiples campos
                search_term = f"%{query.lower()}%"
                stmt = stmt.where(
                    or_(
                        func.lower(User.username).like(search_term),
                        func.lower(User.first_name).like(search_term),
                        func.lower(User.last_name).like(search_term),
                        func.lower(User.email).like(search_term)
                    )
                )
            
            if username:
                stmt = stmt.where(func.lower(User.username).like(f"%{username.lower()}%"))
            
            if email:
                stmt = stmt.where(func.lower(User.email).like(f"%{email.lower()}%"))
            
            if first_name:
                stmt = stmt.where(func.lower(User.first_name).like(f"%{first_name.lower()}%"))
            
            if last_name:
                stmt = stmt.where(func.lower(User.last_name).like(f"%{last_name.lower()}%"))
            
            if is_active is not None:
                stmt = stmt.where(User.is_active == is_active)
            
            if has_petty_cash is not None:
                if has_petty_cash:
                    stmt = stmt.where(
                        and_(
                            User.petty_cash_limit.isnot(None),
                            User.petty_cash_limit > 0
                        )
                    )
                else:
                    stmt = stmt.where(
                        or_(
                            User.petty_cash_limit.is_(None),
                            User.petty_cash_limit == 0
                        )
                    )
            
            # Filtros de fecha
            if created_after:
                try:
                    date_after = datetime.strptime(created_after, "%Y-%m-%d").date()
                    stmt = stmt.where(func.date(User.created_at) >= date_after)
                except ValueError:
                    return ResponseManager.error(
                        message="Formato de fecha inválido para 'created_after'. Use YYYY-MM-DD",
                        status_code=HTTPStatus.BAD_REQUEST,
                        error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                        error_type=ErrorType.VALIDATION_ERROR,
                        request=request
                    )
            
            if created_before:
                try:
                    date_before = datetime.strptime(created_before, "%Y-%m-%d").date()
                    stmt = stmt.where(func.date(User.created_at) <= date_before)
                except ValueError:
                    return ResponseManager.error(
                        message="Formato de fecha inválido para 'created_before'. Use YYYY-MM-DD",
                        status_code=HTTPStatus.BAD_REQUEST,
                        error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                        error_type=ErrorType.VALIDATION_ERROR,
                        request=request
                    )
            
            if last_login_after:
                try:
                    login_after = datetime.strptime(last_login_after, "%Y-%m-%d")
                    stmt = stmt.where(User.last_login_at >= login_after)
                except ValueError:
                    return ResponseManager.error(
                        message="Formato de fecha inválido para 'last_login_after'. Use YYYY-MM-DD",
                        status_code=HTTPStatus.BAD_REQUEST,
                        error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                        error_type=ErrorType.VALIDATION_ERROR,
                        request=request
                    )
            
            # Aplicar paginación y ordenamiento
            stmt = stmt.order_by(User.username).offset(skip).limit(limit)
            
            result = await session.execute(stmt)
            users = result.scalars().all()
            
            # Convertir a diccionarios
            user_data = [user_to_dict(user_obj, include_sensitive=False) for user_obj in users]
            
            # Información de la búsqueda
            search_info = {
                "results_found": len(user_data),
                "filters_applied": {
                    "query": query,
                    "username": username,
                    "email": email,
                    "first_name": first_name,
                    "last_name": last_name,
                    "is_active": is_active,
                    "has_petty_cash": has_petty_cash,
                    "created_after": created_after,
                    "created_before": created_before,
                    "last_login_after": last_login_after
                },
                "pagination": {
                    "skip": skip,
                    "limit": limit
                }
            }
            
            response_data = {
                "users": user_data,
                "search_info": search_info
            }
            
            logger.info(f"Usuario {user['username']} realizó búsqueda avanzada. Resultados: {len(user_data)}")
            
            return ResponseManager.success(
                data=response_data,
                message=f"Búsqueda completada. {len(user_data)} usuarios encontrados",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error en búsqueda avanzada de usuarios: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error en búsqueda avanzada",
            details=str(e),
            request=request
        )

# ==========================================
# ENDPOINT DE VALIDACIÓN
# ==========================================

@router.post("/validate/username", response_class=JSONResponse)
async def validate_username_availability(
    request: Request,
    username: str = Query(..., description="Username a validar"),
    exclude_user_id: Optional[int] = Query(None, description="ID de usuario a excluir (para edición)"),
    user: dict = Depends(require_read_permission)
):
    """Validar disponibilidad de username"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Construir query de verificación
            stmt = select(User).where(
                and_(
                    func.lower(User.username) == username.lower(),
                    User.deleted_at.is_(None)
                )
            )
            
            # Excluir usuario específico si se proporciona (para edición)
            if exclude_user_id:
                stmt = stmt.where(User.id != exclude_user_id)
            
            result = await session.execute(stmt)
            existing_user = result.scalar_one_or_none()
            
            is_available = existing_user is None
            
            validation_data = {
                "username": username,
                "is_available": is_available,
                "message": "Username disponible" if is_available else "Username ya está en uso",
                "checked_at": datetime.now(timezone.utc).isoformat()
            }
            
            if not is_available and existing_user:
                validation_data["existing_user"] = {
                    "id": existing_user.id,
                    "full_name": existing_user.full_name,
                    "is_active": existing_user.is_active
                }
            
            return ResponseManager.success(
                data=validation_data,
                message="Validación de username completada",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al validar username: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al validar username",
            details=str(e),
            request=request
        )

@router.post("/validate/email", response_class=JSONResponse)
async def validate_email_availability(
    request: Request,
    email: str = Query(..., description="Email a validar"),
    exclude_user_id: Optional[int] = Query(None, description="ID de usuario a excluir (para edición)"),
    user: dict = Depends(require_read_permission)
):
    """Validar disponibilidad de email"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Construir query de verificación
            stmt = select(User).where(
                and_(
                    func.lower(User.email) == email.lower(),
                    User.deleted_at.is_(None)
                )
            )
            
            # Excluir usuario específico si se proporciona (para edición)
            if exclude_user_id:
                stmt = stmt.where(User.id != exclude_user_id)
            
            result = await session.execute(stmt)
            existing_user = result.scalar_one_or_none()
            
            is_available = existing_user is None
            
            validation_data = {
                "email": email,
                "is_available": is_available,
                "message": "Email disponible" if is_available else "Email ya está en uso",
                "checked_at": datetime.now(timezone.utc).isoformat()
            }
            
            if not is_available and existing_user:
                validation_data["existing_user"] = {
                    "id": existing_user.id,
                    "username": existing_user.username,
                    "full_name": existing_user.full_name,
                    "is_active": existing_user.is_active
                }
            
            return ResponseManager.success(
                data=validation_data,
                message="Validación de email completada",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error al validar email: {e}")
        import traceback
        traceback.print_exc()
        return ResponseManager.internal_server_error(
            message="Error al validar email",
            details=str(e),
            request=request
        )