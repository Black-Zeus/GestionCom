"""
Simple Permission Repository
"""
import logging
from typing import Dict, List
from sqlalchemy import text

logger = logging.getLogger(__name__)

async def get_user_permissions_and_roles(user_id: int) -> Dict[str, List[str]]:
    """
    Obtener roles y permisos de un usuario
    """
    try:
        from database import get_async_session
        
        async for db in get_async_session():
            # Query simple para obtener roles y permisos
            query = text("""
                SELECT DISTINCT
                    r.role_code,
                    p.permission_code
                FROM user_roles ur
                INNER JOIN roles r ON ur.role_id = r.id
                LEFT JOIN role_permissions rp ON r.id = rp.role_id  
                LEFT JOIN permissions p ON rp.permission_id = p.id
                WHERE ur.user_id = :user_id
                    AND r.is_active = TRUE
                    AND (p.id IS NULL OR p.is_active = TRUE)
            """)
            
            result = await db.execute(query, {"user_id": user_id})
            rows = result.fetchall()
            
            roles = set()
            permissions = set()
            
            for row in rows:
                if row[0]:  # role_code
                    roles.add(row[0])
                if row[1]:  # permission_code
                    permissions.add(row[1])
            
            return {
                "roles": list(roles),
                "permissions": list(permissions)
            }
            
    except Exception as e:
        logger.error(f"Error getting user permissions: {e}")
        return {"roles": [], "permissions": []}