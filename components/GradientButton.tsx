import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function GradientButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
}: GradientButtonProps) {
  const { colors } = useTheme();

  const isDisabled = disabled || loading;

  const sizeStyles = {
    small: { height: 40, paddingHorizontal: 16 },
    medium: { height: 50, paddingHorizontal: 24 },
    large: { height: 60, paddingHorizontal: 32 },
  };

  const textSizes = {
    small: 14,
    medium: 16,
    large: 18,
  };

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        style={[
          styles.button,
          sizeStyles[size],
          {
            borderWidth: 2,
            borderColor: colors.primary,
            backgroundColor: 'transparent',
          },
          isDisabled && styles.disabled,
          style,
        ]}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text
            style={[
              styles.text,
              { fontSize: textSizes[size], color: colors.primary },
              textStyle,
            ]}
          >
            {title}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  const gradientColors = (variant === 'secondary'
    ? [colors.secondary, colors.success]
    : [colors.primaryGradientStart, colors.primaryGradientEnd]) as [string, string, ...string[]];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[isDisabled && styles.disabled]}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.button, sizeStyles[size], style]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={[styles.text, { fontSize: textSizes[size] }, textStyle]}>
            {title}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
