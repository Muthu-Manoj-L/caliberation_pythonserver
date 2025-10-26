import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function CalibrationModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const [active, setActive] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const startCalibration = (mode: string) => {
    setActive(mode);
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
    }, 2000);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.backdrop, { backgroundColor: (colors.background === '#0F172A' ? 'rgba(8,10,18,0.75)' : 'rgba(255,255,255,0.6)') }]}>
          <LinearGradient
            colors={[colors.surface + 'EE', colors.background + 'EE']}
            style={[styles.overlay, { padding: 18 }]}
          >
            <View style={[styles.popup, { backgroundColor: colors.surface, borderColor: colors.primary + '44' }]}> 
            <Text style={[styles.title, { color: colors.primary }]}>Calibration Suite</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Select a calibration routine to prepare your spectrometer</Text>

            <View style={styles.options}>
              <TouchableOpacity style={[styles.option, active === 'wavelength' && { borderColor: colors.primary }]} onPress={() => startCalibration('wavelength')}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Wavelength Calibration</Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Align spectral peaks to reference standards</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.option, active === 'intensity' && { borderColor: colors.primary }]} onPress={() => startCalibration('intensity')}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Intensity Calibration</Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Normalize detector response across wavelengths</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.option, active === 'dark' && { borderColor: colors.primary }]} onPress={() => startCalibration('dark')}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Dark Offset</Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Measure dark noise for subtraction</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={{ color: colors.textSecondary }}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => active && startCalibration(active)} style={[styles.runBtn, { backgroundColor: colors.primary }]}> 
                {running ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff' }}>Run Calibration</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { width: '92%', borderRadius: 14 },
  popup: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  neon: { height: 6, borderRadius: 4, alignSelf: 'stretch' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 13, marginBottom: 12 },
  options: { marginBottom: 16 },
  option: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  optionTitle: { fontSize: 16, fontWeight: '700' },
  optionDesc: { fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { padding: 12 },
  runBtn: { padding: 12, borderRadius: 12 },
});
