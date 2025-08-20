import { useState, useCallback, useRef } from 'react';

/**
 * Hook personalizado para manejar el contrato de estados uniforme
 * de exportación y descarga sin usar Context.
 * 
 * @param {Object} options - Opciones de configuración
 * @param {Function} options.onStart - Callback al iniciar operación
 * @param {Function} options.onSuccess - Callback al completar exitosamente
 * @param {Function} options.onError - Callback al ocurrir error
 * @param {Function} options.onFinally - Callback al finalizar (siempre)
 * @returns {Object} Estados y funciones para manejar operaciones
 */
export const useExport = (options = {}) => {
    const {
        onStart,
        onSuccess,
        onError,
        onFinally
    } = options;

    // === ESTADOS DEL CONTRATO ===
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [result, setResult] = useState(null);

    // === REFERENCIAS PARA CLEANUP ===
    const abortControllerRef = useRef(null);
    const timeoutRef = useRef(null);

    /**
     * Resetea todos los estados a su valor inicial
     */
    const reset = useCallback(() => {
        setLoading(false);
        setError(null);
        setSuccess(false);
        setResult(null);

        // Limpia recursos pendientes
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    /**
     * Ejecuta una operación asíncrona con manejo de estados
     * 
     * @param {Function} operation - Función asíncrona a ejecutar
     * @param {Object} operationOptions - Opciones específicas de la operación
     * @returns {Promise} Promesa que resuelve con el resultado
     */
    const execute = useCallback(async (operation, operationOptions = {}) => {
        const {
            timeout = 30000,
            abortSignal,
            resetOnStart = true
        } = operationOptions;

        try {
            // Reset estados si se solicita
            if (resetOnStart) {
                reset();
            }

            // Configurar AbortController si no se proporciona signal
            let signal = abortSignal;
            if (!signal) {
                abortControllerRef.current = new AbortController();
                signal = abortControllerRef.current.signal;
            }

            // Configurar timeout
            if (timeout > 0) {
                timeoutRef.current = setTimeout(() => {
                    if (abortControllerRef.current) {
                        abortControllerRef.current.abort('timeout');
                    }
                }, timeout);
            }

            // Iniciar operación
            setLoading(true);
            setError(null);
            setSuccess(false);
            setResult(null);

            // Ejecutar callback onStart
            if (onStart) {
                try {
                    onStart();
                } catch (startError) {
                    console.warn('Error en callback onStart:', startError);
                }
            }

            // Ejecutar operación principal
            const operationResult = await operation(signal);

            // Verificar si fue cancelada
            if (signal?.aborted) {
                throw new Error(signal.reason || 'Operation was cancelled');
            }

            // Limpiar timeout si se completó exitosamente
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            // Actualizar estados de éxito
            setResult(operationResult);
            setSuccess(true);
            setError(null);

            // Ejecutar callback onSuccess
            if (onSuccess) {
                try {
                    onSuccess(operationResult);
                } catch (successError) {
                    console.warn('Error en callback onSuccess:', successError);
                }
            }

            return operationResult;

        } catch (err) {
            // Limpiar timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            const errorMessage = err?.message || 'Unknown error occurred';
            const isAborted = err?.name === 'AbortError' || errorMessage.includes('cancelled');

            // Solo actualizar estados si no fue cancelada deliberadamente
            if (!isAborted) {
                setError(errorMessage);
                setSuccess(false);
                setResult(null);

                // Ejecutar callback onError
                if (onError) {
                    try {
                        onError(errorMessage);
                    } catch (errorCallbackError) {
                        console.warn('Error en callback onError:', errorCallbackError);
                    }
                }
            }

            // Re-lanzar error para que el consumidor pueda manejarlo
            throw err;

        } finally {
            setLoading(false);

            // Limpiar referencias
            abortControllerRef.current = null;

            // Ejecutar callback onFinally con estado actual
            if (onFinally) {
                try {
                    // Usar setTimeout para asegurar que los estados están actualizados
                    setTimeout(() => {
                        const finalState = {
                            loading: false,
                            error: error,
                            success: success,
                            result: result
                        };
                        onFinally(finalState);
                    }, 0);
                } catch (finallyError) {
                    console.warn('Error en callback onFinally:', finallyError);
                }
            }
        }
    }, [onStart, onSuccess, onError, onFinally, reset, error, success, result]);

    /**
     * Cancela la operación en curso
     */
    const cancel = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort('User cancelled');
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        setLoading(false);
    }, []);

    /**
     * Reintenta la última operación ejecutada
     * Útil para casos de error recuperables
     */
    const retry = useCallback((retryOperation, retryOptions) => {
        if (typeof retryOperation === 'function') {
            return execute(retryOperation, retryOptions);
        } else {
            console.warn('Retry called without operation function');
            return Promise.reject(new Error('No operation to retry'));
        }
    }, [execute]);

    // === ESTADO AGREGADO PARA CONVENIENCIA ===
    const isIdle = !loading && !error && !success;
    const hasError = !!error;
    const isComplete = success && !!result;

    // === API PÚBLICA DEL HOOK ===
    return {
        // Estados principales (contrato)
        loading,
        error,
        success,
        result,

        // Estados derivados
        isIdle,
        hasError,
        isComplete,

        // Acciones
        execute,
        cancel,
        retry,
        reset,

        // Para conectar con Zustand si el consumidor lo desea
        getState: () => ({
            loading,
            error,
            success,
            result,
            isIdle,
            hasError,
            isComplete
        }),

        // Para debugging en desarrollo
        __internal: process.env.NODE_ENV === 'development' ? {
            abortController: abortControllerRef.current,
            hasTimeout: !!timeoutRef.current
        } : undefined
    };
};

/**
 * Hook especializado para operaciones de exportación local
 * Extiende useExport con funcionalidades específicas para exportadores
 */
export const useLocalExport = (options = {}) => {
    const baseHook = useExport(options);

    /**
     * Ejecuta exportación con carga diferida de dependencias
     */
    const exportData = useCallback(async (format, data, exportOptions = {}) => {
        return baseHook.execute(async (signal) => {
            // Importar registro de exportadores
            const { getExporter } = await import('./index.js');

            // Obtener exportador específico
            const exporter = await getExporter(format);
            if (!exporter) {
                throw new Error(`Exporter for format '${format}' not found`);
            }

            // Verificar cancelación antes de procesar
            if (signal?.aborted) {
                throw new Error('Export was cancelled');
            }

            // Ejecutar exportación
            const result = await exporter.export(data, exportOptions, signal);

            return result;
        }, exportOptions);
    }, [baseHook]);

    return {
        ...baseHook,
        exportData
    };
};

/**
 * Hook especializado para operaciones de descarga remota
 * Extiende useExport con funcionalidades específicas para descargas HTTP
 */
export const useRemoteDownload = (options = {}) => {
    const baseHook = useExport(options);

    /**
     * Ejecuta descarga remota con reintentos automáticos
     */
    const downloadFile = useCallback(async (url, downloadOptions = {}) => {
        const {
            filename,
            requestInit = {},
            retries = 3,
            retryDelay = 1000,
            timeout = 30000
        } = downloadOptions;

        let lastError;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await baseHook.execute(async (signal) => {
                    // Combinar signal con requestInit
                    const finalRequestInit = {
                        ...requestInit,
                        signal
                    };

                    const response = await fetch(url, finalRequestInit);

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const blob = await response.blob();

                    // Agregar filename como propiedad si se especifica
                    if (filename && blob instanceof Blob) {
                        Object.defineProperty(blob, 'suggestedFilename', {
                            value: filename,
                            writable: false,
                            enumerable: false
                        });
                    }

                    return blob;
                }, { timeout, resetOnStart: attempt === 0 });

            } catch (error) {
                lastError = error;

                // No reintentar si fue cancelada por el usuario
                if (error?.name === 'AbortError' || error?.message?.includes('cancelled')) {
                    throw error;
                }

                // Si no es el último intento, esperar antes de reintentar
                if (attempt < retries) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
                }
            }
        }

        // Si llegamos aquí, todos los intentos fallaron
        throw lastError;
    }, [baseHook]);

    return {
        ...baseHook,
        downloadFile
    };
};

export default useExport;