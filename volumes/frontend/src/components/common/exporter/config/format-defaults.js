// src/export/config/format-defaults.js
// Configuraciones por defecto para cada formato de exportación

/**
 * Configuraciones por defecto para CSV
 */
export const csvDefaults = {
    delimiter: ',',
    encoding: 'utf-8',
    includeHeader: true,
    quoteStrings: true,
    escapeQuotes: true,
    lineBreak: '\n',
    autoDownload: true,
    filename: 'export'
};

/**
 * Configuraciones por defecto para JSON
 */
export const jsonDefaults = {
    format: 'structured', // 'array', 'structured', 'envelope'
    indent: 2,
    includeMetadata: true,
    preserveTypes: true,
    autoDownload: true,
    filename: 'export'
};

/**
 * Configuraciones por defecto para Excel
 */
export const excelDefaults = {
    autoFitColumns: true,
    freezeHeader: true,
    includeMetadata: true,
    sheetName: 'Datos',
    useExcelJS: true, // Usar ExcelJS en lugar de xlsx para más funcionalidades
    headerStyle: {
        bold: true,
        backgroundColor: 'F2F2F2',
        textColor: '333333'
    },
    cellStyle: {
        textColor: '000000',
        backgroundColor: 'FFFFFF'
    },
    autoDownload: true,
    filename: 'export'
};

/**
 * Configuraciones por defecto para PDF
 */
export const pdfDefaults = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [40, 40, 40, 40], // [left, top, right, bottom]

    // Configuración de portada
    cover: {
        enabled: false,
        title: '',
        subtitle: '',
        logo: null,
        backgroundColor: '#FFFFFF'
    },

    // Configuración de encabezado
    header: {
        enabled: false,
        text: '',
        logo: null,
        height: 30
    },

    // Configuración de pie de página
    footer: {
        enabled: true,
        text: '',
        pageNumbers: true,
        height: 30
    },

    // Configuración de branding
    branding: {
        orgName: '',
        primaryColor: '#333333',
        secondaryColor: '#666666',
        logo: null
    },

    // Estilos de texto
    styles: {
        header1: {
            fontSize: 20,
            bold: true,
            margin: [0, 0, 0, 10]
        },
        header2: {
            fontSize: 16,
            bold: true,
            margin: [0, 10, 0, 5]
        },
        header3: {
            fontSize: 14,
            bold: true,
            margin: [0, 8, 0, 4]
        },
        normal: {
            fontSize: 10,
            margin: [0, 0, 0, 5]
        },
        tableHeader: {
            fontSize: 10,
            bold: true,
            fillColor: '#F2F2F2',
            margin: [5, 5, 5, 5]
        },
        tableCell: {
            fontSize: 9,
            margin: [5, 3, 5, 3]
        }
    },

    // Configuración de tablas
    table: {
        headerRows: 1,
        widths: 'auto',
        layout: 'lightHorizontalLines'
    },

    autoDownload: true,
    filename: 'export'
};

/**
 * Configuraciones por defecto para TXT
 */
export const txtDefaults = {
    delimiter: '\t',
    encoding: 'utf-8',
    includeHeader: true,
    lineBreak: '\n',
    columnSeparator: ' | ',
    autoDownload: true,
    filename: 'export'
};

/**
 * Configuración global por defecto aplicable a todos los formatos
 */
export const globalDefaults = {
    autoDownload: true,
    filename: 'export',
    timestamp: true, // Agregar timestamp al nombre del archivo

    // Configuración de columnas por defecto
    columns: {
        autoDetect: true, // Auto-detectar columnas desde los datos
        defaultType: 'string',
        defaultHeader: null // Usar key como header si no se especifica
    },

    // Configuración de datos
    data: {
        validateTypes: true,
        allowEmpty: true,
        maxRows: null // Sin límite por defecto
    },

    // Configuración de metadata por defecto
    metadata: {
        includeTimestamp: true,
        includeRowCount: true,
        author: 'Sistema de Exportación',
        generator: 'Export System v1.0'
    }
};

/**
 * Mapeo de configuraciones por formato
 */
export const formatDefaults = {
    csv: csvDefaults,
    json: jsonDefaults,
    excel: excelDefaults,
    pdf: pdfDefaults,
    txt: txtDefaults
};

/**
 * Obtiene la configuración por defecto para un formato específico
 * @param {string} format - Formato de exportación
 * @returns {object} Configuración por defecto del formato
 */
export const getFormatDefaults = (format) => {
    const formatConfig = formatDefaults[format] || {};

    return {
        ...globalDefaults,
        ...formatConfig
    };
};

/**
 * Combina configuración por defecto con configuración personalizada
 * @param {string} format - Formato de exportación
 * @param {object} customConfig - Configuración personalizada
 * @returns {object} Configuración combinada
 */
export const mergeConfig = (format, customConfig = {}) => {
    const defaults = getFormatDefaults(format);

    // Combinar configuraciones de manera profunda para objetos anidados
    const mergedConfig = { ...defaults };

    Object.keys(customConfig).forEach(key => {
        if (customConfig[key] !== null && typeof customConfig[key] === 'object' && !Array.isArray(customConfig[key])) {
            // Combinar objetos anidados
            mergedConfig[key] = {
                ...mergedConfig[key],
                ...customConfig[key]
            };
        } else {
            // Sobrescribir valores primitivos y arrays
            mergedConfig[key] = customConfig[key];
        }
    });

    return mergedConfig;
};

/**
 * Genera nombre de archivo con timestamp si está habilitado
 * @param {string} baseFilename - Nombre base del archivo
 * @param {string} format - Formato de exportación
 * @param {boolean} includeTimestamp - Si incluir timestamp
 * @returns {string} Nombre de archivo completo
 */
export const generateFilename = (baseFilename, format, includeTimestamp = true) => {
    let filename = baseFilename || 'export';

    if (includeTimestamp) {
        const now = new Date();
        const timestamp = now.toISOString()
            .replace(/[:.]/g, '-')
            .substring(0, 19); // YYYY-MM-DDTHH-MM-SS

        filename = `${filename}_${timestamp}`;
    }

    return `${filename}.${format}`;
};

/**
 * Configuraciones específicas para diferentes casos de uso
 */
export const presetConfigs = {
    // Configuración para reportes ejecutivos
    executive: {
        pdf: {
            cover: { enabled: true },
            header: { enabled: true },
            footer: { enabled: true, pageNumbers: true },
            branding: { enabled: true }
        }
    },

    // Configuración para exportación de datos simples
    simple: {
        csv: { delimiter: ',' },
        json: { format: 'array', indent: 0 },
        excel: { autoFitColumns: false, freezeHeader: false }
    },

    // Configuración para archivos de intercambio
    interchange: {
        json: { format: 'envelope', includeMetadata: true },
        csv: { quoteStrings: false, includeHeader: true }
    },

    // Configuración para impresión
    print: {
        pdf: {
            pageOrientation: 'portrait',
            pageMargins: [60, 60, 60, 60],
            styles: {
                normal: { fontSize: 11 },
                tableCell: { fontSize: 10 }
            }
        }
    }
};

/**
 * Obtiene configuración preset
 * @param {string} preset - Nombre del preset
 * @param {string} format - Formato específico
 * @returns {object} Configuración preset
 */
export const getPresetConfig = (preset, format) => {
    const presetConfig = presetConfigs[preset];
    if (!presetConfig || !presetConfig[format]) {
        return {};
    }

    return presetConfig[format];
};