// SupportScreen.js - Help and Support
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SupportScreen({ navigation }) {
  const handleContactSupport = () => {
    Linking.openURL('mailto:support@flexfinance.com');
  };

  const handleFAQ = () => {
    // Navigate to FAQ or open FAQ modal
    Alert.alert('FAQ', 'FAQ feature coming soon!');
  };

  const handleReportBug = () => {
    Linking.openURL('mailto:bugs@flexfinance.com?subject=Bug Report');
  };

  const handleFeatureRequest = () => {
    Linking.openURL('mailto:features@flexfinance.com?subject=Feature Request');
  };

  const handlePrivacyPolicy = () => {
    navigation.navigate('TermsScreen');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Help & Support</Text>
        <Text style={styles.subtitle}>Get help with FlexFinance</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Get Help</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleFAQ}>
          <Ionicons name="help-circle" size={24} color="#6366f1" />
          <Text style={styles.menuText}>Frequently Asked Questions</Text>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleContactSupport}>
          <Ionicons name="mail" size={24} color="#6366f1" />
          <Text style={styles.menuText}>Contact Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleReportBug}>
          <Ionicons name="bug" size={24} color="#6366f1" />
          <Text style={styles.menuText}>Report a Bug</Text>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleFeatureRequest}>
          <Ionicons name="bulb" size={24} color="#6366f1" />
          <Text style={styles.menuText}>Request Feature</Text>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={handlePrivacyPolicy}>
          <Ionicons name="shield-checkmark" size={24} color="#6366f1" />
          <Text style={styles.menuText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="document-text" size={24} color="#6366f1" />
          <Text style={styles.menuText}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="information-circle" size={24} color="#6366f1" />
          <Text style={styles.menuText}>About FlexFinance</Text>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="star" size={24} color="#6366f1" />
          <Text style={styles.menuText}>Rate App</Text>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="share-social" size={24} color="#6366f1" />
          <Text style={styles.menuText}>Share App</Text>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>Contact Information</Text>
        <Text style={styles.contactText}>Email: support@flexfinance.com</Text>
        <Text style={styles.contactText}>Response Time: Within 24 hours</Text>
        <Text style={styles.contactText}>Business Hours: Mon-Fri 9AM-6PM EST</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>FlexFinance v1.0.0</Text>
        <Text style={styles.copyright}>© 2024 FlexFinance. All rights reserved.</Text>
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#1e293b',
    marginHorizontal: 24,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 16,
  },
  contactSection: {
    padding: 24,
    backgroundColor: '#1e293b',
    margin: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 4,
  },
  footer: {
    alignItems: 'center',
    padding: 24,
  },
  version: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  copyright: {
    fontSize: 12,
    color: '#64748b',
  },
}); 