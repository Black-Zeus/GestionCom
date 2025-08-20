/**
 * Utilidades puras para manejo de CSV
 * Funciones de escapado, parsing, validación y detección según RFC 4180
 */

/**
 * Caracteres especiales que requieren escapado en CSV
 */
const CSV_SPECIAL_CHARS = {
    QUOTE: '"',
    COMMA: ',',
    SEMICOLON: ';',
    TAB: '\t',
    PIPE: '|',
    LF: '\n',
    CR: '\r',
    CRLF: '\r\n'
};

/**
 * Delimitadores comunes para detección automática
 */
const COMMON_DELIMITERS = [
    CSV_SPECIAL_CHARS.COMMA,
    CSV_SPECIAL_CHARS.SEMICOLON,
    CSV_SPECIAL_CHARS.TAB,
    CSV_SPECIAL_CHARS.PIPE
];

/**
 * Opciones por defecto para CSV
 */
const DEFAULT_CSV_OPTIONS = {
    delimiter: CSV_SPECIAL_CHARS.COMMA,
    quoteChar: CSV_SPECIAL_CHARS.QUOTE,
    escapeChar: CSV_SPECIAL_CHARS.QUOTE,
    lineEnding: CSV_SPECIAL_CHARS.CRLF,
    encoding: 'utf-8',
    includeBOM: true,
    forceQuotes: false,
    nullValue: '',
    undefinedValue: '',
    booleanFormat: 'text' // 'text' | 'number' | 'symbol'
};

/**
 * Escapa un valor para CSV según RFC 4180
 * @param {*} value - Valor a escapar
 * @param {Object} options - Opciones de escapado
 * @returns {string} Valor escapado
 */
export const escapeCSVValue = (value, options = {}) => {
    const {
        delimiter = DEFAULT_CSV_OPTIONS.delimiter,
        quoteChar = DEFAULT_CSV_OPTIONS.quoteChar,
        escapeChar = DEFAULT_CSV_OPTIONS.escapeChar,
        forceQuotes = DEFAULT_CSV_OPTIONS.forceQuotes,
        nullValue = DEFAULT_CSV_OPTIONS.nullValue,
        undefinedValue = DEFAULT_CSV_OPTIONS.undefinedValue,
        booleanFormat = DEFAULT_CSV_OPTIONS.booleanFormat
    } = options;

    // Manejar valores nulos y undefined
    if (value === null) {
        return nullValue;
    }

    if (value === undefined) {
        return undefinedValue;
    }

    // Convertir a string según el tipo
    let stringValue = '';

    if (typeof value === 'boolean') {
        switch (booleanFormat) {
            case 'number':
                stringValue = value ? '1' : '0';
                break;
            case 'symbol':
                stringValue = value ? '✓' : '✗';
                break;
            case 'text':
            default:
                stringValue = value ? 'TRUE' : 'FALSE';
                break;
        }
    } else if (typeof value === 'number') {
        if (isNaN(value) || !isFinite(value)) {
            stringValue = '';
        } else {
            stringValue = value.toString();
        }
    } else if (value instanceof Date) {
        try {
            stringValue = value.toISOString();
        } catch (error) {
            stringValue = value.toString();
        }
    } else if (typeof value === 'object') {
        try {
            stringValue = JSON.stringify(value);
        } catch (error) {
            stringValue = '[Object]';
        }
    } else {
        stringValue = String(value);
    }

    // Verificar si necesita escapado
    const needsQuotes = forceQuotes ||
        stringValue.includes(delimiter) ||
        stringValue.includes(quoteChar) ||
        stringValue.includes('\n') ||
        stringValue.includes('\r') ||
        stringValue.startsWith(' ') ||
        stringValue.endsWith(' ') ||
        stringValue === ''; // Campos vacíos también pueden necesitar comillas

    if (needsQuotes) {
        // Escapar caracteres de comillas existentes
        const escapedValue = stringValue.replace(
            new RegExp(escapeQuoteChar(quoteChar), 'g'),
            quoteChar + quoteChar
        );
        return quoteChar + escapedValue + quoteChar;
    }

    return stringValue;
};

/**
 * Escapa un carácter de comillas para regex
 * @param {string} quoteChar - Carácter de comillas
 * @returns {string} Carácter escapado para regex
 */
const escapeQuoteChar = (quoteChar) => {
    return quoteChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Convierte un array de valores a una línea CSV
 * @param {Array} values - Array de valores
 * @param {Object} options - Opciones de formato
 * @returns {string} Línea CSV
 */
export const arrayToCSVLine = (values, options = {}) => {
    if (!Array.isArray(values)) {
        throw new Error('Values must be an array');
    }

    const delimiter = options.delimiter || DEFAULT_CSV_OPTIONS.delimiter;

    return values
        .map(value => escapeCSVValue(value, options))
        .join(delimiter);
};

/**
 * Convierte un objeto a línea CSV usando columnas especificadas
 * @param {Object} row - Objeto con datos
 * @param {Array} columns - Definición de columnas
 * @param {Object} options - Opciones de formato
 * @returns {string} Línea CSV
 */
export const objectToCSVLine = (row, columns, options = {}) => {
    if (!row || typeof row !== 'object') {
        throw new Error('Row must be an object');
    }

    if (!Array.isArray(columns)) {
        throw new Error('Columns must be an array');
    }

    const values = columns.map(col => {
        let value;

        if (typeof col === 'string') {
            // Columna simple por nombre
            value = getNestedValue(row, col);
        } else if (typeof col === 'object' && col !== null) {
            // Columna con configuración
            const key = col.key || col.field || col.dataIndex;
            value = getNestedValue(row, key);

            // Aplicar formatter si existe
            if (col.formatter && typeof col.formatter === 'function') {
                try {
                    value = col.formatter(value, row, col);
                } catch (error) {
                    console.warn(`Error formatting column ${key}:`, error);
                    // Usar valor original si falla el formatter
                }
            }

            // Aplicar valor por defecto si es necesario
            if ((value === null || value === undefined) && col.defaultValue !== undefined) {
                value = typeof col.defaultValue === 'function'
                    ? col.defaultValue(row, col)
                    : col.defaultValue;
            }
        } else {
            value = '';
        }

        return value;
    });

    return arrayToCSVLine(values, options);
};

/**
 * Obtiene valor anidado usando dot notation
 * @param {Object} obj - Objeto fuente
 * @param {string} path - Ruta con dot notation (ej: "user.profile.name")
 * @returns {*} Valor encontrado
 */
const getNestedValue = (obj, path) => {
    if (!obj || typeof path !== 'string') {
        return undefined;
    }

    return path.split('.').reduce((current, key) => {
        return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
};

/**
 * Genera cabeceras CSV desde definición de columnas
 * @param {Array} columns - Definición de columnas
 * @param {Object} options - Opciones de formato
 * @returns {string} Línea de cabeceras CSV
 */
export const generateCSVHeaders = (columns, options = {}) => {
    if (!Array.isArray(columns)) {
        throw new Error('Columns must be an array');
    }

    const headers = columns.map(col => {
        if (typeof col === 'string') {
            return col;
        } else if (typeof col === 'object' && col !== null) {
            return col.header || col.title || col.label || col.key || col.field || col.dataIndex || '';
        } else {
            return '';
        }
    });

    return arrayToCSVLine(headers, options);
};

/**
 * Convierte array de objetos a CSV completo
 * @param {Array} data - Array de objetos
 * @param {Array} columns - Definición de columnas
 * @param {Object} options - Opciones de formato
 * @returns {string} CSV completo
 */
export const dataToCSV = (data, columns, options = {}) => {
    const {
        includeHeaders = true,
        lineEnding = DEFAULT_CSV_OPTIONS.lineEnding,
        ...csvOptions
    } = options;

    if (!Array.isArray(data)) {
        throw new Error('Data must be an array');
    }

    if (!Array.isArray(columns)) {
        throw new Error('Columns must be an array');
    }

    const lines = [];

    // Agregar cabeceras si se solicita
    if (includeHeaders && columns.length > 0) {
        lines.push(generateCSVHeaders(columns, csvOptions));
    }

    // Agregar filas de datos
    data.forEach((row, index) => {
        if (row && typeof row === 'object') {
            try {
                lines.push(objectToCSVLine(row, columns, csvOptions));
            } catch (error) {
                console.warn(`Error processing row ${index}:`, error);
                // Continuar con las demás filas
            }
        }
    });

    return lines.join(lineEnding);
};

/**
 * Detecta automáticamente el delimitador más probable en un CSV
 * @param {string} csvContent - Contenido CSV de muestra
 * @param {Object} options - Opciones de detección
 * @returns {string} Delimitador detectado
 */
export const detectDelimiter = (csvContent, options = {}) => {
    const {
        sampleLines = 5,
        delimitersToTest = COMMON_DELIMITERS,
        minConsistency = 0.8
    } = options;

    if (!csvContent || typeof csvContent !== 'string') {
        return DEFAULT_CSV_OPTIONS.delimiter;
    }

    // Obtener muestra de líneas
    const lines = csvContent
        .split(/\r?\n/)
        .filter(line => line.trim().length > 0)
        .slice(0, sampleLines);

    if (lines.length < 2) {
        return DEFAULT_CSV_OPTIONS.delimiter;
    }

    let bestDelimiter = DEFAULT_CSV_OPTIONS.delimiter;
    let bestScore = 0;

    delimitersToTest.forEach(delimiter => {
        const score = calculateDelimiterScore(lines, delimiter, minConsistency);

        if (score > bestScore) {
            bestScore = score;
            bestDelimiter = delimiter;
        }
    });

    return bestDelimiter;
};

/**
 * Calcula el score de un delimitador basado en consistencia
 * @param {Array} lines - Líneas de muestra
 * @param {string} delimiter - Delimitador a probar
 * @param {number} minConsistency - Consistencia mínima requerida
 * @returns {number} Score del delimitador
 */
const calculateDelimiterScore = (lines, delimiter, minConsistency) => {
    // Contar columnas en cada línea (ignorando comillas por simplicidad)
    const columnCounts = lines.map(line => {
        // Simple split para detección rápida
        return line.split(delimiter).length;
    });

    if (columnCounts.length === 0) {
        return 0;
    }

    // Calcular consistencia
    const firstCount = columnCounts[0];
    const consistentLines = columnCounts.filter(count => count === firstCount).length;
    const consistency = consistentLines / columnCounts.length;

    // Penalizar si hay muy pocas columnas
    if (firstCount < 2) {
        return 0;
    }

    // Penalizar si la consistencia es muy baja
    if (consistency < minConsistency) {
        return 0;
    }

    // Score = consistencia * número de columnas
    return consistency * firstCount;
};

/**
 * Parsea una línea CSV simple (sin manejo complejo de comillas)
 * @param {string} line - Línea CSV
 * @param {Object} options - Opciones de parsing
 * @returns {Array} Array de valores
 */
export const parseCSVLine = (line, options = {}) => {
    const {
        delimiter = DEFAULT_CSV_OPTIONS.delimiter,
        quoteChar = DEFAULT_CSV_OPTIONS.quoteChar,
        trimWhitespace = true
    } = options;

    if (!line || typeof line !== 'string') {
        return [];
    }

    const values = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === quoteChar) {
            if (inQuotes && nextChar === quoteChar) {
                // Comilla escapada
                current += quoteChar;
                i += 2;
            } else {
                // Toggle estado de comillas
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === delimiter && !inQuotes) {
            // Delimiter encontrado fuera de comillas
            values.push(trimWhitespace ? current.trim() : current);
            current = '';
            i++;
        } else {
            // Carácter normal
            current += char;
            i++;
        }
    }

    // Agregar último valor
    values.push(trimWhitespace ? current.trim() : current);

    return values;
};

/**
 * Valida estructura de datos para CSV
 * @param {Array} data - Datos a validar
 * @param {Array} columns - Columnas a validar
 * @returns {Object} Resultado de validación
 */
export const validateCSVData = (data, columns) => {
    const errors = [];
    const warnings = [];

    // Validar que data sea un array
    if (!Array.isArray(data)) {
        errors.push('Data must be an array');
        return { isValid: false, errors, warnings };
    }

    // Validar que columns sea un array
    if (!Array.isArray(columns)) {
        errors.push('Columns must be an array');
        return { isValid: false, errors, warnings };
    }

    // Verificar que haya al menos una columna
    if (columns.length === 0) {
        warnings.push('No columns defined');
    }

    // Validar estructura de columnas
    columns.forEach((col, index) => {
        if (typeof col !== 'string' && (typeof col !== 'object' || col === null)) {
            errors.push(`Column at index ${index} must be string or object`);
        } else if (typeof col === 'object' && !col.key && !col.field && !col.dataIndex) {
            errors.push(`Column object at index ${index} must have 'key', 'field', or 'dataIndex' property`);
        }
    });

    // Verificar que los datos no estén vacíos
    if (data.length === 0) {
        warnings.push('No data rows provided');
    }

    // Verificar estructura de datos (muestra)
    const sampleSize = Math.min(data.length, 10);
    for (let i = 0; i < sampleSize; i++) {
        const row = data[i];
        if (row !== null && row !== undefined && typeof row !== 'object') {
            errors.push(`Data row at index ${i} must be an object or null/undefined`);
            break;
        }
    }

    // Verificar que las columnas existen en los datos
    if (data.length > 0 && columns.length > 0) {
        const sampleRow = data.find(row => row && typeof row === 'object');

        if (sampleRow) {
            const missingColumns = [];

            columns.forEach(col => {
                const key = typeof col === 'string'
                    ? col
                    : (col.key || col.field || col.dataIndex);

                if (key && !hasNestedProperty(sampleRow, key)) {
                    missingColumns.push(key);
                }
            });

            if (missingColumns.length > 0) {
                warnings.push(`Columns not found in sample data: ${missingColumns.join(', ')}`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        rowCount: data.length,
        columnCount: columns.length
    };
};

/**
 * Verifica si un objeto tiene una propiedad anidada
 * @param {Object} obj - Objeto a verificar
 * @param {string} path - Ruta con dot notation
 * @returns {boolean} True si la propiedad existe
 */
const hasNestedProperty = (obj, path) => {
    if (!obj || typeof path !== 'string') {
        return false;
    }

    return path.split('.').reduce((current, key) => {
        return current && typeof current === 'object' && key in current ? current[key] : undefined;
    }, obj) !== undefined;
};

/**
 * Convierte CSV a array de objetos (parsing básico)
 * @param {string} csvContent - Contenido CSV
 * @param {Object} options - Opciones de parsing
 * @returns {Array} Array de objetos
 */
export const csvToData = (csvContent, options = {}) => {
    const {
        delimiter = null, // Auto-detectar si es null
        hasHeaders = true,
        headerRow = 0,
        skipEmptyLines = true,
        maxRows = null,
        ...parseOptions
    } = options;

    if (!csvContent || typeof csvContent !== 'string') {
        return [];
    }

    // Auto-detectar delimitador si no se especifica
    const finalDelimiter = delimiter || detectDelimiter(csvContent);

    // Dividir en líneas
    const allLines = csvContent
        .split(/\r?\n/)
        .filter(line => !skipEmptyLines || line.trim().length > 0);

    if (allLines.length === 0) {
        return [];
    }

    // Obtener cabeceras si existen
    let headers = [];
    let dataStartIndex = 0;

    if (hasHeaders && allLines.length > headerRow) {
        headers = parseCSVLine(allLines[headerRow], {
            ...parseOptions,
            delimiter: finalDelimiter
        });
        dataStartIndex = headerRow + 1;
    }

    // Generar cabeceras automáticas si no hay
    if (!hasHeaders || headers.length === 0) {
        const firstLine = allLines[0];
        if (firstLine) {
            const firstRowValues = parseCSVLine(firstLine, {
                ...parseOptions,
                delimiter: finalDelimiter
            });
            headers = firstRowValues.map((_, index) => `column_${index + 1}`);
        }
    }

    // Parsear filas de datos
    const dataLines = allLines.slice(dataStartIndex);
    const maxRowsToProcess = maxRows ? Math.min(dataLines.length, maxRows) : dataLines.length;

    const data = [];

    for (let i = 0; i < maxRowsToProcess; i++) {
        const line = dataLines[i];

        try {
            const values = parseCSVLine(line, {
                ...parseOptions,
                delimiter: finalDelimiter
            });

            // Crear objeto usando headers
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            data.push(row);
        } catch (error) {
            console.warn(`Error parsing line ${i + dataStartIndex + 1}:`, error);
            // Continuar con las demás líneas
        }
    }

    return data;
};

/**
 * Añade BOM UTF-8 a contenido CSV
 * @param {string} csvContent - Contenido CSV
 * @returns {string} CSV con BOM
 */
export const addBOM = (csvContent) => {
    const BOM = '\uFEFF';
    return BOM + csvContent;
};

/**
 * Sanitiza nombre de archivo para CSV
 * @param {string} filename - Nombre a sanitizar
 * @returns {string} Nombre sanitizado
 */
export const sanitizeCSVFilename = (filename) => {
    if (!filename) return 'export.csv';

    return filename
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 200) // Límite razonable
        + (filename.endsWith('.csv') ? '' : '.csv');
};

/**
 * Obtiene estadísticas de un CSV
 * @param {string} csvContent - Contenido CSV
 * @param {Object} options - Opciones
 * @returns {Object} Estadísticas
 */
export const getCSVStats = (csvContent, options = {}) => {
    if (!csvContent) {
        return {
            lines: 0,
            columns: 0,
            delimiter: DEFAULT_CSV_OPTIONS.delimiter,
            hasHeaders: false,
            encoding: 'unknown',
            size: 0
        };
    }

    const delimiter = detectDelimiter(csvContent);
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    const firstLine = lines[0] || '';
    const sampleColumns = firstLine ? parseCSVLine(firstLine, { delimiter }).length : 0;

    return {
        lines: lines.length,
        columns: sampleColumns,
        delimiter,
        hasHeaders: options.hasHeaders !== false, // Asumir true por defecto
        encoding: csvContent.charCodeAt(0) === 0xFEFF ? 'utf-8-bom' : 'utf-8',
        size: new Blob([csvContent]).size,
        sampleLine: firstLine.substring(0, 100) + (firstLine.length > 100 ? '...' : '')
    };
};

// Exportar constantes útiles
export const CSV_CONSTANTS = {
    SPECIAL_CHARS: CSV_SPECIAL_CHARS,
    COMMON_DELIMITERS,
    DEFAULT_OPTIONS: DEFAULT_CSV_OPTIONS
};

// Exportar objeto con todas las funciones para compatibilidad
export default {
    escapeCSVValue,
    arrayToCSVLine,
    objectToCSVLine,
    generateCSVHeaders,
    dataToCSV,
    detectDelimiter,
    parseCSVLine,
    validateCSVData,
    csvToData,
    addBOM,
    sanitizeCSVFilename,
    getCSVStats,
    CSV_CONSTANTS
};