import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../firebase';
import EnhancedLoadingScreen from '../components/EnhancedLoadingScreen';
import { doc, getDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

const COLORS = {
  primaryGradient: ['#0f0f23', '#1a1a2e', '#16213e'],
  cardGradient: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'],
  primary: '#00d4ff',
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
  xxl: 48,
};

const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
};

const GlassCard = ({ children, style }) => {
  return (
    <LinearGradient
      colors={COLORS.cardGradient}
      style={[styles.glassCard, style]}
    >
      <View style={styles.cardBorder}>
        {children}
      </View>
    </LinearGradient>
  );
};

const Profile_Safe = ({ user, navigation }) => {
  const [loading, setLoading] = useState(true);
  const [riskProfile, setRiskProfile] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  // Refresh profile data when user changes
  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  // Monitor risk profile state changes
  useEffect(() => {
    console.log('Risk profile state changed:', {
      hasRiskProfile: !!riskProfile,
      riskProfileData: riskProfile
    });
  }, [riskProfile]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      console.log('Loading profile data for user:', user.uid);
      
      // Load user profile and risk quiz results from standardized location
      const [userDoc, riskProfileDoc] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDoc(doc(db, 'users', user.uid, 'riskProfile', 'current'))
      ]);

      let userData = null; // Declare userData at function scope
      let hasRiskProfileInUserDoc = false; // Track if we found risk profile in user doc

      if (userDoc.exists()) {
        userData = userDoc.data();
        setUserProfile(userData);
        console.log('User profile loaded:', {
          hasRiskProfile: !!userData?.riskProfile,
          riskProfileCompleted: userData?.riskProfileCompleted,
          riskProfileData: userData?.riskProfile
        });
        
        // Check for risk profile in user document first (primary location)
        if (userData?.riskProfile && userData?.riskProfileCompleted) {
          console.log('✅ Found risk profile in user document');
          setRiskProfile(userData);
          hasRiskProfileInUserDoc = true;
        }
      }

      // Check dedicated risk profile document (secondary location)
      if (riskProfileDoc.exists()) {
        const riskData = riskProfileDoc.data();
        console.log('✅ Found risk profile in dedicated document:', riskData);
        setRiskProfile(riskData);
        
        // If we found it in the dedicated document but not in user doc, update user doc
        if (!hasRiskProfileInUserDoc && riskData) {
          console.log('Updating user document with risk profile completion flag');
          try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              riskProfileCompleted: true,
              lastRiskUpdate: riskData.lastRiskUpdate || new Date(),
            });
          } catch (error) {
            console.warn('Failed to update user document with risk profile flag:', error);
          }
        }
      }

      // Final check - if we still don't have a risk profile, log it
      if (!riskProfile) {
        console.log('❌ No risk profile found in any location');
      } else {
        console.log('✅ Risk profile successfully loaded');
      }

    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function that can be called from other components
  const refreshProfile = useCallback(async () => {
    if (user) {
      console.log('Manually refreshing profile data...');
      await loadProfileData();
      console.log('Profile refresh completed');
    }
  }, [user]);

  // Handle resetting risk profile
  const handleResetRiskProfile = async () => {
    try {
      Alert.alert(
        'Reset Risk Profile',
        'Are you sure you want to reset your risk preferences? This will remove your current risk assessment.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Reset',
            style: 'destructive',
            onPress: async () => {
              if (user) {
                try {
                  const userRef = doc(db, 'users', user.uid);
                  
                  // Clear risk profile
                  await updateDoc(userRef, {
                    riskProfile: null,
                    riskProfileCompleted: false,
                  });
                  
                  // Clear existing stock recommendations
                  const recentStocksRef = collection(db, 'users', user.uid, 'recentStocks');
                  const oldStocksSnapshot = await getDocs(recentStocksRef);
                  const deletePromises = oldStocksSnapshot.docs.map(doc => deleteDoc(doc.ref));
                  await Promise.all(deletePromises);
                  
                  // Clear user choices
                  const userChoicesRef = collection(db, 'users', user.uid, 'userChoices');
                  const userChoicesSnapshot = await getDocs(userChoicesRef);
                  const deleteChoicesPromises = userChoicesSnapshot.docs.map(doc => deleteDoc(doc.ref));
                  await Promise.all(deleteChoicesPromises);
                  
                  setRiskProfile(null);
                  Alert.alert('Success', 'Risk profile has been reset and old recommendations cleared. You can now retake the assessment for fresh recommendations.');
                  
                  // Navigate to stock comparison to clear the current view
                  navigation?.navigate?.('StockComparison', { riskProfileReset: true });
                } catch (error) {
                  console.error('Error clearing data:', error);
                  Alert.alert('Success', 'Risk profile has been reset. You can now retake the assessment.');
                }
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error resetting risk profile:', error);
      Alert.alert('Error', 'Failed to reset risk profile. Please try again.');
    }
  };

  const getRiskLevel = (profile) => {
    if (!profile?.riskProfile) return 'Not Set';
    
    const { volatility, timeHorizon, knowledge, ethics, liquidity } = profile.riskProfile;
    const avgScore = (volatility + timeHorizon + knowledge + ethics + liquidity) / 5;
    
    if (avgScore <= 2) return 'Conservative';
    if (avgScore <= 3) return 'Moderate';
    if (avgScore <= 4) return 'Aggressive';
    return 'Very Aggressive';
  };

  const getRiskDescription = (level) => {
    switch (level) {
      case 'Conservative':
        return 'You prefer stable, low-risk investments with steady returns.';
      case 'Moderate':
        return 'You balance growth and stability, accepting moderate risk for better returns.';
      case 'Aggressive':
        return 'You seek higher returns and are comfortable with significant market volatility.';
      case 'Very Aggressive':
        return 'You pursue maximum growth potential and accept high market risk.';
      default:
        return 'Complete the risk assessment to get personalized recommendations.';
    }
  };

  if (loading) {
    return <EnhancedLoadingScreen message="Loading Profile..." />;
  }

  return (
    <LinearGradient colors={COLORS.primaryGradient} style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>Your investment preferences</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={refreshProfile}>
            <Text style={styles.refreshButtonText}>↻</Text>
          </TouchableOpacity>
        </View>

        {/* User Info Card */}
        <GlassCard style={styles.userCard}>
          <View style={styles.userHeader}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitials}>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <Text style={styles.userSince}>
                Member since {userProfile?.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Risk Profile Card */}
        <GlassCard style={styles.riskCard}>
          <View style={styles.riskHeader}>
            <Text style={styles.cardTitle}>Risk Profile</Text>
            {riskProfile && (
              <View style={styles.riskBadge}>
                <Text style={styles.riskBadgeText}>{getRiskLevel(riskProfile)}</Text>
              </View>
            )}
          </View>
          
          {riskProfile ? (
            <View style={styles.riskContent}>
              <Text style={styles.riskDescription}>
                {getRiskDescription(getRiskLevel(riskProfile))}
              </Text>
              
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={handleResetRiskProfile}
              >
                <Text style={styles.resetButtonText}>Reset Risk Preferences</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noRiskProfile}>
              <Text style={styles.noRiskText}>
                Complete the risk assessment to get personalized stock recommendations.
              </Text>
              <TouchableOpacity 
                style={styles.quizButton}
                onPress={() => navigation?.navigate('RiskQuiz')}
              >
                <Text style={styles.quizButtonText}>Take Risk Assessment</Text>
              </TouchableOpacity>
            </View>
          )}
        </GlassCard>



        {/* Quick Actions */}
        <GlassCard style={styles.actionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation?.navigate('Portfolio')}
            >
              <Text style={styles.actionButtonText}>View Portfolio</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation?.navigate('StockComparison')}
            >
              <Text style={styles.actionButtonText}>Discover Stocks</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
        
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 120,
  },
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerContent: {
    flex: 1,
  },
  refreshButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  refreshButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.accent,
  },
  glassCard: {
    borderRadius: 24,
    marginBottom: SPACING.lg,
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
  userCard: {
    marginBottom: SPACING.lg,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  userInitials: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  userEmail: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  userSince: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  riskCard: {
    marginBottom: SPACING.lg,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  riskBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
  },
  riskBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  riskContent: {
    gap: SPACING.md,
  },
  riskDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  resetButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    ...TYPOGRAPHY.caption,
    color: '#ff3b30',
    fontWeight: '600',
  },
  noRiskProfile: {
    alignItems: 'center',
    padding: SPACING.lg,
  },
  noRiskText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  quizButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  quizButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  actionsCard: {
    marginBottom: SPACING.lg,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '600',
  },
  cardBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: SPACING.lg,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  userCard: {
    marginBottom: SPACING.lg,
  },
  userInfo: {
    alignItems: 'center',
  },
  userEmail: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  userSince: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.accent,
  },
  riskCard: {
    marginBottom: SPACING.lg,
  },
  riskContent: {
    gap: SPACING.lg,
  },
  riskLevel: {
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  riskLevelText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  riskDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  riskScores: {
    gap: SPACING.sm,
  },
  scoresTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  scoreLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    width: 80,
  },
  scoreBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginHorizontal: SPACING.sm,
  },
  scoreProgress: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  scoreValue: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.primary,
    width: 30,
    textAlign: 'right',
  },
  noRiskProfile: {
    alignItems: 'center',
    padding: SPACING.lg,
  },
  noRiskText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  quizButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 25,
  },
  quizButtonText: {
    ...TYPOGRAPHY.body,
    color: '#ffffff',
    fontWeight: '600',
  },
  settingsCard: {
    marginBottom: SPACING.lg,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  settingLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
  },
  settingValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.accent,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  backButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
});

export default Profile_Safe;
