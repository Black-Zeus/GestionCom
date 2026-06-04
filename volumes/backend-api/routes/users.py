"""
volumes/backend-api/routes/users.py
Router de Users - CRUD básico para gestión de usuarios
Incluye autenticación JWT y control de permisos
Responsabilidad única: gestión de datos de usuario (sin roles/permisos/contraseñas)
"""
from utils.log_helper import setup_logger
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Body, Request, Depends, Query, Path
from fastapi.responses import JSONResponse
from sqlalchemy import delete, select, and_, func, or_

# Database imports
from database.database import db_manager
from database.models.roles import Role
from database.models.permissions import Permission
from database.models.role_permissions import RolePermission
from database.models.user_roles import UserRole
from database.models.user_permissions import PermissionType, UserPermission
from database.models.users import User

# Schema imports
from database.schemas.user import (
    UserCreate,
    UserUpdate,
    UserActivationToggle,
    UserRolesUpdate
)

# Core imports
from core.response import ResponseManager
from core.constants import ErrorCode, ErrorType, HTTPStatus

# Utils imports
from utils.permissions_utils import get_current_user, require_permission
from utils.profile_helpers import ProfileHelper 
from utils.audit_utils import record_audit_log
from core.password_manager import PasswordManager

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
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
        # Arrays vacíos preparados para futuro módulo de permisos
        "roles": [],
        "permissions": [],
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None
    }
    
    if include_sensitive:
        base_dict.update({
            "last_login_ip": user.last_login_ip,
            "password_changed_at": user.password_changed_at.isoformat() if user.password_changed_at else None,
            "password_age_days": user.password_age_days,
            "needs_password_change": user.needs_password_change
        })
    
    return base_dict


def permission_to_dict(permission: Permission, assigned: bool = False) -> dict:
    return {
        "id": permission.id,
        "permission_code": permission.permission_code,
        "permission_name": permission.permission_name,
        "permission_group": permission.permission_group,
        "permission_description": permission.permission_description,
        "is_active": permission.is_active,
        "assigned": assigned,
    }

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
    status: Optional[str] = Query(None, description="Estado: all, active o inactive"),
    role_code: Optional[str] = Query(None, description="Filtrar por codigo de rol"),
    search: Optional[str] = Query(None, description="Buscar por username, nombre o email"),
    has_recent_login: Optional[bool] = Query(None, description="Filtrar por login reciente")
):
    """Listar todos los usuarios"""
    
    try:
        async with db_manager.get_async_session() as session:
            # Construir query base
            stmt = select(User).where(User.deleted_at.is_(None))
            
            normalized_status = status.lower() if status else None
            if normalized_status == "active":
                stmt = stmt.where(User.is_active == True)
            elif normalized_status == "inactive":
                stmt = stmt.where(User.is_active == False)
            elif not normalized_status and active_only:
                stmt = stmt.where(User.is_active == True)

            if role_code:
                normalized_role_code = role_code.strip().upper()
                stmt = stmt.join(UserRole, UserRole.user_id == User.id).join(Role, Role.id == UserRole.role_id).where(
                    and_(
                        Role.role_code == normalized_role_code,
                        Role.is_active == True,
                        Role.deleted_at.is_(None)
                    )
                )
            
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
            total_stmt = select(func.count()).select_from(stmt.subquery())
            total_found = (await session.execute(total_stmt)).scalar() or 0

            stmt = stmt.order_by(User.username).offset(skip).limit(limit)
            
            result = await session.execute(stmt)
            users = result.scalars().all()
            
            # Convertir a diccionarios (sin información sensible para listado)
            user_data = []
            for listed_user in users:
                listed_user_data = user_to_dict(listed_user, include_sensitive=False)
                roles_and_permissions = await ProfileHelper.get_user_roles_and_permissions(session, listed_user.id)
                listed_user_data.update({
                    "roles": roles_and_permissions.get("role_codes", []),
                    "role_names": roles_and_permissions.get("role_names", []),
                    "role_details": roles_and_permissions.get("role_details", []),
                    "role_count": roles_and_permissions.get("role_count", 0),
                    "permission_count": roles_and_permissions.get("permission_count", 0),
                })
                user_data.append(listed_user_data)
            
            # Estadísticas básicas
            active_count = sum(1 for u in user_data if u["is_active"])
            recent_login_count = sum(1 for u in user_data if u["is_recently_active"])
            
            response_data = {
                "users": user_data,
                "total_found": total_found,
                "active_count": active_count,
                "recent_login_count": recent_login_count,
                "filters_applied": {
                    "active_only": active_only,
                    "status": normalized_status,
                    "role_code": role_code,
                    "search": search,
                    "has_recent_login": has_recent_login
                },
                "pagination": {
                    "skip": skip,
                    "limit": limit,
                    "has_more": (skip + limit) < total_found
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
            password_hash = PasswordManager.hash_password(user_data.password)

            new_user = User(
                username=user_data.username.lower(),
                email=user_data.email.lower(),
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                phone=user_data.phone,
                is_active=True,  # Por defecto activo
                petty_cash_limit=user_data.petty_cash_limit,
                # Campos requeridos temporales (se actualizarán en auth)
                password_hash=password_hash,
                password_changed_at=datetime.now(timezone.utc)
            )
            
            # Generar secret para JWT
            new_user.generate_secret()
            
            session.add(new_user)
            await session.flush()
            await record_audit_log(
                session,
                table_name="users",
                record_id=new_user.id,
                action_type="INSERT",
                user_id=user.get("user_id"),
                changed_fields=[
                    "username",
                    "email",
                    "first_name",
                    "last_name",
                    "phone",
                    "is_active",
                    "petty_cash_limit",
                    "password_hash",
                ],
                old_values=None,
                new_values={
                    "username": new_user.username,
                    "email": new_user.email,
                    "first_name": new_user.first_name,
                    "last_name": new_user.last_name,
                    "phone": new_user.phone,
                    "is_active": new_user.is_active,
                    "petty_cash_limit": str(new_user.petty_cash_limit) if new_user.petty_cash_limit is not None else None,
                    "password_set": True,
                },
                request=request,
            )
            await session.commit()
            await session.refresh(new_user)
            
            user_dict = user_to_dict(new_user, include_sensitive=True)
            
            logger.info(f"Usuario {user['username']} creó usuario: {new_user.username}")
            
            return ResponseManager.success(
                data=user_dict,
                message=f"Usuario '{new_user.username}' creado exitosamente.",
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
            
            old_values = {
                "first_name": target_user.first_name,
                "last_name": target_user.last_name,
                "phone": target_user.phone,
                "email": target_user.email,
                "is_active": target_user.is_active,
                "petty_cash_limit": str(target_user.petty_cash_limit) if target_user.petty_cash_limit is not None else None,
            }

            # Aplicar actualizaciones según permisos
            updated_fields = []
            
            # Campos que el usuario puede editar de sí mismo
            if user_data.first_name is not None and user_data.first_name != target_user.first_name:
                target_user.first_name = user_data.first_name
                updated_fields.append("first_name")
            
            if user_data.last_name is not None and user_data.last_name != target_user.last_name:
                target_user.last_name = user_data.last_name
                updated_fields.append("last_name")
            
            if user_data.phone is not None and user_data.phone != target_user.phone:
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
                if user_data.is_active is not None and user_data.is_active != target_user.is_active:
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
                
                if user_data.petty_cash_limit is not None and user_data.petty_cash_limit != target_user.petty_cash_limit:
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
            if updated_fields:
                new_values = {
                    "first_name": target_user.first_name,
                    "last_name": target_user.last_name,
                    "phone": target_user.phone,
                    "email": target_user.email,
                    "is_active": target_user.is_active,
                    "petty_cash_limit": str(target_user.petty_cash_limit) if target_user.petty_cash_limit is not None else None,
                }
                await record_audit_log(
                    session,
                    table_name="users",
                    record_id=target_user.id,
                    action_type="UPDATE",
                    user_id=user.get("user_id"),
                    changed_fields=updated_fields,
                    old_values={field: old_values.get(field) for field in updated_fields},
                    new_values={field: new_values.get(field) for field in updated_fields},
                    request=request,
                )
            
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

def role_assignment_to_dict(role: Role, assigned_at=None, assigned_by_user_id=None) -> dict:
    return {
        "id": role.id,
        "role_code": role.role_code,
        "role_name": role.role_name,
        "role_description": role.role_description,
        "is_system_role": role.is_system_role,
        "is_active": role.is_active,
        "assigned_at": assigned_at.isoformat() if assigned_at else None,
        "assigned_by_user_id": assigned_by_user_id,
    }


@router.get("/{user_id}/roles", response_class=JSONResponse)
async def get_user_roles(
    user_id: int = Path(..., description="ID del usuario"),
    request: Request = None,
    user: dict = Depends(require_manager_permission)
):
    """Obtener roles asignados a un usuario."""
    try:
        async with db_manager.get_async_session() as session:
            target_result = await session.execute(
                select(User).where(
                    and_(
                        User.id == user_id,
                        User.deleted_at.is_(None)
                    )
                )
            )
            target_user = target_result.scalar_one_or_none()

            if not target_user:
                return ResponseManager.error(
                    message=f"Usuario no encontrado: {user_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )

            assigned_result = await session.execute(
                select(Role, UserRole.assigned_at, UserRole.assigned_by_user_id)
                .join(UserRole, UserRole.role_id == Role.id)
                .where(
                    and_(
                        UserRole.user_id == user_id,
                        Role.deleted_at.is_(None)
                    )
                )
                .order_by(Role.role_name)
            )
            assigned_roles = [
                role_assignment_to_dict(role, assigned_at, assigned_by_user_id)
                for role, assigned_at, assigned_by_user_id in assigned_result.all()
            ]

            available_result = await session.execute(
                select(Role)
                .where(
                    and_(
                        Role.is_active == True,
                        Role.deleted_at.is_(None)
                    )
                )
                .order_by(Role.role_name)
            )
            available_roles = [
                role_assignment_to_dict(role)
                for role in available_result.scalars().all()
            ]

            return ResponseManager.success(
                data={
                    "user": user_to_dict(target_user, include_sensitive=False),
                    "assigned_roles": assigned_roles,
                    "available_roles": available_roles,
                },
                message="Roles de usuario obtenidos",
                request=request
            )

    except Exception as e:
        logger.error(f"Error al obtener roles usuario {user_id}: {e}")
        return ResponseManager.internal_server_error(
            message="Error al obtener roles del usuario",
            details=str(e),
            request=request
        )


@router.put("/{user_id}/roles", response_class=JSONResponse)
async def update_user_roles(
    roles_data: UserRolesUpdate,
    user_id: int = Path(..., description="ID del usuario"),
    request: Request = None,
    user: dict = Depends(require_manager_permission)
):
    """Reemplazar roles asignados a un usuario."""
    try:
        async with db_manager.get_async_session() as session:
            target_result = await session.execute(
                select(User).where(
                    and_(
                        User.id == user_id,
                        User.deleted_at.is_(None)
                    )
                )
            )
            target_user = target_result.scalar_one_or_none()

            if not target_user:
                return ResponseManager.error(
                    message=f"Usuario no encontrado: {user_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )

            if user.get("user_id") == user_id:
                return ResponseManager.error(
                    message="No puedes modificar tus propios roles",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.BUSINESS_RULE_VIOLATION,
                    error_type=ErrorType.BUSINESS_ERROR,
                    request=request
                )

            requested_role_ids = list(dict.fromkeys(roles_data.role_ids or []))
            if requested_role_ids:
                roles_result = await session.execute(
                    select(Role).where(
                        and_(
                            Role.id.in_(requested_role_ids),
                            Role.is_active == True,
                            Role.deleted_at.is_(None)
                        )
                    )
                )
                requested_roles = roles_result.scalars().all()
            else:
                requested_roles = []

            if len(requested_roles) != len(requested_role_ids):
                found_ids = {role.id for role in requested_roles}
                missing_ids = [role_id for role_id in requested_role_ids if role_id not in found_ids]
                return ResponseManager.error(
                    message="Uno o mas roles no existen o estan inactivos",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                    error_type=ErrorType.VALIDATION_ERROR,
                    details={"missing_role_ids": missing_ids},
                    request=request
                )

            requested_role_codes = {role.role_code for role in requested_roles}
            if "SUPER_ADMIN" in requested_role_codes and target_user.username != "root":
                return ResponseManager.error(
                    message="El perfil Super Admin esta reservado para el usuario root",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.BUSINESS_RULE_VIOLATION,
                    error_type=ErrorType.BUSINESS_ERROR,
                    request=request
                )

            current_result = await session.execute(
                select(Role)
                .join(UserRole, UserRole.role_id == Role.id)
                .where(
                    and_(
                        UserRole.user_id == user_id,
                        Role.deleted_at.is_(None)
                    )
                )
            )
            current_roles = current_result.scalars().all()
            current_role_ids = {role.id for role in current_roles}
            requested_role_ids_set = set(requested_role_ids)

            if current_role_ids == requested_role_ids_set:
                return ResponseManager.success(
                    data={
                        "user_id": user_id,
                        "roles_changed": False,
                        "assigned_roles": [
                            role_assignment_to_dict(role)
                            for role in sorted(current_roles, key=lambda item: item.role_name)
                        ],
                    },
                    message="Roles sin cambios",
                    request=request
                )

            old_role_codes = sorted(role.role_code for role in current_roles)
            new_role_codes = sorted(role.role_code for role in requested_roles)

            if target_user.username == "root" and "SUPER_ADMIN" in old_role_codes and "SUPER_ADMIN" not in new_role_codes:
                return ResponseManager.error(
                    message="No es posible remover el perfil Super Admin del usuario root",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.BUSINESS_RULE_VIOLATION,
                    error_type=ErrorType.BUSINESS_ERROR,
                    request=request
                )

            await session.execute(delete(UserRole).where(UserRole.user_id == user_id))
            assigned_at = datetime.now(timezone.utc)
            for role in requested_roles:
                session.add(UserRole(
                    user_id=user_id,
                    role_id=role.id,
                    assigned_by_user_id=user.get("user_id"),
                    assigned_at=assigned_at
                ))

            await record_audit_log(
                session,
                table_name="user_roles",
                record_id=user_id,
                action_type="UPDATE",
                user_id=user.get("user_id"),
                changed_fields=["roles"],
                old_values={
                    "role_codes": old_role_codes,
                },
                new_values={
                    "role_codes": new_role_codes,
                    "reason": roles_data.reason,
                },
                request=request,
            )
            await session.commit()

            try:
                from cache.services.user_cache import invalidate_user_permissions
                await invalidate_user_permissions(user_id)
            except Exception as cache_error:
                logger.warning(f"No fue posible invalidar cache de permisos para usuario {user_id}: {cache_error}")

            return ResponseManager.success(
                data={
                    "user_id": user_id,
                    "roles_changed": True,
                    "old_roles": old_role_codes,
                    "new_roles": new_role_codes,
                    "assigned_roles": [
                        role_assignment_to_dict(role)
                        for role in sorted(requested_roles, key=lambda item: item.role_name)
                    ],
                    "session_sync_required": True,
                },
                message="Roles de usuario actualizados",
                request=request
            )

    except Exception as e:
        logger.error(f"Error al actualizar roles usuario {user_id}: {e}")
        return ResponseManager.internal_server_error(
            message="Error al actualizar roles del usuario",
            details=str(e),
            request=request
        )


@router.get("/{user_id}/permissions", response_class=JSONResponse)
async def get_user_permissions_matrix(
    request: Request,
    user_id: int = Path(..., description="ID del usuario"),
    user: dict = Depends(require_manager_permission)
):
    """Obtener matriz de permisos disponibles, heredados por roles y especiales del usuario."""
    try:
        async with db_manager.get_async_session() as session:
            target_result = await session.execute(
                select(User).where(
                    and_(
                        User.id == user_id,
                        User.deleted_at.is_(None)
                    )
                )
            )
            target_user = target_result.scalar_one_or_none()

            if not target_user:
                return ResponseManager.error(
                    message=f"Usuario no encontrado: {user_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )

            now_utc = datetime.now(timezone.utc)

            inherited_result = await session.execute(
                select(Permission)
                .select_from(UserRole)
                .join(Role, UserRole.role_id == Role.id)
                .join(RolePermission, Role.id == RolePermission.role_id)
                .join(Permission, RolePermission.permission_id == Permission.id)
                .where(
                    and_(
                        UserRole.user_id == user_id,
                        UserRole.deleted_at.is_(None),
                        Role.is_active == True,
                        Role.deleted_at.is_(None),
                        RolePermission.deleted_at.is_(None),
                        Permission.is_active == True,
                        Permission.deleted_at.is_(None)
                    )
                )
                .distinct()
            )
            inherited_permissions = inherited_result.scalars().all()
            inherited_ids = {permission.id for permission in inherited_permissions}

            direct_result = await session.execute(
                select(Permission)
                .select_from(UserPermission)
                .join(Permission, UserPermission.permission_id == Permission.id)
                .where(
                    and_(
                        UserPermission.user_id == user_id,
                        UserPermission.deleted_at.is_(None),
                        UserPermission.permission_type == PermissionType.GRANT,
                        or_(UserPermission.expires_at.is_(None), UserPermission.expires_at > now_utc),
                        Permission.is_active == True,
                        Permission.deleted_at.is_(None)
                    )
                )
            )
            direct_permissions = direct_result.scalars().all()
            direct_ids = {permission.id for permission in direct_permissions}
            special_direct_ids = direct_ids - inherited_ids
            effective_ids = inherited_ids | direct_ids

            permissions_result = await session.execute(
                select(Permission)
                .where(
                    and_(
                        Permission.is_active == True,
                        Permission.deleted_at.is_(None)
                    )
                )
                .order_by(Permission.permission_group, Permission.permission_code)
            )
            permissions = [
                {
                    **permission_to_dict(permission, assigned=permission.id in effective_ids),
                    "inherited": permission.id in inherited_ids,
                    "direct": permission.id in special_direct_ids,
                    "editable": permission.id not in inherited_ids,
                }
                for permission in permissions_result.scalars().all()
            ]

            return ResponseManager.success(
                data={
                    "user": user_to_dict(target_user, include_sensitive=False),
                    "permissions": permissions,
                    "inherited_permission_ids": sorted(inherited_ids),
                    "direct_permission_ids": sorted(special_direct_ids),
                    "effective_permission_ids": sorted(effective_ids),
                    "mode": "grant_only",
                },
                message="Permisos especiales de usuario obtenidos",
                request=request
            )

    except Exception as e:
        logger.error(f"Error al obtener permisos usuario {user_id}: {e}")
        return ResponseManager.internal_server_error(
            message="Error al obtener permisos del usuario",
            details=str(e),
            request=request
        )


@router.put("/{user_id}/permissions", response_class=JSONResponse)
async def update_user_permissions_matrix(
    request: Request,
    user_id: int = Path(..., description="ID del usuario"),
    payload: dict = Body(...),
    user: dict = Depends(require_manager_permission)
):
    """Reemplazar permisos especiales directos del usuario. Solo soporta GRANT para evitar choques de precedencia."""
    try:
        permission_ids = list(dict.fromkeys(payload.get("permission_ids") or []))
        reason = (payload.get("reason") or "").strip()

        if len(reason) < 3:
            return ResponseManager.error(
                message="Debes indicar un motivo del cambio",
                status_code=HTTPStatus.BAD_REQUEST,
                error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                error_type=ErrorType.VALIDATION_ERROR,
                request=request
            )

        if any(not isinstance(permission_id, int) or permission_id <= 0 for permission_id in permission_ids):
            return ResponseManager.error(
                message="Todos los permisos deben tener ID positivo",
                status_code=HTTPStatus.BAD_REQUEST,
                error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                error_type=ErrorType.VALIDATION_ERROR,
                request=request
            )

        async with db_manager.get_async_session() as session:
            target_result = await session.execute(
                select(User).where(
                    and_(
                        User.id == user_id,
                        User.deleted_at.is_(None)
                    )
                )
            )
            target_user = target_result.scalar_one_or_none()

            if not target_user:
                return ResponseManager.error(
                    message=f"Usuario no encontrado: {user_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request
                )

            inherited_result = await session.execute(
                select(Permission.id)
                .select_from(UserRole)
                .join(Role, UserRole.role_id == Role.id)
                .join(RolePermission, Role.id == RolePermission.role_id)
                .join(Permission, RolePermission.permission_id == Permission.id)
                .where(
                    and_(
                        UserRole.user_id == user_id,
                        UserRole.deleted_at.is_(None),
                        Role.is_active == True,
                        Role.deleted_at.is_(None),
                        RolePermission.deleted_at.is_(None),
                        Permission.is_active == True,
                        Permission.deleted_at.is_(None)
                    )
                )
                .distinct()
            )
            inherited_ids = {row[0] for row in inherited_result.all()}
            redundant_ids = sorted(set(permission_ids) & inherited_ids)

            if redundant_ids:
                return ResponseManager.error(
                    message="No es necesario asignar como especial un permiso ya heredado por roles",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.BUSINESS_RULE_VIOLATION,
                    error_type=ErrorType.BUSINESS_ERROR,
                    details={"inherited_permission_ids": redundant_ids},
                    request=request
                )

            if permission_ids:
                permissions_result = await session.execute(
                    select(Permission).where(
                        and_(
                            Permission.id.in_(permission_ids),
                            Permission.is_active == True,
                            Permission.deleted_at.is_(None)
                        )
                    )
                )
                requested_permissions = permissions_result.scalars().all()
            else:
                requested_permissions = []

            if len(requested_permissions) != len(permission_ids):
                found_ids = {permission.id for permission in requested_permissions}
                missing_ids = [permission_id for permission_id in permission_ids if permission_id not in found_ids]
                return ResponseManager.error(
                    message="Uno o mas permisos no existen o estan inactivos",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                    error_type=ErrorType.VALIDATION_ERROR,
                    details={"missing_permission_ids": missing_ids},
                    request=request
                )

            current_result = await session.execute(
                select(Permission)
                .join(UserPermission, UserPermission.permission_id == Permission.id)
                .where(
                    and_(
                        UserPermission.user_id == user_id,
                        UserPermission.deleted_at.is_(None),
                        UserPermission.permission_type == PermissionType.GRANT
                    )
                )
            )
            current_permissions = current_result.scalars().all()
            current_ids = {permission.id for permission in current_permissions}
            current_special_ids = current_ids - inherited_ids
            requested_ids = set(permission_ids)

            if current_special_ids == requested_ids:
                return ResponseManager.success(
                    data={
                        "user_id": user_id,
                        "permissions_changed": False,
                        "direct_permission_ids": sorted(current_special_ids),
                    },
                    message="Permisos especiales sin cambios",
                    request=request
                )

            old_permission_codes = sorted(permission.permission_code for permission in current_permissions)
            new_permission_codes = sorted(permission.permission_code for permission in requested_permissions)

            await session.execute(delete(UserPermission).where(UserPermission.user_id == user_id))
            granted_at = datetime.now(timezone.utc)
            for permission in requested_permissions:
                session.add(UserPermission(
                    user_id=user_id,
                    permission_id=permission.id,
                    permission_type=PermissionType.GRANT,
                    granted_by_user_id=user.get("user_id"),
                    granted_at=granted_at
                ))

            await record_audit_log(
                session,
                table_name="user_permissions",
                record_id=user_id,
                action_type="UPDATE",
                user_id=user.get("user_id"),
                changed_fields=["direct_permissions"],
                old_values={
                    "permission_codes": old_permission_codes,
                },
                new_values={
                    "permission_codes": new_permission_codes,
                    "mode": "grant_only",
                    "reason": reason,
                },
                request=request,
            )
            await session.commit()

            try:
                from cache.services.user_cache import invalidate_user_permissions
                await invalidate_user_permissions(user_id)
            except Exception as cache_error:
                logger.warning(f"No fue posible invalidar cache de permisos para usuario {user_id}: {cache_error}")

            return ResponseManager.success(
                data={
                    "user_id": user_id,
                    "permissions_changed": True,
                    "old_permissions": old_permission_codes,
                    "new_permissions": new_permission_codes,
                    "direct_permission_ids": sorted(requested_ids),
                    "session_sync_required": True,
                },
                message="Permisos especiales de usuario actualizados",
                request=request
            )

    except Exception as e:
        logger.error(f"Error al actualizar permisos usuario {user_id}: {e}")
        return ResponseManager.internal_server_error(
            message="Error al actualizar permisos del usuario",
            details=str(e),
            request=request
        )


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
            await record_audit_log(
                session,
                table_name="users",
                record_id=target_user.id,
                action_type="UPDATE",
                user_id=user.get("user_id"),
                changed_fields=["is_active"],
                old_values={
                    "is_active": old_status,
                },
                new_values={
                    "is_active": activation_data.is_active,
                    "reason": activation_data.reason or None,
                },
                request=request,
            )
            
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
    user: dict = Depends(get_current_user)
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
