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
export const registerExporter = (key, definition) => {
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
export const loadExporter = async (format) => {
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
export const exportData = async (format, data, options = {}, signal = null) => {
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
export const createBuilder = async (format, options = {}) => {
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
export const getExporterInfo = (format) => {
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
export const getAvailableFormats = () => {
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
export const getAvailableBuilders = () => {
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
export const getExportStats = () => {
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
export const clearExporterCache = () => {
    const count = loadedExporters.size;
    loadedExporters.clear();
    console.log(`🧹 Cache limpiado: ${count} exportadores descargados`);
};

/**
 * Verifica si un formato está soportado
 * @param {string} format - Formato a verificar
 * @returns {boolean}
 */
export const isFormatSupported = (format) => {
    return getAvailableFormats().includes(format);
};

/**
 * Verifica si un formato es un builder
 * @param {string} format - Formato a verificar
 * @returns {boolean}
 */
export const isBuilderFormat = (format) => {
    const info = getExporterInfo(format);
    return info ? info.builderMode : false;
};

// Inicializar sistema
registerDefaultExporters();

// Exports principales
export {
    registerExporter,
    loadExporter,
    exportData,
    createBuilder,
    getExporterInfo,
    getAvailableFormats,
    getAvailableBuilders,
    getExportStats,
    clearExporterCache,
    isFormatSupported,
    isBuilderFormat
};

export default {
    register: registerExporter,
    load: loadExporter,
    export: exportData,
    createBuilder,
    info: getExporterInfo,
    formats: getAvailableFormats,
    builders: getAvailableBuilders,
    stats: getExportStats,
    clear: clearExporterCache,
    supports: isFormatSupported,
    isBuilder: isBuilderFormat
};