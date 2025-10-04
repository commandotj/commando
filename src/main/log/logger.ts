import pino, { TransportSingleOptions } from "pino"
import type { Logger } from "../services/engine/shared/loggerTypes"

const isDev = process.env.NODE_ENV !== "production"

const transport: TransportSingleOptions | undefined = isDev
    ? {
          target: "pino-pretty",
          options: {
              colorize: true,
              translateTime: "SYS:standard",
              ignore: "pid,hostname",
          },
      }
    : undefined

const baseLogger = pino({
    level: isDev ? "debug" : "info",
    transport,
    base: undefined,
})

const formatMeta = (meta?: Record<string, unknown>): Record<string, unknown> | undefined =>
    meta && Object.keys(meta).length > 0 ? meta : undefined

const wrap = (method: (obj: unknown, msg?: string) => void) =>
    (message: string, meta?: Record<string, unknown>): void => {
        const formattedMeta = formatMeta(meta)
        if (formattedMeta) {
            method(formattedMeta, message)
        } else {
            method(message)
        }
    }

const logger: Logger = {
    info: wrap(baseLogger.info.bind(baseLogger)),
    error: wrap(baseLogger.error.bind(baseLogger)),
    warn: wrap(baseLogger.warn.bind(baseLogger)),
    debug: wrap(baseLogger.debug.bind(baseLogger)),
}

export default logger
