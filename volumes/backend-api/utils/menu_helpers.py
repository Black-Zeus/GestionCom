"""
utils/menu_helpers.py
Funciones básicas de ayuda para menús - MINIMALISTA
Solo helpers esenciales, sin lógica de negocio compleja
"""
from typing import Optional, List
import re
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from database.models.menu_items import MenuItem
from utils.log_helper import setup_logger

logger = setup_logger(__name__)


# ==========================================
# FUNCIONES DE NORMALIZACIÓN
# ==========================================

def normalize_menu_code(name: str) -> str:
    """
    Normalizar nombre para generar código de menú
    
    Args:
        name: Nombre del menú
        
    Returns:
        Código normalizado
    """
    if not name or not name.strip():
        return 'MENU'
    
    # Convertir a mayúsculas y limpiar
    normalized = name.upper().strip()
    
    # Reemplazar espacios y caracteres especiales con guiones bajos
    normalized = re.sub(r'[^A-Z0-9]+', '_', normalized)
    
    # Remover guiones bajos al inicio y final
    normalized = normalized.strip('_')
    
    # Limitar longitud
    if len(normalized) > 40:
        normalized = normalized[:40].rstrip('_')
    
    return normalized or 'MENU'


def generate_unique_code(base_code: str, session: Session) -> str:
    """
    Generar código único agregando contador si es necesario
    
    Args:
        base_code: Código base
        session: Sesión de SQLAlchemy
        
    Returns:
        Código único
    """
    current_code = base_code
    counter = 1
    
    while code_exists(current_code, session):
        current_code = f"{base_code}_{counter}"
        counter += 1
        
        # Evitar loop infinito
        if counter > 999:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            current_code = f"{base_code}_{timestamp}"
            break
    
    return current_code


# ==========================================
# FUNCIONES DE BÚSQUEDA
# ==========================================

def code_exists(code: str, session: Session) -> bool:
    """
    Verificar si existe un código de menú
    
    Args:
        code: Código a verificar
        session: Sesión de SQLAlchemy
        
    Returns:
        True si existe, False si no
    """
    stmt = select(func.count(MenuItem.id)).where(
        MenuItem.menu_code == code.upper(),
        MenuItem.deleted_at.is_(None)
    )
    result = session.execute(stmt)
    return result.scalar() > 0


def find_menu_by_code(session: Session, menu_code: str) -> Optional[MenuItem]:
    """
    Encontrar menú por código
    
    Args:
        session: Sesión de SQLAlchemy
        menu_code: Código del menú
        
    Returns:
        MenuItem o None
    """
    stmt = select(MenuItem).where(
        MenuItem.menu_code == menu_code.upper(),
        MenuItem.deleted_at.is_(None)
    )
    result = session.execute(stmt)
    return result.scalar_one_or_none()


def find_menu_by_url(session: Session, menu_url: str) -> Optional[MenuItem]:
    """
    Encontrar menú por URL
    
    Args:
        session: Sesión de SQLAlchemy
        menu_url: URL del menú
        
    Returns:
        MenuItem o None
    """
    stmt = select(MenuItem).where(
        MenuItem.menu_url == menu_url,
        MenuItem.deleted_at.is_(None),
        MenuItem.is_active == True
    )
    result = session.execute(stmt)
    return result.scalar_one_or_none()


def get_menu_children(session: Session, parent_id: int, active_only: bool = True) -> List[MenuItem]:
    """
    Obtener menús hijos de un menú padre
    
    Args:
        session: Sesión de SQLAlchemy
        parent_id: ID del menú padre
        active_only: Solo menús activos
        
    Returns:
        Lista de menús hijos
    """
    stmt = select(MenuItem).where(
        MenuItem.parent_id == parent_id,
        MenuItem.deleted_at.is_(None)
    )
    
    if active_only:
        stmt = stmt.where(MenuItem.is_active == True)
    
    stmt = stmt.order_by(MenuItem.sort_order, MenuItem.menu_name)
    
    result = session.execute(stmt)
    return result.scalars().all()


# ==========================================
# FUNCIONES DE JERARQUÍA
# ==========================================

def calculate_menu_level(menu_id: int, session: Session, visited: Optional[set] = None) -> int:
    """
    Calcular nivel jerárquico de un menú
    
    Args:
        menu_id: ID del menú
        session: Sesión de SQLAlchemy
        visited: Set de IDs visitados (para evitar ciclos)
        
    Returns:
        Nivel del menú (1 = raíz)
    """
    if visited is None:
        visited = set()
    
    if menu_id in visited:
        return 1  # Evitar ciclo infinito
    
    stmt = select(MenuItem.parent_id).where(MenuItem.id == menu_id)
    result = session.execute(stmt)
    row = result.first()
    
    if not row or not row[0]:
        return 1
    
    visited.add(menu_id)
    parent_level = calculate_menu_level(row[0], session, visited)
    return parent_level + 1


def validate_hierarchy(menu_id: int, new_parent_id: Optional[int], session: Session) -> tuple[bool, str]:
    """
    Validar que un cambio de jerarquía sea válido
    
    Args:
        menu_id: ID del menú a mover
        new_parent_id: Nuevo ID del padre
        session: Sesión de SQLAlchemy
        
    Returns:
        (es_valido, mensaje)
    """
    # No puede ser padre de sí mismo
    if menu_id == new_parent_id:
        return False, "Un menú no puede ser padre de sí mismo"
    
    # Verificar que el padre existe
    if new_parent_id is not None:
        stmt = select(MenuItem.id).where(
            MenuItem.id == new_parent_id,
            MenuItem.deleted_at.is_(None)
        )
        result = session.execute(stmt)
        if not result.first():
            return False, f"Menú padre {new_parent_id} no encontrado"
    
    # Verificar referencia circular
    if new_parent_id and would_create_cycle(menu_id, new_parent_id, session):
        return False, "Esta asignación crearía una referencia circular"
    
    # Verificar profundidad máxima (6 niveles)
    if new_parent_id:
        depth = calculate_menu_level(new_parent_id, session) + 1
        if depth > 6:
            return False, f"Profundidad máxima excedida (actual: {depth}, máximo: 6)"
    
    return True, "Jerarquía válida"


def would_create_cycle(menu_id: int, new_parent_id: int, session: Session) -> bool:
    """
    Verificar si asignar un padre crearía un ciclo
    
    Args:
        menu_id: ID del menú
        new_parent_id: ID del nuevo padre
        session: Sesión de SQLAlchemy
        
    Returns:
        True si crearía un ciclo
    """
    current_id = new_parent_id
    visited = set()
    
    while current_id and current_id not in visited:
        if current_id == menu_id:
            return True
        
        visited.add(current_id)
        
        stmt = select(MenuItem.parent_id).where(MenuItem.id == current_id)
        result = session.execute(stmt)
        row = result.first()
        current_id = row[0] if row else None
    
    return False


# ==========================================
# FUNCIONES DE ORDENAMIENTO
# ==========================================

def normalize_sort_order(session: Session, parent_id: Optional[int] = None) -> int:
    """
    Normalizar orden de menús hijos (incrementos de 10)
    
    Args:
        session: Sesión de SQLAlchemy
        parent_id: ID del padre (None para menús raíz)
        
    Returns:
        Número de menús reordenados
    """
    # Obtener menús del nivel
    stmt = select(MenuItem).where(
        MenuItem.parent_id == parent_id,
        MenuItem.deleted_at.is_(None)
    ).order_by(MenuItem.sort_order, MenuItem.menu_name)
    
    result = session.execute(stmt)
    menus = result.scalars().all()
    
    # Reordenar con incrementos de 10
    updated_count = 0
    for i, menu in enumerate(menus):
        new_order = (i + 1) * 10
        if menu.sort_order != new_order:
            menu.sort_order = new_order
            updated_count += 1
    
    return updated_count


def get_next_sort_order(session: Session, parent_id: Optional[int] = None) -> int:
    """
    Obtener el siguiente número de orden para un nuevo menú
    
    Args:
        session: Sesión de SQLAlchemy
        parent_id: ID del padre (None para menús raíz)
        
    Returns:
        Siguiente número de orden
    """
    stmt = select(func.max(MenuItem.sort_order)).where(
        MenuItem.parent_id == parent_id,
        MenuItem.deleted_at.is_(None)
    )
    result = session.execute(stmt)
    max_order = result.scalar() or 0
    
    return max_order + 10


# ==========================================
# FUNCIONES DE ICONOS
# ==========================================

def suggest_icon_for_menu(menu_name: str, menu_type: str = None) -> str:
    """
    Sugerir icono basado en el nombre del menú
    
    Args:
        menu_name: Nombre del menú
        menu_type: Tipo de menú
        
    Returns:
        Nombre del icono sugerido
    """
    name_lower = menu_name.lower()
    
    # Mapeo básico de palabras clave a iconos
    icon_mapping = {
        'dashboard': 'dashboard-line',
        'inicio': 'home-line',
        'home': 'home-line',
        'usuario': 'user-line',
        'users': 'user-line',
        'configuracion': 'settings-line',
        'settings': 'settings-line',
        'reporte': 'file-chart-line',
        'reports': 'file-chart-line',
        'inventario': 'archive-line',
        'inventory': 'archive-line',
        'venta': 'shopping-cart-line',
        'sales': 'shopping-cart-line',
        'producto': 'product-hunt-line',
        'products': 'product-hunt-line',
        'cliente': 'team-line',
        'customers': 'team-line',
        'finanza': 'money-dollar-circle-line',
        'finance': 'money-dollar-circle-line',
        'admin': 'admin-line',
        'herramienta': 'tools-line',
        'tools': 'tools-line',
        'calendario': 'calendar-line',
        'calendar': 'calendar-line',
        'correo': 'mail-line',
        'mail': 'mail-line',
        'documento': 'file-text-line',
        'documents': 'file-text-line'
    }
    
    # Buscar coincidencias
    for keyword, icon in icon_mapping.items():
        if keyword in name_lower:
            return icon
    
    # Iconos por defecto según tipo
    if menu_type == 'PARENT':
        return 'folder-line'
    elif menu_type == 'DIVIDER':
        return 'separator-line'
    elif menu_type == 'HEADER':
        return 'text-line'
    
    return 'arrow-right-circle-line'  # Por defecto


# ==========================================
# FUNCIONES DE PATH
# ==========================================

def get_menu_path(session: Session, menu_id: int) -> str:
    """
    Obtener la ruta completa de un menú
    
    Args:
        session: Sesión de SQLAlchemy
        menu_id: ID del menú
        
    Returns:
        Ruta completa (ej: "/admin/users/permissions")
    """
    path_parts = []
    current_id = menu_id
    visited = set()
    
    while current_id and current_id not in visited:
        visited.add(current_id)
        
        stmt = select(MenuItem.menu_url, MenuItem.parent_id).where(MenuItem.id == current_id)
        result = session.execute(stmt)
        row = result.first()
        
        if not row:
            break
            
        if row[0]:  # menu_url
            path_parts.insert(0, row[0].strip('/'))
        
        current_id = row[1]  # parent_id
    
    return '/' + '/'.join(filter(None, path_parts)) if path_parts else '/'


def build_menu_breadcrumb(session: Session, menu_id: int) -> List[dict]:
    """
    Construir breadcrumb (miga de pan) de un menú
    
    Args:
        session: Sesión de SQLAlchemy
        menu_id: ID del menú
        
    Returns:
        Lista de diccionarios con información del breadcrumb
    """
    breadcrumb = []
    current_id = menu_id
    visited = set()
    
    while current_id and current_id not in visited:
        visited.add(current_id)
        
        stmt = select(
            MenuItem.id,
            MenuItem.menu_code,
            MenuItem.menu_name,
            MenuItem.menu_url,
            MenuItem.parent_id
        ).where(MenuItem.id == current_id)
        
        result = session.execute(stmt)
        row = result.first()
        
        if not row:
            break
        
        breadcrumb.insert(0, {
            'id': row[0],
            'code': row[1],
            'name': row[2],
            'url': row[3],
            'is_current': current_id == menu_id
        })
        
        current_id = row[4]  # parent_id
    
    return breadcrumb