/**
 * Exportador PDF simple usando pdfmake
 * Genera documentos PDF básicos con tablas y formato automático
 */

import { exportPDF, PDF_CONSTANTS } from './pdf-common.js';

/**
 * Función principal de exportación PDF simple
 * @param {Array|Object} input - Datos o configuración de datasets
 * @param {Object} exportOptions - Opciones de exportación
 * @param {AbortSignal} signal - Señal para cancelar operación
 * @returns {Promise<Blob>} Blob con el archivo PDF
 */
export const exportSimplePDF = async (input, exportOptions = {}, signal = null) => {
    return exportPDF(input, {
        ...exportOptions,
        corporateStyle: false
    }, signal);
};

/**
 * Función auxiliar para exportar tabla simple
 * @param {Array} data - Array de objetos
 * @param {Array} columns - Definición de columnas
 * @param {Object} options - Opciones de exportación
 * @returns {Promise<Blob>} Blob con el PDF
 */
export const exportSimpleTable_old = async (data, columns, options = {}) => {
    return exportSimplePDF(data, {
        ...options,
        columns,
        title: options.title || 'Tabla de Datos'
    });
};

/**
 * Función auxiliar para exportar tabla simple
 * @param {Array} data - Array de objetos
 * @param {Array|Object} columns - Definición de columnas (simple o estructura extendida)
 * @param {Object} options - Opciones de exportación
 * @returns {Promise<Blob>} Blob con el PDF
 */
export const exportSimpleTable = async (data, columns, options = {}) => {
    // NUEVO: Validación básica de estructura extendida
    const validationResult = validateTableStructure(data, columns, options);
    if (!validationResult.isValid) {
        console.warn('Advertencias en estructura de tabla:', validationResult.warnings);
        if (validationResult.errors.length > 0) {
            throw new Error(`Errores en estructura de tabla: ${validationResult.errors.join(', ')}`);
        }
    }

    // MODIFICADO: Pasar estructura completa de columnas sin procesar
    return exportSimplePDF(data, {
        ...options,
        columns, // Pasar columnas tal como vienen (estructura extendida o simple)
        title: options.title || 'Tabla de Datos',
        // NUEVO: Metadatos adicionales para procesamiento avanzado
        tableStructure: {
            hasExtendedColumns: Array.isArray(columns) && columns.some(col => typeof col === 'object' && col.type),
            columnTypes: Array.isArray(columns) ? columns.map(col => typeof col === 'object' ? col.type : 'text') : [],
            hasImages: Array.isArray(columns) && columns.some(col => typeof col === 'object' && col.type === 'image')
        }
    });
};


/**
 * Valida estructura básica de tabla antes del procesamiento
 * @param {Array} data - Datos a validar
 * @param {Array} columns - Columnas a validar
 * @param {Object} options - Opciones adicionales
 * @returns {Object} Resultado de validación
 */
const validateTableStructure = (data, columns, options = {}) => {
    const errors = [];
    const warnings = [];

    // Validar datos
    if (!Array.isArray(data)) {
        errors.push('Los datos deben ser un array');
    } else if (data.length === 0) {
        warnings.push('El array de datos está vacío');
    }

    // Validar columnas
    if (!Array.isArray(columns)) {
        errors.push('Las columnas deben ser un array');
    } else if (columns.length === 0) {
        warnings.push('No se han definido columnas');
    } else {
        // Validar estructura extendida de columnas
        columns.forEach((col, index) => {
            if (typeof col === 'object' && col !== null) {
                // Validar columnas con estructura extendida
                if (!col.key && !col.field) {
                    errors.push(`Columna ${index}: debe tener 'key' o 'field'`);
                }

                if (!col.header && !col.title) {
                    warnings.push(`Columna ${index}: se recomienda definir 'header'`);
                }

                // Validar tipos específicos
                if (col.type === 'image') {
                    if (!col.defaultValue) {
                        warnings.push(`Columna imagen ${index}: se recomienda definir 'defaultValue'`);
                    }

                    if (col.format) {
                        if (typeof col.format.width !== 'number' || col.format.width <= 0) {
                            warnings.push(`Columna imagen ${index}: 'format.width' debe ser un número positivo`);
                        }
                        if (typeof col.format.height !== 'number' || col.format.height <= 0) {
                            warnings.push(`Columna imagen ${index}: 'format.height' debe ser un número positivo`);
                        }
                    }
                }

                if (col.type === 'currency' && col.format) {
                    if (!col.format.currency) {
                        warnings.push(`Columna moneda ${index}: se recomienda definir 'format.currency'`);
                    }
                }

                if (col.type === 'date' && col.format) {
                    if (!col.format.pattern && !col.format.locale) {
                        warnings.push(`Columna fecha ${index}: se recomienda definir formato`);
                    }
                }

                // Validar maxLength
                if (col.maxLength && (typeof col.maxLength !== 'number' || col.maxLength <= 0)) {
                    errors.push(`Columna ${index}: 'maxLength' debe ser un número positivo`);
                }
            }
        });

        // Validar consistencia de datos con columnas
        if (data.length > 0) {
            const sampleRow = data[0];
            const missingKeys = columns
                .filter(col => typeof col === 'object' && col.key)
                .map(col => col.key)
                .filter(key => !(key in sampleRow));

            if (missingKeys.length > 0) {
                warnings.push(`Claves no encontradas en datos: ${missingKeys.join(', ')}`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};


/**
 * Función auxiliar para exportar múltiples secciones
 * @param {Array} sections - Array de secciones
 * @param {Object} options - Opciones globales
 * @returns {Promise<Blob>} Blob con el PDF multi-sección
 */
export const exportMultipleSections = async (sections, options = {}) => {
    const datasets = sections.map(section => ({
        name: section.name || section.title,
        data: section.data,
        columns: section.columns,
        options: section.options
    }));

    return exportSimplePDF({ datasets }, options);
};

/**
 * Función auxiliar para exportar reporte con header/footer personalizado
 * @param {Array} data - Datos a exportar
 * @param {Object} reportConfig - Configuración del reporte
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Blob>} Blob con el PDF formateado
 */
export const exportReport = async (data, reportConfig, options = {}) => {
    const {
        title = 'Reporte',
        subtitle = '',
        columns = [],
        headerText = '',
        footerText = '',
        includeDate = true,
        includePageNumbers = true
    } = reportConfig;

    const documentOptions = {
        title,
        subtitle,
        columns,
        ...options
    };

    // Configurar header personalizado
    if (headerText || includeDate) {
        documentOptions.createHeader = function (branding, logo, docOptions) {
            return function (currentPage, pageCount, pageSize) {
                const headerContent = [];

                if (headerText) {
                    headerContent.push({
                        text: headerText,
                        alignment: 'left',
                        margin: [40, 20, 40, 0]
                    });
                }

                if (includeDate) {
                    headerContent.push({
                        text: new Date().toLocaleDateString('es-ES'),
                        alignment: 'right',
                        margin: [40, 20, 40, 0]
                    });
                }

                return headerContent;
            };
        };
    }

    // Configurar footer personalizado
    if (footerText || includePageNumbers) {
        documentOptions.createFooter = function (branding, docOptions) {
            return function (currentPage, pageCount) {
                const footerContent = [];

                if (footerText) {
                    footerContent.push({
                        text: footerText,
                        alignment: 'left'
                    });
                }

                if (includePageNumbers) {
                    footerContent.push({
                        text: `Página ${currentPage} de ${pageCount}`,
                        alignment: 'right'
                    });
                }

                return {
                    columns: footerContent,
                    margin: [40, 10, 40, 10]
                };
            };
        };
    }

    return exportSimplePDF(data, documentOptions);
};

// ================================================
// NUEVA FUNCIONALIDAD - PDF BUILDER API
// ================================================

/**
 * Crea una nueva instancia del PDF Builder para construcción fluida
 * @param {Object} options - Opciones iniciales del builder
 * @returns {PDFDocumentBuilder} Nueva instancia del builder
 */
export const createPDFBuilder = async (options = {}) => {
    // Importación diferida del builder para optimizar bundle
    const { PDFDocumentBuilder } = await import('./advance-pdf/pdf-builder.js');

    return new PDFDocumentBuilder({
        ...options,
        corporateStyle: false // PDF simple no usa estilo corporativo
    });
};

/**
 * Función de conveniencia para crear builder con configuración simple
 * @param {Object} config - Configuración inicial
 * @returns {Promise<PDFDocumentBuilder>} Builder configurado
 */
export const createSimpleBuilder = async (config = {}) => {
    const builder = await createPDFBuilder();

    // Aplicar configuración básica si se proporciona
    if (config.title || config.subtitle || config.author) {
        builder.setMetadata({
            title: config.title,
            subtitle: config.subtitle,
            author: config.author
        });
    }

    if (config.branding) {
        builder.setBranding(config.branding);
    }

    return builder;
};