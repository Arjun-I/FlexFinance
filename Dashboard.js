import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SwipeStocks from './SwipeStocks';
import InvestmentsScreen from './InvestmentsScreen';

export default function Dashboard({ navigation }) {
  const [selectedTab, setSelectedTab] = useState('overview');
  const user = auth.currentUser;
  const [profile, setProfile] = useState(null);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };



// Inside Dashboard.js
const handleResetRiskProfile = async () => {
  try {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { riskProfile: {} });

    await AsyncStorage.removeItem(`riskQuizCompleted_${user.uid}`);

    alert('Risk profile reset. You will retake the quiz on next login.');

    // Optional: Log the user out so they'll take the quiz again on next login
    await signOut(auth); // This will send them back to the Login screen
  } catch (err) {
    console.error('Error resetting risk profile:', err);
  }
};

  useEffect(() => {
    const fetchOverviewData = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const data = userDoc.exists() ? userDoc.data() : {};

        const portfolioSnap = await getDocs(collection(db, 'users', user.uid, 'portfolio'));
        const holdingsValue = portfolioSnap.docs.reduce((sum, d) => {
          const { shares = 0, buyPrice = 0 } = d.data();
          return sum + shares * buyPrice;
        }, 0);

        const cash = data.cashBalance || 0;
        setPortfolioValue(holdingsValue + cash);
        setProfile(data);
      } catch (err) {
        console.error('Error fetching overview data:', err);
      } finally {
        setLoadingOverview(false);
      }
    };

    if (selectedTab === 'overview') {
      setLoadingOverview(true);
      fetchOverviewData();
    }
  }, [selectedTab, user]);

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {loadingOverview ? (
        <Text style={styles.comingSoon}>Loading overview...</Text>
      ) : (
        <>
          <View style={styles.overviewCard}>
            <View style={styles.metricRow}>
              <Ionicons name="wallet" size={24} color="#10b981" style={styles.metricIcon} />
              <View>
                <Text style={styles.metricLabel}>Total Portfolio Value</Text>
                <Text style={styles.metricValue}>${portfolioValue.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.overviewCard}>
            <View style={styles.metricRow}>
              <Ionicons name="calendar" size={24} color="#facc15" style={styles.metricIcon} />
              <View>
                <Text style={styles.metricLabel}>Last Login</Text>
                <Text style={styles.metricValue}>
                  {user?.metadata?.lastSignInTime
                    ? new Date(user.metadata.lastSignInTime).toLocaleDateString()
                    : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {profile?.riskProfile && (
            <View style={styles.overviewCard}>
              <Text style={styles.metricLabel}>Your Risk Profile</Text>
              <View style={styles.riskGrid}>
                <Text style={styles.metricDescription}>📈 Volatility: {profile.riskProfile.volatility || 0}</Text>
                <Text style={styles.metricDescription}>💧 Liquidity: {profile.riskProfile.liquidity || 0}</Text>
                <Text style={styles.metricDescription}>⏳ Horizon: {profile.riskProfile.timeHorizon || 0}</Text>
                <Text style={styles.metricDescription}>📚 Knowledge: {profile.riskProfile.knowledge || 0}</Text>
                <Text style={styles.metricDescription}>🌱 Ethics: {profile.riskProfile.ethics || 0}</Text>
              </View>

              <TouchableOpacity onPress={handleResetRiskProfile} style={styles.resetButton}>
                <Text style={styles.resetButtonText}>Reset Risk Profile</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );

  const renderSwipe = () => (
    <View style={styles.tabContent}>
      <SwipeStocks />
    </View>
  );

  const renderInvestments = () => (
    <View style={styles.tabContent}>
      <InvestmentsScreen />
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

      <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('SettingsScreen')}>
        <Ionicons name="settings" size={24} color="#94a3b8" />
        <Text style={styles.menuText}>Settings</Text>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('SupportScreen')}>
        <Ionicons name="help-circle" size={24} color="#94a3b8" />
        <Text style={styles.menuText}>Help & Support</Text>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('TermsScreen')}>
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
    <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {selectedTab === 'investments'
            ? 'Investments'
            : selectedTab === 'swipe'
            ? 'Swipe Stocks'
            : 'FlexFinance'}
        </Text>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('NotificationsScreen')}
        >
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
    backgroundColor: 'rgba(15,23,42,0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
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
  tabContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 },
  overviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    marginRight: 12,
  },
  metricLabel: { color: '#94a3b8', fontSize: 14 },
  metricValue: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  metricDescription: { color: '#94a3b8', fontSize: 14, marginTop: 8, width: '48%' },
  riskGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  resetButton: {
    marginTop: 20,
    paddingVertical: 10,
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  resetButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  comingSoon: { color: '#94a3b8', fontSize: 18, textAlign: 'center', marginTop: 100 },
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
});
