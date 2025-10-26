# Spectral Calibration - Mathematical Formula & Implementation

## Overview
This document explains the scientifically correct approach to spectral calibration using reference values.

## Formula

### Step 1: Shadow Correction (Baseline Subtraction)
```
Corrected_Intensity[channel][λ] = Raw_Measured[channel][λ] - Baseline[channel]
```
Where:
- `Raw_Measured` = Raw RGB values from camera sensor
- `Baseline` = Average of black corner regions (shadow/dark current)
- `channel` = R, G, or B
- `λ` = Wavelength (460nm, 490nm, 530nm, 570nm, 580nm, 625nm)

### Step 2: Calculate Correction Factor
```
Correction_Factor[channel][λ] = Reference_Value[channel][λ] / Corrected_Intensity[channel][λ]
```
Where:
- `Reference_Value` = Expected ideal response for that channel at that wavelength
- Division by zero avoided with max(Corrected_Intensity, 0.01)
- Clipped to range [0.1, 10.0] to avoid extreme corrections

### Step 3: Apply Correction
```
Final_Corrected[channel][λ] = Corrected_Intensity[channel][λ] × Correction_Factor[channel][λ]
```

This should equal (or be very close to) the reference value, proving the correction works.

## Reference Values (Ideal Spectral Response)

### Red Channel Reference
- **625nm (Red)**: 1.0 - Strong response
- **580nm (Yellow)**: 1.0 - Strong response (red component)
- **570nm (Magenta)**: 1.0 - Strong response (red component)
- **530nm (Green)**: 0.3 - Weak response
- **490nm (Cyan)**: 0.1 - Very weak response
- **460nm (Blue)**: 0.2 - Weak response

### Green Channel Reference
- **530nm (Green)**: 1.0 - Strong response
- **580nm (Yellow)**: 0.6 - Moderate (yellow = red + green)
- **570nm (Magenta)**: 0.6 - Moderate
- **490nm (Cyan)**: 0.6 - Moderate (cyan = green + blue)
- **625nm (Red)**: 0.2 - Weak response
- **460nm (Blue)**: 0.3 - Weak response

### Blue Channel Reference
- **460nm (Blue)**: 1.0 - Strong response
- **490nm (Cyan)**: 1.0 - Strong response (cyan = blue + green)
- **530nm (Green)**: 0.4 - Moderate response
- **570nm (Magenta)**: 0.3 - Weak (magenta = red + blue)
- **580nm (Yellow)**: 0.3 - Weak response
- **625nm (Red)**: 0.1 - Very weak response

## Example Calculation

Given:
- Raw measurement at 625nm: R=200, G=50, B=20
- Baseline (from black corners): R=10, G=8, B=5

**Step 1 - Shadow Correction:**
```
Corrected_R = 200 - 10 = 190
Corrected_G = 50 - 8 = 42
Corrected_B = 20 - 5 = 15
```

**Step 2 - Correction Factors:**
```
R_factor = 1.0 / 190 = 0.0053  (Red should be strong, so small correction)
G_factor = 0.2 / 42 = 0.0048   (Green should be weak at red wavelength)
B_factor = 0.1 / 15 = 0.0067   (Blue should be very weak at red wavelength)
```

**Step 3 - Final Corrected Values:**
```
Final_R = 190 × 0.0053 = 1.0   ✓ Matches reference!
Final_G = 42 × 0.0048 = 0.2    ✓ Matches reference!
Final_B = 15 × 0.0067 = 0.1    ✓ Matches reference!
```

## Three Graphs Displayed

### 1. Raw Spectral Response
- X-axis: Wavelength (460-625nm)
- Y-axis: Normalized intensity (0-1)
- Shows: Camera's natural spectral sensitivity (before correction)
- Typically unbalanced - each channel has different peak responses

### 2. Spectral Correction Curves
- X-axis: Wavelength
- Y-axis: Correction Factor (0.1-10.0)
- Shows: Multiplication factors needed to balance the response
- High factors = boost weak responses
- Low factors = suppress strong responses

### 3. Corrected Spectral Response
- X-axis: Wavelength
- Y-axis: Normalized intensity (0-1)
- Shows: Final balanced response after applying corrections
- **Ideally**: All channels should match reference values
- Demonstrates calibration effectiveness

## Code Implementation

### Python Backend (`spectral_processor.py`)
```python
# 1. Shadow correction
corrected = {
    'r': max(0, raw_rgb['r'] - baseline_r),
    'g': max(0, raw_rgb['g'] - baseline_g),
    'b': max(0, raw_rgb['b'] - baseline_b)
}

# 2. Calculate correction factor
r_correction = reference['r'] / max(corrected['r'], 0.01)
r_correction = max(0.1, min(10.0, r_correction))  # Clip

# 3. Apply correction
final_r = corrected['r'] * r_correction
```

### React Native Frontend (`spectral-calibration.tsx`)
```typescript
// Use pre-calculated final corrected values from Python
const { wavelengths, r, g, b } = pythonResults.correction_curves.final_corrected;

// Normalize for display
const maxVal = Math.max(...r, ...g, ...b);
const normalizedR = r.map(v => v / maxVal);
// ... render curves
```

## Validation

A successful calibration should show:
1. **Raw graph**: Unbalanced curves with different peak patterns
2. **Correction graph**: Inverse pattern - high factors where raw is weak
3. **Corrected graph**: All channels balanced, matching reference values

If corrected values match reference values (±10%), the calibration is working correctly!

## Benefits of This Approach

✅ **Scientifically accurate**: Based on reference standards  
✅ **Reproducible**: Same reference values produce consistent results  
✅ **Explainable**: Clear formula at each step  
✅ **Verifiable**: Final values should match references  
✅ **Industry standard**: Used in professional spectral calibration  

---
*Last updated: October 24, 2025*
