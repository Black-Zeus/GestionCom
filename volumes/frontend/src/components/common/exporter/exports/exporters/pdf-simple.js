/**
 * Exportador PDF simple usando pdfmake
 * Genera documentos PDF básicos con tablas y formato automático
 */

import config from '../config.export.json';

/**
 * Importa pdfmake de forma diferida para optimizar bundle
 * @returns {Promise<Object>} Módulo pdfmake
 */
const getPDFMake = async () => {
    try {
        const pdfMake = await import('pdfmake/build/pdfmake');
        const pdfFonts = await import('pdfmake/build/vfs_fonts');

        // Configurar fuentes
        pdfMake.default.vfs = pdfFonts.default.pdfMake.vfs;

        return pdfMake.default;
    } catch (error) {
        throw new Error('pdfmake library is required for PDF export. Please install it: npm install pdfmake');
    }
};

/**
 * Convierte datos a formato de tabla para pdfmake
 * @param {Array} data - Array de objetos
 * @param {Array} columns - Definición de columnas
 * @param {Object} options - Opciones de conversión
 * @returns {Object} Definición de tabla para pdfmake
 */
const convertDataToTable = (data, columns, options = {}) => {
    const {
        includeHeaders = true,
        headerStyle = config.pdf.styles.tableHeader,
        bodyStyle = config.pdf.styles.tableBody,
        maxCellLength = 50,
        dateFormat = 'DD/MM/YYYY',
        numberFormat = null
    } = options;

    if (!Array.isArray(data) || data.length === 0) {
        return {
            table: {
                headerRows: 0,
                body: []
            }
        };
    }

    const tableBody = [];

    // Generar cabeceras si se solicita
    if (includeHeaders && columns && columns.length > 0) {
        const headers = columns.map(col => {
            const headerText = typeof col === 'string'
                ? col
                : (col.header || col.title || col.label || col.key || col.field || '');

            return {
                text: headerText,
                style: 'tableHeader'
            };
        });
        tableBody.push(headers);
    }

    // Convertir filas de datos
    data.forEach(row => {
        if (!row || typeof row !== 'object') {
            return;
        }

        const tableRow = [];

        if (columns && columns.length > 0) {
            // Usar columnas definidas
            columns.forEach(col => {
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

                // Convertir valor para PDF
                const cellContent = convertValueForPDF(value, {
                    maxCellLength,
                    dateFormat,
                    numberFormat
                });

                tableRow.push({
                    text: cellContent,
                    style: 'tableBody'
                });
            });
        } else {
            // Sin columnas definidas, usar todas las propiedades
            Object.values(row).forEach(value => {
                const cellContent = convertValueForPDF(value, {
                    maxCellLength,
                    dateFormat,
                    numberFormat
                });

                tableRow.push({
                    text: cellContent,
                    style: 'tableBody'
                });
            });
        }

        tableBody.push(tableRow);
    });

    return {
        table: {
            headerRows: includeHeaders ? 1 : 0,
            widths: generateColumnWidths(columns),
            body: tableBody
        },
        layout: {
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
        }
    };
};

/**
 * Convierte un valor para mostrar en PDF
 * @param {*} value - Valor a convertir
 * @param {Object} options - Opciones de conversión
 * @returns {string} Valor formateado
 */
const convertValueForPDF = (value, options = {}) => {
    const { maxCellLength, dateFormat, numberFormat } = options;

    if (value === null || value === undefined) {
        return '';
    }

    if (value instanceof Date) {
        try {
            return value.toLocaleDateString('es-ES');
        } catch (error) {
            return value.toString();
        }
    }

    if (typeof value === 'boolean') {
        return value ? 'Sí' : 'No';
    }

    if (typeof value === 'number') {
        if (isNaN(value) || !isFinite(value)) {
            return '';
        }

        if (numberFormat) {
            try {
                return new Intl.NumberFormat('es-ES', numberFormat).format(value);
            } catch (error) {
                return value.toString();
            }
        }

        return value.toString();
    }

    if (typeof value === 'object') {
        try {
            const jsonString = JSON.stringify(value);
            return jsonString.length > maxCellLength
                ? jsonString.substring(0, maxCellLength) + '...'
                : jsonString;
        } catch (error) {
            return '[Object]';
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
 * @returns {Array} Array de anchos para pdfmake
 */
const generateColumnWidths = (columns) => {
    if (!columns || columns.length === 0) {
        return ['*']; // Una columna que ocupe todo el ancho
    }

    // Distribución automática equitativa
    const columnCount = columns.length;

    if (columnCount <= 3) {
        return new Array(columnCount).fill('*');
    } else if (columnCount <= 5) {
        return new Array(columnCount).fill('auto');
    } else {
        // Para muchas columnas, usar ancho fijo pequeño
        return new Array(columnCount).fill(80);
    }
};

/**
 * Crea el documento PDF completo
 * @param {Array} content - Contenido del documento
 * @param {Object} documentOptions - Opciones del documento
 * @returns {Object} Definición del documento para pdfmake
 */
const createPDFDocument = (content, documentOptions = {}) => {
    const {
        title = 'Documento',
        subtitle = '',
        author = '',
        subject = '',
        pageSize = config.pdf.defaultPageSize,
        pageOrientation = config.pdf.defaultOrientation,
        pageMargins = config.pdf.defaultMargins,
        header = null,
        footer = null,
        watermark = null
    } = documentOptions;

    const docDefinition = {
        content,
        pageSize,
        pageOrientation,
        pageMargins,

        info: {
            title,
            author,
            subject,
            creator: 'Export System',
            producer: 'pdfmake'
        },

        styles: {
            header: {
                fontSize: 18,
                bold: true,
                margin: [0, 0, 0, 20],
                color: '#374151'
            },
            subheader: {
                fontSize: 14,
                bold: true,
                margin: [0, 20, 0, 8],
                color: '#6b7280'
            },
            tableHeader: {
                bold: true,
                fontSize: 10,
                color: '#374151',
                fillColor: '#f3f4f6'
            },
            tableBody: {
                fontSize: 9,
                color: '#6b7280'
            },
            footer: {
                fontSize: 8,
                color: '#9ca3af',
                alignment: 'center'
            }
        },

        defaultStyle: {
            font: 'Helvetica'
        }
    };

    // Agregar header si se proporciona
    if (header) {
        docDefinition.header = header;
    }

    // Agregar footer si se proporciona
    if (footer) {
        docDefinition.footer = footer;
    } else {
        // Footer por defecto con numeración
        docDefinition.footer = function (currentPage, pageCount) {
            return {
                text: `Página ${currentPage} de ${pageCount}`,
                style: 'footer'
            };
        };
    }

    // Agregar watermark si se proporciona
    if (watermark) {
        docDefinition.watermark = watermark;
    }

    return docDefinition;
};

/**
 * Valida los datos antes de la exportación PDF
 * @param {*} input - Datos a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado de validación
 */
const validateData = (input, options = {}) => {
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
    const maxRecommendedRows = 1000;

    if (input.datasets && Array.isArray(input.datasets)) {
        input.datasets.forEach((dataset, index) => {
            const data = dataset.data || [];
            if (data.length > maxRecommendedRows) {
                warnings.push(`Dataset ${index} has ${data.length} rows, this may result in a very large PDF`);
            }
        });
    } else {
        const data = Array.isArray(input) ? input : (input.data || []);
        if (data.length > maxRecommendedRows) {
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
 * Función principal de exportación PDF simple
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
            ...documentOptions
        } = exportOptions;

        // Validar entrada si se solicita
        if (validateInput) {
            const validation = validateData(input, exportOptions);
            if (!validation.isValid) {
                throw new Error(`PDF validation failed: ${validation.errors.join(', ')}`);
            }

            // Mostrar warnings en consola
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

        const content = [];

        // Agregar título principal si se proporciona
        if (title) {
            content.push({
                text: title,
                style: 'header'
            });
        }

        // Agregar subtítulo si se proporciona
        if (subtitle) {
            content.push({
                text: subtitle,
                style: 'subheader'
            });
        }

        // Determinar si son múltiples datasets o datos simples
        if (input.datasets && Array.isArray(input.datasets)) {
            // Múltiples secciones
            input.datasets.forEach((dataset, index) => {
                const {
                    name = `Sección ${index + 1}`,
                    data = [],
                    columns: datasetColumns = [],
                    options: datasetOptions = {}
                } = dataset;

                // Verificar cancelación durante procesamiento
                if (signal?.aborted) {
                    throw new Error('PDF export was cancelled');
                }

                // Agregar título de sección
                if (name && index > 0) {
                    content.push({ text: '', pageBreak: 'before' }); // Salto de página
                }

                if (name) {
                    content.push({
                        text: name,
                        style: 'subheader'
                    });
                }

                // Generar tabla para este dataset
                const finalColumns = datasetColumns.length > 0 ? datasetColumns : columns;
                const table = convertDataToTable(data, finalColumns, {
                    ...documentOptions,
                    ...datasetOptions
                });

                content.push(table);

                // Agregar espacio entre secciones (excepto la última)
                if (index < input.datasets.length - 1) {
                    content.push({ text: '\n' });
                }
            });

        } else {
            // Dataset único
            const data = Array.isArray(input) ? input : (input.data || []);
            const finalColumns = columns.length > 0 ? columns : (input.columns || []);

            const table = convertDataToTable(data, finalColumns, documentOptions);
            content.push(table);
        }

        // Verificar cancelación antes de generar PDF
        if (signal?.aborted) {
            throw new Error('PDF export was cancelled');
        }

        // Crear documento PDF
        const docDefinition = createPDFDocument(content, {
            title,
            subtitle,
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
                            value: 'pdf',
                            writable: false,
                            enumerable: false
                        },
                        exportOptions: {
                            value: { ...exportOptions },
                            writable: false,
                            enumerable: false
                        }
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

/**
 * Función auxiliar para exportar tabla simple
 * @param {Array} data - Array de objetos
 * @param {Array} columns - Definición de columnas
 * @param {Object} options - Opciones de exportación
 * @returns {Promise<Blob>} Blob con el PDF
 */
export const exportSimpleTable = async (data, columns, options = {}) => {
    return exportPDF(data, {
        ...options,
        columns,
        title: options.title || 'Tabla de Datos'
    });
};

/**
 * Función auxiliar para exportar múltiples secciones
 * @param {Array} sections - Array de secciones
 * @param {Object} options - Opciones globales
 * @returns {Promise<Blob>} Blob con el PDF multi-sección
 */
export const exportMultipleSections = async (sections, options = {}) => {
    const datasets = sections.map(section => ({
        name: section.name || section.title,
        data: section.data,
        columns: section.columns,
        options: section.options
    }));

    return exportPDF({ datasets }, options);
};

/**
 * Función auxiliar para exportar reporte con header/footer personalizado
 * @param {Array} data - Datos a exportar
 * @param {Object} reportConfig - Configuración del reporte
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Blob>} Blob con el PDF formateado
 */
export const exportReport = async (data, reportConfig, options = {}) => {
    const {
        title = 'Reporte',
        subtitle = '',
        columns = [],
        headerText = '',
        footerText = '',
        includeDate = true,
        includePageNumbers = true
    } = reportConfig;

    const documentOptions = {
        title,
        subtitle,
        columns,
        ...options
    };

    // Configurar header personalizado
    if (headerText || includeDate) {
        documentOptions.header = function (currentPage, pageCount, pageSize) {
            const headerContent = [];

            if (headerText) {
                headerContent.push({
                    text: headerText,
                    alignment: 'left',
                    margin: [40, 20, 40, 0]
                });
            }

            if (includeDate) {
                headerContent.push({
                    text: new Date().toLocaleDateString('es-ES'),
                    alignment: 'right',
                    margin: [40, 20, 40, 0]
                });
            }

            return headerContent;
        };
    }

    // Configurar footer personalizado
    if (footerText || includePageNumbers) {
        documentOptions.footer = function (currentPage, pageCount) {
            const footerContent = [];

            if (footerText) {
                footerContent.push({
                    text: footerText,
                    alignment: 'center',
                    style: 'footer',
                    margin: [40, 0, 40, 20]
                });
            }

            if (includePageNumbers) {
                footerContent.push({
                    text: `Página ${currentPage} de ${pageCount}`,
                    alignment: 'center',
                    style: 'footer',
                    margin: [40, 0, 40, 20]
                });
            }

            return footerContent;
        };
    }

    return exportPDF(data, documentOptions);
};

// Exportar objeto con todas las funciones para compatibilidad
export default {
    export: exportPDF,
    exportSimple: exportSimpleTable,
    exportMultiple: exportMultipleSections,
    exportReport,
    validateData,
    convertDataToTable,
    createPDFDocument
};