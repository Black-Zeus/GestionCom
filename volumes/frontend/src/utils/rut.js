const cleanRut = (value = '') => String(value).replace(/[^0-9kK]/g, '').toUpperCase();

export const normalizeRutForStorage = (value = '') => {
  const cleaned = cleanRut(value);
  if (cleaned.length < 2) return cleaned;
  return `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}`;
};

export const formatRut = (value = '') => {
  const cleaned = cleanRut(value);
  if (cleaned.length < 2) return cleaned;
  const body = cleaned.slice(0, -1);
  const verifier = cleaned.slice(-1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${verifier}`;
};

export const isValidRut = (value = '') => {
  const cleaned = cleanRut(value);
  if (cleaned.length < 2) return false;

  const body = cleaned.slice(0, -1);
  const expectedDv = cleaned.slice(-1);
  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;

  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  const calculatedDv = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return calculatedDv === expectedDv;
};

export const validateRutMessage = (value = '') => {
  if (!String(value).trim()) return '';
  return isValidRut(value) ? '' : 'Ingresa un RUT valido.';
};
