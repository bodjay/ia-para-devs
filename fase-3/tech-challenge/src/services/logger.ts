/**
 * @description Simple logger service for development environment. If production, it disables logging.
 * @param env 
 * @returns 
 * @example
 * ```ts
 * import logger from "./services/logger.js";
 * 
 * logger.info("This is an info message");
 * logger.error("This is an error message");
 * ```
 */
function Logger(env: string = process.env.NODE_ENV || "development") {
  const info = (message: string, ...optionalParams: any[]) => {
    enabled() && console.log(`[Logger:info] ${message}`, ...optionalParams);
  }

  const error = (message: string, ...optionalParams: any[]) => {
    console.error(`[Logger:error] ${message}`, ...optionalParams);
  }

  const enabled = () => {
    if (env === "development") return true;
  }

  return {
    info,
    error,
  };
}

export default Logger();