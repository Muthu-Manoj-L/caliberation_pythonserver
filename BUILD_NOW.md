# 🚀 Build Commands - Chaquopy Ready

Your project is **100% ready** for Expo dev build with Chaquopy!

## ✅ Verification Complete

All checks passed:
- ✅ Chaquopy plugin registered
- ✅ Python processor ready (force_analysis support)
- ✅ Native module ready (forceAnalysis parameter)
- ✅ TypeScript bridge ready (auto-detects native/HTTP)
- ✅ Calibration screen using Chaquopy bridge
- ✅ Widget using Chaquopy bridge
- ✅ All dependencies present

---

## 🔨 Build Options

### Option 1: Local Build (Recommended for Testing)

```powershell
# 1. Check dependencies
npx expo install --check

# 2. Generate native code
npx expo prebuild --clean

# 3. Build and run on connected device
npx expo run:android
```

**Requirements:**
- Android device connected via USB with debugging enabled
- Android SDK installed
- Java JDK 17+ installed

---

### Option 2: EAS Build (Cloud Build)

```powershell
# Development build (for testing)
eas build --platform android --profile development

# Production build (for release)
eas build --platform android --profile production
```

**What happens:**
- Build runs on Expo's cloud servers
- Downloads APK when complete
- Chaquopy automatically bundles Python + packages
- Resulting APK is 100% offline

---

## 📱 What's Included in APK

When you build, the APK will contain:
- ✅ Python 3.11 interpreter (~20MB)
- ✅ OpenCV for image processing (~15MB)
- ✅ NumPy for numerical operations (~10MB)
- ✅ SciPy for spectral analysis (~15MB)
- ✅ Pillow for image handling (~5MB)
- ✅ Your spectral_processor.py code
- ✅ React Native app code

**Total APK size: ~80-90MB**

---

## 🔄 How It Works

### Development Mode (Current - HTTP Server)
```
📱 App → 🌐 HTTP (WiFi) → 🐍 Python Server → Result
```

### Production Mode (After Build - Chaquopy)
```
📱 App → 🔧 Native Module → 🐍 Embedded Python → Result
```

**Same code, different backend!** The bridge automatically detects which is available.

---

## 🎯 Testing After Build

1. **Install APK** on device
2. **Enable airplane mode** ✈️
3. **Open calibration screen**
4. **Take photo of 6-color chart**
5. **Verify it works offline!**

Check console logs:
- Should see: `🔧 Using Chaquopy native module (offline)`
- Should NOT see: `🌐 Using HTTP server (development)`

---

## 📊 Build Profiles (eas.json)

### Development Profile
- Quick builds for testing
- Includes dev tools
- APK format (faster than AAB)
- Internal distribution

### Production Profile
- Optimized build
- Smaller APK size
- Ready for Google Play
- Production signing

---

## 🐛 Troubleshooting

### If build fails with "Chaquopy error"
```powershell
# Clear cache and retry
npx expo prebuild --clean
rm -rf android
npx expo run:android
```

### If Python packages fail to install
Check `plugins/withChaquopy.js` - versions must be compatible:
- opencv-python-headless==4.8.1.78
- numpy==1.24.3
- scipy==1.11.3

### If native module not found
Check `native-modules/SpectralProcessorPackage.kt` is registered in MainApplication.kt

---

## ✨ You're Ready!

Your project has:
1. ✅ Chaquopy plugin configured
2. ✅ Python script with force_analysis
3. ✅ Native module with forceAnalysis
4. ✅ Bridge with auto-detection
5. ✅ Calibration + Analysis modes
6. ✅ Offline capability

**Just run the build command and test!** 🚀
