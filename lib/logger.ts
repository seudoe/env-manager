const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function timestamp(): string {
  return new Date().toISOString();
}

function format(level: string, color: string, scope: string, message: string, meta?: Record<string, unknown>): string {
  const metaStr = meta ? ` ${COLORS.dim}${JSON.stringify(meta)}${COLORS.reset}` : "";
  return `${COLORS.dim}[${timestamp()}]${COLORS.reset} ${color}${level}${COLORS.reset} ${COLORS.cyan}[${scope}]${COLORS.reset} ${message}${metaStr}`;
}

export const logger = {
  info(scope: string, message: string, meta?: Record<string, unknown>) {
    console.log(format("INFO ", COLORS.green, scope, message, meta));
  },
  warn(scope: string, message: string, meta?: Record<string, unknown>) {
    console.warn(format("WARN ", COLORS.yellow, scope, message, meta));
  },
  error(scope: string, message: string, meta?: Record<string, unknown>) {
    console.error(format("ERROR", COLORS.red, scope, message, meta));
  },
  debug(scope: string, message: string, meta?: Record<string, unknown>) {
    console.log(format("DEBUG", COLORS.magenta, scope, message, meta));
  },
};
