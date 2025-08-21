/**
 * PDF Builder API - Clase principal para construcción fluida de documentos PDF
 * Implementa patrón Builder con sintaxis chainable
 * ACTUALIZADO: Soporte completo para Fase 2 (multi-columna, TOC, saltos de página)
 */

import { exportPDF, baseStyles, baseDocumentConfig } from '../pdf-common.js';
import { createElement, validateElementConfig } from './pdf-elements.js';
import { LayoutManager, createColumnsElement, createColumnResetElement, LAYOUT_TYPES } from './pdf-layout.js';
import { TOCManager, createTOCElement, extractSectionsFromContent, TOC_STYLES, CORPORATE_TOC_STYLES } from './pdf-toc.js';

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

        // FASE 2: Nuevas propiedades
        this.layoutManager = new LayoutManager();
        this.tocManager = new TOCManager();
        this.pageCounter = 1;
        this.tocPosition = null; // 'start', 'end', 'custom'
        this.tocConfig = null;
        this.currentSectionId = null;
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
        }
        if (sectionOptions.pageBreakAfter) {
            this.pageCounter++;
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
        this.layoutManager.resetToSingle();

        // Crear elemento de reset
        const resetElement = createColumnResetElement(options);

        if (Array.isArray(resetElement)) {
            this.content.push(...resetElement);
        } else {
            this.content.push({
                type: 'columnReset',
                config: options,
                content: resetElement,
                timestamp: Date.now()
            });
        }

        return this;
    }

    /**
     * Genera tabla de contenidos automática
     * @param {Object} tocOptions - Opciones del TOC
     * @returns {PDFDocumentBuilder}
     */
    generateTOC(tocOptions = {}) {
        // Configurar TOC
        this.tocConfig = {
            title: 'Índice de Contenidos',
            maxLevel: 3,
            includePageNumbers: true,
            pageBreakAfter: true,
            position: 'start', // 'start', 'end', 'custom'
            ...tocOptions
        };

        // Configurar posición
        this.tocPosition = this.tocConfig.position;

        // Si es posición custom, agregar inmediatamente
        if (this.tocPosition === 'custom') {
            this._insertTOC();
        }

        return this;
    }

    /**
     * Inserta TOC en la posición actual
     * @private
     */
    _insertTOC() {
        if (!this.tocConfig) {
            throw new Error('PDFBuilder: TOC no configurado');
        }

        // Extraer secciones existentes
        const sections = extractSectionsFromContent(this.content);

        // Crear elemento TOC
        const tocElement = createTOCElement(this.tocConfig, sections);
        this.content.push(tocElement);

        // Incrementar contador de páginas
        this.pageCounter++;

        return tocElement;
    }

    /**
     * Agrega un salto de página explícito
     * @param {Object} options - Opciones del salto
     * @returns {PDFDocumentBuilder}
     */
    pageBreak(options = {}) {
        const pageBreakElement = createElement('pageBreak', options);
        this.content.push(pageBreakElement);

        // Incrementar contador
        this.pageCounter++;

        return this;
    }

    /**
     * Configura paginación personalizada
     * @param {Object} paginationOptions - Opciones de paginación
     * @returns {PDFDocumentBuilder}
     */
    addPagination(paginationOptions = {}) {
        const {
            format = 'Página {current} de {total}',
            startFrom = 1,
            position = 'bottom-center',
            showOnFirst = false,
            style = 'normal'
        } = paginationOptions;

        // Configurar footer con paginación si no existe
        if (!this.footerConfig) {
            this.footerConfig = {};
        }

        this.footerConfig.pagination = {
            format,
            startFrom,
            position,
            showOnFirst,
            style
        };

        return this;
    }

    /**
     * Agrega espaciador vertical
     * @param {number} height - Altura del espaciador
     * @returns {PDFDocumentBuilder}
     */
    addSpacer(height = 20) {
        const spacerElement = createElement('spacer', { height });
        this.content.push(spacerElement);
        return this;
    }

    /**
     * Obtiene información del layout actual
     * @returns {Object} Información del layout
     */
    getLayoutInfo() {
        return this.layoutManager.getLayoutInfo();
    }

    /**
     * Obtiene estadísticas del TOC
     * @returns {Object} Estadísticas del TOC
     */
    getTOCStats() {
        return this.tocManager.getStats();
    }

    /**
     * Obtiene el número de página actual
     * @returns {number} Página actual
     */
    getCurrentPage() {
        return this.pageCounter;
    }

    /**
     * Establece el número de página actual
     * @param {number} pageNumber - Número de página
     * @returns {PDFDocumentBuilder}
     */
    setCurrentPage(pageNumber) {
        if (pageNumber < 1) {
            throw new Error('PDFBuilder: Número de página debe ser mayor a 0');
        }
        this.pageCounter = pageNumber;
        this.tocManager.setCurrentPage(pageNumber);
        return this;
    }

    /**
     * Valida la configuración antes de construir
     * @returns {Object} Resultado de validación
     */
    validate() {
        const errors = [];
        const warnings = [];

        // Validar que hay contenido
        if (this.content.length === 0) {
            errors.push('El documento debe tener al menos un elemento de contenido');
        }

        // Validar elementos del contenido
        this.content.forEach((element, index) => {
            try {
                validateElementConfig(element);
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
            pageCount: this.pageCounter
        };
    }

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
            signal = null
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
            branding: this.branding,
            corporateStyle: format.includes('branded'),
            customStyles: this._buildFinalStyles(),
            ...this.documentConfig,
            ...buildOptions
        };

        // Configurar header y footer si están definidos
        if (this.headerConfig) {
            exportOptions.createHeader = this._createHeaderFunction();
        }

        if (this.footerConfig) {
            exportOptions.createFooter = this._createFooterFunction();
        }

        // Generar PDF usando la función común
        return exportPDF(exportData, exportOptions, signal);
    }

    /**
     * Procesa el TOC según su posición configurada
     * @private
     */
    _processTOC() {
        if (!this.tocConfig) {
            return;
        }

        // Extraer secciones del contenido
        const sections = extractSectionsFromContent(this.content);

        // Actualizar TOC manager con secciones
        this.tocManager.clear();
        sections.forEach(section => {
            this.tocManager.addSection(section);
        });

        // Insertar TOC según posición
        switch (this.tocPosition) {
            case 'start':
                this._insertTOCAtStart();
                break;
            case 'end':
                this._insertTOCAtEnd();
                break;
            case 'custom':
                // Ya insertado en generateTOC
                break;
        }
    }

    /**
     * Inserta TOC al inicio del documento
     * @private
     */
    _insertTOCAtStart() {
        const tocElement = createTOCElement(this.tocConfig, this.tocManager.getSections());
        this.content.unshift(tocElement);
    }

    /**
     * Inserta TOC al final del documento
     * @private
     */
    _insertTOCAtEnd() {
        const tocElement = createTOCElement(this.tocConfig, this.tocManager.getSections());
        this.content.push(tocElement);
    }

    /**
     * Construye estilos finales combinando base + builder + custom
     * @private
     */
    _buildFinalStyles() {
        const corporateMode = this.branding && Object.keys(this.branding).length > 0;

        return {
            ...baseStyles,
            ...(corporateMode ? CORPORATE_TOC_STYLES : TOC_STYLES),
            ...this.customStyles
        };
    }

    /**
     * Prepara los datos para la función exportPDF
     * @private
     * @returns {Object} Datos formateados para exportPDF
     */
    _prepareExportData() {
        const processedContent = this.content.map(element => {
            switch (element.type) {
                case 'table':
                    return {
                        type: 'table',
                        headers: element.config.headers,
                        data: element.config.data,
                        options: element.config
                    };
                case 'columns':
                case 'columnReset':
                case 'toc':
                    // Elementos especiales del builder
                    return element;
                default:
                    return element;
            }
        });

        return {
            builderContent: processedContent,
            isBuilderGenerated: true,
            metadata: this.metadata,
            layoutInfo: this.layoutManager.getLayoutInfo(),
            tocStats: this.tocManager.getStats(),
            pageCount: this.pageCounter
        };
    }

    /**
     * Crea función de header personalizada
     * @private
     * @returns {Function}
     */
    _createHeaderFunction() {
        const headerConfig = this.headerConfig;

        return function (branding, logo, docOptions) {
            return function (currentPage, pageCount, pageSize) {
                // Excluir primera página si se especifica
                if (headerConfig.firstPage === false && currentPage === 1) {
                    return null;
                }

                const headerContent = [];

                if (headerConfig.content) {
                    headerContent.push({
                        text: headerConfig.content
                            .replace('{page}', currentPage)
                            .replace('{total}', pageCount)
                            .replace('{orgName}', branding?.orgName || '')
                            .replace('{title}', docOptions?.title || ''),
                        style: headerConfig.style || 'header',
                        alignment: headerConfig.alignment || 'center'
                    });
                }

                // Agregar fecha si se solicita
                if (headerConfig.includeDate) {
                    headerContent.push({
                        text: new Date().toLocaleDateString('es-ES'),
                        style: headerConfig.style || 'header',
                        alignment: 'right',
                        fontSize: 8
                    });
                }

                // Agregar logo si se solicita
                if (headerConfig.includeLogo && branding?.logoUrl) {
                    headerContent.unshift({
                        image: branding.logoUrl,
                        width: 50,
                        alignment: 'left'
                    });
                }

                return headerContent.length > 0 ? {
                    columns: headerContent,
                    margin: [40, 20, 40, 10]
                } : null;
            };
        };
    }

    /**
     * Crea función de footer personalizada
     * @private
     * @returns {Function}
     */
    _createFooterFunction() {
        const footerConfig = this.footerConfig;

        return function (branding, docOptions) {
            return function (currentPage, pageCount) {
                // Excluir primera página si se especifica
                if (footerConfig.firstPage === false && currentPage === 1) {
                    return null;
                }

                const footerContent = [];

                if (footerConfig.leftText) {
                    footerContent.push({
                        text: footerConfig.leftText,
                        alignment: 'left',
                        style: footerConfig.style || 'footer'
                    });
                }

                if (footerConfig.centerText) {
                    footerContent.push({
                        text: footerConfig.centerText,
                        alignment: 'center',
                        style: footerConfig.style || 'footer'
                    });
                }

                if (footerConfig.rightText) {
                    let rightText = footerConfig.rightText
                        .replace('{pageNumber}', currentPage)
                        .replace('{totalPages}', pageCount)
                        .replace('{current}', currentPage)
                        .replace('{total}', pageCount);

                    footerContent.push({
                        text: rightText,
                        alignment: 'right',
                        style: footerConfig.style || 'footer'
                    });
                }

                // Manejar configuración de paginación
                if (footerConfig.pagination && !footerConfig.rightText) {
                    const { format, startFrom, showOnFirst } = footerConfig.pagination;

                    if (showOnFirst || currentPage > 1) {
                        const pageNumber = currentPage + startFrom - 1;
                        const paginationText = format
                            .replace('{current}', pageNumber)
                            .replace('{total}', pageCount + startFrom - 1);

                        footerContent.push({
                            text: paginationText,
                            alignment: 'center',
                            style: footerConfig.style || 'footer'
                        });
                    }
                }

                return footerContent.length > 0 ? {
                    columns: footerContent,
                    style: footerConfig.style || 'footer',
                    margin: [40, 10, 40, 20]
                } : null;
            };
        };
    }

    /**
     * Obtiene estadísticas del documento
     * @returns {Object} Estadísticas del builder
     */
    getStats() {
        return {
            elementCount: this.content.length,
            hasTitle: !!this.metadata.title,
            hasHeader: !!this.headerConfig,
            hasFooter: !!this.footerConfig,
            hasBranding: Object.keys(this.branding).length > 0,
            validated: this.validated,
            elements: this.content.map(el => el.type),
            layoutInfo: this.layoutManager.getLayoutInfo(),
            tocStats: this.tocManager.getStats(),
            currentPage: this.pageCounter,
            features: {
                multiColumn: this.layoutManager.getLayoutInfo().type !== LAYOUT_TYPES.SINGLE,
                tableOfContents: !!this.tocConfig,
                customStyles: Object.keys(this.customStyles).length > 0,
                branding: Object.keys(this.branding).length > 0
            }
        };
    }

    /**
     * Limpia el contenido del builder
     * @returns {PDFDocumentBuilder}
     */
    clear() {
        this.content = [];
        this.validated = false;
        this.layoutManager.clearContent();
        this.layoutManager.clearHistory();
        this.tocManager.clear();
        this.pageCounter = 1;
        this.tocPosition = null;
        this.tocConfig = null;
        this.currentSectionId = null;
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
        cloned.tocPosition = this.tocPosition;
        return cloned;
    }
}

/**
 * Función factory para crear una nueva instancia del builder
 * @param {Object} options - Opciones iniciales
 * @returns {PDFDocumentBuilder}
 */
export const createPDFBuilder = (options = {}) => {
    return new PDFDocumentBuilder(options);
};

export default PDFDocumentBuilder;