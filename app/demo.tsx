import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import Svg, { Path, Rect } from 'react-native-svg';

export default function DemoScreen() {
  const { widget } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();

  const title = widget ? String(widget) : 'Demo';

  const isGraph = /graph|measure|real-time|chart/i.test(title);

  return (
    <LinearGradient colors={[colors.background, colors.surface]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>This is a demo placeholder</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Showing how the {title} widget will look and behave.</Text>

          {isGraph ? (
            <View style={styles.graphContainer}>
              <Svg width="100%" height={160} viewBox="0 0 300 160">
                <Rect x="0" y="0" width="300" height="160" fill={colors.surface} rx="12" />
                <Path d="M10 120 L50 90 L90 60 L130 80 L170 40 L210 70 L250 30 L290 50" stroke={colors.primary} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={[styles.graphNote, { color: colors.textSecondary }]}>Sample trend line — values are dummy data for preview only.</Text>
            </View>
          ) : (
            <View style={styles.detailList}>
              <Text style={[styles.detailItem, { color: colors.text }]}>• Example metric A: 42</Text>
              <Text style={[styles.detailItem, { color: colors.text }]}>• Example metric B: 3.7%</Text>
              <Text style={[styles.detailItem, { color: colors.text }]}>• Example note: This is placeholder content demonstrating the UI layout.</Text>
            </View>
          )}
        </View>

        <Text style={[styles.footer, { color: colors.textSecondary }]}>Tap back to return</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  card: { width: '100%', borderRadius: 12, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  cardSubtitle: { fontSize: 14, marginBottom: 12 },
  graphContainer: { width: '100%', alignItems: 'center' },
  graphNote: { fontSize: 12, marginTop: 8 },
  detailList: { marginTop: 8 },
  detailItem: { fontSize: 14, marginBottom: 6 },
  footer: { marginTop: 24, fontSize: 13 },
});
