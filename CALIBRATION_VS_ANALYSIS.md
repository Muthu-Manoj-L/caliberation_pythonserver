# 🔍 Calibration vs Analysis Mode Comparison

## Quick Reference Guide

---

## 📊 Mode Comparison Table

| Feature | Calibration Mode | Analysis Mode |
|---------|-----------------|---------------|
| **Used By** | `spectral-calibration.tsx` | `ColorSpectrumWidget.tsx` |
| **Purpose** | Generate correction curves | Analyze colored objects |
| **Color Count** | 4-6 colors required | 1-3 colors expected |
| **force_analysis** | `false` | `true` |
| **Returns** | `mode: 'calibration'` | `mode: 'analysis_only'` |
| **Output** | Correction curves + color data | Color data only |
| **Frequency** | Once (print chart first) | Every photo |
| **Duration** | ~2-3 seconds | ~1-2 seconds |
| **Offline?** | ✅ Yes (with Chaquopy) | ✅ Yes (with Chaquopy) |

---

## 🎨 Expected Inputs

### Calibration Mode Input

**What to photograph**: Printed 6-color chart (use `calibration-chart.html`)

```
┌─────┬─────┬─────┐
│ Red │Yllow│Green│  ← 6 pure colors
├─────┼─────┼─────┤
│Cyan │Blue │Mag  │  ← HSV-based detection
├─────┼─────┼─────┤
│Black│     │Black│  ← 4 corners for baseline
└─────┴─────┴─────┘
```

**Colors Detected**:
- Red (625nm)
- Yellow (580nm)
- Green (530nm)
- Cyan (490nm)
- Blue (460nm)
- Magenta (570nm)

### Analysis Mode Input

**What to photograph**: Any colored object (1-3 distinct colors)

Examples:
- Red phone case ✅
- Blue pen ✅
- Green book ✅
- Laptop keyboard ⚠️ (4+ colors, but force_analysis prevents calibration mode)

---

## 🔧 Function Signatures

### TypeScript (Bridge)

```typescript
// Calibration mode
processCalibrationImage(imageUri: string): Promise<PythonProcessResult>
// → force_analysis = false

// Analysis mode
processAnalysisImage(imageUri: string): Promise<PythonProcessResult>
// → force_analysis = true
```

### Python (Processor)

```python
def process(self, force_analysis: bool = False) -> Dict:
    """
    force_analysis=False → Allows calibration if 4+ colors
    force_analysis=True  → Always returns analysis_only
    """
```

### Kotlin (Native Module)

```kotlin
fun processImage(
    imagePath: String, 
    options: ReadableMap?  // { forceAnalysis: Boolean }
): Promise
```

---

## 📥 Return Value Examples

### Calibration Mode Response

```json
{
  "success": true,
  "mode": "calibration",
  "timestamp": "2025-10-24T12:44:07",
  "num_colors_detected": 6,
  "color_regions": {
    "red": {
      "wavelength": 625,
      "mean_rgb": [213, 82, 43],
      "pixel_count": 15420
    },
    "yellow": { ... },
    "green": { ... },
    "cyan": { ... },
    "blue": { ... },
    "magenta": { ... }
  },
  "correction_curves": {
    "red": {
      "625": 1.00,
      "580": 1.14,
      "530": 0.60,
      "490": 0.82,
      "570": 0.36,
      "460": 10.00
    },
    "green": { ... },
    "blue": { ... }
  },
  "corrected_intensities": { ... },
  "baseline": { "r": 12, "g": 15, "b": 18 }
}
```

### Analysis Mode Response

```json
{
  "success": true,
  "mode": "analysis_only",
  "num_colors_detected": 1,
  "message": "Analysis mode: detected 1 color region(s)",
  "color_regions": {
    "red": {
      "wavelength": 625,
      "mean_rgb": [213, 82, 43],
      "pixel_count": 125830
    }
  }
}
```

**Notice**: No `correction_curves`, no `baseline`, no `corrected_intensities`

---

## 🔀 Mode Decision Logic

### Python Logic (spectral_processor.py)

```python
def process(self, force_analysis: bool = False) -> Dict:
    # Load and extract colors
    self.extract_color_regions()
    
    # If force_analysis is True, ALWAYS return analysis mode
    if force_analysis and len(self.color_regions) > 0:
        return {
            'mode': 'analysis_only',
            'color_regions': self.color_regions,
            # No correction curves!
        }
    
    # If less than 4 colors, return analysis mode
    if len(self.color_regions) < 4:
        return {
            'mode': 'analysis_only',
            'color_regions': self.color_regions,
            'message': 'Insufficient colors for calibration'
        }
    
    # 4+ colors AND force_analysis=False → Do calibration
    self.extract_black_corners()
    self.perform_shadow_correction()
    self.fit_correction_curves()
    
    return {
        'mode': 'calibration',
        'color_regions': self.color_regions,
        'correction_curves': self.correction_curves,
        # Full calibration data!
    }
```

### Decision Flowchart

```
Photo taken
    ↓
Extract colors (HSV detection)
    ↓
┌─────────────────────────┐
│ force_analysis = true?  │
└─────────┬───────────────┘
          │
    Yes ──┼── Has 1+ colors? → mode: 'analysis_only'
          │
          └── No colors → error
          
    No ───┴── Has 4+ colors? → mode: 'calibration' 
                               (extract corners, fit curves)
          
          └── Has 1-3 colors? → mode: 'analysis_only'
          
          └── Has 0 colors → error
```

---

## 💾 Data Flow

### Calibration Flow

```
1. User opens calibration screen
2. Takes photo of 6-color chart
3. Call: processCalibrationImage(photoUri)
   └─ forceAnalysis = false
4. Python detects 6 colors
5. Python calculates correction curves
6. Returns mode: 'calibration'
7. App saves correction_curves to AsyncStorage
   └─ calibrationData = { correction_curves, color_regions, ... }
```

### Analysis Flow

```
1. User opens spectral widget
2. Takes photo of red phone case
3. Call: processAnalysisImage(photoUri)
   └─ forceAnalysis = true
4. Python detects 1 color (red)
5. Python returns analysis_only (no curves)
6. Returns mode: 'analysis_only'
7. App loads calibrationData from AsyncStorage
8. App applies correction: applyCalibrationToRGB(rgb, calibrationData)
   └─ Uses saved correction_curves from step 7 of calibration
```

**Key Point**: Calibration generates curves ONCE, analysis uses them MANY times

---

## ⚙️ Configuration Per Screen

### Calibration Screen (spectral-calibration.tsx)

```typescript
import { processCalibrationImage } from '@/lib/pythonBridge';

// When user takes photo
async function handleCalibration() {
  const result = await processCalibrationImage(photoUri);
  
  if (result.mode === 'calibration') {
    // SUCCESS: Got correction curves
    setCalibrationData({
      correction_curves: result.correction_curves,
      color_regions: result.color_regions,
      corrected_intensities: result.corrected_intensities,
    });
  } else if (result.mode === 'analysis_only') {
    // FAIL: Not enough colors
    alert(`Only ${result.num_colors_detected} colors detected. Need 4-6 colors.`);
  }
}
```

### Widget (ColorSpectrumWidget.tsx)

```typescript
import { processAnalysisImage } from '@/lib/pythonBridge';

// When user takes photo
async function analyzeColors() {
  const result = await processAnalysisImage(photoUri);
  
  if (result.mode === 'analysis_only') {
    // Extract detected colors
    const colors = result.color_regions;
    
    // Apply calibration if available
    if (calibrationData?.correction_curves) {
      for (const [name, region] of Object.entries(colors)) {
        const corrected = applyCalibrationToRGB(
          region.mean_rgb,
          calibrationData
        );
        // Use corrected RGB
      }
    } else {
      // Use raw RGB (no calibration)
    }
  }
}
```

---

## 🚦 Status Indicators

### In UI

**Calibration Screen**:
```typescript
{mode === 'calibration' && (
  <Text style={{ color: 'green' }}>
    ✅ Calibration Complete
  </Text>
)}

{mode === 'analysis_only' && (
  <Text style={{ color: 'orange' }}>
    ⚠️ Need 4-6 colors for calibration
  </Text>
)}
```

**Widget**:
```typescript
{hasCalibration && (
  <View style={styles.badge}>
    <Text>✓ Calibration Applied</Text>
  </View>
)}

{!hasCalibration && (
  <View style={[styles.badge, styles.warningBadge]}>
    <Text>⚠ Raw Values</Text>
  </View>
)}
```

---

## 📝 Summary

| When | Use This Function | Parameters | Expected Result |
|------|-------------------|------------|-----------------|
| Calibrating camera | `processCalibrationImage()` | photoUri | `mode: 'calibration'` |
| Analyzing colors | `processAnalysisImage()` | photoUri | `mode: 'analysis_only'` |
| Custom processing | `processSpectralImage()` | photoUri, forceAnalysis | Either mode |

**Remember**: 
- Calibration = Generate correction curves (do once with chart)
- Analysis = Use existing curves (do many times with objects)
- Both work offline with Chaquopy! 🚀
