export declare class Logger {
    private readonly name;
    constructor(name: string);
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, context?: Record<string, unknown>): void;
    private write;
}
//# sourceMappingURL=Logger.d.ts.map