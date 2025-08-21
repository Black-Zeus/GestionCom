/**
 * Funciones y utilidades comunes para exportación PDF
 * Contiene TODA la lógica compartida entre pdf-simple.js y pdf-branded.js
 */

import config from '../config.export.json';

/**
 * Constantes comunes - ÚNICA FUENTE DE VERDAD
 */
export const PDF_CONSTANTS = {
    MAX_RECOMMENDED_ROWS: 1000,
    DEFAULT_MAX_CELL_LENGTH: 50,
    CORPORATE_MAX_CELL_LENGTH: 40,
    DATE_FORMAT: 'DD/MM/YYYY',
    LOCALE: 'es-ES'
};

/**
 * Configuración de fuentes - ÚNICA FUENTE DE VERDAD
 * Usando fuentes por defecto de pdfmake
 */
export const PDF_FONTS = {
    DEFAULT: 'Roboto',      // Fuente por defecto de pdfmake
    CORPORATE: 'Roboto',    // Fuente corporativa
    ALTERNATIVE: 'Roboto'   // Fuente alternativa
};

/**
 * Estilos base comunes para documentos PDF - ÚNICA FUENTE DE VERDAD
 */
export const baseStyles = {
    header: {
        fontSize: 18,
        bold: false,
        margin: [0, 0, 0, 20],
        color: '#374151'
    },
    subheader: {
        fontSize: 14,
        bold: false,
        margin: [0, 20, 0, 8],
        color: '#6b7280'
    },
    footer: {
        fontSize: 8,
        color: '#9ca3af',
        alignment: 'center'
    },
    noData: {
        fontSize: 10,
        color: '#6b7280',
        italics: true
    }
};

/**
 * Configuración base del documento PDF - ÚNICA FUENTE DE VERDAD
 */
export const baseDocumentConfig = {
    pageSize: config.pdf.defaultPageSize,
    pageOrientation: config.pdf.defaultOrientation,
    pageMargins: config.pdf.defaultMargins,
    defaultStyle: {
        // No especificar fuente para usar la por defecto de pdfmake
        fontSize: 10
    },
    info: {
        creator: 'Export System',
        producer: 'pdfmake'
    }
};

/**
 * Importa pdfmake de forma diferida para optimizar bundle
 * @returns {Promise<Object>} Módulo pdfmake
 */
export const getPDFMake = async () => {
    try {
        const [pdfMake, fonts] = await Promise.all([
            import('pdfmake'),
            import('pdfmake/build/vfs_fonts.js') // Fuentes incluidas
        ]);

        const pdfMakeModule = pdfMake.default || pdfMake;

        // Configurar fuentes estándar de pdfmake
        pdfMakeModule.vfs = fonts.default;
        pdfMakeModule.fonts = {
            Roboto: {
                normal: 'Roboto-Regular.ttf',
                bold: 'Roboto-Medium.ttf',
                italics: 'Roboto-Italic.ttf',
                bolditalics: 'Roboto-MediumItalic.ttf'
            }
        };

        return pdfMakeModule;
    } catch (error) {
        console.warn('Could not load pdfmake fonts, using browser defaults');
        // Fallback sin fuentes
        const pdfMake = await import('pdfmake');
        const pdfMakeModule = pdfMake.default || pdfMake;
        pdfMakeModule.fonts = {};
        return pdfMakeModule;
    }
};

/**
 * Convierte un valor para mostrar en PDF
 * @param {*} value - Valor a convertir
 * @param {Object} options - Opciones de conversión
 * @returns {string} Valor formateado
 */
export const convertValueForPDF = (value, options = {}) => {
    const {
        maxCellLength = PDF_CONSTANTS.DEFAULT_MAX_CELL_LENGTH,
        dateFormat = PDF_CONSTANTS.DATE_FORMAT,
        numberFormat = null,
        corporateStyle = false
    } = options;

    if (value === null || value === undefined) {
        return corporateStyle ? '-' : '';
    }

    if (value instanceof Date) {
        try {
            return value.toLocaleDateString(PDF_CONSTANTS.LOCALE);
        } catch (error) {
            return value.toString();
        }
    }

    if (typeof value === 'boolean') {
        return corporateStyle ? (value ? '✓' : '✗') : (value ? 'Sí' : 'No');
    }

    if (typeof value === 'number') {
        if (isNaN(value) || !isFinite(value)) {
            return corporateStyle ? '-' : '';
        }

        if (numberFormat) {
            try {
                return new Intl.NumberFormat(PDF_CONSTANTS.LOCALE, numberFormat).format(value);
            } catch (error) {
                return value.toString();
            }
        }

        // Formatear números grandes con separadores en modo corporativo
        if (corporateStyle && Math.abs(value) >= 1000) {
            return new Intl.NumberFormat(PDF_CONSTANTS.LOCALE).format(value);
        }

        return value.toString();
    }

    if (typeof value === 'object') {
        try {
            const jsonString = JSON.stringify(value);
            const displayText = corporateStyle ? '[Objeto]' : '[Object]';
            return jsonString.length > maxCellLength
                ? jsonString.substring(0, maxCellLength) + '...'
                : jsonString;
        } catch (error) {
            return corporateStyle ? '[Objeto]' : '[Object]';
        }
    }

    // String y otros tipos
    let stringValue = String(value);

    // Truncar si es muy largo
    if (maxCellLength && stringValue.length > maxCellLength) {
        stringValue = stringValue.substring(0, maxCellLength) + '...';
    }

    return stringValue;
};

/**
 * Genera anchos de columna automáticos
 * @param {Array} columns - Definición de columnas
 * @param {boolean} compactMode - Modo compacto (para corporativo)
 * @returns {Array} Array de anchos para pdfmake
 */
export const generateColumnWidths = (columns, compactMode = false) => {
    if (!columns || columns.length === 0) {
        return ['*']; // Una columna que ocupe todo el ancho
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
        } else if (columnCount <= 5) {
            return new Array(columnCount).fill('auto');
        } else {
            // Para muchas columnas, usar ancho fijo pequeño
            return new Array(columnCount).fill(compactMode ? 70 : 80);
        }
    }
};

/**
 * Extrae el valor de una celda según la definición de columna
 * @param {Object} row - Fila de datos
 * @param {string|Object} col - Definición de columna
 * @returns {*} Valor extraído
 */
export const extractCellValue = (row, col) => {
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

    return value;
};

/**
 * Extrae el texto del header de una columna
 * @param {string|Object} col - Definición de columna
 * @returns {string} Texto del header
 */
export const extractColumnHeader = (col) => {
    return typeof col === 'string'
        ? col
        : (col.header || col.title || col.label || col.key || col.field || '');
};

/**
 * Valida los datos antes de la exportación PDF
 * @param {*} input - Datos a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado de validación
 */
export const validateData = (input, options = {}) => {
    const errors = [];
    const warnings = [];

    if (!input) {
        errors.push('Input data is required');
        return { isValid: false, errors, warnings };
    }

    // Si es un objeto con datasets (múltiples secciones)
    if (input.datasets && Array.isArray(input.datasets)) {
        input.datasets.forEach((dataset, index) => {
            if (!dataset.data || !Array.isArray(dataset.data)) {
                errors.push(`Dataset at index ${index} must have a 'data' array`);
            }

            if (dataset.name && typeof dataset.name !== 'string') {
                errors.push(`Dataset at index ${index} 'name' must be a string`);
            }
        });
    } else {
        // Datos simples
        const data = Array.isArray(input) ? input : (input.data || []);

        if (!Array.isArray(data)) {
            errors.push('Data must be an array');
        } else if (data.length === 0) {
            warnings.push('Data array is empty');
        }
    }

    // Advertencias sobre límites de PDF
    if (input.datasets && Array.isArray(input.datasets)) {
        input.datasets.forEach((dataset, index) => {
            const data = dataset.data || [];
            if (data.length > PDF_CONSTANTS.MAX_RECOMMENDED_ROWS) {
                warnings.push(`Dataset ${index} has ${data.length} rows, this may result in a very large PDF`);
            }
        });
    } else {
        const data = Array.isArray(input) ? input : (input.data || []);
        if (data.length > PDF_CONSTANTS.MAX_RECOMMENDED_ROWS) {
            warnings.push(`Data has ${data.length} rows, this may result in a very large PDF`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Procesa los datasets de entrada para normalizarlos
 * @param {Array|Object} input - Datos de entrada
 * @param {Array} columns - Columnas por defecto
 * @returns {Array} Array de datasets normalizados
 */
export const processInputDatasets = (input, columns = []) => {
    if (input.datasets && Array.isArray(input.datasets)) {
        // Múltiples secciones
        return input.datasets.map((dataset, index) => ({
            name: dataset.name || `Sección ${index + 1}`,
            data: dataset.data || [],
            columns: dataset.columns && dataset.columns.length > 0 ? dataset.columns : columns,
            options: dataset.options || {}
        }));
    } else {
        // Dataset único
        const data = Array.isArray(input) ? input : (input.data || []);
        const finalColumns = columns.length > 0 ? columns : (input.columns || []);

        return [{
            name: null, // Sin nombre para dataset único
            data,
            columns: finalColumns,
            options: {}
        }];
    }
};

/**
 * Crea una tabla vacía cuando no hay datos
 * @param {Array} columns - Definición de columnas
 * @param {boolean} corporateStyle - Si usar estilo corporativo
 * @returns {Object} Definición de tabla vacía para pdfmake
 */
export const createEmptyTable = (columns, corporateStyle = false) => {
    const colSpan = columns.length || 1;
    const message = 'Sin datos disponibles';
    const style = 'noData';

    return {
        table: {
            headerRows: 0,
            body: [[{
                text: message,
                style,
                colSpan,
                alignment: 'center'
            }]]
        }
    };
};

/**
 * Genera el footer por defecto con numeración de páginas
 * @param {Object} options - Opciones del footer
 * @returns {Function} Función de footer para pdfmake
 */
export const createDefaultFooter = (options = {}) => {
    const { style = 'footer' } = options;

    return function (currentPage, pageCount) {
        return {
            text: `Página ${currentPage} de ${pageCount}`,
            style
        };
    };
};

/**
 * Convierte datos a formato de tabla para pdfmake - FUNCIÓN CENTRAL UNIFICADA
 * @param {Array} data - Array de objetos
 * @param {Array} columns - Definición de columnas
 * @param {Object} options - Opciones de conversión
 * @returns {Object} Definición de tabla para pdfmake
 */
export const convertDataToTable = (data, columns, options = {}) => {
    const {
        includeHeaders = true,
        maxCellLength = PDF_CONSTANTS.DEFAULT_MAX_CELL_LENGTH,
        dateFormat = PDF_CONSTANTS.DATE_FORMAT,
        numberFormat = null,
        corporateStyle = false,
        branding = {},
        alternateRowColors = true,
        compactMode = false
    } = options;

    if (!Array.isArray(data) || data.length === 0) {
        return createEmptyTable(columns, corporateStyle);
    }

    const tableBody = [];
    const primaryColor = branding.primaryColor || (corporateStyle ? '#2563eb' : '#374151');
    const secondaryColor = branding.secondaryColor || '#f8fafc';

    // Generar cabeceras
    if (includeHeaders && columns && columns.length > 0) {
        const headers = columns.map(col => {
            const headerText = extractColumnHeader(col);

            if (corporateStyle) {
                return {
                    text: headerText,
                    style: 'corporateTableHeader',
                    fillColor: primaryColor,
                    color: '#ffffff',
                    bold: true,
                    fontSize: compactMode ? 9 : 10,
                    alignment: 'center'
                };
            } else {
                return {
                    text: headerText,
                    style: 'tableHeader'
                };
            }
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

        const processColumns = columns && columns.length > 0 ? columns : Object.keys(row);

        processColumns.forEach(col => {
            const value = columns && columns.length > 0
                ? extractCellValue(row, col)
                : row[col];

            // Convertir valor para PDF
            const cellContent = convertValueForPDF(value, {
                maxCellLength,
                dateFormat,
                numberFormat,
                corporateStyle
            });

            if (corporateStyle) {
                tableRow.push({
                    text: cellContent,
                    style: 'corporateTableBody',
                    fontSize: compactMode ? 7 : 8,
                    color: '#374151',
                    ...(alternateRowColors && !isEvenRow ? {
                        fillColor: secondaryColor
                    } : {})
                });
            } else {
                tableRow.push({
                    text: cellContent,
                    style: 'tableBody'
                });
            }
        });

        tableBody.push(tableRow);
    });

    // Layout de tabla
    const layout = corporateStyle ? {
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
    } : {
        fillColor: function (rowIndex, node, columnIndex) {
            // Alternar colores de fila para mejor legibilidad
            return (rowIndex % 2 === 0) ? '#f9fafb' : null;
        },
        hLineWidth: function (i, node) {
            return (i === 0 || i === node.table.body.length) ? 2 : 1;
        },
        vLineWidth: function (i, node) {
            return (i === 0 || i === node.table.widths.length) ? 2 : 1;
        },
        hLineColor: function (i, node) {
            return (i === 0 || i === node.table.body.length) ? '#374151' : '#e5e7eb';
        },
        vLineColor: function (i, node) {
            return (i === 0 || i === node.table.widths.length) ? '#374151' : '#e5e7eb';
        }
    };

    return {
        table: {
            headerRows: includeHeaders ? 1 : 0,
            widths: generateColumnWidths(columns, compactMode),
            body: tableBody
        },
        layout
    };
};

/**
 * Crea documento PDF completo - FUNCIÓN CENTRAL UNIFICADA
 * @param {Object} options - Opciones del documento
 * @returns {Object} Definición del documento para pdfmake
 */
export const createPDFDocument = (options = {}) => {
    const {
        content = [],
        title = 'Documento',
        subtitle = '',
        author = '',
        subject = '',
        pageSize = baseDocumentConfig.pageSize,
        pageOrientation = baseDocumentConfig.pageOrientation,
        pageMargins = baseDocumentConfig.pageMargins,
        customStyles = {},
        customInfo = {},
        header = null,
        footer = null,
        watermark = null,
        corporateStyle = false,
        branding = {}
    } = options;

    // Estilos específicos según el tipo
    const specificStyles = corporateStyle ? {
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
        }
    } : {
        tableHeader: {
            bold: false,
            fontSize: 10,
            color: '#374151',
            fillColor: '#f3f4f6'
        },
        tableBody: {
            fontSize: 9,
            color: '#6b7280'
        }
    };

    const docDefinition = {
        content,
        pageSize,
        pageOrientation,
        pageMargins,

        info: {
            ...baseDocumentConfig.info,
            title,
            author,
            subject,
            ...(corporateStyle && branding.orgName ? { creator: branding.orgName } : {}),
            ...(corporateStyle ? { producer: 'Corporate PDF Generator' } : {}),
            ...(corporateStyle ? { creationDate: new Date(), modDate: new Date() } : {}),
            ...customInfo
        },

        styles: {
            ...baseStyles,
            ...specificStyles,
            ...customStyles
        },

        defaultStyle: {
            ...baseDocumentConfig.defaultStyle,
            // Solo agregar fuente en modo corporativo si es necesario
            ...(corporateStyle ? { lineHeight: 1.3 } : {})
        }
    };

    // Agregar elementos opcionales
    if (header) docDefinition.header = header;
    if (footer) {
        docDefinition.footer = footer;
    } else {
        docDefinition.footer = createDefaultFooter();
    }
    if (watermark) docDefinition.watermark = watermark;

    return docDefinition;
};

/**
 * Función principal unificada de exportación PDF
 * @param {Array|Object} input - Datos o configuración de datasets
 * @param {Object} exportOptions - Opciones de exportación
 * @param {AbortSignal} signal - Señal para cancelar operación
 * @returns {Promise<Blob>} Blob con el archivo PDF
 */
export const exportPDF = async (input, exportOptions = {}, signal = null) => {
    try {
        // Verificar cancelación
        if (signal?.aborted) {
            throw new Error('PDF export was cancelled');
        }

        const {
            columns = [],
            filename = 'export.pdf',
            title = 'Documento',
            subtitle = '',
            validateInput = true,
            corporateStyle = false,
            branding = {},
            includeCover = false,
            coverOptions = {},
            processLogo = null, // Función para procesar logo
            createCover = null, // Función para crear portada
            createHeader = null, // Función para crear header
            createFooter = null, // Función para crear footer
            createWatermark = null, // Función para crear watermark
            ...documentOptions
        } = exportOptions;

        // Validar entrada si se solicita
        if (validateInput) {
            const validation = validateData(input, exportOptions);
            if (!validation.isValid) {
                throw new Error(`PDF validation failed: ${validation.errors.join(', ')}`);
            }

            if (validation.warnings.length > 0) {
                console.warn('PDF export warnings:', validation.warnings);
            }
        }

        // Cargar pdfmake
        const pdfMake = await getPDFMake();

        // Verificar cancelación después de cargar dependencia
        if (signal?.aborted) {
            throw new Error('PDF export was cancelled');
        }

        // Procesar logo si se proporciona función y datos
        let logo = null;
        if (processLogo && (branding.headerLogoUrl || branding.logoUrl)) {
            try {
                logo = await processLogo(branding.headerLogoUrl || branding.logoUrl);
            } catch (error) {
                console.warn('Failed to process logo, continuing without it:', error);
            }
        }

        const content = [];

        // Agregar portada si se solicita
        if (includeCover && createCover) {
            const coverContent = createCover(branding, {
                title,
                subtitle,
                ...coverOptions
            }, logo);
            content.push(...coverContent);
        }

        // Agregar título principal si no hay portada
        if (!includeCover && title) {
            const titleStyle = corporateStyle ? 'sectionTitle' : 'header';
            content.push({
                text: title,
                style: titleStyle
            });

            if (subtitle) {
                const subtitleStyle = corporateStyle ? 'sectionSubtitle' : 'subheader';
                content.push({
                    text: subtitle,
                    style: subtitleStyle
                });
            }
        }

        // Procesar datasets
        const datasets = processInputDatasets(input, columns);

        datasets.forEach((dataset, index) => {
            const { name, data, columns: datasetColumns, options: datasetOptions } = dataset;

            // Verificar cancelación durante procesamiento
            if (signal?.aborted) {
                throw new Error('PDF export was cancelled');
            }

            // Agregar título de sección y salto de página si hay múltiples datasets
            if (datasets.length > 1) {
                if (index > 0) {
                    content.push({ text: '', pageBreak: 'before' });
                }

                if (name) {
                    const sectionStyle = corporateStyle ? 'sectionTitle' : 'subheader';
                    content.push({
                        text: name,
                        style: sectionStyle
                    });
                }
            }

            // Generar tabla para este dataset
            const table = convertDataToTable(data, datasetColumns, {
                ...documentOptions,
                ...datasetOptions,
                corporateStyle,
                branding
            });

            content.push(table);

            // Agregar espacio entre secciones (excepto la última)
            if (index < datasets.length - 1 && datasets.length > 1) {
                content.push({ text: '\n' });
            }
        });

        // Verificar cancelación antes de generar PDF
        if (signal?.aborted) {
            throw new Error('PDF export was cancelled');
        }

        // Crear headers, footers, watermarks personalizados si se proporcionan
        let customHeader = null;
        let customFooter = null;
        let customWatermark = null;

        if (createHeader) {
            customHeader = createHeader(branding, logo, documentOptions);
        }

        if (createFooter) {
            customFooter = createFooter(branding, documentOptions);
        }

        if (createWatermark) {
            customWatermark = await createWatermark(branding);
        }

        // Crear documento PDF
        const docDefinition = createPDFDocument({
            content,
            title,
            subtitle,
            corporateStyle,
            branding,
            header: customHeader,
            footer: customFooter,
            watermark: customWatermark,
            ...documentOptions
        });

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
                            value: corporateStyle ? 'pdf-branded' : 'pdf',
                            writable: false,
                            enumerable: false
                        },
                        exportOptions: {
                            value: { ...exportOptions },
                            writable: false,
                            enumerable: false
                        },
                        ...(corporateStyle ? {
                            hasBranding: {
                                value: true,
                                writable: false,
                                enumerable: false
                            }
                        } : {})
                    });

                    resolve(blob);
                });

            } catch (error) {
                reject(new Error(`PDF generation failed: ${error.message}`));
            }
        });

    } catch (error) {
        throw new Error(`PDF export failed: ${error.message}`);
    }
};