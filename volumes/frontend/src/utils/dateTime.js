const hasTimezoneSuffix = (value) => /(?:z|[+-]\d{2}:\d{2})$/i.test(value);

const getHourFormatOptions = (hourFormat, options) => {
  if (options.hour12 !== undefined || options.hourCycle !== undefined) return {};
  if (hourFormat === '12h') return { hour12: true };
  return { hourCycle: 'h23' };
};

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
  const { hourFormat = '24h', ...intlOptions } = options;
  const usesGranularOptions = [
    'weekday',
    'era',
    'year',
    'month',
    'day',
    'hour',
    'minute',
    'second',
    'timeZoneName',
  ].some((key) => intlOptions[key] !== undefined);

  return new Intl.DateTimeFormat('es-CL', {
    ...(usesGranularOptions ? {} : { dateStyle: 'short', timeStyle: 'short' }),
    timeZone: timezone || 'America/Santiago',
    ...getHourFormatOptions(hourFormat, intlOptions),
    ...intlOptions,
  }).format(date);
};
