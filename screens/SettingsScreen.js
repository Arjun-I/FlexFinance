// SettingsScreen.js - User Settings and Preferences
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function SettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [biometricAuth, setBiometricAuth] = useState(false);
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser(userData);
          setNotifications(userData.notifications ?? true);
          setDarkMode(userData.darkMode ?? true);
          setBiometricAuth(userData.biometricAuth ?? false);
          setAutoSync(userData.autoSync ?? true);
        }
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (setting, value) => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          [setting]: value,
          lastUpdated: new Date()
        });
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Error', 'Failed to update setting');
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
            try {
              await auth.signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Not Available', 'Account deletion feature is not yet implemented.');
          },
        },
      ]
    );
  };

  const renderSettingItem = ({ icon, title, subtitle, value, onPress, type = 'toggle' }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={24} color="#6366f1" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {type === 'toggle' ? (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: '#334155', true: '#6366f1' }}
          thumbColor={value ? '#ffffff' : '#94a3b8'}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.profileSection}>
          <View style={styles.profileInfo}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={32} color="#ffffff" />
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>
                {user?.email || 'User'}
              </Text>
              <Text style={styles.profileEmail}>
                {user?.email || 'user@example.com'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          {renderSettingItem({
            icon: 'notifications',
            title: 'Push Notifications',
            subtitle: 'Get alerts for stock updates and news',
            value: notifications,
            onPress: () => {
              setNotifications(!notifications);
              updateSetting('notifications', !notifications);
            }
          })}
          {renderSettingItem({
            icon: 'moon',
            title: 'Dark Mode',
            subtitle: 'Use dark theme throughout the app',
            value: darkMode,
            onPress: () => {
              setDarkMode(!darkMode);
              updateSetting('darkMode', !darkMode);
            }
          })}
          {renderSettingItem({
            icon: 'finger-print',
            title: 'Biometric Authentication',
            subtitle: 'Use fingerprint or face ID to sign in',
            value: biometricAuth,
            onPress: () => {
              setBiometricAuth(!biometricAuth);
              updateSetting('biometricAuth', !biometricAuth);
            }
          })}
          {renderSettingItem({
            icon: 'sync',
            title: 'Auto Sync',
            subtitle: 'Automatically sync data in background',
            value: autoSync,
            onPress: () => {
              setAutoSync(!autoSync);
              updateSetting('autoSync', !autoSync);
            }
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {renderSettingItem({
            icon: 'person-circle',
            title: 'Edit Profile',
            subtitle: 'Update your personal information',
            value: null,
            onPress: () => Alert.alert('Coming Soon', 'Profile editing will be available soon!')
          })}
          {renderSettingItem({
            icon: 'shield-checkmark',
            title: 'Privacy & Security',
            subtitle: 'Manage your privacy settings',
            value: null,
            onPress: () => Alert.alert('Coming Soon', 'Privacy settings will be available soon!')
          })}
          {renderSettingItem({
            icon: 'card',
            title: 'Payment Methods',
            subtitle: 'Manage your payment options',
            value: null,
            onPress: () => Alert.alert('Coming Soon', 'Payment methods will be available soon!')
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          {renderSettingItem({
            icon: 'help-circle',
            title: 'Help Center',
            subtitle: 'Get help and find answers',
            value: null,
            onPress: () => navigation.navigate('SupportScreen')
          })}
          {renderSettingItem({
            icon: 'chatbubble',
            title: 'Contact Support',
            subtitle: 'Get in touch with our team',
            value: null,
            onPress: () => Alert.alert('Contact', 'Email: support@flexfinance.com')
          })}
          {renderSettingItem({
            icon: 'document-text',
            title: 'Terms of Service',
            subtitle: 'Read our terms and conditions',
            value: null,
            onPress: () => navigation.navigate('TermsScreen')
          })}
          {renderSettingItem({
            icon: 'information-circle',
            title: 'About',
            subtitle: 'App version and information',
            value: null,
            onPress: () => Alert.alert('About FlexFinance', 'Version 1.0.0\n\nA modern investment app for beginners.')
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={handleSignOut}>
            <Ionicons name="log-out" size={20} color="#ef4444" />
            <Text style={styles.dangerButtonText}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dangerButton, styles.deleteButton]} onPress={handleDeleteAccount}>
            <Ionicons name="trash" size={20} color="#ef4444" />
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>FlexFinance v1.0.0</Text>
          <Text style={styles.footerSubtext}>Made with ❤️ for investors</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#e2e8f0',
    fontSize: 16,
    marginTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  placeholder: {
    width: 40,
  },
  profileSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#94a3b8',
  },
  section: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 12,
  },
  deleteButton: {
    backgroundColor: '#7f1d1d',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#64748b',
  },
}); 