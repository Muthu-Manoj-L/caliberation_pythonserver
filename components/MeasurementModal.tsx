import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, TextInput } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth, FRONTEND_ONLY } from '@/contexts/AuthContext';
import { DeviceEventEmitter, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onComplete?: (measurementId?: string, target?: number) => void;
  device?: any;
}

export function MeasurementModal({ visible, onClose, onComplete, device }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  // Target number of measurements (distinct value changes)
  const [targetCount, setTargetCount] = useState<string>('10');
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const measurementIdRef = React.useRef<string | undefined>(undefined);
  const startedRef = React.useRef(false);
  const [debugValue, setDebugValue] = useState<string>('1');
  const [debugRunning, setDebugRunning] = useState(false);

  const startMeasurement = async () => {
    setRunning(true);

  // Create a measurement record immediately so the dashboard and widgets
  // know a measurement job exists. The sensor/driver should only start
  // producing measurement:stream values after we emit 'measurement:start'.
    let measurementId: string | undefined;

    if (FRONTEND_ONLY || !user) {
      // Simulate a measurement row locally
      measurementId = `local-${Date.now()}`;
    } else {
      try {
  const params = { target: Number(targetCount) || null };
        const { data, error } = await supabase.from('measurements').insert({
          user_id: user.id,
          measurement_type: 'spectral',
          status: 'processing',
          parameters: params,
        }).select('id').maybeSingle();

        if (error) {
          // fallback to local id
          measurementId = `local-${Date.now()}`;
        } else if (data && data.id) {
          // @ts-ignore
          measurementId = data.id;
        }
      } catch (err) {
        measurementId = `local-${Date.now()}`;
      }
    }

    // notify parent that a measurement has started (so callers can react)
  if (typeof onComplete === 'function') onComplete(measurementId, Number(targetCount) || 0);

    // mark that the measurement was started locally so the modal will show
    // live values only after the user pressed Start.
    startedRef.current = true;
    measurementIdRef.current = measurementId;

    // emit start event so real-time widget and native drivers begin emitting
    try {
      DeviceEventEmitter.emit('measurement:start', { id: measurementId, device, target: Number(targetCount) || null });
      DeviceEventEmitter.emit('measurement:changed', { id: measurementId, status: 'processing' });
    } catch (e) {}

    // Start local tracking of stream events for this measurement id.
    setRunning(false);
    onClose();

    // If the device/driver doesn't automatically stop the measurement
    // after target is reached, implement a local watchdog that listens
    // for measurement:stream for this measurement id and counts value
    // changes until target is reached.
  const samples: number[] = [];
  let lastVal: number | undefined;
  let changes = 0;

    const streamSub = DeviceEventEmitter.addListener('measurement:stream', async (payload: any) => {
      if (!payload) return;
      if (String(payload.id) !== String(measurementId)) return;
      const v = Number(payload.value ?? NaN);
      if (Number.isNaN(v)) return;
      samples.push(v);
      if (lastVal === undefined || lastVal !== v) {
        changes += 1;
        lastVal = v;
        // notify other UI that a stream change happened
        DeviceEventEmitter.emit('measurement:changed', { id: measurementId, status: 'processing' });
      }

      // if changes reached the configured target count, complete the measurement locally
      const target = Number(targetCount) || 0;
      if (changes >= target) {
        streamSub.remove();
        try {
          DeviceEventEmitter.emit('measurement:completed', { id: measurementId, samples, device });
          DeviceEventEmitter.emit('measurement:changed', { id: measurementId, status: 'completed' });

          // notify user (small popup) that the measurement finished
          try {
            // show a native alert in the app
            // eslint-disable-next-line no-alert
            Alert.alert('Measurement complete', 'The measurement target has been reached.');
          } catch (e) {}

          if (!FRONTEND_ONLY && measurementId && user) {
            await supabase.from('spectral_data').insert({ measurement_id: measurementId, wavelength_data: [], intensity_data: samples });
            await supabase.from('measurements').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', measurementId);
          }
        } catch (e) {
          // ignore persistence errors but still emit completed
        }
      }
    });
  };

  // Listen for live stream updates so the modal can display current value
  React.useEffect(() => {
    const sub = DeviceEventEmitter.addListener('measurement:stream', (payload: any) => {
      if (!payload) return;
      // Only show stream value once the user has pressed Start to begin a
      // measurement. This prevents the proximity default (5) from appearing
      // before the measurement starts.
      if (!startedRef.current) return;
      // If measurementIdRef is set, prefer matching ids, otherwise show
      // values coming from the same device.
      const payloadId = String(payload.id ?? payload?.device?.id ?? '');
      if (measurementIdRef.current && String(measurementIdRef.current) !== payloadId) return;
      setCurrentValue(Number(payload.value ?? null));
    });
    return () => { sub.remove(); };
  }, []);

  // Debug emitter helpers (FRONTEND_ONLY): emit sample, complete, or auto-run to target
  const emitSample = (val?: number) => {
    const mid = measurementIdRef.current || String(device?.id || 'debug');
    const v = typeof val === 'number' ? val : Number(debugValue || 0);
    try {
      DeviceEventEmitter.emit('measurement:stream', { id: mid, value: v, index: Date.now(), device: device || { id: mid, device_name: 'Debug Device' } });
    } catch (e) {}
  };

  const emitComplete = () => {
    const mid = measurementIdRef.current || String(device?.id || 'debug');
    try {
      DeviceEventEmitter.emit('measurement:completed', { id: mid, samples: [], device });
    } catch (e) {}
  };

  const emitAutoToTarget = () => {
    if (debugRunning) return;
    const mid = measurementIdRef.current || String(device?.id || 'debug');
    const target = Number(targetCount) || 0;
    if (!target || target <= 0) return;
    setDebugRunning(true);
    // emit distinct values to count as changes
    const timers: number[] = [];
    for (let i = 0; i < target; i += 1) {
      const t = setTimeout(() => {
        try { DeviceEventEmitter.emit('measurement:stream', { id: mid, value: i + 1, index: i, device: device || { id: mid, device_name: 'Debug Device' } }); } catch (e) {}
        if (i === target - 1) {
          try { DeviceEventEmitter.emit('measurement:completed', { id: mid, samples: Array.from({ length: target }, (_, j) => j + 1), device }); } catch (e) {}
          setDebugRunning(false);
        }
      }, i * 200);
      // store the timer so we could clear if needed
      // @ts-ignore
      timers.push(t);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.backdrop, { backgroundColor: (colors.background === '#0F172A' ? 'rgba(3,6,15,0.75)' : 'rgba(255,255,255,0.6)') }]}>
        <LinearGradient colors={[colors.surface + 'EE', colors.background + 'EE']} style={[styles.overlay, { padding: 18 }]}> 
          <View style={[styles.popup, { backgroundColor: colors.surface, borderColor: colors.primary + '55' }]}> 
            <View style={[styles.neon, { backgroundColor: colors.primary + 'DD' }]} />
            <Text style={[styles.title, { color: colors.text, marginTop: 8 }]}>Measurement</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Configure measurement parameters</Text>

            <View style={styles.options}>
              <Text style={[styles.label, { color: colors.text }]}>Target (measurements)</Text>
              <TextInput value={targetCount} onChangeText={setTargetCount} keyboardType="numeric" placeholder="Enter number of measurements" style={[styles.input, { color: colors.text, borderColor: colors.border }]} />

              {currentValue !== null && (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: colors.textSecondary }}>Current value</Text>
                  <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{String(currentValue)}</Text>
                </View>
              )}

              {FRONTEND_ONLY && (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>Debug emitter</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput value={debugValue} onChangeText={setDebugValue} keyboardType="numeric" style={[styles.input, { color: colors.text, borderColor: colors.border, flex: 1 }]} />
                    <TouchableOpacity onPress={() => emitSample()} style={styles.presetBtn}><Text style={{ color: colors.text }}>Emit</Text></TouchableOpacity>
                    <TouchableOpacity onPress={emitComplete} style={styles.presetBtn}><Text style={{ color: colors.text }}>Complete</Text></TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={emitAutoToTarget} style={[styles.presetBtn, { marginTop: 8 }]}><Text style={{ color: colors.text }}>Auto → Target</Text></TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={startMeasurement} disabled={!targetCount || running} style={[styles.runBtn, { backgroundColor: (!targetCount || running) ? 'rgba(255,255,255,0.06)' : colors.primary }]}> 
                {running ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff' }}>Start Measurement</Text>
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
  overlay: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  popup: { width: '90%', padding: 20, borderRadius: 16, borderWidth: 1, shadowColor: '#00f', shadowOpacity: 0.08 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 13, marginBottom: 16 },
  options: { marginBottom: 16 },
  label: { fontSize: 13, marginBottom: 8 },
  presetsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  presetBtn: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, height: 44 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  cancelBtn: { padding: 12 },
  runBtn: { padding: 12, borderRadius: 12 },
  neon: { height: 4, borderRadius: 4, marginBottom: 8 },
});
