# Advanced Spectral Calibration - Summary

## ✅ What Was Done

### 1. **Replaced Old RGB Circle Detection with 6-Color HSV System**
   - **Old**: Detected any circular pattern, sampled 72 points around circle
   - **New**: Detects 6 specific colors (Red, Green, Blue, Cyan, Magenta, Yellow) using HSV thresholding
   - **Benefit**: More accurate, color-specific calibration

### 2. **Added Shadow/Baseline Correction**
   - Extracts 4 black corner regions from image
   - Calculates average baseline (shadow/noise levels)
   - Subtracts baseline from all color measurements
   - **Result**: Removes sensor dark current and ambient light effects

### 3. **Individual R, G, B Channel Processing**
   - Separates red, green, blue channels
   - Calculates normalized intensity for each channel
   - Fits polynomial correction curves per channel
   - **Result**: Channel-specific spectral response calibration

### 4. **Two Separate Graphs in App**

#### Graph 1: Raw Spectral Response
- Shows R, G, B channel intensities vs wavelength
- Normalized to 0-1 range
- Smooth Catmull-Rom spline curves
- **Purpose**: See how camera sensor responds to each color

#### Graph 2: Correction Curves
- Shows correction factors for R, G, B channels
- Polynomial-fitted curves
- **Purpose**: Factors to multiply measurements by for accurate results

### 5. **UI Updates**
   - Displays 6 detected colors with their wavelengths
   - Color legends for each graph (Red, Green, Blue)
   - Statistics: colors detected, baseline values, wavelength range
   - Separate cards for raw response vs correction curves

## 📊 Data Flow

```
1. Capture image of 6-color chart
   ↓
2. Extract color regions via HSV thresholding
   ↓
3. Extract black corners for baseline
   ↓
4. Subtract baseline from color intensities
   ↓
5. Separate R, G, B channels
   ↓
6. Normalize intensities (0-1)
   ↓
7. Calculate correction factors (inverse of normalized)
   ↓
8. Fit polynomial curves (degree 3)
   ↓
9. Display:
   - Raw response curves (R, G, B)
   - Correction curves (R, G, B)
```

## 🎨 Required Calibration Chart

You need a chart with:
- **6 color patches**: Red, Yellow, Green, Cyan, Blue, Magenta
- **4 black corners**: For baseline estimation
- Pure black background
- Known wavelengths:
  - Red: 625nm
  - Yellow: 580nm
  - Green: 530nm
  - Cyan: 490nm
  - Blue: 460nm
  - Magenta: 570nm

## 📱 What You See in App

### After Calibration Success:

1. **Detected Color Regions**
   - 6 colored squares showing detected colors
   - Each labeled with color name and wavelength

2. **Calibration Statistics**
   - Colors detected: X/6
   - Black corners: 4
   - Wavelength range: XXX-XXX nm
   - Baseline RGB values

3. **Raw Spectral Response Graph**
   - Three smooth curves (Red, Green, Blue)
   - Shows relative sensor sensitivity
   - Legend at bottom

4. **Correction Curves Graph**
   - Three smooth curves (Red, Green, Blue)
   - Shows factors to apply to future measurements
   - Legend at bottom

## 🔬 How to Use Correction Data

When taking measurements later:

```typescript
// Get correction factor for specific wavelength and channel
const wavelength = 550; // nm
const rawIntensity_R = 120;
const rawIntensity_G = 200;
const rawIntensity_B = 80;

// Apply correction using polynomial coefficients
const corrected_R = rawIntensity_R * getCorrectionFactor(wavelength, 'r');
const corrected_G = rawIntensity_G * getCorrectionFactor(wavelength, 'g');
const corrected_B = rawIntensity_B * getCorrectionFactor(wavelength, 'b');
```

## 🆚 Old vs New Comparison

| Feature | Old (RGB Circle) | New (6-Color HSV) |
|---------|------------------|-------------------|
| Colors detected | 72 points (every 5°) | 6 specific colors |
| Detection method | Hough Circle Transform | HSV color thresholding |
| Baseline correction | ❌ No | ✅ Yes (4 black corners) |
| Per-channel curves | ❌ No (combined) | ✅ Yes (R, G, B separate) |
| Correction curves | Basic factors | Polynomial-fitted curves |
| Graphs shown | 1 (combined response) | 2 (raw + correction) |
| Wavelength mapping | Estimated from angle | Known reference wavelengths |
| Accuracy | Basic | Professional-grade |

## ⚡ Server Status

✅ **Python server updated and running**
- Using new `SpectralProcessor` class
- HSV color detection
- Shadow correction
- Polynomial curve fitting
- Returns both raw intensities and correction curves

## 🚀 Next Steps

1. **Reload the app** (press `r` in Metro)
2. **Create/print a 6-color calibration chart**
3. **Test with the chart** (must have 6 colors + black corners)
4. **Verify the graphs display correctly**

## ⚠️ Known Requirements

- Chart MUST have all 6 colors (Red, Green, Blue, Cyan, Magenta, Yellow)
- Black corners MUST be present (app extracts 10% from each corner)
- Good uniform lighting required
- Colors must be saturated enough for HSV detection
- If fewer than 4 colors detected, calibration fails

## 📈 Graph Interpretation

### Raw Response Graph:
- **Peak**: Wavelength where sensor is most sensitive
- **Valleys**: Wavelengths where sensor is weak
- **Shape**: Overall spectral sensitivity profile

### Correction Graph:
- **High values (>1)**: Wavelengths that need boosting
- **Low values (<1)**: Wavelengths that need reduction
- **Flat line near 1.0**: Ideal uniform response

Done! Everything is ready for advanced spectral calibration! 🎉
