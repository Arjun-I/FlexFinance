import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const COLORS = {
  primaryGradient: ['#0f0f23', '#1a1a2e', '#16213e'],
  cardGradient: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)'],
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

const StockGenerationLoadingScreen = ({ progress = 0, status = 'Initializing...', onComplete }) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  useEffect(() => {
    // Auto-complete when progress reaches 100%
    if (progress >= 100 && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  return (
    <LinearGradient colors={COLORS.primaryGradient} style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>●</Text>
            </View>
            <Text style={styles.title}>Generating Your Perfect Stocks</Text>
            <Text style={styles.subtitle}>
              Analyzing market data and creating personalized recommendations
            </Text>
          </View>

        <GlassCard style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Generation Progress</Text>
            <Text style={styles.progressPercent}>{Math.round(animatedProgress)}%</Text>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${animatedProgress}%` }
                ]} 
              />
            </View>
          </View>

          <Text style={styles.statusText}>{status}</Text>
        </GlassCard>

        <GlassCard style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>What We're Doing</Text>
          <View style={styles.stepsList}>
            <View style={[styles.stepItem, progress >= 20 && styles.stepCompleted]}>
              <Text style={styles.stepIcon}>{progress >= 20 ? '✓' : '1'}</Text>
              <Text style={styles.stepText}>Analyzing market conditions</Text>
            </View>
            <View style={[styles.stepItem, progress >= 40 && styles.stepCompleted]}>
              <Text style={styles.stepIcon}>{progress >= 40 ? '✓' : '2'}</Text>
              <Text style={styles.stepText}>Evaluating your risk profile</Text>
            </View>
            <View style={[styles.stepItem, progress >= 60 && styles.stepCompleted]}>
              <Text style={styles.stepIcon}>{progress >= 60 ? '✓' : '3'}</Text>
              <Text style={styles.stepText}>Finding matching stocks</Text>
            </View>
            <View style={[styles.stepItem, progress >= 80 && styles.stepCompleted]}>
              <Text style={styles.stepIcon}>{progress >= 80 ? '✓' : '4'}</Text>
              <Text style={styles.stepText}>Generating analysis</Text>
            </View>
            <View style={[styles.stepItem, progress >= 100 && styles.stepCompleted]}>
              <Text style={styles.stepIcon}>{progress >= 100 ? '✓' : '5'}</Text>
              <Text style={styles.stepText}>Preparing recommendations</Text>
            </View>
          </View>
        </GlassCard>
      </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  glassCard: {
    borderRadius: 20,
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
  progressCard: {
    marginBottom: SPACING.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  progressTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
  },
  progressPercent: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    fontWeight: '700',
  },
  progressBarContainer: {
    marginBottom: SPACING.md,
  },
  progressBar: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  stepsCard: {
    flex: 1,
  },
  stepsTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  stepsList: {
    gap: SPACING.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  stepCompleted: {
    opacity: 0.7,
  },
  stepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    color: COLORS.text.primary,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '600',
    marginRight: SPACING.md,
  },
  stepText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    flex: 1,
  },
});

export default StockGenerationLoadingScreen;
