# EAS Development Build Instructions

This document provides step-by-step instructions for building and deploying the ColorUpdate app with camera and color spectrum analysis features using Expo EAS Build.

## Prerequisites

✅ EAS CLI installed globally: `npm install -g eas-cli`  
✅ Logged into Expo account: `muthu_manoj_l`  
✅ Project ID: `2ba3a18c-392c-4722-8802-e7d27d9610a5`  
✅ Camera and Image Picker plugins configured  

## Project Configuration

### app.json Updates
The following plugins have been added:
- `expo-camera` - For capturing images
- `expo-image-picker` - For selecting from gallery

### Permissions Configured

**Android:**
- `android.permission.CAMERA`
- `android.permission.READ_EXTERNAL_STORAGE`
- `android.permission.WRITE_EXTERNAL_STORAGE`
- `android.permission.READ_MEDIA_IMAGES`

**iOS:**
- `NSCameraUsageDescription`
- `NSPhotoLibraryUsageDescription`
- `NSPhotoLibraryAddUsageDescription`

## Building Development Client

### 1. Build for Android (Development)

```bash
cd "c:\Users\Muthu Manoj L\Downloads\ColorUpdate-main\ColorUpdate-main"
eas build --profile development --platform android
```

**What this does:**
- Creates a development build APK
- Includes all native modules (expo-camera, expo-image-picker)
- Installs on your Android device
- Connects to Metro bundler for live reloads

**Build time:** ~10-15 minutes  
**Output:** APK file that can be installed on Android devices

### 2. Build for iOS (Development) - Optional

```bash
eas build --profile development --platform ios
```

**Requirements:**
- Apple Developer Account
- iOS device registered in Apple Developer Portal

### 3. Build for Both Platforms

```bash
eas build --profile development --platform all
```

## Build Profiles

### Development Profile
```json
{
  "developmentClient": true,
  "distribution": "internal",
  "android": {
    "buildType": "apk",
    "gradleCommand": ":app:assembleDebug"
  },
  "channel": "development"
}
```

**Use this for:**
- Testing camera and image features
- Development and debugging
- Internal team testing

### Preview Profile
```json
{
  "distribution": "internal",
  "android": {
    "buildType": "apk"
  },
  "channel": "preview"
}
```

**Use this for:**
- Stakeholder demos
- Pre-production testing
- Internal distribution

### Production Profile
```json
{
  "android": {
    "buildType": "apk"
  },
  "channel": "production"
}
```

**Use this for:**
- Final release builds
- App store submissions

## Installation Steps

### After Build Completes

1. **Download the APK:**
   - EAS will provide a download link
   - Or visit: https://expo.dev/accounts/muthu_manoj_l/projects/my-expo-app/builds

2. **Install on Android Device:**
   ```bash
   # Option 1: Direct install via ADB
   adb install path/to/downloaded.apk
   
   # Option 2: Transfer APK to device and install manually
   # Enable "Install from Unknown Sources" in device settings
   ```

3. **Start Metro Bundler:**
   ```bash
   npx expo start --dev-client
   ```

4. **Open the App:**
   - Launch the installed app on your device
   - It will connect to the Metro bundler
   - You can now test all features including camera and color analysis

## Testing the Camera Features

Once installed:

1. **Navigate to Device Connection**
2. **Select Camera Sensor**
3. **Grant Camera Permissions** when prompted
4. **Open Camera Preview**
5. **Capture Images**
6. **View in Color Spectrum Analysis Widget** (Sync tab)

## Update Over-The-Air (OTA)

After making code changes (not native config):

```bash
# Publish update to development channel
eas update --branch development --message "Your update message"
```

The app will automatically download updates without rebuilding.

## Troubleshooting

### Build Fails

**Check:**
- Internet connection
- Expo account credentials
- EAS Build queue status

**Solution:**
```bash
eas build:list  # Check recent builds
eas build:cancel  # Cancel stuck build
```

### Camera Not Working

**Check:**
- Permissions granted in device settings
- Development build installed (not Expo Go)
- Camera plugin properly configured

**Solution:**
Rebuild with:
```bash
eas build --profile development --platform android --clear-cache
```

### Metro Connection Issues

**Check:**
- Same WiFi network for device and computer
- Firewall not blocking port 8081

**Solution:**
```bash
npx expo start --dev-client --tunnel  # Use tunnel mode
```

## Build Status Monitoring

### Check Build Progress

```bash
# List all builds
eas build:list

# View specific build
eas build:view [BUILD_ID]

# Check build logs
eas build:logs [BUILD_ID]
```

### Build Dashboard
Visit: https://expo.dev/accounts/muthu_manoj_l/projects/my-expo-app/builds

## Environment Variables

If you need to add environment variables:

```bash
# Set secret
eas secret:create --name SECRET_NAME --value secret_value --type string

# List secrets
eas secret:list

# Use in app
process.env.SECRET_NAME
```

## Build Commands Reference

```bash
# Build development APK for Android
eas build --profile development --platform android

# Build with cleared cache
eas build --profile development --platform android --clear-cache

# Build specific version
eas build --profile development --platform android --message "v1.0.1 - Camera features"

# Build locally (requires Android Studio or Xcode)
eas build --profile development --platform android --local

# Check build configuration
eas build:configure

# View build credentials
eas credentials
```

## CI/CD Integration

For automated builds on code push:

1. **GitHub Actions Example:**
```yaml
name: EAS Build
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx eas-cli build --platform android --non-interactive --profile preview
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

## Next Steps After Build

1. ✅ Install development APK on device
2. ✅ Test camera capture functionality
3. ✅ Test color spectrum analysis
4. ✅ Verify local image storage
5. ✅ Test gallery selection
6. ✅ Ensure existing ESP32 features still work

## Build Specifications

**Android Development Build:**
- Package: `com.muthu_manoj_l.myexpoapp`
- Min SDK: 23 (Android 6.0)
- Target SDK: 34 (Android 14)
- Build Type: APK (Debug)

**Size Estimate:**
- APK Size: ~50-80 MB
- Installed Size: ~100-150 MB

## Support

- **Expo Documentation:** https://docs.expo.dev/build/introduction/
- **EAS Build Status:** https://status.expo.dev/
- **Discord:** https://chat.expo.dev/

## Quick Reference

```bash
# Essential Commands
eas login                    # Login to Expo
eas whoami                   # Check logged in user
eas build --profile development --platform android  # Build dev APK
eas build:list              # List builds
eas update                  # Push OTA update
npx expo start --dev-client # Start dev server

# Project URLs
Dashboard: https://expo.dev/accounts/muthu_manoj_l/projects/my-expo-app
Builds: https://expo.dev/accounts/muthu_manoj_l/projects/my-expo-app/builds
Updates: https://expo.dev/accounts/muthu_manoj_l/projects/my-expo-app/updates
```

---

**Last Updated:** October 21, 2025  
**Build Profile:** Development  
**Platform:** Android (Primary), iOS (Optional)  
**Developer:** Muthu Manoj L
