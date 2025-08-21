/**
 * PDF Elements Factory - Creación y validación de elementos para documentos PDF
 * Contiene la lógica para crear y validar todos los tipos de elementos
 * ACTUALIZADO: Soporte para Fase 3 (footnotes/notas al pie)
 */

import { baseStyles } from '../pdf-common.js';
import { FootnoteManager, createFootnoteElement, FOOTNOTE_NUMBERING } from './pdf-footnotes.js';

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
    SPACER: 'spacer',
    // FASE 3: Nuevo tipo de elemento
    FOOTNOTE: 'footnote'
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
    },
    // FASE 3: Configuración por defecto para footnotes
    [ELEMENT_TYPES.FOOTNOTE]: {
        text: '',
        numbering: FOOTNOTE_NUMBERING.SEQUENTIAL,
        position: 'bottom',
        autoReference: true,        // Genera referencia automáticamente
        linkToNote: true,          // Hace la referencia clickeable
        style: 'footnote',         // Estilo del texto de la nota
        referenceStyle: 'footnoteRef' // Estilo de la referencia
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
            throw new Error('La lista debe tener elementos válidos');
        }
    },

    // FASE 3: Validador para footnotes
    [ELEMENT_TYPES.FOOTNOTE]: (config) => {
        if (!config.text || typeof config.text !== 'string') {
            throw new Error('La nota al pie debe tener texto válido');
        }
        if (config.text.length > 500) {
            console.warn('FootnoteValidator: La nota es muy larga (>500 caracteres)');
        }
        if (!Object.values(FOOTNOTE_NUMBERING).includes(config.numbering)) {
            throw new Error(`Tipo de numeración inválido: ${config.numbering}`);
        }
    }
};

/**
 * Procesadores que convierten configuración en elementos para pdfmake
 */
const PROCESSORS = {
    [ELEMENT_TYPES.COVER]: (config) => {
        const coverContent = [];

        // Título principal
        if (config.title) {
            coverContent.push({
                text: config.title,
                style: 'coverTitle',
                alignment: config.alignment,
                margin: [0, 60, 0, 20]
            });
        }

        // Subtítulo
        if (config.subtitle) {
            coverContent.push({
                text: config.subtitle,
                style: 'coverSubtitle',
                alignment: config.alignment,
                margin: [0, 0, 0, 20]
            });
        }

        // Descripción
        if (config.description) {
            coverContent.push({
                text: config.description,
                style: 'coverDescription',
                alignment: config.alignment,
                margin: [0, 0, 0, 40]
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
                    return (rowIndex % 2 === 0) ? null : '#f8f9fa';
                }
            };
        }

        // Caption de tabla
        if (config.caption) {
            return {
                stack: [
                    table,
                    {
                        text: config.caption,
                        style: 'caption',
                        alignment: 'center',
                        margin: [0, 5, 0, 15]
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
    },

    // FASE 3: Procesador para footnotes
    [ELEMENT_TYPES.FOOTNOTE]: (config) => {
        // El procesamiento real de footnotes se hace en el FootnoteManager
        // Aquí solo creamos la estructura base del elemento
        return {
            footnoteElement: true,
            text: config.text,
            numbering: config.numbering,
            position: config.position,
            autoReference: config.autoReference,
            linkToNote: config.linkToNote,
            style: config.style,
            referenceStyle: config.referenceStyle,
            timestamp: Date.now()
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

/**
 * FASE 3: Factory específico para crear elementos de footnote
 * @param {string} text - Texto de la nota
 * @param {Object} options - Opciones de configuración
 * @returns {Object} Elemento footnote configurado
 */
export const createFootnoteElementForBuilder = (text, options = {}) => {
    return createElement(ELEMENT_TYPES.FOOTNOTE, {
        text,
        ...options
    });
};

/**
 * FASE 3: Utilidades para trabajar con footnotes en el contexto del builder
 */
export const FootnoteElementUtils = {
    /**
     * Verifica si un elemento es una footnote
     * @param {Object} element - Elemento a verificar
     * @returns {boolean} Es footnote
     */
    isFootnoteElement(element) {
        return element && element.type === ELEMENT_TYPES.FOOTNOTE;
    },

    /**
     * Extrae el texto de una footnote
     * @param {Object} element - Elemento footnote
     * @returns {string} Texto de la nota
     */
    getFootnoteText(element) {
        if (!this.isFootnoteElement(element)) {
            throw new Error('El elemento no es una footnote válida');
        }
        return element.config?.text || element.content?.text || '';
    },

    /**
     * Obtiene la configuración de numeración de una footnote
     * @param {Object} element - Elemento footnote
     * @returns {string} Tipo de numeración
     */
    getNumberingType(element) {
        if (!this.isFootnoteElement(element)) {
            throw new Error('El elemento no es una footnote válida');
        }
        return element.config?.numbering || FOOTNOTE_NUMBERING.SEQUENTIAL;
    },

    /**
     * Valida que una footnote tenga la estructura correcta
     * @param {Object} element - Elemento a validar
     * @returns {Object} Resultado de validación
     */
    validateFootnoteElement(element) {
        const errors = [];
        const warnings = [];

        if (!element) {
            errors.push('Elemento footnote es null o undefined');
            return { isValid: false, errors, warnings };
        }

        if (!this.isFootnoteElement(element)) {
            errors.push('El elemento no es del tipo footnote');
            return { isValid: false, errors, warnings };
        }

        const text = this.getFootnoteText(element);
        if (!text || text.trim().length === 0) {
            errors.push('La footnote debe tener texto válido');
        }

        if (text.length > 500) {
            warnings.push('El texto de la footnote es muy largo (>500 caracteres)');
        }

        const numbering = this.getNumberingType(element);
        if (!Object.values(FOOTNOTE_NUMBERING).includes(numbering)) {
            errors.push(`Tipo de numeración inválido: ${numbering}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
};

export default {
    createElement,
    validateElementConfig,
    getDefaultConfig,
    getSupportedTypes,
    ELEMENT_TYPES,
    // FASE 3: Nuevas exportaciones
    createFootnoteElementForBuilder,
    FootnoteElementUtils
};