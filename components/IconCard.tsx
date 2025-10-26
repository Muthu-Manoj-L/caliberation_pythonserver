import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { FRONTEND_ONLY } from '@/contexts/AuthContext';

interface IconCardProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  onPress?: () => void;
  value?: string | number;
  badge?: string;
}

export function IconCard({
  title,
  subtitle,
  icon: Icon,
  onPress,
  value,
  badge,
}: IconCardProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const content = (
    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
      <LinearGradient
        colors={[colors.primaryGradientStart + '20', colors.primaryGradientEnd + '20']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconContainer}
      >
        <Icon size={24} color={colors.primary} />
      </LinearGradient>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>

      {value && (
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      )}

      {badge && (
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  if (FRONTEND_ONLY) {
    return (
      <TouchableOpacity onPress={() => router.push(`/demo?widget=${encodeURIComponent(title)}`)} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
