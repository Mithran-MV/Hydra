const HEAD = process.env.HEAD_INDEX ? `head-${process.env.HEAD_INDEX}` : "head-?";

function ts(): string {
  return new Date().toISOString().slice(11, 23);
}

export const log = {
  info: (...args: unknown[]) =>
    console.log(`[${ts()}] [${HEAD}]`, ...args),
  warn: (...args: unknown[]) =>
    console.warn(`[${ts()}] [${HEAD}] WARN`, ...args),
  err: (...args: unknown[]) =>
    console.error(`[${ts()}] [${HEAD}] ERR`, ...args),
  debug: (...args: unknown[]) => {
    if (process.env.DEBUG) console.log(`[${ts()}] [${HEAD}] dbg`, ...args);
  },
};
