/**
 * Funciones y utilidades comunes para exportación PDF
 * Contiene TODA la lógica compartida entre pdf-simple.js y pdf-branded.js
 * ACTUALIZADO: Soporte completo para PDF Builder API con Fase 2 (multi-columna, TOC, páginas)
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
    LOCALE: 'es-ES',
    // FASE 2: Nuevas constantes
    MAX_COLUMNS_PER_PAGE: 5,
    MAX_TOC_LEVELS: 6,
    DEFAULT_PAGE_MARGINS: [40, 60, 40, 60],
    CORPORATE_PAGE_MARGINS: [60, 100, 60, 80],
    MIN_COLUMN_WIDTH: 50,
    MAX_SECTION_DEPTH: 6
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

// ================================================
// ESTILOS PARA PDF BUILDER - FASE 1 Y 2
// ================================================

/**
 * Estilos específicos para elementos del PDF Builder
 */
export const builderStyles = {
    // Estilos de portada
    coverTitle: {
        fontSize: 24,
        bold: true,
        alignment: 'center',
        margin: [0, 60, 0, 20],
        color: '#1f2937'
    },
    coverSubtitle: {
        fontSize: 16,
        alignment: 'center',
        margin: [0, 0, 0, 40],
        color: '#6b7280'
    },
    coverDescription: {
        fontSize: 12,
        alignment: 'center',
        margin: [0, 0, 0, 60],
        color: '#374151'
    },
    coverInfo: {
        fontSize: 11,
        color: '#6b7280',
        margin: [0, 2, 0, 2]
    },

    // Estilos de secciones por nivel
    sectionLevel1: {
        fontSize: 18,
        bold: true,
        margin: [0, 20, 0, 10],
        color: '#374151'
    },
    sectionLevel2: {
        fontSize: 16,
        bold: true,
        margin: [0, 15, 0, 8],
        color: '#6b7280'
    },
    sectionLevel3: {
        fontSize: 14,
        bold: true,
        margin: [0, 12, 0, 6],
        color: '#6b7280'
    },
    sectionLevel4: {
        fontSize: 12,
        bold: true,
        margin: [0, 10, 0, 5],
        color: '#6b7280'
    },
    sectionLevel5: {
        fontSize: 11,
        bold: true,
        margin: [0, 8, 0, 4],
        color: '#6b7280'
    },
    sectionLevel6: {
        fontSize: 10,
        bold: true,
        margin: [0, 6, 0, 3],
        color: '#6b7280'
    },

    // Estilos de párrafos
    body: {
        fontSize: 10,
        lineHeight: 1.3,
        margin: [0, 5, 0, 5],
        alignment: 'justify'
    },
    bodyLead: {
        fontSize: 12,
        lineHeight: 1.4,
        margin: [0, 8, 0, 8],
        alignment: 'justify'
    },
    bodySmall: {
        fontSize: 9,
        lineHeight: 1.2,
        margin: [0, 3, 0, 3]
    },

    // Estilos de listas
    listItem: {
        fontSize: 10,
        margin: [0, 2, 0, 2]
    },
    listItemCompact: {
        fontSize: 9,
        margin: [0, 1, 0, 1]
    },

    // Estilos de tablas
    tableHeader: {
        bold: true,
        fontSize: 10,
        fillColor: '#f3f4f6',
        color: '#374151'
    },
    tableCell: {
        fontSize: 9,
        margin: [2, 2, 2, 2]
    },
    tableCaption: {
        fontSize: 9,
        italics: true,
        color: '#6b7280',
        alignment: 'center',
        margin: [0, 5, 0, 10]
    },

    // Estilos de imágenes
    imageCaption: {
        fontSize: 9,
        italics: true,
        color: '#6b7280',
        alignment: 'center',
        margin: [0, 5, 0, 10]
    },

    // Estilos de texto genérico
    normal: {
        fontSize: 10,
        lineHeight: 1.3
    },
    emphasis: {
        fontSize: 10,
        italics: true
    },
    strong: {
        fontSize: 10,
        bold: true
    },
    caption: {
        fontSize: 9,
        italics: true,
        color: '#9ca3af',
        alignment: 'center'
    },

    // FASE 2: Estilos para TOC
    tocTitle: {
        fontSize: 16,
        bold: true,
        margin: [0, 0, 0, 20],
        color: '#374151'
    },
    tocLevel1: {
        fontSize: 12,
        bold: true,
        margin: [0, 8, 0, 4],
        color: '#374151'
    },
    tocLevel2: {
        fontSize: 11,
        margin: [20, 6, 0, 3],
        color: '#6b7280'
    },
    tocLevel3: {
        fontSize: 10,
        margin: [40, 4, 0, 2],
        color: '#6b7280'
    },
    tocLevel4: {
        fontSize: 10,
        margin: [60, 4, 0, 2],
        color: '#9ca3af'
    },
    tocLevel5: {
        fontSize: 9,
        margin: [80, 3, 0, 2],
        color: '#9ca3af'
    },
    tocLevel6: {
        fontSize: 9,
        margin: [100, 3, 0, 2],
        color: '#9ca3af'
    },
    tocPageNumber: {
        fontSize: 10,
        alignment: 'right',
        color: '#6b7280'
    }
};

/**
 * Estilos corporativos para PDF Builder
 */
export const corporateBuilderStyles = {
    coverTitle: {
        fontSize: 28,
        bold: true,
        alignment: 'center',
        margin: [0, 80, 0, 30],
        color: '#1f2937'
    },
    coverSubtitle: {
        fontSize: 18,
        alignment: 'center',
        margin: [0, 0, 0, 50],
        color: '#6b7280'
    },
    sectionTitle: {
        fontSize: 20,
        bold: true,
        margin: [0, 25, 0, 15],
        color: '#2563eb'
    },
    corporateTableHeader: {
        bold: true,
        fontSize: 10,
        fillColor: '#2563eb',
        color: '#ffffff'
    },
    corporateBody: {
        fontSize: 11,
        lineHeight: 1.4,
        margin: [0, 6, 0, 6],
        alignment: 'justify'
    },

    // TOC corporativo
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
 * Configuración base del documento PDF - ÚNICA FUENTE DE VERDAD
 */
export const baseDocumentConfig = {
    pageSize: config.pdf?.defaultPageSize || 'A4',
    pageOrientation: config.pdf?.defaultOrientation || 'portrait',
    pageMargins: config.pdf?.defaultMargins || PDF_CONSTANTS.DEFAULT_PAGE_MARGINS,
    defaultStyle: {
        // No especificar fuente para usar la por defecto de pdfmake
        fontSize: 10
    },
    info: {
        creator: 'Export System',
        producer: 'pdfmake'
    }
};

// ================================================
// UTILIDADES PARA PDF BUILDER - FASE 1 Y 2
// ================================================

/**
 * Combina estilos base con estilos del builder
 * @param {boolean} corporateMode - Si usar estilos corporativos
 * @param {Object} customStyles - Estilos personalizados adicionales
 * @returns {Object} Estilos combinados
 */
export const combineBuilderStyles = (corporateMode = false, customStyles = {}) => {
    const baseStyleSet = corporateMode ? corporateBuilderStyles : builderStyles;

    return {
        ...baseStyles,
        ...baseStyleSet,
        ...customStyles
    };
};

/**
 * Obtiene configuración de elemento desde config.json
 * @param {string} elementType - Tipo de elemento
 * @returns {Object} Configuración del elemento
 */
export const getElementConfig = (elementType) => {
    return config.pdfBuilder?.elements?.[elementType] || {};
};

/**
 * Obtiene estilo según el nivel de sección
 * @param {number} level - Nivel de la sección (1-6)
 * @param {boolean} corporateMode - Si usar estilo corporativo
 * @returns {string} Nombre del estilo
 */
export const getSectionStyleByLevel = (level, corporateMode = false) => {
    if (corporateMode && level === 1) {
        return 'sectionTitle';
    }

    const validLevel = Math.min(Math.max(level, 1), 6);
    return `sectionLevel${validLevel}`;
};

/**
 * Valida configuración de elemento del builder
 * @param {string} elementType - Tipo de elemento
 * @param {Object} elementConfig - Configuración a validar
 * @throws {Error} Si la configuración es inválida
 */
export const validateBuilderElementConfig = (elementType, elementConfig) => {
    const typeConfig = getElementConfig(elementType);
    const validation = config.pdfBuilder?.validation || {};

    if (!validation.enabled) {
        return; // Validación deshabilitada
    }

    // Validaciones específicas por tipo
    switch (elementType) {
        case 'section':
            if (elementConfig.level && (elementConfig.level < 1 || elementConfig.level > (typeConfig.maxLevel || 6))) {
                throw new Error(`Nivel de sección inválido: ${elementConfig.level}`);
            }
            break;

        case 'table':
            if (elementConfig.data && Array.isArray(elementConfig.data)) {
                const maxRows = validation.maxTableRows || 10000;
                if (elementConfig.data.length > maxRows) {
                    throw new Error(`Tabla excede el máximo de filas permitidas: ${elementConfig.data.length} > ${maxRows}`);
                }
            }
            break;

        case 'image':
            if (elementConfig.src && typeof elementConfig.src === 'string') {
                const allowedTypes = validation.allowedImageTypes || ['jpg', 'jpeg', 'png', 'gif'];
                const extension = elementConfig.src.split('.').pop()?.toLowerCase();
                if (extension && !allowedTypes.includes(extension)) {
                    throw new Error(`Tipo de imagen no permitido: ${extension}`);
                }
            }
            break;

        // FASE 2: Validaciones adicionales
        case 'columns':
            if (elementConfig.columnsConfig && Array.isArray(elementConfig.columnsConfig)) {
                if (elementConfig.columnsConfig.length > PDF_CONSTANTS.MAX_COLUMNS_PER_PAGE) {
                    throw new Error(`Máximo ${PDF_CONSTANTS.MAX_COLUMNS_PER_PAGE} columnas por página`);
                }
            }
            break;

        case 'toc':
            if (elementConfig.maxLevel && elementConfig.maxLevel > PDF_CONSTANTS.MAX_TOC_LEVELS) {
                throw new Error(`Nivel máximo de TOC: ${PDF_CONSTANTS.MAX_TOC_LEVELS}`);
            }
            break;
    }
};

// ================================================
// FASE 2: PROCESAMIENTO AVANZADO DE CONTENIDO
// ================================================

/**
 * Procesa contenido del builder para exportPDF con soporte Fase 2
 * @param {Array} builderContent - Contenido del builder
 * @param {Object} options - Opciones de procesamiento
 * @returns {Array} Contenido procesado para pdfmake
 */
export const processBuilderContent = (builderContent, options = {}) => {
    if (!Array.isArray(builderContent)) {
        return [];
    }

    const processedContent = [];
    let currentPage = options.startPage || 1;
    let layoutState = 'single'; // 'single', 'multi-column'

    builderContent.forEach((element, index) => {
        try {
            // Validar elemento si está habilitado
            if (options.validate) {
                validateBuilderElementConfig(element.type, element.config);
            }

            // Procesar según tipo de elemento
            switch (element.type) {
                case 'columns':
                    layoutState = 'multi-column';
                    processedContent.push(...processColumnsElement(element, options));
                    break;

                case 'columnReset':
                    layoutState = 'single';
                    processedContent.push(...processColumnResetElement(element, options));
                    break;

                case 'toc':
                    processedContent.push(...processTOCElement(element, options));
                    break;

                case 'pageBreak':
                    processedContent.push(processPageBreakElement(element, options));
                    currentPage++;
                    break;

                case 'section':
                    // Actualizar número de página en TOC si existe
                    if (element.config?.id && options.tocManager) {
                        options.tocManager.updateSectionPage(element.config.id, currentPage);
                    }
                    processedContent.push(...processStandardElement(element, options));
                    break;

                default:
                    // Procesar elementos estándar
                    processedContent.push(...processStandardElement(element, options));
                    break;
            }

        } catch (error) {
            console.error(`Error procesando elemento ${index}:`, error);

            // En modo no estricto, agregar elemento de error
            if (!options.strictMode) {
                processedContent.push({
                    text: `Error en elemento ${index + 1}: ${error.message}`,
                    style: 'noData',
                    color: '#ef4444'
                });
            } else {
                throw error;
            }
        }
    });

    return processedContent;
};

/**
 * Procesa elemento de columnas
 * @private
 */
function processColumnsElement(element, options) {
    if (element.content) {
        return Array.isArray(element.content) ? element.content : [element.content];
    }
    return [];
}

/**
 * Procesa elemento de reset de columnas
 * @private
 */
function processColumnResetElement(element, options) {
    if (element.content) {
        return Array.isArray(element.content) ? element.content : [element.content];
    }
    return [];
}

/**
 * Procesa elemento de TOC
 * @private
 */
function processTOCElement(element, options) {
    if (element.content) {
        return Array.isArray(element.content) ? element.content : [element.content];
    }
    return [];
}

/**
 * Procesa elemento de salto de página
 * @private
 */
function processPageBreakElement(element, options) {
    return element.content || { text: '', pageBreak: 'after' };
}

/**
 * Procesa elementos estándar
 * @private
 */
function processStandardElement(element, options) {
    if (element.content) {
        return Array.isArray(element.content) ? element.content : [element.content];
    }
    return [];
}

/**
 * Crea configuración de documento para builder con soporte Fase 2
 * @param {Object} builderOptions - Opciones del builder
 * @returns {Object} Configuración del documento
 */
export const createBuilderDocumentConfig = (builderOptions = {}) => {
    const {
        content = [],
        corporateStyle = false,
        customStyles = {},
        pageMargins,
        ...otherOptions
    } = builderOptions;

    // Determinar márgenes
    const finalMargins = pageMargins ||
        (corporateStyle ? PDF_CONSTANTS.CORPORATE_PAGE_MARGINS : PDF_CONSTANTS.DEFAULT_PAGE_MARGINS);

    // Combinar estilos
    const finalStyles = combineBuilderStyles(corporateStyle, customStyles);

    return {
        ...baseDocumentConfig,
        pageMargins: finalMargins,
        styles: finalStyles,
        content,
        ...otherOptions
    };
};

// ================================================
// FASE 2: UTILIDADES AVANZADAS
// ================================================

/**
 * Optimiza layout multi-columna para mejor rendimiento
 * @param {Object} columnsConfig - Configuración de columnas
 * @param {Object} options - Opciones de optimización
 * @returns {Object} Configuración optimizada
 */
export const optimizeColumnsLayout = (columnsConfig, options = {}) => {
    const { maxColumns = PDF_CONSTANTS.MAX_COLUMNS_PER_PAGE, minWidth = PDF_CONSTANTS.MIN_COLUMN_WIDTH } = options;

    if (!Array.isArray(columnsConfig)) {
        return columnsConfig;
    }

    // Limitar número de columnas
    const limitedColumns = columnsConfig.slice(0, maxColumns);

    // Optimizar anchos
    const optimizedColumns = limitedColumns.map((column, index) => {
        if (typeof column === 'object' && column.width) {
            // Asegurar ancho mínimo
            if (typeof column.width === 'number' && column.width < minWidth) {
                return { ...column, width: minWidth };
            }
        }
        return column;
    });

    return optimizedColumns;
};

/**
 * Calcula métricas de layout para optimización
 * @param {Array} content - Contenido del documento
 * @returns {Object} Métricas calculadas
 */
export const calculateLayoutMetrics = (content) => {
    if (!Array.isArray(content)) {
        return { elements: 0, pages: 1, complexity: 'low' };
    }

    const metrics = {
        elements: content.length,
        sections: 0,
        tables: 0,
        images: 0,
        columns: 0,
        pageBreaks: 0,
        estimatedPages: 1
    };

    content.forEach(element => {
        switch (element.type) {
            case 'section':
                metrics.sections++;
                break;
            case 'table':
                metrics.tables++;
                // Estimar páginas adicionales por tabla
                if (element.config?.data?.length > 20) {
                    metrics.estimatedPages += Math.ceil(element.config.data.length / 25);
                }
                break;
            case 'image':
                metrics.images++;
                break;
            case 'columns':
                metrics.columns++;
                break;
            case 'pageBreak':
                metrics.pageBreaks++;
                metrics.estimatedPages++;
                break;
        }
    });

    // Calcular complejidad
    let complexity = 'low';
    if (metrics.elements > 50 || metrics.tables > 5 || metrics.columns > 0) {
        complexity = 'medium';
    }
    if (metrics.elements > 100 || metrics.tables > 10 || metrics.estimatedPages > 20) {
        complexity = 'high';
    }

    metrics.complexity = complexity;
    return metrics;
};

/**
 * Estima tiempo de generación del PDF
 * @param {Object} metrics - Métricas del layout
 * @returns {number} Tiempo estimado en segundos
 */
export const estimateGenerationTime = (metrics) => {
    const baseTime = 1; // 1 segundo base
    const elementTime = metrics.elements * 0.1;
    const tableTime = metrics.tables * 0.5;
    const imageTime = metrics.images * 0.3;
    const columnTime = metrics.columns * 0.2;

    return Math.max(baseTime, baseTime + elementTime + tableTime + imageTime + columnTime);
};

/**
 * Valida configuración completa del builder
 * @param {Object} builderState - Estado del builder
 * @returns {Object} Resultado de validación
 */
export const validateBuilderState = (builderState) => {
    const errors = [];
    const warnings = [];
    const recommendations = [];

    const { content, metadata, layoutInfo, tocStats } = builderState;

    // Validar contenido
    if (!content || content.length === 0) {
        errors.push('Documento sin contenido');
    }

    // Validar metadatos
    if (!metadata?.title) {
        warnings.push('Documento sin título');
    }

    // Validar layout
    if (layoutInfo?.type === 'multi-column' && !layoutInfo.hasContent) {
        warnings.push('Layout multi-columna sin contenido');
    }

    // Validar TOC
    if (tocStats?.totalSections === 0 && tocStats?.tocGenerated) {
        warnings.push('TOC generado sin secciones');
    }

    // Calcular métricas y recomendaciones
    const metrics = calculateLayoutMetrics(content);

    if (metrics.complexity === 'high') {
        recommendations.push('Considere dividir el documento para mejor rendimiento');
    }

    if (metrics.tables > 5 && metrics.complexity === 'high') {
        recommendations.push('Muchas tablas detectadas, considere usar paginación');
    }

    if (metrics.estimatedPages > 50) {
        recommendations.push('Documento extenso, considere agregar TOC automático');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        recommendations,
        metrics,
        estimatedTime: estimateGenerationTime(metrics)
    };
};

// ================================================
// FUNCIONES EXISTENTES MEJORADAS
// ================================================

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
        console.error('Error loading pdfmake:', error);
        throw new Error('Failed to load PDF generation library');
    }
};

/**
 * Normaliza diferentes formatos de entrada a formato estándar de datasets
 * @param {Array|Object} input - Datos de entrada
 * @param {Array} columns - Definición de columnas (opcional)
 * @returns {Array} Array de datasets normalizados
 */
export const normalizeDatasets = (input, columns = []) => {
    if (!input) {
        return [{ name: null, data: [], columns: [], options: {} }];
    }

    // Si tiene propiedad datasets, es multi-dataset
    if (input.datasets && Array.isArray(input.datasets)) {
        return input.datasets.map(dataset => ({
            name: dataset.name || null,
            data: Array.isArray(dataset.data) ? dataset.data : [],
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
 * Extrae el header de una columna sea string u objeto
 * @param {string|Object} column - Definición de columna
 * @returns {string} Header de la columna
 */
export const extractColumnHeader = (column) => {
    if (typeof column === 'string') {
        return column;
    }

    if (column && typeof column === 'object') {
        return column.header || column.title || column.label || column.name || column.key || String(column);
    }

    return String(column);
};

/**
 * Extrae la clave de acceso a datos de una columna
 * @param {string|Object} column - Definición de columna
 * @returns {string} Clave de acceso
 */
export const extractColumnKey = (column) => {
    if (typeof column === 'string') {
        return column;
    }

    if (column && typeof column === 'object') {
        return column.key || column.field || column.dataIndex || column.accessor || column.name || column.header;
    }

    return String(column);
};

/**
 * Formatea un valor de celda según su tipo y opciones
 * @param {any} value - Valor a formatear
 * @param {Object} options - Opciones de formato
 * @returns {string} Valor formateado
 */
export const formatCellValue = (value, options = {}) => {
    const {
        maxLength = PDF_CONSTANTS.DEFAULT_MAX_CELL_LENGTH,
        dateFormat = PDF_CONSTANTS.DATE_FORMAT,
        numberFormat = null,
        nullValue = '-',
        truncateIndicator = '...'
    } = options;

    // Manejar valores null/undefined
    if (value === null || value === undefined || value === '') {
        return nullValue;
    }

    let formattedValue = String(value);

    // Formatear fechas
    if (value instanceof Date) {
        try {
            formattedValue = value.toLocaleDateString(PDF_CONSTANTS.LOCALE, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            formattedValue = value.toISOString().split('T')[0];
        }
    }
    // Formatear números si se especifica formato
    else if (typeof value === 'number' && numberFormat) {
        try {
            formattedValue = value.toLocaleString(PDF_CONSTANTS.LOCALE, numberFormat);
        } catch (error) {
            formattedValue = String(value);
        }
    }

    // Truncar si excede la longitud máxima
    if (formattedValue.length > maxLength) {
        formattedValue = formattedValue.substring(0, maxLength - truncateIndicator.length) + truncateIndicator;
    }

    return formattedValue;
};

/**
 * Genera anchos de columnas automáticos
 * @param {Array} columns - Definición de columnas
 * @param {boolean} compactMode - Si usar modo compacto
 * @returns {Array} Array de anchos de columna
 */
export const generateColumnWidths = (columns, compactMode = false) => {
    if (!columns || columns.length === 0) {
        return ['*'];
    }

    return columns.map(column => {
        // Si la columna especifica un ancho, usarlo
        if (column && typeof column === 'object' && column.width) {
            return column.width;
        }

        // Anchos automáticos basados en el número de columnas
        const columnCount = columns.length;
        if (columnCount <= 3) {
            return '*';
        } else if (columnCount <= 5) {
            return compactMode ? 'auto' : '*';
        } else {
            return 'auto';
        }
    });
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
                    fontSize: compactMode ? 8 : 9
                };
            } else {
                return {
                    text: headerText,
                    style: 'tableHeader',
                    bold: true,
                    fontSize: compactMode ? 8 : 9
                };
            }
        });

        tableBody.push(headers);
    }

    // Generar filas de datos
    data.forEach((row, rowIndex) => {
        const tableRow = [];

        if (columns && columns.length > 0) {
            // Usar columnas definidas
            columns.forEach(col => {
                const key = extractColumnKey(col);
                const cellValue = row[key];
                const formattedValue = formatCellValue(cellValue, {
                    maxLength: corporateStyle ? PDF_CONSTANTS.CORPORATE_MAX_CELL_LENGTH : maxCellLength,
                    dateFormat,
                    numberFormat
                });

                tableRow.push({
                    text: formattedValue,
                    fontSize: compactMode ? 7 : 8,
                    margin: [2, 2, 2, 2]
                });
            });
        } else {
            // Usar todas las propiedades del objeto como columnas
            Object.values(row).forEach(value => {
                const formattedValue = formatCellValue(value, {
                    maxLength: corporateStyle ? PDF_CONSTANTS.CORPORATE_MAX_CELL_LENGTH : maxCellLength,
                    dateFormat,
                    numberFormat
                });

                tableRow.push({
                    text: formattedValue,
                    fontSize: compactMode ? 7 : 8,
                    margin: [2, 2, 2, 2]
                });
            });
        }

        tableBody.push(tableRow);
    });

    // Configurar layout de tabla
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
        ...baseStyles,
        ...corporateBuilderStyles,
        ...customStyles
    } : {
        ...baseStyles,
        ...builderStyles,
        ...customStyles
    };

    // Información del documento
    const documentInfo = {
        ...baseDocumentConfig.info,
        title: title || 'Documento PDF',
        author: author || 'Sistema de Exportación',
        subject: subject || subtitle,
        creator: customInfo.creator || baseDocumentConfig.info.creator,
        producer: customInfo.producer || baseDocumentConfig.info.producer,
        creationDate: new Date(),
        ...customInfo
    };

    // Configuración final del documento
    const docDefinition = {
        ...baseDocumentConfig,
        pageSize,
        pageOrientation,
        pageMargins,
        content,
        styles: specificStyles,
        info: documentInfo
    };

    // Agregar header si se proporciona
    if (header && typeof header === 'function') {
        docDefinition.header = header;
    }

    // Agregar footer si se proporciona o usar por defecto
    if (footer && typeof footer === 'function') {
        docDefinition.footer = footer;
    } else if (!footer && !corporateStyle) {
        // Footer por defecto solo para documentos no corporativos
        docDefinition.footer = createDefaultFooter();
    }

    // Agregar watermark si se proporciona
    if (watermark) {
        docDefinition.watermark = watermark;
    }

    return docDefinition;
};

/**
 * Función principal de exportación PDF - UNIFICADA Y MEJORADA
 * Maneja tanto el flujo tradicional como el del builder con Fase 2
 */
export const exportPDF = async (input, exportOptions = {}, signal = null) => {
    const {
        title = 'Documento PDF',
        subtitle = '',
        author = '',
        filename = 'documento',
        corporateStyle = false,
        branding = {},
        columns = [],
        customStyles = {},
        createHeader = null,
        createFooter = null,
        createWatermark = null,
        processLogo = null,
        createCover = null,
        validate = false,
        strictMode = false,
        ...documentOptions
    } = exportOptions;

    try {
        // Obtener pdfmake
        const pdfMake = await getPDFMake();

        // Verificar cancelación
        if (signal?.aborted) {
            throw new Error('PDF export was cancelled');
        }

        let content = [];

        // Detectar si es contenido del builder
        if (input?.isBuilderGenerated && input?.builderContent) {
            // Procesar contenido del builder con soporte Fase 2
            content = processBuilderContent(input.builderContent, {
                validate,
                strictMode,
                corporateStyle,
                startPage: 1,
                tocManager: input.tocManager || null
            });
        } else {
            // Flujo tradicional - procesar datasets
            const datasets = normalizeDatasets(input, columns);

            datasets.forEach((dataset, index) => {
                const { name, data, columns: datasetColumns, options: datasetOptions = {} } = dataset;

                // Agregar título de sección si hay múltiples datasets
                if (datasets.length > 1 && name) {
                    const sectionStyle = corporateStyle ? 'sectionTitle' : 'subheader';
                    content.push({
                        text: name,
                        style: sectionStyle
                    });
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
        }

        // Verificar cancelación antes de generar PDF
        if (signal?.aborted) {
            throw new Error('PDF export was cancelled');
        }

        // Crear headers, footers, watermarks personalizados si se proporcionan
        let customHeader = null;
        let customFooter = null;
        let customWatermark = null;

        if (createHeader) {
            customHeader = createHeader(branding, null, documentOptions);
        }

        if (createFooter) {
            customFooter = createFooter(branding, documentOptions);
        }

        if (createWatermark) {
            customWatermark = await createWatermark(branding);
        }

        // Crear documento PDF usando configuración del builder si aplica
        const docDefinition = input?.isBuilderGenerated
            ? createBuilderDocumentConfig({
                content,
                title,
                subtitle,
                corporateStyle,
                branding,
                header: customHeader,
                footer: customFooter,
                watermark: customWatermark,
                customStyles,
                ...documentOptions
            })
            : createPDFDocument({
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
                            value: input?.isBuilderGenerated
                                ? (corporateStyle ? 'pdf-builder-branded' : 'pdf-builder')
                                : (corporateStyle ? 'pdf-branded' : 'pdf'),
                            writable: false,
                            enumerable: false
                        },
                        exportOptions: {
                            value: { ...exportOptions },
                            writable: false,
                            enumerable: false
                        },
                        isBuilderGenerated: {
                            value: !!input?.isBuilderGenerated,
                            writable: false,
                            enumerable: false
                        },
                        builderMetrics: {
                            value: input?.isBuilderGenerated ? calculateLayoutMetrics(input.builderContent) : null,
                            writable: false,
                            enumerable: false
                        }
                    });

                    resolve(blob);
                });

            } catch (error) {
                console.error('Error generating PDF:', error);
                reject(new Error(`Failed to generate PDF: ${error.message}`));
            }
        });

    } catch (error) {
        console.error('Error in PDF export:', error);
        throw error;
    }
};

// ================================================
// FASE 2: UTILIDADES DE IMÁGENES Y OPTIMIZACIÓN
// ================================================

/**
 * Crea una imagen redimensionada manteniendo proporción
 * @param {string} imageUrl - URL de la imagen
 * @param {Object} dimensions - Dimensiones objetivo
 * @returns {Promise<string>} Data URL de la imagen redimensionada
 */
export const resizeImage = async (imageUrl, dimensions = {}) => {
    const { width = 200, height = 200, maintainAspectRatio = true } = dimensions;

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = function () {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            let targetWidth = width;
            let targetHeight = height;

            if (maintainAspectRatio) {
                const aspectRatio = img.width / img.height;
                if (width / height > aspectRatio) {
                    targetWidth = height * aspectRatio;
                } else {
                    targetHeight = width / aspectRatio;
                }
            }

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
    });
};

/**
 * Valida formato de datos de entrada
 * @param {any} data - Datos a validar
 * @param {Array} columns - Columnas esperadas
 * @returns {Object} Resultado de validación
 */
export const validateInputData = (data, columns = []) => {
    const errors = [];
    const warnings = [];

    if (!data) {
        errors.push('No se proporcionaron datos');
        return { valid: false, errors, warnings };
    }

    // Validar estructura de datasets múltiples
    if (data.datasets) {
        if (!Array.isArray(data.datasets)) {
            errors.push('La propiedad datasets debe ser un array');
        } else {
            data.datasets.forEach((dataset, index) => {
                if (!dataset.data || !Array.isArray(dataset.data)) {
                    errors.push(`Dataset ${index + 1}: debe tener propiedad data como array`);
                }
                if (dataset.data && dataset.data.length === 0) {
                    warnings.push(`Dataset ${index + 1}: no contiene datos`);
                }
            });
        }
    }
    // Validar array simple
    else if (Array.isArray(data)) {
        if (data.length === 0) {
            warnings.push('El array de datos está vacío');
        }
        if (data.length > PDF_CONSTANTS.MAX_RECOMMENDED_ROWS) {
            warnings.push(`El dataset tiene ${data.length} filas, se recomienda menos de ${PDF_CONSTANTS.MAX_RECOMMENDED_ROWS} para mejor rendimiento`);
        }
    }
    // Validar objeto con propiedad data
    else if (data.data) {
        if (!Array.isArray(data.data)) {
            errors.push('La propiedad data debe ser un array');
        } else if (data.data.length === 0) {
            warnings.push('El array de datos está vacío');
        }
    }
    else {
        errors.push('Formato de datos no reconocido');
    }

    // Validar columnas si se proporcionan
    if (columns && Array.isArray(columns) && columns.length === 0) {
        warnings.push('No se definieron columnas, se usarán todas las propiedades de los objetos');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Optimiza datos para exportación PDF
 * @param {Array} data - Datos a optimizar
 * @param {Object} options - Opciones de optimización
 * @returns {Array} Datos optimizados
 */
export const optimizeDataForPDF = (data, options = {}) => {
    const {
        maxRows = PDF_CONSTANTS.MAX_RECOMMENDED_ROWS,
        maxCellLength = PDF_CONSTANTS.DEFAULT_MAX_CELL_LENGTH,
        removeEmptyRows = true,
        removeEmptyColumns = true
    } = options;

    if (!Array.isArray(data)) {
        return data;
    }

    let optimizedData = [...data];

    // Limitar número de filas
    if (optimizedData.length > maxRows) {
        console.warn(`Dataset truncado de ${optimizedData.length} a ${maxRows} filas`);
        optimizedData = optimizedData.slice(0, maxRows);
    }

    // Remover filas vacías
    if (removeEmptyRows) {
        optimizedData = optimizedData.filter(row => {
            if (!row || typeof row !== 'object') return false;
            return Object.values(row).some(value => value !== null && value !== undefined && value !== '');
        });
    }

    // Truncar valores de celda largos
    optimizedData = optimizedData.map(row => {
        const optimizedRow = {};
        Object.entries(row).forEach(([key, value]) => {
            if (typeof value === 'string' && value.length > maxCellLength) {
                optimizedRow[key] = value.substring(0, maxCellLength - 3) + '...';
            } else {
                optimizedRow[key] = value;
            }
        });
        return optimizedRow;
    });

    return optimizedData;
};

/**
 * Detecta automáticamente el tipo de columna basado en los datos
 * @param {Array} data - Datos para analizar
 * @param {string} columnKey - Clave de la columna
 * @returns {string} Tipo detectado ('string', 'number', 'date', 'boolean')
 */
export const detectColumnType = (data, columnKey) => {
    if (!Array.isArray(data) || data.length === 0) {
        return 'string';
    }

    const samples = data.slice(0, Math.min(50, data.length))
        .map(row => row[columnKey])
        .filter(value => value !== null && value !== undefined && value !== '');

    if (samples.length === 0) {
        return 'string';
    }

    // Contar tipos
    const types = {
        number: 0,
        date: 0,
        boolean: 0,
        string: 0
    };

    samples.forEach(value => {
        if (typeof value === 'boolean') {
            types.boolean++;
        } else if (typeof value === 'number') {
            types.number++;
        } else if (value instanceof Date) {
            types.date++;
        } else if (typeof value === 'string') {
            // Intentar detectar fechas en strings
            if (/^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{2}\/\d{2}\/\d{4}/.test(value)) {
                types.date++;
            }
            // Intentar detectar números en strings
            else if (/^[\d.,]+$/.test(value.replace(/\s/g, ''))) {
                types.number++;
            }
            else {
                types.string++;
            }
        } else {
            types.string++;
        }
    });

    // Retornar el tipo más común
    return Object.entries(types).reduce((a, b) => types[a[0]] > types[b[0]] ? a : b)[0];
};

/**
 * Genera columnas automáticamente basado en los datos
 * @param {Array} data - Datos para analizar
 * @param {Object} options - Opciones de generación
 * @returns {Array} Array de definiciones de columna
 */
export const generateAutoColumns = (data, options = {}) => {
    const {
        maxColumns = 10,
        excludeKeys = ['id', '_id', '__v'],
        includeTypes = true
    } = options;

    if (!Array.isArray(data) || data.length === 0) {
        return [];
    }

    // Obtener todas las claves únicas
    const allKeys = new Set();
    data.slice(0, 100).forEach(row => {
        if (row && typeof row === 'object') {
            Object.keys(row).forEach(key => allKeys.add(key));
        }
    });

    // Filtrar claves excluidas
    const filteredKeys = Array.from(allKeys).filter(key => !excludeKeys.includes(key));

    // Limitar número de columnas
    const finalKeys = filteredKeys.slice(0, maxColumns);

    // Generar definiciones de columna
    return finalKeys.map(key => {
        const column = {
            key,
            header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
        };

        if (includeTypes) {
            column.type = detectColumnType(data, key);
        }

        return column;
    });
};

/**
 * Estadísticas del sistema PDF con métricas de Fase 2
 * @returns {Object} Estadísticas de uso
 */
export const getPDFStats = () => {
    return {
        constants: PDF_CONSTANTS,
        fonts: PDF_FONTS,
        supportedFormats: ['pdf', 'pdf-branded', 'pdf-builder', 'pdf-builder-branded'],
        builderElements: ['cover', 'section', 'paragraph', 'text', 'image', 'table', 'list', 'pageBreak', 'columns', 'toc'],
        version: '2.0.0', // Actualizado para Fase 2
        features: {
            builder: true,
            corporate: true,
            multiDataset: true,
            customStyles: true,
            headers: true,
            footers: true,
            watermarks: true,
            // FASE 2: Nuevas características
            multiColumn: true,
            tableOfContents: true,
            pageBreaks: true,
            pagination: true,
            layoutManager: true,
            validation: true,
            optimization: true
        },
        limits: {
            maxColumns: PDF_CONSTANTS.MAX_COLUMNS_PER_PAGE,
            maxTocLevels: PDF_CONSTANTS.MAX_TOC_LEVELS,
            maxSectionDepth: PDF_CONSTANTS.MAX_SECTION_DEPTH,
            recommendedRows: PDF_CONSTANTS.MAX_RECOMMENDED_ROWS
        }
    };
};