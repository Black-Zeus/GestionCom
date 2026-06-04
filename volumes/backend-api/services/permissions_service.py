"""
volumes/backend-api/services/permissions_service.py
Servicio centralizado de permisos y roles - USANDO ORM Y LÓGICA SEPARADA
"""
from datetime import datetime, timezone
from typing import List, Dict
from sqlalchemy import select, and_, or_
from database.database import db_manager
from utils.log_helper import setup_logger

logger = setup_logger(__name__)

class PermissionsService:
    """Servicio centralizado para manejo de permisos y roles"""
    
    async def get_user_permissions(self, user_id: int) -> Dict[str, List[str]]:
        """
        Obtener roles y permisos de usuario - LÓGICA SEPARADA CON ORM
        """
        try:
            
            async with db_manager.get_session() as session:
                # Obtener datos por separado
                user_roles = await self._get_user_roles(session, user_id)
                direct_permissions = await self._get_user_direct_permissions(session, user_id)
                role_permissions = await self._get_permissions_from_roles(session, user_id, user_roles)
                
                # Combinar todos los permisos
                all_permissions = direct_permissions + role_permissions
                unique_permissions = list(set(all_permissions))  # Deduplicar
                
                return {
                    "roles": user_roles,
                    "permissions": unique_permissions
                }

        except Exception as e:
            logger.error(f"Error en PermissionsService: {e}")
            import traceback
            traceback.print_exc()
            return {
                "roles": [],
                "permissions": []
            }
    
    async def _get_user_roles(self, session, user_id: int) -> List[str]:
        """Obtener roles del usuario usando ORM"""
        try:
            from database.models.user_roles import UserRole
            from database.models.roles import Role
                        
            # Query ORM para roles
            stmt = select(Role.role_code).select_from(
                UserRole.__table__.join(Role.__table__, UserRole.role_id == Role.id)
            ).where(
                and_(
                    UserRole.user_id == user_id,
                    UserRole.deleted_at.is_(None),
                    Role.is_active == True,
                    Role.deleted_at.is_(None)
                )
            )
            
            result = session.execute(stmt)
            roles = [row[0] for row in result.fetchall()]
            
            return roles
            
        except Exception as e:
            logger.error(f"Error obteniendo roles: {e}")
            return []
    
    async def _get_user_direct_permissions(self, session, user_id: int) -> List[str]:
        """Obtener permisos directos del usuario usando ORM"""
        try:
            from database.models.user_permissions import UserPermission
            from database.models.permissions import Permission
            
            # Query ORM para permisos directos
            stmt = select(Permission.permission_code).select_from(
                UserPermission.__table__.join(Permission.__table__, UserPermission.permission_id == Permission.id)
            ).where(
                and_(
                    UserPermission.user_id == user_id,
                    UserPermission.deleted_at.is_(None),
                    Permission.is_active == True,
                    Permission.deleted_at.is_(None),
                    or_(UserPermission.expires_at.is_(None), UserPermission.expires_at > datetime.now(timezone.utc)),
                    UserPermission.permission_type == 'GRANT'
                )
            )
            
            result = session.execute(stmt)
            permissions = [row[0] for row in result.fetchall()]
            
            return permissions
            
        except Exception as e:
            return []
    
    async def _get_permissions_from_roles(self, session, user_id: int, user_roles: List[str]) -> List[str]:
        """Obtener permisos que vienen de los roles del usuario usando ORM"""
        try:
            if not user_roles:
                logger.warning(f"🔄 Usuario no tiene roles, sin permisos por roles")
                return []
            
            from database.models.user_roles import UserRole
            from database.models.roles import Role
            from database.models.role_permissions import RolePermission
            from database.models.permissions import Permission
            
            # Query ORM para permisos por roles
            stmt = select(Permission.permission_code).select_from(
                UserRole.__table__
                .join(Role.__table__, UserRole.role_id == Role.id)
                .join(RolePermission.__table__, Role.id == RolePermission.role_id)
                .join(Permission.__table__, RolePermission.permission_id == Permission.id)
            ).where(
                and_(
                    UserRole.user_id == user_id,
                    UserRole.deleted_at.is_(None),
                    Role.is_active == True,
                    Role.deleted_at.is_(None),
                    RolePermission.deleted_at.is_(None),
                    Permission.is_active == True,
                    Permission.deleted_at.is_(None)
                )
            ).distinct()
            
            result = session.execute(stmt)
            permissions = [row[0] for row in result.fetchall()]
            
            return permissions
            
        except Exception as e:
            logger.error(f"Error obteniendo permisos por roles: {e}")
            return []
    
    # ===============================================
    # MÉTODOS ADICIONALES ÚTILES
    # ===============================================
    
    async def get_user_roles_only(self, user_id: int) -> List[str]:
        """Obtener solo los roles del usuario"""
        try:
            async with db_manager.get_session() as session:
                return await self._get_user_roles(session, user_id)
        except Exception as e:
            logger.error(f"Error getting user roles for {user_id}: {e}")
            return []
    
    async def get_user_direct_permissions_only(self, user_id: int) -> List[str]:
        """Obtener solo los permisos directos del usuario"""
        try:
            async with db_manager.get_session() as session:
                return await self._get_user_direct_permissions(session, user_id)
        except Exception as e:
            logger.error(f"Error getting user direct permissions for {user_id}: {e}")
            return []
    
    async def get_permissions_from_roles_only(self, user_id: int) -> List[str]:
        """Obtener solo los permisos que vienen de roles"""
        try:
            async with db_manager.get_session() as session:
                user_roles = await self._get_user_roles(session, user_id)
                return await self._get_permissions_from_roles(session, user_id, user_roles)
        except Exception as e:
            logger.error(f"Error getting role permissions for {user_id}: {e}")
            return []
    
    async def has_permission(self, user_id: int, permission_code: str) -> bool:
        """Verificar si un usuario tiene un permiso específico"""
        try:
            user_permissions = await self.get_user_permissions(user_id)
            return permission_code in user_permissions.get("permissions", [])
        except Exception as e:
            logger.error(f"Error checking permission {permission_code} for user {user_id}: {e}")
            return False
    
    async def has_role(self, user_id: int, role_code: str) -> bool:
        """Verificar si un usuario tiene un rol específico"""
        try:
            user_permissions = await self.get_user_permissions(user_id)
            return role_code in user_permissions.get("roles", [])
        except Exception as e:
            logger.error(f"Error checking role {role_code} for user {user_id}: {e}")
            return False

# Instancia global
permissions_service = PermissionsService()
