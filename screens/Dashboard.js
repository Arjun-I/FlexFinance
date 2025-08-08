import React, { useEffect, useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
// Conditional import for victory charts (web compatibility)
let VictoryPie, VictoryLabel;
if (Platform.OS === 'web') {
  // For web, we'll create a simple fallback
  VictoryPie = null;
  VictoryLabel = null;
} else {
  try {
    const victory = require('victory-native');
    VictoryPie = victory.VictoryPie;
    VictoryLabel = victory.VictoryLabel;
  } catch (e) {
    console.warn('Victory native not available:', e);
    VictoryPie = null;
    VictoryLabel = null;
  }
}
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

export default function Dashboard({ navigation, route }) {
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
      const cash = parseFloat(data.cashBalance) || 0;
      
      // Initial value using average prices, will be updated by PortfolioTracker
      const initialHoldingsValue = holdings.reduce((sum, holding) => {
        const shares = parseFloat(holding.shares) || 0;
        const averagePrice = parseFloat(holding.averagePrice) || 0;
        const value = shares * averagePrice;
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
      
      const totalPortfolioValue = initialHoldingsValue + cash;
      setPortfolioValue(isNaN(totalPortfolioValue) ? 0 : totalPortfolioValue);
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

  // Handle navigation parameter for tab switching
  useEffect(() => {
    if (route?.params?.tab) {
      setSelectedTab(route.params.tab);
    }
  }, [route?.params?.tab]);

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

  // Auto-refresh portfolio when switching to investments tab
  useFocusEffect(
    useCallback(() => {
      if (selectedTab === 'investments') {
        // Refreshing portfolio on focus
        fetchOverviewData();
      }
    }, [selectedTab])
  );

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
                ${(parseFloat(profile?.cashBalance) || 0).toFixed(2)}
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
                ${(isNaN(portfolioValue) ? 0 : portfolioValue).toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <Ionicons
              name="briefcase"
              size={24}
              color="#8b5cf6"
              style={styles.metricIcon}
            />
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel}>Holdings</Text>
              <Text style={styles.metricValue}>
                {portfolioHoldings.filter(h => h.shares > 0).length} stocks
              </Text>
            </View>
          </View>
        </View>

        {/* Portfolio Industry Breakdown - Pie Chart */}
        {portfolioHoldings.length > 0 && (
          <View style={styles.overviewCard}>
            <Text style={styles.cardTitle}>Portfolio Breakdown</Text>
            {buildIndustryBreakdown().length > 0 ? (
              <View style={styles.pieChartContainer}>
                {VictoryPie && Platform.OS !== 'web' ? (
                  <>
                    <VictoryPie
                      data={buildIndustryBreakdown().map((item, index) => ({
                        x: item.industry,
                        y: item.value,
                        label: `${item.percent}%`
                      }))}
                      width={300}
                      height={200}
                      innerRadius={0}
                      colorScale={buildIndustryBreakdown().map((_, index) => getIndustryColor(index))}
                      labelComponent={<VictoryLabel style={{ fontSize: 12, fill: "#ffffff" }} />}
                      animate={{ duration: 1000 }}
                    />
                  </>
                ) : (
                  // Web fallback - simple bar chart visualization
                  <View style={styles.webFallbackChart}>
                    <Text style={styles.webFallbackTitle}>Portfolio Distribution</Text>
                    {buildIndustryBreakdown().map((item, index) => (
                      <View key={item.industry} style={styles.webBarItem}>
                        <View style={styles.webBarLabel}>
                          <View style={[styles.webBarColor, { backgroundColor: getIndustryColor(index) }]} />
                          <Text style={styles.webBarText}>{item.industry}</Text>
                        </View>
                        <View style={styles.webBarContainer}>
                          <View 
                            style={[
                              styles.webBar, 
                              { 
                                backgroundColor: getIndustryColor(index),
                                width: `${item.percent}%`
                              }
                            ]} 
                          />
                          <Text style={styles.webBarPercent}>{item.percent}%</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                {/* Legend */}
                <View style={styles.pieLegend}>
                  {buildIndustryBreakdown().map((item, index) => (
                    <View key={item.industry} style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: getIndustryColor(index) }]} />
                      <Text style={styles.legendText}>{item.industry}</Text>
                      <Text style={styles.legendPercent}>{item.percent}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.emptyBreakdown}>
                <Text style={styles.emptyBreakdownText}>
                  No active positions to display. Add shares to see breakdown.
                </Text>
              </View>
            )}
            {portfolioHoldings.filter(h => h.shares === 0).length > 0 && (
              <Text style={styles.watchlistNote}>
                + {portfolioHoldings.filter(h => h.shares === 0).length} stocks in watchlist
              </Text>
            )}
          </View>
        )}

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
        <StockComparison 
          onNavigateToInvestments={() => setSelectedTab('investments')}
        />
      )}
    </View>
  );

  const handlePortfolioValueChange = (newValue) => {
    setPortfolioValue(newValue);
  };

  // Build industry breakdown for portfolio visualization
  const buildIndustryBreakdown = () => {
    if (!portfolioHoldings.length) return [];
    
    const totalValue = portfolioHoldings.reduce((sum, holding) => {
      const shares = parseFloat(holding.shares) || 0;
      const price = parseFloat(holding.currentPrice || holding.averagePrice) || 0;
      const value = shares * price;
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
    
    if (totalValue === 0) return [];
    
    const industryMap = {};
    portfolioHoldings.forEach(holding => {
      const shares = parseFloat(holding.shares) || 0;
      if (shares > 0) {
        const industry = holding.industry || holding.sector || 'Other';
        const price = parseFloat(holding.currentPrice || holding.averagePrice) || 0;
        const value = shares * price;
        if (!isNaN(value) && value > 0) {
          industryMap[industry] = (industryMap[industry] || 0) + value;
        }
      }
    });
    
    return Object.entries(industryMap)
      .map(([industry, value]) => ({
        industry,
        value,
        percent: ((value / totalValue) * 100).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 industries
  };

  // Get color for industry breakdown
  const getIndustryColor = (index) => {
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    return colors[index % colors.length];
  };

  // Calculate portfolio performance statistics
  const calculatePerformanceStats = () => {
    const totalInvested = portfolioHoldings.reduce((sum, holding) => {
      const shares = parseFloat(holding.shares) || 0;
      const avgPrice = parseFloat(holding.averagePrice) || 0;
      const value = shares * avgPrice;
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
    
    const currentValue = portfolioHoldings.reduce((sum, holding) => {
      const shares = parseFloat(holding.shares) || 0;
      const currentPrice = parseFloat(holding.currentPrice || holding.averagePrice) || 0;
      const value = shares * currentPrice;
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
    
    const totalReturn = currentValue - totalInvested;
    const returnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
    
    return {
      totalInvested: isNaN(totalInvested) ? 0 : totalInvested,
      currentValue: isNaN(currentValue) ? 0 : currentValue,
      totalReturn: isNaN(totalReturn) ? 0 : totalReturn,
      returnPercent: isNaN(returnPercent) ? 0 : returnPercent
    };
  };

  // Get risk profile type description
  const getRiskProfileType = (riskProfile) => {
    const volatility = riskProfile.volatility || 0;
    if (volatility <= 8) return 'Conservative';
    if (volatility <= 12) return 'Moderate';
    return 'Aggressive';
  };

  const renderInvestments = () => (
    <PortfolioTracker 
      portfolio={portfolioHoldings}
      cashBalance={profile?.cashBalance || 100000}
      onRefresh={fetchOverviewData}
      onPortfolioValueChange={handlePortfolioValueChange}
    />
  );

  const renderProfile = () => {
    const performanceStats = calculatePerformanceStats();
    
    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={40} color="#6366f1" />
          </View>
          <Text style={styles.profileName}>{user?.displayName || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <Text style={styles.profileJoined}>
            Member since {user?.metadata?.creationTime 
              ? new Date(user.metadata.creationTime).toLocaleDateString()
              : 'Recently'}
          </Text>
        </View>

        {/* Portfolio Performance */}
        <View style={styles.overviewCard}>
          <Text style={styles.cardTitle}>Portfolio Performance</Text>
          <View style={styles.performanceGrid}>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>Total Invested</Text>
              <Text style={styles.performanceValue}>
                ${performanceStats.totalInvested.toFixed(2)}
              </Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>Current Value</Text>
              <Text style={styles.performanceValue}>
                ${performanceStats.currentValue.toFixed(2)}
              </Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>Total Return</Text>
              <Text style={[
                styles.performanceValue,
                { color: performanceStats.totalReturn >= 0 ? '#10b981' : '#ef4444' }
              ]}>
                {performanceStats.totalReturn >= 0 ? '+' : ''}${performanceStats.totalReturn.toFixed(2)}
              </Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>Return %</Text>
              <Text style={[
                styles.performanceValue,
                { color: performanceStats.returnPercent >= 0 ? '#10b981' : '#ef4444' }
              ]}>
                {performanceStats.returnPercent >= 0 ? '+' : ''}{performanceStats.returnPercent.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Account Stats */}
        <View style={styles.overviewCard}>
          <Text style={styles.cardTitle}>Account Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="trending-up" size={20} color="#10b981" />
              <Text style={styles.statLabel}>Stocks Owned</Text>
              <Text style={styles.statValue}>
                {portfolioHoldings.filter(h => h.shares > 0).length}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="eye" size={20} color="#6366f1" />
              <Text style={styles.statLabel}>Watchlist</Text>
              <Text style={styles.statValue}>
                {portfolioHoldings.filter(h => h.shares === 0).length}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="wallet" size={20} color="#f59e0b" />
              <Text style={styles.statLabel}>Available Cash</Text>
              <Text style={styles.statValue}>
                ${(profile?.cashBalance || 0).toFixed(0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Risk Profile Summary */}
        {profile?.riskProfile && (
          <View style={styles.overviewCard}>
            <Text style={styles.cardTitle}>Risk Profile</Text>
            <View style={styles.riskSummary}>
              <Text style={styles.riskProfileType}>
                {getRiskProfileType(profile.riskProfile)} Investor
              </Text>
              <TouchableOpacity 
                style={styles.retakeQuizButton}
                onPress={handleResetRiskProfile}
              >
                <Text style={styles.retakeQuizText}>Retake Quiz</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
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
        </View>
      </ScrollView>
    );
  };

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
  profileJoined: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  performanceItem: {
    width: '48%',
    marginBottom: 16,
    marginRight: '2%',
  },
  performanceLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  },
  performanceValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  riskSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  riskProfileType: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  retakeQuizButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  retakeQuizText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  menuSection: {
    marginTop: 12,
  },
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
  industryBreakdown: {
    marginTop: 12,
  },
  industryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  industryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  industryName: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 14,
  },
  industryPercent: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  watchlistNote: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
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
  pieChartContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  pieLegend: {
    marginTop: 16,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  legendText: {
    color: '#e2e8f0',
    fontSize: 14,
    flex: 1,
  },
  legendPercent: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyBreakdown: {
    padding: 20,
    alignItems: 'center',
  },
  emptyBreakdownText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  webFallbackChart: {
    padding: 16,
    alignItems: 'center',
  },
  webFallbackTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  webBarItem: {
    width: '100%',
    marginBottom: 12,
  },
  webBarLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  webBarColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  webBarText: {
    color: '#e2e8f0',
    fontSize: 14,
    flex: 1,
  },
  webBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
    height: 24,
  },
  webBar: {
    height: '100%',
    minWidth: 20,
  },
  webBarPercent: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
    marginRight: 8,
  },
});
