/**
 * Native Spectral Processor Interface
 * 
 * This module provides a TypeScript interface to the native Chaquopy Python bridge.
 * It allows calling Python spectral analysis directly from React Native in production builds.
 * 
 * PRODUCTION READY: Works in standalone APK builds without HTTP server.
 */

import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'SpectralProcessor' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const SpectralProcessor = NativeModules.SpectralProcessor
  ? NativeModules.SpectralProcessor
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export interface PythonProcessResult {
  success: boolean;
  timestamp: number;
  image_info: {
    width: number;
    height: number;
    circle: {
      center_x: number;
      center_y: number;
      radius: number;
    };
  };
  color_samples: Array<{
    angle: number;
    rgb: { r: number; g: number; b: number };
    hsv: { h: number; s: number; v: number };
    estimated_wavelength: number;
    position: { x: number; y: number };
  }>;
  spectral_response: { [wavelength: number]: number };
  statistics: {
    num_samples: number;
    num_correction_factors: number;
    wavelength_range: [number, number];
    avg_correction_factor: number;
  };
  error?: string;
  error_type?: string;
}

export interface PythonInfo {
  pythonVersion: string;
  isStarted: boolean;
  spectralProcessorAvailable: boolean;
  moduleError?: string;
}

/**
 * Process an image using native Python + OpenCV
 * 
 * This runs your spectral_processor.py Python code directly inside the app
 * using Chaquopy. Works offline, no server needed.
 * 
 * @param imagePath Absolute file path to the image
 * @returns Promise with spectral analysis results
 * 
 * @example
 * ```typescript
 * const result = await processImageNative('/path/to/image.jpg');
 * console.log('Circle center:', result.image_info.circle);
 * console.log('Color samples:', result.color_samples);
 * console.log('Spectral response:', result.spectral_response);
 * ```
 */
export async function processImageNative(
  imagePath: string
): Promise<PythonProcessResult> {
  if (Platform.OS !== 'android') {
    throw new Error(
      'Native Python processing is only available on Android (Chaquopy). ' +
      'For iOS, use the HTTP server approach during development or implement OpenCV.js.'
    );
  }

  try {
    console.log('[Native] Processing image:', imagePath);
    const result = await SpectralProcessor.processImage(imagePath);
    console.log('[Native] Processing complete');
    return result;
  } catch (error: any) {
    console.error('[Native] Processing error:', error);
    throw new Error(`Native processing failed: ${error.message}`);
  }
}

/**
 * Get Python environment information
 * Useful for debugging and verifying the setup
 * 
 * @returns Python version, module availability, etc.
 * 
 * @example
 * ```typescript
 * const info = await getPythonInfo();
 * console.log('Python version:', info.pythonVersion);
 * console.log('Module available:', info.spectralProcessorAvailable);
 * ```
 */
export async function getPythonInfo(): Promise<PythonInfo> {
  if (Platform.OS !== 'android') {
    throw new Error('Native Python is only available on Android');
  }

  try {
    const info = await SpectralProcessor.getPythonInfo();
    return info;
  } catch (error: any) {
    throw new Error(`Failed to get Python info: ${error.message}`);
  }
}

/**
 * Check if a Python package is installed
 * 
 * @param packageName Name of the Python package (e.g., 'cv2', 'numpy')
 * @returns True if package is installed
 * 
 * @example
 * ```typescript
 * const hasOpenCV = await checkPythonPackage('cv2');
 * const hasNumpy = await checkPythonPackage('numpy');
 * ```
 */
export async function checkPythonPackage(packageName: string): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    return await SpectralProcessor.checkPackage(packageName);
  } catch (error) {
    return false;
  }
}

/**
 * Check if native Python processing is available
 * 
 * @returns True if running on Android with native module
 */
export function isNativeProcessingAvailable(): boolean {
  return Platform.OS === 'android' && !!NativeModules.SpectralProcessor;
}

/**
 * Verify the native module and Python environment are ready
 * 
 * @throws Error if setup is incomplete
 * 
 * @example
 * ```typescript
 * try {
 *   await verifyNativeSetup();
 *   console.log('Native processing ready!');
 * } catch (error) {
 *   console.error('Setup issue:', error.message);
 * }
 * ```
 */
export async function verifyNativeSetup(): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('Native processing only available on Android');
  }

  if (!NativeModules.SpectralProcessor) {
    throw new Error('SpectralProcessor native module not found. Did you rebuild the app?');
  }

  const info = await getPythonInfo();
  
  if (!info.isStarted) {
    throw new Error('Python interpreter failed to start');
  }

  if (!info.spectralProcessorAvailable) {
    throw new Error(
      `spectral_processor module not found. Error: ${info.moduleError || 'Unknown'}`
    );
  }

  // Check required packages
  const hasCV2 = await checkPythonPackage('cv2');
  const hasNumpy = await checkPythonPackage('numpy');
  const hasPIL = await checkPythonPackage('PIL');

  if (!hasCV2) {
    throw new Error('OpenCV (cv2) not installed in Python environment');
  }

  if (!hasNumpy) {
    throw new Error('NumPy not installed in Python environment');
  }

  if (!hasPIL) {
    throw new Error('Pillow (PIL) not installed in Python environment');
  }

  console.log('[Native] ✅ All checks passed!');
  console.log('[Native] Python version:', info.pythonVersion);
  console.log('[Native] OpenCV: installed');
  console.log('[Native] NumPy: installed');
  console.log('[Native] Pillow: installed');
}

export default {
  processImageNative,
  getPythonInfo,
  checkPythonPackage,
  isNativeProcessingAvailable,
  verifyNativeSetup,
};
