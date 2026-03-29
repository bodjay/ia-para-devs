import '@testing-library/jest-dom';
import { webcrypto } from 'node:crypto';

Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  writable: true,
  configurable: true,
});

if (typeof globalThis.fetch === 'undefined') {
  const { default: fetchPolyfill, Request, Response, Headers } = require('node-fetch');
  globalThis.fetch = fetchPolyfill;
  globalThis.Request = Request;
  globalThis.Response = Response;
  globalThis.Headers = Headers;
}

window.HTMLElement.prototype.scrollIntoView = jest.fn();
