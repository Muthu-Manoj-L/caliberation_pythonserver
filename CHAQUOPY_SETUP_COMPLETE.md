# 🐍 Chaquopy Offline Setup - Complete Guide

## 📋 Overview

This guide will help you build a **100% offline Android APK** with Python spectral processing using **Chaquopy**.

---

## ✅ What You Already Have

Your project is **90% ready** for Chaquopy! You have:
- ✅ `SpectralProcessorModule.kt` - Native bridge module
- ✅ `spectral_processor.py` - Python processing script (accepts bytes)
- ✅ `MainActivity.kt` and `MainApplication.kt` - App setup
- ✅ `SpectralProcessorPackage.kt` - Package registration

---

## 🔧 Step-by-Step Setup

### **Step 1: Build the Development Build**

Since you're using Expo, you need to create a development build with native code:

```bash
cd "c:\Users\Muthu Manoj L\Downloads\ColorUpdate-main\ColorUpdate-main"

# Build for Android
npx expo run:android
```

This will:
1. Generate the `android/` folder with Gradle files
2. Compile native modules (Chaquopy)
3. Install on your connected device

### **Step 2: Verify Android Folder Structure**

After running `expo run:android`, you should have:

```
android/
├── app/
│   ├── build.gradle  ← Chaquopy config here
│   └── src/
│       └── main/
│           ├── java/com/muthu_manoj_l/myexpoapp/
│           │   ├── MainActivity.kt
│           │   ├── MainApplication.kt
│           │   ├── SpectralProcessorModule.kt
│           │   └── SpectralProcessorPackage.kt
│           └── python/  ← Python files go here!
│               └── spectral_processor.py
└── build.gradle  ← Chaquopy plugin here
```

### **Step 3: Copy Python Files**

Copy your Python script to the Android source:

```bash
# Create python directory
mkdir -p android/app/src/main/python

# Copy spectral_processor.py
copy python\spectral_processor.py android\app\src\main\python\
```

### **Step 4: Configure Chaquopy in `build.gradle`**

Edit `android/app/build.gradle` and add:

```gradle
plugins {
    id 'com.android.application'
    id 'com.chaquo.python'  // ← Add this
}

android {
    // ... existing config ...
    
    defaultConfig {
        // ... existing config ...
        
        // Chaquopy Python configuration
        python {
            pip {
                install "numpy"
                install "opencv-python"
                install "scipy"
                install "Pillow"
            }
        }
    }
    
    // ... rest of config ...
}
```

And in the project-level `android/build.gradle`:

```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
        maven { url "https://chaquo.com/maven" }  // ← Add this
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:7.4.2'
        classpath 'com.chaquo.python:gradle:14.0.2'  // ← Add this
    }
}
```

### **Step 5: Register the Native Module**

In `MainApplication.kt`, add:

```kotlin
package com.muthu_manoj_l.myexpoapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {
    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> {
                val packages = PackageList(this).packages.toMutableList()
                // Add our native module
                packages.add(SpectralProcessorPackage())  // ← Add this!
                return packages
            }
            
            // ... rest of config ...
        }
    
    // ... rest of class ...
}
```

### **Step 6: Update React Native Code to Use Native Module**

Update `lib/pythonBridge.ts`:

```typescript
import { NativeModules, Platform } from 'react-native';

const { SpectralProcessor } = NativeModules;

export async function processImageNative(imageUri: string): Promise<any> {
  if (Platform.OS !== 'android') {
    throw new Error('Native Python processing only available on Android');
  }
  
  if (!SpectralProcessor) {
    throw new Error('SpectralProcessor native module not available');
  }
  
  try {
    // Call native module
    const result = await SpectralProcessor.processImage(imageUri);
    return result;
  } catch (error) {
    console.error('Native processing error:', error);
    throw error;
  }
}

// Check if native module is available
export function isNativeAvailable(): boolean {
  return Platform.OS === 'android' && !!SpectralProcessor;
}
```

### **Step 7: Update Widget to Use Native Module**

In `components/ColorSpectrumWidget.tsx`, update to use native processing:

```typescript
import { processImageNative, isNativeAvailable } from '@/lib/pythonBridge';

const analyzeImageColors = async (imageUri: string, calibrationData?: CalibrationData | null): Promise<ColorSpectrumData> => {
  console.log('🔬 Starting spectral analysis...');
  
  // Check if native module is available (production APK)
  if (isNativeAvailable()) {
    console.log('✅ Using native Python processing (offline)');
    try {
      const result = await processImageNative(imageUri);
      // Process result (same as HTTP server response)
      // ... rest of processing ...
    } catch (error) {
      console.error('Native processing failed:', error);
      // Fallback to HTTP server if in development
    }
  }
  
  // Fallback to HTTP server (development mode)
  console.log('📤 Using HTTP server (development mode)');
  // ... existing HTTP code ...
};
```

---

## 🏗️ Building the APK

### **Development Build (with Metro)**

```bash
npx expo run:android
```

This builds and installs on your connected device.

### **Production APK (Standalone)**

```bash
# Build release APK
cd android
./gradlew assembleRelease

# APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

Or use EAS Build:

```bash
eas build --platform android --profile production
```

---

## ✅ Verification

After building, verify the APK works offline:

1. **Install APK** on device
2. **Turn on Airplane Mode**
3. **Disable WiFi and Mobile Data**
4. **Open App**
5. **Take Photo & Analyze**

Expected:
```
✅ Using native Python processing (offline)
✅ Python analysis complete
✅ Spectral data processed
```

---

## 📊 APK Size Comparison

| Build Type | Size | Includes |
|-----------|------|----------|
| **Without Chaquopy** | ~30 MB | Just React Native |
| **With Chaquopy** | ~80 MB | + Python + OpenCV + NumPy |

The extra 50MB is worth it for 100% offline operation!

---

## 🐛 Troubleshooting

### **"Module 'spectral_processor' not found"**

**Solution:** Make sure `spectral_processor.py` is in `android/app/src/main/python/`

### **"Package 'cv2' not found"**

**Solution:** Add to `build.gradle`:
```gradle
python {
    pip {
        install "opencv-python"
    }
}
```

### **Native module returns null**

**Solution:** Check Python script has `process()` method that returns a dict

### **APK crashes on startup**

**Solution:** Check `MainApplication.kt` registers `SpectralProcessorPackage()`

---

## 📝 Summary

**Current State:** HTTP Server (needs WiFi)
**After Setup:** Native Chaquopy (100% offline)

**Steps:**
1. ✅ Run `npx expo run:android`
2. ✅ Copy `spectral_processor.py` to `android/app/src/main/python/`
3. ✅ Configure Chaquopy in `build.gradle`
4. ✅ Register module in `MainApplication.kt`
5. ✅ Update React Native code to use native module
6. ✅ Build production APK

**Result:** Self-contained Android app with Python spectral processing!

---

## 🎯 Next Steps

Want me to:
1. **Generate the gradle configuration files?**
2. **Create the native bridge code?**
3. **Show you how to test the native module?**

Let me know what you need! 🚀
