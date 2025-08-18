import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#00d4ff',
  success: '#4ecdc4',
  danger: '#ff6b6b',
  text: {
    primary: '#ffffff',
    secondary: '#b4bcd0',
  },
  background: {
    primary: '#0f0f23',
    secondary: '#1a1a2e',
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
  h1: { fontSize: 28, fontWeight: '700', lineHeight: 36 },
  h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
};

const EnhancedLoadingScreen = ({ 
  message = "Loading...", 
  subMessage = "Please wait while we prepare your experience",
  type = "default", // default, chart, portfolio, stocks
  showProgress = false,
  progress = 0,
  onTimeout,
  timeout = 30000 // 30 seconds
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous rotation animation
    const startRotation = () => {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    };
    startRotation();

    // Progress animation
    if (showProgress) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }

    // Timeout handler
    if (onTimeout && timeout) {
      const timeoutId = setTimeout(() => {
        onTimeout();
      }, timeout);

      return () => clearTimeout(timeoutId);
    }
  }, [fadeAnim, scaleAnim, rotateAnim, progressAnim, showProgress, progress, onTimeout, timeout]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getLoadingContent = () => {
    switch (type) {
      case 'chart':
        return {
          icon: null,
          title: 'Loading Chart Data',
          description: 'Fetching real-time market information...',
        };
      case 'portfolio':
        return {
          icon: null,
          title: 'Updating Portfolio',
          description: 'Calculating your investment performance...',
        };
      case 'stocks':
        return {
          icon: null,
          title: 'Analyzing Stocks',
          description: 'Generating personalized recommendations...',
        };
      default:
        return {
          icon: null,
          title: message,
          description: subMessage,
        };
    }
  };

  const content = getLoadingContent();

  return (
    <LinearGradient 
      colors={[COLORS.background.primary, COLORS.background.secondary]} 
      style={styles.container}
    >
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/flexlogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Loading Icon */}
        {content.icon && (
          <View style={styles.iconContainer}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Text style={styles.loadingIcon}>{content.icon}</Text>
            </Animated.View>
          </View>
        )}

        {/* Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.description}>{content.description}</Text>
        </View>

        {/* Progress Bar */}
        {showProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { width: progressAnim }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}

        {/* Loading Indicator */}
        <View style={styles.indicatorContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.indicatorText}>Please wait...</Text>
        </View>

        {/* Animated Background Elements */}
        <View style={styles.backgroundElements}>
          {[...Array(6)].map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.backgroundDot,
                {
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: fadeAnim,
                  transform: [
                    { 
                      scale: scaleAnim.interpolate({
                        inputRange: [0.8, 1],
                        outputRange: [0, 1],
                      })
                    }
                  ],
                }
              ]}
            />
          ))}
        </View>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  logoContainer: {
    marginBottom: SPACING.xl,
  },
  logo: {
    width: 80,
    height: 80,
  },
  iconContainer: {
    marginBottom: SPACING.lg,
  },
  loadingIcon: {
    fontSize: 48,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  progressContainer: {
    width: width * 0.7,
    marginBottom: SPACING.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressText: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  indicatorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginLeft: SPACING.sm,
  },
  backgroundElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  backgroundDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    opacity: 0.3,
  },
});

export default EnhancedLoadingScreen;
