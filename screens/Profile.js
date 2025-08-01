import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const Profile = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  const userData = {
    name: "Alex Johnson",
    email: "alex.johnson@email.com",
    memberSince: "January 2023",
    riskProfile: "Moderate Investor",
    totalInvested: 125430.50,
    goalAmount: 500000,
    goalDeadline: "2035",
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const goalProgress = (userData.totalInvested / userData.goalAmount) * 100;

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: () => console.log("Signed out") }
      ]
    );
  };

  const SettingItem = ({ title, subtitle, rightComponent, onPress }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingContent}>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        {rightComponent}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <LinearGradient
          colors={['#1B365D', '#2E5984']}
          style={styles.header}
        >
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {userData.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </LinearGradient>
            </View>
            <Text style={styles.userName}>{userData.name}</Text>
            <Text style={styles.userEmail}>{userData.email}</Text>
            <Text style={styles.memberSince}>Member since {userData.memberSince}</Text>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Financial Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financial Overview</Text>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="trophy" size={24} color="#FFD700" />
                <Text style={styles.summaryTitle}>Investment Goal Progress</Text>
              </View>
              
              <View style={styles.goalProgress}>
                <View style={styles.goalAmounts}>
                  <Text style={styles.currentAmount}>{formatCurrency(userData.totalInvested)}</Text>
                  <Text style={styles.goalAmount}>Goal: {formatCurrency(userData.goalAmount)}</Text>
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${goalProgress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{goalProgress.toFixed(1)}% Complete</Text>
                </View>
                
                <Text style={styles.goalDeadline}>Target Year: {userData.goalDeadline}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="shield-checkmark" size={24} color="#2E8B57" />
                <Text style={styles.statLabel}>Risk Profile</Text>
                <Text style={styles.statValue}>{userData.riskProfile}</Text>
              </View>
              
              <View style={styles.statCard}>
                <Ionicons name="calendar" size={24} color="#1B365D" />
                <Text style={styles.statLabel}>Years to Goal</Text>
                <Text style={styles.statValue}>{parseInt(userData.goalDeadline) - new Date().getFullYear()}</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.actionItem}>
                <LinearGradient
                  colors={['#2E8B57', '#3CB371']}
                  style={styles.actionIcon}
                >
                  <Ionicons name="document-text" size={24} color="white" />
                </LinearGradient>
                <Text style={styles.actionText}>Statements</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionItem}>
                <LinearGradient
                  colors={['#1B365D', '#2E5984']}
                  style={styles.actionIcon}
                >
                  <Ionicons name="calculator" size={24} color="white" />
                </LinearGradient>
                <Text style={styles.actionText}>Tax Center</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionItem}>
                <LinearGradient
                  colors={['#FF6B35', '#FF8E53']}
                  style={styles.actionIcon}
                >
                  <Ionicons name="bar-chart" size={24} color="white" />
                </LinearGradient>
                <Text style={styles.actionText}>Reports</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionItem}>
                <LinearGradient
                  colors={['#4ECDC4', '#44A08D']}
                  style={styles.actionIcon}
                >
                  <Ionicons name="settings" size={24} color="white" />
                </LinearGradient>
                <Text style={styles.actionText}>Preferences</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>
            
            <View style={styles.settingsCard}>
              <SettingItem
                title="Notifications"
                subtitle="Push notifications for market updates"
                rightComponent={
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: '#D1D5DB', true: '#2E8B57' }}
                    thumbColor={notificationsEnabled ? '#FFFFFF' : '#FFFFFF'}
                  />
                }
              />

              <SettingItem
                title="Biometric Authentication"
                subtitle="Use Face ID or fingerprint to sign in"
                rightComponent={
                  <Switch
                    value={biometricEnabled}
                    onValueChange={setBiometricEnabled}
                    trackColor={{ false: '#D1D5DB', true: '#2E8B57' }}
                    thumbColor={biometricEnabled ? '#FFFFFF' : '#FFFFFF'}
                  />
                }
              />

              <SettingItem
                title="Dark Mode"
                subtitle="Use dark theme throughout the app"
                rightComponent={
                  <Switch
                    value={darkModeEnabled}
                    onValueChange={setDarkModeEnabled}
                    trackColor={{ false: '#D1D5DB', true: '#2E8B57' }}
                    thumbColor={darkModeEnabled ? '#FFFFFF' : '#FFFFFF'}
                  />
                }
              />

              <SettingItem
                title="Change Password"
                subtitle="Update your account password"
                rightComponent={<Ionicons name="chevron-forward" size={20} color="#999" />}
                onPress={() => Alert.alert("Feature", "Password change feature coming soon!")}
              />

              <SettingItem
                title="Two-Factor Authentication"
                subtitle="Add an extra layer of security"
                rightComponent={<Ionicons name="chevron-forward" size={20} color="#999" />}
                onPress={() => Alert.alert("Feature", "2FA setup feature coming soon!")}
              />
            </View>
          </View>

          {/* Account Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <View style={styles.settingsCard}>
              <SettingItem
                title="Personal Information"
                subtitle="Update your profile details"
                rightComponent={<Ionicons name="chevron-forward" size={20} color="#999" />}
                onPress={() => Alert.alert("Feature", "Profile editing feature coming soon!")}
              />

              <SettingItem
                title="Bank Accounts"
                subtitle="Manage linked bank accounts"
                rightComponent={<Ionicons name="chevron-forward" size={20} color="#999" />}
                onPress={() => Alert.alert("Feature", "Bank account management coming soon!")}
              />

              <SettingItem
                title="Investment Goals"
                subtitle="Update your financial objectives"
                rightComponent={<Ionicons name="chevron-forward" size={20} color="#999" />}
                onPress={() => Alert.alert("Feature", "Goal setting feature coming soon!")}
              />

              <SettingItem
                title="Help & Support"
                subtitle="Get help or contact support"
                rightComponent={<Ionicons name="chevron-forward" size={20} color="#999" />}
                onPress={() => Alert.alert("Support", "Contact support at support@flexfinance.com")}
              />
            </View>
          </View>

          {/* Sign Out */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appInfoText}>FlexFinance v1.0.0</Text>
            <Text style={styles.appInfoText}>© 2024 FlexFinance. All rights reserved.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B365D',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#B8D4E3',
    marginBottom: 5,
  },
  memberSince: {
    fontSize: 14,
    color: '#B8D4E3',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 15,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginLeft: 10,
  },
  goalProgress: {
    alignItems: 'center',
  },
  goalAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  currentAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  goalAmount: {
    fontSize: 16,
    color: '#666',
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2E8B57',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  goalDeadline: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 15,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  signOutButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DC3545',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC3545',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 20,
  },
  appInfoText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
});

export default Profile;