import React from 'react';
import { Text, StyleSheet, View, Linking, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function SupportScreen() {
  const openSupportEmail = () => {
    const subject = encodeURIComponent('Support Request - FlexFinance App');
    const body = encodeURIComponent('Hi FlexFinance Support,\n\nI need help with...');
    const mailto = `mailto:flexfinance.support@example.com?subject=${subject}&body=${body}`;
    Linking.openURL(mailto);
  };

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Help & Support</Text>

        <View style={styles.section}>
          <Text style={styles.question}>❓ How do I reset my password?</Text>
          <Text style={styles.answer}>Go to the login screen and tap “Forgot Password” to receive a reset email.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.question}>📊 How do I track my investments?</Text>
          <Text style={styles.answer}>Go to the Dashboard and use the graphs to monitor your portfolio performance over time.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.question}>🤖 How are stock recommendations made?</Text>
          <Text style={styles.answer}>Our AI recommends stocks based on your risk profile and preferences. The more you swipe, the better it gets!</Text>
        </View>

        <TouchableOpacity style={styles.contactButton} onPress={openSupportEmail}>
          <Ionicons name="mail-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.contactText}>Contact Support</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  answer: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  contactButton: {
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
  },
  contactText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
