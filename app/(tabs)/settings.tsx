import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Moon,
  Sun,
  Smartphone,
  Bell,
  Shield,
  Info,
  LogOut,
  Fingerprint,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { GradientCard } from '@/components/GradientCard';
import { IconCard } from '@/components/IconCard';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, theme, themeMode, setThemeMode } = useTheme();
  const { user, profile, signOut, refreshProfile } = useAuth();

  const [biometricEnabled, setBiometricEnabled] = React.useState(
    profile?.biometric_enabled || false
  );

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeMode(newTheme);

    if (user) {
      await supabase
        .from('profiles')
        .update({ theme_preference: newTheme })
        .eq('id', user.id);
    }
  };

  const toggleBiometric = async (value: boolean) => {
    setBiometricEnabled(value);

    if (user) {
      await supabase
        .from('profiles')
        .update({ biometric_enabled: value })
        .eq('id', user.id);

      await refreshProfile();
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>
          Manage your account and preferences
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <GradientCard
          gradient
          gradientColors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
          style={styles.profileCard}
        >
          <View style={styles.profileIcon}>
            <User size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.profileName}>{profile?.full_name || 'User'}</Text>
          <Text style={styles.profileEmail}>{profile?.email}</Text>
          <Text style={styles.profileCompany}>{profile?.company_name}</Text>
        </GradientCard>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Appearance
          </Text>

          <GradientCard style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                {theme === 'dark' ? (
                  <Moon size={20} color={colors.primary} />
                ) : (
                  <Sun size={20} color={colors.primary} />
                )}
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Dark Mode
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                  {theme === 'dark' ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </GradientCard>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Security
          </Text>

          <GradientCard style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Fingerprint size={20} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Biometric Authentication
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                  Use fingerprint or face ID
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={toggleBiometric}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </GradientCard>

          <IconCard
            title="Privacy & Security"
            subtitle="Manage your data and privacy"
            icon={Shield}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Notifications
          </Text>

          <IconCard
            title="Push Notifications"
            subtitle="Manage notification settings"
            icon={Bell}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            About
          </Text>

          <IconCard
            title="Device Information"
            subtitle="View device details"
            icon={Smartphone}
          />

          <IconCard
            title="App Information"
            subtitle="Version 1.0.0"
            icon={Info}
          />
        </View>

        <View style={styles.section}>
          <IconCard
            title="Sign Out"
            subtitle="Log out of your account"
            icon={LogOut}
            onPress={handleSignOut}
          />
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
  profileCard: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  profileCompany: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  settingCard: {
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
  },
});
