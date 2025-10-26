# Chaquopy Setup - Calibration + Spectral Analysis
## Complete Guide for Both Features

> **Status**: ✅ Ready to implement  
> **Date**: October 24, 2025  
> **Architecture**: Unified Python processing for calibration AND analysis

---

## 🎯 Overview

This guide covers setting up **Chaquopy** to support BOTH:
1. **Calibration Mode** - Takes photo of 6-color chart, generates correction curves
2. **Analysis Mode** - Takes photo of 1-3 colored objects, applies calibration

### Current Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Python Script (`spectral_processor.py`) | ✅ Complete | Supports `force_analysis` parameter |
| Native Module (`SpectralProcessorModule.kt`) | ✅ Updated | Now accepts `forceAnalysis` option |
| TypeScript Bridge (`pythonBridge.ts`) | ✅ Updated | Unified interface for both modes |
| HTTP Server Fallback | ✅ Working | Development mode with WiFi |
| Android Build Config | ⚠️ Pending | Need to run `npx expo run:android` |

---

## 📋 How It Works

### Development Mode (Current)
```
📱 React Native App
    ↓ (Base64 image + force_analysis flag)
🌐 HTTP Request to 172.16.1.232:5000
    ↓
🐍 Python Flask Server
    ↓
📊 spectral_processor.py
    ↓ (JSON result)
📱 Display results
```

**Pros**: Easy to develop and debug  
**Cons**: Requires WiFi, needs computer running server

### Production Mode (Target)
```
📱 React Native App
    ↓ (File path + forceAnalysis option)
🔧 Native Module (SpectralProcessorModule.kt)
    ↓
🐍 Chaquopy Python (embedded in APK)
    ↓
📊 spectral_processor.py
    ↓ (Native Map result)
📱 Display results
```

**Pros**: 100% offline, no WiFi needed, faster  
**Cons**: Larger APK size (~80MB), requires proper setup

---

## 🔄 Two Processing Modes

### Mode 1: Calibration (4+ colors detected)

**Used by**: `app/spectral-calibration.tsx`  
**Purpose**: Generate correction curves from 6-color chart

```typescript
// Calibration screen usage
import { processCalibrationImage } from '@/lib/pythonBridge';

const result = await processCalibrationImage(photoUri);
// forceAnalysis = false (allows calibration mode)

if (result.success && result.mode === 'calibration') {
  // Save correction curves
  const correctionCurves = result.correction_curves;
  // { red: {...}, green: {...}, blue: {...} }
}
```

**Python behavior**:
- Detects 6 colors: Red, Yellow, Green, Cyan, Blue, Magenta
- Detects 4 black corners for baseline
- Calculates correction factors for each wavelength
- Returns `mode: 'calibration'` with full correction data

### Mode 2: Analysis (1-3 colors, force_analysis=true)

**Used by**: `components/ColorSpectrumWidget.tsx`  
**Purpose**: Analyze colored objects, apply existing calibration

```typescript
// Widget usage
import { processAnalysisImage } from '@/lib/pythonBridge';

const result = await processAnalysisImage(photoUri);
// forceAnalysis = true (always analysis mode)

if (result.success && result.mode === 'analysis_only') {
  // Get detected colors
  const colors = result.color_regions;
  // Apply calibration if available
  applyCalibrationToRGB(colors, calibrationData);
}
```

**Python behavior**:
- Detects 1-3 distinct colors in image
- Returns `mode: 'analysis_only'`
- NO correction curves (use pre-saved calibration in app)
- Even if 4+ colors detected, force_analysis prevents calibration mode

---

## 🛠️ Setup Steps

### Step 1: Generate Android Native Code

```powershell
# Run this to create android/ folder
cd "c:\Users\Muthu Manoj L\Downloads\ColorUpdate-main\ColorUpdate-main"
npx expo run:android
```

**What this does**:
- Creates `android/` folder with Gradle build files
- Generates `MainActivity.kt`, `MainApplication.kt`
- Builds development APK and installs on connected device

**Requirements**:
- Android device connected via USB with debugging enabled
- Android SDK and tools installed
- Java JDK 17 or higher

### Step 2: Copy Python Script

```powershell
# Create python directory in Android project
mkdir android\app\src\main\python

# Copy the spectral processor
copy python\spectral_processor.py android\app\src\main\python\
```

**What this does**:
- Places Python script where Chaquopy can find it
- Must be in `src/main/python/` directory
- Chaquopy will package this into APK

### Step 3: Configure Chaquopy in build.gradle

**File**: `android/build.gradle` (project-level)

```gradle
buildscript {
    ext {
        buildToolsVersion = "34.0.0"
        minSdkVersion = 24
        compileSdkVersion = 34
        targetSdkVersion = 34
    }
    repositories {
        google()
        mavenCentral()
        maven { url "https://chaquo.com/maven" }  // ← ADD THIS
    }
    dependencies {
        classpath "com.android.tools.build:gradle:8.1.1"
        classpath "com.chaquo.python:gradle:15.0.1"  // ← ADD THIS
    }
}
```

**File**: `android/app/build.gradle` (app-level)

```gradle
apply plugin: "com.android.application"
apply plugin: "com.chaquo.python"  // ← ADD THIS (after android plugin)

// ... existing config ...

android {
    // ... existing settings ...
    
    defaultConfig {
        // ... existing settings ...
        
        ndk {
            abiFilters "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
        }
        
        python {
            pip {
                install "opencv-python"
                install "numpy"
                install "scipy"
                install "Pillow"
            }
        }
    }
    
    // ... rest of config ...
}
```

### Step 4: Verify Native Module Registration

**File**: `android/app/src/main/java/com/.../MainApplication.kt`

```kotlin
override fun getPackages(): List<ReactPackage> {
    return PackageList(this).packages.apply {
        add(SpectralProcessorPackage())  // ← Verify this exists
    }
}
```

**Note**: Your existing `SpectralProcessorModule.kt` and `SpectralProcessorPackage.kt` are already correct!

### Step 5: Build Production APK

```powershell
cd android
.\gradlew assembleRelease

# Or use EAS Build
cd ..
npx eas build --platform android --profile production
```

**Output**: APK in `android/app/build/outputs/apk/release/`

---

## 📱 Usage in App

### Automatic Mode Detection

The app automatically detects which mode to use:

```typescript
import { isNativeAvailable, processSpectralImage } from '@/lib/pythonBridge';

// Check what's available
if (isNativeAvailable()) {
  console.log('🔧 Using Chaquopy (offline)');
} else {
  console.log('🌐 Using HTTP server (development)');
}

// Process image (works in both modes!)
const result = await processSpectralImage(imageUri, forceAnalysis);
```

### Calibration Screen (spectral-calibration.tsx)

```typescript
import { processCalibrationImage } from '@/lib/pythonBridge';

async function handleCalibration(photoUri: string) {
  // Allow calibration mode (forceAnalysis = false)
  const result = await processCalibrationImage(photoUri);
  
  if (result.success && result.mode === 'calibration') {
    // Save correction curves
    await saveCalibrationData({
      correction_curves: result.correction_curves,
      color_regions: result.color_regions,
      corrected_intensities: result.corrected_intensities,
    });
  } else if (result.mode === 'analysis_only') {
    // Only 1-3 colors detected, can't calibrate
    alert(`Only ${result.num_colors_detected} colors detected. Need 4+ colors for calibration.`);
  }
}
```

### Widget (ColorSpectrumWidget.tsx)

```typescript
import { processAnalysisImage } from '@/lib/pythonBridge';

async function analyzeColors(photoUri: string) {
  // Force analysis mode (forceAnalysis = true)
  const result = await processAnalysisImage(photoUri);
  
  if (result.success && result.mode === 'analysis_only') {
    // Get detected colors
    const colorRegions = result.color_regions;
    
    // Apply calibration if available
    if (calibrationData) {
      for (const [colorName, region] of Object.entries(colorRegions)) {
        const corrected = applyCalibrationToRGB(
          region.mean_rgb,
          calibrationData
        );
        // Use corrected values
      }
    }
  }
}
```

---

## 🔍 Testing Checklist

### Development Mode (HTTP Server)

- [ ] Start Python server: `python python/spectral_server.py`
- [ ] Open calibration screen
- [ ] Take photo of 6-color chart
- [ ] Verify calibration mode triggers (4+ colors)
- [ ] Check correction curves saved
- [ ] Open spectral widget
- [ ] Take photo of red phone case
- [ ] Verify analysis mode (1-3 colors)
- [ ] Verify calibration applied

### Production Mode (Chaquopy)

- [ ] Build APK with Chaquopy
- [ ] Install on device
- [ ] **Enable airplane mode** (test offline)
- [ ] Open calibration screen
- [ ] Take photo of 6-color chart
- [ ] Verify calibration works offline
- [ ] Open spectral widget
- [ ] Take photo of colored object
- [ ] Verify analysis works offline
- [ ] Check console logs: "Using native Chaquopy module"

---

## 🐛 Troubleshooting

### Error: "Native module not available"

**Cause**: Chaquopy not properly configured or wrong build type

**Solution**:
1. Check `android/app/build.gradle` has `apply plugin: "com.chaquo.python"`
2. Verify Python script in `android/app/src/main/python/spectral_processor.py`
3. Rebuild: `cd android && .\gradlew clean && .\gradlew assembleRelease`

### Error: "Module 'spectral_processor' not found"

**Cause**: Python script not in correct directory

**Solution**:
```powershell
# Verify file exists
dir android\app\src\main\python\spectral_processor.py

# If not, copy again
copy python\spectral_processor.py android\app\src\main\python\
```

### Error: "No module named 'cv2'"

**Cause**: OpenCV not installed in Chaquopy

**Solution**:
Add to `android/app/build.gradle`:
```gradle
python {
    pip {
        install "opencv-python==4.8.1.78"  // Specific version
        install "numpy"
        install "scipy"
        install "Pillow"
    }
}
```

### Calibration Mode When It Shouldn't Be

**Cause**: Widget not using `forceAnalysis=true`

**Solution**:
Use `processAnalysisImage()` instead of `processSpectralImage()`:
```typescript
// ❌ Wrong
const result = await processSpectralImage(uri, false);

// ✅ Correct
const result = await processAnalysisImage(uri);
```

### Analysis Mode When Calibrating

**Cause**: Calibration screen using `forceAnalysis=true`

**Solution**:
Use `processCalibrationImage()` instead of `processAnalysisImage()`:
```typescript
// ❌ Wrong
const result = await processAnalysisImage(uri);

// ✅ Correct
const result = await processCalibrationImage(uri);
```

---

## 📊 Python Script Details

### Process Method Signature

```python
def process(self, force_analysis: bool = False) -> Dict:
    """
    Main processing pipeline
    
    Args:
        force_analysis: If True, always return analysis_only mode
        
    Returns:
        Dict with 'mode', 'color_regions', etc.
    """
```

### Return Modes

**Calibration Mode** (4+ colors, force_analysis=False):
```json
{
  "success": true,
  "mode": "calibration",
  "color_regions": { ... 6 colors ... },
  "correction_curves": {
    "red": { "625": 1.00, ... },
    "green": { "530": 1.00, ... },
    "blue": { "460": 1.42, ... }
  },
  "num_colors_detected": 6
}
```

**Analysis Mode** (1-3 colors OR force_analysis=True):
```json
{
  "success": true,
  "mode": "analysis_only",
  "color_regions": { ... 1-3 colors ... },
  "num_colors_detected": 1,
  "message": "Analysis mode: detected 1 color region(s)"
}
```

---

## 📦 APK Size Estimates

| Component | Size |
|-----------|------|
| Base React Native APK | ~30 MB |
| Python Runtime | ~20 MB |
| OpenCV + NumPy + SciPy | ~25 MB |
| App Code + Assets | ~5 MB |
| **Total** | **~80 MB** |

**Note**: Large but acceptable for a specialized app. Users download once.

---

## ✅ Final Checklist Before Building

- [ ] Python script supports `force_analysis` parameter ✅
- [ ] Native module accepts `forceAnalysis` option ✅
- [ ] TypeScript bridge has unified interface ✅
- [ ] Calibration screen uses `processCalibrationImage()` ⚠️ (update needed)
- [ ] Widget uses `processAnalysisImage()` ⚠️ (update needed)
- [ ] HTTP server still works for development ✅
- [ ] Ready to run `npx expo run:android` ✅

---

## 🚀 Next Steps

1. **Run `npx expo run:android`** to generate android/ folder
2. **Copy Python script** to `android/app/src/main/python/`
3. **Configure Chaquopy** in build.gradle files
4. **Update UI code** to use new bridge functions
5. **Build release APK** with `.\gradlew assembleRelease`
6. **Test offline** with airplane mode enabled

---

## 📝 Notes

- Both calibration and analysis work with the SAME Python script
- The `force_analysis` parameter controls which mode is used
- Native module and HTTP server use the same interface
- App automatically detects which mode to use (native vs HTTP)
- Calibration data is saved locally and applied during analysis

**Ready to build!** 🎉
