import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Palette,
  Droplets,
  Star,
  AlertTriangle,
  Layers,
  CheckCircle,
  Circle,
  ArrowRight,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { GradientCard } from '@/components/GradientCard';
import { GradientButton } from '@/components/GradientButton';
import { supabase } from '@/lib/supabase';

interface Parameter {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
}

const PARAMETERS: Parameter[] = [
  {
    id: 'color',
    title: 'Color Analysis',
    description: 'Detect and analyze material color properties',
    icon: Palette,
    color: '#F59E0B',
  },
  {
    id: 'state',
    title: 'State Analysis',
    description: 'Determine physical state and phase',
    icon: Droplets,
    color: '#3B82F6',
  },
  {
    id: 'quality',
    title: 'Quality Assessment',
    description: 'Evaluate material quality and grade',
    icon: Star,
    color: '#10B981',
  },
  {
    id: 'contamination',
    title: 'Contamination Detection',
    description: 'Identify contaminants and impurities',
    icon: AlertTriangle,
    color: '#EF4444',
  },
  {
    id: 'composition',
    title: 'Material Composition',
    description: 'Analyze chemical composition breakdown',
    icon: Layers,
    color: '#8B5CF6',
  },
];

export default function ParameterSelectionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [selectedParameters, setSelectedParameters] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleParameter = (parameterId: string) => {
    setSelectedParameters((prev) =>
      prev.includes(parameterId)
        ? prev.filter((id) => id !== parameterId)
        : [...prev, parameterId]
    );
  };

  const startMeasurement = async () => {
    if (selectedParameters.length === 0) {
      Alert.alert('Error', 'Please select at least one parameter');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);

    try {
      const { data: devices } = await supabase
        .from('devices')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'online')
        .maybeSingle();

      if (!devices) {
        Alert.alert('Error', 'No connected device found');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('measurements')
        .insert({
          user_id: user.id,
          device_id: devices.id,
          measurement_type: 'Spectral Analysis',
          parameters: { selected: selectedParameters },
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Success',
        'Measurement started successfully',
        [
          {
            text: 'OK',
            onPress: () => router.push('/(tabs)/measurements'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start measurement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Select Parameters</Text>
        <Text style={styles.headerSubtitle}>
          Choose what to measure and analyze
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <GradientCard style={styles.info}>
            <Text style={[styles.infoText, { color: colors.text }]}>
              Select one or more parameters to analyze. The AI model will process
              the spectral data and provide detailed results.
            </Text>
          </GradientCard>
        </View>

        <View style={styles.parametersGrid}>
          {PARAMETERS.map((parameter) => {
            const isSelected = selectedParameters.includes(parameter.id);
            const Icon = parameter.icon;

            return (
              <TouchableOpacity
                key={parameter.id}
                onPress={() => toggleParameter(parameter.id)}
                activeOpacity={0.8}
                style={styles.parameterWrapper}
              >
                <GradientCard
                  gradient={isSelected}
                  gradientColors={
                    isSelected
                      ? [parameter.color + 'DD', parameter.color]
                      : undefined
                  }
                  style={StyleSheet.flatten([
                    styles.parameterCard,
                    isSelected && styles.parameterCardSelected,
                  ])}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor: isSelected
                          ? 'rgba(255, 255, 255, 0.2)'
                          : parameter.color + '20',
                      },
                    ]}
                  >
                    <Icon
                      size={28}
                      color={isSelected ? '#FFFFFF' : parameter.color}
                    />
                  </View>

                  <Text
                    style={[
                      styles.parameterTitle,
                      {
                        color: isSelected ? '#FFFFFF' : colors.text,
                      },
                    ]}
                  >
                    {parameter.title}
                  </Text>

                  <Text
                    style={[
                      styles.parameterDescription,
                      {
                        color: isSelected
                          ? 'rgba(255, 255, 255, 0.9)'
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {parameter.description}
                  </Text>

                  <View style={styles.checkContainer}>
                    {isSelected ? (
                      <CheckCircle size={24} color="#FFFFFF" />
                    ) : (
                      <Circle size={24} color={colors.border} />
                    )}
                  </View>
                </GradientCard>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.selectedSection}>
          <Text style={[styles.selectedTitle, { color: colors.text }]}>
            Selected: {selectedParameters.length} parameter
            {selectedParameters.length !== 1 ? 's' : ''}
          </Text>

          <GradientButton
            title="Start Measurement"
            onPress={startMeasurement}
            loading={loading}
            disabled={selectedParameters.length === 0}
            size="large"
          />
        </View>
      </ScrollView>
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
  infoCard: {
    marginBottom: 24,
  },
  info: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  parametersGrid: {
    gap: 16,
    marginBottom: 24,
  },
  parameterWrapper: {
    marginBottom: 4,
  },
  parameterCard: {
    position: 'relative' as const,
  },
  parameterCardSelected: {
    position: 'relative' as const,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  parameterTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  parameterDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  checkContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  selectedSection: {
    marginBottom: 24,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
});
