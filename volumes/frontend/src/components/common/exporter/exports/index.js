/**
 * Sistema de registro y resolución de exportadores
 * Maneja carga diferida de dependencias y registro dinámico de formatos
 */

import config from './config.export.json';

/**
 * Registro de exportadores disponibles
 * Cada exportador se carga de forma diferida cuando se necesita
 */
const exporterRegistry = new Map();

/**
 * Cache de exportadores ya cargados
 */
const loadedExporters = new Map();

/**
 * Definiciones de exportadores con carga diferida
 */
const exporterDefinitions = {
    // Exportadores simples
    'csv': {
        name: 'CSV',
        description: 'Valores separados por comas',
        icon: '📄',
        loader: () => import('./exporters/csv-exporter.js'),
        dependencies: [], // Sin dependencias externas
        formats: ['csv']
    },

    'json': {
        name: 'JSON',
        description: 'JavaScript Object Notation',
        icon: '{ }',
        loader: () => import('./exporters/json-exporter.js'),
        dependencies: [],
        formats: ['json']
    },

    // Exportadores Excel
    'xlsx': {
        name: 'Excel Simple',
        description: 'Archivo Excel básico',
        icon: '📊',
        loader: () => import('./exporters/xlsx-simple.js'),
        dependencies: ['xlsx'],
        formats: ['xlsx', 'xls']
    },

    'xlsx-branded': {
        name: 'Excel Corporativo',
        description: 'Excel con branding y formato avanzado',
        icon: '🏢📊',
        loader: () => import('./exporters/xlsx-branded.js'),
        dependencies: ['exceljs'],
        formats: ['xlsx-branded']
    },

    // Exportadores PDF
    'pdf': {
        name: 'PDF Simple',
        description: 'Documento PDF básico',
        icon: '📄',
        loader: () => import('./exporters/pdf-simple.js'),
        dependencies: ['pdfmake'],
        formats: ['pdf']
    },

    'pdf-branded': {
        name: 'PDF Corporativo',
        description: 'PDF con branding corporativo',
        icon: '🏢📄',
        loader: () => import('./exporters/pdf-branded.js'),
        dependencies: ['pdfmake'],
        formats: ['pdf-branded']
    },

    // ================================================
    // NUEVO - PDF BUILDER API
    // ================================================
    'pdf-builder': {
        name: 'PDF Builder',
        description: 'Constructor fluido de documentos PDF',
        icon: '🔧📄',
        loader: () => import('./exporters/pdf-simple.js'), // Reutiliza pdf-simple
        dependencies: ['pdfmake'],
        formats: ['pdf-builder'],
        builderMode: true, // Indica que es un constructor, no exportador directo
        supportedMethods: [
            'createPDFBuilder',
            'createSimpleBuilder'
        ]
    },

    'pdf-builder-branded': {
        name: 'PDF Builder Corporativo',
        description: 'Constructor fluido con branding corporativo',
        icon: '🏢🔧📄',
        loader: () => import('./exporters/pdf-branded.js'), // Reutiliza pdf-branded
        dependencies: ['pdfmake'],
        formats: ['pdf-builder-branded'],
        builderMode: true,
        supportedMethods: [
            'createCorporatePDFBuilder',
            'createBrandedBuilder'
        ]
    }
};

/**
 * Registra todos los exportadores por defecto
 */
const registerDefaultExporters = () => {
    Object.entries(exporterDefinitions).forEach(([key, definition]) => {
        exporterRegistry.set(key, definition);
    });
    console.log(`✅ Registrados ${exporterRegistry.size} exportadores`);
};

/**
 * Registra un exportador personalizado
 * @param {string} key - Clave única del exportador
 * @param {Object} definition - Definición del exportador
 */
const registerExporter = (key, definition) => {
    if (!key || !definition) {
        throw new Error('Key y definition son requeridos');
    }

    if (!definition.loader || typeof definition.loader !== 'function') {
        throw new Error('Definition debe tener un loader function');
    }

    exporterRegistry.set(key, {
        name: definition.name || key,
        description: definition.description || '',
        icon: definition.icon || '📄',
        loader: definition.loader,
        dependencies: definition.dependencies || [],
        formats: definition.formats || [key],
        builderMode: definition.builderMode || false,
        supportedMethods: definition.supportedMethods || []
    });

    console.log(`✅ Exportador registrado: ${key}`);
};

/**
 * Carga un exportador de forma diferida
 * @param {string} format - Formato a exportar
 * @returns {Promise<Object>} Módulo del exportador cargado
 */
const loadExporter = async (format) => {
    // Verificar si ya está cargado
    if (loadedExporters.has(format)) {
        return loadedExporters.get(format);
    }

    // Buscar exportador que soporte este formato
    let exporterKey = null;
    let exporterDefinition = null;

    for (const [key, definition] of exporterRegistry.entries()) {
        if (definition.formats.includes(format)) {
            exporterKey = key;
            exporterDefinition = definition;
            break;
        }
    }

    if (!exporterDefinition) {
        throw new Error(`No se encontró exportador para el formato: ${format}`);
    }

    try {
        console.log(`🔄 Cargando exportador: ${exporterKey}`);

        // Cargar módulo
        const module = await exporterDefinition.loader();

        // Guardar en cache
        loadedExporters.set(format, {
            module,
            definition: exporterDefinition,
            loadedAt: Date.now()
        });

        console.log(`✅ Exportador cargado: ${exporterKey}`);
        return loadedExporters.get(format);

    } catch (error) {
        console.error(`❌ Error cargando exportador ${exporterKey}:`, error);
        throw new Error(`Failed to load exporter for format: ${format}`);
    }
};

/**
 * Exporta datos usando el formato especificado
 * @param {string} format - Formato de exportación
 * @param {any} data - Datos a exportar
 * @param {Object} options - Opciones de exportación
 * @param {AbortSignal} signal - Señal de cancelación
 * @returns {Promise<Blob>} Resultado de la exportación
 */
const exportData = async (format, data, options = {}, signal = null) => {
    const exporter = await loadExporter(format);
    const { module, definition } = exporter;

    // Verificar si es modo builder
    if (definition.builderMode) {
        throw new Error(`El formato ${format} es un builder. Use createBuilder() en su lugar.`);
    }

    // Determinar función de exportación
    let exportFunction = null;

    if (format.includes('branded')) {
        exportFunction = module.exportBrandedPDF || module.exportBranded || module.export;
    } else if (format.includes('pdf')) {
        exportFunction = module.exportSimplePDF || module.exportPDF || module.export;
    } else {
        exportFunction = module.export || module.default;
    }

    if (!exportFunction || typeof exportFunction !== 'function') {
        throw new Error(`Función de exportación no encontrada para ${format}`);
    }

    // Ejecutar exportación
    return exportFunction(data, options, signal);
};

/**
 * Crea un builder para construcción fluida de documentos
 * @param {string} format - Formato del builder ('pdf-builder', 'pdf-builder-branded')
 * @param {Object} options - Opciones iniciales
 * @returns {Promise<Object>} Instancia del builder
 */
const createBuilder = async (format, options = {}) => {
    const exporter = await loadExporter(format);
    const { module, definition } = exporter;

    // Verificar que es modo builder
    if (!definition.builderMode) {
        throw new Error(`El formato ${format} no es un builder`);
    }

    // Determinar función de creación del builder
    let builderFunction = null;

    if (format.includes('branded')) {
        builderFunction = module.createCorporatePDFBuilder || module.createBrandedBuilder;
    } else {
        builderFunction = module.createPDFBuilder || module.createSimpleBuilder;
    }

    if (!builderFunction || typeof builderFunction !== 'function') {
        throw new Error(`Función de builder no encontrada para ${format}`);
    }

    // Crear y retornar builder
    return builderFunction(options);
};

/**
 * Obtiene información de un exportador
 * @param {string} format - Formato a consultar
 * @returns {Object} Información del exportador
 */
const getExporterInfo = (format) => {
    for (const [key, definition] of exporterRegistry.entries()) {
        if (definition.formats.includes(format)) {
            return {
                key,
                ...definition,
                isLoaded: loadedExporters.has(format)
            };
        }
    }
    return null;
};

/**
 * Lista todos los formatos disponibles
 * @returns {Array} Lista de formatos soportados
 */
const getAvailableFormats = () => {
    const formats = [];
    for (const definition of exporterRegistry.values()) {
        formats.push(...definition.formats);
    }
    return [...new Set(formats)];
};

/**
 * Lista todos los builders disponibles
 * @returns {Array} Lista de builders soportados
 */
const getAvailableBuilders = () => {
    const builders = [];
    for (const [key, definition] of exporterRegistry.entries()) {
        if (definition.builderMode) {
            builders.push({
                key,
                formats: definition.formats,
                methods: definition.supportedMethods,
                ...definition
            });
        }
    }
    return builders;
};

/**
 * Obtiene estadísticas del sistema de exportación
 * @returns {Object} Estadísticas
 */
const getExportStats = () => {
    return {
        totalExporters: exporterRegistry.size,
        loadedExporters: loadedExporters.size,
        availableFormats: getAvailableFormats().length,
        availableBuilders: getAvailableBuilders().length,
        loadedFormats: Array.from(loadedExporters.keys()),
        builderFormats: getAvailableBuilders().map(b => b.formats).flat()
    };
};

/**
 * Limpia el cache de exportadores cargados
 */
const clearExporterCache = () => {
    const count = loadedExporters.size;
    loadedExporters.clear();
    console.log(`🧹 Cache limpiado: ${count} exportadores descargados`);
};

/**
 * Obtiene valor anidado usando dot notation - FUNCIÓN CORREGIDA PARA PDF
 * @param {Object} obj - Objeto fuente
 * @param {string} path - Ruta con dot notation (ej: "customer.contact.email")
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
 * Procesa una fila de datos aplicando columnas con dot notation y formatters
 * @param {Object} row - Fila de datos
 * @param {Array} columns - Definición de columnas
 * @returns {Array} Array de valores procesados para la fila
 */
const processRowForPDF = (row, columns) => {
    if (!Array.isArray(columns) || columns.length === 0) {
        return Object.values(row || {});
    }

    return columns.map(col => {
        let value;

        if (typeof col === 'string') {
            // Columna simple por nombre
            value = getNestedValue(row, col);
        } else if (typeof col === 'object' && col !== null) {
            // Columna con configuración
            const key = col.key || col.field || col.dataIndex || col.accessor;
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

        // Manejar valores null/undefined
        if (value === null || value === undefined || value === '') {
            return '-';
        }

        // Convertir a string y truncar si es muy largo
        let stringValue = String(value);
        if (stringValue.length > 50) {
            stringValue = stringValue.substring(0, 47) + '...';
        }

        return stringValue;
    });
};

/**
 * Intercepta y parchea las llamadas a convertDataToTable
 * @param {Function} originalExportPDF - Función original de exportPDF
 * @returns {Function} Función parcheada
 */
const patchPDFExportForDotNotation = (originalExportPDF) => {
    return async function patchedExportPDF(input, exportOptions = {}, signal = null) {
        // Interceptar y procesar datos antes de enviar al exportador original
        let processedInput = input;

        if (Array.isArray(input) && exportOptions.columns) {
            // Procesar datos planos
            processedInput = input.map(row => {
                const processedRow = {};

                exportOptions.columns.forEach((col, index) => {
                    const header = typeof col === 'string' ? col : (col.header || col.key || `col_${index}`);
                    const values = processRowForPDF([row], [col]);
                    processedRow[header] = values[0];
                });

                return processedRow;
            });

            // Modificar columnas para que usen las claves procesadas
            exportOptions.columns = exportOptions.columns.map((col, index) => {
                const header = typeof col === 'string' ? col : (col.header || col.key || `col_${index}`);
                return {
                    key: header,
                    header: header
                };
            });
        } else if (input && input.datasets) {
            // Procesar múltiples datasets
            processedInput = {
                ...input,
                datasets: input.datasets.map(dataset => ({
                    ...dataset,
                    data: dataset.data.map(row => {
                        const processedRow = {};

                        if (dataset.columns) {
                            dataset.columns.forEach((col, index) => {
                                const header = typeof col === 'string' ? col : (col.header || col.key || `col_${index}`);
                                const values = processRowForPDF([row], [col]);
                                processedRow[header] = values[0];
                            });
                        } else {
                            return row; // Sin columnas, usar datos originales
                        }

                        return processedRow;
                    }),
                    columns: dataset.columns ? dataset.columns.map((col, index) => {
                        const header = typeof col === 'string' ? col : (col.header || col.key || `col_${index}`);
                        return {
                            key: header,
                            header: header
                        };
                    }) : undefined
                }))
            };
        }

        // Llamar a la función original con datos procesados
        return originalExportPDF(processedInput, exportOptions, signal);
    };
};

/**
 * Obtiene un exportador específico para un formato (compatibilidad con useExport.js)
 * @param {string} format - Formato a exportar
 * @returns {Promise<Object>} Objeto con función export
 */
const getExporter = async (format) => {
    const exporter = await loadExporter(format);
    const { module, definition } = exporter;

    // Verificar si es modo builder
    if (definition.builderMode) {
        throw new Error(`El formato ${format} es un builder. Use createBuilder() en su lugar.`);
    }

    // Determinar función de exportación
    let exportFunction = null;

    if (format.includes('branded')) {
        exportFunction = module.exportBrandedPDF || module.exportBranded || module.export;
    } else if (format.includes('pdf')) {
        exportFunction = module.exportSimplePDF || module.exportPDF || module.export;
    } else {
        exportFunction = module.export || module.default;
    }

    if (!exportFunction || typeof exportFunction !== 'function') {
        throw new Error(`Función de exportación no encontrada para ${format}`);
    }

    // PARCHE TEMPORAL: Si es PDF, aplicar corrección de dot notation
    if (format.includes('pdf')) {
        exportFunction = patchPDFExportForDotNotation(exportFunction);
    }

    // Retornar objeto compatible con useExport.js
    return {
        export: exportFunction,
        format,
        definition,
        module
    };
};

/**
 * Obtiene lista de exportadores disponibles con información detallada
 * @param {Object} options - Opciones de filtrado
 * @returns {Array} Lista de exportadores disponibles
 */
const getAvailableExporters = (options = {}) => {
    const { formats = [], includeBuilders = false } = options;

    const exporters = [];

    for (const [key, definition] of exporterRegistry.entries()) {
        // Filtrar por formatos si se especifica
        if (formats.length > 0) {
            const hasMatchingFormat = definition.formats.some(format =>
                formats.includes(format)
            );
            if (!hasMatchingFormat) continue;
        }

        // Filtrar builders si no se incluyen
        if (!includeBuilders && definition.builderMode) {
            continue;
        }

        // Agregar información del exportador
        for (const format of definition.formats) {
            exporters.push({
                key,
                format,
                name: definition.name,
                description: definition.description,
                icon: definition.icon,
                dependencies: definition.dependencies,
                builderMode: definition.builderMode,
                isLoaded: loadedExporters.has(format)
            });
        }
    }

    return exporters;
};

/**
 * Obtiene etiquetas de formatos para internacionalización
 * @param {string} language - Idioma ('es', 'en')
 * @returns {Object} Objeto con etiquetas de formatos
 */
const getFormatLabels = (language = 'es') => {
    const labels = {
        es: {
            csv: 'CSV',
            json: 'JSON',
            xlsx: 'Excel',
            'xlsx-branded': 'Excel Corporativo',
            pdf: 'PDF',
            'pdf-branded': 'PDF Corporativo',
            export: 'Exportar',
            exporting: 'Exportando...',
            success: 'Exportado',
            error: 'Error'
        },
        en: {
            csv: 'CSV',
            json: 'JSON',
            xlsx: 'Excel',
            'xlsx-branded': 'Branded Excel',
            pdf: 'PDF',
            'pdf-branded': 'Branded PDF',
            export: 'Export',
            exporting: 'Exporting...',
            success: 'Exported',
            error: 'Error'
        }
    };

    return labels[language] || labels.es;
};

/**
 * Obtiene iconos de formatos
 * @returns {Object} Objeto con iconos de formatos
 */
const getFormatIcons = () => {
    return {
        csv: '📄',
        json: '{ }',
        xlsx: '📊',
        'xlsx-branded': '🏢📊',
        pdf: '📄',
        'pdf-branded': '🏢📄',
        'pdf-builder': '🔧📄',
        'pdf-builder-branded': '🏢🔧📄'
    };
};

/**
 * Verifica si un formato está soportado
 * @param {string} format - Formato a verificar
 * @returns {boolean}
 */
const isFormatSupported = (format) => {
    return getAvailableFormats().includes(format);
};

/**
 * Verifica si un formato es un builder
 * @param {string} format - Formato a verificar
 * @returns {boolean}
 */
const isBuilderFormat = (format) => {
    const info = getExporterInfo(format);
    return info ? info.builderMode : false;
};

// Inicializar sistema
registerDefaultExporters();

// ====================================
// EXPORTS - SIN DUPLICACIONES
// ====================================

export {
    registerExporter,
    loadExporter,
    exportData,
    createBuilder,
    getExporter,
    getExporterInfo,
    getAvailableFormats,
    getAvailableBuilders,
    getAvailableExporters,
    getFormatLabels,
    getFormatIcons,
    getExportStats,
    clearExporterCache,
    isFormatSupported,
    isBuilderFormat
};

// Export por defecto con funciones útiles
export default {
    register: registerExporter,
    load: loadExporter,
    export: exportData,
    createBuilder,
    getExporter,
    info: getExporterInfo,
    formats: getAvailableFormats,
    builders: getAvailableBuilders,
    exporters: getAvailableExporters,
    labels: getFormatLabels,
    icons: getFormatIcons,
    stats: getExportStats,
    clear: clearExporterCache,
    supports: isFormatSupported,
    isBuilderFormat
};