/**
 * Sistema de Notas al Pie para PDF Builder API - Fase 3
 * Maneja referencias numeradas automáticas y posicionamiento
 * Soporte para numeración secuencial o por página
 */

/**
 * Tipos de numeración para notas al pie
 */
export const FOOTNOTE_NUMBERING = {
    SEQUENTIAL: 'sequential',      // 1, 2, 3, 4... (continúa en todo el documento)
    PER_PAGE: 'per-page',         // 1, 2, 3 en página 1; 1, 2, 3 en página 2
    ROMAN: 'roman',               // i, ii, iii, iv...
    LETTERS: 'letters',           // a, b, c, d...
    SYMBOLS: 'symbols'            // *, †, ‡, §...
};

/**
 * Símbolos para numeración simbólica
 */
const FOOTNOTE_SYMBOLS = ['*', '†', '‡', '§', '¶', '#', '**', '††', '‡‡'];

/**
 * Configuración por defecto para notas al pie
 */
export const DEFAULT_FOOTNOTE_CONFIG = {
    numbering: FOOTNOTE_NUMBERING.SEQUENTIAL,
    resetOnPage: false,
    position: 'bottom',           // 'bottom', 'end-of-section'
    separator: true,              // Línea separadora antes de las notas
    separatorStyle: {
        margin: [0, 10, 0, 5],
        canvas: [
            {
                type: 'line',
                x1: 0, y1: 0,
                x2: 100, y2: 0,
                lineWidth: 0.5,
                lineColor: '#cccccc'
            }
        ]
    },
    referenceStyle: {
        fontSize: 8,
        sup: true,                // Superíndice
        color: '#2563eb',
        link: true               // Hacer clickeable la referencia
    },
    textStyle: {
        fontSize: 9,
        lineHeight: 1.2,
        margin: [0, 2, 0, 2],
        color: '#374151'
    },
    maxPerPage: 10,              // Máximo de notas por página
    autoWrap: true               // Envolver automáticamente texto largo
};

/**
 * Clase principal para gestión de notas al pie
 */
export class FootnoteManager {
    constructor(config = {}) {
        this.config = { ...DEFAULT_FOOTNOTE_CONFIG, ...config };
        this.footnotes = new Map();          // Map de notas: id -> nota
        this.pageFootnotes = new Map();     // Map de páginas: pageNumber -> [footnoteIds]
        this.currentPage = 1;
        this.globalCounter = 0;              // Contador global para numeración secuencial
        this.pageCounters = new Map();       // Contadores por página
        this.footnotesGenerated = false;
        this.lastFootnoteId = null;
    }

    /**
     * Agrega una nueva nota al pie
     * @param {string} text - Texto de la nota
     * @param {Object} options - Opciones específicas de la nota
     * @returns {Object} Información de la referencia creada
     */
    addFootnote(text, options = {}) {
        if (!text || typeof text !== 'string') {
            throw new Error('FootnoteManager: El texto de la nota es requerido');
        }

        // Generar ID único para la nota
        const footnoteId = `footnote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Configuración específica de la nota
        const noteConfig = {
            ...this.config,
            ...options,
            id: footnoteId,
            text: text.trim(),
            pageNumber: this.currentPage,
            createdAt: Date.now()
        };

        // Calcular número de referencia
        const referenceNumber = this._calculateReferenceNumber(noteConfig);

        // Crear objeto de nota
        const footnote = {
            id: footnoteId,
            text: noteConfig.text,
            pageNumber: this.currentPage,
            referenceNumber,
            referenceText: this._formatReferenceText(referenceNumber, noteConfig.numbering),
            config: noteConfig,
            processed: false
        };

        // Agregar al registro
        this.footnotes.set(footnoteId, footnote);
        this._addToPageRegistry(this.currentPage, footnoteId);

        // Actualizar contadores
        this.globalCounter++;
        this._updatePageCounter(this.currentPage);

        this.lastFootnoteId = footnoteId;

        return {
            id: footnoteId,
            referenceNumber,
            referenceText: footnote.referenceText,
            pageNumber: this.currentPage
        };
    }

    /**
     * Genera la referencia en línea para insertar en el texto
     * @param {string} footnoteId - ID de la nota
     * @returns {Object} Elemento de referencia para pdfmake
     */
    generateInlineReference(footnoteId) {
        const footnote = this.footnotes.get(footnoteId);
        if (!footnote) {
            throw new Error(`FootnoteManager: Nota no encontrada: ${footnoteId}`);
        }

        const refStyle = { ...this.config.referenceStyle, ...footnote.config.referenceStyle };

        return {
            text: footnote.referenceText,
            fontSize: refStyle.fontSize,
            sup: refStyle.sup,
            color: refStyle.color,
            link: refStyle.link ? `#${footnoteId}` : undefined,
            footnoteId: footnoteId,
            footnoteRef: true
        };
    }

    /**
     * Genera todas las notas al pie para una página específica
     * @param {number} pageNumber - Número de página
     * @returns {Array} Array de elementos de notas para pdfmake
     */
    generatePageFootnotes(pageNumber) {
        const pageFootnoteIds = this.pageFootnotes.get(pageNumber) || [];

        if (pageFootnoteIds.length === 0) {
            return [];
        }

        const footnoteElements = [];

        // Agregar separador si está configurado
        if (this.config.separator && pageFootnoteIds.length > 0) {
            footnoteElements.push(this.config.separatorStyle);
        }

        // Generar cada nota
        pageFootnoteIds.forEach(footnoteId => {
            const footnote = this.footnotes.get(footnoteId);
            if (footnote && !footnote.processed) {
                const noteElement = this._createFootnoteElement(footnote);
                footnoteElements.push(noteElement);
                footnote.processed = true;
            }
        });

        return footnoteElements;
    }

    /**
     * Genera todas las notas al pie del documento (para posición 'end-of-document')
     * @returns {Array} Array de todas las notas
     */
    generateAllFootnotes() {
        const allFootnotes = [];
        const sortedFootnotes = Array.from(this.footnotes.values())
            .sort((a, b) => a.createdAt - b.createdAt);

        if (sortedFootnotes.length === 0) {
            return [];
        }

        // Título de sección de notas
        allFootnotes.push({
            text: 'Notas',
            style: 'sectionLevel2',
            margin: [0, 20, 0, 10],
            pageBreak: 'before'
        });

        // Separador
        if (this.config.separator) {
            allFootnotes.push(this.config.separatorStyle);
        }

        // Generar todas las notas
        sortedFootnotes.forEach(footnote => {
            const noteElement = this._createFootnoteElement(footnote);
            allFootnotes.push(noteElement);
        });

        return allFootnotes;
    }

    /**
     * Establece la página actual
     * @param {number} pageNumber - Número de página actual
     */
    setCurrentPage(pageNumber) {
        if (typeof pageNumber !== 'number' || pageNumber < 1) {
            throw new Error('FootnoteManager: Número de página inválido');
        }
        this.currentPage = pageNumber;
    }

    /**
     * Obtiene estadísticas del sistema de notas
     * @returns {Object} Estadísticas de uso
     */
    getStats() {
        const pageStats = {};
        this.pageFootnotes.forEach((footnoteIds, pageNumber) => {
            pageStats[pageNumber] = footnoteIds.length;
        });

        return {
            totalFootnotes: this.footnotes.size,
            pagesWithFootnotes: this.pageFootnotes.size,
            globalCounter: this.globalCounter,
            pageDistribution: pageStats,
            config: this.config,
            lastFootnoteId: this.lastFootnoteId
        };
    }

    /**
     * Valida la configuración de notas
     * @returns {Object} Resultado de validación
     */
    validateConfiguration() {
        const errors = [];
        const warnings = [];

        // Validar tipo de numeración
        if (!Object.values(FOOTNOTE_NUMBERING).includes(this.config.numbering)) {
            errors.push(`Tipo de numeración inválido: ${this.config.numbering}`);
        }

        // Validar máximo por página
        if (this.config.maxPerPage < 1 || this.config.maxPerPage > 20) {
            warnings.push(`Máximo por página fuera del rango recomendado (1-20): ${this.config.maxPerPage}`);
        }

        // Validar posición
        if (!['bottom', 'end-of-section', 'end-of-document'].includes(this.config.position)) {
            errors.push(`Posición inválida: ${this.config.position}`);
        }

        // Validar páginas sobrecargadas
        this.pageFootnotes.forEach((footnoteIds, pageNumber) => {
            if (footnoteIds.length > this.config.maxPerPage) {
                warnings.push(`Página ${pageNumber} excede el máximo de notas: ${footnoteIds.length}/${this.config.maxPerPage}`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            stats: this.getStats()
        };
    }

    /**
     * Limpia todas las notas (útil para testing)
     */
    reset() {
        this.footnotes.clear();
        this.pageFootnotes.clear();
        this.pageCounters.clear();
        this.globalCounter = 0;
        this.currentPage = 1;
        this.footnotesGenerated = false;
        this.lastFootnoteId = null;
    }

    // ================================================
    // MÉTODOS PRIVADOS
    // ================================================

    /**
     * Calcula el número de referencia según el tipo de numeración
     * @private
     */
    _calculateReferenceNumber(config) {
        switch (config.numbering) {
            case FOOTNOTE_NUMBERING.SEQUENTIAL:
                return this.globalCounter + 1;

            case FOOTNOTE_NUMBERING.PER_PAGE:
                const pageCount = this.pageCounters.get(this.currentPage) || 0;
                return pageCount + 1;

            case FOOTNOTE_NUMBERING.ROMAN:
                return this._toRoman(this.globalCounter + 1);

            case FOOTNOTE_NUMBERING.LETTERS:
                return this._toLetter(this.globalCounter + 1);

            case FOOTNOTE_NUMBERING.SYMBOLS:
                const symbolIndex = (this.globalCounter) % FOOTNOTE_SYMBOLS.length;
                const repetitions = Math.floor(this.globalCounter / FOOTNOTE_SYMBOLS.length) + 1;
                return FOOTNOTE_SYMBOLS[symbolIndex].repeat(repetitions);

            default:
                return this.globalCounter + 1;
        }
    }

    /**
     * Formatea el texto de referencia
     * @private
     */
    _formatReferenceText(number, numbering) {
        switch (numbering) {
            case FOOTNOTE_NUMBERING.ROMAN:
            case FOOTNOTE_NUMBERING.LETTERS:
            case FOOTNOTE_NUMBERING.SYMBOLS:
                return number.toString();
            default:
                return number.toString();
        }
    }

    /**
     * Agrega una nota al registro de página
     * @private
     */
    _addToPageRegistry(pageNumber, footnoteId) {
        if (!this.pageFootnotes.has(pageNumber)) {
            this.pageFootnotes.set(pageNumber, []);
        }
        this.pageFootnotes.get(pageNumber).push(footnoteId);
    }

    /**
     * Actualiza el contador de página
     * @private
     */
    _updatePageCounter(pageNumber) {
        const current = this.pageCounters.get(pageNumber) || 0;
        this.pageCounters.set(pageNumber, current + 1);
    }

    /**
     * Crea el elemento de nota para pdfmake
     * @private
     */
    _createFootnoteElement(footnote) {
        const textStyle = { ...this.config.textStyle, ...footnote.config.textStyle };

        return {
            id: footnote.id,
            columns: [
                {
                    width: 15,
                    text: footnote.referenceText,
                    fontSize: textStyle.fontSize,
                    color: textStyle.color,
                    alignment: 'right',
                    margin: [0, 0, 5, 0]
                },
                {
                    width: '*',
                    text: footnote.text,
                    fontSize: textStyle.fontSize,
                    lineHeight: textStyle.lineHeight,
                    color: textStyle.color,
                    margin: textStyle.margin,
                    alignment: 'justify'
                }
            ],
            margin: [0, 2, 0, 2]
        };
    }

    /**
     * Convierte número a romano
     * @private
     */
    _toRoman(num) {
        const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
        const literals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];

        let result = '';
        for (let i = 0; i < values.length; i++) {
            while (num >= values[i]) {
                result += literals[i];
                num -= values[i];
            }
        }
        return result.toLowerCase();
    }

    /**
     * Convierte número a letra
     * @private
     */
    _toLetter(num) {
        let result = '';
        while (num > 0) {
            num--;
            result = String.fromCharCode(97 + (num % 26)) + result;
            num = Math.floor(num / 26);
        }
        return result;
    }
}

/**
 * Factory para crear elementos de nota al pie
 * @param {string} text - Texto de la nota
 * @param {Object} options - Opciones de configuración
 * @returns {Object} Configuración de elemento footnote
 */
export const createFootnoteElement = (text, options = {}) => {
    if (!text || typeof text !== 'string') {
        throw new Error('createFootnoteElement: Texto de nota requerido');
    }

    return {
        type: 'footnote',
        text: text.trim(),
        options: {
            ...DEFAULT_FOOTNOTE_CONFIG,
            ...options
        },
        timestamp: Date.now()
    };
};

/**
 * Utilidades para trabajar con notas al pie
 */
export const FootnoteUtils = {
    /**
     * Extrae referencias de notas de un texto
     * @param {string} text - Texto a analizar
     * @returns {Array} Array de referencias encontradas
     */
    extractReferences(text) {
        // Buscar patrones como [1], *, †, etc.
        const patterns = [
            /\[(\d+)\]/g,           // [1], [2], etc.
            /\*+/g,                 // *, **, etc.
            /[†‡§¶#]+/g            // símbolos especiales
        ];

        const references = [];
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                references.push({
                    text: match[0],
                    position: match.index,
                    type: 'detected'
                });
            }
        });

        return references;
    },

    /**
     * Limpia texto removiendo referencias de notas
     * @param {string} text - Texto original
     * @returns {string} Texto limpio
     */
    cleanText(text) {
        return text
            .replace(/\[\d+\]/g, '')          // Remover [1], [2], etc.
            .replace(/\*+/g, '')              // Remover asteriscos
            .replace(/[†‡§¶#]+/g, '')        // Remover símbolos
            .replace(/\s+/g, ' ')             // Normalizar espacios
            .trim();
    },

    /**
     * Valida formato de referencia
     * @param {string} reference - Referencia a validar
     * @param {string} type - Tipo de numeración
     * @returns {boolean} Es válida la referencia
     */
    validateReference(reference, type) {
        switch (type) {
            case FOOTNOTE_NUMBERING.SEQUENTIAL:
            case FOOTNOTE_NUMBERING.PER_PAGE:
                return /^\d+$/.test(reference);
            case FOOTNOTE_NUMBERING.ROMAN:
                return /^[ivxlcdm]+$/i.test(reference);
            case FOOTNOTE_NUMBERING.LETTERS:
                return /^[a-z]+$/i.test(reference);
            case FOOTNOTE_NUMBERING.SYMBOLS:
                return /^[\*†‡§¶#]+$/.test(reference);
            default:
                return false;
        }
    }
};

/**
 * Configuraciones predefinidas para diferentes estilos
 */
export const FOOTNOTE_PRESETS = {
    academic: {
        numbering: FOOTNOTE_NUMBERING.SEQUENTIAL,
        position: 'bottom',
        separator: true,
        referenceStyle: {
            fontSize: 8,
            sup: true,
            color: '#000000'
        },
        textStyle: {
            fontSize: 9,
            lineHeight: 1.2,
            color: '#000000'
        }
    },

    corporate: {
        numbering: FOOTNOTE_NUMBERING.PER_PAGE,
        position: 'bottom',
        separator: true,
        referenceStyle: {
            fontSize: 8,
            sup: true,
            color: '#2563eb'
        },
        textStyle: {
            fontSize: 9,
            lineHeight: 1.3,
            color: '#374151'
        }
    },

    minimal: {
        numbering: FOOTNOTE_NUMBERING.SYMBOLS,
        position: 'bottom',
        separator: false,
        maxPerPage: 5,
        referenceStyle: {
            fontSize: 8,
            sup: true,
            color: '#6b7280'
        },
        textStyle: {
            fontSize: 8,
            lineHeight: 1.2,
            color: '#6b7280'
        }
    }
};

// ================================================
// EXPORTACIONES POR DEFECTO
// ================================================

export default {
    FootnoteManager,
    createFootnoteElement,
    FootnoteUtils,
    FOOTNOTE_NUMBERING,
    FOOTNOTE_PRESETS,
    DEFAULT_FOOTNOTE_CONFIG
};