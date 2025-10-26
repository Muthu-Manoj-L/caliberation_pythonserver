import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Zap, CheckCircle2, AlertCircle, X, Activity } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { loadCalibrationData, CalibrationData } from '@/lib/spectralAnalysis';
import { loadPythonCalibrationResults } from '@/lib/pythonBridge';

// Import the spectral calibration screen content
import SpectralCalibration from '@/app/spectral-calibration';

export function CalibrationWidget() {
  const { colors } = useTheme();
  const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(null);
  const [pythonResults, setPythonResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCalibration, setShowCalibration] = useState(false);

  useEffect(() => {
    loadCalibration();
  }, []);

  const loadCalibration = async () => {
    try {
      const data = await loadCalibrationData();
      setCalibrationData(data);
      
      // Load Python calibration results for spectral response
      const pythonData = await loadPythonCalibrationResults();
      setPythonResults(pythonData);
    } catch (error) {
      console.error('Error loading calibration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = () => {
    setShowCalibration(true);
  };

  const handleClose = () => {
    setShowCalibration(false);
    // Reload calibration data after closing
    loadCalibration();
  };

  const isCalibrated = calibrationData !== null;

  return (
    <>
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.cardBackground }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Zap size={24} color={colors.primary} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]}>
            Spectral Calibration
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isLoading 
              ? 'Loading...' 
              : isCalibrated 
                ? 'Camera calibrated for wavelength analysis' 
                : 'Calibrate camera for accurate measurements'
            }
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : isCalibrated ? (
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
            <CheckCircle2 size={16} color={colors.success} />
            <Text style={[styles.statusText, { color: colors.success }]}>
              Calibrated
            </Text>
          </View>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {calibrationData.wavelengthMap?.size || 0} color points mapped
          </Text>
          
          {/* Spectral Response Info */}
          {pythonResults?.spectral_response && (
            <View style={styles.spectralInfo}>
              <View style={[styles.spectralBadge, { backgroundColor: colors.primary + '15' }]}>
                <Activity size={14} color={colors.primary} />
                <Text style={[styles.spectralLabel, { color: colors.primary }]}>
                  Spectral Response Available
                </Text>
              </View>
              <Text style={[styles.spectralDetails, { color: colors.textSecondary }]}>
                {Object.keys(pythonResults.spectral_response).length} wavelength correction factors
              </Text>
              <Text style={[styles.spectralDetails, { color: colors.textSecondary }]}>
                {(() => {
                  const factors = Object.values(pythonResults.spectral_response) as number[];
                  const avg = factors.reduce((a, b) => a + b, 0) / factors.length;
                  return `Avg correction: ${avg.toFixed(3)}×`;
                })()}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: colors.warning + '20' }]}>
            <AlertCircle size={16} color={colors.warning} />
            <Text style={[styles.statusText, { color: colors.warning }]}>
              Not Calibrated
            </Text>
          </View>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Tap to start calibration
          </Text>
        </View>
      )}
    </TouchableOpacity>

    {/* Calibration Modal */}
    <Modal
      visible={showCalibration}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SpectralCalibration onClose={handleClose} />
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  statusContainer: {
    marginTop: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  infoText: {
    fontSize: 12,
  },
  spectralInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  spectralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 6,
  },
  spectralLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 5,
  },
  spectralDetails: {
    fontSize: 11,
    marginTop: 2,
  },
});
