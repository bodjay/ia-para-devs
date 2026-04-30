"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    constructor(name) {
        this.name = name;
    }
    info(message, context) {
        this.write('INFO', message, context);
    }
    warn(message, context) {
        this.write('WARN', message, context);
    }
    error(message, context) {
        this.write('ERROR', message, context);
    }
    write(level, message, context) {
        const entry = {
            level,
            timestamp: new Date().toISOString(),
            logger: this.name,
            message,
            ...context,
        };
        const line = JSON.stringify(entry);
        if (level === 'ERROR' || level === 'WARN') {
            process.stderr.write(line + '\n');
        }
        else {
            process.stdout.write(line + '\n');
        }
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map