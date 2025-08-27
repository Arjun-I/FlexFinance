import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';

const COLORS = {
  primary: '#00d4ff',
  text: {
    primary: '#ffffff',
    secondary: '#b4bcd0',
  },
  background: 'rgba(15,15,35,0.95)',
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
};

export default function BottomNavigation({ navigation, currentScreen }) {
  const navigate = navigation?.navigate || (() => {});

  const tabs = [
    {
      key: 'Dashboard',
      title: 'Home',
      icon: '●'
    },
    {
      key: 'StockComparison',
      title: 'Discover',
      icon: '●'
    },
    {
      key: 'Portfolio',
      title: 'Portfolio',
      icon: '●'
    },
    {
      key: 'Profile',
      title: 'Profile',
      icon: '●'
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => navigate(tab.key)}
          >
            <Text style={[
              styles.tabIcon,
              currentScreen === tab.key && styles.activeTabIcon
            ]}>
              {tab.icon}
            </Text>
            <Text style={[
              styles.tabText,
              currentScreen === tab.key && styles.activeTabText
            ]}>
              {tab.title}
            </Text>
            {currentScreen === tab.key && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.md,
    paddingTop: SPACING.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    position: 'relative',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: SPACING.xs,
    color: COLORS.text.secondary,
    opacity: 0.6,
  },
  activeTabIcon: {
    color: COLORS.primary,
    opacity: 1,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
});
