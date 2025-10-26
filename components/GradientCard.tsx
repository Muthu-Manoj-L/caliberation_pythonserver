import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { FRONTEND_ONLY } from '@/contexts/AuthContext';

interface GradientCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  gradient?: boolean;
  gradientColors?: string[];
  blur?: boolean;
}

export function GradientCard({
  children,
  onPress,
  style,
  gradient = false,
  gradientColors,
  blur = false,
}: GradientCardProps) {
  const { colors, theme } = useTheme();
  const router = useRouter();

  const defaultGradientColors = (gradientColors || [
    colors.primaryGradientStart,
    colors.primaryGradientEnd,
  ]) as [string, string, ...string[]];

  const content = (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {gradient ? (
          <LinearGradient
            colors={defaultGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.container, style]}
          >
            {blur ? (
              <BlurView intensity={20} tint={theme} style={styles.blur}>
                {children}
              </BlurView>
            ) : (
              children
            )}
          </LinearGradient>
        ) : (
          content
        )}
      </TouchableOpacity>
    );
  }

  if (gradient) {
    return (
      <LinearGradient
        colors={defaultGradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, style]}
      >
        {blur ? (
          <BlurView intensity={20} tint={theme} style={styles.blur}>
            {children}
          </BlurView>
        ) : (
          children
        )}
      </LinearGradient>
    );
  }

  if (!onPress && FRONTEND_ONLY) {
    // navigate to demo view using a generic widget name when card is tapped
    return (
      <TouchableOpacity onPress={() => router.push(`/demo?widget=${encodeURIComponent('card')}`)} activeOpacity={0.8}>
        {gradient ? (
          <LinearGradient colors={defaultGradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.container, style]}>
            {blur ? (
              <BlurView intensity={20} tint={theme} style={styles.blur}>
                {children}
              </BlurView>
            ) : (
              children
            )}
          </LinearGradient>
        ) : (
          content
        )}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  blur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
});
