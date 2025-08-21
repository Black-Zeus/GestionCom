/**
 * PDF Layout Manager - Sistema de gestión de layouts multi-columna
 * Maneja distribución de contenido en múltiples columnas
 */

import { validateBuilderElementConfig } from '../pdf-common.js';

/**
 * Tipos de layout soportados
 */
export const LAYOUT_TYPES = {
    SINGLE: 'single',
    TWO_COLUMN: 'twoColumn',
    THREE_COLUMN: 'threeColumn',
    CUSTOM: 'custom',
    SIDEBAR: 'sidebar'
};

/**
 * Configuraciones predefinidas de layouts
 */
export const LAYOUT_PRESETS = {
    [LAYOUT_TYPES.SINGLE]: {
        columns: 1,
        widths: ['*'],
        gap: 0
    },
    [LAYOUT_TYPES.TWO_COLUMN]: {
        columns: 2,
        widths: ['*', '*'],
        gap: 20
    },
    [LAYOUT_TYPES.THREE_COLUMN]: {
        columns: 3,
        widths: ['*', '*', '*'],
        gap: 15
    },
    [LAYOUT_TYPES.SIDEBAR]: {
        columns: 2,
        widths: ['30%', '70%'],
        gap: 20
    }
};

/**
 * Clase para gestionar layouts de página
 */
export class LayoutManager {
    constructor() {
        this.currentLayout = LAYOUT_TYPES.SINGLE;
        this.columnConfig = { ...LAYOUT_PRESETS[LAYOUT_TYPES.SINGLE] };
        this.activeColumns = [];
        this.layoutHistory = [];
    }

    /**
     * Configura un layout multi-columna
     * @param {Object} options - Opciones del layout
     * @returns {Object} Configuración del layout
     */
    setLayout(options = {}) {
        const {
            type = LAYOUT_TYPES.TWO_COLUMN,
            widths = null,
            gap = 20,
            alignment = 'top',
            columnMinHeight = 50
        } = options;

        // Guardar estado anterior
        this.layoutHistory.push({
            layout: this.currentLayout,
            config: { ...this.columnConfig }
        });

        // Configurar nuevo layout
        if (LAYOUT_PRESETS[type]) {
            this.columnConfig = {
                ...LAYOUT_PRESETS[type],
                gap,
                alignment,
                columnMinHeight
            };
        } else if (type === LAYOUT_TYPES.CUSTOM && widths) {
            this.columnConfig = {
                columns: widths.length,
                widths,
                gap,
                alignment,
                columnMinHeight
            };
        } else {
            throw new Error(`Tipo de layout no válido: ${type}`);
        }

        this.currentLayout = type;
        this.activeColumns = Array(this.columnConfig.columns).fill(null).map(() => []);

        return this.columnConfig;
    }

    /**
     * Resetea a layout de columna única
     * @returns {Object} Configuración del layout single
     */
    resetToSingle() {
        this.layoutHistory.push({
            layout: this.currentLayout,
            config: { ...this.columnConfig }
        });

        this.currentLayout = LAYOUT_TYPES.SINGLE;
        this.columnConfig = { ...LAYOUT_PRESETS[LAYOUT_TYPES.SINGLE] };
        this.activeColumns = [[]];

        return this.columnConfig;
    }

    /**
     * Restaura el layout anterior
     * @returns {Object|null} Configuración restaurada o null si no hay historial
     */
    restorePreviousLayout() {
        if (this.layoutHistory.length === 0) {
            return null;
        }

        const previous = this.layoutHistory.pop();
        this.currentLayout = previous.layout;
        this.columnConfig = previous.config;
        this.activeColumns = Array(this.columnConfig.columns).fill(null).map(() => []);

        return this.columnConfig;
    }

    /**
     * Agrega contenido a una columna específica
     * @param {number} columnIndex - Índice de la columna (0-based)
     * @param {Object} content - Contenido a agregar
     */
    addToColumn(columnIndex, content) {
        if (columnIndex < 0 || columnIndex >= this.columnConfig.columns) {
            throw new Error(`Índice de columna inválido: ${columnIndex}`);
        }

        this.activeColumns[columnIndex].push(content);
    }

    /**
     * Distribuye contenido automáticamente entre columnas
     * @param {Array} contentArray - Array de contenido a distribuir
     * @param {string} strategy - Estrategia de distribución ('sequential', 'balanced')
     */
    distributeContent(contentArray, strategy = 'sequential') {
        if (!Array.isArray(contentArray) || contentArray.length === 0) {
            return;
        }

        // Limpiar columnas actuales
        this.activeColumns = Array(this.columnConfig.columns).fill(null).map(() => []);

        switch (strategy) {
            case 'sequential':
                this._distributeSequential(contentArray);
                break;
            case 'balanced':
                this._distributeBalanced(contentArray);
                break;
            default:
                this._distributeSequential(contentArray);
        }
    }

    /**
     * Distribución secuencial - llena columnas una por una
     * @private
     */
    _distributeSequential(contentArray) {
        let currentColumn = 0;

        contentArray.forEach(content => {
            this.activeColumns[currentColumn].push(content);
            currentColumn = (currentColumn + 1) % this.columnConfig.columns;
        });
    }

    /**
     * Distribución balanceada - intenta equilibrar el contenido
     * @private
     */
    _distributeBalanced(contentArray) {
        const itemsPerColumn = Math.ceil(contentArray.length / this.columnConfig.columns);

        for (let i = 0; i < this.columnConfig.columns; i++) {
            const start = i * itemsPerColumn;
            const end = Math.min(start + itemsPerColumn, contentArray.length);
            this.activeColumns[i] = contentArray.slice(start, end);
        }
    }

    /**
     * Genera la estructura de columnas para pdfmake
     * @returns {Object} Estructura de columnas para pdfmake
     */
    generateColumnStructure() {
        if (this.currentLayout === LAYOUT_TYPES.SINGLE) {
            // Retornar contenido plano para columna única
            return this.activeColumns[0] || [];
        }

        // Estructura multi-columna
        const columns = this.activeColumns.map((columnContent, index) => ({
            width: this.columnConfig.widths[index],
            stack: columnContent.length > 0 ? columnContent : [{ text: '' }],
            margin: index === 0 ? [0, 0, this.columnConfig.gap / 2, 0]
                : index === this.activeColumns.length - 1 ? [this.columnConfig.gap / 2, 0, 0, 0]
                    : [this.columnConfig.gap / 2, 0, this.columnConfig.gap / 2, 0]
        }));

        return {
            columns,
            columnGap: this.columnConfig.gap,
            alignment: this.columnConfig.alignment || 'top'
        };
    }

    /**
     * Obtiene información del layout actual
     * @returns {Object} Información del layout
     */
    getLayoutInfo() {
        return {
            type: this.currentLayout,
            config: { ...this.columnConfig },
            columnCount: this.columnConfig.columns,
            hasContent: this.activeColumns.some(col => col.length > 0),
            contentCounts: this.activeColumns.map(col => col.length),
            historyLength: this.layoutHistory.length
        };
    }

    /**
     * Valida si se puede aplicar un layout
     * @param {Object} options - Opciones del layout a validar
     * @returns {Object} Resultado de validación
     */
    validateLayout(options = {}) {
        const errors = [];
        const warnings = [];

        const { type, widths, gap } = options;

        // Validar tipo
        if (type && !Object.values(LAYOUT_TYPES).includes(type) && type !== LAYOUT_TYPES.CUSTOM) {
            errors.push(`Tipo de layout no válido: ${type}`);
        }

        // Validar widths para layout custom
        if (type === LAYOUT_TYPES.CUSTOM) {
            if (!widths || !Array.isArray(widths)) {
                errors.push('Layout custom requiere array de widths');
            } else {
                if (widths.length < 1 || widths.length > 5) {
                    errors.push('Número de columnas debe estar entre 1 y 5');
                }

                // Validar formato de widths
                const invalidWidths = widths.filter(w =>
                    typeof w !== 'string' && typeof w !== 'number'
                );
                if (invalidWidths.length > 0) {
                    errors.push('Todos los widths deben ser string o number');
                }
            }
        }

        // Validar gap
        if (gap !== undefined && (typeof gap !== 'number' || gap < 0)) {
            errors.push('Gap debe ser un número positivo');
        }

        // Advertencias
        if (type && Object.values(LAYOUT_TYPES).includes(type) && widths) {
            warnings.push('Widths será ignorado para layouts predefinidos');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Limpia el contenido de todas las columnas
     */
    clearContent() {
        this.activeColumns = Array(this.columnConfig.columns).fill(null).map(() => []);
    }

    /**
     * Limpia el historial de layouts
     */
    clearHistory() {
        this.layoutHistory = [];
    }
}

/**
 * Crea elemento de columnas para el builder
 * @param {Array|Object} columnsConfig - Configuración de columnas
 * @param {Object} options - Opciones adicionales
 * @returns {Object} Elemento de columnas procesado
 */
export const createColumnsElement = (columnsConfig, options = {}) => {
    const {
        gap = 20,
        alignment = 'top',
        pageBreakBefore = false,
        pageBreakAfter = false
    } = options;

    let processedColumns;

    // Si es array, cada elemento es el contenido de una columna
    if (Array.isArray(columnsConfig)) {
        processedColumns = columnsConfig.map((columnContent, index) => {
            if (typeof columnContent === 'object' && columnContent.width && columnContent.content) {
                // Configuración explícita con width y content
                return {
                    width: columnContent.width,
                    stack: Array.isArray(columnContent.content) ? columnContent.content : [columnContent.content],
                    margin: calculateColumnMargin(index, columnsConfig.length, gap)
                };
            } else {
                // Contenido directo, width automático
                return {
                    width: '*',
                    stack: Array.isArray(columnContent) ? columnContent : [columnContent],
                    margin: calculateColumnMargin(index, columnsConfig.length, gap)
                };
            }
        });
    }
    // Si es objeto con configuración de layout
    else if (columnsConfig.layout && columnsConfig.content) {
        const layout = new LayoutManager();
        layout.setLayout(columnsConfig.layout);
        layout.distributeContent(columnsConfig.content, columnsConfig.distribution || 'sequential');
        return layout.generateColumnStructure();
    }
    else {
        throw new Error('Configuración de columnas inválida');
    }

    const columnsElement = {
        columns: processedColumns,
        columnGap: gap,
        alignment
    };

    // Agregar saltos de página si se solicitan
    const content = [];

    if (pageBreakBefore) {
        content.push({ text: '', pageBreak: 'before' });
    }

    content.push(columnsElement);

    if (pageBreakAfter) {
        content.push({ text: '', pageBreak: 'after' });
    }

    return content.length === 1 ? content[0] : content;
};

/**
 * Calcula el margen para una columna específica
 * @private
 */
function calculateColumnMargin(index, totalColumns, gap) {
    const halfGap = gap / 2;

    if (totalColumns === 1) {
        return [0, 0, 0, 0];
    }

    if (index === 0) {
        return [0, 0, halfGap, 0]; // Solo margen derecho
    } else if (index === totalColumns - 1) {
        return [halfGap, 0, 0, 0]; // Solo margen izquierdo
    } else {
        return [halfGap, 0, halfGap, 0]; // Margen ambos lados
    }
}

/**
 * Crea elemento de reset de columnas (volver a single)
 * @param {Object} options - Opciones del reset
 * @returns {Object} Elemento de reset
 */
export const createColumnResetElement = (options = {}) => {
    const {
        addSpacer = true,
        spacerHeight = 20,
        pageBreakBefore = false
    } = options;

    const content = [];

    if (pageBreakBefore) {
        content.push({ text: '', pageBreak: 'before' });
    }

    if (addSpacer) {
        content.push({ text: '', margin: [0, spacerHeight, 0, 0] });
    }

    // Marcador especial para indicar reset de columnas
    content.push({
        text: '',
        _layoutReset: true, // Propiedad especial para procesamiento
        margin: [0, 0, 0, 0]
    });

    return content.length === 1 ? content[0] : content;
};

/**
 * Valida configuración de columnas
 * @param {Array|Object} columnsConfig - Configuración a validar
 * @returns {Object} Resultado de validación
 */
export const validateColumnsConfig = (columnsConfig) => {
    const errors = [];
    const warnings = [];

    if (!columnsConfig) {
        errors.push('Configuración de columnas requerida');
        return { valid: false, errors, warnings };
    }

    if (Array.isArray(columnsConfig)) {
        if (columnsConfig.length === 0) {
            errors.push('Array de columnas no puede estar vacío');
        } else if (columnsConfig.length > 5) {
            warnings.push('Más de 5 columnas puede afectar la legibilidad');
        }

        // Validar cada columna
        columnsConfig.forEach((column, index) => {
            if (column === null || column === undefined) {
                errors.push(`Columna ${index + 1} no puede ser null o undefined`);
            }
        });
    } else if (typeof columnsConfig === 'object') {
        if (!columnsConfig.layout && !columnsConfig.content) {
            errors.push('Objeto de configuración debe tener layout y content');
        }
    } else {
        errors.push('Configuración debe ser array u objeto');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Utilidades para layouts responsivos
 */
export const LayoutUtils = {
    /**
     * Crea layout adaptativo según el contenido
     */
    createAdaptiveLayout(content, pageWidth = 595) { // A4 width en puntos
        const itemCount = Array.isArray(content) ? content.length : 1;

        if (itemCount <= 2) {
            return LAYOUT_PRESETS[LAYOUT_TYPES.TWO_COLUMN];
        } else if (itemCount <= 6 && pageWidth > 500) {
            return LAYOUT_PRESETS[LAYOUT_TYPES.THREE_COLUMN];
        } else {
            return LAYOUT_PRESETS[LAYOUT_TYPES.SINGLE];
        }
    },

    /**
     * Calcula widths óptimos para contenido
     */
    calculateOptimalWidths(contentLengths) {
        if (!Array.isArray(contentLengths) || contentLengths.length === 0) {
            return ['*'];
        }

        const total = contentLengths.reduce((sum, length) => sum + length, 0);

        if (total === 0) {
            return contentLengths.map(() => '*');
        }

        return contentLengths.map(length => {
            const percentage = (length / total) * 100;
            return `${Math.max(15, Math.min(70, percentage))}%`; // Min 15%, Max 70%
        });
    },

    /**
     * Optimiza contenido para multi-columna
     */
    optimizeForColumns(content, columnCount) {
        if (!Array.isArray(content) || columnCount <= 1) {
            return content;
        }

        // Dividir elementos largos si es necesario
        return content.map(item => {
            if (typeof item === 'string' && item.length > 200) {
                const chunkSize = Math.ceil(item.length / columnCount);
                return item.match(new RegExp(`.{1,${chunkSize}}`, 'g')) || [item];
            }
            return item;
        }).flat();
    }
};

export default {
    LayoutManager,
    createColumnsElement,
    createColumnResetElement,
    validateColumnsConfig,
    LayoutUtils,
    LAYOUT_TYPES,
    LAYOUT_PRESETS
};