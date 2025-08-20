/**
 * Exportador JSON con proyección por columnas, múltiples datasets y formateo
 * Soporta transformaciones, filtrado y estructuras jerárquicas
 */

/**
 * Aplica proyección de columnas a un objeto
 * @param {Object} row - Objeto fuente
 * @param {Array} columns - Definición de columnas para proyección
 * @param {Object} options - Opciones de proyección
 * @returns {Object} Objeto proyectado
 */
const projectRow = (row, columns, options = {}) => {
    const {
        includeAllFields = false,
        excludeNull = false,
        excludeUndefined = true,
        flattenObjects = false
    } = options;

    if (!row || typeof row !== 'object') {
        return {};
    }

    // Si no hay columnas definidas, retornar el objeto completo o vacío
    if (!columns || columns.length === 0) {
        return includeAllFields ? { ...row } : {};
    }

    const projected = {};

    columns.forEach(col => {
        let key, outputKey, formatter, defaultValue, nested;

        if (typeof col === 'string') {
            // Columna simple por nombre
            key = col;
            outputKey = col;
        } else if (typeof col === 'object') {
            // Columna con configuración
            key = col.key || col.field || col.dataIndex;
            outputKey = col.outputKey || col.as || col.alias || key;
            formatter = col.formatter || col.transform;
            defaultValue = col.defaultValue;
            nested = col.nested;
        }

        if (!key) return;

        // Obtener valor, soportando dot notation para objetos anidados
        let value = getNestedValue(row, key);

        // Aplicar valor por defecto si es necesario
        if ((value === null || value === undefined) && defaultValue !== undefined) {
            value = typeof defaultValue === 'function' ? defaultValue(row) : defaultValue;
        }

        // Filtrar valores nulos/undefined si se solicita
        if (excludeNull && value === null) return;
        if (excludeUndefined && value === undefined) return;

        // Aplicar formatter/transform si existe
        if (formatter && typeof formatter === 'function') {
            try {
                value = formatter(value, row);
            } catch (error) {
                console.warn(`Error formatting field ${key}:`, error);
                // Mantener valor original si el formatter falla
            }
        }

        // Manejar objetos anidados
        if (nested && value && typeof value === 'object') {
            if (Array.isArray(nested)) {
                // Proyectar array de objetos
                if (Array.isArray(value)) {
                    value = value.map(item => projectRow(item, nested, options));
                } else {
                    value = projectRow(value, nested, options);
                }
            } else if (flattenObjects && typeof value === 'object') {
                // Aplanar objeto anidado
                Object.keys(value).forEach(nestedKey => {
                    const flatKey = `${outputKey}.${nestedKey}`;
                    projected[flatKey] = value[nestedKey];
                });
                return; // No agregar el objeto original
            }
        }

        // Asignar valor proyectado
        setNestedValue(projected, outputKey, value);
    });

    return projected;
};

/**
 * Obtiene valor anidado usando dot notation
 * @param {Object} obj - Objeto fuente
 * @param {string} path - Ruta con dot notation (ej: "user.profile.name")
 * @returns {*} Valor encontrado
 */
const getNestedValue = (obj, path) => {
    if (!obj || typeof path !== 'string') return undefined;

    return path.split('.').reduce((current, key) => {
        return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
};

/**
 * Establece valor anidado usando dot notation
 * @param {Object} obj - Objeto destino
 * @param {string} path - Ruta con dot notation
 * @param {*} value - Valor a establecer
 */
const setNestedValue = (obj, path, value) => {
    if (!obj || typeof path !== 'string') return;

    const keys = path.split('.');
    const lastKey = keys.pop();

    const target = keys.reduce((current, key) => {
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        }
        return current[key];
    }, obj);

    target[lastKey] = value;
};

/**
 * Procesa un dataset aplicando proyección y filtros
 * @param {Array} data - Array de objetos
 * @param {Array} columns - Definición de columnas
 * @param {Object} options - Opciones de procesamiento
 * @returns {Array} Array procesado
 */
const processDataset = (data, columns, options = {}) => {
    const {
        filter = null,
        sort = null,
        limit = null,
        offset = 0,
        ...projectionOptions
    } = options;

    if (!Array.isArray(data)) {
        return [];
    }

    let processed = [...data];

    // Aplicar filtro si existe
    if (filter && typeof filter === 'function') {
        processed = processed.filter(filter);
    }

    // Aplicar proyección de columnas
    processed = processed.map(row => projectRow(row, columns, projectionOptions));

    // Aplicar ordenamiento si existe
    if (sort) {
        if (typeof sort === 'function') {
            processed = processed.sort(sort);
        } else if (typeof sort === 'string') {
            // Ordenamiento simple por campo
            processed = processed.sort((a, b) => {
                const aVal = getNestedValue(a, sort);
                const bVal = getNestedValue(b, sort);

                if (aVal < bVal) return -1;
                if (aVal > bVal) return 1;
                return 0;
            });
        } else if (Array.isArray(sort)) {
            // Ordenamiento múltiple: [{ field: 'name', order: 'asc' }, ...]
            processed = processed.sort((a, b) => {
                for (const sortOption of sort) {
                    const { field, order = 'asc' } = sortOption;
                    const aVal = getNestedValue(a, field);
                    const bVal = getNestedValue(b, field);

                    let comparison = 0;
                    if (aVal < bVal) comparison = -1;
                    else if (aVal > bVal) comparison = 1;

                    if (comparison !== 0) {
                        return order === 'desc' ? -comparison : comparison;
                    }
                }
                return 0;
            });
        }
    }

    // Aplicar offset y limit (paginación)
    if (offset > 0 || limit !== null) {
        const start = Math.max(0, offset);
        const end = limit !== null ? start + limit : undefined;
        processed = processed.slice(start, end);
    }

    return processed;
};

/**
 * Genera estructura JSON con metadatos
 * @param {*} content - Contenido principal
 * @param {Object} metadata - Metadatos adicionales
 * @param {Object} options - Opciones de estructura
 * @returns {Object} Objeto JSON estructurado
 */
const generateStructuredJSON = (content, metadata = {}, options = {}) => {
    const {
        includeMetadata = true,
        metadataKey = 'meta',
        dataKey = 'data',
        format = 'structured', // 'structured', 'simple', 'envelope'
        timestamp = true
    } = options;

    switch (format) {
        case 'simple':
            // Solo el contenido, sin estructura adicional
            return content;

        case 'envelope':
            // Formato envelope con success/data
            return {
                success: true,
                [dataKey]: content,
                ...(includeMetadata && {
                    [metadataKey]: {
                        ...metadata,
                        ...(timestamp && { exportedAt: new Date().toISOString() })
                    }
                })
            };

        case 'structured':
        default:
            // Formato estructurado completo
            const result = {
                [dataKey]: content
            };

            if (includeMetadata) {
                result[metadataKey] = {
                    exportFormat: 'json',
                    recordCount: Array.isArray(content) ? content.length : 1,
                    ...metadata,
                    ...(timestamp && {
                        exportedAt: new Date().toISOString(),
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    })
                };
            }

            return result;
    }
};

/**
 * Valida los datos antes de la exportación JSON
 * @param {*} data - Datos a validar
 * @param {Array} columns - Columnas a validar
 * @returns {Object} Resultado de validación
 */
const validateData = (data, columns) => {
    const errors = [];
    const warnings = [];

    // Validar que data existe
    if (data === null || data === undefined) {
        errors.push('Data cannot be null or undefined');
        return { isValid: false, errors, warnings };
    }

    // Si columns está definido, debe ser un array
    if (columns !== undefined && !Array.isArray(columns)) {
        errors.push('Columns must be an array when provided');
    }

    // Verificar que los datos sean serializables
    try {
        JSON.stringify(data);
    } catch (error) {
        errors.push(`Data contains non-serializable values: ${error.message}`);
    }

    // Validar estructura de columnas si se proporciona
    if (Array.isArray(columns)) {
        columns.forEach((col, index) => {
            if (typeof col !== 'string' && typeof col !== 'object') {
                errors.push(`Column at index ${index} must be string or object`);
            } else if (typeof col === 'object' && !col.key && !col.field && !col.dataIndex) {
                errors.push(`Column at index ${index} must have 'key', 'field', or 'dataIndex' property`);
            }
        });
    }

    // Advertencias específicas
    if (Array.isArray(data) && data.length === 0) {
        warnings.push('Data array is empty');
    }

    if (Array.isArray(columns) && columns.length === 0) {
        warnings.push('No columns defined for projection');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Función principal de exportación JSON
 * @param {*} input - Datos o configuración de datasets
 * @param {Object} exportOptions - Opciones de exportación
 * @param {AbortSignal} signal - Señal para cancelar operación
 * @returns {Promise<Blob>} Blob con el archivo JSON
 */
export const exportJSON = async (input, exportOptions = {}, signal = null) => {
    try {
        // Verificar cancelación
        if (signal?.aborted) {
            throw new Error('JSON export was cancelled');
        }

        const {
            columns = [],
            filename = 'export.json',
            indent = 2,
            validateInput = true,
            includeMetadata = true,
            format = 'structured',
            encoding = 'utf-8',
            branding = {},
            ...processingOptions
        } = exportOptions;

        let result;

        // Determinar si son múltiples datasets o datos simples
        if (input.datasets && Array.isArray(input.datasets)) {
            // Múltiples datasets
            const processedDatasets = {};
            const metadata = {
                datasetsCount: input.datasets.length,
                totalRecords: 0,
                datasets: []
            };

            for (const dataset of input.datasets) {
                const {
                    name = `dataset_${Object.keys(processedDatasets).length + 1}`,
                    data = [],
                    columns: datasetColumns = [],
                    options: datasetOptions = {}
                } = dataset;

                if (validateInput) {
                    const validation = validateData(data, datasetColumns);
                    if (!validation.isValid) {
                        throw new Error(`Dataset '${name}' validation failed: ${validation.errors.join(', ')}`);
                    }
                }

                // Verificar cancelación durante procesamiento
                if (signal?.aborted) {
                    throw new Error('JSON export was cancelled');
                }

                const processedData = processDataset(data, datasetColumns, {
                    ...processingOptions,
                    ...datasetOptions
                });

                processedDatasets[name] = processedData;

                metadata.totalRecords += processedData.length;
                metadata.datasets.push({
                    name,
                    recordCount: processedData.length,
                    columns: datasetColumns.length
                });
            }

            result = generateStructuredJSON(processedDatasets, {
                ...metadata,
                ...branding
            }, {
                includeMetadata,
                format,
                dataKey: 'datasets'
            });

        } else {
            // Dataset simple
            const data = input.data !== undefined ? input.data : input;
            const cols = columns.length > 0 ? columns : (input.columns || []);

            if (validateInput) {
                const validation = validateData(data, cols);
                if (!validation.isValid) {
                    throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
                }
            }

            // Verificar cancelación antes de procesar
            if (signal?.aborted) {
                throw new Error('JSON export was cancelled');
            }

            const processedData = Array.isArray(data)
                ? processDataset(data, cols, processingOptions)
                : projectRow(data, cols, processingOptions);

            const metadata = {
                recordCount: Array.isArray(processedData) ? processedData.length : 1,
                columnsCount: cols.length,
                ...branding
            };

            result = generateStructuredJSON(processedData, metadata, {
                includeMetadata,
                format
            });
        }

        // Verificar cancelación antes de serializar
        if (signal?.aborted) {
            throw new Error('JSON export was cancelled');
        }

        // Serializar a JSON
        const jsonString = JSON.stringify(result, null, indent);

        // Crear blob
        const mimeType = 'application/json;charset=utf-8';
        const blob = new Blob([jsonString], { type: mimeType });

        // Agregar propiedades adicionales para compatibilidad
        Object.defineProperties(blob, {
            suggestedFilename: {
                value: filename.endsWith('.json') ? filename : `${filename}.json`,
                writable: false,
                enumerable: false
            },
            exportFormat: {
                value: 'json',
                writable: false,
                enumerable: false
            },
            exportOptions: {
                value: { ...exportOptions },
                writable: false,
                enumerable: false
            }
        });

        return blob;

    } catch (error) {
        throw new Error(`JSON export failed: ${error.message}`);
    }
};

/**
 * Función auxiliar para exportar con proyección simple
 * @param {Array} data - Array de objetos
 * @param {Array} columns - Columnas para proyección
 * @param {Object} options - Opciones de exportación
 * @returns {Promise<Blob>} Blob con el JSON
 */
export const exportProjectedJSON = async (data, columns, options = {}) => {
    return exportJSON(data, {
        ...options,
        columns,
        format: 'simple' // Solo los datos proyectados
    });
};

/**
 * Función auxiliar para exportar múltiples datasets
 * @param {Array} datasets - Array de datasets
 * @param {Object} options - Opciones globales
 * @returns {Promise<Blob>} Blob con el JSON combinado
 */
export const exportMultipleJSON = async (datasets, options = {}) => {
    return exportJSON({ datasets }, options);
};

/**
 * Función auxiliar para exportar con estructura envelope
 * @param {*} data - Datos a exportar
 * @param {Object} options - Opciones de exportación
 * @returns {Promise<Blob>} Blob con estructura envelope
 */
export const exportEnvelopeJSON = async (data, options = {}) => {
    return exportJSON(data, {
        ...options,
        format: 'envelope'
    });
};

/**
 * Optimiza el JSON para tamaño reducido
 * @param {*} data - Datos a optimizar
 * @param {Object} options - Opciones de optimización
 * @returns {*} Datos optimizados
 */
export const optimizeForSize = (data, options = {}) => {
    const {
        removeNull = true,
        removeUndefined = true,
        removeEmptyStrings = false,
        removeEmptyArrays = false,
        removeEmptyObjects = false,
        compactNumbers = true
    } = options;

    const optimize = (obj) => {
        if (obj === null) {
            return removeNull ? undefined : obj;
        }

        if (obj === undefined) {
            return removeUndefined ? undefined : obj;
        }

        if (typeof obj === 'string') {
            return (removeEmptyStrings && obj === '') ? undefined : obj;
        }

        if (typeof obj === 'number' && compactNumbers) {
            // Reducir decimales innecesarios
            return Number(obj.toPrecision(10));
        }

        if (Array.isArray(obj)) {
            const optimized = obj.map(optimize).filter(item => item !== undefined);
            return (removeEmptyArrays && optimized.length === 0) ? undefined : optimized;
        }

        if (typeof obj === 'object') {
            const optimized = {};
            let hasProperties = false;

            Object.keys(obj).forEach(key => {
                const value = optimize(obj[key]);
                if (value !== undefined) {
                    optimized[key] = value;
                    hasProperties = true;
                }
            });

            return (removeEmptyObjects && !hasProperties) ? undefined : optimized;
        }

        return obj;
    };

    return optimize(data);
};

// Exportar objeto con todas las funciones para compatibilidad
export default {
    export: exportJSON,
    exportProjected: exportProjectedJSON,
    exportMultiple: exportMultipleJSON,
    exportEnvelope: exportEnvelopeJSON,
    validateData,
    processDataset,
    projectRow,
    optimizeForSize,
    getNestedValue,
    setNestedValue
};