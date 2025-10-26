# Smartphone Spectrometry Implementation Guide

## Project Overview

This project transforms a smartphone camera into a **spectroscopy tool** capable of analyzing the wavelength spectrum of materials through advanced image processing and color analysis.

## Phase 1: RGB Circle Calibration ✅ COMPLETE

### What We've Built

#### 1. Spectral Calibration Screen (`app/spectral-calibration.tsx`)
- **Location**: Settings → Advanced → Spectral Calibration
- **Features**:
  - Capture or upload RGB color wheel image
  - Process calibration image
  - View calibration status and data
  - Automatic loading of saved calibration

#### 2. Spectral Analysis Library (`lib/spectralAnalysis.ts`)
Comprehensive library with:

**Color Space Conversions:**
- `rgbToHsv()` - Convert RGB to HSV color space
- `hsvToRgb()` - Convert HSV back to RGB
- `wavelengthToRgb()` - Get RGB from wavelength (380-700nm)
- `wavelengthToColorName()` - Human-readable color names

**Wavelength Mapping:**
- `hueToWavelength()` - Convert HSV hue (0-360°) to wavelength (nm)
- Based on visible spectrum mapping:
  - Red: 0° = 700nm
  - Orange: 30° = 620nm
  - Yellow: 60° = 580nm
  - Green: 120° = 530nm
  - Cyan: 180° = 490nm
  - Blue: 240° = 450nm
  - Violet: 270° = 400nm

**RGB Circle Processing:**
- `calibrateFromRGBCircle()` - Extract wavelength mappings from RGB wheel
  - Samples 72 color points (every 5 degrees)
  - Creates wavelength-to-RGB mapping
  - Calculates camera spectral response correction factors
- `saveCalibrationData()` / `loadCalibrationData()` - Persistent storage

**Spectrum Analysis:**
- `analyzeImageSpectrum()` - Analyze image ROI for wavelength content
  - Extracts RGB/HSV values from region of interest
  - Converts to wavelength data
  - Applies calibration corrections
  - Returns dominant wavelength and color name

### How It Works

#### RGB Circle Calibration Process:

1. **Image Capture**: User captures/uploads printed RGB color wheel with black background

2. **Circle Detection**: Algorithm identifies circle center and radius

3. **Angular Sampling**: Samples colors at 72 points around the circle (5° intervals)

4. **Wavelength Mapping**: 
   ```typescript
   angle → hue → wavelength (nm)
   ```

5. **Spectral Response Calculation**:
   - For each wavelength (380-700nm in 10nm steps):
     - Compare measured RGB vs theoretical RGB
     - Calculate correction factor
     - Store for later use

6. **Persistence**: Save calibration data to device storage

### Using the Calibration

```typescript
import { calibrateFromRGBCircle, saveCalibrationData } from '@/lib/spectralAnalysis';

// Calibrate from captured image
const calibrationData = await calibrateFromRGBCircle(imageUri);
await saveCalibrationData(calibrationData);

// Later, analyze a sample
import { analyzeImageSpectrum, loadCalibrationData } from '@/lib/spectralAnalysis';

const calibration = await loadCalibrationData();
const spectrum = await analyzeImageSpectrum(
  sampleImageUri,
  roiX, roiY, roiWidth, roiHeight,
  calibration  // Apply corrections
);

console.log(`Dominant wavelength: ${spectrum.dominantWavelength}nm`);
console.log(`Color: ${spectrum.colorName}`);
console.log(`Confidence: ${spectrum.confidence * 100}%`);
```

## Phase 2: Sample Analysis with ROI Selection (TODO)

### Next Steps:

1. **Create Sample Analysis Screen**
   - Camera interface for capturing sample images
   - Interactive ROI selection (drag rectangle)
   - Real-time wavelength preview

2. **ROI Selection Component**
   - Touch-based region selection
   - Visual feedback with overlay
   - Adjustable rectangle size

3. **Spectrum Visualization**
   - Graph showing wavelength distribution (380-700nm)
   - Color bar representation
   - Peak wavelength indicators
   - Intensity curves

4. **Results Display**
   - Dominant wavelength
   - Color composition breakdown
   - Wavelength intensity graph
   - Export functionality

### Implementation Plan:

```typescript
// components/ROISelector.tsx
interface ROIRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

// app/sample-analysis.tsx
const analyzeSample = async () => {
  const calibration = await loadCalibrationData();
  const result = await analyzeImageSpectrum(
    capturedImageUri,
    roi.x, roi.y, roi.width, roi.height,
    calibration
  );
  
  displaySpectrum(result);
};
```

## Phase 3: Environmental Corrections (TODO)

### Goals:
- Detect and analyze true black regions in images
- Measure ambient light intensity
- Compensate for shadows and uneven lighting
- Normalize measurements across different conditions

### Approach:
1. **Black Region Detection**:
   ```typescript
   function findBlackRegions(image): BlackRegion[] {
     // Scan for pixels with RGB < threshold
     // Analyze intensity variations
     // Return regions with statistics
   }
   ```

2. **Ambient Light Analysis**:
   - Measure intensity in black regions
   - Calculate baseline correction
   - Apply to all measurements

3. **Shadow Compensation**:
   - Detect shadow gradients
   - Apply local intensity corrections
   - Normalize across ROI

## Phase 4: Distance Estimation (TODO)

### Objective:
Estimate distance to sample using:
- Reference objects of known size
- Computer vision algorithms
- Optional AI/ML models

### Options:

**Option 1: Reference Object Method**
- Place object of known size in frame
- Calculate pixels per cm
- Estimate distance using perspective

**Option 2: TensorFlow Lite Integration**
- Pre-trained depth estimation model
- Real-time inference on device
- More accurate but requires ML setup

**Option 3: Simple CV Approach**
- Focus distance from camera API
- Sensor size calculations
- Good approximation for nearby objects

## Phase 5: Audio Signal Analysis (Experimental)

### Concept:
Use phone speaker/microphone for material analysis:

1. **Signal Generation**:
   - Emit swept-frequency tones (100Hz - 10kHz)
   - Generate periodic chirps

2. **Lock-in Detection**:
   - Record reflected/transmitted sound
   - Cross-correlate with reference signal
   - Extract phase and amplitude

3. **Material Properties**:
   - Acoustic impedance
   - Reflection coefficients
   - Potential material identification

### Implementation Notes:
- Requires expo-av for audio
- Complex signal processing
- Experimental - needs validation

## Current Status

### ✅ Completed:
- [x] RGB Circle Calibration Screen
- [x] Image capture/upload functionality
- [x] Spectral analysis library
- [x] RGB ↔ HSV conversions
- [x] Wavelength ↔ Color mappings
- [x] Camera spectral response calculation
- [x] Calibration data persistence
- [x] Basic spectrum analysis algorithm

### 🚧 In Progress:
- [ ] Sample analysis UI
- [ ] ROI selection component

### 📋 TODO:
- [ ] Spectrum visualization graphs
- [ ] Environmental corrections
- [ ] Distance estimation
- [ ] Audio signal analysis
- [ ] Advanced AI/ML integration

## How to Use (Current Phase)

### Step 1: Prepare RGB Color Wheel
1. Find high-resolution RGB color wheel image (search: "RGB color wheel black background")
2. Print on high-quality printer with accurate color reproduction
3. Ensure pure black background
4. Use matte paper to avoid reflections

### Step 2: Calibrate Camera
1. Open app → Settings → Advanced → Spectral Calibration
2. Place printed RGB wheel on flat surface
3. Ensure uniform lighting (avoid shadows, direct sunlight)
4. Tap "Capture RGB Circle" or "Select from Gallery"
5. Ensure entire circle is visible and sharp
6. Tap "Process Calibration"
7. Wait for analysis (may take 10-30 seconds)
8. Verify success message

### Step 3: Verify Calibration
- Check calibration data:
  - RGB Mapping Points: Should show 72
  - Correction Factors: Should show ~33
  - Timestamp: Recent date/time
- Calibration persists across app restarts

### Step 4: Next Phase (Coming Soon)
- Sample analysis screen
- ROI selection for spectrum measurement

## Technical Details

### Wavelength-Hue Mapping Algorithm

The core innovation is mapping HSV hue (angular color position) to physical wavelengths:

```typescript
function hueToWavelength(hue: number): number {
  const h = ((hue % 360) + 360) % 360;
  
  if (h >= 0 && h < 60) {
    // Red to Yellow: 700nm to 580nm
    return 700 - (h / 60) * 120;
  } else if (h >= 60 && h < 120) {
    // Yellow to Green: 580nm to 530nm
    return 580 - ((h - 60) / 60) * 50;
  }
  // ... continued for full spectrum
}
```

### Camera Spectral Response Correction

Cameras don't capture "true" colors due to:
- Sensor spectral sensitivity curves
- Color filter array (Bayer pattern)
- Image processing pipeline

**Correction Process**:
```
Expected RGB (theoretical) = wavelengthToRgb(wavelength)
Measured RGB (from camera) = capture of calibration wheel
Correction Factor = Expected / Measured
Corrected Measurement = Raw Measurement × Correction Factor
```

### Data Structures

```typescript
interface CalibrationData {
  wavelengthMap: Map<angle, RGB>;        // 72 samples
  spectralResponse: Map<wavelength, correction>;  // 33 points
  timestamp: number;
  imageUri: string;
}

interface SpectrumResult {
  wavelengths: WavelengthData[];  // All sampled points
  dominantWavelength: number;     // Peak wavelength
  colorName: string;              // "Red", "Blue", etc.
  confidence: number;             // 0-1
}
```

## Scientific Background

### Visible Spectrum
- Wavelength range: 380nm (violet) to 700nm (red)
- Human eye has 3 cone types (S, M, L)
- RGB camera sensors approximate this

### Color Spaces
- **RGB**: Additive color (red, green, blue channels)
- **HSV**: Hue (color), Saturation (purity), Value (brightness)
- **HSV Hue** correlates well with wavelength

### Spectroscopy Principles
1. **Absorption Spectroscopy**: Materials absorb specific wavelengths
2. **Reflection Spectroscopy**: Materials reflect characteristic colors
3. **Emission Spectroscopy**: Materials emit specific wavelengths when excited

This app focuses on **reflection spectroscopy** using ambient light.

## Limitations & Future Improvements

### Current Limitations:
- Simplified wavelength mapping (linear interpolation)
- No UV or IR detection (camera sensor limitation)
- Ambient light dependent
- No intensity calibration yet

### Future Enhancements:
- Machine learning for improved wavelength prediction
- Reference material database
- Intensity normalization
- Multi-angle measurements
- Cloud-based calibration sharing
- Material identification AI

## Testing Recommendations

### Test the Calibration:
1. **Known Colors**: Test with known color samples
2. **Repeatability**: Multiple captures of same RGB wheel
3. **Lighting Conditions**: Test in different lighting
4. **Different Cameras**: Compare phone models

### Expected Results:
- Red objects → ~620-700nm
- Green objects → ~520-570nm
- Blue objects → ~450-490nm
- Yellow objects → ~570-590nm

## References & Resources

### Color Science:
- CIE 1931 color space
- RGB to HSV conversion algorithms
- Wavelength to RGB formulas

### Spectroscopy:
- DIY spectrometer projects
- Public Lab spectrometry kit
- Smartphone-based spectroscopy research papers

### Implementation:
- expo-image-manipulator for image processing
- expo-file-system for data persistence
- React Native for UI

## Contact & Contribution

This is an experimental research project. Contributions and improvements welcome!

### Next Development Session:
1. Build Sample Analysis screen
2. Implement ROI selector
3. Create spectrum visualization
4. Test with real samples

---

**Status**: Phase 1 Complete | Phase 2 Starting
**Last Updated**: October 22, 2025
**Version**: 0.1.0-alpha
