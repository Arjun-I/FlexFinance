import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';


// Removed unused InvestmentsScreen - using PortfolioTracker instead
// Debug components removed for cleaner UI
import StockComparison from '../components/StockComparison';
import PortfolioTracker from '../components/PortfolioTracker';

export default function Dashboard({ navigation }) {
  const [selectedTab, setSelectedTab] = useState('overview');
  const user = auth.currentUser;
  const [profile, setProfile] = useState(null);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [error, setError] = useState(null);
  const [portfolioHoldings, setPortfolioHoldings] = useState([]);
  const [swipeLoading, setSwipeLoading] = useState(false);

  // Android-specific error handling
  useEffect(() => {
    if (Platform.OS === 'android') {
      console.log('📱 Android-specific optimizations enabled');
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Force navigation to login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if signOut fails, navigate to login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  const handleResetRiskProfile = async () => {
    try {
      if (!user) return;

      // Clear only quiz-related data, preserve investments
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { 
        riskProfile: {},
        quizCompleted: false,
        likedStocks: [], // Clear liked stocks for swiping
        lastUpdated: new Date()
        // Note: NOT clearing cashBalance or portfolio investments
      });

      // Clear preferences subcollection
      const quizRef = doc(db, 'users', user.uid, 'preferences', 'quiz');
      await setDoc(quizRef, { completed: false });

      // Clear rejected stocks (swipe history)
      const rejectedSnap = await getDocs(collection(db, 'users', user.uid, 'rejected'));
      for (const docSnapshot of rejectedSnap.docs) {
        await deleteDoc(docSnapshot.ref);
      }

      // Clear value history (but keep portfolio)
      const historySnap = await getDocs(collection(db, 'users', user.uid, 'valueHistory'));
      for (const docSnapshot of historySnap.docs) {
        await deleteDoc(docSnapshot.ref);
      }

      Alert.alert('Success', 'Risk profile reset. Your investments are preserved. You will retake the quiz.');
      
      // Force navigation to RiskQuiz
      navigation.reset({
        index: 0,
        routes: [{ name: 'RiskQuiz' }],
      });
    } catch (err) {
      console.error('Error resetting risk profile:', err);
      Alert.alert('Error', 'Failed to reset profile. Please try again.');
    }
  };

  const fetchOverviewData = async () => {
    if (!user) return;
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Overview fetch timeout')), 10000)
      );

      const fetchPromise = Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDocs(collection(db, 'users', user.uid, 'portfolio'))
      ]);

      const [userDoc, portfolioSnap] = await Promise.race([fetchPromise, timeoutPromise]);
      
      const data = userDoc.exists() ? userDoc.data() : {};
      const holdings = portfolioSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Calculate portfolio value based on current market prices, not average cost
      // This will be updated by PortfolioTracker with real-time prices
      const cash = data.cashBalance || 0;
      
      // Initial value using average prices, will be updated by PortfolioTracker
      const initialHoldingsValue = holdings.reduce((sum, holding) => {
        const { shares = 0, averagePrice = 0 } = holding;
        return sum + shares * averagePrice;
      }, 0);
      
      setPortfolioValue(initialHoldingsValue + cash);
      setProfile(data);
      setPortfolioHoldings(holdings);
    } catch (err) {
      console.error('Error fetching overview data:', err);
      // Set default values on error
      setPortfolioValue(0);
      setProfile({});
      setPortfolioHoldings([]);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    if (selectedTab === 'overview' || selectedTab === 'investments') {
      setLoadingOverview(true);
      fetchOverviewData();
    } else if (selectedTab === 'swipe') {
      setSwipeLoading(true);
      // Small delay to show loading state
      setTimeout(() => setSwipeLoading(false), 1000);
    }
  }, [selectedTab, user]);

  const renderOverview = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.overviewContainer}>
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome to FlexFinance!</Text>
          <Text style={styles.welcomeSubtitle}>
            Your personal finance companion
          </Text>
          <View style={styles.dataStatusContainer}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.dataStatusText}>Real-time data enabled</Text>
          </View>
        </View>

        {/* Portfolio Summary */}
        <View style={styles.overviewCard}>
          <Text style={styles.cardTitle}>Portfolio Summary</Text>
          <View style={styles.metricRow}>
            <Ionicons
              name="wallet"
              size={24}
              color="#6366f1"
              style={styles.metricIcon}
            />
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel}>Cash Balance</Text>
              <Text style={styles.metricValue}>
                ${profile?.cashBalance?.toFixed(2) || '0.00'}
              </Text>
            </View>
          </View>
          
          <View style={styles.metricRow}>
            <Ionicons
              name="trending-up"
              size={24}
              color="#10b981"
              style={styles.metricIcon}
            />
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel}>Total Portfolio Value</Text>
              <Text style={styles.metricValue}>
                ${portfolioValue.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <Ionicons
              name="calendar"
              size={24}
              color="#facc15"
              style={styles.metricIcon}
            />
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel}>Last Login</Text>
              <Text style={styles.metricValue}>
                {user?.metadata?.lastSignInTime
                  ? new Date(
                      user.metadata.lastSignInTime
                    ).toLocaleDateString()
                  : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Risk Profile Details */}
        {profile?.riskProfile && (
          <View style={styles.overviewCard}>
            <Text style={styles.cardTitle}>Your Risk Profile</Text>
            <View style={styles.riskDetailedGrid}>
              <View style={styles.riskItem}>
                <Text style={styles.riskLabel}>Volatility Tolerance</Text>
                <Text style={styles.riskValue}>{profile.riskProfile.volatility || 0}/20</Text>
                <Text style={styles.riskDescription}>
                  {profile.riskProfile.volatility <= 8 ? 'Conservative' : 
                   profile.riskProfile.volatility <= 12 ? 'Moderate' : 'Aggressive'}
                </Text>
              </View>
              
              <View style={styles.riskItem}>
                <Text style={styles.riskLabel}>Liquidity Preference</Text>
                <Text style={styles.riskValue}>{profile.riskProfile.liquidity || 0}/20</Text>
                <Text style={styles.riskDescription}>
                  {profile.riskProfile.liquidity <= 8 ? 'Low liquidity needs' : 
                   profile.riskProfile.liquidity <= 12 ? 'Moderate liquidity' : 'High liquidity needs'}
                </Text>
              </View>
              
              <View style={styles.riskItem}>
                <Text style={styles.riskLabel}>Time Horizon</Text>
                <Text style={styles.riskValue}>{profile.riskProfile.timeHorizon || 0}/20</Text>
                <Text style={styles.riskDescription}>
                  {profile.riskProfile.timeHorizon <= 8 ? 'Short-term (1-3 years)' : 
                   profile.riskProfile.timeHorizon <= 12 ? 'Medium-term (3-5 years)' : 'Long-term (5+ years)'}
                </Text>
              </View>
              
              <View style={styles.riskItem}>
                <Text style={styles.riskLabel}>Investment Knowledge</Text>
                <Text style={styles.riskValue}>{profile.riskProfile.knowledge || 0}/20</Text>
                <Text style={styles.riskDescription}>
                  {profile.riskProfile.knowledge <= 8 ? 'Beginner' : 
                   profile.riskProfile.knowledge <= 12 ? 'Intermediate' : 'Expert'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.overviewCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setSelectedTab('swipe')}
          >
            <Ionicons name="heart" size={20} color="#10b981" />
            <Text style={styles.actionButtonText}>Swipe Stocks</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setSelectedTab('investments')}
          >
            <Ionicons name="trending-up" size={20} color="#6366f1" />
            <Text style={styles.actionButtonText}>View Investments</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('SettingsScreen')}
          >
            <Ionicons name="settings" size={20} color="#facc15" />
            <Text style={styles.actionButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Reset Risk Profile Button */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetRiskProfile}
        >
          <Text style={styles.resetButtonText}>Reset Risk Profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderSwipe = () => (
    <View style={styles.tabContent}>
      {swipeLoading ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="refresh" size={40} color="#6366f1" />
          <Text style={styles.loadingText}>Loading stock recommendations...</Text>
        </View>
      ) : (
        <StockComparison navigation={navigation} />
      )}
    </View>
  );

  const handlePortfolioValueChange = (newValue) => {
    setPortfolioValue(newValue);
  };

  const renderInvestments = () => (
    <PortfolioTracker 
      portfolio={portfolioHoldings}
      cashBalance={profile?.cashBalance || 100000}
      onRefresh={fetchOverviewData}
      onPortfolioValueChange={handlePortfolioValueChange}
    />
  );

  const renderProfile = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Ionicons name="person" size={40} color="#6366f1" />
        </View>
        <Text style={styles.profileName}>{user?.displayName || 'User'}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
      </View>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('SettingsScreen')}
      >
        <Ionicons name="settings" size={24} color="#94a3b8" />
        <Text style={styles.menuText}>Settings</Text>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('SupportScreen')}
      >
        <Ionicons name="help-circle" size={24} color="#94a3b8" />
        <Text style={styles.menuText}>Help & Support</Text>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('TermsScreen')}
      >
        <Ionicons name="document-text" size={24} color="#94a3b8" />
        <Text style={styles.menuText}>Terms & Privacy</Text>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.menuItem, styles.signOutButton]}
        onPress={handleSignOut}
      >
        <Ionicons name="log-out" size={24} color="#ef4444" />
        <Text style={[styles.menuText, { color: '#ef4444' }]}>Sign Out</Text>
        <Ionicons name="chevron-forward" size={20} color="#ef4444" />
      </TouchableOpacity>
    </ScrollView>
  );

  // Debug components removed for cleaner UI

  // Debug components removed for cleaner UI

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#334155']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {selectedTab === 'investments'
            ? 'Investments'
            : selectedTab === 'swipe'
            ? 'Swipe Stocks'
            : selectedTab === 'profile'
            ? 'Your Profile'
            : 'FlexFinance'}
        </Text>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('NotificationsScreen')}
        >
          <Ionicons name="notifications" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'swipe' && renderSwipe()}
        {selectedTab === 'investments' && renderInvestments()}
        {selectedTab === 'profile' && renderProfile()}
        {/* Debug tabs removed for cleaner UI */}
      </View>

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
                  ? 'heart'
                  : tab === 'investments'
                  ? 'trending-up'
                  : 'person'
              }
              size={24}
              color={selectedTab === tab ? '#6366f1' : '#94a3b8'}
            />
            <Text
              style={[
                styles.tabLabel,
                selectedTab === tab && styles.activeTabLabel,
              ]}
            >
              {tab === 'overview'
                ? 'Overview'
                : tab === 'swipe'
                ? 'Swipe'
                : tab === 'investments'
                ? 'Investments'
                : 'Profile'}
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
  metricContent: {
    flex: 1,
  },
  metricLabel: { color: '#94a3b8', fontSize: 14 },
  metricValue: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  metricDescription: { color: '#94a3b8', fontSize: 14, marginTop: 8, width: '48%' },
  overviewContainer: {
    flex: 1,
  },
  riskGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  riskDetailedGrid: {
    marginTop: 15,
    gap: 15,
  },
  riskItem: {
    backgroundColor: '#334155',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  riskLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 4,
  },
  riskValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  riskDescription: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
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
  welcomeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  dataStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  dataStatusText: {
    fontSize: 14,
    color: '#10b981',
    marginLeft: 8,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#cbd5e1',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
});
