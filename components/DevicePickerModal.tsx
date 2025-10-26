import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (device: { id: string; device_name: string } | null) => void;
}

export function DevicePickerModal({ visible, onClose, onSelect }: Props) {
  const { colors } = useTheme();

  const devices = [
    { id: 'camera:local', device_name: 'Phone camera' },
    { id: 'proximity:local', device_name: 'Phone proximity sensor' },
    { id: 'light:local', device_name: 'Phone ambient light sensor' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.5)' }]}> 
        <View style={[styles.container, { backgroundColor: colors.surface }]}> 
          <Text style={[styles.title, { color: colors.text }]}>Select a device</Text>
          {devices.map((d) => (
            <TouchableOpacity key={d.id} style={styles.row} onPress={() => { onSelect(d); onClose(); }}>
              <Text style={{ color: colors.text }}>{d.device_name}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.row} onPress={() => { onSelect(null); onClose(); }}>
            <Text style={{ color: colors.text }}>No device / Deselect</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={{ color: colors.primary }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { width: '88%', borderRadius: 12, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  closeBtn: { marginTop: 12, alignSelf: 'flex-end' },
});
