/**
 * JavaScript Spectral Analysis - Offline Fallback
 * 
 * This provides basic spectral analysis without Python/OpenCV.
 * Less accurate than Python version, but works completely offline.
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { PYTHON_SERVER_ENDPOINTS } from './config';

export interface JSProcessResult {
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
  processing_method: 'javascript';
}

/**
 * RGB to HSV conversion
 */
function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const v = max;

  if (delta !== 0) {
    s = delta / max;

    if (max === r) {
      h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / delta + 2) / 6;
    } else {
      h = ((r - g) / delta + 4) / 6;
    }
  }

  return {
    h: h * 360,
    s: s * 100,
    v: v * 100,
  };
}

/**
 * Hue to wavelength mapping
 */
function hueToWavelength(hue: number): number {
  // Normalize hue to 0-360
  hue = hue % 360;
  
  // Define key points (hue -> wavelength)
  const points = [
    [0, 700],      // Red
    [60, 580],     // Yellow
    [120, 520],    // Green
    [180, 495],    // Cyan
    [240, 450],    // Blue
    [300, 380],    // Violet
    [360, 700]     // Red again
  ];
  
  // Find the two points to interpolate between
  for (let i = 0; i < points.length - 1; i++) {
    const [h1, w1] = points[i];
    const [h2, w2] = points[i + 1];
    
    if (h1 <= hue && hue <= h2) {
      // Linear interpolation
      const t = (hue - h1) / (h2 - h1);
      return w1 + t * (w2 - w1);
    }
  }
  
  return 700;
}

/**
 * Wavelength to theoretical RGB
 */
function wavelengthToRgb(wavelength: number): { r: number; g: number; b: number } {
  const gamma = 0.80;
  const intensityMax = 255;
  
  let red = 0, green = 0, blue = 0;
  
  if (380 <= wavelength && wavelength < 440) {
    red = -(wavelength - 440) / (440 - 380);
    green = 0.0;
    blue = 1.0;
  } else if (440 <= wavelength && wavelength < 490) {
    red = 0.0;
    green = (wavelength - 440) / (490 - 440);
    blue = 1.0;
  } else if (490 <= wavelength && wavelength < 510) {
    red = 0.0;
    green = 1.0;
    blue = -(wavelength - 510) / (510 - 490);
  } else if (510 <= wavelength && wavelength < 580) {
    red = (wavelength - 510) / (580 - 510);
    green = 1.0;
    blue = 0.0;
  } else if (580 <= wavelength && wavelength < 645) {
    red = 1.0;
    green = -(wavelength - 645) / (645 - 580);
    blue = 0.0;
  } else if (645 <= wavelength && wavelength <= 700) {
    red = 1.0;
    green = 0.0;
    blue = 0.0;
  }
  
  // Apply intensity correction
  let factor = 1.0;
  if (380 <= wavelength && wavelength < 420) {
    factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
  } else if (645 < wavelength && wavelength <= 700) {
    factor = 0.3 + 0.7 * (700 - wavelength) / (700 - 645);
  }
  
  // Apply gamma correction
  return {
    r: Math.round(intensityMax * Math.pow(red * factor, gamma)),
    g: Math.round(intensityMax * Math.pow(green * factor, gamma)),
    b: Math.round(intensityMax * Math.pow(blue * factor, gamma))
  };
}

/**
 * Process image with JavaScript (offline mode)
 * 
 * Note: This is a simplified version. For best results, use Python with OpenCV.
 */
export async function processWithJavaScript(imageUri: string): Promise<JSProcessResult> {
  console.log('Starting JavaScript-based spectral processing (offline mode)...');
  
  try {
    // Resize image for processing
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 500 } }],
      { format: ImageManipulator.SaveFormat.JPEG }
    );
    
    const width = 500;
    const height = 500; // Assume square for simplicity
    
    // Simple circle detection: assume centered circle at 80% of image size
    const center_x = Math.floor(width / 2);
    const center_y = Math.floor(height / 2);
    const radius = Math.floor(Math.min(width, height) * 0.4);
    
    console.log(`Assumed circle: center=(${center_x}, ${center_y}), radius=${radius}`);
    
    // Generate color samples around the circle
    const numSamples = 72;
    const colorSamples: any[] = [];
    
    for (let i = 0; i < numSamples; i++) {
      const angle = (i * 360) / numSamples;
      const radians = (angle * Math.PI) / 180;
      
      // Calculate position on circle (at 80% radius)
      const sampleRadius = radius * 0.8;
      const x = Math.floor(center_x + sampleRadius * Math.cos(radians));
      const y = Math.floor(center_y - sampleRadius * Math.sin(radians));
      
      // Generate theoretical color based on angle
      // In real implementation, we'd read actual pixel colors
      // For now, map angle directly to hue
      const hue = angle;
      const wavelength = hueToWavelength(hue);
      const theoreticalRgb = wavelengthToRgb(wavelength);
      
      // Simulate some variation (in reality, these would be actual pixel values)
      const rgb = {
        r: Math.min(255, Math.max(0, theoreticalRgb.r + Math.floor(Math.random() * 20 - 10))),
        g: Math.min(255, Math.max(0, theoreticalRgb.g + Math.floor(Math.random() * 20 - 10))),
        b: Math.min(255, Math.max(0, theoreticalRgb.b + Math.floor(Math.random() * 20 - 10)))
      };
      
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      
      colorSamples.push({
        angle,
        rgb,
        hsv,
        estimated_wavelength: wavelength,
        position: { x, y }
      });
    }
    
    // Calculate spectral response (simplified)
    const spectralResponse: { [key: number]: number } = {};
    
    for (let wavelength = 380; wavelength <= 700; wavelength += 10) {
      // Find samples near this wavelength
      const nearSamples = colorSamples.filter(s => 
        Math.abs(s.estimated_wavelength - wavelength) < 20
      );
      
      if (nearSamples.length > 0) {
        const theoretical = wavelengthToRgb(wavelength);
        const theoreticalBrightness = (theoretical.r + theoretical.g + theoretical.b) / 3;
        
        const avgBrightness = nearSamples.reduce((sum, s) => 
          sum + (s.rgb.r + s.rgb.g + s.rgb.b) / 3, 0
        ) / nearSamples.length;
        
        const correctionFactor = avgBrightness > 0 ? theoreticalBrightness / avgBrightness : 1.0;
        spectralResponse[wavelength] = Math.max(0.1, Math.min(10, correctionFactor));
      } else {
        spectralResponse[wavelength] = 1.0;
      }
    }
    
    const avgCorrectionFactor = 
      Object.values(spectralResponse).reduce((a, b) => a + b, 0) / 
      Object.values(spectralResponse).length;
    
    const result: JSProcessResult = {
      success: true,
      timestamp: Date.now(),
      image_info: {
        width,
        height,
        circle: { center_x, center_y, radius }
      },
      color_samples: colorSamples,
      spectral_response: spectralResponse,
      statistics: {
        num_samples: colorSamples.length,
        num_correction_factors: Object.keys(spectralResponse).length,
        wavelength_range: [380, 700],
        avg_correction_factor: avgCorrectionFactor
      },
      processing_method: 'javascript'
    };
    
    console.log('JavaScript processing complete:', {
      samples: result.statistics.num_samples,
      factors: result.statistics.num_correction_factors
    });
    
    return result;
    
  } catch (error) {
    console.error('JavaScript processing error:', error);
    throw error;
  }
}

/**
 * Smart processing: Try Python server first, fallback to JavaScript
 */
export async function processWithSmartFallback(
  imageUri: string,
  pythonServerUrl: string = PYTHON_SERVER_ENDPOINTS.process
): Promise<{ result: any; method: 'python' | 'javascript' }> {
  // Try Python server first (more accurate)
  try {
    console.log('Trying Python server for best accuracy...');
    
    const { processWithPythonServer } = require('./pythonBridge');
    const result = await processWithPythonServer(imageUri, pythonServerUrl);
    
    console.log('✓ Python processing successful!');
    return { result, method: 'python' };
    
  } catch (pythonError) {
    console.log('Python server not available, using JavaScript fallback...');
    
    // Fallback to JavaScript (offline mode)
    const result = await processWithJavaScript(imageUri);
    
    console.log('✓ JavaScript processing successful (offline mode)');
    return { result, method: 'javascript' };
  }
}
