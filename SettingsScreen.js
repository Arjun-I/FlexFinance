import React, { useState } from 'react';
import { Text, StyleSheet, View, Switch, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';

export default function SettingsScreen({ navigation }) {
  const [darkMode, setDarkMode] = useState(true); // placeholder toggle

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert('Signed out', 'You have been signed out.');
    } catch (error) {
      Alert.alert('Error', 'Could not sign out.');
    }
  };

  const user = auth.currentUser;

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={28} color="#fff" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Ionicons name="person-circle-outline" size={48} color="#94a3b8" />
        <Text style={styles.email}>{user?.email || 'Guest'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Dark Mode</Text>
        <Switch
          value={darkMode}
          onValueChange={(value) => setDarkMode(value)}
          thumbColor={darkMode ? '#6366f1' : '#ccc'}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, alignItems: 'center', paddingHorizontal: 24 },
  backButton: { position: 'absolute', top: 60, left: 16, flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#fff', fontSize: 16 },
  section: { marginBottom: 32, alignItems: 'center' },
  email: { color: '#fff', fontSize: 16, marginTop: 8 },
  label: { color: '#cbd5e1', fontSize: 18, marginBottom: 8 },
  button: {
    flexDirection: 'row', backgroundColor: '#ef4444',
    paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 8, alignItems: 'center', marginTop: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
