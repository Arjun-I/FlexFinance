// DASHBOARD.JS
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import SwipeStocks from './SwipeStocks';

const { width } = Dimensions.get('window');

export default function Dashboard() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const user = auth.currentUser;

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <Text style={styles.comingSoon}>Overview coming soon!</Text>
    </View>
  );

  const renderSwipe = () => (
    <View style={styles.tabContent}>
      <SwipeStocks />
    </View>
  );

  const renderInvestments = () => (
    <View style={styles.tabContent}>
      <Text style={styles.comingSoon}>Your investments will show up here.</Text>
    </View>
  );

  const renderProfile = () => (
    <View style={styles.tabContent}>
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Ionicons name="person" size={40} color="#6366f1" />
        </View>
        <Text style={styles.profileName}>{user?.displayName || 'User'}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
      </View>

      <TouchableOpacity style={styles.menuItem}>
        <Ionicons name="settings" size={24} color="#94a3b8" />
        <Text style={styles.menuText}>Settings</Text>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <Ionicons name="help-circle" size={24} color="#94a3b8" />
        <Text style={styles.menuText}>Help & Support</Text>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <Ionicons name="document-text" size={24} color="#94a3b8" />
        <Text style={styles.menuText}>Terms & Privacy</Text>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.menuItem, styles.signOutButton]} onPress={handleSignOut}>
        <Ionicons name="log-out" size={24} color="#ef4444" />
        <Text style={[styles.menuText, { color: '#ef4444' }]}>Sign Out</Text>
        <Ionicons name="chevron-forward" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#334155']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {selectedTab === 'investments' ? 'Paper Trading' : 'FlexFinance'}
        </Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'swipe' && renderSwipe()}
        {selectedTab === 'investments' && renderInvestments()}
        {selectedTab === 'profile' && renderProfile()}
      </ScrollView>

      <View style={styles.tabBar}>
        {['overview', 'swipe', 'investments', 'profile'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, selectedTab === tab && styles.activeTab]}
            onPress={() => setSelectedTab(tab)}
          >
            <Ionicons
              name={
                tab === 'overview'
                  ? 'home'
                  : tab === 'swipe'
                  ? 'swap-horizontal'
                  : tab === 'investments'
                  ? 'trending-up'
                  : 'person'
              }
              size={24}
              color={selectedTab === tab ? '#6366f1' : '#94a3b8'}
            />
            <Text
              style={[styles.tabLabel, selectedTab === tab && styles.activeTabLabel]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  tabContent: { paddingHorizontal: 24, paddingBottom: 100 },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  profileEmail: { color: '#94a3b8', fontSize: 14 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuText: { color: '#ffffff', fontSize: 16, marginLeft: 12, flex: 1 },
  signOutButton: { marginTop: 24 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabLabel: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  activeTabLabel: { color: '#6366f1', fontWeight: '600' },
  comingSoon: { color: '#94a3b8', fontSize: 18, textAlign: 'center', marginTop: 100 },
});
 