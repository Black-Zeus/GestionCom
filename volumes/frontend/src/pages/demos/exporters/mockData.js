/**
 * Datos de prueba para demos de exportadores
 * Incluye diferentes tipos de datos y estructuras para testing
 */

// Usuarios básicos
export const basicUsers = [
    {
        id: 1,
        name: "Ana García",
        email: "ana.garcia@empresa.com",
        department: "Ventas",
        salary: 85000,
        startDate: new Date("2020-03-15"),
        active: true,
        performance: 4.5
    },
    {
        id: 2,
        name: "Carlos López",
        email: "carlos.lopez@empresa.com",
        department: "IT",
        salary: 95000,
        startDate: new Date("2019-08-22"),
        active: true,
        performance: 4.8
    },
    {
        id: 3,
        name: "María Rodríguez",
        email: "maria.rodriguez@empresa.com",
        department: "Marketing",
        salary: 75000,
        startDate: new Date("2021-01-10"),
        active: false,
        performance: 4.2
    },
    {
        id: 4,
        name: "Juan Martínez",
        email: "juan.martinez@empresa.com",
        department: "Finanzas",
        salary: 90000,
        startDate: new Date("2018-11-05"),
        active: true,
        performance: 4.6
    },
    {
        id: 5,
        name: "Laura Fernández",
        email: "laura.fernandez@empresa.com",
        department: "RRHH",
        salary: 70000,
        startDate: new Date("2022-02-28"),
        active: true,
        performance: 4.3
    }
];

// Definición de columnas para usuarios
export const userColumns = [
    {
        key: "id",
        header: "ID",
        formatter: (value) => `#${value.toString().padStart(3, '0')}`
    },
    {
        key: "name",
        header: "Nombre Completo"
    },
    {
        key: "email",
        header: "Correo Electrónico"
    },
    {
        key: "department",
        header: "Departamento"
    },
    {
        key: "salary",
        header: "Salario",
        formatter: (value) => new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(value)
    },
    {
        key: "startDate",
        header: "Fecha de Inicio",
        formatter: (value) => value instanceof Date ? value.toLocaleDateString('es-ES') : value
    },
    {
        key: "active",
        header: "Estado",
        formatter: (value) => value ? "Activo" : "Inactivo"
    },
    {
        key: "performance",
        header: "Rendimiento",
        formatter: (value) => `${value}/5.0`
    }
];

// Datos de ventas
export const salesData = [
    {
        month: "Enero",
        revenue: 125000,
        expenses: 45000,
        profit: 80000,
        customers: 245,
        products: 1520,
        region: "Norte"
    },
    {
        month: "Febrero",
        revenue: 135000,
        expenses: 48000,
        profit: 87000,
        customers: 267,
        products: 1680,
        region: "Norte"
    },
    {
        month: "Marzo",
        revenue: 142000,
        expenses: 52000,
        profit: 90000,
        customers: 289,
        products: 1750,
        region: "Sur"
    },
    {
        month: "Abril",
        revenue: 158000,
        expenses: 55000,
        profit: 103000,
        customers: 312,
        products: 1890,
        region: "Sur"
    },
    {
        month: "Mayo",
        revenue: 167000,
        expenses: 58000,
        profit: 109000,
        customers: 334,
        products: 1950,
        region: "Este"
    }
];

// Columnas para datos de ventas
export const salesColumns = [
    { key: "month", header: "Mes" },
    {
        key: "revenue",
        header: "Ingresos",
        formatter: (value) => new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(value)
    },
    {
        key: "expenses",
        header: "Gastos",
        formatter: (value) => new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(value)
    },
    {
        key: "profit",
        header: "Beneficio",
        formatter: (value) => new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(value)
    },
    { key: "customers", header: "Clientes" },
    { key: "products", header: "Productos Vendidos" },
    { key: "region", header: "Región" }
];

// Datos de inventario
export const inventoryData = [
    {
        sku: "PROD001",
        name: "Laptop HP EliteBook",
        category: "Electrónicos",
        stock: 45,
        price: 899.99,
        supplier: "HP Inc.",
        lastUpdate: new Date("2024-12-15"),
        status: "En Stock"
    },
    {
        sku: "PROD002",
        name: "Monitor Dell 24\"",
        category: "Electrónicos",
        stock: 23,
        price: 299.99,
        supplier: "Dell Technologies",
        lastUpdate: new Date("2024-12-14"),
        status: "Bajo Stock"
    },
    {
        sku: "PROD003",
        name: "Teclado Mecánico",
        category: "Accesorios",
        stock: 0,
        price: 129.99,
        supplier: "Logitech",
        lastUpdate: new Date("2024-12-10"),
        status: "Sin Stock"
    },
    {
        sku: "PROD004",
        name: "Mouse Inalámbrico",
        category: "Accesorios",
        stock: 78,
        price: 49.99,
        supplier: "Logitech",
        lastUpdate: new Date("2024-12-16"),
        status: "En Stock"
    }
];

// Columnas para inventario
export const inventoryColumns = [
    { key: "sku", header: "SKU" },
    { key: "name", header: "Nombre del Producto" },
    { key: "category", header: "Categoría" },
    {
        key: "stock",
        header: "Stock",
        formatter: (value) => value === 0 ? "Sin stock" : value.toString()
    },
    {
        key: "price",
        header: "Precio",
        formatter: (value) => new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(value)
    },
    { key: "supplier", header: "Proveedor" },
    {
        key: "lastUpdate",
        header: "Última Actualización",
        formatter: (value) => value instanceof Date ? value.toLocaleDateString('es-ES') : value
    },
    {
        key: "status",
        header: "Estado",
        formatter: (value, row) => {
            if (row.stock === 0) return "❌ Sin Stock";
            if (row.stock < 30) return "⚠️ Bajo Stock";
            return "✅ En Stock";
        }
    }
];

// Datos complejos con objetos anidados
export const complexData = [
    {
        id: 1,
        customer: {
            name: "Empresa ABC",
            contact: {
                email: "contacto@empresaabc.com",
                phone: "+34 900 123 456"
            },
            address: {
                street: "Calle Principal 123",
                city: "Madrid",
                postal: "28001"
            }
        },
        orders: [
            { id: "ORD001", amount: 1500, date: new Date("2024-12-01") },
            { id: "ORD002", amount: 2300, date: new Date("2024-12-10") }
        ],
        metadata: {
            source: "web",
            campaign: "email_marketing",
            tags: ["premium", "enterprise"]
        }
    },
    {
        id: 2,
        customer: {
            name: "Tech Solutions Ltd",
            contact: {
                email: "info@techsolutions.com",
                phone: "+34 900 654 321"
            },
            address: {
                street: "Avenida Tecnológica 456",
                city: "Barcelona",
                postal: "08001"
            }
        },
        orders: [
            { id: "ORD003", amount: 890, date: new Date("2024-11-15") }
        ],
        metadata: {
            source: "referral",
            campaign: "partner_program",
            tags: ["startup", "tech"]
        }
    }
];

// Columnas para datos complejos (aplanados)
export const complexColumns = [
    { key: "id", header: "ID Cliente" },
    { key: "customer.name", header: "Empresa" },
    { key: "customer.contact.email", header: "Email" },
    { key: "customer.contact.phone", header: "Teléfono" },
    { key: "customer.address.city", header: "Ciudad" },
    {
        key: "orders",
        header: "Órdenes",
        formatter: (orders) => orders ? orders.length : 0
    },
    {
        key: "metadata.tags",
        header: "Tags",
        formatter: (tags) => Array.isArray(tags) ? tags.join(", ") : ""
    }
];

// Multiple datasets para demostrar exportación múltiple
export const multipleDatasets = [
    {
        name: "Empleados",
        data: basicUsers,
        columns: userColumns
    },
    {
        name: "Ventas 2024",
        data: salesData,
        columns: salesColumns
    },
    {
        name: "Inventario",
        data: inventoryData,
        columns: inventoryColumns
    }
];

// Configuración de branding corporativo
export const corporateBranding = {
    orgName: "TechCorp Solutions",
    createdBy: "Sistema de Reportes",
    footerText: "Documento confidencial - Uso interno únicamente",
    primaryColor: "#2563eb",
    secondaryColor: "#f1f5f9",
    textColor: "#1e293b",
    pageNumbers: true,
    watermark: false,
    logoPosition: "top-right"
};

// Templates predefinidos
export const templates = {
    employeeReport: {
        title: "Reporte de Empleados",
        subtitle: "Listado completo del personal",
        data: basicUsers,
        columns: userColumns,
        branding: corporateBranding,
        options: {
            includeHeaders: true,
            includeMetadata: true
        }
    },

    salesReport: {
        title: "Informe de Ventas Q4 2024",
        subtitle: "Análisis de rendimiento comercial",
        data: salesData,
        columns: salesColumns,
        branding: corporateBranding,
        options: {
            includeHeaders: true,
            includeSummary: true
        }
    },

    inventoryReport: {
        title: "Estado del Inventario",
        subtitle: "Control de stock actualizado",
        data: inventoryData,
        columns: inventoryColumns,
        branding: corporateBranding,
        options: {
            includeHeaders: true,
            compactMode: true
        }
    }
};

// Datos grandes para testing de rendimiento
export const generateLargeDataset = (size = 1000) => {
    const departments = ["IT", "Ventas", "Marketing", "Finanzas", "RRHH", "Operaciones"];
    const names = ["Ana", "Carlos", "María", "Juan", "Laura", "Pedro", "Elena", "Miguel"];
    const surnames = ["García", "López", "Rodríguez", "Martínez", "Fernández", "González"];

    return Array.from({ length: size }, (_, index) => ({
        id: index + 1,
        name: `${names[index % names.length]} ${surnames[index % surnames.length]}`,
        email: `user${index + 1}@empresa.com`,
        department: departments[index % departments.length],
        salary: Math.floor(Math.random() * 50000) + 40000,
        startDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        active: Math.random() > 0.1,
        performance: Math.round((Math.random() * 2 + 3) * 10) / 10
    }));
};

// Datos con tipos especiales para testing
export const specialTypesData = [
    {
        id: 1,
        nullValue: null,
        undefinedValue: undefined,
        emptyString: "",
        zeroNumber: 0,
        booleanTrue: true,
        booleanFalse: false,
        dateValue: new Date("2024-12-20"),
        objectValue: { nested: "value", array: [1, 2, 3] },
        arrayValue: ["item1", "item2", "item3"],
        longText: "Este es un texto muy largo que debería ser truncado en algunos formatos de exportación para evitar problemas de formato y legibilidad",
        specialChars: "Caracteres especiales: áéíóú ñ ¿¡ \"comillas\" 'apostrofes' & ampersand",
        numberWithDecimals: 123.456789,
        largeNumber: 1234567890,
        negativeNumber: -456.78
    }
];

// URLs de prueba para DownloadButton
export const downloadUrls = {
    pdf: "/data1.pdf",
    image: "https://picsum.photos/800/600",
    json: "https://jsonplaceholder.typicode.com/users",
    smallFile: "data:text/plain;base64,SGVsbG8gV29ybGQh", // "Hello World!"
    mediumFile: "https://httpbin.org/bytes/1024", // 1KB
    largeFile: "https://httpbin.org/bytes/10240" // 10KB
};

// Simulador de delay para demos
export const simulateDelay = (ms = 2000) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// Utilidades para generar datos aleatorios
export const dataGenerators = {
    randomUser: () => {
        const names = ["Ana", "Carlos", "María", "Juan", "Laura"];
        const surnames = ["García", "López", "Rodríguez", "Martínez"];
        const departments = ["IT", "Ventas", "Marketing", "Finanzas"];

        return {
            id: Math.floor(Math.random() * 10000),
            name: `${names[Math.floor(Math.random() * names.length)]} ${surnames[Math.floor(Math.random() * surnames.length)]}`,
            email: `user${Math.floor(Math.random() * 1000)}@empresa.com`,
            department: departments[Math.floor(Math.random() * departments.length)],
            salary: Math.floor(Math.random() * 50000) + 40000,
            startDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            active: Math.random() > 0.2,
            performance: Math.round((Math.random() * 2 + 3) * 10) / 10
        };
    },

    randomSalesData: () => {
        const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio"];
        const regions = ["Norte", "Sur", "Este", "Oeste"];

        return {
            month: months[Math.floor(Math.random() * months.length)],
            revenue: Math.floor(Math.random() * 100000) + 50000,
            expenses: Math.floor(Math.random() * 30000) + 20000,
            profit: Math.floor(Math.random() * 70000) + 30000,
            customers: Math.floor(Math.random() * 200) + 100,
            products: Math.floor(Math.random() * 1000) + 500,
            region: regions[Math.floor(Math.random() * regions.length)]
        };
    }
};

export default {
    basicUsers,
    userColumns,
    salesData,
    salesColumns,
    inventoryData,
    inventoryColumns,
    complexData,
    complexColumns,
    multipleDatasets,
    corporateBranding,
    templates,
    generateLargeDataset,
    specialTypesData,
    downloadUrls,
    simulateDelay,
    dataGenerators
};