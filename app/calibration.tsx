import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';

export default function CalibrationScreen() {
  const { colors } = useTheme();
  const router = useRouter();
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
    <LinearGradient colors={[colors.background, colors.surface]} style={styles.container}>
      <View style={[styles.popup, { backgroundColor: colors.cardBackground, borderColor: colors.primary }]}> 
        <Text style={[styles.title, { color: colors.primary }]}>Calibration Suite</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Select a calibration routine to prepare your spectrometer</Text>

        <View style={styles.options}>
          <TouchableOpacity style={[styles.option, active === 'wavelength' && styles.optionActive]} onPress={() => startCalibration('wavelength')}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>Wavelength Calibration</Text>
            <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Align spectral peaks to reference standards</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.option, active === 'intensity' && styles.optionActive]} onPress={() => startCalibration('intensity')}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>Intensity Calibration</Text>
            <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Normalize detector response across wavelengths</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.option, active === 'dark' && styles.optionActive]} onPress={() => startCalibration('dark')}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>Dark Offset</Text>
            <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Measure dark noise for subtraction</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
            <Text style={{ color: colors.textSecondary }}>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => active && startCalibration(active)} style={[styles.runBtn, { backgroundColor: colors.primary }]}> 
            <Text style={{ color: '#fff' }}>{running ? 'Running...' : 'Run Calibration'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  popup: { width: '90%', maxWidth: 480, padding: 20, borderRadius: 16, borderWidth: 1, shadowColor: '#00f', shadowOpacity: 0.08 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 13, marginBottom: 16 },
  options: { marginBottom: 16 },
  option: { padding: 12, borderRadius: 12, marginBottom: 12, backgroundColor: 'transparent' },
  optionActive: { borderColor: '#00ffff22', borderWidth: 1, backgroundColor: '#ffffff06' },
  optionTitle: { fontSize: 16, fontWeight: '700' },
  optionDesc: { fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { padding: 12 },
  runBtn: { padding: 12, borderRadius: 12 },
});
