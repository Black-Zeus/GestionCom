/**
 * PDF Elements Factory - Creación y validación de elementos para documentos PDF
 * Contiene la lógica para crear y validar todos los tipos de elementos
 */

import { baseStyles } from '../pdf-common.js';

/**
 * Tipos de elementos soportados
 */
export const ELEMENT_TYPES = {
    COVER: 'cover',
    SECTION: 'section',
    PARAGRAPH: 'paragraph',
    TEXT: 'text',
    IMAGE: 'image',
    TABLE: 'table',
    LIST: 'list',
    PAGE_BREAK: 'pageBreak',
    SPACER: 'spacer'
};

/**
 * Configuraciones por defecto para cada tipo de elemento
 */
const DEFAULT_CONFIGS = {
    [ELEMENT_TYPES.COVER]: {
        title: '',
        subtitle: '',
        description: '',
        author: '',
        alignment: 'center',
        includeDate: true,
        includePageBreak: true
    },
    [ELEMENT_TYPES.SECTION]: {
        title: '',
        subtitle: '',
        level: 1,
        alignment: 'left',
        pageBreakBefore: false,
        pageBreakAfter: false,
        style: 'auto' // 'auto' determina estilo según el nivel
    },
    [ELEMENT_TYPES.PARAGRAPH]: {
        text: '',
        style: 'body',
        alignment: 'left',
        margin: [0, 5, 0, 5],
        firstLineIndent: false
    },
    [ELEMENT_TYPES.TEXT]: {
        text: '',
        style: 'normal',
        alignment: 'left',
        fontSize: 10,
        bold: false,
        italics: false,
        color: '#000000'
    },
    [ELEMENT_TYPES.IMAGE]: {
        src: '',
        width: 'auto',
        height: 'auto',
        alignment: 'center',
        caption: '',
        captionStyle: 'caption'
    },
    [ELEMENT_TYPES.TABLE]: {
        headers: [],
        data: [],
        style: 'default',
        headerStyle: 'tableHeader',
        alternateRowColors: true,
        caption: ''
    },
    [ELEMENT_TYPES.LIST]: {
        items: [],
        type: 'bullet', // 'bullet', 'numbered', 'custom'
        indent: 20,
        spacing: 5,
        style: 'listItem'
    },
    [ELEMENT_TYPES.PAGE_BREAK]: {},
    [ELEMENT_TYPES.SPACER]: {
        height: 20
    }
};

/**
 * Validadores para cada tipo de elemento
 */
const VALIDATORS = {
    [ELEMENT_TYPES.COVER]: (config) => {
        if (!config.title && !config.subtitle) {
            throw new Error('La portada debe tener al menos un título o subtítulo');
        }
    },

    [ELEMENT_TYPES.SECTION]: (config) => {
        if (!config.title) {
            throw new Error('La sección debe tener un título');
        }
        if (config.level < 1 || config.level > 6) {
            throw new Error('El nivel de sección debe estar entre 1 y 6');
        }
    },

    [ELEMENT_TYPES.PARAGRAPH]: (config) => {
        if (!config.text || typeof config.text !== 'string') {
            throw new Error('El párrafo debe tener texto válido');
        }
    },

    [ELEMENT_TYPES.TEXT]: (config) => {
        if (!config.text || typeof config.text !== 'string') {
            throw new Error('El elemento de texto debe tener contenido válido');
        }
    },

    [ELEMENT_TYPES.IMAGE]: (config) => {
        if (!config.src) {
            throw new Error('La imagen debe tener una fuente válida');
        }
    },

    [ELEMENT_TYPES.TABLE]: (config) => {
        if (!Array.isArray(config.headers) || config.headers.length === 0) {
            throw new Error('La tabla debe tener headers válidos');
        }
        if (!Array.isArray(config.data)) {
            throw new Error('La tabla debe tener datos válidos');
        }
    },

    [ELEMENT_TYPES.LIST]: (config) => {
        if (!Array.isArray(config.items) || config.items.length === 0) {
            throw new Error('La lista debe tener items válidos');
        }
    },

    [ELEMENT_TYPES.PAGE_BREAK]: () => {
        // Page break no necesita validación específica
    },

    [ELEMENT_TYPES.SPACER]: (config) => {
        if (config.height < 0) {
            throw new Error('La altura del spacer debe ser positiva');
        }
    }
};

/**
 * Procesadores que convierten la configuración a formato pdfmake
 */
const PROCESSORS = {
    [ELEMENT_TYPES.COVER]: (config) => {
        const coverContent = [];

        // Logo si está disponible
        if (config.logo) {
            coverContent.push({
                image: config.logo.src,
                width: config.logo.width || 150,
                alignment: config.logo.alignment || 'center',
                margin: [0, 0, 0, 40]
            });
        }

        // Título principal
        if (config.title) {
            coverContent.push({
                text: config.title,
                style: 'coverTitle',
                fontSize: 24,
                bold: true,
                alignment: config.alignment,
                margin: [0, 60, 0, 20]
            });
        }

        // Subtítulo
        if (config.subtitle) {
            coverContent.push({
                text: config.subtitle,
                style: 'coverSubtitle',
                fontSize: 16,
                alignment: config.alignment,
                margin: [0, 0, 0, 40]
            });
        }

        // Descripción
        if (config.description) {
            coverContent.push({
                text: config.description,
                style: 'coverDescription',
                fontSize: 12,
                alignment: config.alignment,
                margin: [0, 0, 0, 60]
            });
        }

        // Información adicional
        const docInfo = [];
        if (config.author) {
            docInfo.push(`Autor: ${config.author}`);
        }
        if (config.includeDate) {
            docInfo.push(`Fecha: ${new Date().toLocaleDateString('es-ES')}`);
        }

        if (docInfo.length > 0) {
            coverContent.push({
                stack: docInfo.map(info => ({
                    text: info,
                    fontSize: 11,
                    color: '#6b7280',
                    margin: [0, 2, 0, 2]
                })),
                alignment: config.alignment,
                margin: [0, 60, 0, 0]
            });
        }

        // Salto de página
        if (config.includePageBreak) {
            coverContent.push({ text: '', pageBreak: 'after' });
        }

        return coverContent;
    },

    [ELEMENT_TYPES.SECTION]: (config) => {
        const sectionContent = [];

        // Salto de página antes si se solicita
        if (config.pageBreakBefore) {
            sectionContent.push({ text: '', pageBreak: 'before' });
        }

        // Determinar estilo según el nivel
        let titleStyle = 'header';
        let fontSize = 18;

        switch (config.level) {
            case 1:
                titleStyle = 'header';
                fontSize = 18;
                break;
            case 2:
                titleStyle = 'subheader';
                fontSize = 16;
                break;
            case 3:
                titleStyle = 'subheader';
                fontSize = 14;
                break;
            default:
                titleStyle = 'subheader';
                fontSize = 12;
        }

        // Título de la sección
        sectionContent.push({
            text: config.title,
            style: config.style === 'auto' ? titleStyle : config.style,
            fontSize: fontSize,
            bold: true,
            alignment: config.alignment,
            margin: [0, config.level === 1 ? 20 : 10, 0, 10]
        });

        // Subtítulo si existe
        if (config.subtitle) {
            sectionContent.push({
                text: config.subtitle,
                style: 'subtitle',
                fontSize: fontSize - 2,
                alignment: config.alignment,
                margin: [0, 0, 0, 15]
            });
        }

        // Salto de página después si se solicita
        if (config.pageBreakAfter) {
            sectionContent.push({ text: '', pageBreak: 'after' });
        }

        return sectionContent;
    },

    [ELEMENT_TYPES.PARAGRAPH]: (config) => {
        return {
            text: config.text,
            style: config.style,
            alignment: config.alignment,
            margin: config.margin,
            indent: config.firstLineIndent ? 20 : 0
        };
    },

    [ELEMENT_TYPES.TEXT]: (config) => {
        return {
            text: config.text,
            style: config.style,
            alignment: config.alignment,
            fontSize: config.fontSize,
            bold: config.bold,
            italics: config.italics,
            color: config.color
        };
    },

    [ELEMENT_TYPES.IMAGE]: (config) => {
        const imageElement = {
            image: config.src,
            alignment: config.alignment
        };

        // Configurar dimensiones
        if (config.width !== 'auto') {
            imageElement.width = config.width;
        }
        if (config.height !== 'auto') {
            imageElement.height = config.height;
        }

        // Si hay caption, crear stack
        if (config.caption) {
            return {
                stack: [
                    imageElement,
                    {
                        text: config.caption,
                        style: config.captionStyle,
                        alignment: config.alignment,
                        margin: [0, 5, 0, 10]
                    }
                ],
                margin: [0, 10, 0, 10]
            };
        }

        return {
            ...imageElement,
            margin: [0, 10, 0, 10]
        };
    },

    [ELEMENT_TYPES.TABLE]: (config) => {
        const tableBody = [];

        // Headers
        if (config.headers.length > 0) {
            tableBody.push(
                config.headers.map(header => ({
                    text: header,
                    style: config.headerStyle,
                    bold: true
                }))
            );
        }

        // Datos
        config.data.forEach(row => {
            if (Array.isArray(row)) {
                tableBody.push(row.map(cell => ({ text: String(cell) })));
            } else {
                // Si es objeto, extraer valores según headers
                const rowData = config.headers.map(header => ({
                    text: String(row[header] || '')
                }));
                tableBody.push(rowData);
            }
        });

        const table = {
            table: {
                headerRows: config.headers.length > 0 ? 1 : 0,
                body: tableBody,
                widths: Array(config.headers.length).fill('*')
            },
            margin: [0, 10, 0, 10]
        };

        // Aplicar estilo alternativo de filas
        if (config.alternateRowColors) {
            table.layout = {
                fillColor: function (rowIndex) {
                    return (rowIndex % 2 === 0) ? '#f9fafb' : null;
                }
            };
        }

        // Caption si existe
        if (config.caption) {
            return {
                stack: [
                    table,
                    {
                        text: config.caption,
                        style: 'caption',
                        alignment: 'center',
                        margin: [0, 5, 0, 0]
                    }
                ]
            };
        }

        return table;
    },

    [ELEMENT_TYPES.LIST]: (config) => {
        const listItems = config.items.map((item, index) => {
            let marker = '';

            switch (config.type) {
                case 'numbered':
                    marker = `${index + 1}. `;
                    break;
                case 'bullet':
                    marker = '• ';
                    break;
                case 'custom':
                    marker = config.customMarker || '- ';
                    break;
            }

            return {
                text: [
                    { text: marker, bold: true },
                    { text: item }
                ],
                style: config.style,
                margin: [config.indent, config.spacing, 0, 0]
            };
        });

        return {
            stack: listItems,
            margin: [0, 10, 0, 10]
        };
    },

    [ELEMENT_TYPES.PAGE_BREAK]: () => {
        return { text: '', pageBreak: 'after' };
    },

    [ELEMENT_TYPES.SPACER]: (config) => {
        return {
            text: '',
            margin: [0, config.height, 0, 0]
        };
    }
};

/**
 * Crea un elemento PDF del tipo especificado
 * @param {string} type - Tipo de elemento
 * @param {Object} config - Configuración del elemento
 * @returns {Object} Elemento procesado para el builder
 */
export const createElement = (type, config = {}) => {
    if (!ELEMENT_TYPES[type.toUpperCase()]) {
        throw new Error(`Tipo de elemento no soportado: ${type}`);
    }

    const elementType = ELEMENT_TYPES[type.toUpperCase()];

    // Combinar configuración por defecto con la proporcionada
    const finalConfig = {
        ...DEFAULT_CONFIGS[elementType],
        ...config
    };

    // Validar configuración
    if (VALIDATORS[elementType]) {
        VALIDATORS[elementType](finalConfig);
    }

    // Procesar elemento
    const processedContent = PROCESSORS[elementType](finalConfig);

    return {
        type: elementType,
        config: finalConfig,
        content: processedContent,
        timestamp: Date.now()
    };
};

/**
 * Valida la configuración de un elemento
 * @param {Object} element - Elemento a validar
 * @throws {Error} Si la configuración es inválida
 */
export const validateElementConfig = (element) => {
    if (!element || typeof element !== 'object') {
        throw new Error('El elemento debe ser un objeto válido');
    }

    if (!element.type) {
        throw new Error('El elemento debe tener un tipo definido');
    }

    if (!ELEMENT_TYPES[element.type.toUpperCase()]) {
        throw new Error(`Tipo de elemento no soportado: ${element.type}`);
    }

    const elementType = ELEMENT_TYPES[element.type.toUpperCase()];

    if (element.config && VALIDATORS[elementType]) {
        VALIDATORS[elementType](element.config);
    }
};

/**
 * Obtiene la configuración por defecto para un tipo de elemento
 * @param {string} type - Tipo de elemento
 * @returns {Object} Configuración por defecto
 */
export const getDefaultConfig = (type) => {
    const elementType = ELEMENT_TYPES[type.toUpperCase()];
    return elementType ? { ...DEFAULT_CONFIGS[elementType] } : {};
};

/**
 * Obtiene todos los tipos de elementos soportados
 * @returns {Array} Lista de tipos soportados
 */
export const getSupportedTypes = () => {
    return Object.values(ELEMENT_TYPES);
};

export default {
    createElement,
    validateElementConfig,
    getDefaultConfig,
    getSupportedTypes,
    ELEMENT_TYPES
};