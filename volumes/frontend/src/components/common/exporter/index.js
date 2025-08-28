// src/export/index.js
// API principal del sistema de exportación

// === EXPORTADORES ===
// Exportadores principales por formato
export { csv } from './exporters/csv.js';
export { json } from './exporters/json.js';
export { excel } from './exporters/excel.js';
export { pdf } from './exporters/pdf.js';
export { txt } from './exporters/txt.js';

// === HOOKS DE REACT ===
// Hooks principales para manejo de exportaciones
export {
    useExport,           // Hook principal con todas las funcionalidades
    useQuickExport,      // Hook simplificado para un formato específico
    useConfigurableExport // Hook avanzado con formularios de configuración
} from './useExport.js';

// === COMPONENTES PRINCIPALES ===
// Componentes de botones
export { ExportButton } from './components/buttons/ExportButton.jsx';
export { ExportDropdown } from './components/buttons/ExportDropdown.jsx';

// Formulario principal
export { ExportForm } from './components/forms/ExportForm.jsx';

// === FORMULARIOS ESPECÍFICOS ===
// Formularios de configuración por formato
export { ExportFormJSON } from './components/forms/ExportFormJSON.jsx';
export { ExportFormCSV } from './components/forms/ExportFormCSV.jsx';
export { ExportFormExcel } from './components/forms/ExportFormExcel.jsx';
export { ExportFormPDF } from './components/forms/ExportFormPDF.jsx';
export { ExportFormTXT } from './components/forms/ExportFormTXT.jsx';

// === COMPONENTES DE UTILIDAD ===
// Componentes auxiliares
export {
    ExportProgress,        // Indicador de progreso principal
    ExportProgressInline,  // Versión inline pequeña
    ExportProgressToast,   // Versión toast/notificación
    ExportProgressBar      // Solo barra de progreso
} from './components/utils/ExportProgress.jsx';

// === CONFIGURACIÓN DEL SISTEMA ===
// Configuración principal y utilidades
export {
    // Configuración del sistema
    exportConfig,
    initializeExportSystem,
    resetSystem,
    getSystemState,

    // Manejo de dependencias
    loadDependency,

    // Configuración de exportación
    getExportConfig,
    validateFormat,

    // Esquemas y tipos
    dataSchema,
    configSchema,
    pdfContentSchema,
    supportedDataTypes,
    supportedFormats,

    // Configuraciones por defecto
    formatDefaults,
    globalDefaults,
    presetConfigs,
    getFormatDefaults,
    mergeConfig,
    generateFilename,
    getPresetConfig
} from './config/index.js';

// === UTILIDADES DE PROCESAMIENTO ===
// Clases y utilidades para procesamiento de datos
export {
    DataProcessor,     // Procesador principal de datos
    DataTransformer,   // Transformador para diferentes formatos
    dataUtils          // Utilidades generales de datos
} from './utils/data-processor.js';

// === VALIDACIÓN ===
// Sistema de validación
export {
    validateExportData,   // Validación principal
    validateDataType,     // Validación de tipos
    formatValue,          // Formateo de valores
    cleanDataForExport,   // Limpieza de datos
    autoDetectColumns     // Auto-detección de columnas
} from './utils/validation.js';

// === DESCARGAS ===
// Sistema de descargas automáticas
export {
    DownloadManager,    // Clase principal de manejo de descargas
    downloadManager,    // Instancia global
    downloadFile,       // Función de conveniencia
    downloadUtils       // Utilidades adicionales
} from './utils/download.js';

// === VERSIÓN Y METADATOS ===
/**
 * Información del paquete de exportación
 */
export const EXPORT_SYSTEM_INFO = {
    version: '1.0.0',
    name: 'Export System',
    description: 'Sistema completo de exportación de datos para React',
    author: 'Export System Team',
    supportedFormats: ['csv', 'json', 'excel', 'pdf', 'txt'],

    features: {
        multiFormat: true,
        customConfiguration: true,
        realTimePreview: true,
        progressTracking: true,
        darkMode: true,
        typescript: false,
        accessibility: true
    },

    dependencies: {
        required: ['react'],
        optional: ['xlsx', 'exceljs', 'pdfmake', 'file-saver'],
        tailwind: true
    },

    compatibility: {
        react: '>=16.8.0',
        browsers: ['Chrome', 'Firefox', 'Safari', 'Edge'],
        mobile: true
    }
};

// === FUNCIONES DE CONVENIENCIA ===
/**
 * Inicializa el sistema de exportación con configuración personalizada
 * @param {object} customConfig - Configuración personalizada
 * @returns {object} Estado del sistema inicializado
 * 
 * @example
 * import { initExportSystem } from './export';
 * 
 * const systemState = initExportSystem({
 *   enabledFormats: ['json', 'csv', 'pdf'],
 *   autoDownload: true,
 *   logging: { enabled: true }
 * });
 */
export const initExportSystem = (customConfig = {}) => {
    return initializeExportSystem(customConfig);
};

/**
 * Exporta datos rápidamente en un formato específico
 * @param {string} format - Formato de exportación
 * @param {object} data - Datos a exportar
 * @param {object} config - Configuración opcional
 * @returns {Promise<object>} Resultado de la exportación
 * 
 * @example
 * import { quickExport } from './export';
 * 
 * const result = await quickExport('json', {
 *   data: [{ id: 1, name: 'John' }],
 *   metadata: { title: 'Users' }
 * });
 */
export const quickExport = async (format, data, config = {}) => {
    // Importar dinámicamente el exportador
    const exporters = { csv, json, excel, pdf, txt };
    const exporter = exporters[format];

    if (!exporter) {
        throw new Error(`Formato no soportado: ${format}`);
    }

    // Obtener configuración completa
    const fullConfig = getExportConfig(format, config);

    // Ejecutar exportación
    return await exporter.export(data, fullConfig);
};

/**
 * Exporta en múltiples formatos simultáneamente
 * @param {array} formats - Array de formatos
 * @param {object} data - Datos a exportar
 * @param {object} baseConfig - Configuración base
 * @returns {Promise<object>} Resultados de todas las exportaciones
 * 
 * @example
 * import { multiExport } from './export';
 * 
 * const results = await multiExport(
 *   ['json', 'csv', 'pdf'], 
 *   { data: users },
 *   { filename: 'users_report' }
 * );
 */
export const multiExport = async (formats, data, baseConfig = {}) => {
    const results = {
        successful: [],
        failed: [],
        total: formats.length
    };

    // Exportar en paralelo
    const promises = formats.map(async (format) => {
        try {
            const result = await quickExport(format, data, {
                ...baseConfig,
                filename: baseConfig.filename ? `${baseConfig.filename}_${format}` : `export_${format}`
            });

            results.successful.push({ format, result });
            return { format, success: true, result };
        } catch (error) {
            results.failed.push({ format, error: error.message });
            return { format, success: false, error: error.message };
        }
    });

    await Promise.allSettled(promises);
    return results;
};

/**
 * Valida datos antes de exportar
 * @param {object} data - Datos a validar
 * @param {string} format - Formato objetivo
 * @param {object} config - Configuración
 * @returns {object} Resultado de validación
 * 
 * @example
 * import { validateData } from './export';
 * 
 * const validation = validateData(myData, 'json', myConfig);
 * if (!validation.valid) {
 *   console.error('Errores:', validation.errors);
 * }
 */
export const validateData = (data, format, config = {}) => {
    const fullConfig = getExportConfig(format, config);
    return validateExportData(data, fullConfig, format, exportConfig.limits);
};

/**
 * Obtiene información completa de un formato
 * @param {string} format - Formato a consultar
 * @returns {object} Información del formato
 * 
 * @example
 * import { getFormatInfo } from './export';
 * 
 * const info = getFormatInfo('excel');
 * console.log(info.features.supportsMultiSheet); // true
 */
export const getFormatInfo = (format) => {
    // Importar el exportador para obtener su información
    const exporters = { csv, json, excel, pdf, txt };
    const exporter = exporters[format];

    if (!exporter || typeof exporter.getFormatInfo !== 'function') {
        return null;
    }

    return {
        ...exporter.getFormatInfo(),
        systemInfo: supportedFormats[format] || null,
        available: validateFormat(format).valid
    };
};

/**
 * Crea datos de ejemplo para testing
 * @param {number} rows - Número de filas
 * @param {array} columns - Definición de columnas
 * @returns {object} Datos de ejemplo
 * 
 * @example
 * import { createSampleData } from './export';
 * 
 * const sampleData = createSampleData(100, [
 *   { key: 'id', type: 'number' },
 *   { key: 'name', type: 'string' },
 *   { key: 'email', type: 'string' }
 * ]);
 */
export const createSampleData = (rows = 10, columns = null) => {
    const defaultColumns = [
        { key: 'id', header: 'ID', type: 'number' },
        { key: 'name', header: 'Nombre', type: 'string' },
        { key: 'email', header: 'Email', type: 'string' },
        { key: 'active', header: 'Activo', type: 'boolean' },
        { key: 'created', header: 'Creado', type: 'date' }
    ];

    const sampleColumns = columns || defaultColumns;
    const data = [];

    for (let i = 0; i < rows; i++) {
        const row = {};

        sampleColumns.forEach(column => {
            switch (column.type) {
                case 'number':
                    row[column.key] = i + 1;
                    break;
                case 'string':
                    row[column.key] = column.key === 'name'
                        ? `Usuario ${i + 1}`
                        : column.key === 'email'
                            ? `user${i + 1}@example.com`
                            : `Valor ${i + 1}`;
                    break;
                case 'boolean':
                    row[column.key] = Math.random() > 0.5;
                    break;
                case 'date':
                    row[column.key] = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString();
                    break;
                default:
                    row[column.key] = `Dato ${i + 1}`;
            }
        });

        data.push(row);
    }

    return {
        data,
        columns: sampleColumns,
        metadata: {
            title: 'Datos de Ejemplo',
            description: `Dataset de ejemplo con ${rows} registros`,
            author: 'Sistema de Exportación',
            createdAt: new Date().toISOString()
        }
    };
};

// === EXPORT POR DEFECTO ===
/**
 * Exportación por defecto con las funciones más utilizadas
 */
export default {
    // Funciones principales
    quickExport,
    multiExport,
    validateData,
    createSampleData,

    // Hooks
    useExport,
    useQuickExport,
    useConfigurableExport,

    // Componentes principales
    ExportButton,
    ExportDropdown,
    ExportForm,
    ExportProgress,

    // Sistema
    initExportSystem,
    getSystemState,
    getFormatInfo,

    // Información
    version: EXPORT_SYSTEM_INFO.version,
    supportedFormats: EXPORT_SYSTEM_INFO.supportedFormats
};

// === VERIFICACIÓN DE DEPENDENCIAS ===
/**
 * Verifica las dependencias opcionales al cargar el módulo
 */
if (typeof window !== 'undefined') {
    // Verificar dependencias opcionales disponibles
    const optionalDeps = {
        xlsx: () => typeof window.XLSX !== 'undefined' || Boolean(require?.resolve?.('xlsx')),
        exceljs: () => Boolean(require?.resolve?.('exceljs')),
        pdfmake: () => typeof window.pdfMake !== 'undefined' || Boolean(require?.resolve?.('pdfmake')),
        fileSaver: () => Boolean(require?.resolve?.('file-saver'))
    };

    // Log de dependencias disponibles (solo en desarrollo)
    if (process?.env?.NODE_ENV === 'development') {
        console.log('[Export System] Dependencias disponibles:',
            Object.entries(optionalDeps).reduce((acc, [key, checker]) => {
                try {
                    acc[key] = checker();
                } catch {
                    acc[key] = false;
                }
                return acc;
            }, {})
        );
    }
}