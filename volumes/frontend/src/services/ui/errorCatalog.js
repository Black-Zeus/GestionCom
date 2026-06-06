import errorCatalog from '@shared/error-catalog.json';

export const getErrorMessageByCode = (code) => {
  if (!code) return '';
  return errorCatalog[String(code)] || '';
};
