import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DeviceEventEmitter } from 'react-native';
import { Activity, Calendar, TrendingUp, Filter } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { GradientCard } from '@/components/GradientCard';
import { supabase } from '@/lib/supabase';

interface Measurement {
  id: string;
  measurement_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  parameters: any;
}

export default function MeasurementsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMeasurements();
  }, [user]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('measurement:changed', () => {
      loadMeasurements();
    });
    const s2 = DeviceEventEmitter.addListener('measurement:stream', () => {
      loadMeasurements();
    });
    return () => { sub.remove(); s2.remove(); };
  }, []);

  const loadMeasurements = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setMeasurements(data);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMeasurements();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'processing':
        return colors.warning;
      case 'failed':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Measurements</Text>
        <Text style={styles.headerSubtitle}>
          View and analyze your measurement history
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsRow}>
          <GradientCard style={styles.statCard} gradient gradientColors={[colors.primaryGradientStart, colors.primaryGradientEnd]}>
            <Activity size={24} color="#FFFFFF" />
            <Text style={styles.statValue}>{measurements.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </GradientCard>

          <GradientCard style={styles.statCard} gradient gradientColors={[colors.secondary, colors.success]}>
            <TrendingUp size={24} color="#FFFFFF" />
            <Text style={styles.statValue}>
              {measurements.filter((m) => m.status === 'completed').length}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </GradientCard>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Measurements
            </Text>
            <Filter size={20} color={colors.primary} />
          </View>

          {measurements.length === 0 ? (
            <GradientCard style={styles.emptyCard}>
              <Activity size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No measurements yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Start a new measurement from the dashboard
              </Text>
            </GradientCard>
          ) : (
            measurements.map((measurement) => (
              <GradientCard key={measurement.id} style={styles.measurementCard}>
                <View style={styles.measurementHeader}>
                  <View style={styles.measurementIcon}>
                    <Activity size={20} color={colors.primary} />
                  </View>
                  <View style={styles.measurementInfo}>
                    <Text style={[styles.measurementType, { color: colors.text }]}>
                      {measurement.measurement_type}
                    </Text>
                    <View style={styles.dateRow}>
                      <Calendar size={14} color={colors.textSecondary} />
                      <Text
                        style={[styles.measurementDate, { color: colors.textSecondary }]}
                      >
                        {formatDate(measurement.created_at)}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(measurement.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(measurement.status) },
                      ]}
                    >
                      {measurement.status}
                    </Text>
                  </View>
                </View>
              </GradientCard>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
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
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 24,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  section: {
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
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  measurementCard: {
    marginBottom: 12,
  },
  measurementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  measurementIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  measurementInfo: {
    flex: 1,
  },
  measurementType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  measurementDate: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
