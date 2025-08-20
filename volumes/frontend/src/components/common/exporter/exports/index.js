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
    }
};

/**
 * Registra todos los exportadores por defecto
 */
const registerDefaultExporters = () => {
    Object.entries(exporterDefinitions).forEach(([key, definition]) => {
        exporterRegistry.set(key, definition);
    });
};

/**
 * Registra un exportador personalizado
 * @param {string} key - Identificador único del exportador
 * @param {Object} definition - Definición del exportador
 */
export const registerExporter = (key, definition) => {
    const required = ['name', 'loader'];
    const missing = required.filter(prop => !definition[prop]);

    if (missing.length > 0) {
        throw new Error(`Exporter definition missing required properties: ${missing.join(', ')}`);
    }

    exporterRegistry.set(key, {
        description: '',
        icon: '📄',
        dependencies: [],
        formats: [key],
        ...definition
    });
};

/**
 * Obtiene la definición de un exportador
 * @param {string} format - Formato del exportador
 * @returns {Object|null} Definición del exportador
 */
export const getExporterDefinition = (format) => {
    // Buscar por clave directa
    if (exporterRegistry.has(format)) {
        return exporterRegistry.get(format);
    }

    // Buscar por formato soportado
    for (const [key, definition] of exporterRegistry.entries()) {
        if (definition.formats && definition.formats.includes(format)) {
            return definition;
        }
    }

    return null;
};

/**
 * Carga un exportador de forma diferida
 * @param {string} format - Formato del exportador
 * @param {AbortSignal} signal - Señal para cancelar carga
 * @returns {Promise<Object>} Exportador cargado
 */
export const getExporter = async (format, signal = null) => {
    // Verificar cancelación
    if (signal?.aborted) {
        throw new Error('Exporter loading was cancelled');
    }

    // Buscar en cache
    if (loadedExporters.has(format)) {
        return loadedExporters.get(format);
    }

    // Obtener definición
    const definition = getExporterDefinition(format);
    if (!definition) {
        throw new Error(`Exporter for format '${format}' not found`);
    }

    try {
        // Verificar dependencias antes de cargar
        await validateDependencies(definition.dependencies);

        // Verificar cancelación antes de cargar módulo
        if (signal?.aborted) {
            throw new Error('Exporter loading was cancelled');
        }

        // Cargar módulo de forma diferida
        const exporterModule = await definition.loader();

        // Obtener función de exportación principal
        const exporter = exporterModule.default || exporterModule;

        if (!exporter || typeof exporter.export !== 'function') {
            throw new Error(`Invalid exporter module for format '${format}': missing export function`);
        }

        // Cachear exportador cargado
        loadedExporters.set(format, exporter);

        return exporter;

    } catch (error) {
        // No cachear errores para permitir reintentos
        throw new Error(`Failed to load exporter for '${format}': ${error.message}`);
    }
};

/**
 * Valida que las dependencias estén disponibles
 * @param {Array} dependencies - Lista de dependencias requeridas
 * @returns {Promise<void>}
 */
const validateDependencies = async (dependencies = []) => {
    if (!dependencies.length) return;

    const missingDeps = [];

    for (const dep of dependencies) {
        try {
            // Intentar importar la dependencia
            await import(dep);
        } catch (error) {
            missingDeps.push(dep);
        }
    }

    if (missingDeps.length > 0) {
        throw new Error(
            `Missing required dependencies: ${missingDeps.join(', ')}. ` +
            `Please install: npm install ${missingDeps.join(' ')}`
        );
    }
};

/**
 * Obtiene la lista de exportadores disponibles
 * @param {Object} options - Opciones de filtrado
 * @returns {Array} Lista de exportadores disponibles
 */
export const getAvailableExporters = (options = {}) => {
    const {
        includeCustom = true,
        formats = null,
        excludeFormats = []
    } = options;

    const exporters = [];

    for (const [key, definition] of exporterRegistry.entries()) {
        // Filtrar por formatos específicos
        if (formats && !formats.some(f => definition.formats.includes(f))) {
            continue;
        }

        // Excluir formatos específicos
        if (excludeFormats.some(f => definition.formats.includes(f))) {
            continue;
        }

        exporters.push({
            key,
            name: definition.name,
            description: definition.description,
            icon: definition.icon,
            formats: definition.formats,
            dependencies: definition.dependencies
        });
    }

    return exporters.sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Verifica si un formato está soportado
 * @param {string} format - Formato a verificar
 * @returns {boolean} True si está soportado
 */
export const isFormatSupported = (format) => {
    return getExporterDefinition(format) !== null;
};

/**
 * Obtiene las etiquetas configuradas para los formatos
 * @param {string} language - Idioma (es, en)
 * @returns {Object} Mapa de etiquetas por formato
 */
export const getFormatLabels = (language = 'es') => {
    const labels = config.labels[language] || config.labels.es;
    return { ...labels };
};

/**
 * Obtiene los iconos configurados para los formatos
 * @returns {Object} Mapa de iconos por formato
 */
export const getFormatIcons = () => {
    return { ...config.icons };
};

/**
 * Limpia el cache de exportadores cargados
 */
export const clearExporterCache = () => {
    loadedExporters.clear();
};

/**
 * Obtiene estadísticas del registro de exportadores
 * @returns {Object} Estadísticas del registro
 */
export const getRegistryStats = () => {
    const total = exporterRegistry.size;
    const loaded = loadedExporters.size;
    const withDependencies = Array.from(exporterRegistry.values())
        .filter(def => def.dependencies && def.dependencies.length > 0).length;

    return {
        total,
        loaded,
        cached: loaded,
        withDependencies,
        loadRate: total > 0 ? (loaded / total * 100).toFixed(1) + '%' : '0%'
    };
};

/**
 * Función de utilidad para exportar datos usando cualquier formato
 * @param {string} format - Formato de exportación
 * @param {*} data - Datos a exportar
 * @param {Object} options - Opciones de exportación
 * @param {AbortSignal} signal - Señal para cancelar operación
 * @returns {Promise<Blob>} Resultado de la exportación
 */
export const exportData = async (format, data, options = {}, signal = null) => {
    // Obtener exportador
    const exporter = await getExporter(format, signal);

    // Ejecutar exportación
    return await exporter.export(data, options, signal);
};

/**
 * Función de utilidad para exportar múltiples formatos de forma concurrente
 * @param {Array} requests - Array de {format, data, options}
 * @param {Object} globalOptions - Opciones globales
 * @returns {Promise<Array>} Array de resultados
 */
export const exportMultipleFormats = async (requests, globalOptions = {}) => {
    const {
        concurrent = false,
        onProgress = null,
        signal = null
    } = globalOptions;

    if (concurrent) {
        // Exportación concurrente
        const promises = requests.map(async (request, index) => {
            try {
                const result = await exportData(request.format, request.data, {
                    ...globalOptions,
                    ...request.options
                }, signal);

                const response = { index, success: true, format: request.format, result };
                if (onProgress) onProgress(response, index + 1, requests.length);
                return response;
            } catch (error) {
                const response = { index, success: false, format: request.format, error: error.message };
                if (onProgress) onProgress(response, index + 1, requests.length);
                return response;
            }
        });

        return await Promise.all(promises);
    } else {
        // Exportación secuencial
        const results = [];

        for (let i = 0; i < requests.length; i++) {
            const request = requests[i];

            try {
                const result = await exportData(request.format, request.data, {
                    ...globalOptions,
                    ...request.options
                }, signal);

                const response = { index: i, success: true, format: request.format, result };
                results.push(response);
                if (onProgress) onProgress(response, i + 1, requests.length);
            } catch (error) {
                const response = { index: i, success: false, format: request.format, error: error.message };
                results.push(response);
                if (onProgress) onProgress(response, i + 1, requests.length);
            }
        }

        return results;
    }
};

// Registrar exportadores por defecto al importar el módulo
registerDefaultExporters();

// Exportar objeto con todas las funciones para compatibilidad
export default {
    registerExporter,
    getExporter,
    getExporterDefinition,
    getAvailableExporters,
    isFormatSupported,
    getFormatLabels,
    getFormatIcons,
    clearExporterCache,
    getRegistryStats,
    exportData,
    exportMultipleFormats
};