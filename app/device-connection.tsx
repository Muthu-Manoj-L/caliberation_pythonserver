import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  DeviceEventEmitter,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Wifi, WifiOff, Signal, Battery, CheckCircle, XCircle, RefreshCw, Sun, Camera as CameraIcon } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from '@/lib/reanimated-shim';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { GradientButton } from '@/components/GradientButton';
import { GradientCard } from '@/components/GradientCard';
import { CameraPreview } from '@/components/CameraPreview';
import { supabase } from '@/lib/supabase';
import { LightSensor } from 'expo-sensors';
import { requestCameraPermissions, StoredImage } from '@/lib/cameraService';

interface Device {
  id: string;
  device_name: string;
  serial_number: string;
  wifi_ssid: string;
  battery_level: number;
  signal_strength: number;
  status: string;
}

export default function DeviceConnectionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [ambientLight, setAmbientLight] = useState<number>(750);
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);

  useEffect(() => {
    loadDevices();
    
    console.log('DeviceConnection mounted. Platform:', Platform.OS);
    
    // For Expo Go: Use simulated demo data
    // For production builds: Try to use real sensor
    if (Platform.OS !== 'web') {
      try {
        console.log('Attempting to subscribe to LightSensor...');
        const subscription = LightSensor.addListener((data: any) => {
          console.log('Light sensor data received:', data);
          setAmbientLight(Math.round(data.illuminance || 750));
        });

        console.log('LightSensor subscription successful');
        return () => {
          console.log('Removing LightSensor subscription');
          subscription.remove();
        };
      } catch (error) {
        console.warn('LightSensor not available (Expo Go limitation):', error);
        // Simulate sensor data for Expo Go testing
        console.log('Using simulated ambient light data');
        const interval = setInterval(() => {
          // Simulate changing light values between 400-1000 lux
          const demoValue = Math.floor(400 + Math.random() * 600);
          setAmbientLight(demoValue);
        }, 2000); // Update every 2 seconds
        
        return () => clearInterval(interval);
      }
    } else {
      // Web platform - use static demo value
      console.log('Web platform: using demo value 750 lux');
    }
  }, []);

  const loadDevices = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', user.id);

    if (data) {
      setDevices(data);
    }
  };

  const scanForDevices = async () => {
    setScanning(true);
    setTimeout(async () => {
      await loadDevices();
      setScanning(false);
    }, 2000);
  };

  const connectToDevice = async (device: Device) => {
    setConnecting(device.id);

    setTimeout(async () => {
      const { error } = await supabase
        .from('devices')
        .update({
          status: 'online',
          last_connected: new Date().toISOString(),
        })
        .eq('id', device.id);

      setConnecting(null);

      if (!error) {
        Alert.alert('Success', `Connected to ${device.device_name}`, [
          {
            text: 'OK',
            onPress: () => router.push('/(tabs)'),
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to connect to device');
      }
    }, 1500);
  };

  const getSignalIcon = (strength: number) => {
    if (strength > 70) return <Signal size={20} color={colors.success} />;
    if (strength > 40) return <Signal size={20} color={colors.warning} />;
    return <Signal size={20} color={colors.error} />;
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return colors.success;
    if (level > 20) return colors.warning;
    return colors.error;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Connect Device</Text>
        <Text style={styles.headerSubtitle}>
          Scan and connect to your ESP32 spectrometer
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.scanSection}>
          <GradientButton
            title={scanning ? 'Scanning...' : 'Scan for Devices'}
            onPress={scanForDevices}
            loading={scanning}
            size="large"
          />
        </View>

        {scanning && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.scanningIndicator}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.scanningText, { color: colors.textSecondary }]}>
              Looking for devices...
            </Text>
          </Animated.View>
        )}

        <View style={styles.devicesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Available Devices
            </Text>
            <TouchableOpacity onPress={loadDevices}>
              <RefreshCw size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {devices.length === 0 ? (
            <GradientCard style={styles.emptyCard}>
              <WifiOff size={48} color={colors.textSecondary} style={styles.emptyIcon} />
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No devices found
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Scan to discover ESP32 spectrometers
              </Text>
            </GradientCard>
          ) : (
            devices.map((device) => (
              <Animated.View key={device.id} entering={FadeIn}>
                <TouchableOpacity
                  onPress={() => connectToDevice(device)}
                  disabled={connecting !== null}
                  activeOpacity={0.8}
                >
                  <GradientCard style={styles.deviceCard}>
                    <View style={styles.deviceHeader}>
                      <LinearGradient
                        colors={[
                          colors.primaryGradientStart + '20',
                          colors.primaryGradientEnd + '20',
                        ]}
                        style={styles.deviceIcon}
                      >
                        <Wifi size={24} color={colors.primary} />
                      </LinearGradient>

                      <View style={styles.deviceInfo}>
                        <Text style={[styles.deviceName, { color: colors.text }]}>
                          {device.device_name}
                        </Text>
                        <Text style={[styles.deviceSerial, { color: colors.textSecondary }]}>
                          {device.wifi_ssid || device.serial_number}
                        </Text>
                      </View>

                      {device.status === 'online' ? (
                        <CheckCircle size={24} color={colors.success} />
                      ) : connecting === device.id ? (
                        <ActivityIndicator color={colors.primary} />
                      ) : (
                        <XCircle size={24} color={colors.textSecondary} />
                      )}
                    </View>

                    <View style={styles.deviceStats}>
                      <View style={styles.stat}>
                        {getSignalIcon(device.signal_strength)}
                        <Text style={[styles.statText, { color: colors.textSecondary }]}>
                          {device.signal_strength}%
                        </Text>
                      </View>

                      <View style={styles.stat}>
                        <Battery size={20} color={getBatteryColor(device.battery_level)} />
                        <Text style={[styles.statText, { color: colors.textSecondary }]}>
                          {device.battery_level}%
                        </Text>
                      </View>
                    </View>
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              device.status === 'online'
                                ? colors.success + '20'
                                : colors.textSecondary + '20',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color:
                                device.status === 'online'
                                  ? colors.success
                                  : colors.textSecondary,
                            },
                          ]}
                        >
                          {device.status}
                        </Text>
                      </View>
                    </View>
                  </GradientCard>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
        </View>

        {/* Ambient Light Sensor Display */}
        <View style={styles.sensorSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Phone Sensors
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setSelectedSensor('light_sensor');
              // Emit event for real-time widget to pick up sensor data
              DeviceEventEmitter.emit('device:selected', {
                id: 'light_sensor',
                device_name: 'Ambient Light Sensor',
                type: 'sensor'
              });
            }}
            activeOpacity={0.8}
          >
            <View
              style={selectedSensor === 'light_sensor' 
                ? { borderWidth: 2, borderColor: colors.primary, borderRadius: 16, marginBottom: 16 }
                : { marginBottom: 16 }
              }
            >
              <GradientCard 
                style={styles.deviceCard}
              >
              <View style={styles.deviceHeader}>
                <LinearGradient
                  colors={[
                    colors.primaryGradientStart + '20',
                    colors.primaryGradientEnd + '20',
                  ]}
                  style={styles.deviceIcon}
                >
                  <Sun size={24} color={colors.primary} />
                </LinearGradient>

                <View style={styles.deviceInfo}>
                  <Text style={[styles.deviceName, { color: colors.text }]}>
                    Ambient Light Sensor
                  </Text>
                  <Text style={[styles.deviceSerial, { color: colors.textSecondary }]}>
                    Real-time illuminance
                  </Text>
                </View>

                {selectedSensor === 'light_sensor' ? (
                  <CheckCircle size={24} color={colors.primary} />
                ) : (
                  <CheckCircle size={24} color={colors.success} />
                )}
              </View>

              <View style={styles.deviceStats}>
                <View style={styles.stat}>
                  <Sun size={20} color={colors.warning} />
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>
                    {ambientLight} lux
                  </Text>
                </View>

                <View style={styles.stat}>
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>
                    {ambientLight < 100 ? 'Dark' : ambientLight < 500 ? 'Dim' : ambientLight < 2000 ? 'Normal' : 'Bright'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: colors.success + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: colors.success,
                      },
                    ]}
                  >
                    online
                  </Text>
                </View>
              </View>

              {selectedSensor === 'light_sensor' && (
                <View style={styles.sensorActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.error + '20' }]}
                    onPress={() => {
                      setSelectedSensor(null);
                      DeviceEventEmitter.emit('device:deselected');
                    }}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.error }]}>
                      Disconnect
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </GradientCard>
            </View>
          </TouchableOpacity>

          {/* Camera Sensor */}
          <TouchableOpacity
            onPress={async () => {
              console.log('========== Camera sensor tapped ==========');
              try {
                const hasPermission = await requestCameraPermissions();
                console.log('Camera permission granted:', hasPermission);
                if (hasPermission) {
                  console.log('Setting camera state...');
                  setSelectedSensor('camera');
                  setCameraPermissionGranted(true);
                  console.log('Opening camera preview now...');
                  setShowCameraPreview(true); // Automatically open camera preview
                  console.log('showCameraPreview state set to true');
                  DeviceEventEmitter.emit('device:selected', {
                    id: 'camera',
                    device_name: 'Camera Sensor',
                    type: 'sensor'
                  });
                  console.log('========== Camera setup complete ==========');
                } else {
                  console.log('Permission denied by user');
                  Alert.alert('Permission Denied', 'Camera permission is required to use this feature.');
                }
              } catch (error) {
                console.error('Error opening camera:', error);
                Alert.alert('Error', 'Failed to open camera: ' + error);
              }
            }}
            activeOpacity={0.7}
            style={{ marginBottom: 16 }}
          >
            <View
              style={selectedSensor === 'camera' 
                ? { borderWidth: 2, borderColor: colors.primary, borderRadius: 16 }
                : {}
              }
            >
              <GradientCard style={styles.deviceCard}>
                <View style={styles.deviceHeader}>
                  <LinearGradient
                    colors={[
                      colors.primaryGradientStart + '20',
                      colors.primaryGradientEnd + '20',
                    ]}
                    style={styles.deviceIcon}
                  >
                    <CameraIcon size={24} color={colors.primary} />
                  </LinearGradient>

                  <View style={styles.deviceInfo}>
                    <Text style={[styles.deviceName, { color: colors.text }]}>
                      Camera Sensor
                    </Text>
                    <Text style={[styles.deviceSerial, { color: colors.textSecondary }]}>
                      Capture images for analysis
                    </Text>
                  </View>

                  {selectedSensor === 'camera' ? (
                    <CheckCircle size={24} color={colors.success} />
                  ) : (
                    <XCircle size={24} color={colors.textSecondary} />
                  )}
                </View>

                <View style={styles.deviceStats}>
                  <View style={styles.stat}>
                    <CameraIcon size={20} color={colors.primary} />
                    <Text style={[styles.statText, { color: colors.textSecondary }]}>
                      Ready to capture
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: selectedSensor === 'camera' ? colors.success + '20' : colors.textSecondary + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: selectedSensor === 'camera' ? colors.success : colors.textSecondary,
                        },
                      ]}
                    >
                      {selectedSensor === 'camera' ? 'online' : 'offline'}
                    </Text>
                  </View>
                </View>

                {selectedSensor === 'camera' && (
                  <View style={styles.sensorActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
                      onPress={() => setShowCameraPreview(true)}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                        Open Camera
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.error + '20', marginTop: 8 }]}
                      onPress={() => {
                        setSelectedSensor(null);
                        setCameraPermissionGranted(false);
                        DeviceEventEmitter.emit('device:deselected');
                      }}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.error }]}>
                        Disconnect
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </GradientCard>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 24,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  scanSection: {
    marginBottom: 24,
  },
  scanningIndicator: {
    alignItems: 'center',
    marginBottom: 32,
  },
  scanningText: {
    marginTop: 12,
    fontSize: 16,
  },
  devicesSection: {
    marginBottom: 24,
  },
  sensorSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  deviceCard: {
    marginBottom: 16,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceSerial: {
    fontSize: 13,
  },
  deviceStats: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statText: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sensorActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
