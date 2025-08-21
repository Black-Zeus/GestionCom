/**
 * PDF Table of Contents Generator - Sistema automático de tabla de contenidos
 * Genera índices basados en secciones con numeración de páginas automática
 */

/**
 * Configuración por defecto para TOC
 */
const DEFAULT_TOC_CONFIG = {
    title: 'Índice de Contenidos',
    maxLevel: 3,
    includePageNumbers: true,
    pageBreakAfter: true,
    pageBreakBefore: false,
    startFromPage: 2,
    dotLeader: true,
    indentSize: 20,
    numbering: 'decimal', // 'decimal', 'roman', 'alpha', 'none'
    styles: {
        title: 'tocTitle',
        level1: 'tocLevel1',
        level2: 'tocLevel2',
        level3: 'tocLevel3',
        level4: 'tocLevel4',
        level5: 'tocLevel5',
        level6: 'tocLevel6',
        pageNumber: 'tocPageNumber'
    }
};

/**
 * Estilos por defecto para TOC
 */
export const TOC_STYLES = {
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
 * Estilos corporativos para TOC
 */
export const CORPORATE_TOC_STYLES = {
    tocTitle: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 25],
        color: '#2563eb'
    },
    tocLevel1: {
        fontSize: 13,
        bold: true,
        margin: [0, 10, 0, 5],
        color: '#1f2937'
    },
    tocLevel2: {
        fontSize: 12,
        margin: [25, 8, 0, 4],
        color: '#374151'
    },
    tocLevel3: {
        fontSize: 11,
        margin: [45, 6, 0, 3],
        color: '#6b7280'
    },
    tocLevel4: {
        fontSize: 10,
        margin: [65, 5, 0, 3],
        color: '#6b7280'
    },
    tocLevel5: {
        fontSize: 10,
        margin: [85, 4, 0, 2],
        color: '#9ca3af'
    },
    tocLevel6: {
        fontSize: 9,
        margin: [105, 4, 0, 2],
        color: '#9ca3af'
    }
};

/**
 * Clase para gestionar tabla de contenidos
 */
export class TOCManager {
    constructor(options = {}) {
        this.config = { ...DEFAULT_TOC_CONFIG, ...options };
        this.sections = [];
        this.pageTracker = new Map();
        this.currentPage = this.config.startFromPage;
        this.tocGenerated = false;
    }

    /**
     * Registra una nueva sección en el TOC
     * @param {Object} sectionInfo - Información de la sección
     */
    addSection(sectionInfo) {
        const {
            title,
            level = 1,
            pageNumber = this.currentPage,
            id = null,
            subtitle = null
        } = sectionInfo;

        if (!title) {
            throw new Error('TOC: Título de sección requerido');
        }

        if (level < 1 || level > 6) {
            throw new Error('TOC: Nivel de sección debe estar entre 1 y 6');
        }

        if (level <= this.config.maxLevel) {
            const section = {
                id: id || `section_${this.sections.length + 1}`,
                title: title.toString(),
                subtitle,
                level,
                pageNumber,
                timestamp: Date.now()
            };

            this.sections.push(section);
            this.pageTracker.set(section.id, pageNumber);
        }
    }

    /**
     * Actualiza el número de página de una sección
     * @param {string} sectionId - ID de la sección
     * @param {number} pageNumber - Nuevo número de página
     */
    updateSectionPage(sectionId, pageNumber) {
        const section = this.sections.find(s => s.id === sectionId);
        if (section) {
            section.pageNumber = pageNumber;
            this.pageTracker.set(sectionId, pageNumber);
        }
    }

    /**
     * Incrementa el contador de página actual
     * @param {number} increment - Cantidad a incrementar (default: 1)
     */
    incrementPage(increment = 1) {
        this.currentPage += increment;
    }

    /**
     * Establece la página actual
     * @param {number} pageNumber - Número de página
     */
    setCurrentPage(pageNumber) {
        this.currentPage = pageNumber;
    }

    /**
     * Genera la estructura de TOC para pdfmake
     * @param {Object} customConfig - Configuración personalizada
     * @returns {Array} Estructura del TOC para pdfmake
     */
    generateTOC(customConfig = {}) {
        const config = { ...this.config, ...customConfig };
        const tocContent = [];

        // Título del TOC
        if (config.title) {
            tocContent.push({
                text: config.title,
                style: config.styles.title,
                margin: [0, 0, 0, 20]
            });
        }

        // Generar entradas del TOC
        if (this.sections.length === 0) {
            tocContent.push({
                text: 'No hay secciones disponibles',
                style: 'noData',
                italics: true,
                margin: [0, 10, 0, 10]
            });
        } else {
            const tocEntries = this._generateTOCEntries(config);
            tocContent.push(...tocEntries);
        }

        // Aplicar saltos de página
        const finalContent = [];

        if (config.pageBreakBefore) {
            finalContent.push({ text: '', pageBreak: 'before' });
        }

        finalContent.push(...tocContent);

        if (config.pageBreakAfter) {
            finalContent.push({ text: '', pageBreak: 'after' });
        }

        this.tocGenerated = true;
        return finalContent;
    }

    /**
     * Genera las entradas individuales del TOC
     * @private
     */
    _generateTOCEntries(config) {
        const entries = [];

        this.sections.forEach((section, index) => {
            if (section.level > config.maxLevel) {
                return;
            }

            const entry = this._createTOCEntry(section, config, index);
            entries.push(entry);
        });

        return entries;
    }

    /**
     * Crea una entrada individual del TOC
     * @private
     */
    _createTOCEntry(section, config, index) {
        const styleKey = `level${section.level}`;
        const style = config.styles[styleKey] || config.styles.level1;

        // Generar numeración si está habilitada
        let numberingPrefix = '';
        if (config.numbering !== 'none') {
            numberingPrefix = this._generateNumbering(section, config.numbering, index) + ' ';
        }

        // Crear el contenido de la entrada
        const entryContent = [];

        if (config.includePageNumbers && config.dotLeader) {
            // Entrada con línea de puntos
            entryContent.push({
                columns: [
                    {
                        width: '*',
                        text: numberingPrefix + section.title,
                        style: style
                    },
                    {
                        width: 'auto',
                        text: this._generateDotLeader(section.title, section.pageNumber),
                        style: config.styles.pageNumber,
                        alignment: 'right'
                    },
                    {
                        width: 'auto',
                        text: section.pageNumber.toString(),
                        style: config.styles.pageNumber,
                        alignment: 'right',
                        margin: [5, 0, 0, 0]
                    }
                ],
                margin: this._calculateMargin(section.level, config.indentSize)
            });
        } else if (config.includePageNumbers) {
            // Entrada sin línea de puntos
            entryContent.push({
                columns: [
                    {
                        width: '*',
                        text: numberingPrefix + section.title,
                        style: style
                    },
                    {
                        width: 'auto',
                        text: section.pageNumber.toString(),
                        style: config.styles.pageNumber,
                        alignment: 'right'
                    }
                ],
                margin: this._calculateMargin(section.level, config.indentSize)
            });
        } else {
            // Solo título, sin número de página
            entryContent.push({
                text: numberingPrefix + section.title,
                style: style,
                margin: this._calculateMargin(section.level, config.indentSize)
            });
        }

        // Agregar subtítulo si existe
        if (section.subtitle) {
            entryContent.push({
                text: section.subtitle,
                fontSize: (style.fontSize || 10) - 1,
                italics: true,
                color: '#9ca3af',
                margin: [
                    config.indentSize * section.level + 10,
                    2,
                    0,
                    4
                ]
            });
        }

        return entryContent;
    }

    /**
     * Genera numeración según el tipo especificado
     * @private
     */
    _generateNumbering(section, numberingType, index) {
        const sectionNumber = index + 1;

        switch (numberingType) {
            case 'decimal':
                return sectionNumber.toString();
            case 'roman':
                return this._toRoman(sectionNumber).toLowerCase();
            case 'alpha':
                return String.fromCharCode(96 + sectionNumber); // a, b, c...
            case 'ALPHA':
                return String.fromCharCode(64 + sectionNumber); // A, B, C...
            case 'ROMAN':
                return this._toRoman(sectionNumber);
            default:
                return sectionNumber.toString();
        }
    }

    /**
     * Convierte número a romano
     * @private
     */
    _toRoman(num) {
        const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
        const symbols = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];

        let result = '';
        for (let i = 0; i < values.length; i++) {
            while (num >= values[i]) {
                result += symbols[i];
                num -= values[i];
            }
        }
        return result;
    }

    /**
     * Genera línea de puntos entre título y número de página
     * @private
     */
    _generateDotLeader(title, pageNumber) {
        const maxLength = 50; // Longitud máxima aproximada
        const titleLength = title.length;
        const pageNumberLength = pageNumber.toString().length;
        const dotsNeeded = Math.max(3, maxLength - titleLength - pageNumberLength);

        return '.'.repeat(Math.min(dotsNeeded, 30));
    }

    /**
     * Calcula margen según el nivel de sección
     * @private
     */
    _calculateMargin(level, indentSize) {
        const leftMargin = (level - 1) * indentSize;
        return [leftMargin, 3, 0, 2];
    }

    /**
     * Obtiene estadísticas del TOC
     * @returns {Object} Estadísticas
     */
    getStats() {
        const levelCounts = {};
        this.sections.forEach(section => {
            levelCounts[section.level] = (levelCounts[section.level] || 0) + 1;
        });

        return {
            totalSections: this.sections.length,
            levelCounts,
            maxLevel: Math.max(...this.sections.map(s => s.level), 0),
            minLevel: Math.min(...this.sections.map(s => s.level), 0),
            currentPage: this.currentPage,
            tocGenerated: this.tocGenerated,
            config: this.config
        };
    }

    /**
     * Exporta las secciones para depuración
     * @returns {Array} Lista de secciones
     */
    getSections() {
        return [...this.sections];
    }

    /**
     * Limpia todas las secciones
     */
    clear() {
        this.sections = [];
        this.pageTracker.clear();
        this.currentPage = this.config.startFromPage;
        this.tocGenerated = false;
    }

    /**
     * Valida la configuración del TOC
     * @param {Object} config - Configuración a validar
     * @returns {Object} Resultado de validación
     */
    static validateConfig(config) {
        const errors = [];
        const warnings = [];

        if (config.maxLevel && (config.maxLevel < 1 || config.maxLevel > 6)) {
            errors.push('maxLevel debe estar entre 1 y 6');
        }

        if (config.startFromPage && config.startFromPage < 1) {
            errors.push('startFromPage debe ser mayor a 0');
        }

        if (config.indentSize && config.indentSize < 0) {
            errors.push('indentSize debe ser positivo');
        }

        if (config.numbering && !['decimal', 'roman', 'alpha', 'ALPHA', 'ROMAN', 'none'].includes(config.numbering)) {
            warnings.push('Tipo de numeración no reconocido, se usará decimal');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
}

/**
 * Crea elemento de TOC para el builder
 * @param {Object} tocConfig - Configuración del TOC
 * @param {Array} sections - Secciones disponibles (opcional)
 * @returns {Object} Elemento de TOC procesado
 */
export const createTOCElement = (tocConfig = {}, sections = []) => {
    const tocManager = new TOCManager(tocConfig);

    // Agregar secciones si se proporcionan
    sections.forEach(section => {
        tocManager.addSection(section);
    });

    return {
        type: 'toc',
        config: tocConfig,
        content: tocManager.generateTOC(),
        manager: tocManager,
        timestamp: Date.now()
    };
};

/**
 * Extrae secciones automáticamente del contenido del builder
 * @param {Array} builderContent - Contenido del builder
 * @returns {Array} Array de secciones encontradas
 */
export const extractSectionsFromContent = (builderContent) => {
    if (!Array.isArray(builderContent)) {
        return [];
    }

    const sections = [];
    let currentPage = 2; // Asumiendo que TOC va en página 1

    builderContent.forEach((element, index) => {
        if (element.type === 'section' && element.config) {
            sections.push({
                id: `section_${index}`,
                title: element.config.title,
                subtitle: element.config.subtitle,
                level: element.config.level || 1,
                pageNumber: currentPage
            });
        }

        // Incrementar página en ciertos elementos
        if (element.type === 'pageBreak' ||
            (element.config && (element.config.pageBreakAfter || element.config.pageBreakBefore))) {
            currentPage++;
        }
    });

    return sections;
};

/**
 * Utilidades para TOC
 */
export const TOCUtils = {
    /**
     * Crea configuración de TOC responsiva según el contenido
     */
    createResponsiveTOCConfig(sectionsCount, pageCount) {
        const config = { ...DEFAULT_TOC_CONFIG };

        // Ajustar según cantidad de secciones
        if (sectionsCount > 20) {
            config.maxLevel = 2; // Limitar niveles para muchas secciones
            config.dotLeader = false; // Simplificar para mejor legibilidad
        } else if (sectionsCount > 10) {
            config.maxLevel = 3;
        }

        // Ajustar según cantidad de páginas
        if (pageCount > 50) {
            config.includePageNumbers = true;
            config.dotLeader = true;
        }

        return config;
    },

    /**
     * Estima páginas del TOC según el contenido
     */
    estimateTOCPages(sectionsCount, maxLevel = 3) {
        const entriesPerPage = 25; // Estimación
        const filteredSections = sectionsCount; // Simplificado
        return Math.ceil(filteredSections / entriesPerPage);
    },

    /**
     * Valida estructura de secciones
     */
    validateSectionsStructure(sections) {
        const errors = [];
        const warnings = [];

        if (!Array.isArray(sections)) {
            errors.push('Secciones debe ser un array');
            return { valid: false, errors, warnings };
        }

        sections.forEach((section, index) => {
            if (!section.title) {
                errors.push(`Sección ${index + 1}: título requerido`);
            }

            if (section.level && (section.level < 1 || section.level > 6)) {
                errors.push(`Sección ${index + 1}: nivel debe estar entre 1 y 6`);
            }

            if (section.pageNumber && section.pageNumber < 1) {
                errors.push(`Sección ${index + 1}: número de página debe ser positivo`);
            }
        });

        // Verificar jerarquía lógica
        for (let i = 1; i < sections.length; i++) {
            const current = sections[i];
            const previous = sections[i - 1];

            if (current.level && previous.level && current.level > previous.level + 1) {
                warnings.push(`Sección "${current.title}": salto de nivel detectado (de ${previous.level} a ${current.level})`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
};

export default {
    TOCManager,
    createTOCElement,
    extractSectionsFromContent,
    TOCUtils,
    TOC_STYLES,
    CORPORATE_TOC_STYLES,
    DEFAULT_TOC_CONFIG
};