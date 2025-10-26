import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { Camera as CameraIcon, X, RotateCcw, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { saveCapturedImage, StoredImage } from '@/lib/cameraService';
import { GradientButton } from './GradientButton';

interface CameraPreviewProps {
  onImageCaptured?: (image: StoredImage) => void;
  onClose?: () => void;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({ onImageCaptured, onClose }) => {
  const { colors } = useTheme();
  const cameraRef = useRef<any>(null);
  const [isTakingPicture, setIsTakingPicture] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('back');

  const handleTakePicture = async () => {
    if (!cameraRef.current || isTakingPicture) return;

    try {
      setIsTakingPicture(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      setCapturedImage(photo.uri);
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    } finally {
      setIsTakingPicture(false);
    }
  };

  const handleDiscardImage = () => {
    setCapturedImage(null);
  };

  const handleConfirmImage = async () => {
    if (!capturedImage) return;

    try {
      setIsProcessing(true);
      const storedImage = await saveCapturedImage(capturedImage);

      if (storedImage) {
        Alert.alert('Success', 'Image saved successfully!');
        onImageCaptured?.(storedImage);
        setCapturedImage(null);
        onClose?.();
      } else {
        Alert.alert('Error', 'Failed to save image');
      }
    } catch (error) {
      console.error('Error confirming image:', error);
      Alert.alert('Error', 'Failed to save image');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(facing === 'back' ? 'front' : 'back');
  };

  if (capturedImage) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.previewImage} />
        </View>

        <View style={[styles.controlsContainer, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.previewLabel, { color: colors.text }]}>
            Review your image
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.error + '20' }]}
              onPress={handleDiscardImage}
              disabled={isProcessing}
            >
              <X size={24} color={colors.error} />
              <Text style={[styles.buttonText, { color: colors.error }]}>Discard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.success + '20' }]}
              onPress={handleConfirmImage}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={colors.success} />
              ) : (
                <>
                  <Check size={24} color={colors.success} />
                  <Text style={[styles.buttonText, { color: colors.success }]}>
                    Save
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CameraView style={styles.camera} ref={cameraRef} facing={facing}>
        {/* Close button */}
        <View style={styles.headerControls}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.cardBackground + '90' }]}
            onPress={onClose}
          >
            <X size={28} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.cardBackground + '90' }]}
            onPress={toggleCameraFacing}
          >
            <RotateCcw size={28} color={colors.text} />
          </TouchableOpacity>
        </View>
      </CameraView>

      {/* Camera controls */}
      <View style={[styles.controlsContainer, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity
          style={[
            styles.captureButton,
            { borderColor: colors.primary },
            isTakingPicture && { opacity: 0.5 },
          ]}
          onPress={handleTakePicture}
          disabled={isTakingPicture}
        >
          <View
            style={[
              styles.captureButtonInner,
              { backgroundColor: colors.primary },
            ]}
          >
            {isTakingPicture && (
              <ActivityIndicator color={colors.cardBackground} size="small" />
            )}
            {!isTakingPicture && <CameraIcon size={36} color={colors.cardBackground} />}
          </View>
        </TouchableOpacity>

        <Text style={[styles.captureHint, { color: colors.textSecondary }]}>
          Press the button to take a picture
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  camera: {
    flex: 1,
  },
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  captureButton: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureHint: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 12,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
