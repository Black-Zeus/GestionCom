/**
 * table-validator.js
 * Validador para nueva estructura de tablas con soporte extendido
 * Incluye validaciones específicas para tipos de columna como imágenes
 */

// ===============================================
// CONSTANTES DE VALIDACIÓN
// ===============================================

const VALIDATION_LIMITS = {
    MAX_COLUMNS: 50,
    MAX_ROWS: 10000,
    MAX_CELL_LENGTH: 1000,
    MIN_COLUMN_WIDTH: 10,
    MAX_COLUMN_WIDTH: 500,
    MAX_HEADER_LENGTH: 100,
    
    // Límites específicos para imágenes
    IMAGE: {
        MAX_WIDTH: 200,
        MAX_HEIGHT: 200,
        MIN_WIDTH: 10,
        MIN_HEIGHT: 10,
        ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
        MAX_FILE_SIZE: 5 * 1024 * 1024 // 5MB
    },
    
    // Límites para otros tipos
    CURRENCY: {
        SUPPORTED_CURRENCIES: ['CLP', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']
    },
    
    DATE: {
        SUPPORTED_PATTERNS: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY']
    }
};

const COLUMN_TYPES = {
    TEXT: 'text',
    NUMBER: 'number',
    DATE: 'date',
    CURRENCY: 'currency',
    EMAIL: 'email',
    IMAGE: 'image',
    BOOLEAN: 'boolean',
    PERCENTAGE: 'percentage'
};

// ===============================================
// FUNCIONES DE VALIDACIÓN PRINCIPALES
// ===============================================

/**
 * Valida la estructura completa de una tabla
 * @param {Object} tableConfig - Configuración de tabla a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado detallado de validación
 */
export const validateTableStructure = (tableConfig, options = {}) => {
    const {
        strict = false,           // Modo estricto con validaciones adicionales
        allowLegacy = true,       // Permitir estructura legacy
        validateData = true,      // Validar datos además de estructura
        maxRows = VALIDATION_LIMITS.MAX_ROWS
    } = options;

    const result = {
        isValid: true,
        structure: 'unknown',
        errors: [],
        warnings: [],
        stats: {},
        columnValidations: []
    };

    // ===========================================
    // VALIDACIÓN BÁSICA DE ENTRADA
    // ===========================================
    
    if (!tableConfig) {
        result.isValid = false;
        result.errors.push('Configuración de tabla requerida');
        return result;
    }

    if (typeof tableConfig !== 'object') {
        result.isValid = false;
        result.errors.push('La configuración debe ser un objeto');
        return result;
    }

    // ===========================================
    // DETECCIÓN DE ESTRUCTURA
    // ===========================================
    
    if (tableConfig.head || tableConfig.content || tableConfig.pagination) {
        result.structure = 'new';
        validateNewStructure(tableConfig, result, options);
    } else if (Array.isArray(tableConfig)) {
        result.structure = 'legacy-array';
        if (allowLegacy) {
            validateLegacyArrayStructure(tableConfig, result, options);
        } else {
            result.isValid = false;
            result.errors.push('Estructura legacy no permitida en modo estricto');
        }
    } else if (tableConfig.data || tableConfig.columns) {
        result.structure = 'legacy-object';
        if (allowLegacy) {
            validateLegacyObjectStructure(tableConfig, result, options);
        } else {
            result.isValid = false;
            result.errors.push('Estructura legacy no permitida en modo estricto');
        }
    } else {
        result.structure = 'unknown';
        result.isValid = false;
        result.errors.push('Estructura no reconocida - use nueva estructura con head/content');
    }

    return result;
};

/**
 * Valida definición de una columna individual
 * @param {Object} column - Definición de columna
 * @param {number} index - Índice de la columna (para reporting)
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado de validación de columna
 */
export const validateColumnDefinition = (column, index = 0, options = {}) => {
    const { strict = false } = options;
    
    const result = {
        isValid: true,
        errors: [],
        warnings: [],
        columnIndex: index,
        type: 'unknown'
    };

    // ===========================================
    // VALIDACIÓN BÁSICA DE COLUMNA
    // ===========================================
    
    if (!column) {
        result.isValid = false;
        result.errors.push(`Columna ${index}: definición requerida`);
        return result;
    }

    if (typeof column === 'string') {
        // Columna simple como string - válida pero limitada
        result.type = 'text';
        result.warnings.push(`Columna ${index}: usando definición simple, considera usar objeto para mayor control`);
        return result;
    }

    if (typeof column !== 'object') {
        result.isValid = false;
        result.errors.push(`Columna ${index}: debe ser string u objeto`);
        return result;
    }

    // ===========================================
    // VALIDACIONES ESPECÍFICAS DE OBJETO
    // ===========================================
    
    // Validar key/field
    if (!column.key && !column.field && !column.dataIndex) {
        result.isValid = false;
        result.errors.push(`Columna ${index}: requiere 'key', 'field' o 'dataIndex'`);
    }

    // Validar header
    if (!column.header && !column.title && !column.label) {
        result.warnings.push(`Columna ${index}: sin header definido, se usará key como header`);
    }

    const header = column.header || column.title || column.label || column.key;
    if (header && header.length > VALIDATION_LIMITS.MAX_HEADER_LENGTH) {
        result.warnings.push(`Columna ${index}: header muy largo (${header.length} caracteres)`);
    }

    // Validar tipo
    const type = column.type || 'text';
    result.type = type;
    
    if (!Object.values(COLUMN_TYPES).includes(type)) {
        result.warnings.push(`Columna ${index}: tipo '${type}' no reconocido, se tratará como text`);
    }

    // ===========================================
    // VALIDACIONES ESPECÍFICAS POR TIPO
    // ===========================================
    
    switch (type) {
        case COLUMN_TYPES.IMAGE:
            validateImageColumn(column, result, index);
            break;
            
        case COLUMN_TYPES.CURRENCY:
            validateCurrencyColumn(column, result, index);
            break;
            
        case COLUMN_TYPES.DATE:
            validateDateColumn(column, result, index);
            break;
            
        case COLUMN_TYPES.EMAIL:
            validateEmailColumn(column, result, index);
            break;
            
        case COLUMN_TYPES.NUMBER:
        case COLUMN_TYPES.PERCENTAGE:
            validateNumberColumn(column, result, index);
            break;
    }

    // ===========================================
    // VALIDACIONES ADICIONALES EN MODO ESTRICTO
    // ===========================================
    
    if (strict) {
        // Validar maxLength
        if (column.maxLength && (column.maxLength < 1 || column.maxLength > VALIDATION_LIMITS.MAX_CELL_LENGTH)) {
            result.warnings.push(`Columna ${index}: maxLength fuera de rango recomendado (1-${VALIDATION_LIMITS.MAX_CELL_LENGTH})`);
        }

        // Validar defaultValue
        if (column.defaultValue !== undefined && typeof column.defaultValue === 'object' && column.defaultValue !== null) {
            result.warnings.push(`Columna ${index}: defaultValue es un objeto, puede causar problemas de serialización`);
        }
    }

    return result;
};

/**
 * Valida específicamente columnas de imagen
 * @param {Object} column - Definición de columna de imagen
 * @param {Array} data - Datos para validar valores de imagen (opcional)
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado de validación específico para imágenes
 */
export const validateImageColumn = (column, data = [], options = {}) => {
    const {
        validateUrls = false,     // Validar que las URLs sean accesibles
        validateFormats = true,   // Validar formatos de archivo
        strict = false
    } = options;

    const result = {
        isValid: true,
        errors: [],
        warnings: [],
        imageStats: {
            totalImages: 0,
            validImages: 0,
            invalidImages: 0,
            formats: {},
            sizes: []
        }
    };

    // ===========================================
    // VALIDAR CONFIGURACIÓN DE FORMATO
    // ===========================================
    
    if (!column.format) {
        result.warnings.push('Columna imagen sin formato definido, se usarán valores por defecto');
        column.format = {}; // Asegurar que existe
    }

    const format = column.format;
    
    // Validar dimensiones
    const width = format.width || 30;
    const height = format.height || 30;
    
    if (width < VALIDATION_LIMITS.IMAGE.MIN_WIDTH || width > VALIDATION_LIMITS.IMAGE.MAX_WIDTH) {
        result.warnings.push(`Ancho de imagen (${width}px) fuera de rango recomendado (${VALIDATION_LIMITS.IMAGE.MIN_WIDTH}-${VALIDATION_LIMITS.IMAGE.MAX_WIDTH}px)`);
    }
    
    if (height < VALIDATION_LIMITS.IMAGE.MIN_HEIGHT || height > VALIDATION_LIMITS.IMAGE.MAX_HEIGHT) {
        result.warnings.push(`Alto de imagen (${height}px) fuera de rango recomendado (${VALIDATION_LIMITS.IMAGE.MIN_HEIGHT}-${VALIDATION_LIMITS.IMAGE.MAX_HEIGHT}px)`);
    }

    // ===========================================
    // VALIDAR DATOS DE IMAGEN (si se proporcionan)
    // ===========================================
    
    if (Array.isArray(data) && data.length > 0) {
        const key = column.key || column.field || column.dataIndex;
        
        data.forEach((row, rowIndex) => {
            const imageValue = row[key];
            result.imageStats.totalImages++;
            
            if (!imageValue) {
                // Valor vacío - OK si no es requerido
                return;
            }
            
            if (typeof imageValue === 'string') {
                const validation = validateImageUrl(imageValue, {
                    validateFormats,
                    validateUrls: false // No validar accesibilidad por defecto
                });
                
                if (validation.isValid) {
                    result.imageStats.validImages++;
                    const format = validation.format;
                    result.imageStats.formats[format] = (result.imageStats.formats[format] || 0) + 1;
                } else {
                    result.imageStats.invalidImages++;
                    result.warnings.push(`Fila ${rowIndex}: imagen inválida - ${validation.error}`);
                }
            } else if (typeof imageValue === 'object' && imageValue !== null) {
                // Objeto imagen con propiedades adicionales
                if (!imageValue.src && !imageValue.url && !imageValue.data) {
                    result.warnings.push(`Fila ${rowIndex}: objeto imagen sin src/url/data`);
                    result.imageStats.invalidImages++;
                } else {
                    result.imageStats.validImages++;
                }
            } else {
                result.warnings.push(`Fila ${rowIndex}: valor de imagen debe ser string o objeto`);
                result.imageStats.invalidImages++;
            }
        });
    }

    return result;
};

// ===============================================
// FUNCIONES DE VALIDACIÓN INTERNAS
// ===============================================

/**
 * Valida estructura nueva (head/content/pagination)
 */
const validateNewStructure = (tableConfig, result, options) => {
    const { head = {}, content = {}, pagination = {} } = tableConfig;
    
    // Validar head
    if (!head.columns || !Array.isArray(head.columns)) {
        result.isValid = false;
        result.errors.push('head.columns requerido y debe ser array');
    } else {
        if (head.columns.length === 0) {
            result.warnings.push('head.columns está vacío');
        }
        
        if (head.columns.length > VALIDATION_LIMITS.MAX_COLUMNS) {
            result.warnings.push(`Demasiadas columnas (${head.columns.length}), se recomienda menos de ${VALIDATION_LIMITS.MAX_COLUMNS}`);
        }
        
        // Validar cada columna
        head.columns.forEach((col, index) => {
            const colValidation = validateColumnDefinition(col, index, options);
            result.columnValidations.push(colValidation);
            
            if (!colValidation.isValid) {
                result.isValid = false;
                result.errors.push(...colValidation.errors);
            }
            result.warnings.push(...colValidation.warnings);
        });
    }
    
    // Validar content
    if (!content.data || !Array.isArray(content.data)) {
        result.isValid = false;
        result.errors.push('content.data requerido y debe ser array');
    } else {
        const dataLength = content.data.length;
        result.stats.totalRows = dataLength;
        
        if (dataLength === 0) {
            result.warnings.push('content.data está vacío');
        }
        
        if (dataLength > options.maxRows) {
            result.warnings.push(`Demasiadas filas (${dataLength}), se recomienda menos de ${options.maxRows}`);
        }
    }
    
    // Validar opciones de head
    if (head.options) {
        if (typeof head.options !== 'object') {
            result.warnings.push('head.options debe ser un objeto');
        }
    }
    
    // Validar paginación
    if (pagination.enabled && pagination.pageSize) {
        if (pagination.pageSize < 1 || pagination.pageSize > 1000) {
            result.warnings.push(`pageSize (${pagination.pageSize}) fuera de rango recomendado (1-1000)`);
        }
    }
    
    result.stats.totalColumns = head.columns ? head.columns.length : 0;
    result.stats.hasPagination = !!pagination.enabled;
};

/**
 * Valida estructura legacy como array
 */
const validateLegacyArrayStructure = (tableConfig, result, options) => {
    result.warnings.push('Usando estructura legacy (array) - considera migrar a nueva estructura');
    
    result.stats.totalRows = tableConfig.length;
    
    if (tableConfig.length === 0) {
        result.warnings.push('Array de datos vacío');
    }
    
    // Analizar estructura de datos
    if (tableConfig.length > 0) {
        const sampleRow = tableConfig[0];
        if (sampleRow && typeof sampleRow === 'object') {
            const columns = Object.keys(sampleRow);
            result.stats.totalColumns = columns.length;
            result.stats.detectedColumns = columns;
            
            if (columns.length > VALIDATION_LIMITS.MAX_COLUMNS) {
                result.warnings.push(`Muchas propiedades detectadas (${columns.length}), considera definir columnas específicas`);
            }
        }
    }
};

/**
 * Valida estructura legacy como objeto con data/columns
 */
const validateLegacyObjectStructure = (tableConfig, result, options) => {
    result.warnings.push('Usando estructura legacy (objeto) - considera migrar a nueva estructura');
    
    if (tableConfig.data && Array.isArray(tableConfig.data)) {
        result.stats.totalRows = tableConfig.data.length;
    }
    
    if (tableConfig.columns && Array.isArray(tableConfig.columns)) {
        result.stats.totalColumns = tableConfig.columns.length;
        
        // Validar columnas básicamente
        tableConfig.columns.forEach((col, index) => {
            if (typeof col !== 'string' && (typeof col !== 'object' || !col.key)) {
                result.warnings.push(`Columna ${index}: estructura inconsistente`);
            }
        });
    }
};

/**
 * Valida columna de currency
 */
const validateCurrencyColumn = (column, result, index) => {
    const format = column.format || {};
    const currency = format.currency;
    
    if (currency && !VALIDATION_LIMITS.CURRENCY.SUPPORTED_CURRENCIES.includes(currency)) {
        result.warnings.push(`Columna ${index}: moneda '${currency}' no está en lista de soportadas`);
    }
    
    if (!currency) {
        result.warnings.push(`Columna ${index}: columna currency sin formato.currency definido`);
    }
};

/**
 * Valida columna de fecha
 */
const validateDateColumn = (column, result, index) => {
    const format = column.format || {};
    const pattern = format.pattern;
    
    if (pattern && !VALIDATION_LIMITS.DATE.SUPPORTED_PATTERNS.includes(pattern)) {
        result.warnings.push(`Columna ${index}: patrón de fecha '${pattern}' no está en lista de soportados`);
    }
};

/**
 * Valida columna de email
 */
const validateEmailColumn = (column, result, index) => {
    // Por ahora, solo validación básica
    if (column.format && column.format.allowMultiple) {
        result.warnings.push(`Columna ${index}: allowMultiple para email puede complicar validación`);
    }
};

/**
 * Valida columna numérica
 */
const validateNumberColumn = (column, result, index) => {
    const format = column.format || {};
    
    if (format.decimals !== undefined && (format.decimals < 0 || format.decimals > 10)) {
        result.warnings.push(`Columna ${index}: decimales (${format.decimals}) fuera de rango recomendado (0-10)`);
    }
    
    if (format.min !== undefined && format.max !== undefined && format.min >= format.max) {
        result.errors.push(`Columna ${index}: min (${format.min}) debe ser menor que max (${format.max})`);
    }
};

/**
 * Valida URL de imagen
 */
const validateImageUrl = (url, options = {}) => {
    const { validateFormats = true } = options;
    
    const result = {
        isValid: true,
        error: null,
        format: null
    };
    
    if (!url || typeof url !== 'string') {
        result.isValid = false;
        result.error = 'URL debe ser string no vacío';
        return result;
    }
    
    // Detectar si es data URL
    if (url.startsWith('data:image/')) {
        const match = url.match(/data:image\/([^;]+)/);
        if (match) {
            result.format = match[1].toLowerCase();
            if (validateFormats && !VALIDATION_LIMITS.IMAGE.ALLOWED_FORMATS.includes(result.format)) {
                result.isValid = false;
                result.error = `Formato ${result.format} no soportado`;
            }
        } else {
            result.isValid = false;
            result.error = 'Data URL malformada';
        }
        return result;
    }
    
    // Validar URL regular
    try {
        new URL(url);
    } catch {
        result.isValid = false;
        result.error = 'URL inválida';
        return result;
    }
    
    // Extraer extensión del archivo
    if (validateFormats) {
        const extension = url.split('.').pop()?.toLowerCase();
        if (extension && VALIDATION_LIMITS.IMAGE.ALLOWED_FORMATS.includes(extension)) {
            result.format = extension;
        } else {
            result.isValid = false;
            result.error = 'Formato de archivo no soportado o no detectado';
        }
    }
    
    return result;
};

// ===============================================
// FUNCIONES AUXILIARES PÚBLICAS
// ===============================================

/**
 * Obtiene estadísticas rápidas de una configuración de tabla
 * @param {Object} tableConfig - Configuración de tabla
 * @returns {Object} Estadísticas básicas
 */
export const getTableStats = (tableConfig) => {
    const validation = validateTableStructure(tableConfig, { 
        strict: false, 
        validateData: false 
    });
    
    return {
        structure: validation.structure,
        isValid: validation.isValid,
        totalRows: validation.stats.totalRows || 0,
        totalColumns: validation.stats.totalColumns || 0,
        hasErrors: validation.errors.length > 0,
        hasWarnings: validation.warnings.length > 0,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length
    };
};

/**
 * Valida rápidamente si una estructura es válida
 * @param {Object} tableConfig - Configuración de tabla
 * @returns {boolean} true si es válida
 */
export const isValidTableStructure = (tableConfig) => {
    const validation = validateTableStructure(tableConfig, { 
        strict: false, 
        validateData: false 
    });
    
    return validation.isValid;
};

// ===============================================
// EXPORTS
// ===============================================

export default {
    validateTableStructure,
    validateColumnDefinition,
    validateImageColumn,
    getTableStats,
    isValidTableStructure,
    VALIDATION_LIMITS,
    COLUMN_TYPES
};