import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { GradientCard } from '@/components/GradientCard';
import { AnimatedProgress } from '@/components/AnimatedProgress';
import type { AIResult } from '@/types/ai';

export function AIResultCard({ result }: { result: AIResult | null }) {
  const t = useTheme();
  if (!result) return null;

  return (
    <View style={{ marginTop: 12 }}>
      <GradientCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: result.detectedColor, marginRight: 12, borderWidth: 1, borderColor: t.colors.border }} />
            <View>
              <Text style={{ color: t.colors.text, fontWeight: '600' }}>Detected color</Text>
              <Text style={{ color: t.colors.textSecondary }}>{result.detectedColor}</Text>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: t.colors.textSecondary, fontSize: 12 }}>{new Date(result.timestamp).toLocaleString()}</Text>
            <Text style={{ color: t.colors.text, fontWeight: '600' }}>{result.category}</Text>
          </View>
        </View>

        <View style={{ height: 12 }} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ color: t.colors.textSecondary, fontSize: 12 }}>Material state</Text>
            <Text style={{ color: t.colors.text, fontWeight: '700', marginTop: 4 }}>{result.materialState}</Text>
          </View>

          <View style={{ width: 120, alignItems: 'flex-end' }}>
            <Text style={{ color: t.colors.textSecondary, fontSize: 12 }}>Confidence</Text>
            <AnimatedProgress
              progress={result.confidence}
              height={10}
              showPercentage={false}
            />
            <Text style={{ color: t.colors.textSecondary, fontSize: 12, marginTop: 4 }}>{result.confidence}%</Text>
          </View>
        </View>

        <View style={{ height: 8 }} />
        <Text style={{ color: t.colors.textSecondary, fontSize: 12 }}>{result.notes}</Text>
      </GradientCard>
    </View>
  );
}
