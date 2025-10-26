# How to Use Your Development Build

## What You're Getting

A **Development Build APK** that:
- ✅ Has camera module built-in (works offline!)
- ✅ Has image picker built-in (works offline!)
- ✅ Connects to your laptop's Metro bundler
- ✅ Enables live code updates without rebuilding
- ✅ Works on same WiFi as your laptop

## Step-by-Step Setup

### 1. After Build Completes (~15 minutes)

**Download APK:**
- Visit: https://expo.dev/accounts/muthu_manoj_l/projects/my-expo-app/builds
- Click on your latest development build
- Download the APK file

**Or use command:**
```bash
# The build will show a download link like:
https://expo.dev/artifacts/eas/xxxxx.apk
```

### 2. Install APK on Your Android Phone

**Method 1: ADB Install** (if phone connected via USB)
```bash
adb install path/to/downloaded.apk
```

**Method 2: Direct Install** (recommended)
1. Transfer APK to your phone (email, Drive, etc.)
2. Open APK file on phone
3. Allow "Install from Unknown Sources" if prompted
4. Install the app

### 3. Daily Development Workflow

#### On Your Laptop:

```bash
# Navigate to project
cd "c:\Users\Muthu Manoj L\Downloads\ColorUpdate-main\ColorUpdate-main"

# Start Metro bundler
npx expo start --dev-client
```

**You'll see:**
```
› Metro waiting on exp+my-expo-app://...
› Scan the QR code above
› Using development build
```

#### On Your Phone:

1. **Connect to same WiFi as laptop**
2. **Open the installed development build app**
3. **Two ways to connect:**

   **Option A - Scan QR Code:**
   - The app will show a camera to scan
   - Scan the QR code from your laptop terminal
   
   **Option B - Enter URL:**
   - Shake phone to open dev menu
   - Tap "Enter URL manually"
   - Type: `192.168.1.X:8081` (your laptop's IP)

4. **Connected!** The app will load from your laptop

### 4. How to Find Your Laptop IP

**Windows:**
```powershell
ipconfig
# Look for "IPv4 Address" under your WiFi adapter
# Example: 192.168.1.48
```

**Alternative:**
```bash
# Metro will show it:
› Metro waiting on exp+my-expo-app://expo-development-client/?url=http%3A%2F%2F192.168.1.48%3A8081
                                                                       ^^^^^^^^^^^^
                                                                    Your laptop IP
```

### 5. Testing Camera Features

Once connected:

1. **Open Device Connection screen**
2. **Tap "Camera Sensor"**
3. **Grant camera permissions**
4. **Tap "Open Camera"**
5. **Take photos**
6. **Go to Sync tab**
7. **Use "Color Spectrum Analysis" widget**
8. **Select your captured images**

### 6. Making Code Changes

**With laptop Metro running and phone connected:**

1. Edit any file in VS Code
2. Save the file (Ctrl+S)
3. **Phone auto-updates instantly!** ⚡

**No need to:**
- ❌ Rebuild APK
- ❌ Reinstall app
- ❌ Restart anything

### 7. When to Rebuild APK

**You only need to rebuild when you:**
- Add/remove native modules
- Change app.json configuration
- Update native Android/iOS code
- Change permissions

**For normal development:**
- ✅ JS/TS code changes → Just save, auto-updates
- ✅ Component changes → Just save, auto-updates
- ✅ Style changes → Just save, auto-updates

## Connection Diagram

```
┌──────────────────────────────────────────────┐
│           YOUR LAPTOP                        │
│                                              │
│  Terminal:                                   │
│  > npx expo start --dev-client              │
│                                              │
│  Metro Bundler Running                      │
│  Port: 8081                                  │
│  IP: 192.168.1.48                           │
│                                              │
│  Shows QR Code                              │
│  ┌────────────┐                             │
│  │ ████ ████  │                             │
│  │ ████ ████  │  ← Scan this               │
│  │ ████ ████  │                             │
│  └────────────┘                             │
└──────────────────┬───────────────────────────┘
                   │
                   │ Same WiFi Network
                   │
                   ▼
┌──────────────────────────────────────────────┐
│           YOUR ANDROID PHONE                 │
│                                              │
│  Development Build APK Installed             │
│  ✓ Camera Module (works offline)            │
│  ✓ Image Picker (works offline)             │
│                                              │
│  1. Open app                                 │
│  2. Scan QR code OR enter URL                │
│  3. Connected to Metro!                      │
│  4. Live reload enabled                      │
│                                              │
│  Camera features work even if               │
│  laptop is off (native modules!)            │
└──────────────────────────────────────────────┘
```

## Troubleshooting

### Phone Can't Connect to Metro

**Check:**
- [ ] Both on same WiFi network
- [ ] Laptop firewall not blocking port 8081
- [ ] Correct IP address entered

**Solutions:**
```bash
# Use tunnel mode (slower but works with any network)
npx expo start --dev-client --tunnel

# Or check firewall:
# Windows: Allow Node.js through Windows Firewall
```

### Camera Not Working

**This shouldn't happen because:**
- Camera is built into APK as native module
- Works offline, no Metro connection needed

**If it does:**
- Check camera permissions in phone settings
- Reinstall APK
- Make sure you downloaded development build (not old APK)

### App Crashes on Launch

**Check:**
- Metro bundler is running on laptop
- Phone can reach laptop IP
- Try tunnel mode: `npx expo start --dev-client --tunnel`

## Quick Commands Reference

```bash
# Start Metro (daily use)
npx expo start --dev-client

# Start with tunnel (if WiFi issues)
npx expo start --dev-client --tunnel

# Start on LAN with specific port
npx expo start --dev-client --port 8081

# Clear cache and restart
npx expo start --dev-client --clear

# Check device connection
adb devices

# Install APK via ADB
adb install downloaded.apk

# View Metro logs
# (automatically shown when Metro runs)
```

## Key URLs

- **Build Dashboard:** https://expo.dev/accounts/muthu_manoj_l/projects/my-expo-app/builds
- **Download APK:** Check latest development build
- **Project:** https://expo.dev/accounts/muthu_manoj_l/projects/my-expo-app

## Benefits of This Setup

1. **Fast Development:**
   - Code changes → save → instant update on phone ⚡
   - No waiting for builds

2. **Native Modules Work:**
   - Camera works offline
   - Image picker works offline
   - All native features included

3. **Real Device Testing:**
   - Test on actual hardware
   - Real camera, real storage
   - Accurate performance

4. **Team Sharing:**
   - Share APK with team
   - Everyone can test
   - All can connect to their own Metro

## After Testing

When your features are ready for production:

```bash
# Build production APK
eas build --profile production --platform android
```

This creates optimized APK for:
- Google Play Store submission
- End users
- Production deployment

---

**Your Development Build includes:**
- ✅ expo-camera (native)
- ✅ expo-image-picker (native)
- ✅ expo-file-system (native)
- ✅ Metro bundler client
- ✅ All ColorUpdate features

**Next Step:** Wait for build to complete (~15 min), then download and install APK! 🚀
