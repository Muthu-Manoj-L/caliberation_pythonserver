/**
 * Application Configuration
 * 
 * Centralized configuration for the spectral analysis app.
 * Update PYTHON_SERVER_URL to match your local network IP.
 */

// Python server configuration
// For development: Use your local network IP (check Python server output)
// For production: This will be replaced by the native Chaquopy module
export const PYTHON_SERVER_URL = 'http://192.168.1.48:5000';

export const PYTHON_SERVER_ENDPOINTS = {
  health: `${PYTHON_SERVER_URL}/health`,
  process: `${PYTHON_SERVER_URL}/process`,
  processFile: `${PYTHON_SERVER_URL}/process-file`,
};

// API timeouts (in milliseconds)
export const TIMEOUTS = {
  healthCheck: 5000,
  imageProcessing: 30000,
};

// Feature flags
export const FEATURES = {
  useNativeProcessing: true, // Try native module first if available
  fallbackToHTTP: true,      // Fall back to HTTP server if native unavailable
  offlineMode: false,        // Use JavaScript fallback if both unavailable
};
