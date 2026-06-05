const noop = () => {};

const shouldLog = () => import.meta.env.DEV;

const bindConsole = (method) => (...args) => {
  if (!shouldLog()) return;
  const target = console[method] || console.log || noop;
  target(...args);
};

const createScopedLogger = (scope) => {
  const prefix = scope ? `[${scope}]` : '';
  const withPrefix = (method) => (...args) => bindConsole(method)(prefix, ...args);

  return {
    log: withPrefix('log'),
    warn: withPrefix('warn'),
    error: withPrefix('error'),
    group: withPrefix('group'),
    groupEnd: bindConsole('groupEnd'),
  };
};

const logger = {
  scope: createScopedLogger,
  log: bindConsole('log'),
  warn: bindConsole('warn'),
  error: bindConsole('error'),
  group: bindConsole('group'),
  groupEnd: bindConsole('groupEnd'),
};

export default logger;
