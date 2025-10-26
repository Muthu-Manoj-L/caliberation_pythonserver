# Spectral Response Usage Guide

## Overview

Your camera's spectral response is now calculated during calibration and displayed in the calibration widget. This data shows how your camera sensor responds to different wavelengths of light (380-700nm visible spectrum).

## What is Spectral Response?

The spectral response is a set of correction factors that compensate for your camera's uneven sensitivity across different wavelengths. These factors are calculated by comparing captured RGB colors from the calibration circle to their known wavelengths.

## Viewing Spectral Response

### In Calibration Widget

The CalibrationWidget on the home screen now shows:
- ✅ "Spectral Response Available" badge when calibrated
- Number of wavelength correction factors (typically 33)
- Average correction factor

### In Calibration Screen

When you complete calibration, you'll see:

1. **📈 Camera Spectral Response Graph**
   - Smooth curve showing correction factors across wavelengths
   - Color-coded spectrum background matching actual wavelength colors
   - Filled area under curve for easy visualization
   - Data points marked on the curve
   - Y-axis shows correction factors (0-2.0 typically)
   - X-axis shows wavelength range (380-700nm)

2. **Response Statistics**
   - Peak Response: Shows which wavelength has highest correction (e.g., "550nm (1.45×)")
   - Response Range: Min and max correction factors (e.g., "0.75× - 1.45×")

## Using Spectral Response in Your Code

### Import the Functions

```typescript
import { 
  getSpectralResponse, 
  hasValidCalibration,
  loadPythonCalibrationResults 
} from '@/lib/pythonBridge';
```

### Check if Calibration Exists

```typescript
const isCalibrated = await hasValidCalibration();
if (isCalibrated) {
  // Proceed with spectral measurements
}
```

### Get All Spectral Response Data

```typescript
const spectralResponse = await getSpectralResponse();
// Returns: { 380: 0.85, 390: 0.92, 400: 1.05, ... 700: 0.78 }

if (spectralResponse) {
  Object.entries(spectralResponse).forEach(([wavelength, factor]) => {
    console.log(`${wavelength}nm: ${factor}× correction`);
  });
}
```

### Get Correction Factor for Specific Wavelength

```typescript
const factor550 = await getSpectralResponse(550);
// Returns: 1.45 (for 550nm green light)

// Apply correction to measured intensity
const measuredIntensity = 100;
const correctedIntensity = measuredIntensity * (factor550 as number);
```

### Get Full Calibration Data

```typescript
const calibration = await loadPythonCalibrationResults();

if (calibration) {
  console.log('Circle detected at:', calibration.image_info.circle);
  console.log('Color samples:', calibration.color_samples.length);
  console.log('Spectral response:', calibration.spectral_response);
  console.log('Statistics:', calibration.statistics);
}
```

## Example: Creating a Spectral Graph Component

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { getSpectralResponse } from '@/lib/pythonBridge';

export function SpectralGraph() {
  const [spectralData, setSpectralData] = useState<{[k: number]: number} | null>(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    const data = await getSpectralResponse();
    if (data && typeof data === 'object') {
      setSpectralData(data);
    }
  };
  
  if (!spectralData) return <Text>No calibration data</Text>;
  
  return (
    <View>
      {Object.entries(spectralData).map(([wl, factor]) => (
        <View key={wl} style={{ flexDirection: 'row' }}>
          <Text>{wl}nm:</Text>
          <Text>{factor.toFixed(3)}×</Text>
        </View>
      ))}
    </View>
  );
}
```

## Data Structure

### PythonProcessResult

```typescript
{
  success: true,
  timestamp: 1735123456789,
  
  image_info: {
    width: 3000,
    height: 4000,
    circle: {
      center_x: 1500,
      center_y: 2000,
      radius: 600
    }
  },
  
  color_samples: [
    {
      angle: 0,
      rgb: { r: 255, g: 0, b: 0 },
      hsv: { h: 0, s: 100, v: 100 },
      estimated_wavelength: 700,
      position: { x: 2100, y: 2000 }
    },
    // ... 71 more samples (every 5°)
  ],
  
  spectral_response: {
    380: 0.85,
    390: 0.92,
    400: 1.05,
    // ... every 10nm to 700
    700: 0.78
  },
  
  statistics: {
    num_samples: 72,
    num_correction_factors: 33,
    wavelength_range: [380, 700],
    avg_correction_factor: 1.123
  }
}
```

## Understanding Correction Factors

- **Factor > 1.0**: Camera is less sensitive at this wavelength (needs amplification)
- **Factor < 1.0**: Camera is more sensitive at this wavelength (needs attenuation)
- **Factor = 1.0**: Camera has ideal response at this wavelength

### Example Interpretation

```
450nm (blue):  1.25× → Camera under-responds to blue, boost by 25%
550nm (green): 1.05× → Camera slightly under-responds to green
650nm (red):   0.85× → Camera over-responds to red, reduce by 15%
```

## Best Practices

1. **Always Check Calibration**
   ```typescript
   if (!(await hasValidCalibration())) {
     // Prompt user to calibrate
     Alert.alert('Not Calibrated', 'Please calibrate your camera first');
     return;
   }
   ```

2. **Cache Spectral Data**
   ```typescript
   // Load once and reuse
   const spectralData = await getSpectralResponse();
   // Use spectralData multiple times without reloading
   ```

3. **Interpolate Between Wavelengths**
   ```typescript
   // If you need a wavelength between defined points (e.g., 545nm)
   function interpolate(wl: number, data: {[k: number]: number}): number {
     const wavelengths = Object.keys(data).map(Number).sort((a, b) => a - b);
     const lower = wavelengths.filter(w => w <= wl).pop() || wavelengths[0];
     const upper = wavelengths.filter(w => w >= wl).shift() || wavelengths[wavelengths.length - 1];
     
     if (lower === upper) return data[lower];
     
     const ratio = (wl - lower) / (upper - lower);
     return data[lower] + (data[upper] - data[lower]) * ratio;
   }
   
   const factor545 = interpolate(545, spectralData);
   ```

## Integration with Measurements

When taking spectral measurements, apply correction factors:

```typescript
async function measureSpectrum(imageUri: string) {
  // 1. Get spectral response
  const spectralResponse = await getSpectralResponse();
  if (!spectralResponse) {
    throw new Error('No calibration available');
  }
  
  // 2. Process image and extract intensities
  const rawIntensities = await extractIntensities(imageUri);
  
  // 3. Apply corrections
  const correctedIntensities = Object.entries(rawIntensities).map(([wl, intensity]) => {
    const factor = spectralResponse[parseInt(wl)] || 1.0;
    return {
      wavelength: wl,
      raw: intensity,
      corrected: intensity * factor
    };
  });
  
  return correctedIntensities;
}
```

## Troubleshooting

### "No spectral response data"
- Make sure you've completed calibration with an RGB circle
- Check that calibration didn't fail silently
- Try recalibrating

### "Correction factors seem wrong"
- Ensure RGB circle has accurate colors
- Check lighting conditions (should be uniform, no shadows)
- Verify circle is fully visible in image
- Camera should be parallel to circle surface

### "Graph not displaying"
- Check that `pythonResults` is loaded in component
- Verify `spectral_response` object exists
- Check console for any errors

## Future Enhancements

Planned features:
- Export spectral response as CSV/JSON
- Compare responses between different cameras
- Import spectral response from file
- Wavelength-specific sensitivity analysis
- Real-time spectral correction in measurements
