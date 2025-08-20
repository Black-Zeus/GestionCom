/**
 * Exportador Excel simple usando xlsx y file-saver
 * Genera archivos Excel básicos con formato automático y múltiples hojas
 */

import config from '../config.export.json';

/**
 * Importa xlsx de forma diferida para optimizar bundle
 * @returns {Promise<Object>} Módulo xlsx
 */
const getXLSX = async () => {
    try {
        const XLSX = await import('xlsx');
        return XLSX;
    } catch (error) {
        throw new Error('xlsx library is required for Excel export. Please install it: npm install xlsx');
    }
};

/**
 * Convierte datos a formato compatible con xlsx
 * @param {Array} data - Array de objetos
 * @param {Array} columns - Definición de columnas
 * @param {Object} options - Opciones de conversión
 * @returns {Array} Array de arrays para xlsx
 */
const convertDataToRows = (data, columns, options = {}) => {
    const {
        includeHeaders = true,
        dateFormat = 'YYYY-MM-DD',
        numberFormat = null,
        nullValue = '',
        undefinedValue = ''
    } = options;

    if (!Array.isArray(data)) {
        return [];
    }

    const rows = [];

    // Generar cabeceras si se solicita
    if (includeHeaders && columns && columns.length > 0) {
        const headers = columns.map(col => {
            if (typeof col === 'string') {
                return col;
            } else if (typeof col === 'object') {
                return col.header || col.title || col.label || col.key || col.field || '';
            }
            return '';
        });
        rows.push(headers);
    }

    // Convertir datos
    data.forEach(row => {
        if (!row || typeof row !== 'object') {
            return;
        }

        const xlsxRow = [];

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

                // Convertir valores especiales
                xlsxRow.push(convertValue(value, {
                    dateFormat,
                    numberFormat,
                    nullValue,
                    undefinedValue
                }));
            });
        } else {
            // Sin columnas definidas, usar todas las propiedades del objeto
            Object.values(row).forEach(value => {
                xlsxRow.push(convertValue(value, {
                    dateFormat,
                    numberFormat,
                    nullValue,
                    undefinedValue
                }));
            });
        }

        rows.push(xlsxRow);
    });

    return rows;
};

/**
 * Convierte un valor individual para Excel
 * @param {*} value - Valor a convertir
 * @param {Object} options - Opciones de conversión
 * @returns {*} Valor convertido
 */
const convertValue = (value, options = {}) => {
    const { dateFormat, numberFormat, nullValue, undefinedValue } = options;

    if (value === null) {
        return nullValue;
    }

    if (value === undefined) {
        return undefinedValue;
    }

    if (value instanceof Date) {
        return value; // xlsx maneja las fechas automáticamente
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

    // String y otros tipos
    return String(value);
};

/**
 * Crea una hoja de Excel desde datos
 * @param {Array} data - Datos de la hoja
 * @param {Array} columns - Definición de columnas
 * @param {Object} sheetOptions - Opciones de la hoja
 * @returns {Object} Objeto worksheet de xlsx
 */
const createWorksheet = async (data, columns, sheetOptions = {}) => {
    const XLSX = await getXLSX();

    const {
        sheetName = 'Sheet1',
        autoFitColumns = config.excel.autoFitColumns,
        freezeTopRow = config.excel.freezeTopRow,
        includeHeaders = true,
        ...conversionOptions
    } = sheetOptions;

    // Convertir datos a formato xlsx
    const rows = convertDataToRows(data, columns, {
        includeHeaders,
        ...conversionOptions
    });

    if (rows.length === 0) {
        // Crear hoja vacía
        return XLSX.utils.aoa_to_sheet([]);
    }

    // Crear worksheet desde array of arrays
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Aplicar configuraciones adicionales
    if (autoFitColumns) {
        // Calcular anchos de columna automáticamente
        const columnWidths = calculateColumnWidths(rows, columns);
        worksheet['!cols'] = columnWidths;
    }

    if (freezeTopRow && includeHeaders) {
        // Congelar fila superior (cabeceras)
        worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
    }

    return worksheet;
};

/**
 * Calcula anchos automáticos de columnas
 * @param {Array} rows - Filas de datos
 * @param {Array} columns - Definición de columnas
 * @returns {Array} Array de anchos de columna
 */
const calculateColumnWidths = (rows, columns) => {
    if (!rows || rows.length === 0) {
        return [];
    }

    const columnCount = rows[0].length;
    const widths = [];

    for (let colIndex = 0; colIndex < columnCount; colIndex++) {
        let maxWidth = 10; // Ancho mínimo

        // Revisar todas las filas para esta columna
        rows.forEach(row => {
            const cellValue = row[colIndex];
            if (cellValue !== null && cellValue !== undefined) {
                const cellLength = String(cellValue).length;
                maxWidth = Math.max(maxWidth, cellLength);
            }
        });

        // Aplicar límites razonables
        maxWidth = Math.min(Math.max(maxWidth, 8), 50);

        widths.push({ width: maxWidth });
    }

    return widths;
};

/**
 * Valida los datos antes de la exportación Excel
 * @param {*} input - Datos a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} Resultado de validación
 */
const validateData = (input, options = {}) => {
    const errors = [];
    const warnings = [];

    // Verificar entrada
    if (!input) {
        errors.push('Input data is required');
        return { isValid: false, errors, warnings };
    }

    // Si es un objeto con datasets
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

    // Validar límites de Excel
    const maxRows = 1048576; // Límite de Excel
    const maxColumns = 16384;

    if (input.datasets && Array.isArray(input.datasets)) {
        input.datasets.forEach((dataset, index) => {
            const data = dataset.data || [];
            if (data.length > maxRows) {
                warnings.push(`Dataset ${index} has ${data.length} rows, Excel limit is ${maxRows}`);
            }
        });
    } else {
        const data = Array.isArray(input) ? input : (input.data || []);
        if (data.length > maxRows) {
            warnings.push(`Data has ${data.length} rows, Excel limit is ${maxRows}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Función principal de exportación Excel simple
 * @param {Array|Object} input - Datos o configuración de datasets
 * @param {Object} exportOptions - Opciones de exportación
 * @param {AbortSignal} signal - Señal para cancelar operación
 * @returns {Promise<Blob>} Blob con el archivo Excel
 */
export const exportXLSX = async (input, exportOptions = {}, signal = null) => {
    try {
        // Verificar cancelación
        if (signal?.aborted) {
            throw new Error('Excel export was cancelled');
        }

        const {
            columns = [],
            filename = 'export.xlsx',
            validateInput = true,
            bookType = 'xlsx', // xlsx, xls, csv, etc.
            compression = true,
            ...sheetOptions
        } = exportOptions;

        // Validar entrada si se solicita
        if (validateInput) {
            const validation = validateData(input, exportOptions);
            if (!validation.isValid) {
                throw new Error(`Excel validation failed: ${validation.errors.join(', ')}`);
            }

            // Mostrar warnings en consola
            if (validation.warnings.length > 0) {
                console.warn('Excel export warnings:', validation.warnings);
            }
        }

        // Cargar xlsx
        const XLSX = await getXLSX();

        // Verificar cancelación después de cargar dependencia
        if (signal?.aborted) {
            throw new Error('Excel export was cancelled');
        }

        // Crear workbook
        const workbook = XLSX.utils.book_new();

        // Determinar si son múltiples hojas o una sola
        if (input.datasets && Array.isArray(input.datasets)) {
            // Múltiples hojas
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
                    throw new Error('Excel export was cancelled');
                }

                const finalColumns = datasetColumns.length > 0 ? datasetColumns : columns;
                const worksheet = await createWorksheet(data, finalColumns, {
                    sheetName: name,
                    ...sheetOptions,
                    ...datasetSheetOptions
                });

                // Sanitizar nombre de hoja (Excel tiene restricciones)
                const sanitizedName = name
                    .replace(/[\\\/\?\*\[\]]/g, '_') // Caracteres no válidos
                    .substring(0, 31); // Límite de 31 caracteres

                XLSX.utils.book_append_sheet(workbook, worksheet, sanitizedName);
            }

            // Si no hay datasets, crear hoja vacía
            if (input.datasets.length === 0) {
                const emptySheet = XLSX.utils.aoa_to_sheet([]);
                XLSX.utils.book_append_sheet(workbook, emptySheet, 'Sheet1');
            }

        } else {
            // Hoja única
            const data = Array.isArray(input) ? input : (input.data || []);
            const finalColumns = columns.length > 0 ? columns : (input.columns || []);

            const worksheet = await createWorksheet(data, finalColumns, {
                sheetName: config.excel.defaultSheetName,
                ...sheetOptions
            });

            XLSX.utils.book_append_sheet(workbook, worksheet, config.excel.defaultSheetName);
        }

        // Verificar cancelación antes de generar archivo
        if (signal?.aborted) {
            throw new Error('Excel export was cancelled');
        }

        // Configurar opciones de escritura
        const writeOptions = {
            bookType,
            type: 'array',
            compression
        };

        // Generar archivo
        const arrayBuffer = XLSX.write(workbook, writeOptions);

        // Crear blob
        const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const blob = new Blob([arrayBuffer], { type: mimeType });

        // Agregar propiedades adicionales para compatibilidad
        Object.defineProperties(blob, {
            suggestedFilename: {
                value: filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`,
                writable: false,
                enumerable: false
            },
            exportFormat: {
                value: 'xlsx',
                writable: false,
                enumerable: false
            },
            exportOptions: {
                value: { ...exportOptions },
                writable: false,
                enumerable: false
            },
            sheetsCount: {
                value: workbook.SheetNames.length,
                writable: false,
                enumerable: false
            }
        });

        return blob;

    } catch (error) {
        throw new Error(`Excel export failed: ${error.message}`);
    }
};

/**
 * Función auxiliar para exportar una sola hoja
 * @param {Array} data - Array de objetos
 * @param {Array} columns - Definición de columnas
 * @param {Object} options - Opciones de exportación
 * @returns {Promise<Blob>} Blob con el Excel
 */
export const exportSingleSheet = async (data, columns, options = {}) => {
    return exportXLSX(data, { ...options, columns });
};

/**
 * Función auxiliar para exportar múltiples hojas
 * @param {Array} sheets - Array de hojas { name, data, columns, options }
 * @param {Object} options - Opciones globales
 * @returns {Promise<Blob>} Blob con el Excel multi-hoja
 */
export const exportMultipleSheets = async (sheets, options = {}) => {
    const datasets = sheets.map(sheet => ({
        name: sheet.name || sheet.sheetName,
        data: sheet.data,
        columns: sheet.columns,
        options: sheet.options || sheet.sheetOptions
    }));

    return exportXLSX({ datasets }, options);
};

/**
 * Función auxiliar para exportar con template básico
 * @param {Array} data - Datos a exportar
 * @param {Object} template - Configuración del template
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Blob>} Blob con el Excel formateado
 */
export const exportWithTemplate = async (data, template, options = {}) => {
    const {
        title = '',
        subtitle = '',
        columns = [],
        includeTitle = true,
        includeSummary = false
    } = template;

    // Agregar filas de título si se solicita
    let processedData = [...data];

    if (includeTitle && title) {
        // Insertar filas de título al inicio
        processedData = [
            { [columns[0]?.key || 'title']: title },
            ...(subtitle ? [{ [columns[0]?.key || 'title']: subtitle }] : []),
            {}, // Fila vacía
            ...data
        ];
    }

    if (includeSummary && data.length > 0) {
        // Agregar fila de resumen al final
        const summary = { [columns[0]?.key || 'summary']: `Total: ${data.length} registros` };
        processedData = [...processedData, {}, summary];
    }

    return exportXLSX(processedData, {
        ...options,
        columns,
        includeHeaders: !includeTitle // No duplicar headers si hay título
    });
};

// Exportar objeto con todas las funciones para compatibilidad
export default {
    export: exportXLSX,
    exportSingle: exportSingleSheet,
    exportMultiple: exportMultipleSheets,
    exportWithTemplate,
    validateData,
    createWorksheet,
    convertDataToRows,
    calculateColumnWidths
};