"""
volumes/backend-api/utils/profile_helpers.py
Helper unificado para gestión de perfiles de usuario
Centraliza la lógica para obtener información completa de perfiles
"""
from utils.log_helper import setup_logger
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

# Database imports
from database.models.users import User
from database.models.user_roles import UserRole
from database.models.roles import Role
from database.models.user_permissions import UserPermission
from database.models.permissions import Permission
from database.models.role_permissions import RolePermission
from database.models.user_warehouse_access import UserWarehouseAccess
from database.models.warehouses import Warehouse

logger = setup_logger(__name__)

class ProfileHelper:
    """Helper para gestión unificada de perfiles"""
    
    @staticmethod
    async def get_user_roles_and_permissions(session: AsyncSession, user_id: int) -> Dict[str, Any]:
        """
        Obtener roles y permisos completos de un usuario
        
        Args:
            session: Sesión de base de datos
            user_id: ID del usuario
            
        Returns:
            Dict con roles, permisos y detalles
        """
        try:
            # ==========================================
            # OBTENER ROLES DEL USUARIO
            # ==========================================
            roles_stmt = select(Role).select_from(
                UserRole.__table__.join(Role.__table__, UserRole.role_id == Role.id)
            ).where(
                and_(
                    UserRole.user_id == user_id,
                    Role.is_active == True,
                    Role.deleted_at.is_(None)
                )
            )
            
            roles_result = await session.execute(roles_stmt)
            user_roles = roles_result.scalars().all()
            
            # ==========================================
            # OBTENER PERMISOS POR ROLES
            # ==========================================
            role_permissions_stmt = select(Permission).select_from(
                UserRole.__table__
                .join(Role.__table__, UserRole.role_id == Role.id)
                .join(RolePermission.__table__, Role.id == RolePermission.role_id)
                .join(Permission.__table__, RolePermission.permission_id == Permission.id)
            ).where(
                and_(
                    UserRole.user_id == user_id,
                    Role.is_active == True,
                    Permission.is_active == True,
                    Role.deleted_at.is_(None),
                    Permission.deleted_at.is_(None)
                )
            ).distinct()
            
            role_permissions_result = await session.execute(role_permissions_stmt)
            role_permissions = role_permissions_result.scalars().all()
            
            # ==========================================
            # OBTENER PERMISOS DIRECTOS
            # ==========================================
            direct_permissions_stmt = select(Permission).select_from(
                UserPermission.__table__.join(Permission.__table__, UserPermission.permission_id == Permission.id)
            ).where(
                and_(
                    UserPermission.user_id == user_id,
                    Permission.is_active == True,
                    Permission.deleted_at.is_(None)
                )
            )
            
            direct_permissions_result = await session.execute(direct_permissions_stmt)
            direct_permissions = direct_permissions_result.scalars().all()
            
            # ==========================================
            # PROCESAR Y FORMATEAR DATOS
            # ==========================================
            
            # Roles simples
            role_codes = [role.role_code for role in user_roles]
            role_names = [role.role_name for role in user_roles]
            
            # Roles detallados
            role_details = []
            for role in user_roles:
                role_details.append({
                    "id": role.id,
                    "code": role.role_code,
                    "name": role.role_name,
                    "description": getattr(role, 'description', None),
                    "level": getattr(role, 'level', None),
                    "is_active": role.is_active,
                    "created_at": role.created_at.isoformat() if role.created_at else None
                })
            
            # Permisos unificados (roles + directos)
            all_permissions = set()
            
            # Agregar permisos por roles
            for perm in role_permissions:
                all_permissions.add(perm.permission_code)
            
            # Agregar permisos directos
            for perm in direct_permissions:
                all_permissions.add(perm.permission_code)
            
            # Permisos detallados
            permission_details = []
            
            # Detalles de permisos por roles
            for perm in role_permissions:
                permission_details.append({
                    "id": perm.id,
                    "code": perm.permission_code,
                    "name": perm.permission_name,
                    "description": getattr(perm, 'description', None),
                    "category": getattr(perm, 'category', None),
                    "source": "role",
                    "source_detail": "Heredado de roles",
                    "is_active": perm.is_active
                })
            
            # Detalles de permisos directos
            for perm in direct_permissions:
                permission_details.append({
                    "id": perm.id,
                    "code": perm.permission_code,
                    "name": perm.permission_name,
                    "description": getattr(perm, 'description', None),
                    "category": getattr(perm, 'category', None),
                    "source": "direct",
                    "source_detail": "Asignado directamente",
                    "is_active": perm.is_active
                })
            
            # ==========================================
            # CALCULAR PROPIEDADES DERIVADAS
            # ==========================================
            
            # Verificar roles específicos
            has_admin_role = "ADMIN" in role_codes
            has_manager_role = "MANAGER" in role_codes or "GERENTE" in role_codes
            is_supervisor = "SUPERVISOR" in role_codes
            is_cashier = "CAJERO" in role_codes or "CASHIER" in role_codes
            
            # Verificar permisos importantes
            all_perms_list = list(all_permissions)
            has_user_management = any(perm.startswith("USER_") for perm in all_permissions)
            has_warehouse_access = "WAREHOUSE_ACCESS" in all_permissions
            
            return {
                # Listas simples
                "role_codes": role_codes,
                "role_names": role_names,
                "permission_codes": all_perms_list,
                
                # Datos detallados
                "role_details": role_details,
                "permission_details": permission_details,
                
                # Contadores
                "role_count": len(role_codes),
                "permission_count": len(all_permissions),
                
                # Propiedades derivadas
                "has_admin_role": has_admin_role,
                "has_manager_role": has_manager_role,
                "is_supervisor": is_supervisor,
                "is_cashier": is_cashier,
                "has_user_management": has_user_management,
                "has_warehouse_access": has_warehouse_access
            }
            
        except Exception as e:
            logger.error(f"Error obteniendo roles y permisos para usuario {user_id}: {e}")
            return {
                "role_codes": [],
                "role_names": [],
                "permission_codes": [],
                "role_details": [],
                "permission_details": [],
                "role_count": 0,
                "permission_count": 0,
                "has_admin_role": False,
                "has_manager_role": False,
                "is_supervisor": False,
                "is_cashier": False,
                "has_user_management": False,
                "has_warehouse_access": False
            }
    
    @staticmethod
    async def get_user_warehouse_accesses(session: AsyncSession, user_id: int) -> Dict[str, Any]:
        """
        Obtener accesos a bodegas del usuario (versión simplificada)
        
        Args:
            session: Sesión de base de datos
            user_id: ID del usuario
            
        Returns:
            Dict con accesos a bodegas
        """
        try:
            # ==========================================
            # VERSIÓN SIMPLIFICADA - SOLO USAR MODELOS BASE
            # ==========================================
            
            # Por ahora, retornamos estructura vacía pero válida
            # hasta que se definan mejor las tablas de warehouse_access
            
            return {
                "accesses": [],
                "total_warehouses": 0,
                "responsible_warehouses": 0,
                "access_types": [],
                "has_warehouse_access": False,
                "has_responsible_warehouses": False
            }
            
            # TODO: Implementar cuando la tabla user_warehouse_access 
            # tenga todas las columnas necesarias
            
        except Exception as e:
            logger.error(f"Error obteniendo accesos a bodegas para usuario {user_id}: {e}")
            return {
                "accesses": [],
                "total_warehouses": 0,
                "responsible_warehouses": 0,
                "access_types": [],
                "has_warehouse_access": False,
                "has_responsible_warehouses": False
            }
        
    @staticmethod
    def calculate_profile_completeness(user: User) -> Dict[str, Any]:
        """
        Calcular completitud del perfil (versión segura)
        
        Args:
            user: Modelo de usuario
            
        Returns:
            Dict con información de completitud
        """
        try:
            required_fields = [
                ("first_name", getattr(user, 'first_name', None)),
                ("last_name", getattr(user, 'last_name', None)),
                ("email", getattr(user, 'email', None)),
                ("phone", getattr(user, 'phone', None))
            ]
            
            completed_fields = 0
            missing_fields = []
            
            for field_name, field_value in required_fields:
                if field_value and str(field_value).strip():
                    completed_fields += 1
                else:
                    missing_fields.append(field_name)
            
            completion_percentage = (completed_fields / len(required_fields)) * 100
            
            return {
                "completion_percentage": round(completion_percentage, 1),
                "completed_fields": completed_fields,
                "total_fields": len(required_fields),
                "missing_fields": missing_fields,
                "is_complete": completion_percentage == 100.0
            }
            
        except Exception as e:
            logger.error(f"Error calculando completitud de perfil: {e}")
            return {
                "completion_percentage": 0.0,
                "completed_fields": 0,
                "total_fields": 4,
                "missing_fields": ["first_name", "last_name", "email", "phone"],
                "is_complete": False
            }

    @staticmethod
    def calculate_security_score(user: User, roles_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calcular puntaje de seguridad del usuario (versión segura)
        
        Args:
            user: Modelo de usuario
            roles_data: Datos de roles y permisos
            
        Returns:
            Dict con puntaje de seguridad
        """
        try:
            score = 0
            max_score = 100
            issues = []
            recommendations = []
            
            # Verificar edad de contraseña (20 puntos)
            password_age_days = getattr(user, 'password_age_days', 0)
            if password_age_days <= 30:
                score += 20
            elif password_age_days <= 90:
                score += 15
                recommendations.append("Considera cambiar tu contraseña pronto")
            elif password_age_days <= 180:
                score += 10
                recommendations.append("Tu contraseña es antigua, cámbiala pronto")
            else:
                issues.append("Contraseña muy antigua (más de 6 meses)")
                recommendations.append("URGENTE: Cambia tu contraseña inmediatamente")
            
            # Verificar login reciente (15 puntos)
            has_recent_login = getattr(user, 'has_recent_login', False)
            if has_recent_login:
                score += 15
            else:
                issues.append("No has iniciado sesión recientemente")
                recommendations.append("Inicia sesión regularmente para mantener tu cuenta activa")
            
            # Verificar estado de cuenta (20 puntos)
            is_active = getattr(user, 'is_active', False)
            if is_active:
                score += 20
            else:
                issues.append("Cuenta inactiva")
                recommendations.append("Contacta al administrador para activar tu cuenta")
            
            # Verificar roles asignados (15 puntos)
            if roles_data.get("role_count", 0) > 0:
                score += 15
            else:
                issues.append("Sin roles asignados")
                recommendations.append("Solicita roles apropiados al administrador")
            
            # Verificar permisos (15 puntos)
            if roles_data.get("permission_count", 0) > 0:
                score += 15
            else:
                issues.append("Sin permisos específicos")
                recommendations.append("Verifica que tengas los permisos necesarios")
            
            # Verificar información personal completa (15 puntos)
            first_name = getattr(user, 'first_name', None)
            last_name = getattr(user, 'last_name', None)
            email = getattr(user, 'email', None)
            
            if first_name and last_name and email:
                score += 15
            else:
                issues.append("Información personal incompleta")
                recommendations.append("Completa tu información personal en el perfil")
            
            # Determinar nivel de seguridad
            if score >= 90:
                security_level = "EXCELLENT"
                security_color = "green"
            elif score >= 70:
                security_level = "GOOD"
                security_color = "blue"
            elif score >= 50:
                security_level = "FAIR"
                security_color = "yellow"
            elif score >= 30:
                security_level = "POOR"
                security_color = "orange"
            else:
                security_level = "CRITICAL"
                security_color = "red"
            
            return {
                "security_score": score,
                "max_score": max_score,
                "security_percentage": round((score / max_score) * 100, 1),
                "security_level": security_level,
                "security_color": security_color,
                "issues_count": len(issues),
                "issues": issues,
                "recommendations_count": len(recommendations),
                "recommendations": recommendations
            }
            
        except Exception as e:
            logger.error(f"Error calculando puntaje de seguridad: {e}")
            return {
                "security_score": 0,
                "max_score": 100,
                "security_percentage": 0.0,
                "security_level": "UNKNOWN",
                "security_color": "gray",
                "issues_count": 1,
                "issues": ["Error calculando seguridad"],
                "recommendations_count": 1,
                "recommendations": ["Contacta al administrador del sistema"]
            }

    @staticmethod
    def compare_profiles(profile_1: Dict[str, Any], profile_2: Dict[str, Any]) -> Dict[str, Any]:
        """
        Comparar dos perfiles de usuario
        
        Args:
            profile_1: Primer perfil
            profile_2: Segundo perfil
            
        Returns:
            Dict con comparación detallada
        """
        try:
            comparison = {
                "summary": {
                    "user_1_name": profile_1.get("full_name", "Usuario 1"),
                    "user_2_name": profile_2.get("full_name", "Usuario 2"),
                    "comparison_date": datetime.now(timezone.utc).isoformat()
                },
                "roles": {
                    "user_1_roles": profile_1.get("roles", []),
                    "user_2_roles": profile_2.get("roles", []),
                    "common_roles": list(set(profile_1.get("roles", [])) & set(profile_2.get("roles", []))),
                    "unique_to_user_1": list(set(profile_1.get("roles", [])) - set(profile_2.get("roles", []))),
                    "unique_to_user_2": list(set(profile_2.get("roles", [])) - set(profile_1.get("roles", [])))
                },
                "permissions": {
                    "user_1_permissions": profile_1.get("permissions", []),
                    "user_2_permissions": profile_2.get("permissions", []),
                    "common_permissions": list(set(profile_1.get("permissions", [])) & set(profile_2.get("permissions", []))),
                    "unique_to_user_1": list(set(profile_1.get("permissions", [])) - set(profile_2.get("permissions", []))),
                    "unique_to_user_2": list(set(profile_2.get("permissions", [])) - set(profile_1.get("permissions", [])))
                },
                "warehouses": {
                    "user_1_warehouses": len(profile_1.get("warehouse_accesses", [])),
                    "user_2_warehouses": len(profile_2.get("warehouse_accesses", [])),
                    "user_1_responsible": profile_1.get("responsible_warehouse_count", 0),
                    "user_2_responsible": profile_2.get("responsible_warehouse_count", 0)
                },
                "security": {
                    "user_1_score": profile_1.get("security_score", {}).get("security_score", 0),
                    "user_2_score": profile_2.get("security_score", {}).get("security_score", 0),
                    "user_1_level": profile_1.get("security_score", {}).get("security_level", "UNKNOWN"),
                    "user_2_level": profile_2.get("security_score", {}).get("security_level", "UNKNOWN")
                }
            }
            
            return comparison
            
        except Exception as e:
            logger.error(f"Error comparando perfiles: {e}")
            return {
                "error": "Error en la comparación",
                "details": str(e)
            }