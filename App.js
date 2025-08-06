import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

import LoginScreen from './LoginScreen';
import RiskQuiz from './RiskQuiz';
import Dashboard from './Dashboard';
import SettingsScreen from './SettingsScreen';
import SupportScreen from './SupportScreen';
import TermsScreen from './TermsScreen';
import NotificationsScreen from './NotificationsScreen';
import ErrorBoundary from './ErrorBoundary';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedQuiz, setHasCompletedQuiz] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
      setUser(user);
      setHasCompletedQuiz(false); // Always show quiz for now
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading FlexFinance...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName={!user ? 'Login' : 'RiskQuiz'}
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Login">
            {(props) => (
              <LoginScreen {...props} setHasCompletedQuiz={setHasCompletedQuiz} />
            )}
          </Stack.Screen>
          <Stack.Screen name="RiskQuiz">
            {(props) => (
              <RiskQuiz {...props} setHasCompletedQuiz={setHasCompletedQuiz} />
            )}
          </Stack.Screen>
          <Stack.Screen name="Dashboard" component={Dashboard} />
          <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
          <Stack.Screen name="SupportScreen" component={SupportScreen} />
          <Stack.Screen name="TermsScreen" component={TermsScreen} />
          <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#e2e8f0',
    fontSize: 18,
    marginTop: 16,
    fontWeight: '600',
  },
});
