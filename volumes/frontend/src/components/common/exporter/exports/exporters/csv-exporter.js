/**
 * Exportador CSV refactorizado usando utilidades puras
 * Maneja múltiples datasets y opciones de formato avanzadas
 */

import {
    dataToCSV,
    validateCSVData,
    addBOM,
    sanitizeCSVFilename,
    getCSVStats,
    CSV_CONSTANTS
} from '../../utils/csv.js';
import config from '../config.export.json';

/**
 * Genera CSV con múltiples datasets (separados por secciones)
 * @param {Array} datasets - Array de datasets
 * @param {Object} options - Opciones globales
 * @returns {string} CSV con múltiples secciones
 */
const generateMultiDatasetCSV = (datasets, options = {}) => {
    const {
        sectionSeparator = '\n\n',
        includeDatasetNames = true,
        datasetNameFormat = '=== {name} ===',
        datasetNameStyle = 'comment', // 'comment' | 'header' | 'section'
        ...csvOptions
    } = options;

    const sections = [];

    datasets.forEach((dataset, index) => {
        const {
            name = `Dataset ${index + 1}`,
            data = [],
            columns = [],
            options: datasetOptions = {}
        } = dataset;

        const sectionContent = [];

        // Agregar nombre del dataset si se solicita
        if (includeDatasetNames && name) {
            let nameContent = '';

            switch (datasetNameStyle) {
                case 'comment':
                    // Como comentario CSV (línea que inicia con #)
                    nameContent = `# ${datasetNameFormat.replace('{name}', name)}`;
                    break;
                case 'header':
                    // Como header simple
                    nameContent = datasetNameFormat.replace('{name}', name);
                    break;
                case 'section':
                    // Como sección separada
                    nameContent = `"${datasetNameFormat.replace('{name}', name)}"`;
                    break;
                default:
                    nameContent = datasetNameFormat.replace('{name}', name);
            }

            sectionContent.push(nameContent);

            // Agregar línea vacía después del nombre si no es comentario
            if (datasetNameStyle !== 'comment') {
                sectionContent.push('');
            }
        }

        // Generar CSV para este dataset
        const datasetCSV = dataToCSV(data, columns, {
            ...csvOptions,
            ...datasetOptions
        });

        if (datasetCSV.trim()) {
            sectionContent.push(datasetCSV);
        } else {
            // Dataset vacío
            sectionContent.push('# No data available');
        }

        sections.push(sectionContent.join('\n'));
    });

    return sections.join(sectionSeparator);
};

/**
 * Aplica post-procesamiento al CSV generado
 * @param {string} csvContent - Contenido CSV
 * @param {Object} options - Opciones de post-procesamiento
 * @returns {string} CSV procesado
 */
const postProcessCSV = (csvContent, options = {}) => {
    const {
        includeBOM = config.csv.includeBOM,
        encoding = config.csv.defaultEncoding,
        removeEmptyLines = false,
        trimLines = false,
        normalizeLineEndings = true,
        lineEnding = config.csv.lineEnding
    } = options;

    let processedContent = csvContent;

    // Normalizar terminaciones de línea
    if (normalizeLineEndings) {
        processedContent = processedContent.replace(/\r\n|\r|\n/g, lineEnding);
    }

    // Remover líneas vacías si se solicita
    if (removeEmptyLines) {
        processedContent = processedContent
            .split(lineEnding)
            .filter(line => line.trim().length > 0)
            .join(lineEnding);
    }

    // Trimear líneas si se solicita
    if (trimLines) {
        processedContent = processedContent
            .split(lineEnding)
            .map(line => line.trim())
            .join(lineEnding);
    }

    // Agregar BOM UTF-8 si se solicita
    if (includeBOM && encoding.toLowerCase().includes('utf')) {
        processedContent = addBOM(processedContent);
    }

    return processedContent;
};

/**
 * Valida y prepara datos para exportación CSV
 * @param {*} input - Datos de entrada
 * @param {Object} exportOptions - Opciones de exportación
 * @returns {Object} Datos preparados y validados
 */
const prepareCSVData = (input, exportOptions = {}) => {
    const {
        columns = [],
        validateInput = true
    } = exportOptions;

    let datasets = [];
    let hasMultipleDatasets = false;

    // Determinar estructura de datos
    if (input.datasets && Array.isArray(input.datasets)) {
        // Múltiples datasets
        datasets = input.datasets;
        hasMultipleDatasets = true;
    } else {
        // Dataset único
        const data = Array.isArray(input) ? input : (input.data || []);
        const datasetColumns = input.columns || columns;

        datasets = [{
            name: 'Data',
            data,
            columns: datasetColumns,
            options: {}
        }];
    }

    // Validar cada dataset si se solicita
    if (validateInput) {
        const validationResults = [];

        datasets.forEach((dataset, index) => {
            const validation = validateCSVData(dataset.data || [], dataset.columns || []);

            if (!validation.isValid) {
                throw new Error(
                    `Dataset ${index} (${dataset.name || 'unnamed'}) validation failed: ${validation.errors.join(', ')}`
                );
            }

            validationResults.push(validation);
        });

        // Log warnings si existen
        validationResults.forEach((result, index) => {
            if (result.warnings.length > 0) {
                console.warn(`CSV Dataset ${index} warnings:`, result.warnings);
            }
        });
    }

    return {
        datasets,
        hasMultipleDatasets,
        totalRows: datasets.reduce((sum, ds) => sum + (ds.data?.length || 0), 0),
        totalDatasets: datasets.length
    };
};

/**
 * Crea metadatos para el archivo CSV
 * @param {Object} preparedData - Datos preparados
 * @param {Object} exportOptions - Opciones de exportación
 * @returns {Object} Metadatos del archivo
 */
const createCSVMetadata = (preparedData, exportOptions = {}) => {
    const {
        filename = 'export.csv',
        branding = {},
        includeMetadata = false
    } = exportOptions;

    const metadata = {
        filename: sanitizeCSVFilename(filename),
        format: 'csv',
        encoding: exportOptions.encoding || config.csv.defaultEncoding,
        delimiter: exportOptions.delimiter || config.csv.defaultDelimiter,
        datasets: preparedData.totalDatasets,
        totalRows: preparedData.totalRows,
        createdAt: new Date().toISOString(),
        createdBy: branding.createdBy || config.branding.default.createdBy,
        orgName: branding.orgName || config.branding.default.orgName
    };

    return metadata;
};

/**
 * Genera comentarios de metadatos para incluir en el CSV
 * @param {Object} metadata - Metadatos del archivo
 * @param {Object} options - Opciones de generación
 * @returns {string} Comentarios de metadatos
 */
const generateMetadataComments = (metadata, options = {}) => {
    const {
        includeTimestamp = true,
        includeStats = true,
        includeSource = true
    } = options;

    const comments = [];

    if (includeSource && metadata.orgName) {
        comments.push(`# Generated by: ${metadata.orgName}`);
    }

    if (includeSource && metadata.createdBy) {
        comments.push(`# Created by: ${metadata.createdBy}`);
    }

    if (includeTimestamp) {
        comments.push(`# Created at: ${metadata.createdAt}`);
    }

    if (includeStats) {
        comments.push(`# Total datasets: ${metadata.datasets}`);
        comments.push(`# Total rows: ${metadata.totalRows}`);
        comments.push(`# Delimiter: "${metadata.delimiter}"`);
        comments.push(`# Encoding: ${metadata.encoding}`);
    }

    if (comments.length > 0) {
        comments.push(''); // Línea vacía después de metadatos
    }

    return comments.join('\n');
};

/**
 * Función principal de exportación CSV
 * @param {Array|Object} input - Datos o configuración de datasets
 * @param {Object} exportOptions - Opciones de exportación
 * @param {AbortSignal} signal - Señal para cancelar operación
 * @returns {Promise<Blob>} Blob con el archivo CSV
 */
export const exportCSV = async (input, exportOptions = {}, signal = null) => {
    try {
        // Verificar cancelación
        if (signal?.aborted) {
            throw new Error('CSV export was cancelled');
        }

        const {
            filename = 'export.csv',
            delimiter = config.csv.defaultDelimiter,
            encoding = config.csv.defaultEncoding,
            includeBOM = config.csv.includeBOM,
            includeMetadata = false,
            validateInput = true,
            ...csvOptions
        } = exportOptions;

        // Preparar y validar datos
        const preparedData = prepareCSVData(input, exportOptions);

        // Verificar cancelación después de validación
        if (signal?.aborted) {
            throw new Error('CSV export was cancelled');
        }

        // Crear metadatos
        const metadata = createCSVMetadata(preparedData, exportOptions);

        let csvContent = '';

        // Agregar comentarios de metadatos si se solicita
        if (includeMetadata) {
            const metadataComments = generateMetadataComments(metadata, {
                includeTimestamp: true,
                includeStats: true,
                includeSource: !!exportOptions.branding
            });

            if (metadataComments.trim()) {
                csvContent += metadataComments + '\n';
            }
        }

        // Generar contenido CSV
        if (preparedData.hasMultipleDatasets) {
            // Múltiples datasets
            csvContent += generateMultiDatasetCSV(preparedData.datasets, {
                delimiter,
                encoding,
                includeDatasetNames: true,
                ...csvOptions
            });
        } else {
            // Dataset único
            const dataset = preparedData.datasets[0];
            csvContent += dataToCSV(dataset.data, dataset.columns, {
                delimiter,
                encoding,
                ...csvOptions
            });
        }

        // Verificar cancelación antes de post-procesamiento
        if (signal?.aborted) {
            throw new Error('CSV export was cancelled');
        }

        // Aplicar post-procesamiento
        const finalContent = postProcessCSV(csvContent, {
            includeBOM,
            encoding,
            delimiter,
            lineEnding: config.csv.lineEnding,
            ...csvOptions
        });

        // Crear blob
        const mimeType = 'text/csv;charset=utf-8';
        const blob = new Blob([finalContent], { type: mimeType });

        // Agregar propiedades adicionales para compatibilidad
        Object.defineProperties(blob, {
            suggestedFilename: {
                value: metadata.filename,
                writable: false,
                enumerable: false
            },
            exportFormat: {
                value: 'csv',
                writable: false,
                enumerable: false
            },
            exportOptions: {
                value: { ...exportOptions },
                writable: false,
                enumerable: false
            },
            csvStats: {
                value: getCSVStats(finalContent, {
                    delimiter,
                    hasHeaders: csvOptions.includeHeaders !== false
                }),
                writable: false,
                enumerable: false
            },
            metadata: {
                value: metadata,
                writable: false,
                enumerable: false
            }
        });

        return blob;

    } catch (error) {
        throw new Error(`CSV export failed: ${error.message}`);
    }
};

/**
 * Función auxiliar para exportar un solo dataset
 * @param {Array} data - Array de objetos
 * @param {Array} columns - Definición de columnas
 * @param {Object} options - Opciones de exportación
 * @returns {Promise<Blob>} Blob con el CSV
 */
export const exportSingleCSV = async (data, columns, options = {}) => {
    return exportCSV(data, { ...options, columns });
};

/**
 * Función auxiliar para exportar múltiples datasets
 * @param {Array} datasets - Array de datasets
 * @param {Object} options - Opciones globales
 * @returns {Promise<Blob>} Blob con el CSV combinado
 */
export const exportMultipleCSV = async (datasets, options = {}) => {
    return exportCSV({ datasets }, options);
};

/**
 * Función auxiliar para exportar con plantilla
 * @param {Array} data - Datos a exportar
 * @param {Object} template - Configuración de la plantilla
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Blob>} Blob con el CSV formateado
 */
export const exportCSVWithTemplate = async (data, template, options = {}) => {
    const {
        title = '',
        subtitle = '',
        columns = [],
        includeTitle = true,
        includeSummary = false,
        includeMetadata = true
    } = template;

    let processedData = [...data];

    // Agregar filas de título si se solicita
    if (includeTitle && title) {
        const titleRows = [];

        if (title) {
            titleRows.push({ [columns[0]?.key || 'info']: `# ${title}` });
        }

        if (subtitle) {
            titleRows.push({ [columns[0]?.key || 'info']: `# ${subtitle}` });
        }

        titleRows.push({ [columns[0]?.key || 'info']: '' }); // Línea vacía

        processedData = [...titleRows, ...data];
    }

    // Agregar resumen si se solicita
    if (includeSummary && data.length > 0) {
        const summaryRows = [
            { [columns[0]?.key || 'summary']: '' }, // Línea vacía
            { [columns[0]?.key || 'summary']: `# Total registros: ${data.length}` },
            { [columns[0]?.key || 'summary']: `# Generado: ${new Date().toLocaleString('es-ES')}` }
        ];

        processedData = [...processedData, ...summaryRows];
    }

    return exportCSV(processedData, {
        ...options,
        columns,
        includeHeaders: !includeTitle, // No duplicar headers si hay título
        includeMetadata
    });
};

/**
 * Función auxiliar para validación previa
 * @param {*} input - Datos a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado de validación extendido
 */
export const validateCSVExport = (input, options = {}) => {
    try {
        const preparedData = prepareCSVData(input, { ...options, validateInput: true });

        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            stats: {
                datasets: preparedData.totalDatasets,
                totalRows: preparedData.totalRows,
                hasMultipleDatasets: preparedData.hasMultipleDatasets
            }
        };

        // Validaciones adicionales específicas para CSV
        preparedData.datasets.forEach((dataset, index) => {
            const data = dataset.data || [];
            const columns = dataset.columns || [];

            // Advertir sobre datasets muy grandes
            if (data.length > 100000) {
                validation.warnings.push(
                    `Dataset ${index} has ${data.length} rows, this may result in a very large CSV file`
                );
            }

            // Advertir sobre muchas columnas
            if (columns.length > 50) {
                validation.warnings.push(
                    `Dataset ${index} has ${columns.length} columns, consider splitting into multiple files`
                );
            }

            // Verificar tipos de datos problemáticos
            if (data.length > 0) {
                const sampleRow = data[0];
                const problematicColumns = [];

                columns.forEach(col => {
                    const key = typeof col === 'string' ? col : (col.key || col.field);
                    if (key && sampleRow && typeof sampleRow[key] === 'object' && sampleRow[key] !== null) {
                        problematicColumns.push(key);
                    }
                });

                if (problematicColumns.length > 0) {
                    validation.warnings.push(
                        `Dataset ${index} has object columns that will be JSON-stringified: ${problematicColumns.join(', ')}`
                    );
                }
            }
        });

        return validation;

    } catch (error) {
        return {
            isValid: false,
            errors: [error.message],
            warnings: [],
            stats: null
        };
    }
};

/**
 * Función auxiliar para obtener vista previa del CSV
 * @param {*} input - Datos a previsualizar
 * @param {Object} options - Opciones de previsualización
 * @returns {Object} Vista previa del CSV
 */
export const previewCSV = (input, options = {}) => {
    const {
        maxRows = 5,
        maxColumns = 10,
        ...csvOptions
    } = options;

    try {
        const preparedData = prepareCSVData(input, { ...options, validateInput: false });

        const previews = preparedData.datasets.map((dataset, index) => {
            const data = dataset.data?.slice(0, maxRows) || [];
            const columns = dataset.columns?.slice(0, maxColumns) || [];

            const csvContent = dataToCSV(data, columns, csvOptions);
            const stats = getCSVStats(csvContent, csvOptions);

            return {
                name: dataset.name || `Dataset ${index + 1}`,
                csvContent,
                stats,
                truncated: {
                    rows: (dataset.data?.length || 0) > maxRows,
                    columns: (dataset.columns?.length || 0) > maxColumns,
                    originalRows: dataset.data?.length || 0,
                    originalColumns: dataset.columns?.length || 0
                }
            };
        });

        return {
            previews,
            totalDatasets: preparedData.totalDatasets,
            totalRows: preparedData.totalRows
        };

    } catch (error) {
        return {
            error: error.message,
            previews: []
        };
    }
};

// Exportar objeto con todas las funciones para compatibilidad
export default {
    export: exportCSV,
    exportSingle: exportSingleCSV,
    exportMultiple: exportMultipleCSV,
    exportWithTemplate: exportCSVWithTemplate,
    validate: validateCSVExport,
    preview: previewCSV,
    generateMultiDatasetCSV,
    postProcessCSV,
    createCSVMetadata
};