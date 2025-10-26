// Minimal shim that provides a default export compatible with @supabase/node-fetch
// For web builds we simply forward to the browser's fetch implementation.

if (typeof window === 'undefined' && typeof global !== 'undefined') {
  // In case some environment provides global in non-browser contexts
  global.fetch = global.fetch || require('node-fetch');
}

const fetchShim = (...args) => {
  if (typeof fetch === 'undefined') {
    throw new Error('fetch is not available in this environment.');
  }
  return fetch(...args);
};

module.exports = fetchShim;
module.exports.default = fetchShim;
