import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Placeholder: You can fetch notifications from Firebase here later
    const sample = [
      {
        id: '1',
        message: '📈 Apple (AAPL) rose 2.5% today!',
        timestamp: 'Just now',
      },
      {
        id: '2',
        message: '🛠️ Your risk profile has been updated based on your latest quiz answers.',
        timestamp: '1 hour ago',
      },
      {
        id: '3',
        message: '💡 New stock recommendations are ready for review.',
        timestamp: 'Yesterday',
      },
    ];
    setNotifications(sample);
  }, []);

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Notifications</Text>
        {notifications.map((note) => (
          <View key={note.id} style={styles.notification}>
            <Ionicons name="notifications" size={20} color="#94a3b8" style={styles.icon} />
            <View>
              <Text style={styles.message}>{note.message}</Text>
              <Text style={styles.timestamp}>{note.timestamp}</Text>
            </View>
          </View>
        ))}
        {notifications.length === 0 && <Text style={styles.noNotifications}>No notifications yet.</Text>}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  notification: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#334155',
  },
  icon: {
    marginRight: 12,
    marginTop: 4,
  },
  message: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  noNotifications: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
});
