import React from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function TermsScreen() {
  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Terms & Privacy</Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          FlexFinance is committed to protecting your privacy and ensuring a secure experience. By using our app, you agree to the collection and use of your data in accordance with these terms.
        </Text>

        <Text style={styles.sectionTitle}>2. Data Collection</Text>
        <Text style={styles.paragraph}>
          We collect user-provided information such as email, investment preferences, and interaction data (e.g., liked/rejected stocks) to personalize your experience and improve our AI models.
        </Text>

        <Text style={styles.sectionTitle}>3. Usage</Text>
        <Text style={styles.paragraph}>
          You agree to use this app for personal financial guidance only. FlexFinance does not provide official financial or legal advice.
        </Text>

        <Text style={styles.sectionTitle}>4. Security</Text>
        <Text style={styles.paragraph}>
          We use Firebase Authentication and Firestore to store your data securely. However, no system is 100% secure — use at your own discretion.
        </Text>

        <Text style={styles.sectionTitle}>5. Changes</Text>
        <Text style={styles.paragraph}>
          These terms may be updated from time to time. Continued use of the app signifies your agreement to the latest version.
        </Text>

        <Text style={styles.sectionTitle}>6. Contact</Text>
        <Text style={styles.paragraph}>
          For questions about our Terms or Privacy Policy, contact us at support@flexfinance.app.
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#facc15',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  paragraph: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
  },
});
