import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useAuth } from './AuthContext';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeColors {
  background: string;
  surface: string;
  surfaceVariant: string;
  primary: string;
  primaryGradientStart: string;
  primaryGradientEnd: string;
  progressGradientStart?: string;
  progressGradientEnd?: string;
  secondary: string;
  accent: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  cardBackground: string;
}

interface ThemeContextType {
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
}

const lightColors: ThemeColors = {
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F2F5',
  primary: '#2563EB',
  primaryGradientStart: '#1E40AF',
  primaryGradientEnd: '#1F2937',
  progressGradientStart: '#60A5FA',
  progressGradientEnd: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  cardBackground: 'rgba(255, 255, 255, 0.9)',
};

const darkColors: ThemeColors = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceVariant: '#334155',
  primary: '#3B82F6',
  primaryGradientStart: '#3730A3',
  primaryGradientEnd: '#4C1D95',
  progressGradientStart: '#A78BFA',
  progressGradientEnd: '#60A5FA',
  secondary: '#10B981',
  accent: '#F59E0B',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  border: '#334155',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  cardBackground: 'rgba(30, 41, 59, 0.9)',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const { profile } = useAuth();
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    if (profile?.theme_preference) {
      setThemeMode(profile.theme_preference as ThemeMode);
    }
  }, [profile]);

  const theme = themeMode === 'auto'
    ? (systemColorScheme === 'dark' ? 'dark' : 'light')
    : themeMode;

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, themeMode, colors, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
