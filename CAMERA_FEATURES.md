# Camera and Color Spectrum Analysis Features

This document provides a comprehensive guide to the newly added camera and color spectrum analysis features in the ColorUpdate application.

## Overview

The app now includes two major new features:
1. **Camera Sensor Integration** - Capture and store images directly in the app
2. **Color Spectrum Analysis** - Analyze color distribution in images using Python

## Feature 1: Camera Sensor

### What It Does
The camera sensor allows you to capture images directly from your mobile device and store them locally within the app. This works in standalone development builds without requiring a connection to a laptop.

### How to Use

#### 1. Enable Camera Sensor
1. Open the app and navigate to **Device Connection** screen
2. Scroll down to the **Phone Sensors** section
3. You'll see two sensors:
   - Ambient Light Sensor (existing)
   - **Camera Sensor (NEW)**
4. Tap on **Camera Sensor**
5. Grant camera permissions when prompted
6. The sensor will show as "online" once selected

#### 2. Capture Images
1. With Camera Sensor selected, tap **Open Camera** button
2. The camera preview will open in full screen
3. Use the controls:
   - **Camera Icon Button** (center): Capture image
   - **Rotate Icon** (top right): Switch between front/back camera
   - **X Icon** (top left): Close camera
4. After capturing:
   - **Discard**: Delete the image and retake
   - **Save**: Store the image locally in app storage

#### 3. View Stored Images
Images are automatically saved to:
```
{app_document_directory}/camera_images/IMG_{timestamp}.jpg
```

You can access these images in the Color Spectrum Analysis widget.

### Technical Details

**Components:**
- `components/CameraPreview.tsx` - Camera UI component
- `lib/cameraService.ts` - Image storage and management service

**Storage:**
- Images are stored in the app's document directory
- Filename format: `IMG_1234567890.jpg` (timestamp-based)
- Works offline and persists across app sessions

**Permissions:**
- Camera permission is requested when first selecting the camera sensor
- Storage is handled automatically by Expo FileSystem

## Feature 2: Color Spectrum Analysis

### What It Does
Analyzes images to extract:
- Dominant colors (up to 5)
- Color distribution percentages
- Overall color temperature (warm/cool/neutral)
- RGB and Hex color values

### How to Use

#### 1. Access the Widget
1. Navigate to **Sync/Data** tab (bottom navigation)
2. Scroll down to find **Color Spectrum Analysis** widget
3. The widget shows a palette icon and title

#### 2. Select an Image
1. Tap **Select Image** button
2. Choose from:
   - **Gallery**: Pick from your phone's photo library
   - **Captured Images**: Horizontal scroll of images taken with Camera Sensor
3. Selected image will appear in preview

#### 3. Analyze the Image
1. Once image is selected, tap **Analyze Color Spectrum** button
2. Wait 2-3 seconds for analysis (mock simulation in current version)
3. Results will display:
   - **Dominant Color**: Large color swatch with hex code
   - **Color Distribution**: Bar chart showing percentage of each color
   - **Color Labels**: Descriptive names (Primary, Secondary, etc.)

#### 4. View Results
Results include:
- Color swatches with hex codes
- Percentage bars showing distribution
- Ability to analyze another image

### Python Backend Integration

The widget currently uses mock data for demonstration. To enable real Python-based analysis:

#### Setup Python Service

1. **Install Python Dependencies:**
```bash
cd scripts
pip install -r requirements.txt
```

Required packages:
- Pillow (image processing)
- NumPy (numerical operations)
- scikit-learn (k-means clustering)
- opencv-python (image analysis)

2. **Test the Service:**
```bash
python color_spectrum_service.py path/to/image.jpg 5
```

3. **Integrate with Backend:**

Option A - Local Development:
```bash
# Run Flask server
python scripts/flask_color_api.py
# Update widget to call http://localhost:5000/analyze
```

Option B - Cloud Deployment:
- Deploy to AWS Lambda, Google Cloud Functions, or Azure Functions
- Update API endpoint in ColorSpectrumWidget.tsx

#### Example API Integration

In `ColorSpectrumWidget.tsx`, replace the mock analysis with:

```typescript
const analyzeImage = async () => {
  if (!selectedImage) return;
  setIsAnalyzing(true);

  try {
    // Read image as base64
    const base64 = await FileSystem.readAsStringAsync(selectedImage.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Call Python backend
    const response = await fetch('YOUR_API_ENDPOINT/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: `data:image/jpeg;base64,${base64}`,
        numColors: 5,
      }),
    });

    const result = await response.json();
    setSpectrumData(result);
  } catch (error) {
    Alert.alert('Error', 'Failed to analyze image');
  } finally {
    setIsAnalyzing(false);
  }
};
```

### Color Analysis Algorithm

The Python service uses **k-means clustering**:
1. Load image and convert to RGB
2. Resize to 200x200 for performance
3. Apply k-means to group similar colors
4. Calculate percentage of each color cluster
5. Determine color temperature based on RGB values

**Output Format:**
```json
{
  "colors": [
    {
      "color": "#FF6B6B",
      "rgb": [255, 107, 107],
      "percentage": 35.5,
      "label": "Primary Spectrum"
    }
  ],
  "dominantColor": "#FF6B6B",
  "temperature": "warm",
  "analyzed": true,
  "colorCount": 5
}
```

## Use Cases

### 1. Material Color Analysis
- Capture images of materials/surfaces
- Analyze color composition
- Compare color variations across samples

### 2. Quality Control
- Document product colors
- Track color consistency
- Identify color defects or variations

### 3. Environmental Monitoring
- Capture and analyze environmental samples
- Track color changes over time
- Correlate with spectral data from ESP32

### 4. Research Documentation
- Store visual records of experiments
- Analyze color-based indicators
- Create detailed color profiles

## Limitations & Notes

### Current Implementation
- Color analysis uses **mock data** by default
- Real Python analysis requires backend setup
- Images stored locally (not synced to cloud)
- Maximum 5 dominant colors per analysis

### Performance
- Image capture: Instant
- Storage: <1 second
- Analysis: 1-2 seconds (with Python backend)
- Gallery loading: Depends on number of images

### Storage
- Images are stored in app document directory
- Persists across app restarts
- Not automatically backed up to cloud
- Manual deletion not yet implemented in UI

## Future Enhancements

Planned features:
- [ ] Real-time color analysis during capture
- [ ] Cloud backup of images to Supabase Storage
- [ ] Batch image analysis
- [ ] Color spectrum history tracking
- [ ] Export color data to CSV/PDF
- [ ] Compare multiple images side-by-side
- [ ] Integration with ESP32 spectral data
- [ ] Machine learning-based color classification
- [ ] Custom color palette creation

## Troubleshooting

### Camera Not Working
- Ensure camera permissions are granted
- Check if device has a camera
- Restart the app
- Verify expo-camera is installed: `npm list expo-camera`

### Images Not Saving
- Check app document directory permissions
- Ensure sufficient storage space
- Verify expo-file-system is installed
- Check console logs for errors

### Analysis Not Working
- Currently uses mock data (expected)
- To enable real analysis, set up Python backend
- Check API endpoint configuration
- Verify network connectivity

### Images Not Appearing in Gallery
- Tap "Select Image" again to refresh
- Check if images are in camera_images directory
- Restart the app

## Technical Architecture

```
┌─────────────────────────────────────┐
│     React Native App (Frontend)     │
│  ┌───────────────────────────────┐  │
│  │   Device Connection Screen    │  │
│  │  - Camera Sensor Selection    │  │
│  │  - Permission Handling        │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │    Camera Preview Component   │  │
│  │  - Capture Interface          │  │
│  │  - Front/Back Toggle          │  │
│  │  - Save/Discard Actions       │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │   Color Spectrum Widget       │  │
│  │  - Image Selection            │  │
│  │  - Analysis Trigger           │  │
│  │  - Results Display            │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│       Local Storage Layer           │
│  - expo-file-system                 │
│  - Document Directory               │
│  - Image Management                 │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│    Python Backend (Optional)        │
│  - color_spectrum_service.py        │
│  - K-means Clustering               │
│  - Color Analysis Algorithm         │
└─────────────────────────────────────┘
```

## Support

For issues or questions:
1. Check console logs for errors
2. Review TROUBLESHOOTING section above
3. Consult `scripts/COLOR_SPECTRUM_README.md` for Python backend
4. Contact development team

## Contributing

To extend these features:
1. Fork the repository
2. Create a feature branch
3. Test thoroughly on both iOS and Android
4. Submit a pull request with documentation

---

**Last Updated:** October 21, 2025  
**Version:** 1.0.0  
**Developer:** Muthu Manoj L
