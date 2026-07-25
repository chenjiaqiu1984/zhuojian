/**
 * Node 18 只有 crypto.webcrypto.getRandomValues，
 * Vite 5 会调 crypto.getRandomValues（Node 19+），此处做兼容补丁。
 */
import crypto from 'node:crypto';

function ensureGetRandomValues(target) {
  if (!target || typeof target.getRandomValues === 'function') return;
  if (crypto.webcrypto?.getRandomValues) {
    try {
      Object.defineProperty(target, 'getRandomValues', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: crypto.webcrypto.getRandomValues.bind(crypto.webcrypto),
      });
    } catch {
      try {
        target.getRandomValues = crypto.webcrypto.getRandomValues.bind(crypto.webcrypto);
      } catch {
        /* ignore */
      }
    }
    return;
  }
  const fallback = function getRandomValues(typedArray) {
    if (!typedArray?.BYTES_PER_ELEMENT) {
      throw new TypeError('Expected a TypedArray');
    }
    const bytes = crypto.randomBytes(typedArray.byteLength);
    const view = new Uint8Array(
      typedArray.buffer,
      typedArray.byteOffset,
      typedArray.byteLength
    );
    view.set(bytes);
    return typedArray;
  };
  try {
    Object.defineProperty(target, 'getRandomValues', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: fallback,
    });
  } catch {
    try {
      target.getRandomValues = fallback;
    } catch {
      /* ignore */
    }
  }
}

ensureGetRandomValues(crypto);
if (crypto.webcrypto) ensureGetRandomValues(crypto.webcrypto);
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = crypto.webcrypto || crypto;
} else {
  ensureGetRandomValues(globalThis.crypto);
}
