"""
volumes/backend-api/routes/roles.py
Router de roles - consulta operativa de roles y permisos.
"""
from typing import Optional

from fastapi import APIRouter, Body, Depends, Path, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.exc import IntegrityError

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from database.models.permissions import Permission
from database.models.role_permissions import RolePermission
from database.models.roles import Role
from database.models.user_roles import UserRole
from database.models.users import User
from utils.audit_utils import record_audit_log
from utils.log_helper import setup_logger
from utils.permissions_utils import require_permission


logger = setup_logger(__name__)

router = APIRouter(
    tags=["Roles"],
    responses={
        401: {"description": "Token invalido o expirado"},
        403: {"description": "Acceso denegado - Permisos insuficientes"},
        404: {"description": "Recurso no encontrado"},
        500: {"description": "Error interno del servidor"},
    },
)


async def require_roles_permission(request: Request) -> dict:
    return await require_permission("USER", ["MANAGER"], request)


def _iso(value):
    return value.isoformat() if value else None


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


def role_to_dict(
    role: Role,
    users_count: int = 0,
    permissions_count: int = 0,
    permissions: Optional[list[dict]] = None,
) -> dict:
    return {
        "id": role.id,
        "role_code": role.role_code,
        "role_name": role.role_name,
        "role_description": role.role_description,
        "is_system_role": role.is_system_role,
        "is_active": role.is_active,
        "display_name": role.display_name,
        "can_edit": role.can_edit,
        "status_label": role.status_label,
        "users_count": users_count,
        "permissions_count": permissions_count,
        "permissions": permissions or [],
        "created_at": _iso(role.created_at),
        "updated_at": _iso(role.updated_at),
    }


@router.get("/", response_class=JSONResponse)
async def list_roles(
    request: Request,
    user: dict = Depends(require_roles_permission),
    skip: int = Query(0, ge=0, description="Elementos a saltar"),
    limit: int = Query(100, ge=1, le=1000, description="Limite de elementos"),
    active_only: bool = Query(True, description="Solo roles activos"),
    include_system: bool = Query(True, description="Incluir roles de sistema"),
    search: Optional[str] = Query(None, description="Buscar por codigo, nombre o descripcion"),
):
    """Listar roles disponibles para administracion."""
    try:
        async with db_manager.get_async_session() as session:
            stmt = select(Role).where(Role.deleted_at.is_(None))

            if active_only:
                stmt = stmt.where(Role.is_active == True)

            if not include_system:
                stmt = stmt.where(Role.is_system_role == False)

            if search:
                search_term = f"%{search.lower()}%"
                stmt = stmt.where(
                    or_(
                        func.lower(Role.role_code).like(search_term),
                        func.lower(Role.role_name).like(search_term),
                        func.lower(Role.role_description).like(search_term),
                    )
                )

            total_stmt = select(func.count()).select_from(stmt.subquery())
            total_found = (await session.execute(total_stmt)).scalar() or 0

            result = await session.execute(
                stmt.order_by(Role.role_code).offset(skip).limit(limit)
            )
            roles = result.scalars().all()
            role_ids = [role.id for role in roles]

            users_counts = {}
            permissions_counts = {}

            if role_ids:
                users_count_result = await session.execute(
                    select(UserRole.role_id, func.count(UserRole.user_id))
                    .where(UserRole.role_id.in_(role_ids))
                    .group_by(UserRole.role_id)
                )
                users_counts = dict(users_count_result.all())

                permissions_count_result = await session.execute(
                    select(RolePermission.role_id, func.count(RolePermission.permission_id))
                    .where(RolePermission.role_id.in_(role_ids))
                    .group_by(RolePermission.role_id)
                )
                permissions_counts = dict(permissions_count_result.all())

            data = {
                "roles": [
                    role_to_dict(
                        role,
                        users_count=users_counts.get(role.id, 0),
                        permissions_count=permissions_counts.get(role.id, 0),
                    )
                    for role in roles
                ],
                "total_found": total_found,
                "filters_applied": {
                    "active_only": active_only,
                    "include_system": include_system,
                    "search": search,
                },
                "pagination": {
                    "skip": skip,
                    "limit": limit,
                    "has_more": (skip + limit) < total_found,
                },
            }

            logger.info(f"Usuario {user['username']} listo {len(roles)} roles")

            return ResponseManager.success(
                data=data,
                message=f"Se encontraron {total_found} roles",
                request=request,
            )
    except Exception as e:
        logger.error(f"Error al listar roles: {e}")
        return ResponseManager.internal_server_error(
            message="Error al obtener lista de roles",
            details=str(e),
            request=request,
        )


@router.post("/", response_class=JSONResponse)
async def create_role(
    request: Request,
    payload: dict = Body(...),
    user: dict = Depends(require_roles_permission),
):
    """Crear perfil operativo custom."""
    try:
        role_code = (payload.get("role_code") or "").strip().upper()
        role_name = (payload.get("role_name") or "").strip()
        role_description = (payload.get("role_description") or "").strip() or None

        if len(role_code) < 2 or len(role_name) < 2:
            return ResponseManager.error(
                message="Codigo y nombre del perfil son obligatorios",
                status_code=HTTPStatus.BAD_REQUEST,
                error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                error_type=ErrorType.VALIDATION_ERROR,
                request=request,
            )

        async with db_manager.get_async_session() as session:
            role = Role(
                role_code=role_code,
                role_name=role_name,
                role_description=role_description,
                is_system_role=False,
                is_active=True,
            )
            session.add(role)
            await session.flush()

            await record_audit_log(
                session,
                table_name="roles",
                record_id=role.id,
                action_type="CREATE",
                user_id=user.get("user_id"),
                changed_fields=["role_code", "role_name", "role_description", "is_system_role", "is_active"],
                old_values=None,
                new_values=role_to_dict(role),
                request=request,
            )
            await session.commit()

            return ResponseManager.success(
                data=role_to_dict(role),
                message="Perfil creado",
                request=request,
            )
    except IntegrityError:
        return ResponseManager.error(
            message="Ya existe un perfil con ese codigo",
            status_code=HTTPStatus.BAD_REQUEST,
            error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
            error_type=ErrorType.VALIDATION_ERROR,
            request=request,
        )
    except Exception as e:
        logger.error(f"Error al crear rol: {e}")
        return ResponseManager.internal_server_error(
            message="Error al crear perfil",
            details=str(e),
            request=request,
        )


@router.patch("/{role_id}/activation", response_class=JSONResponse)
async def change_role_activation(
    request: Request,
    role_id: int = Path(..., description="ID del rol"),
    payload: dict = Body(...),
    user: dict = Depends(require_roles_permission),
):
    """Activar/desactivar perfil custom."""
    try:
        is_active = payload.get("is_active")
        reason = (payload.get("reason") or "").strip()

        if not isinstance(is_active, bool):
            return ResponseManager.error(
                message="Estado de perfil invalido",
                status_code=HTTPStatus.BAD_REQUEST,
                error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                error_type=ErrorType.VALIDATION_ERROR,
                request=request,
            )

        if len(reason) < 3:
            return ResponseManager.error(
                message="Debes indicar un motivo del cambio",
                status_code=HTTPStatus.BAD_REQUEST,
                error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                error_type=ErrorType.VALIDATION_ERROR,
                request=request,
            )

        async with db_manager.get_async_session() as session:
            role_result = await session.execute(
                select(Role).where(
                    and_(
                        Role.id == role_id,
                        Role.deleted_at.is_(None),
                    )
                )
            )
            role = role_result.scalar_one_or_none()

            if not role:
                return ResponseManager.error(
                    message=f"Rol no encontrado: {role_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request,
                )

            if role.is_system_role:
                return ResponseManager.error(
                    message="Solo se pueden cambiar perfiles custom",
                    status_code=HTTPStatus.FORBIDDEN,
                    error_code=ErrorCode.RESOURCE_FORBIDDEN,
                    error_type=ErrorType.PERMISSION_ERROR,
                    request=request,
                )

            if role.is_active == is_active:
                return ResponseManager.success(
                    data=role_to_dict(role),
                    message="Perfil sin cambios",
                    request=request,
                )

            old_values = {"is_active": role.is_active, "status_label": role.status_label}
            role.is_active = is_active

            affected_users_result = await session.execute(
                select(User)
                .join(UserRole, UserRole.user_id == User.id)
                .where(
                    and_(
                        UserRole.role_id == role_id,
                        User.deleted_at.is_(None),
                    )
                )
            )
            affected_users = affected_users_result.scalars().all()

            await record_audit_log(
                session,
                table_name="roles",
                record_id=role.id,
                action_type="UPDATE",
                user_id=user.get("user_id"),
                changed_fields=["is_active"],
                old_values=old_values,
                new_values={
                    "is_active": role.is_active,
                    "status_label": role.status_label,
                    "reason": reason,
                },
                request=request,
            )
            await session.commit()

            try:
                from cache.services.user_cache import invalidate_user_permissions
                for affected_user in affected_users:
                    await invalidate_user_permissions(affected_user.id)
            except Exception as cache_error:
                logger.warning(f"No fue posible invalidar cache por cambio de estado del rol {role_id}: {cache_error}")

            return ResponseManager.success(
                data={
                    **role_to_dict(role),
                    "affected_user_ids": [affected_user.id for affected_user in affected_users],
                    "session_sync_required": True,
                },
                message="Perfil actualizado",
                request=request,
            )
    except Exception as e:
        logger.error(f"Error al cambiar estado del rol {role_id}: {e}")
        return ResponseManager.internal_server_error(
            message="Error al cambiar estado del perfil",
            details=str(e),
            request=request,
        )


@router.get("/{role_id}/permissions", response_class=JSONResponse)
async def get_role_permissions_matrix(
    request: Request,
    role_id: int = Path(..., description="ID del rol"),
    user: dict = Depends(require_roles_permission),
):
    """Obtener matriz de permisos disponibles y asignados a un rol."""
    try:
        async with db_manager.get_async_session() as session:
            role_result = await session.execute(
                select(Role).where(
                    and_(
                        Role.id == role_id,
                        Role.deleted_at.is_(None),
                    )
                )
            )
            role = role_result.scalar_one_or_none()

            if not role:
                return ResponseManager.error(
                    message=f"Rol no encontrado: {role_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request,
                )

            assigned_result = await session.execute(
                select(RolePermission.permission_id).where(RolePermission.role_id == role_id)
            )
            assigned_ids = {row[0] for row in assigned_result.all()}

            permissions_result = await session.execute(
                select(Permission)
                .where(
                    and_(
                        Permission.is_active == True,
                        Permission.deleted_at.is_(None),
                    )
                )
                .order_by(Permission.permission_group, Permission.permission_code)
            )
            permissions = [
                permission_to_dict(permission, assigned=permission.id in assigned_ids)
                for permission in permissions_result.scalars().all()
            ]

            return ResponseManager.success(
                data={
                    "role": role_to_dict(role, permissions_count=len(assigned_ids)),
                    "permissions": permissions,
                    "assigned_permission_ids": sorted(assigned_ids),
                },
                message="Permisos de rol obtenidos",
                request=request,
            )

    except Exception as e:
        logger.error(f"Error al obtener permisos del rol {role_id}: {e}")
        return ResponseManager.internal_server_error(
            message="Error al obtener permisos del rol",
            details=str(e),
            request=request,
        )


@router.put("/{role_id}/permissions", response_class=JSONResponse)
async def update_role_permissions_matrix(
    request: Request,
    role_id: int = Path(..., description="ID del rol"),
    payload: dict = Body(...),
    user: dict = Depends(require_roles_permission),
):
    """Reemplazar permisos asignados a un rol."""
    try:
        permission_ids = list(dict.fromkeys(payload.get("permission_ids") or []))
        reason = (payload.get("reason") or "").strip()

        if len(reason) < 3:
            return ResponseManager.error(
                message="Debes indicar un motivo del cambio",
                status_code=HTTPStatus.BAD_REQUEST,
                error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                error_type=ErrorType.VALIDATION_ERROR,
                request=request,
            )

        if any(not isinstance(permission_id, int) or permission_id <= 0 for permission_id in permission_ids):
            return ResponseManager.error(
                message="Todos los permisos deben tener ID positivo",
                status_code=HTTPStatus.BAD_REQUEST,
                error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                error_type=ErrorType.VALIDATION_ERROR,
                request=request,
            )

        async with db_manager.get_async_session() as session:
            role_result = await session.execute(
                select(Role).where(
                    and_(
                        Role.id == role_id,
                        Role.deleted_at.is_(None),
                    )
                )
            )
            role = role_result.scalar_one_or_none()

            if not role:
                return ResponseManager.error(
                    message=f"Rol no encontrado: {role_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request,
                )

            if permission_ids:
                permissions_result = await session.execute(
                    select(Permission).where(
                        and_(
                            Permission.id.in_(permission_ids),
                            Permission.is_active == True,
                            Permission.deleted_at.is_(None),
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
                    request=request,
                )

            current_result = await session.execute(
                select(Permission)
                .join(RolePermission, RolePermission.permission_id == Permission.id)
                .where(RolePermission.role_id == role_id)
            )
            current_permissions = current_result.scalars().all()
            current_ids = {permission.id for permission in current_permissions}
            requested_ids = set(permission_ids)

            if current_ids == requested_ids:
                return ResponseManager.success(
                    data={
                        "role_id": role_id,
                        "permissions_changed": False,
                        "assigned_permissions": [
                            permission_to_dict(permission, assigned=True)
                            for permission in sorted(current_permissions, key=lambda item: item.permission_code)
                        ],
                    },
                    message="Permisos sin cambios",
                    request=request,
                )

            old_permission_codes = sorted(permission.permission_code for permission in current_permissions)
            new_permission_codes = sorted(permission.permission_code for permission in requested_permissions)

            affected_users_result = await session.execute(
                select(User)
                .join(UserRole, UserRole.user_id == User.id)
                .where(
                    and_(
                        UserRole.role_id == role_id,
                        User.deleted_at.is_(None),
                    )
                )
            )
            affected_users = affected_users_result.scalars().all()

            await session.execute(delete(RolePermission).where(RolePermission.role_id == role_id))
            for permission in requested_permissions:
                session.add(RolePermission(
                    role_id=role_id,
                    permission_id=permission.id,
                    granted_by_user_id=user.get("user_id"),
                ))

            await record_audit_log(
                session,
                table_name="role_permissions",
                record_id=role_id,
                action_type="UPDATE",
                user_id=user.get("user_id"),
                changed_fields=["permissions"],
                old_values={
                    "permission_codes": old_permission_codes,
                },
                new_values={
                    "permission_codes": new_permission_codes,
                    "reason": reason,
                },
                request=request,
            )
            await session.commit()

            try:
                from cache.services.user_cache import invalidate_user_permissions
                for affected_user in affected_users:
                    await invalidate_user_permissions(affected_user.id)
            except Exception as cache_error:
                logger.warning(f"No fue posible invalidar cache por cambio de permisos del rol {role_id}: {cache_error}")

            return ResponseManager.success(
                data={
                    "role_id": role_id,
                    "permissions_changed": True,
                    "old_permissions": old_permission_codes,
                    "new_permissions": new_permission_codes,
                    "affected_user_ids": [affected_user.id for affected_user in affected_users],
                    "assigned_permissions": [
                        permission_to_dict(permission, assigned=True)
                        for permission in sorted(requested_permissions, key=lambda item: item.permission_code)
                    ],
                    "session_sync_required": True,
                },
                message="Permisos del rol actualizados",
                request=request,
            )

    except Exception as e:
        logger.error(f"Error al actualizar permisos del rol {role_id}: {e}")
        return ResponseManager.internal_server_error(
            message="Error al actualizar permisos del rol",
            details=str(e),
            request=request,
        )


@router.get("/stats/summary", response_class=JSONResponse)
async def get_roles_summary(
    request: Request,
    user: dict = Depends(require_roles_permission),
):
    """Resumen de roles para panel administrativo."""
    try:
        async with db_manager.get_async_session() as session:
            base_filter = Role.deleted_at.is_(None)

            total_roles = (await session.execute(
                select(func.count(Role.id)).where(base_filter)
            )).scalar() or 0
            active_roles = (await session.execute(
                select(func.count(Role.id)).where(and_(base_filter, Role.is_active == True))
            )).scalar() or 0
            system_roles = (await session.execute(
                select(func.count(Role.id)).where(and_(base_filter, Role.is_system_role == True))
            )).scalar() or 0
            total_assignments = (await session.execute(
                select(func.count(UserRole.id))
            )).scalar() or 0

            data = {
                "total_roles": total_roles,
                "active_roles": active_roles,
                "inactive_roles": max(total_roles - active_roles, 0),
                "system_roles": system_roles,
                "editable_roles": max(total_roles - system_roles, 0),
                "total_assignments": total_assignments,
            }

            logger.info(f"Usuario {user['username']} consulto resumen de roles")

            return ResponseManager.success(
                data=data,
                message="Resumen de roles generado",
                request=request,
            )
    except Exception as e:
        logger.error(f"Error al obtener resumen de roles: {e}")
        return ResponseManager.internal_server_error(
            message="Error al obtener resumen de roles",
            details=str(e),
            request=request,
        )


@router.get("/{role_id}", response_class=JSONResponse)
async def get_role(
    request: Request,
    role_id: int = Path(..., description="ID del rol"),
    user: dict = Depends(require_roles_permission),
):
    """Obtener detalle de rol con permisos asociados."""
    try:
        async with db_manager.get_async_session() as session:
            role_result = await session.execute(
                select(Role).where(
                    and_(
                        Role.id == role_id,
                        Role.deleted_at.is_(None),
                    )
                )
            )
            role = role_result.scalar_one_or_none()

            if not role:
                return ResponseManager.error(
                    message=f"Rol no encontrado: {role_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request,
                )

            users_count = (await session.execute(
                select(func.count(UserRole.user_id)).where(UserRole.role_id == role_id)
            )).scalar() or 0

            permissions_result = await session.execute(
                select(Permission)
                .join(RolePermission, RolePermission.permission_id == Permission.id)
                .where(
                    and_(
                        RolePermission.role_id == role_id,
                        Permission.deleted_at.is_(None),
                    )
                )
                .order_by(Permission.permission_group, Permission.permission_code)
            )
            permissions = permissions_result.scalars().all()
            permissions_data = [
                {
                    "id": permission.id,
                    "permission_code": permission.permission_code,
                    "permission_name": permission.permission_name,
                    "permission_group": permission.permission_group,
                    "permission_description": permission.permission_description,
                    "is_active": permission.is_active,
                }
                for permission in permissions
            ]

            data = role_to_dict(
                role,
                users_count=users_count,
                permissions_count=len(permissions_data),
                permissions=permissions_data,
            )

            logger.info(f"Usuario {user['username']} consulto rol {role.role_code}")

            return ResponseManager.success(
                data=data,
                message="Rol encontrado",
                request=request,
            )
    except Exception as e:
        logger.error(f"Error al obtener rol {role_id}: {e}")
        return ResponseManager.internal_server_error(
            message="Error al obtener rol",
            details=str(e),
            request=request,
        )
