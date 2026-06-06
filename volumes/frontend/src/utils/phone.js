const cleanPhone = (value = '') => String(value).replace(/[^\d+]/g, '');
const onlyDigits = (value = '') => String(value).replace(/\D/g, '');

export const normalizePhoneForStorage = (value = '') => String(value ?? '')
  .trim()
  .replace(/[\s-]/g, '');

export const isValidPhoneForStorage = (value = '') => {
  const normalized = normalizePhoneForStorage(value);
  if (!normalized) return true;
  if (!/^\+?\d+$/.test(normalized)) return false;
  if (normalized.includes('+') && !normalized.startsWith('+')) return false;
  return onlyDigits(normalized).length >= 8 && normalized.length <= 20;
};

const groupFromRight = (digits = '') => {
  const groups = [];
  for (let index = digits.length; index > 0; index -= 4) {
    groups.unshift(digits.slice(Math.max(0, index - 4), index));
  }
  return groups.join('-');
};

export const formatPhone = (value = '') => {
  const raw = cleanPhone(value);
  const digits = onlyDigits(raw);
  if (!digits) return '';

  const chileDigits = digits.startsWith('56') ? digits.slice(2) : digits;
  if ((digits.startsWith('56') || raw.startsWith('+56')) && chileDigits.length === 9) {
    return `+56 ${chileDigits.slice(0, 1)} ${chileDigits.slice(1, 5)}-${chileDigits.slice(5)}`;
  }

  const prefix = raw.startsWith('+') ? '+' : '';
  return `${prefix}${groupFromRight(digits)}`;
};

export const validatePhoneMessage = (value = '') => {
  if (!String(value).trim()) return '';
  if (!isValidPhoneForStorage(value)) return 'Ingresa un telefono valido.';
  return '';
};
