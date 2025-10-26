# Camera to Gallery Feature

## Overview
This feature allows users to capture photos using a Snapchat-like camera interface and automatically save them to both the app storage and the phone's gallery.

## How It Works

### 1. **Accessing the Camera**
- Navigate to the **Device Connection** screen (Dashboard)
- Select **Camera** from the available sensors
- The camera sensor will show as "online" in the device connected area

### 2. **Camera Preview (Snapchat-style)**
- Full-screen camera preview opens automatically
- **Front/Back Camera Toggle**: Top-right button to switch between cameras
- **Close Button**: Top-left to exit camera
- **Capture Button**: Large circular button at the bottom to take a picture

### 3. **Review & Save**
After taking a picture:
- **Preview Screen** shows the captured image
- **Two Options**:
  - ❌ **Discard**: Cancel and take another photo
  - ✅ **Save**: Confirm and save the image

### 4. **Automatic Saving**
When you save an image, it is automatically stored in:
- ✅ **App Storage**: `document://camera_images/IMG_[timestamp].jpg`
- ✅ **Phone Gallery**: Saved to your device's photo library

### 5. **Using Saved Images**
- Navigate to **Sync Data** tab
- Open **Color Spectrum Analysis** widget
- Select from your captured images or gallery
- Analyze the color spectrum of each image

## Technical Implementation

### Components
- **CameraPreview.tsx**: Snapchat-style full-screen camera UI
- **cameraService.ts**: Handles image storage and gallery saving
- **ColorSpectrumWidget.tsx**: Image selection and color analysis

### Native Modules Used
- `expo-camera`: Camera access and photo capture
- `expo-media-library`: Saving images to phone gallery
- `expo-file-system`: Local app storage management
- `expo-image-manipulator`: Image processing for color analysis

### Permissions Required
- ✅ Camera Permission
- ✅ Media Library Write Permission (for saving to gallery)
- ✅ Photo Library Read Permission (for selecting images)

## Features

### Camera Interface
- 📸 **Full-screen camera preview**
- 🔄 **Front/back camera toggle**
- 👁️ **Review before saving**
- ⚡ **Fast capture with loading indicators**
- ✅ **Confirmation before saving**

### Storage
- 📁 **Local app storage** (always available)
- 📱 **Phone gallery** (with permission)
- 🔢 **Timestamped filenames** for easy organization
- 📊 **Image metadata** (timestamp, filename, URI)

### Color Analysis Integration
- 🎨 **Select captured images** for analysis
- 🖼️ **Gallery picker** for external images
- 📈 **Real-time color spectrum** extraction
- 🎯 **Unique results** per image using actual pixel data

## Building for Production

To include this feature in a new build:

```bash
# Create a new development build
eas build --profile development --platform android

# Or create a production build
eas build --profile production --platform android
```

### Required Packages (Already Installed)
```json
{
  "expo-camera": "~17.0.8",
  "expo-media-library": "~17.0.9",
  "expo-file-system": "~19.0.17",
  "expo-image-manipulator": "~14.0.7",
  "expo-image-picker": "^17.0.8"
}
```

### Permissions Configured in app.json
```json
{
  "expo-camera": {
    "cameraPermission": "Allow app to access camera"
  },
  "expo-media-library": {
    "photosPermission": "Allow app to save photos to gallery",
    "savePhotosPermission": "Allow app to save photos to gallery"
  }
}
```

## Usage Flow

```
Dashboard → Select Camera Sensor → Camera Shows "Online"
    ↓
Open Camera → Full-Screen Preview
    ↓
Take Picture → Review Image
    ↓
Save Image → Saved to App + Gallery
    ↓
Sync Data Tab → Color Spectrum Widget → Select Image → Analyze Colors
```

## Success Messages
- ✅ "Image saved successfully!" - After confirming save
- ✅ Image appears in local storage and gallery
- ✅ Image available in Color Spectrum Analysis widget

## Error Handling
- ❌ Permission denied → Alert with explanation
- ❌ Save failed → Alert with error message
- ❌ Camera unavailable → Graceful fallback
- ⚠️ Gallery save fails → Image still saved to app storage

## Notes
- Images are saved with format: `IMG_[timestamp].jpg`
- Gallery permission is optional - app storage always works
- Camera sensor must be selected to show "online" status
- Full-screen camera UI works like Snapchat/Instagram
