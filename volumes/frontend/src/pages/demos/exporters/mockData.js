// Datos de prueba simplificados para demos de exportación y descarga

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

// Columnas para usuarios
export const userColumns = [
    {
        key: "id",
        header: "ID",
        formatter: (value) => `#${value.toString().padStart(3, '0')}`
    },
    {
        key: "name",
        header: "Nombre"
    },
    {
        key: "email",
        header: "Email"
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
        header: "Fecha Inicio",
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
        revenue: 150000,
        expenses: 45000,
        profit: 105000,
        customers: 250,
        products: 1200
    },
    {
        month: "Febrero",
        revenue: 180000,
        expenses: 52000,
        profit: 128000,
        customers: 300,
        products: 1450
    },
    {
        month: "Marzo",
        revenue: 165000,
        expenses: 48000,
        profit: 117000,
        customers: 275,
        products: 1350
    }
];

// Columnas para ventas
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
    { key: "products", header: "Productos" }
];

// Datos complejos con objetos anidados
export const complexData = [
    {
        id: 1,
        customer: {
            name: "Empresa ABC",
            contact: {
                email: "contacto@abc.com",
                phone: "+34912345678"
            }
        },
        orders: [
            { id: 101, amount: 1500 },
            { id: 102, amount: 2300 }
        ],
        metadata: {
            created: new Date("2024-01-15"),
            priority: "high"
        }
    },
    {
        id: 2,
        customer: {
            name: "Empresa XYZ",
            contact: {
                email: "info@xyz.com",
                phone: "+34987654321"
            }
        },
        orders: [
            { id: 201, amount: 850 }
        ],
        metadata: {
            created: new Date("2024-02-20"),
            priority: "normal"
        }
    }
];

// Columnas para datos complejos (con dot notation)
export const complexColumns = [
    { key: "id", header: "ID" },
    { key: "customer.name", header: "Empresa" },
    { key: "customer.contact.email", header: "Email" },
    { key: "customer.contact.phone", header: "Teléfono" },
    {
        key: "orders",
        header: "Total Órdenes",
        formatter: (orders) => orders?.length || 0
    },
    {
        key: "metadata.created",
        header: "Fecha",
        formatter: (value) => value instanceof Date ? value.toLocaleDateString('es-ES') : value
    },
    { key: "metadata.priority", header: "Prioridad" }
];

// Múltiples datasets para Excel con hojas
export const multipleDatasets = [
    {
        name: "Usuarios",
        data: basicUsers,
        columns: userColumns
    },
    {
        name: "Ventas",
        data: salesData,
        columns: salesColumns
    }
];

// Configuración de branding corporativo
export const corporateBranding = {
    orgName: "Mi Empresa S.A.",
    createdBy: "Sistema Demo",
    footerText: "Documento generado automáticamente",
    primaryColor: "#2563eb",
    secondaryColor: "#1e40af",
    textColor: "#1f2937",
    watermark: false,
    pageNumbers: true,
    logoPosition: "top-left"
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
        objectValue: { nested: "value" },
        arrayValue: ["item1", "item2"],
        specialChars: "áéíóú ñ ¿¡ \"comillas\" 'apostrofes'",
        numberWithDecimals: 123.456789
    }
];

// URLs de prueba para descargas
export const downloadUrls = {
    pdf: "/demos/exporters/data1.pdf",
    image: "https://picsum.photos/800/600",
    json: "https://jsonplaceholder.typicode.com/users",
    csv: "data:text/csv;charset=utf-8,Nombre,Edad%0AJuan,25%0AMaria,30",
    smallFile: "data:text/plain;base64,SGVsbG8gV29ybGQh",
    mediumFile: "https://httpbin.org/bytes/1024",
    largeFile: "https://httpbin.org/bytes/10240"
};

// Generador de datasets grandes
export const generateLargeDataset = (size) => {
    const names = ["Ana", "Carlos", "María", "Juan", "Laura", "Pedro", "Sofia", "Diego"];
    const surnames = ["García", "López", "Rodríguez", "Martínez", "Fernández"];
    const departments = ["IT", "Ventas", "Marketing", "Finanzas", "RRHH"];

    return Array.from({ length: size }, (_, i) => ({
        id: i + 1,
        name: `${names[Math.floor(Math.random() * names.length)]} ${surnames[Math.floor(Math.random() * surnames.length)]}`,
        email: `user${i + 1}@empresa.com`,
        department: departments[Math.floor(Math.random() * departments.length)],
        salary: Math.floor(Math.random() * 50000) + 40000,
        startDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        active: Math.random() > 0.2,
        performance: Math.round((Math.random() * 2 + 3) * 10) / 10
    }));
};


// utils/generateMockData.js
export const generateComplexMockData = (count = 30) => {
    const empresas = [
        "Empresa ABC S.A.",
        "Tech Solutions Ltda.",
        "Servicios Globales SPA",
        "InnovaCorp",
        "Construcciones del Sur",
        "AgroChile Export",
        "RetailMax S.A.",
        "EnerGreen Ltda.",
    ];

    return Array.from({ length: count }, (_, i) => {
        const empresa = empresas[i % empresas.length];
        const id = i + 1;

        return {
            id,
            customer: {
                name: empresa,
                contact: {
                    email: `contacto${id}@${empresa.replace(/\s+/g, "").toLowerCase()}.cl`,
                    phone: `+56-9-${Math.floor(10000000 + Math.random() * 89999999)}`,
                    address: {
                        street: `Calle ${id * 3} #${100 + id}`,
                        city: i % 2 === 0 ? "Santiago" : "Valparaíso",
                        country: "Chile",
                    },
                },
            },
            orders: Array.from({ length: Math.floor(Math.random() * 4) + 1 }, (_, j) => ({
                id: id * 1000 + j,
                amount: Math.round(Math.random() * 200000) + 50000,
                status: ["completed", "pending", "processing", "shipped"][
                    Math.floor(Math.random() * 4)
                ],
            })),
            metadata: {
                created: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                lastUpdate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                tags: ["premium", "corporate", "startup", "vip", "regular"].slice(
                    0,
                    Math.floor(Math.random() * 3) + 1
                ),
                scores: {
                    quality: Math.round((7 + Math.random() * 3) * 10) / 10,
                    delivery: Math.round((7 + Math.random() * 3) * 10) / 10,
                    support: Math.round((7 + Math.random() * 3) * 10) / 10,
                },
            },
        };
    });
};
