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
import { doc, getDoc } from 'firebase/firestore';

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

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // Load user profile and risk quiz results
      const [userDoc, quizDoc] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDoc(doc(db, 'users', user.uid, 'preferences', 'quiz'))
      ]);

      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }

      if (quizDoc.exists()) {
        setRiskProfile(quizDoc.data());
      }

    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
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
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>Your investment preferences</Text>
        </View>

        {/* User Info */}
        <GlassCard style={styles.userCard}>
          <Text style={styles.cardTitle}>Account Information</Text>
          <View style={styles.userInfo}>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <Text style={styles.userSince}>
              Member since {userProfile?.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
            </Text>
          </View>
        </GlassCard>

        {/* Risk Profile */}
        <GlassCard style={styles.riskCard}>
          <Text style={styles.cardTitle}>Risk Profile</Text>
          {riskProfile ? (
            <View style={styles.riskContent}>
              <View style={styles.riskLevel}>
                <Text style={styles.riskLevelText}>{getRiskLevel(riskProfile)}</Text>
                <Text style={styles.riskDescription}>
                  {getRiskDescription(getRiskLevel(riskProfile))}
                </Text>
              </View>
              
              <View style={styles.riskScores}>
                <Text style={styles.scoresTitle}>Your Scores</Text>
                {riskProfile.riskProfile && Object.entries(riskProfile.riskProfile).map(([key, value]) => (
                  <View key={key} style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Text>
                    <View style={styles.scoreBar}>
                      <View 
                        style={[
                          styles.scoreProgress, 
                          { width: `${(value / 5) * 100}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.scoreValue}>{value}/5</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.noRiskProfile}>
              <Text style={styles.noRiskText}>
                Complete the risk assessment to get personalized recommendations.
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

        {/* Settings */}
        <GlassCard style={styles.settingsCard}>
          <Text style={styles.cardTitle}>Settings</Text>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingValue}>On</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>Privacy</Text>
            <Text style={styles.settingValue}>Private</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingLabel}>Currency</Text>
            <Text style={styles.settingValue}>USD</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation?.navigate('Dashboard')}
        >
          <Text style={styles.backButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
        
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
    marginBottom: SPACING.lg,
    alignItems: 'center',
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
