import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#00d4ff',
  success: '#4ecdc4',
  warning: '#feca57',
  danger: '#ff6b6b',
  info: '#8b9dc3',
  text: {
    primary: '#ffffff',
    secondary: '#b4bcd0',
  },
  background: {
    success: 'rgba(78, 205, 196, 0.1)',
    warning: 'rgba(254, 202, 87, 0.1)',
    danger: 'rgba(255, 107, 107, 0.1)',
    info: 'rgba(139, 157, 195, 0.1)',
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
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
};

const NotificationSystem = ({ notifications, onRemove }) => {
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (notifications.length > 0) {
      showNotification();
    }
  }, [notifications]);

  const showNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideNotification = (id) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onRemove(id);
    });
  };

  const getNotificationStyle = (type) => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: COLORS.background.success,
          borderColor: COLORS.success,
          icon: null,
        };
      case 'warning':
        return {
          backgroundColor: COLORS.background.warning,
          borderColor: COLORS.warning,
          icon: null,
        };
      case 'error':
        return {
          backgroundColor: COLORS.background.danger,
          borderColor: COLORS.danger,
          icon: null,
        };
      case 'info':
        return {
          backgroundColor: COLORS.background.info,
          borderColor: COLORS.info,
          icon: null,
        };
      default:
        return {
          backgroundColor: COLORS.background.info,
          borderColor: COLORS.primary,
          icon: null,
        };
    }
  };

  if (notifications.length === 0) return null;

  const latestNotification = notifications[notifications.length - 1];
  const notificationStyle = getNotificationStyle(latestNotification.type);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: slideAnim },
            { scale: scaleAnim },
          ],
          opacity: fadeAnim,
        },
      ]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
        style={[
          styles.notification,
          {
            backgroundColor: notificationStyle.backgroundColor,
            borderColor: notificationStyle.borderColor,
          },
        ]}
      >
        <View style={styles.content}>
          {notificationStyle.icon && (
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{notificationStyle.icon}</Text>
            </View>
          )}
          
          <View style={styles.content}>
            <Text style={styles.title}>{latestNotification.title}</Text>
            {latestNotification.message && (
              <Text style={styles.message}>{latestNotification.message}</Text>
            )}
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => hideNotification(latestNotification.id)}
        >
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 60,
  },
  iconContainer: {
    marginRight: SPACING.md,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  message: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  closeButtonText: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
});

export default NotificationSystem;
