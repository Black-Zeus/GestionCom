import { formatDateTime as formatAppDateTime, parseUtcDate } from './dateTime';

export const parseAppDate = parseUtcDate;

export const formatDateTime = (value, timezone, options) => (
  formatAppDateTime(value, timezone, options)
);

export const formatDate = (value, timezone = 'America/Santiago') => {
  const date = parseUtcDate(value);
  if (!date || Number.isNaN(date.getTime())) return 'Sin registro';

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeZone: timezone,
  }).format(date);
};

export const formatDateMedium = (value, timezone = 'America/Santiago') => {
  const date = parseUtcDate(value);
  if (!date || Number.isNaN(date.getTime())) return 'Sin registro';

  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  }).format(date);
};
