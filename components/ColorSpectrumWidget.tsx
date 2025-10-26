import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/contexts/ThemeContext';
import { Palette, ImageIcon, X, BarChart3, Zap } from 'lucide-react-native';
import { GradientCard } from './GradientCard';
import { getStoredImages, StoredImage } from '@/lib/cameraService';
import { loadCalibrationData, type CalibrationData } from '@/lib/spectralAnalysis';
import { processAnalysisImage, isNativeAvailable } from '@/lib/pythonBridge';

// Color spectrum data interface
interface ColorSpectrumData {
  wavelengths?: { value: number; color: string; intensity: number; wavelengthLabel: string }[];
  colors?: { color: string; percentage: number; label: string }[];
  dominantColor?: string;
  analyzed?: boolean;
  metadata?: {
    calibrationApplied: boolean;
    calibrationDate?: string;
    colorRegions?: any;
    processingMethod?: string;
    mode?: string; // analysis_only or calibration
    numColorsDetected?: number;
  };
}

/**
 * Python-based spectral analysis function with Chaquopy support
 * 
 * This function uses:
 * - Native Chaquopy module if available (production APK - 100% offline)
 * - HTTP server if native not available (development mode)
 * 
 * @param imageUri - URI of the image to analyze
 * @param calibrationData - Optional calibration data to apply corrections
 */
const analyzeImageColors = async (
  imageUri: string, 
  calibrationData?: CalibrationData | null
): Promise<ColorSpectrumData> => {
    console.log('🔬 Starting spectral analysis...');
    console.log(isNativeAvailable() 
      ? '🔧 Using Chaquopy native module (offline)' 
      : '🌐 Using HTTP server (development)'
    );
    
    // Use Chaquopy-compatible bridge function
    // Automatically uses native module if available, otherwise HTTP server
    const result = await processAnalysisImage(imageUri);
    
    console.log('✅ Analysis complete');
    console.log('Mode:', result.mode);
    console.log('Colors detected:', result.num_colors_detected || 0);
    
    // Check if server returned an error (not just analysis_only mode)
    if (!result.success && result.error) {
      throw new Error(result.error);
    }
    
    // Extract color regions from Python result (works for both analysis_only and calibration modes)
    if (result.color_regions && Object.keys(result.color_regions).length > 0) {
      const colorData: Array<{color: string, percentage: number, label: string}> = [];
      const hasCalibration = calibrationData && calibrationData.correction_curves?.data_points;
      
      if (hasCalibration) {
        console.log('✅ Applying calibration corrections to detected colors');
      } else {
        console.log('⚠️ No calibration data - showing raw values');
      }
      
      for (const [colorName, region] of Object.entries(result.color_regions)) {
        const regionData = region as any;
        const rawRgb = regionData.rgb;
        const wavelength = regionData.wavelength;
        
        // Apply calibration correction if available
        const correctedRgb = applyCalibrationToRGB(
          rawRgb.r, 
          rawRgb.g, 
          rawRgb.b, 
          wavelength,
          calibrationData || null
        );
        
        const hex = rgbToHex(correctedRgb.r, correctedRgb.g, correctedRgb.b);
        
        // Calculate percentage based on corrected intensity
        const intensity = Math.max(correctedRgb.r, correctedRgb.g, correctedRgb.b);
        
        colorData.push({
          color: hex,
          percentage: Math.round(intensity / 255 * 100),
          label: `${colorName.charAt(0).toUpperCase() + colorName.slice(1)} (${wavelength}nm)`,
        });
      }
      
      // Sort by percentage
      colorData.sort((a, b) => b.percentage - a.percentage);
      
      return {
        wavelengths: colorData.map((item, index) => ({
          value: 400 + index * 50, // Approximate wavelength spacing
          color: item.color,
          intensity: item.percentage / 100,
          wavelengthLabel: item.label,
        })),
        colors: colorData, // Add colors array for UI
        dominantColor: colorData[0]?.color || '#808080', // Add dominant color for UI
        analyzed: true,
        metadata: {
          calibrationApplied: !!hasCalibration,
          colorRegions: result.color_regions,
          processingMethod: 'python-server',
          mode: result.mode, // Include mode (analysis_only or calibration)
          numColorsDetected: result.num_colors_detected,
        }
      };
    }
    
    // No color regions found at all
    throw new Error('No colors detected in the image. Try a different image with more distinct colors.');
  };

// Helper function to convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Apply calibration correction to RGB values
 * 
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @param wavelength - Known wavelength for this color (nm)
 * @param calibrationData - Calibration data with correction curves
 * @returns Corrected RGB values
 */
function applyCalibrationToRGB(
  r: number, 
  g: number, 
  b: number, 
  wavelength: number,
  calibrationData: CalibrationData | null
): {r: number, g: number, b: number} {
  if (!calibrationData || !calibrationData.correction_curves?.data_points) {
    return { r, g, b }; // No calibration, return original
  }

  try {
    const { wavelengths, r_corrections, g_corrections, b_corrections } = calibrationData.correction_curves.data_points;
    
    // Find the closest wavelength index
    let closestIndex = 0;
    let minDiff = Math.abs(wavelengths[0] - wavelength);
    
    for (let i = 1; i < wavelengths.length; i++) {
      const diff = Math.abs(wavelengths[i] - wavelength);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    
    // Get correction factors for this wavelength
    const r_correction = r_corrections[closestIndex] || 1.0;
    const g_correction = g_corrections[closestIndex] || 1.0;
    const b_correction = b_corrections[closestIndex] || 1.0;
    
    console.log(`🔧 Correction factors at ${wavelength}nm (index ${closestIndex}): R=${r_correction.toFixed(3)}, G=${g_correction.toFixed(3)}, B=${b_correction.toFixed(3)}`);
    
    // Check if correction factors are reasonable (not hitting the 10.0 cap)
    // If factors are maxed out, the calibration is poor quality - skip correction
    const hasReasonableFactors = r_correction < 9.0 && g_correction < 9.0 && b_correction < 9.0;
    
    if (!hasReasonableFactors) {
      console.log(`⚠️ Correction factors unreliable (>9.0) - using raw values`);
      return { r, g, b };
    }
    
    // For single-color analysis, only apply correction to dominant channel
    // This prevents over-correction of minor channels that should stay small
    const maxRaw = Math.max(r, g, b);
    let r_corrected = r;
    let g_corrected = g;
    let b_corrected = b;
    
    // Determine which channel is dominant and apply correction
    if (r === maxRaw) {
      // Red is dominant - apply correction primarily to red
      r_corrected = Math.min(255, Math.max(0, r * r_correction));
      // Keep minor channels proportional to avoid color shift
      const ratio = r_corrected / r;
      g_corrected = Math.min(255, g * Math.min(ratio, g_correction));
      b_corrected = Math.min(255, b * Math.min(ratio, b_correction));
    } else if (g === maxRaw) {
      // Green is dominant
      g_corrected = Math.min(255, Math.max(0, g * g_correction));
      const ratio = g_corrected / g;
      r_corrected = Math.min(255, r * Math.min(ratio, r_correction));
      b_corrected = Math.min(255, b * Math.min(ratio, b_correction));
    } else {
      // Blue is dominant
      b_corrected = Math.min(255, Math.max(0, b * b_correction));
      const ratio = b_corrected / b;
      r_corrected = Math.min(255, r * Math.min(ratio, r_correction));
      g_corrected = Math.min(255, g * Math.min(ratio, g_correction));
    }
    
    console.log(`📊 Calibration correction at ${wavelength}nm: RGB(${r.toFixed(0)},${g.toFixed(0)},${b.toFixed(0)}) → RGB(${r_corrected.toFixed(0)},${g_corrected.toFixed(0)},${b_corrected.toFixed(0)})`);
    
    return { r: r_corrected, g: g_corrected, b: b_corrected };
  } catch (error) {
    console.error('Error applying calibration:', error);
    return { r, g, b };
  }
}

interface ColorSpectrumWidgetProps {
  onClose?: () => void;
}

const { width } = Dimensions.get('window');

export const ColorSpectrumWidget: React.FC<ColorSpectrumWidgetProps> = ({ onClose }) => {
  const { colors } = useTheme();
  const [selectedImage, setSelectedImage] = useState<StoredImage | null>(null);
  const [storedImages, setStoredImages] = useState<StoredImage[]>([]);
  const [spectrumData, setSpectrumData] = useState<ColorSpectrumData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(null);
  const [isCalibrated, setIsCalibrated] = useState(false);

  useEffect(() => {
    loadStoredImages();
    loadCalibration();
  }, []);

  const loadCalibration = async () => {
    try {
      console.log('🔄 Loading calibration data...');
      const data = await loadCalibrationData();
      if (data) {
        setCalibrationData(data);
        setIsCalibrated(true);
        console.log('✅ Calibration data loaded for color analysis');
        console.log('📊 Calibration has correction curves:', !!data.correction_curves?.data_points);
        if (data.correction_curves?.data_points) {
          console.log('📊 Available wavelengths:', data.correction_curves.data_points.wavelengths);
        } else {
          console.log('⚠️ Old calibration format detected - recalibrate to enable color correction');
        }
      } else {
        console.log('⚠️ No calibration data found');
      }
    } catch (error) {
      console.error('❌ Error loading calibration:', error);
    }
  };

  const loadStoredImages = async () => {
    const images = await getStoredImages();
    setStoredImages(images);
  };

  const applyCalibrationCorrection = (r: number, g: number, b: number): {r: number, g: number, b: number} => {
    if (!calibrationData || !calibrationData.correction_curves?.final_corrected) {
      // No calibration, return original values
      return { r, g, b };
    }

    try {
      const { wavelengths, r: r_corrected, g: g_corrected, b: b_corrected } = calibrationData.correction_curves.final_corrected;
      
      // Normalize input RGB to 0-1 range
      const r_norm = r / 255;
      const g_norm = g / 255;
      const b_norm = b / 255;
      
      // Determine dominant wavelength based on RGB ratios
      let dominantWavelength = 530; // default green
      if (r_norm > g_norm && r_norm > b_norm) {
        dominantWavelength = 625; // red dominant
      } else if (b_norm > r_norm && b_norm > g_norm) {
        dominantWavelength = 460; // blue dominant
      } else if (g_norm > r_norm && g_norm > b_norm) {
        dominantWavelength = 530; // green dominant
      }
      
      // Find closest wavelength in calibration data
      const wlIndex = wavelengths.findIndex((wl: number) => wl === dominantWavelength) || 0;
      
      // Get correction factors for this wavelength
      const r_correction = calibrationData.correction_curves.data_points.r_corrections[wlIndex] || 1.0;
      const g_correction = calibrationData.correction_curves.data_points.g_corrections[wlIndex] || 1.0;
      const b_correction = calibrationData.correction_curves.data_points.b_corrections[wlIndex] || 1.0;
      
      // Apply corrections
      const r_final = Math.min(255, r * r_correction);
      const g_final = Math.min(255, g * g_correction);
      const b_final = Math.min(255, b * b_correction);
      
      console.log(`Calibration applied: RGB(${r},${g},${b}) → RGB(${r_final.toFixed(0)},${g_final.toFixed(0)},${b_final.toFixed(0)}) at ${dominantWavelength}nm`);
      
      return { r: r_final, g: g_final, b: b_final };
    } catch (error) {
      console.error('Error applying calibration:', error);
      return { r, g, b };
    }
  };

  const handleSelectFromGallery = async () => {
    if (!ImagePicker) {
      Alert.alert(
        'Feature Unavailable',
        'Gallery selection requires a development build with expo-image-picker installed. Please use the Camera Sensor to capture images instead.'
      );
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const tempImage: StoredImage = {
          id: Date.now().toString(),
          uri: result.assets[0].uri,
          fileName: 'Gallery Image',
          timestamp: Date.now(),
          size: 0,
        };
        setSelectedImage(tempImage);
        setShowImagePicker(false);
      }
    } catch (error) {
      console.error('Error selecting from gallery:', error);
      Alert.alert('Error', 'Failed to select image from gallery');
    }
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  const getColorName = (r: number, g: number, b: number): string => {
    // Determine color based on RGB values
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    if (diff < 30) {
      if (max < 60) return 'Dark';
      if (max > 200) return 'Light';
      return 'Gray';
    }

    if (r === max) {
      if (g > b) return 'Yellow-Red';
      return 'Red-Magenta';
    } else if (g === max) {
      if (r > b) return 'Yellow-Green';
      return 'Green-Cyan';
    } else {
      if (g > r) return 'Cyan-Blue';
      return 'Blue-Magenta';
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);

    try {
      // Debug: Check calibration state before analysis
      console.log('🔬 Starting analysis...');
      console.log('📊 Calibration data available:', !!calibrationData);
      console.log('📊 Is calibrated:', isCalibrated);
      if (calibrationData) {
        console.log('📊 Has correction curves:', !!calibrationData.correction_curves?.data_points);
      }
      
      // Analyze the actual image with calibration data if available
      const result = await analyzeImageColors(selectedImage.uri, calibrationData);
      setSpectrumData(result);
    } catch (error) {
      console.error('Error analyzing image:', error);
      Alert.alert('Error', 'Failed to analyze image colors. Please try another image.');
      
      // Fallback to basic color extraction
      const fallbackColors = [
        { color: '#808080', percentage: 60, label: 'Primary' },
        { color: '#A0A0A0', percentage: 25, label: 'Secondary' },
        { color: '#606060', percentage: 15, label: 'Tertiary' },
      ];
      
      setSpectrumData({
        colors: fallbackColors,
        dominantColor: fallbackColors[0].color,
        analyzed: true,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectStoredImage = (image: StoredImage) => {
    setSelectedImage(image);
    setShowImagePicker(false);
    setSpectrumData(null);
  };

  return (
    <GradientCard style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={[colors.primaryGradientStart + '40', colors.primaryGradientEnd + '40']}
            style={styles.icon}
          >
            <Palette size={24} color={colors.primary} />
          </LinearGradient>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Color Spectrum Analysis</Text>
            {isCalibrated && (
              <Text style={[styles.calibrationBadge, { color: colors.success }]}>
                ✓ Calibrated
              </Text>
            )}
          </View>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {!selectedImage ? (
        <View style={styles.selectionContainer}>
          <ImageIcon size={64} color={colors.textSecondary} style={styles.placeholderIcon} />
          <Text style={[styles.instructionText, { color: colors.text }]}>
            Select an image to analyze its color spectrum
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary + '20' }]}
            onPress={() => setShowImagePicker(true)}
          >
            <Text style={[styles.buttonText, { color: colors.primary }]}>
              Select Image
            </Text>
          </TouchableOpacity>

          {showImagePicker && (
            <View style={styles.imagePickerOptions}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Choose from:
              </Text>

              <TouchableOpacity
                style={[styles.optionButton, { backgroundColor: colors.cardBackground }]}
                onPress={handleSelectFromGallery}
              >
                <ImageIcon size={20} color={colors.primary} />
                <Text style={[styles.optionText, { color: colors.text }]}>
                  Gallery
                </Text>
              </TouchableOpacity>

              {storedImages.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
                    Captured Images:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.imageGrid}>
                      {storedImages.map((img) => (
                        <TouchableOpacity
                          key={img.id}
                          onPress={() => handleSelectStoredImage(img)}
                          style={styles.imageThumb}
                        >
                          <Image source={{ uri: img.uri }} style={styles.thumbImage} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.analysisContainer}>
          <View style={styles.imagePreview}>
            <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
            <TouchableOpacity
              style={[styles.changeButton, { backgroundColor: colors.cardBackground }]}
              onPress={() => {
                setSelectedImage(null);
                setSpectrumData(null);
                setShowImagePicker(true);
              }}
            >
              <Text style={[styles.changeButtonText, { color: colors.primary }]}>
                Change Image
              </Text>
            </TouchableOpacity>
          </View>

          {!spectrumData ? (
            <TouchableOpacity
              style={[
                styles.analyzeButton,
                { backgroundColor: colors.primary },
                isAnalyzing && { opacity: 0.7 },
              ]}
              onPress={analyzeImage}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <ActivityIndicator color={colors.cardBackground} />
                  <Text style={[styles.analyzeButtonText, { color: colors.cardBackground }]}>
                    Analyzing...
                  </Text>
                </>
              ) : (
                <>
                  <BarChart3 size={20} color={colors.cardBackground} />
                  <Text style={[styles.analyzeButtonText, { color: colors.cardBackground }]}>
                    Analyze Color Spectrum
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.resultsContainer}>
              <View style={styles.resultsHeader}>
                <Text style={[styles.resultsTitle, { color: colors.text }]}>
                  Color Spectrum Results
                </Text>
                {spectrumData.metadata?.calibrationApplied && (
                  <View style={[styles.calibrationAppliedBadge, { backgroundColor: colors.success + '20' }]}>
                    <Text style={[styles.calibrationAppliedText, { color: colors.success }]}>
                      ✓ Calibration Applied
                    </Text>
                  </View>
                )}
                {spectrumData.analyzed && !spectrumData.metadata?.calibrationApplied && (
                  <View style={[styles.calibrationAppliedBadge, { backgroundColor: colors.warning + '20' }]}>
                    <Text style={[styles.calibrationAppliedText, { color: colors.warning }]}>
                      ⚠ Raw Values (No Calibration)
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.dominantColorContainer}>
                <Text style={[styles.dominantLabel, { color: colors.textSecondary }]}>
                  Dominant Color
                </Text>
                <View style={styles.dominantColorDisplay}>
                  <View
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: spectrumData.dominantColor },
                    ]}
                  />
                  <Text style={[styles.colorCode, { color: colors.text }]}>
                    {spectrumData.dominantColor}
                  </Text>
                </View>
              </View>

              <Text style={[styles.spectrumTitle, { color: colors.text }]}>
                Color Distribution
              </Text>
              {spectrumData.colors?.map((colorItem, index) => (
                <View key={index} style={styles.colorRow}>
                  <View style={styles.colorInfo}>
                    <View
                      style={[styles.colorDot, { backgroundColor: colorItem.color }]}
                    />
                    <Text style={[styles.colorLabel, { color: colors.text }]}>
                      {colorItem.label}
                    </Text>
                  </View>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.colorBar,
                        {
                          width: `${colorItem.percentage}%`,
                          backgroundColor: colorItem.color,
                        },
                      ]}
                    />
                    <Text style={[styles.percentage, { color: colors.textSecondary }]}>
                      {colorItem.percentage}%
                    </Text>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary + '20', marginTop: 16 }]}
                onPress={() => {
                  setSelectedImage(null);
                  setSpectrumData(null);
                }}
              >
                <Text style={[styles.buttonText, { color: colors.primary }]}>
                  Analyze Another Image
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </GradientCard>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  calibrationBadge: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  selectionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  placeholderIcon: {
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 150,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  imagePickerOptions: {
    marginTop: 24,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  imageGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  imageThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  analysisContainer: {
    gap: 16,
  },
  imagePreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    height: 200,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  changeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  analyzeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  resultsContainer: {
    gap: 12,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  dominantColorContainer: {
    marginBottom: 16,
  },
  dominantLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  dominantColorDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorSwatch: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  colorCode: {
    fontSize: 16,
    fontWeight: '600',
  },
  spectrumTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  colorRow: {
    marginBottom: 12,
  },
  colorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  colorLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
  },
  colorBar: {
    height: '100%',
    borderRadius: 4,
    marginRight: 8,
  },
  percentage: {
    fontSize: 12,
    minWidth: 40,
  },
  resultsHeader: {
    marginBottom: 16,
  },
  calibrationAppliedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  calibrationAppliedText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
