// ====================================
// volumes/frontend/src/data/mockData.js
// Datos mock del usuario basados en el schema UserResponse del backend
// ====================================

export const mockUserData = {
    // Información personal básica
    personal: {
        id: 1,
        username: "admin.demo",
        email: "admin@inventario.local",
        first_name: "Administrador",
        last_name: "Sistema",
        full_name: "Administrador Sistema",
        display_name: "Admin Demo",
        initials: "AS",
        phone: "+56 9 1234 5678"
    },

    // Información de cuenta y seguridad
    account: {
        is_active: true,
        is_authenticated: true,
        last_login_at: "2025-01-14T10:30:45.123456Z",
        last_login_ip: "192.168.1.100",
        password_changed_at: "2024-12-15T14:20:30.123456Z",
        password_age_days: 30,
        needs_password_change: false,
        has_recent_login: true,
        created_at: "2024-06-01T09:00:00.000000Z",
        updated_at: "2025-01-14T10:30:45.123456Z"
    },

    // Roles y permisos
    roles: {
        role_names: ["Administrador", "Gerente"],
        permission_codes: [
            "USER_READ",
            "USER_WRITE",
            "USER_MANAGER",
            "PRODUCT_READ",
            "PRODUCT_WRITE",
            "INVENTORY_READ",
            "INVENTORY_WRITE",
            "SALES_READ",
            "SALES_WRITE",
            "REPORTS_READ",
            "WAREHOUSE_ACCESS",
            "CASH_REGISTER"
        ],
        has_admin_role: true,
        has_manager_role: true,
        is_cashier: false,
        is_supervisor: true,
        warehouse_count: 3,
        responsible_warehouse_count: 1,
        petty_cash_limit: 500000
    },

    // Información de bodegas
    warehouses: {
        total_warehouses: 3,
        full_access_count: 2,
        read_only_count: 1,
        denied_count: 0,
        responsible_warehouses: [
            {
                id: 1,
                name: "Bodega Principal",
                location: "Santiago Centro",
                type: "MAIN",
                is_active: true
            }
        ],
        warehouse_accesses: [
            {
                id: 1,
                warehouse: {
                    id: 1,
                    name: "Bodega Principal",
                    location: "Santiago Centro",
                    type: "MAIN"
                },
                access_type: "FULL",
                granted_at: "2024-06-01T09:00:00.000000Z",
                reason: "Responsable principal de la bodega"
            },
            {
                id: 2,
                warehouse: {
                    id: 2,
                    name: "Sucursal Las Condes",
                    location: "Las Condes",
                    type: "BRANCH"
                },
                access_type: "FULL",
                granted_at: "2024-06-15T10:00:00.000000Z",
                reason: "Acceso administrativo completo"
            },
            {
                id: 3,
                warehouse: {
                    id: 3,
                    name: "Bodega Tránsito",
                    location: "Pudahuel",
                    type: "TRANSIT"
                },
                access_type: "READ_ONLY",
                granted_at: "2024-07-01T11:00:00.000000Z",
                reason: "Solo consulta para reportes"
            }
        ]
    }
};

// Función helper para generar datos mock adicionales si es necesario
export const generateMockUserData = (overrides = {}) => {
    return {
        ...mockUserData,
        ...overrides
    };
};

// Datos mock para otros usuarios (para testing)
export const mockUsersData = [
    {
        ...mockUserData,
        personal: {
            ...mockUserData.personal,
            id: 2,
            username: "gerente.ventas",
            email: "gerente@inventario.local",
            first_name: "María",
            last_name: "González",
            full_name: "María González",
            display_name: "María G.",
            initials: "MG",
            phone: "+56 9 8765 4321"
        },
        roles: {
            ...mockUserData.roles,
            role_names: ["Gerente"],
            has_admin_role: false,
            has_manager_role: true,
            is_supervisor: true,
            warehouse_count: 2,
            responsible_warehouse_count: 0,
            petty_cash_limit: 200000
        }
    },
    {
        ...mockUserData,
        personal: {
            ...mockUserData.personal,
            id: 3,
            username: "cajero.principal",
            email: "cajero@inventario.local",
            first_name: "Juan",
            last_name: "Pérez",
            full_name: "Juan Pérez",
            display_name: "Juan P.",
            initials: "JP",
            phone: "+56 9 5555 6666"
        },
        roles: {
            role_names: ["Cajero"],
            permission_codes: ["SALES_READ", "SALES_WRITE", "CASH_REGISTER"],
            has_admin_role: false,
            has_manager_role: false,
            is_cashier: true,
            is_supervisor: false,
            warehouse_count: 1,
            responsible_warehouse_count: 0,
            petty_cash_limit: 50000
        }
    }
];

export default mockUserData;