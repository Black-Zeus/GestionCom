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
export const exportSimpleTable = async (data, columns, options = {}) => {
    return exportSimplePDF(data, {
        ...options,
        columns,
        title: options.title || 'Tabla de Datos'
    });
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