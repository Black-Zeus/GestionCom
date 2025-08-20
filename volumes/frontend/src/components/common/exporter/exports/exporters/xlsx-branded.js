/**
 * Exportador Excel corporativo usando exceljs
 * Genera archivos Excel con branding, logos, múltiples hojas y formato avanzado
 */

import config from '../config.export.json';

/**
 * Importa exceljs de forma diferida para optimizar bundle
 * @returns {Promise<Object>} Módulo ExcelJS
 */
const getExcelJS = async () => {
    try {
        const ExcelJS = await import('exceljs');
        return ExcelJS.default || ExcelJS;
    } catch (error) {
        throw new Error('exceljs library is required for branded Excel export. Please install it: npm install exceljs');
    }
};

/**
 * Procesa logo para inserción en Excel
 * @param {string|File|Blob} logoSource - Fuente del logo
 * @param {Object} options - Opciones de procesamiento
 * @returns {Promise<Object>} Logo procesado para Excel
 */
const processLogoForExcel = async (logoSource, options = {}) => {
    if (!logoSource) return null;

    try {
        const { processLogo } = await import('../../utils/image.js');

        const processedLogo = await processLogo(logoSource, {
            maxWidth: 150,
            maxHeight: 60,
            format: 'png',
            backgroundColor: '#ffffff',
            ...options
        });

        // Convertir a buffer para ExcelJS
        const arrayBuffer = await processedLogo.blob.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        return {
            buffer,
            extension: 'png',
            width: processedLogo.width,
            height: processedLogo.height,
            base64: processedLogo.base64
        };

    } catch (error) {
        console.warn('Failed to process logo:', error);
        return null;
    }
};

/**
 * Aplica estilos corporativos a una hoja
 * @param {Object} worksheet - Hoja de ExcelJS
 * @param {Object} branding - Configuración de branding
 * @param {Object} options - Opciones de estilo
 */
const applyBrandedStyles = (worksheet, branding = {}, options = {}) => {
    const {
        headerRowIndex = 1,
        dataStartRow = 2,
        primaryColor = '#2563eb',
        secondaryColor = '#f3f4f6',
        textColor = '#374151',
        logoPosition = 'top-left'
    } = options;

    // Configurar colores corporativos
    const brandColors = {
        primary: branding.primaryColor || primaryColor,
        secondary: branding.secondaryColor || secondaryColor,
        text: branding.textColor || textColor,
        background: '#ffffff'
    };

    // Aplicar estilos a la fila de encabezados
    if (headerRowIndex > 0) {
        const headerRow = worksheet.getRow(headerRowIndex);

        headerRow.eachCell((cell, colNumber) => {
            cell.style = {
                font: {
                    bold: true,
                    color: { argb: 'FFFFFFFF' },
                    size: 11
                },
                fill: {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: brandColors.primary.replace('#', 'FF') }
                },
                border: {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } },
                    right: { style: 'thin', color: { argb: 'FF000000' } }
                },
                alignment: {
                    horizontal: 'center',
                    vertical: 'middle'
                }
            };
        });

        headerRow.height = 25;
    }

    // Aplicar estilos alternos a las filas de datos
    const lastRow = worksheet.lastRow;
    if (lastRow) {
        for (let rowIndex = dataStartRow; rowIndex <= lastRow.number; rowIndex++) {
            const row = worksheet.getRow(rowIndex);
            const isEvenRow = (rowIndex - dataStartRow) % 2 === 0;

            row.eachCell((cell, colNumber) => {
                cell.style = {
                    font: {
                        color: { argb: brandColors.text.replace('#', 'FF') },
                        size: 10
                    },
                    fill: {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: {
                            argb: isEvenRow ? 'FFFFFFFF' : brandColors.secondary.replace('#', 'FF')
                        }
                    },
                    border: {
                        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                    },
                    alignment: {
                        vertical: 'middle'
                    }
                };
            });

            row.height = 20;
        }
    }

    // Auto-ajustar ancho de columnas
    worksheet.columns.forEach((column, index) => {
        let maxLength = 10;

        worksheet.eachRow((row, rowNumber) => {
            const cell = row.getCell(index + 1);
            if (cell.value) {
                const cellLength = cell.value.toString().length;
                maxLength = Math.max(maxLength, cellLength);
            }
        });

        column.width = Math.min(Math.max(maxLength + 2, 12), 40);
    });
};

/**
 * Agrega logo a la hoja
 * @param {Object} workbook - Workbook de ExcelJS
 * @param {Object} worksheet - Hoja de ExcelJS
 * @param {Object} logo - Logo procesado
 * @param {Object} options - Opciones de posicionamiento
 */
const addLogoToWorksheet = async (workbook, worksheet, logo, options = {}) => {
    if (!logo || !logo.buffer) return;

    const {
        position = 'top-right',
        offsetRows = 1,
        offsetCols = 1,
        marginTop = 10,
        marginRight = 10
    } = options;

    try {
        // Agregar imagen al workbook
        const imageId = workbook.addImage({
            buffer: logo.buffer,
            extension: logo.extension
        });

        // Calcular posición según configuración
        let tl = { row: offsetRows, col: worksheet.columnCount - offsetCols };

        switch (position) {
            case 'top-left':
                tl = { row: offsetRows, col: offsetCols };
                break;
            case 'top-center':
                tl = { row: offsetRows, col: Math.floor(worksheet.columnCount / 2) };
                break;
            case 'top-right':
            default:
                tl = { row: offsetRows, col: worksheet.columnCount - offsetCols };
                break;
        }

        // Agregar imagen a la hoja
        worksheet.addImage(imageId, {
            tl: { row: tl.row - 1, col: tl.col - 1 }, // ExcelJS usa base 0
            ext: { width: logo.width, height: logo.height },
            editAs: 'oneCell'
        });

        // Ajustar altura de filas para acomodar el logo
        const logoRows = Math.ceil(logo.height / 20); // Aproximado
        for (let i = 0; i < logoRows; i++) {
            const row = worksheet.getRow(tl.row + i);
            row.height = Math.max(row.height || 15, 25);
        }

    } catch (error) {
        console.warn('Failed to add logo to worksheet:', error);
    }
};

/**
 * Agrega metadata corporativa al workbook
 * @param {Object} workbook - Workbook de ExcelJS
 * @param {Object} branding - Configuración de branding
 */
const addCorporateMetadata = (workbook, branding = {}) => {
    const {
        orgName = config.branding.default.orgName,
        createdBy = config.branding.default.createdBy,
        description = ''
    } = branding;

    workbook.creator = orgName;
    workbook.lastModifiedBy = createdBy;
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.company = orgName;

    if (description) {
        workbook.description = description;
    }
};

/**
 * Crea una hoja corporativa con datos
 * @param {Object} workbook - Workbook de ExcelJS
 * @param {Array} data - Datos de la hoja
 * @param {Array} columns - Definición de columnas
 * @param {Object} sheetOptions - Opciones de la hoja
 * @returns {Promise<Object>} Worksheet creada
 */
const createBrandedWorksheet = async (workbook, data, columns, sheetOptions = {}) => {
    const {
        sheetName = 'Sheet1',
        title = '',
        subtitle = '',
        includeHeaders = true,
        branding = {},
        logo = null,
        headerRowOffset = 0,
        ...styleOptions
    } = sheetOptions;

    // Crear worksheet
    const worksheet = workbook.addWorksheet(sheetName);

    let currentRow = 1;

    // Agregar título si se proporciona
    if (title) {
        const titleRow = worksheet.getRow(currentRow);
        titleRow.getCell(1).value = title;
        titleRow.getCell(1).style = {
            font: { bold: true, size: 16, color: { argb: 'FF374151' } },
            alignment: { horizontal: 'left', vertical: 'middle' }
        };
        titleRow.height = 30;

        // Mergear celdas para el título
        if (columns.length > 1) {
            worksheet.mergeCells(currentRow, 1, currentRow, columns.length);
        }

        currentRow += 2; // Espacio después del título
    }

    // Agregar subtítulo si se proporciona
    if (subtitle) {
        const subtitleRow = worksheet.getRow(currentRow);
        subtitleRow.getCell(1).value = subtitle;
        subtitleRow.getCell(1).style = {
            font: { bold: true, size: 12, color: { argb: 'FF6B7280' } },
            alignment: { horizontal: 'left', vertical: 'middle' }
        };
        subtitleRow.height = 25;

        if (columns.length > 1) {
            worksheet.mergeCells(currentRow, 1, currentRow, columns.length);
        }

        currentRow += 2;
    }

    const headerRowIndex = currentRow;
    const dataStartRow = headerRowIndex + (includeHeaders ? 1 : 0);

    // Agregar cabeceras si se solicita
    if (includeHeaders && columns && columns.length > 0) {
        const headerRow = worksheet.getRow(headerRowIndex);

        columns.forEach((col, index) => {
            const headerText = typeof col === 'string'
                ? col
                : (col.header || col.title || col.label || col.key || col.field || '');

            headerRow.getCell(index + 1).value = headerText;
        });

        currentRow++;
    }

    // Agregar datos
    if (data && Array.isArray(data)) {
        data.forEach(row => {
            if (!row || typeof row !== 'object') return;

            const dataRow = worksheet.getRow(currentRow);

            columns.forEach((col, index) => {
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

                // Convertir valor para Excel
                dataRow.getCell(index + 1).value = convertValueForExcel(value);
            });

            currentRow++;
        });
    }

    // Aplicar estilos corporativos
    applyBrandedStyles(worksheet, branding, {
        headerRowIndex: includeHeaders ? headerRowIndex : 0,
        dataStartRow,
        ...styleOptions
    });

    // Agregar logo si se proporciona
    if (logo) {
        await addLogoToWorksheet(workbook, worksheet, logo, {
            position: branding.logoPosition || 'top-right',
            offsetRows: 1,
            offsetCols: 1
        });
    }

    // Congelar panel en la fila de headers
    if (includeHeaders) {
        worksheet.views = [
            { state: 'frozen', ySplit: headerRowIndex }
        ];
    }

    return worksheet;
};

/**
 * Convierte un valor para Excel manteniendo tipos
 * @param {*} value - Valor a convertir
 * @returns {*} Valor convertido
 */
const convertValueForExcel = (value) => {
    if (value === null || value === undefined) {
        return '';
    }

    if (value instanceof Date) {
        return value;
    }

    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'number') {
        if (isNaN(value) || !isFinite(value)) {
            return '';
        }
        return value;
    }

    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch (error) {
            return '[Object]';
        }
    }

    return String(value);
};

/**
 * Valida los datos y opciones de branding
 * @param {*} input - Datos a validar
 * @param {Object} branding - Configuración de branding
 * @returns {Object} Resultado de validación
 */
const validateBrandedData = (input, branding = {}) => {
    const errors = [];
    const warnings = [];

    // Validaciones básicas de datos (reutilizar del simple)
    if (!input) {
        errors.push('Input data is required');
        return { isValid: false, errors, warnings };
    }

    // Validaciones específicas de branding
    if (branding.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(branding.primaryColor)) {
        warnings.push('Invalid primaryColor format, should be hex color (e.g., #2563eb)');
    }

    if (branding.logoUrl && typeof branding.logoUrl !== 'string') {
        warnings.push('logoUrl should be a string');
    }

    if (branding.orgName && branding.orgName.length > 255) {
        warnings.push('orgName is very long, may be truncated in Excel metadata');
    }

    // Validar datasets si existen
    if (input.datasets && Array.isArray(input.datasets)) {
        input.datasets.forEach((dataset, index) => {
            if (!dataset.data || !Array.isArray(dataset.data)) {
                errors.push(`Dataset at index ${index} must have a 'data' array`);
            }

            if (dataset.name && dataset.name.length > 31) {
                warnings.push(`Dataset ${index} name exceeds Excel sheet name limit (31 chars)`);
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Función principal de exportación Excel corporativo
 * @param {Array|Object} input - Datos o configuración de datasets
 * @param {Object} exportOptions - Opciones de exportación
 * @param {AbortSignal} signal - Señal para cancelar operación
 * @returns {Promise<Blob>} Blob con el archivo Excel corporativo
 */
export const exportBrandedXLSX = async (input, exportOptions = {}, signal = null) => {
    try {
        // Verificar cancelación
        if (signal?.aborted) {
            throw new Error('Branded Excel export was cancelled');
        }

        const {
            columns = [],
            filename = 'export.xlsx',
            branding = {},
            validateInput = true,
            ...sheetOptions
        } = exportOptions;

        // Validar entrada si se solicita
        if (validateInput) {
            const validation = validateBrandedData(input, branding);
            if (!validation.isValid) {
                throw new Error(`Branded Excel validation failed: ${validation.errors.join(', ')}`);
            }

            if (validation.warnings.length > 0) {
                console.warn('Branded Excel export warnings:', validation.warnings);
            }
        }

        // Cargar ExcelJS
        const ExcelJS = await getExcelJS();

        // Verificar cancelación después de cargar dependencia
        if (signal?.aborted) {
            throw new Error('Branded Excel export was cancelled');
        }

        // Crear workbook
        const workbook = new ExcelJS.Workbook();

        // Agregar metadata corporativa
        addCorporateMetadata(workbook, branding);

        // Procesar logo si se proporciona
        let logo = null;
        if (branding.headerLogoUrl || branding.logoUrl) {
            try {
                logo = await processLogoForExcel(branding.headerLogoUrl || branding.logoUrl, {
                    maxWidth: branding.logoMaxWidth || 150,
                    maxHeight: branding.logoMaxHeight || 60
                });
            } catch (error) {
                console.warn('Failed to process logo, continuing without it:', error);
            }
        }

        // Verificar cancelación después de procesar logo
        if (signal?.aborted) {
            throw new Error('Branded Excel export was cancelled');
        }

        // Determinar si son múltiples hojas o una sola
        if (input.datasets && Array.isArray(input.datasets)) {
            // Múltiples hojas corporativas
            for (let i = 0; i < input.datasets.length; i++) {
                const dataset = input.datasets[i];
                const {
                    name = `Sheet${i + 1}`,
                    data = [],
                    columns: datasetColumns = [],
                    options: datasetSheetOptions = {}
                } = dataset;

                // Verificar cancelación durante procesamiento
                if (signal?.aborted) {
                    throw new Error('Branded Excel export was cancelled');
                }

                const finalColumns = datasetColumns.length > 0 ? datasetColumns : columns;

                await createBrandedWorksheet(workbook, data, finalColumns, {
                    sheetName: name.substring(0, 31), // Límite de Excel
                    branding,
                    logo,
                    ...sheetOptions,
                    ...datasetSheetOptions
                });
            }

            // Si no hay datasets, crear hoja vacía corporativa
            if (input.datasets.length === 0) {
                await createBrandedWorksheet(workbook, [], [], {
                    sheetName: 'Sheet1',
                    branding,
                    logo,
                    title: 'Sin datos',
                    ...sheetOptions
                });
            }

        } else {
            // Hoja única corporativa
            const data = Array.isArray(input) ? input : (input.data || []);
            const finalColumns = columns.length > 0 ? columns : (input.columns || []);

            await createBrandedWorksheet(workbook, data, finalColumns, {
                sheetName: 'Datos',
                branding,
                logo,
                ...sheetOptions
            });
        }

        // Verificar cancelación antes de generar archivo
        if (signal?.aborted) {
            throw new Error('Branded Excel export was cancelled');
        }

        // Generar archivo
        const buffer = await workbook.xlsx.writeBuffer();

        // Crear blob
        const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const blob = new Blob([buffer], { type: mimeType });

        // Agregar propiedades adicionales para compatibilidad
        Object.defineProperties(blob, {
            suggestedFilename: {
                value: filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`,
                writable: false,
                enumerable: false
            },
            exportFormat: {
                value: 'xlsx-branded',
                writable: false,
                enumerable: false
            },
            exportOptions: {
                value: { ...exportOptions },
                writable: false,
                enumerable: false
            },
            hasBranding: {
                value: true,
                writable: false,
                enumerable: false
            },
            sheetsCount: {
                value: workbook.worksheets.length,
                writable: false,
                enumerable: false
            }
        });

        return blob;

    } catch (error) {
        throw new Error(`Branded Excel export failed: ${error.message}`);
    }
};

/**
 * Función auxiliar para exportar con template corporativo
 * @param {Array} data - Datos a exportar
 * @param {Object} template - Configuración del template corporativo
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Blob>} Blob con el Excel corporativo
 */
export const exportCorporateTemplate = async (data, template, options = {}) => {
    const {
        title = '',
        subtitle = '',
        columns = [],
        branding = {},
        sections = [],
        coverSheet = false
    } = template;

    if (coverSheet) {
        // Crear hoja de portada + hojas de datos
        const datasets = [
            {
                name: 'Portada',
                data: [
                    { info: title },
                    { info: subtitle },
                    { info: '' },
                    { info: `Generado: ${new Date().toLocaleDateString()}` },
                    { info: `Organización: ${branding.orgName || 'N/A'}` }
                ],
                columns: [{ key: 'info', header: 'Información' }],
                options: {
                    title: title,
                    subtitle: 'Reporte Corporativo',
                    includeHeaders: false
                }
            },
            ...(sections.length > 0 ? sections : [
                { name: 'Datos', data, columns }
            ])
        ];

        return exportBrandedXLSX({ datasets }, { ...options, branding });
    } else {
        // Solo hoja de datos con formato corporativo
        return exportBrandedXLSX(data, {
            ...options,
            columns,
            branding,
            title,
            subtitle
        });
    }
};

// Exportar objeto con todas las funciones para compatibilidad
export default {
    export: exportBrandedXLSX,
    exportCorporate: exportCorporateTemplate,
    validateBrandedData,
    processLogoForExcel,
    createBrandedWorksheet,
    addCorporateMetadata
};