const hasTimezoneSuffix = (value) => /(?:z|[+-]\d{2}:\d{2})$/i.test(value);

export const parseUtcDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return new Date(value);

  return new Date(hasTimezoneSuffix(value) ? value : `${value}Z`);
};

export const formatDateTime = (
  value,
  timezone,
  options = {}
) => {
  const date = parseUtcDate(value);
  if (!date || Number.isNaN(date.getTime())) return 'Sin registro';

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: timezone || 'America/Santiago',
    ...options,
  }).format(date);
};
