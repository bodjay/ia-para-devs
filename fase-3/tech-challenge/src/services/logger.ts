function Logger(env: string = process.env.NODE_ENV || "development") {
  console.log({ env: process.env.NODE_ENV });
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