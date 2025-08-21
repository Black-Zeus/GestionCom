/**
 * Exportador PDF corporativo usando pdfmake
 * Genera documentos PDF con branding corporativo completo
 * ACTUALIZADO: Soporte completo para PDF Builder corporativo
 */

import { exportPDF, PDF_CONSTANTS, resizeImage } from './pdf-common.js';

/**
 * Configuración por defecto para branding corporativo
 */
const DEFAULT_CORPORATE_BRANDING = {
    orgName: 'Mi Empresa',
    primaryColor: '#2563eb',
    secondaryColor: '#f8fafc',
    accentColor: '#1d4ed8',
    textColor: '#1f2937',
    logoUrl: null,
    logoSize: { width: 150, height: 60 },
    watermark: false,
    watermarkText: 'CONFIDENCIAL',
    watermarkOpacity: 0.1,
    headerStyle: 'corporate',
    footerStyle: 'corporate'
};

/**
 * Estilos corporativos extendidos
 */
const CORPORATE_STYLES = {
    // Estilos de portada corporativa
    corporateCoverTitle: {
        fontSize: 28,
        bold: true,
        alignment: 'center',
        margin: [0, 80, 0, 30],
        color: '#1f2937'
    },
    corporateCoverSubtitle: {
        fontSize: 18,
        alignment: 'center',
        margin: [0, 0, 0, 50],
        color: '#6b7280'
    },
    corporateCoverDescription: {
        fontSize: 14,
        alignment: 'center',
        margin: [0, 0, 0, 60],
        color: '#374151',
        lineHeight: 1.4
    },
    corporateCoverInfo: {
        fontSize: 12,
        color: '#6b7280',
        margin: [0, 3, 0, 3]
    },

    // Estilos de secciones corporativas
    corporateSectionTitle: {
        fontSize: 20,
        bold: true,
        margin: [0, 25, 0, 15],
        color: '#2563eb'
    },
    corporateSubsectionTitle: {
        fontSize: 16,
        bold: true,
        margin: [0, 20, 0, 12],
        color: '#374151'
    },

    // Estilos de contenido corporativo
    corporateBody: {
        fontSize: 11,
        lineHeight: 1.4,
        margin: [0, 6, 0, 6],
        alignment: 'justify',
        color: '#374151'
    },
    corporateLead: {
        fontSize: 13,
        lineHeight: 1.5,
        margin: [0, 10, 0, 10],
        alignment: 'justify',
        color: '#1f2937'
    },
    corporateCallout: {
        fontSize: 11,
        lineHeight: 1.4,
        margin: [15, 10, 15, 10],
        fillColor: '#f8fafc',
        color: '#374151'
    },

    // Estilos de tablas corporativas
    corporateTableHeader: {
        bold: true,
        fontSize: 10,
        fillColor: '#2563eb',
        color: '#ffffff',
        alignment: 'center'
    },
    corporateTableCell: {
        fontSize: 9,
        margin: [3, 3, 3, 3],
        color: '#374151'
    },
    corporateTableCaption: {
        fontSize: 10,
        italics: true,
        color: '#6b7280',
        alignment: 'center',
        margin: [0, 8, 0, 15]
    },

    // Estilos de headers/footers corporativos
    corporateHeader: {
        fontSize: 9,
        color: '#6b7280',
        margin: [0, 10, 0, 10]
    },
    corporateFooter: {
        fontSize: 8,
        color: '#9ca3af',
        alignment: 'center',
        margin: [0, 10, 0, 10]
    },

    // Estilos de TOC corporativo
    corporateTocTitle: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 25],
        color: '#2563eb'
    },
    corporateTocLevel1: {
        fontSize: 13,
        bold: true,
        margin: [0, 10, 0, 5],
        color: '#1f2937'
    },
    corporateTocLevel2: {
        fontSize: 12,
        margin: [25, 8, 0, 4],
        color: '#374151'
    },
    corporateTocLevel3: {
        fontSize: 11,
        margin: [45, 6, 0, 3],
        color: '#6b7280'
    }
};

/**
 * Procesa logo para PDF corporativo
 * @param {string|Object} logo - URL del logo o configuración del logo
 * @param {Object} branding - Configuración de branding
 * @returns {Promise<Object|null>} Configuración del logo procesado
 */
const processLogoForPDF = async (logo, branding = {}) => {
    if (!logo) {
        return null;
    }

    try {
        const logoConfig = typeof logo === 'string'
            ? { src: logo, ...branding.logoSize }
            : { ...branding.logoSize, ...logo };

        // Si es una URL, intentar redimensionar
        if (logoConfig.src && logoConfig.src.startsWith('http')) {
            const resizedLogo = await resizeImage(logoConfig.src, {
                width: logoConfig.width || 150,
                height: logoConfig.height || 60,
                maintainAspectRatio: true
            });

            return {
                image: resizedLogo,
                width: logoConfig.width || 150,
                height: logoConfig.height || 60,
                alignment: logoConfig.alignment || 'center'
            };
        }

        // Retornar configuración directa
        return {
            image: logoConfig.src,
            width: logoConfig.width || 150,
            height: logoConfig.height || 60,
            alignment: logoConfig.alignment || 'center'
        };

    } catch (error) {
        console.warn('Error procesando logo corporativo:', error);
        return null;
    }
};

/**
 * Crea header corporativo personalizado
 * @param {Object} branding - Configuración de branding
 * @param {Object} logo - Configuración del logo
 * @param {Object} docOptions - Opciones del documento
 * @returns {Function} Función de header para pdfmake
 */
const createCorporateHeader = (branding, logo, docOptions) => {
    return function (currentPage, pageCount, pageSize) {
        // No mostrar header en primera página por defecto
        if (currentPage === 1 && docOptions.includeHeader !== true) {
            return null;
        }

        const headerContent = [];
        const primaryColor = branding.primaryColor || DEFAULT_CORPORATE_BRANDING.primaryColor;

        // Logo en header si está disponible y es compacto
        if (logo && docOptions.logoInHeader) {
            headerContent.push({
                image: logo.image,
                width: 40,
                height: 20,
                alignment: 'left'
            });
        }

        // Nombre de organización
        if (branding.orgName) {
            headerContent.push({
                text: branding.orgName,
                style: 'corporateHeader',
                bold: true,
                color: primaryColor,
                alignment: 'center'
            });
        }

        // Título del documento
        if (docOptions.title) {
            headerContent.push({
                text: docOptions.title,
                style: 'corporateHeader',
                alignment: 'right'
            });
        }

        return headerContent.length > 0 ? {
            columns: headerContent,
            margin: [60, 20, 60, 10],
            borderBottom: [false, false, false, { width: 1, color: primaryColor }]
        } : null;
    };
};

/**
 * Crea footer corporativo personalizado
 * @param {Object} branding - Configuración de branding
 * @param {Object} docOptions - Opciones del documento
 * @returns {Function} Función de footer para pdfmake
 */
const createCorporateFooter = (branding, docOptions) => {
    return function (currentPage, pageCount) {
        // No mostrar footer en primera página por defecto
        if (currentPage === 1 && docOptions.includeFooter !== true) {
            return null;
        }

        const footerContent = [];
        const primaryColor = branding.primaryColor || DEFAULT_CORPORATE_BRANDING.primaryColor;

        // Información corporativa izquierda
        const leftInfo = [];
        if (branding.orgName) {
            leftInfo.push(branding.orgName);
        }
        if (branding.confidentialText || docOptions.confidential) {
            leftInfo.push(branding.confidentialText || 'Documento Confidencial');
        }

        if (leftInfo.length > 0) {
            footerContent.push({
                text: leftInfo.join(' • '),
                style: 'corporateFooter',
                alignment: 'left'
            });
        }

        // Fecha en centro
        footerContent.push({
            text: new Date().toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            style: 'corporateFooter',
            alignment: 'center'
        });

        // Numeración derecha
        footerContent.push({
            text: `Página ${currentPage} de ${pageCount}`,
            style: 'corporateFooter',
            alignment: 'right'
        });

        return {
            columns: footerContent,
            margin: [60, 10, 60, 20],
            borderTop: [false, { width: 1, color: primaryColor }, false, false]
        };
    };
};

/**
 * Crea watermark corporativo
 * @param {Object} branding - Configuración de branding
 * @returns {Promise<Object|null>} Configuración del watermark
 */
const createCorporateWatermark = async (branding) => {
    if (!branding.watermark) {
        return null;
    }

    const watermarkText = branding.watermarkText ||
        branding.orgName ||
        DEFAULT_CORPORATE_BRANDING.watermarkText;

    return {
        text: watermarkText,
        color: branding.primaryColor || DEFAULT_CORPORATE_BRANDING.primaryColor,
        opacity: branding.watermarkOpacity || DEFAULT_CORPORATE_BRANDING.watermarkOpacity,
        bold: true,
        italics: false,
        fontSize: 60,
        angle: 45
    };
};

/**
 * Crea portada corporativa completa
 * @param {Object} coverOptions - Opciones de la portada
 * @param {Object} branding - Configuración de branding
 * @param {Object} logo - Configuración del logo
 * @param {string} date - Fecha del documento
 * @returns {Array} Contenido de la portada
 */
const createCorporateCover = (coverOptions, branding, logo, date) => {
    const {
        title = '',
        subtitle = '',
        description = '',
        author = '',
        department = '',
        version = '',
        classification = 'Interno'
    } = coverOptions;

    const primaryColor = branding.primaryColor || DEFAULT_CORPORATE_BRANDING.primaryColor;
    const coverContent = [];

    // Header corporativo con logo
    if (logo || branding.orgName) {
        const headerElements = [];

        if (logo) {
            headerElements.push({
                image: logo.image,
                width: logo.width || 200,
                alignment: 'left',
                margin: [0, 0, 20, 0]
            });
        }

        if (branding.orgName) {
            headerElements.push({
                text: branding.orgName,
                fontSize: 18,
                bold: true,
                color: primaryColor,
                alignment: logo ? 'right' : 'center',
                margin: [0, 10, 0, 0]
            });
        }

        coverContent.push({
            columns: headerElements,
            margin: [0, 40, 0, 60]
        });
    }

    // Línea separadora
    coverContent.push({
        canvas: [{
            type: 'line',
            x1: 0, y1: 0,
            x2: 515, y2: 0,
            lineWidth: 2,
            lineColor: primaryColor
        }],
        margin: [0, 0, 0, 40]
    });

    // Título principal
    if (title) {
        coverContent.push({
            text: title,
            style: 'corporateCoverTitle',
            fontSize: 28,
            bold: true,
            color: '#1f2937',
            alignment: 'center',
            margin: [0, 60, 0, 30]
        });
    }

    // Subtítulo
    if (subtitle) {
        coverContent.push({
            text: subtitle,
            style: 'corporateCoverSubtitle',
            fontSize: 18,
            color: '#6b7280',
            alignment: 'center',
            margin: [0, 0, 0, 50]
        });
    }

    // Descripción
    if (description) {
        coverContent.push({
            text: description,
            style: 'corporateCoverDescription',
            fontSize: 14,
            color: '#374151',
            alignment: 'center',
            margin: [0, 0, 0, 80]
        });
    }

    // Información del documento en recuadro
    const docInfo = [];

    if (author) docInfo.push([{ text: 'Autor:', bold: true }, author]);
    if (department) docInfo.push([{ text: 'Departamento:', bold: true }, department]);
    if (version) docInfo.push([{ text: 'Versión:', bold: true }, version]);
    if (classification) docInfo.push([{ text: 'Clasificación:', bold: true }, classification]);
    docInfo.push([{ text: 'Fecha:', bold: true }, date]);

    if (docInfo.length > 0) {
        coverContent.push({
            table: {
                widths: ['30%', '70%'],
                body: docInfo
            },
            layout: {
                fillColor: '#f8fafc',
                hLineWidth: function (i, node) { return 0; },
                vLineWidth: function (i, node) { return 0; }
            },
            margin: [100, 80, 100, 40]
        });
    }

    // Footer corporativo con línea
    coverContent.push({
        canvas: [{
            type: 'line',
            x1: 0, y1: 0,
            x2: 515, y2: 0,
            lineWidth: 1,
            lineColor: primaryColor
        }],
        margin: [0, 60, 0, 20]
    });

    if (branding.orgName) {
        coverContent.push({
            text: `© ${new Date().getFullYear()} ${branding.orgName}. Todos los derechos reservados.`,
            fontSize: 9,
            color: '#9ca3af',
            alignment: 'center',
            margin: [0, 10, 0, 0]
        });
    }

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

    // Combinar branding con valores por defecto
    const finalBranding = { ...DEFAULT_CORPORATE_BRANDING, ...branding };

    return exportPDF(input, {
        ...otherOptions,
        branding: finalBranding,
        includeCover,
        coverOptions,
        corporateStyle: true,
        pageMargins,
        processLogo: processLogoForPDF,
        createCover: createCorporateCover,
        createHeader: includeHeader ? createCorporateHeader : null,
        createFooter: includeFooter ? createCorporateFooter : null,
        createWatermark: createCorporateWatermark,
        customStyles: {
            ...CORPORATE_STYLES,
            ...otherOptions.customStyles
        }
    }, signal);
};

/**
 * Función auxiliar para exportar tabla corporativa
 * @param {Array} data - Array de objetos
 * @param {Array} columns - Definición de columnas
 * @param {Object} options - Opciones de exportación
 * @returns {Promise<Blob>} Blob con el PDF corporativo
 */
export const exportCorporateTable = async (data, columns, options = {}) => {
    return exportBrandedPDF(data, {
        ...options,
        columns,
        title: options.title || 'Reporte Corporativo',
        includeCover: options.includeCover !== false,
        branding: {
            ...DEFAULT_CORPORATE_BRANDING,
            ...options.branding
        }
    });
};

/**
 * Función auxiliar para exportar reporte corporativo completo
 * @param {Object} reportData - Datos del reporte
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Blob>} Blob con el reporte corporativo
 */
export const exportCorporateReport = async (reportData, options = {}) => {
    const {
        title = 'Reporte Corporativo',
        sections = [],
        appendices = [],
        branding = {},
        ...otherOptions
    } = options;

    // Estructurar datasets para el reporte
    const datasets = [
        ...sections.map(section => ({
            name: section.name || section.title,
            data: section.data,
            columns: section.columns,
            options: section.options
        })),
        ...appendices.map(appendix => ({
            name: `Anexo: ${appendix.name || appendix.title}`,
            data: appendix.data,
            columns: appendix.columns,
            options: { ...appendix.options, pageBreakBefore: true }
        }))
    ];

    return exportBrandedPDF({ datasets }, {
        title,
        includeCover: true,
        coverOptions: {
            title,
            subtitle: options.subtitle || 'Análisis y Resultados',
            description: options.description,
            author: options.author,
            department: options.department,
            classification: options.classification || 'Confidencial'
        },
        branding: {
            ...DEFAULT_CORPORATE_BRANDING,
            ...branding
        },
        ...otherOptions
    });
};

// ================================================
// PDF BUILDER CORPORATIVO - FASE 2
// ================================================

/**
 * Crea una nueva instancia del PDF Builder corporativo
 * @param {Object} options - Opciones iniciales del builder
 * @returns {Promise<PDFDocumentBuilder>} Nueva instancia del builder corporativo
 */
export const createCorporatePDFBuilder = async (options = {}) => {
    // Importación diferida del builder
    const { PDFDocumentBuilder } = await import('./advance-pdf/pdf-builder.js');

    // Configuración corporativa por defecto
    const corporateOptions = {
        ...options,
        corporateStyle: true,
        pageMargins: [60, 100, 60, 80] // Márgenes corporativos
    };

    const builder = new PDFDocumentBuilder(corporateOptions);

    // Configurar branding corporativo por defecto
    builder.setBranding({
        ...DEFAULT_CORPORATE_BRANDING,
        ...options.branding
    });

    // Configurar estilos corporativos
    builder.setCustomStyles({
        ...CORPORATE_STYLES,
        ...options.customStyles
    });

    return builder;
};

/**
 * Función de conveniencia para crear builder corporativo con configuración completa
 * @param {Object} config - Configuración corporativa
 * @returns {Promise<PDFDocumentBuilder>} Builder corporativo configurado
 */
export const createBrandedBuilder = async (config = {}) => {
    const {
        organization = {},
        document = {},
        styles = {},
        ...otherConfig
    } = config;

    const builder = await createCorporatePDFBuilder({
        branding: {
            orgName: organization.name || 'Mi Empresa',
            primaryColor: organization.primaryColor || '#2563eb',
            logoUrl: organization.logoUrl,
            watermark: organization.watermark !== false,
            ...organization
        },
        customStyles: styles,
        ...otherConfig
    });

    // Configurar metadatos del documento si se proporcionan
    if (document.title || document.author || document.subject) {
        builder.setMetadata({
            title: document.title,
            subtitle: document.subtitle,
            author: document.author,
            subject: document.subject || document.description
        });
    }

    return builder;
};

/**
 * Template para reporte ejecutivo corporativo
 * @param {Object} reportConfig - Configuración del reporte
 * @returns {Promise<PDFDocumentBuilder>} Builder configurado para reporte ejecutivo
 */
export const createExecutiveReportBuilder = async (reportConfig = {}) => {
    const {
        title = 'Reporte Ejecutivo',
        period = '',
        department = '',
        author = '',
        branding = {},
        ...otherConfig
    } = reportConfig;

    const builder = await createCorporatePDFBuilder({
        branding: {
            ...DEFAULT_CORPORATE_BRANDING,
            ...branding
        },
        ...otherConfig
    });

    // Configurar metadatos
    builder.setMetadata({
        title: `${title}${period ? ` - ${period}` : ''}`,
        subtitle: department ? `Departamento de ${department}` : '',
        author,
        subject: 'Reporte Ejecutivo Corporativo'
    });

    // Configurar header y footer ejecutivos
    builder.addHeader({
        content: `{orgName} • ${title}`,
        includeDate: true,
        firstPage: false,
        style: 'corporateHeader'
    });

    builder.addFooter({
        leftText: 'CONFIDENCIAL',
        centerText: department,
        rightText: 'Página {pageNumber} de {totalPages}',
        firstPage: false,
        style: 'corporateFooter'
    });

    // Configurar TOC ejecutivo
    builder.generateTOC({
        title: 'Índice Ejecutivo',
        maxLevel: 2,
        includePageNumbers: true,
        pageBreakAfter: true,
        position: 'start'
    });

    return builder;
};

/**
 * Template para manual corporativo
 * @param {Object} manualConfig - Configuración del manual
 * @returns {Promise<PDFDocumentBuilder>} Builder configurado para manual
 */
export const createCorporateManualBuilder = async (manualConfig = {}) => {
    const {
        title = 'Manual Corporativo',
        version = '1.0',
        department = '',
        branding = {},
        ...otherConfig
    } = manualConfig;

    const builder = await createCorporatePDFBuilder({
        branding: {
            ...DEFAULT_CORPORATE_BRANDING,
            ...branding,
            watermark: true,
            watermarkText: 'MANUAL INTERNO'
        },
        ...otherConfig
    });

    // Metadatos del manual
    builder.setMetadata({
        title: `${title} v${version}`,
        subtitle: department ? `${department}` : '',
        author: 'Departamento de Recursos Humanos',
        subject: 'Manual Corporativo'
    });

    // Header/Footer para manual
    builder.addHeader({
        content: `{orgName} • Manual • v${version}`,
        alignment: 'space-between',
        firstPage: false
    });

    builder.addFooter({
        leftText: `© {orgName}`,
        rightText: 'Página {pageNumber} de {totalPages}',
        firstPage: false
    });

    // TOC detallado para manual
    builder.generateTOC({
        title: 'Índice de Contenidos',
        maxLevel: 4,
        includePageNumbers: true,
        dotLeader: true,
        pageBreakAfter: true,
        position: 'start'
    });

    return builder;
};

/**
 * Utilidades corporativas para builder
 */
export const CorporateBuilderUtils = {
    /**
     * Crea sección de resumen ejecutivo estándar
     */
    addExecutiveSummary: (builder, content) => {
        return builder
            .addSection({
                title: 'Resumen Ejecutivo',
                level: 1,
                pageBreakBefore: false
            })
            .addParagraph(content, { style: 'corporateLead' })
            .addSpacer(20);
    },

    /**
     * Crea sección de conclusiones estándar
     */
    addConclusions: (builder, conclusions) => {
        builder.addSection({
            title: 'Conclusiones y Recomendaciones',
            level: 1,
            pageBreakBefore: true
        });

        if (Array.isArray(conclusions)) {
            conclusions.forEach((conclusion, index) => {
                builder.addParagraph(
                    `${index + 1}. ${conclusion}`,
                    { style: 'corporateBody' }
                );
            });
        } else {
            builder.addParagraph(conclusions, { style: 'corporateBody' });
        }

        return builder;
    },

    /**
     * Crea página de aprobaciones estándar
     */
    addApprovalPage: (builder, approvers = []) => {
        builder
            .pageBreak()
            .addSection({ title: 'Aprobaciones', level: 1 });

        const approvalTable = {
            headers: ['Cargo', 'Nombre', 'Firma', 'Fecha'],
            data: approvers.map(approver => [
                approver.position || '',
                approver.name || '',
                '', // Espacio para firma
                approver.date || '___________'
            ])
        };

        return builder.addTable(approvalTable);
    }
};

// Exports principales
export {
    createCorporatePDFBuilder,
    createBrandedBuilder,
    createExecutiveReportBuilder,
    createCorporateManualBuilder,
    CorporateBuilderUtils,
    DEFAULT_CORPORATE_BRANDING,
    CORPORATE_STYLES
};

export default {
    exportBrandedPDF,
    exportCorporateTable,
    exportCorporateReport,
    createCorporatePDFBuilder,
    createBrandedBuilder,
    createExecutiveReportBuilder,
    createCorporateManualBuilder,
    CorporateBuilderUtils
};