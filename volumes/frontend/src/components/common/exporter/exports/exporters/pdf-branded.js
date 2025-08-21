/**
 * Exportador PDF corporativo usando pdfmake
 * Genera documentos PDF con branding, logos, watermarks y formato profesional
 */

import { exportPDF, PDF_CONSTANTS } from './pdf-common.js';
import config from '../config.export.json';

/**
 * Procesa logo para inserción en PDF
 * @param {string|File|Blob} logoSource - Fuente del logo
 * @param {Object} options - Opciones de procesamiento
 * @returns {Promise<Object>} Logo procesado para PDF
 */
const processLogoForPDF = async (logoSource, options = {}) => {
    if (!logoSource) return null;

    try {
        const { processLogo } = await import('../../utils/image.js');

        const processedLogo = await processLogo(logoSource, {
            maxWidth: 120,
            maxHeight: 40,
            format: 'png',
            backgroundColor: null, // Mantener transparencia
            ...options
        });

        return {
            image: processedLogo.dataURL,
            width: processedLogo.width,
            height: processedLogo.height,
            base64: processedLogo.base64
        };

    } catch (error) {
        console.warn('Failed to process logo for PDF:', error);
        return null;
    }
};

/**
 * Crea watermark corporativo
 * @param {Object} branding - Configuración de branding
 * @returns {Promise<Object>} Configuración de watermark para pdfmake
 */
const createCorporateWatermark = async (branding = {}) => {
    const {
        watermark = false,
        watermarkText = branding.orgName || 'CONFIDENCIAL',
        watermarkOpacity = 0.1,
        watermarkColor = '#6b7280',
        watermarkAngle = -45,
        watermarkFontSize = 72
    } = branding;

    if (!watermark) return null;

    return {
        text: watermarkText,
        color: watermarkColor,
        opacity: watermarkOpacity,
        bold: true,
        italics: false,
        fontSize: watermarkFontSize,
        angle: watermarkAngle
    };
};

/**
 * Genera header corporativo
 * @param {Object} branding - Configuración de branding
 * @param {Object} logo - Logo procesado
 * @param {Object} options - Opciones del header
 * @returns {Function} Función de header para pdfmake
 */
const createCorporateHeader = (branding = {}, logo = null, options = {}) => {
    const {
        includeDate = true,
        includeOrgName = true,
        headerHeight = 60,
        logoPosition = 'right'
    } = options;

    return function (currentPage, pageCount, pageSize) {
        const headerContent = {
            margin: [40, 20, 40, 10],
            table: {
                widths: ['*', 'auto'],
                body: [[
                    // Lado izquierdo
                    {
                        stack: [
                            ...(includeOrgName && branding.orgName ? [{
                                text: branding.orgName,
                                style: 'corporateHeader',
                                fontSize: 14,
                                bold: true,
                                color: branding.primaryColor || '#374151'
                            }] : []),
                            ...(includeDate ? [{
                                text: new Date().toLocaleDateString(PDF_CONSTANTS.LOCALE, {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                }),
                                style: 'headerDate',
                                fontSize: 9,
                                color: '#6b7280',
                                margin: [0, 2, 0, 0]
                            }] : [])
                        ],
                        border: [false, false, false, false]
                    },
                    // Lado derecho (logo)
                    {
                        ...(logo ? {
                            image: logo.image,
                            width: logo.width,
                            height: logo.height,
                            alignment: 'right'
                        } : {
                            text: '',
                            width: 0
                        }),
                        border: [false, false, false, false]
                    }
                ]]
            },
            layout: 'noBorders'
        };

        return headerContent;
    };
};

/**
 * Genera footer corporativo
 * @param {Object} branding - Configuración de branding
 * @param {Object} options - Opciones del footer
 * @returns {Function} Función de footer para pdfmake
 */
const createCorporateFooter = (branding = {}, options = {}) => {
    const {
        includePageNumbers = config.branding?.default?.pageNumbers ?? true,
        footerText = branding.footerText || config.branding?.default?.footerText || '',
        includeGeneratedBy = true,
        createdBy = branding.createdBy || config.branding?.default?.createdBy || 'Sistema'
    } = options;

    return function (currentPage, pageCount) {
        const footerElements = [];

        // Texto del footer principal
        if (footerText) {
            footerElements.push({
                text: footerText,
                alignment: 'center',
                style: 'corporateFooter',
                fontSize: 8,
                color: '#6b7280'
            });
        }

        // Información de generación
        if (includeGeneratedBy && createdBy) {
            footerElements.push({
                text: `Generado por ${createdBy} - ${new Date().toLocaleString(PDF_CONSTANTS.LOCALE)}`,
                alignment: 'center',
                style: 'generatedBy',
                fontSize: 7,
                color: '#9ca3af',
                margin: [0, 2, 0, 0]
            });
        }

        // Numeración de páginas
        if (includePageNumbers) {
            footerElements.push({
                text: `Página ${currentPage} de ${pageCount}`,
                alignment: 'center',
                style: 'pageNumbers',
                fontSize: 7,
                color: '#9ca3af',
                margin: [0, 5, 0, 0]
            });
        }

        return {
            margin: [40, 10, 40, 20],
            stack: footerElements
        };
    };
};

/**
 * Crea portada corporativa
 * @param {Object} branding - Configuración de branding
 * @param {Object} coverOptions - Opciones de portada
 * @param {Object} logo - Logo procesado
 * @returns {Array} Contenido de portada para pdfmake
 */
const createCorporateCover = (branding = {}, coverOptions = {}, logo = null) => {
    const {
        title = 'Reporte Corporativo',
        subtitle = '',
        description = '',
        author = '',
        date = new Date().toLocaleDateString(PDF_CONSTANTS.LOCALE)
    } = coverOptions;

    const coverContent = [];

    // Logo centrado si está disponible
    if (logo) {
        coverContent.push({
            image: logo.image,
            width: logo.width * 1.5, // Más grande en portada
            alignment: 'center',
            margin: [0, 60, 0, 40]
        });
    }

    // Título principal
    coverContent.push({
        text: title,
        style: 'coverTitle',
        fontSize: 28,
        bold: true,
        color: branding.primaryColor || '#1e40af',
        alignment: 'center',
        margin: [0, logo ? 20 : 100, 0, 20]
    });

    // Subtítulo
    if (subtitle) {
        coverContent.push({
            text: subtitle,
            style: 'coverSubtitle',
            fontSize: 16,
            color: '#6b7280',
            alignment: 'center',
            margin: [0, 0, 0, 40]
        });
    }

    // Descripción
    if (description) {
        coverContent.push({
            text: description,
            style: 'coverDescription',
            fontSize: 12,
            color: '#374151',
            alignment: 'center',
            margin: [0, 0, 0, 60]
        });
    }

    // Información del documento
    const docInfo = [];

    if (branding.orgName) {
        docInfo.push(`Organización: ${branding.orgName}`);
    }

    if (author) {
        docInfo.push(`Autor: ${author}`);
    }

    docInfo.push(`Fecha: ${date}`);

    coverContent.push({
        stack: docInfo.map(info => ({
            text: info,
            fontSize: 11,
            color: '#6b7280',
            margin: [0, 2, 0, 2]
        })),
        alignment: 'center',
        margin: [0, 60, 0, 0]
    });

    // Salto de página después de la portada
    coverContent.push({ text: '', pageBreak: 'after' });

    return coverContent;
};

/**
 * Función principal de exportación PDF corporativo
 * @param {Array|Object} input - Datos o configuración de datasets
 * @param {Object} exportOptions - Opciones de exportación
 * @param {AbortSignal} signal - Señal para cancelar operación
 * @returns {Promise<Blob>} Blob con el archivo PDF corporativo
 */
export const exportBrandedPDF = async (input, exportOptions = {}, signal = null) => {
    const {
        branding = {},
        includeCover = false,
        coverOptions = {},
        includeHeader = true,
        includeFooter = true,
        pageMargins = [60, 100, 60, 80], // Márgenes más amplios para corporativo
        ...otherOptions
    } = exportOptions;

    return exportPDF(input, {
        ...otherOptions,
        branding,
        includeCover,
        coverOptions,
        corporateStyle: true,
        pageMargins,
        processLogo: processLogoForPDF,
        createCover: createCorporateCover,
        createHeader: includeHeader ? createCorporateHeader : null,
        createFooter: includeFooter ? createCorporateFooter : null,
        createWatermark: createCorporateWatermark
    }, signal);
};

/**
 * Función auxiliar para reportes ejecutivos
 * @param {Array} sections - Secciones del reporte
 * @param {Object} reportConfig - Configuración del reporte ejecutivo
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Blob>} Blob con el PDF ejecutivo
 */
export const exportExecutiveReport = async (sections, reportConfig, options = {}) => {
    const {
        title = 'Reporte Ejecutivo',
        subtitle = '',
        branding = {},
        author = '',
        period = '',
        summary = ''
    } = reportConfig;

    const datasets = sections.map(section => ({
        name: section.title || section.name,
        data: section.data,
        columns: section.columns,
        options: section.options
    }));

    return exportBrandedPDF({ datasets }, {
        ...options,
        title,
        subtitle,
        branding,
        includeCover: true,
        coverOptions: {
            title,
            subtitle: `${subtitle}${period ? ` - ${period}` : ''}`,
            description: summary,
            author
        },
        includeHeader: true,
        includeFooter: true,
        pageOrientation: 'portrait'
    });
};

/**
 * Función auxiliar para tabla corporativa simple
 * @param {Array} data - Array de objetos
 * @param {Array} columns - Definición de columnas
 * @param {Object} branding - Configuración de branding
 * @param {Object} options - Opciones de exportación
 * @returns {Promise<Blob>} Blob con el PDF corporativo
 */
export const exportCorporateTable = async (data, columns, branding, options = {}) => {
    return exportBrandedPDF(data, {
        ...options,
        columns,
        branding,
        title: options.title || 'Tabla Corporativa'
    });
};

// Exportar objeto con todas las funciones para compatibilidad
export default {
    export: exportBrandedPDF,
    exportBranded: exportBrandedPDF,
    exportExecutive: exportExecutiveReport,
    exportCorporateTable,
    processLogoForPDF,
    createCorporateWatermark,
    createCorporateCover
};