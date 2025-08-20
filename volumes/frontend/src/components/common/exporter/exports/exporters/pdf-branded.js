/**
 * Exportador PDF corporativo usando pdfmake
 * Genera documentos PDF con branding, logos, watermarks y formato profesional
 */

import config from '../config.export.json';

/**
 * Importa pdfmake de forma diferida para optimizar bundle
 * @returns {Promise<Object>} Módulo pdfmake
 */
const getPDFMake = async () => {
    try {
        const pdfMake = await import('pdfmake/build/pdfmake');
        const pdfFonts = await import('pdfmake/build/vfs_fonts');

        // Configurar fuentes
        pdfMake.default.vfs = pdfFonts.default.pdfMake.vfs;

        return pdfMake.default;
    } catch (error) {
        throw new Error('pdfmake library is required for branded PDF export. Please install it: npm install pdfmake');
    }
};

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
                                text: new Date().toLocaleDateString('es-ES', {
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
        includePageNumbers = config.branding.default.pageNumbers,
        footerText = branding.footerText || config.branding.default.footerText,
        includeGeneratedBy = true,
        createdBy = branding.createdBy || config.branding.default.createdBy
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
                text: `Generado por ${createdBy} - ${new Date().toLocaleString('es-ES')}`,
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
 * Convierte datos a tabla corporativa para pdfmake
 * @param {Array} data - Array de objetos
 * @param {Array} columns - Definición de columnas
 * @param {Object} branding - Configuración de branding
 * @param {Object} options - Opciones de conversión
 * @returns {Object} Definición de tabla corporativa
 */
const convertDataToCorporateTable = (data, columns, branding = {}, options = {}) => {
    const {
        includeHeaders = true,
        maxCellLength = 40,
        alternateRowColors = true,
        compactMode = false
    } = options;

    if (!Array.isArray(data) || data.length === 0) {
        return {
            table: {
                headerRows: 0,
                body: [[{ text: 'Sin datos disponibles', style: 'noData', colSpan: columns.length || 1, alignment: 'center' }]]
            }
        };
    }

    const tableBody = [];
    const primaryColor = branding.primaryColor || '#2563eb';
    const secondaryColor = branding.secondaryColor || '#f8fafc';

    // Generar cabeceras corporativas
    if (includeHeaders && columns && columns.length > 0) {
        const headers = columns.map(col => {
            const headerText = typeof col === 'string'
                ? col
                : (col.header || col.title || col.label || col.key || col.field || '');

            return {
                text: headerText,
                style: 'corporateTableHeader',
                fillColor: primaryColor,
                color: '#ffffff',
                bold: true,
                fontSize: compactMode ? 9 : 10,
                alignment: 'center'
            };
        });
        tableBody.push(headers);
    }

    // Convertir filas de datos
    data.forEach((row, rowIndex) => {
        if (!row || typeof row !== 'object') {
            return;
        }

        const tableRow = [];
        const isEvenRow = rowIndex % 2 === 0;

        if (columns && columns.length > 0) {
            columns.forEach(col => {
                let value;

                if (typeof col === 'string') {
                    value = row[col];
                } else if (typeof col === 'object') {
                    const key = col.key || col.field || col.dataIndex;
                    value = row[key];

                    // Aplicar formatter si existe
                    if (col.formatter && typeof col.formatter === 'function') {
                        try {
                            value = col.formatter(value, row);
                        } catch (error) {
                            console.warn(`Error formatting column ${key}:`, error);
                        }
                    }
                }

                // Convertir valor para PDF corporativo
                const cellContent = convertValueForCorporatePDF(value, { maxCellLength });

                tableRow.push({
                    text: cellContent,
                    style: 'corporateTableBody',
                    fontSize: compactMode ? 7 : 8,
                    color: '#374151',
                    ...(alternateRowColors && !isEvenRow ? {
                        fillColor: secondaryColor
                    } : {})
                });
            });
        } else {
            Object.values(row).forEach(value => {
                const cellContent = convertValueForCorporatePDF(value, { maxCellLength });

                tableRow.push({
                    text: cellContent,
                    style: 'corporateTableBody',
                    fontSize: compactMode ? 7 : 8,
                    color: '#374151',
                    ...(alternateRowColors && !isEvenRow ? {
                        fillColor: secondaryColor
                    } : {})
                });
            });
        }

        tableBody.push(tableRow);
    });

    return {
        table: {
            headerRows: includeHeaders ? 1 : 0,
            widths: generateCorporateColumnWidths(columns, compactMode),
            body: tableBody
        },
        layout: {
            hLineWidth: function (i, node) {
                return (i === 0 || i === node.table.body.length) ? 2 : 0.5;
            },
            vLineWidth: function (i, node) {
                return 0.5;
            },
            hLineColor: function (i, node) {
                return (i === 0 || i === node.table.body.length) ? primaryColor : '#e5e7eb';
            },
            vLineColor: function (i, node) {
                return '#e5e7eb';
            },
            paddingLeft: function (i, node) { return 8; },
            paddingRight: function (i, node) { return 8; },
            paddingTop: function (i, node) { return 6; },
            paddingBottom: function (i, node) { return 6; }
        }
    };
};

/**
 * Convierte un valor para PDF corporativo
 * @param {*} value - Valor a convertir
 * @param {Object} options - Opciones de conversión
 * @returns {string} Valor formateado
 */
const convertValueForCorporatePDF = (value, options = {}) => {
    const { maxCellLength } = options;

    if (value === null || value === undefined) {
        return '-';
    }

    if (value instanceof Date) {
        try {
            return value.toLocaleDateString('es-ES');
        } catch (error) {
            return value.toString();
        }
    }

    if (typeof value === 'boolean') {
        return value ? '✓' : '✗';
    }

    if (typeof value === 'number') {
        if (isNaN(value) || !isFinite(value)) {
            return '-';
        }

        // Formatear números grandes con separadores
        if (Math.abs(value) >= 1000) {
            return new Intl.NumberFormat('es-ES').format(value);
        }

        return value.toString();
    }

    if (typeof value === 'object') {
        try {
            const jsonString = JSON.stringify(value);
            return jsonString.length > maxCellLength
                ? jsonString.substring(0, maxCellLength) + '...'
                : jsonString;
        } catch (error) {
            return '[Objeto]';
        }
    }

    // String y otros tipos
    let stringValue = String(value);

    if (maxCellLength && stringValue.length > maxCellLength) {
        stringValue = stringValue.substring(0, maxCellLength) + '...';
    }

    return stringValue;
};

/**
 * Genera anchos de columna para tabla corporativa
 * @param {Array} columns - Definición de columnas
 * @param {boolean} compactMode - Modo compacto
 * @returns {Array} Array de anchos para pdfmake
 */
const generateCorporateColumnWidths = (columns, compactMode = false) => {
    if (!columns || columns.length === 0) {
        return ['*'];
    }

    const columnCount = columns.length;

    if (compactMode) {
        // En modo compacto, usar anchos más pequeños
        if (columnCount <= 4) {
            return new Array(columnCount).fill('*');
        } else {
            return new Array(columnCount).fill('auto');
        }
    } else {
        // Modo normal
        if (columnCount <= 3) {
            return new Array(columnCount).fill('*');
        } else if (columnCount <= 6) {
            return new Array(columnCount).fill('auto');
        } else {
            return new Array(columnCount).fill(70);
        }
    }
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
        date = new Date().toLocaleDateString('es-ES')
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
 * Crea documento PDF corporativo completo
 * @param {Array} content - Contenido del documento
 * @param {Object} branding - Configuración de branding
 * @param {Object} documentOptions - Opciones del documento
 * @param {Object} logo - Logo procesado
 * @returns {Object} Definición del documento para pdfmake
 */
const createCorporatePDFDocument = (content, branding = {}, documentOptions = {}, logo = null) => {
    const {
        title = 'Documento Corporativo',
        author = branding.createdBy || 'Sistema',
        subject = '',
        pageSize = config.pdf.defaultPageSize,
        pageOrientation = config.pdf.defaultOrientation,
        pageMargins = [60, 100, 60, 80], // Márgenes más amplios para corporativo
        includeHeader = true,
        includeFooter = true,
        includeCover = false,
        coverOptions = {}
    } = documentOptions;

    const docDefinition = {
        content,
        pageSize,
        pageOrientation,
        pageMargins,

        info: {
            title,
            author,
            subject,
            creator: branding.orgName || 'Export System',
            producer: 'Corporate PDF Generator',
            creationDate: new Date(),
            modDate: new Date()
        },

        styles: {
            corporateHeader: {
                fontSize: 14,
                bold: true,
                color: branding.primaryColor || '#1e40af'
            },
            headerDate: {
                fontSize: 9,
                color: '#6b7280'
            },
            corporateFooter: {
                fontSize: 8,
                color: '#6b7280',
                alignment: 'center'
            },
            generatedBy: {
                fontSize: 7,
                color: '#9ca3af'
            },
            pageNumbers: {
                fontSize: 7,
                color: '#9ca3af'
            },
            coverTitle: {
                fontSize: 28,
                bold: true,
                alignment: 'center'
            },
            coverSubtitle: {
                fontSize: 16,
                alignment: 'center'
            },
            coverDescription: {
                fontSize: 12,
                alignment: 'center'
            },
            sectionTitle: {
                fontSize: 18,
                bold: true,
                color: branding.primaryColor || '#1e40af',
                margin: [0, 20, 0, 10]
            },
            sectionSubtitle: {
                fontSize: 14,
                bold: true,
                color: '#374151',
                margin: [0, 15, 0, 8]
            },
            corporateTableHeader: {
                bold: true,
                fontSize: 10,
                color: '#ffffff'
            },
            corporateTableBody: {
                fontSize: 8,
                color: '#374151'
            },
            noData: {
                fontSize: 10,
                color: '#6b7280',
                italics: true
            }
        },

        defaultStyle: {
            font: 'Helvetica',
            fontSize: 10,
            lineHeight: 1.3
        }
    };

    // Agregar header corporativo si se solicita
    if (includeHeader) {
        docDefinition.header = createCorporateHeader(branding, logo, documentOptions);
    }

    // Agregar footer corporativo si se solicita
    if (includeFooter) {
        docDefinition.footer = createCorporateFooter(branding, documentOptions);
    }

    // Agregar watermark si está configurado
    const watermark = createCorporateWatermark(branding);
    if (watermark) {
        docDefinition.watermark = watermark;
    }

    return docDefinition;
};

/**
 * Función principal de exportación PDF corporativo
 * @param {Array|Object} input - Datos o configuración de datasets
 * @param {Object} exportOptions - Opciones de exportación
 * @param {AbortSignal} signal - Señal para cancelar operación
 * @returns {Promise<Blob>} Blob con el archivo PDF corporativo
 */
export const exportBrandedPDF = async (input, exportOptions = {}, signal = null) => {
    try {
        // Verificar cancelación
        if (signal?.aborted) {
            throw new Error('Branded PDF export was cancelled');
        }

        const {
            columns = [],
            filename = 'export.pdf',
            branding = {},
            title = 'Reporte Corporativo',
            subtitle = '',
            validateInput = true,
            includeCover = false,
            coverOptions = {},
            ...documentOptions
        } = exportOptions;

        // Validar entrada (reutilizar validación del PDF simple)
        if (validateInput) {
            const { validateData } = await import('./pdf-simple.js');
            const validation = validateData(input, exportOptions);
            if (!validation.isValid) {
                throw new Error(`Branded PDF validation failed: ${validation.errors.join(', ')}`);
            }

            if (validation.warnings.length > 0) {
                console.warn('Branded PDF export warnings:', validation.warnings);
            }
        }

        // Cargar pdfmake
        const pdfMake = await getPDFMake();

        // Verificar cancelación después de cargar dependencia
        if (signal?.aborted) {
            throw new Error('Branded PDF export was cancelled');
        }

        // Procesar logo si se proporciona
        let logo = null;
        if (branding.headerLogoUrl || branding.logoUrl) {
            try {
                logo = await processLogoForPDF(branding.headerLogoUrl || branding.logoUrl);
            } catch (error) {
                console.warn('Failed to process logo, continuing without it:', error);
            }
        }

        const content = [];

        // Agregar portada si se solicita
        if (includeCover) {
            const coverContent = createCorporateCover(branding, {
                title,
                subtitle,
                ...coverOptions
            }, logo);
            content.push(...coverContent);
        }

        // Agregar título principal si no hay portada
        if (!includeCover && title) {
            content.push({
                text: title,
                style: 'sectionTitle'
            });

            if (subtitle) {
                content.push({
                    text: subtitle,
                    style: 'sectionSubtitle'
                });
            }
        }

        // Determinar si son múltiples secciones o datos simples
        if (input.datasets && Array.isArray(input.datasets)) {
            // Múltiples secciones corporativas
            input.datasets.forEach((dataset, index) => {
                const {
                    name = `Sección ${index + 1}`,
                    data = [],
                    columns: datasetColumns = [],
                    options: datasetOptions = {}
                } = dataset;

                // Verificar cancelación durante procesamiento
                if (signal?.aborted) {
                    throw new Error('Branded PDF export was cancelled');
                }

                // Agregar salto de página para secciones adicionales
                if (index > 0) {
                    content.push({ text: '', pageBreak: 'before' });
                }

                // Título de sección
                if (name) {
                    content.push({
                        text: name,
                        style: 'sectionTitle'
                    });
                }

                // Generar tabla corporativa para este dataset
                const finalColumns = datasetColumns.length > 0 ? datasetColumns : columns;
                const table = convertDataToCorporateTable(data, finalColumns, branding, {
                    ...documentOptions,
                    ...datasetOptions
                });

                content.push(table);
            });

        } else {
            // Dataset único
            const data = Array.isArray(input) ? input : (input.data || []);
            const finalColumns = columns.length > 0 ? columns : (input.columns || []);

            const table = convertDataToCorporateTable(data, finalColumns, branding, documentOptions);
            content.push(table);
        }

        // Verificar cancelación antes de generar PDF
        if (signal?.aborted) {
            throw new Error('Branded PDF export was cancelled');
        }

        // Crear documento PDF corporativo
        const docDefinition = createCorporatePDFDocument(content, branding, {
            title,
            includeCover,
            coverOptions,
            ...documentOptions
        }, logo);

        // Generar PDF
        return new Promise((resolve, reject) => {
            try {
                const pdfDocGenerator = pdfMake.createPdf(docDefinition);

                pdfDocGenerator.getBlob((blob) => {
                    // Agregar propiedades adicionales para compatibilidad
                    Object.defineProperties(blob, {
                        suggestedFilename: {
                            value: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
                            writable: false,
                            enumerable: false
                        },
                        exportFormat: {
                            value: 'pdf-branded',
                            writable: false,
                            enumerable: false
                        },
                        exportOptions: {
                            value: { ...exportOptions },
                            writable: false,
                            enumerable: false
                        },
                        hasBranding: {
                            value: true,
                            writable: false,
                            enumerable: false
                        }
                    });

                    resolve(blob);
                });

            } catch (error) {
                reject(new Error(`Branded PDF generation failed: ${error.message}`));
            }
        });

    } catch (error) {
        throw new Error(`Branded PDF export failed: ${error.message}`);
    }
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

// Exportar objeto con todas las funciones para compatibilidad
export default {
    export: exportBrandedPDF,
    exportExecutive: exportExecutiveReport,
    processLogoForPDF,
    createCorporateWatermark,
    createCorporateCover,
    convertDataToCorporateTable
};