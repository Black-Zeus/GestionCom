/**
 * Utilidades para descarga de archivos usando file-saver
 * Maneja diferentes tipos de contenido y navegadores
 */

/**
 * Importa file-saver de forma diferida para optimizar bundle
 * @returns {Promise<Object>} Módulo file-saver
 */
const getFileSaver = async () => {
    try {
        const { saveAs } = await import('file-saver');
        return { saveAs };
    } catch (error) {
        console.error('Error loading file-saver:', error);
        throw new Error('file-saver library is required for downloads. Please install it: npm install file-saver');
    }
};

/**
 * Detecta el tipo MIME basado en la extensión del archivo
 * @param {string} filename - Nombre del archivo
 * @returns {string} Tipo MIME
 */
export const getMimeType = (filename) => {
    if (!filename) return 'application/octet-stream';

    const extension = filename.toLowerCase().split('.').pop();

    const mimeTypes = {
        // Microsoft Office
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'ppt': 'application/vnd.ms-powerpoint',

        // PDF
        'pdf': 'application/pdf',

        // Texto
        'csv': 'text/csv',
        'txt': 'text/plain',
        'json': 'application/json',
        'xml': 'application/xml',
        'html': 'text/html',

        // Imágenes
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',

        // Comprimidos
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',

        // Otros
        'js': 'application/javascript',
        'css': 'text/css'
    };

    return mimeTypes[extension] || 'application/octet-stream';
};

/**
 * Genera un nombre de archivo único agregando timestamp si es necesario
 * @param {string} filename - Nombre base del archivo
 * @param {boolean} addTimestamp - Si agregar timestamp para evitar colisiones
 * @returns {string} Nombre de archivo único
 */
export const generateUniqueFilename = (filename, addTimestamp = false) => {
    if (!filename) {
        const now = new Date();
        return `export_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    }

    if (!addTimestamp) {
        return filename;
    }

    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) {
        return `${filename}_${timestamp}`;
    }

    const name = filename.substring(0, lastDotIndex);
    const extension = filename.substring(lastDotIndex);
    return `${name}_${timestamp}${extension}`;
};

/**
 * Sanitiza el nombre de archivo removiendo caracteres no válidos
 * @param {string} filename - Nombre del archivo a sanitizar
 * @returns {string} Nombre sanitizado
 */
export const sanitizeFilename = (filename) => {
    if (!filename) return 'download';

    // Remover o reemplazar caracteres no válidos en nombres de archivo
    return filename
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Caracteres no válidos
        .replace(/\s+/g, '_') // Espacios múltiples
        .replace(/_{2,}/g, '_') // Guiones bajos múltiples
        .replace(/^_+|_+$/g, '') // Guiones bajos al inicio/final
        .substring(0, 255); // Límite de longitud
};

/**
 * Convierte diferentes tipos de contenido a Blob
 * @param {*} content - Contenido a convertir
 * @param {string} mimeType - Tipo MIME del contenido
 * @returns {Blob} Blob resultante
 */
export const createBlob = (content, mimeType = 'application/octet-stream') => {
    if (content instanceof Blob) {
        return content;
    }

    if (content instanceof ArrayBuffer) {
        return new Blob([content], { type: mimeType });
    }

    if (content instanceof Uint8Array || content instanceof DataView) {
        return new Blob([content], { type: mimeType });
    }

    if (typeof content === 'string') {
        // Para CSV con BOM UTF-8
        if (mimeType === 'text/csv') {
            const BOM = '\uFEFF';
            return new Blob([BOM + content], { type: `${mimeType};charset=utf-8` });
        }
        return new Blob([content], { type: `${mimeType};charset=utf-8` });
    }

    if (typeof content === 'object') {
        const jsonString = JSON.stringify(content, null, 2);
        return new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    }

    throw new Error(`Unsupported content type: ${typeof content}`);
};

/**
 * Descarga un archivo usando file-saver
 * @param {*} content - Contenido del archivo
 * @param {string} filename - Nombre del archivo
 * @param {Object} options - Opciones de descarga
 * @returns {Promise<void>}
 */
export const downloadFile = async (content, filename, options = {}) => {
    const {
        mimeType = null,
        addTimestamp = false,
        sanitize = true,
        fallbackToObjectURL = true
    } = options;

    try {
        // Sanitizar nombre de archivo si se solicita
        let finalFilename = sanitize ? sanitizeFilename(filename) : filename;

        // Generar nombre único si se solicita
        finalFilename = generateUniqueFilename(finalFilename, addTimestamp);

        // Determinar tipo MIME
        const finalMimeType = mimeType || getMimeType(finalFilename);

        // Crear Blob
        const blob = createBlob(content, finalMimeType);

        // Intentar usar file-saver
        try {
            const { saveAs } = await getFileSaver();
            saveAs(blob, finalFilename);
            return;
        } catch (fileSaverError) {
            if (!fallbackToObjectURL) {
                throw fileSaverError;
            }
            console.warn('file-saver failed, falling back to object URL method:', fileSaverError);
        }

        // Fallback: usar Object URL y elemento temporal
        await downloadWithObjectURL(blob, finalFilename);

    } catch (error) {
        console.error('Download failed:', error);
        throw new Error(`Failed to download file: ${error.message}`);
    }
};

/**
 * Descarga usando Object URL (fallback)
 * @param {Blob} blob - Blob a descargar
 * @param {string} filename - Nombre del archivo
 * @returns {Promise<void>}
 */
const downloadWithObjectURL = async (blob, filename) => {
    return new Promise((resolve, reject) => {
        try {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = filename;
            link.style.display = 'none';

            // Agregar al DOM temporalmente
            document.body.appendChild(link);

            // Trigger download
            link.click();

            // Cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                resolve();
            }, 100);

        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Descarga múltiples archivos en secuencia
 * @param {Array} files - Array de objetos {content, filename, options}
 * @param {Object} globalOptions - Opciones globales
 * @returns {Promise<Array>} Resultados de cada descarga
 */
export const downloadMultipleFiles = async (files, globalOptions = {}) => {
    const {
        concurrent = false,
        delay = 500, // Delay entre descargas secuenciales
        onProgress = null
    } = globalOptions;

    const results = [];

    if (concurrent) {
        // Descargas concurrentes
        const promises = files.map(async (file, index) => {
            try {
                await downloadFile(file.content, file.filename, { ...globalOptions, ...file.options });
                const result = { index, success: true, filename: file.filename };
                if (onProgress) onProgress(result, index + 1, files.length);
                return result;
            } catch (error) {
                const result = { index, success: false, filename: file.filename, error: error.message };
                if (onProgress) onProgress(result, index + 1, files.length);
                return result;
            }
        });

        return Promise.all(promises);
    } else {
        // Descargas secuenciales
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                await downloadFile(file.content, file.filename, { ...globalOptions, ...file.options });
                const result = { index: i, success: true, filename: file.filename };
                results.push(result);
                if (onProgress) onProgress(result, i + 1, files.length);

                // Delay entre descargas (excepto la última)
                if (i < files.length - 1 && delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            } catch (error) {
                const result = { index: i, success: false, filename: file.filename, error: error.message };
                results.push(result);
                if (onProgress) onProgress(result, i + 1, files.length);
            }
        }

        return results;
    }
};

/**
 * Convierte un File/Blob a diferentes formatos
 * @param {File|Blob} file - Archivo fuente
 * @param {string} targetFormat - Formato objetivo ('base64', 'arrayBuffer', 'text', 'dataURL')
 * @returns {Promise<*>} Contenido convertido
 */
export const convertFile = async (file, targetFormat) => {
    if (!(file instanceof File) && !(file instanceof Blob)) {
        throw new Error('Input must be a File or Blob');
    }

    switch (targetFormat.toLowerCase()) {
        case 'base64':
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1]; // Remover prefix data:
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

        case 'arraybuffer':
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });

        case 'text':
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsText(file);
            });

        case 'dataurl':
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

        default:
            throw new Error(`Unsupported target format: ${targetFormat}`);
    }
};

/**
 * Valida si el archivo cumple con restricciones
 * @param {File|Blob} file - Archivo a validar
 * @param {Object} constraints - Restricciones
 * @returns {Object} Resultado de validación
 */
export const validateFile = (file, constraints = {}) => {
    const {
        maxSize = Infinity,
        minSize = 0,
        allowedTypes = [],
        allowedExtensions = []
    } = constraints;

    const errors = [];

    // Validar tamaño
    if (file.size > maxSize) {
        errors.push(`File size ${formatFileSize(file.size)} exceeds maximum ${formatFileSize(maxSize)}`);
    }

    if (file.size < minSize) {
        errors.push(`File size ${formatFileSize(file.size)} is below minimum ${formatFileSize(minSize)}`);
    }

    // Validar tipo MIME
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Validar extensión
    if (allowedExtensions.length > 0 && file.name) {
        const extension = file.name.toLowerCase().split('.').pop();
        if (!allowedExtensions.includes(extension)) {
            errors.push(`File extension .${extension} is not allowed. Allowed extensions: ${allowedExtensions.map(ext => `.${ext}`).join(', ')}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Formatea el tamaño de archivo en formato legible
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} Tamaño formateado
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Detecta si el navegador soporta descarga de archivos
 * @returns {Object} Capacidades del navegador
 */
export const getBrowserCapabilities = () => {
    const capabilities = {
        download: false,
        objectURL: false,
        fileSaver: false,
        fileAPI: false
    };

    // Detectar soporte para descargas
    const link = document.createElement('a');
    capabilities.download = 'download' in link;

    // Detectar soporte para Object URL
    capabilities.objectURL = !!(window.URL && window.URL.createObjectURL);

    // Detectar soporte para File API
    capabilities.fileAPI = !!(window.File && window.FileReader && window.FileList && window.Blob);

    return capabilities;
};

export default {
    downloadFile,
    downloadMultipleFiles,
    createBlob,
    getMimeType,
    generateUniqueFilename,
    sanitizeFilename,
    convertFile,
    validateFile,
    formatFileSize,
    getBrowserCapabilities
};