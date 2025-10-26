import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Database,
  Cloud,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { GradientCard } from '@/components/GradientCard';
import { GradientButton } from '@/components/GradientButton';
import { AnimatedProgress } from '@/components/AnimatedProgress';
import { IconCard } from '@/components/IconCard';
import { AIResultCard } from '@/components/AIResultCard';
import { ColorSpectrumWidget } from '@/components/ColorSpectrumWidget';
import type { AIResult } from '@/types/ai';
import { supabase } from '@/lib/supabase';

interface SyncOperation {
  id: string;
  sync_type: string;
  status: string;
  items_synced: number;
  total_items: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

interface AIModel {
  id: string;
  model_name: string;
  version: string;
  model_type: string;
  accuracy_metric: number;
  is_active: boolean;
}

export default function SyncScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [syncOperations, setSyncOperations] = useState<SyncOperation[]>([]);
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadSyncData();
  }, [user]);

  const loadSyncData = async () => {
    if (!user) return;

    const { data: syncData } = await supabase
      .from('sync_operations')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(10);

    if (syncData) {
      setSyncOperations(syncData);
    }

    const { data: models } = await supabase
      .from('ai_models')
      .select('*')
      .eq('is_active', true);

    if (models) {
      setAiModels(models);
    }
  };


  const sampleColors = ['#E57373', '#4DB6AC', '#FFD54F', '#90A4AE', '#9FA8DA'];
  const sampleStates = ['intact', 'corroded', 'oxidized', 'powdery', 'wet'];
  const sampleCategories = ['Metal', 'Polymer', 'Ceramic', 'Composite', 'Organic'];

  const [aiResult, setAiResult] = useState<AIResult | null>(null);

  useEffect(() => {
    // create an initial simulated result and update every 5s
    const makeResult = () => {
      const idx = Math.floor(Math.random() * sampleColors.length);
      const state = sampleStates[Math.floor(Math.random() * sampleStates.length)];
      const category = sampleCategories[Math.floor(Math.random() * sampleCategories.length)];
      const confidence = Math.floor(70 + Math.random() * 30); // realistic high confidence
      const now = new Date().toISOString();

      const r: AIResult = {
        id: now,
        detectedColor: sampleColors[idx],
        materialState: state,
        category,
        confidence,
        timestamp: now,
        notes: `Auto-detected with simulated model v${Math.floor(Math.random()*5)+1}`,
      };
      setAiResult(r);
    };

    makeResult();
    const iv = setInterval(makeResult, 5000);
    return () => clearInterval(iv);
  }, []);

  // AIResultCard moved to components/AIResultCard.tsx

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSyncData();
    setRefreshing(false);
  };

  const startSync = async (syncType: string) => {
    if (!user) return;

    setSyncing(true);

    const { data, error } = await supabase
      .from('sync_operations')
      .insert({
        user_id: user.id,
        sync_type: syncType,
        status: 'in_progress',
        total_items: 100,
      })
      .select()
      .single();

    setTimeout(async () => {
      if (data) {
        await supabase
          .from('sync_operations')
          .update({
            status: 'completed',
            items_synced: 100,
            completed_at: new Date().toISOString(),
          })
          .eq('id', data.id);

        await loadSyncData();
        setSyncing(false);
        Alert.alert('Success', `${syncType} sync completed successfully`);
      }
    }, 3000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} color={colors.success} />;
      case 'failed':
        return <XCircle size={20} color={colors.error} />;
      case 'in_progress':
        return <Clock size={20} color={colors.warning} />;
      default:
        return <Clock size={20} color={colors.textSecondary} />;
    }
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Data Sync</Text>
        <Text style={styles.headerSubtitle}>
          Sync data and update AI models
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Sync
          </Text>

          <View style={styles.syncButtons}>
            <GradientButton
              title="Sync Data"
              onPress={() => startSync('data')}
              loading={syncing}
              disabled={syncing}
              size="large"
              style={styles.syncButton}
            />
            <GradientButton
              title="Update Models"
              onPress={() => startSync('model')}
              loading={syncing}
              disabled={syncing}
              variant="secondary"
              size="large"
              style={styles.syncButton}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            AI Models
          </Text>

          {aiModels.map((model) => (
            <IconCard
              key={model.id}
              title={model.model_name}
              subtitle={`Version ${model.version} • ${model.model_type}`}
              icon={Cloud}
              value={`${model.accuracy_metric}%`}
            />
          ))}
          
          {/* AI Scan Results (simulated) */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 8 }]}>AI Scan Results</Text>
          <AIResultCard result={aiResult} />
        </View>

        {/* Color Spectrum Analysis Widget */}
        <View style={styles.section}>
          <ColorSpectrumWidget />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Sync History
          </Text>

          {syncOperations.length === 0 ? (
            <GradientCard style={styles.emptyCard}>
              <Database size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No sync history
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Start a sync operation to see history
              </Text>
            </GradientCard>
          ) : (
            syncOperations.map((operation) => (
              <GradientCard key={operation.id} style={styles.syncCard}>
                <View style={styles.syncHeader}>
                  <View style={styles.syncIcon}>
                    {operation.sync_type === 'data' ? (
                      <Upload size={20} color={colors.primary} />
                    ) : (
                      <Download size={20} color={colors.primary} />
                    )}
                  </View>
                  <View style={styles.syncInfo}>
                    <Text style={[styles.syncType, { color: colors.text }]}>
                      {operation.sync_type === 'data' ? 'Data Sync' : 'Model Update'}
                    </Text>
                    <Text style={[styles.syncDate, { color: colors.textSecondary }]}>
                      {formatDate(operation.started_at)}
                    </Text>
                  </View>
                  {getStatusIcon(operation.status)}
                </View>

                {operation.status === 'in_progress' && (
                  <View style={styles.progressContainer}>
                    <AnimatedProgress
                      progress={(operation.items_synced / operation.total_items) * 100}
                      height={6}
                    />
                    <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                      {operation.items_synced} / {operation.total_items} items
                    </Text>
                  </View>
                )}

                {operation.error_message && (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {operation.error_message}
                  </Text>
                )}
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  syncButtons: {
    gap: 12,
  },
  syncButton: {
    marginBottom: 8,
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
  syncCard: {
    marginBottom: 12,
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  syncInfo: {
    flex: 1,
  },
  syncType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  syncDate: {
    fontSize: 13,
  },
  progressContainer: {
    marginTop: 16,
  },
  progressText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  errorText: {
    fontSize: 13,
    marginTop: 12,
  },
});
