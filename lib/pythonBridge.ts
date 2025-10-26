/**
 * Python Bridge for Spectral Processing
 * ======================================
 * 
 * This module provides a unified interface for spectral processing that:
 * 1. Uses native Chaquopy module when available (production APK)
 * 2. Falls back to HTTP server when in development mode
 * 
 * Supports BOTH:
 * - Calibration mode (4+ colors, full calibration process)
 * - Analysis mode (1-3 colors, force_analysis=true for widget)
 */

import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform, NativeModules } from 'react-native';
import { PYTHON_SERVER_ENDPOINTS } from './config';

// Access native Chaquopy module (null if not available)
const SpectralProcessorNative = Platform.OS === 'android' ? NativeModules.SpectralProcessor : null;

export interface PythonProcessResult {
  success: boolean;
  timestamp: number;
  image_info: {
    width: number;
    height: number;
    circle?: {
      center_x: number;
      center_y: number;
      radius: number;
    };
  };
  color_samples?: Array<{
    angle: number;
    rgb: { r: number; g: number; b: number };
    hsv: { h: number; s: number; v: number };
    estimated_wavelength: number;
    position: { x: number; y: number };
  }>;
  color_regions?: any;
  black_corners?: any;
  baseline?: any;
  raw_intensities?: any;
  corrected_intensities?: any;
  correction_curves?: any;
  spectral_response?: { [wavelength: number]: number };
  statistics?: {
    num_samples?: number;
    num_correction_factors?: number;
    wavelength_range?: [number, number];
    avg_correction_factor?: number;
  };
  mode?: string;
  num_colors_detected?: number;
  message?: string;
  error?: string;
  error_type?: string;
}

/**
 * Check if native Chaquopy module is available
 */
export function isNativeAvailable(): boolean {
  return SpectralProcessorNative !== null && SpectralProcessorNative !== undefined;
}

/**
 * Get Python environment info (only works with native module)
 */
export async function getPythonInfo(): Promise<any> {
  if (!isNativeAvailable()) {
    return { available: false, message: 'Native module not available' };
  }
  try {
    return await SpectralProcessorNative.getPythonInfo();
  } catch (error: any) {
    console.error('Failed to get Python info:', error);
    return { available: false, message: error.message };
  }
}

/**
 * Check if Python HTTP server is available (development mode)
 */
export async function checkPythonAvailable(): Promise<{ available: boolean; message: string }> {
  try {
    // Check if the Python HTTP server is reachable
    const response = await fetch(PYTHON_SERVER_ENDPOINTS.health, {
      method: 'GET'
    });
    
    if (response.ok) {
      return {
        available: true,
        message: 'Python server is running'
      };
    }
    
    return {
      available: false,
      message: 'Python server returned error'
    };
  } catch (error: any) {
    return {
      available: false,
      message: `Cannot connect to Python server at 172.16.1.232:5000. Make sure: 1) Python server is running, 2) Your phone and computer are on the same WiFi network. Error: ${error.message}`
    };
  }
}

/**
 * Execute Python spectral processor (DEPRECATED - use processWithPythonServer instead)
 * 
 * This function is kept for backwards compatibility but now just calls processWithPythonServer.
 * Direct Python execution from React Native requires native modules (see spectralProcessorNative.ts).
 * 
 * @deprecated Use processWithPythonServer for HTTP server or processImageNative for native execution
 */
export async function processWithPython(imageUri: string): Promise<PythonProcessResult> {
  console.warn('[DEPRECATED] processWithPython is deprecated. Use processWithPythonServer or processImageNative instead.');
  return processWithPythonServer(imageUri);
}

/**
 * Alternative: HTTP-based Python processing
 * 
 * If native module is not available, use HTTP server for development.
 * Supports both calibration mode and analysis mode via force_analysis parameter.
 * 
 * @param imageUri URI of the image to process
 * @param serverUrl URL of the Python HTTP server
 * @param forceAnalysis If true, always return analysis mode (for widget)
 */
export async function processWithPythonServer(
  imageUri: string,
  serverUrl: string = PYTHON_SERVER_ENDPOINTS.process,
  forceAnalysis: boolean = false
): Promise<PythonProcessResult> {
  console.log('Starting HTTP-based spectral processing...');
  console.log('Image URI:', imageUri);
  
  try {
    // Read image as base64
    let base64Image: string;
    
    try {
      // Remove the data URI prefix if present
      if (imageUri.startsWith('data:')) {
        base64Image = imageUri.split(',')[1];
        console.log('✅ Extracted base64 from data URI');
      } else {
        // First, manipulate the image to ensure it's in a standard format
        // This also handles content:// URIs from Android
        console.log('🔄 Converting image to standard format...');
        const manipResult = await ImageManipulator.manipulateAsync(
          imageUri,
          [], // No manipulations, just convert
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        
        if (manipResult.base64) {
          base64Image = manipResult.base64;
          console.log('✅ Image converted via manipulator, length:', base64Image.length);
        } else {
          throw new Error('Failed to get base64 from image manipulator');
        }
      }
    } catch (fileError) {
      console.error('❌ Failed to read/convert image:', fileError);
      throw new Error(`Failed to load image: ${fileError instanceof Error ? fileError.message : String(fileError)}`);
    }
    
    // Send to Python server
    console.log('📤 Sending to Python server:', serverUrl);
    console.log('⚙️ Options: force_analysis =', forceAnalysis);
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        format: 'jpg',
        force_analysis: forceAnalysis  // Add force_analysis parameter
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`Server responded with status ${response.status}: ${errorText}`);
    }
    
    const result: PythonProcessResult = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Python processing failed');
    }
    
    console.log('✅ Server processing complete:', {
      samples: result.statistics?.num_samples,
      factors: result.statistics?.num_correction_factors
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Python server processing error:', error);
    throw error;
  }
}

/**
 * Save Python processing results to calibration file
 */
export async function savePythonCalibrationResults(
  result: PythonProcessResult,
  imageUri: string
): Promise<void> {
  // Use the new FileSystem v19 API
  const calibrationFile = new FileSystem.File(FileSystem.Paths.document, 'spectral_calibration.json');
  
  const calibrationData = {
    timestamp: result.timestamp,
    imageUri: imageUri,
    imageInfo: result.image_info,
    colorSamples: result.color_samples,
    spectralResponse: result.spectral_response,
    statistics: result.statistics,
    processingMethod: 'python'
  };
  
  await calibrationFile.write(JSON.stringify(calibrationData, null, 2));
  
  console.log('Python calibration results saved');
}

/**
 * Load Python-generated calibration data
 */
export async function loadPythonCalibrationResults(): Promise<PythonProcessResult | null> {
  try {
    const calibrationFile = new FileSystem.File(FileSystem.Paths.document, 'spectral_calibration.json');
    
    if (!calibrationFile.exists) {
      return null;
    }
    
    const data = await calibrationFile.text();
    const calibrationData = JSON.parse(data);
    
    return {
      success: true,
      timestamp: calibrationData.timestamp,
      image_info: calibrationData.imageInfo,
      color_samples: calibrationData.colorSamples,
      spectral_response: calibrationData.spectralResponse,
      statistics: calibrationData.statistics
    };
    
  } catch (error) {
    console.error('Error loading Python calibration:', error);
    return null;
  }
}

/**
 * Get spectral response data for specific wavelength or all wavelengths
 * This is a convenience function for accessing spectral response correction factors
 */
export async function getSpectralResponse(wavelength?: number): Promise<{ [wavelength: number]: number } | number | null> {
  try {
    const calibrationData = await loadPythonCalibrationResults();
    
    if (!calibrationData || !calibrationData.spectral_response) {
      return null;
    }
    
    // If specific wavelength requested, return just that factor
    if (wavelength !== undefined) {
      return calibrationData.spectral_response[wavelength] ?? null;
    }
    
    // Otherwise return all spectral response data
    return calibrationData.spectral_response;
    
  } catch (error) {
    console.error('Error getting spectral response:', error);
    return null;
  }
}

/**
 * Check if spectral calibration exists and is valid
 */
export async function hasValidCalibration(): Promise<boolean> {
  try {
    const calibrationData = await loadPythonCalibrationResults();
    return calibrationData !== null && 
           calibrationData.spectral_response !== undefined &&
           Object.keys(calibrationData.spectral_response).length > 0;
  } catch (error) {
    return false;
  }
}

// ============================================================================
// UNIFIED PROCESSING INTERFACE (Chaquopy + HTTP Server)
// ============================================================================

/**
 * Process image using native module (Chaquopy in production APK)
 * 
 * @param imageUri URI of the image to process
 * @param forceAnalysis If true, always return analysis mode (for widget)
 */
async function processWithNative(
  imageUri: string,
  forceAnalysis: boolean = false
): Promise<PythonProcessResult> {
  try {
    // Save image to temporary file if needed
    let imagePath = imageUri;
    
    if (imageUri.startsWith('data:') || imageUri.startsWith('file://') || imageUri.startsWith('content://')) {
      // Convert to file path for native module
      const filename = `temp_spectral_${Date.now()}.jpg`;
      const tempFile = new FileSystem.File(FileSystem.Paths.cache, filename);
      
      if (imageUri.startsWith('data:')) {
        // Convert base64 to file
        const base64Data = imageUri.split(',')[1];
        await tempFile.write(base64Data, { encoding: 'base64' });
      } else if (imageUri.startsWith('content://')) {
        // Convert content:// URI to file
        const manipResult = await ImageManipulator.manipulateAsync(
          imageUri,
          [],
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
        );
        // Copy to cache
        const sourceFile = new FileSystem.File(manipResult.uri);
        await sourceFile.copy(tempFile);
      } else {
        // Copy file:// to cache
        const sourceFile = new FileSystem.File(imageUri);
        await sourceFile.copy(tempFile);
      }
      
      imagePath = tempFile.uri;
    }
    
    // Remove file:// prefix if present (native expects absolute path)
    imagePath = imagePath.replace('file://', '');
    
    console.log(`📸 Processing with native module: ${imagePath}`);
    console.log(`⚙️ Options: forceAnalysis=${forceAnalysis}`);
    
    // Call native Chaquopy module
    const result = await SpectralProcessorNative.processImage(imagePath, {
      forceAnalysis: forceAnalysis,
    });
    
    console.log(`✅ Native processing complete: mode=${result.mode}, success=${result.success}`);
    
    return result;
    
  } catch (error: any) {
    console.error('❌ Native processing error:', error);
    return {
      success: false,
      timestamp: Date.now(),
      image_info: { width: 0, height: 0 },
      error: error.message || 'Unknown native processing error',
    };
  }
}

/**
 * UNIFIED PROCESSING: Process image for spectral analysis or calibration
 * 
 * Automatically uses:
 * - Native Chaquopy module (production APK) - 100% offline
 * - HTTP server (development mode) - requires WiFi
 * 
 * @param imageUri URI of the image to process
 * @param forceAnalysis If true, always return analysis mode (for widget)
 * @returns Processing result from Python
 */
export async function processSpectralImage(
  imageUri: string,
  forceAnalysis: boolean = false
): Promise<PythonProcessResult> {
  
  // Check if native module is available
  if (isNativeAvailable()) {
    console.log('🔧 Using native Chaquopy module (offline mode)');
    return await processWithNative(imageUri, forceAnalysis);
  }
  
  // Fall back to HTTP server (development mode)
  console.log('🌐 Using HTTP server (development mode)');
  return await processWithPythonServer(imageUri, PYTHON_SERVER_ENDPOINTS.process, forceAnalysis);
}

/**
 * Process image for CALIBRATION (expects 4+ colors)
 * Used by: spectral-calibration.tsx
 */
export async function processCalibrationImage(imageUri: string): Promise<PythonProcessResult> {
  return await processSpectralImage(imageUri, false);  // Allow calibration mode
}

/**
 * Process image for ANALYSIS (1-3 colors, force analysis mode)
 * Used by: ColorSpectrumWidget.tsx
 */
export async function processAnalysisImage(imageUri: string): Promise<PythonProcessResult> {
  return await processSpectralImage(imageUri, true);  // Always analysis mode
}
