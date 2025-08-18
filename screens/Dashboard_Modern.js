import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import PortfolioTracker_Enhanced from '../components/PortfolioTracker_Enhanced';
import StockComparison_Enhanced from '../components/StockComparison_Enhanced';
import PortfolioPerformanceChart from '../components/PortfolioPerformanceChart';
import FullScreenChartModal from '../components/FullScreenChartModal';

const { width } = Dimensions.get('window');

// Modern Design System
const COLORS = {
  // Background gradients
  primaryGradient: ['#0f0f23', '#1a1a2e', '#16213e'],
  cardGradient: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)'],
  
  // Accent colors
  primary: '#00d4ff',
  secondary: '#ff6b6b',
  success: '#4ecdc4',
  warning: '#feca57',
  
  // Text colors
  text: {
    primary: '#ffffff',
    secondary: '#b4bcd0',
    accent: '#8b9dc3',
    muted: '#6b7280',
  },
  
  // Status colors
  positive: '#4ecdc4',
  negative: '#ff6b6b',
  danger: '#ff6b6b', // Added danger color
  
  // Overlay colors
  overlay: 'rgba(0,0,0,0.4)',
  cardOverlay: 'rgba(255,255,255,0.08)',
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

const TYPOGRAPHY = {
  h1: { fontSize: 36, fontWeight: '800', lineHeight: 44, letterSpacing: -0.5 },
  h2: { fontSize: 28, fontWeight: '700', lineHeight: 36, letterSpacing: -0.3 },
  h3: { fontSize: 22, fontWeight: '600', lineHeight: 28, letterSpacing: -0.2 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
};

// Utility functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
};

const formatPercent = (percent) => {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
};

// Glass Card Component
const GlassCard = ({ children, style, onPress }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={!onPress}
    >
      <LinearGradient
        colors={COLORS.cardGradient}
        style={[styles.glassCard, style]}
      >
        <View style={styles.cardBorder}>
          {children}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Modern Holdings List
const ModernHolding = ({ holding, onPress }) => {
  const isPositive = holding.gain >= 0;
  
  return (
    <GlassCard style={styles.holdingCard} onPress={onPress}>
      <View style={styles.holdingHeader}>
        <View style={styles.holdingInfo}>
          <Text style={[TYPOGRAPHY.h3, styles.holdingSymbol]}>{holding.symbol}</Text>
          <Text style={[TYPOGRAPHY.caption, styles.holdingShares]}>
            {holding.shares} shares
          </Text>
        </View>
        
        <View style={styles.holdingValues}>
          <Text style={[TYPOGRAPHY.body, styles.holdingValue]}>
            {formatCurrency(holding.currentValue)}
          </Text>
          <View style={[
            styles.changeChip,
            { backgroundColor: isPositive ? `${COLORS.success}20` : `${COLORS.danger}20` }
          ]}>
            <Text style={[
              TYPOGRAPHY.small,
              { color: isPositive ? COLORS.success : COLORS.danger }
            ]}>
              {formatPercent(holding.gainPercent)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.holdingDetails}>
        <Text style={[TYPOGRAPHY.caption, styles.holdingPrice]}>
          ${holding.currentPrice?.toFixed(2)} per share
        </Text>
      </View>
    </GlassCard>
  );
};

// Main Dashboard Component
export default function Dashboard_Modern({ user, navigation }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [portfolioHoldings, setPortfolioHoldings] = useState([]);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [cashBalance, setCashBalance] = useState(10000);
  const [totalReturn, setTotalReturn] = useState(0);
  const [totalReturnPercent, setTotalReturnPercent] = useState(0);
  const [selectedStock, setSelectedStock] = useState(null);
  const [showStockDetails, setShowStockDetails] = useState(false);
  const [error, setError] = useState(null);
  const [showFullScreenChart, setShowFullScreenChart] = useState(false);
  const [selectedChartData, setSelectedChartData] = useState(null);

  const navigate = navigation?.navigate || (() => {});

  const handleStockPress = (holding) => {
    setSelectedStock(holding);
    setShowStockDetails(true);
  };

  const handleRetry = () => {
    setError(null);
    loadDashboardData();
  };

  const handlePortfolioChartPress = () => {
    setSelectedChartData({
      type: 'portfolio',
      title: 'Portfolio Performance',
      data: null // Will be loaded in the modal
    });
    setShowFullScreenChart(true);
  };

  const handleCloseChart = () => {
    setShowFullScreenChart(false);
    setSelectedChartData(null);
  };

  useEffect(() => {
    console.log('Dashboard useEffect triggered, user:', user?.email);
    if (user) {
      console.log('Loading dashboard data for user:', user.email);
      loadDashboardData();
    } else {
      console.log('No user found in Dashboard useEffect');
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user?.uid) {
        console.log('No user found');
        return;
      }

      console.log('Dashboard: Starting optimized data load...');
      const startTime = Date.now();
      
      // Parallel data fetching
      const [userDoc, portfolioSnapshot] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDocs(collection(db, 'users', user.uid, 'portfolio'))
      ]);
      
      await processDashboardData(userDoc, portfolioSnapshot);
      
      const loadTime = Date.now() - startTime;
      console.log(`Dashboard loaded in ${loadTime}ms`);
      // setIsOffline(false); // This line was removed
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Unable to load portfolio data. Please check your connection.');
      // setIsOffline(true); // This line was removed
    } finally {
      setLoading(false);
    }
  };

  const processDashboardData = async (userDoc, portfolioSnapshot) => {
    // Process user profile
    if (userDoc.exists()) {
      const userData = userDoc.data();
      setProfile(userData);
      setCashBalance(userData.cashBalance || 10000);
      console.log('User profile processed');
    } else {
      // Create default profile (async, don't block UI)
      const newProfile = {
        email: user.email,
        cashBalance: 10000,
        createdAt: new Date(),
        lastUpdated: new Date(),
      };
      try {
        await setDoc(doc(db, 'users', user.uid), newProfile);
        setProfile(newProfile);
        setCashBalance(10000);
        console.log('Created new user profile');
      } catch (error) {
        console.error('Error creating user profile:', error);
      }
    }

    // Process portfolio holdings with optimized calculation - only include stocks the user owns
    const holdings = [];
    let totalVal = 0;
    let totalCost = 0;
    
    portfolioSnapshot.forEach((docSnapshot) => {
      const holdingData = { id: docSnapshot.id, ...docSnapshot.data() };
      
      // Only include holdings where user actually owns shares (not watchlist items)
      if (holdingData.shares > 0) {
        // Use currentPrice (updated by PortfolioTracker) first
        const price = holdingData.currentPrice || holdingData.price || holdingData.averagePrice || 0;
        const shares = holdingData.shares || 0;
        const avgPrice = holdingData.averagePrice || price;
        
        const currentValue = shares * price;
        const costBasis = shares * avgPrice;
        
        holdings.push({
          ...holdingData,
          currentPrice: price,
          currentValue,
          costBasis,
          gain: currentValue - costBasis,
          gainPercent: costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0,
        });
        
        totalVal += currentValue;
        totalCost += costBasis;
      }
    });
    
    // Update all state at once to minimize re-renders
    setPortfolioHoldings(holdings);
    setPortfolioValue(totalVal);
    setTotalReturn(totalVal - totalCost);
    setTotalReturnPercent(totalCost > 0 ? ((totalVal - totalCost) / totalCost) * 100 : 0);
    
    console.log(`Processed ${holdings.length} holdings`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={COLORS.primaryGradient} style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back, {user?.email?.split('@')[0]}</Text>
          <Text style={styles.welcomeSubtext}>Here's your financial overview</Text>
        </View>

        {/* Portfolio Summary */}
        <View style={styles.portfolioSummary}>
          <Text style={styles.sectionTitle}>Portfolio Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Value</Text>
              <Text style={styles.summaryValue}>{formatCurrency(portfolioValue)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Cash Balance</Text>
              <Text style={styles.summaryValue}>{formatCurrency(cashBalance)}</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Return</Text>
              <Text style={[
                styles.summaryValue,
                { color: totalReturn >= 0 ? COLORS.success : COLORS.negative }
              ]}>
                {formatCurrency(totalReturn)}
              </Text>
              <Text style={[
                styles.summaryPercent,
                { color: totalReturnPercent >= 0 ? COLORS.success : COLORS.negative }
              ]}>
                {formatPercent(totalReturnPercent)}
              </Text>
            </View>
          </View>
        </View>

        {/* Portfolio Performance Chart */}
        <PortfolioPerformanceChart
          userId={user?.uid}
          onPress={handlePortfolioChartPress}
        />

        {/* Portfolio Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Overview</Text>
          <PortfolioTracker_Enhanced navigation={navigation} user={user} />
        </View>

        {/* Stock Comparisons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock Comparisons</Text>
          <StockComparison_Enhanced navigation={navigation} user={user} />
        </View>

        {/* Full Screen Chart Modal */}
        <FullScreenChartModal
          visible={showFullScreenChart}
          stock={selectedChartData}
          onClose={handleCloseChart}
        />
      </ScrollView>

      {/* Stock Details Modal */}
      <StockDetailsModal
        visible={showStockDetails}
        stock={selectedStock}
        onClose={() => {
          setShowStockDetails(false);
          setSelectedStock(null);
        }}
        user={user}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
  },

  // Glass Card System
  glassCard: {
    borderRadius: 20,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  cardBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },

  // Error Message
  errorContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  errorText: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 25,
  },
  retryButtonText: {
    ...TYPOGRAPHY.small,
    color: '#ffffff',
    fontWeight: '600',
  },

  // Welcome Section
  welcomeSection: {
    marginBottom: SPACING.lg,
  },
  welcomeText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  welcomeSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.accent,
    textAlign: 'center',
  },

  // Hero Portfolio Card
  heroCard: {
    marginBottom: SPACING.lg,
  },
  heroGradient: {
    borderRadius: 20,
    padding: SPACING.xl,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.9)',
    marginBottom: SPACING.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroValue: {
    color: '#ffffff',
    marginBottom: SPACING.lg,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: SPACING.md,
  },
  heroStat: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.8)',
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  heroStatValue: {
    color: '#ffffff',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Holdings Section
  holdingsSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    marginLeft: SPACING.sm,
    fontWeight: '700',
  },
  
  holdingCard: {
    marginBottom: SPACING.sm,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  holdingInfo: {
    flex: 1,
  },
  holdingSymbol: {
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    fontWeight: '700',
  },
  holdingShares: {
    color: COLORS.text.accent,
    fontWeight: '500',
  },
  holdingValues: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    color: COLORS.text.primary,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  changeChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  holdingDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: SPACING.sm,
  },
  holdingPrice: {
    color: COLORS.text.accent,
    fontWeight: '500',
  },

  // Portfolio Summary
  portfolioSummary: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    ...TYPOGRAPHY.small,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  summaryPercent: {
    ...TYPOGRAPHY.small,
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
    opacity: 0.6,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  ctaButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  ctaButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  switchAuthText: {
    fontSize: 14,
    color: '#b4bcd0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f23',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
});
