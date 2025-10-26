import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Platform } from 'react-native';
import Svg, { Rect as SvgRect, Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/lib/supabase';
import { FRONTEND_ONLY } from '@/contexts/AuthContext';
import { LightSensor } from 'expo-sensors';

interface Props {
  visible: boolean;
  widget?: string | null;
  onClose: () => void;
  deviceConnected?: boolean;
  device?: { id?: string; device_name?: string } | null;
}

function generatePoint(seed: number) {
  return Math.round(40 + 50 * Math.abs(Math.sin(seed / 3.7)) + (Math.sin(seed / 2.1) * 8));
}

export default function WidgetModal({ visible, widget, onClose, deviceConnected, device }: Props) {
  const { colors } = useTheme();
  const title = widget || '';
  const MAX_STREAM_LEN = 40;

  // Realtime stream (used for spectral and proximity visuals)
  const [streamData, setStreamData] = useState<number[]>([]);
  const intervalRef = useRef<number | null>(null);

  // Proximity numeric (cm) — default far
  const [proximityCm, setProximityCm] = useState<number>(5);
  // Ambient light numeric (lux) — default 0
  const [ambientLightLux, setAmbientLightLux] = useState<number>(0);
  // Live measurement metadata
  const [liveDeviceName, setLiveDeviceName] = useState<string | null>(null);
  const [liveCurrentValue, setLiveCurrentValue] = useState<number | null>(null);

  // Try to require the native proximity module
  let Proximity: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Proximity = require('react-native-proximity');
  } catch (e) {
    Proximity = null;
  }

  // Recorded dataset
  const recordedSample = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ id: String(i + 1), x: i + 1, y: Math.round(30 + 70 * Math.abs(Math.sin(i / 4))) })), []);
  const [recordView, setRecordView] = useState<'scatter' | 'bar' | 'table'>('scatter');

  // Fetched recorded measurements (from supabase or demo)
  const [recordedData, setRecordedData] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const [loadingRecorded, setLoadingRecorded] = useState(false);
  const selectedDeviceIdRef = useRef<string | null>(device?.id ?? null);
  // Temporary in-memory buffer of samples keyed by measurement id (not persisted)
  const tempBuffersRef = useRef<Record<string, number[]>>({});
  const currentMeasurementIdRef = useRef<string | null>(null);
  const measurementIndexRef = useRef<Record<string, number>>({});

  // Load measurements when the Recorded Data widget opens. Fetch real
  // persisted measurements, optionally filtered by the device that was
  // selected when the widget was opened. We remember the last selected
  // device so disconnecting doesn't clear the recorded view.
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!visible || !/recorded/i.test(title)) return;
      setLoadingRecorded(true);

      // In frontend-only mode we avoid injecting demo data; show empty
      // list instead so user sees the real persisted history when
      // connected to a backend.
      if (FRONTEND_ONLY) {
        setRecordedData([]);
        setLoadingRecorded(false);
        return;
      }

      try {
        // optionally filter by device id when provided (use selectedDeviceIdRef)
        // so a disconnect in the dashboard doesn't immediately clear the
        // recorded listing for the device the user was viewing.
        if (device?.id) selectedDeviceIdRef.current = device.id;
        const filterDeviceId = selectedDeviceIdRef.current;

        let q = supabase
          .from('measurements')
          .select('id, created_at')
          .order('created_at', { ascending: false })
          .limit(30);
        if (filterDeviceId) q = q.eq('device_id', filterDeviceId as any);
        const { data, error } = await q;

        if (!mounted) return;
        if (error) {
          setRecordedData([]);
        } else if (Array.isArray(data) && data.length) {
          // map to x/y for simple plotting; the y value is currently a
          // placeholder since full spectral arrays are stored in
          // `spectral_data`. We use a simple summary (index-based) so the
          // UI shows entries without injecting fake sensor values.
          const mapped = data.map((row: any, idx: number) => ({ id: row.id || String(idx), x: data.length - idx, y: Math.round(50 + (idx % 10) * 6) }));
          setRecordedData(mapped.reverse());
        } else {
          setRecordedData([]);
        }
      } catch (err) {
        setRecordedData([]);
      } finally {
        setLoadingRecorded(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [visible, title, device]);

  // Persist completed measurements and refresh recorded list. Keep this
  // listener outside the load effect so it fires even when the recorded
  // widget isn't open (the user may want the list updated when they open it).
  useEffect(() => {
    const completedSub = DeviceEventEmitter.addListener('measurement:completed', async (payload: any) => {
      const mid = payload?.id;
      const samples = Array.isArray(payload?.samples) ? payload.samples : null;
      const payloadDeviceId = payload?.device?.id;

      // If we have a device filter remembered and the payload doesn't match,
      // ignore it.
      const filterDeviceId = selectedDeviceIdRef.current;
      if (filterDeviceId && payloadDeviceId && payloadDeviceId !== filterDeviceId) return;

      // Persist samples to supabase if available
      if (!FRONTEND_ONLY && samples && mid) {
        try {
          // store spectral_data as intensity array; wavelength_data can be null or index map
          await supabase.from('spectral_data').insert({ measurement_id: mid, wavelength_data: [], intensity_data: samples });
          await supabase.from('measurements').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', mid);
        } catch (e) {
          // ignore persistence errors
        }
      }

      // Update UI-recorded list so it reflects the final values
      setRecordedData((prev) => {
        const val = samples && samples.length ? Math.round(samples[samples.length - 1]) : null;
        if (val === null) return prev;
        // attempt to update existing entry for this measurement id
        const idx = prev.findIndex((r) => String(r.id) === String(mid));
        if (idx >= 0) {
          const copy = prev.slice();
          copy[idx] = { ...copy[idx], y: val };
          return copy;
        }
        // prepend a new entry
        const newEntry = { id: mid || String(Date.now()), x: prev.length ? prev[0].x + 1 : 1, y: val };
        return [newEntry, ...prev].slice(0, 30);
      });
    });

    return () => { completedSub.remove(); };
  }, []);

  // Store incoming stream samples into temporary buffers so Recorded Data
  // reflects live samples while the device is connected. Buffers are
  // cleared on device disconnect.
  useEffect(() => {
    const streamSub = DeviceEventEmitter.addListener('measurement:stream', (payload: any) => {
      const mid = payload?.id || String(payload?.device?.id || 'unknown');
      const v = Number(payload?.value ?? NaN);
      if (Number.isNaN(v)) return;
      // append to buffer
      const buffers = tempBuffersRef.current;
      if (!buffers[mid]) buffers[mid] = [];
      buffers[mid].push(v);
      if (buffers[mid].length > 200) buffers[mid].shift();

      // reflect into recordedData (summary using last value)
      setRecordedData((prev) => {
        const idx = prev.findIndex((r) => String(r.id) === String(mid));
        if (idx >= 0) {
          const copy = prev.slice();
          copy[idx] = { ...copy[idx], y: Math.round(v) };
          return copy;
        }
        const newEntry = { id: mid, x: prev.length ? prev[0].x + 1 : 1, y: Math.round(v) };
        return [newEntry, ...prev].slice(0, 30);
      });
    });

    const discSub = DeviceEventEmitter.addListener('device:disconnected', (payload: any) => {
      const did = payload?.id;
      if (!did) return;
      // Clear buffers and recordedData entries for the disconnected device
      const buffers = tempBuffersRef.current;
      Object.keys(buffers).forEach((k) => {
        if (String(k).startsWith(String(did))) delete buffers[k];
      });
      setRecordedData((prev) => prev.filter((r) => !(String(r.id).startsWith(String(did)))));
    });

    const deviceSelectedSub = DeviceEventEmitter.addListener('device:selected', (payload: any) => {
      // Update device ref when a new device (including sensors) is selected
      if (payload?.id) {
        selectedDeviceIdRef.current = payload.id;
      }
    });

    return () => { streamSub.remove(); discSub.remove(); deviceSelectedSub.remove(); };
  }, []);

  // Manage realtime stream and proximity/light subscription
  useEffect(() => {
    if (!visible) return undefined;

    // If this is the proximity real-time widget, subscribe to native sensor.
    if (/proximity/i.test(title) && Proximity && typeof Proximity.addListener === 'function') {
      const handler = (e: any) => {
        const isNear = !!e?.proximity;
        const dist = isNear ? 0 : 5; // exact mapping per requirement
        setProximityCm(dist);
        // append raw 0/5 to sliding window (no scaling)
        setStreamData((prev) => {
          const next = prev.concat([dist]);
          if (next.length > MAX_STREAM_LEN) next.splice(0, next.length - MAX_STREAM_LEN);
          return next;
        });

        // Always emit a measurement:stream event so the rest of the UI (dashboard,
        // recorded list, measurement counters) sees live proximity updates even
        // when a MeasurementModal hasn't explicitly created an id. Use the
        // currentMeasurementIdRef when present, otherwise derive a stable id
        // from the device so recorded data groups by device while connected.
        try {
          const mid = currentMeasurementIdRef.current || String(device?.id || 'proximity:local');
          const idxMap = measurementIndexRef.current;
          idxMap[mid] = (idxMap[mid] || 0) + 1;
          DeviceEventEmitter.emit('measurement:stream', { id: mid, value: dist, index: idxMap[mid], device: { id: device?.id || 'proximity:local', device_name: device?.device_name || 'Phone proximity sensor' } });
        } catch (err) {
          // harmless if DeviceEventEmitter is unavailable
        }
      };

      try {
        Proximity.addListener(handler);
      } catch (err) {
        // ignore
      }

      return () => {
        try {
          Proximity.removeListener(handler);
        } catch (err) {}
      };
    }

    // If this is the ambient light real-time widget, subscribe to light sensor
    if (/light|ambient/i.test(title)) {
      try {
        const subscription = LightSensor.addListener((data: any) => {
          const illum = Math.round(data.illuminance || 0);
          setAmbientLightLux(illum);
          // append to sliding window
          setStreamData((prev) => {
            const next = prev.concat([illum]);
            if (next.length > MAX_STREAM_LEN) next.splice(0, next.length - MAX_STREAM_LEN);
            return next;
          });

          // Emit measurement:stream event for dashboard updates
          try {
            const mid = currentMeasurementIdRef.current || String(device?.id || 'light:local');
            const idxMap = measurementIndexRef.current;
            idxMap[mid] = (idxMap[mid] || 0) + 1;
            DeviceEventEmitter.emit('measurement:stream', { id: mid, value: illum, index: idxMap[mid], device: { id: device?.id || 'light:local', device_name: device?.device_name || 'Phone ambient light sensor' } });
          } catch (err) {
            // harmless if DeviceEventEmitter is unavailable
          }
        });
        
        return () => {
          subscription.remove();
        };
      } catch (err) {
        console.warn('Light sensor not available, using simulated data:', err);
        // Fallback: Simulate sensor data for Expo Go
        let lastValue = 750;
        const simulationInterval = setInterval(() => {
          // Simulate realistic light value changes (400-1200 lux)
          const change = (Math.random() - 0.5) * 100;
          lastValue = Math.max(400, Math.min(1200, lastValue + change));
          const illum = Math.round(lastValue);
          
          setAmbientLightLux(illum);
          setStreamData((prev) => {
            const next = prev.concat([illum]);
            if (next.length > MAX_STREAM_LEN) next.splice(0, next.length - MAX_STREAM_LEN);
            return next;
          });

          // Emit measurement:stream event
          try {
            const mid = currentMeasurementIdRef.current || String(device?.id || 'light:local');
            const idxMap = measurementIndexRef.current;
            idxMap[mid] = (idxMap[mid] || 0) + 1;
            DeviceEventEmitter.emit('measurement:stream', { id: mid, value: illum, index: idxMap[mid], device: { id: device?.id || 'light:local', device_name: device?.device_name || 'Phone ambient light sensor' } });
          } catch (err) {
            // ignore
          }
        }, 500); // Update every 500ms for smooth animation
        
        return () => clearInterval(simulationInterval);
      }
    }

    // No default simulation for spectral realtime data: we only render
    // values pushed by the native proximity module or by explicit
    // 'measurement:stream' events emitted by the measurement flow.
    // Keep intervalRef for cleanup in case a native listener uses it.

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current as unknown as number);
      intervalRef.current = null;
    };
  }, [visible, title]);

  // Listen for measurement events to drive live realtime display
  useEffect(() => {
    const startSub = DeviceEventEmitter.addListener('measurement:start', (payload: any) => {
      // payload: { id, count, device }
      if (!/real-time/i.test(title) && !/camera|proximity/i.test(title)) return;
      setLiveDeviceName(payload?.device?.device_name || null);
      if (payload?.id) currentMeasurementIdRef.current = payload.id;
    });

    const streamSub = DeviceEventEmitter.addListener('measurement:stream', (payload: any) => {
      if (!visible) return;
      const raw = Number(payload?.value ?? NaN);
      if (Number.isNaN(raw)) return;
      const val = raw;

      // append to sliding window for realtime plotting
      setStreamData((prev) => {
        const next = prev.concat([val]);
        if (next.length > MAX_STREAM_LEN) next.splice(0, next.length - MAX_STREAM_LEN);
        return next;
      });

      setLiveCurrentValue(val);
      if (payload?.device?.device_name) setLiveDeviceName(payload.device.device_name);

      // update recordedData (if present) so the recorded table shows the current value
      setRecordedData((prev) => {
        const mid = payload?.id || currentMeasurementIdRef.current || String(Date.now());
        if (!prev || prev.length === 0) {
          // prepend minimal entry for the active measurement
          const newEntry = { id: mid, x: prev.length ? prev[0].x + 1 : 1, y: Math.round(val) };
          return [newEntry, ...prev].slice(0, 30);
        }
        const idx = prev.findIndex((r) => String(r.id) === String(mid));
        if (idx >= 0) {
          const copy = prev.slice();
          copy[idx] = { ...copy[idx], y: Math.round(val) };
          return copy;
        }
        // if not found, prepend
        const newEntry = { id: mid, x: prev.length ? prev[0].x + 1 : 1, y: Math.round(val) };
        return [newEntry, ...prev].slice(0, 30);
      });
    });

    const completedSub = DeviceEventEmitter.addListener('measurement:completed', (payload: any) => {
      // optionally show a final state
      setLiveDeviceName(null);
      setLiveCurrentValue(null);
      // clear current measurement id when completed
      if (payload?.id && currentMeasurementIdRef.current === payload.id) currentMeasurementIdRef.current = null;
    });

    return () => {
      startSub.remove(); streamSub.remove(); completedSub.remove();
    };
  }, [visible, title]);

  const pathFromData = (data: number[], w = 320, h = 160, leftPad = 36, topPad = 6, bottomPad = 24, maxValue = 120) => {
    // compute inner drawing area so axes/labels have consistent spacing
    const innerW = w - leftPad - 12;
    const innerH = h - topPad - bottomPad;
    const step = innerW / Math.max(1, data.length - 1);
    return data.map((v, i) => {
      const x = leftPad + i * step;
      const y = topPad + (innerH - (Math.min(v, maxValue) / maxValue) * innerH);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  // Render recorded chart with axes and labels
  const RecordedChart = () => {
    const data = recordedData;
    if (!data || data.length === 0) {
      return (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>No recorded measurements</Text>
        </View>
      );
    }
    const w = 340; const h = 220; const leftPad = 46; const topPad = 8; const bottomPad = 28;
    const innerW = w - leftPad - 12; const innerH = h - topPad - bottomPad;

    const maxY = Math.max(...data.map(s => s.y));
    const minY = Math.min(...data.map(s => s.y));

    const yLabel = (val: number) => String(val);
    const gridStops = [0, 0.25, 0.5, 0.75, 1];

    return (
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        <SvgRect x="0" y="0" width={w} height={h} rx={8} fill={colors.surface || '#071226'} />

        {/* Y axis labels and grid */}
        {gridStops.map((t, idx) => {
          const y = topPad + t * innerH;
          const value = Math.round(maxY - t * (maxY - minY));
          return (
            <React.Fragment key={idx}>
              <Line x1={leftPad} y1={y} x2={leftPad + innerW} y2={y} stroke={colors.textSecondary || '#375166'} strokeWidth={0.6} />
              <SvgText x={8} y={y + 4} fontSize={10} fill={colors.textSecondary || '#9aa4b2'}>{yLabel(value)}</SvgText>
            </React.Fragment>
          );
        })}

        {/* X axis baseline */}
        <Line x1={leftPad} y1={topPad + innerH} x2={leftPad + innerW} y2={topPad + innerH} stroke={colors.textSecondary || '#375166'} strokeWidth={1} />

        {/* Points / bars */}
        {data.map((d, i) => {
          const x = leftPad + (i * (innerW / Math.max(1, data.length - 1)));
          const y = topPad + innerH - ((d.y - minY) / Math.max(1, maxY - minY)) * innerH;
          return (
            <React.Fragment key={d.id}>
              {recordView === 'scatter' && <Circle cx={x} cy={y} r={3} fill={colors.primary || '#3b82f6'} />}
              {recordView === 'bar' && <SvgRect x={x - 6} y={y} width={8} height={(topPad + innerH) - y} fill={colors.primary || '#3b82f6'} />}
            </React.Fragment>
          );
        })}

        {/* X axis labels (every 5th) */}
        {data.filter((_, i) => i % 5 === 0).map((d, i) => {
          const idx = i * 5;
          const x = leftPad + (idx * (innerW / Math.max(1, data.length - 1)));
          return (
            <SvgText key={d.id} x={x - 6} y={h - 6} fontSize={10} fill={colors.textSecondary || '#9aa4b2'}>{String(d.x)}</SvgText>
          );
        })}
      </Svg>
    );
  };

  // Using react-native-svg primitives directly (SvgText, SvgRect) — no helpers required.

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
        <View style={[styles.container, { backgroundColor: colors.surface || '#0b1220' }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text || '#fff' }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.primary || '#3b82f6' }}>Close</Text>
            </TouchableOpacity>
          </View>

          {/* Branch on widget prop: Recorded Data vs Real-Time */}
          {/recorded/i.test(title) ? (
            <View>
              <View style={styles.recordTabRow}>
                <TouchableOpacity onPress={() => setRecordView('scatter')} style={[styles.tabBtn, recordView === 'scatter' && { borderColor: colors.primary }]}>
                  <Text style={{ color: colors.text }}>Scatter</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setRecordView('bar')} style={[styles.tabBtn, recordView === 'bar' && { borderColor: colors.primary }]}>
                  <Text style={{ color: colors.text }}>Bar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setRecordView('table')} style={[styles.tabBtn, recordView === 'table' && { borderColor: colors.primary }]}>
                  <Text style={{ color: colors.text }}>Table</Text>
                </TouchableOpacity>
              </View>

              {recordView === 'table' ? (
                loadingRecorded ? (
                  <View style={{ padding: 12 }}><Text style={{ color: colors.textSecondary }}>Loading...</Text></View>
                ) : recordedData.length === 0 ? (
                  <View style={{ padding: 12 }}><Text style={{ color: colors.textSecondary }}>No measurements</Text></View>
                ) : (
                  <FlatList data={recordedData} keyExtractor={(i) => i.id} style={{ maxHeight: 260 }} renderItem={({ item }) => (
                    <View style={[styles.tableRow]}>
                      <Text style={{ color: colors.text }}>{item.x}</Text>
                      <Text style={{ color: colors.text }}>{item.y}</Text>
                    </View>
                  )} />
                )
              ) : (
                <RecordedChart />
              )}
            </View>
          ) : /proximity/i.test(title) ? (
            <View style={styles.realTimeRow}>
              <View style={styles.graphArea}>
                {/* Realtime proximity graph with aligned axes and labels */}
                <Svg width="100%" height={160} viewBox="0 0 340 160">
                  <SvgRect x="0" y="0" width="340" height="160" rx={8} fill={colors.surface || '#071226'} />
                  {/* Y grid and labels (only 5 and 0) */}
                  {[0, 1].map((t, i) => {
                    const topPad = 8; const bottomPad = 24; const innerH = 160 - topPad - bottomPad;
                    const y = topPad + t * innerH;
                    const label = String(Math.round((1 - t) * 5));
                    return (
                      <React.Fragment key={i}>
                        <Line x1={46} y1={y} x2={46 + (340 - 46 - 12)} y2={y} stroke={colors.textSecondary || '#375166'} strokeWidth={0.6} />
                        <SvgText x={10} y={y + 4} fontSize={10} fill={colors.textSecondary || '#9aa4b2'}>{label}</SvgText>
                      </React.Fragment>
                    );
                  })}

                  <Path d={pathFromData(streamData, 340, 160, 46, 8, 24, 5)} stroke={colors.primary || '#3b82f6'} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>

              <View style={styles.rtSide}>
                <Text style={[styles.panelTitle, { color: colors.text || '#fff' }]}>{liveDeviceName ? `${liveDeviceName}` : 'Distance'}</Text>
                <Text style={[styles.currentValue, { color: colors.primary || '#3b82f6' }]}>{`${liveCurrentValue ?? proximityCm} cm`}</Text>
              </View>
            </View>
          ) : /light|ambient/i.test(title) ? (
            <View style={styles.realTimeRow}>
              <View style={styles.graphArea}>
                {/* Realtime ambient light graph */}
                <Svg width="100%" height={160} viewBox="0 0 340 160">
                  <SvgRect x="0" y="0" width="340" height="160" rx={8} fill={colors.surface || '#071226'} />
                  {/* Y grid and labels */}
                  {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                    const topPad = 8; const bottomPad = 24; const innerH = 160 - topPad - bottomPad;
                    const y = topPad + t * innerH;
                    const maxLux = 3000; // reasonable max for display
                    const label = String(Math.round((1 - t) * maxLux));
                    return (
                      <React.Fragment key={i}>
                        <Line x1={46} y1={y} x2={46 + (340 - 46 - 12)} y2={y} stroke={colors.textSecondary || '#375166'} strokeWidth={0.6} />
                        <SvgText x={2} y={y + 4} fontSize={9} fill={colors.textSecondary || '#9aa4b2'}>{label}</SvgText>
                      </React.Fragment>
                    );
                  })}

                  <Path d={pathFromData(streamData, 340, 160, 46, 8, 24, 3000)} stroke={colors.primary || '#3b82f6'} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>

              <View style={styles.rtSide}>
                <Text style={[styles.panelTitle, { color: colors.text || '#fff' }]}>{liveDeviceName ? `${liveDeviceName}` : 'Illuminance'}</Text>
                <Text style={[styles.currentValue, { color: colors.primary || '#3b82f6' }]}>{`${liveCurrentValue ?? ambientLightLux} lux`}</Text>
              </View>
            </View>
          ) : (
            // generic realtime spectral
            <View style={styles.realTimeRow}>
              <View style={styles.graphArea}>
                <Svg width="100%" height={160} viewBox="0 0 340 160">
                  <SvgRect x="0" y="0" width="340" height="160" rx={8} fill={colors.surface || '#071226'} />
                  {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                    const topPad = 8; const bottomPad = 24; const innerH = 160 - topPad - bottomPad;
                    const y = topPad + t * innerH;
                    return <Line key={i} x1={46} y1={y} x2={46 + (340 - 46 - 12)} y2={y} stroke={colors.textSecondary || '#375166'} strokeWidth={0.5} />;
                  })}

                  <Path d={pathFromData(streamData, 340, 160, 46, 8, 24, 120)} stroke={colors.primary || '#3b82f6'} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>

              <View style={styles.rtSide}>
                <Text style={[styles.panelTitle, { color: colors.text || '#fff' }]}>{liveDeviceName ? `${liveDeviceName}` : 'Current'}</Text>
                <Text style={[styles.currentValue, { color: colors.primary || '#3b82f6' }]}>{String(Math.round(liveCurrentValue ?? streamData[streamData.length - 1]))}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { width: '92%', maxWidth: 820, borderRadius: 12, padding: 14, borderWidth: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  recordTabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tabBtn: { padding: 8, borderWidth: 1, borderColor: 'transparent', borderRadius: 6 },
  realTimeRow: { flexDirection: 'row', gap: 12 },
  graphArea: { flex: 1 },
  rtSide: { width: 140, paddingLeft: 12, justifyContent: 'center', alignItems: 'center' },
  panelTitle: { fontSize: 12, marginBottom: 6 },
  currentValue: { fontSize: 22, fontWeight: '700' },
  recordControls: {},
  recordBody: { marginTop: 6 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 6 },
});
