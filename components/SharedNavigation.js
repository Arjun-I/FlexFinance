import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { auth } from '../firebase';

const COLORS = {
  primary: '#00d4ff',
  secondary: '#ff6b6b',
  text: {
    primary: '#ffffff',
  },
};

export default function SharedNavigation({ navigation, currentScreen, onSignOut }) {
  const navigate = navigation?.navigate || (() => {});

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      if (onSignOut) onSignOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <View style={styles.navigationHeader}>
      <Text style={styles.headerTitle}>FlexFinance</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
  },

  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,107,107,0.2)',
  },
  logoutButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary,
  },
});
