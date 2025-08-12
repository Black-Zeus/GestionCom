// /utils/formats.js

/**
 * Formatea un número como moneda CLP sin decimales
 */
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(amount);
};

/**
 * Formatea fecha tipo YYYY-MM-DD a formato local
 */
export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL');
};

/**
 * Formatea un número grande con notación compacta (e.g. 1.5K)
 */
export const formatNumberCompact = (value) => {
    return new Intl.NumberFormat('es-CL', {
        notation: 'compact',
        compactDisplay: 'short',
    }).format(value);
};
