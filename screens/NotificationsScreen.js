// NotificationsScreen.js - User Notifications
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState({
    pushNotifications: true,
    emailNotifications: false,
    stockAlerts: true,
    priceAlerts: true,
    newsUpdates: false,
    weeklyReports: true,
  });

  const toggleNotification = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderNotificationItem = (icon, title, subtitle, key) => (
    <View style={styles.notificationItem}>
      <View style={styles.notificationInfo}>
        <Ionicons name={icon} size={24} color="#6366f1" />
        <View style={styles.textContainer}>
          <Text style={styles.notificationTitle}>{title}</Text>
          <Text style={styles.notificationSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={notifications[key]}
        onValueChange={() => toggleNotification(key)}
        trackColor={{ false: '#334155', true: '#6366f1' }}
        thumbColor={notifications[key] ? '#ffffff' : '#94a3b8'}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>Manage your notification preferences</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>
        
        {renderNotificationItem(
          'notifications',
          'Push Notifications',
          'Receive notifications on your device',
          'pushNotifications'
        )}

        {renderNotificationItem(
          'mail',
          'Email Notifications',
          'Receive updates via email',
          'emailNotifications'
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stock Alerts</Text>
        
        {renderNotificationItem(
          'trending-up',
          'Stock Alerts',
          'Get notified about stock movements',
          'stockAlerts'
        )}

        {renderNotificationItem(
          'pricetag',
          'Price Alerts',
          'Alerts when stocks reach target prices',
          'priceAlerts'
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Updates & Reports</Text>
        
        {renderNotificationItem(
          'newspaper',
          'News Updates',
          'Receive market news and updates',
          'newsUpdates'
        )}

        {renderNotificationItem(
          'bar-chart',
          'Weekly Reports',
          'Get weekly portfolio summaries',
          'weeklyReports'
        )}
      </View>

      <View style={styles.infoSection}>
        <Ionicons name="information-circle" size={20} color="#6366f1" />
        <Text style={styles.infoText}>
          You can change these settings at any time. Some notifications may be required for app functionality.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 16,
    marginLeft: 24,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#1e293b',
    marginHorizontal: 24,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 16,
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  notificationSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 24,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#94a3b8',
    marginLeft: 12,
    lineHeight: 20,
  },
}); 