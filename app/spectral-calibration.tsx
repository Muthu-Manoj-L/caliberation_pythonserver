import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Upload, CheckCircle, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import Svg, { Path, Line, Circle as SvgCircle } from 'react-native-svg';
import {
  calibrateFromRGBCircle,
  saveCalibrationData,
  loadCalibrationData,
  CalibrationData,
} from '@/lib/spectralAnalysis';
import {
  processCalibrationImage,
  savePythonCalibrationResults,
  loadPythonCalibrationResults,
  isNativeAvailable,
  getPythonInfo,
} from '@/lib/pythonBridge';

// Helper function to convert wavelength to RGB color
function wavelengthToRGB(wavelength: number): string {
  let r = 0, g = 0, b = 0;

  if (wavelength >= 380 && wavelength < 440) {
    r = -(wavelength - 440) / (440 - 380);
    g = 0.0;
    b = 1.0;
  } else if (wavelength >= 440 && wavelength < 490) {
    r = 0.0;
    g = (wavelength - 440) / (490 - 440);
    b = 1.0;
  } else if (wavelength >= 490 && wavelength < 510) {
    r = 0.0;
    g = 1.0;
    b = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    r = (wavelength - 510) / (580 - 510);
    g = 1.0;
    b = 0.0;
  } else if (wavelength >= 580 && wavelength < 645) {
    r = 1.0;
    g = -(wavelength - 645) / (645 - 580);
    b = 0.0;
  } else if (wavelength >= 645 && wavelength <= 700) {
    r = 1.0;
    g = 0.0;
    b = 0.0;
  }

  // Intensity correction for better visibility
  let factor = 1.0;
  if (wavelength >= 380 && wavelength < 420) {
    factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
  } else if (wavelength >= 700 && wavelength <= 780) {
    factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700);
  }

  r = Math.round(r * factor * 255);
  g = Math.round(g * factor * 255);
  b = Math.round(b * factor * 255);

  return `rgb(${r}, ${g}, ${b})`;
}

interface SpectralCalibrationProps {
  onClose?: () => void;
}

export default function SpectralCalibration({ onClose }: SpectralCalibrationProps = {}) {
  const { colors } = useTheme();
  const router = useRouter();
  const [calibrationImage, setCalibrationImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(null);
  const [pythonResults, setPythonResults] = useState<any>(null);

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  // Load existing calibration on mount
  React.useEffect(() => {
    loadCalibrationData().then((data) => {
      if (data) {
        setCalibrationData(data);
        setCalibrationImage(data.imageUri);
        setIsCalibrated(true);
      }
    });
  }, []);

  const captureCalibrationImage = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to capture calibration image.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('📷 Captured calibration image:', imageUri);
        console.log('Image dimensions:', result.assets[0].width, 'x', result.assets[0].height);
        setCalibrationImage(imageUri);
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      Alert.alert('Error', 'Failed to capture image');
    }
  };

  const pickCalibrationImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Gallery access is needed to select calibration image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('📁 Selected calibration image:', imageUri);
        console.log('Image dimensions:', result.assets[0].width, 'x', result.assets[0].height);
        setCalibrationImage(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const processCalibration = async () => {
    if (!calibrationImage) {
      Alert.alert('No Image', 'Please capture or select an RGB circle image first.');
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log('🔍 Processing calibration image...');
      
      // Check if native Chaquopy is available
      const nativeAvailable = isNativeAvailable();
      console.log(nativeAvailable ? '🔧 Using Chaquopy (offline)' : '🌐 Using HTTP server (development)');
      
      // Use Chaquopy-compatible calibration function
      // This automatically uses native module if available, otherwise HTTP server
      const pythonResult = await processCalibrationImage(calibrationImage);
      
      console.log(`✅ Processing complete: mode=${pythonResult.mode}, success=${pythonResult.success}`);
      console.log('📊 Full Python result:', JSON.stringify(pythonResult, null, 2));
      
      // Check if processing failed
      if (!pythonResult.success) {
        const errorMsg = pythonResult.error || 'Python processing failed. Check that the image contains a valid color calibration chart.';
        Alert.alert('Processing Failed', errorMsg);
        setIsProcessing(false);
        return;
      }
      
      // Save calibration data
      await savePythonCalibrationResults(pythonResult, calibrationImage);
      
      // Convert result to CalibrationData format
      const wavelengthMap = new Map<number, any>();
      
      // Handle both old (color_samples) and new (color_regions) formats
      if (pythonResult.color_regions) {
        // New 6-color system: use wavelengths as keys
        Object.entries(pythonResult.color_regions).forEach(([colorName, data]: [string, any]) => {
          wavelengthMap.set(data.wavelength, data.rgb);
        });
      } else if (pythonResult.color_samples) {
        // Old RGB circle system: use angles as keys
        pythonResult.color_samples.forEach((sample: any) => {
          wavelengthMap.set(sample.angle, sample.rgb);
        });
      }
      
      const spectralResponse = new Map<number, number>();
      
      // Build spectral response from correction curves
      if (pythonResult.correction_curves?.data_points) {
        const { wavelengths, r_corrections, g_corrections, b_corrections } = pythonResult.correction_curves.data_points;
        wavelengths.forEach((wl: number, i: number) => {
          // Average the R, G, B correction factors
          const avgCorrection = (r_corrections[i] + g_corrections[i] + b_corrections[i]) / 3;
          spectralResponse.set(wl, avgCorrection);
        });
      } else if (pythonResult.spectral_response) {
        // Fallback to old format
        Object.entries(pythonResult.spectral_response).forEach(([wl, factor]) => {
          spectralResponse.set(parseInt(wl), factor as number);
        });
      }
      
      const calData: CalibrationData = {
        wavelengthMap,
        spectralResponse,
        timestamp: pythonResult.timestamp,
        imageUri: calibrationImage,
        // Include correction curves for widget color correction (cast as any to handle optional fields)
        correction_curves: pythonResult.correction_curves as any,
        color_regions: pythonResult.color_regions,
        corrected_intensities: pythonResult.corrected_intensities,
      };
      
      console.log('💾 Saving calibration with correction curves:', !!pythonResult.correction_curves?.data_points);
      
      // Save calibration data to storage (updates widget status to "Calibrated")
      await saveCalibrationData(calData);
      
      setCalibrationData(calData);
      setPythonResults(pythonResult);
      setIsCalibrated(true);
      
      // Show info about processing mode
      const nativeMode = isNativeAvailable();
      console.log(nativeMode 
        ? '✅ Processed using Chaquopy native module (offline)' 
        : '✅ Processed using HTTP server (development mode)'
      );
      
      // Check if we got calibration mode or analysis mode
      if (pythonResult.mode === 'analysis_only') {
        // Not enough colors for calibration
        Alert.alert(
          'Not Enough Colors',
          `Only ${pythonResult.num_colors_detected || 0} color(s) detected.\n\n` +
          'Need 4-6 colors for calibration. Please use the printed 6-color chart:\n' +
          '• Red, Yellow, Green, Cyan, Blue, Magenta\n' +
          '• Good lighting\n' +
          '• Clear focus\n\n' +
          'Open calibration-chart.html in browser to print the chart.',
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return;
      }
      
      // Show success message
      const numColors = pythonResult.color_regions 
        ? Object.keys(pythonResult.color_regions).length 
        : pythonResult.color_samples?.length || 0;
      
      Alert.alert(
        'Calibration Complete! ✅',
        `Successfully calibrated with ${numColors} colors.\n\n` +
        (nativeMode 
          ? '🔧 Using Chaquopy (100% offline)\n\n' 
          : '🌐 Using HTTP server (development)\n\n') +
        'Widget status updated to "Calibrated".',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error processing calibration:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network request failed')) {
        Alert.alert(
          'Python Server Not Running',
          'The Python processing server is not running.\n\n' +
          'To start it:\n' +
          '1. Open terminal/PowerShell\n' +
          '2. cd to project python/ folder\n' +
          '3. Run: pip install flask flask-cors opencv-python numpy\n' +
          '4. Run: python spectral_server.py\n' +
          '5. Make sure phone and computer are on same WiFi\n' +
          '6. Update server URL in code if needed\n\n' +
          `Current URL: http://172.16.1.232:5000/process`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Processing Error',
          `Failed to process calibration image.\n\nError: ${errorMessage}\n\n` +
          'Please ensure:\n' +
          '✓ RGB circle is clearly visible\n' +
          '✓ Good lighting conditions\n' +
          '✓ Python server is running\n' +
          '✓ Phone and computer on same network',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Spectral Calibration
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Instructions */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            RGB Circle Calibration
          </Text>
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            To calibrate your camera for accurate wavelength measurements:
          </Text>
          <Text style={[styles.instructionStep, { color: colors.textSecondary }]}>
            1. Print the RGB color wheel with accurate colors on a pure black background
          </Text>
          <Text style={[styles.instructionStep, { color: colors.textSecondary }]}>
            2. Ensure good, uniform lighting without shadows
          </Text>
          <Text style={[styles.instructionStep, { color: colors.textSecondary }]}>
            3. Capture the image with the entire circle visible
          </Text>
          <Text style={[styles.instructionStep, { color: colors.textSecondary }]}>
            4. Keep the camera parallel to the surface
          </Text>
        </View>

        {/* Image Capture/Upload Buttons */}
        {!calibrationImage && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={captureCalibrationImage}
            >
              <Camera size={24} color="#FFFFFF" />
              <Text style={styles.buttonText}>Capture RGB Circle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.secondary }]}
              onPress={pickCalibrationImage}
            >
              <Upload size={24} color="#FFFFFF" />
              <Text style={styles.buttonText}>Select from Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Preview Image */}
        {calibrationImage && (
          <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Calibration Image
            </Text>
            <Image
              source={{ uri: calibrationImage }}
              style={styles.previewImage}
              resizeMode="contain"
              onLoadStart={() => {
                console.log('📥 Image loading started for:', calibrationImage);
              }}
              onLoad={() => {
                console.log('✅ Image loaded successfully');
              }}
              onError={(error) => {
                console.error('❌ Image load error:', error.nativeEvent);
                console.error('Failed URI:', calibrationImage);
                Alert.alert(
                  'Image Load Error',
                  `Failed to load the calibration image.\n\nURI: ${calibrationImage.substring(0, 50)}...\n\nPlease try capturing or selecting a different image.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        setCalibrationImage(null);
                        setIsCalibrated(false);
                      }
                    }
                  ]
                );
              }}
            />
            
            {isCalibrated && (
              <View style={[styles.successBadge, { backgroundColor: colors.success }]}>
                <CheckCircle size={20} color="#FFFFFF" />
                <Text style={styles.successText}>Calibrated</Text>
              </View>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.smallButton, { backgroundColor: colors.textSecondary }]}
                onPress={() => {
                  setCalibrationImage(null);
                  setIsCalibrated(false);
                  setCalibrationData(null);
                }}
              >
                <Text style={styles.buttonText}>Choose Different Image</Text>
              </TouchableOpacity>

              {!isCalibrated ? (
                <TouchableOpacity
                  style={[
                    styles.smallButton,
                    { backgroundColor: colors.primary },
                    isProcessing && styles.disabledButton
                  ]}
                  onPress={processCalibration}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Process Calibration</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.smallButton, { backgroundColor: colors.warning }]}
                  onPress={() => {
                    Alert.alert(
                      'Recalibrate',
                      'Do you want to recalibrate with this image? This will replace your current calibration.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Recalibrate',
                          style: 'destructive',
                          onPress: () => {
                            setIsCalibrated(false);
                            setCalibrationData(null);
                            setPythonResults(null);
                            processCalibration();
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.buttonText}>Recalibrate</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Calibration Results */}
        {isCalibrated && pythonResults && (
          <>
            {/* Success Banner */}
            <View style={[styles.successBanner, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
              <CheckCircle size={24} color={colors.success} />
              <Text style={[styles.successText, { color: colors.success }]}>
                Calibration Complete! ✨
              </Text>
            </View>

            {/* Image Info Card */}
            <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                🎯 Circle Detection
              </Text>
              <View style={styles.resultGrid}>
                <View style={styles.resultItem}>
                  <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Image Size</Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    {pythonResults.image_info.width} × {pythonResults.image_info.height}
                  </Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Calibration Method</Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    6-Color HSV Detection
                  </Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Shadow Correction</Text>
                  <Text style={[styles.resultValue, { color: colors.primary }]}>
                    ✓ Black Corner Baseline
                  </Text>
                </View>
              </View>
            </View>

            {/* Statistics Card */}
            <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                📊 Calibration Statistics
              </Text>
              <View style={styles.resultGrid}>
                <View style={styles.resultItem}>
                  <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Colors Detected</Text>
                  <Text style={[styles.resultValue, { color: colors.primary }]}>
                    {pythonResults.statistics.num_colors_detected}/6
                  </Text>
                  <Text style={[styles.resultSubtext, { color: colors.textSecondary }]}>
                    RGB + CMY
                  </Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Black Corners</Text>
                  <Text style={[styles.resultValue, { color: colors.primary }]}>
                    {pythonResults.statistics.num_black_corners}
                  </Text>
                  <Text style={[styles.resultSubtext, { color: colors.textSecondary }]}>
                    For baseline
                  </Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Wavelength Range</Text>
                  <Text style={[styles.resultValue, { color: colors.primary }]}>
                    {pythonResults.statistics.wavelength_range[0]}-{pythonResults.statistics.wavelength_range[1]} nm
                  </Text>
                  <Text style={[styles.resultSubtext, { color: colors.textSecondary }]}>
                    Visible spectrum
                  </Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Baseline (RGB)</Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    ({pythonResults.baseline.r.toFixed(1)}, {pythonResults.baseline.g.toFixed(1)}, {pythonResults.baseline.b.toFixed(1)})
                  </Text>
                  <Text style={[styles.resultSubtext, { color: colors.textSecondary }]}>
                    Shadow correction
                  </Text>
                </View>
              </View>
            </View>

            {/* Color Samples - 6 Major Colors */}
            <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                🎨 Detected Color Regions
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                6 major colors: Red, Green, Blue, Cyan, Magenta, Yellow
              </Text>
              <View style={styles.colorGrid}>
                {Object.entries(pythonResults.color_regions).map(([colorName, data]: [string, any]) => (
                  <View key={colorName} style={styles.colorSample}>
                    <View 
                      style={[
                        styles.colorBox,
                        { 
                          backgroundColor: `rgb(${data.rgb.r}, ${data.rgb.g}, ${data.rgb.b})`,
                          borderColor: colors.border
                        }
                      ]} 
                    />
                    <Text style={[styles.colorName, { color: colors.text }]}>
                      {colorName.charAt(0).toUpperCase() + colorName.slice(1)}
                    </Text>
                    <Text style={[styles.colorWavelength, { color: colors.textSecondary }]}>
                      {data.wavelength}nm
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Raw Spectral Response - Individual Colors */}
            <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                📈 Raw Spectral Response (R, G, B Channels)
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Camera sensor response for each color channel across wavelengths
              </Text>
              
              {/* Graph container */}
              <View style={styles.graphContainer}>
                {/* Y-axis labels */}
                <View style={styles.yAxis}>
                  <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>1.0</Text>
                  <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>0.75</Text>
                  <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>0.5</Text>
                  <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>0.25</Text>
                  <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>0.0</Text>
                </View>
                
                {/* Graph area */}
                <View style={styles.graphArea}>
                  {/* Grid lines */}
                  <View style={styles.gridLines}>
                    {[0, 1, 2, 3, 4].map(i => (
                      <View key={i} style={[styles.gridLine, { backgroundColor: colors.border }]} />
                    ))}
                  </View>
                  
                  {/* Spectral response curves for R, G, B */}
                  <Svg height={200} width="100%" style={styles.svgContainer} viewBox="0 0 300 200" preserveAspectRatio="none">
                    {(() => {
                      if (!pythonResults.correction_curves?.raw_normalized) return null;
                      
                      const { wavelengths, r, g, b } = pythonResults.correction_curves.raw_normalized;
                      
                      const buildCurvePath = (intensities: number[], color: string) => {
                        const points = wavelengths.map((wl: number, i: number) => ({
                          x: ((wl - Math.min(...wavelengths)) / (Math.max(...wavelengths) - Math.min(...wavelengths))) * 300,
                          y: 200 - (intensities[i] * 180) - 10,
                          wl
                        }));
                        
                        let path = `M ${points[0].x} ${points[0].y}`;
                        for (let i = 0; i < points.length - 1; i++) {
                          const p0 = points[Math.max(0, i - 1)];
                          const p1 = points[i];
                          const p2 = points[i + 1];
                          const p3 = points[Math.min(points.length - 1, i + 2)];
                          
                          const cp1x = p1.x + (p2.x - p0.x) / 6;
                          const cp1y = p1.y + (p2.y - p0.y) / 6;
                          const cp2x = p2.x - (p3.x - p1.x) / 6;
                          const cp2y = p2.y - (p3.y - p1.y) / 6;
                          
                          path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
                        }
                        
                        return { path, points };
                      };
                      
                      const rCurve = buildCurvePath(r, 'red');
                      const gCurve = buildCurvePath(g, 'green');
                      const bCurve = buildCurvePath(b, 'blue');
                      
                      return (
                        <>
                          {/* Red channel curve */}
                          <Path
                            d={rCurve.path}
                            stroke="rgb(255, 60, 60)"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {rCurve.points.map((point: any, i: number) => (
                            <SvgCircle
                              key={`r-${i}`}
                              cx={point.x}
                              cy={point.y}
                              r="3"
                              fill="rgb(255, 60, 60)"
                              stroke="#fff"
                              strokeWidth="1"
                            />
                          ))}
                          
                          {/* Green channel curve */}
                          <Path
                            d={gCurve.path}
                            stroke="rgb(60, 255, 60)"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {gCurve.points.map((point: any, i: number) => (
                            <SvgCircle
                              key={`g-${i}`}
                              cx={point.x}
                              cy={point.y}
                              r="3"
                              fill="rgb(60, 255, 60)"
                              stroke="#fff"
                              strokeWidth="1"
                            />
                          ))}
                          
                          {/* Blue channel curve */}
                          <Path
                            d={bCurve.path}
                            stroke="rgb(60, 120, 255)"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {bCurve.points.map((point: any, i: number) => (
                            <SvgCircle
                              key={`b-${i}`}
                              cx={point.x}
                              cy={point.y}
                              r="3"
                              fill="rgb(60, 120, 255)"
                              stroke="#fff"
                              strokeWidth="1"
                            />
                          ))}
                        </>
                      );
                    })()}
                  </Svg>
                  
                  {/* X-axis wavelength markers */}
                  <View style={styles.xAxis}>
                    {pythonResults.correction_curves?.raw_normalized && 
                     (() => {
                       // Show actual wavelength data points instead of interpolated
                       const wls = pythonResults.correction_curves.raw_normalized.wavelengths;
                       return wls.map((wl: number) => (
                         <Text key={wl} style={[styles.axisLabel, { color: colors.textSecondary, fontSize: 10 }]}>
                           {wl}nm
                         </Text>
                       ));
                     })()
                    }
                  </View>
                </View>
              </View>
              
              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgb(255, 60, 60)' }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>Red Channel</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgb(60, 255, 60)' }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>Green Channel</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgb(60, 120, 255)' }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>Blue Channel</Text>
                </View>
              </View>
            </View>

            {/* Correction Curves */}
            <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                🔧 Spectral Correction Curves
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Correction factors to apply for accurate spectral measurements
              </Text>
              
              {/* Graph container */}
              <View style={styles.graphContainer}>
                {/* Y-axis labels */}
                <View style={styles.yAxis}>
                  <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>2.0</Text>
                  <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>1.5</Text>
                  <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>1.0</Text>
                  <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>0.5</Text>
                  <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>0.0</Text>
                </View>
                
                {/* Graph area */}
                <View style={styles.graphArea}>
                  {/* Grid lines */}
                  <View style={styles.gridLines}>
                    {[0, 1, 2, 3, 4].map(i => (
                      <View key={i} style={[styles.gridLine, { backgroundColor: colors.border }]} />
                    ))}
                  </View>
                  
                  {/* Correction curves */}
                  <Svg height={200} width="100%" style={styles.svgContainer} viewBox="0 0 300 200" preserveAspectRatio="none">
                    {(() => {
                      if (!pythonResults.correction_curves?.data_points) return null;
                      
                      const { wavelengths, r_corrections, g_corrections, b_corrections } = pythonResults.correction_curves.data_points;
                      
                      const maxCorrection = Math.max(...r_corrections, ...g_corrections, ...b_corrections);
                      const minCorrection = Math.min(...r_corrections, ...g_corrections, ...b_corrections);
                      const range = maxCorrection - minCorrection || 1;
                      
                      const buildCorrectionPath = (corrections: number[]) => {
                        const points = wavelengths.map((wl: number, i: number) => ({
                          x: ((wl - Math.min(...wavelengths)) / (Math.max(...wavelengths) - Math.min(...wavelengths))) * 300,
                          y: 200 - (((corrections[i] - minCorrection) / range) * 180) - 10,
                          wl
                        }));
                        
                        let path = `M ${points[0].x} ${points[0].y}`;
                        for (let i = 0; i < points.length - 1; i++) {
                          const p0 = points[Math.max(0, i - 1)];
                          const p1 = points[i];
                          const p2 = points[i + 1];
                          const p3 = points[Math.min(points.length - 1, i + 2)];
                          
                          const cp1x = p1.x + (p2.x - p0.x) / 6;
                          const cp1y = p1.y + (p2.y - p0.y) / 6;
                          const cp2x = p2.x - (p3.x - p1.x) / 6;
                          const cp2y = p2.y - (p3.y - p1.y) / 6;
                          
                          path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
                        }
                        
                        return { path, points };
                      };
                      
                      const rCurve = buildCorrectionPath(r_corrections);
                      const gCurve = buildCorrectionPath(g_corrections);
                      const bCurve = buildCorrectionPath(b_corrections);
                      
                      return (
                        <>
                          {/* Red correction curve */}
                          <Path
                            d={rCurve.path}
                            stroke="rgb(255, 60, 60)"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {rCurve.points.map((point: any, i: number) => (
                            <SvgCircle
                              key={`r-${i}`}
                              cx={point.x}
                              cy={point.y}
                              r="3"
                              fill="rgb(255, 60, 60)"
                              stroke="#fff"
                              strokeWidth="1"
                            />
                          ))}
                          
                          {/* Green correction curve */}
                          <Path
                            d={gCurve.path}
                            stroke="rgb(60, 255, 60)"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {gCurve.points.map((point: any, i: number) => (
                            <SvgCircle
                              key={`g-${i}`}
                              cx={point.x}
                              cy={point.y}
                              r="3"
                              fill="rgb(60, 255, 60)"
                              stroke="#fff"
                              strokeWidth="1"
                            />
                          ))}
                          
                          {/* Blue correction curve */}
                          <Path
                            d={bCurve.path}
                            stroke="rgb(60, 120, 255)"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {bCurve.points.map((point: any, i: number) => (
                            <SvgCircle
                              key={`b-${i}`}
                              cx={point.x}
                              cy={point.y}
                              r="3"
                              fill="rgb(60, 120, 255)"
                              stroke="#fff"
                              strokeWidth="1"
                            />
                          ))}
                        </>
                      );
                    })()}
                  </Svg>
                  
                  {/* X-axis wavelength markers */}
                  <View style={styles.xAxis}>
                    {pythonResults.correction_curves?.data_points && 
                     (() => {
                       // Show actual wavelength data points instead of interpolated
                       const wls = pythonResults.correction_curves.data_points.wavelengths;
                       return wls.map((wl: number) => (
                         <Text key={wl} style={[styles.axisLabel, { color: colors.textSecondary, fontSize: 10 }]}>
                           {wl}nm
                         </Text>
                       ));
                     })()
                    }
                  </View>
                </View>
              </View>
              
              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgb(255, 60, 60)' }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>Red Correction</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgb(60, 255, 60)' }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>Green Correction</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgb(60, 120, 255)' }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>Blue Correction</Text>
                </View>
              </View>
              
              {/* Response statistics */}
              <View style={styles.responseStats}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Correction Range</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {(() => {
                      if (!pythonResults.correction_curves?.data_points) return 'N/A';
                      const { r_corrections, g_corrections, b_corrections } = pythonResults.correction_curves.data_points;
                      const all = [...r_corrections, ...g_corrections, ...b_corrections];
                      const min = Math.min(...all);
                      const max = Math.max(...all);
                      return `${min.toFixed(2)}× - ${max.toFixed(2)}×`;
                    })()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Corrected Result Graph - NEW */}
            <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                ✨ Corrected Spectral Response
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Final normalized response after applying correction factors
              </Text>
              
              {/* Graph container */}
              <View style={styles.graphContainer}>
                {/* Y-axis labels */}
                <View style={styles.yAxis}>
                  <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>1.0</Text>
                  <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>0.75</Text>
                  <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>0.5</Text>
                  <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>0.25</Text>
                  <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>0.0</Text>
                </View>
                
                {/* Graph area */}
                <View style={styles.graphArea}>
                  {/* Grid lines */}
                  <View style={styles.gridLines}>
                    {[0, 1, 2, 3, 4].map(i => (
                      <View key={i} style={[styles.gridLine, { backgroundColor: colors.border }]} />
                    ))}
                  </View>
                  
                  {/* Corrected spectral response curves */}
                  <Svg height={200} width="100%" style={styles.svgContainer} viewBox="0 0 300 200" preserveAspectRatio="none">
                    {(() => {
                      // Use the pre-calculated final corrected values from Python
                      if (!pythonResults.correction_curves?.final_corrected) return null;
                      
                      const { wavelengths, r: correctedR, g: correctedG, b: correctedB } = pythonResults.correction_curves.final_corrected;
                      
                      // Normalize to 0-1 range for display
                      const maxCorrected = Math.max(
                        Math.max(...correctedR),
                        Math.max(...correctedG),
                        Math.max(...correctedB)
                      );
                      const normalizedR = correctedR.map((v: number) => v / maxCorrected);
                      const normalizedG = correctedG.map((v: number) => v / maxCorrected);
                      const normalizedB = correctedB.map((v: number) => v / maxCorrected);
                      
                      const buildCurvePath = (intensities: number[], color: string) => {
                        const points = wavelengths.map((wl: number, i: number) => ({
                          x: ((wl - Math.min(...wavelengths)) / (Math.max(...wavelengths) - Math.min(...wavelengths))) * 300,
                          y: 200 - (intensities[i] * 180) - 10,
                          wl
                        }));
                        
                        let path = `M ${points[0].x} ${points[0].y}`;
                        for (let i = 0; i < points.length - 1; i++) {
                          const p0 = points[Math.max(0, i - 1)];
                          const p1 = points[i];
                          const p2 = points[i + 1];
                          const p3 = points[Math.min(points.length - 1, i + 2)];
                          
                          const cp1x = p1.x + (p2.x - p0.x) / 6;
                          const cp1y = p1.y + (p2.y - p0.y) / 6;
                          const cp2x = p2.x - (p3.x - p1.x) / 6;
                          const cp2y = p2.y - (p3.y - p1.y) / 6;
                          
                          path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
                        }
                        
                        return { path, points };
                      };
                      
                      const rCurve = buildCurvePath(normalizedR, 'red');
                      const gCurve = buildCurvePath(normalizedG, 'green');
                      const bCurve = buildCurvePath(normalizedB, 'blue');
                      
                      return (
                        <>
                          <Path d={rCurve.path} stroke="rgb(255, 60, 60)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          {rCurve.points.map((point: any, i: number) => (
                            <SvgCircle key={`r-${i}`} cx={point.x} cy={point.y} r="3" fill="rgb(255, 60, 60)" stroke="#fff" strokeWidth="1" />
                          ))}
                          <Path d={gCurve.path} stroke="rgb(60, 255, 60)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          {gCurve.points.map((point: any, i: number) => (
                            <SvgCircle key={`g-${i}`} cx={point.x} cy={point.y} r="3" fill="rgb(60, 255, 60)" stroke="#fff" strokeWidth="1" />
                          ))}
                          <Path d={bCurve.path} stroke="rgb(60, 120, 255)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          {bCurve.points.map((point: any, i: number) => (
                            <SvgCircle key={`b-${i}`} cx={point.x} cy={point.y} r="3" fill="rgb(60, 120, 255)" stroke="#fff" strokeWidth="1" />
                          ))}
                        </>
                      );
                    })()}
                  </Svg>
                  
                  <View style={styles.xAxis}>
                    {pythonResults.correction_curves?.raw_normalized && 
                     (() => {
                       const wls = pythonResults.correction_curves.raw_normalized.wavelengths;
                       return wls.map((wl: number) => (
                         <Text key={wl} style={[styles.axisLabel, { color: colors.textSecondary, fontSize: 10 }]}>{wl}nm</Text>
                       ));
                     })()
                    }
                  </View>
                </View>
              </View>
              
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgb(255, 60, 60)' }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>Red (Corrected)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgb(60, 255, 60)' }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>Green (Corrected)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'rgb(60, 120, 255)' }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>Blue (Corrected)</Text>
                </View>
              </View>
              
              <View style={styles.responseStats}>
                <Text style={[styles.statLabel, { color: colors.textSecondary, textAlign: 'center', fontSize: 12, fontStyle: 'italic' }]}>
                  📊 Ideally, all channels should be balanced (similar peak values)
                </Text>
              </View>
            </View>

            {/* Metadata */}
            <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                ℹ️ Calibration Info
              </Text>
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                  Timestamp:
                </Text>
                <Text style={[styles.statusValue, { color: colors.text }]}>
                  {new Date(pythonResults.timestamp).toLocaleString()}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                  Processing Method:
                </Text>
                <Text style={[
                  styles.statusValue, 
                  { color: pythonResults.processing_method === 'python' ? colors.success : colors.warning }
                ]}>
                  {pythonResults.processing_method === 'python' ? 'Python + OpenCV' : 
                   pythonResults.processing_method === 'javascript' ? 'JavaScript (Offline)' : 
                   'Python + OpenCV'}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                  Status:
                </Text>
                <Text style={[styles.statusValue, { color: colors.success }]}>
                  ✓ Ready for Analysis
                </Text>
              </View>
            </View>

            {/* Recalibrate Button */}
            <TouchableOpacity
              style={[styles.recalibrateButton, { backgroundColor: colors.warning }]}
              onPress={() => {
                Alert.alert(
                  'Start New Calibration',
                  'This will clear your current calibration. You will need to capture a new RGB circle image.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Start Over',
                      style: 'destructive',
                      onPress: () => {
                        setCalibrationImage(null);
                        setIsCalibrated(false);
                        setCalibrationData(null);
                        setPythonResults(null);
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.buttonText}>Start New Calibration</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 48,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  instructionStep: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#000000',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  smallButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  recalibrateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
  },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  resultItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  resultSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  colorSample: {
    alignItems: 'center',
    width: '30%',
    marginBottom: 12,
  },
  colorBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 2,
  },
  colorName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  colorAngle: {
    fontSize: 10,
    fontWeight: '600',
  },
  colorWavelength: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  graphContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  yAxis: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 40,
    width: 40,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  axisLabel: {
    fontSize: 10,
    textAlign: 'right',
  },
  graphArea: {
    marginLeft: 45,
    height: 200,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#444',
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingVertical: 0,
  },
  gridLine: {
    height: 1,
    opacity: 0.2,
  },
  svgContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginLeft: 45,
    paddingHorizontal: 4,
  },
  responseStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
