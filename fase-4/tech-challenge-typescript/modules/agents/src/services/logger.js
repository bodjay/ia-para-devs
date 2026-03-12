"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
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
function Logger(env) {
    if (env === void 0) { env = process.env.NODE_ENV || "development"; }
    var info = function (message) {
        var optionalParams = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            optionalParams[_i - 1] = arguments[_i];
        }
        enabled() && console.log.apply(console, __spreadArray(["[Logger:info] ".concat(message)], optionalParams, false));
    };
    var error = function (message) {
        var optionalParams = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            optionalParams[_i - 1] = arguments[_i];
        }
        console.error.apply(console, __spreadArray(["[Logger:error] ".concat(message)], optionalParams, false));
    };
    var warn = function (message) {
        var optionalParams = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            optionalParams[_i - 1] = arguments[_i];
        }
        console.warn.apply(console, __spreadArray(["[Logger:warn] ".concat(message)], optionalParams, false));
    };
    var enabled = function () {
        if (env === "development")
            return true;
    };
    return {
        info: info,
        error: error,
        warn: warn,
    };
}
exports.default = Logger();
