/**
 * Unified Spectral Processing Interface
 * 
 * This module provides a single API that works in both development and production:
 * - Development: Uses HTTP server (fast iteration)
 * - Production: Uses native Chaquopy Python (bundled in APK)
 * 
 * The API automatically detects the environment and uses the appropriate backend.
 */

import { Platform } from 'react-native';
import { processImageNative, isNativeProcessingAvailable, verifyNativeSetup } from './spectralProcessorNative';
import { processWithPythonServer, checkPythonAvailable } from './pythonBridge';

export interface SpectralProcessingResult {
  success: boolean;
  timestamp: number;
  method: 'native' | 'http' | 'fallback';
  image_info: {
    width: number;
    height: number;
    circle?: {
      center_x: number;
      center_y: number;
      radius: number;
    };
  };
  // Legacy RGB circle fields
  color_samples?: Array<{
    angle: number;
    rgb: { r: number; g: number; b: number };
    hsv: { h: number; s: number; v: number };
    estimated_wavelength: number;
    position: { x: number; y: number };
  }>;
  // New 6-color calibration fields
  color_regions?: {
    [colorName: string]: {
      wavelength: number;
      rgb: { r: number; g: number; b: number };
      bgr: { b: number; g: number; r: number };
      center: { x: number; y: number };
      area: number;
      bbox: { x: number; y: number; width: number; height: number };
    };
  };
  black_corners?: any;
  baseline?: { r: number; g: number; b: number };
  raw_intensities?: any;
  corrected_intensities?: any;
  correction_curves?: {
    polynomial?: any;
    data_points?: {
      wavelengths: number[];
      r_corrections: number[];
      g_corrections: number[];
      b_corrections: number[];
    };
    raw_normalized?: any;
    final_corrected?: any;
    reference_values?: any;
  };
  spectral_response?: { [wavelength: number]: number };
  statistics?: {
    num_samples?: number;
    num_correction_factors?: number;
    wavelength_range?: [number, number];
    avg_correction_factor?: number;
    num_colors_detected?: number;
    num_black_corners?: number;
  };
  mode?: string;
  num_colors_detected?: number;
  message?: string;
  error?: string;
  error_type?: string;
}

/**
 * Process an image with automatic backend selection
 * 
 * Automatically chooses the best processing method:
 * 1. Native (production APK on Android)
 * 2. HTTP server (development)
 * 
 * @param imageUri URI or path to the image
 * @returns Processing results with method indicator
 * 
 * @example
 * ```typescript
 * const result = await processSpectralImage(imageUri);
 * console.log('Processed using:', result.method); // 'native' or 'http'
 * console.log('Circle detected:', result.image_info.circle);
 * console.log('Spectral response:', result.spectral_response);
 * ```
 */
export async function processSpectralImage(
  imageUri: string
): Promise<SpectralProcessingResult> {
  
  console.log('[Spectral] Processing image:', imageUri);
  console.log('[Spectral] Platform:', Platform.OS);
  console.log('[Spectral] Native available:', isNativeProcessingAvailable());
  
  // TEMP: Skip native processing - use HTTP server only
  // TODO: Re-enable when Chaquopy is properly integrated
  // if (isNativeProcessingAvailable()) {
  //   try {
  //     console.log('[Spectral] Using native Python processing (Chaquopy)');
  //     const result = await processImageNative(imageUri);
  //     return {
  //       ...result,
  //       method: 'native',
  //     };
  //   } catch (error: any) {
  //     console.warn('[Spectral] Native processing failed:', error.message);
  //     console.log('[Spectral] Falling back to HTTP server');
  //     // Fall through to HTTP server
  //   }
  // }
  
  // Try HTTP server (development builds)
  try {
    console.log('[Spectral] Using HTTP server processing');
    const serverCheck = await checkPythonAvailable();
    
    if (!serverCheck.available) {
      throw new Error(serverCheck.message);
    }
    
    const result = await processWithPythonServer(imageUri);
    return {
      ...result,
      method: 'http',
    };
  } catch (error: any) {
    console.error('[Spectral] HTTP server processing failed:', error.message);
    
    throw new Error(
      'Spectral processing unavailable. ' +
      (Platform.OS === 'android' 
        ? 'Make sure the app is built with Chaquopy or start the Python server.' 
        : 'Please start the Python HTTP server: python python/spectral_server.py')
    );
  }
}

/**
 * Check which processing method is available
 * 
 * @returns Information about available processing methods
 */
export async function getAvailableProcessingMethods(): Promise<{
  native: boolean;
  http: boolean;
  recommended: 'native' | 'http' | 'none';
}> {
  const native = isNativeProcessingAvailable();
  
  let http = false;
  try {
    const serverCheck = await checkPythonAvailable();
    http = serverCheck.available;
  } catch {
    http = false;
  }
  
  const recommended = native ? 'native' : http ? 'http' : 'none';
  
  return { native, http, recommended };
}

/**
 * Verify the processing setup
 * 
 * Checks if at least one processing method is available and working
 * 
 * @throws Error if no processing method is available
 */
export async function verifyProcessingSetup(): Promise<void> {
  const methods = await getAvailableProcessingMethods();
  
  if (!methods.native && !methods.http) {
    throw new Error(
      'No spectral processing method available!\n\n' +
      'For development: Start the Python server (python python/spectral_server.py)\n' +
      'For production: Build the app with native Python (Chaquopy)'
    );
  }
  
  console.log('[Spectral] Setup verification:');
  console.log('  Native processing:', methods.native ? '✅' : '❌');
  console.log('  HTTP server:', methods.http ? '✅' : '❌');
  console.log('  Recommended:', methods.recommended);
  
  // If native is available, verify it's working
  if (methods.native) {
    try {
      await verifyNativeSetup();
    } catch (error: any) {
      console.warn('[Spectral] Native setup issues:', error.message);
    }
  }
}

/**
 * Get diagnostic information about the processing environment
 * 
 * Useful for debugging and support
 */
export async function getDiagnostics(): Promise<{
  platform: string;
  nativeAvailable: boolean;
  httpAvailable: boolean;
  recommendedMethod: string;
  errors: string[];
}> {
  const errors: string[] = [];
  const methods = await getAvailableProcessingMethods();
  
  // Try to get more details about native setup
  if (methods.native) {
    try {
      await verifyNativeSetup();
    } catch (error: any) {
      errors.push(`Native setup: ${error.message}`);
    }
  }
  
  // Try to get more details about HTTP server
  if (!methods.http) {
    try {
      const check = await checkPythonAvailable();
      if (!check.available) {
        errors.push(`HTTP server: ${check.message}`);
      }
    } catch (error: any) {
      errors.push(`HTTP server: ${error.message}`);
    }
  }
  
  return {
    platform: Platform.OS,
    nativeAvailable: methods.native,
    httpAvailable: methods.http,
    recommendedMethod: methods.recommended,
    errors,
  };
}

export default {
  processSpectralImage,
  getAvailableProcessingMethods,
  verifyProcessingSetup,
  getDiagnostics,
};
