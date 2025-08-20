/**
 * Utilidades para manejo de imágenes y logos de branding
 * Soporta carga, redimensionado y conversión para exportadores
 */

/**
 * Cache en memoria para imágenes cargadas
 */
const imageCache = new Map();

/**
 * Limpia el cache de imágenes
 */
export const clearImageCache = () => {
    imageCache.clear();
};

/**
 * Carga una imagen desde URL, data URL o archivo
 * @param {string|File|Blob} source - Fuente de la imagen
 * @param {Object} options - Opciones de carga
 * @returns {Promise<HTMLImageElement>} Imagen cargada
 */
export const loadImage = async (source, options = {}) => {
    const {
        useCache = true,
        timeout = 10000,
        crossOrigin = null
    } = options;

    // Generar clave de cache
    const cacheKey = typeof source === 'string' ? source : `blob_${Date.now()}`;

    // Verificar cache
    if (useCache && imageCache.has(cacheKey)) {
        return imageCache.get(cacheKey);
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        let timeoutId;

        // Configurar timeout
        if (timeout > 0) {
            timeoutId = setTimeout(() => {
                img.src = '';
                reject(new Error(`Image load timeout after ${timeout}ms`));
            }, timeout);
        }

        // Configurar cross-origin si es necesario
        if (crossOrigin) {
            img.crossOrigin = crossOrigin;
        }

        img.onload = () => {
            if (timeoutId) clearTimeout(timeoutId);

            // Guardar en cache
            if (useCache) {
                imageCache.set(cacheKey, img);
            }

            resolve(img);
        };

        img.onerror = (error) => {
            if (timeoutId) clearTimeout(timeoutId);
            reject(new Error(`Failed to load image: ${error.message || 'Unknown error'}`));
        };

        // Configurar fuente
        if (typeof source === 'string') {
            // URL o data URL
            img.src = source;
        } else if (source instanceof File || source instanceof Blob) {
            // Archivo o Blob
            const url = URL.createObjectURL(source);
            img.src = url;

            // Cleanup del Object URL después de cargar
            img.onload = (originalOnLoad => function (...args) {
                URL.revokeObjectURL(url);
                return originalOnLoad.apply(this, args);
            })(img.onload);

            img.onerror = (originalOnError => function (...args) {
                URL.revokeObjectURL(url);
                return originalOnError.apply(this, args);
            })(img.onerror);
        } else {
            reject(new Error('Invalid image source type'));
        }
    });
};

/**
 * Redimensiona una imagen manteniendo proporciones
 * @param {HTMLImageElement} img - Imagen fuente
 * @param {Object} dimensions - Dimensiones objetivo
 * @returns {Promise<HTMLCanvasElement>} Canvas con imagen redimensionada
 */
export const resizeImage = async (img, dimensions = {}) => {
    const {
        maxWidth = null,
        maxHeight = null,
        width = null,
        height = null,
        quality = 0.9,
        maintainAspectRatio = true,
        fitMode = 'contain' // 'contain', 'cover', 'fill'
    } = dimensions;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let targetWidth = width || img.naturalWidth;
    let targetHeight = height || img.naturalHeight;

    // Aplicar restricciones de tamaño máximo
    if (maxWidth && targetWidth > maxWidth) {
        if (maintainAspectRatio) {
            targetHeight = (targetHeight * maxWidth) / targetWidth;
        }
        targetWidth = maxWidth;
    }

    if (maxHeight && targetHeight > maxHeight) {
        if (maintainAspectRatio) {
            targetWidth = (targetWidth * maxHeight) / targetHeight;
        }
        targetHeight = maxHeight;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Calcular dimensiones según fit mode
    let drawWidth = targetWidth;
    let drawHeight = targetHeight;
    let drawX = 0;
    let drawY = 0;

    if (maintainAspectRatio && fitMode !== 'fill') {
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const canvasAspect = targetWidth / targetHeight;

        if (fitMode === 'contain') {
            if (imgAspect > canvasAspect) {
                // Imagen más ancha, ajustar por ancho
                drawWidth = targetWidth;
                drawHeight = targetWidth / imgAspect;
                drawY = (targetHeight - drawHeight) / 2;
            } else {
                // Imagen más alta, ajustar por alto
                drawHeight = targetHeight;
                drawWidth = targetHeight * imgAspect;
                drawX = (targetWidth - drawWidth) / 2;
            }
        } else if (fitMode === 'cover') {
            if (imgAspect > canvasAspect) {
                // Imagen más ancha, ajustar por alto
                drawHeight = targetHeight;
                drawWidth = targetHeight * imgAspect;
                drawX = (targetWidth - drawWidth) / 2;
            } else {
                // Imagen más alta, ajustar por ancho
                drawWidth = targetWidth;
                drawHeight = targetWidth / imgAspect;
                drawY = (targetHeight - drawHeight) / 2;
            }
        }
    }

    // Limpiar canvas con fondo transparente
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    // Dibujar imagen
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    return canvas;
};

/**
 * Convierte canvas a diferentes formatos
 * @param {HTMLCanvasElement} canvas - Canvas fuente
 * @param {Object} options - Opciones de conversión
 * @returns {Promise<*>} Resultado en el formato solicitado
 */
export const convertCanvas = async (canvas, options = {}) => {
    const {
        format = 'blob', // 'blob', 'dataURL', 'base64', 'arrayBuffer'
        mimeType = 'image/png',
        quality = 0.9
    } = options;

    switch (format.toLowerCase()) {
        case 'blob':
            return new Promise((resolve, reject) => {
                canvas.toBlob(resolve, mimeType, quality);
            });

        case 'dataurl':
            return canvas.toDataURL(mimeType, quality);

        case 'base64':
            const dataURL = canvas.toDataURL(mimeType, quality);
            return dataURL.split(',')[1]; // Remover prefijo data:

        case 'arraybuffer':
            const blob = await new Promise((resolve) => {
                canvas.toBlob(resolve, mimeType, quality);
            });
            return blob.arrayBuffer();

        default:
            throw new Error(`Unsupported format: ${format}`);
    }
};

/**
 * Procesa imagen para branding corporativo
 * @param {string|File|Blob} logoSource - Fuente del logo
 * @param {Object} brandingOptions - Opciones de branding
 * @returns {Promise<Object>} Logo procesado con metadatos
 */
export const processLogo = async (logoSource, brandingOptions = {}) => {
    const {
        maxWidth = 150,
        maxHeight = 50,
        format = 'png',
        quality = 0.9,
        backgroundColor = null, // Para logos sin transparencia
        position = 'left', // 'left', 'center', 'right'
        padding = 10
    } = brandingOptions;

    try {
        // Cargar imagen original
        const img = await loadImage(logoSource);

        // Redimensionar manteniendo proporciones
        const canvas = await resizeImage(img, {
            maxWidth,
            maxHeight,
            maintainAspectRatio: true,
            fitMode: 'contain'
        });

        // Aplicar fondo si se especifica
        if (backgroundColor) {
            const ctx = canvas.getContext('2d');
            const newCanvas = document.createElement('canvas');
            const newCtx = newCanvas.getContext('2d');

            newCanvas.width = canvas.width;
            newCanvas.height = canvas.height;

            // Dibujar fondo
            newCtx.fillStyle = backgroundColor;
            newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);

            // Dibujar logo encima
            newCtx.drawImage(canvas, 0, 0);

            // Reemplazar canvas
            canvas.width = newCanvas.width;
            canvas.height = newCanvas.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(newCanvas, 0, 0);
        }

        // Convertir a formato requerido
        const mimeType = `image/${format.toLowerCase()}`;
        const result = await convertCanvas(canvas, {
            format: 'blob',
            mimeType,
            quality
        });

        return {
            blob: result,
            width: canvas.width,
            height: canvas.height,
            aspectRatio: canvas.width / canvas.height,
            position,
            padding,
            mimeType,
            dataURL: await convertCanvas(canvas, { format: 'dataURL', mimeType, quality }),
            base64: await convertCanvas(canvas, { format: 'base64', mimeType, quality })
        };

    } catch (error) {
        throw new Error(`Failed to process logo: ${error.message}`);
    }
};

/**
 * Crea watermark para documentos PDF
 * @param {string} text - Texto del watermark
 * @param {Object} options - Opciones del watermark
 * @returns {Promise<Object>} Watermark procesado
 */
export const createWatermark = async (text, options = {}) => {
    const {
        fontSize = 48,
        fontFamily = 'Arial',
        color = 'rgba(0, 0, 0, 0.1)',
        angle = -45,
        width = 400,
        height = 200
    } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    // Configurar fuente
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Rotar canvas
    ctx.translate(width / 2, height / 2);
    ctx.rotate((angle * Math.PI) / 180);

    // Dibujar texto
    ctx.fillText(text, 0, 0);

    // Convertir a formatos útiles
    const blob = await convertCanvas(canvas, { format: 'blob' });
    const dataURL = await convertCanvas(canvas, { format: 'dataURL' });
    const base64 = await convertCanvas(canvas, { format: 'base64' });

    return {
        blob,
        dataURL,
        base64,
        width,
        height,
        text,
        options
    };
};

/**
 * Valida si una imagen cumple con restricciones
 * @param {HTMLImageElement} img - Imagen a validar
 * @param {Object} constraints - Restricciones
 * @returns {Object} Resultado de validación
 */
export const validateImage = (img, constraints = {}) => {
    const {
        minWidth = 0,
        maxWidth = Infinity,
        minHeight = 0,
        maxHeight = Infinity,
        minAspectRatio = 0,
        maxAspectRatio = Infinity,
        allowedFormats = []
    } = constraints;

    const errors = [];
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const aspectRatio = width / height;

    // Validar dimensiones
    if (width < minWidth) {
        errors.push(`Image width ${width}px is below minimum ${minWidth}px`);
    }

    if (width > maxWidth) {
        errors.push(`Image width ${width}px exceeds maximum ${maxWidth}px`);
    }

    if (height < minHeight) {
        errors.push(`Image height ${height}px is below minimum ${minHeight}px`);
    }

    if (height > maxHeight) {
        errors.push(`Image height ${height}px exceeds maximum ${maxHeight}px`);
    }

    // Validar aspect ratio
    if (aspectRatio < minAspectRatio) {
        errors.push(`Image aspect ratio ${aspectRatio.toFixed(2)} is below minimum ${minAspectRatio}`);
    }

    if (aspectRatio > maxAspectRatio) {
        errors.push(`Image aspect ratio ${aspectRatio.toFixed(2)} exceeds maximum ${maxAspectRatio}`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        dimensions: { width, height, aspectRatio }
    };
};

/**
 * Detecta el formato de imagen desde data URL o blob
 * @param {string|Blob} source - Fuente de la imagen
 * @returns {Promise<string>} Formato detectado
 */
export const detectImageFormat = async (source) => {
    if (typeof source === 'string') {
        // Data URL
        if (source.startsWith('data:image/')) {
            const match = source.match(/data:image\/([^;]+)/);
            return match ? match[1] : 'unknown';
        }
        return 'unknown';
    }

    if (source instanceof Blob) {
        // Leer los primeros bytes para detectar signature
        const arrayBuffer = await source.slice(0, 12).arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        // PNG: 89 50 4E 47
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
            return 'png';
        }

        // JPEG: FF D8 FF
        if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
            return 'jpeg';
        }

        // GIF: 47 49 46 38
        if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
            return 'gif';
        }

        // WebP: 52 49 46 46 ... 57 45 42 50
        if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
            bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
            return 'webp';
        }

        // SVG (buscar '<svg' en texto)
        if (source.type === 'image/svg+xml') {
            return 'svg';
        }
    }

    return 'unknown';
};

/**
 * Extrae metadatos de imagen
 * @param {HTMLImageElement} img - Imagen
 * @returns {Object} Metadatos extraídos
 */
export const extractImageMetadata = (img) => {
    return {
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
        src: img.src,
        complete: img.complete,
        crossOrigin: img.crossOrigin,
        currentSrc: img.currentSrc
    };
};

/**
 * Genera placeholder para logos faltantes
 * @param {Object} options - Opciones del placeholder
 * @returns {Promise<Object>} Placeholder generado
 */
export const generateLogoPlaceholder = async (options = {}) => {
    const {
        width = 150,
        height = 50,
        backgroundColor = '#f3f4f6',
        textColor = '#6b7280',
        text = 'LOGO',
        fontSize = 16
    } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    // Fondo
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Borde
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    // Texto
    ctx.fillStyle = textColor;
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);

    const blob = await convertCanvas(canvas, { format: 'blob' });
    const dataURL = await convertCanvas(canvas, { format: 'dataURL' });
    const base64 = await convertCanvas(canvas, { format: 'base64' });

    return {
        blob,
        dataURL,
        base64,
        width,
        height,
        isPlaceholder: true
    };
};

export default {
    loadImage,
    resizeImage,
    convertCanvas,
    processLogo,
    createWatermark,
    validateImage,
    detectImageFormat,
    extractImageMetadata,
    generateLogoPlaceholder,
    clearImageCache
};