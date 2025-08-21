/**
 * PDF Builder API - Clase principal para construcción fluida de documentos PDF
 * Implementa patrón Builder con sintaxis chainable
 * ACTUALIZADO: Soporte completo para Fase 3 (footnotes/notas al pie)
 * VERSIÓN COMPLETA: Mantiene TODOS los métodos originales + nuevas funcionalidades
 */

import { exportPDF, baseStyles, baseDocumentConfig } from '../pdf-common.js';
import { createElement, validateElementConfig, createFootnoteElementForBuilder, FootnoteElementUtils } from './pdf-elements.js';
import { LayoutManager, createColumnsElement, createColumnResetElement, LAYOUT_TYPES } from './pdf-layout.js';
import { TOCManager, createTOCElement, extractSectionsFromContent, TOC_STYLES, CORPORATE_TOC_STYLES } from './pdf-toc.js';
// FASE 3: Importar sistema de footnotes
import { FootnoteManager, FOOTNOTE_NUMBERING, FOOTNOTE_PRESETS } from './pdf-footnotes.js';

/**
 * Clase principal del PDF Builder
 * Permite construir documentos PDF usando sintaxis fluida
 */
export class PDFDocumentBuilder {
    constructor(options = {}) {
        this.content = [];
        this.documentConfig = {
            ...baseDocumentConfig,
            ...options
        };
        this.metadata = {
            title: '',
            subtitle: '',
            author: '',
            subject: ''
        };
        this.branding = {};
        this.customStyles = {};
        this.headerConfig = null;
        this.footerConfig = null;
        this.validated = false;

        // FASE 2: Propiedades existentes
        this.layoutManager = new LayoutManager();
        this.tocManager = new TOCManager();
        this.pageCounter = 1;
        this.tocPosition = null; // 'start', 'end', 'custom'
        this.tocConfig = null;
        this.currentSectionId = null;

        // FASE 3: Nuevas propiedades para footnotes
        this.footnoteManager = new FootnoteManager(options.footnoteConfig || {});
        this.pendingFootnotes = new Map(); // Referencias en el texto que necesitan procesamiento
        this.footnoteReferences = new Map(); // Map de referencia -> nota completa
        this.lastFootnoteRef = null;
    }

    /**
     * Configura metadatos del documento
     * @param {Object} metadata - Metadatos del documento
     * @returns {PDFDocumentBuilder}
     */
    setMetadata(metadata = {}) {
        this.metadata = { ...this.metadata, ...metadata };
        return this;
    }

    /**
     * Configura branding corporativo
     * @param {Object} branding - Configuración de branding
     * @returns {PDFDocumentBuilder}
     */
    setBranding(branding = {}) {
        this.branding = { ...this.branding, ...branding };
        return this;
    }

    /**
     * Configura estilos personalizados
     * @param {Object} styles - Estilos personalizados
     * @returns {PDFDocumentBuilder}
     */
    setCustomStyles(styles = {}) {
        this.customStyles = { ...this.customStyles, ...styles };
        return this;
    }

    /**
     * Agrega una portada al documento
     * @param {Object} coverOptions - Opciones de la portada
     * @returns {PDFDocumentBuilder}
     */
    addCover(coverOptions = {}) {
        const coverElement = createElement('cover', coverOptions);
        this.content.push(coverElement);

        // Configurar metadatos si se proporcionan en la portada
        if (coverOptions.title) this.metadata.title = coverOptions.title;
        if (coverOptions.subtitle) this.metadata.subtitle = coverOptions.subtitle;
        if (coverOptions.author) this.metadata.author = coverOptions.author;

        // Incrementar página si incluye salto
        if (coverOptions.includePageBreak !== false) {
            this.pageCounter++;
        }

        // FASE 3: Actualizar página en footnote manager
        this.footnoteManager.setCurrentPage(this.pageCounter);

        return this;
    }

    /**
     * Agrega una sección con título
     * @param {Object} sectionOptions - Opciones de la sección
     * @returns {PDFDocumentBuilder}
     */
    addSection(sectionOptions = {}) {
        const { title, subtitle, level = 1, ...otherOptions } = sectionOptions;

        if (!title) {
            throw new Error('PDFBuilder: La sección debe tener un título');
        }

        // Generar ID único para la sección
        const sectionId = `section_${this.content.length}_${Date.now()}`;
        this.currentSectionId = sectionId;

        // Agregar a TOC si está configurado
        this.tocManager.addSection({
            id: sectionId,
            title,
            subtitle,
            level,
            pageNumber: this.pageCounter
        });

        const sectionElement = createElement('section', {
            id: sectionId,
            title,
            subtitle,
            level,
            ...otherOptions
        });

        this.content.push(sectionElement);

        // Manejar saltos de página
        if (sectionOptions.pageBreakBefore) {
            this.pageCounter++;
            this.footnoteManager.setCurrentPage(this.pageCounter);
        }
        if (sectionOptions.pageBreakAfter) {
            this.pageCounter++;
            this.footnoteManager.setCurrentPage(this.pageCounter);
        }

        return this;
    }

    /**
     * Agrega un párrafo de texto
     * @param {string} text - Texto del párrafo
     * @param {Object} options - Opciones de formato
     * @returns {PDFDocumentBuilder}
     */
    addParagraph(text, options = {}) {
        if (!text || typeof text !== 'string') {
            throw new Error('PDFBuilder: El párrafo debe tener texto válido');
        }

        const paragraphElement = createElement('paragraph', {
            text,
            ...options
        });

        this.content.push(paragraphElement);
        return this;
    }

    /**
     * Agrega una imagen
     * @param {string} src - URL o path de la imagen
     * @param {Object} options - Opciones de la imagen
     * @returns {PDFDocumentBuilder}
     */
    addImage(src, options = {}) {
        if (!src) {
            throw new Error('PDFBuilder: La imagen debe tener una fuente válida');
        }

        const imageElement = createElement('image', {
            src,
            ...options
        });

        this.content.push(imageElement);
        return this;
    }

    /**
     * Agrega una tabla
     * @param {Object} tableOptions - Opciones de la tabla
     * @returns {PDFDocumentBuilder}
     */
    addTable(tableOptions = {}) {
        const { headers, data, ...otherOptions } = tableOptions;

        if (!headers || !Array.isArray(headers)) {
            throw new Error('PDFBuilder: La tabla debe tener headers válidos');
        }

        if (!data || !Array.isArray(data)) {
            throw new Error('PDFBuilder: La tabla debe tener datos válidos');
        }

        const tableElement = createElement('table', {
            headers,
            data,
            ...otherOptions
        });

        this.content.push(tableElement);
        return this;
    }

    /**
     * Agrega una lista
     * @param {Array} items - Items de la lista
     * @param {Object} options - Opciones de la lista
     * @returns {PDFDocumentBuilder}
     */
    addList(items, options = {}) {
        if (!Array.isArray(items) || items.length === 0) {
            throw new Error('PDFBuilder: La lista debe tener items válidos');
        }

        const listElement = createElement('list', {
            items,
            ...options
        });

        this.content.push(listElement);
        return this;
    }

    /**
     * Agrega texto simple
     * @param {string} text - Texto a agregar
     * @param {Object} options - Opciones de formato
     * @returns {PDFDocumentBuilder}
     */
    addText(text, options = {}) {
        if (!text || typeof text !== 'string') {
            throw new Error('PDFBuilder: El texto debe ser válido');
        }

        const textElement = createElement('text', {
            text,
            ...options
        });

        this.content.push(textElement);
        return this;
    }

    /**
     * Configura header del documento
     * @param {Object} headerOptions - Opciones del header
     * @returns {PDFDocumentBuilder}
     */
    addHeader(headerOptions = {}) {
        this.headerConfig = headerOptions;
        return this;
    }

    /**
     * Configura footer del documento
     * @param {Object} footerOptions - Opciones del footer
     * @returns {PDFDocumentBuilder}
     */
    addFooter(footerOptions = {}) {
        this.footerConfig = footerOptions;
        return this;
    }

    // ================================================
    // FASE 2: FUNCIONALIDADES AVANZADAS
    // ================================================

    /**
     * Configura layout multi-columna
     * @param {Array|Object} columnsConfig - Configuración de columnas
     * @param {Object} options - Opciones adicionales
     * @returns {PDFDocumentBuilder}
     */
    addColumns(columnsConfig, options = {}) {
        if (!columnsConfig) {
            throw new Error('PDFBuilder: Configuración de columnas requerida');
        }

        // Configurar layout manager
        if (Array.isArray(columnsConfig)) {
            this.layoutManager.setLayout({
                type: LAYOUT_TYPES.CUSTOM,
                widths: columnsConfig.map(col => col.width || '*'),
                ...options
            });
        } else if (columnsConfig.type) {
            this.layoutManager.setLayout(columnsConfig);
        }

        // Crear elemento de columnas
        const columnsElement = createColumnsElement(columnsConfig, options);

        // Agregar al contenido
        if (Array.isArray(columnsElement)) {
            this.content.push(...columnsElement);
        } else {
            this.content.push({
                type: 'columns',
                config: { columnsConfig, options },
                content: columnsElement,
                timestamp: Date.now()
            });
        }

        return this;
    }

    /**
     * Resetea a layout de columna única
     * @param {Object} options - Opciones del reset
     * @returns {PDFDocumentBuilder}
     */
    resetColumns(options = {}) {
        // Resetear layout manager
        this.layoutManager.resetLayout();

        // Crear elemento de reset
        const resetElement = createColumnResetElement(options);

        // Agregar al contenido
        this.content.push({
            type: 'columnReset',
            config: options,
            content: resetElement,
            timestamp: Date.now()
        });

        return this;
    }

    /**
     * Agrega un salto de página explícito
     * @param {Object} options - Opciones del salto de página
     * @returns {PDFDocumentBuilder}
     */
    pageBreak(options = {}) {
        const pageBreakElement = createElement('pageBreak', options);
        this.content.push(pageBreakElement);
        this.pageCounter++;

        // FASE 3: Actualizar página en footnote manager
        this.footnoteManager.setCurrentPage(this.pageCounter);

        return this;
    }

    /**
     * Agrega espacio vertical
     * @param {number} height - Altura del espacio en puntos
     * @param {Object} options - Opciones adicionales
     * @returns {PDFDocumentBuilder}
     */
    addSpacer(height = 20, options = {}) {
        const spacerElement = createElement('spacer', { height, ...options });
        this.content.push(spacerElement);
        return this;
    }

    /**
     * Configura la numeración de páginas
     * @param {Object} paginationConfig - Configuración de paginación
     * @returns {PDFDocumentBuilder}
     */
    addPagination(paginationConfig = {}) {
        this.documentConfig.pagination = {
            ...this.documentConfig.pagination,
            ...paginationConfig
        };
        return this;
    }

    /**
     * Genera tabla de contenidos automática
     * @param {Object} tocConfig - Configuración del TOC
     * @returns {PDFDocumentBuilder}
     */
    generateTOC(tocConfig = {}) {
        this.tocConfig = {
            title: 'Índice de Contenidos',
            maxLevel: 3,
            includePageNumbers: true,
            pageBreakAfter: true,
            pageBreakBefore: false,
            styles: TOC_STYLES,
            ...tocConfig
        };
        this.tocPosition = 'start';
        return this;
    }

    /**
     * Configura TOC corporativo
     * @param {Object} tocConfig - Configuración del TOC corporativo
     * @returns {PDFDocumentBuilder}
     */
    generateCorporateTOC(tocConfig = {}) {
        return this.generateTOC({
            ...tocConfig,
            styles: CORPORATE_TOC_STYLES
        });
    }

    // ================================================
    // FASE 3: MÉTODOS DE FOOTNOTES
    // ================================================

    /**
     * Agrega una nota al pie
     * @param {string} text - Texto de la nota
     * @param {Object} options - Opciones de configuración
     * @returns {PDFDocumentBuilder}
     */
    addFootnote(text, options = {}) {
        if (!text || typeof text !== 'string') {
            throw new Error('PDFBuilder: La nota al pie debe tener texto válido');
        }

        // Actualizar página actual en el footnote manager
        this.footnoteManager.setCurrentPage(this.pageCounter);

        // Agregar la nota al manager
        const footnoteRef = this.footnoteManager.addFootnote(text, options);

        // Crear elemento footnote para el builder
        const footnoteElement = createFootnoteElementForBuilder(text, {
            ...options,
            footnoteId: footnoteRef.id,
            referenceNumber: footnoteRef.referenceNumber,
            referenceText: footnoteRef.referenceText,
            pageNumber: footnoteRef.pageNumber
        });

        this.content.push(footnoteElement);

        // Guardar referencia para uso posterior
        this.footnoteReferences.set(footnoteRef.id, footnoteRef);
        this.lastFootnoteRef = footnoteRef;

        return this;
    }

    /**
     * Agrega un párrafo con una nota al pie automática
     * @param {string} text - Texto del párrafo
     * @param {string} footnoteText - Texto de la nota
     * @param {Object} paragraphOptions - Opciones del párrafo
     * @param {Object} footnoteOptions - Opciones de la nota
     * @returns {PDFDocumentBuilder}
     */
    addParagraphWithFootnote(text, footnoteText, paragraphOptions = {}, footnoteOptions = {}) {
        // Agregar párrafo
        this.addParagraph(text, paragraphOptions);

        // Agregar footnote
        this.addFootnote(footnoteText, footnoteOptions);

        return this;
    }

    /**
     * Obtiene la referencia de la última nota creada
     * @returns {Object|null} Referencia de la última nota o null
     */
    getLastFootnoteReference() {
        return this.lastFootnoteRef;
    }

    /**
     * Obtiene todas las referencias de notas al pie
     * @returns {Map} Map con todas las referencias
     */
    getAllFootnoteReferences() {
        return new Map(this.footnoteReferences);
    }

    /**
     * Configura opciones globales de footnotes
     * @param {Object} config - Configuración global de footnotes
     * @returns {PDFDocumentBuilder}
     */
    setFootnoteConfig(config = {}) {
        // Aplicar preset si se especifica
        if (config.preset && FOOTNOTE_PRESETS[config.preset]) {
            const presetConfig = { ...FOOTNOTE_PRESETS[config.preset], ...config };
            this.footnoteManager.config = { ...this.footnoteManager.config, ...presetConfig };
        } else {
            this.footnoteManager.config = { ...this.footnoteManager.config, ...config };
        }

        return this;
    }

    /**
     * Aplica un preset de footnotes (academic, corporate, minimal)
     * @param {string} presetName - Nombre del preset
     * @param {Object} overrides - Configuraciones que sobrescriben el preset
     * @returns {PDFDocumentBuilder}
     */
    useFootnotePreset(presetName, overrides = {}) {
        if (!FOOTNOTE_PRESETS[presetName]) {
            throw new Error(`PDFBuilder: Preset de footnote no válido: ${presetName}`);
        }

        return this.setFootnoteConfig({
            preset: presetName,
            ...overrides
        });
    }

    // ================================================
    // MÉTODOS DE UTILIDAD Y CONFIGURACIÓN AVANZADA
    // ================================================

    /**
     * Agrega múltiples elementos de una vez
     * @param {Array} elements - Array de elementos a agregar
     * @returns {PDFDocumentBuilder}
     */
    addElements(elements) {
        if (!Array.isArray(elements)) {
            throw new Error('PDFBuilder: Se esperaba un array de elementos');
        }

        elements.forEach(element => {
            if (element && element.type) {
                this.content.push(element);
            }
        });

        return this;
    }

    /**
     * Inserta contenido en una posición específica
     * @param {number} index - Índice donde insertar
     * @param {Object} element - Elemento a insertar
     * @returns {PDFDocumentBuilder}
     */
    insertAt(index, element) {
        if (index < 0 || index > this.content.length) {
            throw new Error('PDFBuilder: Índice fuera de rango');
        }

        this.content.splice(index, 0, element);
        return this;
    }

    /**
     * Remueve un elemento por índice
     * @param {number} index - Índice del elemento a remover
     * @returns {PDFDocumentBuilder}
     */
    removeAt(index) {
        if (index < 0 || index >= this.content.length) {
            throw new Error('PDFBuilder: Índice fuera de rango');
        }

        this.content.splice(index, 1);
        return this;
    }

    /**
     * Limpia todo el contenido
     * @returns {PDFDocumentBuilder}
     */
    clear() {
        this.content = [];
        this.pageCounter = 1;
        this.currentSectionId = null;
        this.tocManager.reset();
        this.layoutManager.resetLayout();
        // FASE 3: Limpiar footnotes
        this.footnoteManager.reset();
        this.footnoteReferences.clear();
        this.lastFootnoteRef = null;
        return this;
    }

    /**
     * Clona el builder actual
     * @returns {PDFDocumentBuilder} Nueva instancia clonada
     */
    clone() {
        const cloned = new PDFDocumentBuilder(this.documentConfig);
        cloned.content = [...this.content];
        cloned.metadata = { ...this.metadata };
        cloned.branding = { ...this.branding };
        cloned.customStyles = { ...this.customStyles };
        cloned.headerConfig = this.headerConfig ? { ...this.headerConfig } : null;
        cloned.footerConfig = this.footerConfig ? { ...this.footerConfig } : null;
        cloned.pageCounter = this.pageCounter;
        cloned.tocConfig = this.tocConfig ? { ...this.tocConfig } : null;

        // FASE 3: Clonar footnotes
        cloned.footnoteReferences = new Map(this.footnoteReferences);
        cloned.lastFootnoteRef = this.lastFootnoteRef;

        return cloned;
    }

    // ================================================
    // MÉTODOS DE ANÁLISIS Y ESTADÍSTICAS
    // ================================================

    /**
     * Obtiene información detallada del contenido
     * @returns {Object} Información del contenido
     */
    getContentInfo() {
        const info = {
            totalElements: this.content.length,
            elementTypes: {},
            hasImages: false,
            hasTables: false,
            hasColumns: false,
            hasTOC: this.tocConfig !== null,
            hasFootnotes: this.footnoteReferences.size > 0,
            estimatedPages: this.pageCounter
        };

        this.content.forEach(element => {
            const type = element.type;
            info.elementTypes[type] = (info.elementTypes[type] || 0) + 1;

            if (type === 'image') info.hasImages = true;
            if (type === 'table') info.hasTables = true;
            if (type === 'columns') info.hasColumns = true;
        });

        return info;
    }

    /**
     * Valida el documento antes de construir
     * @param {Object} options - Opciones de validación
     * @returns {Object} Resultado de validación
     */
    validate(options = {}) {
        const errors = [];
        const warnings = [];

        // Validar contenido mínimo
        if (this.content.length === 0) {
            errors.push('El documento no tiene contenido');
        } else {
            // Verificar si hay al menos un elemento de contenido
            const hasContentElement = this.content.some(el =>
                ['paragraph', 'text', 'table', 'list', 'image'].includes(el.type)
            );

            if (!hasContentElement) {
                warnings.push('El documento no parece tener elementos de contenido');
            }
        }

        // Validar elementos del contenido
        this.content.forEach((element, index) => {
            try {
                validateElementConfig(element);

                // FASE 3: Validaciones específicas para footnotes
                if (FootnoteElementUtils.isFootnoteElement(element)) {
                    const footnoteValidation = FootnoteElementUtils.validateFootnoteElement(element);
                    if (!footnoteValidation.isValid) {
                        errors.push(...footnoteValidation.errors.map(err => `Elemento ${index}: ${err}`));
                    }
                    warnings.push(...footnoteValidation.warnings.map(warn => `Elemento ${index}: ${warn}`));
                }
            } catch (error) {
                errors.push(`Elemento ${index + 1}: ${error.message}`);
            }
        });

        // Validar metadatos básicos
        if (!this.metadata.title && this.content.length > 0) {
            warnings.push('Se recomienda establecer un título para el documento');
        }

        // Validar configuración de TOC
        if (this.tocConfig) {
            const tocValidation = TOCManager.validateConfig(this.tocConfig);
            errors.push(...tocValidation.errors);
            warnings.push(...tocValidation.warnings);
        }

        // FASE 3: Validar configuración de footnotes
        const footnoteValidation = this.footnoteManager.validateConfiguration();
        if (!footnoteValidation.isValid) {
            errors.push(...footnoteValidation.errors.map(err => `Footnotes: ${err}`));
        }
        warnings.push(...footnoteValidation.warnings.map(warn => `Footnotes: ${warn}`));

        // Validar layout
        const layoutInfo = this.layoutManager.getLayoutInfo();
        if (layoutInfo.type !== LAYOUT_TYPES.SINGLE && !layoutInfo.hasContent) {
            warnings.push('Layout multi-columna configurado pero sin contenido');
        }

        this.validated = errors.length === 0;

        return {
            valid: this.validated,
            errors,
            warnings,
            layoutInfo,
            tocStats: this.tocManager.getStats(),
            footnoteStats: footnoteValidation.stats,
            pageCount: this.pageCounter,
            contentInfo: this.getContentInfo()
        };
    }

    /**
     * Obtiene estadísticas del documento
     * @returns {Object} Estadísticas del builder
     */
    getStats() {
        return {
            elements: this.content.length,
            pages: this.pageCounter,
            metadata: this.metadata,
            hasHeader: this.headerConfig !== null,
            hasFooter: this.footerConfig !== null,
            hasTOC: this.tocConfig !== null,
            layoutInfo: this.layoutManager.getLayoutInfo(),
            tocInfo: this.tocManager.getStats(),
            // FASE 3: Estadísticas de footnotes
            footnoteInfo: this.footnoteManager.getStats(),
            footnoteReferences: this.footnoteReferences.size,
            contentInfo: this.getContentInfo(),
            lastModified: Date.now()
        };
    }

    // ================================================
    // MÉTODOS PRIVADOS PARA PROCESAMIENTO
    // ================================================

    /**
     * Procesa el TOC si está configurado
     * @private
     */
    _processTOC() {
        if (!this.tocConfig || this.tocPosition !== 'start') {
            return;
        }

        // Extraer secciones del contenido
        const sections = extractSectionsFromContent(this.content);

        // Configurar TOC manager
        this.tocManager.setSections(sections);

        // Crear elemento TOC
        const tocElement = createTOCElement(this.tocConfig, sections);

        // Insertar al inicio
        this.content.unshift(tocElement);
    }

    /**
     * Prepara los datos para exportación
     * @private
     */
    _prepareExportData() {
        // FASE 3: Procesar footnotes si están habilitadas
        let finalContent = [...this.content];

        if (this.footnoteManager.getStats().totalFootnotes > 0) {
            finalContent = this._processFootnotesInContent(finalContent);
        }

        return {
            isBuilderGenerated: true,
            builderContent: finalContent,
            tocManager: this.tocManager,
            layoutManager: this.layoutManager,
            // FASE 3: Agregar footnote manager
            footnoteManager: this.footnoteManager,
            metadata: this.metadata,
            branding: this.branding,
            customStyles: this.customStyles,
            headerConfig: this.headerConfig,
            footerConfig: this.footerConfig,
            ...this.documentConfig
        };
    }

    /**
     * FASE 3: Procesa las footnotes en el contenido del builder
     * @private
     */
    _processFootnotesInContent(content) {
        const processedContent = [];
        const pageFootnotes = new Map();

        content.forEach(element => {
            processedContent.push(element);

            // Si es una footnote, almacenar para procesamiento por página
            if (FootnoteElementUtils.isFootnoteElement(element)) {
                const footnoteId = element.config?.footnoteId;
                const pageNumber = element.config?.pageNumber || this.pageCounter;

                if (!pageFootnotes.has(pageNumber)) {
                    pageFootnotes.set(pageNumber, []);
                }
                pageFootnotes.get(pageNumber).push(footnoteId);
            }

            // Si es un salto de página, agregar footnotes de la página anterior
            if (element.type === 'pageBreak') {
                const currentPage = this.pageCounter - 1;
                if (pageFootnotes.has(currentPage)) {
                    const footnoteElements = this.footnoteManager.generatePageFootnotes(currentPage);
                    processedContent.push(...footnoteElements);
                }
            }
        });

        // Agregar footnotes de la última página
        const lastPage = this.pageCounter;
        if (pageFootnotes.has(lastPage)) {
            const footnoteElements = this.footnoteManager.generatePageFootnotes(lastPage);
            processedContent.push(...footnoteElements);
        }

        return processedContent;
    }

    // ================================================
    // MÉTODO DE CONSTRUCCIÓN PRINCIPAL
    // ================================================

    /**
     * Construye el documento PDF final
     * @param {Object} buildOptions - Opciones de construcción
     * @returns {Promise<Blob>} Blob del PDF generado
     */
    async build(buildOptions = {}) {
        const {
            filename = 'documento',
            format = 'pdf-simple',
            validate = true,
            includeFootnotes = true,
            signal = null,
            ...otherOptions
        } = buildOptions;

        // Validar si se solicita
        if (validate) {
            const validation = this.validate();
            if (!validation.valid) {
                throw new Error(`Error de validación: ${validation.errors.join(', ')}`);
            }
        }

        // Procesar TOC si está configurado
        this._processTOC();

        // Preparar datos para exportPDF
        const exportData = this._prepareExportData();

        // Preparar opciones de exportación
        const exportOptions = {
            title: this.metadata.title || filename,
            subtitle: this.metadata.subtitle,
            author: this.metadata.author,
            subject: this.metadata.subject,
            filename,
            validate,
            corporateStyle: format.includes('branded'),
            signal,
            // FASE 3: Opciones para footnotes
            includeFootnotes,
            ...otherOptions
        };

        // Generar PDF usando la función exportPDF
        const blob = await exportPDF(exportData, [], exportOptions);

        // Marcar como construido
        this.validated = true;

        return blob;
    }
}

// ================================================
// FUNCIONES DE CONVENIENCIA Y BUILDERS ESPECIALIZADOS
// ================================================

/**
 * Crea un builder con configuración académica
 * @param {Object} options - Opciones iniciales
 * @returns {PDFDocumentBuilder} Builder configurado para uso académico
 */
export const createAcademicPDFBuilder = (options = {}) => {
    const builder = new PDFDocumentBuilder({
        pageMargins: [40, 60, 40, 60],
        fontSize: 11,
        lineHeight: 1.4,
        ...options
    });

    return builder
        .useFootnotePreset('academic')
        .setFootnoteConfig({
            numbering: FOOTNOTE_NUMBERING.SEQUENTIAL,
            position: 'bottom',
            separator: true
        })
        .setCustomStyles({
            body: {
                fontSize: 11,
                lineHeight: 1.4,
                alignment: 'justify'
            },
            footnote: {
                fontSize: 9,
                lineHeight: 1.2,
                color: '#333333'
            },
            footnoteRef: {
                fontSize: 8,
                sup: true,
                color: '#000000'
            }
        });
};

/**
 * Crea un builder con configuración corporativa
 * @param {Object} options - Opciones iniciales
 * @returns {PDFDocumentBuilder} Builder configurado para uso corporativo
 */
export const createCorporatePDFBuilder = (options = {}) => {
    const builder = new PDFDocumentBuilder({
        pageMargins: [60, 100, 60, 80],
        corporateStyle: true,
        ...options
    });

    return builder
        .useFootnotePreset('corporate')
        .setFootnoteConfig({
            numbering: FOOTNOTE_NUMBERING.PER_PAGE,
            position: 'bottom',
            separator: true,
            referenceStyle: {
                fontSize: 8,
                sup: true,
                color: '#2563eb'
            }
        })
        .setCustomStyles({
            footnote: {
                fontSize: 9,
                lineHeight: 1.3,
                color: '#374151'
            },
            footnoteRef: {
                fontSize: 8,
                sup: true,
                color: '#2563eb',
                link: true
            }
        });
};

/**
 * Crea un builder con configuración minimalista
 * @param {Object} options - Opciones iniciales
 * @returns {PDFDocumentBuilder} Builder configurado para uso minimalista
 */
export const createMinimalPDFBuilder = (options = {}) => {
    const builder = new PDFDocumentBuilder({
        pageMargins: [30, 40, 30, 40],
        fontSize: 10,
        ...options
    });

    return builder
        .useFootnotePreset('minimal')
        .setFootnoteConfig({
            numbering: FOOTNOTE_NUMBERING.SYMBOLS,
            maxPerPage: 5,
            separator: false
        })
        .setCustomStyles({
            footnote: {
                fontSize: 8,
                lineHeight: 1.2,
                color: '#6b7280'
            },
            footnoteRef: {
                fontSize: 8,
                sup: true,
                color: '#6b7280'
            }
        });
};

/**
 * Crea un builder con configuración de reporte ejecutivo
 * @param {Object} options - Opciones iniciales
 * @returns {PDFDocumentBuilder} Builder configurado para reportes ejecutivos
 */
export const createExecutiveReportBuilder = (options = {}) => {
    const builder = new PDFDocumentBuilder({
        pageMargins: [50, 80, 50, 60],
        corporateStyle: true,
        ...options
    });

    return builder
        .useFootnotePreset('corporate')
        .setFootnoteConfig({
            numbering: FOOTNOTE_NUMBERING.SEQUENTIAL,
            position: 'bottom',
            separator: true
        })
        .addHeader({
            content: "{title}",
            includeDate: true,
            firstPage: false,
            alignment: 'space-between'
        })
        .addFooter({
            leftText: "Confidencial",
            rightText: "Página {pageNumber} de {totalPages}",
            firstPage: false
        });
};

/**
 * Crea un builder con configuración de manual técnico
 * @param {Object} options - Opciones iniciales
 * @returns {PDFDocumentBuilder} Builder configurado para manuales técnicos
 */
export const createTechnicalManualBuilder = (options = {}) => {
    const builder = new PDFDocumentBuilder({
        pageMargins: [40, 70, 40, 50],
        fontSize: 10,
        ...options
    });

    return builder
        .useFootnotePreset('academic')
        .setFootnoteConfig({
            numbering: FOOTNOTE_NUMBERING.SEQUENTIAL,
            position: 'bottom',
            separator: true,
            maxPerPage: 8
        })
        .generateTOC({
            title: 'Tabla de Contenidos',
            maxLevel: 4,
            includePageNumbers: true,
            pageBreakAfter: true
        })
        .setCustomStyles({
            codeBlock: {
                fontSize: 9,
                font: 'Courier',
                background: '#f5f5f5',
                margin: [10, 5, 10, 5]
            },
            warning: {
                fontSize: 10,
                color: '#d97706',
                bold: true,
                margin: [10, 5, 10, 5]
            }
        });
};

// ================================================
// MÉTODOS DE UTILIDAD PARA BUILDERS
// ================================================

/**
 * Combina múltiples builders en uno solo
 * @param {Array<PDFDocumentBuilder>} builders - Array de builders a combinar
 * @param {Object} options - Opciones de combinación
 * @returns {PDFDocumentBuilder} Builder combinado
 */
export const combineBuilders = (builders, options = {}) => {
    if (!Array.isArray(builders) || builders.length === 0) {
        throw new Error('Se requiere un array de builders válido');
    }

    const {
        addPageBreaks = true,
        mergeMetadata = true,
        mergeStyles = true
    } = options;

    const combinedBuilder = new PDFDocumentBuilder();

    builders.forEach((builder, index) => {
        // Agregar salto de página entre builders (excepto el primero)
        if (addPageBreaks && index > 0) {
            combinedBuilder.pageBreak();
        }

        // Combinar contenido
        combinedBuilder.addElements(builder.content);

        // Combinar metadatos del primer builder
        if (mergeMetadata && index === 0) {
            combinedBuilder.setMetadata(builder.metadata);
            combinedBuilder.setBranding(builder.branding);
        }

        // Combinar estilos
        if (mergeStyles) {
            combinedBuilder.setCustomStyles({
                ...combinedBuilder.customStyles,
                ...builder.customStyles
            });
        }

        // Combinar configuraciones de footnotes
        if (builder.footnoteReferences.size > 0) {
            builder.footnoteReferences.forEach((ref, id) => {
                combinedBuilder.footnoteReferences.set(id, ref);
            });
        }
    });

    return combinedBuilder;
};

/**
 * Crea un builder a partir de una plantilla JSON
 * @param {Object} template - Plantilla en formato JSON
 * @returns {PDFDocumentBuilder} Builder configurado según la plantilla
 */
export const createBuilderFromTemplate = (template) => {
    const {
        metadata = {},
        branding = {},
        customStyles = {},
        footnoteConfig = {},
        header = null,
        footer = null,
        toc = null,
        content = [],
        options = {}
    } = template;

    const builder = new PDFDocumentBuilder(options);

    // Configurar metadatos
    if (Object.keys(metadata).length > 0) {
        builder.setMetadata(metadata);
    }

    // Configurar branding
    if (Object.keys(branding).length > 0) {
        builder.setBranding(branding);
    }

    // Configurar estilos
    if (Object.keys(customStyles).length > 0) {
        builder.setCustomStyles(customStyles);
    }

    // Configurar footnotes
    if (Object.keys(footnoteConfig).length > 0) {
        builder.setFootnoteConfig(footnoteConfig);
    }

    // Configurar header
    if (header) {
        builder.addHeader(header);
    }

    // Configurar footer
    if (footer) {
        builder.addFooter(footer);
    }

    // Configurar TOC
    if (toc) {
        builder.generateTOC(toc);
    }

    // Agregar contenido
    content.forEach(element => {
        const { type, config = {} } = element;

        switch (type) {
            case 'cover':
                builder.addCover(config);
                break;
            case 'section':
                builder.addSection(config);
                break;
            case 'paragraph':
                builder.addParagraph(config.text, config);
                break;
            case 'image':
                builder.addImage(config.src, config);
                break;
            case 'table':
                builder.addTable(config);
                break;
            case 'list':
                builder.addList(config.items, config);
                break;
            case 'footnote':
                builder.addFootnote(config.text, config);
                break;
            case 'pageBreak':
                builder.pageBreak();
                break;
            case 'spacer':
                builder.addSpacer(config.height, config);
                break;
            default:
                console.warn(`Tipo de elemento no reconocido en plantilla: ${type}`);
        }
    });

    return builder;
};

/**
 * Valida una plantilla JSON antes de crear el builder
 * @param {Object} template - Plantilla a validar
 * @returns {Object} Resultado de validación
 */
export const validateTemplate = (template) => {
    const errors = [];
    const warnings = [];

    if (!template || typeof template !== 'object') {
        errors.push('La plantilla debe ser un objeto válido');
        return { isValid: false, errors, warnings };
    }

    // Validar estructura básica
    const { content = [] } = template;

    if (!Array.isArray(content)) {
        errors.push('El contenido debe ser un array');
    } else if (content.length === 0) {
        warnings.push('La plantilla no tiene contenido');
    }

    // Validar elementos de contenido
    content.forEach((element, index) => {
        if (!element.type) {
            errors.push(`Elemento ${index}: debe tener un tipo definido`);
        }

        if (element.type === 'footnote' && !element.config?.text) {
            errors.push(`Elemento ${index}: las footnotes deben tener texto`);
        }

        if (element.type === 'section' && !element.config?.title) {
            errors.push(`Elemento ${index}: las secciones deben tener título`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

// ================================================
// EXPORTACIONES
// ================================================

export default {
    PDFDocumentBuilder,
    createAcademicPDFBuilder,
    createCorporatePDFBuilder,
    createMinimalPDFBuilder,
    createExecutiveReportBuilder,
    createTechnicalManualBuilder,
    combineBuilders,
    createBuilderFromTemplate,
    validateTemplate
};