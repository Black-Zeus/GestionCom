// ===========================
// ESTADO GLOBAL
// ===========================
let appData = {
    roles: [],
    permissions: [],
    rolePermissions: [],
    userRoles: [],
    userPermissions: [],
    menuItemPermissions: [],
    permissionAuditLog: [],
    users: []
};

let currentFilters = {
    roles: {},
    permissions: {},
    userRoles: {},
    audit: {}
};

let pagination = {
    roles: { currentPage: 1, itemsPerPage: 10 },
    permissions: { currentPage: 1, itemsPerPage: 10 },
    userRoles: { currentPage: 1, itemsPerPage: 10 },
    audit: { currentPage: 1, itemsPerPage: 15 }
};

// ===========================
// INICIALIZACIÓN
// ===========================
document.addEventListener('DOMContentLoaded', async () => {
    const data = await loadData();
    if (data) {
        appData = data;
        initializeApp();
    } else {
        showNotification('Error al cargar los datos', 'error');
    }
});

function initializeApp() {
    renderRolesTable();
    renderPermissionsTable();
    renderUserRolesTable();
    renderAuditTable();
    populateFilters();
    populateFormSelects();
    initializeForms();
}

// ===========================
// RENDERIZADO DE TABLAS
// ===========================

// Roles
function renderRolesTable() {
    const tbody = document.getElementById('roles-table-body');
    const filtered = applyRolesFilters();
    const paginated = paginateData(filtered, pagination.roles);
    
    tbody.innerHTML = paginated.map(role => `
        <tr>
            <td><strong>${role.role_code}</strong></td>
            <td>${role.role_name}</td>
            <td>${role.role_description || '-'}</td>
            <td>${role.is_system_role ? '<span class="badge badge-system">Sistema</span>' : '<span class="badge badge-custom">Personalizado</span>'}</td>
            <td>${renderStatusIndicator(role.is_active)}</td>
            <td>
                <div class="actions-cell">
                    <button class="btn-action" onclick="viewRolePermissions(${role.id})">Ver Permisos</button>
                    <button class="btn-action" onclick="toggleRoleStatus(${role.id})">${role.is_active ? 'Desactivar' : 'Activar'}</button>
                </div>
            </td>
        </tr>
    `).join('');
    
    const totalPages = Math.ceil(filtered.length / pagination.roles.itemsPerPage);
    renderPagination('roles-pagination', pagination.roles.currentPage, totalPages, 'changeRolesPage');
}

function applyRolesFilters() {
    return appData.roles.filter(role => {
        if (currentFilters.roles.name && !role.role_name.toLowerCase().includes(currentFilters.roles.name.toLowerCase())) {
            return false;
        }
        if (currentFilters.roles.status !== undefined && role.is_active !== currentFilters.roles.status) {
            return false;
        }
        return !role.deleted_at;
    });
}

function changeRolesPage(page) {
    pagination.roles.currentPage = page;
    renderRolesTable();
}

// Permisos
function renderPermissionsTable() {
    const tbody = document.getElementById('permissions-table-body');
    const filtered = applyPermissionsFilters();
    const paginated = paginateData(filtered, pagination.permissions);
    
    tbody.innerHTML = paginated.map(perm => `
        <tr>
            <td><strong>${perm.permission_code}</strong></td>
            <td>${perm.permission_name}</td>
            <td><span class="permission-category">${perm.category || '-'}</span></td>
            <td>${perm.permission_description || '-'}</td>
            <td>${renderStatusIndicator(perm.is_active)}</td>
        </tr>
    `).join('');
    
    const totalPages = Math.ceil(filtered.length / pagination.permissions.itemsPerPage);
    renderPagination('permissions-pagination', pagination.permissions.currentPage, totalPages, 'changePermissionsPage');
}

function applyPermissionsFilters() {
    return appData.permissions.filter(perm => {
        if (currentFilters.permissions.name && !perm.permission_name.toLowerCase().includes(currentFilters.permissions.name.toLowerCase())) {
            return false;
        }
        if (currentFilters.permissions.category && perm.category !== currentFilters.permissions.category) {
            return false;
        }
        return !perm.deleted_at;
    });
}

function changePermissionsPage(page) {
    pagination.permissions.currentPage = page;
    renderPermissionsTable();
}

// User-Roles: Mostrar todos los usuarios con sus roles asignados
function renderUserRolesTable() {
    const tbody = document.getElementById('user-roles-table-body');
    const filtered = applyUserRolesFilters();
    const paginated = paginateData(filtered, pagination.userRoles);
    
    tbody.innerHTML = paginated.map(user => {
        // Obtener todos los roles del usuario
        const userRoleAssignments = appData.userRoles.filter(ur => ur.user_id === user.id);
        
        let rolesHTML = '';
        if (userRoleAssignments.length === 0) {
            rolesHTML = '<span class="no-roles-assigned">Sin roles asignados</span>';
        } else {
            rolesHTML = '<div class="user-roles-list">';
            userRoleAssignments.forEach(ur => {
                const role = appData.roles.find(r => r.id === ur.role_id);
                rolesHTML += `
                    <div class="user-role-item">
                        <span class="user-role-badge">${role?.role_name || 'N/A'}</span>
                        <span class="user-role-date">${formatDate(ur.assigned_at)}</span>
                    </div>
                `;
            });
            rolesHTML += '</div>';
        }
        
        return `
            <tr>
                <td>
                    <div class="user-info">
                        <span class="user-name">${user.first_name} ${user.last_name}</span>
                    </div>
                </td>
                <td>${user.rut || '-'}</td>
                <td>${user.email || '-'}</td>
                <td>${rolesHTML}</td>
                <td>${renderStatusIndicator(user.is_active)}</td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-action" onclick="manageUserRoles(${user.id})">Gestionar Roles</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    const totalPages = Math.ceil(filtered.length / pagination.userRoles.itemsPerPage);
    renderPagination('user-roles-pagination', pagination.userRoles.currentPage, totalPages, 'changeUserRolesPage');
}

function applyUserRolesFilters() {
    return appData.users.filter(user => {
        if (currentFilters.userRoles.userName) {
            const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
            const rut = user.rut?.toLowerCase() || '';
            const email = user.email?.toLowerCase() || '';
            const searchTerm = currentFilters.userRoles.userName.toLowerCase();
            
            if (!fullName.includes(searchTerm) && !rut.includes(searchTerm) && !email.includes(searchTerm)) {
                return false;
            }
        }
        
        if (currentFilters.userRoles.role) {
            const hasRole = appData.userRoles.some(ur => 
                ur.user_id === user.id && ur.role_id === parseInt(currentFilters.userRoles.role)
            );
            if (!hasRole) return false;
        }
        
        if (currentFilters.userRoles.status !== undefined && user.is_active !== currentFilters.userRoles.status) {
            return false;
        }
        
        return !user.deleted_at;
    });
}

function changeUserRolesPage(page) {
    pagination.userRoles.currentPage = page;
    renderUserRolesTable();
}

// Auditoría
function renderAuditTable() {
    const tbody = document.getElementById('audit-table-body');
    const filtered = applyAuditFilters();
    const paginated = paginateData(filtered, pagination.audit);
    
    tbody.innerHTML = paginated.map(log => {
        const actor = appData.users.find(u => u.id === log.actor_user_id);
        const target = appData.users.find(u => u.id === log.target_user_id);
        
        let actionClass = '';
        if (log.action_type.includes('ASSIGN') || log.action_type.includes('GRANT')) actionClass = 'assign';
        if (log.action_type.includes('REVOKE')) actionClass = 'revoke';
        
        return `
            <tr>
                <td>${formatDate(log.created_at)}</td>
                <td><span class="audit-action ${actionClass}">${log.action_type}</span></td>
                <td>${actor ? `${actor.first_name} ${actor.last_name}` : 'Sistema'}</td>
                <td>${target ? `${target.first_name} ${target.last_name}` : '-'}</td>
                <td><span class="audit-description" title="${log.description || ''}">${log.description || '-'}</span></td>
                <td>
                    <button class="btn-action" onclick="viewAuditDetail(${log.id})">Ver Detalle</button>
                </td>
            </tr>
        `;
    }).join('');
    
    const totalPages = Math.ceil(filtered.length / pagination.audit.itemsPerPage);
    renderPagination('audit-pagination', pagination.audit.currentPage, totalPages, 'changeAuditPage');
}

function applyAuditFilters() {
    return appData.permissionAuditLog.filter(log => {
        if (currentFilters.audit.actor) {
            const actor = appData.users.find(u => u.id === log.actor_user_id);
            const fullName = `${actor?.first_name} ${actor?.last_name}`.toLowerCase();
            if (!fullName.includes(currentFilters.audit.actor.toLowerCase())) {
                return false;
            }
        }
        if (currentFilters.audit.action && log.action_type !== currentFilters.audit.action) {
            return false;
        }
        
        // Filtro por rango de fechas
        if (currentFilters.audit.dateFrom) {
            const logDate = new Date(log.created_at);
            const fromDate = new Date(currentFilters.audit.dateFrom);
            if (logDate < fromDate) return false;
        }
        if (currentFilters.audit.dateTo) {
            const logDate = new Date(log.created_at);
            const toDate = new Date(currentFilters.audit.dateTo);
            toDate.setHours(23, 59, 59, 999); // Incluir todo el día
            if (logDate > toDate) return false;
        }
        
        return true;
    });
}

function changeAuditPage(page) {
    pagination.audit.currentPage = page;
    renderAuditTable();
}

// ===========================
// FILTROS
// ===========================
function applyFilters(section) {
    switch(section) {
        case 'roles':
            currentFilters.roles = {
                name: document.getElementById('filter-role-name').value,
                status: document.getElementById('filter-role-status').value ? parseInt(document.getElementById('filter-role-status').value) : undefined
            };
            pagination.roles.currentPage = 1;
            renderRolesTable();
            break;
        case 'permissions':
            currentFilters.permissions = {
                name: document.getElementById('filter-permission-name').value,
                category: document.getElementById('filter-permission-category').value
            };
            pagination.permissions.currentPage = 1;
            renderPermissionsTable();
            break;
        case 'user-roles':
            currentFilters.userRoles = {
                userName: document.getElementById('filter-user-name').value,
                role: document.getElementById('filter-user-role').value,
                status: document.getElementById('filter-user-status').value ? parseInt(document.getElementById('filter-user-status').value) : undefined
            };
            pagination.userRoles.currentPage = 1;
            renderUserRolesTable();
            break;
        case 'audit':
            currentFilters.audit = {
                actor: document.getElementById('filter-audit-actor').value,
                action: document.getElementById('filter-audit-action').value,
                dateFrom: document.getElementById('filter-audit-date-from').value,
                dateTo: document.getElementById('filter-audit-date-to').value
            };
            pagination.audit.currentPage = 1;
            renderAuditTable();
            break;
    }
}

function populateFilters() {
    // Categorías de permisos
    const categories = [...new Set(appData.permissions.map(p => p.category).filter(Boolean))];
    const categorySelect = document.getElementById('filter-permission-category');
    
    categories.forEach(cat => {
        categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
    
    // Roles para filtro de usuarios-roles
    const userRoleSelect = document.getElementById('filter-user-role');
    
    appData.roles.filter(r => !r.deleted_at).forEach(role => {
        userRoleSelect.innerHTML += `<option value="${role.id}">${role.role_name}</option>`;
    });
}

// ===========================
// FORMULARIOS
// ===========================
function populateFormSelects() {
    // No hay selects de formulario que poblar en esta versión
    // Los roles se manejan mediante checkboxes en el modal de usuario
}

function initializeForms() {
    // Form Rol
    document.getElementById('role-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveRole();
    });
}

// ===========================
// OPERACIONES CRUD
// ===========================

// Roles
function toggleRoleStatus(id) {
    const role = appData.roles.find(r => r.id === id);
    if (role) {
        role.is_active = !role.is_active;
        role.updated_at = new Date().toISOString();
        showNotification(role.is_active ? 'Rol activado correctamente' : 'Rol desactivado correctamente');
        renderRolesTable();
    }
}

function viewRolePermissions(roleId) {
    const role = appData.roles.find(r => r.id === roleId);
    if (!role) return;
    
    // Configurar título y datos del modal
    document.getElementById('role-permissions-modal-title').textContent = `Permisos del Rol: ${role.role_name}`;
    document.getElementById('rp-role-name').textContent = role.role_name;
    document.getElementById('rp-role-description').textContent = role.role_description || 'Sin descripción';
    
    // Agrupar permisos por categoría
    const categories = [...new Set(appData.permissions.map(p => p.category).filter(Boolean))];
    const permissionsGrid = document.getElementById('permissions-grid');
    
    permissionsGrid.innerHTML = '';
    
    categories.forEach(category => {
        const categoryPerms = appData.permissions.filter(p => p.category === category);
        
        let categoryHTML = `
            <div class="permission-category-group">
                <div class="permission-category-header">${category}</div>
                <div class="permission-items">
        `;
        
        categoryPerms.forEach(perm => {
            const roleHasPerm = appData.rolePermissions.find(
                rp => rp.role_id === roleId && rp.permission_id === perm.id && rp.is_allowed
            );
            
            categoryHTML += `
                <div class="permission-item">
                    <input type="checkbox" 
                           id="perm-${perm.id}" 
                           value="${perm.id}" 
                           ${roleHasPerm ? 'checked' : ''}
                           data-role-id="${roleId}">
                    <label for="perm-${perm.id}">${perm.permission_name}</label>
                </div>
            `;
        });
        
        categoryHTML += `
                </div>
            </div>
        `;
        
        permissionsGrid.innerHTML += categoryHTML;
    });
    
    openModal('role-permissions-modal');
}

function saveRolePermissions() {
    const checkboxes = document.querySelectorAll('#permissions-grid input[type="checkbox"]');
    const roleId = parseInt(checkboxes[0]?.dataset.roleId);
    
    if (!roleId) return;
    
    // Eliminar permisos previos del rol
    appData.rolePermissions = appData.rolePermissions.filter(rp => rp.role_id !== roleId);
    
    // Agregar permisos marcados
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const newRP = {
                id: Math.max(...appData.rolePermissions.map(rp => rp.id), 0) + 1,
                role_id: roleId,
                permission_id: parseInt(checkbox.value),
                is_allowed: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            appData.rolePermissions.push(newRP);
        }
    });
    
    showNotification('Permisos del rol actualizados correctamente');
    closeModal('role-permissions-modal');
}

function saveRole() {
    const form = document.getElementById('role-form');
    
    const roleData = {
        role_code: document.getElementById('role-code').value,
        role_name: document.getElementById('role-name').value,
        role_description: document.getElementById('role-description').value,
        is_system_role: document.getElementById('role-is-system').checked,
        is_active: document.getElementById('role-is-active').checked
    };
    
    // Validar que el código no exista
    const codeExists = appData.roles.some(r => r.role_code === roleData.role_code && !r.deleted_at);
    if (codeExists) {
        alert('Ya existe un rol con ese código');
        return;
    }
    
    // Crear nuevo rol
    const newRole = {
        id: Math.max(...appData.roles.map(r => r.id)) + 1,
        ...roleData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null
    };
    appData.roles.push(newRole);
    showNotification('Rol creado correctamente');
    
    closeModal('role-modal');
    renderRolesTable();
}

// Permisos - Sin operaciones CRUD (solo lectura)

// User-Roles
function manageUserRoles(userId) {
    const user = appData.users.find(u => u.id === userId);
    if (!user) return;
    
    // Configurar información del usuario
    document.getElementById('user-roles-modal-title').textContent = `Gestionar Roles: ${user.first_name} ${user.last_name}`;
    document.getElementById('ur-user-name').textContent = `${user.first_name} ${user.last_name}`;
    document.getElementById('ur-user-rut').textContent = user.rut || 'Sin RUT';
    
    // Obtener roles actuales del usuario
    const userCurrentRoles = appData.userRoles
        .filter(ur => ur.user_id === userId)
        .map(ur => ur.role_id);
    
    // Generar checkboxes de roles
    const rolesCheckboxes = document.getElementById('roles-checkboxes');
    rolesCheckboxes.innerHTML = '';
    
    appData.roles.filter(r => !r.deleted_at && r.is_active).forEach(role => {
        const isChecked = userCurrentRoles.includes(role.id);
        
        rolesCheckboxes.innerHTML += `
            <div class="checkbox-item">
                <input type="checkbox" 
                       id="role-${role.id}" 
                       value="${role.id}" 
                       data-user-id="${userId}"
                       ${isChecked ? 'checked' : ''}>
                <label for="role-${role.id}">
                    <strong>${role.role_name}</strong> - ${role.role_description || 'Sin descripción'}
                </label>
            </div>
        `;
    });
    
    openModal('user-roles-modal');
}

function saveUserRoles() {
    const checkboxes = document.querySelectorAll('#roles-checkboxes input[type="checkbox"]');
    const userId = parseInt(checkboxes[0]?.dataset.userId);
    
    if (!userId) return;
    
    // Eliminar roles previos del usuario
    appData.userRoles = appData.userRoles.filter(ur => ur.user_id !== userId);
    
    // Agregar roles marcados
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const newUR = {
                id: Math.max(...appData.userRoles.map(ur => ur.id), 0) + 1,
                user_id: userId,
                role_id: parseInt(checkbox.value),
                assigned_by: 1, // Usuario actual simulado
                assigned_at: new Date().toISOString()
            };
            appData.userRoles.push(newUR);
        }
    });
    
    showNotification('Roles del usuario actualizados correctamente');
    closeModal('user-roles-modal');
    renderUserRolesTable();
}

// Auditoría
function viewAuditDetail(logId) {
    const log = appData.permissionAuditLog.find(l => l.id === logId);
    if (!log) return;
    
    const actor = appData.users.find(u => u.id === log.actor_user_id);
    const target = appData.users.find(u => u.id === log.target_user_id);
    const role = appData.roles.find(r => r.id === log.target_role_id);
    const permission = appData.permissions.find(p => p.id === log.permission_id);
    
    const detailContent = document.getElementById('audit-detail-content');
    detailContent.innerHTML = `
        <div class="audit-detail-label">Fecha y Hora:</div>
        <div class="audit-detail-value">${formatDate(log.created_at)}</div>
        
        <div class="audit-detail-label">Tipo de Acción:</div>
        <div class="audit-detail-value"><span class="audit-action ${log.action_type.includes('ASSIGN') || log.action_type.includes('GRANT') ? 'assign' : 'revoke'}">${log.action_type}</span></div>
        
        <div class="audit-detail-label">Realizado Por:</div>
        <div class="audit-detail-value">${actor ? `${actor.first_name} ${actor.last_name} (${actor.email})` : 'Sistema'}</div>
        
        <div class="audit-detail-label">Usuario Afectado:</div>
        <div class="audit-detail-value">${target ? `${target.first_name} ${target.last_name} (${target.email})` : '-'}</div>
        
        <div class="audit-detail-label">Rol Afectado:</div>
        <div class="audit-detail-value">${role ? role.role_name : '-'}</div>
        
        <div class="audit-detail-label">Permiso Afectado:</div>
        <div class="audit-detail-value">${permission ? permission.permission_name : '-'}</div>
        
        <div class="audit-detail-label">Descripción:</div>
        <div class="audit-detail-value">${log.description || '-'}</div>
        
        <div class="audit-detail-label">Metadata:</div>
        <div class="audit-detail-value"><pre>${log.metadata ? JSON.stringify(log.metadata, null, 2) : '-'}</pre></div>
    `;
    
    openModal('audit-detail-modal');
}

// ===========================
// UTILIDADES
// ===========================
function paginateData(data, paginationObj) {
    const startIndex = (paginationObj.currentPage - 1) * paginationObj.itemsPerPage;
    const endIndex = startIndex + paginationObj.itemsPerPage;
    return data.slice(startIndex, endIndex);
}