import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

interface AnimatedProgressProps {
  progress: number;
  height?: number;
  showPercentage?: boolean;
}

export function AnimatedProgress({ progress, height = 8 }: AnimatedProgressProps) {
  const { colors } = useTheme();
  const animated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animated, {
      toValue: Math.max(0, Math.min(100, progress)),
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress, animated]);

  const widthInterpolated = animated.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { height, backgroundColor: colors.surfaceVariant }]}>
      <Animated.View style={[styles.progress, { width: widthInterpolated }] as any}>
        <LinearGradient
          colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 100,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 100,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
});
