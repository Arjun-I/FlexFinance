// TermsScreen.js - Terms of Service and Privacy Policy
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TermsScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.text}>
          By accessing and using FlexFinance, you accept and agree to be bound by the terms and provision of this agreement.
        </Text>

        <Text style={styles.sectionTitle}>2. Use License</Text>
        <Text style={styles.text}>
          Permission is granted to temporarily download one copy of the app for personal, non-commercial transitory viewing only.
        </Text>

        <Text style={styles.sectionTitle}>3. Disclaimer</Text>
        <Text style={styles.text}>
          The materials on FlexFinance are provided on an 'as is' basis. FlexFinance makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
        </Text>

        <Text style={styles.sectionTitle}>4. Limitations</Text>
        <Text style={styles.text}>
          In no event shall FlexFinance or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on FlexFinance, even if FlexFinance or a FlexFinance authorized representative has been notified orally or in writing of the possibility of such damage.
        </Text>

        <Text style={styles.sectionTitle}>5. Privacy Policy</Text>
        <Text style={styles.text}>
          Your privacy is important to us. It is FlexFinance's policy to respect your privacy regarding any information we may collect while operating our app.
        </Text>

        <Text style={styles.sectionTitle}>6. Data Collection</Text>
        <Text style={styles.text}>
          We collect information you provide directly to us, such as when you create an account, complete a risk assessment, or interact with stock recommendations. We also collect information automatically, such as usage data and device information.
        </Text>

        <Text style={styles.sectionTitle}>7. Data Usage</Text>
        <Text style={styles.text}>
          We use the information we collect to provide, maintain, and improve our services, to develop new features, and to protect FlexFinance and our users.
        </Text>

        <Text style={styles.sectionTitle}>8. Data Sharing</Text>
        <Text style={styles.text}>
          We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.
        </Text>

        <Text style={styles.sectionTitle}>9. Security</Text>
        <Text style={styles.text}>
          We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to Terms</Text>
        <Text style={styles.text}>
          FlexFinance reserves the right to modify these terms at any time. We will notify users of any material changes via email or through the app.
        </Text>

        <Text style={styles.sectionTitle}>11. Contact Information</Text>
        <Text style={styles.text}>
          If you have any questions about these Terms of Service, please contact us at support@flexfinance.com
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated: {new Date().toLocaleDateString()}
          </Text>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingTop: 40,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366f1',
    marginTop: 24,
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: '#cbd5e1',
    lineHeight: 24,
    marginBottom: 16,
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
}); 