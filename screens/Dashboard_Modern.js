import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import SharedNavigation from '../components/SharedNavigation';
import BottomNavigation from '../components/BottomNavigation';
import PortfolioPerformanceChart from '../components/PortfolioPerformanceChart';

const COLORS = {
  primaryGradient: ['#0f0f23', '#1a1a2e', '#16213e'],
  cardGradient: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)'],
  primary: '#00d4ff',
  secondary: '#ff6b6b',
  success: '#4ecdc4',
  warning: '#feca57',
  text: {
    primary: '#ffffff',
    secondary: '#b4bcd0',
    accent: '#8b9dc3',
  },
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
};

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

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
};

export default function Dashboard_Modern({ user, navigation }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const navigate = navigation?.navigate || (() => {});

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      if (!user?.uid) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setProfile(userDoc.data());
      } else {
        // Create default profile
        const newProfile = {
          email: user.email,
          cashBalance: 10000,
          createdAt: new Date(),
          riskProfile: {
            volatility: 0,
            liquidity: 0,
            timeHorizon: 0,
            ethics: 0,
            knowledge: 0,
          },
        };
        await setDoc(doc(db, 'users', user.uid), newProfile);
        setProfile(newProfile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserProfile();
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      Alert.alert('Success', 'Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={COLORS.primaryGradient} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={COLORS.primaryGradient} style={styles.container}>
      <SharedNavigation 
        navigation={navigation} 
        currentScreen="Dashboard" 
        onSignOut={handleSignOut}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >


        {/* Welcome Message */}
        <GlassCard style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome Back!</Text>
          <Text style={styles.welcomeSubtitle}>
            Ready to grow your portfolio?
          </Text>
        </GlassCard>

        {/* Portfolio Performance Chart */}
        <GlassCard style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Portfolio Performance</Text>
          <PortfolioPerformanceChart 
            user={user}
            onPress={() => navigate('Portfolio')}
          />
        </GlassCard>

        {/* Quick Actions */}
        <GlassCard style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigate('StockComparison')}
            >
              <Text style={styles.actionTitle}>Discover</Text>
              <Text style={styles.actionSubtitle}>Find Stocks</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigate('Portfolio')}
            >
              <Text style={styles.actionTitle}>Portfolio</Text>
              <Text style={styles.actionSubtitle}>View Holdings</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Account Summary */}
        <GlassCard style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Account Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Cash Balance:</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(profile?.cashBalance || 10000)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Account Created:</Text>
            <Text style={styles.summaryValue}>
              {profile?.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
            </Text>
          </View>
        </GlassCard>


      </ScrollView>
      
      {/* Bottom Navigation */}
      <BottomNavigation 
        navigation={navigation} 
        currentScreen="Dashboard" 
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 120, // Extra padding for bottom navigation
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  welcomeText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    flex: 1,
  },
  signOutButton: {
    backgroundColor: 'rgba(255,107,107,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  signOutText: {
    ...TYPOGRAPHY.small,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  glassCard: {
    borderRadius: 24,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 32,
      },
      android: {
        elevation: 16,
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
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  welcomeCard: {
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  welcomeTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  welcomeSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  featuresCard: {
    marginBottom: SPACING.lg,
  },
  featureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  featureDescription: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  featureArrow: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginLeft: SPACING.md,
  },
  summaryCard: {
    marginBottom: SPACING.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  summaryLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },
  summaryValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  chartCard: {
    marginBottom: SPACING.lg,
    minHeight: 300,
    overflow: 'hidden',
  },
  chart: {
    marginTop: SPACING.md,
  },
  actionsCard: {
    marginBottom: SPACING.lg,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#00d4ff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  actionTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  actionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
});
