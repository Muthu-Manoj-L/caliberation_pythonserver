/**
 * Spectral Analysis Library
 * 
 * This library provides tools for:
 * 1. RGB Circle Calibration - extracting wavelength-color mappings
 * 2. Camera Spectral Response - determining camera's color distortion
 * 3. Sample Analysis - converting image ROI to wavelength spectrum
 * 4. Environmental Corrections - compensating for lighting conditions
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface RGBColor {
  r: number;  // 0-255
  g: number;  // 0-255
  b: number;  // 0-255
}

export interface HSVColor {
  h: number;  // 0-360 degrees
  s: number;  // 0-100 %
  v: number;  // 0-100 %
}

export interface WavelengthData {
  wavelength: number;  // nanometers (380-700nm)
  intensity: number;   // 0-1
  rgb: RGBColor;
}

export interface CalibrationData {
  wavelengthMap?: Map<number, RGBColor>;  // angle -> RGB mapping (legacy)
  spectralResponse?: Map<number, number>; // wavelength -> correction factor (legacy)
  timestamp: number;
  imageUri: string;
  // New fields from Python spectral processor
  correction_curves?: {
    data_points: {
      wavelengths: number[];
      r_corrections: number[];
      g_corrections: number[];
      b_corrections: number[];
    };
    final_corrected: {
      wavelengths: number[];
      r: number[];
      g: number[];
      b: number[];
    };
    raw_normalized: {
      wavelengths: number[];
      r: number[];
      g: number[];
      b: number[];
    };
  };
  color_regions?: any;
  corrected_intensities?: any;
}

export interface SpectrumResult {
  wavelengths: WavelengthData[];
  dominantWavelength: number;
  colorName: string;
  confidence: number;
}

// ============================================================================
// COLOR CONVERSION UTILITIES
// ============================================================================

/**
 * Convert RGB to HSV color space
 */
export function rgbToHsv(rgb: RGBColor): HSVColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

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
 * Convert HSV to RGB color space
 */
export function hsvToRgb(hsv: HSVColor): RGBColor {
  const h = hsv.h / 360;
  const s = hsv.s / 100;
  const v = hsv.v / 100;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r = 0, g = 0, b = 0;

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Approximate wavelength from HSV hue value (0-360)
 * Based on visible spectrum mapping:
 * - Red: 0° = 700nm
 * - Orange: 30° = 620nm
 * - Yellow: 60° = 580nm
 * - Green: 120° = 530nm
 * - Cyan: 180° = 490nm
 * - Blue: 240° = 450nm
 * - Violet: 270° = 400nm
 * - Back to Red: 360° = 700nm
 */
export function hueToWavelength(hue: number): number {
  // Normalize hue to 0-360
  const h = ((hue % 360) + 360) % 360;
  
  // Map hue to wavelength (380-700nm range)
  // Using approximate visible spectrum mapping
  if (h >= 0 && h < 60) {
    // Red to Yellow: 700nm to 580nm
    return 700 - (h / 60) * 120;
  } else if (h >= 60 && h < 120) {
    // Yellow to Green: 580nm to 530nm
    return 580 - ((h - 60) / 60) * 50;
  } else if (h >= 120 && h < 180) {
    // Green to Cyan: 530nm to 490nm
    return 530 - ((h - 120) / 60) * 40;
  } else if (h >= 180 && h < 240) {
    // Cyan to Blue: 490nm to 450nm
    return 490 - ((h - 180) / 60) * 40;
  } else if (h >= 240 && h < 300) {
    // Blue to Violet: 450nm to 380nm
    return 450 - ((h - 240) / 60) * 70;
  } else {
    // Violet back to Red: 380nm to 700nm
    return 380 + ((h - 300) / 60) * 320;
  }
}

/**
 * Convert wavelength (nm) to approximate RGB color
 */
export function wavelengthToRgb(wavelength: number): RGBColor {
  let r = 0, g = 0, b = 0;

  if (wavelength >= 380 && wavelength < 440) {
    r = -(wavelength - 440) / (440 - 380);
    g = 0;
    b = 1;
  } else if (wavelength >= 440 && wavelength < 490) {
    r = 0;
    g = (wavelength - 440) / (490 - 440);
    b = 1;
  } else if (wavelength >= 490 && wavelength < 510) {
    r = 0;
    g = 1;
    b = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    r = (wavelength - 510) / (580 - 510);
    g = 1;
    b = 0;
  } else if (wavelength >= 580 && wavelength < 645) {
    r = 1;
    g = -(wavelength - 645) / (645 - 580);
    b = 0;
  } else if (wavelength >= 645 && wavelength <= 700) {
    r = 1;
    g = 0;
    b = 0;
  }

  // Intensity correction for edge wavelengths
  let factor = 1.0;
  if (wavelength >= 380 && wavelength < 420) {
    factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
  } else if (wavelength >= 645 && wavelength <= 700) {
    factor = 0.3 + 0.7 * (700 - wavelength) / (700 - 645);
  }

  return {
    r: Math.round(r * factor * 255),
    g: Math.round(g * factor * 255),
    b: Math.round(b * factor * 255),
  };
}

/**
 * Get color name from wavelength
 */
export function wavelengthToColorName(wavelength: number): string {
  if (wavelength >= 380 && wavelength < 450) return 'Violet';
  if (wavelength >= 450 && wavelength < 495) return 'Blue';
  if (wavelength >= 495 && wavelength < 570) return 'Green';
  if (wavelength >= 570 && wavelength < 590) return 'Yellow';
  if (wavelength >= 590 && wavelength < 620) return 'Orange';
  if (wavelength >= 620 && wavelength <= 700) return 'Red';
  return 'Unknown';
}

// ============================================================================
// IMAGE PROCESSING
// ============================================================================

/**
 * Load and process image to extract pixel data
 */
async function getImagePixelData(imageUri: string, targetSize: number = 500): Promise<{
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}> {
  try {
    // Resize image for faster processing
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: targetSize } }],
      { format: ImageManipulator.SaveFormat.PNG }
    );

    // Read image as base64 using new File API
    const file = new FileSystem.File(manipResult.uri);
    const base64 = await file.base64();

    // Convert base64 to pixel array
    // Note: This is a simplified version. In production, you'd use a proper image decoder
    const binary = atob(base64);
    const pixels = new Uint8ClampedArray(binary.length);
    for (let i = 0; i < binary.length; i++) {
      pixels[i] = binary.charCodeAt(i);
    }

    return {
      pixels,
      width: targetSize,
      height: targetSize,
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

/**
 * Extract pixel color at specific coordinates
 */
function getPixelColor(
  pixels: Uint8ClampedArray,
  x: number,
  y: number,
  width: number
): RGBColor {
  const index = (y * width + x) * 4;
  return {
    r: pixels[index],
    g: pixels[index + 1],
    b: pixels[index + 2],
  };
}

// ============================================================================
// RGB CIRCLE CALIBRATION
// ============================================================================

/**
 * Process RGB color circle image to extract wavelength mappings
 * 
 * The RGB circle should be centered in the image with a black background.
 * This function samples colors at different angular positions around the circle.
 */
export async function calibrateFromRGBCircle(imageUri: string): Promise<CalibrationData> {
  console.log('Starting RGB circle calibration...');

  try {
    // Load and process image
    const { pixels, width, height } = await getImagePixelData(imageUri);

    // Find circle center (assume image center for now)
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const radius = Math.floor(Math.min(width, height) * 0.4); // 80% of half-width

    // Sample colors at different angles (every 5 degrees)
    const wavelengthMap = new Map<number, RGBColor>();
    const numSamples = 72; // 360 / 5 = 72 samples

    for (let i = 0; i < numSamples; i++) {
      const angle = (i * 360) / numSamples;
      const radians = (angle * Math.PI) / 180;

      // Sample point on circle
      const sampleX = Math.floor(centerX + radius * Math.cos(radians));
      const sampleY = Math.floor(centerY + radius * Math.sin(radians));

      // Get pixel color
      const color = getPixelColor(pixels, sampleX, sampleY, width);

      // Store mapping
      wavelengthMap.set(angle, color);
    }

    // Calculate spectral response correction factors
    const spectralResponse = new Map<number, number>();
    
    for (let wavelength = 380; wavelength <= 700; wavelength += 10) {
      // Get expected RGB for this wavelength
      const expectedRgb = wavelengthToRgb(wavelength);
      
      // Find closest measured color from circle
      // This is simplified - in production, you'd do proper interpolation
      const hue = wavelength; // Simplified mapping
      const measuredRgb = wavelengthMap.get(hue % 360) || expectedRgb;
      
      // Calculate correction factor (simplified)
      const expectedBrightness = (expectedRgb.r + expectedRgb.g + expectedRgb.b) / 3;
      const measuredBrightness = (measuredRgb.r + measuredRgb.g + measuredRgb.b) / 3;
      const correctionFactor = measuredBrightness > 0 ? expectedBrightness / measuredBrightness : 1.0;
      
      spectralResponse.set(wavelength, correctionFactor);
    }

    console.log('Calibration complete:', {
      sampledColors: wavelengthMap.size,
      correctionFactors: spectralResponse.size,
    });

    return {
      wavelengthMap,
      spectralResponse,
      timestamp: Date.now(),
      imageUri,
    };
  } catch (error) {
    console.error('Error in RGB circle calibration:', error);
    throw error;
  }
}

// ============================================================================
// SAMPLE ANALYSIS
// ============================================================================

/**
 * Analyze image ROI to extract wavelength spectrum
 */
export async function analyzeImageSpectrum(
  imageUri: string,
  roiX: number,
  roiY: number,
  roiWidth: number,
  roiHeight: number,
  calibrationData?: CalibrationData
): Promise<SpectrumResult> {
  console.log('Analyzing image spectrum...');

  try {
    // Crop to ROI
    const croppedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          crop: {
            originX: roiX,
            originY: roiY,
            width: roiWidth,
            height: roiHeight,
          },
        },
        { resize: { width: 100 } }, // Resize for faster processing
      ],
      { format: ImageManipulator.SaveFormat.PNG }
    );

    // Get pixel data
    const { pixels, width, height } = await getImagePixelData(croppedImage.uri, 100);

    // Sample colors across ROI
    const wavelengths: WavelengthData[] = [];
    const wavelengthCounts = new Map<number, number>();

    for (let y = 0; y < height; y += 5) {
      for (let x = 0; x < width; x += 5) {
        const rgb = getPixelColor(pixels, x, y, width);
        const hsv = rgbToHsv(rgb);
        const wavelength = Math.round(hueToWavelength(hsv.h));

        // Apply calibration correction if available
        let correctedIntensity = hsv.v / 100;
        if (calibrationData && calibrationData.spectralResponse && calibrationData.spectralResponse.has(wavelength)) {
          const correctionFactor = calibrationData.spectralResponse.get(wavelength)!;
          correctedIntensity *= correctionFactor;
        }

        wavelengths.push({
          wavelength,
          intensity: correctedIntensity,
          rgb,
        });

        // Count wavelength occurrences
        wavelengthCounts.set(wavelength, (wavelengthCounts.get(wavelength) || 0) + 1);
      }
    }

    // Find dominant wavelength
    let maxCount = 0;
    let dominantWavelength = 550; // Default to green

    wavelengthCounts.forEach((count, wavelength) => {
      if (count > maxCount) {
        maxCount = count;
        dominantWavelength = wavelength;
      }
    });

    const colorName = wavelengthToColorName(dominantWavelength);
    const confidence = maxCount / wavelengths.length;

    console.log('Spectrum analysis complete:', {
      totalSamples: wavelengths.length,
      dominantWavelength,
      colorName,
      confidence,
    });

    return {
      wavelengths,
      dominantWavelength,
      colorName,
      confidence,
    };
  } catch (error) {
    console.error('Error analyzing spectrum:', error);
    throw error;
  }
}

// ============================================================================
// STORAGE
// ============================================================================

const CALIBRATION_KEY = 'spectral_calibration_data';

/**
 * Save calibration data to storage
 */
export async function saveCalibrationData(data: CalibrationData): Promise<void> {
  try {
    const serialized = {
      wavelengthMap: data.wavelengthMap ? Array.from(data.wavelengthMap.entries()) : [],
      spectralResponse: data.spectralResponse ? Array.from(data.spectralResponse.entries()) : [],
      timestamp: data.timestamp,
      imageUri: data.imageUri,
      // Include new fields for color correction
      correction_curves: data.correction_curves,
      color_regions: data.color_regions,
      corrected_intensities: data.corrected_intensities,
    };

    const json = JSON.stringify(serialized);
    const directory = new FileSystem.Directory(FileSystem.Paths.document);
    const filePath = `${directory.uri}/${CALIBRATION_KEY}.json`;
    
    // Use new File API to write
    const file = new FileSystem.File(filePath);
    await file.write(json);

    console.log('✅ Calibration data saved with correction curves:', !!data.correction_curves?.data_points);
  } catch (error) {
    console.error('Error saving calibration data:', error);
    throw error;
  }
}

/**
 * Load calibration data from storage
 */
export async function loadCalibrationData(): Promise<CalibrationData | null> {
  try {
    const directory = new FileSystem.Directory(FileSystem.Paths.document);
    const filePath = `${directory.uri}/${CALIBRATION_KEY}.json`;
    
    // Use new File API to check if file exists and read
    const file = new FileSystem.File(filePath);
    
    if (!file.exists) {
      return null;
    }

    const json = await file.text();
    const serialized = JSON.parse(json);

    const loadedData: CalibrationData = {
      wavelengthMap: new Map(serialized.wavelengthMap),
      spectralResponse: new Map(serialized.spectralResponse),
      timestamp: serialized.timestamp,
      imageUri: serialized.imageUri,
      // Load new fields for color correction
      correction_curves: serialized.correction_curves,
      color_regions: serialized.color_regions,
      corrected_intensities: serialized.corrected_intensities,
    };

    console.log('✅ Calibration data loaded with correction curves:', !!loadedData.correction_curves?.data_points);
    
    return loadedData;
  } catch (error) {
    console.error('Error loading calibration data:', error);
    return null;
  }
}
