/**
 * table-types.js
 * Definiciones de tipos, constantes y configuraciones para estructura de tablas
 * Incluye tipos de columna, formatos, validaciones y configuraciones por defecto
 */

// ===============================================
// TIPOS DE COLUMNA PRINCIPALES
// ===============================================

export const COLUMN_TYPES = {
    TEXT: 'text',
    NUMBER: 'number',
    DATE: 'date',
    CURRENCY: 'currency',
    EMAIL: 'email',
    IMAGE: 'image',
    BOOLEAN: 'boolean',
    PERCENTAGE: 'percentage',
    PHONE: 'phone',
    URL: 'url',
    JSON: 'json',
    ARRAY: 'array'
};

// ===============================================
// CONFIGURACIONES POR DEFECTO PARA CADA TIPO
// ===============================================

export const DEFAULT_COLUMN_CONFIGS = {
    [COLUMN_TYPES.TEXT]: {
        maxLength: 100,
        defaultValue: '',
        format: {
            truncate: true,
            truncateLength: 50,
            truncateIndicator: '...',
            wordWrap: true
        }
    },

    [COLUMN_TYPES.NUMBER]: {
        maxLength: 20,
        defaultValue: 0,
        format: {
            decimals: 0,
            thousandsSeparator: '.',
            decimalSeparator: ',',
            min: Number.MIN_SAFE_INTEGER,
            max: Number.MAX_SAFE_INTEGER,
            showSign: false
        }
    },

    [COLUMN_TYPES.DATE]: {
        maxLength: 20,
        defaultValue: null,
        format: {
            pattern: 'DD/MM/YYYY',
            locale: 'es-CL',
            timezone: 'America/Santiago',
            showTime: false,
            timeFormat: 'HH:mm'
        }
    },

    [COLUMN_TYPES.CURRENCY]: {
        maxLength: 30,
        defaultValue: 0,
        format: {
            currency: 'CLP',
            decimals: 0,
            symbol: '$',
            symbolPosition: 'before', // 'before' | 'after'
            thousandsSeparator: '.',
            decimalSeparator: ',',
            showSymbol: true
        }
    },

    [COLUMN_TYPES.EMAIL]: {
        maxLength: 100,
        defaultValue: '',
        format: {
            validate: true,
            allowMultiple: false,
            separator: ',',
            showAsLink: false,
            maskDomain: false
        }
    },

    [COLUMN_TYPES.IMAGE]: {
        maxLength: 0, // No aplica para imágenes
        defaultValue: null,
        format: {
            width: 40,
            height: 40,
            fit: 'cover', // 'cover' | 'contain' | 'fill' | 'scale-down'
            quality: 0.8,
            placeholder: '📷',
            showOnError: 'placeholder', // 'placeholder' | 'text' | 'hidden'
            allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
            maxFileSize: 5242880 // 5MB en bytes
        }
    },

    [COLUMN_TYPES.BOOLEAN]: {
        maxLength: 10,
        defaultValue: false,
        format: {
            trueText: 'Sí',
            falseText: 'No',
            trueIcon: '✓',
            falseIcon: '✗',
            showAsIcon: false,
            showAsText: true
        }
    },

    [COLUMN_TYPES.PERCENTAGE]: {
        maxLength: 15,
        defaultValue: 0,
        format: {
            decimals: 1,
            symbol: '%',
            symbolPosition: 'after',
            min: 0,
            max: 100,
            multiplier: 1, // Si los datos vienen como 0.15 usar 100, si vienen como 15 usar 1
            decimalSeparator: ','
        }
    },

    [COLUMN_TYPES.PHONE]: {
        maxLength: 20,
        defaultValue: '',
        format: {
            countryCode: '+56',
            showCountryCode: true,
            pattern: '(XX) XXXX-XXXX',
            validate: true,
            allowInternational: true
        }
    },

    [COLUMN_TYPES.URL]: {
        maxLength: 200,
        defaultValue: '',
        format: {
            showAsLink: false,
            truncateLength: 50,
            protocol: 'https',
            validate: true,
            allowRelative: false
        }
    },

    [COLUMN_TYPES.JSON]: {
        maxLength: 500,
        defaultValue: null,
        format: {
            pretty: false,
            maxDepth: 3,
            truncateLength: 100,
            showKeys: true,
            flattenArrays: false
        }
    },

    [COLUMN_TYPES.ARRAY]: {
        maxLength: 200,
        defaultValue: [],
        format: {
            separator: ', ',
            maxItems: 5,
            truncateLength: 50,
            showCount: false,
            countText: '+{count} más'
        }
    }
};

// ===============================================
// PATRONES DE FORMATO ESPECÍFICOS
// ===============================================

export const DATE_PATTERNS = {
    'DD/MM/YYYY': {
        display: 'DD/MM/AAAA',
        regex: /^\d{2}\/\d{2}\/\d{4}$/,
        format: 'DD/MM/YYYY',
        description: 'Formato chileno estándar'
    },
    'MM/DD/YYYY': {
        display: 'MM/DD/AAAA',
        regex: /^\d{2}\/\d{2}\/\d{4}$/,
        format: 'MM/DD/YYYY',
        description: 'Formato estadounidense'
    },
    'YYYY-MM-DD': {
        display: 'AAAA-MM-DD',
        regex: /^\d{4}-\d{2}-\d{2}$/,
        format: 'YYYY-MM-DD',
        description: 'Formato ISO estándar'
    },
    'DD-MM-YYYY': {
        display: 'DD-MM-AAAA',
        regex: /^\d{2}-\d{2}-\d{4}$/,
        format: 'DD-MM-YYYY',
        description: 'Formato europeo con guiones'
    },
    'DD/MM/YYYY HH:mm': {
        display: 'DD/MM/AAAA HH:mm',
        regex: /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/,
        format: 'DD/MM/YYYY HH:mm',
        description: 'Fecha y hora chilena'
    }
};

export const CURRENCY_CODES = {
    CLP: {
        code: 'CLP',
        symbol: '$',
        name: 'Peso Chileno',
        decimals: 0,
        thousandsSeparator: '.',
        decimalSeparator: ','
    },
    USD: {
        code: 'USD',
        symbol: 'US$',
        name: 'Dólar Estadounidense',
        decimals: 2,
        thousandsSeparator: ',',
        decimalSeparator: '.'
    },
    EUR: {
        code: 'EUR',
        symbol: '€',
        name: 'Euro',
        decimals: 2,
        thousandsSeparator: '.',
        decimalSeparator: ','
    },
    GBP: {
        code: 'GBP',
        symbol: '£',
        name: 'Libra Esterlina',
        decimals: 2,
        thousandsSeparator: ',',
        decimalSeparator: '.'
    },
    JPY: {
        code: 'JPY',
        symbol: '¥',
        name: 'Yen Japonés',
        decimals: 0,
        thousandsSeparator: ',',
        decimalSeparator: '.'
    },
    CAD: {
        code: 'CAD',
        symbol: 'C$',
        name: 'Dólar Canadiense',
        decimals: 2,
        thousandsSeparator: ',',
        decimalSeparator: '.'
    },
    AUD: {
        code: 'AUD',
        symbol: 'A$',
        name: 'Dólar Australiano',
        decimals: 2,
        thousandsSeparator: ',',
        decimalSeparator: '.'
    }
};

// ===============================================
// CONFIGURACIONES DE TABLA
// ===============================================

export const TABLE_OPTIONS_DEFAULTS = {
    includeHeaders: true,
    alternateRowColors: true,
    showBorders: true,
    borderColor: '#e5e7eb',
    headerBackgroundColor: '#f3f4f6',
    alternateRowColor: '#f9fafb',
    fontSize: 9,
    headerFontSize: 10,
    fontFamily: 'Arial',
    textAlign: 'left',
    verticalAlign: 'middle',
    padding: {
        top: 4,
        right: 6,
        bottom: 4,
        left: 6
    }
};

export const PAGINATION_DEFAULTS = {
    enabled: false,
    pageSize: 25,
    showPageNumbers: true,
    showTotals: true,
    maxPagesPerDocument: 100
};

// ===============================================
// LÍMITES Y VALIDACIONES
// ===============================================

export const TABLE_LIMITS = {
    MAX_COLUMNS: 50,
    MAX_ROWS: 10000,
    MAX_CELL_LENGTH: 1000,
    MIN_COLUMN_WIDTH: 10,
    MAX_COLUMN_WIDTH: 500,
    MAX_HEADER_LENGTH: 100,
    MAX_TABLE_WIDTH: 800,
    MIN_TABLE_WIDTH: 200
};

export const IMAGE_LIMITS = {
    MAX_WIDTH: 200,
    MAX_HEIGHT: 200,
    MIN_WIDTH: 10,
    MIN_HEIGHT: 10,
    MAX_FILE_SIZE: 5242880, // 5MB
    ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
    QUALITY_DEFAULT: 0.8,
    QUALITY_MIN: 0.1,
    QUALITY_MAX: 1.0
};

// ===============================================
// TEMPLATES DE CONFIGURACIÓN COMÚN
// ===============================================

export const COLUMN_TEMPLATES = {
    // Template para columna de ID
    ID: {
        type: COLUMN_TYPES.NUMBER,
        header: 'ID',
        format: {
            decimals: 0,
            min: 1
        },
        maxLength: 10,
        defaultValue: null
    },

    // Template para nombre/título
    NAME: {
        type: COLUMN_TYPES.TEXT,
        header: 'Nombre',
        maxLength: 100,
        format: {
            truncateLength: 40,
            wordWrap: true
        },
        defaultValue: ''
    },

    // Template para email
    EMAIL: {
        type: COLUMN_TYPES.EMAIL,
        header: 'Email',
        maxLength: 100,
        format: {
            validate: true,
            showAsLink: false
        },
        defaultValue: ''
    },

    // Template para fecha de creación
    CREATED_AT: {
        type: COLUMN_TYPES.DATE,
        header: 'Fecha Creación',
        format: {
            pattern: 'DD/MM/YYYY',
            showTime: false
        },
        defaultValue: null
    },

    // Template para fecha con hora
    DATETIME: {
        type: COLUMN_TYPES.DATE,
        header: 'Fecha y Hora',
        format: {
            pattern: 'DD/MM/YYYY HH:mm',
            showTime: true
        },
        defaultValue: null
    },

    // Template para precio en CLP
    PRICE_CLP: {
        type: COLUMN_TYPES.CURRENCY,
        header: 'Precio',
        format: {
            currency: 'CLP',
            decimals: 0,
            symbol: '$',
            symbolPosition: 'before'
        },
        defaultValue: 0
    },

    // Template para estado activo/inactivo
    STATUS: {
        type: COLUMN_TYPES.BOOLEAN,
        header: 'Estado',
        format: {
            trueText: 'Activo',
            falseText: 'Inactivo',
            showAsText: true
        },
        defaultValue: true
    },

    // Template para porcentaje
    PERCENTAGE: {
        type: COLUMN_TYPES.PERCENTAGE,
        header: 'Porcentaje',
        format: {
            decimals: 1,
            symbol: '%',
            min: 0,
            max: 100
        },
        defaultValue: 0
    },

    // Template para imagen/avatar
    AVATAR: {
        type: COLUMN_TYPES.IMAGE,
        header: 'Avatar',
        format: {
            width: 32,
            height: 32,
            fit: 'cover',
            placeholder: '👤'
        },
        defaultValue: null
    },

    // Template para descripción
    DESCRIPTION: {
        type: COLUMN_TYPES.TEXT,
        header: 'Descripción',
        maxLength: 500,
        format: {
            truncateLength: 80,
            wordWrap: true
        },
        defaultValue: ''
    }
};

// ===============================================
// CONFIGURACIONES PRE-DEFINIDAS DE TABLA
// ===============================================

export const TABLE_PRESETS = {
    // Tabla básica de usuarios
    USERS_TABLE: {
        head: {
            columns: [
                { ...COLUMN_TEMPLATES.ID, key: 'id' },
                { ...COLUMN_TEMPLATES.NAME, key: 'name', header: 'Nombre' },
                { ...COLUMN_TEMPLATES.EMAIL, key: 'email' },
                { ...COLUMN_TEMPLATES.CREATED_AT, key: 'created_at' },
                { ...COLUMN_TEMPLATES.STATUS, key: 'active', header: 'Activo' }
            ],
            options: {
                includeHeaders: true,
                alternateRowColors: true
            }
        },
        pagination: {
            enabled: true,
            pageSize: 50
        }
    },

    // Tabla de productos con precios
    PRODUCTS_TABLE: {
        head: {
            columns: [
                { ...COLUMN_TEMPLATES.ID, key: 'id' },
                { ...COLUMN_TEMPLATES.NAME, key: 'name', header: 'Producto' },
                { ...COLUMN_TEMPLATES.DESCRIPTION, key: 'description' },
                { ...COLUMN_TEMPLATES.PRICE_CLP, key: 'price' },
                { ...COLUMN_TEMPLATES.STATUS, key: 'available', header: 'Disponible' }
            ],
            options: {
                includeHeaders: true,
                alternateRowColors: true
            }
        },
        pagination: {
            enabled: true,
            pageSize: 25
        }
    },

    // Tabla de reportes financieros
    FINANCIAL_REPORT: {
        head: {
            columns: [
                { ...COLUMN_TEMPLATES.DATETIME, key: 'date', header: 'Fecha' },
                { type: COLUMN_TYPES.TEXT, key: 'concept', header: 'Concepto' },
                { ...COLUMN_TEMPLATES.PRICE_CLP, key: 'income', header: 'Ingresos' },
                { ...COLUMN_TEMPLATES.PRICE_CLP, key: 'expenses', header: 'Gastos' },
                { ...COLUMN_TEMPLATES.PRICE_CLP, key: 'balance', header: 'Balance' }
            ],
            options: {
                includeHeaders: true,
                alternateRowColors: false
            }
        },
        pagination: {
            enabled: false
        }
    }
};

// ===============================================
// FUNCIONES AUXILIARES DE TIPOS
// ===============================================

/**
 * Obtiene la configuración por defecto para un tipo de columna
 * @param {string} columnType - Tipo de columna
 * @returns {Object} Configuración por defecto
 */
export const getDefaultColumnConfig = (columnType) => {
    return DEFAULT_COLUMN_CONFIGS[columnType] || DEFAULT_COLUMN_CONFIGS[COLUMN_TYPES.TEXT];
};

/**
 * Verifica si un tipo de columna es válido
 * @param {string} columnType - Tipo a verificar
 * @returns {boolean} true si es válido
 */
export const isValidColumnType = (columnType) => {
    return Object.values(COLUMN_TYPES).includes(columnType);
};

/**
 * Obtiene información de una moneda
 * @param {string} currencyCode - Código de moneda (ej: 'CLP')
 * @returns {Object|null} Información de la moneda o null si no existe
 */
export const getCurrencyInfo = (currencyCode) => {
    return CURRENCY_CODES[currencyCode] || null;
};

/**
 * Obtiene información de un patrón de fecha
 * @param {string} pattern - Patrón de fecha
 * @returns {Object|null} Información del patrón o null si no existe
 */
export const getDatePatternInfo = (pattern) => {
    return DATE_PATTERNS[pattern] || null;
};

/**
 * Crea una configuración de columna completa basada en un template
 * @param {string} templateName - Nombre del template
 * @param {Object} overrides - Propiedades a sobrescribir
 * @returns {Object} Configuración de columna completa
 */
export const createColumnFromTemplate = (templateName, overrides = {}) => {
    const template = COLUMN_TEMPLATES[templateName];
    
    if (!template) {
        throw new Error(`Template '${templateName}' no encontrado`);
    }
    
    return {
        ...template,
        ...overrides,
        format: {
            ...template.format,
            ...(overrides.format || {})
        }
    };
};

/**
 * Crea una configuración de tabla completa basada en un preset
 * @param {string} presetName - Nombre del preset
 * @param {Object} overrides - Propiedades a sobrescribir
 * @returns {Object} Configuración de tabla completa
 */
export const createTableFromPreset = (presetName, overrides = {}) => {
    const preset = TABLE_PRESETS[presetName];
    
    if (!preset) {
        throw new Error(`Preset '${presetName}' no encontrado`);
    }
    
    return {
        ...preset,
        ...overrides,
        head: {
            ...preset.head,
            ...(overrides.head || {}),
            columns: overrides.head?.columns || preset.head.columns,
            options: {
                ...preset.head.options,
                ...(overrides.head?.options || {})
            }
        },
        pagination: {
            ...preset.pagination,
            ...(overrides.pagination || {})
        }
    };
};

/**
 * Obtiene lista de todos los tipos de columna disponibles
 * @returns {Array} Array de objetos con información de tipos
 */
export const getAvailableColumnTypes = () => {
    return Object.entries(COLUMN_TYPES).map(([key, value]) => ({
        key,
        value,
        config: DEFAULT_COLUMN_CONFIGS[value]
    }));
};

/**
 * Obtiene lista de todas las monedas soportadas
 * @returns {Array} Array de objetos con información de monedas
 */
export const getAvailableCurrencies = () => {
    return Object.entries(CURRENCY_CODES).map(([code, info]) => ({
        code,
        ...info
    }));
};

/**
 * Obtiene lista de todos los patrones de fecha disponibles
 * @returns {Array} Array de objetos con información de patrones
 */
export const getAvailableDatePatterns = () => {
    return Object.entries(DATE_PATTERNS).map(([pattern, info]) => ({
        pattern,
        ...info
    }));
};

// ===============================================
// EXPORT DEFAULT PARA FACILITAR IMPORTACIÓN
// ===============================================

export default {
    // Tipos y configuraciones principales
    COLUMN_TYPES,
    DEFAULT_COLUMN_CONFIGS,
    TABLE_OPTIONS_DEFAULTS,
    PAGINATION_DEFAULTS,
    
    // Patrones y códigos específicos
    DATE_PATTERNS,
    CURRENCY_CODES,
    
    // Límites y validaciones
    TABLE_LIMITS,
    IMAGE_LIMITS,
    
    // Templates y presets
    COLUMN_TEMPLATES,
    TABLE_PRESETS,
    
    // Funciones auxiliares
    getDefaultColumnConfig,
    isValidColumnType,
    getCurrencyInfo,
    getDatePatternInfo,
    createColumnFromTemplate,
    createTableFromPreset,
    getAvailableColumnTypes,
    getAvailableCurrencies,
    getAvailableDatePatterns
};