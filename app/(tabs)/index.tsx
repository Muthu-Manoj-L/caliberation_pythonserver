import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Wifi,
  Battery,
  Signal,
  Gauge,
  Microscope,
  Database,
  Activity,
  Settings as SettingsIcon,
  ChevronRight,
  Radio,
  Sun,
  Camera as CameraIcon,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { GradientCard } from '@/components/GradientCard';
import { IconCard } from '@/components/IconCard';
import { CircularProgress } from '@/components/CircularProgress';
import { CalibrationModal } from '@/components/CalibrationModal';
import { MeasurementModal } from '@/components/MeasurementModal';
import { WidgetModal } from '@/components/WidgetModal';
import { DevicePickerModal } from '@/components/DevicePickerModal';
import { CameraPreview } from '@/components/CameraPreview';
import { CalibrationWidget } from '@/components/CalibrationWidget';
import * as ExpoCamera from 'expo-camera';
import { supabase } from '@/lib/supabase';
import { requestCameraPermissions, StoredImage } from '@/lib/cameraService';
import { Modal } from 'react-native';
import { FRONTEND_ONLY } from '@/contexts/AuthContext';
import { DeviceEventEmitter } from 'react-native';
import { LightSensor } from 'expo-sensors';

interface DeviceStatus {
  id: string;
  device_name: string;
  status: string;
  battery_level: number;
  signal_strength: number;
  last_connected: string;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, profile } = useAuth();

  const [calibrationVisible, setCalibrationVisible] = useState(false);
  const [measurementVisible, setMeasurementVisible] = useState(false);
  const [widgetVisible, setWidgetVisible] = useState(false);
  const [activeWidget, setActiveWidget] = useState<string | null>(null);

  const [device, setDevice] = useState<DeviceStatus | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [measurementCount, setMeasurementCount] = useState(0);
  const [recentLive, setRecentLive] = useState<{ device?: string; value?: number } | null>(null);
  const [activeMeasurement, setActiveMeasurement] = useState<{ id?: string; target?: number; progress?: number } | null>(null);
  const [sensorValue, setSensorValue] = useState<number | null>(null);
  const [showCameraPreview, setShowCameraPreview] = useState(false);

  useEffect(() => {
    console.log('Dashboard mounted, availableDevices:', availableDevices);
    console.log('Current device state:', device);
    loadDashboardData();
  }, [user]);

  useEffect(() => {
    // Single flattened subscription that handles 'measurement:changed' and
    // 'measurement:stream' in one effect. Use a ref to track last seen values
    // across events so we only increment the counter on distinct value changes.
    const lastValueRef = { current: {} as Record<string, number> } as { current: Record<string, number> };

    const onChanged = () => { loadDashboardData().catch(() => {}); };
    const onStream = (payload: any) => {
      if (!payload) return;
      const did = payload?.device?.id || 'unknown';
      const val = Number(payload?.value ?? NaN);
      if (Number.isNaN(val)) return;
      const prev = lastValueRef.current[did];
      if (prev === undefined || prev !== val) {
        lastValueRef.current[did] = val;
        setMeasurementCount((c) => c + 1);
        loadDashboardData().catch(() => {});
      }
      setRecentLive({ device: payload?.device?.device_name ?? 'Device', value: val });

      // Update activeMeasurement progress when the payload belongs to it
      if (activeMeasurement && activeMeasurement.id) {
        const matchId = String(payload?.id ?? payload?.device?.id ?? '');
        if (String(activeMeasurement.id) === matchId) {
          setActiveMeasurement((am) => {
            if (!am) return am;
            const nextProgress = (am.progress || 0) + (prev === undefined || prev !== val ? 1 : 0);
            // If we've reached the target, emit completed and clear
            if (nextProgress >= (am.target || 0)) {
              try {
                DeviceEventEmitter.emit('measurement:completed', { id: am.id, device });
                DeviceEventEmitter.emit('measurement:changed', { id: am.id, status: 'completed' });
                Alert.alert('Measurement complete', 'Target reached.');
              } catch (e) {}
              return null;
            }
            return { ...am, progress: nextProgress };
          });
        }
      }
    };

    const subChanged = DeviceEventEmitter.addListener('measurement:changed', onChanged);
    const subStream = DeviceEventEmitter.addListener('measurement:stream', onStream);

    return () => { subChanged.remove(); subStream.remove(); };
  }, []);

  useEffect(() => {
    const s2 = DeviceEventEmitter.addListener('measurement:stream', (payload: any) => {
      if (!payload) return;
      setRecentLive({ device: payload?.device?.device_name ?? 'Device', value: Number(payload?.value ?? 0) });
    });
    return () => { s2.remove(); };
  }, []);

  // Subscribe to light sensor when light sensor device is selected
  useEffect(() => {
    if (!device || !device.id?.startsWith('light')) {
      setSensorValue(null);
      return;
    }

    if (Platform.OS === 'web') {
      setSensorValue(750);
      return;
    }

    try {
      const subscription = LightSensor.addListener((data: any) => {
        const lux = Math.round(data.illuminance || 0);
        setSensorValue(lux);
      });

      return () => {
        subscription.remove();
      };
    } catch (err) {
      console.warn('Light sensor not available:', err);
      // Simulate sensor data
      const interval = setInterval(() => {
        setSensorValue(Math.floor(400 + Math.random() * 600));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [device]);

  const loadDashboardData = async () => {
    if (!user || FRONTEND_ONLY) return;

    const { data: devices } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'online')
      .maybeSingle();

    if (devices) {
      setDevice(devices);
    }

    const { data: measurements, count } = await supabase
      .from('measurements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    setMeasurementCount(count || 0);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getDeviceIcon = (deviceId: string) => {
    if (deviceId.startsWith('proximity')) return <Radio size={20} color={colors.primary} />;
    if (deviceId.startsWith('light')) return <Sun size={20} color={colors.primary} />;
    if (deviceId.startsWith('camera')) return <CameraIcon size={20} color={colors.primary} />;
    return <Wifi size={20} color={colors.primary} />;
  };

  const quickActions = [
    {
      title: 'Calibrate',
      subtitle: 'Calibrate spectrometer',
      icon: Gauge,
      onPress: () => setCalibrationVisible(true),
    },
    {
      title: 'Measure',
      subtitle: 'Start new measurement',
      icon: Microscope,
      onPress: () => setMeasurementVisible(true),
    },
    {
      title: 'Recorded Data',
      subtitle: 'View past measurements',
      icon: Database,
      onPress: () => { setActiveWidget('Recorded Data'); setWidgetVisible(true); },
    },
    {
      title: 'Real-Time',
      subtitle: 'Live spectral view',
      icon: Activity,
      onPress: () => {
        // If the currently selected device is a proximity sensor, open the proximity real-time widget
        if (device && device.id?.startsWith('proximity')) {
          setActiveWidget('Real-Time Proximity');
        } else if (device && device.id?.startsWith('light')) {
          setActiveWidget('Real-Time Ambient Light');
        } else {
          setActiveWidget('Real-Time Spectral');
        }
        setWidgetVisible(true);
      },
    },
  ];

  const availableDevices = [
    { id: 'proximity:local', device_name: 'Phone proximity sensor', status: 'online', battery_level: 100, signal_strength: 100, last_connected: new Date().toISOString() },
    { id: 'light:local', device_name: 'Phone ambient light sensor', status: 'online', battery_level: 100, signal_strength: 100, last_connected: new Date().toISOString() },
    { id: 'camera:local', device_name: 'Phone camera', status: 'online', battery_level: 100, signal_strength: 100, last_connected: new Date().toISOString() },
    // you can append real remote devices from supabase/devices table here
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{profile?.full_name || 'User'}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/settings')}
            style={[styles.settingsButton, { backgroundColor: colors.primary }]}
          >
            <SettingsIcon size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {device ? (
          <GradientCard gradient gradientColors={[colors.primaryGradientStart, colors.primaryGradientEnd]} style={styles.deviceCard}>
            <View style={styles.deviceHeader}>
              <View style={styles.deviceIconContainer}>
                {device.id?.startsWith('light') ? (
                  <Sun size={28} color="#FFFFFF" />
                ) : device.id?.startsWith('proximity') ? (
                  <Radio size={28} color="#FFFFFF" />
                ) : (
                  <Wifi size={28} color="#FFFFFF" />
                )}
              </View>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.device_name}</Text>
                <Text style={styles.deviceStatus}>Connected</Text>
              </View>
              {/* removed duplicate header disconnect button; use the action in the stats area */}
            </View>

            {/* Show sensor value for light sensor */}
            {device.id?.startsWith('light') && sensorValue !== null && (
              <View style={{ marginBottom: 16, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Current Value: {sensorValue} lux</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 }}>
                  {sensorValue < 100 ? 'Dark' : sensorValue < 500 ? 'Dim' : sensorValue < 2000 ? 'Normal' : 'Bright'}
                </Text>
              </View>
            )}

            <View style={styles.deviceStats}>
              <View style={styles.statItem}>
                <CircularProgress
                  progress={device.battery_level}
                  size={70}
                  strokeWidth={6}
                  showPercentage={true}
                />
                <Text style={styles.statLabel}>Battery</Text>
              </View>

              <View style={styles.statItem}>
                <CircularProgress
                  progress={device.signal_strength}
                  size={70}
                  strokeWidth={6}
                  showPercentage={true}
                />
                <Text style={styles.statLabel}>Signal</Text>
              </View>

              <View style={styles.statItem}>
                <View style={styles.countCircle}>
                  <Text style={styles.countNumber}>{measurementCount}</Text>
                </View>
                <Text style={styles.statLabel}>Measurements</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => {
                Alert.alert('Disconnect device', 'Disconnect and show available devices?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Disconnect', style: 'destructive', onPress: () => { DeviceEventEmitter.emit('device:disconnected', { id: device?.id }); setDevice(null); setActiveWidget(null); setWidgetVisible(false); setPickerVisible(true); } }
                ]);
              }} style={styles.disconnectButton}>
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          </GradientCard>
        ) : (
          <GradientCard style={styles.noDeviceCard}>
            <Wifi size={40} color={colors.primary} />
            <Text style={[styles.noDeviceText, { color: colors.text }]}>No Device Connected</Text>
            <Text style={[styles.noDeviceSubtext, { color: colors.textSecondary }]}>Select a device from the list below</Text>

            <View style={styles.deviceListContainer}>
              {availableDevices && availableDevices.length > 0 ? (
                availableDevices.map((d) => {
                  return (
                    <TouchableOpacity key={d.id} onPress={async () => {
                      // If camera device, open camera preview directly
                      if (d.id.startsWith('camera')) {
                        console.log('========== Camera device tapped from dashboard ==========');
                        try {
                          const hasPermission = await requestCameraPermissions();
                          console.log('Camera permission granted:', hasPermission);
                          if (hasPermission) {
                            console.log('Opening camera preview...');
                            setDevice(d);
                            setShowCameraPreview(true);
                            console.log('========== Camera preview opened ==========');
                          } else {
                            Alert.alert('Permission Denied', 'Camera permission is required to use this feature.');
                          }
                        } catch (error) {
                          console.error('Error opening camera:', error);
                          Alert.alert('Error', 'Failed to open camera');
                        }
                      } else {
                        // For other devices, show picker modal
                        setPickerVisible(true);
                      }
                    }}>
                      <View style={styles.deviceListItem}>
                        <View style={styles.deviceListItemLeft}>
                          {getDeviceIcon(d.id)}
                          <Text style={[styles.deviceListItemName, { color: colors.text }]}>{d.device_name}</Text>
                        </View>
                        <Text style={[styles.deviceListItemStatus, { color: colors.textSecondary }]}>{d.status}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={{ color: colors.textSecondary, marginTop: 12 }}>No devices available</Text>
              )}
            </View>
          </GradientCard>
        )}
        <DevicePickerModal visible={pickerVisible} onClose={() => setPickerVisible(false)} onSelect={(d) => {
          // If user selected null (No device), clear current device and active widget
          if (d === null) {
            DeviceEventEmitter.emit('device:disconnected', { id: device?.id });
            setDevice(null);
            setActiveWidget(null);
            setWidgetVisible(false);
            return;
          }

          // On selection, immediately set the device and open the camera widget for camera devices.
          const ds: DeviceStatus = { id: d.id, device_name: d.device_name, status: 'online', battery_level: 100, signal_strength: 100, last_connected: new Date().toISOString() };
          setDevice(ds);
          if (d.id && d.id.startsWith('camera')) {
            setActiveWidget('Real-Time Camera');
            setWidgetVisible(true);
          }
        }} />
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Actions
          </Text>

          {quickActions.map((action, index) => (
            <IconCard
              key={index}
              title={action.title}
              subtitle={action.subtitle}
              icon={action.icon}
              onPress={action.onPress}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Calibration
          </Text>
          <CalibrationWidget />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Recent Activity
          </Text>
          <GradientCard>
            {recentLive ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.emptyText, { color: colors.text }]}>Latest from</Text>
                <Text style={[styles.userName, { color: colors.text, fontSize: 16 }]}>{recentLive.device}</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary, marginTop: 6 }]}>{String(recentLive.value)}</Text>
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent activity</Text>
            )}
          </GradientCard>
        </View>
      </ScrollView>

      <CalibrationModal visible={calibrationVisible} onClose={() => setCalibrationVisible(false)} />
      <MeasurementModal visible={measurementVisible} onClose={() => setMeasurementVisible(false)} device={device} onComplete={(id, target) => {
        // Track the active measurement and its target so the dashboard can
        // increment progress as stream events arrive and stop when target
        // is reached.
        setActiveMeasurement({ id, target: target || 0, progress: 0 });

        // Open the Recorded Data widget so the user can watch live values
        setActiveWidget('Recorded Data');
        setWidgetVisible(true);
      }} />
      <WidgetModal visible={widgetVisible} widget={activeWidget} onClose={() => { setWidgetVisible(false); setActiveWidget(null); }} deviceConnected={!!device} device={device} />
      
      {/* Camera Preview Modal */}
      <Modal
        visible={showCameraPreview}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowCameraPreview(false)}
      >
        <CameraPreview
          onImageCaptured={(image: StoredImage) => {
            console.log('Image captured:', image);
            setShowCameraPreview(false);
            Alert.alert('Success', 'Image saved to gallery!');
          }}
          onClose={() => setShowCameraPreview(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    paddingBottom: 150,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  deviceCard: {
    marginBottom: 24,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  deviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  deviceStatus: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  deviceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  actionRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  disconnectButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E85D6F',
    backgroundColor: 'rgba(232, 93, 111, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectButtonText: {
    color: '#FF5A6E',
    fontSize: 13,
    fontWeight: '700',
  },
  statLabel: {
    marginTop: 8,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  countCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noDeviceCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
  },
  deviceListContainer: {
    width: '100%',
    marginTop: 16,
  },
  deviceListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  deviceListItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  deviceListItemName: {
    marginLeft: 12,
    fontSize: 13,
    flex: 1,
  },
  deviceListItemStatus: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  noDeviceText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  noDeviceSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  chevron: {
    marginTop: 12,
  },
  section: {
    marginBottom: 12,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
  },
});
