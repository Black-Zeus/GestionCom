"""
services/menu_service.py
Servicio principal para gestión de menús
CRUD básico + jerarquías + operaciones esenciales
"""
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, func, desc

# Database imports
from database.models.menu_items import MenuItem, MenuType, TargetWindow
from database.models.menu_item_permissions import MenuItemPermission
from database.models.user_menu_favorites import UserMenuFavorite

# Schema imports
from database.schemas.menu_items import MenuItemCreate, MenuItemUpdate

# Utils imports
from utils.menu_helpers import (
    normalize_menu_code,
    generate_unique_code,
    find_menu_by_code,
    get_menu_children,
    calculate_menu_level,
    validate_hierarchy,
    normalize_sort_order,
    get_next_sort_order,
    suggest_icon_for_menu,
    get_menu_path
)
from utils.log_helper import setup_logger

logger = setup_logger(__name__)


class MenuService:
    """Servicio principal para gestión de menús"""
    
    def __init__(self, session: Session):
        self.session = session
    
    # ==========================================
    # CRUD BÁSICO
    # ==========================================
    
    def create_menu(self, menu_data: MenuItemCreate, created_by_user_id: int) -> MenuItem:
        """
        Crear nuevo menú
        
        Args:
            menu_data: Datos del menú
            created_by_user_id: ID del usuario que crea
            
        Returns:
            MenuItem creado
            
        Raises:
            ValueError: Si hay errores de validación
        """
        try:
            # Generar código único si no se proporciona
            if not menu_data.menu_code:
                base_code = normalize_menu_code(menu_data.menu_name)
                menu_data.menu_code = generate_unique_code(base_code, self.session)
            else:
                # Verificar que el código no exista
                if find_menu_by_code(self.session, menu_data.menu_code):
                    raise ValueError(f"El código '{menu_data.menu_code}' ya existe")
            
            # Validar jerarquía si tiene padre
            if menu_data.parent_id:
                is_valid, message = validate_hierarchy(0, menu_data.parent_id, self.session)
                if not is_valid:
                    raise ValueError(f"Jerarquía inválida: {message}")
            
            # Calcular nivel jerárquico
            if menu_data.parent_id:
                menu_level = calculate_menu_level(menu_data.parent_id, self.session) + 1
            else:
                menu_level = 1
            
            # Obtener siguiente orden si no se especifica
            if not menu_data.sort_order:
                menu_data.sort_order = get_next_sort_order(self.session, menu_data.parent_id)
            
            # Sugerir icono si no se proporciona
            if not menu_data.icon_name:
                menu_data.icon_name = suggest_icon_for_menu(
                    menu_data.menu_name, 
                    menu_data.menu_type.value if menu_data.menu_type else None
                )
            
            # Crear menú
            new_menu = MenuItem(
                parent_id=menu_data.parent_id,
                menu_code=menu_data.menu_code.upper(),
                menu_name=menu_data.menu_name,
                menu_description=menu_data.menu_description,
                icon_name=menu_data.icon_name,
                icon_color=menu_data.icon_color,
                menu_url=menu_data.menu_url,
                menu_type=menu_data.menu_type or MenuType.LINK,
                required_permission_id=menu_data.required_permission_id,
                alternative_permissions=menu_data.alternative_permissions,
                is_active=menu_data.is_active if menu_data.is_active is not None else True,
                is_visible=menu_data.is_visible if menu_data.is_visible is not None else True,
                requires_feature=menu_data.requires_feature or False,
                feature_code=menu_data.feature_code,
                sort_order=menu_data.sort_order,
                menu_level=menu_level,
                menu_path=None,  # Se calculará después
                target_window=menu_data.target_window or TargetWindow.SELF,
                css_classes=menu_data.css_classes,
                data_attributes=menu_data.data_attributes,
                created_by_user_id=created_by_user_id
            )
            
            self.session.add(new_menu)
            self.session.flush()  # Para obtener el ID
            
            # Calcular y actualizar path
            new_menu.menu_path = get_menu_path(self.session, new_menu.id)
            
            self.session.commit()
            self.session.refresh(new_menu)
            
            logger.info(f"Menú creado: {new_menu.menu_code} (ID: {new_menu.id})")
            return new_menu
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error al crear menú: {e}")
            raise
    
    def get_menu_by_id(self, menu_id: int, include_deleted: bool = False) -> Optional[MenuItem]:
        """
        Obtener menú por ID
        
        Args:
            menu_id: ID del menú
            include_deleted: Incluir menús eliminados
            
        Returns:
            MenuItem o None
        """
        stmt = select(MenuItem).where(MenuItem.id == menu_id)
        
        if not include_deleted:
            stmt = stmt.where(MenuItem.deleted_at.is_(None))
        
        result = self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    def get_menu_by_code(self, menu_code: str, include_deleted: bool = False) -> Optional[MenuItem]:
        """
        Obtener menú por código
        
        Args:
            menu_code: Código del menú
            include_deleted: Incluir menús eliminados
            
        Returns:
            MenuItem o None
        """
        return find_menu_by_code(self.session, menu_code) if not include_deleted else None
    
    def update_menu(self, menu_id: int, menu_data: MenuItemUpdate, updated_by_user_id: int) -> MenuItem:
        """
        Actualizar menú existente
        
        Args:
            menu_id: ID del menú
            menu_data: Datos a actualizar
            updated_by_user_id: ID del usuario que actualiza
            
        Returns:
            MenuItem actualizado
            
        Raises:
            ValueError: Si el menú no existe o hay errores de validación
        """
        try:
            # Obtener menú existente
            menu = self.get_menu_by_id(menu_id)
            if not menu:
                raise ValueError(f"Menú con ID {menu_id} no encontrado")
            
            # Validar cambio de código si se proporciona
            if menu_data.menu_code and menu_data.menu_code.upper() != menu.menu_code:
                if find_menu_by_code(self.session, menu_data.menu_code):
                    raise ValueError(f"El código '{menu_data.menu_code}' ya existe")
                menu.menu_code = menu_data.menu_code.upper()
            
            # Validar cambio de jerarquía
            if menu_data.parent_id is not None and menu_data.parent_id != menu.parent_id:
                is_valid, message = validate_hierarchy(menu_id, menu_data.parent_id, self.session)
                if not is_valid:
                    raise ValueError(f"Jerarquía inválida: {message}")
                
                menu.parent_id = menu_data.parent_id
                
                # Recalcular nivel
                if menu_data.parent_id:
                    menu.menu_level = calculate_menu_level(menu_data.parent_id, self.session) + 1
                else:
                    menu.menu_level = 1
            
            # Actualizar otros campos
            if menu_data.menu_name is not None:
                menu.menu_name = menu_data.menu_name
            
            if menu_data.menu_description is not None:
                menu.menu_description = menu_data.menu_description
            
            if menu_data.icon_name is not None:
                menu.icon_name = menu_data.icon_name
            
            if menu_data.icon_color is not None:
                menu.icon_color = menu_data.icon_color
            
            if menu_data.menu_url is not None:
                menu.menu_url = menu_data.menu_url
            
            if menu_data.menu_type is not None:
                menu.menu_type = menu_data.menu_type
            
            if menu_data.sort_order is not None:
                menu.sort_order = menu_data.sort_order
            
            if menu_data.is_active is not None:
                menu.is_active = menu_data.is_active
            
            if menu_data.is_visible is not None:
                menu.is_visible = menu_data.is_visible
            
            if menu_data.requires_feature is not None:
                menu.requires_feature = menu_data.requires_feature
            
            if menu_data.feature_code is not None:
                menu.feature_code = menu_data.feature_code
            
            if menu_data.target_window is not None:
                menu.target_window = menu_data.target_window
            
            if menu_data.css_classes is not None:
                menu.css_classes = menu_data.css_classes
            
            if menu_data.data_attributes is not None:
                menu.data_attributes = menu_data.data_attributes
            
            if menu_data.required_permission_id is not None:
                menu.required_permission_id = menu_data.required_permission_id
            
            if menu_data.alternative_permissions is not None:
                menu.alternative_permissions = menu_data.alternative_permissions
            
            # Actualizar timestamps
            menu.updated_at = datetime.now(timezone.utc)
            
            # Recalcular path si cambió la jerarquía
            if menu_data.parent_id is not None:
                menu.menu_path = get_menu_path(self.session, menu_id)
            
            self.session.commit()
            self.session.refresh(menu)
            
            logger.info(f"Menú actualizado: {menu.menu_code} (ID: {menu_id})")
            return menu
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error al actualizar menú {menu_id}: {e}")
            raise
    
    def delete_menu(self, menu_id: int, force_delete: bool = False) -> bool:
        """
        Eliminar menú (soft delete por defecto)
        
        Args:
            menu_id: ID del menú
            force_delete: Eliminación física
            
        Returns:
            True si se eliminó exitosamente
            
        Raises:
            ValueError: Si el menú no existe o tiene dependencias
        """
        try:
            # Obtener menú
            menu = self.get_menu_by_id(menu_id)
            if not menu:
                raise ValueError(f"Menú con ID {menu_id} no encontrado")
            
            # Verificar si tiene menús hijos
            children = get_menu_children(self.session, menu_id, active_only=False)
            if children:
                raise ValueError(f"No se puede eliminar menú con {len(children)} elementos hijos")
            
            if force_delete:
                # Eliminar físicamente
                self.session.delete(menu)
                logger.info(f"Menú eliminado físicamente: {menu.menu_code} (ID: {menu_id})")
            else:
                # Soft delete
                menu.deleted_at = datetime.now(timezone.utc)
                menu.is_active = False
                menu.is_visible = False
                logger.info(f"Menú eliminado (soft): {menu.menu_code} (ID: {menu_id})")
            
            self.session.commit()
            return True
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error al eliminar menú {menu_id}: {e}")
            raise
    
    # ==========================================
    # OPERACIONES DE JERARQUÍA
    # ==========================================
    
    def move_menu(self, menu_id: int, new_parent_id: Optional[int], new_sort_order: Optional[int] = None) -> MenuItem:
        """
        Mover menú a nueva posición jerárquica
        
        Args:
            menu_id: ID del menú a mover
            new_parent_id: Nuevo padre (None para raíz)
            new_sort_order: Nueva posición (None para agregar al final)
            
        Returns:
            MenuItem actualizado
            
        Raises:
            ValueError: Si hay errores de validación
        """
        try:
            # Validar jerarquía
            is_valid, message = validate_hierarchy(menu_id, new_parent_id, self.session)
            if not is_valid:
                raise ValueError(message)
            
            # Obtener menú
            menu = self.get_menu_by_id(menu_id)
            if not menu:
                raise ValueError(f"Menú con ID {menu_id} no encontrado")
            
            # Actualizar padre y nivel
            menu.parent_id = new_parent_id
            
            if new_parent_id:
                menu.menu_level = calculate_menu_level(new_parent_id, self.session) + 1
            else:
                menu.menu_level = 1
            
            # Actualizar orden
            if new_sort_order is not None:
                menu.sort_order = new_sort_order
            else:
                menu.sort_order = get_next_sort_order(self.session, new_parent_id)
            
            # Recalcular path
            menu.menu_path = get_menu_path(self.session, menu_id)
            menu.updated_at = datetime.now(timezone.utc)
            
            self.session.commit()
            self.session.refresh(menu)
            
            logger.info(f"Menú movido: {menu.menu_code} a padre {new_parent_id}")
            return menu
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error al mover menú {menu_id}: {e}")
            raise
    
    def reorder_children(self, parent_id: Optional[int], ordered_child_ids: List[int]) -> int:
        """
        Reordenar menús hijos
        
        Args:
            parent_id: ID del padre (None para raíz)
            ordered_child_ids: Lista ordenada de IDs
            
        Returns:
            Número de menús reordenados
            
        Raises:
            ValueError: Si hay errores de validación
        """
        try:
            # Verificar que todos los IDs sean hijos del padre especificado
            children = get_menu_children(self.session, parent_id, active_only=False)
            child_ids = {child.id for child in children}
            
            for child_id in ordered_child_ids:
                if child_id not in child_ids:
                    raise ValueError(f"Menú {child_id} no es hijo del padre {parent_id}")
            
            # Reordenar
            updated_count = 0
            for i, child_id in enumerate(ordered_child_ids):
                new_order = (i + 1) * 10
                
                stmt = select(MenuItem).where(MenuItem.id == child_id)
                result = self.session.execute(stmt)
                menu = result.scalar_one()
                
                if menu.sort_order != new_order:
                    menu.sort_order = new_order
                    menu.updated_at = datetime.now(timezone.utc)
                    updated_count += 1
            
            self.session.commit()
            
            logger.info(f"Reordenados {updated_count} menús hijos de padre {parent_id}")
            return updated_count
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error al reordenar hijos de {parent_id}: {e}")
            raise
    
    def normalize_menu_orders(self, parent_id: Optional[int] = None) -> int:
        """
        Normalizar órdenes de menús (incrementos de 10)
        
        Args:
            parent_id: ID del padre (None para todos)
            
        Returns:
            Número de menús actualizados
        """
        try:
            if parent_id is not None:
                # Normalizar solo un nivel
                updated_count = normalize_sort_order(self.session, parent_id)
            else:
                # Normalizar todos los niveles
                updated_count = 0
                
                # Obtener todos los padres únicos
                stmt = select(MenuItem.parent_id).where(
                    MenuItem.deleted_at.is_(None)
                ).distinct()
                result = self.session.execute(stmt)
                parent_ids = [row[0] for row in result]
                
                for pid in parent_ids:
                    updated_count += normalize_sort_order(self.session, pid)
            
            self.session.commit()
            
            logger.info(f"Normalizados órdenes de {updated_count} menús")
            return updated_count
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error al normalizar órdenes: {e}")
            raise
    
    # ==========================================
    # CONSULTAS Y LISTADOS
    # ==========================================
    
    def list_menus(
        self,
        parent_id: Optional[int] = None,
        active_only: bool = True,
        visible_only: bool = True,
        search: Optional[str] = None,
        limit: Optional[int] = None,
        offset: int = 0
    ) -> List[MenuItem]:
        """
        Listar menús con filtros
        
        Args:
            parent_id: Filtrar por padre
            active_only: Solo activos
            visible_only: Solo visibles
            search: Búsqueda en nombre/código
            limit: Límite de resultados
            offset: Desplazamiento
            
        Returns:
            Lista de menús
        """
        stmt = select(MenuItem).where(MenuItem.deleted_at.is_(None))
        
        if parent_id is not None:
            stmt = stmt.where(MenuItem.parent_id == parent_id)
        
        if active_only:
            stmt = stmt.where(MenuItem.is_active == True)
        
        if visible_only:
            stmt = stmt.where(MenuItem.is_visible == True)
        
        if search:
            search_term = f"%{search.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(MenuItem.menu_name).contains(search_term),
                    func.lower(MenuItem.menu_code).contains(search_term),
                    func.lower(MenuItem.menu_description).contains(search_term)
                )
            )
        
        stmt = stmt.order_by(MenuItem.menu_level, MenuItem.sort_order, MenuItem.menu_name)
        
        if limit:
            stmt = stmt.limit(limit)
        
        if offset > 0:
            stmt = stmt.offset(offset)
        
        result = self.session.execute(stmt)
        return result.scalars().all()
    
    def get_menu_tree(self, parent_id: Optional[int] = None, max_depth: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Obtener árbol jerárquico de menús
        
        Args:
            parent_id: Raíz del árbol (None para todo)
            max_depth: Profundidad máxima
            
        Returns:
            Lista de diccionarios con estructura jerárquica
        """
        def build_tree(pid: Optional[int], current_depth: int = 0) -> List[Dict[str, Any]]:
            if max_depth and current_depth >= max_depth:
                return []
            
            menus = self.list_menus(parent_id=pid, active_only=True, visible_only=True)
            tree = []
            
            for menu in menus:
                menu_dict = {
                    'id': menu.id,
                    'code': menu.menu_code,
                    'name': menu.menu_name,
                    'description': menu.menu_description,
                    'icon_name': menu.icon_name,
                    'icon_color': menu.icon_color,
                    'url': menu.menu_url,
                    'type': menu.menu_type.value,
                    'level': menu.menu_level,
                    'sort_order': menu.sort_order,
                    'children': build_tree(menu.id, current_depth + 1)
                }
                tree.append(menu_dict)
            
            return tree
        
        return build_tree(parent_id)
    
    def count_menus(self, parent_id: Optional[int] = None, active_only: bool = True) -> int:
        """
        Contar menús
        
        Args:
            parent_id: Filtrar por padre
            active_only: Solo activos
            
        Returns:
            Número de menús
        """
        stmt = select(func.count(MenuItem.id)).where(MenuItem.deleted_at.is_(None))
        
        if parent_id is not None:
            stmt = stmt.where(MenuItem.parent_id == parent_id)
        
        if active_only:
            stmt = stmt.where(MenuItem.is_active == True)
        
        result = self.session.execute(stmt)
        return result.scalar()
    
    # ==========================================
    # OPERACIONES MASIVAS
    # ==========================================
    
    def bulk_toggle_status(self, menu_ids: List[int], is_active: bool) -> Tuple[int, int]:
        """
        Activar/desactivar menús en lote
        
        Args:
            menu_ids: Lista de IDs
            is_active: Estado a aplicar
            
        Returns:
            (actualizados, errores)
        """
        try:
            updated_count = 0
            error_count = 0
            
            for menu_id in menu_ids:
                try:
                    menu = self.get_menu_by_id(menu_id)
                    if menu and menu.is_active != is_active:
                        menu.is_active = is_active
                        menu.updated_at = datetime.now(timezone.utc)
                        updated_count += 1
                except Exception:
                    error_count += 1
            
            self.session.commit()
            
            logger.info(f"Operación masiva: {updated_count} actualizados, {error_count} errores")
            return updated_count, error_count
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error en operación masiva: {e}")
            raise